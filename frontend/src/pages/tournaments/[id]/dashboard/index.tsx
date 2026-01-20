import React, { useState } from 'react';
import { Card, Center, Group, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';

import RoundRobinTable from '@components/tables/round_robin';
import MatchModal from '@components/modals/match_modal';
import { DoubleHeader, getTournamentHeadTitle } from '@components/dashboard/layout';
import { DashboardFooter } from '@components/dashboard/footer';
import { NoContent } from '@components/no_content/empty_table_info';
import { responseIsValid, setTitle } from '@components/utils/util';
import { getStagesLive } from '@services/adapter';
import { getTournamentResponseByEndpointName } from '@services/dashboard';
import { getStageItemLookup, getMatchLookup } from '@services/lookups';

export default function DashboardCompactSchedulePage() {
  const { t } = useTranslation();
  const tournament = getTournamentResponseByEndpointName();

  const [modalOpened, setModalOpened] = useState(false);
  const [match, setMatch] = useState<any>(null);

  function openMatchModal(matchToOpen: any) {
    setMatch(matchToOpen);
    setModalOpened(true);
  }

  function modalSetOpenedAndUpdateMatch(opened: boolean) {
    if (!opened) setMatch(null);
    setModalOpened(opened);
  }

  const tournamentId = React.isValidElement(tournament) ? undefined : tournament.id;
  const swrStages = getStagesLive(tournamentId);

  if (React.isValidElement(tournament)) return tournament;
  if (!responseIsValid(swrStages)) return null;

  setTitle(getTournamentHeadTitle(tournament));

  const stageItems = getStageItemLookup(swrStages);
  const matches = getMatchLookup(swrStages);

  return (
    <>
      <MatchModal
        swrStagesResponse={swrStages}
        swrUpcomingMatchesResponse={null}
        tournamentData={tournament}
        match={match}
        opened={modalOpened}
        setOpened={modalSetOpenedAndUpdateMatch}
        round={null}
      />

      <DoubleHeader tournamentData={tournament} />

      {Object.keys(stageItems).length < 1 ? (
        <NoContent title={t('no_matches_title')} icon={<AiOutlineHourglass />} />
      ) : null}

      <Center>
        <Group style={{ maxWidth: '100%', width: '100%' }}>
          <Stack w="100%">
            {Object.values(stageItems).map((stageItem: any) => (
              <Card key={stageItem.id} withBorder>
                <Text fw={800} mb="sm">
                  {stageItem.name}
                </Text>

                <RoundRobinTable
                  stageItem={stageItem}
                  matchesLookup={matches}
                  editable={false}
                  openMatchModal={openMatchModal}
                />
              </Card>
            ))}
          </Stack>
        </Group>
      </Center>

      <DashboardFooter />
    </>
  );
}
