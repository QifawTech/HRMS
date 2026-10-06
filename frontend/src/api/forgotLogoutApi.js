import api from "./axios";

// Employee
export const checkEligibility = () => api.get("/forgot-logout/eligibility");
export const sendForgotLogoutRequest = (reason) =>
  api.post("/forgot-logout/send", { reason });
export const getMyRequests = () => api.get("/forgot-logout/my");
export const getMyUsage = () => api.get("/forgot-logout/my-usage");

// Manager
export const listRequests = (status = "", search = "") => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return api.get("/forgot-logout", { params });
};

export const getStats = () => api.get("/forgot-logout/stats");

export const reviewRequest = (reqId, action, comment = "") =>
  api.post(`/forgot-logout/${reqId}/review`, { action, comment });