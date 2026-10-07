import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const AttendanceCalendar = ({
  year,
  month,
  records,
  onPrev,
  onNext,
  canGoNext,
  selectedDate,
  onDateClick,
}) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const offset = startWeekday === 0 ? 6 : startWeekday - 1;

  const recordMap = {};
  (records || []).forEach((r) => {
    recordMap[r.date] = r;
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ empty: true, key: `e-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = recordMap[dateStr];
    const dayOfWeek = new Date(dateStr).getDay();
    const isSunday = dayOfWeek === 0;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    let statusLabel = null;
    let statusColor = null;

    if (rec) {
      if (rec.is_late) {
        statusLabel = "L";
        statusColor = "#dc2626";
      } else if (rec.is_early_logout) {
        statusLabel = "E";
        statusColor = "#d97706";
      } else if (rec.status === "HALF_DAY") {
        statusLabel = "H";
        statusColor = "#d97706";
      } else {
        statusLabel = "P";
        statusColor = "#16a34a";
      }
    } else if (isPast && !isSunday) {
      statusLabel = "A";
      statusColor = "#9ca3af";
    }

    cells.push({
      day: d,
      dateStr,
      record: rec,
      statusLabel,
      statusColor,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
      isSunday,
      isPast,
      isFuture,
      key: dateStr,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < remaining; i++) {
    cells.push({ empty: true, key: `e-end-${i}` });
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#f3f4f6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e5e7eb";
            e.currentTarget.style.color = "#111827";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f3f4f6";
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          <ChevronLeft size={13} />
        </button>

        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "#111827",
            letterSpacing: "-0.2px",
          }}
        >
          {MONTHS[month - 1]} {year}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#f3f4f6",
            border: "none",
            cursor: canGoNext ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: canGoNext ? "#6b7280" : "#d1d5db",
            opacity: canGoNext ? 1 : 0.4,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (canGoNext) {
              e.currentTarget.style.background = "#e5e7eb";
              e.currentTarget.style.color = "#111827";
            }
          }}
          onMouseLeave={(e) => {
            if (canGoNext) {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.color = "#6b7280";
            }
          }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {WEEKDAYS.map((w, i) => {
          const isSunday = i === 6;
          return (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: 9.5,
                fontWeight: 700,
                color: isSunday ? "#f87171" : "#9ca3af",
                letterSpacing: 0.5,
                padding: "4px 0",
              }}
            >
              {w}
            </div>
          );
        })}
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {cells.map((cell) => {
          if (cell.empty) {
            return <div key={cell.key} style={{ height: 36 }} />;
          }

          const clickable = !!cell.record;

          let bg = "transparent";
          let textColor = "#111827";
          let borderColor = "transparent";
          let fontWeight = 500;

          if (cell.isSelected) {
            bg = "#2563eb";
            textColor = "white";
            fontWeight = 700;
          } else if (cell.isToday) {
            bg = "#dbeafe";
            textColor = "#1d4ed8";
            fontWeight = 700;
            borderColor = "#93c5fd";
          } else if (cell.isSunday) {
            textColor = "#f87171";
          } else if (cell.isFuture) {
            textColor = "#9ca3af";
          } else {
            textColor = "#111827";
          }

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => clickable && onDateClick && onDateClick(cell)}
              disabled={!clickable}
              style={{
                height: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 6,
                cursor: clickable ? "pointer" : "default",
                padding: 0,
                fontFamily: "inherit",
                gap: 0,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (clickable && !cell.isSelected) {
                  e.currentTarget.style.background = "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (clickable && !cell.isSelected) {
                  e.currentTarget.style.background = bg;
                }
              }}
            >
              <div
                style={{
                  fontSize: 11.5,
                  fontWeight,
                  color: textColor,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {cell.day}
              </div>
              {cell.statusLabel && (
                <div
                  style={{
                    fontSize: 7.5,
                    fontWeight: 800,
                    color: cell.isSelected ? "white" : cell.statusColor,
                    marginTop: 1,
                    letterSpacing: 0.3,
                    lineHeight: 1,
                  }}
                >
                  {cell.statusLabel}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #f3f4f6",
          fontSize: 10,
          color: "#6b7280",
          justifyContent: "center",
        }}
      >
        {[
          { color: "#16a34a", label: "P — Present" },
          { color: "#dc2626", label: "L — Late" },
          { color: "#d97706", label: "E — Early" },
          { color: "#9ca3af", label: "A — Absent" },
          { color: "#f87171", label: "S — Sunday" },
        ].map((l) => (
          <div
            key={l.label}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: l.color,
                display: "inline-block",
              }}
            />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttendanceCalendar;