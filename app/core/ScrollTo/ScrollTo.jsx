import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import ButtonCore from "../Button";
import { useGetCopy } from "~/utils/data/hooks/useGetCopy";

gsap.registerPlugin(ScrollTrigger);

const ScrollTo = () => {
	const MAINCLASS = "scrollTo";

	const [ showButton, setShowButton ] = useState(false);
	
	useEffect(() => {
		gsap.to(`.${MAINCLASS}__aviso-scroll`, {
			scrollTrigger: {
				trigger: `.${MAINCLASS}__aviso-scroll`,
				start: "top 60%",
				end: "top 90%",
				toggleActions: "play none reverse none",
			},
			x: "200",
			duration: 0.6,
			onComplete: () => {
				setShowButton(true);
			},
		});

		gsap.to('.arrow-up', {
			scrollTrigger: {
				trigger: '.arrow-up',
				start: "top 0%",
				end: "top 0%",
				toggleActions: "play none reverse none",
			},
			opacity: 1,
			duration: 0.5,
			onReverseComplete: () => {
				setShowButton(false);
			},
		});
	}, []);

	const handleGoUpClick = () => {
		window.scrollTo({
			top: 0,
			behavior: 'smooth',
		});
		setShowButton(false);
	};

	return (
		<div className={`${MAINCLASS}`}>
			<div className={`${MAINCLASS}__aviso-scroll`}>
				{useGetCopy("scroll_text")}
			</div>
			<ButtonCore
				className={`icon arrow-up ${showButton ? "" : "hidden"}`}
				onClick={handleGoUpClick}
			/>
		</div>
	);
};

export default ScrollTo;