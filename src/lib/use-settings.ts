"use client";

import { useState, useEffect } from "react";

export type AppSettings = {
  maskContactsForWorkers: boolean;
  businessName: string;
  businessSubtitle: string;
  businessPhone: string;
  businessAddress: string;
  enableYardCare: boolean;
  enableContracting: boolean;
  showBillingRates: boolean;
};

export const defaultSettings: AppSettings = {
  maskContactsForWorkers: true,
  businessName: "Landscaping and Services",
  businessSubtitle: "Landscaping & Outdoor Services",
  businessPhone: "",
  businessAddress: "",
  enableYardCare: true,
  enableContracting: true,
  showBillingRates: false,
};

export function useSettings(): { settings: AppSettings; loading: boolean; refresh: () => void } {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          maskContactsForWorkers: data.maskContactsForWorkers !== "false",
          businessName: data.businessName || defaultSettings.businessName,
          businessSubtitle: data.businessSubtitle || defaultSettings.businessSubtitle,
          businessPhone: data.businessPhone ?? "",
          businessAddress: data.businessAddress ?? "",
          enableYardCare: data.enableYardCare !== "false",
          enableContracting: data.enableContracting !== "false",
          showBillingRates: data.showBillingRates === "true",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { settings, loading, refresh: load };
}
