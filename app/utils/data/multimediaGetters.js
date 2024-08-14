const getMultimediaByLang = (array, lang) => {
    const multimediaLang = array.find(({ language }) => {
        const itemLang = language?.idName;
        return itemLang === lang;
    });

    return multimediaLang;
};

export { getMultimediaByLang };