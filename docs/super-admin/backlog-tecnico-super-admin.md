# Backlog Tecnico Implementavel - Super Admin (medflow-pro)

Base: `docs/super-admin/execucao-squad-super-admin.md`
Objetivo: transformar o plano em execucao concreta (issues + PR order + criterios de aceite)

## Regras de execucao
- Prioridade de decisao: seguranca multitenant > consistencia arquitetural > UX
- Nao quebrar API atual da operacao clinica
- Toda alteracao sensivel deve gerar `platform_audit_logs`

## Macro roadmap (sprints)
- Sprint 1: Fundacao de dados e RBAC plataforma
- Sprint 2: Billing Stripe + ciclo de vida do tenant
- Sprint 3: Painel `/super-admin` MVP
- Sprint 4: Observabilidade, alertas e hardening pre-piloto

## Backlog por epic

### EPIC 1 - Fundacao de Plataforma

#### ISSUE SA-001 - Criar schema base super admin
Tipo: backend/db
Prioridade: P0
Dependencias: nenhuma
Escopo:
- criar tabelas: `platform_tenants`, `tenant_lifecycle_events`, `feature_flags`, `plan_features`, `platform_audit_logs`
- criar indices por `tenant_id`, `status`, `updated_at`
Criterios de aceite:
- migracao sobe em ambiente limpo
- rollback executa sem erro
- constraints e enums validos
Teste:
- migracao apply/revert em ambiente local

#### ISSUE SA-002 - RBAC de plataforma (cross-tenant controlado)
Tipo: backend/security
Prioridade: P0
Dependencias: SA-001
Escopo:
- papeis: `platform_owner`, `platform_admin`, `platform_analyst`, `platform_support`
- policies para leitura/escrita por papel
- negar acesso cross-tenant para papeis nao plataforma
Criterios de aceite:
- usuario tenant comum nao consulta dados globais
- `platform_admin` consulta e opera tenant status
- toda negacao retorna erro padrao autorizado
Teste:
- suite permitido/negado por papel

#### ISSUE SA-003 - Auditoria imutavel de acoes plataforma
Tipo: backend/compliance
Prioridade: P0
Dependencias: SA-001
Escopo:
- trigger/fn para registrar mudancas sensiveis
- logar actor, before/after, timestamp, origem
Criterios de aceite:
- mudar status de tenant gera log
- pausa/retomada de assinatura gera log
Teste:
- validar 3 eventos sensiveis com log correspondente

### EPIC 2 - Billing e Ciclo de Assinatura

#### ISSUE SA-004 - Integrar webhook Stripe com idempotencia
Tipo: backend/integration
Prioridade: P0
Dependencias: SA-001, SA-002
Escopo:
- endpoint webhook Stripe
- tabela `stripe_event_log` com `event_id` unico
- eventos: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
Criterios de aceite:
- evento duplicado nao reprocessa
- evento valido atualiza estado interno
Teste:
- replay do mesmo evento 2x com 1 processamento efetivo

#### ISSUE SA-005 - Implementar maquina de estados de tenant
Tipo: backend/domain
Prioridade: P0
Dependencias: SA-004
Escopo:
- estados: `lead`, `trialing`, `active`, `past_due`, `grace_period`, `suspended`, `canceled`
- regras de transicao com validacao
Criterios de aceite:
- transicao invalida bloqueada
- transicoes validas registradas em `tenant_lifecycle_events`
Teste:
- cobertura de todas as transicoes permitidas/proibidas

#### ISSUE SA-006 - Feature gating por plano
Tipo: backend/domain
Prioridade: P1
Dependencias: SA-005
Escopo:
- mapear features por plano (Start/Pro/Signature)
- expor endpoint de features efetivas por tenant
Criterios de aceite:
- tenant suspended perde features administrativas nao criticas
- operacao clinica em andamento nao interrompida
Teste:
- matriz de features por plano/status

#### ISSUE SA-007 - Ledger e conciliacao financeira
Tipo: backend/finance
Prioridade: P1
Dependencias: SA-004
Escopo:
- tabela `billing_ledger`
- visao de conciliacao por periodo/tenant
- exportacao CSV
Criterios de aceite:
- reconciliacao bate com eventos Stripe
- CSV exporta sem perder colunas obrigatorias
Teste:
- validacao cruzada de 10 eventos simulados

### EPIC 3 - API v1 Super Admin

#### ISSUE SA-008 - Publicar endpoints v1 super admin
Tipo: backend/api
Prioridade: P0
Dependencias: SA-005, SA-006, SA-007
Escopo:
- `GET /v1/super-admin/tenants`
- `GET /v1/super-admin/tenants/:tenant_id`
- `PATCH /v1/super-admin/tenants/:tenant_id/status`
- `GET /v1/super-admin/subscriptions`
- `POST /v1/super-admin/subscriptions/:id/pause`
- `POST /v1/super-admin/subscriptions/:id/resume`
- `GET /v1/super-admin/billing/reconciliation`
- `GET /v1/super-admin/audit-logs`
Criterios de aceite:
- contrato padrao de erro
- endpoints sensiveis exigem papel plataforma
Teste:
- teste de contrato para sucesso e erro

### EPIC 4 - Frontend `/super-admin` MVP

#### ISSUE SA-009 - Criar shell do painel super admin
Tipo: frontend
Prioridade: P1
Dependencias: SA-008
Escopo:
- rota protegida `/super-admin`
- layout com menu: tenants, assinaturas, billing, auditoria
Criterios de aceite:
- somente papeis plataforma acessam rota
- navegacao funciona em desktop e mobile
Teste:
- smoke de navegacao

#### ISSUE SA-010 - Tela de assinantes (tenants)
Tipo: frontend
Prioridade: P1
Dependencias: SA-009
Escopo:
- tabela com filtros por status/plano
- detalhe do tenant
- acao de bloqueio/desbloqueio
Criterios de aceite:
- mudanca de status atualiza UI e log de auditoria
Teste:
- fluxo completo de troca de status

#### ISSUE SA-011 - Tela de billing e conciliacao
Tipo: frontend
Prioridade: P1
Dependencias: SA-009, SA-007
Escopo:
- lista de eventos financeiros
- resumo por periodo
- exportacao CSV
Criterios de aceite:
- totais batem com API
- exportacao funciona
Teste:
- regressao da tela com periodo grande

#### ISSUE SA-012 - Tela de auditoria de plataforma
Tipo: frontend
Prioridade: P1
Dependencias: SA-009, SA-003
Escopo:
- timeline de acoes sensiveis
- filtros por ator/tenant/acao/data
Criterios de aceite:
- consulta paginada sem timeout
Teste:
- consulta com massa de dados simulada

### EPIC 5 - Observabilidade e Hardening

#### ISSUE SA-013 - Catalogo de metricas SaaS + paineis
Tipo: observability
Prioridade: P1
Dependencias: SA-007
Escopo:
- MRR, churn, inadimplencia, uptime por tenant
- painel global e por tenant
Criterios de aceite:
- metricas atualizam diariamente
Teste:
- consistencia de 7 dias de snapshot

#### ISSUE SA-014 - Alertas operacionais plataforma
Tipo: observability
Prioridade: P1
Dependencias: SA-013
Escopo:
- alertas para webhook falho, inadimplencia alta, queda de confirmacao
Criterios de aceite:
- alerta dispara e gera acao recomendada
Teste:
- simulacao de 3 cenarios de alerta

#### ISSUE SA-015 - Gate de release pre-piloto
Tipo: qa/release
Prioridade: P0
Dependencias: SA-001..SA-014
Escopo:
- regressao de RBAC, billing, ciclo tenant, UI super admin
- parecer final: aprovado/aprovado com ressalvas/bloqueado
Criterios de aceite:
- sem bug bloqueante aberto
- evidencias anexadas por cenario
Teste:
- plano E2E completo por papel plataforma

## Ordem de PRs (build order)
1. PR-01: SA-001 + SA-002 + SA-003 (schema + RBAC + auditoria)
2. PR-02: SA-004 + SA-005 (Stripe webhook + lifecycle)
3. PR-03: SA-006 + SA-007 (feature gating + ledger/conciliacao)
4. PR-04: SA-008 (API v1 super admin)
5. PR-05: SA-009 + SA-010 (shell + assinantes)
6. PR-06: SA-011 + SA-012 (billing + auditoria UI)
7. PR-07: SA-013 + SA-014 (observabilidade + alertas)
8. PR-08: SA-015 (QA gate de release)

## Definicao de pronto (DoD) por issue
- codigo em branch dedicada
- migracoes revisadas e versionadas
- testes minimos passando
- evidencias de comportamento esperado
- documentacao atualizada em `docs/super-admin/`

## Checklist de abertura no GitHub Projects
- [ ] criar labels: `super-admin`, `billing`, `rbac`, `observability`, `qa-gate`
- [ ] criar milestone: `Super Admin MVP`
- [ ] cadastrar SA-001..SA-015 como issues
- [ ] vincular PRs a issues (closes #...)
- [ ] acompanhar burnup por sprint
