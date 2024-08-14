import fetchgqlClient from "./fetchgqlClient";
import gql from "./gql";

export default async function createEstadisticaByHash(variables={}) {
	const query = gql(`
		mutation CREATE_ESTADISTICA_BY_HASH($type: ENUM_ESTADISTICA_TYPE!, $data: JSON, $hash: String!) {
			createEstadisticaByHash(type: $type, data: $data, hash: $hash) {
				data {
					id
					attributes {
						type
					}
				}
			}
		}
	`);

	const data = await fetchgqlClient(query, variables);

	return data;
}