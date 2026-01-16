alter table "public"."agenda_services" add column if not exists "prepayment_strategy" text default 'none' check (prepayment_strategy in ('none', 'full', 'fixed'));
alter table "public"."agenda_services" add column if not exists "prepayment_amount" integer default 0; -- In minor units
