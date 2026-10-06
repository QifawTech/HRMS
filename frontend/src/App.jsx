import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import Unauthorized from "./pages/common/Unauthorized";
import ProtectedRoute from "./routes/ProtectedRoute";

// ============================================
// Manager Pages
// ============================================
// ============================================
// Manager Pages
// ============================================
import ManagerDashboard from "./pages/manager/Dashboard";
import ManagerEmployees from "./pages/manager/Employees";
import ManagerDepartments from "./pages/manager/Departments";
import ManagerDesignations from "./pages/manager/Designations";
import ManagerAttendance from "./pages/manager/Attendance";
import ManagerLeaves from "./pages/manager/LeaveManagement";
import ManagerPayroll from "./pages/manager/Payroll";
import ManagerDocuments from "./pages/manager/Documents";
import ManagerAnnouncements from "./pages/manager/Announcements";
import ManagerNotifications from "./pages/manager/Notifications";
import ManagerReports from "./pages/manager/Reports";
import ManagerSettings from "./pages/manager/Settings";
import ManagerTasks from "./pages/manager/Tasks";
import ManagerResignations from "./pages/manager/Resignations";
import ManagerForgotLogout from "./pages/manager/ForgotLogoutRequests";  // ← Ithu fix pannunga

// ============================================
// Employee Pages
// ============================================
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeeProfile from "./pages/employee/Profile";
import EmployeeAttendance from "./pages/employee/Attendance";
import EmployeeLeaves from "./pages/employee/Leave";
import EmployeePayslips from "./pages/employee/Payslips";
import EmployeeDocuments from "./pages/employee/Documents";
import EmployeeAnnouncements from "./pages/employee/Announcements";
import EmployeeNotifications from "./pages/employee/Notifications";
import EmployeeSettings from "./pages/employee/Settings";
import EmployeeTasks from "./pages/employee/Tasks";
import EmployeeResignation from "./pages/employee/Resignation";

// ============================================
// Route Wrappers
// ============================================
const withManager = (Component) => (
  <ProtectedRoute allowedRole="MANAGER">
    <Component />
  </ProtectedRoute>
);

const withEmployee = (Component) => (
  <ProtectedRoute allowedRole="EMPLOYEE">
    <Component />
  </ProtectedRoute>
);

function App() {
  return (
    <Routes>
      {/* ============================================
          Public Routes
          ============================================ */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ============================================
          Manager Routes
          ============================================ */}
      <Route path="/manager/dashboard" element={withManager(ManagerDashboard)} />
      <Route path="/manager/employees" element={withManager(ManagerEmployees)} />
      <Route path="/manager/departments" element={withManager(ManagerDepartments)} />
      <Route path="/manager/designations" element={withManager(ManagerDesignations)} />
      <Route path="/manager/attendance" element={withManager(ManagerAttendance)} />
      <Route path="/manager/leaves" element={withManager(ManagerLeaves)} />
      <Route path="/manager/payroll" element={withManager(ManagerPayroll)} />
      <Route path="/manager/documents" element={withManager(ManagerDocuments)} />
      <Route path="/manager/announcements" element={withManager(ManagerAnnouncements)} />
      <Route path="/manager/notifications" element={withManager(ManagerNotifications)} />
      <Route path="/manager/reports" element={withManager(ManagerReports)} />
      <Route path="/manager/settings" element={withManager(ManagerSettings)} />
      <Route path="/manager/tasks" element={withManager(ManagerTasks)} />
      <Route path="/manager/resignations" element={withManager(ManagerResignations)} />
      <Route path="/manager/forgot-logout" element={<ManagerForgotLogout />} />

      {/* ============================================
          Employee Routes
          ============================================ */}
      <Route path="/employee/dashboard" element={withEmployee(EmployeeDashboard)} />
      <Route path="/employee/profile" element={withEmployee(EmployeeProfile)} />
      <Route path="/employee/attendance" element={withEmployee(EmployeeAttendance)} />
      <Route path="/employee/leaves" element={withEmployee(EmployeeLeaves)} />
      <Route path="/employee/payslips" element={withEmployee(EmployeePayslips)} />
      <Route path="/employee/documents" element={withEmployee(EmployeeDocuments)} />
      <Route path="/employee/announcements" element={withEmployee(EmployeeAnnouncements)} />
      <Route path="/employee/notifications" element={withEmployee(EmployeeNotifications)} />
      <Route path="/employee/settings" element={withEmployee(EmployeeSettings)} />
      <Route path="/employee/tasks" element={withEmployee(EmployeeTasks)} />
      <Route path="/employee/resignation" element={withEmployee(EmployeeResignation)} />

      {/* ============================================
          Defaults
          ============================================ */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;