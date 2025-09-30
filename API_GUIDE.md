# Guia para Obtenção de Chaves de API da OpenRouter

Este documento fornece um passo a passo para obter as chaves de API da OpenRouter, que são **obrigatórias** para que as funcionalidades de inteligência artificial da aplicação funcionem.

**Onde Salvar as Chaves:** Todas as chaves obtidas devem ser salvas em um arquivo chamado `.env` na raiz do projeto. Você pode criar este arquivo copiando o modelo `.env.example`.

---

## Chaves de API da OpenRouter (com Rotação)

A aplicação utiliza o serviço da OpenRouter para acessar modelos de IA avançados e implementa um sistema de **rotação de chaves de API**. Isso significa que você pode (e deve) fornecer várias chaves. O sistema alternará entre elas a cada requisição, aumentando a robustez e ajudando a contornar limites de uso.

### Como Obter suas Chaves da OpenRouter:

1.  **Acesse o site da OpenRouter:**
    *   Vá para [https://openrouter.ai/](https://openrouter.ai/).

2.  **Faça login ou crie uma conta:**
    *   Você pode usar sua conta do Google, Discord ou um e-mail para se registrar. O processo é rápido e direto.

3.  **Vá para a sua página de Chaves (Keys):**
    *   Após o login, clique no ícone do seu perfil no canto superior direito e vá para a seção **"Keys"**.
    *   Ou acesse diretamente: [https://openrouter.ai/keys](https://openrouter.ai/keys).

4.  **Crie uma Nova Chave:**
    *   Clique no botão **"+ Create Key"**.
    *   Dê um nome para a sua chave (ex: `app-local-key-1`) para facilitar a identificação.
    *   Clique em **"Create"**.

5.  **Copie sua Chave:**
    *   Sua nova chave será exibida. **Copie-a imediatamente**, pois ela não será mostrada novamente por motivos de segurança.

6.  **Repita para Obter Múltiplas Chaves (Recomendado):**
    *   Para aproveitar ao máximo o sistema de rotação, repita os passos 4 e 5 para criar várias chaves de API. O arquivo `.env.example` está preparado para até 5 chaves, mas você pode adicionar mais se desejar.

### Como Salvar no Arquivo `.env`:

Abra o arquivo `.env` que você criou a partir do `.env.example` e cole as chaves que você copiou, uma em cada variável.

```env
# Exemplo de como preencher as chaves:
OPENROUTER_API_KEY_1="sk-or-v1-abc...xyz"
OPENROUTER_API_KEY_2="sk-or-v1-def...uvw"
OPENROUTER_API_KEY_3="sk-or-v1-ghi...rst"
OPENROUTER_API_KEY_4=""
OPENROUTER_API_KEY_5=""
```

---

Com as chaves da OpenRouter salvas no arquivo `.env`, a aplicação estará pronta para utilizar todos os recursos de IA.