import React from "react";

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`rounded-xl border bg-white p-6 shadow ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function CardTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

export function CardDescription({ children }) {
  return <p className="text-gray-600">{children}</p>;
}

export function CardContent({ children }) {
  return <div className="mt-2">{children}</div>;
}
