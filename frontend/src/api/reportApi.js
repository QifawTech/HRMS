import api from "./axios";

export const getSummary = () => api.get("/reports/summary");

export const getEmployeeReport = (filters = {}) => {
  const params = {};
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  return api.get("/reports/employees", { params });
};

export const getAttendanceReport = (filters = {}) => {
  const params = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.status) params.status = filters.status;
  return api.get("/reports/attendance", { params });
};

export const getLeaveReport = (filters = {}) => {
  const params = {};
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.department_id) params.department_id = filters.department_id;
  if (filters.employee_id) params.employee_id = filters.employee_id;
  if (filters.status) params.status = filters.status;
  if (filters.leave_type_id) params.leave_type_id = filters.leave_type_id;
  return api.get("/reports/leaves", { params });
};

export const getDepartmentReport = () => api.get("/reports/departments");
export const getEmployeeFullReport = (empId) =>
  api.get(`/reports/employee/${empId}/full`);