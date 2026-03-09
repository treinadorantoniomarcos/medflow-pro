# Auth Hardening - Supabase

Objetivo: aplicar configuracoes de seguranca recomendadas para autenticacao.

## Escopo
- Projeto: `medflow-pro`
- Contexto: configuracoes de Auth no painel Supabase (nao sao migrations SQL)

## Checklist obrigatorio para piloto
1. Ativar `Leaked password protection` no Supabase Auth.
2. Ativar `Secure password change` (reconfirmacao de sessao para troca de senha sensivel).
3. Revisar expiracao de link de recuperacao de senha (tempo curto e seguro).
4. Validar templates de e-mail de recuperacao com dominio oficial.
5. Confirmar que provedores OAuth nao habilitados permanecem desativados.

## Caminho no painel (pode variar por versao da UI)
1. Abrir projeto no Supabase.
2. Ir em `Authentication`.
3. Abrir secao de seguranca de senha.
4. Habilitar protecao contra senha vazada.
5. Salvar e testar fluxo de cadastro e reset.

## Evidencia minima esperada
- Captura de tela da opcao ativada.
- Registro do teste:
  - cadastro com senha fraca bloqueado
  - reset com senha fora da politica bloqueado
  - cadastro/reset com senha forte aprovado

## Complemento implementado no frontend
- Politica de senha forte no cadastro e reset:
  - minimo 12 caracteres
  - maiuscula, minuscula, numero e simbolo
  - sem espacos
  - sem parte local do e-mail (no cadastro)
