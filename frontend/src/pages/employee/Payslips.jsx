import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Printer, Wallet } from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import PayslipPreview from "../../components/payroll/PayslipPreview";
import * as api from "../../api/payrollApi";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-IN");
};

const EmployeePayslips = () => {
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const printRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyPayslips();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api.getCompanyInfo().then((r) => setCompany(r.data)).catch(() => {});
  }, [load]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Payslip</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { margin: 0; padding: 0; font-family: 'Calibri', 'Segoe UI', sans-serif; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
      w.close();
    }, 400);
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT, maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.5px",
              marginBottom: 4,
            }}
          >
            My Payslips
          </h1>
          <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>
            View and download your monthly payslips
          </p>
        </div>

        {loading ? (
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: 60,
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading payslips...
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              background: "white",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #eef2ff, #f1f5f9)",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Wallet size={28} strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, marginBottom: 6 }}>
              No payslips yet
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Your manager will generate your payslips
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((p) => (
              <div
                key={p._id}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  flexWrap: "wrap",
                  fontFamily: FONT,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#cbd5e1";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px -4px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: "#eef2ff",
                      color: "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Wallet size={22} strokeWidth={2.3} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                      {p.pay_period}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                      Paid Days: {p.paid_days} · {p.payment_mode}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    Net Salary
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af", letterSpacing: "-0.5px" }}>
                    ₹ {formatCurrency(p.net_salary)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={
                      p.status === "Paid"
                        ? "erp-badge erp-badge-green"
                        : "erp-badge erp-badge-yellow"
                    }
                  >
                    {p.status === "Paid" ? "● Paid" : "● Generated"}
                  </span>
                  <button
                    onClick={() => setPreview(p)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      border: "1px solid #c7d2fe",
                      background: "white",
                      color: "#4f46e5",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: FONT,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                  >
                    <Eye size={14} /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && company && (
        <Modal
          open={true}
          onClose={() => setPreview(null)}
          title="Payslip"
          footer={
            <>
              <button
                className="erp-btn erp-btn-outline"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
              <button className="erp-btn erp-btn-primary" onClick={handlePrint}>
                <Printer size={14} /> Print / Save PDF
              </button>
            </>
          }
        >
          <div
            style={{
              background: "#f8fafc",
              padding: 16,
              borderRadius: 10,
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <PayslipPreview
                payslip={preview}
                company={company}
                innerRef={printRef}
              />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
};

export default EmployeePayslips;