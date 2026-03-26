import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { cn } from "@/lib/utils";
import { adminApi } from "@/api/admin";
import { sortRecordsNewestFirst } from "@/lib/listSort";

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

const SystemConfig: React.FC = () => {
  const { data: devicesData } = useQuery({
    queryKey: ["admin", "devices", "for-system-config"],
    queryFn: () => adminApi.getDevices({ limit: 500 }),
  });

  const devicesNewestFirst = useMemo(
    () =>
      sortRecordsNewestFirst([...(devicesData?.items ?? [])] as Record<string, unknown>[], ["createdAt", "lastActionAt"]),
    [devicesData]
  );

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
    const rows = (deviceLogsData?.items ?? []).map((l) => ({
      id: `${deviceFilter}:${l.timestamp}:${l.type}:${l.message}`,
      timestamp: l.timestamp,
      deviceId: l.deviceId || deviceFilter,
      eventType: l.type,
      reason: l.message,
    }));
    return sortRecordsNewestFirst(rows as Record<string, unknown>[], ["timestamp"]) as typeof rows;
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
              Full technical logs per device.
            </p>
          </div>
        </div>
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
                {devicesNewestFirst.map((d) => (
                  <SelectItem key={String(d.id)} value={String(d.id)}>
                    {String(d.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <DateInput
              className="min-w-[152px] w-[152px] pr-9 shrink-0"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
            />
            <span className="text-muted-foreground shrink-0">–</span>
            <DateInput
              className="min-w-[152px] w-[152px] pr-9 shrink-0"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
            />
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
