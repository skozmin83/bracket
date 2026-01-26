import {Button, Checkbox} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useTranslation} from 'react-i18next';
import {SWRResponse} from 'swr';
import {TeamsWithPlayersResponse} from "@openapi";
import {createTeams} from "@services/team";
import {MultiTeamsInput} from "@components/forms/player_create_csv_input";

export function MultiTeamTab({
                               tournament_id,
                               swrTeamsResponse,
                               setOpened,
                             }: {
  tournament_id: number;
  swrTeamsResponse: SWRResponse<TeamsWithPlayersResponse>;
  setOpened: any;
}) {
  const {t} = useTranslation();
  const form = useForm({
    initialValues: {
      names: '',
      active: true,
    },

    validate: {
      names: (value) => (value.length > 0 ? null : t('at_least_one_team_validation')),
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await createTeams(tournament_id, values.names, values.active);
        await swrTeamsResponse.mutate();
        setOpened(false);
      })}
    >
      <MultiTeamsInput form={form}/>

      <Checkbox
        mt="md"
        label={t('active_teams_checkbox_label')}
        {...form.getInputProps('active', {type: 'checkbox'})}
      />
      <Button fullWidth style={{marginTop: 10}} color="green" type="submit">
        {t('save_button')}
      </Button>
    </form>
  );
}

