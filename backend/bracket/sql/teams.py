from typing import cast

from bracket.database import database
from bracket.logic.ranking.statistics import TeamStatistics
from bracket.models.db.team import FullTeamWithPlayers, Team
from bracket.utils.id_types import StageItemInputId, TeamId, TournamentId
from bracket.utils.pagination import PaginationTeams
from bracket.utils.types import dict_without_none


async def get_teams_by_id(team_ids: set[TeamId], tournament_id: TournamentId | None = None) -> list[Team]:
    if len(team_ids) < 1:
        return []
    tournament_id_filter = "AND tournament_id = :tournament_id" if tournament_id else ""
    query = f"""
        SELECT *
        FROM teams
        WHERE id = any(:team_ids) 
        {tournament_id_filter}
    """
    values = dict_without_none(
        {
            "team_ids": team_ids,
            "tournament_id": tournament_id if tournament_id is not None else None,
        }
    )
    result = await database.fetch_all(
        query=query, values=values
    )
    return [Team.model_validate(team) for team in result]


async def get_team_by_id(team_id: TeamId, tournament_id: TournamentId | None = None) -> Team | None:
    result = await get_teams_by_id({team_id}, tournament_id)
    return result[0] if len(result) > 0 else None


async def get_teams_with_members(
    tournament_id: TournamentId,
    *,
    only_active_teams: bool = False,
    team_id: TeamId | None = None,
    pagination: PaginationTeams | None = None,
) -> list[FullTeamWithPlayers]:
    active_team_filter = "AND teams.active IS TRUE" if only_active_teams else ""
    team_id_filter = "AND teams.id = :team_id" if team_id is not None else ""
    limit_filter = "LIMIT :limit" if pagination is not None and pagination.limit is not None else ""
    offset_filter = (
        "OFFSET :offset" if pagination is not None and pagination.offset is not None else ""
    )
    sort = (
        f"teams.{pagination.sort_by} {pagination.sort_direction}"
        if pagination is not None
        else "teams.elo_score DESC, teams.wins DESC, name ASC"
    )
    query = f"""
        SELECT
            teams.*,
            to_json(array_agg(p.*)) AS players
        FROM teams
        LEFT JOIN players_x_teams pt on pt.team_id = teams.id
        LEFT JOIN players p on pt.player_id = p.id
        WHERE teams.tournament_id = :tournament_id
        {active_team_filter}
        {team_id_filter}
        GROUP BY teams.id
        ORDER BY {sort}
        {limit_filter}
        {offset_filter}
        """
    values = dict_without_none(
        {
            "tournament_id": tournament_id,
            "team_id": team_id,
            "limit": pagination.limit if pagination is not None else None,
            "offset": pagination.offset if pagination is not None else None,
        }
    )
    result = await database.fetch_all(query=query, values=values)
    return [FullTeamWithPlayers.model_validate(x) for x in result]


async def get_team_count(
    tournament_id: TournamentId,
    *,
    only_active_teams: bool = False,
) -> int:
    active_team_filter = "AND teams.active IS TRUE" if only_active_teams else ""
    query = f"""
        SELECT count(*)
        FROM teams
        WHERE teams.tournament_id = :tournament_id
        {active_team_filter}
        """
    values = dict_without_none({"tournament_id": tournament_id})
    return cast("int", await database.fetch_val(query=query, values=values))


async def update_team_stats(
    tournament_id: TournamentId,
    stage_item_input_id: StageItemInputId,
    team_statistics: TeamStatistics,
) -> None:
    query = """
        UPDATE stage_item_inputs
        SET
            wins = :wins,
            draws = :draws,
            losses = :losses,
            points = :points
        WHERE stage_item_inputs.tournament_id = :tournament_id
        AND stage_item_inputs.id = :stage_item_input_id
        """
    await database.execute(
        query=query,
        values={
            "tournament_id": tournament_id,
            "stage_item_input_id": stage_item_input_id,
            "wins": team_statistics.wins,
            "draws": team_statistics.draws,
            "losses": team_statistics.losses,
            "points": float(team_statistics.points),
        },
    )


async def sql_delete_team(tournament_id: TournamentId, team_id: TeamId) -> None:
    query = "DELETE FROM teams WHERE id = :team_id AND tournament_id = :tournament_id"
    await database.fetch_one(
        query=query, values={"team_id": team_id, "tournament_id": tournament_id}
    )


async def sql_delete_teams_of_tournament(tournament_id: TournamentId) -> None:
    query = "DELETE FROM teams WHERE tournament_id = :tournament_id"
    await database.fetch_one(query=query, values={"tournament_id": tournament_id})

async def search_historical_teams_by_name(
    query: str,
    limit: int = 20,
) -> list[FullTeamWithPlayers]:
    sql = """
        SELECT DISTINCT ON (LOWER(teams.name))
            teams.*,
            to_json(array_agg(p.*)) AS players
        FROM teams
        LEFT JOIN players_x_teams pt ON pt.team_id = teams.id
        LEFT JOIN players p ON pt.player_id = p.id
        WHERE LOWER(teams.name) LIKE LOWER(:query)
        GROUP BY teams.id
        ORDER BY LOWER(teams.name), teams.created DESC
        LIMIT :limit
    """
    rows = await database.fetch_all(
        sql,
        {"query": f"%{query}%", "limit": limit},
    )
    return [FullTeamWithPlayers.model_validate(r) for r in rows]