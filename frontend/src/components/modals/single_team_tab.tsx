import {Button, Checkbox, MultiSelect, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useTranslation} from 'react-i18next';
import {SWRResponse} from 'swr';
import {Player, TeamsWithPlayersResponse} from "@openapi";
import {getPlayers} from "@services/adapter";
import {createTeam} from "@services/team";

export function SingleTeamTab({
                                tournament_id,
                                swrTeamsResponse,
                                setOpened,
                              }: {
  tournament_id: number;
  swrTeamsResponse: SWRResponse<TeamsWithPlayersResponse>;
  setOpened: any;
}) {
  const {t} = useTranslation();
  const {data} = getPlayers(tournament_id, false);
  const players: Player[] = data != null ? data.data.players : [];
  const form = useForm({
    initialValues: {
      name: '',
      active: true,
      player_ids: [],
    },
    validate: {
      name: (value) => (value.length > 0 ? null : t('too_short_name_validation')),
    },
  });
  return (
    <form
      onSubmit={form.onSubmit(async (values) => {
        await createTeam(tournament_id, values.name, values.active, values.player_ids);
        await swrTeamsResponse.mutate();
        setOpened(false);
      })}
    >
      <TextInput
        withAsterisk
        label={t('name_input_label')}
        placeholder={t('team_name_input_placeholder')}
        {...form.getInputProps('name')}
      />

      <Checkbox
        mt="md"
        label={t('active_teams_checkbox_label')}
        {...form.getInputProps('active', {type: 'checkbox'})}
      />

      <MultiSelect
        data={players.map((p) => ({value: `${p.id}`, label: p.name}))}
        label={t('team_member_select_title')}
        maxDropdownHeight={160}
        searchable
        mb="12rem"
        mt={12}
        limit={25}
        {...form.getInputProps('player_ids')}
      />
      <Button fullWidth style={{marginTop: 10}} color="green" type="submit">
        {t('save_button')}
      </Button>
    </form>
  );
}