-- Medical Records / Consultations
-- Stores the clinical data of an appointment
create table if not exists public.agenda_medical_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null references public.agenda_appointments(id) on delete cascade,
  patient_id uuid not null references public.agenda_patients(id),
  provider_id uuid references public.agenda_providers(id), -- Vital to know WHO attended
  
  -- Clinical Data
  anamnesis text, -- "Anamnesis" / Subjective
  diagnosis text, -- "Diagnosis" / Objective
  treatment text, -- "Treatment" / Plan
  notes text,     -- General observations
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Attachments (Photos/Files) for Medical Records
create table if not exists public.agenda_medical_attachments (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.agenda_medical_records(id) on delete cascade,
  file_url text not null,
  file_type text, -- 'image/jpeg', 'application/pdf', etc.
  file_name text,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists agenda_medical_records_appt_idx on public.agenda_medical_records(appointment_id);
create index if not exists agenda_medical_records_patient_idx on public.agenda_medical_records(patient_id);
create index if not exists agenda_medical_attachments_record_idx on public.agenda_medical_attachments(record_id);

-- Storage bucket for medical records needs to be created via Supabase API or dashboard usually, 
-- but we can't create buckets via SQL easily in standard Postgres without Supabase extensions.
-- We assumes 'medical-records' bucket exists or we use existing 'avatars' (bad practice).
-- Ideally user must create 'medical-files' bucket.
