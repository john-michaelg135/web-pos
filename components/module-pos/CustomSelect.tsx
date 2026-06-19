"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { ChevronDownIcon } from "@/icons/index";

export interface CustomSelectOption {
  value: string;
  label: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  disabled = false,
  style = {},
  className = "",
  placeholder = "Select...",
}: CustomSelectProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const text = dark ? "#f9fafb" : "#111827";
  const cardBg = dark ? "#1a2231" : "#ffffff";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const primary = "#465fff";
  const muted = dark ? "#8899aa" : "#667085";

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: "relative", ...style }} className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          width: "100%",
          padding: "8px 12px",
          borderRadius: 10,
          background: dark ? "#1a2231" : "#ffffff",
          border: `1px solid ${border}`,
          color: disabled ? muted : text,
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon style={{ width: 14, height: 14, color: muted, flexShrink: 0 }} />
      </button>

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
            zIndex: 100000,
            minWidth: "100%",
            overflow: "hidden",
            maxHeight: 250,
            overflowY: "auto",
          }}
          className="custom-scrollbar"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  background: isSelected ? (dark ? "#2d3748" : "#f1f5f9") : "transparent",
                  color: isSelected ? primary : text,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dark ? "#2d3748" : "#f1f5f9";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
