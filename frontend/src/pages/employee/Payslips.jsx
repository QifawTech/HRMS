import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Printer, Download, Wallet, Loader2 } from "lucide-react";
import Layout from "../../components/layout/Layout";
import Modal from "../../components/common/Modal";
import PayslipPreview from "../../components/payroll/PayslipPreview";
import * as api from "../../api/payrollApi";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-IN");
};

const EmployeePayslips = () => {
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
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

  // Print — opens browser print dialog
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html><head><title>Payslip</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { margin: 0; padding: 0; font-family: 'Inter', 'Segoe UI', sans-serif; }
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

  // Direct PDF download
  const handleDownload = async (payslip) => {
    setDownloadingId(payslip._id);
    setPreview(payslip);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const content = printRef.current;
      if (!content) throw new Error("Payslip not rendered");

      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const filename = `Payslip_${payslip.pay_period?.replace(/\s/g, "_")}_${
        payslip.employee_code
      }.pdf`;
      pdf.save(filename);

      setPreview(null);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download payslip. Please try again.");
      setPreview(null);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Layout>
      <div style={{ fontFamily: FONT, maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                marginBottom: 6,
              }}
            >
              No payslips yet
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              Your manager will generate your payslips
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((p) => {
              const isDownloading = downloadingId === p._id;
              return (
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
                    gap: 16,
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
                  {/* Icon + Info */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flex: "1 1 200px",
                      minWidth: 0,
                    }}
                  >
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
                        flexShrink: 0,
                      }}
                    >
                      <Wallet size={22} strokeWidth={2.3} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: "#0f172a",
                        }}
                      >
                        {p.pay_period}
                      </div>
                      <div
                        style={{
                          fontSize: 12.5,
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        Paid Days: {p.paid_days} · {p.payment_mode}
                      </div>
                    </div>
                  </div>

                  {/* Net Salary */}
                  <div style={{ textAlign: "right", minWidth: 100 }}>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "#94a3b8",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Net Salary
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "#1e40af",
                        letterSpacing: "-0.5px",
                      }}
                    >
                      ₹ {formatCurrency(p.net_salary)}
                    </div>
                  </div>

                  {/* Actions — Icon only */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className={
                        p.status === "Paid"
                          ? "erp-badge erp-badge-green"
                          : "erp-badge erp-badge-yellow"
                      }
                    >
                      {p.status === "Paid" ? "● Paid" : "● Generated"}
                    </span>

                    {/* Eye icon */}
                    <button
                      onClick={() => setPreview(p)}
                      disabled={isDownloading}
                      title="View Payslip"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        border: "1px solid #c7d2fe",
                        background: "white",
                        color: "#4f46e5",
                        borderRadius: 8,
                        cursor: isDownloading ? "not-allowed" : "pointer",
                        opacity: isDownloading ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDownloading)
                          e.currentTarget.style.background = "#eef2ff";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "white")
                      }
                    >
                      <Eye size={16} />
                    </button>

                    {/* Download icon */}
                    <button
                      onClick={() => handleDownload(p)}
                      disabled={isDownloading}
                      title="Download PDF"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        border: "1px solid #a7f3d0",
                        background: "#ecfdf5",
                        color: "#059669",
                        borderRadius: 8,
                        cursor: isDownloading ? "not-allowed" : "pointer",
                        opacity: isDownloading ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isDownloading)
                          e.currentTarget.style.background = "#d1fae5";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#ecfdf5")
                      }
                    >
                      {isDownloading ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
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
                style={{ fontFamily: FONT }}
              >
                Close
              </button>
              <button
                className="erp-btn erp-btn-primary"
                onClick={handlePrint}
                style={{ fontFamily: FONT }}
              >
                <Printer size={14} /> Print
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
            <div
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                overflowX: "auto",
              }}
            >
              <PayslipPreview
                payslip={preview}
                company={company}
                innerRef={printRef}
              />
            </div>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </Layout>
  );
};

export default EmployeePayslips;