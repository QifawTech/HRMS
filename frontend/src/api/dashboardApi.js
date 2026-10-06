import api from "./axios";

export const getManagerStats = () => api.get("/dashboard/manager-stats");

export const getEmployeeStats = () => api.get("/dashboard/employee-stats");