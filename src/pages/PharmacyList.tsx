import React, { useState, useCallback, useMemo, useEffect } from "react";

// Feature flag — set to true to re-enable the Add Pharmacy User button in the UI.
const SHOW_ADD_PHARMACY_BUTTON = false;
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Search, Filter, X, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import LoadingCard from "@/components/LoadingCard";
import type { Pharmacy } from "@/data/mockData";
import type { CreatePharmacyUserCredentials } from "@/api/types";
import { adminApi } from "@/api/admin";
import { sortRecordsNewestFirst } from "@/lib/listSort";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function mapApiPharmacyToPharmacy(api: { id: string; name: string; email: string; enabled: boolean }): Pharmacy {
  return {
    id: api.id,
    name: api.name,
    email: api.email,
    status: api.enabled ? "active" : "inactive",
  };
}

const PharmacyList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<Pharmacy | null>(null);
  const [editTarget, setEditTarget] = useState<Pharmacy | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const { data: pharmaciesData, isLoading } = useQuery({
    queryKey: ["admin", "pharmacies"],
    queryFn: () => adminApi.getPharmacies({ limit: 500 }),
  });

  useEffect(() => {
    if (editTarget) {
      setEditName(editTarget.name);
      setEditEmail(editTarget.email);
    }
  }, [editTarget]);

  const pharmacies: Pharmacy[] = useMemo(
    () =>
      sortRecordsNewestFirst([...(pharmaciesData?.items ?? [])] as Record<string, unknown>[], ["createdAt"]).map((row) =>
        mapApiPharmacyToPharmacy(row as { id: string; name: string; email: string; enabled: boolean })
      ),
    [pharmaciesData]
  );

  const savePharmacyEdit = useMutation({
    mutationFn: (p: { id: string; name: string; email: string }) =>
      adminApi.updatePharmacy(p.id, { name: p.name.trim(), email: p.email.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pharmacies"] });
      toast.success("Pharmacy updated");
      setEditTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePharmacy = useMutation({
    mutationFn: (id: string) => adminApi.deletePharmacy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "pharmacies"] });
      toast.success("Pharmacy removed");
      setRemoveTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(
    () => {
      let list = pharmacies.filter(
        (p) =>
          p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          p.email.toLowerCase().includes(search.trim().toLowerCase())
      );
      if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
      return list;
    },
    [pharmacies, search, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all";
  const isEmpty = pharmacies.length === 0;
  const hasNoResults = filtered.length === 0 && (search.trim().length > 0 || statusFilter !== "all");

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<"form" | "credentials">("form");
  const [newPharmacyName, setNewPharmacyName] = useState("");
  const [newPharmacyEmail, setNewPharmacyEmail] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<CreatePharmacyUserCredentials | null>(null);
  const [createdPharmacyName, setCreatedPharmacyName] = useState<string>("");

  const createPharmacyUser = useMutation({
    mutationFn: (payload: { name: string; email: string }) => adminApi.createPharmacyUser(payload),
    onSuccess: (data) => {
      setCreatedCredentials(data.credentials);
      setCreatedPharmacyName(data.pharmacy.name);
      setCreateStep("credentials");
      queryClient.invalidateQueries({ queryKey: ["admin", "pharmacies"] });
      toast.success("Pharmacy user created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreateDialog = () => {
    setCreateStep("form");
    setCreatedCredentials(null);
    setCreatedPharmacyName("");
    setNewPharmacyName("");
    setNewPharmacyEmail("");
    setCreateOpen(true);
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    setCreateStep("form");
    setCreatedCredentials(null);
    setCreatedPharmacyName("");
    setNewPharmacyName("");
    setNewPharmacyEmail("");
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search, filter by status, edit details, or remove a pharmacy.
          </p>
        </div>
        {SHOW_ADD_PHARMACY_BUTTON && (
          <div>
            <Button onClick={openCreateDialog}>Add pharmacy user</Button>
          </div>
        )}
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9"
              aria-label="Search pharmacies"
            />
            {search.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setPage(1); }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "active" | "inactive") => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground mt-2">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {isLoading && <LoadingCard message="Loading pharmacies…" />}

      {!isLoading && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No pharmacies yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Pharmacies will appear here once they are registered.
          </p>
        </div>
      )}

      {!isLoading && !isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching pharmacies</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {!isLoading && !isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/50 hover:bg-transparent">
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {paginated.map((pharmacy) => (
                <TableRow
                  key={pharmacy.id}
                  className="hover:bg-muted/30 border-b-0 cursor-pointer transition-colors"
                  onClick={() => navigate(`/user-management/pharmacy/${pharmacy.id}`, { state: { pharmacy } })}
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{pharmacy.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {pharmacy.email}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={pharmacy.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        title="Edit pharmacy"
                        aria-label="Edit pharmacy"
                        onClick={() => setEditTarget(pharmacy)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Remove pharmacy"
                        aria-label="Remove pharmacy"
                        disabled={deletePharmacy.isPending}
                        onClick={() => setRemoveTarget(pharmacy)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <AlertDialog open={removeTarget != null} onOpenChange={(o) => !o && !deletePharmacy.isPending && setRemoveTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove pharmacy?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeTarget ? (
                    <>
                      Permanently delete <span className="font-medium text-foreground">{removeTarget.name}</span> and its
                      login user ({removeTarget.email}). Devices and data linked to this pharmacy may need separate cleanup.
                    </>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletePharmacy.isPending}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deletePharmacy.isPending || !removeTarget}
                  onClick={() => removeTarget && deletePharmacy.mutate(removeTarget.id)}
                >
                  {deletePharmacy.isPending ? "Removing…" : "Remove"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {startItem} to {endItem} of {filtered.length} results
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-1">
                  Page {safePage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={editTarget != null}
        onOpenChange={(open) => {
          if (!open && !savePharmacyEdit.isPending) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit pharmacy</DialogTitle>
            <DialogDescription>Update the pharmacy name and login email shown in the system.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-pharmacy-name">Pharmacy name</Label>
              <Input
                id="edit-pharmacy-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={savePharmacyEdit.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-pharmacy-email">Email (login)</Label>
              <Input
                id="edit-pharmacy-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                disabled={savePharmacyEdit.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={savePharmacyEdit.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                if (!editName.trim() || !editEmail.trim()) {
                  toast.error("Name and email are required");
                  return;
                }
                savePharmacyEdit.mutate({
                  id: editTarget.id,
                  name: editName,
                  email: editEmail,
                });
              }}
              disabled={savePharmacyEdit.isPending || !editName.trim() || !editEmail.trim()}
            >
              {savePharmacyEdit.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => (!open ? closeCreateDialog() : setCreateOpen(open))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{createStep === "form" ? "Create pharmacy user" : "Credentials"}</DialogTitle>
            <DialogDescription>
              {createStep === "form"
                ? "Enter pharmacy name and email. We'll generate a password and provision the Cognito user."
                : "Copy the credentials now. After closing, you can re-open to create a new user."}
            </DialogDescription>
          </DialogHeader>

          {createStep === "form" ? (
            <div className="grid gap-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="pharmacyName">Pharmacy name</Label>
                <Input
                  id="pharmacyName"
                  value={newPharmacyName}
                  onChange={(e) => setNewPharmacyName(e.target.value)}
                  placeholder="e.g. MedCare Pharmacy"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pharmacyEmail">Pharmacy email (login)</Label>
                <Input
                  id="pharmacyEmail"
                  type="email"
                  value={newPharmacyEmail}
                  onChange={(e) => setNewPharmacyEmail(e.target.value)}
                  placeholder="e.g. admin@pharmacy.com"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-sm text-muted-foreground">Pharmacy</div>
                <div className="font-medium text-foreground">{createdPharmacyName}</div>
              </div>
              {createdCredentials && (
                <>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-mono break-all text-sm">{createdCredentials.email}</div>
                  <div className="text-sm text-muted-foreground mt-2">Password</div>
                  <div className="font-mono break-all text-sm text-destructive">{createdCredentials.password}</div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {createStep === "form" ? (
              <>
                <Button variant="outline" onClick={closeCreateDialog} disabled={createPharmacyUser.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!newPharmacyName.trim() || !newPharmacyEmail.trim()) {
                      toast.error("Name and email are required");
                      return;
                    }
                    createPharmacyUser.mutate({ name: newPharmacyName, email: newPharmacyEmail });
                  }}
                  disabled={createPharmacyUser.isPending}
                >
                  {createPharmacyUser.isPending ? "Creating..." : "Create"}
                </Button>
              </>
            ) : (
              <Button onClick={closeCreateDialog}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmacyList;
