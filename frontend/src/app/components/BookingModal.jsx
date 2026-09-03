import React, { useState } from "react";
import { X, CalendarCheck, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest } from "../api";
import { GhostButton, getNext7Days } from "../utils/helpers.jsx";
import { TIME_SLOTS } from "../utils/constants";

export default function BookingModal({ item, type, token, onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: date/time, 2: review/payment, 3: success
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState(null);
  const days = getNext7Days();

  if (!item) return null;

  const priceNum = Number(String(item.price).replace(/[^\d]/g, "")) || 0;
  const platformFee = Math.round(priceNum * 0.05);
  const total = priceNum + platformFee;

  const handleConfirmPayment = async () => {
    if (!item.id) {
      setPayError("This item isn't loaded from the backend yet — refresh and try again.");
      return;
    }
    setPaying(true);
    setPayError(null);
    try {
      const res = await apiRequest("/bookings/create-order", {
        method: "POST",
        token,
        body: { booking_type: type, ref_id: item.id, booking_date: days[selectedDay].iso, time_slot: selectedSlot }
      });
      onConfirm(res.booking);
      setStep(3);
    } catch (err) {
      setPayError(err.message || "Payment failed, please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[88vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">{type === "ground" ? "Book Ground" : "Book Official"}</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-80" style={{ backgroundColor: "#222" }}>
            <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
            {type === "ground" ? "🏟" : "🧑‍⚖️"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{item.name}</div>
            <div className="text-xs" style={{ color: "#6b7a6b" }}>{type === "ground" ? item.area : `${item.role} · ${item.exp}`}</div>
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="mb-4">
              <label className="text-xs mb-2 block font-medium" style={{ color: "#6b7a6b" }}>Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {days.map((d, i) => (
                  <button key={i} onClick={() => setSelectedDay(i)} className="shrink-0 px-3 py-2 rounded-xl text-center transition-colors" style={{
                    backgroundColor: selectedDay === i ? "rgba(34,197,94,0.15)" : "#1a1a1a",
                    border: selectedDay === i ? "1px solid #22c55e" : "1px solid #2a2a2a"
                  }}>
                    <div className="text-xs font-semibold" style={{ color: selectedDay === i ? "#22c55e" : "#c8ccc8" }}>{d.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6b7a6b" }}>{d.date}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs mb-2 block font-medium" style={{ color: "#6b7a6b" }}>Select Time Slot</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button key={slot} onClick={() => setSelectedSlot(slot)} className="py-2.5 sm:py-2 rounded-xl text-xs font-medium transition-colors text-center" style={{
                    backgroundColor: selectedSlot === slot ? "rgba(34,197,94,0.15)" : "#1a1a1a",
                    border: selectedSlot === slot ? "1px solid #22c55e" : "1px solid #2a2a2a",
                    color: selectedSlot === slot ? "#22c55e" : "#c8ccc8"
                  }}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <button disabled={!selectedSlot} onClick={() => setStep(2)} className="w-full py-3 rounded-xl font-bold text-sm transition-colors" style={selectedSlot ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1e211e", color: "#3a3a3a", cursor: "not-allowed" }}>
              Continue to Payment
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <CalendarCheck className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-xs" style={{ color: "#c8ccc8" }}>{days[selectedDay].label}, {days[selectedDay].date} · {selectedSlot}</span>
            </div>
            <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6b7a6b" }}>{type === "ground" ? "Ground charges" : "Booking fee"}</span>
                <span className="font-mono text-white">₹{priceNum.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: "#6b7a6b" }}>Platform fee (5%)</span>
                <span className="font-mono text-white">₹{platformFee.toLocaleString()}</span>
              </div>
              <div className="pt-2 flex items-center justify-between text-sm font-bold" style={{ borderTop: "1px solid #2a2a2a" }}>
                <span className="text-white">Total Payable</span>
                <span className="text-green-400 font-mono">₹{total.toLocaleString()}</span>
              </div>
            </div>
            {payError && <div className="text-xs text-red-400 mb-3 rounded-lg p-2" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>{payError}</div>}
            <div className="flex gap-2">
              <GhostButton onClick={() => setStep(1)} disabled={paying} className="flex-1 text-center">Back</GhostButton>
              <button disabled={paying} onClick={handleConfirmPayment} className="flex-[2] py-3 rounded-xl bg-green-500 text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-400 transition-colors" style={paying ? { opacity: 0.6, cursor: "not-allowed" } : {}}>
                <CreditCard className="w-4 h-4" /> {paying ? "Processing..." : `Pay ₹${total.toLocaleString()}`}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "rgba(34,197,94,0.15)", border: "2px solid #22c55e" }}>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <div className="font-bold text-white text-base mb-1">Booking Confirmed!</div>
            <p className="text-xs mb-5" style={{ color: "#6b7a6b" }}>{item.name} · {days[selectedDay].label} {selectedSlot}. Check "My Bookings" in My Team tab.</p>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-green-500 text-black font-bold text-sm hover:bg-green-400 transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
