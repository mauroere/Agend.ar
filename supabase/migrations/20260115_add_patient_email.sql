alter table "public"."agenda_patients" add column if not exists "email" text;

create index if not exists "idx_agenda_patients_email" on "public"."agenda_patients" using btree ("tenant_id", "email");
