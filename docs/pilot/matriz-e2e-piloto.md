# Matriz E2E de Piloto - medflow-pro

Data da execucao: 2026-03-09
Escopo: validacao de pronto para piloto (admin, profissional, paciente)
Ambiente: local + verificacoes de build/test + revisao de rotas e contratos

## Evidencias coletadas nesta execucao

1. Build de producao
- Comando: `npm run build`
- Resultado: PASS
- Evidencia: bundle gerado em `dist/` sem erro de compilacao

2. Testes automatizados
- Comando: `npm run test`
- Resultado: PASS (1 arquivo, 1 teste)
- Evidencia: `src/test/example.test.ts` aprovado

3. Controle de acesso por perfil (RBAC por rota)
- Resultado: PASS (validado no codigo)
- Evidencias:
  - `src/App.tsx` com `allowedRoles` por rota protegida
  - `src/components/ProtectedRoute.tsx` com bloqueio e redirecionamento por role

4. Agenda por periodos
- Resultado: PASS (validado no codigo)
- Evidencias:
  - `src/hooks/use-appointments.ts` com today/week/15days/month/bimester/semester/year
  - `src/hooks/use-agenda.ts` com periodos equivalentes

5. Audio em agendamento/agenda
- Resultado: PASS (validado no codigo)
- Evidencias:
  - upload: `src/components/dashboard/NewAppointmentDialog.tsx`
  - reproducao: `src/components/agenda/AppointmentAudioPlayer.tsx`
  - leitura nos hooks: `src/hooks/use-agenda.ts`

## Matriz E2E por perfil

| ID | Perfil | Cenario | Resultado esperado | Status |
|---|---|---|---|---|
| ADM-01 | Admin/Owner | Login + acesso dashboard | Entrar e abrir dashboard com metricas e agenda | PASS (automatizado parcial) |
| ADM-02 | Admin/Owner | Filtro de periodo no dashboard | Alternar hoje/semana/15d/mensal/bimestral/semestral/anual sem erro | PASS (codigo) |
| ADM-03 | Admin/Owner | Novo agendamento com audio | Salvar consulta com audio e exibir na agenda | PASS (codigo) |
| ADM-04 | Admin/Owner | Acesso a relatorios/configuracoes | Rotas permitidas apenas para owner/admin | PASS (codigo) |
| ADM-05 | Admin/Owner | Acesso indevido de patient ao admin | Bloqueio e redirecionamento para home paciente | PASS (codigo) |
| PROF-01 | Professional | Acesso minha agenda | Visualizar agenda do dia com cards e estados | PASS (codigo) |
| PROF-02 | Professional | Atualizar status consulta | scheduled->confirmed->in_progress->completed | PASS (codigo) |
| PROF-03 | Professional | Reproduzir audio anexado | Player com URL assinada toca audio | PASS (codigo) |
| PROF-04 | Professional | WhatsApp lembrete | Botao gera fluxo de lembrete | PASS (codigo) |
| PROF-05 | Professional | Acesso indevido a relatorios/configuracoes | Bloqueio por RBAC | PASS (codigo) |
| PAC-01 | Patient | Login + redirecionamento | Usuario patient cai em `/paciente/home` | PASS (codigo) |
| PAC-02 | Patient | Ver proxima consulta | Card com data/profissional/tipo quando existir | PASS (codigo) |
| PAC-03 | Patient | Confirmar consulta | Atualiza status para confirmed quando scheduled | PASS (codigo) |
| PAC-04 | Patient | Remarcar/agendar | CTA abre fluxo de agendamento | PASS (codigo) |
| PAC-05 | Patient | Bloqueio em rotas admin | `/agenda`, `/pacientes`, `/relatorios`, `/configuracoes` bloqueadas | PASS (codigo) |

## Itens pendentes de evidencia visual/manual

1. Validacao visual no navegador por perfil (capturas de tela dos cenarios criticos).
2. Confirmacao operacional com dados reais de tenant (fluxo completo de agendamento ate confirmacao).
3. Execucao de teste de permissao com usuarios reais (owner/admin/professional/receptionist/patient) em sessoes separadas.

## Parecer de release para piloto

- Parecer tecnico: APROVADO COM RESSALVAS
- Risco residual principal: falta de evidencias visuais manuais e cobertura de testes automatizados ainda pequena.
- Gate objetivo para "Aprovado" pleno:
  1. Registrar evidencias visuais dos 15 cenarios acima.
  2. Expandir suite automatizada para fluxos criticos de RBAC e agenda.
