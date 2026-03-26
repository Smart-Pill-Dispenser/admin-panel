import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Monitor, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import LoadingCard from "@/components/LoadingCard";
import type { Device } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { adminApi } from "@/api/admin";
import { mapApiDeviceToDevice } from "@/api/deviceMappers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiDevice, SerialBulkItem } from "@/api/types";
import { sortRecordsNewestFirst } from "@/lib/listSort";
import * as XLSX from "xlsx";
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

/** Bulk upload accepts Excel workbooks only (file picker + name check). */
const EXCEL_FILENAME_RE = /\.(xlsx|xls)$/i;

/** Excel headers often use NBSP (\\u00A0) or BOM/ZWSP so simple toLowerCase() misses "device id". */
function normalizeExcelHeaderKey(k: string): string {
  return k
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D]/g, "")
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const DEVICE_ID_HEADER_KEYS = new Set([
  "device id",
  "deviceid",
  "device_id",
  "dev id",
  "dev_id",
  "serial",
  "serialnumber",
  "serial_number",
  "serial no",
  "sn",
]);

function normalizeCellValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function rowToNormalizedKeyMap(row: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    m[normalizeExcelHeaderKey(k)] = v;
  }
  return m;
}

function extractSerialFromKeyMap(m: Record<string, unknown>): string {
  return (
    normalizeCellValue(m["device id"]) ||
    normalizeCellValue(m["deviceid"]) ||
    normalizeCellValue(m["device_id"]) ||
    normalizeCellValue(m["dev id"]) ||
    normalizeCellValue(m["dev_id"]) ||
    normalizeCellValue(m["serial"]) ||
    normalizeCellValue(m["serialnumber"]) ||
    normalizeCellValue(m["serial_number"]) ||
    normalizeCellValue(m["serial no"]) ||
    normalizeCellValue(m["sn"])
  );
}

type SerialBulkRowShape = {
  serial: string;
  batchId: string;
  productType: string;
  validFrom: string;
  validTo: string;
};

function parseBulkSheetObjectRows(rows: Record<string, unknown>[]): SerialBulkRowShape[] {
  const parsed: SerialBulkRowShape[] = [];
  for (const row of rows) {
    const m = rowToNormalizedKeyMap(row);
    const serial = extractSerialFromKeyMap(m);
    const batchId =
      normalizeCellValue(m["batchid"]) ||
      normalizeCellValue(m["batch_id"]) ||
      normalizeCellValue(m["batch"]) ||
      normalizeCellValue(m["batch id"]);
    const productType =
      normalizeCellValue(m["producttype"]) ||
      normalizeCellValue(m["product_type"]) ||
      normalizeCellValue(m["product type"]);
    const validFrom =
      normalizeCellValue(m["validfrom"]) ||
      normalizeCellValue(m["valid_from"]) ||
      normalizeCellValue(m["valid from"]);
    const validTo =
      normalizeCellValue(m["validto"]) ||
      normalizeCellValue(m["valid_to"]) ||
      normalizeCellValue(m["valid to"]);

    if (!serial.trim()) continue;

    parsed.push({ serial, batchId, productType, validFrom, validTo });
  }
  return parsed;
}

function findDeviceIdColumnInMatrix(matrix: unknown[][]): { headerRow: number; col: number } | null {
  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    for (let c = 0; c < row.length; c++) {
      const key = normalizeExcelHeaderKey(String(row[c] ?? ""));
      if (DEVICE_ID_HEADER_KEYS.has(key)) return { headerRow: r, col: c };
    }
  }
  return null;
}

/** When object-keys parsing yields no rows (common with .xls or a title row above headers). */
function parseBulkSheetMatrixFallback(sheet: XLSX.WorkSheet): SerialBulkRowShape[] {
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
  if (!matrix.length) return [];

  const found = findDeviceIdColumnInMatrix(matrix);
  if (found) {
    const { headerRow, col } = found;
    const parsed: SerialBulkRowShape[] = [];
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!Array.isArray(row)) continue;
      const serial = normalizeCellValue(row[col]);
      if (!serial.trim()) continue;
      parsed.push({ serial, batchId: "", productType: "", validFrom: "", validTo: "" });
    }
    return parsed;
  }

  const maxCols = Math.max(0, ...matrix.map((r) => (Array.isArray(r) ? r.length : 0)));
  if (maxCols === 1) {
    const parsed: SerialBulkRowShape[] = [];
    let start = 0;
    const firstCell = normalizeCellValue(Array.isArray(matrix[0]) ? matrix[0][0] : "");
    if (DEVICE_ID_HEADER_KEYS.has(normalizeExcelHeaderKey(firstCell))) start = 1;
    for (let r = start; r < matrix.length; r++) {
      const serial = normalizeCellValue(Array.isArray(matrix[r]) ? matrix[r][0] : "");
      if (!serial.trim()) continue;
      parsed.push({ serial, batchId: "", productType: "", validFrom: "", validTo: "" });
    }
    return parsed;
  }

  return [];
}

/** `sheet_to_html` may include scripts; sandboxed iframe blocks them and logs console noise. */
function sanitizeExcelPreviewHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

const Devices: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: devicesData, isLoading } = useQuery({
    queryKey: ["admin", "devices"],
    queryFn: () => adminApi.getDevices({ limit: 500 }),
  });

  const devices: Device[] = useMemo(
    () =>
      sortRecordsNewestFirst([...(devicesData?.items ?? [])] as Record<string, unknown>[], [
        "createdAt",
        "lastActionAt",
      ]).map((d) => mapApiDeviceToDevice(d as ApiDevice)),
    [devicesData]
  );

  const [search, setSearch] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isDevicePatientAssigned = useCallback((d: Device) => {
    if (d.patientId?.trim()) return true;
    const pn = d.patientName?.trim() ?? "";
    return pn.length > 0 && pn !== "—" && pn !== "-" && pn !== "N/A";
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = devices.filter((d) => {
      const matchesSearch =
        !q ||
        d.patientName.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q) ||
        d.serialNumber.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (assignmentFilter !== "all") {
        const assigned = isDevicePatientAssigned(d);
        const matchesAssignment = assignmentFilter === "unassigned" ? !assigned : assigned;
        if (!matchesAssignment) return false;
      }
      return true;
    });
    return [...matches].sort((a, b) => {
      const pa = isDevicePatientAssigned(a);
      const pb = isDevicePatientAssigned(b);
      if (pa && !pb) return -1;
      if (!pa && pb) return 1;
      return 0;
    });
  }, [devices, search, assignmentFilter, isDevicePatientAssigned]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  React.useEffect(() => {
    if (page > totalPages && totalPages >= 1) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const hasActiveFilters = search.trim().length > 0 || assignmentFilter !== "all";
  const clearFilters = useCallback(() => {
    setSearch("");
    setAssignmentFilter("all");
    setPage(1);
  }, []);

  type SerialBulkRow = {
    serial: string;
    batchId: string;
    productType: string;
    validFrom: string;
    validTo: string;
  };

  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [addDeviceSubmitting, setAddDeviceSubmitting] = useState(false);
  const [bulkUploadSubmitting, setBulkUploadSubmitting] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [removeDeviceOpen, setRemoveDeviceOpen] = useState(false);
  const [removeDeviceId, setRemoveDeviceId] = useState<string | null>(null);
  const [removeDeviceSubmitting, setRemoveDeviceSubmitting] = useState(false);

  const [addDeviceId, setAddDeviceId] = useState("");
  /** Rows parsed from the uploaded Excel workbook only (no manual entry). */
  const [bulkImportedRows, setBulkImportedRows] = useState<SerialBulkRow[]>([]);
  /** Last successfully parsed Excel file (for name display + preview). */
  const [bulkSelectedFile, setBulkSelectedFile] = useState<File | null>(null);
  /** In-dialog HTML preview of the first sheet (avoids pop-up blockers and .xlsx download behavior). */
  const [bulkExcelPreviewDoc, setBulkExcelPreviewDoc] = useState<string | null>(null);

  const toggleBulkExcelPreview = useCallback(async () => {
    if (!bulkSelectedFile) return;
    if (bulkExcelPreviewDoc) {
      setBulkExcelPreviewDoc(null);
      return;
    }
    try {
      const data = await bulkSelectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      if (!sheet) {
        toast.error("Could not read the first sheet.");
        return;
      }
      const tableHtml = sanitizeExcelPreviewHtml(XLSX.utils.sheet_to_html(sheet));
      setBulkExcelPreviewDoc(
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
          body{font-family:system-ui,-apple-system,sans-serif;margin:12px;font-size:13px;color:#111}
          table{border-collapse:collapse;width:100%;max-width:100%}
          td,th{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
          th{background:#f4f4f5;font-weight:600}
        </style></head><body>${tableHtml}</body></html>`
      );
    } catch {
      toast.error("Could not preview this file.");
    }
  }, [bulkSelectedFile, bulkExcelPreviewDoc]);

  function toSerialBulkItem(row: SerialBulkRow): SerialBulkItem {
    const serial = row.serial.trim();
    const batchId = row.batchId.trim();
    const productType = row.productType.trim();
    const validFrom = row.validFrom.trim();
    const validTo = row.validTo.trim();

    return {
      serial,
      deviceId: serial,
      ...(batchId ? { batchId } : {}),
      ...(productType ? { productType } : {}),
      ...(validFrom ? { validFrom } : {}),
      ...(validTo ? { validTo } : {}),
    };
  }

  function validateRows(rows: SerialBulkRow[]) {
    let validCount = 0;
    for (const r of rows) {
      const id = r.serial.trim();
      const hasAny =
        !!id ||
        !!r.batchId.trim() ||
        !!r.productType.trim() ||
        !!r.validFrom.trim() ||
        !!r.validTo.trim();
      if (!hasAny) continue;
      if (!id) return { ok: false as const, message: "Each non-empty row must include a Device ID" };
      validCount++;
    }
    if (validCount === 0) return { ok: false as const, message: "No valid rows to upload" };
    return { ok: true as const };
  }

  /** First worksheet of an Excel `.xlsx` / `.xls` file. */
  async function parseBulkFile(file: File) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    let parsed: SerialBulkRow[] = parseBulkSheetObjectRows(rows);
    if (parsed.length === 0) {
      parsed = parseBulkSheetMatrixFallback(sheet);
    }
    return parsed;
  }

  async function handleAddDevice() {
    const deviceId = addDeviceId.trim();
    if (!deviceId) {
      toast.error("Device ID is required");
      return;
    }

    const item: SerialBulkItem = { serial: deviceId, deviceId };

    setAddDeviceSubmitting(true);
    try {
      const res = await adminApi.bulkUploadSerials([item]);
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["admin", "devices"], exact: true });

      setAddDeviceOpen(false);
      setAddDeviceId("");

      toast.success(`Devices added: uploaded ${res.uploaded}, rejected ${res.rejected}.`);
      if ((res.rejected ?? 0) > 0 && res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
        const firstKey = Object.keys(res.fieldErrors)[0];
        toast.error("Some entries were rejected.", {
          description: `${firstKey}: ${res.fieldErrors[firstKey]}`,
        });
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to add device");
    } finally {
      setAddDeviceSubmitting(false);
    }
  }

  async function handleBulkUpload() {
    if (bulkImportedRows.length === 0) {
      toast.error("Choose an Excel file (.xlsx or .xls) to import first.");
      return;
    }
    const validation = validateRows(bulkImportedRows);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setBulkUploadSubmitting(true);
    try {
      const res = await adminApi.bulkUploadSerials(bulkImportedRows.map(toSerialBulkItem));
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      await queryClient.refetchQueries({ queryKey: ["admin", "devices"], exact: true });

      setBulkUploadOpen(false);
      setBulkImportedRows([]);
      setBulkSelectedFile(null);
      setBulkExcelPreviewDoc(null);

      toast.success(`Devices added: uploaded ${res.uploaded}, rejected ${res.rejected}.`);
      if ((res.rejected ?? 0) > 0 && res.fieldErrors && Object.keys(res.fieldErrors).length > 0) {
        const firstKey = Object.keys(res.fieldErrors)[0];
        toast.error("Some entries were rejected.", {
          description: `${firstKey}: ${res.fieldErrors[firstKey]}`,
        });
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "Could not register devices from this file");
    } finally {
      setBulkUploadSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Devices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage registered hardware devices</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setAddDeviceOpen(true)}
            disabled={isLoading || addDeviceSubmitting || bulkUploadSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add one device
          </Button>
          <Button
            type="button"
            onClick={() => setBulkUploadOpen(true)}
            disabled={isLoading || addDeviceSubmitting || bulkUploadSubmitting}
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Search and filters toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search devices..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-9"
              aria-label="Search devices"
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
            <span className="text-sm text-muted-foreground whitespace-nowrap">Assignment:</span>
            <Select
              value={assignmentFilter}
              onValueChange={(v) => {
                setAssignmentFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
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

      {isLoading && <LoadingCard message="Loading devices…" />}

      {!isLoading && devices.length === 0 && (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <Monitor className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No devices yet</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Use the top-right buttons to register new devices (single add or bulk upload).
          </p>
        </div>
      )}

      {!isLoading && devices.length > 0 && hasActiveFilters && filtered.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">No matching devices</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear filters.</p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}

      {!isLoading && devices.length > 0 && !(hasActiveFilters && filtered.length === 0) && (
        <div className="rounded-xl border bg-card shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">S/N</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pouches</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Pharmacy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Caregiver</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginated.map((device) => (
                <tr
                  key={device.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/devices/${device.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-card-foreground">{device.serialNumber || device.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{device.patientName || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${device.totalPouches > 0 ? (device.remainingPouches / device.totalPouches) * 100 : 0}%`,
                            backgroundColor: device.totalPouches <= 0
                              ? "hsl(var(--muted-foreground) / 0.35)"
                              : device.remainingPouches <= device.refillThreshold
                                ? "hsl(var(--destructive))"
                                : "hsl(var(--success))",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{device.remainingPouches}/{device.totalPouches}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{device.pharmacyName || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">{device.assignedCaregiver || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="destructive"
                        size="icon"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRemoveDeviceId(device.id);
                          setRemoveDeviceOpen(true);
                        }}
                        aria-label="Remove device"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      {/* Add Device Dialog */}
      <Dialog
        open={addDeviceOpen}
        onOpenChange={(open) => {
          setAddDeviceOpen(open);
          if (!open) setAddDeviceId("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add one device</DialogTitle>
            <DialogDescription>
              Register a single device by its device ID. Unassigned devices are visible to all pharmacies until
              assigned to a patient.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="addDeviceId">Device ID</Label>
              <Input
                id="addDeviceId"
                value={addDeviceId}
                onChange={(e) => setAddDeviceId(e.target.value)}
                placeholder="e.g. DEV-12345"
                disabled={addDeviceSubmitting}
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDeviceOpen(false)} disabled={addDeviceSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddDevice} disabled={addDeviceSubmitting}>
              {addDeviceSubmitting ? "Adding..." : "Add device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={bulkUploadOpen}
        onOpenChange={(open) => {
          setBulkUploadOpen(open);
          if (!open) {
            setBulkImportedRows([]);
            setBulkSelectedFile(null);
            setBulkExcelPreviewDoc(null);
          }
        }}
      >
        <DialogContent
          className={
            bulkExcelPreviewDoc ? "sm:max-w-3xl max-h-[90vh] flex flex-col gap-0 overflow-hidden" : "sm:max-w-lg"
          }
        >
          <DialogHeader>
            <DialogTitle>Bulk upload</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">.xlsx</span> or <span className="font-medium text-foreground">.xls</span>
              — first sheet, column <span className="font-medium text-foreground">Device ID</span>, one row per device.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulkSheet">File</Label>
              <input
                id="bulkSheet"
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-foreground"
                disabled={bulkUploadSubmitting || bulkImporting}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBulkImporting(true);
                  try {
                    if (!EXCEL_FILENAME_RE.test(file.name)) {
                      toast.error("Please choose an Excel file (.xlsx or .xls).");
                      setBulkImportedRows([]);
                      setBulkSelectedFile(null);
                      setBulkExcelPreviewDoc(null);
                      return;
                    }
                    const parsed = await parseBulkFile(file);
                    if (parsed.length === 0) {
                      toast.error("No valid rows found in this Excel file.");
                      setBulkImportedRows([]);
                      setBulkSelectedFile(null);
                      setBulkExcelPreviewDoc(null);
                      return;
                    }
                    setBulkExcelPreviewDoc(null);
                    setBulkImportedRows(parsed);
                    setBulkSelectedFile(file);
                    toast.success(`Imported ${parsed.length} row${parsed.length !== 1 ? "s" : ""}. Click Upload to register.`);
                  } catch (err) {
                    toast.error((err as Error)?.message ?? "Could not read this Excel file.");
                    setBulkImportedRows([]);
                    setBulkSelectedFile(null);
                    setBulkExcelPreviewDoc(null);
                  } finally {
                    setBulkImporting(false);
                    e.target.value = "";
                  }
                }}
              />
              {bulkSelectedFile ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    title={bulkExcelPreviewDoc ? "Hide preview" : "Show preview"}
                    className="text-left text-sm font-medium text-primary hover:underline focus:outline-none focus:underline"
                    onClick={() => void toggleBulkExcelPreview()}
                  >
                    {bulkSelectedFile.name}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {bulkImportedRows.length} row{bulkImportedRows.length !== 1 ? "s" : ""}
                    {" · "}
                    <span className="text-muted-foreground/90">click name to preview the sheet here</span>
                  </p>
                  {bulkExcelPreviewDoc ? (
                    <div className="mt-2 rounded-md border bg-background overflow-hidden shrink-0 min-h-0 flex flex-col">
                      <iframe
                        title="Excel preview"
                        srcDoc={bulkExcelPreviewDoc}
                        sandbox="allow-same-origin"
                        className="w-full h-[min(55vh,420px)] border-0 bg-white dark:bg-card"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkUploadOpen(false)}
              disabled={bulkUploadSubmitting || bulkImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={bulkUploadSubmitting || bulkImporting || bulkImportedRows.length === 0}
            >
              {bulkUploadSubmitting ? "Uploading..." : bulkImporting ? "Reading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Device Dialog */}
      <Dialog
        open={removeDeviceOpen}
        onOpenChange={(open) => {
          setRemoveDeviceOpen(open);
          if (!open) setRemoveDeviceId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove device</DialogTitle>
            <DialogDescription>
              {removeDeviceId
                ? `Remove ${removeDeviceId} from the system.`
                : "Remove this device from the system."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveDeviceOpen(false);
                setRemoveDeviceId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!removeDeviceId) return;
                setRemoveDeviceSubmitting(true);
                try {
                  await adminApi.removeDevice(removeDeviceId);
                  await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
                  await queryClient.refetchQueries({ queryKey: ["admin", "devices"], exact: true });
                  toast.success("Device removed");
                  setRemoveDeviceOpen(false);
                  setRemoveDeviceId(null);
                } catch (e) {
                  toast.error((e as Error)?.message ?? "Failed to remove device");
                } finally {
                  setRemoveDeviceSubmitting(false);
                }
              }}
              disabled={removeDeviceSubmitting}
            >
              {removeDeviceSubmitting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
