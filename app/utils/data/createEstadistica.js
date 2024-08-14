import fetchgqlClient from "./fetchgqlClient";
import gql from "./gql";

export default async function createEstadistica(variables={}) {
	const query = gql(`
		mutation CREATE_ESTADISTICA($type: ENUM_ESTADISTICA_TYPE!, $data: JSON, $usuario: ID!) {
			createEstadistica(data: { type: $type, data: $data, usuario_web: $usuario}) {
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

	return data
}