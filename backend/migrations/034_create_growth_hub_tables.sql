-- Migration 034: Create Growth Hub Tables
-- Supports User-Isolated Growth System, Daily Routines, Holiday Mode, 
-- Scorecard, 90-Day Planner, Personal Goals, and Weekly Order Progress Reports

-- 1. Routine tasks (user-defined, editable)
CREATE TABLE IF NOT EXISTS growth_routine_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  time_block TEXT,           -- '6:30 AM', '9:30 AM'
  task_name TEXT NOT NULL,
  category TEXT DEFAULT 'work', -- 'morning' | 'work' | 'evening'
  auto_rollover BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_routine_tasks_user ON growth_routine_tasks(user_id);

-- 2. Daily routine completions
CREATE TABLE IF NOT EXISTS growth_routine_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES growth_routine_tasks(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  rolled_from DATE,
  rollover_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_routine_logs_user_date ON growth_routine_logs(user_id, log_date);

-- 3. Holiday / off days
CREATE TABLE IF NOT EXISTS growth_holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT,                -- 'Dashain', 'Team Holiday', etc.
  mode TEXT DEFAULT 'full',  -- 'full' | 'reduced'
  store_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_holidays_user ON growth_holidays(user_id);

-- 4. Weekly platform scorecard & targets
CREATE TABLE IF NOT EXISTS growth_scorecard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  platform TEXT NOT NULL,
  orders INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  ad_spend NUMERIC DEFAULT 0,
  target_orders INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, platform)
);

CREATE INDEX IF NOT EXISTS idx_growth_scorecard_user_week ON growth_scorecard(user_id, week_start);

-- 5. Weekly Order Progress Reports (Saturday Auto-Snapshot + Sunday Summary)
CREATE TABLE IF NOT EXISTS growth_weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  daraz_orders INTEGER DEFAULT 0,
  non_daraz_orders INTEGER DEFAULT 0,
  platform_breakdown JSONB DEFAULT '{}'::jsonb,
  daily_breakdown JSONB DEFAULT '[]'::jsonb,
  sunday_summary TEXT,
  action_plan_next_week TEXT,
  is_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_growth_weekly_reports_user ON growth_weekly_reports(user_id);

-- 6. 90-day planner: custom task overrides per day
CREATE TABLE IF NOT EXISTS growth_planner_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  day_number INTEGER,
  tasks JSONB DEFAULT '[]'::jsonb,
  is_holiday BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_growth_planner_logs_user_date ON growth_planner_logs(user_id, plan_date);

-- 7. Personal goals
CREATE TABLE IF NOT EXISTS growth_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_text TEXT NOT NULL,
  category TEXT DEFAULT 'personal', -- 'health' | 'business' | 'social' | 'personal'
  target_score INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_goals_user ON growth_goals(user_id);

-- 8. Weekly goal scores + reflection journal
CREATE TABLE IF NOT EXISTS growth_goal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  goal_scores JSONB DEFAULT '[]'::jsonb,
  reflection_what_worked TEXT,
  reflection_what_didnt TEXT,
  reflection_next_week TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_growth_goal_logs_user_week ON growth_goal_logs(user_id, week_start);
