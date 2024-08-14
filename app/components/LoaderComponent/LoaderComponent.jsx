import { forwardRef } from "react";
import Loader from "~/core/Loader";
import garabato from "~/assets/images/loader/gif-garabato.gif";

const LoaderComponent = forwardRef((loaded, ref) => {
	const MAINCLASS = "loaderComponent";

	return (	
		<div className={`${MAINCLASS}`}>
			<img src={garabato} alt="" className={`${MAINCLASS}__decoration`}></img>
			<Loader
				loaded={loaded}
				ref={ref}
			/>
		</div>
	);
});

LoaderComponent.displayName = "LoaderComponent";

export default LoaderComponent;