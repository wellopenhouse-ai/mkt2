// server/mcp_handler.ts
import { storage } from "./storage";
import { openRouterService } from './services/openrouter.service';
import { UPLOADS_PATH, UPLOADS_DIR_NAME } from './config';
import { InsertCampaign, ChatMessage, ChatSession, InsertCampaignTask, Campaign, CampaignPhase } from "../shared/schema";
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface MCPResponsePayload {
	reply: string;
	sessionId: number;
	action?: string;
	payload?: any;
}

interface FileProcessResult {
	type: 'text' | 'image' | 'json';
	content: string;
	mimeType?: string;
}

// A função de processamento de arquivo permanece a mesma, pois é agnóstica à IA.
async function processFile(attachmentUrl: string): Promise<FileProcessResult | null> {
	if (!attachmentUrl) return null;
	try {
		const url = new URL(attachmentUrl);
		const relativePath = url.pathname.replace(`/${UPLOADS_DIR_NAME}/`, '');
		const filePath = path.join(UPLOADS_PATH, relativePath);

		if (!fs.existsSync(filePath)) {
			console.error(`[MCP_HANDLER] Arquivo não encontrado: ${filePath}`);
			return null;
		}

		const fileExtension = path.extname(filePath).toLowerCase();

		if (['.png', '.jpeg', '.jpg', '.webp'].includes(fileExtension)) {
			// Embora o Grok não processe imagens diretamente via API, podemos descrevê-las.
			// Por enquanto, vamos tratar como um tipo de arquivo genérico.
			return { type: 'image', content: 'Uma imagem foi anexada.', mimeType: `image/${fileExtension.substring(1)}` };
		}

		let textContent: string | null = null;
		if (fileExtension === '.pdf') {
			const pdf = (await import('pdf-parse')).default;
			const dataBuffer = fs.readFileSync(filePath);
			const data = await pdf(dataBuffer);
			textContent = data.text;
		} else if (fileExtension === '.docx') {
			const { value } = await mammoth.extractRawText({ path: filePath });
			textContent = value;
		} else if (fileExtension === '.txt' || fileExtension === '.md') {
			textContent = fs.readFileSync(filePath, 'utf-8');
		}

		if (textContent !== null) {
			return { type: 'text', content: textContent };
		}

		let jsonData: any = null;
		if (fileExtension === '.csv') {
			const fileString = fs.readFileSync(filePath, 'utf-8');
			jsonData = Papa.parse(fileString, { header: true, skipEmptyLines: true }).data;
		} else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
			const workbook = XLSX.readFile(filePath);
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			jsonData = XLSX.utils.sheet_to_json(worksheet);
		}

		if (jsonData !== null) {
			return { type: 'json', content: JSON.stringify(jsonData, null, 2) };
		}

		console.log(`[MCP_HANDLER] Tipo de arquivo não suportado: ${fileExtension}`);
		return null;

	} catch (error) {
		console.error("[MCP_HANDLER] Erro ao processar o anexo:", error);
		return null;
	}
}

async function getCampaignDetailsFromContext(message: string, fileInfo: FileProcessResult | null): Promise<Partial<InsertCampaign> | null> {
	try {
		let fileContextPrompt = "Nenhum arquivo anexado.";
		if (fileInfo) {
			if (fileInfo.type === 'text') {
				fileContextPrompt = `Conteúdo do documento de texto:\n${fileInfo.content.substring(0, 4000)}`;
			} else if (fileInfo.type === 'json') {
				fileContextPrompt = `Conteúdo da planilha (em JSON):\n${fileInfo.content.substring(0, 4000)}`;
			} else if (fileInfo.type === 'image') {
				fileContextPrompt = "Uma imagem foi anexada. O usuário pode estar descrevendo-a.";
			}
		}
		
		const promptForDetails = `
			Com base na conversa e no arquivo anexado, extraia detalhes para criar uma campanha de marketing.
			Mensagem do usuário: "${message}"
			Contexto do Arquivo: ${fileContextPrompt}
			
			Extraia as seguintes informações: "name", "description", "objectives", "targetAudience".
			Responda APENAS com um objeto JSON válido. Se uma informação não for encontrada, deixe o campo como nulo. Exemplo: {"name": "Minha Campanha", "description": "Descrição", "objectives": ["Vendas"], "targetAudience": "Jovens"}
		`;

		const result = await openRouterService.generateText(promptForDetails);
		const jsonMatch = result.match(/\{.*\}/s);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
		return null;
	} catch (error) {
		console.error("[MCP_HANDLER_OPENROUTER] Erro ao extrair detalhes da campanha:", error);
		return null;
	}
}

async function getTaskDetailsFromContext(message: string, history: ChatMessage[]): Promise<Partial<InsertCampaignTask> & { campaignName?: string, phaseName?: string } | null> {
	try {
		const historyText = history.map(h => `${h.sender}: ${h.text}`).join('\n');
		
		const prompt = `
			Baseado na última mensagem do usuário e no histórico da conversa, extraia os detalhes para CRIAR UMA TAREFA.
			Histórico:
			${historyText}
			
			Mensagem do usuário: "${message}"

			Extraia as seguintes informações:
			- "name": O nome da tarefa.
			- "campaignName": O nome da campanha onde a tarefa deve ser criada. Use o contexto do histórico se o usuário disser "nesta campanha" ou algo similar.
			- "phaseName": O nome da fase (ex: 'Planejamento', 'Aquisição'). Se não for mencionado, deixe como nulo.
			- "description": Uma descrição opcional para a tarefa.

			Responda APENAS com um objeto JSON válido. Se uma informação não for encontrada, deixe o campo como nulo.
		`;
		const result = await openRouterService.generateText(prompt);
		const jsonMatch = result.match(/\{.*\}/s);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
		return null;
	} catch (error) {
		console.error("[MCP_HANDLER_OPENROUTER] Erro ao extrair detalhes da tarefa:", error);
		return null;
	}
}

export async function handleMCPConversation(
	userId: number, // Mantido para compatibilidade futura, mas não usado para filtrar dados
	message: string,
	currentSessionId: number | null | undefined,
	attachmentUrl?: string | null
): Promise<MCPResponsePayload> {
	console.log(`[MCP_HANDLER] Disse: "${message || '[Anexo]'}" (Session: ${currentSessionId || 'Nova'})`);

	const fileInfo = attachmentUrl ? await processFile(attachmentUrl) : null;

	let activeSession: ChatSession;
	if (currentSessionId) {
		activeSession = await storage.getChatSession(currentSessionId) ?? await storage.createChatSession('Nova Conversa');
	} else {
		activeSession = await storage.createChatSession('Nova Conversa');
	}

	const history = await storage.getChatMessages(activeSession.id);

	await storage.addChatMessage({
		sessionId: activeSession.id,
		sender: 'user',
		text: message || (attachmentUrl ? `Anexo: ${path.basename(attachmentUrl)}` : 'Mensagem vazia.'),
		attachmentUrl: attachmentUrl || null,
	});

	let agentReplyText: string;
	const responsePayload: Partial<MCPResponsePayload> = { sessionId: activeSession.id };

	try {
        let fileContextForIntent = "";
		if (fileInfo) {
			fileContextForIntent = `O usuário enviou um anexo do tipo '${fileInfo.type}'.`;
			if (fileInfo.type === 'text' || fileInfo.type === 'json') {
				fileContextForIntent += ` Primeiras linhas do conteúdo: "${fileInfo.content.substring(0, 500)}"`;
			}
		}

		const intentPrompt = `
			Analisando a mensagem do usuário, o anexo e o histórico, qual é a intenção principal?
			MENSAGEM: "${message}".
			ANEXO: ${fileContextForIntent}
			HISTÓRICO RECENTE: ${history.slice(-4).map(h => h.text).join('; ')}
			
			Responda com uma das seguintes intenções: NAVEGAR, CRIAR_CAMPANHA, CRIAR_TAREFA, ou CONVERSA_GERAL.
		`;
		
		const intentResponse = await openRouterService.generateText(intentPrompt);
		console.log(`[MCP_HANDLER] Intenção detectada: ${intentResponse}`);

        if (intentResponse.includes('NAVEGAR')) {
            const validRoutes = ['/dashboard', '/campaigns', '/schedule', '/creatives', '/budget', '/landingpages', '/funnel', '/copy', '/metrics', '/alerts', '/whatsapp', '/export'];
            const navigationPrompt = `O usuário quer navegar. Qual destas rotas é a mais apropriada para a mensagem "${message}"? Responda APENAS com a rota da lista. Lista de rotas válidas: ${validRoutes.join(", ")}.`;
            const navPath = await openRouterService.generateText(navigationPrompt);

            if (validRoutes.includes(navPath.trim())) {
                agentReplyText = `Claro, abrindo a página de ${navPath.replace('/', '')}...`;
                responsePayload.action = "navigate";
                responsePayload.payload = { path: navPath.trim() };
            } else {
                agentReplyText = "Entendi que você quer navegar, mas não sei para qual página. Pode ser mais específico?";
            }
        } else if (intentResponse.includes('CRIAR_TAREFA')) {
			const taskDetails = await getTaskDetailsFromContext(message, history);
			agentReplyText = await handleCreateTask(taskDetails);
			responsePayload.action = "invalidateQuery"; responsePayload.payload = { queryKey: ["campaigns", "tasks", "campaignSchedule"] };
		} else if (intentResponse.includes('CRIAR_CAMPANHA')) {
			const campaignDetails = await getCampaignDetailsFromContext(message, fileInfo);
			if (campaignDetails && campaignDetails.name) {
				const newCampaignData: schema.InsertCampaign = { name: campaignDetails.name, description: campaignDetails.description || null, status: 'draft', platforms: [], objectives: Array.isArray(campaignDetails.objectives) ? campaignDetails.objectives : [], targetAudience: campaignDetails.targetAudience || null, isTemplate: false };
				const createdCampaign = await storage.createCampaign(newCampaignData);
				agentReplyText = `Campanha **"${createdCampaign.name}"** criada com sucesso! Você pode editá-la na página de campanhas.`;
				responsePayload.action = "navigate"; responsePayload.payload = { path: `/campaigns?id=${createdCampaign.id}` };
			} else {
				agentReplyText = "Entendi que você quer criar uma campanha, mas não consegui extrair um nome. Poderia me dizer o nome para a campanha?";
			}
		} else { // CONVERSA_GERAL
			const historyForAI = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');
			const systemPrompt = "Você é ubie, um assistente de IA conciso e proativo. Use Markdown para formatar suas respostas.";
			const conversationPrompt = `${systemPrompt}\n\n--- Histórico da Conversa ---\n${historyForAI}\n\n--- Mensagem Atual ---\nuser: ${message}${fileInfo ? `\n(Contexto do anexo: ${fileInfo.content.substring(0,2000)})` : ''}\nagent:`;
			
			agentReplyText = await openRouterService.generateText(conversationPrompt);
		}
	} catch (error) {
		console.error("[MCP_HANDLER] Erro principal no fluxo de conversação:", error);
		agentReplyText = `Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.`;
	}

	await storage.addChatMessage({
		sessionId: activeSession.id,
		sender: 'agent',
		text: agentReplyText,
	});

	responsePayload.reply = agentReplyText;
	return responsePayload as MCPResponsePayload;
}


async function handleCreateTask(taskDetails: Partial<InsertCampaignTask> & { campaignName?: string; phaseName?: string; } | null): Promise<string> {
	if (!taskDetails || !taskDetails.name) {
		return "Entendi que você quer criar uma tarefa, mas não consegui identificar o nome dela. Poderia repetir, por favor?";
	}

	if (!taskDetails.campaignName) {
		return "Para qual campanha você gostaria de adicionar esta tarefa? Se ela não existir, eu posso criá-la.";
	}

	let finalCampaign: Campaign;
	let messages: string[] = [];

	const foundCampaigns = await storage.searchCampaignsByName(taskDetails.campaignName);
	if (foundCampaigns.length === 0) {
		const campaignData: schema.InsertCampaign = { name: taskDetails.campaignName, status: 'draft', platforms: [], objectives: [], targetAudience: null, isTemplate: false };
		finalCampaign = await storage.createCampaign(campaignData);
		messages.push(`Campanha **"${taskDetails.campaignName}"** não encontrada, então criei uma nova para você.`);
	} else {
		finalCampaign = foundCampaigns[0];
	}

	const campaignDetails = await storage.getCampaignWithDetails(finalCampaign.id);
	let finalPhase: CampaignPhase;

	if (taskDetails.phaseName) {
		const existingPhase = campaignDetails?.phases.find(p => p.name.toLowerCase() === taskDetails.phaseName!.toLowerCase());
		if (existingPhase) {
			finalPhase = existingPhase;
		} else {
			finalPhase = await storage.createPhase(finalCampaign.id, { name: taskDetails.phaseName });
			messages.push(`Fase **"${taskDetails.phaseName}"** não encontrada, então adicionei à campanha.`);
		}
	} else {
        if (campaignDetails && campaignDetails.phases.length > 0) {
            finalPhase = campaignDetails.phases.sort((a,b) => a.order - b.order)[0];
        } else {
            finalPhase = await storage.createPhase(finalCampaign.id, { name: "Planejamento", order: 1 });
            messages.push(`Criei uma fase padrão de **"Planejamento"** para sua tarefa.`);
        }
    }

	try {
		await storage.createTask({
			phaseId: finalPhase.id,
			name: taskDetails.name,
			description: taskDetails.description || null,
			status: 'pending',
		});
		messages.push(`Tarefa **"${taskDetails.name}"** adicionada com sucesso na fase **"${finalPhase.name}"**.`);
		return messages.join('\n');
	} catch (error) {
		console.error("Erro ao salvar tarefa:", error);
		return "Ocorreu um erro ao tentar salvar a tarefa.";
	}
}