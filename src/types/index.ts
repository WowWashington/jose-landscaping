export type Contact = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  lastContactDate: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type TaskTemplate = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  division: string | null;
  category: string | null;
  depth: number | null;
  defaultCost: number | null;
  defaultHours: number | null;
  defaultManpower: number | null;
  unit: string | null;
  sortOrder: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
  children?: TaskTemplate[];
};

export type Project = {
  id: string;
  contactId: string | null;
  quoteNumber: string | null;
  division: string | null;
  name: string;
  description: string | null;
  status: string | null;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  dueDate: string | null;
  confirmed: boolean | null;
  statusNotes: string | null;
  coverPhoto: string | null;
  leadCrewId: string | null;
  leadCrewName?: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  contact?: Contact | null;
  activities?: ProjectActivity[];
};

export type ProjectActivity = {
  id: string;
  projectId: string;
  parentActivityId: string | null;
  templateId: string | null;
  crewId: string | null;
  crewName?: string | null;
  name: string;
  description: string | null;
  cost: number | null;
  hours: number | null;
  manpower: number | null;
  quantity: number | null;
  unit: string | null;
  isComplete: boolean | null;
  completedBy: string | null;
  completedByName?: string | null;
  completedAt: Date | null;
  actualHours: number | null;
  sortOrder: number | null;
  createdAt: Date | null;
  children?: ProjectActivity[];
  photoCount?: number;
};

export type ActivityPhoto = {
  id: string;
  activityId: string;
  fileName: string;
  note: string | null;
  createdAt: Date | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pin: string | null;
  role: string | null;
  crewId: string | null;
  city: string | null;
  availability: string | null;
  tasks: string | null;
  isBlocked: boolean | null;
  createdAt: Date | null;
};

export type ChangeLogEntry = {
  id: string;
  projectId: string | null;
  activityId: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityName: string | null;
  details: string | null;
  createdAt: Date | null;
};

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  coordinator: "Coordinator",
  worker: "Worker",
};

export type ProjectSummary = {
  totalCost: number;
  totalHours: number;
  maxManpower: number;
  activityCount: number;
};

export const UNIT_LABELS: Record<string, string> = {
  each: "ea",
  sqft: "sq ft",
  linear_ft: "lin ft",
  hour: "hr",
  load: "load",
  yard: "yd",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  quoted: "Quoted",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<string, string> = {
  green: "Landscaping",
  hardscape: "Hardscape",
  irrigation: "Irrigation & Drainage",
  tree_care: "Tree & Plant Care",
  specialized: "Specialized Services",
  interior: "Interior Work",
  exterior: "Exterior Work",
  structural: "Structural",
  finishing: "Finishing & Detail",
  gc_specialized: "Specialized",
};

export const UNIT_OPTIONS = [
  { value: "each", label: "Each" },
  { value: "sqft", label: "Sq Ft" },
  { value: "linear_ft", label: "Linear Ft" },
  { value: "hour", label: "Hour" },
  { value: "load", label: "Load" },
  { value: "yard", label: "Yard" },
];

export const DIVISION_OPTIONS = [
  { value: "yard_care", label: "Yard Care & Landscaping", icon: "🌿" },
  { value: "general_contracting", label: "General Contracting", icon: "🔨" },
];

export const DIVISION_LABELS: Record<string, string> = {
  yard_care: "Yard Care & Landscaping",
  general_contracting: "General Contracting",
};

export const CATEGORY_OPTIONS: Record<string, { value: string; label: string }[]> = {
  yard_care: [
    { value: "green", label: "Landscaping" },
    { value: "hardscape", label: "Hardscape" },
    { value: "irrigation", label: "Irrigation & Drainage" },
    { value: "tree_care", label: "Tree & Plant Care" },
    { value: "specialized", label: "Specialized Services" },
  ],
  general_contracting: [
    { value: "interior", label: "Interior Work" },
    { value: "exterior", label: "Exterior Work" },
    { value: "structural", label: "Structural" },
    { value: "finishing", label: "Finishing & Detail" },
    { value: "gc_specialized", label: "Specialized" },
  ],
};
