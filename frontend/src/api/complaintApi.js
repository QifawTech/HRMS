import api from "./axios";

// Employee
export const createComplaint = (data) => api.post("/complaints", data);
export const getMyComplaints = (status) =>
  api.get("/complaints/my", { params: status ? { status } : {} });

// Manager
export const listAllComplaints = (search, status, category) =>
  api.get("/complaints", {
    params: { search, status, category },
  });
export const getComplaintStats = () => api.get("/complaints/stats");
export const updateComplaintStatus = (id, data) =>
  api.put(`/complaints/${id}/status`, data);
export const deleteComplaint = (id) => api.delete(`/complaints/${id}`);