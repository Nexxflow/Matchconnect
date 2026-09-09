import React, { useState, useEffect } from "react";
import { Calendar, X } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function toISODate(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDateDisplay(iso) {
  if (!iso) return "";
  const clean = String(iso).slice(0, 10);
  const parts = clean.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return iso;
  const [y, m, d] = parts;
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/**
 * Reusable CalendarField component
 * 
 * Props:
 *  - value: string (YYYY-MM-DD)
 *  - onChange: function(isoDateString)
 *  - theme: "dark" | "light"
 *  - placeholder: string (default: "Select a date")
 *  - disabledDates: string[] array of ISO date strings (e.g. booked umpire dates)
 *  - minDate: Date | string (default: today)
 *  - allowPast: boolean (default: false)
 *  - clearable: boolean (default: false)
 *  - disabled: boolean
 *  - className: string
 *  - buttonStyle: object
 */
export default function CalendarField({
  value = "",
  onChange,
  theme = "dark",
  placeholder = "Select a date",
  disabledDates = [],
  minDate,
  allowPast = false,
  clearable = false,
  disabled = false,
  className = "",
  buttonStyle = {}
}) {
  const isLight =
    theme === "light" ||
    (typeof document !== "undefined" && document.documentElement.classList.contains("light"));

  const [open, setOpen] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const effectiveMinDate = minDate
    ? (typeof minDate === "string" ? new Date(minDate) : new Date(minDate))
    : today;
  effectiveMinDate.setHours(0, 0, 0, 0);

  const initialMonth = (() => {
    if (value && typeof value === "string") {
      const parts = value.slice(0, 10).split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  })();

  const [viewMonth, setViewMonth] = useState(initialMonth);

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value && typeof value === "string") {
      const parts = value.slice(0, 10).split("-").map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        setViewMonth(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [value]);

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInThisMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInThisMonth }, (_, i) => i + 1)
  ];

  const selectDay = (day) => {
    const picked = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    onChange?.(toISODate(picked));
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
  };

  // Set of formatted disabled dates
  const disabledDatesSet = new Set(
    (disabledDates || []).map((d) => (typeof d === "string" ? d.slice(0, 10) : toISODate(new Date(d))))
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full rounded-xl px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between transition-colors shadow-sm"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#111",
          border: `1px solid ${
            open ? "#16a34a" : isLight ? "#e2e8f0" : "#2a2a2a"
          }`,
          color: value
            ? isLight
              ? "#0f172a"
              : "#fff"
            : isLight
            ? "#94a3b8"
            : "#4a5a4a",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          ...buttonStyle
        }}
      >
        <span className="truncate">
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {clearable && value && (
            <X
              className="w-3.5 h-3.5 hover:opacity-80 transition-opacity"
              style={{ color: isLight ? "#94a3b8" : "#64748b" }}
              onClick={handleClear}
            />
          )}
          <Calendar
            className="w-3.5 h-3.5"
            style={{ color: isLight ? "#64748b" : "#6b7a6b" }}
          />
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{
            backgroundColor: isLight
              ? "rgba(15, 23, 42, 0.45)"
              : "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(3px)"
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-2xl p-4 w-72 max-w-full shadow-2xl"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#151715",
              border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
              boxShadow: isLight
                ? "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)"
                : "0 20px 40px rgba(0,0,0,0.8)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Prev, Month Year, Next */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: isLight ? "#0f172a" : "#c8ccc8" }}
              >
                ‹
              </button>
              <span
                className="text-sm font-bold"
                style={{ color: isLight ? "#0f172a" : "#ffffff" }}
              >
                {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button
                type="button"
                onClick={() =>
                  setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: isLight ? "#0f172a" : "#c8ccc8" }}
              >
                ›
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={i}
                  className="text-center text-xs font-semibold py-1"
                  style={{ color: isLight ? "#64748b" : "#4a5a4a" }}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={i} />;
                const cellDate = new Date(
                  viewMonth.getFullYear(),
                  viewMonth.getMonth(),
                  day
                );
                cellDate.setHours(0, 0, 0, 0);

                const isoStr = toISODate(cellDate);
                const isPast = !allowPast && cellDate < effectiveMinDate;
                const isBooked = disabledDatesSet.has(isoStr);
                const isDisabled = isPast || isBooked;

                const isSelected = value === isoStr;
                const isToday = isoStr === toISODate(today);

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && selectDay(day)}
                    title={
                      isBooked
                        ? "Already booked for this date"
                        : isPast
                        ? "Past date"
                        : undefined
                    }
                    className="aspect-square rounded-lg text-xs font-medium transition-colors relative flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: isSelected
                        ? "#16a34a"
                        : isBooked
                        ? isLight
                          ? "#fee2e2"
                          : "rgba(239, 68, 68, 0.12)"
                        : "transparent",
                      color: isBooked
                        ? isLight
                          ? "#ef4444"
                          : "#f87171"
                        : isPast
                        ? isLight
                          ? "#cbd5e1"
                          : "#2a2a2a"
                        : isSelected
                        ? "#ffffff"
                        : isToday
                        ? isLight
                          ? "#16a34a"
                          : "#22c55e"
                        : isLight
                        ? "#0f172a"
                        : "#c8ccc8",
                      border:
                        isSelected
                          ? "1px solid #16a34a"
                          : isToday
                          ? isLight
                            ? "1px solid #16a34a"
                            : "1px solid #22c55e"
                          : isBooked
                          ? isLight
                            ? "1px solid #fca5a5"
                            : "1px solid rgba(239, 68, 68, 0.3)"
                          : "1px solid transparent",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      textDecoration: isBooked ? "line-through" : "none"
                    }}
                  >
                    <span>{day}</span>
                    {isBooked && (
                      <span
                        className="text-[8px] font-bold leading-none -mt-0.5"
                        style={{ color: isLight ? "#dc2626" : "#f87171" }}
                      >
                        Booked
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer note if there are booked dates in current view */}
            {disabledDates.length > 0 && (
              <div
                className="mt-3 pt-2.5 border-t text-[11px] flex items-center justify-between"
                style={{
                  borderColor: isLight ? "#f1f5f9" : "#222",
                  color: isLight ? "#64748b" : "#6b7a6b"
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  Strikethrough = Booked
                </span>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.("");
                      setOpen(false);
                    }}
                    className="text-[11px] hover:underline"
                    style={{ color: isLight ? "#dc2626" : "#f87171" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
