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
  return {
    id: api.id,
    serialNumber: api.id,
    patientName: api.patientName ?? api.name ?? "—",
    status,
    remainingPouches: api.dosesRemaining ?? 0,
    totalPouches: api.totalDoses ?? 28,
    refillThreshold: 5,
    lastDispensed: api.lastDispense
      ? new Date(api.lastDispense).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
      : "",
    assignedCaregiver: api.lastActionBy ?? "—",
    issueDate: api.issueDate ?? "",
    validityDate: api.validityDate ?? "",
    pharmacyName: "—",
  };
}
