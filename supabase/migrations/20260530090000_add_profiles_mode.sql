-- Add `mode` to profiles for the Mode system (multi-profession CRM).
alter table public.profiles
  add column if not exists mode text not null default 'network_marketing';

comment on column public.profiles.mode is 'Active app Mode: network_marketing | content_creator | founder';
