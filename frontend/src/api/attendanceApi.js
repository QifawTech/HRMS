import api from "./axios";

// Employee
export const getTodayStatus = () => api.get("/attendance/today");

// ✅ UPDATED: Added data parameter to pass is_second_shift
export const checkIn = (data = {}) => 
  api.post("/attendance/check-in", data);

// ✅ UPDATED: Added data parameter to pass is_second_shift & early_reason
export const checkOut = (data = {}) =>
  api.post("/attendance/check-out", data);

export const getMyHistory = (days = 30) =>
  api.get("/attendance/my-history", { params: { days } });

// Manager
export const getAllAttendance = (date = "", departmentId = "", search = "") => {
  const params = {};
  if (date) params.date = date;
  if (departmentId) params.department_id = departmentId;
  if (search) params.search = search;
  return api.get("/attendance/all", { params });
};

export const getRecentDays = (days = 3, departmentId = "") => {
  const params = { days };
  if (departmentId) params.department_id = departmentId;
  return api.get("/attendance/recent", { params });
};

// Monthly report
export const getMyMonthlyReport = (year, month) => {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  return api.get("/attendance/my-monthly", { params });
};

export const getEmployeeMonthlyReport = (empId, year, month) => {
  const params = {};
  if (year) params.year = year;
  if (month) params.month = month;
  return api.get(`/attendance/employee/${empId}/monthly`, { params });
};