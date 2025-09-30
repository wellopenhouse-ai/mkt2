import axios from 'axios';
import 'dotenv/config';

class OpenRouterService {
    private apiKeys: string[] = [];
    private currentKeyIndex = 0;

    constructor() {
        this.loadApiKeys();
        if (this.apiKeys.length === 0) {
            console.warn("Nenhuma chave de API da OpenRouter foi encontrada nas variáveis de ambiente (OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, etc.). O serviço de IA não funcionará.");
        }
    }

    /**
     * Carrega as chaves de API da OpenRouter das variáveis de ambiente.
     * Procura por variáveis no formato OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, ...
     */
    private loadApiKeys() {
        this.apiKeys = Object.keys(process.env)
            .filter(key => key.startsWith('OPENROUTER_API_KEY_'))
            .sort()
            .map(key => process.env[key]!)
            .filter(key => key); // Garante que não haja chaves vazias
    }

    /**
     * Obtém a próxima chave de API da lista, implementando a rotação.
     * @returns A próxima chave de API.
     * @throws Se nenhuma chave de API estiver configurada.
     */
    private getNextKey(): string {
        if (this.apiKeys.length === 0) {
            throw new Error('Nenhuma chave de API da OpenRouter configurada.');
        }
        const key = this.apiKeys[this.currentKeyIndex];
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        return key;
    }

    /**
     * Gera texto usando o modelo especificado da OpenRouter.
     * @param prompt O prompt para a geração de texto.
     * @returns O texto gerado pelo modelo.
     */
    public async generateText(prompt: string): Promise<string> {
        const apiKey = this.getNextKey();
        const model = "x-ai/grok-4-fast:free";

        try {
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000', // Referer pode ser necessário para alguns modelos gratuitos
                        'X-Title': 'Gerador de Marketing IA'
                    }
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else {
                throw new Error('A resposta da API da OpenRouter não continha o texto esperado.');
            }
        } catch (error: any) {
            console.error(`Erro ao chamar a API da OpenRouter com a chave ${this.currentKeyIndex}:`, error.response?.data || error.message);

            // Tenta com a próxima chave em caso de erro (lógica simples de failover)
            if (this.apiKeys.length > 1) {
                console.log("Tentando com a próxima chave de API...");
                return this.generateText(prompt); // Cuidado com loops infinitos se todas as chaves falharem
            }

            throw new Error(`Falha ao gerar texto com a OpenRouter: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

export const openRouterService = new OpenRouterService();