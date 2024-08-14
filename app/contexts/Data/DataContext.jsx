import { createContext } from "react";
import DataContextInitialState from "./DataContextInitialState";

const DataContext = createContext(DataContextInitialState);

export default DataContext;
