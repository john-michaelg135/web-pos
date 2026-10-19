"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LocationSelects } from "./LocationSelects";

interface PwdFormModalProps {
  show: boolean;
  onClose: () => void;
  onProceed: () => void;
  idNumber: string;
  setIdNumber: (v: string) => void;
  pwdFirstName: string;
  setPwdFirstName: (v: string) => void;
  pwdMiddleName: string;
  setPwdMiddleName: (v: string) => void;
  pwdLastName: string;
  setPwdLastName: (v: string) => void;
  pwdSuffix: string;
  setPwdSuffix: (v: string) => void;
  pwdStreet: string;
  setPwdStreet: (v: string) => void;
  pwdBarangay: string;
  setPwdBarangay: (v: string) => void;
  pwdCity: string;
  setPwdCity: (v: string) => void;
  pwdProvince: string;
  setPwdProvince: (v: string) => void;
  pwdZipCode: string;
  setPwdZipCode: (v: string) => void;
  errors: Record<string, string>;
  setErrors: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
};

export default function PwdFormModal({
  show,
  onClose,
  onProceed,
  idNumber,
  setIdNumber,
  pwdFirstName,
  setPwdFirstName,
  pwdMiddleName,
  setPwdMiddleName,
  pwdLastName,
  setPwdLastName,
  pwdSuffix,
  setPwdSuffix,
  pwdStreet,
  setPwdStreet,
  pwdBarangay,
  setPwdBarangay,
  pwdCity,
  setPwdCity,
  pwdProvince,
  setPwdProvince,
  pwdZipCode,
  setPwdZipCode,
  errors,
  setErrors,
}: PwdFormModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!show || !mounted) return null;

  const handleProceed = () => {
    let isValid = true;
    const newErrors: Record<string, string> = {};

    const trimmedId = idNumber.trim();
    if (!trimmedId) { newErrors.idNumber = "Required"; isValid = false; }
    else if (!/^\d{2}-\d{4}-\d{3}-\d{7}$/.test(trimmedId)) { newErrors.idNumber = "Invalid format"; isValid = false; }

    const normFirst = toTitleCase(pwdFirstName);
    const normMiddle = toTitleCase(pwdMiddleName);
    const normLast = toTitleCase(pwdLastName);
    const normSuffix = toTitleCase(pwdSuffix);
    const normStreet = toTitleCase(pwdStreet);

    setPwdFirstName(normFirst);
    setPwdMiddleName(normMiddle);
    setPwdLastName(normLast);
    setPwdSuffix(normSuffix);
    setPwdStreet(normStreet);

    if (!normFirst.trim()) { newErrors.pwdFirstName = "Required"; isValid = false; }
    if (!normLast.trim()) { newErrors.pwdLastName = "Required"; isValid = false; }
    if (!normStreet.trim()) { newErrors.pwdStreet = "Required"; isValid = false; }
    if (!pwdBarangay.trim()) { newErrors.pwdBarangay = "Required"; isValid = false; }
    if (!pwdCity.trim()) { newErrors.pwdCity = "Required"; isValid = false; }
    if (!pwdProvince.trim()) { newErrors.pwdProvince = "Required"; isValid = false; }
    if (!pwdZipCode.trim()) { newErrors.pwdZipCode = "Required"; isValid = false; }
    else if (!/^\d{4}$/.test(pwdZipCode.trim())) { newErrors.pwdZipCode = "Must be 4 digits"; isValid = false; }

    if (!isValid) {
      setErrors(() => newErrors);
      toast.error("Please complete all required details.");
      return;
    }

    onProceed();
  };

  const handleIdChange = (val: string) => {
    if (val.length < idNumber.length) {
      if (idNumber.endsWith("-") && !val.endsWith("-")) {
        const clean = val.replace(/\D/g, "");
        const digits = clean.slice(0, clean.length - 1);
        let formatted = "";
        if (digits.length > 0) formatted += digits.substring(0, 2);
        if (digits.length > 2) formatted += "-" + digits.substring(2, 6);
        if (digits.length > 6) formatted += "-" + digits.substring(6, 9);
        if (digits.length > 9) formatted += "-" + digits.substring(9, 16);
        setIdNumber(formatted);
      } else {
        setIdNumber(val);
      }
    } else {
      const digits = val.replace(/\D/g, "").slice(0, 16);
      let formatted = "";
      if (digits.length > 0) formatted += digits.substring(0, 2);
      if (digits.length > 2) formatted += "-" + digits.substring(2, 6);
      if (digits.length > 6) formatted += "-" + digits.substring(6, 9);
      if (digits.length > 9) formatted += "-" + digits.substring(9, 16);
      setIdNumber(formatted);
    }
    if (errors.idNumber) setErrors((prev) => { const { idNumber, ...rest } = prev; return rest; });
  };

  const modal = (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99998,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}
      />
      {/* Dialog */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          backgroundColor: "#ffffff",
          borderRadius: 12,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#111827" }}>
              Senior/PWD Details
            </h2>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4, color: "#6b7280" }}
            >
              <X style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>ID Number <span className="text-destructive">*</span></Label>
              <Input
                maxLength={20}
                placeholder="13-7600-000-0000123"
                value={idNumber}
                onChange={(e) => handleIdChange(e.target.value)}
                className={cn(errors.idNumber && "border-destructive")}
              />
              {errors.idNumber && <p className="text-xs text-destructive mt-1">{errors.idNumber}</p>}
            </div>

            <div className="sm:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  maxLength={50}
                  placeholder="Juan"
                  value={pwdFirstName}
                  onChange={(e) => {
                    setPwdFirstName(e.target.value.replace(/[^a-zA-Z\s.\-]/g, ""));
                    if (errors.pwdFirstName) setErrors((prev) => { const { pwdFirstName, ...rest } = prev; return rest; });
                  }}
                  onBlur={() => setPwdFirstName(toTitleCase(pwdFirstName))}
                  className={cn(errors.pwdFirstName && "border-destructive")}
                />
                {errors.pwdFirstName && <p className="text-xs text-destructive mt-1">{errors.pwdFirstName}</p>}
              </div>
              <div>
                <Label>Middle Name</Label>
                <Input
                  maxLength={50}
                  placeholder="Dela"
                  value={pwdMiddleName}
                  onChange={(e) => setPwdMiddleName(e.target.value.replace(/[^a-zA-Z\s.\-]/g, ""))}
                  onBlur={() => setPwdMiddleName(toTitleCase(pwdMiddleName))}
                />
              </div>
              <div>
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input
                  maxLength={50}
                  placeholder="Cruz"
                  value={pwdLastName}
                  onChange={(e) => {
                    setPwdLastName(e.target.value.replace(/[^a-zA-Z\s.\-]/g, ""));
                    if (errors.pwdLastName) setErrors((prev) => { const { pwdLastName, ...rest } = prev; return rest; });
                  }}
                  onBlur={() => setPwdLastName(toTitleCase(pwdLastName))}
                  className={cn(errors.pwdLastName && "border-destructive")}
                />
                {errors.pwdLastName && <p className="text-xs text-destructive mt-1">{errors.pwdLastName}</p>}
              </div>
              <div>
                <Label>Suffix</Label>
                <Input
                  maxLength={10}
                  placeholder="Jr."
                  value={pwdSuffix}
                  onChange={(e) => setPwdSuffix(e.target.value.replace(/[^a-zA-Z\s.]/g, ""))}
                  onBlur={() => setPwdSuffix(toTitleCase(pwdSuffix))}
                />
              </div>
            </div>

            <LocationSelects
              province={pwdProvince}
              setProvince={setPwdProvince}
              city={pwdCity}
              setCity={setPwdCity}
              barangay={pwdBarangay}
              setBarangay={setPwdBarangay}
              errors={errors}
            />

            <div>
              <Label>Zip Code <span className="text-destructive">*</span></Label>
              <Input
                maxLength={4}
                placeholder="1000"
                value={pwdZipCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPwdZipCode(val);
                  if (errors.pwdZipCode) setErrors((prev) => { const { pwdZipCode, ...rest } = prev; return rest; });
                }}
                className={cn(errors.pwdZipCode && "border-destructive")}
              />
              {errors.pwdZipCode && <p className="text-xs text-destructive mt-1">{errors.pwdZipCode}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label>Street <span className="text-destructive">*</span></Label>
              <Input
                maxLength={100}
                placeholder="123 Maple St."
                value={pwdStreet}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s.\-,\/#]/g, "");
                  setPwdStreet(cleaned);
                  if (errors.pwdStreet) setErrors((prev) => { const { pwdStreet, ...rest } = prev; return rest; });
                }}
                onBlur={() => setPwdStreet(toTitleCase(pwdStreet))}
                className={cn(errors.pwdStreet && "border-destructive")}
              />
              {errors.pwdStreet && <p className="text-xs text-destructive mt-1">{errors.pwdStreet}</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "#f9fafb",
            flexShrink: 0,
          }}
        >
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleProceed}>
            Proceed
          </Button>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
