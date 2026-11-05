-- Схема базы (v2: пользователи с ролями). Применяется при старте сервера, идемпотентна.
create table if not exists users (
  id text primary key,
  role text not null check (role in ('student', 'teacher', 'admin')),
  name text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists states (
  student_id text primary key references users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id serial primary key,
  student_id text not null references users(id) on delete cascade,
  exercise_id text not null,
  book text not null,
  html text not null,
  text text not null,
  created_at timestamptz not null default now(),
  review jsonb,
  reviewed_at timestamptz,
  reviewed_by text references users(id) on delete set null
);

create index if not exists submissions_student_idx on submissions (student_id, created_at desc);
create index if not exists submissions_reviewer_idx on submissions (reviewed_by, reviewed_at desc);
create index if not exists submissions_created_idx on submissions (created_at desc);

-- Отчёты клиента о проблемах: журнал последних действий + заметка пользователя.
create table if not exists client_reports (
  id serial primary key,
  user_id text,
  role text,
  note text not null,
  url text not null,
  user_agent text not null,
  build text not null,
  events jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists client_reports_created_idx on client_reports (created_at desc);
