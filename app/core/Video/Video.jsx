import { forwardRef, useContext, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Slider } from "@mui/material";

import MultimediaContext from "~/contexts/Multimedia/MultimediaContext";
import ButtonCore from "~/core/Button";
import { clientUtils } from "~/utils";

import loading from "./assets/images/loading.gif";
import dummy from "./assets/video/dummy.mp4";

const Video = forwardRef(({className, url, name, poster, disabled=false, id, language="ES", subtitles, showCanvas = false, textButton}, ref) => {
	const MAINCLASS = "video";

	const {MultimediaState, dispatchMultimediaState} = useContext(MultimediaContext);

	const videoRef = useRef();
	
	const [currentTime, setCurrentTime] = useState(null);
	const [duration, setDuration] = useState(null);
	const [isThisPlaying, setIsThisPlaying] = useState(false);
	// const [isPlaying, setIsPlaying] = useState(false);	
	const [fading, setFading] = useState(false);
	const [firstPlay, setFirstPlay] = useState(null);	
	const [fullScreen, setFullScreen] = useState(false);
	const [played, setPlayed] = useState(false);
	const [showControls, setShowControls] = useState(false);
	const [showSubtitles, setShowSubtitles] = useState(false);
	const [spinner, setSpinner] = useState(false);
	const [timeCounter, setTimeCounter] = useState(0);
	const [volume, setVolume] = useState(0.5);
	const INCREMENT_TIME = 10;
	const CONTROLS_FADEOUT_TIME = 400;
	
	/** METHODS */
	// Estos dos se han metido en useMemo para que el debounce funcione correctamente.
	const showControlsAnim = useMemo(() => (state = true) => {
		gsap.timeline().to(`.${MAINCLASS}__controls__wrapper, .${MAINCLASS}__controls__buttons, .${MAINCLASS}__controls__progress`, {
			duration: 0.5,
			opacity: !state ? 0 : 1
		}, 0);
	}, []);
	const hideControlsAnim = useMemo(() => clientUtils.debounce(() => {
		showControlsAnim(false);
	}, CONTROLS_FADEOUT_TIME), []);

	const volumeChange = (e, value) => setVolume(parseFloat(value));

	const keyDown = (e) => {
		const paused = videoRef.current.paused;

		e.keyCode === 32
			&& togglePlay(paused)
		// e.keyCode === 32
		// 	? togglePlay(paused)
		// 	:
		// e.keyCode === 37
		// 	? addRemoveTime(ADD_REMOVE_SECONDS)()
		// 	:
		// e.keyCode === 39
		// 	&& addRemoveTime(ADD_REMOVE_SECONDS)(true);
	};

	const toggleFullScreen = () => {
		setFullScreen(!fullScreen);
		let elem = document.querySelector("video");
		if (elem && !document.fullscreenElement) {
			elem?.requestFullscreen().catch();
		} else if (document?.exitFullscreen) {
			document?.exitFullscreen(); 
		}
	}

	const initEvents = () => {
		document.body.addEventListener("keydown", keyDown);
	};

	const destroyEvents = () => {
		document.body.removeEventListener("keydown", keyDown);
	};

	// const togglePlay = () => {
	// 	dispatchMultimediaState({ type: "PLAY", payload: url});		
	// 	setIsPlaying(videoRef?.current?.paused)
	// 	videoRef?.current?.paused 
	// 		? videoRef?.current?.play()
	// 		: videoRef?.current?.pause();
	// 		setFading(true);
	// };

	const togglePlay = () => {
		videoRef?.current?.paused 
			? videoRef?.current?.play()
			: videoRef?.current?.pause();
	};


	// Handlers.
	const handleBigButtonClick = () => {
		togglePlay()
		setFading(true);
	};
	const handlePlayButtonClick = () => {
		togglePlay();
	};
	const handleSliderChange = (e, value) => setCurrentTime(value);
	const handleMouseMove = () => {
		showControlsAnim(true);
		hideControlsAnim();
	};
	
	// Handlers video.
	const handleTimeUpdate = () => setTimeCounter(videoRef.current.currentTime);
	const handleSeeking = () => setSpinner(true);
	const handlePlay = () => {
		const currentVideo = videoRef?.current;
		dispatchMultimediaState({ type: "PLAY", payload: url});

		if (MultimediaState.currentMedia !== currentVideo) {
			dispatchMultimediaState({ type: "PAUSE_CURRENT_MEDIA" });
			dispatchMultimediaState({ type: "SET_CURRENT_MEDIA", payload: currentVideo });
		}
		
		clientUtils.onPlayStats(currentVideo, "video");

		if (!played) {
			clientUtils.onFirstPlayStats(currentVideo, "video");
			setShowControls(true);
			setPlayed(true);
		}
	};
	const handlePause = () => {
		const currentVideo = videoRef?.current;
		dispatchMultimediaState({ type: "PLAY", payload: ""});

		clientUtils.onPauseStats(currentVideo, "video");
	};
	const handleEnded = () => {
		const currentVideo = videoRef?.current;

		clientUtils.onEndStats(currentVideo, "video");

		setFirstPlay(null);
	};
	const handleLoadedData = () => {
		setDuration(videoRef.current.duration);
	};
	const handleCanPlayThrough = () => {
		setSpinner(false);
	};

	useEffect(() => {
		setIsThisPlaying(MultimediaState.currentMedia === videoRef?.current);
	}, [MultimediaState.currentMedia]);

	useEffect(() => {
		if (isThisPlaying) {
			setFirstPlay(true);
		} else {
			const bitButton = ref?.current?.querySelector("button.button1.main");
			gsap.to(bitButton, { opacity: 1, duration: 0 });
			setFirstPlay(false);
		}
	}, [isThisPlaying]);

	useEffect(() => {
		if (!firstPlay)
			return;
		initEvents();
		return destroyEvents;
	}, [firstPlay]);

	useEffect(() => {
		videoRef.current.volume = volume;
	}, [volume]);

	useEffect(() => {
		videoRef.current.muted = MultimediaState.mute;
	}, [MultimediaState.mute]);

	useEffect(() => {
		videoRef.current.currentTime = currentTime;
		videoRef.current.ontimeupdate = handleTimeUpdate;
	}, [currentTime]);

	useEffect(() => {
		const element = ref?.current?.querySelector("button.button1.main") ?? null;

		if (fading && element) {
			const tl = gsap.timeline({});

			!firstPlay && tl.to(element, { opacity: 0, duration: 0, }, 0);
			tl
				.to(element, {
					opacity: 1,
					duration: 0.1,
				}, ">")
				.to(element, {
					opacity: 0,
					delay: 0.2,
					duration: 0.2,
					onComplete: () => {
						setFading(false);
						tl.kill();
					}
				}, ">");
		}
	}, [fading]);

	return (
		<div className={`${MAINCLASS} ${className ?? ""}`} 
			ref={ref}
			onMouseMove={showControls
				? handleMouseMove
				: null
			}
			onDrag={(event) => {
				event.preventDefault();
			}}
		>
			<video 
				crossOrigin="anonymous"
				id={id
					? id
					: name
						? name
						: "mainVideo"
				}
				title={name}
				muted={MultimediaState?.mute}
				poster={poster}
				playsInline
				preload="true"
				src={url ?? dummy}
				ref={videoRef}
				onCanPlayThrough={handleCanPlayThrough}
				onClick={handleBigButtonClick}
				onDrag={(event) => {
					event.preventDefault();
				}}
				onEnded={handleEnded}
				onLoadedData={handleLoadedData}
				onPlay={handlePlay}
				onPause={handlePause}
				onSeeking={handleSeeking}
				onTimeUpdate={handleTimeUpdate}
			>
				<source src={url ?? dummy} type="video/mp4" />
				{showSubtitles && subtitles?.map((subtitle, i) => {
					return <track
						default
						key={i}
						label="Español"
						kind="subtitles"
						srcLang={language}
						src={subtitle.url}
						className="track_subtitles"
						style={{marginBottom: '5%'}}
					/>;
				})}
			</video>

			{spinner && <img
				alt=""
				src={loading}
				className={`${MAINCLASS}__loading`}
			/>}

			<div className={`${MAINCLASS}__controls`}>
				<ButtonCore
					className={`button1 ${videoRef?.current?.paused
						? firstPlay ? "pause" : "play"
						: firstPlay ? "play" : "pause"} ${textButton && "text"} main`}
					onClick={!firstPlay
						? handleBigButtonClick
						: null
					}
				/>
				<div className={`${MAINCLASS}__controls__overlay ${firstPlay ? "" : "hidden"}`} onClick={handleBigButtonClick} />
				<div className={`${MAINCLASS}__controls__wrapper ${firstPlay ? "" : "hidden"}`}>
					<div className={`${MAINCLASS}__controls__progress`}>
						<Slider
							aria-label="Avance"
							disabled={disabled}
							min={0}
							max={duration}
							step={1}
							value={timeCounter}
							onChange={handleSliderChange}
						/>
					</div>
					<div className={`${MAINCLASS}__controls__buttons`}>
						<div className={`${MAINCLASS}__controls__buttons__left`} >
							<ButtonCore
								className={`${videoRef?.current?.paused ? "play" : "pause"} ${textButton && "text"}`}
								onClick={handlePlayButtonClick}
							/>
							<ButtonCore
								className={`volume${MultimediaState?.mute ? "-off" : ""}`}
								onClick={() => dispatchMultimediaState({ type: "TOGGLE_MUTE" })}
							/>
							<Slider
								className={`sliderVolume`} 
								min={0} 
								max={1} 
								step={0.01} 
								aria-label="Volume" 
								value={!MultimediaState.mute ? volume : 0} 
								onChange={volumeChange} 
							/>
							<div>
								<ButtonCore
									className={`advance`}
									onClick={() => setCurrentTime(currentTime - INCREMENT_TIME)}
								/>
								<ButtonCore
									className={`advance`}
									onClick={() => setCurrentTime(currentTime + INCREMENT_TIME)}
								/>
							</div>
							<ButtonCore
								className={`subtitles${!showSubtitles ? "-off" : ""}`}
								onClick={() => setShowSubtitles(!showSubtitles)}
							/>
						</div>
						<div className={`${MAINCLASS}__controls__buttons__right`} >
							<span className="timeCounter">
								{clientUtils.getHHMMSSFromTime(timeCounter)}
							</span>
							<ButtonCore
								className={`fullScreen`}
								onClick={toggleFullScreen}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});

Video.displayName = "Video";

export default Video;                                                                                                  