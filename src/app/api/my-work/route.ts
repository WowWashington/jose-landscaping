import { db } from "@/db";
import { projects, projectActivities, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const crewId = user.id;
    const today = new Date().toISOString().split("T")[0];

    // Build name lookup from users table
    const allPeople = db.select().from(users).all();
    const crewMap = new Map(allPeople.map((p) => [p.id, p.name]));

    // Find all activities assigned to this crew member
    const myActivities = db
      .select()
      .from(projectActivities)
      .where(eq(projectActivities.crewId, crewId))
      .all();

    // Get unique project IDs from my activities
    const activityProjectIds = [...new Set(myActivities.map((a) => a.projectId))];

    // Also find projects where I'm the lead
    const leadProjects = db
      .select()
      .from(projects)
      .where(eq(projects.leadCrewId, crewId))
      .all();

    const leadProjectIds = leadProjects.map((p) => p.id);

    // Combine all relevant project IDs
    const allProjectIds = [...new Set([...activityProjectIds, ...leadProjectIds])];

    if (allProjectIds.length === 0) {
      return NextResponse.json({ today: [], upcoming: [], noCrewProfile: false });
    }

    // Fetch all relevant projects
    const allProjects = allProjectIds.length > 0
      ? db.select().from(projects).where(inArray(projects.id, allProjectIds)).all()
      : [];

    // Fetch ALL activities for these projects (to show other crew)
    const allProjectActivities = allProjectIds.length > 0
      ? db.select().from(projectActivities).where(inArray(projectActivities.projectId, allProjectIds)).all()
      : [];

    // Build response
    const todayProjects: any[] = [];
    const upcomingProjects: any[] = [];

    for (const project of allProjects) {
      const projectActs = allProjectActivities.filter((a) => a.projectId === project.id);
      const myProjectActs = projectActs.filter((a) => a.crewId === crewId);
      const pendingActs = myProjectActs.filter((a) => !a.isComplete);
      const myHours = myProjectActs.reduce((sum, a) => sum + (a.hours ?? 0), 0);

      // Other crew on this project
      const otherCrewIds = [...new Set(
        projectActs
          .map((a) => a.crewId)
          .filter((id): id is string => id !== null && id !== crewId)
      )];
      const otherCrew = otherCrewIds.map((id) => crewMap.get(id)).filter(Boolean) as string[];

      const leadCrewName = project.leadCrewId ? crewMap.get(project.leadCrewId) ?? null : null;

      const projectData = {
        id: project.id,
        name: project.name,
        division: project.division,
        address: project.address,
        dueDate: project.dueDate,
        startDate: project.startDate,
        status: project.status,
        confirmed: project.confirmed,
        leadCrewName,
      };

      if (project.status === "active") {
        todayProjects.push({
          project: projectData,
          myActivities: myProjectActs.map((a) => ({
            id: a.id,
            name: a.name,
            hours: a.hours,
            isComplete: a.isComplete,
          })),
          otherCrew,
          myHours: Math.round(myHours * 10) / 10,
          pendingCount: pendingActs.length,
          totalCount: myProjectActs.length,
        });
      }

      const isFuture = project.startDate && project.startDate > today;
      const isUpcoming =
        (project.confirmed && isFuture) ||
        (project.status === "quoted" && project.confirmed);

      if (isUpcoming && project.status !== "active") {
        upcomingProjects.push({
          project: projectData,
          taskCount: myProjectActs.length,
        });
      }
    }

    todayProjects.sort((a, b) => {
      if (!a.project.dueDate && !b.project.dueDate) return 0;
      if (!a.project.dueDate) return 1;
      if (!b.project.dueDate) return -1;
      return a.project.dueDate.localeCompare(b.project.dueDate);
    });

    upcomingProjects.sort((a, b) => {
      if (!a.project.startDate && !b.project.startDate) return 0;
      if (!a.project.startDate) return 1;
      if (!b.project.startDate) return -1;
      return a.project.startDate.localeCompare(b.project.startDate);
    });

    return NextResponse.json({ today: todayProjects, upcoming: upcomingProjects, noCrewProfile: false });
  } catch (error) {
    console.error("GET /api/my-work error:", error);
    return NextResponse.json({ error: "Failed to fetch my work" }, { status: 500 });
  }
}
