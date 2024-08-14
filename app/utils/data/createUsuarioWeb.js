import fetchgqlClient from "./fetchgqlClient";
import gql from "./gql";

export default async function createUsuarioWeb(variables={}) {
	const query = gql(`
		mutation CREATE_WEB_USER($hash: String!, $user_agent: JSON) {
			createUsuarioWeb(data: { hash: $hash, user_agent: $user_agent }) {
				data {
					id
				}
			}
		}
	`);

	const data = await fetchgqlClient(query, variables);

	return data;
};