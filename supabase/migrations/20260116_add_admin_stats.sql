-- Add subscription/status fields to tenants for Admin Dashboard
ALTER TABLE "public"."agenda_tenants" 
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
ADD COLUMN IF NOT EXISTS "subscription_amount" integer DEFAULT 0;
-- Monthly value in cents/units

-- Admin Notes table for the dashboard
CREATE TABLE IF NOT EXISTS "public"."admin_dashboard_notes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" text NOT NULL,
    "updated_at" timestamptz DEFAULT now(),
    "updated_by" uuid REFERENCES auth.users(id)
);

-- Enable RLS (though service role bypasses it, good practice)
ALTER TABLE "public"."admin_dashboard_notes" ENABLE ROW LEVEL SECURITY;

-- Policy: Only platform admins can read/write (assuming we have a way to check,
-- but since this is admin-only panel typically strictly gated by app logic,
-- and service_role uses bypass, we might leave it closed to public)