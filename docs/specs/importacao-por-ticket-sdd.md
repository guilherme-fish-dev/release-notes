# Spec-Driven Development - Importacao de entrega por ticket (Jira)

## 1. Contexto
Objetivo desta feature:
1. Digitar so o ticket (ex.: `SWSS-5143`) e encontrar todas as PRs dele em todos os ambientes.
2. Consolidar os metadatas dessas PRs num unico item de release, com todas as PRs vinculadas (Forno, Staging, Producao).
3. Mostrar o caminho de promocao do ticket: em quais ambientes ja entrou e em quais falta.

Relacao com specs existentes:
1. Depende de `importacao-por-pr-sdd.md` (reusa o helper `runGh` e o mapeamento PR -> metadatas).
2. Complementa `consolidacao-entrega-sdd.md`: um ticket vira um item de release consolidado.

## 2. Problema e visao
Problema atual:
1. Uma mesma entrega passa por 3 PRs (forno, staging, main), muitas vezes em branches de ponte diferentes, e cada uma tem que ser cadastrada a mao.
2. Nao ha visao rapida de "esse ticket ja chegou em producao?".

Visao da solucao:
1. O usuario digita o ticket; o backend busca as PRs com `gh pr list --search "<ticket> in:title,body" --state all` (e tambem pelo nome da branch).
2. O app mostra as PRs agrupadas por branch base, com estado (aberta/draft/mergeada) e data.
3. Um clique importa a uniao dos metadatas e vincula todas as PRs ao item.

## 3. Objetivos do produto
1. Encontrar PRs de um ticket por titulo, corpo e nome da branch (case-insensitive: `swss-5143` e `SWSS-5143`).
2. Exibir a trilha de promocao: Forno / Staging / Producao, cada um com PR, estado e data de merge.
3. Importar a uniao deduplicada dos metadatas, usando a PR mais "avancada" (main > staging > forno) como fonte da descricao.

## 4. Fora de escopo (por enquanto)
1. Integracao com a API do Jira (status do card, titulo do card).
2. Detectar o deploy de fato no ambiente (status do workflow); por enquanto merge = entrou.

## 5. Personas
1. Arquiteto/dev Salesforce.
Necessidade: registrar uma entrega inteira e saber onde ela ja esta, a partir do numero do card.

## 6. Fluxos principais
1. Buscar ticket.
Usuario digita `SWSS-5143`, ve a trilha Forno/Staging/Producao e as PRs encontradas.
2. Importar entrega.
Usuario marca as PRs que quer considerar (todas marcadas por padrao) e clica em "Importar"; o formulario de item e preenchido.
3. Atualizar item existente.
Se o ticket ja tem item cadastrado, o app oferece "vincular PRs novas" em vez de criar outro item.

## 7. Requisitos funcionais (RF)
RF-01: Nova aba ou campo "Buscar por ticket" no fluxo "Incluir metadados".
RF-02: Endpoint `POST /api/prs-by-ticket` com `{ repo_id, ticket }`, retornando PRs agrupadas por branch base.
RF-03: Mapeamento branch base -> ambiente configuravel (padrao: `forno` -> Forno, `staging` -> Staging, `main` -> Producao).
RF-04: Uniao dos metadatas das PRs selecionadas, deduplicada por caminho; arquivo removido em qualquer PR prevalece como "Removido".
RF-05: Se ja existir item com o mesmo ticket, mostrar e permitir apenas vincular as PRs que faltam.

## 8. Requisitos nao funcionais (RNF)
RNF-01: Reusar `runGh` da spec de importacao por PR; sem token no browser.
RNF-02: Limitar a busca a 50 PRs por ticket, com aviso se houver mais.

## 9. Modelo de dados (se aplicavel)
Sem tabela nova. A trilha de promocao e calculada em tempo real a partir das PRs.

## 10. Contratos de API (se aplicavel)

### 10.1 Buscar PRs por ticket
POST /api/prs-by-ticket

Request:
```json
{ "repo_id": 1, "ticket": "SWSS-5143" }
```

Response:
```json
{
  "ticket": "SWSS-5143",
  "environments": [
    { "label": "Forno", "base": "forno", "prs": [{ "number": 8978, "state": "MERGED", "merged_at": "2026-11-11T18:50:00Z", "url": "..." }] },
    { "label": "Staging", "base": "staging", "prs": [{ "number": 8996, "state": "OPEN", "draft": true, "url": "..." }] },
    { "label": "Producao", "base": "main", "prs": [] }
  ],
  "existing_item_ids": []
}
```

## 11. Regras de negocio criticas
1. O ticket e normalizado para maiusculas antes de salvar.
2. Nada e gravado antes da confirmacao do usuario.

## 12. Criterios de aceite
1. Dado o ticket `SWSS-5143` com PRs em forno e staging, quando busco, entao vejo Forno (mergeada), Staging (draft) e Producao (pendente).
2. Dado que importo o ticket, quando cadastro, entao o item tem os metadatas deduplicados e as 2 PRs vinculadas com labels Forno e Staging.
3. Dado um ticket ja cadastrado, quando busco de novo depois da PR de main, entao o app oferece vincular apenas a PR nova.

## 13. Edge cases
1. Ticket citado de passagem no corpo de outra PR: exibir, mas permitir desmarcar.
2. Mais de uma PR para o mesmo ambiente (ex.: correcao posterior): listar todas, ordenadas por data.
3. Ticket sem nenhuma PR: mensagem clara.

## 14. Plano de implementacao (slices)
1. Slice 1 - Busca e trilha. Status: planejado.
`POST /api/prs-by-ticket` + exibicao da trilha na UI.
2. Slice 2 - Importacao consolidada. Status: planejado.
Uniao dos metadatas, vinculo de todas as PRs e preenchimento do formulario.
3. Slice 3 - Item existente. Status: planejado.
Detectar item do mesmo ticket e vincular so as PRs novas.

## 15. Definition of Done desta spec
1. Criterios de aceite cobertos por testes com saida do `gh` mockada.
2. README atualizado.
