import {
    Card,
    Center,
    Group,
    Stack,
    Table,
    Text,
    Tooltip,
} from '@mantine/core';
import React, {useMemo, useState} from 'react';
import {
    IconArrowUp,
    IconArrowDown,
    IconArrowsSort,
} from '@tabler/icons-react';
import {useTranslation} from 'react-i18next';

import {DashboardFooter} from '@components/dashboard/footer';
import {DoubleHeader, getTournamentHeadTitle} from '@components/dashboard/layout';
import {responseIsValid, setTitle} from '@components/utils/util';
import {getStagesLive} from '@services/adapter';
import {getTournamentResponseByEndpointName} from '@services/dashboard';
import {
    getMatchLookup,
    getStageItemLookup,
} from '@services/lookups';

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
        };
        matrix[m.stage_item_input2_id][m.stage_item_input1_id] = {
            a: m.stage_item_input2_score,
            b: m.stage_item_input1_score,
        };
    });

    return {players, matrix};
}

/* ------------------------------------------------------------------ */
/*  Round Robin Table                                                  */
/* ------------------------------------------------------------------ */

type SortField = 'id' | 'name' | 'points' | 'place';

function RoundRobinTable({stageItem, matchesLookup}: any) {
    const {players, matrix} = buildMatchMatrix(stageItem, matchesLookup);
    const matches = Object.values(matchesLookup).map((e: any) => e.match);

    const placeById = computePlaces(players, matches);

    // default: by player id
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

    function SortHeader({
                            label,
                            field,
                        }: {
        label: string;
        field: SortField;
    }) {
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
                    <Group gap={4}>
                        <Text size="sm">{label}</Text>
                        {!active && <IconArrowsSort size={14} opacity={0.4}/>}
                        {active && direction === 'asc' && <IconArrowUp size={14}/>}
                        {active && direction === 'desc' && <IconArrowDown size={14}/>}
                    </Group>
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
                                return (
                                    <Table.Td key={col.id} style={{background: NA_COLOR}}/>
                                );
                            }

                            const res = matrix[row.id]?.[col.id];

                            return (
                                <Table.Td
                                    key={col.id}
                                    style={{
                                        background: res
                                            ? getCellColor(res.a, res.b)
                                            : undefined,
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
                                            ? `Tiebreak: W/L ratio = ${placeById[row.id].rating?.toFixed(
                                                2
                                            )}`
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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardCompactSchedulePage() {
    const {t} = useTranslation();
    const tournament = getTournamentResponseByEndpointName();

    const tournamentId =
        React.isValidElement(tournament) ? undefined : tournament.id;

    const swrStages = getStagesLive(tournamentId);

    if (React.isValidElement(tournament)) {
        return tournament;
    }

    if (!responseIsValid(swrStages)) {
        return null;
    }

    setTitle(getTournamentHeadTitle(tournament));

    const stageItems = getStageItemLookup(swrStages);
    const matches = getMatchLookup(swrStages);

    return (
        <>
            <DoubleHeader tournamentData={tournament}/>

            <Center>
                <Group style={{maxWidth: '64rem', width: '100%'}}>
                    <Stack w="100%">
                        {Object.values(stageItems).map((stageItem: any) => (
                            <Card key={stageItem.id} withBorder>
                                <Text fw={800} mb="sm">
                                    {stageItem.name}
                                </Text>

                                <RoundRobinTable
                                    stageItem={stageItem}
                                    matchesLookup={matches}
                                />
                            </Card>
                        ))}
                    </Stack>
                </Group>
            </Center>

            <DashboardFooter/>
        </>
    );
}
