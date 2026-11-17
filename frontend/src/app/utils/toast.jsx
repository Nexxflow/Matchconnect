import React from "react";
import { toast } from "sonner";
import { CheckCircle2, Trash2, AlertCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Clean and transform raw HTTP status strings, network errors, and server errors
 * into friendly, readable user messages.
 */
export function cleanErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const raw = typeof err === "string" ? err : err.message || err.error || "";
  if (!raw || typeof raw !== "string") return fallback;
  const lower = raw.toLowerCase().trim();

  // Network and connectivity issues
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("connection refused") ||
    lower.includes("err_connection_refused")
  ) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  // 5xx Server errors
  if (
    lower.includes("request failed: 500") ||
    lower.includes("internal server error") ||
    lower.includes("status code 500") ||
    lower.includes("502 bad gateway") ||
    lower.includes("503 service unavailable") ||
    lower.includes("504 gateway timeout")
  ) {
    return "Our server encountered a temporary issue. Please try again shortly.";
  }

  // 404 Not Found
  if (lower.includes("request failed: 404") || lower.includes("not found")) {
    return "The requested item or resource could not be found.";
  }

  // 403 Forbidden
  if (
    lower.includes("request failed: 403") ||
    lower.includes("forbidden") ||
    lower.includes("permission denied") ||
    lower.includes("not authorized")
  ) {
    return "You do not have permission to perform this action.";
  }

  // 401 Unauthorized
  if (
    lower.includes("request failed: 401") ||
    lower.includes("unauthorized") ||
    lower.includes("jwt expired") ||
    lower.includes("token expired") ||
    lower.includes("invalid token")
  ) {
    return "Your session has expired. Please log in again.";
  }

  // JSON or Syntax errors
  if (
    lower.includes("syntaxerror") ||
    lower.includes("unexpected token") ||
    lower.includes("is not valid json")
  ) {
    return "Received an unexpected server response. Please try again.";
  }

  // Catch-all for generic "Request failed: xyz"
  if (lower.startsWith("request failed:") || lower.includes("status code")) {
    return fallback || "Operation could not be completed. Please try again.";
  }

  return raw;
}

/**
 * Universal toast dispatcher with 5-second duration, clean error filtering,
 * and dedicated success and delete action states.
 */
export const showToast = {
  // Success toast (displayed for 5 seconds)
  success: (message, options = {}) => {
    return toast.success(message, {
      duration: 5000,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      ...options
    });
  },

  // Delete message toast (displayed for 5 seconds with trash icon and subtle danger styling)
  delete: (message, options = {}) => {
    return toast.success(message, {
      duration: 5000,
      icon: <Trash2 className="w-5 h-5 text-red-500 shrink-0" />,
      style: {
        borderColor: "rgba(239, 68, 68, 0.4)",
        ...options.style
      },
      ...options
    });
  },

  // Error toast (filters out raw HTTP messages, displayed for 5 seconds)
  error: (errOrMessage, fallback = "An error occurred. Please try again.", options = {}) => {
    const cleanMsg = cleanErrorMessage(errOrMessage, fallback);
    return toast.error(cleanMsg, {
      duration: 5000,
      icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
      ...options
    });
  },

  // Warning toast (displayed for 5 seconds)
  warning: (message, options = {}) => {
    return toast.warning(message, {
      duration: 5000,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      ...options
    });
  },

  // Info toast (displayed for 5 seconds)
  info: (message, options = {}) => {
    return toast.info(message, {
      duration: 5000,
      icon: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
      ...options
    });
  }
};

export default showToast;

