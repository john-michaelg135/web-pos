"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "./CustomSelect";
import { cn } from "@/lib/utils";

interface LocationSelectsProps {
  province: string;
  setProvince: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  barangay: string;
  setBarangay: (v: string) => void;
  errors?: Record<string, string>;
}

export function LocationSelects({
  province,
  setProvince,
  city,
  setCity,
  barangay,
  setBarangay,
  errors = {},
}: LocationSelectsProps) {
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  const [selectedProvCode, setSelectedProvCode] = useState<string>("");
  const [selectedCityCode, setSelectedCityCode] = useState<string>("");

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/provinces/")
      .then((res) => res.json())
      .then((data) => {
        const withNCR = [...data, { code: "130000000", name: "Metro Manila (NCR)" }];
        withNCR.sort((a, b) => a.name.localeCompare(b.name));
        setProvinces(withNCR);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProvCode) {
      setCities([]);
      return;
    }
    const url =
      selectedProvCode === "130000000"
        ? "https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/"
        : `https://psgc.gitlab.io/api/provinces/${selectedProvCode}/cities-municipalities/`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setCities(data);
      })
      .catch(console.error);
  }, [selectedProvCode]);

  useEffect(() => {
    if (!selectedCityCode) {
      setBarangays([]);
      return;
    }
    fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCityCode}/barangays/`)
      .then((res) => res.json())
      .then((data) => {
        data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setBarangays(data);
      })
      .catch(console.error);
  }, [selectedCityCode]);

  return (
    <>
      <div>
        <Label>
          Province <span className="text-destructive">*</span>
        </Label>
        <CustomSelect
          options={provinces.map((p) => ({ value: p.code, label: p.name }))}
          value={selectedProvCode}
          onChange={(val) => {
            setSelectedProvCode(val);
            const pName = provinces.find((p) => p.code === val)?.name || "";
            setProvince(pName);
            setSelectedCityCode("");
            setCity("");
            setBarangay("");
          }}
          className={cn(errors.province && "border-destructive")}
          placeholder="Select Province"
        />
        {errors.province && <p className="text-xs text-destructive mt-1">{errors.province}</p>}
      </div>

      <div>
        <Label>
          City / Municipality <span className="text-destructive">*</span>
        </Label>
        <CustomSelect
          options={cities.map((c) => ({ value: c.code, label: c.name }))}
          value={selectedCityCode}
          onChange={(val) => {
            setSelectedCityCode(val);
            const cName = cities.find((c) => c.code === val)?.name || "";
            setCity(cName);
            setBarangay("");
          }}
          className={cn(errors.city && "border-destructive")}
          placeholder="Select City"
          disabled={!selectedProvCode}
        />
        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
      </div>

      <div className="sm:col-span-2">
        <Label>
          Barangay <span className="text-destructive">*</span>
        </Label>
        <CustomSelect
          options={barangays.map((b) => ({ value: b.code, label: b.name }))}
          value={barangays.find((b) => b.name === barangay)?.code || ""}
          onChange={(val) => {
            const bName = barangays.find((b) => b.code === val)?.name || "";
            setBarangay(bName);
          }}
          className={cn(errors.barangay && "border-destructive")}
          placeholder="Select Barangay"
          disabled={!selectedCityCode}
        />
        {errors.barangay && <p className="text-xs text-destructive mt-1">{errors.barangay}</p>}
      </div>
    </>
  );
}
