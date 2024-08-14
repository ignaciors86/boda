import createUsuarioWeb from "~/utils/data/createUsuarioWeb";
import createEstadisticaByHash from "~/utils/data/createEstadisticaByHash";
import { getItem, setItem } from "../storage";
import { genHash } from "../strings";

const sendStatEvent = async (type, data={}) => {
	let hash = getItem("usr_hash");

	if (!hash) {
		hash = genHash(16);
		setItem("usr_hash", hash);
		await createWebUser(hash);
	}
	return await createEstadisticaByHash({
		type,
		data: {
			...data,
			location: window.location.href
		},
		hash: hash
	});
};
const createWebUser = async (hash) => {
	return (await createUsuarioWeb({ hash, browser: navigator.userAgent }));
};
const sendNavigationEvent = () => {
	sendStatEvent("navigation");
};
const sendElapsedTimeEvent = () => {
	const startTime = getItem("nav_start_time") ?? Date.now();
	const elapsedTime = Date.now() - startTime;

	sendStatEvent("elapsed_page_time", {
		time: elapsedTime
	});
};
const sendShareEvent = () => {
	sendStatEvent("share_action", {
		timestamp: Date.now()
	});
};

//----------------------//
//----( Multimedia )----//
//----------------------//
const sendPlayEvent = (mediaType, data={}) => {
	sendStatEvent("play", {
		timestamp: Date.now(),
		mediaType,
		...data
	});
};
const sendPauseEvent = (mediaType, data={}) => {
	sendStatEvent("pause", {
		timestamp: Date.now(),
		mediaType,
		...data
	});
};
const sendEndedEvent = (mediaType, data={}) => {
	sendStatEvent("ended", {
		timestamp: Date.now(),
		mediaType,
		...data
	});
};
const sendFirstPlayEvent = (mediaType, data={}) => {
	sendStatEvent("first_play", {
		timestamp: Date.now(),
		mediaType,
		...data
	});
};

/** AUDIO */
const sendAudioPlayEvent = (data) => {
	sendPlayEvent("audio", data);
};
const sendAudioPauseEvent = (data) => {
	sendPauseEvent("audio", data);
};
const sendAudioEndedEvent = (data) => {
	sendEndedEvent("audio", data);
};
const sendAudioFirstPlayEvent = (data) => {
	sendFirstPlayEvent("audio", data);
};

/** VIDEO */
const sendVideoPlayEvent = (data) => {
	sendPlayEvent("video", data);
};
const sendVideoPauseEvent = (data) => {
	sendPauseEvent("video", data);
};
const sendVideoEndedEvent = (data) => {
	sendEndedEvent("video", data);
};
const sendVideoFirstPlayEvent = (data) => {
	sendFirstPlayEvent("video", data);
};

export {
	sendStatEvent,
	sendElapsedTimeEvent,
	sendNavigationEvent,
	sendShareEvent,
	sendAudioPlayEvent,
	sendAudioPauseEvent,
	sendAudioEndedEvent,
	sendAudioFirstPlayEvent,
	sendVideoPlayEvent,
	sendVideoPauseEvent,
	sendVideoEndedEvent,
	sendVideoFirstPlayEvent
};