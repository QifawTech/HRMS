import api from "./axios";

export const listInsurances = () => api.get("/insurances");
export const getInsurance = (id) => api.get(`/insurances/${id}`);
export const createInsurance = (data) => api.post("/insurances", data);
export const updateInsurance = (id, data) => api.put(`/insurances/${id}`, data);
export const deleteInsurance = (id) => api.delete(`/insurances/${id}`);