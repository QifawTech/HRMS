import api from "./axios";

// Manager
export const listPayrolls = (month = "", employeeId = "", search = "", status = "") => {
  const params = {};
  if (month) params.month = month;
  if (employeeId) params.employee_id = employeeId;
  if (search) params.search = search;
  if (status) params.status = status;
  return api.get("/payroll", { params });
};

export const getPayrollStats = (month = "") => {
  const params = {};
  if (month) params.month = month;
  return api.get("/payroll/stats", { params });
};

export const getCompanyInfo = () => api.get("/payroll/company-info");
export const generatePayroll = (data) => api.post("/payroll/generate", data);
export const getPayroll = (id) => api.get(`/payroll/${id}`);
export const markPaid = (id) => api.post(`/payroll/${id}/mark-paid`);
export const deletePayroll = (id) => api.delete(`/payroll/${id}`);

// Employee
export const getMyPayslips = () => api.get("/payroll/my");