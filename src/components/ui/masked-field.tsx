"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { maskPhone, maskEmail } from "@/lib/mask-utils";

type MaskedFieldProps = {
  value: string;
  type: "phone" | "email";
  contactName?: string | null;
  projectId?: string | null;
  maskEnabled: boolean; // from appSettings
  /** Render function for the unmasked value (e.g., as a tel: link) */
  children?: (value: string) => React.ReactNode;
};

export function MaskedField({
  value,
  type,
  contactName,
  projectId,
  maskEnabled,
  children,
}: MaskedFieldProps) {
  const { isWorker } = useAuth();
  const [revealed, setRevealed] = useState(false);

  const shouldMask = isWorker && maskEnabled && !revealed;

  async function handleReveal() {
    setRevealed(true);
    // Fire audit log (fire-and-forget)
    fetch("/api/log-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: contactName ?? null,
        field: type, // "phone" or "email"
        projectId: projectId ?? null,
      }),
    }).catch(() => {}); // swallow errors silently
  }

  if (!shouldMask) {
    // Unmasked: render via children render prop or plain text
    return <>{children ? children(value) : value}</>;
  }

  // Masked view
  const maskedValue = type === "phone" ? maskPhone(value) : maskEmail(value);

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{maskedValue}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleReveal();
        }}
        className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
        title="Show contact info"
      >
        <Eye className="h-3 w-3" />
        Show
      </button>
    </span>
  );
}
