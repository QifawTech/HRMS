import api from "./axios";

// Manager
export const listTasks = (status = "", employeeId = "", priority = "", search = "") => {
  const params = {};
  if (status) params.status = status;
  if (employeeId) params.employee_id = employeeId;
  if (priority) params.priority = priority;
  if (search) params.search = search;
  return api.get("/tasks", { params });
};

export const getTaskStats = () => api.get("/tasks/stats");
export const getTask = (id) => api.get(`/tasks/${id}`);
export const createTask = (data) => api.post("/tasks", data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const reviewPlan = (id, action, comment = "") =>
  api.post(`/tasks/${id}/review`, { action, comment });

// Employee
export const getMyTasks = (status = "", search = "") => {
  const params = {};
  if (status) params.status = status;
  if (search) params.search = search;
  return api.get("/tasks/my", { params });
};

export const getMyTaskStats = () => api.get("/tasks/my/stats");

export const submitPlan = (id, textPlan, file) => {
  const formData = new FormData();
  if (textPlan) formData.append("text_plan", textPlan);
  if (file) formData.append("file", file);
  return api.post(`/tasks/${id}/submit-plan`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const startWork = (id) => api.post(`/tasks/${id}/start-work`);
export const completeTask = (id, notes = "") =>
  api.post(`/tasks/${id}/complete`, { completion_notes: notes });

// Direct URL for file download (endpoint is public)
export const taskFileUrl = (fileId) =>
  `${api.defaults.baseURL}/tasks/files/${fileId}`;

// Optional: programmatic download helper
export const downloadTaskFile = async (fileId, fileName = "file") => {
  try {
    const url = taskFileUrl(fileId);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error(err);
    throw err;
  }
};
