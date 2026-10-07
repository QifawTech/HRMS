// import api from "./axios";

// export const listEmployees = (search = "", departmentId = "", status = "") => {
//   const params = {};
//   if (search) params.search = search;
//   if (departmentId) params.department_id = departmentId;
//   if (status) params.status = status;
//   return api.get("/employees", { params });
// };

// export const getNextCode = () => api.get("/employees/next-code");

// export const getEmployee = (id) => api.get(`/employees/${id}`);

// export const createEmployee = (data) => api.post("/employees", data);

// export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);

// export const deactivateEmployee = (id, data) =>
//   api.delete(`/employees/${id}`, { data });

// export const reactivateEmployee = (id) =>
//   api.post(`/employees/${id}/reactivate`);

// // Employee self-service
// export const getMyProfile = () => api.get("/employees/me");

// export const uploadProfilePicture = (file) => {
//   const formData = new FormData();
//   formData.append("file", file);
//   return api.post("/employees/me/profile-picture", formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
// };

// export const updateMyProfile = (data) => api.put("/employees/me/profile", data);


import api from "./axios";

export const listEmployees = (search = "", departmentId = "", status = "") => {
  const params = {};
  if (search) params.search = search;
  if (departmentId) params.department_id = departmentId;
  if (status) params.status = status;
  return api.get("/employees", { params });
};

export const getNextCode = () => api.get("/employees/next-code");

export const getEmployee = (id) => api.get(`/employees/${id}`);

export const createEmployee = (data) => api.post("/employees", data);

export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);

export const deactivateEmployee = (id, data) =>
  api.delete(`/employees/${id}`, { data });

export const reactivateEmployee = (id) =>
  api.post(`/employees/${id}/reactivate`);

// ============================================
// PROFESSIONAL TAX AUTO-CALCULATION (NEW)
// ============================================
// Manager employee add/edit pandrappO, salary type pannina,
// idhu backend ku call panni PT amount ah vaangum.
// NOTE: Idhu DB la save pannaadhu, only preview calculation.
export const calculateProfessionalTax = (monthlySalary) =>
  api.post("/employees/calculate-pt", { monthly_salary: monthlySalary });

// Employee self-service
export const getMyProfile = () => api.get("/employees/me");

export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/employees/me/profile-picture", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateMyProfile = (data) => api.put("/employees/me/profile", data);