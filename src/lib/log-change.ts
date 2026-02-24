import { db } from "@/db";
import { changeLog } from "@/db/schema";

type LogChangeInput = {
  projectId?: string | null;
  activityId?: string | null;
  userId?: string | null;
  userName?: string | null;
  action: string; // created, updated, completed, uncompleted, deleted, photo_added, status_changed
  entity: string; // project, activity, photo, contact
  entityName?: string | null;
  details?: string | null;
};

export function logChange(input: LogChangeInput) {
  try {
    db.insert(changeLog)
      .values({
        projectId: input.projectId ?? null,
        activityId: input.activityId ?? null,
        userId: input.userId ?? null,
        userName: input.userName ?? null,
        action: input.action,
        entity: input.entity,
        entityName: input.entityName ?? null,
        details: input.details ?? null,
      })
      .run();
  } catch (err) {
    console.error("Failed to log change:", err);
  }
}
