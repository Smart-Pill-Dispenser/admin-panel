import { adminGet, adminPost, adminPatch } from "./client";
import type {
  LoginResponse,
  DashboardResponse,
  DevicesListResponse,
  DeviceLogsResponse,
  CaregiversListResponse,
  PharmaciesListResponse,
  AlertsSummaryResponse,
  SerialBulkItem,
  SerialBulkResponse,
  SystemHealthResponse,
} from "./types";

export const adminApi = {
  login(email: string, password: string) {
    return adminPost<LoginResponse>("admin/login", { email, password }, true);
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

  updatePharmacyStatus(id: string, enabled: boolean) {
    return adminPatch<{ item: PharmaciesListResponse["items"][0] }>(
      `admin/pharmacies/${encodeURIComponent(id)}/status`,
      { enabled }
    );
  },

  getAlertsSummary() {
    return adminGet<AlertsSummaryResponse>("admin/alerts/summary");
  },

  bulkUploadSerials(items: SerialBulkItem[]) {
    return adminPost<SerialBulkResponse>("admin/serials/bulk", { items });
  },

  getSystemHealth() {
    return adminGet<SystemHealthResponse>("admin/system/health");
  },
};
