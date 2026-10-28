import { useState, useEffect, useRef } from "react"; // ✅ useRef add panniruken
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

  // ✅ Scroll Position ah Save panna Ref
  const scrollRef = useRef(null);

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

  // ✅ Scroll Position ah restore panna function
  const handleLinkClick = () => {
    if (window.innerWidth <= 992 && onClose) {
      onClose();
    } else {
      // Namma scroll position ah save pandrom
      if (scrollRef.current) {
        const scrollPos = scrollRef.current.scrollTop;
        sessionStorage.setItem("sidebarScrollPos", scrollPos);
      }
    }
  };

  // ✅ Page load aagumbothu scroll position ah set pannum
  useEffect(() => {
    if (scrollRef.current) {
      const savedPos = sessionStorage.getItem("sidebarScrollPos");
      if (savedPos) {
        scrollRef.current.scrollTop = parseInt(savedPos);
      }
    }
  }, [links]); // Links maarum pothu (page load aagumbothu)

  return (
    <aside
      className={`erp-sidebar ${open ? "" : "closed"}`}
      style={{ fontFamily: FONT }}
      ref={scrollRef} // ✅ Ref ah kuduthiruken
    >
      <ul className="erp-sidebar-nav" style={{ padding: 0, margin: 0, listStyle: "none" }}>
        {links.map(({ to, label, Icon, badgeKey }) => {
          const badgeCount = badgeKey ? badges[badgeKey] || 0 : 0;
          return (
            <li key={to} style={{ margin: 0, padding: 0 }}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `erp-sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={handleLinkClick} // ✅ Ithu dhaan mukkiyam
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontFamily: FONT,
                  whiteSpace: "nowrap", 
                  boxSizing: "border-box",
                  height: 44,
                  textDecoration: "none",
                }}
              >
                <div style={{ width: 20, display: "flex", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} />
                </div>
                
                <span 
                  style={{ 
                    flex: 1, 
                    overflow: "hidden", 
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex", 
                    alignItems: "center"
                  }}
                >
                  {label}
                </span>
                
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
                      flexShrink: 0, 
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