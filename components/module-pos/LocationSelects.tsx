"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Sync selectedProvCode if province prop is already provided
  useEffect(() => {
    if (province && provinces.length > 0 && !selectedProvCode) {
      const match = provinces.find((p) => p.name.toLowerCase() === province.toLowerCase());
      if (match) setSelectedProvCode(match.code);
    }
  }, [province, provinces, selectedProvCode]);

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

  // Sync selectedCityCode if city prop is already provided
  useEffect(() => {
    if (city && cities.length > 0 && !selectedCityCode) {
      const match = cities.find((c) => c.name.toLowerCase() === city.toLowerCase());
      if (match) setSelectedCityCode(match.code);
    }
  }, [city, cities, selectedCityCode]);

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
        <Select
          value={selectedProvCode}
          onValueChange={(val) => {
            setSelectedProvCode(val);
            const pName = provinces.find((p) => p.code === val)?.name || "";
            setProvince(pName);
            setSelectedCityCode("");
            setCity("");
            setBarangay("");
          }}
        >
          <SelectTrigger className={cn("w-full bg-background rounded-xl h-10 border-border text-sm font-semibold", errors.province && "border-destructive")}>
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-[100005]">
            {provinces.map((p) => (
              <SelectItem key={p.code} value={p.code} className="cursor-pointer">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.province && <p className="text-xs text-destructive mt-1">{errors.province}</p>}
      </div>

      <div>
        <Label>
          City / Municipality <span className="text-destructive">*</span>
        </Label>
        <Select
          value={selectedCityCode}
          onValueChange={(val) => {
            setSelectedCityCode(val);
            const cName = cities.find((c) => c.code === val)?.name || "";
            setCity(cName);
            setBarangay("");
          }}
          disabled={!selectedProvCode || cities.length === 0}
        >
          <SelectTrigger className={cn("w-full bg-background rounded-xl h-10 border-border text-sm font-semibold", errors.city && "border-destructive")}>
            <SelectValue placeholder={!selectedProvCode ? "Select Province first" : "Select City"} />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-[100005]">
            {cities.map((c) => (
              <SelectItem key={c.code} value={c.code} className="cursor-pointer">
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
      </div>

      <div className="sm:col-span-2">
        <Label>
          Barangay <span className="text-destructive">*</span>
        </Label>
        <Select
          value={barangays.find((b) => b.name === barangay)?.code || ""}
          onValueChange={(val) => {
            const bName = barangays.find((b) => b.code === val)?.name || "";
            setBarangay(bName);
          }}
          disabled={!selectedCityCode || barangays.length === 0}
        >
          <SelectTrigger className={cn("w-full bg-background rounded-xl h-10 border-border text-sm font-semibold", errors.barangay && "border-destructive")}>
            <SelectValue placeholder={!selectedCityCode ? "Select City first" : "Select Barangay"} />
          </SelectTrigger>
          <SelectContent className="max-h-60 z-[100005]">
            {barangays.map((b) => (
              <SelectItem key={b.code} value={b.code} className="cursor-pointer">
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.barangay && <p className="text-xs text-destructive mt-1">{errors.barangay}</p>}
      </div>
    </>
  );
}
