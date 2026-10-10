import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  Megaphone,
  Bell,
  BarChart3,
  Settings as SettingsIcon,
  User,
  Calendar,
  Receipt,
  FolderOpen,
  ClipboardList,
  UserMinus,
  FolderKanban,
  MessageSquareWarning,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import * as resignApi from "../../api/resignationApi";
import * as leaveApi from "../../api/leaveApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const managerLinks = [
  { to: "/manager/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/manager/employees", label: "Employees", Icon: Users },
  { to: "/manager/departments", label: "Departments", Icon: Building2 },
  { to: "/manager/designations", label: "Designations", Icon: Briefcase },
  { to: "/manager/attendance", label: "Attendance", Icon: Clock },
  {
    to: "/manager/leaves",
    label: "Leave Management",
    Icon: CalendarDays,
    badgeKey: "leaves",
  },
  { to: "/manager/holidays", label: "Holidays", Icon: Calendar },
  { to: "/manager/payroll", label: "Payroll", Icon: Wallet },
  { to: "/manager/documents", label: "Documents", Icon: FileText },
  { to: "/manager/announcements", label: "Announcements", Icon: Megaphone },
  { to: "/manager/notifications", label: "Notifications", Icon: Bell },
  { to: "/manager/reports", label: "Reports", Icon: BarChart3 },
  { to: "/manager/settings", label: "Settings", Icon: SettingsIcon },
  { to: "/manager/tasks", label: "Tasks", Icon: ClipboardList },
  { to: "/manager/projects", label: "Projects", Icon: FolderKanban },
  { to: "/manager/complaints", label: "Complaints", Icon: MessageSquareWarning },
  {
    to: "/manager/resignations",
    label: "Resignations",
    Icon: UserMinus,
    badgeKey: "resignations",
  },
];

const employeeLinks = [
  { to: "/employee/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/employee/profile", label: "My Profile", Icon: User },
  { to: "/employee/attendance", label: "My Attendance", Icon: Clock },
  { to: "/employee/leaves", label: "My Leave", Icon: Calendar },
  { to: "/employee/payslips", label: "My Payslips", Icon: Receipt },
  { to: "/employee/documents", label: "My Documents", Icon: FolderOpen },
  { to: "/employee/announcements", label: "Announcements", Icon: Megaphone },
  { to: "/employee/notifications", label: "Notifications", Icon: Bell },
  { to: "/employee/settings", label: "Settings", Icon: SettingsIcon },
  { to: "/employee/tasks", label: "My Tasks", Icon: ClipboardList },
  { to: "/employee/resignation", label: "Resignation", Icon: UserMinus },
  { to: "/employee/projects", label: "My Projects", Icon: FolderKanban },
  { to: "/employee/complaints", label: "My Complaints", Icon: MessageSquareWarning },
];

const Sidebar = ({ open, role, onClose }) => {
  const { user } = useAuth();
  const links = role === "MANAGER" ? managerLinks : employeeLinks;

  const [badges, setBadges] = useState({
    resignations: 0,
    leaves: 0,
  });

  useEffect(() => {
    if (role !== "MANAGER") return;

    const fetchBadges = async () => {
      const [resignRes, leaveRes] = await Promise.allSettled([
        resignApi.getResignationStats(),
        leaveApi.getLeaveStats
          ? leaveApi.getLeaveStats()
          : Promise.resolve({ data: {} }),
      ]);

      setBadges({
        resignations:
          resignRes.status === "fulfilled"
            ? resignRes.value.data?.pending || 0
            : 0,
        leaves:
          leaveRes.status === "fulfilled"
            ? leaveRes.value.data?.pending || 0
            : 0,
      });
    };

    fetchBadges();
    const t = setInterval(fetchBadges, 30000);
    return () => clearInterval(t);
  }, [role]);

  return (
    <aside
      className={`erp-sidebar ${open ? "" : "closed"}`}
      style={{ fontFamily: FONT }}
    >
      <ul className="erp-sidebar-nav">
        {links.map(({ to, label, Icon, badgeKey }) => {
          const badgeCount = badgeKey ? badges[badgeKey] || 0 : 0;
          return (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `erp-sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={() => {
                  if (window.innerWidth <= 992 && onClose) onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: FONT,
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                {badgeCount > 0 && (
                  <span
                    style={{
                      background: "#dc2626",
                      color: "white",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 10,
                      minWidth: 18,
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};

export default Sidebar;