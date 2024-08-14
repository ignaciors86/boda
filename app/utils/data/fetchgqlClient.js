export default async function fetchgqlClient(query, variables) {
    const body = { query, variables: variables };

    const res = await fetch(window.ENV.STRAPI_URL, {
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST",
    })

    return await res.json();
};