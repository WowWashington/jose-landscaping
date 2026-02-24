"use client";

import { useState, useEffect } from "react";

type AppSettings = {
  maskContactsForWorkers: boolean;
};

const defaultSettings: AppSettings = {
  maskContactsForWorkers: true,
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
