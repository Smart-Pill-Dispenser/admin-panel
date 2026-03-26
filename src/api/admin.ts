import { adminFetch, adminGet, adminPost, adminPatch } from "./client";
import type {
  LoginResponse,
  RefreshResponse,
  DashboardResponse,
  DevicesListResponse,
  DeviceLogsResponse,
  CaregiversListResponse,
  PharmaciesListResponse,
  CreatePharmacyUserRequest,
  CreatePharmacyUserResponse,
  AlertsSummaryResponse,
  SerialBulkItem,
  SerialBulkResponse,
  SystemHealthResponse,
} from "./types";

export const adminApi = {
  login(email: string, password: string) {
    return adminPost<LoginResponse>("admin/login", { email, password }, true);
  },

  refresh(email: string, refreshToken: string) {
    return adminPost<RefreshResponse>("admin/refresh", { email, refreshToken }, true);
  },

  forgotPassword(email: string) {
    return adminPost<{ message: string }>("admin/forgot-password", { email }, true);
  },

  /** Reset password using the token from the email link (custom forgot-password flow). */
  confirmForgotPasswordWithToken(token: string, newPassword: string) {
    return adminPost<{ message: string }>("admin/confirm-forgot-password", { token, newPassword }, true);
  },

  getDashboard() {
    return adminGet<DashboardResponse>("admin/dashboard");
  },

  getDevices(params?: { limit?: number; cursor?: string }) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    return adminGet<DevicesListResponse>("admin/devices", q);
  },

  removeDevice(deviceId: string) {
    return adminFetch(`admin/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" }).then(async (res) => {
      const text = await res.text();
      if (!text) return { deleted: true };
      return JSON.parse(text) as { deleted: boolean };
    });
  },

  /** POST /admin/devices/{id}/commands/stop — requires patient assigned (enforced server-side). */
  stopDispensing(deviceId: string) {
    return adminPost<{ item: unknown }>(
      `admin/devices/${encodeURIComponent(deviceId)}/commands/stop`,
      {}
    );
  },

  /** POST /admin/devices/{id}/commands/resume — requires patient assigned (enforced server-side). */
  resumeDispensing(deviceId: string) {
    return adminPost<{ item: unknown }>(
      `admin/devices/${encodeURIComponent(deviceId)}/commands/resume`,
      {}
    );
  },

  getDeviceLogs(
    deviceId: string,
    params?: { limit?: number; cursor?: string; from?: string; to?: string }
  ) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    if (params?.from != null) q.from = params.from;
    if (params?.to != null) q.to = params.to;
    return adminGet<DeviceLogsResponse>(`admin/devices/${encodeURIComponent(deviceId)}/logs`, q);
  },

  /** Global logs across devices (scan-based). */
  getLogs(params?: { limit?: number; cursor?: string; deviceId?: string; type?: string; from?: string; to?: string }) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    if (params?.deviceId != null) q.deviceId = params.deviceId;
    if (params?.type != null) q.type = params.type;
    if (params?.from != null) q.from = params.from;
    if (params?.to != null) q.to = params.to;
    return adminGet<import("./types").GlobalLogsResponse>("admin/logs", q);
  },

  getCaregivers(params?: { limit?: number; cursor?: string }) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    return adminGet<CaregiversListResponse>("admin/caregivers", q);
  },

  updateCaregiverStatus(id: string, isActive: boolean) {
    return adminPatch<{ item: CaregiversListResponse["items"][0] }>(
      `admin/caregivers/${encodeURIComponent(id)}/status`,
      { isActive }
    );
  },

  getPharmacies(params?: { limit?: number; cursor?: string }) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    return adminGet<PharmaciesListResponse>("admin/pharmacies", q);
  },

  createPharmacyUser(body: CreatePharmacyUserRequest) {
    return adminPost<CreatePharmacyUserResponse>("admin/pharmacies", body);
  },

  updatePharmacyStatus(id: string, enabled: boolean) {
    return adminPatch<{ item: PharmaciesListResponse["items"][0] }>(
      `admin/pharmacies/${encodeURIComponent(id)}/status`,
      { enabled }
    );
  },

  getAlertsSummary() {
    return adminGet<AlertsSummaryResponse>("admin/alerts/summary");
  },

  bulkUploadSerials(items: SerialBulkItem[], organizationId?: string) {
    return adminPost<SerialBulkResponse>("admin/serials/bulk", { items, ...(organizationId ? { organizationId } : {}) });
  },

  getSystemHealth() {
    return adminGet<SystemHealthResponse>("admin/system/health");
  },

  getHelpRequests(params?: { limit?: number; cursor?: string; status?: string; deviceId?: string; from?: string; to?: string }) {
    const q: Record<string, string | number | undefined> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.cursor != null) q.cursor = params.cursor;
    if (params?.status != null) q.status = params.status;
    if (params?.deviceId != null) q.deviceId = params.deviceId;
    if (params?.from != null) q.from = params.from;
    if (params?.to != null) q.to = params.to;
    return adminGet<import("./types").HelpRequestsListResponse>("admin/help-requests", q);
  },

  resolveHelpRequest(id: string, resolutionReason?: string) {
    return adminPatch<import("./types").HelpRequestResolveResponse>(
      `admin/help-requests/${encodeURIComponent(id)}/resolve`,
      { resolutionReason }
    );
  },
};
