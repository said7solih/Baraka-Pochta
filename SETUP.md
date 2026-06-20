# Baraka Pochta — Настройка

## 1. Создать Supabase проект

1. Зайти на supabase.com → New Project
2. Скопировать **Project URL** и **anon public key** из Settings → API

## 2. Настроить .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Запустить SQL-миграцию

В Supabase → SQL Editor выполнить содержимое файла:
`supabase/migrations/001_initial_schema.sql`

## 4. Настроить Phone Auth в Supabase

Authentication → Providers → Phone → Enable
(Для тестирования можно включить "Disable phone confirmations")

## 5. Создать первого owner-пользователя

После входа по телефону выполнить в SQL Editor:
```sql
insert into user_roles (user_id, role)
values ('<uuid из auth.users>', 'owner');
```

## 6. Деплой на Vercel

```bash
vercel --prod
```
Добавить переменные окружения в Vercel Dashboard.

## Структура ролей

| Роль     | Вход           | Доступ                                    |
|----------|----------------|-------------------------------------------|
| owner    | Телефон + OTP  | Всё: аналитика, расходы, сотрудники       |
| employee | Телефон + OTP  | Накладные, приход, клиенты (без финансов) |
| client   | Код + Телефон + OTP | Только свои посылки                  |
