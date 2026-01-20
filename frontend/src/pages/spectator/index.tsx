import { Grid, Select, Title } from '@mantine/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import TournamentsReadonlyCardTable from './card_tables/tournaments-readonly';
import { TournamentFilter } from '@components/utils/tournament';
import { capitalize } from '@components/utils/util';
import { checkForAuthError, getTournaments } from '@services/adapter';
import Layout from './_layout';
import classes from './index.module.css';

export default function SpectatorHomePage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<TournamentFilter>('OPEN');

  const swrTournamentsResponse = getTournaments(filter);
  checkForAuthError(swrTournamentsResponse);

  return (
    <Layout>
      <Grid>
        <Grid.Col span="auto">
          <Title>{capitalize(t('tournaments_title'))}</Title>
        </Grid.Col>
        <Grid.Col span="content" className={classes.fullWithMobile}>
          <Select
            size="md"
            placeholder="Pick value"
            data={[
              { label: 'All', value: 'ALL' },
              { label: 'Archived', value: 'ARCHIVED' },
              { label: 'Open', value: 'OPEN' },
            ]}
            allowDeselect={false}
            value={filter}
            // @ts-ignore
            onChange={(f: TournamentFilter) => setFilter(f)}
          />
        </Grid.Col>
      </Grid>
      <TournamentsReadonlyCardTable swrTournamentsResponse={swrTournamentsResponse} />
    </Layout>
  );
}
