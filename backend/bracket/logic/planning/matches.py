from collections import defaultdict
from typing import NamedTuple

from heliclockter import timedelta

from bracket.models.db.match import (
    MatchRescheduleBody,
    MatchWithDetails,
    MatchWithDetailsDefinitive,
)
from bracket.models.db.stage_item import StageType
from bracket.models.db.tournament import Tournament
from bracket.models.db.util import StageWithStageItems
from bracket.sql.courts import get_all_courts_in_tournament
from bracket.sql.matches import (
    sql_reschedule_match_and_determine_duration_and_margin,
)
from bracket.sql.stages import get_full_tournament_details
from bracket.sql.tournaments import sql_get_tournament
from bracket.utils.id_types import CourtId, MatchId, TournamentId
from bracket.utils.types import assert_some


# ----------------------------------------------------------------------
# Scheduling
# ----------------------------------------------------------------------

async def schedule_all_unscheduled_matches(
    tournament_id: TournamentId,
    stages: list[StageWithStageItems],
) -> None:
    tournament = await sql_get_tournament(tournament_id)
    courts = await get_all_courts_in_tournament(tournament_id)

    if not stages or not courts:
        return

    # collect already scheduled matches per court
    scheduled_matches = get_scheduled_matches(stages)
    matches_per_court: dict[CourtId, list[MatchPosition]] = defaultdict(list)

    for mp in scheduled_matches:
        if mp.match.court_id is not None:
            matches_per_court[mp.match.court_id].append(mp)

    # ensure correct order
    for court_id in matches_per_court:
        matches_per_court[court_id].sort(key=lambda mp: mp.position)

    for stage in stages:
        for stage_item in stage.stage_items:
            # collect unscheduled matches
            unscheduled = [
                match
                for round_ in stage_item.rounds
                for match in round_.matches
                if match.start_time is None
            ]

            if not unscheduled:
                continue

            # --------------------------------------------------
            # ROUND ROBIN: distribute across courts
            # --------------------------------------------------
            if stage_item.type == StageType.ROUND_ROBIN:
                court_index = 0

                for match in unscheduled:
                    court = courts[court_index % len(courts)]
                    court_index += 1

                    existing_matches = [
                        m for m in matches_per_court[court.id] if m.match.start_time is not None
                    ]
                    if existing_matches:
                        last = existing_matches[-1]
                        start_time = last.match.start_time + timedelta(
                            minutes=last.match.duration_minutes + last.match.margin_minutes
                        )
                        position = int(last.position) + 1
                    else:
                        start_time = tournament.start_time
                        position = 0

                    await sql_reschedule_match_and_determine_duration_and_margin(
                        court.id,
                        start_time,
                        position,
                        match,
                        tournament,
                    )

                    matches_per_court[court.id].append(
                        MatchPosition(match=match, position=position)
                    )

            # --------------------------------------------------
            # OTHER TYPES (Swiss / KO) — original behavior
            # --------------------------------------------------
            else:
                for i, round_ in enumerate(sorted(stage_item.rounds, key=lambda r: r.id)):
                    court = courts[min(i, len(courts) - 1)]

                    existing_matches = [
                        m for m in matches_per_court[court.id] if m.match.start_time is not None
                    ]
                    if existing_matches:
                        last = existing_matches[-1]
                        start_time = last.match.start_time + timedelta(
                            minutes=last.match.duration_minutes + last.match.margin_minutes
                        )
                        position = int(last.position) + 1
                    else:
                        start_time = tournament.start_time
                        position = 0

                    for match in round_.matches:
                        if match.start_time is not None:
                            continue

                        await sql_reschedule_match_and_determine_duration_and_margin(
                            court.id,
                            start_time,
                            position,
                            match,
                            tournament,
                        )

                        matches_per_court[court.id].append(
                            MatchPosition(match=match, position=position)
                        )

                        start_time += timedelta(
                            minutes=match.duration_minutes + match.margin_minutes
                        )
                        position += 1

    await update_start_times_of_matches(tournament_id)


# ----------------------------------------------------------------------
# Reordering & helpers (UNCHANGED)
# ----------------------------------------------------------------------

class MatchPosition(NamedTuple):
    match: MatchWithDetailsDefinitive | MatchWithDetails
    position: float


async def reorder_matches_for_court(
    tournament: Tournament,
    scheduled_matches: list[MatchPosition],
    court_id: CourtId,
) -> None:
    matches_this_court = sorted(
        (mp for mp in scheduled_matches if mp.match.court_id == court_id),
        key=lambda mp: mp.position,
    )

    last_start_time = tournament.start_time
    for i, match_pos in enumerate(matches_this_court):
        await sql_reschedule_match_and_determine_duration_and_margin(
            court_id,
            last_start_time,
            position_in_schedule=i,
            match=match_pos.match,
            tournament=tournament,
        )
        last_start_time = last_start_time + timedelta(
            minutes=match_pos.match.duration_minutes + match_pos.match.margin_minutes
        )


async def handle_match_reschedule(
    tournament: Tournament,
    body: MatchRescheduleBody,
    match_id: MatchId,
) -> None:
    if body.old_position == body.new_position and body.old_court_id == body.new_court_id:
        return

    stages = await get_full_tournament_details(tournament.id)
    scheduled_matches_old = get_scheduled_matches(stages)

    scheduled_matches = []
    for match_pos in scheduled_matches_old:
        if match_pos.match.id == match_id:
            if (
                match_pos.position != body.old_position
                or match_pos.match.court_id != body.old_court_id
            ):
                raise ValueError("match_id doesn't match court id or position in schedule")

            offset = (
                -0.5
                if body.new_position < body.old_position
                or body.new_court_id != body.old_court_id
                else +0.5
            )
            scheduled_matches.append(
                MatchPosition(
                    match=match_pos.match.model_copy(
                        update={"court_id": body.new_court_id}
                    ),
                    position=body.new_position + offset,
                )
            )
        else:
            scheduled_matches.append(match_pos)

    await reorder_matches_for_court(tournament, scheduled_matches, body.new_court_id)

    if body.new_court_id != body.old_court_id:
        await reorder_matches_for_court(tournament, scheduled_matches, body.old_court_id)


async def update_start_times_of_matches(tournament_id: TournamentId) -> None:
    stages = await get_full_tournament_details(tournament_id)
    tournament = await sql_get_tournament(tournament_id)
    courts = await get_all_courts_in_tournament(tournament_id)
    scheduled_matches = get_scheduled_matches(stages)

    for court in courts:
        await reorder_matches_for_court(tournament, scheduled_matches, court.id)


def get_scheduled_matches(
    stages: list[StageWithStageItems],
) -> list[MatchPosition]:
    return [
        MatchPosition(match=match, position=float(assert_some(match.position_in_schedule)))
        for stage in stages
        for stage_item in stage.stage_items
        for round_ in stage_item.rounds
        for match in round_.matches
        if match.start_time is not None
    ]


def get_scheduled_matches_per_court(
    stages: list[StageWithStageItems],
) -> dict[int, list[MatchPosition]]:
    scheduled_matches = get_scheduled_matches(stages)
    matches_per_court = defaultdict(list)

    for match_pos in scheduled_matches:
        if match_pos.match.court_id is not None:
            matches_per_court[match_pos.match.court_id].append(match_pos)

    return {
        court_id: sorted(matches, key=lambda mp: assert_some(mp.match.start_time))
        for court_id, matches in matches_per_court.items()
    }
