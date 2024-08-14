export default function isLocalStrapi() {
	return /1337/.test(process.env.STRAPI_URL);
};