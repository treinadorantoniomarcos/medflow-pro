# Catalogo de Funcionalidades - MedFlux Pro

Data de referencia: 26/03/2026

Este documento consolida as funcionalidades atualmente presentes na plataforma MedFlux Pro, cobrindo a experiencia publica, o fluxo de assinatura, a operacao da clinica, o painel do paciente e as rotinas de super-admin.

## 1. Visao geral da plataforma

O MedFlux Pro e uma plataforma SaaS multitenant para clinicas, consultorios e profissionais de saude.

Principais objetivos:
- organizar a agenda da clinica e dos profissionais;
- reduzir faltas e melhorar a confirmacao de consultas;
- centralizar pacientes, mensagens, notificacoes e relatorios;
- permitir gestao comercial de planos, trials, checkouts e afiliados;
- oferecer um super-admin com visao global da operacao da plataforma.

## 2. Perfis de acesso

Perfis atualmente suportados:
- `patient`
- `professional`
- `receptionist`
- `admin`
- `owner`
- `super_admin`

Regras gerais:
- cada tenant possui isolamento por `tenant_id`;
- as rotas e menus sao protegidos por perfil;
- o super-admin possui visao global da plataforma;
- pacientes acessam a area propria com experiencia reduzida e orientada.

## 3. Autenticacao e conta

Funcionalidades de acesso:
- login com email e senha;
- login social com Google;
- cadastro de nova conta;
- recuperacao de senha;
- redefinicao de senha;
- redirecionamento automatico para onboarding quando necessario;
- controle de acesso por perfil e tenant.

Fluxos publicos relacionados:
- `/login`
- `/register`
- `/degustacao`
- `/forgot-password`
- `/reset-password`
- `/onboarding`

## 4. Area comercial e funil de conversao

A plataforma possui um funil comercial completo para aquisicao e ativacao de clientes.

Funcionalidades comerciais:
- pagina publica de planos em `/assinar`;
- degustacao gratuita de 21 dias para o plano Start;
- pagina exclusiva de degustacao em `/degustacao`;
- redirecionamento do plano Start, Pro e Signature para os checkouts configurados;
- exibicao de video de demonstracao em todos os pacotes;
- link de convite de afiliado;
- suporte ao super-admin para editar links comerciais;
- texto comercial premium nos CTAs e nas descricoes dos planos;
- trava de upgrade por limite de profissionais;
- exibir o proximo plano recomendado quando o limite e atingido.

Links comerciais atualmente usados:
- degustacao Start: `/degustacao`
- checkout Pro: `https://pay.kiwify.com.br/T9SzApY`
- checkout Signature: `https://pay.kiwify.com.br/2GZhB9R`
- convite de afiliado: `https://dashboard.kiwify.com/join/affiliate/ns119BD7`
- video de demonstracao: `https://drive.google.com/drive/u/1/folders/1U3KwW_Glpyx377jQksu-a2knubH78Zik`

Regras comerciais principais:
- Start: 1 profissional;
- Pro: ate 3 profissionais;
- Signature: ate 10 profissionais;
- ao tentar exceder o limite, a plataforma bloqueia e apresenta o proximo link de upgrade;
- a assinatura preserva a agenda e os dados do periodo de degustacao.

## 5. Onboarding e assinatura

O onboarding organiza a ativacao inicial e a migracao de trial para assinatura.

Funcionalidades:
- formulario de inicio de experiencia Start;
- captura de dados do profissional ou da clinica;
- captura de documento, endereco, WhatsApp, email e nome do administrador;
- ativacao do plano Start com 21 dias de degustacao;
- pagina de escolha de plano quando a experiencia termina;
- fluxo de pagamento e ativacao da assinatura;
- confirmacao manual de pagamento no fluxo atual;
- persistencia de dados de onboarding e assinatura dentro do tenant;
- preservacao da agenda ja usada no periodo de degustacao;
- liberacao de acesso apos a contratacao.

Regras do Start:
- experiencia gratuita de 21 dias;
- no dia 22, o acesso e bloqueado;
- ao bloquear, o usuario e direcionado para a vitrine dos planos;
- o fluxo de adesao usa a nomenclatura comercial Start.

## 6. Planos e catalogo

Planos atualmente estruturados:
- Start;
- Pro;
- Signature.

Recursos do catalogo:
- cadastro e edicao do plano no super-admin;
- descricao comercial por plano;
- faixa de profissionais por plano;
- vigencia contratual de 12 meses;
- video de demonstracao por plano;
- CTA ajustado por plano;
- links de checkout configuraveis;
- link de trial configuravel;
- link de afiliado configuravel.

Descricao funcional dos planos:
- Start: entrada premium para 1 profissional, com 21 dias de degustacao;
- Pro: estrutura para equipes pequenas, ate 3 profissionais;
- Signature: camada executiva, de 4 a 10 profissionais.

## 7. Agenda administrativa

Area acessivel a owner, admin e recepcao.

Funcionalidades:
- visualizacao da agenda em grade;
- filtros por periodo;
- filtros por profissional;
- filtros por status de consulta;
- criacao de novo agendamento;
- acompanhamento da ocupacao da agenda;
- exibicao de status das consultas;
- suporte a visualizacao de metricas operacionais da agenda;
- modal de criacao de consulta.

## 8. Agenda profissional

Area acessivel a owner, admin e profissional em `Minha Agenda`.

Funcionalidades:
- visao da agenda propria do profissional;
- confirmacao de consulta;
- inicio de atendimento;
- conclusao de atendimento;
- cancelamento de consulta;
- leitura de consultas por periodo;
- bloqueio de agenda por horario;
- bloqueio de agenda por periodo;
- liberacao de agenda por periodo;
- remocao de bloqueios;
- controle de slots individuais por dia e horario;
- audio opcional na acao de bloqueio ou liberacao;
- estatisticas da agenda do profissional;
- validação de disponibilidade com base em bloqueio, override e consulta ocupada.

Regras de agenda:
- agenda pode ser aberta ou fechada por profissional;
- slot pode ser bloqueado ou liberado individualmente;
- periodo pode ser bloqueado com motivo;
- atendimento ocupado bloqueia o slot correspondente;
- a interface considera bloqueios futuros e eventos ja registrados.

## 9. Agendamento publico

Rota publica por tenant: `/agendar/:slug`

Funcionalidades:
- selecao de profissional;
- selecao de data e horario;
- cadastro do paciente;
- confirmacao do agendamento;
- geracao de comprovante visual;
- compartilhamento do agendamento;
- validacao de indisponibilidade;
- respeito a agenda fechada;
- respeito a overrides de slot;
- respeito a bloqueios de periodo;
- bloqueio de horario ja ocupado.

## 10. Pacientes

Funcionalidades:
- cadastro de paciente;
- listagem de pacientes por tenant;
- busca por nome;
- visualizacao de detalhes do paciente;
- edicao de dados cadastrais;
- historico de atendimentos do paciente;
- exclusao de paciente com limpeza de cache e atualizacao imediata da lista;
- acesso a dados pessoais, endereco, observacoes, CPF, email e telefone.

Campos principais:
- nome completo;
- email;
- telefone;
- data de nascimento;
- genero;
- CPF;
- endereco;
- observacoes;
- status.

## 11. Mensagens

Funcionalidades:
- troca de mensagens internas por tenant;
- envio de mensagem por texto;
- envio de arquivo/anexo;
- envio de audio;
- agrupamento de mensagens por data;
- auto-scroll para a conversa atual;
- suporte a destinatarios da equipe e do paciente, conforme permissao;
- interface unica de conversa.

## 12. Notificacoes e lembretes

Funcionalidades:
- fila de notificacoes;
- status de notificacao pendente, pronta, enviada e falha;
- lembretes no app;
- lembretes por WhatsApp;
- configuracao de lembrete D-1 e H-2;
- acompanhamento da fila em tempo real;
- exibicao de erros de disparo;
- monitoramento de notificacoes da clinica.

## 13. Configuracoes da clinica

Funcionalidades da pagina de configuracoes:
- link de agendamento online;
- copia de link;
- QR Code do link de agendamento;
- compartilhamento via WhatsApp;
- compartilhamento por email;
- compartilhamento nativo do dispositivo;
- configuracao de lembretes por aplicativo e WhatsApp;
- ativacao e desativacao de lembretes automaticos;
- visualizacao da fila de notificacoes;
- gestao da equipe;
- exibição do video de demonstracao;
- acesso a informacoes de conversao e operacao.

## 14. Gestao da equipe

Funcionalidades:
- convite de novos profissionais;
- gerenciamento de membros da equipe;
- definicao de perfil de acesso;
- trava por limite de plano;
- bloqueio e orientacao de upgrade quando o limite e atingido;
- redirecionamento para plano mais adequado;
- suporte a criacao e manutencao de acessos por tenant.

Limites da equipe por plano:
- Start: 1 profissional;
- Pro: 3 profissionais;
- Signature: 10 profissionais.

## 15. Relatorios

Funcionalidades:
- consultas por periodo;
- distribuicao por status;
- consultas por profissional;
- exportacao de dados;
- apoio a analise operacional da clinica.

## 16. Suporte

Funcionalidades:
- abertura de chamado pelo tenant;
- visualizacao de chamados;
- resposta do super-admin;
- atualizacao de status do chamado;
- notificacao quando ha resposta;
- visao de suporte tambem para super-admin.

## 17. Area do paciente

Funcionalidades da area do paciente:
- visualizacao da proxima consulta;
- confirmacao da consulta;
- remarcacao;
- acesso ao historico basico;
- navegao facilitada para agendamento;
- experiencia simplificada para o paciente.

Rotas relacionadas:
- `/paciente/home`
- `/mensagens`
- `/agendar/:slug`

## 18. Super-admin

O super-admin concentra a operacao global da plataforma.

Funcionalidades:
- dashboard global de assinantes;
- KPIs da base de clinicas;
- graficos de tendencia;
- tabela detalhada por clinica;
- edicao de dados globais;
- cadastro e edicao de links comerciais;
- configuracao do checkout principal;
- configuracao do link da degustacao;
- configuracao do link de afiliado;
- configuracao do link do video de demonstracao;
- catalogo de planos;
- gestao de orcamentos personalizados;
- exportacoes em CSV, XLS, DOC e PDF;
- acesso a integracoes da plataforma;
- visao global de assinatura e operacao.

Subareas do super-admin:
- `/super-admin`
- `/super-admin/plataforma`
- `/super-admin/orcamentos`
- `/super-admin/catalogo`
- `/super-admin/integracoes`

## 19. Integracoes da plataforma

Integracoes atualmente mapeadas:
- WhatsApp Business;
- Google Calendar;
- Stripe Billing.

Uso funcional:
- WhatsApp Business para confirmacoes, lembretes e recuperacao de no-show;
- Google Calendar para sincronizacao externa de agenda;
- Stripe Billing para cobranca recorrente e conciliacao de assinaturas.

## 20. Seguranca e multitenancy

Camadas de seguranca:
- isolamento por `tenant_id`;
- Row Level Security no banco;
- permissao por papel;
- rotas protegidas no front;
- separacao entre area publica, tenant e super-admin;
- acesso controlado a dados de pacientes, agenda e suporte.

## 21. Edge functions

Edge functions presentes no projeto:
- `public-booking`
- `process-notifications`
- `invite-team-member`
- `manage-team-member`
- `super-admin-access`

Uso funcional:
- `public-booking`: consulta e reserva publica da agenda;
- `process-notifications`: processamento da fila de notificacoes;
- `invite-team-member`: convites para equipe;
- `manage-team-member`: atualizacao/gestao de membros;
- `super-admin-access`: suporte a acessos administrativos globais.

## 22. Rotas principais

Rotas publicas:
- `/login`
- `/register`
- `/degustacao`
- `/forgot-password`
- `/reset-password`
- `/onboarding`
- `/assinar`
- `/agendar/:slug`

Rotas protegidas:
- `/`
- `/agenda`
- `/pacientes`
- `/minha-agenda`
- `/mensagens`
- `/relatorios`
- `/configuracoes`
- `/suporte`
- `/paciente/home`

Rotas de super-admin:
- `/super-admin`
- `/super-admin/plataforma`
- `/super-admin/orcamentos`
- `/super-admin/catalogo`
- `/super-admin/integracoes`

## 23. Fluxos operacionais principais

Fluxo 1 - Captacao e assinatura:
- o lead acessa a pagina publica de planos;
- pode entrar em degustacao;
- assiste ao video de demonstracao;
- escolhe o plano ideal;
- segue para checkout ou ativacao;
- tem acesso liberado apos a assinatura.

Fluxo 2 - Operacao da clinica:
- equipe agenda e confirma consultas;
- profissional gerencia sua propria agenda;
- pacientes sao mantidos no cadastro;
- mensagens e notificacoes acompanham o fluxo assistencial;
- relatorios consolidam a operacao.

Fluxo 3 - Super-admin:
- acompanha clinicas ativas;
- edita links comerciais;
- mantem o catalogo de planos;
- acompanha integrações e chamados;
- exporta dados operacionais da base.

## 24. Observacoes de implantacao

Para operacao completa em producao, devem permanecer consistentes:
- migrations do banco;
- edge functions publicadas;
- secrets de integracao configurados;
- links comerciais atualizados no super-admin;
- validacao dos fluxos por perfil.

