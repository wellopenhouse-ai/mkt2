import express, { Router, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { setupMulter } from './multer.config';
import { openRouterService } from './services/openrouter.service';
import path from 'path';
import fs from 'fs';
import { WhatsappConnectionService } from './services/whatsapp-connection.service';
import { googleDriveService } from './services/google-drive.service';
import { storage } from "./storage";
import * as schemaShared from "../shared/schema";
import { ZodError } from "zod";
import { UPLOADS_PATH, APP_BASE_URL } from './config';
import { handleMCPConversation } from "./mcp_handler";
import axios from "axios";
import { createServer, type Server as HttpServer } from "http";

async function doRegisterRoutes(app: express.Express): Promise<HttpServer> {
    const { creativesUpload, lpAssetUpload, mcpAttachmentUpload } = setupMulter(UPLOADS_PATH);
    const UPLOADS_DIR_NAME = path.basename(UPLOADS_PATH);
    const CREATIVES_ASSETS_DIR = path.join(UPLOADS_PATH, 'creatives-assets');

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    const publicRouter = express.Router();
    const apiRouter = express.Router();
    
    const handleZodError: ErrorRequestHandler = (err, req, res, next) => {
      if (err instanceof ZodError) return res.status(400).json({ error: "Erro de validação.", details: err.errors });
      next(err);
    };
    const handleError: ErrorRequestHandler = (err, req, res, next) => {
      console.error(err);
      res.status(err.statusCode || 500).json({ error: err.message || "Erro interno do servidor." });
    };

    const whatsappService = new WhatsappConnectionService(1);

    // --- ROTAS PÚBLICAS ---
    publicRouter.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
    publicRouter.get('/landingpages/slug/:slug', async (req, res, next) => { try { const lp = await storage.getLandingPageBySlug(req.params.slug); if (!lp) return res.status(404).json({ error: 'Página não encontrada' }); res.json(lp); } catch(e) { next(e); } });

    // --- ROTAS DE API ---

    // Rota de Dashboard
    apiRouter.get('/dashboard', async (req: Request, res, next) => { try { const timeRange = req.query.timeRange as string | undefined; res.json(await storage.getDashboardData(timeRange)); } catch (e) { next(e); }});

    // Rota de Campanhas
    apiRouter.get('/campaigns', async (req: Request, res, next) => { try { res.json(await storage.getCampaigns()); } catch (e) { next(e); }});
    apiRouter.post('/campaigns', async (req: Request, res, next) => { try { const data = schemaShared.insertCampaignSchema.parse(req.body); res.status(201).json(await storage.createCampaign(data)); } catch (e) { next(e); }});
    apiRouter.get('/campaigns/:id', async (req: Request, res, next) => { try { const campaign = await storage.getCampaignWithDetails(parseInt(req.params.id)); if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada.'}); res.json(campaign); } catch(e) { next(e); }});
    apiRouter.put('/campaigns/:id', async (req: Request, res, next) => { try { const data = schemaShared.insertCampaignSchema.partial().parse(req.body); const updated = await storage.updateCampaign(parseInt(req.params.id), data); if (!updated) return res.status(404).json({ error: "Campanha não encontrada."}); res.json(updated); } catch (e) { next(e); } });
    apiRouter.delete('/campaigns/:id', async (req: Request, res, next) => { try { await storage.deleteCampaign(parseInt(req.params.id)); res.status(204).send(); } catch (e) { next(e); } });
    apiRouter.post('/campaigns/from-template/:templateId', async (req: Request, res, next) => { try { const templateId = parseInt(req.params.templateId, 10); const data = schemaShared.insertCampaignSchema.parse(req.body); const newCampaign = await storage.createCampaignFromTemplate(data, templateId); res.status(201).json(newCampaign); } catch (e) { next(e); } });

    // Rota de Tarefas
    apiRouter.post('/campaigns/:campaignId/tasks', async (req: Request, res, next) => { try { const data = schemaShared.insertCampaignTaskSchema.parse(req.body); const task = await storage.createTask(data); res.status(201).json(task); } catch (e) { next(e); } });
    apiRouter.put('/tasks/:taskId', async (req: Request, res, next) => { try { const taskId = parseInt(req.params.taskId, 10); const data = schemaShared.insertCampaignTaskSchema.partial().parse(req.body); const task = await storage.updateTask(taskId, data); res.json(task); } catch(e) { next(e); } });
    apiRouter.delete('/tasks/:taskId', async (req: Request, res, next) => { try { const taskId = parseInt(req.params.taskId, 10); await storage.deleteTask(taskId); res.status(204).send(); } catch (e) { next(e); } });

    // Rota de Criativos
    apiRouter.get('/creatives', async (req: Request, res, next) => { try { const campaignIdQuery = req.query.campaignId as string; const campaignId = campaignIdQuery === 'null' ? null : (campaignIdQuery ? parseInt(campaignIdQuery) : undefined); res.json(await storage.getCreatives(campaignId)); } catch (e) { next(e); }});
    apiRouter.post('/creatives', creativesUpload.single('file'), async (req: Request, res, next) => { try { const data = schemaShared.insertCreativeSchema.parse(req.body); if (req.file) { data.fileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; data.thumbnailUrl = null; } const creative = await storage.createCreative(data); res.status(201).json(creative); } catch (e) { next(e); } });
    apiRouter.put('/creatives/:id', creativesUpload.single('file'), async (req: Request, res, next) => { try { const id = parseInt(req.params.id); const existingCreative = await storage.getCreative(id); if (!existingCreative) return res.status(404).json({ error: "Criativo não encontrado." }); let updateData = schemaShared.insertCreativeSchema.partial().parse(req.body); if (req.file) { updateData.fileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${req.file.filename}`; updateData.thumbnailUrl = null; } const updated = await storage.updateCreative(id, updateData); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/creatives/:id', async (req: Request, res, next) => { try { await storage.deleteCreative(parseInt(req.params.id)); res.status(204).send(); } catch (e) { next(e); } });
    apiRouter.get('/creatives/from-drive/:folderId', async (req: Request, res, next) => { try { const files = await googleDriveService.listFilesFromFolder(req.params.folderId); res.json(files); } catch (error: any) { next(error); }});
    apiRouter.post('/creatives/import-from-drive', async (req: Request, res, next) => { try { const { campaignId, files } = req.body; if (!campaignId || !Array.isArray(files)) return res.status(400).json({ error: 'ID da campanha e lista de arquivos são obrigatórios.' }); const createdCreatives = []; for (const file of files) { if (!file.webContentLink) continue; const response = await axios({ method: 'get', url: file.webContentLink, responseType: 'stream' }); const newFilename = `gdrive-${Date.now()}${path.extname(file.name || '.jpg')}`; const localFilePath = path.join(CREATIVES_ASSETS_DIR, newFilename); const publicFileUrl = `/${UPLOADS_DIR_NAME}/creatives-assets/${newFilename}`; response.data.pipe(fs.createWriteStream(localFilePath)); await new Promise((resolve, reject) => response.data.on('end', resolve).on('error', reject)); const type = file.mimeType?.startsWith('video') ? 'video' : 'image'; const data = schemaShared.insertCreativeSchema.parse({ campaignId, name: file.name, type, fileUrl: publicFileUrl, thumbnailUrl: file.thumbnailLink, status: 'pending' }); createdCreatives.push(await storage.createCreative(data)); } res.status(201).json({ message: `${createdCreatives.length} criativo(s) importado(s).`, data: createdCreatives }); } catch (error) { next(error); }});

    // Rota de Copies
    apiRouter.get('/copies', async (req: Request, res, next) => { try { const { campaignId, phase, purpose, search } = req.query; res.json(await storage.getCopies(campaignId ? Number(campaignId) : undefined, phase as string, purpose as string, search as string)); } catch (e) { next(e); } });
    apiRouter.post('/copies', async (req: Request, res, next) => { try { const data = schemaShared.insertCopySchema.parse(req.body); res.status(201).json(await storage.createCopy(data)); } catch (e) { next(e); } });
    apiRouter.delete('/copies/:id', async (req: Request, res, next) => { try { await storage.deleteCopy(parseInt(req.params.id)); res.status(204).send(); } catch (e) { next(e); }});

    apiRouter.post('/generate-copy', async (req: Request, res, next) => {
      try {
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== 'string') {
          return res.status(400).json({ error: 'O "prompt" é obrigatório e deve ser uma string.' });
        }
        const generatedText = await openRouterService.generateText(prompt);
        res.json({ text: generatedText });
      } catch (e) {
        next(e);
      }
    });

    // Rota de Landing Pages
    apiRouter.get('/landingpages', async (req: Request, res, next) => { try { res.json(await storage.getLandingPages()); } catch (e) { next(e); }});
    apiRouter.post('/landingpages', async (req: Request, res, next) => { try { const { name } = req.body; const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); const finalSlug = await storage.generateUniqueSlug(slugBase); const lpData = schemaShared.insertLandingPageSchema.parse({ ...req.body, slug: finalSlug }); const newLp = await storage.createLandingPage(lpData); res.status(201).json(newLp); } catch(e){ next(e); }});
    apiRouter.post('/landingpages/preview-advanced', async (req: Request, res, next) => { try { const { prompt, reference, options } = req.body; if (!prompt) return res.status(400).json({ error: 'O prompt é obrigatório.' }); const fullPrompt = `Gere o código HTML completo para uma landing page com base nas seguintes instruções. O código deve usar TailwindCSS e ser um arquivo HTML completo, incluindo <!DOCTYPE html>, <html>, <head> com o título da página e <script src="https://cdn.tailwindcss.com"></script>, e o <body>.

Instrução principal do usuário: "${prompt}"
Opções de Estilo: ${JSON.stringify(options || {})}
${reference ? `Use o seguinte código HTML como referência para o estilo e estrutura, mas não o copie exatamente:\n\n---\n${reference}\n---` : ''}
Responda apenas com o código HTML.`; const generatedHtml = await openRouterService.generateText(fullPrompt); res.status(200).json({ htmlContent: generatedHtml }); } catch (e) { next(e); }});
    apiRouter.get('/landingpages/:id', async (req: Request, res, next) => { try { const lp = await storage.getLandingPage(parseInt(req.params.id)); if (!lp) return res.status(404).json({ error: 'Página não encontrada.' }); res.json(lp); } catch (e) { next(e); } });
    apiRouter.put('/landingpages/:id', async (req: Request, res, next) => { try { const lpData = schemaShared.insertLandingPageSchema.partial().parse(req.body); const updated = await storage.updateLandingPage(parseInt(req.params.id), lpData); if (!updated) return res.status(404).json({ error: "Página não encontrada." }); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/landingpages/:id', async (req: Request, res, next) => { try { await storage.deleteLandingPage(parseInt(req.params.id)); res.status(204).send(); } catch(e){ next(e); }});
    apiRouter.post('/landingpages/generate-variations', async (req: Request, res, next) => { try { const { prompt, count, options, reference } = req.body; if (!prompt) return res.status(400).json({ error: 'O prompt é obrigatório para gerar variações.' }); const variationCount = count || 2; const variationPromises = []; const basePrompt = `Gere uma variação de código HTML para uma landing page com base nas seguintes instruções. O código deve usar TailwindCSS e ser um arquivo HTML completo, incluindo <!DOCTYPE html>, <html>, <head> com o título da página e <script src="https://cdn.tailwindcss.com"></script>, e o <body>.

Instrução principal do usuário: "${prompt}"
Opções de Estilo: ${JSON.stringify(options || {})}
${reference ? `Use o seguinte código HTML como referência para o estilo e estrutura, mas não o copie exatamente:\n\n---\n${reference}\n---` : ''}
Responda apenas com o código HTML.`; for (let i = 0; i < variationCount; i++) { variationPromises.push(openRouterService.generateText(`${basePrompt}\n\nInstrução Adicional: Crie a Variação #${i + 1} com uma abordagem criativa diferente.`)); } const variations = await Promise.all(variationPromises); res.json({ variations }); } catch (e) { next(e); } });
    apiRouter.post('/landingpages/optimize', async (req: Request, res, next) => { try { const { html, goals } = req.body; if (!html) return res.status(400).json({ error: 'O conteúdo HTML é obrigatório para otimização.' }); const prompt = `Otimize o seguinte código HTML de uma landing page para atingir estas metas: ${goals || 'melhorar a conversão'}. Analise o HTML, identifique áreas de melhoria e reescreva o código para ser mais eficaz, mantendo a estrutura e o conteúdo principal.

HTML Original:
---
${html}
---
Responda apenas com o código HTML otimizado.`; const optimizedHtml = await openRouterService.generateText(prompt); res.json({ htmlContent: optimizedHtml }); } catch (e) { next(e); } });
    apiRouter.post('/analyze-scenario', async (req: Request, res: Response) => { try { const { inputs, calculations } = req.body; if (!inputs || !calculations) { return res.status(400).json({ message: 'Dados de inputs e calculations são obrigatórios.' }); } const prompt = `Analise o seguinte cenário de funil de marketing e forneça uma análise detalhada sobre sua viabilidade, pontos fortes, pontos fracos e sugestões de melhoria.

Dados de Entrada do Cenário:
${JSON.stringify(inputs, null, 2)}
Cálculos e Métricas do Funil:
${JSON.stringify(calculations, null, 2)}
Seja claro e estruturado em sua análise.`; const analysis = await openRouterService.generateText(prompt); res.json({ analysis }); } catch (error) { console.error('Erro na rota /analyze-scenario:', error); const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'; res.status(500).json({ message: 'Falha ao analisar o cenário', error: errorMessage }); } });
    
    // Rotas de Assets para Landing Pages (GrapesJS)
    apiRouter.post('/assets/lp-upload', lpAssetUpload.array('files'), (req: Request, res, next) => { try { if (!req.files || !Array.isArray(req.files) || req.files.length === 0) return res.status(400).json({ error: "Nenhum arquivo enviado." }); const urls = req.files.map(file => `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/lp-assets/${file.filename}`); res.status(200).json(urls); } catch(e){ next(e); }});

    // Rotas do MCP (ubie)
    apiRouter.post('/mcp/converse', async (req: Request, res, next) => { try { const { message, sessionId, attachmentUrl } = req.body; const payload = await handleMCPConversation(1, message, sessionId, attachmentUrl); res.json(payload); } catch(e) { next(e); }});
    apiRouter.post('/mcp/upload-attachment', mcpAttachmentUpload.single('attachment'), (req: Request, res, next) => { try { if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." }); const publicUrl = `${APP_BASE_URL}/${UPLOADS_DIR_NAME}/mcp-attachments/${req.file.filename}`; res.status(200).json({ url: publicUrl }); } catch (e) { next(e); } });
    
    // Rotas de Sessões de Chat
    apiRouter.get('/chat/sessions', async (req: Request, res, next) => { try { res.json(await storage.getChatSessions()); } catch(e){ next(e); }});
    apiRouter.post('/chat/sessions', async (req: Request, res, next) => { try { const data = schemaShared.insertChatSessionSchema.parse(req.body); res.status(201).json(await storage.createChatSession(data.title)); } catch(e){ next(e); }});
    apiRouter.get('/chat/sessions/:sessionId/messages', async (req: Request, res, next) => { try { res.json(await storage.getChatMessages(parseInt(req.params.sessionId))); } catch(e){ next(e); }});
    apiRouter.put('/chat/sessions/:sessionId/title', async (req: Request, res, next) => { try { const updated = await storage.updateChatSessionTitle(parseInt(req.params.sessionId), req.body.title); res.json(updated); } catch(e){ next(e); }});
    apiRouter.delete('/chat/sessions/:sessionId', async (req: Request, res, next) => { try { await storage.deleteChatSession(parseInt(req.params.sessionId)); res.status(204).send(); } catch(e){ next(e); }});

    // Rotas do WhatsApp
    apiRouter.get('/whatsapp/status', (req: Request, res) => res.json(WhatsappConnectionService.getStatus(1)));
    apiRouter.post('/whatsapp/connect', async (req: Request, res, next) => { try { whatsappService.connectToWhatsApp(); res.status(202).json({ message: "Iniciando conexão..." }); } catch (e) { next(e); } });
    apiRouter.post('/whatsapp/disconnect', async (req: Request, res, next) => { try { await whatsappService.disconnectWhatsApp(); res.json({ message: "Desconexão solicitada." }); } catch (e) { next(e); }});

    // Rotas do WhatsApp (Manual) e Fluxos
    apiRouter.get('/whatsapp/contacts', async (req: Request, res, next) => { try { const contacts = await storage.getContacts(); res.json(contacts); } catch (e) { next(e); }});
    apiRouter.get('/whatsapp/messages', async (req: Request, res, next) => { try { const { contactNumber } = req.query; if (typeof contactNumber !== 'string') return res.status(400).json({ error: 'Número de contato é obrigatório.' }); res.json(await storage.getMessages(contactNumber)); } catch (e) { next(e); }});
    apiRouter.post('/whatsapp/messages', async (req: Request, res, next) => { try { const data = schemaShared.insertWhatsappMessageSchema.parse({ ...req.body, direction: 'outgoing' }); const newMessage = await storage.createWhatsappMessage(data); res.status(201).json(newMessage); } catch (e) { next(e); }});
    
    // Rotas de Fluxos
    apiRouter.get('/flows', async (req: Request, res, next) => { try { const flowId = req.query.id ? parseInt(String(req.query.id)) : undefined; const campaignId = req.query.campaignId ? parseInt(String(req.query.campaignId)) : undefined; if(flowId) { const flow = await storage.getFlow(flowId); if (!flow) return res.status(404).json({error: 'Fluxo não encontrado.'}); return res.json(flow); } res.json(await storage.getFlows(campaignId)); } catch (e) { next(e); }});
    apiRouter.post('/flows', async (req: Request, res, next) => { try { const data = schemaShared.insertFlowSchema.parse(req.body); const newFlow = await storage.createFlow(data); res.status(201).json(newFlow); } catch(e) { next(e); }});
    apiRouter.put('/flows', async (req: Request, res, next) => { try { const flowId = req.query.id ? parseInt(String(req.query.id)) : undefined; if (!flowId) return res.status(400).json({ error: 'ID do fluxo é obrigatório.' }); const data = schemaShared.insertFlowSchema.partial().parse(req.body); const updated = await storage.updateFlow(flowId, data); if (!updated) return res.status(404).json({error: "Fluxo não encontrado."}); res.json(updated); } catch (e) { next(e); }});
    apiRouter.delete('/flows', async (req: Request, res, next) => { try { const flowId = req.query.id ? parseInt(String(req.query.id)) : undefined; if (!flowId) return res.status(400).json({ error: 'ID do fluxo é obrigatório.' }); const success = await storage.deleteFlow(flowId); if (!success) return res.status(404).json({error: "Fluxo não encontrado."}); res.status(204).send(); } catch (e) { next(e); }});

    // --- REGISTRO DOS ROUTERS ---
    app.use('/api', publicRouter, apiRouter);
    app.use(handleZodError);
    app.use(handleError);

    return createServer(app);
}

export const RouterSetup = {
    registerRoutes: doRegisterRoutes
};