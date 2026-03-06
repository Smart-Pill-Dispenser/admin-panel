import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, Mail } from "lucide-react";
import { mockPharmacies } from "@/data/mockData";
import type { Pharmacy } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const PharmacyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const pharmacyFromState = (location.state as { pharmacy?: Pharmacy })?.pharmacy;
  const pharmacyStored = pharmacyFromState ?? mockPharmacies.find((p) => p.id === id);
  const [pharmacy, setPharmacy] = useState<Pharmacy | undefined>(pharmacyStored);

  React.useEffect(() => {
    const statePharmacy = (location.state as { pharmacy?: Pharmacy })?.pharmacy;
    const next = statePharmacy ?? mockPharmacies.find((p) => p.id === id);
    setPharmacy(next);
  }, [id, location.state]);

  if (!pharmacy) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground mb-4">Pharmacy not found</p>
        <Button variant="outline" onClick={() => navigate("/user-management/pharmacy")}>
          Back to Pharmacies
        </Button>
      </div>
    );
  }

  const setStatus = (status: "active" | "inactive") => {
    setPharmacy((prev) => (prev ? { ...prev, status } : prev));
    toast.success(status === "active" ? "Pharmacy enabled" : "Pharmacy disabled");
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <button
        type="button"
        onClick={() => navigate("/user-management/pharmacy")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <Building2 className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{pharmacy.name}</h1>
            <p className="text-sm text-muted-foreground">{pharmacy.email}</p>
          </div>
        </div>
        <StatusBadge status={pharmacy.status} />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Email</span>
          </div>
          <p className="text-sm font-medium text-card-foreground">{pharmacy.email}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Status</span>
          </div>
          <StatusBadge status={pharmacy.status} />
        </div>
      </div>

      {/* Access */}
      <div className="rounded-xl border bg-card shadow-card">
        <div className="border-b p-4">
          <h2 className="font-semibold text-card-foreground">Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable this pharmacy&apos;s access to the system.
          </p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Account status</span>
          <Switch
            checked={pharmacy.status === "active"}
            onCheckedChange={(checked) => setStatus(checked ? "active" : "inactive")}
          />
        </div>
      </div>
    </div>
  );
};

export default PharmacyDetail;
