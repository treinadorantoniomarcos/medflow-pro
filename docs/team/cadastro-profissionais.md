# Cadastro de Profissionais pela Interface

Fluxo implementado:
- Tela: `Configuracoes > Equipe Profissional`
- Botao: `Novo profissional`
- Acao: envia convite por e-mail e vincula perfil/role no tenant atual

Arquivos principais:
- `src/components/settings/TeamManagement.tsx`
- `supabase/functions/invite-team-member/index.ts`

## Requisitos para funcionar
1. Edge Function publicada no Supabase.
2. Usuario logado com role `owner` ou `admin`.
3. Auth e tabelas `profiles`/`user_roles` operacionais.

## Deploy da Edge Function
No projeto local:

```bash
npx supabase functions deploy invite-team-member --project-ref gnuxxdmznxukrbtaaxuu
```

Opcional (teste local):

```bash
npx supabase functions serve invite-team-member
```

## Comportamento de seguranca
- Nao permite convite por usuarios sem permissao.
- Nao permite vincular usuario de outro tenant.
- Registra auditoria em `audit_logs` com acao `invite_team_member`.
