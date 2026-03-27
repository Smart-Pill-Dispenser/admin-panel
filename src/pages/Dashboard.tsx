import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Monitor, HelpCircle, Bell, Package, UserCheck } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/api/admin";
import type { ApiDevice } from "@/api/types";

function apiDeviceHasPatient(d: ApiDevice | Record<string, unknown>): boolean {
  const pid = String((d as ApiDevice).patientId ?? "").trim();
  return pid.length > 0;
}
import { sortRecordsNewestFirst } from "@/lib/listSort";
import { mapApiDeviceToDevice } from "@/api/deviceMappers";
import type { Device } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function getDeviceStatusChartData(deviceStatus: {
  online?: number;
  offline?: number;
  paused?: number;
  stopped?: number;
} | undefined) {
  const online = deviceStatus?.online ?? 0;
  const offline = deviceStatus?.offline ?? 0;
  const paused = deviceStatus?.paused ?? 0;
  const stopped = deviceStatus?.stopped ?? 0;
  // Always return all buckets so the chart renders even at zero
  return [
    { name: "Online", value: online, color: "hsl(160, 84%, 39%)" },
    { name: "Offline", value: offline, color: "hsl(var(--muted-foreground))" },
    { name: "Paused/Stopped", value: paused + stopped, color: "hsl(38, 92%, 50%)" },
  ];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => adminApi.getDashboard(),
  });

  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ["admin", "devices"],
    queryFn: () => adminApi.getDevices({ limit: 100 }),
  });

  const isDashboardLoading = dashboardLoading || devicesLoading;

  const devices: Device[] = useMemo(
    () =>
      sortRecordsNewestFirst([...(devicesData?.items ?? [])] as Record<string, unknown>[], [
        "createdAt",
        "lastActionAt",
      ]).map((d) => mapApiDeviceToDevice(d as ApiDevice)),
    [devicesData]
  );

  const assignedDeviceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const raw of (devicesData?.items ?? []) as ApiDevice[]) {
      if (apiDeviceHasPatient(raw)) ids.add(raw.id);
    }
    return ids;
  }, [devicesData?.items]);

  const assignedDevices = useMemo(
    () => devices.filter((d) => assignedDeviceIds.has(d.id)),
    [devices, assignedDeviceIds]
  );

  const totalDevices = dashboardData?.totalDevices ?? 0;
  const assignedDeviceCount = assignedDevices.length;

  const needsRefillCount = useMemo(
    () => assignedDevices.filter((d) => d.remainingPouches <= d.refillThreshold).length,
    [assignedDevices]
  );
  const pendingAlerts = dashboardData?.alerts?.unacknowledged ?? 0;

  const deviceStatusChartData = useMemo(
    () => getDeviceStatusChartData(dashboardData?.deviceStatus),
    [dashboardData?.deviceStatus]
  );

  const refillDevices = useMemo(
    () => assignedDevices.filter((d) => d.remainingPouches <= d.refillThreshold),
    [assignedDevices]
  );

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System-wide overview of devices, caregivers, and alerts</p>
      </div>

      {/* Stats – all from API / derived from API data only */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Devices"
          value={totalDevices}
          icon={<Monitor className="h-5 w-5 text-info" />}
          trend="devices"
          variant="info"
          loading={isDashboardLoading}
        />
        <StatCard
          title="Assigned devices"
          value={assignedDeviceCount}
          icon={<UserCheck className="h-5 w-5 text-success" />}
          trend="with patient"
          variant="success"
          loading={isDashboardLoading}
        />
        <StatCard
          title="Needs Refill"
          value={needsRefillCount}
          icon={<Package className="h-5 w-5 text-warning" />}
          trend="Below threshold"
          variant="warning"
          loading={isDashboardLoading}
        />
        <StatCard
          title="Pending Alerts"
          value={pendingAlerts}
          icon={<HelpCircle className="h-5 w-5 text-destructive" />}
          trend="Unacknowledged"
          variant="destructive"
          loading={isDashboardLoading}
        />
      </div>

      {/* Device status chart + refill / pending alerts (two columns on lg) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Device Status</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border bg-card shadow-card p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Device Status Distribution</h3>
            {isDashboardLoading ? (
              <div className="p-5">
                <div className="h-4 w-2/3 rounded bg-muted/60 dark:bg-muted/40 animate-pulse mb-4" />
                <div className="h-[250px] w-full rounded bg-muted/30 dark:bg-muted/20 animate-pulse" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={deviceStatusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {deviceStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-col gap-6 min-w-0">
            {/* Refill Alerts – from API devices only */}
            <div className="rounded-xl border bg-card shadow-card flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 border-b p-4 shrink-0">
                <Bell className="h-4 w-4 text-warning" />
                <h2 className="font-semibold text-card-foreground">Refill Alerts</h2>
              </div>
              <div className="divide-y flex-1 overflow-auto max-h-[280px]">
                {refillDevices.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No devices below threshold</div>
                ) : (
                  refillDevices.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/devices/${d.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-card-foreground">{d.patientName}</p>
                        {d.remainingPouches === 0 && (
                          <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                            Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.id} — {d.remainingPouches} pouches left
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Alerts – count from API; no list until backend has alerts list endpoint */}
            <div className="rounded-xl border bg-card shadow-card shrink-0">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-info" />
                  <h2 className="font-semibold text-card-foreground">Pending Alerts</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/help-support")}>
                  View All
                </Button>
              </div>
              <div className="p-4">
                <p className="text-sm text-card-foreground">
                  <span className="font-medium">{pendingAlerts}</span> unacknowledged alert{pendingAlerts !== 1 ? "s" : ""}
                </p>
                {pendingAlerts === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No pending alerts</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Devices Overview – full width */}
      <div className="rounded-xl border bg-card shadow-card w-full">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold text-card-foreground">Devices Overview</h2>
          <Button variant="outline" size="sm" onClick={() => navigate("/devices")}>
            View All
          </Button>
        </div>
        <div className="divide-y">
          {devices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No devices</div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/devices/${device.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                    <Monitor className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{device.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.id} • {device.serialNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-card-foreground">
                      {device.remainingPouches}/{device.totalPouches}
                    </p>
                    <p className="text-xs text-muted-foreground">pouches</p>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
