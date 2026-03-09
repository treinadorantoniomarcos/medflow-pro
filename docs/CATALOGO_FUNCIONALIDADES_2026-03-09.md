# Catalogo de Funcionalidades - MedFlow Pro

Data de referencia: 09/03/2026

## 1) Autenticacao e Acesso
- Login por email/senha
- Login social (Google)
- Registro de conta
- Recuperacao e reset de senha
- Onboarding inicial de tenant
- Controle de acesso por papeis (RBAC)

## 2) Perfis e Permissoes
- `patient`
- `professional`
- `receptionist`
- `admin`
- `owner`
- `super_admin`

## 3) Dashboard Operacional (Tenant)
- Cards de KPIs (consultas, pendencias, confirmadas, etc.)
- Filtros de periodo: hoje, semana, 15 dias, mensal, bimestral, semestral e anual
- Lista de agenda por status

## 4) Agenda Administrativa
- Visao de agenda por periodo
- Acesso para owner/admin/recepcao
- Atualizacao em tempo real (Realtime)

## 5) Agenda Profissional (Minha Agenda)
- Visao diaria por profissional
- Mudanca de status de consulta (scheduled -> confirmed -> in_progress -> completed)
- Envio de lembrete por WhatsApp
- Toggle de agenda geral aberta/fechada
- Controle granular por slot (dia + horario)
- Bloqueio em massa por periodo (inicio/fim/motivo)
- Lista e remocao de bloqueios de periodo
- Gestao compartilhada: admin/owner podem gerenciar agenda dos profissionais

## 6) Agendamento Publico (`/agendar/:slug`)
- Selecao de profissional
- Selecao de data e horario
- Cadastro de paciente (nome, WhatsApp, CPF)
- Confirmacao de agendamento
- Gera comprovante (impressao/compartilhamento)
- Regras de indisponibilidade:
  - profissional com agenda geral fechada
  - slot fechado por override
  - periodo bloqueado (ferias, almoco, evento)
  - slot ja ocupado

## 7) Pacientes
- Cadastro e listagem
- Detalhamento de dados
- Vinculo ao tenant

## 8) Mensageria
- Canal interno da equipe por tenant
- Realtime para novas mensagens

## 9) Notificacoes e Lembretes
- Fila de notificacoes (`notifications_queue`)
- Canais: app e WhatsApp
- Templates de lembrete:
  - D-1 (24h antes)
  - H-2 (2h antes)
- Conteudo inclui tipo de consulta:
  - primeira consulta
  - retorno
  - entrega de exames
- Anti-duplicidade e status da fila (pending/ready/sent/failed)

## 10) Configuracoes da Clinica
- Link de agendamento publico por slug
- QR Code para divulgacao
- Compartilhamento (WhatsApp, e-mail, nativo)
- Preferencias de lembretes
- Gestao da equipe (convites e papeis)

## 11) Relatorios
- Consultas por dia
- Distribuicao por status
- Consultas por profissional
- Exportacao CSV e PDF

## 12) Super Admin (`/super-admin`)
- Dashboard global de assinantes (clinicas)
- KPIs de plataforma
- Graficos de tendencia e top assinantes
- Tabela detalhada por assinante
- Exportacoes: PDF, XLS, DOC e CSV
- Bloco de apps de gestao (integracoes operacionais)

## 13) Auditoria e Seguranca
- RLS por tenant
- Isolamento multitenant com `tenant_id`
- Policies para perfis administrativos e super admin
- Trilha de logs e tabelas sensiveis protegidas

## 14) Edge Functions Ativas
- `public-booking`
- `process-notifications`
- `invite-team-member`
- `manage-team-member`

## 15) Dependencias para Ambiente Produtivo
- Aplicar migrations SQL no Supabase remoto
- Publicar edge functions no Supabase remoto
- Configurar secrets de WhatsApp para envio real
- Homologar fluxos E2E por perfil
