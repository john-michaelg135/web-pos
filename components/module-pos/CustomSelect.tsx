"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

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
  const [menuPos, setMenuPos] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
  } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 40 + 8, 250);

    // Open above if not enough space below but enough above
    const openAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;

    setMenuPos({
      left: rect.left,
      width: rect.width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }, [options.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keep the portalled menu aligned while open (scroll/resize).
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => calculatePosition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, calculatePosition]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", minWidth: 180, ...style }} className={className}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
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
        <span style={{ flex: 1, minWidth: 0, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            color: muted,
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && !disabled && menuPos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            left: menuPos.left,
            width: menuPos.width,
            ...(menuPos.top !== undefined ? { top: menuPos.top } : {}),
            ...(menuPos.bottom !== undefined ? { bottom: menuPos.bottom } : {}),
            background: cardBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
            zIndex: 100001,
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  background: isSelected ? (dark ? "#2d3748" : "#f4f4f5") : "transparent",
                  color: text,
                  border: "none",
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = dark ? "#2d3748" : "#f4f4f5";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0, opacity: isSelected ? 1 : 0 }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
