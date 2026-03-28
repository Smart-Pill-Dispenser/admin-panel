import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Users, Mail, Phone, Monitor, Building2, CalendarClock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/api/admin";
import type { Caregiver } from "@/data/mockData";
import type { ApiCaregiver } from "@/api/types";
import { mapApiCaregiverToCaregiver } from "@/lib/caregiverFromApi";
import { formatCaregiverDateTime } from "@/lib/caregiverDisplay";
import LoadingCard from "@/components/LoadingCard";

const CaregiverDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const caregiverFromState = (location.state as { caregiver?: Caregiver })?.caregiver;

  const { data: caregiversData, isLoading } = useQuery({
    queryKey: ["admin", "caregivers"],
    queryFn: () => adminApi.getCaregivers({ limit: 500 }),
  });

  const caregiver = useMemo(() => {
    if (!id) return undefined;
    if (caregiverFromState?.id === id) return caregiverFromState;
    const api = (caregiversData?.items ?? []).find((c) => c.id === id) as ApiCaregiver | undefined;
    if (!api) return undefined;
    return mapApiCaregiverToCaregiver(api);
  }, [id, caregiverFromState, caregiversData]);

  if (!caregiver) {
    if (isLoading) {
      return <LoadingCard message={t("caregiverDetail.loading")} />;
    }
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">
          {t("caregiverDetail.notFound")}
        </p>
        <Button variant="outline" onClick={() => navigate("/user-management/caregivers")}>
          {t("caregiverDetail.backToList")}
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
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
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
              {t("caregiverDetail.caregiverId")} <span className="font-mono">{caregiver.id}</span>
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
            <span className="text-sm text-muted-foreground">{t("common.email")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("common.phone")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{caregiver.phone || "—"}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.linkedDevices")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">
            {caregiver.linkedDevices.length > 0
              ? caregiver.linkedDevices.join(", ")
              : t("common.none")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">{t("common.status")}</span>
          </div>
          <StatusBadge status={caregiver.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.organization")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground font-mono break-all">
            {caregiver.organizationId?.trim() || "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.recordCreated")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{formatCaregiverDateTime(caregiver.createdAt)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("caregiverDetail.lastUpdated")}</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{formatCaregiverDateTime(caregiver.updatedAt)}</p>
        </div>
      </div>

    </div>
  );
};

export default CaregiverDetail;
