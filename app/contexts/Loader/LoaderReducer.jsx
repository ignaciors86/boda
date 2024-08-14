const LoaderReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case "SHOW":
            return {
                ...state,
                show: true
            };
        case "HIDE":
            return {
                ...state,
                show: false
            };
        default:
            return state;
    }
};

export default LoaderReducer;