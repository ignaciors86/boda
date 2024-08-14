/**
 * Invierte un string de fecha, de DD-MM-AAAA a AAAA-MM-DD.
 * @param 	{string} date 	String con la fecha a invertir, en formato XX-XX-XXXX
 * @param 	{string} joinChar String que servirá como unión entre los elementos del la nueva fecha.
 * @returns {string}
 */
const dateStringInvert = (date, joinChar = "-") => {
    return date.split('-').reverse().join(joinChar)
};
/**
 * Obtiene un string de fecha desde un objeto Date, teniendo en cuenta el huso horario.
 * @param 	{Date} 		date Objeto Date.
 * @returns {string}
 */
const dateToDateString = (date) => {
	return new Date(date.getTime() - (date.getTimezoneOffset()*60*1000)).toISOString().split('T')[0];
};
/**
 * Devuelve el valor de la fecha actual en string.
 * @returns {string}
 */
const todayDateString = () => {
	return dateToDateString(new Date());
};
/**
 * Obtiene un string completo de fecha, en formato 'Mon Dec 11 2023'.
 * @param 	{string} date 
 * @returns {string}
 */
const fullDateStringFromDateString = (date) => {
	const dateString = new Date(date).toDateString();
	return replaceDateAbbreviations(dateString);
};
/**
 * Reemplaza las abreviaturas de meses y días de la semana por sus valores completos.
 * De momento, lo hace en castellano.
 * @param 	{string} string 
 * @returns {string}
 */
const replaceDateAbbreviations = (string) => {
	let newString = string;

	// Day
	const dayNumber = newString.match(/\s\d{2}\s/g)[0]; 
	const dayMatch = newString.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/g)[0];
	newString = newString.replace(dayNumber, " ");

	switch (dayMatch) {
		case "Mon":
			newString = newString.replace(`${dayMatch} `, `Lunes${dayNumber}`);
			break;
		case "Tue":
			newString = newString.replace(`${dayMatch} `, `Martes${dayNumber}`);
			break;
		case "Wed":
			newString = newString.replace(`${dayMatch} `, `Miércoles${dayNumber}`);
			break;
		case "Thu":
			newString = newString.replace(`${dayMatch} `, `Jueves${dayNumber}`);
			break;
		case "Fri":
			newString = newString.replace(`${dayMatch} `, `Viernes${dayNumber}`);
			break;
		case "Sat":
			newString = newString.replace(`${dayMatch} `, `Sábado${dayNumber}`);
			break;
		case "Sun":
			newString = newString.replace(`${dayMatch} `, `Domingo${dayNumber}`);
			break;
	};
	// Month
	const monthMatch = newString.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/g)[0];
	switch (monthMatch.trim()) {
		case "Jan":
			newString = newString.replace(monthMatch, "Enero ");
			break;
		case "Feb":
			newString = newString.replace(monthMatch, "Febrero ");
			break;
		case "Mar":
			newString = newString.replace(monthMatch, "Marzo ");
			break;
		case "Apr":
			newString = newString.replace(monthMatch, "Abril ");
			break;
		case "May":
			newString = newString.replace(monthMatch, "Mayo ");
			break;
		case "Jun":
			newString = newString.replace(monthMatch, "Junio ");
			break;
		case "Jul":
			newString = newString.replace(monthMatch, "Julio ");
			break;
		case "Aug":
			newString = newString.replace(monthMatch, "Agosto ");
			break;
		case "Sep":
			newString = newString.replace(monthMatch, "Septiembre ");
			break;
		case "Oct":
			newString = newString.replace(monthMatch, "Octubre ");
			break;
		case "Nov":
			newString = newString.replace(monthMatch, "Noviembre ");
			break;
		case "Dec":
			newString = newString.replace(monthMatch, "Diciembre ");
			break;
	};

	return newString;
};

export {
	dateStringInvert,
	dateToDateString,
	todayDateString,
	fullDateStringFromDateString,
	replaceDateAbbreviations
};