# Spec-Driven Development - Importacao de item de release por PR

## 1. Contexto
Objetivo desta feature:
1. Cadastrar um item de release a partir do link (ou numero) de uma PR, sem precisar de hash de commit.
2. Preencher automaticamente metadatas, tipo de mudanca, ticket, label/link da PR e uma descricao inicial.
3. Ser a base reutilizada pelas specs `importacao-por-ticket-sdd.md` e `painel-minhas-subidas-sdd.md`.

Relacao com specs existentes:
1. Complementa `consolidacao-entrega-sdd.md`: o fluxo "Incluir metadados" ganha uma entrada por PR ao lado da entrada por commit, que continua existindo.
2. Reaproveita `extractMetadataName` / `extractMetadataType` do `server.js` para classificar os arquivos.
3. Diferente de `busca-prs-github-sdd.md` (descobrir PR a partir de metadata), aqui o sentido e o inverso: partir da PR para os metadatas.

## 2. Problema e visao
Problema atual:
1. Para cadastrar uma subida e preciso descobrir o hash do commit no git e cola-lo no campo "Hash(s) do commit".
2. Em fluxos com branch de ponte (forno/staging), o mesmo trabalho tem commits diferentes por ambiente, e achar o hash certo e trabalhoso.
3. Ticket, link da PR e descricao sao digitados a mao, mesmo ja estando na PR.

Visao da solucao:
1. O usuario cola `https://github.com/<org>/<repo>/pull/<n>` (ou so o numero, usando o repo salvo) e clica em "Buscar PR".
2. O backend consulta a PR via `gh` CLI (ja autenticado na maquina) e devolve arquivos, branch base, branch de origem, titulo e corpo.
3. O formulario e preenchido; o usuario so revisa e clica em "Cadastrar item".

## 3. Objetivos do produto
1. Preencher a lista "Metadatas do lote" com os arquivos `force-app/**` da PR (caminho, tipo do metadata, tipo de mudanca).
2. Preencher "PRs do lote" com label derivado da branch base (`forno` -> Forno, `staging` -> Staging, `main` -> Producao) e o link da PR.
3. Preencher "Ticket" a partir do padrao `[A-Z]+-\d+` no titulo ou na branch de origem (ex.: `feat/swss-5143-...` -> `SWSS-5143`).
4. Sugerir "Descricao da alteracao" a partir da secao `## What` do corpo da PR (template do repo), com fallback para o titulo.

## 4. Fora de escopo (por enquanto)
1. Suporte a GitLab/Bitbucket.
2. Gerar descricao com IA.
3. Importar varias PRs em uma acao (fica para `importacao-por-ticket-sdd.md`).

## 5. Personas
1. Arquiteto/dev Salesforce que registra as proprias subidas.
Necessidade: registrar uma subida em segundos, a partir do link da PR que ele ja tem em maos.

## 6. Fluxos principais
1. Importar por link.
Usuario cola o link da PR, clica em "Buscar PR", revisa os campos preenchidos e cadastra.
2. Importar por numero.
Usuario escolhe o repo salvo, digita o numero da PR e segue o fluxo acima.
3. PR com arquivos fora de `force-app/`.
Arquivos fora de `force-app/` (ex.: `.github/`, `scripts/`) sao ignorados e listados num aviso.

## 7. Requisitos funcionais (RF)
RF-01: Novo campo "PR (link ou numero)" + botao "Buscar PR" no bloco "Importar metadados", ao lado do campo de hash.
RF-02: Endpoint `POST /api/metadata-from-pr` que aceita `{ pr_url }` ou `{ repo_id, pr_number }`.
RF-03: Arquivos mapeados com `extractMetadataName`; tipo de mudanca: `added` -> Novo, `removed` -> Removido, demais -> Alterado (usar os mesmos valores ja usados no select "Tipo de mudanca").
RF-04: Arquivos `-meta.xml` pareados com o `.cls`/`.trigger` correspondente viram um unico metadata (mesma deduplicacao de `lib/commit-metadata.js`).
RF-05: Label da PR derivado da branch base; branch desconhecida usa o proprio nome da branch como label.
RF-06: Ticket extraido do titulo ou da branch de origem; se houver mais de um, usar o primeiro e mostrar os demais como sugestao.
RF-07: Descricao sugerida a partir da secao `## What` do corpo da PR; o usuario pode editar antes de cadastrar.
RF-08: Se a PR ja estiver vinculada a algum metadata cadastrado (`pull_requests.url`), avisar antes de importar de novo.

## 8. Requisitos nao funcionais (RNF)
RNF-01: Usar `gh` via `execFile` (sem shell), no mesmo padrao do `runGit` existente; nenhum token trafega para o browser.
RNF-02: Se o `gh` nao estiver instalado ou autenticado, devolver erro claro ("rode `gh auth login`") e manter o fluxo por commit funcionando.
RNF-03: PRs com mais de 100 arquivos devem ser paginadas (o `gh pr view --json files` corta em 100; usar `gh api repos/{owner}/{repo}/pulls/{n}/files --paginate`).
RNF-04: Timeout de 30s por chamada ao `gh`.

## 9. Modelo de dados (se aplicavel)
Sem tabela nova. Opcional: coluna `source_pr_url` em `metadatas` para rastrear a origem da importacao.

## 10. Contratos de API (se aplicavel)

### 10.1 Buscar dados da PR
POST /api/metadata-from-pr

Request:
```json
{
  "pr_url": "https://github.com/quintoandar/salesforce/pull/8978"
}
```

Response:
```json
{
  "pr": {
    "number": 8978,
    "url": "https://github.com/quintoandar/salesforce/pull/8978",
    "title": "feat(swss-5143): ... -> forno",
    "base": "forno",
    "head": "feat/swss-5143-partner-repair-request-forno",
    "state": "MERGED",
    "merged_at": "2026-11-11T18:50:00Z"
  },
  "suggested": {
    "ticket": "SWSS-5143",
    "pr_label": "Forno",
    "description": "Texto da secao What"
  },
  "metadatas": [
    { "name": "force-app/main/default/classes/CaseRepairRequestCaseBatch.cls", "type": "Apex Class", "change_type": "Alterado" }
  ],
  "ignored_files": [".github/workflows/x.yml"]
}
```

Erros esperados:
1. 400 para link/numero invalido.
2. 404 para PR inexistente ou sem acesso.
3. 424 quando o `gh` nao esta instalado/autenticado.
4. 500 para falha inesperada.

## 11. Regras de negocio criticas
1. O fluxo por hash de commit continua disponivel e inalterado.
2. Nada e gravado no banco antes do usuario clicar em "Cadastrar item".
3. Arquivos removidos na PR entram com tipo de mudanca "Removido" (relevante para destructiveChanges).

## 12. Criterios de aceite
1. Dado o link de uma PR mergeada em `forno`, quando clico em "Buscar PR", entao a lista de metadatas, o ticket, a PR com label "Forno" e a descricao sao preenchidos.
2. Dado um `.cls` e seu `.cls-meta.xml` na PR, quando importo, entao aparece um unico metadata.
3. Dado que o `gh` nao esta autenticado, quando clico em "Buscar PR", entao vejo a mensagem orientando `gh auth login` e o fluxo por commit continua funcionando.
4. Dado uma PR com 150 arquivos, quando importo, entao todos os 150 sao considerados.

## 13. Edge cases
1. PR aberta (nao mergeada): permitir importar, com aviso "PR ainda nao mergeada".
2. PR so com arquivos fora de `force-app/`: nenhum metadata, mensagem explicando.
3. Arquivo renomeado: tratar como removido (nome antigo) + novo (nome novo).
4. Link de outro repositorio que nao esta salvo: aceitar, usando owner/repo do proprio link.

## 14. Plano de implementacao (slices)
1. Slice 1 - Backend. Status: implementado.
Helper `runGh` (execFile, timeout, erro amigavel), parser de link, `POST /api/metadata-from-pr` com mapeamento de arquivos e testes em `tests/` (`node --test`) com saida do `gh` mockada (`lib/pr-metadata.js`, `tests/pr-metadata.test.js`, `tests/metadata-from-pr.api.test.js`).
2. Slice 2 - Frontend. Status: implementado.
Campo + botao no bloco "Importar metadados", preenchimento do formulario e avisos (`public/app.js`, `public/index.html`, `tests/import-pr-ui.test.js`).
3. Slice 3 - Sugestoes. Status: implementado.
Ticket (com candidatos extras no aviso), label por branch base, descricao a partir de `## What` e aviso de PR ja importada.

## 15. Definition of Done desta spec
1. Criterios de aceite 1-4 cobertos por testes automatizados (backend) e validados manualmente na UI. Feito: `node --test` (53 testes) + smoke test manual com PR real (`expressjs/express#7580`) via gh CLI autenticado, cobrindo o fluxo por link, por numero+repo salvo, erro 400 e erro 404.
2. README atualizado com a nova forma de importar. Feito: secao "Importacao de metadados por PR".
3. Fluxo por commit sem regressao (testes existentes passando). Feito: todos os testes anteriores (25) continuam verdes.
