import api from "./axios";

export const getCategories = () => api.get("/documents/categories");

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const documentFileUrl = (fileId) =>
  `${api.defaults.baseURL}/documents/files/${fileId}`;

// Manager
// Manager
export const listDocuments = (
  employeeId = "",
  category = "",
  search = "",
  uploadedBy = ""
) => {
  const params = {};
  if (employeeId) params.employee_id = employeeId;
  if (category) params.category = category;
  if (search) params.search = search;
  if (uploadedBy) params.uploaded_by = uploadedBy;
  return api.get("/documents", { params });
};

export const getDocumentStats = () => api.get("/documents/stats");

export const createDocument = (data) => api.post("/documents", data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Employee
export const getMyDocuments = (category = "", search = "", uploadedBy = "") => {
  const params = {};
  if (category) params.category = category;
  if (search) params.search = search;
  if (uploadedBy) params.uploaded_by = uploadedBy;
  return api.get("/documents/my", { params });
};

export const getMyDocumentStats = () => api.get("/documents/my/stats");
export const createMyDocument = (data) => api.post("/documents/my", data);
export const deleteMyDocument = (id) => api.delete(`/documents/my/${id}`);