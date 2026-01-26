import {awaitRequestAndHandleError, createAxios, handleRequestError} from './adapter';
import {TeamsWithPlayersResponse} from "@openapi";

export async function createTeam(
  tournament_id: number,
  name: string,
  active: boolean,
  player_ids: string[]
) {
  return createAxios()
    .post(`tournaments/${tournament_id}/teams`, {
      name,
      active,
      player_ids,
    })
    .catch((response: any) => handleRequestError(response));
}

export async function createTeams(tournament_id: number, names: string, active: boolean) {
  return createAxios()
    .post(`tournaments/${tournament_id}/teams_multi`, {names, active})
    .catch((response: any) => handleRequestError(response));
}

export async function deleteTeam(tournament_id: number, team_id: number) {
  await createAxios()
    .delete(`tournaments/${tournament_id}/teams/${team_id}`)
    .catch((response: any) => handleRequestError(response));
}

export async function updateTeam(
  tournament_id: number,
  team_id: number,
  name: string,
  active: boolean,
  player_ids: string[]
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.put(`tournaments/${tournament_id}/teams/${team_id}`, {
      name,
      active,
      player_ids,
    })
  );
}

export async function searchHistoricalTeams(query: string) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.get(`/teams/historical/search?q=${encodeURIComponent(query)}`));
}

export async function createTeamFromHistorical(
  tournamentId: number,
  teamId: number
) {
  return awaitRequestAndHandleError(async (axios) => axios.post(
    `/tournaments/${tournamentId}/teams/from_historical/${teamId}`
  ));
}

//
// export function searchHistoricalTeams(query: string): SWRResponse<TeamsWithPlayersResponse> {
//   return useSWR(`/teams/historical/search?q=${encodeURIComponent(query)}`, fetcher);
// }
//
// export function createTeamFromHistorical(
//   tournamentId: number,
//   teamId: number
// ): SWRResponse<TeamsWithPlayersResponse> {
//   return useSWR(
//     `/tournaments/${tournamentId}/teams/from_historical/${teamId}`
//   , fetcher);
// }