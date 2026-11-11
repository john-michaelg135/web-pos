"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Manager PIN field with its own show/hide button. The browser's built-in reveal eye
 * (Edge) disappears after a failed attempt, so it's hidden and replaced by this one,
 * which stays put.
 */
export default function PinInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (pin: string) => void;
  /** Colors and focus ring of the field. */
  className: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="Enter your 6-digit PIN"
        className={`${className} pr-11 [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide PIN" : "Show PIN"}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-primary"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
