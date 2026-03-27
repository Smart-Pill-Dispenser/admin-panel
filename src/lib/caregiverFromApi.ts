import type { ApiCaregiver } from "@/api/types";
import type { Caregiver } from "@/data/mockData";

export function mapApiCaregiverToCaregiver(api: ApiCaregiver): Caregiver {
  const phone =
    typeof api.phone === "string" && api.phone.trim() ? api.phone.trim() : "—";
  const linked =
    Array.isArray(api.linkedDevices) && api.linkedDevices.length > 0
      ? api.linkedDevices
      : api.linkedDeviceIds ?? [];
  const active =
    typeof api.isActive === "boolean"
      ? api.isActive
      : String(api.status ?? "active").toLowerCase() !== "inactive";
  const email =
    typeof api.email === "string" && api.email.trim() ? api.email.trim() : "—";
  const org = api.organizationId?.trim();
  return {
    id: api.id,
    name: typeof api.name === "string" ? api.name : "",
    email,
    phone,
    linkedDevices: linked.map(String),
    status: active ? "active" : "inactive",
    ...(org ? { organizationId: org } : {}),
    ...(api.createdAt ? { createdAt: api.createdAt } : {}),
    ...(api.updatedAt ? { updatedAt: api.updatedAt } : {}),
  };
}
