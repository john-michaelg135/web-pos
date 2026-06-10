import React, { ButtonHTMLAttributes, forwardRef } from "react";

interface PosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
  size?: "sm" | "md";
}

export const PosButton = forwardRef<HTMLButtonElement, PosButtonProps>(
  ({ variant = "primary", size = "md", children, style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      borderRadius: 12,
      fontWeight: 600,
      cursor: props.disabled ? "not-allowed" : "pointer",
      opacity: props.disabled ? 0.5 : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "all 0.2s",
    };

    const variantStyle: React.CSSProperties = variant === "primary" ? {
      background: "#465fff",
      color: "#fff",
      border: "none",
    } : {
      background: "transparent",
      color: "#344054",
      border: "1px solid #d0d5dd",
    };

    const sizeStyle: React.CSSProperties = size === "sm" ? {
      padding: "8px 16px",
      fontSize: 13,
      height: 40,
    } : {
      padding: "10px 20px",
      fontSize: 14,
      height: 48,
    };

    return (
      <button ref={ref} style={{ ...baseStyle, ...variantStyle, ...sizeStyle, ...style }} {...props}>
        {children}
      </button>
    );
  }
);
PosButton.displayName = "PosButton";
