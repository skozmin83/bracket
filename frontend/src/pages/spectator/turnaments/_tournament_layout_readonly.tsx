import {Group, ThemeIcon, Title, Tooltip} from '@mantine/core';
import {useTranslation} from 'react-i18next';
import {HiArchiveBoxArrowDown} from 'react-icons/hi2';

import {TournamentLinks} from '@pages/spectator/navbar/_main_links_spectator';
import Layout from '@pages/spectator/_layout_spectator';
import {Tournament} from "@openapi";

export default function TournamentLayoutReadonly({tournament, children}: {
  tournament: Tournament | React.ReactElement,
  children: any
}) {
  const {t} = useTranslation();
  const tournamentLinks = <TournamentLinks tournament_id={tournament.id}/>;
  const breadcrumbs =
    <Group gap="xs" miw="25rem">
      <Title order={2} maw="20rem">
        /
      </Title>
      <Title order={2} maw="20rem" lineClamp={1}>
        {tournament.name}
      </Title>

      <Tooltip label={`${t('archived_header_label')}`}>
        <ThemeIcon
          color="yellow"
          variant="light"
          style={{
            visibility: tournament.status === 'ARCHIVED' ? 'visible' : 'hidden',
          }}
        >
          <HiArchiveBoxArrowDown/>
        </ThemeIcon>
      </Tooltip>
    </Group>
  ;

  return (
    <Layout additionalNavbarLinks={tournamentLinks} breadcrumbs={breadcrumbs}>
      {children}
    </Layout>
  );
}
