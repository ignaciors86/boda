import { useEffect, useState } from "react";
import { Link } from "@remix-run/react";

import { clientUtils } from "~/utils";

const LinkBasepath = ({ children, className, to="" }) => {
	const MAINCLASS = "link";
	const [url, setUrl] = useState(to);

	useEffect(() => {
		if (!to.startsWith("/"))
			return;
		
		const fullRoute = clientUtils.addBasepathToRoute(to);

		fullRoute !== to &&
			setUrl(`/${BASEPATH}${to}`);
	}, []);

	return <Link
		className={`${MAINCLASS} ${className}`}
		to={url}
	>
		{children ?? ""}
	</Link>;
};
export default LinkBasepath;