-- Merge crew_members into users table
-- Add crew-specific fields to users
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN availability TEXT;
ALTER TABLE users ADD COLUMN tasks TEXT;

-- Copy crew data into linked user rows (user.crew_id → crew.id)
UPDATE users SET
  city = (SELECT c.city FROM crew c WHERE c.id = users.crew_id),
  availability = (SELECT c.availability FROM crew c WHERE c.id = users.crew_id),
  tasks = (SELECT c.tasks FROM crew c WHERE c.id = users.crew_id),
  phone = COALESCE(users.phone, (SELECT c.phone FROM crew c WHERE c.id = users.crew_id))
WHERE crew_id IS NOT NULL;

-- Remap activity crew_id: old crew.id → user.id (for linked crew only)
UPDATE project_activities SET crew_id = (
  SELECT u.id FROM users u WHERE u.crew_id = project_activities.crew_id
)
WHERE crew_id IN (SELECT crew_id FROM users WHERE crew_id IS NOT NULL);

-- Remap project lead_crew_id the same way
UPDATE projects SET lead_crew_id = (
  SELECT u.id FROM users u WHERE u.crew_id = projects.lead_crew_id
)
WHERE lead_crew_id IN (SELECT crew_id FROM users WHERE crew_id IS NOT NULL);

-- Insert unlinked crew members as new people (no auth fields)
INSERT INTO users (id, name, phone, city, availability, tasks, role, is_blocked, session_version, created_at)
SELECT id, name, phone, city, availability, tasks, NULL, 0, 1, created_at
FROM crew
WHERE id NOT IN (SELECT crew_id FROM users WHERE crew_id IS NOT NULL);

-- Drop the old crew table
DROP TABLE IF EXISTS crew;
