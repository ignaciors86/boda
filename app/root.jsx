import { useContext, useEffect, useState } from "react";
import { json } from "@remix-run/node";
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useLoaderData, useRouteError } from "@remix-run/react";

import TestingBar from "./components/TestingBar";
import { DataContext } from "~/contexts/Data";
import Error from "~/core/Error";
import NavigationStatsController from "~/core/NavigationStatsController";
import Stats from "~/core/Stats";
import { getCopies, serverUtils, clientUtils } from "~/utils";

import componentStyles from "~/styles/components.css";
import fontFace from "~/styles/font-face.css";
import resetCss from "~/styles/reset.css";
import favicon from "~/assets/images/favicon.webp";
import { useGetCopy } from "./utils/data/hooks/useGetCopy";

/**
 * preloadableMedia ha de ser un array, con
 * elementos que tengan la siguiente estructura:
 *
 * [
 * 		{ url: [var importada or string], type: [img|video] },
 * 		{ url: [var importada or string], type: [img|video] },
 * 		...etc.
 * ]
 **/
const preloadableMedia = [];

/**
 * Introducir aquí todos los getters a la BDD,
 * de la forma `const nombre = await getCosaBDD();
 * */
const loaderDataFetcher = async () => {
	const { copies } = await getCopies();

	return { copies };
};

export const meta = () => {
	return [
		{
			name: "twitter:image",
			content: "https://multimedia-lab-pre.rtve.es/strapi-${PROJECT_NAME}/VENTA_WHATSAPP_366ef28eea.webp"
		},
		{
			property: "og:image",
			content: "https://multimedia-lab-pre.rtve.es/strapi-${PROJECT_NAME}/VENTA_TWITTER_d5e0fff5d8.webp"
		}
	]
}

export const links = () => {
	return [
		// { rel: "stylesheet", href: "https://use.typekit.net/dht2gwp.css" },
		{ rel: "stylesheet", href: componentStyles },
		{ rel: "stylesheet", href: resetCss },
		{ rel: "stylesheet", href: fontFace },
		...preloadableMedia.map(({ type, url }) => ({
			tagname: "link",
			as: type === "img"
				? "img"
				: "video",
			href: url,
			rel: "preload"
		}))
	];
};

export const loader = async ({ params }) => {
	const fetcherData = await loaderDataFetcher();
	const currentPath = params["*"];

	// Constantes para todos los proyectos.
	const BASE_ENV = {
		REMIX_BASEPATH: process.env.REMIX_BASEPATH,
		STRAPI_URL: process.env.STRAPI_URL,
		USE_TESTING_BAR: process.env.USE_TESTING_BAR === "true"
	};

	return json({
		...fetcherData,
		ENV: {
			...BASE_ENV,
			...{ /* Añadir constantes por proyecto aquí. */ }
		},
		development: serverUtils.isDevelopment(),
		localStrapi: serverUtils.isLocalStrapi(),
		pre: serverUtils.isPre(),
		currentPath
	});
};

export function ErrorBoundary() {
	const error = useRouteError();

	const isRouteError = isRouteErrorResponse(error);

	const errorData = error?.data ?? {};
	const parsedErrorData = typeof(errorData) === 'object'
		? errorData
		: typeof errorData === "string"
			? errorData.startsWith("{")
				? JSON.parse(error.data)
				: errorData
			: "";

	let errorComponent = <Error // Rellenar después con los textos obtenidos del fs
		// btnText={}
		// cbBtnText={}
		// cbBtnCopiedText={}
		// openBtnText={}
		// redirectionUrl={}
		// title={}
		// text={}
	/>;

	if (!isRouteError) {
		errorComponent = (
			<div>
				<h1>Error</h1>
				<p>{error.message}</p>
				<p>The stack trace is:</p>
				<pre>{error.stack}</pre>
			</div>
		);
	}

	const data = {
		ENV: parsedErrorData?.ENV ?? {}
	};

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width,initial-scale=1"
				/>
				<link
					rel="icon"
					href={favicon}
				/>
				<title>404 - ${DISPLAY_PROJECT_NAME} </title>
				<meta name="description" content="Página no encontrada. Entra en lab.rtve.es para ver el proyecto de ${DISPLAY_PROJECT_NAME}."></meta>
				<Meta />
				<Links />
			</head>
			<body>
				<Scripts />
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
					}}
				/>
				{errorComponent}
			</body>
		</html>
	);
}

export default function App() {
	const data = useLoaderData();
	const { dataState, dispatchDataState } = useContext(DataContext);
	const [ error, setError ] = useState({});

	const errorTexts = {
		common: {
			openBtnText: useGetCopy("action_open_in_browser"),
			cbBtnText: useGetCopy("action_copy_to_clipboard"),
			cbBtnCopiedText: useGetCopy("action_copy_to_clipboard")
		},
		insta_error: {
			title: useGetCopy("insta_warn_title"),
			text: useGetCopy("insta_warn_text")
		}
	};
	const clipboardText = useGetCopy("insta_warn_clipboard_text");

	useEffect(() => {
		clientUtils.sequentialLoading();
	}, []);

	useEffect(() => {
		const { copies, currentPath } = data;

		dispatchDataState({ type: "SET_DATA", payload: { copies, currentPath } });
	}, [data]);

	useEffect(() => {
		if (clientUtils.isInstagram()) {
			setError({
				type: "insta_error",
			});
		}
	}, [dataState]);

	return (
		<html lang={dataState?.language?.toLowerCase() ?? "es"}>
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width,initial-scale=1"
				/>
				<link
					rel="icon"
					href={favicon}
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<Scripts />
				<ScrollRestoration />
				<script
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(data.ENV)}`,
					}}
				/>
				<script
					dangerouslySetInnerHTML={{
						__html: `dataLayer = typeof dataLayer !== "undefined" ? dataLayer : [];`,
					}}
				/>
				<Stats />
				<NavigationStatsController />
				{dataState?.copies && (!error.type
					? <>
						<Outlet />
						{data.ENV.USE_TESTING_BAR && <TestingBar />}
					</>
					: <Error
						cbBtnText={errorTexts["common"].cbBtnText}
						cbBtnCopiedText={errorTexts["common"].cbBtnCopiedText}
						openBtnText={errorTexts["common"].openBtnText}
						redirectionUrl={clipboardText}
						title={errorTexts[error.type].text}
						text={errorTexts[error.type].title}
					/>
				)}
				{data.development &&
					<LiveReload />
				}
			</body>
		</html>
	);
};