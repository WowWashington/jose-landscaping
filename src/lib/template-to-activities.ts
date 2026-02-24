import { db } from "@/db";
import { taskTemplates, projectActivities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function copyTemplateToProject(
  templateId: string,
  projectId: string,
  quantity: number = 1,
  includeSubTasks: boolean = true
): Promise<string> {
  const template = db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.id, templateId))
    .get();

  if (!template) throw new Error("Template not found");

  const parentActivityId = createId();

  // Insert the parent activity
  db.insert(projectActivities)
    .values({
      id: parentActivityId,
      projectId,
      templateId: template.id,
      name: template.name,
      description: template.description,
      cost: template.defaultCost,
      hours: template.defaultHours,
      manpower: template.defaultManpower,
      quantity,
      unit: template.unit,
    })
    .run();

  if (includeSubTasks) {
    // Find children of this template
    const children = db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.parentId, templateId))
      .all();

    for (const child of children) {
      const childActivityId = createId();
      db.insert(projectActivities)
        .values({
          id: childActivityId,
          projectId,
          parentActivityId,
          templateId: child.id,
          name: child.name,
          description: child.description,
          cost: child.defaultCost,
          hours: child.defaultHours,
          manpower: child.defaultManpower,
          quantity,
          unit: child.unit,
          sortOrder: child.sortOrder,
        })
        .run();

      // Check for grandchildren (depth 2 sub-tasks)
      const grandchildren = db
        .select()
        .from(taskTemplates)
        .where(eq(taskTemplates.parentId, child.id))
        .all();

      for (const gc of grandchildren) {
        db.insert(projectActivities)
          .values({
            id: createId(),
            projectId,
            parentActivityId: childActivityId,
            templateId: gc.id,
            name: gc.name,
            description: gc.description,
            cost: gc.defaultCost,
            hours: gc.defaultHours,
            manpower: gc.defaultManpower,
            quantity,
            unit: gc.unit,
            sortOrder: gc.sortOrder,
          })
          .run();
      }
    }
  }

  return parentActivityId;
}
