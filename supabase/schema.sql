-- ============================================================
-- petVetta — Database Schema v1.1
-- PostgreSQL 15 | Supabase (ap-south-1 Mumbai)
-- DPDP Act 2023 Compliant | Owner: Tanmoy Chowdhury
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- 1. blocked_email_domains
-- Purpose: prevent disposable/temporary email registration
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_email_domains (
  domain    TEXT PRIMARY KEY,
  reason    TEXT NOT NULL DEFAULT 'disposable_temporary',
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed disposable domains
INSERT INTO blocked_email_domains (domain) VALUES
  ('mailinator.com'), ('guerrillamail.com'), ('tempmail.com'),
  ('throwaway.email'), ('yopmail.com'), ('10minutemail.com'),
  ('sharklasers.com'), ('trashmail.com'), ('dispostable.com'),
  ('spam4.me'), ('guerrillamailblock.com'), ('grr.la'),
  ('guerrillamail.info'), ('guerrillamail.biz'), ('guerrillamail.de'),
  ('guerrillamail.net'), ('guerrillamail.org'), ('spam4.me'),
  ('trashmail.at'), ('trashmail.io'), ('trashmail.me'),
  ('mailnull.com'), ('spamdecoy.net'), ('fakeinbox.com'),
  ('mailnesia.com'), ('maildrop.cc'), ('spamgourmet.com')
ON CONFLICT (domain) DO NOTHING;

-- ============================================================
-- 2. profiles
-- Purpose: extended user profile (one row per auth.users entry)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  full_name           TEXT,
  avatar_url          TEXT,
  phone_country_code  TEXT NOT NULL DEFAULT '+91',
  phone_number        TEXT,
  country             TEXT NOT NULL DEFAULT 'IN',
  currency            TEXT NOT NULL DEFAULT 'INR',
  preferred_lang      TEXT NOT NULL DEFAULT 'en',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SELECT own profile"  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "UPDATE own profile"  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- 3. pets
-- ============================================================
CREATE TABLE IF NOT EXISTS pets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed           TEXT,
  date_of_birth   DATE,
  gender          TEXT NOT NULL CHECK (gender IN ('male', 'female', 'unknown')) DEFAULT 'unknown',
  weight_kg       DECIMAL(5,2) CHECK (weight_kg > 0),
  photo_url       TEXT,
  microchip_id    TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pets SELECT" ON pets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "pets INSERT" ON pets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "pets UPDATE" ON pets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "pets DELETE" ON pets FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 4. triage_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS triage_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  symptoms_text       TEXT NOT NULL,
  duration_hours      INTEGER,
  severity_level      TEXT CHECK (severity_level IN ('mild', 'moderate', 'severe')),
  triage_level        TEXT NOT NULL CHECK (triage_level IN ('EMERGENCY', 'VET_SOON', 'MONITOR', 'HOME_CARE')),
  ai_response         TEXT NOT NULL,
  ai_model_used       TEXT,
  confidence_score    DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  context_docs_used   INTEGER NOT NULL DEFAULT 0,
  disclaimer_shown    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_user_id    ON triage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_pet_id     ON triage_sessions(pet_id);
CREATE INDEX IF NOT EXISTS idx_triage_level      ON triage_sessions(triage_level);
CREATE INDEX IF NOT EXISTS idx_triage_created_at ON triage_sessions(created_at DESC);

ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "triage SELECT" ON triage_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "triage INSERT" ON triage_sessions FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. food_safety_queries
-- ============================================================
CREATE TABLE IF NOT EXISTS food_safety_queries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id          UUID REFERENCES pets(id) ON DELETE SET NULL,
  food_item       TEXT NOT NULL,
  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  safety_result   TEXT NOT NULL CHECK (safety_result IN ('SAFE', 'CAUTION', 'TOXIC', 'UNKNOWN')),
  ai_response     TEXT NOT NULL,
  ai_model_used   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE food_safety_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food SELECT" ON food_safety_queries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "food INSERT" ON food_safety_queries FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. health_records
-- ============================================================
CREATE TABLE IF NOT EXISTS health_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  record_type     TEXT NOT NULL CHECK (record_type IN ('vet_visit', 'illness', 'surgery', 'grooming', 'other')),
  visit_date      DATE NOT NULL,
  vet_name        TEXT,
  clinic_name     TEXT,
  diagnosis       TEXT,
  treatment       TEXT,
  cost_amount     DECIMAL(10,2),
  cost_currency   TEXT NOT NULL DEFAULT 'INR',
  notes           TEXT,
  follow_up_date  DATE,
  attachments     TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_pet_id     ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_health_user_id    ON health_records(user_id);
CREATE INDEX IF NOT EXISTS idx_health_visit_date ON health_records(visit_date DESC);

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health SELECT" ON health_records FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "health INSERT" ON health_records FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "health UPDATE" ON health_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "health DELETE" ON health_records FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 7. medications
-- ============================================================
CREATE TABLE IF NOT EXISTS medications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id           UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_name  TEXT NOT NULL,
  dosage           TEXT,
  frequency        TEXT,
  start_date       DATE,
  end_date         DATE,
  prescribed_by    TEXT,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meds SELECT" ON medications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "meds INSERT" ON medications FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "meds UPDATE" ON medications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "meds DELETE" ON medications FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 8. weight_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg       DECIMAL(5,2) NOT NULL CHECK (weight_kg > 0),
  measured_date   DATE NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_pet_id ON weight_entries(pet_id);
CREATE INDEX IF NOT EXISTS idx_weight_date   ON weight_entries(measured_date DESC);

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weight SELECT" ON weight_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "weight INSERT" ON weight_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "weight DELETE" ON weight_entries FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 9. vaccinations
-- ============================================================
CREATE TABLE IF NOT EXISTS vaccinations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vaccine_name        TEXT NOT NULL,
  vaccine_type        TEXT NOT NULL CHECK (vaccine_type IN ('core', 'non-core', 'deworming')),
  administered_date   DATE,
  next_due_date       DATE,
  administered_by     TEXT,
  batch_number        TEXT,
  clinic_name         TEXT,
  reminder_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccinations_pet_id   ON vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_next_due ON vaccinations(next_due_date);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vac SELECT" ON vaccinations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "vac INSERT" ON vaccinations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "vac UPDATE" ON vaccinations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "vac DELETE" ON vaccinations FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 10. vet_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS vet_locations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  google_place_id     TEXT,
  name                TEXT NOT NULL,
  address             TEXT,
  phone               TEXT,
  latitude            DECIMAL(10,8),
  longitude           DECIMAL(11,8),
  rating              DECIMAL(2,1),
  is_emergency_clinic BOOLEAN,
  is_my_primary_vet   BOOLEAN NOT NULL DEFAULT FALSE,
  saved_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vet_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vet_loc SELECT" ON vet_locations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "vet_loc INSERT" ON vet_locations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "vet_loc UPDATE" ON vet_locations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "vet_loc DELETE" ON vet_locations FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 11. subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type                 TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium', 'family')),
  status                    TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  currency                  TEXT NOT NULL DEFAULT 'INR',
  amount_paid               DECIMAL(10,2),
  payment_provider          TEXT NOT NULL CHECK (payment_provider IN ('razorpay', 'stripe', 'free')),
  provider_subscription_id  TEXT,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub SELECT" ON subscriptions FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 12. payment_transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id     UUID REFERENCES subscriptions(id),
  payment_provider    TEXT,
  provider_order_id   TEXT,
  provider_payment_id TEXT,
  provider_signature  TEXT,
  amount              DECIMAL(10,2),
  currency            TEXT,
  status              TEXT NOT NULL CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
  payment_method      TEXT,
  failure_reason      TEXT,
  receipt_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No UPDATE/DELETE — append-only for audit integrity
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payment_transactions(user_id);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments SELECT" ON payment_transactions FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 13. knowledge_base
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  content_type     TEXT NOT NULL CHECK (content_type IN ('symptom_guide', 'food_safety', 'first_aid', 'breed_info', 'vaccination', 'nutrition', 'general')),
  species          TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'both', 'general')),
  tags             TEXT[],
  source_url       TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  embedding        VECTOR(1024),
  embedding_model  TEXT NOT NULL DEFAULT 'voyage-3',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW vector index for fast similarity search
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
  ON knowledge_base USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_kb_fts ON knowledge_base
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- No RLS — public read for Edge Functions

-- ============================================================
-- 14. push_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fcm_token    TEXT NOT NULL,
  device_type  TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_push_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push SELECT" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push INSERT" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push UPDATE" ON push_subscriptions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "push DELETE" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- 15. user_ai_usage
-- ============================================================
CREATE TABLE IF NOT EXISTS user_ai_usage (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  daily_query_count       INTEGER NOT NULL DEFAULT 0,
  monthly_query_count     INTEGER NOT NULL DEFAULT 0,
  last_query_at           TIMESTAMPTZ,
  daily_reset_at          DATE NOT NULL DEFAULT CURRENT_DATE,
  total_queries_all_time  INTEGER NOT NULL DEFAULT 0,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_user_id ON user_ai_usage(user_id);

ALTER TABLE user_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage SELECT" ON user_ai_usage FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at      BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pets_updated_at          BEFORE UPDATE ON pets             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_health_records_updated_at BEFORE UPDATE ON health_records  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at  BEFORE UPDATE ON subscriptions   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON push_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- handle_new_user: blocks disposable emails, creates profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
BEGIN
  email_domain := lower(split_part(NEW.email, '@', 2));
  IF EXISTS (SELECT 1 FROM blocked_email_domains WHERE domain = email_domain) THEN
    RAISE EXCEPTION 'Registration blocked: % is a disposable email domain', email_domain;
  END IF;

  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Create default free subscription
  INSERT INTO subscriptions (user_id, plan_type, status, payment_provider)
  VALUES (NEW.id, 'free', 'active', 'free');

  -- Create AI usage tracker
  INSERT INTO user_ai_usage (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- check_and_increment_query: race-safe daily query counter
CREATE OR REPLACE FUNCTION check_and_increment_query(
  p_user_id     UUID,
  p_daily_limit INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  reset_date   DATE;
  daily_count  INTEGER;
BEGIN
  SELECT daily_reset_at, daily_query_count
  INTO reset_date, daily_count
  FROM user_ai_usage
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO user_ai_usage (user_id) VALUES (p_user_id);
    daily_count := 0;
    reset_date := CURRENT_DATE;
  END IF;

  IF reset_date < CURRENT_DATE THEN
    daily_count := 0;
    UPDATE user_ai_usage
    SET daily_reset_at = CURRENT_DATE, daily_query_count = 0
    WHERE user_id = p_user_id;
  END IF;

  IF daily_count >= p_daily_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE user_ai_usage
  SET
    daily_query_count      = daily_count + 1,
    monthly_query_count    = monthly_query_count + 1,
    total_queries_all_time = total_queries_all_time + 1,
    last_query_at          = NOW(),
    updated_at             = NOW()
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- get_pet_health_summary: full pet context for AI
CREATE OR REPLACE FUNCTION get_pet_health_summary(p_pet_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pet',          row_to_json(p),
    'last_visit',   (SELECT row_to_json(h) FROM health_records h WHERE h.pet_id = p_pet_id ORDER BY visit_date DESC LIMIT 1),
    'medications',  (SELECT json_agg(row_to_json(m)) FROM medications m WHERE m.pet_id = p_pet_id AND m.is_active = TRUE),
    'vaccinations', (SELECT json_agg(row_to_json(v)) FROM vaccinations v WHERE v.pet_id = p_pet_id ORDER BY administered_date DESC LIMIT 5),
    'weight',       (SELECT row_to_json(w) FROM weight_entries w WHERE w.pet_id = p_pet_id ORDER BY measured_date DESC LIMIT 1),
    'triage_count', (SELECT COUNT(*) FROM triage_sessions ts WHERE ts.pet_id = p_pet_id)
  )
  INTO result
  FROM pets p
  WHERE p.id = p_pet_id AND p.is_active = TRUE;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW pet_health_summary AS
SELECT
  p.id,
  p.name,
  p.species,
  p.breed,
  EXTRACT(YEAR FROM AGE(p.date_of_birth))::INTEGER AS age_years,
  p.weight_kg,
  (SELECT visit_date FROM health_records WHERE pet_id = p.id ORDER BY visit_date DESC LIMIT 1) AS last_vet_visit,
  (SELECT COUNT(*) FROM triage_sessions WHERE pet_id = p.id) AS total_triage_sessions
FROM pets p
WHERE p.is_active = TRUE;

-- ============================================================
-- HYBRID SEARCH FUNCTION (BM25 + Vector)
-- ============================================================
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding  VECTOR(1024),
  search_text      TEXT,
  filter_species   TEXT DEFAULT NULL,
  result_limit     INTEGER DEFAULT 5
)
RETURNS TABLE(
  id        UUID,
  title     TEXT,
  content   TEXT,
  score     FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    (0.7 * (1 - (kb.embedding <=> query_embedding)) +
     0.3 * ts_rank(to_tsvector('english', kb.content), plainto_tsquery('english', search_text)))::FLOAT AS score
  FROM knowledge_base kb
  WHERE
    kb.is_active = TRUE
    AND (filter_species IS NULL OR kb.species IN (filter_species, 'both', 'general'))
    AND kb.embedding IS NOT NULL
  ORDER BY score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- End of Schema v1.1 — petVetta
-- ============================================================
