"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScheduleDay } from "@/lib/schedule-utils";

type ScheduleCalendarProps = {
  days: ScheduleDay[];
  selectedDate?: string | null;
  onSelectDate?: (date: string | null, projectIds: string[]) => void;
};

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_ABBR_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_ABBR_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleCalendar({
  days,
  selectedDate,
  onSelectDate,
}: ScheduleCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayStr = useMemo(() => toDateStr(today), [today]);

  // offset = number of days from today for the start of the visible window
  const [offset, setOffset] = useState(0);

  // Build lookup from days array
  const dayMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of days) {
      m.set(d.date, d.projectIds);
    }
    return m;
  }, [days]);

  // Generate the 14 visible cells
  const cells = useMemo(() => {
    const result: {
      date: string;
      dayOfWeek: number;
      dayNum: number;
      monthLabel: string;
      projectIds: string[];
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset + i);
      const dateStr = toDateStr(d);
      const dow = d.getDay();
      result.push({
        date: dateStr,
        dayOfWeek: dow,
        dayNum: d.getDate(),
        monthLabel:
          d.getDate() === 1 || i === 0
            ? d.toLocaleDateString("en-US", { month: "short" })
            : "",
        projectIds: dayMap.get(dateStr) ?? [],
        isToday: dateStr === todayStr,
        isWeekend: dow === 0 || dow === 6,
      });
    }
    return result;
  }, [today, offset, dayMap, todayStr]);

  const isAtToday = offset === 0;

  function handleDayClick(date: string, projectIds: string[]) {
    if (!onSelectDate) return;
    if (selectedDate === date) {
      onSelectDate(null, []);
    } else {
      onSelectDate(date, projectIds);
    }
  }

  return (
    <div className="mb-4">
      {/* Nav row */}
      <div className="flex items-center justify-between mb-1.5">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setOffset((o) => o - 7)}
          aria-label="Previous week"
        >
          <ChevronLeft />
        </Button>

        {!isAtToday && (
          <button
            onClick={() => setOffset(0)}
            className="text-xs text-green-700 hover:text-green-800 font-medium"
          >
            Back to today
          </button>
        )}

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setOffset((o) => o + 7)}
          aria-label="Next week"
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-0.5">
        {cells.map((cell, i) => {
          const hasWork = cell.projectIds.length > 0;
          const isSelected = selectedDate === cell.date;

          return (
            <button
              key={cell.date}
              onClick={() => handleDayClick(cell.date, cell.projectIds)}
              className={[
                // Base
                "flex flex-col items-center py-1 px-0.5 rounded-md text-xs transition-colors relative",
                // Hide columns 8-14 on mobile
                i >= 7 ? "hidden sm:flex" : "",
                // Weekend dimming
                cell.isWeekend && !isSelected
                  ? "text-muted-foreground/60"
                  : "",
                // Today ring
                cell.isToday ? "ring-1 ring-green-400" : "",
                // Selected state
                isSelected ? "bg-green-100 text-green-800" : "",
                // Hover
                hasWork && !isSelected ? "hover:bg-accent cursor-pointer" : "",
                !hasWork ? "cursor-default" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Month label */}
              {cell.monthLabel && (
                <span className="text-[9px] leading-none text-muted-foreground font-medium mb-0.5">
                  {cell.monthLabel}
                </span>
              )}

              {/* Day abbreviation */}
              <span className="leading-none sm:hidden">
                {DAY_ABBR_SHORT[cell.dayOfWeek]}
              </span>
              <span className="leading-none hidden sm:inline">
                {DAY_ABBR_LONG[cell.dayOfWeek]}
              </span>

              {/* Day number */}
              <span className="font-medium text-sm leading-tight">
                {cell.dayNum}
              </span>

              {/* Work indicator dot */}
              {hasWork && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
