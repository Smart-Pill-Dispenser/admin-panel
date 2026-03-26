/** Backend error envelope (all admin endpoints). */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
}

/** Login response from POST /admin/login */
export interface LoginResponse {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

/** Refresh response from POST /admin/refresh */
export interface RefreshResponse {
  accessToken: string;
  idToken?: string;
  expiresIn?: number;
}

/** GET /admin/dashboard */
export interface DashboardResponse {
  totalDevices: number;
  totalCaregivers: number;
  alerts: { total: number; unacknowledged: number };
  deviceStatus: { online: number; offline: number; paused?: number; stopped: number };
}

/** Device item from GET /admin/devices */
export interface ApiDevice {
  id: string;
  serialNumber?: string;
  name?: string;
  patientId?: string;
  patientName?: string;
  status: string;
  state?: string;
  dosesRemaining?: number;
  totalDoses?: number;
  dosesConsumed?: number;
  dosesMissed?: number;
  nextDose?: string;
  lastDispense?: string;
  issueDate?: string;
  validityDate?: string;
  lastActionBy?: string;
  lastActionAt?: string;
  lastActionReason?: string;
  pharmacyName?: string;
  /** When present (e.g. bulk registration), used to sort newest-first in lists. */
  createdAt?: string;
}

export interface DevicesListResponse {
  items: ApiDevice[];
  count: number;
}

/** Single log from GET /admin/devices/{id}/logs */
export interface ApiDeviceLog {
  deviceId: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface DeviceLogsResponse {
  items: ApiDeviceLog[];
  count: number;
  cursor?: string;
}

/** Caregiver from GET /admin/caregivers */
export interface ApiCaregiver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  isActive: boolean;
  linkedDeviceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CaregiversListResponse {
  items: ApiCaregiver[];
  count: number;
  cursor?: string;
}

/** Pharmacy from GET /admin/pharmacies */
export interface ApiPharmacy {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  createdAt?: string;
}

export interface PharmaciesListResponse {
  items: ApiPharmacy[];
  count: number;
  cursor?: string;
}

/** POST /admin/pharmacies */
export interface CreatePharmacyUserRequest {
  name: string;
  email: string;
}

export interface CreatePharmacyUserCredentials {
  email: string;
  password: string;
}

export interface CreatePharmacyUserResponse {
  pharmacy: ApiPharmacy;
  credentials: CreatePharmacyUserCredentials;
}

/** GET /admin/alerts/summary */
export interface AlertsSummaryResponse {
  totalAlerts: number;
  unacknowledgedAlerts: number;
}

/** POST /admin/serials/bulk request item — device id via `deviceId` and/or legacy `serial`; `batchId` optional (server defaults). */
export interface SerialBulkItem {
  serial?: string;
  deviceId?: string;
  batchId?: string;
  productType?: string;
  validFrom?: string;
  validTo?: string;
}

/** POST /admin/serials/bulk response */
export interface SerialBulkResponse {
  uploaded: number;
  rejected: number;
  fieldErrors?: Record<string, string>;
}

/** GET /admin/system/health */
export interface SystemHealthResponse {
  api: string;
  devices: { online: number; offline: number };
  backend: string;
  deviceSync?: string;
  notifications?: string;
}

/** Help request from GET /admin/help-requests */
export interface ApiHelpRequest {
  id: string;
  deviceId: string;
  timestamp: string;
  status: "pending" | "in_progress" | "resolved";
  description: string;
  patientName: string;
  resolutionReason?: string;
  resolvedAt?: string;
}

export interface HelpRequestsListResponse {
  items: ApiHelpRequest[];
  count: number;
  cursor?: string;
}

/** PATCH /admin/help-requests/{id}/resolve response */
export interface HelpRequestResolveResponse {
  item: ApiHelpRequest;
}

/** GET /admin/logs (global) */
export interface GlobalLogsResponse {
  items: ApiDeviceLog[];
  count: number;
  cursor?: string;
}
