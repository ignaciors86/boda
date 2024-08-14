export default (data) => {
	const hasPartialResponse = Object.keys(data).length > 1;

	if (data?.errors?.length) {
		const errorString = data?.errors?.reduce((str, { message }) => {
			return str.concat(message);
		}, "");

		if (!hasPartialResponse)
			throw new Error(errorString);
		else
			console.error(errorString);
	}
	delete data.errors;

	return data;
};