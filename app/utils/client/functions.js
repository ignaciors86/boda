//-------------------------------------------//
//----( Funciones sin una clasificación )----//
//-------------------------------------------//

/**
 * Crea una función que se auto-cancela al ser llamada antes de finalizar el tiempo de timeout.
 * @param 	{function} callback 
 * @param 	{number} timeout 
 * @returns {function}
 */
function debounce(callback, timeout = 500) {
	let timer;

	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			callback.apply(this, args);
		}, timeout);
	};
};
/**
 * Comprueba si un dato es false y no es cero, ya que este se computa como "false" en condicionales.
 * @param 	{*} 	datum 	Dato a comprobar.
 * @returns {boolean}
 */
const isFalseNotZero = (datum) => {
	return datum !== 0 && !datum;
};
/**
 * Obtiene un número aleatorio dentro del rango dado.
 * @param 	{number} 	min 	Valor inicial del rango.
 * @param 	{number} 	max 	Valor final del rango
 * @returns {number}
 */
const getRandomInRange = (min, max) => {
	return Math.random() * (max - min) + min;
};

const env = (key, ifnot) => {
	const rawValue = typeof window === "undefined"
		? process?.env?.[key]
		: window?.ENV?.[key];

	if (!rawValue)
		return ifnot;

	switch(typeof rawValue) {
		case "string":
			return /^(true|false)$/i.test(rawValue)
				? /^true$/i.test(rawValue)
				: rawValue;
		default:
			return rawValue;
	};
};
const srtToJSON = (url) => {
	fetch(url)
		.then(res => res.text())
		.then(content => {
			const lines = content.split('\n');

			const output = [];
			let buffer = {
				content: []
			};

			lines.forEach((line) => {
				if (!buffer.id) {
					buffer.id = line;
				}
				else if (!buffer.start) {
					var range = line.split(' --> ');
					buffer.start = range[0];
					buffer.end = range[1];
				}
				else if (line !== '') {
					buffer.content.push(line);
				}
				else {
					output.push(buffer);
					buffer = {
						content: []
					};
				}
			});
			return output;
		});
};

export {
	debounce,
	env,
	getRandomInRange,
	isFalseNotZero,
	srtToJSON
};