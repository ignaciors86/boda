const getTextByLang = (array, lang) => {
    const textLang = array.find(({ language }) => {
        const itemLang = language?.idName;
        return itemLang === lang;
    });

    return textLang;
};

export { getTextByLang };