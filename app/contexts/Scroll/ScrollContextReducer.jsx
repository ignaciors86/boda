const ScrollContextReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case "SET_SCROLLER":
            return { ...state, scroller: payload };
        case "PAUSE_SCROLL":
            state.scroller && state.scroller.paused(true);
            return state;
        case "RESUME_SCROLL":
            state.scroller && state.scroller.paused(false);
            return state;
        default:
            return state;
    }
};

export default ScrollContextReducer;