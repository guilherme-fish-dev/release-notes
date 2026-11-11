# Spec-Driven Development - Painel "Minhas subidas"

## 1. Contexto
Objetivo desta feature:
1. Mostrar automaticamente as minhas PRs recentes, agrupadas por ticket, sem eu precisar procurar nada.
2. Indicar para cada ticket em quais ambientes ja entrou e se ja esta cadastrado no app.
3. Registrar com um clique o que ainda nao foi cadastrado.

Relacao com specs existentes:
1. Depende de `importacao-por-pr-sdd.md` (helper `runGh`, mapeamento PR -> metadatas) e de `importacao-por-ticket-sdd.md` (agrupamento por ticket e trilha de promocao).
2. Pode substituir, no dia a dia, as abas "Busca por commit" e "Varrer PRs do git".

## 2. Problema e visao
Problema atual:
1. O controle das subidas depende de lembrar o que foi feito e ir atras de hash/PR.
2. Fica facil esquecer de cadastrar uma subida ou de promover algo que parou em forno/staging.

Visao da solucao:
1. Tela inicial com as minhas PRs dos ultimos N dias (`gh pr list --author @me --state all --search "updated:>=<data>"`).
2. Agrupadas por ticket, com a trilha Forno / Staging / Producao e um selo "cadastrado" / "nao cadastrado".
3. Botao "Registrar" abre o formulario ja preenchido (fluxo da importacao por ticket).

## 3. Objetivos do produto
1. Lista de tickets com PRs do usuario no periodo, ordenados pela atividade mais recente.
2. Destaque para "pendente de promocao" (ex.: mergeado em staging, sem PR para main).
3. Destaque para "nao cadastrado" (PR mergeada sem item no app).

## 4. Fora de escopo (por enquanto)
1. Notificacoes (e-mail/Slack).
2. Visao de time (PRs de outras pessoas); a primeira versao e so do usuario autenticado no `gh`.

## 5. Personas
1. Arquiteto/dev Salesforce.
Necessidade: abrir o app e ver na hora o que subiu, onde parou e o que falta registrar.

## 6. Fluxos principais
1. Abrir o painel.
O app carrega as PRs do usuario dos ultimos 14 dias (configuravel) e agrupa por ticket.
2. Registrar subida.
Usuario clica em "Registrar" num ticket nao cadastrado e confirma o formulario preenchido.
3. Ver pendencias.
Filtro "So pendentes" mostra tickets parados antes de Producao ou nao cadastrados.

## 7. Requisitos funcionais (RF)
RF-01: Nova aba "Minhas subidas" (pode virar a aba inicial).
RF-02: Endpoint `GET /api/my-deliveries?repo_id=&days=` que lista PRs do usuario autenticado no `gh`, agrupadas por ticket (regex `[A-Z]+-\d+` no titulo/branch); PRs sem ticket ficam num grupo "Sem ticket".
RF-03: Para cada ticket: trilha por ambiente (mesmo mapeamento da spec por ticket) e flag `registered` (existe item com esse ticket ou PR ja vinculada).
RF-04: Botao "Registrar" reusa o fluxo de importacao por ticket.
RF-05: Filtros: periodo (7/14/30 dias), "so pendentes", "so nao cadastrados".

## 8. Requisitos nao funcionais (RNF)
RNF-01: Cache em memoria de 5 minutos por `repo_id + days`, com botao "Atualizar" que ignora o cache.
RNF-02: No maximo 100 PRs por consulta, com aviso se houver mais.

## 9. Modelo de dados (se aplicavel)
Sem tabela nova.

## 10. Contratos de API (se aplicavel)

### 10.1 Listar minhas subidas
GET /api/my-deliveries?repo_id=1&days=14

Response:
```json
{
  "tickets": [
    {
      "ticket": "SWSS-5143",
      "title": "record type Partner, campos da jornada Porto ...",
      "registered": true,
      "pending": "Producao",
      "environments": [
        { "label": "Forno", "state": "MERGED", "pr": 8978 },
        { "label": "Staging", "state": "OPEN", "pr": 8996 },
        { "label": "Producao", "state": null, "pr": null }
      ]
    }
  ]
}
```

## 11. Regras de negocio criticas
1. "Pendente" = ambiente seguinte ao ultimo mergeado ainda sem PR mergeada.
2. Registrar nunca duplica item: se ja existe item do ticket, so vincula PRs novas.

## 12. Criterios de aceite
1. Dado que tenho PRs de `SWSS-5143` em forno (mergeada) e staging (aberta), quando abro o painel, entao vejo o ticket com Forno ok, Staging em andamento e Producao pendente.
2. Dado um ticket com PR mergeada e sem item cadastrado, quando clico em "Registrar" e confirmo, entao o selo muda para "cadastrado".
3. Dado o filtro "so pendentes", quando aplico, entao tickets ja em Producao e cadastrados somem da lista.

## 13. Edge cases
1. PR sem ticket no titulo nem na branch: grupo "Sem ticket", ainda com botao "Registrar" (fluxo por PR).
2. `gh` nao autenticado: painel mostra a orientacao `gh auth login`.
3. PRs de outros repositorios: considerar so o repo selecionado.

## 14. Plano de implementacao (slices)
1. Slice 1 - Endpoint e listagem. Status: planejado.
2. Slice 2 - Selos de cadastrado/pendente e filtros. Status: planejado.
3. Slice 3 - Botao "Registrar" integrado ao fluxo por ticket. Status: planejado.

## 15. Definition of Done desta spec
1. Criterios de aceite cobertos por testes com saida do `gh` mockada.
2. README atualizado.
