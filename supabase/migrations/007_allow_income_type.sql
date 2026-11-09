-- Migración 007: Permitir tipo de movimiento INCOME (Ingresos para finanzas personales y grupos individuales)
alter table public.movements drop constraint if exists movements_type_check;
alter table public.movements add constraint movements_type_check
  check (type in ('SHARED_EXPENSE', 'INDIVIDUAL_EXPENSE', 'LOAN', 'SETTLEMENT', 'INCOME'));
