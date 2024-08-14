// Methods
const setItem = (key, item) => {
	localStorage.setItem(key, item);
};
const getItem = (key) => {
	return localStorage.getItem(key);
};

const clearData = () => {
	localStorage.clear();
};

const removeItem = (item) => {
	localStorage.removeItem(item);
};

export {
	clearData,
	getItem,
	removeItem,
	setItem
};