import TournamentLayout from "@pages/tournaments/_tournament_layout";
import {MatchWithDetails} from "@openapi";
import {Card, Center, Group, Stack, Table, Text, Title, Tooltip,} from '@mantine/core';
import React, {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IconArrowDown, IconArrowsSort, IconArrowUp,} from '@tabler/icons-react';

import MatchModal from '@components/modals/match_modal';
import {getTournamentIdFromRouter, responseIsValid} from '@components/utils/util';
import {getStages} from '@services/adapter';
import {getMatchLookup, getStageItemLookup,} from '@services/lookups';
import {NoContent} from "@components/no_content/empty_table_info";
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */

const WIN_COLOR = '#2a8f37';
const LOSE_COLOR = '#af4034';
const DRAW_COLOR = '#9a9400';
const NA_COLOR = 'rgba(136,136,136,0.4)';

const HEADER_BG = 'rgba(136,136,136,0.2)';
const HEADER_HOVER = 'rgba(101,101,101,0.2)';
const HEADER_ACTIVE = 'rgba(101,101,101,0.2)';

/* ------------------------------------------------------------------ */
/*  Cell helpers                                                       */

/* ------------------------------------------------------------------ */

function getCellColor(a: number, b: number) {
  if (a > b) return WIN_COLOR;
  if (a < b) return LOSE_COLOR;
  return DRAW_COLOR;
}

function getCellLabel(a: number, b: number) {
  if (a > b) return 'W';
  if (a < b) return 'L';
  return 'D';
}

/* ------------------------------------------------------------------ */
/*  Ranking / Tiebreak                                                 */
/* ------------------------------------------------------------------ */

type PlaceInfo = {
  place: number;
  rating?: number;
  tieBreak?: boolean;
};

function computePlaces(players: any[], matches: any[]): Record<number, PlaceInfo> {
  const result: Record<number, PlaceInfo> = {};

  const groups = Object.values(
    players.reduce((acc: any, p: any) => {
      acc[p.points] ??= [];
      acc[p.points].push(p);
      return acc;
    }, {})
  ).sort((a: any, b: any) => b[0].points - a[0].points);

  let place = 1;

  for (const group of groups) {
    if (group.length === 1) {
      result[group[0].id] = {place};
      place++;
      continue;
    }

    const ratings: Record<number, number> = {};

    group.forEach((p: any) => {
      let won = 0;
      let lost = 0;

      matches.forEach((m) => {
        if (m.stage_item_input1_id === p.id) {
          won += m.stage_item_input1_score;
          lost += m.stage_item_input2_score;
        }
        if (m.stage_item_input2_id === p.id) {
          won += m.stage_item_input2_score;
          lost += m.stage_item_input1_score;
        }
      });

      ratings[p.id] = lost > 0 ? won / lost : won;
    });

    [...group]
      .sort((a, b) => ratings[b.id] - ratings[a.id])
      .forEach((p) => {
        result[p.id] = {
          place,
          rating: ratings[p.id],
          tieBreak: true,
        };
        place++;
      });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Matrix                                                             */

/* ------------------------------------------------------------------ */

function buildMatchMatrix(stageItem: any, matchesLookup: any) {
  const players = stageItem.inputs;
  const matrix: any = {};

  players.forEach((p: any) => (matrix[p.id] = {}));

  Object.values(matchesLookup).forEach((e: any) => {
    if (e.stageItem.id !== stageItem.id) return;

    const m = e.match;

    matrix[m.stage_item_input1_id][m.stage_item_input2_id] = {
      a: m.stage_item_input1_score,
      b: m.stage_item_input2_score,
      match: m,
    };

    matrix[m.stage_item_input2_id][m.stage_item_input1_id] = {
      a: m.stage_item_input2_score,
      b: m.stage_item_input1_score,
      match: m,
    };
  });

  return {players, matrix};
}

/* ------------------------------------------------------------------ */
/*  Round Robin Table                                                  */
/* ------------------------------------------------------------------ */

type SortField = 'id' | 'name' | 'points' | 'place';

function RoundRobinTable({
                           stageItem,
                           matchesLookup,
                           editable = false,
                           openMatchModal,
                         }: {
  stageItem: any;
  matchesLookup: any;
  editable?: boolean;
  openMatchModal?: (match: any) => void;
}) {
  const {players, matrix} = buildMatchMatrix(stageItem, matchesLookup);
  const matches = Object.values(matchesLookup).map((e: any) => e.match);
  const placeById = computePlaces(players, matches);

  const [sortBy, setSortBy] = useState<SortField>('id');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  const orderedPlayers = useMemo(() => {
    const list = [...players];

    list.sort((a, b) => {
      let va: any;
      let vb: any;

      switch (sortBy) {
        case 'name':
          va = a.team?.name ?? '';
          vb = b.team?.name ?? '';
          return direction === 'asc'
            ? va.localeCompare(vb)
            : vb.localeCompare(va);
        case 'points':
          va = Number(a.points);
          vb = Number(b.points);
          break;
        case 'place':
          va = placeById[a.id].place;
          vb = placeById[b.id].place;
          break;
        default:
          va = a.id;
          vb = b.id;
      }

      return direction === 'asc' ? va - vb : vb - va;
    });

    return list;
  }, [players, sortBy, direction, placeById]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setDirection(field === 'points' ? 'desc' : 'asc');
    }
  }

  function SortHeader({label, field}: { label: string; field: SortField }) {
    const active = sortBy === field;

    return (
      <Table.Th
        onClick={() => toggleSort(field)}
        style={{
          background: active ? HEADER_ACTIVE : HEADER_BG,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = HEADER_HOVER)}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = active ? HEADER_ACTIVE : HEADER_BG)
        }
      >
        <Center style={{gap: 6}}>
          <Text size="sm">{label}</Text>
          {!active && <IconArrowsSort size={14} opacity={0.4}/>}
          {active && direction === 'asc' && <IconArrowUp size={14}/>}
          {active && direction === 'desc' && <IconArrowDown size={14}/>}
        </Center>
      </Table.Th>
    );
  }

  return (
    <Table withTableBorder withColumnBorders striped>
      <Table.Thead>
        <Table.Tr>
          <SortHeader label="Player" field="name"/>
          {orderedPlayers.map((p: any) => (
            <Table.Th
              key={p.id}
              style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                textAlign: 'center',
              }}
            >
              {p.team?.name}
            </Table.Th>
          ))}
          <SortHeader label="Points" field="points"/>
          <SortHeader label="Place" field="place"/>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {orderedPlayers.map((row: any) => (
          <Table.Tr key={row.id}>
            <Table.Th>{row.team?.name}</Table.Th>

            {orderedPlayers.map((col: any) => {
              if (row.id === col.id) {
                return <Table.Td key={col.id} style={{background: NA_COLOR}}/>;
              }

              const res = matrix[row.id]?.[col.id];
              const clickable = editable && res?.match;

              return (
                <Table.Td
                  key={col.id}
                  style={{
                    background: res ? getCellColor(res.a, res.b) : undefined,
                    cursor: clickable ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    if (clickable && openMatchModal) {
                      openMatchModal(res.match);
                    }
                  }}
                >
                  <Center>
                    {res ? `(${getCellLabel(res.a, res.b)}) ${res.a}:${res.b}` : '-'}
                  </Center>
                </Table.Td>
              );
            })}

            <Table.Td>
              <Center>{row.points}</Center>
            </Table.Td>

            <Table.Td>
              <Center>
                <Tooltip
                  label={
                    placeById[row.id].tieBreak
                      ? `Tiebreak: W/L ratio = ${placeById[row.id].rating?.toFixed(2)}`
                      : undefined
                  }
                >
                  <span>
                    {placeById[row.id].place}
                    {placeById[row.id].tieBreak ? '*' : ''}
                  </span>
                </Tooltip>
              </Center>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function ResultsCompactPage() {
  const [modalOpened, modalSetOpened] = useState(false);
  const [match, setMatch] = useState<MatchWithDetails | null>(null);

  const {t} = useTranslation();
  const {tournamentData} = getTournamentIdFromRouter();
  const swrStagesResponse = getStages(tournamentData.id);
  if (!responseIsValid(swrStagesResponse)) return null;

  const stageItems = getStageItemLookup(swrStagesResponse);
  const matches = getMatchLookup(swrStagesResponse);

  function openMatchModal(matchToOpen: MatchWithDetails) {
    setMatch(matchToOpen);
    modalSetOpened(true);
  }

  function modalSetOpenedAndUpdateMatch(opened: boolean) {
    if (!opened) {
      setMatch(null);
    }
    modalSetOpened(opened);
  }

  // debugger;
  return (
    <TournamentLayout tournament_id={tournamentData.id}>
      <MatchModal
        swrStagesResponse={swrStagesResponse}
        swrUpcomingMatchesResponse={null}
        tournamentData={tournamentData}
        match={match}
        opened={modalOpened}
        setOpened={modalSetOpenedAndUpdateMatch}
        round={null}
      />
      {/*<Title>{t('results_title')}</Title>*/}
      {(Object.keys(stageItems).length < 1) ?
        <NoContent
          title={t('no_matches_title')}
          description={t('no_matches_description')}
          icon={<AiOutlineHourglass/>}
        /> : ''
      }
      <Center>
        <Stack w="100%" maw="64rem" gap="md">
          {Object.values(stageItems).map((stageItem: any) => (
            <Card key={stageItem.id} withBorder w="100%">
              <Text fw={800} mb="sm">
                {stageItem.name}
              </Text>

              <RoundRobinTable
                stageItem={stageItem}
                matchesLookup={matches}
                editable={true}
                openMatchModal={openMatchModal}
              />
            </Card>
          ))}
        </Stack>
      </Center>
    </TournamentLayout>
  );
}
