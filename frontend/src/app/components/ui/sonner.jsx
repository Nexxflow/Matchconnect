import React from "react";
import { Toaster as Sonner } from "sonner";

export const Toaster = ({ theme, ...props }) => {
  const activeTheme =
    theme ||
    (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) ||
    "dark";

  return (
    <Sonner
      theme={activeTheme}
      position="top-right"
      duration={5000}
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        duration: 5000,
        className: "mc-toast font-sans text-sm rounded-2xl shadow-2xl border backdrop-blur-md",
        style: {
          zIndex: 99999
        }
      }}
      {...props}
    />
  );
};

export default Toaster;
