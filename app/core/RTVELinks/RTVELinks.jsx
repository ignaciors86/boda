import logoLab from "~/assets/images/RTVELinks/logo-lab.svg";

const RTVELinks = ({ className="", custom, onClick }) => {
	const MAINCLASS = "rtveLinks";

	const handleLogoClick = () => {
		window.open(`https://www.rtve.es/lab`, "_blank");
		onClick && onClick();
	};
	
	return ( 
		<span
			className={`${MAINCLASS} ${className}`}
			onClick={handleLogoClick}
		>
			<img
				alt={""}
				src={custom ? custom : logoLab}
				/>
		</span>
	)

};

export default RTVELinks;