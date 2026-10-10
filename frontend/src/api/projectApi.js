import api from "./axios";

export const listProjects = (search, status) =>
  api.get("/projects", { params: { search, status } });

export const getProjectStats = () => api.get("/projects/stats");
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post("/projects", data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const getMyProjects = () => api.get("/projects/my");