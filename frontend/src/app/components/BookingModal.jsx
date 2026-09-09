import React, { useState } from "react";
import { X, CalendarCheck, CreditCard, CheckCircle, ShieldCheck } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: isLight ? "rgba(15,23,42,0.5)" : "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[88vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]" style={{ backgroundColor: isLight ? "#ffffff" : "#151715", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">{type === "ground" ? "Book Ground" : "Book Official"}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: isLight ? "#f1f5f9" : "#222" }}>
            <X className="w-3.5 h-3.5" style={{ color: isLight ? "#475569" : "#c8ccc8" }} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            {type === "ground" ? "🏟" : "🧑‍⚖️"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>{item.name}</div>
            <div className="text-xs" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{type === "ground" ? item.area : `${item.role} · ${item.exp}`}</div>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="mb-4">
              <label className="text-xs mb-1.5 block font-medium" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>
                {isUmpire ? "Match Date (Full Day Booking)" : "Match Date"}
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
                  className="mt-2.5 p-2.5 rounded-xl text-xs flex items-start gap-2"
                  style={{
                    backgroundColor: isLight ? "#f0fdf4" : "rgba(34,197,94,0.08)",
                    border: isLight ? "1px solid #bbf7d0" : "1px solid rgba(34,197,94,0.2)",
                    color: isLight ? "#166534" : "#86efac"
                  }}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Whole Day Booking:</span> Umpires are booked for the entire match day. Once booked, this date is locked and cannot be booked by any other user until cancelled.
                  </div>
                </div>
              )}
            </div>

            {!isUmpire && (
              <div className="mb-5">
                <label className="text-xs mb-2 block font-medium" style={{ color: isLight ? "#475569" : "#6b7a6b" }}>Select Time Slot</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)} className="py-2.5 sm:py-2 rounded-xl text-xs font-medium transition-colors text-center" style={{
                      backgroundColor: selectedSlot === slot ? "rgba(34,197,94,0.15)" : (isLight ? "#f8fafc" : "#1a1a1a"),
                      border: selectedSlot === slot ? "1px solid #22c55e" : `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}`,
                      color: selectedSlot === slot ? "#16a34a" : (isLight ? "#334155" : "#c8ccc8")
                    }}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm"
              style={canContinueStep1
                ? {
                    backgroundColor: isLight ? "#16a34a" : "#22c55e",
                    color: isLight ? "#ffffff" : "#000",
                    cursor: "pointer"
                  }
                : {
                    backgroundColor: isLight ? "#f1f5f9" : "#1e211e",
                    color: isLight ? "#94a3b8" : "#3a3a3a",
                    cursor: "not-allowed"
                  }}
            >
              Continue to Payment
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: isLight ? "#f8fafc" : "#1a1a1a", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}>
              <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-medium" style={{ color: isLight ? "#334155" : "#c8ccc8" }}>
                {formatDateDisplay(selectedDate)} · {isUmpire ? "Full Day Official" : selectedSlot}
              </span>
            </div>
            <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: isLight ? "#f8fafc" : "#1a1a1a", border: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>{type === "ground" ? "Ground charges" : "Official fee (Full Day)"}</span>
                <span className="font-mono font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>₹{priceNum.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>Platform fee (5%)</span>
                <span className="font-mono font-semibold" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>₹{platformFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: `1px solid ${isLight ? "#e2e8f0" : "#2a2a2a"}` }}>
                <span style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Total Payable</span>
                <span className="font-mono font-black" style={{ color: isLight ? "#16a34a" : "#22c55e" }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
            {payError && <div className="text-xs text-red-500 font-medium mb-3 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{payError}</div>}
            <div className="flex gap-2">
              <GhostButton onClick={() => setStep(1)} disabled={paying} theme={theme} className="flex-1 text-center">Back</GhostButton>
              <button
                disabled={paying}
                onClick={handleConfirmPayment}
                className="flex-[2] py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                style={{
                  backgroundColor: isLight ? "#16a34a" : "#22c55e",
                  color: isLight ? "#ffffff" : "#000",
                  opacity: paying ? 0.6 : 1,
                  cursor: paying ? "not-allowed" : "pointer"
                }}
              >
                <CreditCard className="w-4 h-4" /> {paying ? "Processing..." : `Pay ₹${total.toLocaleString()}`}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="font-bold text-base mb-1" style={{ color: isLight ? "#0f172a" : "#ffffff" }}>Booking Confirmed!</div>
            <p className="text-xs mb-5" style={{ color: isLight ? "#64748b" : "#6b7a6b" }}>
              {item.name} · {formatDateDisplay(selectedDate)} ({isUmpire ? "Full Day" : selectedSlot}). Check "My Bookings" in My Team tab.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-sm cursor-pointer"
              style={{
                backgroundColor: isLight ? "#16a34a" : "#22c55e",
                color: isLight ? "#ffffff" : "#000"
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
