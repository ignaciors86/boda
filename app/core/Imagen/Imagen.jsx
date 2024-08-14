import dummy from "./assets/images/dummy.webp";

const Imagen = (props) => {
	const { alt, className, src } = props;
	const MAINCLASS = "imagen";
	return (
		<img
			{...props}
			alt={alt}
			className={`${MAINCLASS} ${className}`}
			src={src ?? dummy}
		/>
	);
};

export default Imagen;