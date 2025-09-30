# Gerador de Marketing IA - Aplicação Full-Stack

Bem-vindo à aplicação! Este projeto foi adaptado para ser uma ferramenta de marketing completa, rodando 100% localmente, sem a necessidade de bancos de dados externos ou autenticação online. Ele utiliza arquivos Excel para persistência de dados e a API da OpenRouter para suas funcionalidades de inteligência artificial.

## Pré-requisitos

Antes de começar, garanta que você tenha o seguinte software instalado em sua máquina:

*   **Node.js:** Versão 18.x ou superior. Você pode baixá-lo em [nodejs.org](https://nodejs.org/). O `npm` (Node Package Manager) é instalado automaticamente com o Node.js.

## Como Instalar e Executar

Siga estes 3 passos simples para colocar a aplicação em funcionamento.

### Passo 1: Instalar as Dependências

Primeiro, você precisa instalar todas as bibliotecas e pacotes que o projeto utiliza.

*   Execute o arquivo `install.bat`.

Este script irá rodar o comando `npm install` e baixar tudo o que é necessário. Uma janela de terminal será aberta e pode levar alguns minutos para concluir. Ao final, ela mostrará uma lista das dependências instaladas.

### Passo 2: Configurar as Chaves de API

A aplicação precisa de chaves da OpenRouter para que as funcionalidades de IA (geração de copy, landing pages, etc.) funcionem.

1.  **Crie o arquivo de ambiente:**
    *   Faça uma cópia do arquivo `.env.example` e renomeie a cópia para `.env`.

2.  **Obtenha e adicione suas chaves:**
    *   Siga as instruções detalhadas no arquivo `API_GUIDE.md` para obter suas chaves de API gratuitas da OpenRouter.
    *   Abra o arquivo `.env` que você acabou de criar e cole suas chaves nas variáveis `OPENROUTER_API_KEY_1`, `OPENROUTER_API_KEY_2`, etc.

**Importante:** A aplicação implementa **rotação de chaves**. É altamente recomendado que você crie e adicione pelo menos 2 ou 3 chaves diferentes para garantir que o serviço de IA continue funcionando mesmo que uma das chaves atinja o limite de uso.

### Passo 3: Iniciar a Aplicação

Com as dependências instaladas e as chaves configuradas, você está pronto para iniciar.

*   Execute o arquivo `start.bat`.

Este script fará duas coisas:
1.  Iniciará o servidor da aplicação em uma nova janela de terminal (que deve permanecer aberta).
2.  Após 10 segundos, abrirá automaticamente a aplicação no seu navegador padrão, no endereço `http://localhost:8000`.

Pronto! A aplicação está em execução.

## Estrutura do Projeto

Aqui está uma visão geral dos principais arquivos e pastas:

*   `/client`: Contém todo o código do frontend da aplicação (React, TypeScript, TailwindCSS).
*   `/server`: Contém todo o código do backend (Node.js, Express), incluindo as rotas da API e os serviços.
*   `/database`: **Esta pasta será criada automaticamente** na primeira vez que você iniciar o servidor. Ela armazenará todos os dados da aplicação em arquivos `.xlsx`, como `campaigns.xlsx`, `creatives.xlsx`, etc.
*   `/shared`: Contém os schemas e tipos de dados que são compartilhados entre o frontend e o backend.
*   `app.log`: Arquivo de log que registra todas as atividades do servidor. Útil para depuração.
*   `API_GUIDE.md`: Guia detalhado para obter as chaves da OpenRouter.
*   `install.bat`: Script para instalar as dependências.
*   `start.bat`: Script para iniciar a aplicação.
*   `.env`: Arquivo onde você deve colocar suas chaves de API secretas (não é versionado).
*   `.env.example`: Modelo para o arquivo `.env`.