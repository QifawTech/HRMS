import api from "./axios";

export const listDepartments = (search = "") =>
  api.get("/departments", { params: search ? { search } : {} });

export const getDepartment = (id) => api.get(`/departments/${id}`);

export const createDepartment = (data) => api.post("/departments", data);

export const updateDepartment = (id, data) =>
  api.put(`/departments/${id}`, data);

export const deactivateDepartment = (id) =>
  api.delete(`/departments/${id}`);