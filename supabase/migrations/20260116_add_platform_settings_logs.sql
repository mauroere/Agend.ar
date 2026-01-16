-- Platform Settings Table
CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" text PRIMARY KEY,
    "value" jsonb NOT NULL,
    "description" text,
    "updated_at" timestamptz DEFAULT now(),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- Platform Logs Table
CREATE TABLE IF NOT EXISTS "public"."platform_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "level" text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
    "source" text NOT NULL,
    "message" text NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."platform_logs" ENABLE ROW LEVEL SECURITY;

-- Seed default settings
INSERT INTO "public"."platform_settings" ("key", "value", "description")
VALUES 
    ('maintenance_mode', 'false', 'Si es true, impide el acceso a todos los usuarios excepto admins'),
    ('allow_registrations', 'true', 'Permite el registro de nuevos tenants'),
    ('default_trial_days', '14', 'Días de prueba para nuevos tenants')
ON CONFLICT ("key") DO NOTHING;
