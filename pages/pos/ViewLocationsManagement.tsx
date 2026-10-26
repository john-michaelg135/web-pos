"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Plus, MapPin, Users, Trash2 } from "lucide-react";

import { apiClient } from "@/components/module-pos/api";
import { LocationResponseDto } from "@/components/module-pos/api/api";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Table look shared with the Order Management list view.
const TABLE_CARD = "mt-4 bg-card border border-border rounded-xl shadow-sm overflow-hidden";
const TH = "px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider";
const TR = "hover:bg-muted/10 transition-colors border-b border-border last:border-b-0";
const PILL = "inline-flex items-center text-[10px] font-bold uppercase px-2 py-0.5 rounded-[6px] border whitespace-nowrap";
const ACTION_BUTTON =
  "h-8 px-4 rounded-lg border border-primary/25 bg-transparent text-xs font-bold uppercase text-primary transition-colors hover:bg-primary/10 cursor-pointer";

type PillTone = "brand" | "indigo" | "teal" | "orange";

// Same tints as the order type badges (store / institutional / online / pre-order).
function pillStyle(tone: PillTone = "brand"): CSSProperties {
  if (tone === "brand") {
    return {
      background: "color-mix(in oklch, var(--primary) 10%, transparent)",
      color: "var(--primary)",
      borderColor: "color-mix(in oklch, var(--primary) 20%, transparent)",
    };
  }
  return {
    background: `var(--badge-${tone})`,
    color: `var(--badge-${tone}-foreground)`,
    borderColor: `color-mix(in oklch, var(--badge-${tone}-foreground) 20%, transparent)`,
  };
}

const LOCATION_TONE: Record<string, PillTone> = { store: "brand", bazaar: "indigo", commissary: "teal" };


interface PosUserRow {
  authUserId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  locations: {
    id: number;
    locationId: number;
    locationName: string;
    locationType: string;
    isPrimary: boolean;
  }[];
}

/** Best-effort human message from an unknown thrown value / axios-ish error. */
function errorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { message?: string; error?: { title?: string } };
    return e.error?.title || e.message || fallback;
  }
  return fallback;
}

/**
 * Portal-based modal shell using inline styles for layout so it renders
 * correctly regardless of Tailwind utility availability. Mirrors the working
 * ProductFormDialog pattern.
 */
function ModalShell({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 99999,
          width: "100%",
          maxWidth: 460,
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
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e4e4e7",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#71717a",
              padding: 4,
              display: "flex",
              borderRadius: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #e4e4e7",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            backgroundColor: "#fafafa",
            borderRadius: "0 0 12px 12px",
            flexShrink: 0,
          }}
        >
          {footer}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function ViewLocationsManagement() {
  const { user } = useAuth();
  const router = useRouter();

  const isSuperUser = !!user?.isSuperUser;

  const [locations, setLocations] = useState<LocationResponseDto[]>([]);
  const [users, setUsers] = useState<PosUserRow[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Branch dialog state
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<LocationResponseDto | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchType, setBranchType] = useState("Store");
  const [savingBranch, setSavingBranch] = useState(false);

  // Assignment dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<PosUserRow | null>(null);
  const [assignLocationId, setAssignLocationId] = useState<string>("");
  const [savingAssign, setSavingAssign] = useState(false);

  // ── Access guard: super admins only ──
  useEffect(() => {
    if (!isSuperUser) {
      router.replace("/no-access");
    }
  }, [isSuperUser, router]);

  const loadLocations = useCallback(async () => {
    try {
      setLoadingLocations(true);
      const { data } = await apiClient.apiPos.locationsList();
      setLocations(data);
    } catch (err) {
      console.error("Failed to load locations:", err);
      toast.error("Failed to load branches.");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/pos-users", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      const body = await res.json();
      setUsers(body.users ?? []);
    } catch (err: unknown) {
      console.error("Failed to load POS users:", err);
      toast.error(errorMessage(err, "Failed to load POS users."));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperUser) return;
    const load = async () => {
      await Promise.all([loadLocations(), loadUsers()]);
    };
    void load();
  }, [isSuperUser, loadLocations, loadUsers]);

  // ── Branch handlers ──
  const openCreateBranch = () => {
    setEditingBranch(null);
    setBranchName("");
    setBranchType("Store");
    setBranchDialogOpen(true);
  };

  const openEditBranch = (branch: LocationResponseDto) => {
    setEditingBranch(branch);
    setBranchName(branch.locationName ?? "");
    setBranchType(branch.locationType ?? "Store");
    setBranchDialogOpen(true);
  };

  const saveBranch = async () => {
    const name = branchName.trim();
    if (!name) {
      toast.error("Branch name is required.");
      return;
    }
    try {
      setSavingBranch(true);
      if (editingBranch) {
        await apiClient.apiPos.locationsUpdate(Number(editingBranch.locationId), {
          locationName: name,
          locationType: branchType,
        });
        toast.success("Branch updated.");
      } else {
        await apiClient.apiPos.locationsCreate({
          locationName: name,
          locationType: branchType,
        });
        toast.success("Branch created.");
      }
      setBranchDialogOpen(false);
      await loadLocations();
    } catch (err: unknown) {
      console.error("Failed to save branch:", err);
      toast.error(errorMessage(err, "Failed to save branch."));
    } finally {
      setSavingBranch(false);
    }
  };

  const toggleBranchActive = async (branch: LocationResponseDto) => {
    try {
      await apiClient.apiPos.locationsUpdate(Number(branch.locationId), {
        isActive: !branch.isActive,
      });
      toast.success(branch.isActive ? "Branch deactivated." : "Branch activated.");
      await loadLocations();
    } catch (err: unknown) {
      console.error("Failed to toggle branch:", err);
      toast.error("Failed to update branch status.");
    }
  };

  // ── Assignment handlers ──
  const openAssign = (user: PosUserRow) => {
    setAssignUser(user);
    // Preselect the current branch so reassigning starts from where they are.
    const current = user.locations[0];
    setAssignLocationId(current ? String(current.locationId) : "");
    setAssignDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignUser || !assignLocationId) {
      toast.error("Select a location.");
      return;
    }
    const wasReassign = assignUser.locations.length > 0;
    try {
      setSavingAssign(true);
      const res = await fetch("/api/pos-users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authUserId: assignUser.authUserId,
          locationId: Number(assignLocationId),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      toast.success(
        wasReassign
          ? `${assignUser.fullName} reassigned.`
          : `Location assigned to ${assignUser.fullName}.`
      );
      setAssignDialogOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      console.error("Failed to assign location:", err);
      toast.error(errorMessage(err, "Failed to assign location."));
    } finally {
      setSavingAssign(false);
    }
  };

  const removeAssignment = async (assignmentId: number, userName: string) => {
    try {
      const res = await fetch(`/api/pos-users/assign?id=${assignmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      toast.success(`Removed a location from ${userName}.`);
      await loadUsers();
    } catch (err: unknown) {
      console.error("Failed to remove assignment:", err);
      toast.error(errorMessage(err, "Failed to remove assignment."));
    }
  };

  if (!isSuperUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeBranches = locations.filter((l) => l.isActive);

  return (
    <div className="w-full py-8 px-6 md:px-8 space-y-6">
      <div>
        <h1 className="text-headline-md font-bold tracking-tight text-foreground">Location Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage branches and assign staff to the locations they work at.
        </p>
      </div>

      <Tabs defaultValue="branches" className="w-full">
        <TabsList>
          <TabsTrigger value="branches" className="gap-2">
            <MapPin className="w-4 h-4" /> Branches
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="w-4 h-4" /> Staff Assignment
          </TabsTrigger>
        </TabsList>

        {/* ── Branches ── */}
        <TabsContent value="branches" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Branches</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The stores, bazaars and commissary your business sells from. Switch a branch off to
                  hide it from sales and assignments without losing its history.
                </p>
              </div>
              <Button size="sm" onClick={openCreateBranch} className="gap-1.5 shrink-0">
                <Plus className="w-4 h-4" /> Add Branch
              </Button>
            </CardHeader>
          </Card>

          <div className={TABLE_CARD}>
              {loadingLocations ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : locations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No branches yet. Add your first branch.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className={`${TH} w-[32%]`}>Name</th>
                        <th className={`${TH} w-[22%]`}>Type</th>
                        <th className={`${TH} w-[24%]`}>Status</th>
                        <th className={TH}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => (
                        <tr key={loc.locationId} className={TR}>
                          <td className="px-5 py-4 text-sm font-medium text-muted-foreground align-middle">{loc.locationName}</td>
                          <td className="px-5 py-4 align-middle">
                            <span className={PILL} style={pillStyle(LOCATION_TONE[(loc.locationType ?? "").toLowerCase()])}>
                              {loc.locationType}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={!!loc.isActive}
                                onCheckedChange={() => toggleBranchActive(loc)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {loc.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <button type="button" onClick={() => openEditBranch(loc)} className={ACTION_BUTTON}>
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
        </TabsContent>

        {/* ── Staff Assignment ── */}
        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader className="space-y-1.5">
              <CardTitle className="text-base">Staff Assignment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign each employee the branch they work at. Each employee works
                at one branch, so reassigning replaces their current location.
                Staff without an assignment are limited until a location is set.
                Super admins see all locations and don&apos;t need an assignment.
              </p>
            </CardHeader>
          </Card>

          <div className={TABLE_CARD}>
              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No users found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className={`${TH} w-[28%]`}>Employee</th>
                        <th className={`${TH} w-[18%]`}>Role</th>
                        <th className={`${TH} w-[32%]`}>Assigned Location</th>
                        <th className={TH}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.authUserId} className={TR}>
                          <td className="px-5 py-4 text-sm font-medium text-muted-foreground align-middle">
                            <span>{u.fullName}</span>
                            <div className="text-[11px] text-muted-foreground mt-1 font-medium">{u.username}</div>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            <span className={PILL} style={pillStyle()}>{u.role}</span>
                          </td>
                          <td className="px-5 py-4 align-middle">
                            {u.locations.length === 0 ? (
                              <span className={PILL} style={pillStyle("orange")}>Unassigned</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {u.locations.map((l) => (
                                  <span key={l.id} className="inline-flex items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-[6px] border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                      {l.locationName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeAssignment(l.id, u.fullName)}
                                      className="inline-flex size-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                      title="Remove assignment"
                                      aria-label={`Remove ${l.locationName}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap align-middle">
                            <button type="button" onClick={() => openAssign(u)} className={ACTION_BUTTON}>
                              {u.locations.length > 0 ? "Reassign" : "Assign"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Branch dialog ── */}
      <ModalShell
        open={branchDialogOpen}
        onClose={() => setBranchDialogOpen(false)}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
        footer={
          <>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBranch} disabled={savingBranch}>
              {savingBranch && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {editingBranch ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="branch-name">Branch Name</Label>
          <Input
            id="branch-name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g. SM North Branch"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <CustomSelect
            value={branchType}
            onChange={setBranchType}
            options={[
              { value: "Store", label: "Store" },
              { value: "Bazaar", label: "Bazaar" },
            ]}
          />
        </div>
      </ModalShell>

      {/* ── Assignment dialog ── */}
      <ModalShell
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        title={`${assignUser && assignUser.locations.length > 0 ? "Reassign" : "Assign"} Location${assignUser ? ` — ${assignUser.fullName}` : ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAssignment} disabled={savingAssign || !assignLocationId}>
              {savingAssign && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              {assignUser && assignUser.locations.length > 0 ? "Reassign" : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label>Location</Label>
          <CustomSelect
            value={assignLocationId}
            onChange={setAssignLocationId}
            placeholder="Select a location..."
            options={activeBranches.map((loc) => ({
              value: String(loc.locationId),
              label: `${loc.locationName} (${loc.locationType})`,
            }))}
          />
          {assignUser && assignUser.locations.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Currently at{" "}
              <span className="font-medium text-foreground">
                {assignUser.locations[0].locationName}
              </span>
              . Choosing a different branch replaces it.
            </p>
          )}
          {activeBranches.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No active branches. Add one under the Branches tab first.
            </p>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
