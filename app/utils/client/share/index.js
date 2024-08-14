import { sendShareEvent } from "../stats";

const shareWithSO = (imageUrl, text, url) => {
	return fetch(imageUrl)
		.then((response) => {
			return response.blob()
		})
		.then((blob) => {
			var file = new File([blob], "${PROJECT_NAME}.jpg", {type: 'image/jpeg'});
			var filesArray = [file];

			if (navigator.canShare && navigator.canShare({ files: filesArray })) {
				const sharePromise = navigator.share({
					text: text,
					files: filesArray,
					url: url
				});
				sharePromise.then(() => {
					sendShareEvent();
				});
			}
		})
};
const shareWithSOData = (imageUrl, text, url) => {
	var file = new File([imageUrl], "${PROJECT_NAME}.png", {type: 'image/png'});
	var filesArray = [file];

	if (navigator.canShare && navigator.canShare({ files: filesArray })) {
		const sharePromise = navigator.share({
			text: text,
			files: filesArray,
			url: url
		});
		sharePromise.then(() => {
			sendShareEvent();
		});
	}
};

export {
	shareWithSO,
	shareWithSOData
};