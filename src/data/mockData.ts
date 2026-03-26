export interface Device {
  id: string;
  serialNumber: string;
  patientName: string;
  /** Present when a pharmacy assigned this device to a patient (Dynamo `patientId`). */
  patientId?: string | null;
  status: "online" | "offline" | "error" | "stopped";
  remainingPouches: number;
  totalPouches: number;
  refillThreshold: number;
  lastDispensed: string;
  assignedCaregiver: string;
  issueDate: string;
  validityDate: string;
  pharmacyName: string;
}

export interface HelpRequest {
  id: string;
  deviceId: string;
  timestamp: string;
  status: "pending" | "resolved" | "in_progress";
  description: string;
  patientName: string;
  resolutionReason?: string;
}

export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone: string;
  linkedDevices: string[];
  status: "active" | "inactive";
}

/** Single pharmacy (admin scope: one pharmacy only; multiple pharmacies later). */
export interface Pharmacy {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
}

/** Device log event types per device logs flow: dispense, missed_dose, packet_jam, sos, help, qr_validation; plus refill, error, stop, start. */
export type ActivityLogType =
  | "dispense"
  | "missed_dose"
  | "packet_jam"
  | "sos"
  | "help"
  | "qr_validation"
  | "refill"
  | "error"
  | "stop"
  | "start";

export interface ActivityLog {
  id: string;
  deviceId: string;
  timestamp: string;
  type: ActivityLogType;
  description: string;
}

export interface RefillNotification {
  id: string;
  deviceId: string;
  patientName: string;
  remainingPouches: number;
  threshold: number;
  timestamp: string;
  urgent: boolean;
}

/** Full technical log for engineering / development. Source of truth for what happened and device response. */
export interface EngineeringLog {
  id: string;
  deviceId: string;
  serialNumber: string;
  timestamp: string;
  eventType: string;
  status: "success" | "failure" | "pending" | "timeout" | "unknown";
  source: "device" | "app" | "backend" | "pharmacy";
  reason: string;
  deviceResponse: string | null;
  requestPayload: string | null;
  responsePayload: string | null;
  statusCode: number | null;
  rawMessage: string | null;
  userFacingDescription: string;
}

export const mockDevices: Device[] = [
  { id: "DEV-001", serialNumber: "SN-2024-00101", patientName: "John Carter", status: "online", remainingPouches: 8, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 08:00", assignedCaregiver: "Sarah Wilson", issueDate: "2025-12-01", validityDate: "2026-06-01", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-002", serialNumber: "SN-2024-00102", patientName: "Emma Davis", status: "online", remainingPouches: 22, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 07:30", assignedCaregiver: "Mike Johnson", issueDate: "2026-01-15", validityDate: "2026-07-15", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-003", serialNumber: "SN-2024-00103", patientName: "Robert Smith", status: "error", remainingPouches: 3, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-15 20:00", assignedCaregiver: "Sarah Wilson", issueDate: "2025-11-20", validityDate: "2026-05-20", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-004", serialNumber: "SN-2024-00104", patientName: "Lisa Brown", status: "stopped", remainingPouches: 15, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-14 09:00", assignedCaregiver: "Tom Anderson", issueDate: "2026-01-05", validityDate: "2026-07-05", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-005", serialNumber: "SN-2024-00105", patientName: "Mary Johnson", status: "offline", remainingPouches: 0, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-10 12:00", assignedCaregiver: "Mike Johnson", issueDate: "2025-10-01", validityDate: "2026-04-01", pharmacyName: "MedCare Pharmacy" },
  { id: "DEV-006", serialNumber: "SN-2024-00106", patientName: "James Wilson", status: "online", remainingPouches: 18, totalPouches: 30, refillThreshold: 5, lastDispensed: "2026-02-16 06:45", assignedCaregiver: "Tom Anderson", issueDate: "2026-02-01", validityDate: "2026-08-01", pharmacyName: "MedCare Pharmacy" },
];

export const mockHelpRequests: HelpRequest[] = [
  { id: "HR-001", deviceId: "DEV-003", timestamp: "2026-02-16 09:15", status: "pending", description: "Device showing error LED. Unable to dispense medication.", patientName: "Robert Smith" },
  { id: "HR-002", deviceId: "DEV-005", timestamp: "2026-02-15 14:30", status: "in_progress", description: "Device went offline. Patient unable to get medication.", patientName: "Mary Johnson" },
  { id: "HR-003", deviceId: "DEV-001", timestamp: "2026-02-14 11:00", status: "resolved", description: "Pouch jammed in dispenser.", patientName: "John Carter" },
];

export const mockCaregivers: Caregiver[] = [
  { id: "CG-001", name: "Sarah Wilson", email: "sarah.wilson@care.com", phone: "+1 555-0101", linkedDevices: ["DEV-001", "DEV-003"], status: "active" },
  { id: "CG-002", name: "Mike Johnson", email: "mike.johnson@care.com", phone: "+1 555-0102", linkedDevices: ["DEV-002", "DEV-005"], status: "active" },
  { id: "CG-003", name: "Tom Anderson", email: "tom.anderson@care.com", phone: "+1 555-0103", linkedDevices: ["DEV-004", "DEV-006"], status: "active" },
  { id: "CG-004", name: "Jane Roberts", email: "jane.roberts@care.com", phone: "+1 555-0104", linkedDevices: [], status: "inactive" },
];

/** Pharmacies list for admin (single pharmacy for now; fetch from backend in production). */
export const mockPharmacies: Pharmacy[] = [
  { id: "PH-001", name: "MedCare Pharmacy", email: "admin@medcare.example.com", status: "active" },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: "LOG-001", deviceId: "DEV-001", timestamp: "2026-02-16 08:00", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-002", deviceId: "DEV-002", timestamp: "2026-02-16 07:30", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-003", deviceId: "DEV-003", timestamp: "2026-02-16 09:15", type: "error", description: "Dispensing mechanism jammed — Error code E-201" },
  { id: "LOG-004", deviceId: "DEV-004", timestamp: "2026-02-14 09:00", type: "stop", description: "Dispensing stopped by authorized pharmacy admin" },
  { id: "LOG-005", deviceId: "DEV-001", timestamp: "2026-02-15 20:00", type: "dispense", description: "Evening medication dispensed successfully" },
  { id: "LOG-006", deviceId: "DEV-003", timestamp: "2026-02-15 20:00", type: "help", description: "Help request submitted by caregiver" },
  { id: "LOG-007", deviceId: "DEV-005", timestamp: "2026-02-10 12:00", type: "dispense", description: "Last medication dispensed before device went offline" },
  { id: "LOG-008", deviceId: "DEV-006", timestamp: "2026-02-16 06:45", type: "dispense", description: "Morning medication dispensed successfully" },
  { id: "LOG-009", deviceId: "DEV-002", timestamp: "2026-02-15 14:00", type: "refill", description: "Device refilled — 30 pouches loaded" },
  { id: "LOG-010", deviceId: "DEV-001", timestamp: "2026-02-13 10:00", type: "start", description: "Device restarted after maintenance" },
  // Flow event types: missed_dose, packet_jam, sos, qr_validation
  { id: "LOG-011", deviceId: "DEV-001", timestamp: "2026-02-14 08:00", type: "missed_dose", description: "Scheduled dose was not taken within the allowed window" },
  { id: "LOG-012", deviceId: "DEV-001", timestamp: "2026-02-12 14:20", type: "packet_jam", description: "Pouch path blocked; jam cleared by caregiver" },
  { id: "LOG-013", deviceId: "DEV-001", timestamp: "2026-02-11 09:05", type: "sos", description: "SOS alert triggered by patient; caregiver notified" },
  { id: "LOG-014", deviceId: "DEV-001", timestamp: "2026-02-15 11:00", type: "qr_validation", description: "Refill pack QR code scanned and validated successfully" },
  { id: "LOG-015", deviceId: "DEV-001", timestamp: "2026-02-14 16:30", type: "help", description: "Help request submitted by caregiver" },
];

/**
 * Request device logs (panel → backend). Returns log records for the given device,
 * optionally filtered by date range, sorted chronologically newest first (view-only list).
 */
export function getDeviceLogs(
  deviceId: string,
  options?: { dateFrom?: string; dateTo?: string }
): ActivityLog[] {
  const from = options?.dateFrom ? new Date(options.dateFrom + "T00:00:00").getTime() : null;
  const to = options?.dateTo ? new Date(options.dateTo + "T23:59:59").getTime() : null;
  let list = mockActivityLogs.filter((log) => {
    if (log.deviceId !== deviceId) return false;
    const ts = new Date(log.timestamp.replace(" ", "T")).getTime();
    if (from != null && ts < from) return false;
    if (to != null && ts > to) return false;
    return true;
  });
  list = [...list].sort((a, b) => new Date(b.timestamp.replace(" ", "T")).getTime() - new Date(a.timestamp.replace(" ", "T")).getTime());
  return list;
}

/** Total hardware devices (inventory); assigned = mockDevices.length */
export const mockTotalHardwareDevices = 10;

/** Engineering / technical logs with full device response and reason. For System Config (development). */
export const mockEngineeringLogs: EngineeringLog[] = [
  { id: "ENG-001", deviceId: "DEV-001", serialNumber: "SN-2024-00101", timestamp: "2026-02-16 08:00:23.451", eventType: "dispense", status: "success", source: "device", reason: "Schedule trigger at 08:00; motor commanded; pouch dropped successfully.", deviceResponse: "{\"cmd\":\"dispense\",\"slot\":1,\"ack\":true,\"duration_ms\":420,\"pouch_id\":\"P-0823\"}", requestPayload: "{\"device_id\":\"DEV-001\",\"schedule_id\":\"s1\",\"slot\":1}", responsePayload: "{\"ack\":true,\"pouch_id\":\"P-0823\"}", statusCode: 200, rawMessage: "DISPENSE_OK P-0823 420ms", userFacingDescription: "Morning medication dispensed successfully" },
  { id: "ENG-002", deviceId: "DEV-002", serialNumber: "SN-2024-00102", timestamp: "2026-02-16 07:30:11.892", eventType: "dispense", status: "success", source: "device", reason: "Dose time 07:30; dispense command sent; device acknowledged.", deviceResponse: "{\"cmd\":\"dispense\",\"ack\":true,\"pouch_id\":\"P-0730\"}", requestPayload: "{\"device_id\":\"DEV-002\",\"slot\":1}", responsePayload: "{\"ack\":true}", statusCode: 200, rawMessage: "OK", userFacingDescription: "Morning medication dispensed successfully" },
  { id: "ENG-003", deviceId: "DEV-003", serialNumber: "SN-2024-00103", timestamp: "2026-02-16 09:15:02.110", eventType: "error", status: "failure", source: "device", reason: "Stepper motor stall detected during dispense; pouch path blocked or jammed. Hardware reported E-201.", deviceResponse: "{\"cmd\":\"dispense\",\"ack\":false,\"error\":\"E-201\",\"detail\":\"MOTOR_STALL\"}", requestPayload: "{\"device_id\":\"DEV-003\",\"slot\":1}", responsePayload: "{\"error\":\"E-201\"}", statusCode: 500, rawMessage: "ERR E-201 MOTOR_STALL", userFacingDescription: "Dispensing mechanism jammed — Error code E-201" },
  { id: "ENG-004", deviceId: "DEV-004", serialNumber: "SN-2024-00104", timestamp: "2026-02-14 09:00:00.000", eventType: "stop", status: "success", source: "pharmacy", reason: "Pharmacy admin issued stop via panel. Reason: Patient travel; dispensing paused until return.", deviceResponse: null, requestPayload: "{\"device_id\":\"DEV-004\",\"action\":\"stop\",\"reason\":\"Patient travel\"}", responsePayload: "{\"stopped\":true}", statusCode: 200, rawMessage: null, userFacingDescription: "Dispensing stopped by authorized pharmacy admin" },
  { id: "ENG-005", deviceId: "DEV-001", serialNumber: "SN-2024-00101", timestamp: "2026-02-15 20:00:05.223", eventType: "dispense", status: "success", source: "device", reason: "Evening dose window; dispense completed without errors.", deviceResponse: "{\"ack\":true,\"pouch_id\":\"P-2000\"}", requestPayload: "{\"device_id\":\"DEV-001\",\"slot\":1}", responsePayload: "{\"ack\":true}", statusCode: 200, rawMessage: "DISPENSE_OK", userFacingDescription: "Evening medication dispensed successfully" },
  { id: "ENG-006", deviceId: "DEV-003", serialNumber: "SN-2024-00103", timestamp: "2026-02-15 20:00:33.001", eventType: "help", status: "pending", source: "app", reason: "Caregiver app submitted help request; backend created ticket; device not polled yet.", deviceResponse: null, requestPayload: "{\"device_id\":\"DEV-003\",\"user_id\":\"CG-001\",\"description\":\"Error LED on\"}", responsePayload: "{\"ticket_id\":\"T-006\"}", statusCode: 202, rawMessage: null, userFacingDescription: "Help request submitted by caregiver" },
  { id: "ENG-007", deviceId: "DEV-005", serialNumber: "SN-2024-00105", timestamp: "2026-02-10 12:00:44.778", eventType: "dispense", status: "success", source: "device", reason: "Last successful dispense before device went offline (Wi‑Fi lost at 12:05).", deviceResponse: "{\"ack\":true,\"pouch_id\":\"P-1200\"}", requestPayload: null, responsePayload: null, statusCode: 200, rawMessage: "OK", userFacingDescription: "Last medication dispensed before device went offline" },
  { id: "ENG-008", deviceId: "DEV-005", serialNumber: "SN-2024-00105", timestamp: "2026-02-10 12:05:12.000", eventType: "heartbeat", status: "timeout", source: "backend", reason: "Device missed 3 consecutive heartbeats; marked offline. Last seen 12:00.", deviceResponse: null, requestPayload: null, responsePayload: null, statusCode: null, rawMessage: "HEARTBEAT_TIMEOUT DEV-005", userFacingDescription: "Device went offline" },
  { id: "ENG-009", deviceId: "DEV-002", serialNumber: "SN-2024-00102", timestamp: "2026-02-15 14:00:00.000", eventType: "refill", status: "success", source: "pharmacy", reason: "Refill logged in panel; 30 pouches loaded. Device inventory updated.", deviceResponse: "{\"pouches_loaded\":30,\"total\":30}", requestPayload: "{\"device_id\":\"DEV-002\",\"pouches\":30}", responsePayload: "{\"updated\":true}", statusCode: 200, rawMessage: null, userFacingDescription: "Device refilled — 30 pouches loaded" },
  { id: "ENG-010", deviceId: "DEV-001", serialNumber: "SN-2024-00101", timestamp: "2026-02-13 10:00:00.000", eventType: "start", status: "success", source: "backend", reason: "Device restarted after maintenance; backend sent start command; device acknowledged.", deviceResponse: "{\"state\":\"idle\",\"fw\":\"1.2.3\"}", requestPayload: "{\"device_id\":\"DEV-001\",\"action\":\"start\"}", responsePayload: "{\"state\":\"idle\"}", statusCode: 200, rawMessage: "START_ACK", userFacingDescription: "Device restarted after maintenance" },
];

export const mockRefillNotifications: RefillNotification[] = [
  { id: "RN-001", deviceId: "DEV-005", patientName: "Mary Johnson", remainingPouches: 0, threshold: 5, timestamp: "2026-02-16 08:00", urgent: true },
  { id: "RN-002", deviceId: "DEV-003", patientName: "Robert Smith", remainingPouches: 3, threshold: 5, timestamp: "2026-02-16 07:00", urgent: true },
  { id: "RN-003", deviceId: "DEV-001", patientName: "John Carter", remainingPouches: 8, threshold: 5, timestamp: "2026-02-16 06:00", urgent: false },
];
