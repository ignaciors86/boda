import { clientUtils } from "..";

const parseBasicDataEl = (rawData) => rawData?.data?.attributes;
const parseMediaEl = (rawData) => {
	if (!rawData)
		return rawData;

	return {
		...rawData,
		url: clientUtils.addHostToUrl(rawData?.url ?? "")
	};
};
const parseLanguage = (rawData) => rawData?.idName ?? "ES";
//-------------------//
//----( Parsers )----//
//-------------------//
const parsePrueba = (rawData) => {
	return rawData?.data ?? null;
}
const parseCopies = (rawData) => {
	const { data } = rawData ?? {};

	if (!data)	
		return { copies: null };
	if (!data.copies)
		return data;

	const copies = data.copies.data;
	return { copies };
}

export default (dataType) => {
	switch(dataType) {
		case "dataTypePrueba":
			return parsePrueba;
		case "copies":
			return parseCopies;
		default:
			return () => console.log(`No parser for dataType ${dataType}`);
	}
};