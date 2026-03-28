import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import type { ApiHelpRequest } from "@/api/types";
import StatusBadge from "@/components/StatusBadge";
import LoadingCard from "@/components/LoadingCard";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { sortRecordsNewestFirst } from "@/lib/listSort";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const HelpSupport: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "helpRequests", { pageSize }],
    queryFn: () => adminApi.getHelpRequests({ limit: 500 }),
  });

  const requests: ApiHelpRequest[] = useMemo(
    () => sortRecordsNewestFirst([...(data?.items ?? [])] as Record<string, unknown>[], ["timestamp"]) as ApiHelpRequest[],
    [data]
  );

  const [resolveDialog, setResolveDialog] = useState<{ open: boolean; req: ApiHelpRequest | null }>({ open: false, req: null });
  const [resolveIssue, setResolveIssue] = useState("");
  const [resolveReason, setResolveReason] = useState("");

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolutionReason }: { id: string; resolutionReason?: string }) =>
      adminApi.resolveHelpRequest(id, resolutionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "helpRequests"] });
      toast.success(t("helpSupport.resolvedToast"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (q) {
        const hay = `${r.patientName ?? ""} ${r.deviceId ?? ""} ${r.id ?? ""} ${r.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (dateFrom && r.timestamp < new Date(dateFrom + "T00:00:00").toISOString()) return false;
      if (dateTo && r.timestamp > new Date(dateTo + "T23:59:59").toISOString()) return false;
      return true;
    });
  }, [requests, search, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const hasActiveFilters = search.trim().length > 0 || statusFilter !== "all" || dateFrom || dateTo;
  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  const openResolveDialog = (req: ApiHelpRequest) => {
    setResolveDialog({ open: true, req });
    setResolveIssue(req.description ?? "");
    setResolveReason(req.resolutionReason ?? "");
  };

  const closeResolveDialog = () => {
    setResolveDialog({ open: false, req: null });
    setResolveIssue("");
    setResolveReason("");
  };

  const handleResolveSubmit = () => {
    if (!resolveDialog.req) return;
    resolveMutation.mutate({ id: resolveDialog.req.id, resolutionReason: resolveReason.trim() || undefined });
    closeResolveDialog();
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("helpSupport.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("helpSupport.subtitle")}</p>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              placeholder={t("helpSupport.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pr-9"
              aria-label={t("helpSupport.searchAria")}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t("caregiversList.statusLabel")}</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("helpSupport.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="pending">{t("helpSupport.filterPending")}</SelectItem>
                <SelectItem value="in_progress">{t("helpSupport.filterInProgress")}</SelectItem>
                <SelectItem value="resolved">{t("helpSupport.filterResolved")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <DateInput
              className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label={t("common.fromDate")}
            />
            <span className="text-muted-foreground text-sm shrink-0">–</span>
            <DateInput
              className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label={t("common.toDate")}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("common.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingCard message={t("helpSupport.loading")} />
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">{t("helpSupport.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {t("helpSupport.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("helpSupport.colRequestId")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("helpSupport.colDevice")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t("helpSupport.colPatient")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t("helpSupport.colTimestamp")}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("helpSupport.colStatus")}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("helpSupport.colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((req) => (
                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-card-foreground">{req.id}</td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{req.deviceId}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{req.patientName}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{req.timestamp}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {req.status !== "resolved" && (
                      <Button variant="outline" size="sm" onClick={() => openResolveDialog(req)}>
                        {t("common.resolve")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.itemsPerPage")}</span>
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
              {t("common.showingRange", { start: startItem, end: endItem, total: filtered.length })}
            </p>
          </div>
        </div>
      )}

      <Dialog open={resolveDialog.open} onOpenChange={(open) => !open && closeResolveDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("helpSupport.resolveDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("helpSupport.resolveDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("helpSupport.issueLabel")}</Label>
              <Textarea
                value={resolveIssue}
                onChange={(e) => setResolveIssue(e.target.value)}
                placeholder={t("helpSupport.issuePlaceholder")}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("helpSupport.resolutionLabel")}</Label>
              <Textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder={t("helpSupport.resolutionPlaceholder")}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeResolveDialog}>{t("common.cancel")}</Button>
            <Button onClick={handleResolveSubmit} disabled={resolveMutation.isPending}>{t("common.resolve")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpSupport;
