const rawUrl = import.meta.env.VITE_API_URL;
const isProd = import.meta.env.PROD;

export const apiUrl = (isProd && (!rawUrl || rawUrl.includes("localhost")))
  ? "/api"
  : (rawUrl || "/api");
