# MedFlow Pro

Plataforma de operacao clinica com agenda, pacientes, onboarding de clinica, booking publico e monitoramento operacional.

## Stack
- React + Vite + TypeScript
- Supabase (Auth, Postgres, Realtime, Edge Functions)
- Tailwind + shadcn/ui

## Rodando localmente
```bash
npm install
npm run dev
```

## Variaveis de ambiente
Use `.env` com:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Banco e funcoes
Migrations e Edge Functions estao em `supabase/`.

Para aplicar migrations no Supabase vinculado:
```bash
supabase db push
```

Para deploy de funcoes:
```bash
supabase functions deploy public-booking
supabase functions deploy process-notifications
```

## Fluxos principais implementados
- Registro, login e onboarding de tenant
- Dashboard operacional com filtros por periodo
- Agenda completa com sincronizacao em tempo real
- Agenda do profissional
- Cadastro de pacientes
- Mensageria interna da equipe
- Booking publico por slug da clinica

## Observacoes
- Envio real via WhatsApp Business API ainda depende da configuracao de credenciais da Meta e ajuste final na funcao `process-notifications`.
