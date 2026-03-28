import React from "react";
import { useTranslation } from "react-i18next";
import { Users, Search } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { mockCaregivers, type Caregiver } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { sortRecordsNewestFirst } from "@/lib/listSort";

const Caregivers: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const list = mockCaregivers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );
    return sortRecordsNewestFirst(list as unknown as Record<string, unknown>[], []) as unknown as Caregiver[];
  }, [search]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("caregiversMock.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("caregiversMock.subtitle")}</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("caregiversMock.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((caregiver) => (
          <div key={caregiver.id} className="rounded-xl border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                  <Users className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground">{caregiver.name}</p>
                  <p className="text-xs text-muted-foreground">{caregiver.id}</p>
                </div>
              </div>
              <StatusBadge status={caregiver.status} />
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">{caregiver.email}</p>
              <p className="text-muted-foreground">{caregiver.phone}</p>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">{t("caregiversMock.linkedDevices")}</p>
                <div className="flex flex-wrap gap-1">
                  {caregiver.linkedDevices.length > 0 ? (
                    caregiver.linkedDevices.map((d) => (
                      <span key={d} className="inline-block rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{d}</span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("caregiversMock.noDevicesLinked")}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Caregivers;
