import {Modal, Tabs} from '@mantine/core';
import {IconClock, IconUser, IconUsers, IconUsersPlus} from '@tabler/icons-react';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';

import SaveButton from '@components/buttons/save';
import {MultiTeamTab} from "@components/modals/multi_team_tab";
import {SingleTeamTab} from "@components/modals/single_team_tab";
import {HistoricalTeamTab} from "@components/modals/historical_team_selection_tab";

export default function TeamCreateModal({
  tournament_id,
  swrTeamsResponse,
}: any) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Modal opened={opened} onClose={() => setOpened(false)} title={t('create_team')}>
        <Tabs defaultValue="historical_team_tab">
          <Tabs.List grow>
            <Tabs.Tab value="historical_team_tab" leftSection={<IconClock size={14} />}>
              {t('historical_team_tab')}
            </Tabs.Tab>
            <Tabs.Tab value="single" leftSection={<IconUser size={14} />}>
              {t('single_team')}
            </Tabs.Tab>
            <Tabs.Tab value="multi" leftSection={<IconUsers size={14} />}>
              {t('multiple_teams')}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="historical_team_tab">
            <HistoricalTeamTab {...{ tournament_id, swrTeamsResponse, setOpened }} />
          </Tabs.Panel>

          <Tabs.Panel value="single">
            <SingleTeamTab {...{ tournament_id, swrTeamsResponse, setOpened }} />
          </Tabs.Panel>

          <Tabs.Panel value="multi">
            <MultiTeamTab {...{ tournament_id, swrTeamsResponse, setOpened }} />
          </Tabs.Panel>
        </Tabs>
      </Modal>

      <SaveButton
        onClick={() => setOpened(true)}
        leftSection={<IconUsersPlus size={20} />}
        title={t('add_team_button')}
      />
    </>
  );
}