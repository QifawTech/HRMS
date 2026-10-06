import api from "./axios";

// Manager
export const listAnnouncements = (target_type = "", priority = "", search = "") => {
  const params = {};
  if (target_type) params.target_type = target_type;
  if (priority) params.priority = priority;
  if (search) params.search = search;
  return api.get("/announcements", { params });
};

export const getAnnouncementStats = () => api.get("/announcements/stats");

export const getAnnouncement = (id) => api.get(`/announcements/${id}`);

export const createAnnouncement = (data) => api.post("/announcements", data);

export const updateAnnouncement = (id, data) =>
  api.put(`/announcements/${id}`, data);

export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

export const getSeenList = (id) => api.get(`/announcements/${id}/seen-list`);

export const uploadAttachment = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/announcements/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const downloadFileUrl = (fileId) =>
  `${api.defaults.baseURL}/announcements/files/${fileId}`;

// Employee
export const getMyAnnouncements = (target_type = "", search = "") => {
  const params = {};
  if (target_type) params.target_type = target_type;
  if (search) params.search = search;
  return api.get("/announcements/my", { params });
};

export const getMyAnnouncementStats = () => api.get("/announcements/my/stats");

export const markAsSeen = (id) => api.post(`/announcements/${id}/seen`);