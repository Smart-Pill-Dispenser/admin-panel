import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { mockEngineeringLogs, mockDevices } from "@/data/mockData";
import type { EngineeringLog } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

const sourceLabel: Record<EngineeringLog["source"], string> = {
  device: "Device",
  app: "App",
  backend: "Backend",
  pharmacy: "Pharmacy",
};

const SystemConfig: React.FC = () => {
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      mockEngineeringLogs.filter((log) => {
        const q = search.trim().toLowerCase();
        if (
          q &&
          !log.reason.toLowerCase().includes(q) &&
          !log.deviceId.toLowerCase().includes(q) &&
          !log.eventType.toLowerCase().includes(q) &&
          !log.userFacingDescription?.toLowerCase().includes(q) &&
          !log.serialNumber.toLowerCase().includes(q)
        )
          return false;
        if (deviceFilter !== "all" && log.deviceId !== deviceFilter) return false;
        if (sourceFilter !== "all" && log.source !== sourceFilter) return false;
        if (statusFilter !== "all" && log.status !== statusFilter) return false;
        const logDate = parseEngLogDate(log.timestamp);
        if (dateFrom && logDate < new Date(dateFrom + "T00:00:00")) return false;
        if (dateTo && logDate > new Date(dateTo + "T23:59:59")) return false;
        return true;
      }),
    [search, deviceFilter, sourceFilter, statusFilter, dateFrom, dateTo]
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
    sourceFilter !== "all" ||
    statusFilter !== "all" ||
    dateFrom ||
    dateTo;
  const clearFilters = useCallback(() => {
    setSearch("");
    setDeviceFilter("all");
    setSourceFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);
  const isEmpty = mockEngineeringLogs.length === 0;
  const hasNoResults = filtered.length === 0 && hasActiveFilters;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="h-7 w-7 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Config (Engineering)</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Full technical logs: device response, reason, payloads. For development and debugging only.
            </p>
          </div>
        </div>
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
                {mockDevices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Source:</span>
            <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {(Object.keys(sourceLabel) as EngineeringLog["source"][]).map((s) => (
                  <SelectItem key={s} value={s}>{sourceLabel[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Status:</span>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
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
          <h2 className="mt-4 text-lg font-semibold text-foreground">No engineering logs yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Full technical logs will appear here for development and debugging.
          </p>
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
                        <span className="text-xs text-muted-foreground">({log.serialNumber})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground uppercase tracking-wider">{log.eventType}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon[log.status]}
                        <span className="text-sm capitalize">{log.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sourceLabel[log.source]}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground max-w-[280px] truncate" title={log.reason}>
                      {log.reason}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2 text-sm font-mono">
                          <DetailBlock title="User-facing description" value={log.userFacingDescription} mono={false} />
                          <DetailBlock title="Status code" value={log.statusCode != null ? String(log.statusCode) : "—"} />
                          <DetailBlock title="Device response" value={log.deviceResponse ?? "—"} />
                          <DetailBlock title="Raw message" value={log.rawMessage ?? "—"} />
                          <DetailBlock title="Request payload" value={log.requestPayload ?? "—"} className="sm:col-span-2" />
                          <DetailBlock title="Response payload" value={log.responsePayload ?? "—"} className="sm:col-span-2" />
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
