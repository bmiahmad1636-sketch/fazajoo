const DEFAULT_API_BASE_URL = "http://127.0.0.1:6060/api";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, "");

export const API_SERVER_URL = API_BASE_URL.replace(/\/api$/, "");
