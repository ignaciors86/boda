export default async function fetchgql(query, variables) {
    const body = { query, variables: variables };

    const res = await fetch(process.env.STRAPI_URL, {
        body: JSON.stringify(body),
        headers: {
            "Content-Type": "application/json"
        },
        method: "POST",
    })

    return await res.json();
};