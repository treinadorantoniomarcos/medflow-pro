# Prompt Mestre - Lovable + Supabase (Aplicacao do pacote local)

Copie e cole no Lovable exatamente como abaixo:

```txt
Aplique no projeto medflow-pro exatamente as alteracoes abaixo, sem mudar escopo.

OBJETIVO
- Sincronizar frontend/backend ja preparados localmente.
- Publicar migrations e Edge Functions no Supabase.
- Validar fluxo de pacote/assinatura/super-admin ponta a ponta.

============================
1) GIT SYNC
============================
- Garanta que o branch main esteja no commit mais recente do GitHub.
- Repositorio: https://github.com/treinadorantoniomarcos/medflow-pro.git
- Nao sobrescrever arquivos fora das alteracoes desta task.

============================
2) MIGRATIONS SUPABASE
============================
- Aplicar migration:
  - supabase/migrations/20260311153000_subscription_plans.sql

Resultados esperados:
- tabela public.subscription_plans criada
- RLS habilitado
- policies para super_admin (select + manage)
- trigger updated_at ativo
- seeds: start, pro, signature, courtesy

============================
3) EDGE FUNCTIONS
============================
Publicar as funcoes:
- supabase/functions/super-admin-access/index.ts
- supabase/functions/process-notifications/index.ts (republicar garantindo versao atual)

Configurar secrets/variaveis da function process-notifications:
- WHATSAPP_TOKEN
- WHATSAPP_PHONE_NUMBER_ID

Validar que super-admin-access aceita:
- action=grant_access
- action=set_access_status
- action=revoke_access

E que exige role super_admin obrigatoriamente.

============================
4) FRONTEND SYNC (arquivos obrigatorios)
============================
- src/pages/Onboarding.tsx
- src/pages/SuperAdminDashboard.tsx
- src/components/superadmin/PlanCatalogManager.tsx
- src/components/ProtectedRoute.tsx
- src/integrations/supabase/types.ts

Regras:
- Nao remover funcionalidades existentes.
- Preservar visual e componentes atuais.

============================
5) CHECKLIST FUNCIONAL OBRIGATORIO
============================
5.1 Super Admin
- Consegue criar pacote
- Consegue editar valor mensal
- Consegue alterar periodo em dias
- Consegue marcar/desmarcar cortesia
- Consegue liberar/bloquear pacote
- Consegue excluir pacote
- Consegue liberar admin por assinante
- Consegue liberar super_admin
- Consegue revogar/desativar acesso

5.2 Onboarding
- Lista pacotes ativos de subscription_plans
- Exige pagamento da primeira mensalidade antes de finalizar
- Grava subscription no settings da clinica

5.3 Gate de acesso
- status paused/canceled bloqueia rotas protegidas de operacao
- super_admin nao sofre bloqueio operacional por status do tenant

5.4 Notificacoes
- process-notifications executa sem erro
- lembretes D-1 e H-2 continuam enfileirando e enviando por app/whatsapp

============================
6) SAIDA OBRIGATORIA
============================
Entregar no final:
- migrations aplicadas (com nome)
- functions publicadas
- variaveis de ambiente configuradas (apenas nomes, sem expor valores)
- evidencias de cada item do checklist
- pendencias restantes (se houver)
- acoes corretivas sugeridas
```
