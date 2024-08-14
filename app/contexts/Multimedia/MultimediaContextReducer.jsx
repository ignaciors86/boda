const MultimediaContextReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case "PLAY":
            return { ...state, play: payload };
        case "TOGGLE_MUTE":
            if (!state.mute) {
                state?.currentMedia && (state.currentMedia.muted = true);
                return { ...state, mute: true };
            } else {
                state?.currentMedia && (state.currentMedia.muted = false);
                return { ...state, mute: false };
            }
        case "SET_CURRENT_MEDIA":
            payload.muted = state.mute;
            return { ...state, currentMedia: payload };
        case "PAUSE_CURRENT_MEDIA":
            state?.currentMedia?.pause();
            return { ...state, play: false };
        case "PLAY_CURRENT_MEDIA":
            state?.currentMedia?.play();
            return { ...state, play: true };
        default:
            return state;
    }
};

export default MultimediaContextReducer;