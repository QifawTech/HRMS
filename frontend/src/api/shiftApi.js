import api from "./axios";

export const listShifts = () => api.get("/shifts");
export const getShift = (id) => api.get(`/shifts/${id}`);
export const createShift = (data) => api.post("/shifts", data);
export const updateShift = (id, data) => api.put(`/shifts/${id}`, data);
export const deleteShift = (id) => api.delete(`/shifts/${id}`);