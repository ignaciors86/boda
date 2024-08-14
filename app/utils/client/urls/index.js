import { sendStatisticsChangeUrl } from "~/utils/client/seo";

/**
 * Añade a la URL el host, si esta viniera en el formato tipo "/url/sin/host".
 * @param 	{string} url 
 * @returns {string}
 */
const addHostToUrl = (url) => {
	if (!url)
		return "";
	return !/https?:\/\//.test(url)
		? `http://localhost:1337${url}`
		: url.replace("3000", "1337");
};
/**
 * Añade el basePath a una ruta dada. Esto es útil para poder
 * hacer funcionar Remix en entornos superiores.
 * @param 	{string} to 
 * @returns {mixed} undefined si no existe "to", o string.
 */
const addBasepathToRoute = (to) => {
	if (!to) {
		console.warn("Undefined or null param \"to\" provided.");
		return;
	}

	const BASEPATH = window?.ENV?.REMIX_BASEPATH ?? "";
	const dashedTo = to.startsWith("/")
		? to
		: `/${to}`;
		
	if (BASEPATH === "")
		return dashedTo;

	return `/${BASEPATH}${dashedTo}`;
};
/**
 * Cambia el history state.
 * @param {string} uri 
 */
const changeHistoryState = (uri) => {
	if (!uri || typeof uri !== "string")
		return;
	window.history.replaceState(null, document.title, uri);
};
/**
 * Cambia el history state, añadiendo previamente el basePath a la ruta.
 * @param {string} uri 
 */
const changeHistoryStateFullUri = (uri) => {
	const fullUri = addBasepathToRoute(uri);
	changeHistoryState(fullUri);
};
/**
 * Cambia el history state, añadiendo previamente el basePath a la ruta.
 * También manda estadísticas a RTVE.
 * @param {*} uri 
 */
const changeHistoryStateWithStats = (uri) => {
	changeHistoryStateFullUri(uri);
	sendStatisticsChangeUrl(uri);
};

export {
	addHostToUrl,
	addBasepathToRoute,
	changeHistoryState,
	changeHistoryStateFullUri,
	changeHistoryStateWithStats
};