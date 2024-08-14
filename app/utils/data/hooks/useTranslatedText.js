import { useState, useEffect, useContext } from "react";

import { DataContext } from "~/contexts/Data";
import { getTextByLang } from "../textGetters";

export function useTranslatedText(translationsArray) {
    const [translated, setTranslated] = useState({});
    const { dataState } = useContext(DataContext);
    // const copies = dataState?.copies;
    const lang = dataState?.language;

    useEffect(() => {
        if (translationsArray?.length > 0) {
            const translatedMM = getTextByLang(translationsArray, lang);
            setTranslated(translatedMM ?? getTextByLang(translationsArray, "ES") ?? translationsArray[0]);
        }
    }, [translationsArray, lang]);

    return translated;
};