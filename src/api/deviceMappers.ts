import type { ApiDevice } from "./types";
import type { Device } from "@/data/mockData";

const STATUS_LOWER: Record<string, Device["status"]> = {
  ONLINE: "online",
  OFFLINE: "offline",
  ERROR: "error",
  STOPPED: "stopped",
  PAUSED: "stopped",
  ACTIVE: "online",
};
const DEFAULT_STATUS: Device["status"] = "offline";

export function mapApiDeviceToDevice(api: ApiDevice): Device {
  const statusKey = (api.status || "").toUpperCase();
  const status = STATUS_LOWER[statusKey] ?? DEFAULT_STATUS;
  const dr = api.dosesRemaining ?? 0;
  const td = api.totalDoses ?? 0;
  // Legacy admin placeholder stored totalDoses=28 with 0 remaining; display as 0/0 (matches backend normalize).
  const legacyPlaceholder = td === 28 && dr === 0;
  return {
    id: api.id,
    serialNumber: api.serialNumber ?? api.id,
    patientName: api.patientName ?? api.name ?? "—",
    status,
    remainingPouches: legacyPlaceholder ? 0 : dr,
    totalPouches: legacyPlaceholder ? 0 : td,
    refillThreshold: 5,
    lastDispensed: api.lastDispense
      ? new Date(api.lastDispense).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : "",
    assignedCaregiver: api.lastActionBy ?? "—",
    issueDate: api.issueDate ?? "",
    validityDate: api.validityDate ?? "",
    pharmacyName: api.pharmacyName ?? "—",
  };
}
