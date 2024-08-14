import { createContext } from "react";
import LoaderInitialState from "./LoaderInitialState";

const LoaderContext = createContext(LoaderInitialState);

export default LoaderContext;