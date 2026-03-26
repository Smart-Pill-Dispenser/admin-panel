import React, { useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Users, Mail, Phone, Monitor } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminApi } from "@/api/admin";
import LoadingCard from "@/components/LoadingCard";

const CaregiverDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const caregiverFromState = (location.state as any)?.caregiver as
    | { id: string; name: string; email: string; phone?: string; linkedDevices: string[]; status: "active" | "inactive" }
    | undefined;

  const { data: caregiversData, isLoading } = useQuery({
    queryKey: ["admin", "caregivers"],
    queryFn: () => adminApi.getCaregivers({ limit: 500 }),
  });

  const caregiver = useMemo(() => {
    if (!id) return undefined;
    if (caregiverFromState?.id === id) return caregiverFromState;
    const api = (caregiversData?.items ?? []).find((c) => c.id === id);
    if (!api) return undefined;
    return {
      id: api.id,
      name: api.name,
      email: api.email,
      phone: "—",
      linkedDevices: api.linkedDeviceIds ?? [],
      status: api.isActive ? "active" : "inactive" as const,
    };
  }, [id, caregiverFromState, caregiversData]);

  const updateStatus = useMutation({
    mutationFn: (isActive: boolean) => adminApi.updateCaregiverStatus(id!, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "caregivers"] });
      toast.success("Caregiver status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!caregiver) {
    if (isLoading) {
      return <LoadingCard message="Loading caregiver…" />;
    }
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">
          Caregiver not found
        </p>
        <Button variant="outline" onClick={() => navigate("/user-management/caregivers")}>
          Back to Caregivers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      <button
        type="button"
        onClick={() => navigate("/user-management/caregivers")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Users className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{caregiver.name}</h1>
            <p className="text-sm text-muted-foreground">{caregiver.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Caregiver ID: <span className="font-mono">{caregiver.id}</span>
            </p>
          </div>
        </div>
        <StatusBadge status={caregiver.status} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Phone</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.phone || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Linked devices</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {caregiver.linkedDevices.length > 0
              ? caregiver.linkedDevices.join(", ")
              : "None"}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
          <StatusBadge status={caregiver.status} />
        </div>
      </div>

      {/* Access */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-4">
          <h2 className="font-semibold text-card-foreground">Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable this caregiver&apos;s access to the system.
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account status</span>
          <Switch
            checked={caregiver.status === "active"}
            onCheckedChange={(checked) => updateStatus.mutate(checked)}
            disabled={updateStatus.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default CaregiverDetail;
