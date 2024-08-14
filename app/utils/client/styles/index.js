/**
 * getCSSVarValue
 * @param {string} varName
 * @returns El valor de la variable CSS indicada en el parámetro varName.
 */
const getCSSVarValue = (varName) => {
	const cssVars = getComputedStyle(document.documentElement);

	return cssVars.getPropertyValue(varName);
};

export { getCSSVarValue };