"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, Calendar } from "lucide-react";
import type { Contact } from "@/types";
import Link from "next/link";
import { MaskedField } from "@/components/ui/masked-field";

export function ContactCard({ contact, maskEnabled }: { contact: Contact; maskEnabled: boolean }) {
  const lastContactLabel = contact.lastContactDate
    ? new Date(contact.lastContactDate + "T00:00:00").toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric", year: "numeric" }
      )
    : null;

  return (
    <Link href={`/contacts/${contact.id}`}>
      <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
        <CardContent className="p-4">
          <p className="font-medium text-base">
            {contact.name || "Unnamed Contact"}
          </p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                <MaskedField
                  value={contact.phone}
                  type="phone"
                  contactName={contact.name}
                  maskEnabled={maskEnabled}
                />
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <MaskedField
                  value={contact.email}
                  type="email"
                  contactName={contact.name}
                  maskEnabled={maskEnabled}
                />
              </div>
            )}
            {(contact.address || contact.city) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>
                  {[contact.address, contact.city, contact.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {lastContactLabel && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>Last contact: {lastContactLabel}</span>
              </div>
            )}
            {contact.notes && (
              <p className="text-xs mt-1 line-clamp-2 italic">
                {contact.notes}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
