/**
 * Reordena aleatoriamente un array proporcionado.
 * @param 	{array} array 
 * @returns {array}.
 */
const shuffleArray = array => {
	const shuffledArray = [...array];

	for (let i = shuffledArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffledArray[i];
		shuffledArray[i] = shuffledArray[j];
		shuffledArray[j] = temp;
	}
	return shuffledArray;
};
/**
 * Esta función la he dejado como ejemplo para crear una función con sort.
 */
// const sortCasesByOrder = (sortableData) => {
// 	return sortableData.sort(({ orden_aparicion: orden_a}, { orden_aparicion: orden_b }) => {
// 		if (!orden_a) {
// 			return orden_b ?? 0;
// 		}
// 		if (!orden_b) {
// 			return 0;
// 		}
// 		return orden_a - orden_b;
// 	});
// };

export {
	shuffleArray
};