import axios from "axios";

const BASE_URL = window.APP_CONFIG?.API_BASE_URL || "/openbravo/";

const USERNAME = "APIService";
const PASSWORD = "wrt";
const token = btoa(`${USERNAME}:${PASSWORD}`);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
  },
});

export default api;