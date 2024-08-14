import { toBlob, toPng, toCanvas } from 'html-to-image';
// import download from "downloadjs";

const printNode = (node, callback) => {
	// toCanvas(node, { cacheBust: false, filter: () => {
	toPng(node, { cacheBust: true, filter: () => {
		return true
	} })
		.then(callback ?? (() => {
			console.log("No callback secified.");
		}))
		.catch(function (error) {
			console.error('oops, something went wrong!', error);
		});
};

const getNodePNGBlob = async (node) => {
	return await toBlob(node);
};

const downloadFromCanvas = (canvas, name) => {
	// let resolutionCounter = 0;
	// const canvasImgs = canvas.querySelector("img");
	// document.body.appendChild(canvas)
	// debugger;
	// downloadFromBlob(name)(blob);
};

const downloadNode = (node, name) => {
	const callback = (blob) => {
		downloadFromBlob(name)(blob);
	};
	printNode(node, callback);
	// printNode(node, downloadFromCanvas);
};

const downloadFromBlob = (name) => {
	return (dataUrl) => {
		const link = document.createElement('a')
		link.download = `${(name && name !== "") ? name : "${PROJECT_NAME}"}.png`
		link.href = dataUrl;
		link.click();
	};
};

export {
	downloadNode,
	getNodePNGBlob,
	printNode
};