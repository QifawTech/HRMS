import api from "./axios";

// Shared
export const listLeaveTypes = () => api.get("/leaves/types");
export const getFinancialYear = () => api.get("/leaves/financial-year");

// Employee
export const applyLeave = (data) => api.post("/leaves", data);
export const getMyLeaves = () => api.get("/leaves/my");
export const getMyLeaveStats = () => api.get("/leaves/my/stats");
export const cancelLeave = (id) => api.post(`/leaves/${id}/cancel`);

// Manager
export const getAllLeaves = (status = "", search = "") => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return api.get("/leaves/all", { params });
};

export const reviewLeave = (id, action, comment = "") =>
  api.post(`/leaves/${id}/review`, { action, comment });

export const getLeaveStats = () => api.get("/leaves/stats");
export const getPendingReminders = () => api.get("/leaves/pending-reminders");