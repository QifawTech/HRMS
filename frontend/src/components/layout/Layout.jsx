import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";

const Layout = ({ children }) => {
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 992);

  // Auto close on mobile, auto open on desktop
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth > 992);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth <= 992) setSidebarOpen(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)" }}>
      <Navbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />

      <div className="erp-layout">
        <Sidebar
          open={sidebarOpen}
          role={role}
          onClose={closeSidebarOnMobile}
        />

        {/* Mobile overlay */}
        {sidebarOpen && window.innerWidth <= 992 && (
          <div
            className="erp-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="erp-main">{children}</main>
      </div>
    </div>
  );
};

export default Layout;