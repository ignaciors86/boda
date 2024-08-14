import {
	useReducer,
} from "react";
import MultimediaContext from "./MultimediaContext";
import MultimediaContextInitialState from "./MultimediaContextInitialState";
import MultimediaContextReducer from "./MultimediaContextReducer";

const MultimediaContextProvider = ({ children }) => {
	const [MultimediaState, dispatchMultimediaState] = useReducer(
		MultimediaContextReducer,
		MultimediaContextInitialState
	);

	return (
		<MultimediaContext.Provider value={{
				MultimediaState,
				dispatchMultimediaState,
			}}
		>
			{children}
		</MultimediaContext.Provider>
	);
};

export default MultimediaContextProvider;
