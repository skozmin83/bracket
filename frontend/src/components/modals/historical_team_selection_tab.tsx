import {
  Button,
  Combobox,
  TextInput,
  useCombobox,
} from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@mantine/hooks';

import {
  createTeamFromHistorical,
  searchHistoricalTeams,
} from '@services/team';

export function HistoricalTeamTab({
  tournament_id,
  swrTeamsResponse,
  setOpened,
}: any) {
  const { t } = useTranslation();

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const justSelectedRef = useRef(false);

  const [query, setQuery] = useState('');
  const [debounced] = useDebouncedValue(query, 300);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  useEffect(() => {
    if (debounced.length < 2) {
      setTeams([]);
      combobox.closeDropdown();
      return;
    }

    searchHistoricalTeams(debounced).then((res) => {
      setTeams(res.data.data.teams);

      // only open if user is typing, not selecting
      if (!justSelectedRef.current) {
        combobox.openDropdown();
      }

      justSelectedRef.current = false;
    });
  }, [debounced]);

  return (
    <>
      <Combobox
        store={combobox}
        onOptionSubmit={(value) => {
          const team = teams.find((t) => String(t.id) === value);
          if (!team) return;

          justSelectedRef.current = true;

          setSelectedTeam(team);
          setQuery(team.name);
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <TextInput
            label={t('historical_team_search')}
            placeholder={t('start_typing_search')}
            value={query}
            onChange={(e) => {
              justSelectedRef.current = false;
              setQuery(e.currentTarget.value);
              setSelectedTeam(null);
            }}
            onFocus={() => {
              if (!justSelectedRef.current && teams.length > 0) {
                combobox.openDropdown();
              }
            }}
            onBlur={() => combobox.closeDropdown()}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            {teams.length === 0 ? (
              <Combobox.Empty>{t('no_teams_found')}</Combobox.Empty>
            ) : (
              teams.map((team) => (
                <Combobox.Option
                  value={String(team.id)}
                  key={team.id}
                >
                  {team.name}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      <Button
        mt="md"
        fullWidth
        disabled={!selectedTeam}
        onClick={async () => {
          await createTeamFromHistorical(tournament_id, selectedTeam.id);
          await swrTeamsResponse.mutate();
          setOpened(false);
        }}
      >
        {t('save_button')}
      </Button>
    </>
  );
}
