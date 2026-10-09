import { ChevronLeft, ChevronRight } from "lucide-react";

const FONT = "'Inter', 'Segoe UI', -apple-system, sans-serif";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const AttendanceCalendar = ({
  year,
  month,
  records,
  holidays = [],          // ✅ NEW: holiday support
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

  // ✅ NEW: Holiday lookup map
  const holidayMap = {};
  (holidays || []).forEach((h) => {
    holidayMap[h.date] = h;
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const cells = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ empty: true, key: `e-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const rec = recordMap[dateStr];
    const holiday = holidayMap[dateStr];    // ✅ NEW
    const dayOfWeek = new Date(dateStr).getDay();
    const isSunday = dayOfWeek === 0;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;
    const isHoliday = !!holiday;

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
    } else if (isPast && !isSunday && !isHoliday) {
      // ✅ Holiday la "Absent" kaataadhu
      statusLabel = "A";
      statusColor = "#9ca3af";
    }

    cells.push({
      day: d,
      dateStr,
      record: rec,
      holiday,              // ✅ NEW
      isHoliday,            // ✅ NEW
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
    <div
      style={{
        maxWidth: 440,
        margin: "0 auto",
        width: "100%",
        fontFamily: FONT,
      }}
    >
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
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "#f3f4f6",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#6b7280",
            transition: "all 0.15s",
            fontFamily: FONT,
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
          <ChevronLeft size={14} />
        </button>

        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#111827",
            letterSpacing: "-0.2px",
            fontFamily: FONT,
          }}
        >
          {MONTHS[month - 1]} {year}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          style={{
            width: 30,
            height: 30,
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
            fontFamily: FONT,
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
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
          marginBottom: 5,
        }}
      >
        {WEEKDAYS.map((w, i) => {
          const isSunday = i === 6;
          return (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 700,
                color: isSunday ? "#f87171" : "#9ca3af",
                letterSpacing: 0.5,
                padding: "5px 0",
                fontFamily: FONT,
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
          gap: 3,
        }}
      >
        {cells.map((cell) => {
          if (cell.empty) {
            return <div key={cell.key} style={{ height: 40 }} />;
          }

          const clickable = !!cell.record;

          let bg = "transparent";
          let textColor = "#111827";
          let borderColor = "transparent";
          let fontWeight = 500;

          // ✅ Holiday priority: if holiday and no attendance record
          if (cell.isSelected) {
            bg = "#2563eb";
            textColor = "white";
            fontWeight = 700;
            borderColor = "transparent";
          } else if (cell.isHoliday) {
            // Holiday: yellow highlight
            bg = "#fef3c7";
            textColor = "#92400e";
            fontWeight = 700;
            borderColor = "#fcd34d";
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
              title={cell.holiday ? `🎉 ${cell.holiday.name}` : undefined}
              style={{
                height: 40,
                position: "relative",              // ✅ For 🎉 absolute
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                cursor: clickable ? "pointer" : "default",
                padding: 0,
                fontFamily: FONT,
                gap: 0,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (clickable && !cell.isSelected && !cell.isHoliday) {
                  e.currentTarget.style.background = "#f3f4f6";
                } else if (cell.isHoliday && !cell.isSelected) {
                  e.currentTarget.style.background = "#fde68a";
                }
              }}
              onMouseLeave={(e) => {
                if (clickable && !cell.isSelected) {
                  e.currentTarget.style.background = cell.isHoliday
                    ? "#fef3c7"
                    : bg;
                }
              }}
            >
              {/* Holiday emoji marker — top right corner */}
              {cell.isHoliday && !cell.isSelected && (
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    right: 2,
                    fontSize: 9,
                    lineHeight: 1,
                  }}
                >
                  🎉
                </span>
              )}

              <div
                style={{
                  fontSize: 12,
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
                    fontSize: 8,
                    fontWeight: 800,
                    color: cell.isSelected ? "white" : cell.statusColor,
                    marginTop: 2,
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
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #f3f4f6",
          fontSize: 10.5,
          color: "#6b7280",
          justifyContent: "center",
          fontFamily: FONT,
        }}
      >
        {[
          { color: "#16a34a", label: "P — Present" },
          { color: "#dc2626", label: "L — Late" },
          { color: "#d97706", label: "E — Early" },
          { color: "#9ca3af", label: "A — Absent" },
          { color: "#f87171", label: "S — Sunday" },
          { color: "#fcd34d", label: "🎉 Holiday", dot: "#fcd34d" },  // ✅ NEW
        ].map((l) => (
          <div
            key={l.label}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
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