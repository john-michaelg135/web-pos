import React, { TextareaHTMLAttributes, forwardRef } from "react";

interface PosTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const PosTextArea = forwardRef<HTMLTextAreaElement, PosTextAreaProps>(
  ({ error, style, className, ...props }, ref) => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
        <textarea
          ref={ref}
          {...props}
          className={className}
          style={{
            width: "100%",
            padding: "11px 14px",
            fontSize: 14,
            borderRadius: 8,
            border: `1px solid ${error ? "#f04438" : "#d0d5dd"}`,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
            resize: "vertical",
            ...style
          }}
        />
        {error && <span style={{ fontSize: 11, color: "#f04438" }}>{error}</span>}
      </div>
    );
  }
);
PosTextArea.displayName = "PosTextArea";
