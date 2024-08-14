const { flatRoutes } = require('remix-flat-routes');

const basePath = process.env.REMIX_BASEPATH
	? process.env.REMIX_BASEPATH
	: "";
const dashedBasepath = basePath !== ""
	? basePath + "/"
	: basePath;

/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
	// [String] - Ruta al directorio "app", relativa a la localización de remix.config.js. "app" por defecto.
	// appDirectory: "app",

	// [String] - Ruta a la build para el navegador, relativa a la localización de remix.config.js. "public/build" por defecto.
	assetsBuildDirectory: `${dashedBasepath}public/build`,
	
	// [String] - Directorio donde Remix cacheará elementos en modo desarrollo. ".cache" por defecto
	// cacheDirectory: ".cache",
	
	// [Int] - Retraso en ms antes de que el server lance un evento "reload". 0 por defecto.
	// devServerBroadcastDelay: 0,
	
	// [Int] - Número de puerto para usar por el websocket del servidor. 8002 por defecto.
	// devServerPort: 8002,

	// [Array] - Lista de expresiones regulares de "minimatch" de rutas que serán ignorados a la hora de buscar rutas en "app/routes".
	ignoredRouteFiles: ["**/.*"],
	
	// [true | false] - Si usar o no PostCSS. false por defecto.
	// postcss: false,
	
	// [String] - Donde el navegador buscará assets. "/build/" por defecto.
	publicPath: `/${dashedBasepath}build/`,
	
	// [function] - Función para añadir rutas adicionales.
	routes: async defineRoutes => {
		return flatRoutes('routes', defineRoutes, {
			basePath: `/${basePath}`,
			// ignoredRouteFiles: ["**/*"]
		});
	},

	// server: "",
	
	// OBSOLETO, no usar.
	// serverBuildDirectory: "",
	
	// [String] - Path al archivo de la build. "build/index.js" por defecto.
	serverBuildPath: `build/index.js`,
	
	// OBSOLETO, no usar.
	// serverBuildTarget: "",
	
	// [unknown] - The order of conditions to use when resolving server dependencies' exports field in package.json. No sé qué tipo de dato hay que pasarle.
	// serverConditions: "",
	
	// [Array | "all"] - Lista de expresiones regulares que determina si un módulo ha de ser incluído en la build.
	// serverDependenciesToBundle: [],
	
	// serverModuleFormat === "cjs" -> ["modules", "main"]
	// serverModuleFormat === "esm" -> ["main", "modules"]
	// [Array] - The order of main fields to use when resolving server dependencies.
	// serverMainFields: ["modules", "main"],
	
	// [true | false] - Determina si minificar la build de producción o no. false por defecto.
	// serverMinify: false,
	
	// ["cjs" | "esm"] - Formato de salida para la build. "cjs" por defecto.
	serverModuleFormat: "cjs",
	
	// ["node" | "neutral"] - La plataforma objetivo de la build del servidor. "node" por defecto.
	// serverPlatform: "node",
	
	// [true | false] - Si hay que activar la compatibilidad con herramientas Tailwind.
	// tailwind: false,
	
	// [Array | String | async function] - Directorios que monitorizar cuando estamos en modo desarrollo (remix dev). Estos se incluirán junto a appDirectory.
	// watchPaths: "",
};
