-- ============================================================
-- PERSONAL OS — STAGE 1 MIGRATION
-- Archives existing data and creates the new aspect-based foundation
-- Run in Supabase SQL Editor as a single query
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- STEP 1: Drop existing tables (nothing to preserve)
-- ──────────────────────────────────────────────────────────

DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS diary_log CASCADE;
DROP TABLE IF EXISTS ideas CASCADE;
DROP TABLE IF EXISTS scenarios CASCADE;
DROP TABLE IF EXISTS decisions CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS jobs_done CASCADE;
DROP TABLE IF EXISTS document_views CASCADE;
DROP TABLE IF EXISTS question_log CASCADE;
DROP TABLE IF EXISTS weekly_maps CASCADE;
DROP TABLE IF EXISTS conversation_state CASCADE;

-- ──────────────────────────────────────────────────────────
-- STEP 2: Core foundation — aspects
-- ──────────────────────────────────────────────────────────

CREATE TABLE aspects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  aspect_type text CHECK (aspect_type IN ('doing', 'inner', 'derived')) DEFAULT 'doing',
  sort_order integer DEFAULT 0,
  
  -- Definition fields (all editable, all optional after creation)
  meaning text,                  -- what this aspect means to me
  achievement_goal text,         -- what I am trying to achieve
  current_struggle text,         -- where I am struggling
  
  -- Custom fields stored as JSON for extensibility
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Training profile (used by Stage 2, stored from Stage 1)
  training_profile jsonb DEFAULT '{}'::jsonb,
  
  -- Behaviour toggles
  no_read_mode boolean DEFAULT false,
  high_care_mode boolean DEFAULT false,
  sub_structure_type text CHECK (sub_structure_type IN ('none', 'tags', 'sub_aspects')) DEFAULT 'none',
  
  -- Status (only meaningful for doing aspects)
  status text CHECK (status IN ('Critical', 'Attention', 'On Track', 'Dormant')) DEFAULT 'On Track',
  priority_score integer DEFAULT 50,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_aspects_active ON aspects(is_active, sort_order);
CREATE INDEX idx_aspects_type ON aspects(aspect_type);

-- ──────────────────────────────────────────────────────────
-- STEP 3: Sub-aspects (optional hierarchy)
-- ──────────────────────────────────────────────────────────

CREATE TABLE sub_aspects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sub_aspects_aspect ON sub_aspects(aspect_id);

-- ──────────────────────────────────────────────────────────
-- STEP 4: Vision Board (per aspect, supports any media type)
-- ──────────────────────────────────────────────────────────

CREATE TABLE vision_board (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  sub_aspect_id uuid REFERENCES sub_aspects(id) ON DELETE SET NULL,
  
  item_type text CHECK (item_type IN ('image', 'link', 'quote', 'text', 'video', 'audio', 'screenshot')) DEFAULT 'text',
  url text,
  content text,                  -- text content, quote, caption
  notes text,                    -- your reflection on this item
  tags text[],
  
  sort_order integer DEFAULT 0,
  pinned boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vision_board_aspect ON vision_board(aspect_id, sort_order);

-- ──────────────────────────────────────────────────────────
-- STEP 5: Ideas and Notes (rolling scratchpad)
-- ──────────────────────────────────────────────────────────

CREATE TABLE ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  sub_aspect_id uuid REFERENCES sub_aspects(id) ON DELETE SET NULL,
  
  content text NOT NULL,
  notes text,
  tags text[],
  
  ai_assessment text,            -- generated when added (optional)
  ai_assessment_feedback text,   -- "you misread me" feedback if any
  
  pinned boolean DEFAULT false,
  source text DEFAULT 'manual',  -- 'manual', 'voice', 'telegram'
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ideas_aspect ON ideas(aspect_id, created_at DESC);

-- ──────────────────────────────────────────────────────────
-- STEP 6: Reflections (free-form writing surface for inner aspects)
-- ──────────────────────────────────────────────────────────

CREATE TABLE reflections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  
  title text,                    -- optional title
  content text NOT NULL,
  tags text[],
  
  section text,                  -- for Compass: 'beliefs', 'purpose', 'mission', 'standpoints' or null
  
  pinned boolean DEFAULT false,
  archived boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_reflections_aspect ON reflections(aspect_id, created_at DESC);
CREATE INDEX idx_reflections_section ON reflections(aspect_id, section);

-- ──────────────────────────────────────────────────────────
-- STEP 7: Jobs (the cross-aspect pool)
-- ──────────────────────────────────────────────────────────

CREATE TABLE jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  sub_aspect_id uuid REFERENCES sub_aspects(id) ON DELETE SET NULL,
  
  title text NOT NULL,
  notes text,
  
  -- Priority and lifestyle flags
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  pulls_on_lifestyle boolean DEFAULT false,
  
  -- Status: pool → committed → completed
  status text CHECK (status IN ('pool', 'this_week', 'this_month', 'completed', 'dropped')) DEFAULT 'pool',
  
  -- Custom view/horizon
  horizon text,                  -- user-defined view tag
  
  due_date date,
  estimated_minutes integer,
  
  completed_at timestamptz,
  completion_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_jobs_status ON jobs(status, priority);
CREATE INDEX idx_jobs_aspect ON jobs(aspect_id, status);
CREATE INDEX idx_jobs_lifestyle ON jobs(pulls_on_lifestyle) WHERE pulls_on_lifestyle = true;

-- ──────────────────────────────────────────────────────────
-- STEP 8: Decisions log (cross-aspect)
-- ──────────────────────────────────────────────────────────

CREATE TABLE decisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  sub_aspect_id uuid REFERENCES sub_aspects(id) ON DELETE SET NULL,
  
  question text NOT NULL,
  classification jsonb,
  
  underneath_question text,
  underneath_answer text,
  premortem_question text,
  premortem_answer text,
  counter_scenarios jsonb,
  
  tree jsonb,
  chosen_path text,
  
  status text DEFAULT 'open',
  
  revisit_3mo_date date,
  revisit_6mo_date date,
  revisit_3mo_done boolean DEFAULT false,
  revisit_6mo_done boolean DEFAULT false,
  outcome_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_decisions_aspect ON decisions(aspect_id);
CREATE INDEX idx_decisions_revisit ON decisions(revisit_3mo_date, revisit_3mo_done) WHERE revisit_3mo_done = false;

-- ──────────────────────────────────────────────────────────
-- STEP 9: Question log
-- ──────────────────────────────────────────────────────────

CREATE TABLE question_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  
  question text NOT NULL,
  answer text,
  source text DEFAULT 'daily',
  question_depth text DEFAULT 'surface',
  
  feedback text,                 -- "you misread me" or "good question"
  
  answered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_question_log_aspect ON question_log(aspect_id, created_at DESC);

-- ──────────────────────────────────────────────────────────
-- STEP 10: Weekly maps
-- ──────────────────────────────────────────────────────────

CREATE TABLE weekly_maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  distinctive_moves text,
  energy_gaps text,
  cross_aspect_signature text,
  mapping_hypotheses text,
  full_note text,
  
  user_response text,
  user_response_at timestamptz,
  
  feedback text,                 -- "you misread me" or specific corrections
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_weekly_maps_period ON weekly_maps(period_end DESC);

-- ──────────────────────────────────────────────────────────
-- STEP 11: Diary log (chronological cross-aspect timeline)
-- ──────────────────────────────────────────────────────────

CREATE TABLE diary_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,
  
  entry text NOT NULL,
  entry_type text DEFAULT 'note', -- note, idea, reflection, job_done, decision, question_answer
  source text DEFAULT 'manual',
  
  related_id uuid,               -- optional link to another table
  related_type text,             -- which table it relates to
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_diary_log_aspect ON diary_log(aspect_id, created_at DESC);
CREATE INDEX idx_diary_log_created ON diary_log(created_at DESC);

-- ──────────────────────────────────────────────────────────
-- STEP 12: Lifestyle (default + present-time)
-- ──────────────────────────────────────────────────────────

CREATE TABLE lifestyle_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  state_type text CHECK (state_type IN ('default', 'present')) NOT NULL,
  
  description text,              -- prose description of the lifestyle
  domains jsonb,                 -- structured: { sleep: "...", work: "...", relationships: "...", ... }
  
  updated_at timestamptz DEFAULT now()
);

-- Ensure only one row per type
CREATE UNIQUE INDEX idx_lifestyle_one_per_type ON lifestyle_state(state_type);

-- ──────────────────────────────────────────────────────────
-- STEP 13: Atypical periods (state vs trait guardrail)
-- ──────────────────────────────────────────────────────────

CREATE TABLE atypical_periods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  aspect_id uuid REFERENCES aspects(id) ON DELETE CASCADE,  -- null = system-wide
  
  start_date date NOT NULL,
  end_date date,                 -- null = still ongoing
  reason text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_atypical_active ON atypical_periods(aspect_id, end_date);

-- ──────────────────────────────────────────────────────────
-- STEP 14: AI Feedback ("you misread me")
-- ──────────────────────────────────────────────────────────

CREATE TABLE ai_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  source_table text NOT NULL,    -- which table the AI content is from
  source_id uuid NOT NULL,        -- the row id
  
  ai_content text,                -- a snapshot of what the AI said
  feedback_type text CHECK (feedback_type IN ('misread', 'helpful', 'tone_off', 'too_generic')) NOT NULL,
  explanation text,               -- optional: why
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_feedback_source ON ai_feedback(source_table, source_id);

-- ──────────────────────────────────────────────────────────
-- STEP 15: Feature suggestions (your personal product roadmap)
-- ──────────────────────────────────────────────────────────

CREATE TABLE feature_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  suggestion text NOT NULL,
  context_aspect_id uuid REFERENCES aspects(id) ON DELETE SET NULL,
  context_page text,              -- which dashboard page were they on
  status text DEFAULT 'open',     -- open, planned, built, declined
  
  created_at timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- STEP 16: Conversation state for multi-turn Telegram flows
-- ──────────────────────────────────────────────────────────

CREATE TABLE conversation_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id text NOT NULL,
  flow_type text NOT NULL,
  step text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conv_state_chat ON conversation_state(chat_id);

-- ──────────────────────────────────────────────────────────
-- STEP 17: Updated-at trigger
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER aspects_updated_at BEFORE UPDATE ON aspects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER sub_aspects_updated_at BEFORE UPDATE ON sub_aspects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reflections_updated_at BEFORE UPDATE ON reflections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lifestyle_updated_at BEFORE UPDATE ON lifestyle_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────
-- STEP 18: Row Level Security
-- ──────────────────────────────────────────────────────────

ALTER TABLE aspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_aspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifestyle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE atypical_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for personal use" ON aspects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON sub_aspects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON vision_board FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON ideas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON reflections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON decisions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON question_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON weekly_maps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON diary_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON lifestyle_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON atypical_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON ai_feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON feature_suggestions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for personal use" ON conversation_state FOR ALL USING (true) WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- STEP 19: Seed the 12 aspects
-- ──────────────────────────────────────────────────────────

INSERT INTO aspects (name, aspect_type, sort_order, meaning) VALUES
('Career', 'doing', 1, NULL),
('Health', 'doing', 2, NULL),
('Spiritual', 'inner', 3, NULL),
('Fitness', 'doing', 4, NULL),
('Finance', 'doing', 5, NULL),
('Personal Development', 'doing', 6, NULL),
('Travel', 'doing', 7, NULL),
('Relationships', 'doing', 8, NULL),
('Reflections & Questions', 'inner', 9, NULL),
('Compass', 'inner', 10, 'Beliefs, purpose, mission, and the standpoints I have taken in my life'),
('Lifestyle', 'derived', 11, 'The live read on how my doing aspects are interacting with my default way of living'),
('Contribution & Impact', 'doing', 12, NULL);

-- Seed empty default lifestyle row
INSERT INTO lifestyle_state (state_type, description, domains) VALUES
('default', NULL, '{"sleep": "", "work": "", "rest": "", "relationships": "", "creativity": "", "body": "", "money": ""}'::jsonb),
('present', NULL, '{}'::jsonb);
