// Server
import isDevelopment from "./server/isDevelopment";
import isLocalStrapi from "./server/isLocalStrapi";
import isPre from "./server/isPre";
import * as serverData from "./server/data";

// Client
import * as animations from "./client/animations";
import * as arrays from "./client/arrays";
import * as data from "./data";
import * as dates from "./client/dates";
import * as device from "./client/device";
import * as general from "./client/functions";
import * as printer from "./client/printer";
import * as seo from "./client/seo";
import * as share from "./client/share";
import * as storage from "./client/storage";
import * as strings from "./client/strings";
import * as styles from "./client/styles";
import * as time from "./client/time";
import * as urls from "./client/urls";
import * as window from "./client/window";

// Data
import gql from "./data/gql";
import fetchgql from "./data/fetchgql";
import fetchgqlClient from "./data/fetchgqlClient";
import getCopies from "./data/getCopies";
import queryParser from "./data/queryParser";

export {
	fetchgql,
	fetchgqlClient,
	getCopies,
	gql,
	queryParser
};

export const serverUtils = {
	...serverData,
	isDevelopment,
	isLocalStrapi,
	isPre
};

export const clientUtils = {
	...animations,
	...arrays,
	...data,
	...dates,
	...device,
	...general,
	...printer,
	...seo,
	...share,
	...storage,
	...strings,
	...styles,
	...time,
	...urls,
	...window
};