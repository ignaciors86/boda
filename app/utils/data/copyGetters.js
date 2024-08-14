const getCopyByArray = (array, lang) => {
    return (array?.length !== 0 && array?.find(copy => copy?.language?.data?.attributes?.idName === lang)?.text) ?? '';
};

const getCopyById = (copies, lang, id) => {
    const copyMatch = copies && Array.isArray(copies)
        ? copies.find(copy => copy?.attributes?.textID === id)
        : {};
    const copyResult = copyMatch?.attributes?.translate?.find(copy => copy?.language?.data?.attributes?.idName === lang);
    return copyResult?.text ?? id;
};

export {
	getCopyByArray,
	getCopyById
};