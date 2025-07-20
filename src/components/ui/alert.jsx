import React from "react";

export function Alert({ children, className = "", ...props }) {
  return (
    <div className={`border-l-4 border-red-500 bg-red-100 p-4 text-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function AlertDescription({ children }) {
  return <p className="text-red-700">{children}</p>;
}
