/** @type {import('@remix-run/dev').AppConfig} */
export default {
  // Routing
  ignoredRouteFiles: ["**/.*"],

  // Features
  tailwind: true,

  // Dev Server
  devServerBroadcastDelay: 1000,

  // Cloudflare Server
  server: "./server/index.ts",
  serverBuildPath: "functions/[[path]].js",
  serverConditions: ["worker"],
  serverDependenciesToBundle: "all",
  serverMainFields: ["browser", "module", "main"],
  serverMinify: true,
  serverPlatform: "neutral",
  serverModuleFormat: "esm",

  // V2 Opt-Ins
  future: {
    v2_dev: true,
    v2_errorBoundary: true,
    v2_headers: true,
    v2_meta: true,
    v2_normalizeFormMethod: true,
    v2_routeConvention: true,
  },
};
