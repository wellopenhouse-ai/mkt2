import { excelStorage } from './services/excel-storage.service';
import * as schema from '../shared/schema';
import { openRouterService } from './services/openrouter.service';

// Esta classe agora atua como uma camada de lógica de negócios sobre o armazenamento genérico em Excel.
// Ela traduz operações de negócios em chamadas para o serviço excelStorage.
export class StorageAdapter {

  // --- Geração de Slug ---
  async generateUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    // Usa um loop com findBy para verificar a existência
    while (excelStorage.findBy<schema.LandingPage>('landingPages', lp => lp.slug === slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  }

  // --- Campanhas e Fases ---
  async getCampaigns(limit?: number): Promise<schema.Campaign[]> {
    const campaigns = excelStorage.getAll<schema.Campaign>('campaigns');
    // Ordena por data de criação descendente
    campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (limit) {
      return campaigns.slice(0, limit);
    }
    return campaigns;
  }

  async getCampaign(id: number): Promise<schema.Campaign | undefined> {
    return excelStorage.getById<schema.Campaign>('campaigns', id);
  }

  async getCampaignWithDetails(id: number): Promise<schema.FullCampaignData | undefined> {
    const campaign = excelStorage.getById<schema.Campaign>('campaigns', id);
    if (!campaign) return undefined;

    const allPhases = excelStorage.getAll<schema.CampaignPhase>('campaignPhases');
    const campaignPhases = allPhases.filter(p => p.campaignId === id);

    const allTasks = excelStorage.getAll<schema.CampaignTask>('campaignTasks');

    const phasesWithTasks = campaignPhases.map(phase => {
      const tasks = allTasks.filter(t => t.phaseId === phase.id);
      return { ...phase, tasks };
    });

    phasesWithTasks.sort((a, b) => a.order - b.order);

    return { ...campaign, phases: phasesWithTasks };
  }

  async searchCampaignsByName(nameFragment: string): Promise<schema.Campaign[]> {
    if (!nameFragment || nameFragment.trim() === '') return [];
    const lowerCaseFragment = nameFragment.toLowerCase();
    const campaigns = excelStorage.filterBy<schema.Campaign>('campaigns', c => c.name.toLowerCase().includes(lowerCaseFragment));
    campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return campaigns;
  }

  async createCampaign(campaignData: schema.InsertCampaign): Promise<schema.Campaign> {
    const newCampaign = excelStorage.create<schema.Campaign>('campaigns', campaignData);
    if (!newCampaign) throw new Error("Falha ao criar campanha.");

    const defaultPhases = ['Planejamento', 'Aquisição', 'Aquecimento', 'Evento', 'Carrinho', 'Recuperação', 'Downsell', 'Debriefing'];
    for (let i = 0; i < defaultPhases.length; i++) {
      excelStorage.create('campaignPhases', {
        campaignId: newCampaign.id,
        name: defaultPhases[i],
        order: i,
      });
    }
    return newCampaign;
  }

  async createCampaignFromTemplate(campaignData: schema.InsertCampaign, templateId: number): Promise<schema.Campaign> {
    const template = await this.getCampaignWithDetails(templateId);
    if (!template || !template.isTemplate) throw new Error("Template não encontrado.");

    const newCampaignData = {
      ...campaignData,
      description: campaignData.description || template.description,
      platforms: campaignData.platforms && campaignData.platforms.length > 0 ? campaignData.platforms : template.platforms,
      objectives: campaignData.objectives && campaignData.objectives.length > 0 ? campaignData.objectives : template.objectives,
      targetAudience: campaignData.targetAudience || template.targetAudience,
      industry: campaignData.industry || template.industry,
      isTemplate: false,
    };

    const newCampaign = excelStorage.create<schema.Campaign>('campaigns', newCampaignData);

    if (template.phases) {
      for (const phase of template.phases) {
        const newPhase = excelStorage.create<schema.CampaignPhase>('campaignPhases', {
          campaignId: newCampaign.id,
          name: phase.name,
          order: phase.order,
          startDate: newCampaign.startDate,
          endDate: newCampaign.endDate,
        });

        if (phase.tasks) {
          for (const task of phase.tasks) {
            excelStorage.create('campaignTasks', {
              phaseId: newPhase.id,
              name: task.name,
              description: task.description,
              status: 'pending',
            });
          }
        }
      }
    }
    return newCampaign;
  }

  async updateCampaign(id: number, data: Partial<Omit<schema.InsertCampaign, 'userId'>> & { phases?: Partial<schema.InsertCampaignPhase>[] }) {
    const { phases, ...campaignData } = data;

    if (Object.keys(campaignData).length > 0) {
      excelStorage.update('campaigns', id, campaignData);
    }
    if (phases) {
      for (const phaseData of phases) {
        if (phaseData.id && (phaseData.startDate || phaseData.endDate)) {
          excelStorage.update('campaignPhases', phaseData.id, {
            startDate: phaseData.startDate,
            endDate: phaseData.endDate,
          });
        }
      }
    }
    return await this.getCampaignWithDetails(id);
  }

  async deleteCampaign(id: number): Promise<boolean> {
    const campaignPhases = excelStorage.filterBy<schema.CampaignPhase>('campaignPhases', p => p.campaignId === id);
    for (const phase of campaignPhases) {
        const campaignTasks = excelStorage.filterBy<schema.CampaignTask>('campaignTasks', t => t.phaseId === phase.id);
        for(const task of campaignTasks) {
            excelStorage.delete('campaignTasks', task.id);
        }
        excelStorage.delete('campaignPhases', phase.id);
    }
    return excelStorage.delete('campaigns', id);
  }

  async createPhase(campaignId: number, phaseData: { name: string; order?: number }): Promise<schema.CampaignPhase> {
    return excelStorage.create<schema.CampaignPhase>('campaignPhases', { campaignId, ...phaseData });
  }

  // --- Tarefas ---
  async createTask(taskData: schema.InsertCampaignTask): Promise<schema.CampaignTask> {
    return excelStorage.create<schema.CampaignTask>('campaignTasks', taskData);
  }
  async updateTask(id: number, taskData: Partial<Omit<schema.InsertCampaignTask, 'phaseId'>>): Promise<schema.CampaignTask | undefined> {
    return excelStorage.update<schema.CampaignTask>('campaignTasks', id, taskData);
  }
  async deleteTask(id: number): Promise<boolean> {
    return excelStorage.delete('campaignTasks', id);
  }

  // --- Criativos ---
  async getCreatives(campaignId?: number | null): Promise<schema.Creative[]> {
    const creatives = excelStorage.filterBy<schema.Creative>('creatives', c =>
        campaignId !== undefined ? (campaignId === null ? c.campaignId === null : c.campaignId === campaignId) : true
    );
    creatives.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return creatives;
  }
  async getCreative(id: number): Promise<schema.Creative | undefined> {
    return excelStorage.getById<schema.Creative>('creatives', id);
  }
  async createCreative(creativeData: schema.InsertCreative): Promise<schema.Creative> {
    return excelStorage.create<schema.Creative>('creatives', creativeData);
  }
  async updateCreative(id: number, creativeData: Partial<Omit<schema.InsertCreative, 'userId'>>): Promise<schema.Creative | undefined> {
    return excelStorage.update<schema.Creative>('creatives', id, creativeData);
  }
  async deleteCreative(id: number): Promise<boolean> {
    return excelStorage.delete('creatives', id);
  }

  // --- Copies ---
  async getCopies(campaignId?: number | null, phase?: string, purposeKey?: string, searchTerm?: string): Promise<schema.Copy[]> {
    const copies = excelStorage.filterBy<schema.Copy>('copies', c => {
        if (campaignId !== undefined && (campaignId === null ? c.campaignId !== null : c.campaignId !== campaignId)) return false;
        if (phase && phase !== 'all' && c.launchPhase !== phase) return false;
        if (purposeKey && purposeKey !== 'all' && c.purposeKey !== purposeKey) return false;
        if (searchTerm && searchTerm.trim() !== '' && !c.title.toLowerCase().includes(searchTerm.toLowerCase()) && !c.content.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });
    copies.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copies;
  }
  async createCopy(copyData: schema.InsertCopy): Promise<schema.Copy> {
    return excelStorage.create<schema.Copy>('copies', copyData);
  }
  async updateCopy(id: number, copyData: Partial<Omit<schema.InsertCopy, 'id' | 'createdAt'>>): Promise<schema.Copy | undefined> {
    return excelStorage.update<schema.Copy>('copies', id, copyData);
  }
  async deleteCopy(id: number): Promise<boolean> {
    return excelStorage.delete('copies', id);
  }

  // --- Landing Pages ---
  async getLandingPages(): Promise<schema.LandingPage[]> {
    const lps = excelStorage.getAll<schema.LandingPage>('landingPages');
    lps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return lps;
  }
  async getLandingPage(id: number): Promise<schema.LandingPage | undefined> {
    return excelStorage.getById<schema.LandingPage>('landingPages', id);
  }
  async getLandingPageBySlug(slug: string): Promise<schema.LandingPage | undefined> {
    return excelStorage.findBy<schema.LandingPage>('landingPages', lp => lp.slug === slug);
  }
  async createLandingPage(lpData: schema.InsertLandingPage): Promise<schema.LandingPage> {
    return excelStorage.create<schema.LandingPage>('landingPages', lpData);
  }
  async updateLandingPage(id: number, lpData: Partial<Omit<schema.InsertLandingPage, 'userId'>>): Promise<schema.LandingPage | undefined> {
    return excelStorage.update<schema.LandingPage>('landingPages', id, lpData);
  }
  async deleteLandingPage(id: number): Promise<boolean> {
    return excelStorage.delete('landingPages', id);
  }

  // --- Chat (MCP) ---
  async createChatSession(title: string = 'Nova Conversa'): Promise<schema.ChatSession> {
    return excelStorage.create<schema.ChatSession>('chatSessions', { title });
  }
  async getChatSessions(): Promise<schema.ChatSession[]> {
    const sessions = excelStorage.getAll<schema.ChatSession>('chatSessions');
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return sessions;
  }
  async getChatSession(sessionId: number): Promise<schema.ChatSession | undefined> {
    return excelStorage.getById<schema.ChatSession>('chatSessions', sessionId);
  }
  async updateChatSessionTitle(sessionId: number, newTitle: string): Promise<schema.ChatSession | undefined> {
    return excelStorage.update<schema.ChatSession>('chatSessions', sessionId, { title: newTitle });
  }
  async deleteChatSession(sessionId: number): Promise<boolean> {
    const messages = excelStorage.filterBy<schema.ChatMessage>('chatMessages', m => m.sessionId === sessionId);
    for (const msg of messages) {
        excelStorage.delete('chatMessages', msg.id);
    }
    return excelStorage.delete('chatSessions', sessionId);
  }
  async addChatMessage(messageData: schema.InsertChatMessage): Promise<schema.ChatMessage> {
    const newMessage = excelStorage.create<schema.ChatMessage>('chatMessages', messageData);
    excelStorage.update('chatSessions', messageData.sessionId, { updatedAt: new Date() });
    return newMessage;
  }
  async getChatMessages(sessionId: number): Promise<schema.ChatMessage[]> {
    const messages = excelStorage.filterBy<schema.ChatMessage>('chatMessages', m => m.sessionId === sessionId);
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return messages;
  }

  // --- Flows ---
  async getFlows(campaignId?: number | null): Promise<schema.Flow[]> {
    const flows = excelStorage.filterBy<schema.Flow>('flows', f =>
        campaignId !== undefined ? (campaignId === null ? f.campaignId === null : f.campaignId === campaignId) : true
    );
    flows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return flows;
  }
  async getFlow(id: number): Promise<schema.Flow | undefined> {
    return excelStorage.getById<schema.Flow>('flows', id);
  }
  async createFlow(flowData: Omit<schema.InsertFlow, 'userId'>): Promise<schema.Flow> {
    return excelStorage.create<schema.Flow>('flows', flowData);
  }
  async updateFlow(id: number, flowData: Partial<Omit<schema.InsertFlow, 'userId'>>): Promise<schema.Flow | undefined> {
    return excelStorage.update<schema.Flow>('flows', id, flowData);
  }
  async deleteFlow(id: number): Promise<boolean> {
    return excelStorage.delete('flows', id);
  }

  // --- WhatsApp (Manual Chat) ---
  async getContacts(): Promise<any[]> {
    const allMessages = excelStorage.getAll<schema.WhatsappMessage>('whatsappMessages');
    allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const contactsMap = new Map<string, any>();
    for (const msg of allMessages) {
      if (!contactsMap.has(msg.contactNumber)) {
        contactsMap.set(msg.contactNumber, {
          contactNumber: msg.contactNumber,
          contactName: msg.contactName || null,
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          unreadCount: 0,
        });
      }
      const contact = contactsMap.get(msg.contactNumber)!;
      if (!msg.isRead && msg.direction === 'incoming') {
        contact.unreadCount++;
      }
    }
    return Array.from(contactsMap.values());
  }

  async getMessages(contactNumber: string): Promise<schema.WhatsappMessage[]> {
    const messages = excelStorage.filterBy<schema.WhatsappMessage>('whatsappMessages', m => m.contactNumber === contactNumber);
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return messages;
  }

  async createWhatsappMessage(messageData: schema.InsertWhatsappMessage): Promise<schema.WhatsappMessage> {
    return excelStorage.create<schema.WhatsappMessage>('whatsappMessages', messageData);
  }

  // --- Dashboard ---
  async getDashboardData(timeRange: string = '30d'): Promise<any> {
    const now = new Date();
    let startDate = new Date();
    if (timeRange === '7d') startDate.setDate(now.getDate() - 7);
    else if (timeRange === '90d') startDate.setDate(now.getDate() - 90);
    else startDate.setDate(now.getDate() - 30);

    const allMetrics = excelStorage.getAll<schema.Metric>('metrics');
    const metricsInTimeRange = allMetrics.filter(m => new Date(m.date) >= startDate);
    
    const activeCampaigns = excelStorage.filterBy<schema.Campaign>('campaigns', c => c.status === 'active');

    const totalCost = metricsInTimeRange.reduce((sum, m) => sum + Number(m.cost || 0), 0);
    const totalRevenue = metricsInTimeRange.reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    const totalConversions = metricsInTimeRange.reduce((sum, m) => sum + Number(m.conversions || 0), 0);
    const totalClicks = metricsInTimeRange.reduce((sum, m) => sum + Number(m.clicks || 0), 0);
    const totalImpressions = metricsInTimeRange.reduce((sum, m) => sum + Number(m.impressions || 0), 0);

    const metrics = {
      activeCampaigns: activeCampaigns.length,
      totalCostPeriod: totalCost,
      conversions: totalConversions,
      impressions: totalImpressions,
      clicks: totalClicks,
      avgROI: totalCost > 0 ? (totalRevenue - totalCost) / totalCost : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
      cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
      cvr: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      cpm: totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0,
    };

    const recentCampaigns = await this.getCampaigns(5);

    let aiInsights: string[] = [];
    try {
        const prompt = `Você é um especialista em marketing digital. Analise os seguintes dados de performance de campanha do período e forneça 3 insights acionáveis em formato de lista (use '*' para cada item). Seja conciso e direto. Dados: ${JSON.stringify(metrics)}`;
        const rawInsights = await openRouterService.generateText(prompt);
        aiInsights = rawInsights.split('*').map(s => s.trim()).filter(Boolean);
    } catch (aiError) {
        console.error("AI Insight Generation Failed:", aiError);
        aiInsights = ["A geração de insights falhou. Verifique a conexão com o serviço de IA."];
    }

    const timeSeriesData = { labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'], datasets: [{ label: 'Cliques', data: [120, 180, 150, 220], borderColor: '#3b82f6', tension: 0.3 }] };
    const channelPerformanceData = { labels: ['Google Ads', 'Meta Ads', 'TikTok Ads'], datasets: [{ label: 'Investimento', data: [300, 500, 200], backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'] }] };
    const roiData = { labels: ['Google Ads', 'Meta Ads', 'TikTok Ads'], datasets: [{ label: 'ROI', data: [4.5, 3.2, 5.1], backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'] }] };

    return {
        metrics,
        recentCampaigns,
        aiInsights,
        timeSeriesData,
        channelPerformanceData,
        roiData
    };
  }
}

export const storage = new StorageAdapter();