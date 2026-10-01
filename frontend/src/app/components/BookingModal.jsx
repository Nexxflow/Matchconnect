import React, { useState } from "react";
import { X, CalendarCheck, CreditCard, CheckCircle, ShieldCheck, Loader2, Calendar, Clock, MapPin, User, Sparkles } from "lucide-react";
import { apiRequest } from "../api";
import { GhostButton } from "../utils/helpers.jsx";
import { TIME_SLOTS } from "../utils/constants";
import CalendarField, { formatDateDisplay } from "./CalendarField.jsx";

export default function BookingModal({ item, type, token, onClose, onConfirm, initialDate = "", theme = "dark" }) {
  const [step, setStep] = useState(1); // 1: date/time, 2: review/payment, 3: success
  const [selectedDate, setSelectedDate] = useState(initialDate || "");
  const [selectedSlot, setSelectedSlot] = useState(type === "umpire" ? "Full Day" : null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);

  if (!item) return null;

  const isUmpire = type === "umpire";
  const bookedDates = item.bookedDates || item.booked_dates || [];

  const priceNum = Number(String(item.price).replace(/[^\d]/g, "")) || 0;
  const platformFee = Math.round(priceNum * 0.05);
  const total = priceNum + platformFee;

  const ensureRazorpayScript = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve();
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay checkout script")));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
      document.body.appendChild(script);
    });

  const handleConfirmPayment = async () => {
    if (!item.id) {
      setPayError("This item isn't loaded from the backend yet — refresh and try again.");
      return;
    }
    if (!selectedDate) {
      setPayError("Please select a date first.");
      return;
    }
    if (!isUmpire && !selectedSlot) {
      setPayError("Please select a time slot.");
      return;
    }

    setPaying(true);
    setPayError(null);
    try {
      const res = await apiRequest("/bookings/create-order", {
        method: "POST",
        token,
        body: {
          booking_type: type,
          ref_id: item.id,
          booking_date: selectedDate,
          time_slot: isUmpire ? "Full Day" : selectedSlot
        }
      });

      if (res.test_mode) {
        onConfirm(res.booking);
        setStep(3);
        return;
      }

      await ensureRazorpayScript();

      const options = {
        key: res.razorpay_key_id,
        amount: res.razorpay_order.amount,
        currency: res.razorpay_order.currency,
        name: "MatchConnect",
        description: `${type === "ground" ? "Ground Booking" : "Umpire Booking"} - ${item.name}`,
        order_id: res.razorpay_order.id,
        handler: async (response) => {
          try {
            const verifyRes = await apiRequest("/bookings/verify-payment", {
              method: "POST",
              token,
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_id: res.booking.id
              }
            });
            onConfirm(verifyRes.booking);
            setStep(3);
          } catch (err) {
            setPayError(err.message || "Payment verification failed");
          }
        },
        theme: { color: "#22c55e" },
        modal: {
          ondismiss: () => {
            setPaying(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setPayError(response.error?.description || "Payment failed. Please try again.");
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setPayError(err.message || "Booking failed — please try again");
      setPaying(false);
    }
  };

  const isLight = theme === "light";
  const canContinueStep1 = selectedDate && (isUmpire || selectedSlot);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl relative shadow-2xl animate-in zoom-in-95 duration-200 border p-5 sm:p-6 max-h-[90vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{
          backgroundColor: isLight ? "#ffffff" : "#0d120e",
          borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.12)"
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-3xl z-10 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 mb-3 border-b" style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.12)",
                borderColor: isLight ? "#a7f3d0" : "rgba(34,197,94,0.28)",
                color: isLight ? "#16a34a" : "#4ade80"
              }}
            >
              {type === "ground" ? <MapPin className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  {type === "ground" ? "Book Ground" : "Book Official"}
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
                  style={{
                    backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                    borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.3)",
                    color: isLight ? "#15803d" : "#4ade80"
                  }}
                >
                  {step === 1 ? "Schedule" : step === 2 ? "Checkout" : "Confirmed"}
                </span>
              </div>
              <p className="text-xs truncate mt-0.5" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
                {type === "ground" ? "Reserve match venue slots with instant booking" : "Hire certified umpires and scorers for your fixture"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-all duration-200 hover:rotate-90 hover:scale-105 active:scale-95 shrink-0"
            style={{
              backgroundColor: isLight ? "#f8fafc" : "rgba(255,255,255,0.06)",
              borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)",
              color: isLight ? "#64748b" : "#9aa59c"
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Info Banner */}
        <div
          className="flex items-center gap-3 p-3 rounded-2xl border mb-4"
          style={{
            backgroundColor: isLight ? "#f8fafc" : "#111812",
            borderColor: isLight ? "#e2e8f0" : "#1d2a21"
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl border"
            style={{
              backgroundColor: isLight ? "#ffffff" : "#0d130e",
              borderColor: isLight ? "#e2e8f0" : "#233027"
            }}
          >
            {type === "ground" ? "🏟" : "🧑‍⚖️"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm truncate" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              {item.name}
            </div>
            <div className="text-xs truncate" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
              {type === "ground" ? item.area : `${item.role} · ${item.exp || `${item.experience || 0} yrs exp`}`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs font-black" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>
              ₹{priceNum.toLocaleString()}
            </div>
            <div className="text-[10px]" style={{ color: isLight ? "#94a3b8" : "#5f6b62" }}>
              {type === "ground" ? "/hour" : "/match"}
            </div>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="mb-4">
              <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{isUmpire ? "Match Date (Full Day Booking)" : "Match Date"}</span>
              </label>
              <CalendarField
                value={selectedDate}
                onChange={setSelectedDate}
                theme={theme}
                placeholder="Select match date"
                disabledDates={isUmpire ? bookedDates : []}
              />
              {isUmpire && (
                <div
                  className="mt-2.5 p-3 rounded-2xl text-xs flex items-start gap-2 border"
                  style={{
                    backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.08)",
                    borderColor: isLight ? "#bbf7d0" : "rgba(34,197,94,0.2)",
                    color: isLight ? "#166534" : "#86efac"
                  }}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Full Day Booking:</span> Umpires are booked for the entire match session. Once confirmed, this date is locked exclusively for your fixture.
                  </div>
                </div>
              )}
            </div>

            {!isUmpire && (
              <div className="mb-5">
                <label className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                  <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Select Time Slot</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                        selectedSlot === slot
                          ? isLight
                            ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800 shadow-xs"
                            : "bg-emerald-950/40 border-emerald-500/70 ring-2 ring-emerald-500/30 text-emerald-300 shadow-xs"
                          : isLight
                            ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                            : "bg-[#0d130e] border-[#233027] text-neutral-300 hover:border-[#2a3c2e]"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                color: "#ffffff",
                boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
              }}
            >
              <span>Continue to Payment</span>
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div
              className="rounded-2xl p-3 mb-4 flex items-center gap-2.5 border"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#111812",
                borderColor: isLight ? "#e2e8f0" : "#1d2a21"
              }}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold" style={{ color: isLight ? "#334155" : "#c8ccc8" }}>
                {formatDateDisplay(selectedDate)} · {isUmpire ? "Full Day Official" : selectedSlot}
              </span>
            </div>

            <div
              className="rounded-2xl p-4 mb-4 space-y-2.5 border"
              style={{
                backgroundColor: isLight ? "#f8fafc" : "#111812",
                borderColor: isLight ? "#e2e8f0" : "#1d2a21"
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
                  {type === "ground" ? "Ground charges" : "Official fee (Full Day)"}
                </span>
                <span className="font-mono font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  ₹{priceNum.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: isLight ? "#64748b" : "#9aa59c" }}>Platform fee (5%)</span>
                <span className="font-mono font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
                  ₹{platformFee.toLocaleString()}
                </span>
              </div>
              <div
                className="pt-2.5 flex items-center justify-between text-sm font-bold border-t"
                style={{ borderColor: isLight ? "#e2e8f0" : "#1d2a21" }}
              >
                <span style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Total Payable</span>
                <span className="font-mono font-black text-base" style={{ color: isLight ? "#16a34a" : "#4ade80" }}>
                  ₹{total.toLocaleString()}
                </span>
              </div>
            </div>

            {payError && (
              <div
                className="text-xs font-medium mb-3 rounded-xl p-3 border"
                style={{
                  backgroundColor: isLight ? "#fff1f2" : "rgba(239,68,68,0.1)",
                  borderColor: isLight ? "#fecdd3" : "rgba(239,68,68,0.25)",
                  color: isLight ? "#e11d48" : "#f87171"
                }}
              >
                {payError}
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={paying}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer border"
                style={{
                  backgroundColor: isLight ? "#f8fafc" : "transparent",
                  borderColor: isLight ? "#cbd5e1" : "#1d2a21",
                  color: isLight ? "#334155" : "#c8ccc8"
                }}
              >
                Back
              </button>
              <button
                disabled={paying}
                onClick={handleConfirmPayment}
                className="flex-[2] py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                  color: "#ffffff",
                  boxShadow: isLight ? "0 4px 14px -3px rgba(16,185,129,0.45)" : "0 6px 20px -6px rgba(34,197,94,0.7)"
                }}
              >
                {paying ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ₹{total.toLocaleString()}</span>
                  </span>
                )}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-5 space-y-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-md"
              style={{
                backgroundColor: isLight ? "#ecfdf5" : "rgba(34,197,94,0.15)",
                border: "2px solid #22c55e"
              }}
            >
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </div>
            <div className="font-black text-lg" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>
              Booking Confirmed!
            </div>
            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: isLight ? "#64748b" : "#9aa59c" }}>
              Your booking for <span className="font-bold text-slate-900 dark:text-white">{item.name}</span> on {formatDateDisplay(selectedDate)} ({isUmpire ? "Full Day" : selectedSlot}) has been confirmed!
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99] mt-2"
              style={{
                background: "linear-gradient(135deg,#22c55e 0%,#10b981 50%,#06b6d4 100%)",
                color: "#ffffff"
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
