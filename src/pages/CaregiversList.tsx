import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Filter, X, Trash2, Pencil } from "lucide-react";
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
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StatusBadge from "@/components/StatusBadge";
import LoadingCard from "@/components/LoadingCard";
import type { Caregiver } from "@/data/mockData";
import { adminApi } from "@/api/admin";
import type { ApiCaregiver } from "@/api/types";
import { sortRecordsNewestFirst } from "@/lib/listSort";
import { mapApiCaregiverToCaregiver } from "@/lib/caregiverFromApi";
import { formatCaregiverDateTime } from "@/lib/caregiverDisplay";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const CaregiversList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [removeTarget, setRemoveTarget] = useState<Caregiver | null>(null);
  const [editTarget, setEditTarget] = useState<Caregiver | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const { data: caregiversData, isLoading } = useQuery({
    queryKey: ["admin", "caregivers"],
    queryFn: () => adminApi.getCaregivers({ limit: 500 }),
  });

  useEffect(() => {
    if (editTarget) {
      setEditName(editTarget.name);
      setEditEmail(editTarget.email);
      setEditPhone(editTarget.phone === "—" ? "" : editTarget.phone);
    }
  }, [editTarget]);

  const caregivers: Caregiver[] = useMemo(
    () =>
      sortRecordsNewestFirst([...(caregiversData?.items ?? [])] as Record<string, unknown>[], ["createdAt", "updatedAt"]).map(
        (row) => mapApiCaregiverToCaregiver(row as ApiCaregiver)
      ),
    [caregiversData]
  );

  const saveCaregiverEdit = useMutation({
    mutationFn: (p: { id: string; name: string; email: string; phone: string }) =>
      adminApi.updateCaregiver(p.id, {
        name: p.name.trim(),
        email: p.email.trim(),
        ...(p.phone.trim() ? { phone: p.phone.trim() } : { phone: "" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "caregivers"] });
      toast.success("Caregiver updated");
      setEditTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCaregiver = useMutation({
    mutationFn: (id: string) => adminApi.deleteCaregiver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "caregivers"] });
      toast.success("Caregiver removed");
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
      const q = search.trim().toLowerCase();
      let list = caregivers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(search.trim()) ||
          (c.organizationId ?? "").toLowerCase().includes(q)
      );
      if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
      return list;
    },
    [caregivers, search, statusFilter]
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
  const isEmpty = caregivers.length === 0;
  const hasNoResults = filtered.length === 0 && (search.trim().length > 0 || statusFilter !== "all");

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Caregivers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search, filter by status, edit details, or remove a caregiver.
        </p>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-9"
              aria-label="Search caregivers"
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

      {isLoading && <LoadingCard message="Loading caregivers…" />}

      {!isLoading && isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No caregivers yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Caregivers will appear here once they are registered.
          </p>
        </div>
      )}

      {!isLoading && !isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching caregivers</h2>
          <p className="mt-2 text-sm text-muted-foreground">No caregivers match &quot;{search.trim()}&quot;.</p>
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
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Caregiver ID</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Phone</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Linked devices</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Last updated</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {paginated.map((caregiver) => (
                <TableRow
                  key={caregiver.id}
                  className="hover:bg-muted/30 border-b-0 cursor-pointer transition-colors"
                  onClick={() => navigate(`/user-management/caregivers/${caregiver.id}`, { state: { caregiver } })}
                >
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {caregiver.id}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{caregiver.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {caregiver.email}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                    {caregiver.phone || "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                    {caregiver.linkedDevices.length > 0
                      ? `${caregiver.linkedDevices.length} device${caregiver.linkedDevices.length !== 1 ? "s" : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground hidden xl:table-cell">
                    {formatCaregiverDateTime(caregiver.updatedAt)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={caregiver.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary"
                        title="Edit caregiver"
                        aria-label="Edit caregiver"
                        onClick={() => setEditTarget(caregiver)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Remove caregiver"
                        aria-label="Remove caregiver"
                        disabled={deleteCaregiver.isPending}
                        onClick={() => setRemoveTarget(caregiver)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <AlertDialog open={removeTarget != null} onOpenChange={(o) => !o && !deleteCaregiver.isPending && setRemoveTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove caregiver?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeTarget ? (
                    <>
                      Permanently delete <span className="font-medium text-foreground">{removeTarget.name}</span> (
                      {removeTarget.id}). This cannot be undone.
                    </>
                  ) : null}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteCaregiver.isPending}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteCaregiver.isPending || !removeTarget}
                  onClick={() => removeTarget && deleteCaregiver.mutate(removeTarget.id)}
                >
                  {deleteCaregiver.isPending ? "Removing…" : "Remove"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog
            open={editTarget != null}
            onOpenChange={(open) => {
              if (!open && !saveCaregiverEdit.isPending) setEditTarget(null);
            }}
          >
            <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Edit caregiver</DialogTitle>
                <DialogDescription>Update name, email, and phone on file.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-caregiver-name">Name</Label>
                  <Input
                    id="edit-caregiver-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={saveCaregiverEdit.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-caregiver-email">Email</Label>
                  <Input
                    id="edit-caregiver-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={saveCaregiverEdit.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-caregiver-phone">Phone</Label>
                  <Input
                    id="edit-caregiver-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={saveCaregiverEdit.isPending}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saveCaregiverEdit.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!editTarget) return;
                    if (!editName.trim() || !editEmail.trim()) {
                      toast.error("Name and email are required");
                      return;
                    }
                    saveCaregiverEdit.mutate({
                      id: editTarget.id,
                      name: editName,
                      email: editEmail,
                      phone: editPhone,
                    });
                  }}
                  disabled={saveCaregiverEdit.isPending || !editName.trim() || !editEmail.trim()}
                >
                  {saveCaregiverEdit.isPending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
    </div>
  );
};

export default CaregiversList;
