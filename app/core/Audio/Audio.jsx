import { forwardRef, useContext, useEffect, useRef, useState } from "react";

import ButtonCore from "../Button";
import MultimediaContext from "~/contexts/Multimedia/MultimediaContext";
import { clientUtils } from "~/utils";

import dummy from "./assets/audio/dummy.mp3";

const Audio = forwardRef(({ src, name, estilo, id }, audioRef) => {
	const MAINCLASS = "audio";

	const { MultimediaState, dispatchMultimediaState } = useContext(MultimediaContext);

	const animPathRef = useRef();

	const [play, setPlay] = useState(false);
	const [duration, setDuration] = useState(0);
	const [remainingTime, setRemainingTime] = useState(0);
	const [played, setPlayed] = useState(false);
	const [pathTotalLength, setPathTotalLength] = useState(0);
	const [progressStroke, setProgressStroke] = useState(0);

	const togglePlay = () => {
		if (audioRef.current.paused) {
			audioRef.current.play();
			setPlay(true);
		} else {
			audioRef.current.pause();
			setPlay(false);
		}
	};

	// Handlers.
	const handlePlayBtnClick = () => {
		togglePlay();
	};
	// Handlers audio.
	const handlePlay = () => {
		dispatchMultimediaState({ type: "PLAY", payload: src });

		if (MultimediaState.currentMedia !== audioRef.current) {
			dispatchMultimediaState({ type: "PAUSE_CURRENT_MEDIA" });
			dispatchMultimediaState({ type: "SET_CURRENT_MEDIA", payload: audioRef.current });
		}

		clientUtils.onPlayStats(audioRef.current, "audio");

		if (!played) {
			clientUtils.onFirstPlayStats(audioRef.current, "audio");
			setPlayed(true);
		}
	};
	const handlePause = () => {
		const currentAudio = audioRef?.current;
		clientUtils.onPauseStats(currentAudio, "audio");
	};
	const handleEnded = () => {
		const currentAudio = audioRef?.current;
		clientUtils.onEndStats(currentAudio, "audio");
	};
	const handleTimeUpdate = ({ target }) => {
		setRemainingTime(target.duration - target.currentTime);
		animateSVG(Math.round((100 * target.currentTime) / target.duration));
	};
	const handleLoadedData = () => {
		setDuration(Math.round(audioRef.current.duration));
	};

	const animateSVG = (prog) => {
		let totalLength = animPathRef?.current?.getTotalLength();
		let percStroke = (Math.round((totalLength * prog) / 100));
		setPathTotalLength(totalLength);
		setProgressStroke(totalLength - percStroke);
	}

	useEffect(() => {
		if (!audioRef?.current)
			return;
		audioRef.current.ontimeupdate = handleTimeUpdate;
	}, []);

	return (
		<div className={`${MAINCLASS}`}>
			<audio
				className={`${MAINCLASS}__audio`}
				id={id ? id : name
					? name
					: "audio"
				}
				title={name}
				ref={audioRef}
				src={src ? src : dummy}
				onLoadedData={handleLoadedData}
				onEnded={handleEnded}
				onPlay={handlePlay}
				onPause={handlePause}
			/>
			<ButtonCore
				className={`play`}
				onClick={handlePlayBtnClick}
			>
				{audioRef?.current?.paused ? 'play' : 'pause'}
			</ButtonCore>

			<div className={`${MAINCLASS}__track`}>
				
			</div>
			<p className={`${MAINCLASS}__time`}>
				-{play ? clientUtils.getHHMMSSFromTime(remainingTime) : clientUtils.getHHMMSSFromTime(duration)}
			</p>
		</div>
	);
});

Audio.displayName = "Audio";

export default Audio;