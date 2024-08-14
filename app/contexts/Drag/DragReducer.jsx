import DragInitialState from "./DragInitialState";
const DragReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case "SET":
            state?.dragger?.kill();
            state?.observer?.kill();
            state?.scroller?.kill();
            return {
                ...state,
                ...payload
            };
        case "PAUSE_OBSERVER":
            state?.observer?.disable();
            return state;
        case "RESUME_OBSERVER":
            state?.observer?.enable();
            return state;
        case "PAUSE_DRAGGER":
            state?.dragger?.disable();
            return state;
        case "RESUME_DRAGGER":
            state?.dragger?.enable();
            return state;
        case "PAUSE_SCROLLER":
            state?.scroller?.pause();
            return state;
        case "RESUME_SCROLLER":
            state?.scroller?.resume();
            return state;
        case "KILL_ALL":
            state?.dragger?.kill();
            state?.observer?.kill();
            state?.scroller?.kill();
            state?.helper?.kill();

            return DragInitialState;
        case "RESET_ALL":
            state?.dragger?.kill();
            state?.observer?.kill();
            state?.scroller?.kill();

            return state;
        default:
            return state;
    }
};

export default DragReducer;