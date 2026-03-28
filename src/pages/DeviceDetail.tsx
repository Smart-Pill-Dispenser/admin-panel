import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Monitor,
  AlertTriangle,
  Clock,
  Package,
  User,
  Calendar,
  FileText,
  Building2,
  StopCircle,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import type { ActivityLog, Device } from "@/data/mockData";
import type { ApiDevice } from "@/api/types";
import StatusBadge from "@/components/StatusBadge";
import { adminApi } from "@/api/admin";
import { mapApiDeviceToDevice } from "@/api/deviceMappers";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingCard from "@/components/LoadingCard";

function hasPatientAssignedToDevice(api: ApiDevice | undefined): boolean {
  if (!api) return false;
  if (api.patientId != null && String(api.patientId).trim() !== "") return true;
  const n = (api.patientName ?? api.name ?? "").trim();
  return n.length > 0 && n !== "—" && n !== "-";
}

const LOG_PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

function parseLogDate(ts: string): Date {
  const [datePart] = ts.split(" ");
  return new Date(`${datePart}T00:00:00`);
}

const DeviceDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [showStopDialog, setShowStopDialog] = useState(false);

  const { data: devicesData, isLoading: devicesLoading, isError: devicesError } = useQuery({
    queryKey: ["admin", "devices"],
    queryFn: () => adminApi.getDevices({ limit: 500 }),
  });

  const apiDevice: ApiDevice | undefined = useMemo(() => {
    const list = devicesData?.items ?? [];
    if (!id) return undefined;
    const decoded = decodeURIComponent(id);
    const norm = (s: string) => s.trim().replace(/\s+/g, " ");
    const want = norm(decoded);
    return list.find((d) => {
      if (d.id === id || d.id === decoded) return true;
      const sn = (d.serialNumber ?? "").trim();
      if (!sn) return false;
      return sn === id || sn === decoded || norm(sn) === want;
    });
  }, [devicesData, id]);

  const device: Device | undefined = useMemo(() => {
    return apiDevice ? mapApiDeviceToDevice(apiDevice) : undefined;
  }, [apiDevice]);

  const showDispensingActions = hasPatientAssignedToDevice(apiDevice);

  const stopMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Missing device id");
      return adminApi.stopDispensing(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "devices", id, "logs"] });
      setShowStopDialog(false);
      toast.success(t("deviceDetail.stoppedToast"));
    },
    onError: (e: Error) => toast.error(e?.message ?? t("deviceDetail.stopFailed")),
  });

  const resumeMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Missing device id");
      return adminApi.resumeDispensing(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "devices"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "devices", id, "logs"] });
      toast.success(t("deviceDetail.resumedToast"));
    },
    onError: (e: Error) => toast.error(e?.message ?? t("deviceDetail.resumeFailed")),
  });

  const fromParam = logDateFrom ? `${logDateFrom}T00:00:00Z` : undefined;
  const toParam = logDateTo ? `${logDateTo}T23:59:59Z` : undefined;

  const { data: logsData, isLoading: logsLoading, isError: logsError } = useQuery({
    queryKey: ["admin", "devices", id, "logs", fromParam, toParam],
    queryFn: () =>
      id
        ? adminApi.getDeviceLogs(id, { limit: 200, from: fromParam, to: toParam })
        : Promise.resolve({ items: [], count: 0 }),
    enabled: !!id,
  });

  const logsAll: ActivityLog[] = useMemo(
    () =>
      (logsData?.items ?? []).map((item, i) => ({
        id: `log-${i}-${item.timestamp}`,
        deviceId: item.deviceId,
        timestamp: new Date(item.timestamp).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        }),
        type: String(item.type) as ActivityLog["type"],
        description: item.message,
      })),
    [logsData]
  );

  const logs = useMemo(() => {
    let list = logsAll;
    if (logDateFrom || logDateTo) {
      list = list.filter((l) => {
        const d = parseLogDate(l.timestamp);
        if (logDateFrom && d < new Date(`${logDateFrom}T00:00:00`)) return false;
        if (logDateTo && d > new Date(`${logDateTo}T23:59:59`)) return false;
        return true;
      });
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.timestamp.replace(" ", "T")).getTime() -
        new Date(a.timestamp.replace(" ", "T")).getTime()
    );
  }, [logsAll, logDateFrom, logDateTo]);

  const logTotalPages = Math.max(1, Math.ceil(logs.length / logPageSize));
  const logSafePage = Math.min(Math.max(1, logPage), logTotalPages);
  useEffect(() => {
    if (logPage > logTotalPages && logTotalPages >= 1) setLogPage(logTotalPages);
  }, [logPage, logTotalPages]);
  useEffect(() => {
    setLogPage(1);
  }, [logDateFrom, logDateTo]);

  const paginatedLogs = useMemo(
    () => logs.slice((logSafePage - 1) * logPageSize, logSafePage * logPageSize),
    [logs, logSafePage, logPageSize]
  );
  const logStartItem = logs.length === 0 ? 0 : (logSafePage - 1) * logPageSize + 1;
  const logEndItem = Math.min(logSafePage * logPageSize, logs.length);

  if (devicesLoading || logsLoading) {
    return <LoadingCard message={t("deviceDetail.loading")} />;
  }

  if (!device && (devicesError || logsError)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-4">{t("deviceDetail.loadFailed")}</p>
        <Button variant="outline" onClick={() => navigate("/devices")}>
          {t("deviceDetail.backToDevices")}
        </Button>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">{t("deviceDetail.notFound")}</p>
        <Button variant="outline" onClick={() => navigate("/devices")}>
          {t("deviceDetail.backToDevices")}
        </Button>
      </div>
    );
  }

  const needsRefill =
    device.totalPouches > 0 && device.remainingPouches <= device.refillThreshold;
  const pouchPct =
    device.totalPouches > 0 ? (device.remainingPouches / device.totalPouches) * 100 : 0;

  const logTypeIcons: Record<string, React.ReactNode> = {
    dispense: <Package className="h-4 w-4 text-success" />,
    refill: <Package className="h-4 w-4 text-info" />,
    error: <AlertTriangle className="h-4 w-4 text-destructive" />,
    help: <AlertTriangle className="h-4 w-4 text-info" />,
  };
  const defaultLogIcon = <FileText className="h-4 w-4 text-muted-foreground" />;

  return (
    <div className="space-y-6 animate-slide-in">
      <button
        type="button"
        onClick={() => navigate("/devices")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Monitor className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">
              {device.patientName || "—"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {device.id} • {device.serialNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
          <StatusBadge status={device.status} />
          {showDispensingActions && (
            <>
              {device.status !== "stopped" ? (
                <Button variant="destructive" type="button" onClick={() => setShowStopDialog(true)}>
                  <StopCircle className="mr-2 h-4 w-4" />
                  {t("deviceDetail.stopDispensing")}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => resumeMutation.mutate()}
                  disabled={resumeMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {resumeMutation.isPending ? t("deviceDetail.resuming") : t("deviceDetail.resumeDispensing")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.remainingPouches")}</span>
          </div>
          <p className="text-xl font-bold text-card-foreground">
            {device.remainingPouches} / {device.totalPouches}
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pouchPct}%`,
                backgroundColor:
                  device.totalPouches <= 0
                    ? "hsl(var(--muted-foreground) / 0.35)"
                    : needsRefill
                      ? "hsl(var(--destructive))"
                      : "hsl(var(--success))",
              }}
            />
          </div>
          {needsRefill && (
            <p className="mt-2 text-xs font-medium text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {t("deviceDetail.belowThreshold", { threshold: device.refillThreshold })}
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.lastDispensed")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.lastDispensed || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.caregiver")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.assignedCaregiver || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.pharmacy")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.pharmacyName || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card sm:col-span-2 lg:col-span-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("deviceDetail.validity")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{device.issueDate || "—"}</p>
          <p className="text-xs text-muted-foreground">{t("deviceDetail.to")} {device.validityDate || "—"}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        <div className="border-b bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-card-foreground">{t("deviceDetail.activityLogs")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("deviceDetail.logsHint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <DateInput
                className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
                value={logDateFrom}
                onChange={(e) => setLogDateFrom(e.target.value)}
                aria-label={t("common.fromDate")}
              />
              <span className="text-muted-foreground text-sm shrink-0">–</span>
              <DateInput
                className="min-w-[152px] w-[152px] h-9 pr-9 shrink-0"
                value={logDateTo}
                onChange={(e) => setLogDateTo(e.target.value)}
                aria-label={t("common.toDate")}
              />
            </div>
            {(logDateFrom || logDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setLogDateFrom("");
                  setLogDateTo("");
                  setLogPage(1);
                }}
              >
                {t("common.clearDates")}
              </Button>
            )}
          </div>
        </div>
        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("deviceDetail.noLogsRange")}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                    {logTypeIcons[log.type] ?? defaultLogIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">{log.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {log.timestamp}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {String(log.type).replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("common.itemsPerPage")}</span>
                <Select
                  value={String(logPageSize)}
                  onValueChange={(v) => {
                    setLogPageSize(Number(v));
                    setLogPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("common.showingRange", { start: logStartItem, end: logEndItem, total: logs.length })}
              </p>
              {logTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logSafePage <= 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <span className="text-sm text-muted-foreground px-1">
                    {t("pagination.pageOf", { page: logSafePage, total: logTotalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                    disabled={logSafePage >= logTotalPages}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deviceDetail.stopDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("deviceDetail.stopDialogDesc", {
                id: device.id,
                patient:
                  device.patientName && device.patientName !== "—"
                    ? t("deviceDetail.stopDialogPatient", { name: device.patientName })
                    : "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setShowStopDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
            >
              {stopMutation.isPending ? t("deviceDetail.stopping") : t("deviceDetail.confirmStop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeviceDetail;
