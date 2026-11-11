# Release Notes Hub

Aplicacao web para centralizar e compartilhar release notes com foco em projetos Salesforce.

Embora o foco principal seja Salesforce, a estrutura e o fluxo deste projeto permitem uso em outros tipos de projetos e times.

## Stack

- Node.js
- Express
- HTML/CSS/JavaScript

## Como executar

1. Instale as dependencias:
   - `npm install`
2. Inicie o servidor:
   - `npm start`
3. Abra no navegador:
   - `http://localhost:3030`

## Aviso de seguranca (uso local)

Este aplicativo foi projetado para uso local (localhost) e ambiente de desenvolvimento.

Nao publique este projeto diretamente em servidor proprio ou internet sem uma camada de seguranca adequada.

Se houver necessidade de deploy fora do ambiente local, e obrigatorio implementar pelo menos:

- Autenticacao de usuarios
- Autorizacao por perfil/permissao
- Filtragem/minimizacao de campos sensiveis nas respostas da API
- Endurecimento de headers e TLS/HTTPS
- Politica de logs sem exposicao de dados sensiveis

Sem essas medidas, existe risco de exposicao de dados e uso indevido da aplicacao.

## Banco de dados local

No primeiro start, o arquivo `release.db` e as tabelas sao criados automaticamente.

## Busca por commits de varias pessoas

Na aba `Busca por commit`, e possivel selecionar mais de uma pessoa salva e consultar commits de todos os autores ao mesmo tempo.

- Selecionar varias pessoas no campo de pessoas salvas usando `Ctrl`/`Cmd`
- Informar emails adicionais manualmente, separados por virgula, espaco ou quebra de linha
- Usar `Selecionar todos` e `Limpar selecao` na grade de resultados
- Acionar `Usar todos` para importar todos os commits encontrados
- Acionar `Usar selecionados` para importar apenas os commits marcados
- Acionar `Gerar cherry-pick selecionados` para montar o comando com os hashes marcados

O fluxo continua compatível com a busca por uma unica pessoa e com o atalho `Usar commit` de cada linha.

## Importacao de metadados por multiplos commits

O fluxo `Incluir metadados` suporta importacao por hash unico e por lote.

- Hash unico: continua usando o caminho tradicional e permanece compativel com o comportamento anterior.
- Multiplos hashes: informe hashes separados por espaco, virgula ou quebra de linha no campo de commit.
- Limite operacional: ate 50 commits por importacao.
- Deduplicacao: metadados repetidos entre commits sao consolidados automaticamente por tipo e nome.

No fluxo `Busca por commit`, tambem e possivel:

- Selecionar varios commits na grade (checkbox por linha)
- Usar `Selecionar todos` e `Limpar selecao`
- Acionar `Usar selecionados` para importar tudo em lote no modulo de metadados

## Importacao de metadados por PR

No fluxo `Incluir metadados`, alem da importacao por hash de commit, e possivel importar a partir de uma PR:

- Cole o link da PR (ex.: `https://github.com/org/repo/pull/8978`) no campo `Importar metadados por PR` e clique em `Buscar PR`.
- Ou escolha um repositorio salvo no seletor ao lado e digite apenas o numero da PR.
- O app usa o `gh` (GitHub CLI), ja autenticado na maquina, para buscar os arquivos da PR via `execFile` (sem shell e sem guardar token).
- Sao preenchidos automaticamente: a lista de metadatas `force-app/**` (com tipo de mudanca Criacao/Alteracao/Remocao), o ticket (padrao `ABC-123` no titulo ou na branch), o label e link da PR (Forno/Staging/Producao conforme a branch base) e uma descricao sugerida a partir da secao `## What` do corpo da PR.
- Arquivos fora de `force-app/` sao ignorados e informados no aviso ao final da busca.
- Se o `gh` nao estiver instalado ou autenticado, o app orienta a rodar `gh auth login`; o fluxo por hash de commit continua funcionando normalmente.
- Se a PR ja estiver vinculada a um metadata cadastrado, um aviso e exibido antes de importar novamente.

## Status do gh e layout do formulario

- No topo da pagina, um selo mostra se o `gh` esta conectado (verde, com o usuario autenticado) ou desconectado (vermelho). Clique no selo para abrir um popover com a orientacao e, se desconectado, um botao "Conectar" que roda `gh auth login --web` em segundo plano, mostra o codigo de uso unico e abre o navegador para voce aprovar; o selo atualiza sozinho quando a conexao for concluida.
- O formulario "Novo item de release" foi reorganizado em um acordeao com 4 etapas (Frente/Sprint, Importar metadados, Metadatas e PRs do lote, Ticket e descricao); so uma etapa fica aberta por vez, e a etapa de metadatas se abre automaticamente apos uma importacao bem-sucedida.
- Importar por commit e por PR agora sao sub-abas dentro da etapa "Importar metadados", em vez de dois blocos sempre visiveis.
- Cadastrar uma nova frente, sprint ou tipo de metadata abre um modal, separando a lista de selecao (lookup) do cadastro de um novo item.
