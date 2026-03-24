import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings2,
  ChevronDown,
  ChevronRight,
  Monitor,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Search,
  X,
  Activity,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { adminApi } from "@/api/admin";
import type { SerialBulkItem } from "@/api/types";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function parseEngLogDate(ts: string): Date {
  const datePart = ts.slice(0, 10);
  return new Date(datePart + "T00:00:00");
}

const statusIcon: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  failure: <AlertTriangle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-warning" />,
  timeout: <XCircle className="h-4 w-4 text-muted-foreground" />,
  unknown: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
};

const defaultSerialRow = (): SerialBulkItem => ({
  serial: "",
  batchId: "",
  productType: "DEVICE",
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
});

const SystemConfig: React.FC = () => {
  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["admin", "system", "health"],
    queryFn: () => adminApi.getSystemHealth(),
  });

  const { data: devicesData } = useQuery({
    queryKey: ["admin", "devices", "for-system-config"],
    queryFn: () => adminApi.getDevices({ limit: 500 }),
  });

  const [serialRows, setSerialRows] = useState<SerialBulkItem[]>([defaultSerialRow()]);
  const [bulkResult, setBulkResult] = useState<{ uploaded: number; rejected: number; fieldErrors?: Record<string, string> } | null>(null);
  const bulkUpload = useMutation({
    mutationFn: (items: SerialBulkItem[]) => adminApi.bulkUploadSerials(items),
    onSuccess: (data) => {
      setBulkResult({ uploaded: data.uploaded, rejected: data.rejected, fieldErrors: data.fieldErrors });
      if (data.uploaded > 0 || data.rejected > 0) {
        toast.success(`Uploaded: ${data.uploaded}, Rejected: ${data.rejected}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSerialRow = () => setSerialRows((r) => [...r, defaultSerialRow()]);
  const removeSerialRow = (i: number) => setSerialRows((r) => r.filter((_, idx) => idx !== i));
  const updateSerialRow = (i: number, patch: Partial<SerialBulkItem>) =>
    setSerialRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const handleBulkUpload = () => {
    const items = serialRows.filter((row) => row.serial.trim() && row.batchId.trim());
    if (items.length === 0) {
      toast.error("Add at least one row with serial and batch ID");
      return;
    }
    bulkUpload.mutate(items);
  };

  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: deviceLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin", "deviceLogs", "engineering", deviceFilter],
    queryFn: () => adminApi.getDeviceLogs(deviceFilter, { limit: 200 }),
    enabled: deviceFilter !== "all",
  });

  const engineeringLogs = useMemo(() => {
    if (deviceFilter === "all") return [];
    return (deviceLogsData?.items ?? []).map((l) => ({
      id: `${deviceFilter}:${l.timestamp}:${l.type}:${l.message}`,
      timestamp: l.timestamp,
      deviceId: l.deviceId || deviceFilter,
      eventType: l.type,
      reason: l.message,
    }));
  }, [deviceLogsData, deviceFilter]);

  const filtered = useMemo(
    () =>
      engineeringLogs.filter((log) => {
        const q = search.trim().toLowerCase();
        if (
          q &&
          !log.reason.toLowerCase().includes(q) &&
          !log.deviceId.toLowerCase().includes(q) &&
          !log.eventType.toLowerCase().includes(q) &&
          !log.timestamp.toLowerCase().includes(q)
        )
          return false;
        if (deviceFilter !== "all" && log.deviceId !== deviceFilter) return false;
        const logDate = parseEngLogDate(log.timestamp);
        if (dateFrom && logDate < new Date(dateFrom + "T00:00:00")) return false;
        if (dateTo && logDate > new Date(dateTo + "T23:59:59")) return false;
        return true;
      }),
    [engineeringLogs, search, deviceFilter, dateFrom, dateTo]
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

  const hasActiveFilters =
    search.trim().length > 0 ||
    deviceFilter !== "all" ||
    dateFrom ||
    dateTo;
  const clearFilters = useCallback(() => {
    setSearch("");
    setDeviceFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);
  const isEmpty = deviceFilter === "all" || engineeringLogs.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Config (Engineering)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              System health, serial upload, and full technical logs.
            </p>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-xl border bg-card shadow-card p-5">
        <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          System Health
        </h2>
        {healthLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="h-3 w-10 rounded bg-muted/60 dark:bg-muted/40" />
              <div className="mt-2 h-4 w-3/5 rounded bg-muted/60 dark:bg-muted/40" />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="h-3 w-16 rounded bg-muted/60 dark:bg-muted/40" />
              <div className="mt-2 h-4 w-4/5 rounded bg-muted/60 dark:bg-muted/40" />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="h-3 w-16 rounded bg-muted/60 dark:bg-muted/40" />
              <div className="mt-2 h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40" />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="h-3 w-20 rounded bg-muted/60 dark:bg-muted/40" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted/60 dark:bg-muted/40" />
            </div>
          </div>
        ) : healthData ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">API</p>
              <p className="mt-1 font-medium text-card-foreground">{healthData.api}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Backend</p>
              <p className="mt-1 font-medium text-card-foreground">{healthData.backend}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Devices</p>
              <p className="mt-1 font-medium text-card-foreground">
                Online: {healthData.devices?.online ?? 0}, Offline: {healthData.devices?.offline ?? 0}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Device sync</p>
              <p className="mt-1 font-medium text-card-foreground">{healthData.deviceSync ?? "—"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load health.</p>
        )}
      </div>

      {/* Serial bulk upload */}
      <div className="rounded-xl border bg-card shadow-card p-5">
        <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          Bulk upload serials
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add serial numbers and batch IDs; optional product type and validity dates.
        </p>
        <div className="space-y-3">
          {serialRows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border p-3 bg-muted/20">
              <div className="grid gap-1">
                <Label className="text-xs">Serial</Label>
                <Input
                  placeholder="SN12345"
                  value={row.serial}
                  onChange={(e) => updateSerialRow(i, { serial: e.target.value })}
                  className="w-32"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Batch ID</Label>
                <Input
                  placeholder="batch-001"
                  value={row.batchId}
                  onChange={(e) => updateSerialRow(i, { batchId: e.target.value })}
                  className="w-36"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Product type</Label>
                <Select
                  value={row.productType ?? "DEVICE"}
                  onValueChange={(v) => updateSerialRow(i, { productType: v })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEVICE">DEVICE</SelectItem>
                    <SelectItem value="POUCH">POUCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Valid from</Label>
                <Input
                  type="date"
                  value={row.validFrom ?? ""}
                  onChange={(e) => updateSerialRow(i, { validFrom: e.target.value })}
                  className="w-36"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Valid to</Label>
                <Input
                  type="date"
                  value={row.validTo ?? ""}
                  onChange={(e) => updateSerialRow(i, { validTo: e.target.value })}
                  className="w-36"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeSerialRow(i)} aria-label="Remove row">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addSerialRow} className="gap-1">
            <Plus className="h-4 w-4" /> Add row
          </Button>
          <Button size="sm" onClick={handleBulkUpload} disabled={bulkUpload.isPending} className="gap-1">
            <Upload className="h-4 w-4" /> Upload
          </Button>
        </div>
        {bulkResult && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-card-foreground">Result: uploaded {bulkResult.uploaded}, rejected {bulkResult.rejected}</p>
            {bulkResult.fieldErrors && Object.keys(bulkResult.fieldErrors).length > 0 && (
              <ul className="mt-2 list-inside list-disc text-destructive">
                {Object.entries(bulkResult.fieldErrors).map(([key, msg]) => (
                  <li key={key}>{key}: {msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Engineering logs section */}
      <div>
        <h2 className="text-lg font-semibold text-card-foreground mb-4">Engineering logs</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This section previously showed dummy data. The backend currently exposes per-device logs (type/message/timestamp).
        </p>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by device, event, reason..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label="Search logs"
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
            <span className="text-sm text-muted-foreground whitespace-nowrap">Device:</span>
            <Select value={deviceFilter} onValueChange={(v) => { setDeviceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                {(devicesData?.items ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input type="date" className="min-w-[152px] w-[152px] pr-9 shrink-0" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} aria-label="From date" />
            <span className="text-muted-foreground shrink-0">–</span>
            <Input type="date" className="min-w-[152px] w-[152px] pr-9 shrink-0" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} aria-label="To date" />
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

      {isEmpty && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Settings2 className="mx-auto h-12 w-12 text-muted-foreground" />
          {deviceFilter !== "all" && logsLoading ? (
            <div className="mt-4 space-y-2 animate-pulse">
              <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 mx-auto" />
              <div className="h-4 w-4/5 rounded bg-muted/60 dark:bg-muted/40 mx-auto" />
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                {deviceFilter === "all" ? "Select a device to view logs" : "No logs yet"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                {deviceFilter === "all"
                  ? "Choose a device above to load logs from the backend."
                  : "Device logs will appear here as events occur."}
              </p>
            </>
          )}
        </div>
      )}

      {!isEmpty && hasNoResults && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching logs</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {!isEmpty && !hasNoResults && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y">
            {paginated.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr
                    className={cn(
                      "hover:bg-muted/30 transition-colors cursor-pointer",
                      isExpanded && "bg-muted/40"
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <td className="px-2 py-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{log.timestamp}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-card-foreground">{log.deviceId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground uppercase tracking-wider">{log.eventType}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon.unknown}
                        <span className="text-sm capitalize">—</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">—</td>
                    <td className="px-4 py-3 text-sm text-card-foreground max-w-[280px] truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 text-sm font-mono">
                          <DetailBlock title="Message" value={log.reason} mono={false} className="sm:col-span-2" />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
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

function DetailBlock({
  title,
  value,
  className,
  mono = true,
}: {
  title: string;
  value: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <pre
        className={cn(
          "rounded border bg-background/80 p-3 overflow-x-auto text-xs break-all whitespace-pre-wrap",
          mono && "font-mono"
        )}
      >
        {value}
      </pre>
    </div>
  );
}

export default SystemConfig;
