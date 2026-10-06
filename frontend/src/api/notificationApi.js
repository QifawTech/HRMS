import api from "./axios";

export const getMyNotifications = (unreadOnly = false) =>
  api.get("/notifications", { params: { unread_only: unreadOnly } });

export const getUnreadCount = () => api.get("/notifications/unread-count");

export const markNotificationRead = (id) =>
  api.post(`/notifications/${id}/read`);

export const markAllRead = () => api.post("/notifications/mark-all-read");

export const deleteNotification = (id) => api.delete(`/notifications/${id}`);