"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Plus, MapPin, Users, Building2, Trash2, Pencil } from "lucide-react";

import { apiClient } from "@/components/module-pos/api";
import { LocationResponseDto } from "@/components/module-pos/api/api";
import { CustomSelect } from "@/components/module-pos/CustomSelect";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


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
  const { data: session, status } = useSession();
  const router = useRouter();

  const isSuperUser = !!session?.isSuperUser;

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
    if (status === "loading") return;
    if (!isSuperUser) {
      router.replace("/access-denied");
    }
  }, [status, isSuperUser, router]);

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
    setAssignLocationId("");
    setAssignDialogOpen(true);
  };

  const saveAssignment = async () => {
    if (!assignUser || !assignLocationId) {
      toast.error("Select a location.");
      return;
    }
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
      toast.success(`Location assigned to ${assignUser.fullName}.`);
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

  if (status === "loading" || !isSuperUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeBranches = locations.filter((l) => l.isActive);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Location Management
        </h1>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Branches</CardTitle>
              <Button size="sm" onClick={openCreateBranch} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              {loadingLocations ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : locations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No branches yet. Add your first branch.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc.locationId}>
                        <TableCell className="font-medium">{loc.locationName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{loc.locationType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!!loc.isActive}
                              onCheckedChange={() => toggleBranchActive(loc)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {loc.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditBranch(loc)}
                            className="gap-1.5"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Staff Assignment ── */}
        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Staff Assignment</CardTitle>
              <p className="text-sm text-muted-foreground">
                Assign each employee the branch(es) they work at. Staff without an
                assignment are limited until a location is set. Super admins see all
                locations and don&apos;t need an assignment.
              </p>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No users found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned Location(s)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.authUserId}>
                        <TableCell>
                          <div className="font-medium">{u.fullName}</div>
                          <div className="text-xs text-muted-foreground">{u.username}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.locations.length === 0 ? (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Unassigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {u.locations.map((l) => (
                                <Badge
                                  key={l.id}
                                  variant="secondary"
                                  className="gap-1 pr-1"
                                >
                                  {l.locationName}
                                  <button
                                    onClick={() => removeAssignment(l.id, u.fullName)}
                                    className="ml-0.5 rounded-sm hover:bg-destructive/20 p-0.5"
                                    title="Remove"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openAssign(u)}
                            className="gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
        title={`Assign Location${assignUser ? ` — ${assignUser.fullName}` : ""}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAssignment} disabled={savingAssign || !assignLocationId}>
              {savingAssign && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              Assign
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
