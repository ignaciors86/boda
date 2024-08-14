import {
	useReducer,
} from "react";

import DataContext from "./DataContext";
import DataContextInitialState from "./DataContextInitialState";
import DataContextReducer from "./DataContextReducer";

const DataContextProvider = ({ children }) => {
	const [dataState, dispatchDataState] = useReducer(
		DataContextReducer,
		DataContextInitialState
	);

	return (
		<DataContext.Provider value={{
				dataState,
				dispatchDataState,
			}}
		>
			{children}
		</DataContext.Provider>
	);
};

export default DataContextProvider;
