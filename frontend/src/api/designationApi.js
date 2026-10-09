import api from "./axios";

export const listDesignations = (search = "") => {
  const params = {};
  if (search) params.search = search;
  return api.get("/designations", { params });
};

export const getDesignation = (id) => api.get(`/designations/${id}`);

export const createDesignation = (data) => api.post("/designations", data);

export const updateDesignation = (id, data) =>
  api.put(`/designations/${id}`, data);

export const deactivateDesignation = (id) => api.delete(`/designations/${id}`);