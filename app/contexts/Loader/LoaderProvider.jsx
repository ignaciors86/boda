import { useEffect, useReducer, useRef, useState } from "react";
import { clientUtils } from "~/utils";

import LoaderContext from "./LoaderContext";
import LoaderInitialState from "./LoaderInitialState";
import LoaderReducer from "./LoaderReducer";
import LoaderComponent from "~/components/LoaderComponent";

const LOADER_FADE_IN_OUT_TIME = 0.7;
const LOADER_FADE_IN_OUT_DELAY_TIME = 5;

const LoaderProvider = ({ children }) => {
    const [showLoader, setShowLoader] = useState(true);
    const loaderRef = useRef()
    const [loaderState, dispatchLoaderState] = useReducer(
        LoaderReducer,
        LoaderInitialState
    );

    useEffect(() => {
		showLoader && clientUtils.fadeInFrom(loaderRef.current, { 
            delay: LOADER_FADE_IN_OUT_DELAY_TIME,
			duration: LOADER_FADE_IN_OUT_TIME, 
			onComplete: function() { this.kill() }
		})
    }, [showLoader]);

    useEffect(() => {
        !loaderState.show && clientUtils.fadeOut(loaderRef.current, {
            opacity: 0,
			delay: LOADER_FADE_IN_OUT_DELAY_TIME,
            duration: LOADER_FADE_IN_OUT_TIME,
			onComplete: () => {
				setShowLoader(false);
                dispatchLoaderState({ type: "SHOW" });
			} 
		});
    }, [loaderState.show]);

    return (
        <LoaderContext.Provider value={{ loaderState, dispatchLoaderState }}>
            {showLoader &&
                <LoaderComponent 
                    loaded={!loaderState.show}
                    ref={loaderRef}
                />
            }
            {children}
        </LoaderContext.Provider>
    );
};

export default LoaderProvider;
