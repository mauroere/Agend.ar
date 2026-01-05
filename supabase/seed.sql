insert into
    public.tenants (id, name)
values (
        '11111111-1111-1111-1111-111111111111',
        'Clínica Demo'
    ) on conflict (id) do nothing;

insert into public.locations (id, tenant_id, name, address, timezone, business_hours, default_duration)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Recoleta',
  'Av. Santa Fe 1234',
  'America/Argentina/Buenos_Aires',
  '{"mon": [["09:00","18:00"]], "tue": [["09:00","18:00"]], "wed": [["09:00","18:00"]], "thu": [["09:00","18:00"]], "fri": [["09:00","18:00"]]}'::jsonb,
  30
)
on conflict (id) do nothing;

insert into
    public.patients (
        id,
        tenant_id,
        full_name,
        phone_e164
    )
values (
        '33333333-3333-3333-3333-333333333331',
        '11111111-1111-1111-1111-111111111111',
        'María Pérez',
        '+549111111111'
    ),
    (
        '33333333-3333-3333-3333-333333333332',
        '11111111-1111-1111-1111-111111111111',
        'Julián Díaz',
        '+549122222222'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'Lucía Gómez',
        '+549133333333'
    ) on conflict (id) do nothing;

insert into
    public.appointments (
        id,
        tenant_id,
        location_id,
        patient_id,
        start_at,
        end_at,
        status,
        service_name
    )
values (
        '44444444-4444-4444-4444-444444444441',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333331',
        now() + interval '1 day',
        now() + interval '1 day' + interval '30 minutes',
        'pending',
        'Consulta'
    ),
    (
        '44444444-4444-4444-4444-444444444442',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333332',
        now() + interval '2 days',
        now() + interval '2 days' + interval '30 minutes',
        'confirmed',
        'Sesión'
    ),
    (
        '44444444-4444-4444-4444-444444444443',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        now() + interval '3 days',
        now() + interval '3 days' + interval '30 minutes',
        'confirmed',
        'Control'
    ) on conflict (id) do nothing;