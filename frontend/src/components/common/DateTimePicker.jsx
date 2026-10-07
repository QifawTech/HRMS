
import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

// Convert ISO → "2026-10-15T14:30"
const toLocalInputValue = (isoValue) => {
  if (!isoValue) return "";
  try {
    const d = new Date(isoValue);
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

// Convert "2026-10-15T14:30" → ISO with IST
const fromLocalInputValue = (value) => {
  if (!value) return "";
  // Backend expects ISO with timezone or IST assumed
  // Append IST offset manually since backend assumes IST if no tz
  return value; // Return as-is; backend handles IST
};

const DateTimePicker = ({
  value,
  onChange,
  label,
  required,
  min,
  placeholder,
}) => {
  const [datePart, setDatePart] = useState("");
  const [timePart, setTimePart] = useState("");

  // Sync internal state when value changes
  useEffect(() => {
    if (value) {
      const [d, t] = value.split("T");
      setDatePart(d || "");
      setTimePart(t || "");
    } else {
      setDatePart("");
      setTimePart("");
    }
  }, [value]);

  const emitChange = (newDate, newTime) => {
    if (newDate && newTime) {
      onChange(`${newDate}T${newTime}`);
    } else if (newDate) {
      onChange(`${newDate}T00:00`);
    } else {
      onChange("");
    }
  };

  const handleDateChange = (e) => {
    setDatePart(e.target.value);
    emitChange(e.target.value, timePart || "09:00");
  };

  const handleTimeChange = (e) => {
    setTimePart(e.target.value);
    emitChange(datePart, e.target.value);
  };

  return (
    <div>
      {label && (
        <label className="erp-label">
          {label} {required && "*"}
        </label>
      )}
      <div className="erp-datetime-picker">
        <div className="erp-datetime-field">
          <Calendar size={14} className="erp-datetime-icon" />
          <input
            type="date"
            className="erp-datetime-input"
            value={datePart}
            onChange={handleDateChange}
            min={min}
            required={required}
            placeholder={placeholder || "Select date"}
          />
        </div>
        <div className="erp-datetime-field">
          <Clock size={14} className="erp-datetime-icon" />
          <input
            type="time"
            className="erp-datetime-input"
            value={timePart}
            onChange={handleTimeChange}
            placeholder="Select time"
          />
        </div>
      </div>
      {datePart && timePart && (
        <small
          style={{
            color: "#6b7280",
            fontSize: 11,
            marginTop: 4,
            display: "block",
          }}
        >
          {new Date(`${datePart}T${timePart}`).toLocaleString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </small>
      )}
    </div>
  );
};

export default DateTimePicker;