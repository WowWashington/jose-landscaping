import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { taskTemplates } from "./schema";
import { createId } from "@paralleldrive/cuid2";
import path from "path";
import fs from "fs";

type SubTask = {
  name: string;
  defaultCost?: number;
  defaultHours?: number;
  defaultManpower?: number;
  unit?: string;
};

type Service = {
  name: string;
  description?: string;
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
    name: "Landscaping",
    category: "green",
    children: [
      {
        name: "Lawn Installation",
        defaultCost: 1.5,
        defaultHours: 0.5,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Grade and level soil", defaultCost: 0.3, defaultHours: 0.1, defaultManpower: 2, unit: "sqft" },
          { name: "Lay topsoil", defaultCost: 0.4, defaultHours: 0.1, defaultManpower: 2, unit: "sqft" },
          { name: "Install sod or seed", defaultCost: 0.6, defaultHours: 0.2, defaultManpower: 2, unit: "sqft" },
          { name: "Initial watering and setup", defaultCost: 0.2, defaultHours: 0.1, defaultManpower: 1, unit: "sqft" },
        ],
      },
      {
        name: "Garden Bed Installation",
        defaultCost: 8.0,
        defaultHours: 1,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Remove existing vegetation", defaultCost: 1.0, defaultHours: 0.2, defaultManpower: 2, unit: "sqft" },
          { name: "Install edging and border", defaultCost: 3.0, defaultHours: 0.3, defaultManpower: 1, unit: "linear_ft" },
          { name: "Add soil and amendments", defaultCost: 2.0, defaultHours: 0.2, defaultManpower: 1, unit: "sqft" },
          { name: "Plant shrubs and flowers", defaultCost: 3.0, defaultHours: 0.3, defaultManpower: 2, unit: "each" },
          { name: "Apply mulch", defaultCost: 1.5, defaultHours: 0.1, defaultManpower: 1, unit: "sqft" },
        ],
      },
      { name: "Lawn Mowing", defaultCost: 45, defaultHours: 1, defaultManpower: 1, unit: "each" },
      { name: "Lawn Fertilizing", defaultCost: 75, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
      { name: "Weed Control", defaultCost: 60, defaultHours: 1, defaultManpower: 1, unit: "each" },
      {
        name: "Aeration and Overseeding",
        defaultCost: 150,
        defaultHours: 2,
        defaultManpower: 1,
        unit: "each",
        children: [
          { name: "Core aeration", defaultCost: 80, defaultHours: 1, defaultManpower: 1, unit: "each" },
          { name: "Overseed lawn", defaultCost: 50, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
          { name: "Apply starter fertilizer", defaultCost: 20, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
        ],
      },
      { name: "Edging and Trimming", defaultCost: 35, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
      { name: "Leaf and Debris Cleanup", defaultCost: 50, defaultHours: 1.5, defaultManpower: 1, unit: "each" },
    ],
  },
  {
    name: "Hardscape",
    category: "hardscape",
    children: [
      {
        name: "Build Stone Pathway",
        defaultCost: 15,
        defaultHours: 2,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Mark layout and excavate", defaultCost: 2.0, defaultHours: 0.5, defaultManpower: 2, unit: "sqft" },
          { name: "Install landscape fabric", defaultCost: 0.5, defaultHours: 0.1, defaultManpower: 1, unit: "sqft" },
          { name: "Add gravel base", defaultCost: 2.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Add sand leveling layer", defaultCost: 1.5, defaultHours: 0.2, defaultManpower: 1, unit: "sqft" },
          { name: "Lay stones or pavers", defaultCost: 7.0, defaultHours: 0.6, defaultManpower: 2, unit: "sqft" },
          { name: "Fill joints with sand", defaultCost: 1.0, defaultHours: 0.1, defaultManpower: 1, unit: "sqft" },
          { name: "Install border stones", defaultCost: 1.0, defaultHours: 0.2, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
      {
        name: "Retaining Wall",
        defaultCost: 25,
        defaultHours: 3,
        defaultManpower: 3,
        unit: "sqft",
        children: [
          { name: "Excavate and grade base", defaultCost: 4.0, defaultHours: 0.8, defaultManpower: 3, unit: "sqft" },
          { name: "Install drainage gravel behind wall", defaultCost: 3.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Lay base course blocks", defaultCost: 5.0, defaultHours: 0.5, defaultManpower: 2, unit: "linear_ft" },
          { name: "Stack wall blocks", defaultCost: 8.0, defaultHours: 1.0, defaultManpower: 3, unit: "sqft" },
          { name: "Install cap stones", defaultCost: 3.0, defaultHours: 0.2, defaultManpower: 2, unit: "linear_ft" },
          { name: "Backfill and compact", defaultCost: 2.0, defaultHours: 0.2, defaultManpower: 2, unit: "sqft" },
        ],
      },
      {
        name: "Patio Installation",
        defaultCost: 18,
        defaultHours: 2.5,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Excavate area", defaultCost: 3.0, defaultHours: 0.5, defaultManpower: 2, unit: "sqft" },
          { name: "Compact sub-base", defaultCost: 2.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Install gravel base", defaultCost: 2.5, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Lay sand bed", defaultCost: 1.5, defaultHours: 0.2, defaultManpower: 1, unit: "sqft" },
          { name: "Set pavers or flagstone", defaultCost: 7.0, defaultHours: 0.8, defaultManpower: 2, unit: "sqft" },
          { name: "Cut edge pavers", defaultCost: 1.0, defaultHours: 0.2, defaultManpower: 1, unit: "sqft" },
          { name: "Polymeric sand and seal", defaultCost: 1.0, defaultHours: 0.2, defaultManpower: 1, unit: "sqft" },
        ],
      },
      { name: "Grading and Leveling", defaultCost: 2.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
      {
        name: "Concrete Work",
        defaultCost: 12,
        defaultHours: 1.5,
        defaultManpower: 3,
        unit: "sqft",
        children: [
          { name: "Build forms", defaultCost: 2.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Prepare sub-base", defaultCost: 2.0, defaultHours: 0.3, defaultManpower: 2, unit: "sqft" },
          { name: "Pour concrete", defaultCost: 6.0, defaultHours: 0.5, defaultManpower: 3, unit: "sqft" },
          { name: "Finish and cure", defaultCost: 2.0, defaultHours: 0.4, defaultManpower: 2, unit: "sqft" },
        ],
      },
    ],
  },
  {
    name: "Irrigation & Drainage",
    category: "irrigation",
    children: [
      {
        name: "Sprinkler System Installation",
        defaultCost: 3000,
        defaultHours: 16,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Design sprinkler layout", defaultCost: 200, defaultHours: 2, defaultManpower: 1, unit: "each" },
          { name: "Dig trenches for pipes", defaultCost: 800, defaultHours: 4, defaultManpower: 2, unit: "each" },
          { name: "Install main line and valves", defaultCost: 600, defaultHours: 3, defaultManpower: 2, unit: "each" },
          { name: "Install sprinkler heads", defaultCost: 400, defaultHours: 2, defaultManpower: 1, unit: "each" },
          { name: "Install controller and timer", defaultCost: 300, defaultHours: 1, defaultManpower: 1, unit: "each" },
          { name: "Backfill and test system", defaultCost: 200, defaultHours: 2, defaultManpower: 2, unit: "each" },
          { name: "Adjust coverage and program", defaultCost: 100, defaultHours: 1, defaultManpower: 1, unit: "each" },
        ],
      },
      {
        name: "French Drain / Water Trench",
        defaultCost: 25,
        defaultHours: 1.5,
        defaultManpower: 2,
        unit: "linear_ft",
        children: [
          { name: "Mark and excavate trench", defaultCost: 6.0, defaultHours: 0.4, defaultManpower: 2, unit: "linear_ft" },
          { name: "Line with landscape fabric", defaultCost: 2.0, defaultHours: 0.1, defaultManpower: 1, unit: "linear_ft" },
          { name: "Lay perforated drain pipe", defaultCost: 5.0, defaultHours: 0.2, defaultManpower: 1, unit: "linear_ft" },
          { name: "Fill with drainage gravel", defaultCost: 8.0, defaultHours: 0.4, defaultManpower: 2, unit: "linear_ft" },
          { name: "Cover and restore surface", defaultCost: 4.0, defaultHours: 0.4, defaultManpower: 2, unit: "linear_ft" },
        ],
      },
      {
        name: "Underground Water Storage",
        defaultCost: 5000,
        defaultHours: 24,
        defaultManpower: 3,
        unit: "each",
        children: [
          { name: "Site survey and planning", defaultCost: 300, defaultHours: 3, defaultManpower: 1, unit: "each" },
          { name: "Excavate storage area", defaultCost: 1500, defaultHours: 8, defaultManpower: 3, unit: "each" },
          { name: "Install tank or cistern", defaultCost: 2000, defaultHours: 4, defaultManpower: 3, unit: "each" },
          { name: "Connect inlet and overflow pipes", defaultCost: 500, defaultHours: 3, defaultManpower: 2, unit: "each" },
          { name: "Install pump and controls", defaultCost: 400, defaultHours: 2, defaultManpower: 1, unit: "each" },
          { name: "Backfill and restore grade", defaultCost: 300, defaultHours: 4, defaultManpower: 3, unit: "each" },
        ],
      },
      { name: "Sprinkler Repair / Adjustment", defaultCost: 85, defaultHours: 1, defaultManpower: 1, unit: "each" },
      {
        name: "Drip Irrigation Setup",
        defaultCost: 1.5,
        defaultHours: 0.1,
        defaultManpower: 1,
        unit: "linear_ft",
        children: [
          { name: "Plan drip zones", defaultCost: 0.2, defaultHours: 0.02, defaultManpower: 1, unit: "linear_ft" },
          { name: "Lay drip tubing", defaultCost: 0.8, defaultHours: 0.05, defaultManpower: 1, unit: "linear_ft" },
          { name: "Install emitters", defaultCost: 0.3, defaultHours: 0.02, defaultManpower: 1, unit: "linear_ft" },
          { name: "Connect to water source and test", defaultCost: 0.2, defaultHours: 0.01, defaultManpower: 1, unit: "linear_ft" },
        ],
      },
    ],
  },
  {
    name: "Tree & Plant Care",
    category: "tree_care",
    children: [
      {
        name: "Tree Trimming",
        defaultCost: 300,
        defaultHours: 2,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Assess tree and plan cuts", defaultCost: 0, defaultHours: 0.25, defaultManpower: 1, unit: "each" },
          { name: "Trim branches", defaultCost: 200, defaultHours: 1, defaultManpower: 2, unit: "each" },
          { name: "Clean up and haul debris", defaultCost: 100, defaultHours: 0.75, defaultManpower: 2, unit: "each" },
        ],
      },
      {
        name: "Tree Removal",
        defaultCost: 800,
        defaultHours: 4,
        defaultManpower: 3,
        unit: "each",
        children: [
          { name: "Fell tree in sections", defaultCost: 400, defaultHours: 2, defaultManpower: 3, unit: "each" },
          { name: "Remove stump (grinding)", defaultCost: 200, defaultHours: 1, defaultManpower: 1, unit: "each" },
          { name: "Haul away debris", defaultCost: 150, defaultHours: 0.75, defaultManpower: 2, unit: "each" },
          { name: "Fill and grade stump area", defaultCost: 50, defaultHours: 0.25, defaultManpower: 1, unit: "each" },
        ],
      },
      {
        name: "Tree / Shrub Planting",
        defaultCost: 150,
        defaultHours: 1,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Dig planting hole", defaultCost: 30, defaultHours: 0.25, defaultManpower: 2, unit: "each" },
          { name: "Amend soil", defaultCost: 20, defaultHours: 0.1, defaultManpower: 1, unit: "each" },
          { name: "Place and backfill", defaultCost: 50, defaultHours: 0.25, defaultManpower: 2, unit: "each" },
          { name: "Stake if needed", defaultCost: 20, defaultHours: 0.15, defaultManpower: 1, unit: "each" },
          { name: "Water and mulch", defaultCost: 30, defaultHours: 0.25, defaultManpower: 1, unit: "each" },
        ],
      },
      { name: "Stump Grinding", defaultCost: 200, defaultHours: 1, defaultManpower: 1, unit: "each" },
      { name: "Hedge Trimming", defaultCost: 75, defaultHours: 1, defaultManpower: 1, unit: "each" },
      { name: "Bush and Shrub Removal", defaultCost: 120, defaultHours: 1.5, defaultManpower: 2, unit: "each" },
    ],
  },
  {
    name: "Specialized Services",
    category: "specialized",
    children: [
      {
        name: "Landscape Lighting Installation",
        defaultCost: 2000,
        defaultHours: 8,
        defaultManpower: 2,
        unit: "each",
        children: [
          { name: "Plan lighting layout", defaultCost: 200, defaultHours: 1, defaultManpower: 1, unit: "each" },
          { name: "Dig wire trenches", defaultCost: 400, defaultHours: 2, defaultManpower: 2, unit: "each" },
          { name: "Install transformer", defaultCost: 300, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
          { name: "Run low-voltage wiring", defaultCost: 300, defaultHours: 2, defaultManpower: 1, unit: "each" },
          { name: "Install light fixtures", defaultCost: 500, defaultHours: 1.5, defaultManpower: 2, unit: "each" },
          { name: "Test and adjust angles", defaultCost: 100, defaultHours: 0.5, defaultManpower: 1, unit: "each" },
          { name: "Backfill and clean up", defaultCost: 200, defaultHours: 0.5, defaultManpower: 2, unit: "each" },
        ],
      },
      { name: "Sod Replacement", defaultCost: 2.0, defaultHours: 0.1, defaultManpower: 2, unit: "sqft" },
      { name: "Mulch Delivery and Spreading", defaultCost: 75, defaultHours: 1, defaultManpower: 2, unit: "yard" },
      { name: "Debris / Junk Removal", defaultCost: 200, defaultHours: 2, defaultManpower: 2, unit: "load" },
      { name: "Fence Installation", defaultCost: 30, defaultHours: 0.5, defaultManpower: 2, unit: "linear_ft" },
      { name: "Fence Repair", defaultCost: 150, defaultHours: 2, defaultManpower: 1, unit: "each" },
      {
        name: "Erosion Control",
        defaultCost: 5.0,
        defaultHours: 0.3,
        defaultManpower: 2,
        unit: "sqft",
        children: [
          { name: "Install erosion blankets", defaultCost: 2.0, defaultHours: 0.1, defaultManpower: 1, unit: "sqft" },
          { name: "Plant ground cover", defaultCost: 2.0, defaultHours: 0.1, defaultManpower: 2, unit: "sqft" },
          { name: "Install rip-rap or rocks", defaultCost: 1.0, defaultHours: 0.1, defaultManpower: 2, unit: "sqft" },
        ],
      },
      { name: "Power Washing", defaultCost: 0.2, defaultHours: 0.02, defaultManpower: 1, unit: "sqft" },
    ],
  },
];

function seed() {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "jose.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  // Clear existing templates
  sqlite.exec("DELETE FROM task_templates");

  for (const category of seedData) {
    const categoryId = createId();
    db.insert(taskTemplates)
      .values({
        id: categoryId,
        name: category.name,
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
          description: service.description,
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

  console.log("Seed complete! Task library populated.");
  sqlite.close();
}

seed();
