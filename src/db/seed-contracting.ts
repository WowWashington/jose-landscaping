import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { taskTemplates } from "./schema";
import { createId } from "@paralleldrive/cuid2";
import path from "path";

type SubTask = {
  name: string;
  defaultCost?: number;
  defaultHours?: number;
  defaultManpower?: number;
  unit?: string;
};

type Service = {
  name: string;
  defaultCost?: number;
  defaultHours?: number;
  defaultManpower?: number;
  unit?: string;
  children?: SubTask[];
};

type Category = {
  name: string;
  category: string;
  children: Service[];
};

const seedData: Category[] = [
  {
    name: "Interior Work",
    category: "interior",
    children: [
      {
        name: "Drywall Installation",
        defaultCost: 3.5,
        defaultHours: 0.15,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Frame walls / studs", defaultCost: 1.0, defaultHours: 0.05, defaultManpower: 2, unit: "sqft" },
          { name: "Hang drywall sheets", defaultCost: 1.0, defaultHours: 0.04, defaultManpower: 2, unit: "sqft" },
          { name: "Tape and mud joints", defaultCost: 0.8, defaultHours: 0.03, defaultManpower: 1, unit: "sqft" },
          { name: "Sand smooth", defaultCost: 0.4, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
          { name: "Prime and prep for paint", defaultCost: 0.3, defaultHours: 0.01, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Interior Painting",
        defaultCost: 2.5,
        defaultHours: 0.08,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Prep and mask surfaces", defaultCost: 0.5, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
          { name: "Apply primer coat", defaultCost: 0.8, defaultHours: 0.02, defaultManpower: 2, unit: "sqft" },
          { name: "Apply finish coats (2x)", defaultCost: 1.0, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Touch up and clean", defaultCost: 0.2, defaultHours: 0.01, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Cabinet Installation",
        defaultCost: 250,
        defaultHours: 2,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Remove old cabinets", defaultCost: 50, defaultHours: 0.5, defaultManpower: 2, unit: "each" },
          { name: "Prep and level wall", defaultCost: 30, defaultHours: 0.25, defaultManpower: 1, unit: "each" },
          { name: "Install upper cabinets", defaultCost: 80, defaultHours: 0.5, defaultManpower: 2, unit: "each" },
          { name: "Install base cabinets", defaultCost: 60, defaultHours: 0.5, defaultManpower: 2, unit: "each" },
          { name: "Install hardware and adjust", defaultCost: 30, defaultHours: 0.25, defaultManpower: 1, unit: "each" },
        ],
      },
      {
        name: "Flooring Installation",
        defaultCost: 6.0,
        defaultHours: 0.12,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Remove old flooring", defaultCost: 1.0, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Prep and level subfloor", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 1, unit: "sqft" },
          { name: "Install underlayment", defaultCost: 0.5, defaultHours: 0.01, defaultManpower: 1, unit: "sqft" },
          { name: "Lay flooring material", defaultCost: 2.5, defaultHours: 0.04, defaultManpower: 2, unit: "sqft" },
          { name: "Install baseboards and trim", defaultCost: 0.5, defaultHours: 0.01, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
      {
        name: "Ceiling Work",
        defaultCost: 4.0,
        defaultHours: 0.1,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Remove old ceiling material", defaultCost: 1.0, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Install ceiling panels or drywall", defaultCost: 2.0, defaultHours: 0.05, defaultManpower: 2, unit: "sqft" },
          { name: "Finish and paint", defaultCost: 1.0, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
        ],
      },
      { name: "Baseboard and Trim Installation", defaultCost: 4.0, defaultHours: 0.08, defaultManpower: 1, unit: "linear_ft" },
      { name: "Shelving Installation", defaultCost: 75, defaultHours: 1, defaultManpower: 1, unit: "each" },
      { name: "Interior Door Installation", defaultCost: 200, defaultHours: 2, defaultManpower: 1, unit: "each" },
    ],
  },
  {
    name: "Exterior Work",
    category: "exterior",
    children: [
      {
        name: "Exterior Painting",
        defaultCost: 3.5,
        defaultHours: 0.1,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Power wash and prep", defaultCost: 0.5, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
          { name: "Scrape and sand", defaultCost: 0.5, defaultHours: 0.02, defaultManpower: 2, unit: "sqft" },
          { name: "Caulk gaps and cracks", defaultCost: 0.3, defaultHours: 0.01, defaultManpower: 1, unit: "sqft" },
          { name: "Apply primer", defaultCost: 0.8, defaultHours: 0.02, defaultManpower: 2, unit: "sqft" },
          { name: "Apply finish coats", defaultCost: 1.2, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Clean up", defaultCost: 0.2, defaultHours: 0.01, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Siding Repair / Replacement",
        defaultCost: 8.0,
        defaultHours: 0.15,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Remove damaged siding", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Inspect and repair sheathing", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 1, unit: "sqft" },
          { name: "Install new siding", defaultCost: 4.0, defaultHours: 0.07, defaultManpower: 2, unit: "sqft" },
          { name: "Caulk and seal", defaultCost: 1.0, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Gutter Installation / Repair",
        defaultCost: 10,
        defaultHours: 0.15,
        defaultManpower: 2,
        unit: "linear_ft",
        children: [
          { name: "Remove old gutters", defaultCost: 2, defaultHours: 0.03, defaultManpower: 2, unit: "linear_ft" },
          { name: "Install new gutters", defaultCost: 6, defaultHours: 0.08, defaultManpower: 2, unit: "linear_ft" },
          { name: "Install downspouts", defaultCost: 2, defaultHours: 0.04, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
      { name: "Exterior Door Installation", defaultCost: 500, defaultHours: 4, defaultManpower: 2, unit: "each" },
      { name: "Window Replacement", defaultCost: 400, defaultHours: 3, defaultManpower: 2, unit: "each" },
      { name: "Deck Repair", defaultCost: 15, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
    ],
  },
  {
    name: "Structural",
    category: "structural",
    children: [
      {
        name: "Wall Framing",
        defaultCost: 8.0,
        defaultHours: 0.15,
        defaultManpower: 2,
        unit: "linear_ft",
        children: [
          { name: "Layout and mark", defaultCost: 1.0, defaultHours: 0.02, defaultManpower: 1, unit: "linear_ft" },
          { name: "Cut and assemble studs", defaultCost: 3.0, defaultHours: 0.05, defaultManpower: 2, unit: "linear_ft" },
          { name: "Raise and secure wall", defaultCost: 2.5, defaultHours: 0.05, defaultManpower: 2, unit: "linear_ft" },
          { name: "Add headers and blocking", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
      {
        name: "Wall Demolition",
        defaultCost: 5.0,
        defaultHours: 0.1,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Identify load-bearing status", defaultCost: 0, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
          { name: "Remove drywall", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Remove framing", defaultCost: 2.0, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
          { name: "Clean up and haul debris", defaultCost: 1.5, defaultHours: 0.02, defaultManpower: 2, unit: "sqft" },
        ],
      },
      {
        name: "Subfloor Repair",
        defaultCost: 5.0,
        defaultHours: 0.12,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Remove damaged material", defaultCost: 1.5, defaultHours: 0.04, defaultManpower: 2, unit: "sqft" },
          { name: "Reinforce joists if needed", defaultCost: 2.0, defaultHours: 0.05, defaultManpower: 2, unit: "sqft" },
          { name: "Install new subfloor", defaultCost: 1.5, defaultHours: 0.03, defaultManpower: 2, unit: "sqft" },
        ],
      },
      { name: "Beam / Header Installation", defaultCost: 800, defaultHours: 6, defaultManpower: 3, unit: "each" },
      { name: "Post / Column Installation", defaultCost: 300, defaultHours: 3, defaultManpower: 2, unit: "each" },
    ],
  },
  {
    name: "Finishing & Detail",
    category: "finishing",
    children: [
      {
        name: "Tile Installation",
        defaultCost: 12,
        defaultHours: 0.2,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Prep surface and waterproof", defaultCost: 2.0, defaultHours: 0.04, defaultManpower: 1, unit: "sqft" },
          { name: "Layout and cut tiles", defaultCost: 2.0, defaultHours: 0.04, defaultManpower: 1, unit: "sqft" },
          { name: "Set tiles with mortar", defaultCost: 5.0, defaultHours: 0.08, defaultManpower: 2, unit: "sqft" },
          { name: "Grout and seal", defaultCost: 3.0, defaultHours: 0.04, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Countertop Installation",
        defaultCost: 50,
        defaultHours: 0.3,
        defaultManpower: 2,
        unit: "linear_ft",
        children: [
          { name: "Remove old countertop", defaultCost: 10, defaultHours: 0.08, defaultManpower: 2, unit: "linear_ft" },
          { name: "Template and cut", defaultCost: 15, defaultHours: 0.1, defaultManpower: 1, unit: "linear_ft" },
          { name: "Install and secure", defaultCost: 20, defaultHours: 0.1, defaultManpower: 2, unit: "linear_ft" },
          { name: "Seal and finish", defaultCost: 5, defaultHours: 0.02, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
      { name: "Crown Molding Installation", defaultCost: 6, defaultHours: 0.1, defaultManpower: 1, unit: "linear_ft" },
      { name: "Wainscoting / Wall Panels", defaultCost: 8, defaultHours: 0.12, defaultManpower: 1, unit: "sqft" },
      { name: "Closet Build-Out", defaultCost: 500, defaultHours: 6, defaultManpower: 1, unit: "each" },
      { name: "Custom Shelving / Built-In", defaultCost: 150, defaultHours: 3, defaultManpower: 1, unit: "linear_ft" },
    ],
  },
  {
    name: "Specialized",
    category: "gc_specialized",
    children: [
      {
        name: "Bathroom Renovation",
        defaultCost: 8000,
        defaultHours: 40,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Demo existing bathroom", defaultCost: 1000, defaultHours: 8, defaultManpower: 2, unit: "each" },
          { name: "Rough plumbing", defaultCost: 1500, defaultHours: 6, defaultManpower: 1, unit: "each" },
          { name: "Install tub / shower", defaultCost: 1500, defaultHours: 6, defaultManpower: 2, unit: "each" },
          { name: "Tile walls and floor", defaultCost: 2000, defaultHours: 10, defaultManpower: 2, unit: "each" },
          { name: "Install vanity and fixtures", defaultCost: 1000, defaultHours: 4, defaultManpower: 1, unit: "each" },
          { name: "Final connections and cleanup", defaultCost: 1000, defaultHours: 6, defaultManpower: 2, unit: "each" },
        ],
      },
      {
        name: "Kitchen Renovation",
        defaultCost: 15000,
        defaultHours: 60,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Demo existing kitchen", defaultCost: 1500, defaultHours: 10, defaultManpower: 2, unit: "each" },
          { name: "Rough plumbing and electrical", defaultCost: 2500, defaultHours: 10, defaultManpower: 2, unit: "each" },
          { name: "Install cabinets", defaultCost: 4000, defaultHours: 12, defaultManpower: 2, unit: "each" },
          { name: "Install countertops", defaultCost: 3000, defaultHours: 8, defaultManpower: 2, unit: "each" },
          { name: "Install backsplash", defaultCost: 1500, defaultHours: 6, defaultManpower: 1, unit: "each" },
          { name: "Install appliances and fixtures", defaultCost: 1500, defaultHours: 6, defaultManpower: 2, unit: "each" },
          { name: "Final touches and cleanup", defaultCost: 1000, defaultHours: 8, defaultManpower: 2, unit: "each" },
        ],
      },
      { name: "Debris Removal / Dumpster", defaultCost: 400, defaultHours: 2, defaultManpower: 2, unit: "load" },
      { name: "General Cleanup", defaultCost: 200, defaultHours: 3, defaultManpower: 2, unit: "each" },
      { name: "Permit Coordination", defaultCost: 300, defaultHours: 2, defaultManpower: 1, unit: "each" },
    ],
  },
];

function seed() {
  const dbPath = path.join(process.cwd(), "data", "jose.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  for (const category of seedData) {
    const categoryId = createId();
    db.insert(taskTemplates)
      .values({
        id: categoryId,
        name: category.name,
        division: "general_contracting",
        category: category.category,
        depth: 0,
        sortOrder: seedData.indexOf(category),
      })
      .run();

    for (let si = 0; si < category.children.length; si++) {
      const service = category.children[si];
      const serviceId = createId();
      db.insert(taskTemplates)
        .values({
          id: serviceId,
          parentId: categoryId,
          name: service.name,
          division: "general_contracting",
          category: category.category,
          depth: 1,
          defaultCost: service.defaultCost,
          defaultHours: service.defaultHours,
          defaultManpower: service.defaultManpower,
          unit: service.unit,
          sortOrder: si,
        })
        .run();

      if (service.children) {
        for (let ti = 0; ti < service.children.length; ti++) {
          const task = service.children[ti];
          db.insert(taskTemplates)
            .values({
              id: createId(),
              parentId: serviceId,
              name: task.name,
              division: "general_contracting",
              category: category.category,
              depth: 2,
              defaultCost: task.defaultCost,
              defaultHours: task.defaultHours,
              defaultManpower: task.defaultManpower,
              unit: task.unit,
              sortOrder: ti,
            })
            .run();
        }
      }
    }
  }

  console.log("General contracting seed complete!");
  sqlite.close();
}

seed();
