"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatCurrency } from "@/lib/calculations";
import { UNIT_LABELS, CATEGORY_LABELS } from "@/types";
import type { TaskTemplate } from "@/types";

export function TaskSearch({
  templates,
  onSelect,
}: {
  templates: TaskTemplate[];
  onSelect?: (template: TaskTemplate) => void;
}) {
  // Flatten all services (depth 1) for search
  const allServices = templates.flatMap(
    (cat) =>
      cat.children?.map((svc) => ({
        ...svc,
        categoryName: cat.name,
        category: cat.category,
      })) ?? []
  );

  return (
    <Command className="border rounded-lg">
      <CommandInput placeholder="Search tasks..." />
      <CommandList className="max-h-[50vh]">
        <CommandEmpty>No tasks found.</CommandEmpty>
        {templates.map((category) => (
          <CommandGroup
            key={category.id}
            heading={
              CATEGORY_LABELS[category.category ?? ""] ?? category.name
            }
          >
            {(category.children ?? []).map((svc) => {
              const unitLabel = svc.unit
                ? UNIT_LABELS[svc.unit] ?? svc.unit
                : "";
              return (
                <CommandItem
                  key={svc.id}
                  value={`${category.name} ${svc.name}`}
                  onSelect={() => onSelect?.(svc)}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <span>{svc.name}</span>
                    {svc.children && svc.children.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({svc.children.length} steps)
                      </span>
                    )}
                  </div>
                  {svc.defaultCost != null && (
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(svc.defaultCost)}
                      {unitLabel ? `/${unitLabel}` : ""}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}
