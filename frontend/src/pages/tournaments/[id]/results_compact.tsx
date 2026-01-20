import TournamentLayout from "@pages/tournaments/_tournament_layout";
import { MatchWithDetails } from "@openapi";
import { Card, Center, Stack, Text } from '@mantine/core';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiOutlineHourglass } from '@react-icons/all-files/ai/AiOutlineHourglass';

import RoundRobinTable from '@components/tables/round_robin';
import MatchModal from '@components/modals/match_modal';
import { getTournamentIdFromRouter, responseIsValid } from '@components/utils/util';
import { getStages } from '@services/adapter';
import { getStageItemLookup, getMatchLookup } from '@services/lookups';
import { NoContent } from "@components/no_content/empty_table_info";

export default function ResultsCompactPage() {
  const [modalOpened, setModalOpened] = useState(false);
  const [match, setMatch] = useState<MatchWithDetails | null>(null);

  const { t } = useTranslation();
  const { tournamentData } = getTournamentIdFromRouter();
  const swrStagesResponse = getStages(tournamentData.id);

  if (!responseIsValid(swrStagesResponse)) return null;

  const stageItems = getStageItemLookup(swrStagesResponse);
  const matches = getMatchLookup(swrStagesResponse);

  function openMatchModal(matchToOpen: MatchWithDetails) {
    setMatch(matchToOpen);
    setModalOpened(true);
  }

  function modalSetOpenedAndUpdateMatch(opened: boolean) {
    if (!opened) setMatch(null);
    setModalOpened(opened);
  }

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

      {Object.keys(stageItems).length < 1 ? (
        <NoContent
          title={t('no_matches_title')}
          description={t('no_matches_description')}
          icon={<AiOutlineHourglass />}
        />
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
