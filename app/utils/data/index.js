const deleteTypename = (obj) => {
	delete obj["__typename"];
};
// MEJORAR: Hacer que no haga falta sustituir los nombres tipo "ComponentModules" en el replace.
const getTypeFromTypename = (typeName) => {
	return typeName.replace(/(ComponentModules|ComponentMultimedia)/, "");
};

export {
	deleteTypename,
	getTypeFromTypename
};