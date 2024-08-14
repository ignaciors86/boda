import gsap from "gsap";

const MM_FADE_IN_OUT_INTERVAL = 500;

const fadeInMainClass = (mainClass, callback) => gsap.timeline()
	.to(`.${mainClass}`, {opacity: 0, duration: 0,}, 0)
	.to(`.${mainClass}`, {opacity: 1, duration: 3,
		onComplete: callback
	}, ">");

const fadeOutMainClass = (mainClass, callback) => gsap.timeline()
	.to(`.${mainClass}`, {opacity: 1, duration: 0,}, 0)
	.to(`.${mainClass}`, {opacity: 0, duration: 1,
		onComplete: callback
	}, ">");
const playWithFadeIn = (multimedia, callback, time = MM_FADE_IN_OUT_INTERVAL) => {
	if (!multimedia)
		return false;

	multimedia.volume = 0;
	multimedia.play();

	callback && callback();

	const fadeInInterval = setInterval(() => {
		const currentVol = multimedia.volume;
		multimedia.volume = currentVol > 0.9
			? 1
			: currentVol + 0.1;

		if (multimedia.volume === 1) {
			clearInterval(fadeInInterval);
		}
	}, time / 10);
};
const pauseWithFadeOut = (multimedia, callback, time = MM_FADE_IN_OUT_INTERVAL) => {
	if (!multimedia)
		return false;

		const fadeOutInterval = setInterval(() => {
		const currentVol = multimedia.volume;
		multimedia.volume = currentVol < 0.1
			? 0
			: currentVol - 0.1;

		if (multimedia.volume === 0) {
			multimedia.pause();
			callback && callback();
			clearInterval(fadeOutInterval);
		}
	}, time / 10);
};

const scrollTo = (target, data, scroller, onComplete = () => { }) => {
	const defaultData = {
		duration: 0.1,
		ease: "power1.in",
		yoyo: false
	};
	const finalData = {
		...defaultData,
		...data
	};
	const finalScroller = scroller ? scroller : 'body',
		scrollerEl = document.querySelector(scroller);

	const scrollOffset = document.querySelector(target)?.offsetTop,
		currentOffset = scrollerEl.scrollTop;

	if (!isNaN(scrollOffset)) {
		const tween = gsap.to(finalScroller, {
			...finalData,
			duration: window.innerWidth / Math.abs(scrollOffset - currentOffset) * 10,
			scrollTop: scrollOffset,
			onComplete
		});
		return tween
	}else{
		onComplete()
	}
};

const translateOut = (target, data, direction) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const targetEl = typeof target == "string" ? document.querySelector(target) : target;
	const amountObj = {};

	if (!target || targetEl === null)
		return;

	switch (direction) {
		case "bottom":
			amountObj.y = window.innerHeight - targetEl.offsetTop;
			break;
		case "left":
			amountObj.x = targetEl.offsetLeft - window.innerWidth;
			break;
		case "right":
			amountObj.x = window.innerWidth - targetEl.offsetLeft;
			break;
		default:
			amountObj.y = targetEl.offsetTop - window.innerHeight;
			break;
	};

	const tween = gsap.to(target, {
		...finalData,
		...amountObj
	});

	return tween;
};

const fadeOut = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, {
		...finalData,
		opacity: 0
	});

	return tween;
};

const fadeOutFrom = (target, dataFrom, dataTo) => {
	const defaultDataFrom = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalDataFrom = {
		...defaultDataFrom,
		...dataFrom
	};

	const tween = gsap.fromTo(target, finalDataFrom, {
		opacity: 0
	});

	return tween;
};

const fadeIn = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, {
		...finalData,
		opacity: 1
	});

	return tween;
};

const fadeInFrom = (target, dataFrom) => {
	const defaultDataFrom = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalDataFrom = {
		...defaultDataFrom,
		...dataFrom
	};

	const tween = gsap.fromTo(target, finalDataFrom, {
		opacity: 1
	});

	return tween;
};

const fadeTo = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, finalData);

	return tween;
};

const growFrom = (target, fromData) => {
	const defaultFromData = {
		duration: 1,
		ease: "power1.in",
		transform: 'scale(0)',
		yoyo: false
	};

	const finalFromData = {
		...defaultFromData,
		...fromData
	};

	const tween = gsap.from(target, finalFromData);

	return tween;
};

const translateX = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		transform: 'translate(5vw)',
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, finalData);

	return tween;
};
const translateXFrom = (target, dataFrom, dataTo) => {
	const defaultFromData = {
		transform: 'translate(-5vw)',
	};
	const defaultToData = {
		duration: 1,
		ease: "power1.in",
		transform: 'translate(5vw)',
		yoyo: false
	};

	const finalFromData = {
		...defaultFromData,
		...dataFrom
	};

	const finalToData = {
		...defaultToData,
		...dataTo
	};

	const tween = gsap.fromTo(target, finalFromData, finalToData);

	return tween;
};

const blurOut = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.in",
		yoyo: false
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, {
		...finalData,
		backdropFilter: 'blur(0px)',
	});

	return tween;
};

const moveUpDown = (target, data) => {
	const defaultData = {
		duration: 1,
		ease: "power1.inOut",
		repeat: -1,
		y: '+=10',
		yoyo: true
	};

	const finalData = {
		...defaultData,
		...data
	};

	const tween = gsap.to(target, finalData);

	return tween;
};

export {
	blurOut,
	fadeIn,
	fadeInFrom,
	fadeInMainClass,
	fadeOut,
	fadeOutFrom,
	fadeOutMainClass,
	fadeTo,
	growFrom,
	moveUpDown,
	pauseWithFadeOut,
	playWithFadeIn,
	scrollTo,
	translateX,
	translateXFrom,
	translateOut
};