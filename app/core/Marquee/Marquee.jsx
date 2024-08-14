import FastMarquee from "react-fast-marquee";

const Marquee = (props) => {
	const { autoFill=true, className="", direction="left", ...defaultProps} = props;
	const MAINCLASS = "marquee";

	return (
		<div className={`${MAINCLASS} ${className}`}>
			<FastMarquee
				autoFill={autoFill}
				direction={direction}
				{...defaultProps}
				// loop={0}
			/>
		</div>
	);
};

export default Marquee;