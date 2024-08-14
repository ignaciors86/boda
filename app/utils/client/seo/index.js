import { clientUtils } from "~/utils";

const pushDataLayer = ({ categoria, categoriaCat, duration, event, title, id }) => {
    dataLayer.push({
        event: event,
        categoria: categoria,
        categoriaCat: categoriaCat,
        cdnHost: "",
        channel: "LAB",
        duration: duration,
        origen: "web",
        programTitle: "${DISPLAY_PROJECT_NAME} - LAB RTVE",
        segment: "Completo",
        title: title,
        id,
        omniture: {
            title: title,
            url: location.href,
            relativeurl: location.pathname,
            data: {
                eVar2: "WEB",
                eVar3: "Lab RTVE",
                eVar4: "${DISPLAY_PROJECT_NAME} - LAB RTVE",
                hier1: "WEB|RTVE|Lab RTVE ",
                channel: "LAB"
            }
        }
    });
};

const videoStat = (data = {}, event) => {
    const { duration, id } = data;

    pushDataLayer({
        categoria: `VIDEOS_VOD`,
        categoriaCat: `video vod`,
        duration: duration,
        event: event,
        title: data?.title,
        id
    });
};
const audioStat = (data = {}, event) => {
    const { duration, id } = data;

    pushDataLayer({
        categoria: `AUDIOS_VOD`,
        categoriaCat: `audio vod`,
        duration: duration,
        event: event,
        title: data?.title,
        id
    });
};
const sendMediaStat = (data, type, event) => {
    type === "audio"
        ? audioStat(data, event) :
        type === "video"
        && videoStat(data, event);
};
export const onPauseStats = (data, type) => {
    const event = "PAUSE_LAB";
    sendMediaStat(data, type, event);
};
export const onPlayStats = (data, type) => {
    const event = "PLAY_LAB";
    sendMediaStat(data, type, event);
};
export const onFirstPlayStats = (data, type) => {
    const event = "PRIMER_PLAY_LAB";
    sendMediaStat(data, type, event);
};
export const onEndStats = (data, type) => {
    const event = "STOP_LAB";
    sendMediaStat(data, type, event);
};

const sendStatistics = (res) => {
    const title = res.title;
    const url = `${window.location.origin}${res.uri}`;
    // console.log("--> dataLayer:", dataLayer);
    if (!dataLayer)
        return;

    dataLayer.push({
        event: 'VirtualPageView',
        virtualPageApp: 'rediseno',
        virtualPageURL: url,
        virtualPageTitle: title,
        omniture: {
            title: title,
            url: url,
            relativeurl: res.uri,
            data: {
                eVar2: 'WEB',
                eVar3: 'Lab RTVE',
                eVar4: "${DISPLAY_PROJECT_NAME} - LAB RTVE",
                eVar5: '',
                hier1: 'WEB|RTVE|Lab RTVE',
                channel: 'LAB',
            },
        },
    });
};

export const sendStatisticsChangeUrl = (uri, title) => {
    const res = {
        title: title ?? `${DISPLAY_PROJECT_NAME} - ${uri ?? ""}`,
        uri: clientUtils.addBasepathToRoute(uri)
    };
    sendStatistics(res);
};

export const sequentialLoading = () => {
    const scripts = [
        {
            crossOrigin: "anonymous",
            integrity: "sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=",
            src: "https://code.jquery.com/jquery-3.6.0.min.js"
        },
        {
            src: "https://vjs.zencdn.net/8.5.2/video.min.js"
        },
        {
            src: "https://lab.rtve.es/commons/js/init-analytics-1.2.js",
            type: "text/javascript"
        },
        {
            src: "https://www.rtve.es/js/mushrooms/rtve_mushroom.js",
            type: "text/javascript"
        }
    ];
    const loadScripts = () => {
        const scriptPromise = new Promise((resolve, reject) => {
            const script = scripts[0];

            if (!script) {
                // console.log("No scripts left");
                return;
            }

            const newScript = document.createElement('script');

            Object.keys(script).forEach((prop) => { newScript[prop] = script[prop] });

            document.body.insertBefore(newScript, document.body.firstElementChild);
            newScript.ariaDescription = "stats-script";
            newScript.onload = () => {
                // console.log(`Scripts loaded: ${script.src ?? script.dangerouslySetInnerHTML}`);
                // console.log(`Scripts left: ${scripts.length - 1}`);
                resolve();
            };
            newScript.onerror = reject;
            newScript.async = true; // they're loading one at a time, so async is ok
        });

        scriptPromise.then(() => {
            scripts.shift();
            loadScripts();
        }, (err) => {
            console.error('Scripts load failed', err);
        })
    }

    const currentScripts = document.querySelectorAll("script[aria-description=stats-script]");

    currentScripts.length === 0 && loadScripts();
};