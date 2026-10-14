import api from "./axios";

export const listEmployees = (
  search = "",
  departmentId = "",
  status = "",
  employmentType = "",
  page = null,
  limit = null
) => {
  const params = {};
  if (search) params.search = search;
  if (departmentId) params.department_id = departmentId;
  if (status) params.status = status;
  if (employmentType) params.employment_type = employmentType;
  if (page) params.page = page;
  if (limit) params.limit = limit;
  return api.get("/employees", { params });
};

export const getNextCode = () => api.get("/employees/next-code");

export const getEmployee = (id) => api.get(`/employees/${id}`);

export const createEmployee = (data) => api.post("/employees", data);

export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);

export const deactivateEmployee = (id, data) =>
  api.post(`/employees/${id}/deactivate`, data || {});

export const reactivateEmployee = (id) =>
  api.post(`/employees/${id}/reactivate`);

export const terminateEmployee = (id, data) =>
  api.post(`/employees/${id}/terminate`, data);

export const calculateProfessionalTax = (monthlySalary) =>
  api.post("/employees/calculate-pt", { monthly_salary: monthlySalary });

export const getMyProfile = () => api.get("/employees/me");

export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/employees/me/profile-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateMyProfile = (data) => api.put("/employees/me/profile", data);

export const confirmEmployee = (id, data) =>
  api.post(`/employees/${id}/confirm`, data);

export const deleteEmployee = (id) => api.delete(`/employees/${id}`);