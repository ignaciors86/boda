const DataContextReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case "SET_DATA":
            return { ...state, ...payload };
        case "REMOVE_DATA":
            delete state[payload];
            return { ...state };
        case "CHANGE_LANG": 
            return { ...state, language: payload }
        default:
            return state;
    }
};

export default DataContextReducer;