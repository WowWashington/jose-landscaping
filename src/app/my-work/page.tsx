"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  CalendarClock,
  Calendar,
  Clock,
  HardHat,
  MapPin,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type MyActivity = {
  id: string;
  name: string;
  hours: number | null;
  isComplete: boolean | null;
};

type TodayProject = {
  project: {
    id: string;
    name: string;
    division: string | null;
    address: string | null;
    dueDate: string | null;
    leadCrewName: string | null;
  };
  myActivities: MyActivity[];
  otherCrew: string[];
  myHours: number;
  pendingCount: number;
  totalCount: number;
};

type UpcomingProject = {
  project: {
    id: string;
    name: string;
    division: string | null;
    startDate: string | null;
  };
  taskCount: number;
};

type MyWorkData = {
  today: TodayProject[];
  upcoming: UpcomingProject[];
  noCrewProfile: boolean;
};

export default function MyWorkPage() {
  const { user } = useAuth();
  const [data, setData] = useState<MyWorkData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/my-work")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleTask(activityId: string, currentComplete: boolean) {
    await fetch(`/api/activities/${activityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isComplete: !currentComplete }),
    });
    load();
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (data?.noCrewProfile) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5" /> My Work
        </h1>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No crew profile linked to your account.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask the owner to link your user to a crew member in the Users page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divIcon = (div: string | null) =>
    div === "general_contracting" ? "\u{1F528}" : "\u{1F33F}";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-4">
        <Briefcase className="h-5 w-5" /> My Work
      </h1>

      {/* Today's Work */}
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Active Projects
      </h2>

      {data?.today.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            No active projects assigned to you right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 mb-6">
          {data?.today.map((item) => (
            <Card key={item.project.id}>
              <CardContent className="p-4">
                <Link
                  href={`/projects/${item.project.id}`}
                  className="block mb-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium text-base">
                        <span className="mr-1.5">
                          {divIcon(item.project.division)}
                        </span>
                        {item.project.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        {item.project.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.project.address}
                          </span>
                        )}
                        {item.project.dueDate && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            Due{" "}
                            {new Date(
                              item.project.dueDate + "T00:00:00"
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                        {item.myHours > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.myHours} hrs
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 ml-2">
                      {item.pendingCount}/{item.totalCount} pending
                    </div>
                  </div>
                </Link>

                {/* My tasks */}
                <div className="space-y-1.5 mt-2 border-t pt-2">
                  {item.myActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={!!act.isComplete}
                        onCheckedChange={() =>
                          toggleTask(act.id, !!act.isComplete)
                        }
                      />
                      <span
                        className={
                          act.isComplete
                            ? "line-through text-muted-foreground"
                            : ""
                        }
                      >
                        {act.name}
                      </span>
                      {act.hours && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {act.hours}h
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Other crew */}
                {item.otherCrew.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <HardHat className="h-3 w-3" />
                    Also: {item.otherCrew.join(", ")}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {data?.upcoming && data.upcoming.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Upcoming
          </h2>
          <div className="space-y-2">
            {data.upcoming.map((item) => (
              <Link
                key={item.project.id}
                href={`/projects/${item.project.id}`}
              >
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        <span className="mr-1">
                          {divIcon(item.project.division)}
                        </span>
                        {item.project.name}
                      </p>
                      {item.project.startDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          Starts{" "}
                          {new Date(
                            item.project.startDate + "T00:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.taskCount} tasks
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
