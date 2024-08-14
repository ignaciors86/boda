/**
 * Obtiene un string del tipo XX:XX:XX dados unos ms.
 * @param	{number} time
 * @returns {string}
 */
const getHHMMSSFromTime = (time) => {
	if (time === 0)
		return "00:00";
	if (!time || typeof time === "string")
		return time;
	const rawSeconds = Math.floor(time);
	const seconds = rawSeconds % 60;
	const rawMinutes = Math.floor(rawSeconds / 60);
	const minutes = rawMinutes % 60;
	const rawHours = Math.floor(rawMinutes / 60);

	return `${rawHours ? rawHours + ":" : ""}${minutes <= 9 ? "0" + minutes : minutes}:${seconds <= 9 ? "0" + seconds : seconds}`;
};
/**
 * Obtiene los segundos de una(s) hora(s) dada(s).
 * @param 	{number} hours
 * @returns {number}
 */
const getSecondsFromHH = (hours) => {
	return hours * 3600;
};
/**
 * Obtiene los segundos de un(os) minuto(s) dado(s).
 * @param 	{number} minutes
 * @returns {number}
 */
const getSecondsFromMM = (minutes) => {
	return minutes * 60;
};
/**
 * Obtiene los segundos correspondientes a los ms dados.
 * @param 	{number} ms
 * @returns {number}
 */
const getSecondsFromMS = (ms) => {
	return ms / 1000;
};
/**
 * Obtiene los segundos de las HH, MM y SS dados.
 * @param 	{number} hours
 * @param 	{number} mins
 * @param 	{number} seconds
 * @returns {number}
 */
const getSecondsFromHHMMSS = function() {
	return getSecondsFromHH(arguments[0] ?? 0) + getSecondsFromMM(arguments[1] ?? 0) + (arguments[2] ?? 0);
};

export {
	getHHMMSSFromTime,
	getSecondsFromHH,
	getSecondsFromMM,
	getSecondsFromMS,
	getSecondsFromHHMMSS
};