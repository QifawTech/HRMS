import api from "./axios";

// Employee
export const getMyResignation = () => api.get("/resignations/my");
export const applyResignation = (data) => api.post("/resignations/apply", data);
export const cancelResignation = () => api.post("/resignations/cancel");

// Manager
export const listResignations = (status = "", search = "") => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return api.get("/resignations", { params });
};

export const getResignationStats = () => api.get("/resignations/stats");

export const reviewResignation = (empId, action, comment = "", noticeEnd = null) =>
  api.post(`/resignations/${empId}/review`, {
    action,
    comment,
    notice_end: noticeEnd,
  });

// NEW: Edit last working day (after accept)
export const editResignationNotice = (empId, lastWorkingDay, reason = "") =>
  api.put(`/resignations/${empId}/edit-notice`, {
    last_working_day: lastWorkingDay,
    reason,
  });

export const completeResignation = (empId) =>
  api.post(`/resignations/${empId}/complete`);