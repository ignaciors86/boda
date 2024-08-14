import { useGetCopy } from "~/utils/data/hooks/useGetCopy";
import Texto from "~/core/Texto";

const TurnDevice = () => {
	const MAINCLASS = "turnDevice";

	return (
		<div className={`${MAINCLASS}`}>
			<Texto
				className="bcopy__1 title"
				isMarkdown={true}
			>
				{useGetCopy("turnDevice_title")}
			</Texto>
			<Texto
				className="titular__1"
				isMarkdown={true}
			>
				{useGetCopy("turnDevice_oops")}
			</Texto>
			<Texto
				className="bcopy__2 parrafo"
				isMarkdown={true}
			>
				{useGetCopy("turnDevice_parrafo")}
			</Texto>
		</div>
	);
};

export default TurnDevice;