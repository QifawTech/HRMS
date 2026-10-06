import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import NotificationBell from "../common/NotificationBell";

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="erp-navbar">
      <button
        className="erp-hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="erp-navbar-brand">
        <span>Employee ERP</span>
      </div>

      <div className="erp-navbar-user">
        <NotificationBell />

        <div className="text-end" style={{ marginLeft: 4 }}>
          <div className="erp-navbar-user-name">
            {user?.first_name} {user?.last_name}
          </div>
          <div className="erp-navbar-user-email">{user?.email}</div>
        </div>

        <button className="erp-btn-logout" onClick={logout}>
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;