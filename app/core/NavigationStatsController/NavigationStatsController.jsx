import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { clientUtils } from "~/utils";

const NavigationStatsController = () => {
	let location = useLocation();

	useEffect(() => {
		(location?.pathname) &&
			clientUtils.sendStatisticsChangeUrl(location.pathname.substring(location.pathname.lastIndexOf("/")));
	}, [location]);

	return <></>;
};

export default NavigationStatsController;