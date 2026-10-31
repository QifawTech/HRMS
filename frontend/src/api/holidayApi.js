import axios from "axios";
import { getApiUrl } from "../utils/apiUrl";

const API = axios.create({
  baseURL: getApiUrl(),
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const listHolidays = (year) =>
  API.get("/holidays", { params: year ? { year } : {} });

export const createHoliday = (data) => API.post("/holidays", data);
export const updateHoliday = (id, data) => API.put(`/holidays/${id}`, data);
export const deleteHoliday = (id) => API.delete(`/holidays/${id}`);
export const getAvailableYears = () => API.get("/holidays/years");
export const seedDefaults = (year) => API.post("/holidays/seed", { year });
