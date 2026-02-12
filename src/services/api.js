import axios from "axios";

const BASE_URL = window.APP_CONFIG?.API_BASE_URL || "/bhmc";

const USERNAME = "api-service";
const PASSWORD = "4dm1n@bhm2025";
const token = btoa(`${USERNAME}:${PASSWORD}`);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  },
});

export default api;
