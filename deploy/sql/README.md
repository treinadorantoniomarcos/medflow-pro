# SQL para aplicacao manual no Supabase

Esta pasta centraliza scripts SQL prontos para execucao manual no SQL Editor do Supabase.

Arquivos:
- 20260309173000_super_admin_support.sql: adiciona role `super_admin` e policies RLS globais de leitura/gestao.
- 20260309193000_professional_slot_overrides.sql: cria controle de disponibilidade por slot (dia + horario) por profissional, com gestao por admin/owner e proprio profissional.

Como usar:
1. Abra o projeto no Supabase Dashboard.
2. Va em SQL Editor > New query.
3. Copie e execute o conteudo do arquivo desejado.
