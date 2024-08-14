/**
 * Limpia la extensión de un string dado. Es decir, si le pasamos "archivo.png",
 * nos quitaría la parte ".png", quedando "archivo".
 * @param 	{string} string 
 * @returns {string}
 */
const cleanExtension = (string) => {
	return string.replace(/\.\w*$/, "")
};
/**
 * Convierte cualquier string en un color.
 * @param 	{string} str String a convertir.
 * @returns {string}
 */
const stringToColor = function(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	let colour = '#';
	for (let i = 0; i < 3; i++) {
		let value = (hash >> (i * 8)) & 0xFF;
		let rawAdditionalString = '00' + value.toString(16);
		colour += rawAdditionalString.substring(rawAdditionalString.length - 2);
	}
	return colour;
};

const genHash = function(length=5, options = {}) {
	const letters = 'abcdefghijklmnopqrstuvwxyz';
	const capsChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const numChars = "0123456789";
	const specialChars = "!@#$%^&*()";

	const allOptions = typeof options === "boolean" && options;
	let chars = "";

	if (allOptions) {
		chars = `${letters}${capsChars}${numChars}${specialChars}`;
	} else {
		const { special, caps, nums } = options ?? {};
		chars = `${letters}${caps ? capsChars : ""}${nums ? numChars : ""}${special ? specialChars : ""}`;
	}

	const charLength = chars.length;

	let result = '';
	for (var i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * charLength));
	}
	return result;
};

export {
	cleanExtension,
	genHash,
	stringToColor
};