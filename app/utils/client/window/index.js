
import { ScrollSmoother } from "gsap/dist/ScrollSmoother";
import { gsap } from "gsap";
gsap.registerPlugin(ScrollSmoother);

const DESIGN_WIDTH_MOBILE = 414;
const DESIGN_WIDTH_DESKTOP = 1920

//--------------------//
//----( Cálculos )----//
//--------------------//
const getDesignWidth = () => (
	isMobile()
		? DESIGN_WIDTH_MOBILE
		: DESIGN_WIDTH_DESKTOP
);

const getVW = size => {
	const getDesignWidth = getDesignWidth();
    return `${(size * 100 / getDesignWidth ) }vw`;
};

const getVWPortrait = size => {
    return `${(size * 100 / DESIGN_WIDTH_MOBILE ) }vw`;
};

const getVWLandscape = size => {
    return `${(size * 100 / DESIGN_WIDTH_DESKTOP ) }vw`;
};
const calcMaxHeight = (elementRef, velOpen, velClose, scrollTotal, show) => {
    if (show) {
        elementRef.current.style.transition = `max-height ${velOpen}s ease-out`;
        elementRef.current.style.maxHeight = scrollTotal + 'px';
		return;
	}
	elementRef.current.style.transition = `max-height ${velClose}s ease-out`;
	elementRef.current.style.maxHeight = 0;
};
const getSizedImg = (data) => {
	if (!data || data === null)
		return null;
	const { imagen, imagen_desktop } = data;
	return isMobile()
		? imagen
		: imagen_desktop ?? imagen
};

//------------------------//
//----( Dispositivos )----//
//------------------------//
const isPortrait = () => (window.innerHeight > window.innerWidth);
const isMobile = (strict) => {
    if (strict) return /Android|iPhone/i.test(navigator.userAgent);
    return isPortrait();
}
const getOrientationFromScreen = () => {
	if (window?.screen?.orientation)
		return window.screen.orientation.type.replace(/-(primary|secondary)/, "");
	// iOS/Safari
	return Math.abs(window.orientation) === 90 ? "landscape" : "portrait";
};

//------------------//
//----( Scroll )----//
//------------------//
const smoothScroll = (wrapper, content) => {
	const elements = document.querySelectorAll(`.${wrapper}, .${content}`);

	if (elements.length < 2 || elements.length % 2 !== 0)
		return;

	return ScrollSmoother.create({
		wrapper: `.${wrapper}`,
		content: `.${content}`,
		smooth: 1,               // how long (in seconds) it takes to "catch up" to the native scroll position
		effects: true,           // looks for data-speed and data-lag attributes on elements
		smoothTouch: 0.1,        // much shorter smoothing time on touch devices (default is NO smoothing on touch devices)
		speed: 0.75
	});
};

export {
	calcMaxHeight,
	getOrientationFromScreen,
	isMobile,
	isPortrait,
	getSizedImg,
	getVW,
	getVWLandscape,
	getVWPortrait,
	smoothScroll
};