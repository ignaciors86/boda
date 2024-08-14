import { useState, useEffect, useContext } from "react";

import { DataContext } from "~/contexts/Data";
import { getMultimediaByLang } from "../multimediaGetters";

export function useTranslatedMultimedia(translationsArray) {
    const [translated, setTranslated] = useState(null);
    const { dataState } = useContext(DataContext);

    const lang = dataState?.language;

    useEffect(() => {
        if (translationsArray?.length > 0) {
            const translatedMM = getMultimediaByLang(translationsArray, lang);
            setTranslated(translatedMM ?? getMultimediaByLang(translationsArray, "ES") ?? translationsArray[0]);
        }
    }, [translationsArray, lang]);

    return translated;
};