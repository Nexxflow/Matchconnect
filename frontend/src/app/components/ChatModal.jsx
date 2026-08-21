import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { apiRequest } from "../api";

export default function ChatModal({ challenge, token, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const load = async () => {
    try {
      const res = await apiRequest(`/challenges/${challenge.id}/messages`, { token });
      setMessages(res.messages);
    } catch (err) {
      setError(err.message || "Could not load chat history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const body = text.trim();
    setText("");
    try {
      const res = await apiRequest(`/challenges/${challenge.id}/messages`, {
        method: "POST",
        token,
        body: { body }
      });
      setMessages(prev => [...prev, res.message]);
    } catch (err) {
      setError(err.message || "Message failed to send.");
      setText(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 flex flex-col" style={{ backgroundColor: "#151715", border: "1px solid #2a2a2a", height: "70vh", maxHeight: 520 }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">Match Chat</div>
            <div className="text-xs" style={{ color: "#6b7a6b" }}>{challenge.team_name} vs {challenge.accepted_by_team_name}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#222" }}>
            <X className="w-3.5 h-3.5 text-[#c8ccc8]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {loading && <div className="text-xs text-center py-6" style={{ color: "#4a5a4a" }}>Loading chat history...</div>}
          {!loading && messages.length === 0 && <div className="text-xs text-center py-6" style={{ color: "#4a5a4a" }}>No messages yet — say hello!</div>}
          {messages.map(m => (
            <div key={m.id} className="max-w-[80%]" style={{ marginLeft: m.sender_team_name === challenge.myTeamName ? "auto" : 0 }}>
              <div className="text-xs px-1 mb-0.5" style={{ color: "#4a5a4a" }}>{m.sender_team_name}</div>
              <div className="rounded-xl px-3 py-2 text-xs" style={m.sender_team_name === challenge.myTeamName ? { backgroundColor: "#22c55e", color: "#000" } : { backgroundColor: "#1a1a1a", color: "#c8ccc8", border: "1px solid #2a2a2a" }}>
                {m.body}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
        <div className="flex gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} className="flex-1 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" style={{ backgroundColor: "#111", border: "1px solid #2a2a2a" }} placeholder="Type a message..." />
          <button onClick={send} disabled={sending} className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold hover:bg-green-400 transition-colors" style={sending ? { opacity: 0.6, cursor: "not-allowed" } : {}}>Send</button>
        </div>
      </div>
    </div>
  );
}
