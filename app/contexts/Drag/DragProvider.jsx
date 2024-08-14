import { useEffect, useReducer, useRef, useState } from "react";
import { gsap } from "gsap";

import DragContext from "./DragContext";
import DragInitialState from "./DragInitialState";
import DragReducer from "./DragReducer";

    const DragProvider = ({ children }) => {
    const [dragState, dispatchDragState] = useReducer(
        DragReducer,
        DragInitialState
    );

    return (
        <DragContext.Provider value={{ dragState, dispatchDragState }}>
            {children}
        </DragContext.Provider>
    );
};

export default DragProvider;
