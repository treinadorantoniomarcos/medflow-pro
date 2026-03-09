# Execucao Orquestrada - Squad Super Admin (medflow-pro)

Objetivo: estruturar governanca da plataforma SaaS para gestao de assinantes, billing e operacao multi-tenant.
Escopo: painel `/super-admin`, ciclo de assinatura, cobranca, observabilidade, compliance.
Diretriz: seguranca multitenant > consistencia arquitetural > UX.

## Recap inicial (max 10 linhas)
- Projeto atual ja possui operacao por tenant (clinica).
- Faltava modulo central da plataforma (super admin).
- Stack alvo mantida: Lovable + Supabase + Stripe + jobs/webhooks.
- Regras sensiveis ficam no backend (SQL/Edge), nao no builder visual.
- Entrega abaixo esta pronta para implementacao incremental sem quebrar o que ja existe.

## AGENTE 1 - AIOX-SuperAdmin-Platform-Architect
### Entregaveis
- Modulos do painel super admin:
  - Assinantes
  - Planos e pricing
  - Billing e inadimplencia
  - Saude operacional
  - Auditoria e suporte
- Boundaries:
  - Frontend (Lovable): telas, filtros, visualizacao de dados.
  - Backend (Supabase/Edge): regras de bloqueio, webhook Stripe, conciliacao, auditoria.
- Contratos API v1 (resumo):
  - `GET /v1/super-admin/tenants`
  - `GET /v1/super-admin/tenants/:tenant_id`
  - `PATCH /v1/super-admin/tenants/:tenant_id/status`
  - `GET /v1/super-admin/subscriptions`
  - `POST /v1/super-admin/subscriptions/:id/pause`
  - `POST /v1/super-admin/subscriptions/:id/resume`
  - `GET /v1/super-admin/billing/reconciliation?from&to`
  - `GET /v1/super-admin/audit-logs`
- Anti-quebra v1:
  - Sem renomear campos existentes.
  - Sem mudar semantica de status sem versao nova.
  - Campos novos apenas opcionais.

## HANDOFF
- agente_origem: AIOX-SuperAdmin-Platform-Architect
- entregaveis_prontos: arquitetura modular, boundaries, contratos v1
- decisoes_tomadas: painel central + backend critico em Edge/SQL
- pendencias: detalhar schema de plataforma
- riscos: acoplamento entre billing e bloqueio operacional
- dependencias_para_proximo_agente: modelagem de dados e ciclo de vida
- artefatos_gerados: blueprint super admin v1
- criterio_de_conclusao: APIs e ownership definidos

## Recap para proximo agente (max 10 linhas)
- Painel super admin definido com 5 modulos.
- API v1 congelada para tenants/subscriptions/billing/auditoria.
- Regras sensiveis fora do frontend.
- Proximo passo: modelar ciclo de vida de assinante e feature gating.

## AGENTE 2 - AIOX-Tenant-Lifecycle-Manager
### Entregaveis
- Estados de tenant:
  - `lead -> trialing -> active -> past_due -> grace_period -> suspended -> canceled`
- Regras de transicao:
  - `trialing -> active` quando primeira cobranca confirmada.
  - `active -> past_due` em falha de pagamento.
  - `past_due -> grace_period` com janela configuravel por plano.
  - `grace_period -> suspended` se nao houver regularizacao.
  - `suspended -> active` apos pagamento aprovado.
- Feature gating:
  - Basico: agenda + confirmacao.
  - Pro: automacoes + financeiro + repasse.
  - Signature: tudo + analytics avancado.
- Tabelas-alvo:
  - `platform_tenants`, `tenant_lifecycle_events`, `feature_flags`, `plan_features`.

## HANDOFF
- agente_origem: AIOX-Tenant-Lifecycle-Manager
- entregaveis_prontos: maquina de estados, regras de transicao, gating
- decisoes_tomadas: grace period obrigatorio e suspensao progressiva
- pendencias: integrar eventos Stripe em tempo real
- riscos: bloqueio indevido por atraso de webhook
- dependencias_para_proximo_agente: billing/webhooks/idempotencia
- artefatos_gerados: matriz de ciclo de vida por tenant
- criterio_de_conclusao: estados e gates aplicaveis por plano

## Recap para proximo agente (max 10 linhas)
- Ciclo de vida e gates por plano definidos.
- Evento de pagamento passa a dirigir estado do tenant.
- Foco seguinte: cobranca recorrente, conciliacao e repasse.

## AGENTE 3 - AIOX-Billing-Revenue-Engineer
### Entregaveis
- Integracao Stripe (v1):
  - webhooks: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Idempotencia:
  - tabela `stripe_event_log(event_id unique, processed_at, status)`
- Conciliacao:
  - tabela `billing_ledger` com origem `stripe|manual_adjustment`
  - export CSV por periodo e tenant
- Politica de bloqueio financeiro:
  - sem interromper consulta em andamento
  - bloqueio apenas para novas acoes administrativas quando `suspended`

## HANDOFF
- agente_origem: AIOX-Billing-Revenue-Engineer
- entregaveis_prontos: webhook map, idempotencia, conciliacao
- decisoes_tomadas: falha transitoria nao bloqueia operacao clinica imediata
- pendencias: UI de conciliacao no painel
- riscos: duplicidade de evento sem log unico
- dependencias_para_proximo_agente: playbooks de sucesso do assinante
- artefatos_gerados: contrato de eventos Stripe + ledger
- criterio_de_conclusao: faturamento confiavel e auditavel

## Recap para proximo agente (max 10 linhas)
- Billing recorrente consolidado por eventos Stripe.
- Idempotencia e ledger definidos.
- Proximo: reduzir churn e estruturar atendimento de assinantes.

## AGENTE 4 - AIOX-Subscriber-Success-Agent
### Entregaveis
- Segmentacao operacional:
  - onboarding_risk, adoption_risk, churn_risk, healthy
- Playbooks:
  - D+1 onboarding assistido
  - D+7 ativacao de agenda e automacoes
  - risco de churn com contato proativo
- KPIs de sucesso:
  - ativacao 7 dias, retencao 30 dias, no-show medio, inadimplencia
- Tabela:
  - `subscriber_health_snapshots(tenant_id, score, segment, reasons, created_at)`

## HANDOFF
- agente_origem: AIOX-Subscriber-Success-Agent
- entregaveis_prontos: segmentacao, playbooks, kpis de sucesso
- decisoes_tomadas: health score semanal por tenant
- pendencias: disparos automatizados por segmento
- riscos: baixa acao operacional sem responsavel por conta
- dependencias_para_proximo_agente: observabilidade e alertas
- artefatos_gerados: matriz de saude da base de assinantes
- criterio_de_conclusao: operacao de sucesso repetivel por tenant

## Recap para proximo agente (max 10 linhas)
- Saude da base modelada com score e segmentos.
- Playbooks de retencao definidos.
- Proximo: monitoramento e alertas do negocio SaaS.

## AGENTE 5 - AIOX-Platform-Observability-Agent
### Entregaveis
- Catalogo de metricas plataforma:
  - MRR, ARR, churn logo, churn receita, LTV proxy, inadimplencia, uptime por tenant
- Alertas:
  - `inadimplencia > X%` por carteira
  - `queda de confirmacao D-1` por tenant
  - `falhas webhook Stripe` acima de limiar
- Paineis:
  - visao executiva global
  - visao por tenant
- Logs imutaveis:
  - acao super admin, mudanca de plano, bloqueio/desbloqueio, ajuste financeiro

## HANDOFF
- agente_origem: AIOX-Platform-Observability-Agent
- entregaveis_prontos: metricas, alertas, paineis, logs criticos
- decisoes_tomadas: separacao visao global x visao por tenant
- pendencias: tunning de thresholds apos 2 semanas de dado real
- riscos: alert fatigue por limiar mal calibrado
- dependencias_para_proximo_agente: compliance e governanca de acesso
- artefatos_gerados: catalogo de observabilidade da plataforma
- criterio_de_conclusao: monitoramento acionavel para operacao semanal

## Recap para proximo agente (max 10 linhas)
- Observabilidade global pronta.
- Alertas e paineis definidos.
- Falta fechar compliance e controles de acesso sensiveis.

## AGENTE 6 - AIOX-Security-Compliance-Guardian
### Entregaveis
- Modelo de permissao super admin:
  - `platform_owner`, `platform_admin`, `platform_analyst`, `platform_support`
- Regras criticas:
  - acesso cross-tenant somente para papeis plataforma
  - toda acao sensivel em `platform_audit_logs`
- LGPD:
  - minimizacao de dados no painel central
  - trilha de consentimento e politica de retencao
- Checklist de seguranca:
  - teste de isolamento tenant
  - teste de elevacao de privilegio
  - teste de acesso a dados financeiros

## HANDOFF
- agente_origem: AIOX-Security-Compliance-Guardian
- entregaveis_prontos: RBAC plataforma, auditoria, checklist LGPD
- decisoes_tomadas: menor privilegio e auditoria obrigatoria
- pendencias: executar pentest interno pre-piloto
- riscos: permissao excessiva em consultas ad hoc
- dependencias_para_proximo_agente: execucao tecnica das migracoes/APIs/UI
- artefatos_gerados: baseline de compliance e seguranca
- criterio_de_conclusao: governanca e rastreabilidade completas

---

## Consolidado Final

### 1) Resumo executivo
Foi orquestrado um squad de 6 agentes para criar o pacote super admin da plataforma. A saida cobre arquitetura, ciclo de assinaturas, billing recorrente, sucesso do assinante, observabilidade e compliance.

### 2) Entregaveis por agente (checklist)
- [x] Arquitetura e API v1 super admin
- [x] Maquina de estados do tenant e gating por plano
- [x] Stripe webhook + idempotencia + ledger
- [x] Playbooks de sucesso e health score
- [x] KPIs globais + alertas operacionais
- [x] RBAC plataforma + auditoria + LGPD

### 3) Matriz final de dependencias
- Arquitetura -> Dados ciclo tenant -> Billing -> Success -> Observability -> Compliance
- Billing depende de contratos API e estados de tenant.
- Alertas dependem de ledger e snapshots de saude.
- Compliance depende de todos os modulos para trilha completa.

### 4) Riscos e mitigacoes
- Webhook atrasado/duplicado: idempotencia por `event_id` e reprocessamento seguro.
- Bloqueio indevido por atraso de pagamento: grace period + bloqueio progressivo.
- Vazamento cross-tenant: policies estritas + papeis de plataforma segregados.
- Operacao sem acao: playbooks com owner por carteira.

### 5) Build order tecnica validada para piloto
1. Migracoes plataforma (`platform_tenants`, `tenant_lifecycle_events`, `stripe_event_log`, `billing_ledger`, `platform_audit_logs`).
2. Edge functions de webhook Stripe + reconciliacao.
3. API super admin v1.
4. UI `/super-admin` (tenants, subscriptions, billing, audit).
5. Paineis e alertas.
6. Suite QA: RBAC, billing events, bloqueio/desbloqueio, isolamento tenant.

### 6) Definicao objetiva de pronto para piloto
- API v1 super admin publicada.
- Webhooks Stripe processando com idempotencia comprovada.
- Fluxo `active -> past_due -> grace_period -> suspended -> active` testado.
- Painel `/super-admin` funcional para gestao de assinantes.
- Logs de auditoria e testes de isolamento tenant aprovados.
