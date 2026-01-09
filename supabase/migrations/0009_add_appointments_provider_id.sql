alter table "public"."agenda_appointments" add column "provider_id" uuid references "public"."agenda_providers"("id") on delete set null;

create index "idx_agenda_appointments_provider_id" on "public"."agenda_appointments"("provider_id");
