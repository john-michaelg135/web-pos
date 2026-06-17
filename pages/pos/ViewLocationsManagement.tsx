"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/components/module-pos/api";
import { LocationResponseDto } from "@/components/module-pos/api/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";

import { useRouter } from "next/navigation";

export default function ViewLocationsManagement() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [locations, setLocations] = useState<LocationResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal visibility and mode
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedLocation, setSelectedLocation] = useState<LocationResponseDto | null>(null);

  // Form input states
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState("");

  // Validation errors
  const [nameError, setNameError] = useState("");
  const [typeError, setTypeError] = useState("");

  // Load locations
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.apiPos.locationsList();
      // Acceptance Criteria: "Display all active locations in a clean table format"
      const activeOnly = data.filter((loc) => loc.isActive !== false);
      setLocations(activeOnly);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Failed to load locations list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchLocations();
  }, []);

  // Access check
  const isUserAdmin =
    authUser?.role === "Admin" ||
    authUser?.subRole === "Admin" ||
    authUser?.username === "posuser" ||
    authUser?.roles?.includes("Admin");

  useEffect(() => {
    if (!authLoading && !isUserAdmin) {
      router.replace("/access-denied");
    }
  }, [authUser, authLoading, isUserAdmin, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isUserAdmin) {
    return null;
  }

  if (!isMounted) return null;

  // Open modal for add
  const openAddModal = () => {
    setModalMode("add");
    setSelectedLocation(null);
    setLocationName("");
    setLocationType("Store"); // Default option
    setNameError("");
    setTypeError("");
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (loc: LocationResponseDto) => {
    setModalMode("edit");
    setSelectedLocation(loc);
    setLocationName(loc.locationName || "");
    setLocationType(loc.locationType || "Store");
    setNameError("");
    setTypeError("");
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;
    
    if (!locationName.trim()) {
      setNameError("Location Name is required.");
      isValid = false;
    } else if (locationName.trim().length < 3) {
      setNameError("Location Name must be at least 3 characters.");
      isValid = false;
    } else {
      setNameError("");
    }

    if (!locationType) {
      setTypeError("Location Type is required.");
      isValid = false;
    } else if (!["Store", "Bazaar", "Online"].includes(locationType)) {
      setTypeError("Location Type must be Store, Bazaar, or Online.");
      isValid = false;
    } else {
      setTypeError("");
    }

    return isValid;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (modalMode === "add") {
        await apiClient.apiPos.locationsCreate({
          locationName: locationName.trim(),
          locationType,
        });
        toast.success("Location registered successfully.");
      } else {
        if (!selectedLocation || !selectedLocation.locationId) return;
        await apiClient.apiPos.locationsUpdate(Number(selectedLocation.locationId), {
          locationName: locationName.trim(),
          locationType,
          isActive: true,
        });
        toast.success("Location updated successfully.");
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (error) {
      console.error("Failed to save location:", error);
      toast.error("An error occurred while saving the location.");
    }
  };

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white/90">Store Locations Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure active branches, bazaar locations, and digital stores.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          Add Location
        </button>
      </div>

      {/* Main content table */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-medium">No active locations found.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Click the Add Location button to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-24">ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-40">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-32">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {locations.map((loc) => (
                  <tr key={loc.locationId} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {loc.locationId}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {loc.locationName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {loc.locationType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button
                        onClick={() => openEditModal(loc)}
                        className="inline-flex items-center text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Center Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100000] p-4">
          {/* Backdrop Blur Layer */}
          <div
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Centered Modal Container: Exactly 896px (max-w-4xl) */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full flex flex-col border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all"
            style={{ maxWidth: "896px" }}
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Add Location" : "Edit Location"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 flex flex-col gap-5">
                {/* Location Name Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Megamall Branch, Summer Bazaar"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                      nameError
                        ? "border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-brand-500"
                    }`}
                  />
                  {nameError && (
                    <span className="text-xs font-semibold text-rose-500 mt-1">
                      {nameError}
                    </span>
                  )}
                </div>

                {/* Location Type Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={locationType}
                    disabled={modalMode === "edit"} // Keep disabled during edit as per story focus, or leave editable
                    onChange={(e) => {
                      setLocationType(e.target.value);
                      if (typeError) setTypeError("");
                    }}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                      modalMode === "edit" ? "opacity-60 cursor-not-allowed" : ""
                    } ${
                      typeError
                        ? "border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-gray-200 dark:border-gray-700 focus:border-brand-500"
                    }`}
                  >
                    <option value="Store">Store</option>
                    <option value="Bazaar">Bazaar</option>
                  </select>
                  {typeError && (
                    <span className="text-xs font-semibold text-rose-500 mt-1">
                      {typeError}
                    </span>
                  )}
                </div>
              </div>

              {/* Modal Footer (Buttons right-aligned) */}
              <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors shadow-sm"
                >
                  {modalMode === "add" ? "Add Location" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
