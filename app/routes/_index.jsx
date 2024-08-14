import { json } from "@remix-run/node";

import Texto from "~/core/Texto";
import { LoaderProvider } from "~/contexts/Loader";

export async function loader(data) {
	const { params } = data;

	const path = params["*"];

	return json({ currentPath: path });
};

const DEFAULT_SEO = {
	title: '',
	description: ''
};
const DINAMIC_SEO = {
	'page-name': {
		title: '',
		description: ''
	}
};

export const meta = ({ data }) => {
	const { currentPath } = data;

	return [
		{ title: DINAMIC_SEO[currentPath]?.title ?? DEFAULT_SEO.title },
		{
			property: "og:title",
			content: DINAMIC_SEO[currentPath]?.title ?? DEFAULT_SEO.title,
		},
		{
			name: 'description',
			content: DINAMIC_SEO[currentPath]?.description ?? DEFAULT_SEO.description
		},
		// {
		// 	tagName: "link",
		// 	as: "video",
		// 	href: videoLink,
		// 	rel: "preload"
		// },
		// {
		// 	name: "twitter:image",
		// 	content: "https://multimedia-lab-pre.rtve.es/strapi-${PROJECT_NAME}/URL"
		// },
		// {
		// 	property: "twitter:image",
		// 	content: "https://multimedia-lab-pre.rtve.es/strapi-${PROJECT_NAME}/URL"
		// }
	];
};

export default function IndexRoute() {
	const MAINCLASS = "index expand";

	return (
		<div className={`${MAINCLASS}`}>
			<LoaderProvider>
				<Texto>Hello Index Routes</Texto>
			</LoaderProvider>
		</div>
	);
};