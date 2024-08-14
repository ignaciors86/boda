import fetchgql from "./fetchgql";
import fetchgqlClient from "./fetchgqlClient";
import gql from "./gql";
import queryParser from "./queryParser";

export default async function getCopies(client=false) {
    const query = gql(`
        query GET_COPIES {
            copies: copyTexts(pagination:{ limit:-1 }) {
                data {
                    id
                    attributes {
                        textID
                        translate {
                            ... on ComponentCopysCopyTranslation {
                                language {
                                    data {
                                        attributes {
                                            idName
                                        }
                                    }
                                }
                                text
                            }
                        }
                    }
                }
            }
        }
    `);

    const variables = {}

    const data = client
        ? await fetchgqlClient(query, variables)
        : await fetchgql(query, variables);

    return queryParser("copies")(data);
};