import {
	useEffect,
	useReducer,
} from "react";
import ScrollContext from "./ScrollContext";
import ScrollContextInitialState from "./ScrollContextInitialState";
import ScrollContextReducer from "./ScrollContextReducer";
import { clientUtils } from "~/utils";

const ScrollContextProvider = ({ children }) => {
	const [scrollState, dispatchScrollState] = useReducer(
		ScrollContextReducer,
		ScrollContextInitialState
	);

	useEffect(() => {
		dispatchScrollState({ type: "SET_SCROLLER", payload: clientUtils.smoothScroll("scrollWrapper", `scrollContent`) });
	}, []);

	return (
		<ScrollContext.Provider value={{
				scrollState,
				dispatchScrollState,
			}}
		>
			{children}
		</ScrollContext.Provider>
	);
};

export default ScrollContextProvider;
