import { Banknote, AlertTriangle } from "lucide-react";

const FONT = "'Calibri', 'Segoe UI', -apple-system, sans-serif";

const formatCurrency = (n) => {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const getLogoUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${url}`;
};

const PayslipPreview = ({ payslip, company, innerRef }) => {
  if (!payslip || !company) return null;

  const e = payslip.earnings || {};
  const d = payslip.deductions || {};
  const app = payslip.applicable || {};

  const total = payslip.gross_earnings || 0;
  const basicPct = total ? Math.round((e.basic / total) * 100) : 0;
  const hraPct = total ? Math.round((e.hra / total) * 100) : 0;
  const specialPct = total ? Math.round((e.special_allowance / total) * 100) : 0;

  const logoUrl = getLogoUrl(company.company_logo_url);
  const hasLogo = !!logoUrl;


  // Build deduction rows dynamically
    // NEW: Insurance
  const insurance = d.insurance || 0;
  const annualInsurance = d.annual_insurance || 0;

  const deductionRows = [
    ["Employee PF", formatCurrency(d.pf)],
    ["Employee ESI", formatCurrency(d.esi)],
    ["Professional Tax", formatCurrency(d.pt)],
    ["TDS", formatCurrency(d.tds)],
    ["Loss of Pay (LOP)", formatCurrency(d.lop)],
    ["Other Deduction", formatCurrency(d.other)],
  ];

  // NEW: Insurance row
  if (insurance > 0) {
    deductionRows.push([
      annualInsurance > 0
        ? `Insurance (₹${formatCurrency(annualInsurance)}/year)`
        : "Insurance",
      formatCurrency(insurance),
    ]);
  }


  while (deductionRows.length < 6) {
    deductionRows.push(["", ""]);
  }

  return (
    <div
      ref={innerRef}
      style={{
        background: "white",
        padding: "32px 36px",
        fontFamily: FONT,
        color: "#0f172a",
        maxWidth: 800,
        margin: "0 auto",
        borderRadius: 4,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          paddingBottom: 18,
          marginBottom: 20,
          borderBottom: "2px solid #1e40af",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {hasLogo && (
            <div
              style={{
                width: 68,
                height: 68,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={logoUrl}
                alt="logo"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            </div>
          )}
          <div>
            <div
              style={{
                fontSize: hasLogo ? 18 : 22,
                fontWeight: 800,
                color: "#1e3a8a",
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
                whiteSpace: "nowrap",
              }}
            >
              {company.company_name || "Company Name"}
            </div>
            {company.company_tagline && (
              <div
                style={{
                  fontSize: 11,
                  color: "#3b82f6",
                  fontWeight: 600,
                  letterSpacing: 0.3,
                  marginTop: 3,
                }}
              >
                {company.company_tagline}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#1e3a8a",
              letterSpacing: 0.6,
              lineHeight: 1,
            }}
          >
            SALARY SLIP
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#1e40af",
              fontWeight: 700,
              letterSpacing: 1.8,
              marginTop: 5,
            }}
          >
            {payslip.pay_period?.toUpperCase()}
          </div>
        </div>
      </div>

      {company.company_address && (
        <div
          style={{
            fontSize: 11,
            color: "#64748b",
            lineHeight: 1.5,
            marginBottom: 18,
            paddingBottom: 12,
            borderBottom: "1px solid #f1f5f9",
            whiteSpace: "pre-line",
          }}
        >
          {company.company_address}
        </div>
      )}

      {/* EMPLOYEE DETAILS */}
      <SectionHeader title="Employee Details" />

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px 32px",
          marginBottom: 20,
        }}
      >
        <DetailRow label="Employee Name" value={payslip.employee_name} />
        <DetailRow label="Pay Period" value={payslip.pay_period} />
        <DetailRow label="Employee ID" value={payslip.employee_code} />
        <DetailRow label="Paid Days" value={payslip.paid_days} />
        <DetailRow label="Designation" value={payslip.designation_title || "—"} />
        <DetailRow label="LOP Days" value={payslip.lop_days} />
        <DetailRow label="Department" value={payslip.department_name || "—"} />
        <DetailRow label="Payment Date" value={formatDate(payslip.payment_date)} />
        <DetailRow label="Date of Joining" value={formatDate(payslip.date_of_joining)} />
        <DetailRow label="Payment Mode" value={payslip.payment_mode} />
      </div>

      {/* EARNINGS + DEDUCTIONS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <SectionHeader title="Earnings" />
          <Table
            rows={[
              ["Basic Salary", formatCurrency(e.basic)],
              ["HRA", formatCurrency(e.hra)],
              ["Special Allowance", formatCurrency(e.special_allowance)],
              ["", ""],
              ["", ""],
              ["", ""],
            ]}
            totalLabel="Gross Earnings"
            totalValue={formatCurrency(payslip.gross_earnings)}
          />
        </div>

        <div>
          <SectionHeader title="Deductions" />
          <Table
            rows={deductionRows}
            totalLabel="Total Deductions"
            totalValue={formatCurrency(payslip.total_deductions)}
          />
        </div>
      </div>
            

      {/* NET SALARY */}
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#1e40af",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Banknote size={22} strokeWidth={2} />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#1e40af",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 2,
              }}
            >
              Net Salary
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#1e40af",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              ₹ {formatCurrency(payslip.net_salary)}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Amount in Words
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "#0f172a",
              fontWeight: 600,
              maxWidth: 280,
            }}
          >
            {payslip.net_salary_words}
          </div>
        </div>
      </div>

      {/* SALARY BREAKUP + INFO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <div>
          <SectionHeader title="Salary Breakup" light />
          <div style={{ fontSize: 12, color: "#0f172a", lineHeight: 2 }}>
            <BreakupRow
              label="Basic Salary"
              value={`₹ ${formatCurrency(e.basic)}`}
              pct={basicPct}
            />
            <BreakupRow
              label="HRA"
              value={`₹ ${formatCurrency(e.hra)}`}
              pct={hraPct}
            />
            <BreakupRow
              label="Special Allowance"
              value={`₹ ${formatCurrency(e.special_allowance)}`}
              pct={specialPct}
            />
            <div
              style={{
                borderTop: "1px solid #cbd5e1",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <BreakupRow
                label="Total"
                value={`₹ ${formatCurrency(total)}`}
                pct={100}
                bold
              />
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Additional Information" light />
          <div style={{ fontSize: 12, color: "#0f172a", lineHeight: 2 }}>
            <ApplicableRow label="PF Applicable" value={app.pf} />
            <ApplicableRow label="ESI Applicable" value={app.esi} />
            <ApplicableRow label="Professional Tax Applicable" value={app.pt} />
            <ApplicableRow label="TDS Applicable" value={app.tds} />
          </div>
        </div>
      </div>

      {/* REMARKS */}
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 6,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#1e40af",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 5,
          }}
        >
          Remarks
        </div>
        <div style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.55 }}>
          {payslip.remarks ||
            "This payslip is generated based on the payroll records of the company for the stated salary period."}
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingTop: 14,
          borderTop: "1px solid #e2e8f0",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: "#1e40af",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3" />
              </svg>
            </div>
            <div
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#1e40af",
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Payment Details
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#334155", marginLeft: 38 }}>
            {payslip.payment_mode}
          </div>
        </div>

        <div style={{ textAlign: "center", minWidth: 180 }}>
          <div
            style={{
              fontFamily: "'Brush Script MT', cursive",
              fontSize: 26,
              color: "#1e3a8a",
              marginBottom: 2,
              lineHeight: 1,
            }}
          >
            {company.signatory_name?.split(" ")[0] || "Sign"}
          </div>
          <div
            style={{
              borderTop: "1.5px solid #1e3a8a",
              paddingTop: 5,
              fontSize: 11,
              fontWeight: 700,
              color: "#1e3a8a",
              letterSpacing: 0.3,
            }}
          >
            {company.signatory_title || "Authorized Signatory"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {company.company_name}
          </div>
        </div>
      </div>

      {company.company_footer && (
        <div
          style={{
            textAlign: "center",
            paddingTop: 12,
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: 500,
              letterSpacing: 0.4,
            }}
          >
            {company.company_footer}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Sub-components
// ============================================
const SectionHeader = ({ title, light }) => (
  <div
    style={{
      background: light ? "white" : "#1e40af",
      color: light ? "#1e40af" : "white",
      fontSize: light ? 11.5 : 12.5,
      fontWeight: 700,
      padding: light ? "0 0 6px 0" : "7px 14px",
      borderRadius: 4,
      letterSpacing: 0.3,
      marginBottom: 8,
      borderBottom: light ? "1.5px solid #cbd5e1" : "none",
    }}
  >
    {title}
  </div>
);

const DetailRow = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
    }}
  >
    <span style={{ color: "#64748b", fontWeight: 500 }}>{label}</span>
    <span
      style={{
        color: "#0f172a",
        fontWeight: 600,
        marginLeft: 8,
        textAlign: "right",
      }}
    >
      : {value || "—"}
    </span>
  </div>
);

const Table = ({ rows, totalLabel, totalValue }) => (
  <div
    style={{
      border: "1px solid #e2e8f0",
      borderRadius: 6,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        background: "#1e40af",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 14px",
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      <span>Description</span>
      <span>Amount (₹)</span>
    </div>
    {rows.map((r, i) => {
      const isFine = r[2] === "fine";
      return (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "6px 14px",
            fontSize: 12,
            borderBottom: "1px solid #f1f5f9",
            minHeight: 30,
            color: isFine ? "#dc2626" : "#334155",
            fontWeight: isFine ? 700 : 400,
            background: isFine ? "#fef2f2" : "transparent",
          }}
        >
          <span>
            {r[0]}
            {isFine && (
              <span
                style={{
                  fontSize: 10,
                  background: "#dc2626",
                  color: "white",
                  padding: "1px 6px",
                  borderRadius: 4,
                  marginLeft: 6,
                  fontWeight: 600,
                }}
              >
                FINE
              </span>
            )}
          </span>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: isFine ? 700 : 500,
            }}
          >
            {r[1]}
          </span>
        </div>
      );
    })}
    <div
      style={{
        background: "#dbeafe",
        display: "flex",
        justifyContent: "space-between",
        padding: "7px 14px",
        fontSize: 12.5,
        fontWeight: 800,
        color: "#1e3a8a",
        borderTop: "1.5px solid #93c5fd",
      }}
    >
      <span>{totalLabel}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        ₹ {totalValue}
      </span>
    </div>
  </div>
);

const BreakupRow = ({ label, value, pct, bold }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontWeight: bold ? 700 : 500,
      color: bold ? "#0f172a" : "#334155",
    }}
  >
    <span>{label}</span>
    <span style={{ display: "flex", gap: 20 }}>
      <span
        style={{
          minWidth: 70,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span style={{ minWidth: 45, textAlign: "right", color: "#64748b" }}>
        ({pct}%)
      </span>
    </span>
  </div>
);

const ApplicableRow = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span style={{ color: "#334155" }}>{label}</span>
    <span
      style={{
        color: value ? "#059669" : "#dc2626",
        fontWeight: 700,
      }}
    >
      : {value ? "Yes" : "No"}
    </span>
  </div>
);

export default PayslipPreview;