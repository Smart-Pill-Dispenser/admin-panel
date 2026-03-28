import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Users, Building2, ChevronRight } from "lucide-react";

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("userManagement.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("userManagement.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/user-management/caregivers")}
          className="rounded-xl border bg-card p-6 shadow-card text-left hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">{t("userManagement.caregiversCardTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("userManagement.caregiversCardDesc")}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/user-management/pharmacy")}
          className="rounded-xl border bg-card p-6 shadow-card text-left hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent">
              <Building2 className="h-6 w-6 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">{t("userManagement.pharmaciesCardTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("userManagement.pharmaciesCardDesc")}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default UserManagement;
