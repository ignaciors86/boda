import { useState, useEffect, useContext } from "react";

import { DataContext } from "~/contexts/Data";
import {
    getCopyByArray,
    getCopyById
} from "../copyGetters";

export function useGetCopy(idOrArray) {
    const [copyText, setCopyText] = useState("");
    const { dataState } = useContext(DataContext);
    const copies = dataState?.copies;
    const lang = dataState?.language;

    const getCopy = (idOrArray) => {
        if (typeof idOrArray !== 'string') {
            setCopyText(getCopyByArray(idOrArray, lang));
        } else {
            setCopyText(getCopyById(copies, lang, idOrArray));
        }
    };

    useEffect(() => {
        if (copies?.length > 0) {
            getCopy(idOrArray);
        }
    }, [copies, idOrArray, lang]);

    return copyText;
};