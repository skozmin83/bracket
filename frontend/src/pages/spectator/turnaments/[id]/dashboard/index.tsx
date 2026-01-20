import React from 'react';
import {Card, Center, Stack, Text} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {AiOutlineHourglass} from '@react-icons/all-files/ai/AiOutlineHourglass';

import RoundRobinTable from '@components/tables/round_robin';
import {getTournamentHeadTitle} from '@components/dashboard/layout';
import {NoContent} from '@components/no_content/empty_table_info';
import {responseIsValid, setTitle} from '@components/utils/util';
import {getStagesLive} from '@services/adapter';
import {getTournamentResponseByEndpointName} from '@services/dashboard';
import {getMatchLookup, getStageItemLookup} from '@services/lookups';
import TournamentLayoutReadonly from "@pages/spectator/turnaments/_tournament_layout_readonly";

export default function DashboardCompactSchedulePage() {
  const {t} = useTranslation();
  const tournament = getTournamentResponseByEndpointName();

  const tournamentId = React.isValidElement(tournament) ? undefined : tournament.id;
  const swrStages = getStagesLive(tournamentId);

  if (React.isValidElement(tournament)) return tournament;
  if (!responseIsValid(swrStages)) return null;

  setTitle(getTournamentHeadTitle(tournament));

  const stageItems = getStageItemLookup(swrStages);
  const matches = getMatchLookup(swrStages);

  return (
    <TournamentLayoutReadonly tournament={tournament}>
      {Object.keys(stageItems).length < 1 ? (
        <NoContent title={t('no_matches_title')} icon={<AiOutlineHourglass/>}/>
      ) : null}

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
                  editable={false}
                />
              </Card>
            ))}
          </Stack>
      </Center>
    </TournamentLayoutReadonly>
  );
}
