// shared/schema.ts
// NOTA: Este arquivo foi drasticamente simplificado para remover todos os conceitos de múltiplos usuários,
// autenticação e funcionalidades específicas de banco de dados, como chaves estrangeiras e relações,
// em preparação para a migração da camada de persistência de dados para arquivos Excel.

import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
// import { relations } from 'drizzle-orm'; // As relações foram removidas por serem um conceito de BD

// --- Enums ---
export const campaignStatusEnum = pgEnum('campaign_status', ['active', 'paused', 'completed', 'draft']);
export const chatSenderEnum = pgEnum('chat_sender', ['user', 'agent']);
export const launchPhaseEnum = pgEnum('launch_phase', ['pre_launch', 'launch', 'post_launch']);
export const flowStatusEnum = pgEnum('flow_status', ['active', 'inactive', 'draft']);
export const integrationPlatformEnum = pgEnum('integration_platform', ['shopify', 'hotmart', 'meta', 'google']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'on_hold']);

// --- Interfaces e Tipos ---
export interface FlowElementData { nodes: any[]; edges: any[]; }
export interface BaseGeneratorFormState { product: string; audience: string; objective: 'sales' | 'leads' | 'engagement' | 'awareness'; tone: 'professional' | 'casual' | 'urgent' | 'inspirational' | 'educational' | 'empathetic' | 'divertido' | 'sofisticado';}
export type LaunchPhase = z.infer<typeof launchPhaseEnum.enumValues[number]>;
export interface FieldDefinition { name: string; label: string; type: 'text' | 'textarea' | 'select' | 'number' | 'date'; placeholder?: string; tooltip: string; required?: boolean; options?: Array<{ value: string; label: string }>; defaultValue?: string | number | boolean; dependsOn?: string; showIf?: (formData: Record<string, any>, baseData?: BaseGeneratorFormState) => boolean;}
export interface CopyPurposeConfig { key: string; label: string; phase: LaunchPhase; fields: FieldDefinition[]; category: string; description?: string; promptEnhancer?: (basePrompt: string, details: Record<string, any>, baseForm: BaseGeneratorFormState) => string;}

export interface LandingPageOptions {
  style?: 'modern' | 'minimal' | 'bold' | 'elegant' | 'tech' | 'startup';
  colorScheme?: 'dark' | 'light' | 'gradient' | 'neon' | 'earth' | 'ocean';
  industry?: string;
  targetAudience?: string;
  primaryCTA?: string;
  secondaryCTA?: string;
  includeTestimonials?: boolean;
  includePricing?: boolean;
  includeStats?: boolean;
  includeFAQ?: boolean;
  animationsLevel?: 'none' | 'subtle' | 'moderate' | 'dynamic';
}


// --- Definições de "Tabelas" (Estruturas de Dados) ---
// A tabela 'users' foi removida.
// Todas as colunas 'userId' e 'assigneeId' foram removidas das tabelas.
// As referências de chave estrangeira foram removidas.

export const campaigns = pgTable("campaigns", { id: serial("id").primaryKey(), name: text("name").notNull(), description: text("description"), status: campaignStatusEnum("status").default("draft").notNull(), platforms: jsonb("platforms").$type<string[]>().default([]).notNull(), objectives: jsonb("objectives").$type<string[]>().default([]).notNull(), budget: decimal("budget", { precision: 10, scale: 2 }), dailyBudget: decimal("daily_budget", { precision: 10, scale: 2 }), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), targetAudience: text("target_audience"), industry: text("industry"), avgTicket: decimal("avg_ticket", { precision: 10, scale: 2 }), isTemplate: boolean("is_template").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const campaignPhases = pgTable("campaign_phases", { id: serial("id").primaryKey(), campaignId: integer("campaign_id").notNull(), name: text("name").notNull(), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), order: integer("order").default(0).notNull(),});
export const campaignTasks = pgTable("campaign_tasks", { id: serial("id").primaryKey(), phaseId: integer("phase_id").notNull(), name: text("name").notNull(), description: text("description"), status: taskStatusEnum("status").default("pending").notNull(), startDate: timestamp("start_date", { withTimezone: true }), endDate: timestamp("end_date", { withTimezone: true }), });
export const copies = pgTable("copies", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), title: text("title").notNull(), content: text("content").notNull(), purposeKey: text("purpose_key").notNull(), launchPhase: launchPhaseEnum("launch_phase").notNull(), details: jsonb("details").$type<Record<string, any>>().default({}).notNull(), baseInfo: jsonb("base_info").$type<BaseGeneratorFormState | any>().default({}).notNull(), fullGeneratedResponse: jsonb("full_generated_response").$type<any>().default({}).notNull(), platform: text("platform"), isFavorite: boolean("is_favorite").default(false).notNull(), tags: jsonb("tags").$type<string[]>().default([]).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const creatives = pgTable("creatives", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), name: text("name").notNull(), type: text("type", { enum: ["image", "video", "text", "carousel"] }).notNull(), fileUrl: text("file_url"), content: text("content"), status: text("status", { enum: ["approved", "pending", "rejected"] }).default("pending").notNull(), platforms: jsonb("platforms").$type<string[]>().default([]).notNull(), thumbnailUrl: text("thumbnail_url"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const metrics = pgTable("metrics", { id: serial("id").primaryKey(), campaignId: integer("campaign_id").notNull(), date: timestamp("date", { withTimezone: true }).notNull(), impressions: integer("impressions").default(0).notNull(), clicks: integer("clicks").default(0).notNull(), conversions: integer("conversions").default(0).notNull(), cost: decimal("cost", { precision: 10, scale: 2 }).default("0").notNull(), revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0").notNull(), leads: integer("leads").default(0).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const whatsappMessages = pgTable("whatsapp_messages", { id: serial("id").primaryKey(), contactNumber: text("contact_number").notNull(), contactName: text("contact_name"), message: text("message").notNull(), direction: text("direction", { enum: ["incoming", "outgoing"] }).notNull(), timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(), isRead: boolean("is_read").default(false).notNull(),});
export const alerts = pgTable("alerts", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), type: text("type", { enum: ["budget", "performance", "approval", "system"] }).notNull(), title: text("title").notNull(), message: text("message").notNull(), isRead: boolean("is_read").default(false).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const budgets = pgTable("budgets", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), totalBudget: decimal("total_budget", { precision: 10, scale: 2 }).notNull(), spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0").notNull(), period: text("period", { enum: ["daily", "weekly", "monthly", "total"] }).notNull(), startDate: timestamp("start_date", { withTimezone: true }).notNull(), endDate: timestamp("end_date", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),});
export const landingPages = pgTable("landing_pages", { id: serial("id").primaryKey(), name: text("name").notNull(), studioProjectId: varchar("studio_project_id", { length: 255 }).unique(), slug: varchar("slug", { length: 255 }).notNull().unique(), description: text("description"), grapesJsData: jsonb("grapes_js_data"), generationOptions: jsonb("generation_options").$type<LandingPageOptions>(), status: text("status", { enum: ["draft", "published", "archived"] }).default("draft").notNull(), publicUrl: text("public_url"), publishedAt: timestamp("published_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const chatSessions = pgTable('chat_sessions', { id: serial('id').primaryKey(), title: text('title').notNull().default('Nova Conversa'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),});
export const chatMessages = pgTable('chat_messages', { id: serial('id').primaryKey(), sessionId: integer('session_id').notNull(), sender: chatSenderEnum('sender').notNull(), text: text('text').notNull(), attachmentUrl: text('attachment_url'), timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),});
export const funnels = pgTable("funnels", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), name: text("name").notNull(), description: text("description"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const funnelStages = pgTable("funnel_stages", { id: serial("id").primaryKey(), funnelId: integer("funnel_id").notNull(), name: text("name").notNull(), description: text("description"), order: integer("order").notNull().default(0), config: jsonb("config").$type<Record<string, any>>().default({}), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const flows = pgTable("flows", { id: serial("id").primaryKey(), campaignId: integer("campaign_id"), name: text("name").notNull(), status: flowStatusEnum("status").default("draft").notNull(), elements: jsonb("elements").$type<FlowElementData>().default({'nodes': [], 'edges': []}).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),});
export const integrations = pgTable("integrations", { id: serial("id").primaryKey(), platform: integrationPlatformEnum("platform").notNull(), credentials: jsonb("credentials").$type<Record<string, any>>().notNull(), metadata: jsonb("metadata").$type<Record<string, any>>(), status: text("status", { enum: ["connected", "disconnected", "error"] }).default("disconnected").notNull(), lastSync: timestamp("last_sync", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()});

// --- RELAÇÕES REMOVIDAS ---
// O sistema de relações do Drizzle foi removido, pois não é aplicável
// ao armazenamento em arquivos Excel e dependia da tabela 'users'.

// --- SCHEMAS ZOD PARA INSERÇÃO E SELEÇÃO ---
const FlowElementsSchema = z.object({ nodes: z.array(z.any()).default([]), edges: z.array(z.any()).default([]), }).nullable().optional().default({ nodes: [], edges: [] });

// O schema do usuário foi removido.
// Os schemas de inserção foram atualizados para não mais omitir 'userId'.
export const insertCampaignSchema = createInsertSchema(campaigns, { name: z.string().min(1, "Nome da campanha é obrigatório."), budget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Orçamento deve ser um número" }).nullable().optional() ), dailyBudget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Orçamento diário deve ser um número" }).nullable().optional() ), avgTicket: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Ticket médio deve ser um número" }).nullable().optional() ), startDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), endDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), platforms: z.preprocess( (val) => { if (Array.isArray(val)) return val; if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s); return []; }, z.array(z.string()).default([]) ), objectives: z.preprocess( (val) => { if (Array.isArray(val)) return val; if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(s => s); return []; }, z.array(z.string()).default([]) ), isTemplate: z.boolean().optional().default(false), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCreativeSchema = createInsertSchema(creatives, { name: z.string().min(1, "Nome do criativo é obrigatório."), type: z.enum(creatives.type.enumValues as [string, ...string[]]), status: z.enum(creatives.status.enumValues as [string, ...string[]]).optional(), platforms: z.preprocess((val) => { if (Array.isArray(val)) { return val; } if (typeof val === 'string') { try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch (e) { return val.split(',').map(s => s.trim()).filter(Boolean); } } return []; }, z.array(z.string()).optional()), fileUrl: z.string().nullable().optional(), thumbnailUrl: z.string().nullable().optional(), campaignId: z.preprocess( (val) => { if (val === "NONE" || val === null || val === undefined || val === "") { return null; } const parsed = parseInt(String(val)); return isNaN(parsed) ? null : parsed; }, z.number().int().positive().nullable().optional() ),}).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCopySchema = createInsertSchema(copies, {
  title: z.string().min(1, "Título da copy é obrigatório."),
  content: z.string().min(1, "Conteúdo (mainCopy) é obrigatório."),
  purposeKey: z.string().min(1, "Chave da finalidade (purposeKey) é obrigatória."),
  launchPhase: z.enum(launchPhaseEnum.enumValues, {
    required_error: "Fase de lançamento é obrigatória.",
    invalid_type_error: "Fase de lançamento inválida.",
  }),
  details: z.record(z.any()).optional().nullable().default({}),
  baseInfo: z.record(z.any()).optional().nullable().default({}),
  fullGeneratedResponse: z.record(z.any()).optional().nullable().default({}),
  platform: z.string().optional().nullable(),
  isFavorite: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().nullable().default([]),
  campaignId: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE") {
        return null;
      }
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? null : parsed;
      }
      if (typeof val === 'number') {
        return val;
      }
      return null;
    },
    z.number().int().positive().nullable().optional()
  ),
}).omit({ id: true, createdAt: true, lastUpdatedAt: true });
export const insertFunnelSchema = createInsertSchema(funnels, { name: z.string().min(1, "O nome do funil é obrigatório."), description: z.string().nullable().optional(), campaignId: z.preprocess( (val) => { if (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE") { return null; } const parsed = parseInt(String(val)); return isNaN(parsed) ? null : parsed; }, z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFunnelStageSchema = createInsertSchema(funnelStages, { name: z.string().min(1, "O nome da etapa é obrigatório."), description: z.string().nullable().optional(), order: z.number().int().min(0).default(0), config: z.record(z.any()).optional().nullable().default({}), funnelId: z.number().int().positive("ID do funil inválido."), }).omit({ id: true, createdAt: true, updatedAt: true });
const landingPageOptionsSchema = z.object({ style: z.enum(['modern', 'minimal', 'bold', 'elegant', 'tech', 'startup']).optional(), colorScheme: z.enum(['dark', 'light', 'gradient', 'neon', 'earth', 'ocean']).optional(), industry: z.string().optional(), targetAudience: z.string().optional(), primaryCTA: z.string().optional(), secondaryCTA: z.string().optional(), includeTestimonials: z.boolean().optional(), includePricing: z.boolean().optional(), includeStats: z.boolean().optional(), includeFAQ: z.boolean().optional(), animationsLevel: z.enum(['none', 'subtle', 'moderate', 'dynamic']).optional() }).optional().nullable();
export const insertLandingPageSchema = createInsertSchema(landingPages, { name: z.string().min(1, "Nome da landing page é obrigatório."), slug: z.string().min(3, "Slug deve ter pelo menos 3 caracteres.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido."), grapesJsData: z.record(z.any()).optional().nullable(), studioProjectId: z.string().optional().nullable(), status: z.enum(landingPages.status.enumValues as [string, ...string[]]).optional(), generationOptions: landingPageOptionsSchema, }).omit({ id: true, createdAt: true, updatedAt: true, publicUrl: true, publishedAt: true });
export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages, { contactNumber: z.string().min(1, "Número de contato é obrigatório."), message: z.string().min(1, "Mensagem é obrigatória."), direction: z.enum(whatsappMessages.direction.enumValues as [string, ...string[]]), }).omit({ id: true, timestamp: true, isRead: true });
export const insertAlertSchema = createInsertSchema(alerts, { type: z.enum(alerts.type.enumValues as [string, ...string[]]), title: z.string().min(1, "Título do alerta é obrigatório."), message: z.string().min(1, "Mensagem do alerta é obrigatória."), }).omit({ id: true, createdAt: true, isRead: true });
export const insertBudgetSchema = createInsertSchema(budgets, { totalBudget: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ required_error: "Orçamento total é obrigatório.", invalid_type_error: "Orçamento total deve ser um número." }) ), spentAmount: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : undefined)), z.number({ invalid_type_error: "Valor gasto deve ser um número." }).default(0).optional() ), period: z.enum(budgets.period.enumValues as [string, ...string[]]), startDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date({ required_error: "Data de início é obrigatória." }) ), endDate: z.preprocess( (arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable() ), campaignId: z.preprocess( (val) => (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE" ? null : parseInt(String(val))), z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true });
export const insertChatSessionSchema = createInsertSchema(chatSessions, { title: z.string().min(1, "Título da sessão é obrigatório.").default('Nova Conversa').optional(), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages, { text: z.string().min(1, "O texto da mensagem é obrigatório."), sender: z.enum(chatSenderEnum.enumValues), sessionId: z.number().int().positive(), attachmentUrl: z.string().url().optional().nullable(), }).omit({id: true, timestamp: true});
export const insertMetricSchema = createInsertSchema(metrics, { campaignId: z.number().int().positive(), date: z.preprocess((arg) => { if (typeof arg === "string" || arg instanceof Date) return new Date(arg); return undefined; }, z.date()), impressions: z.number().int().min(0).default(0), clicks: z.number().int().min(0).default(0), conversions: z.number().int().min(0).default(0), cost: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : 0)), z.number().min(0).default(0) ), revenue: z.preprocess( (val) => (typeof val === 'string' && val.trim() !== '' ? parseFloat(val) : (typeof val === 'number' ? val : 0)), z.number().min(0).default(0) ), leads: z.number().int().min(0).default(0) }).omit({ id: true, createdAt: true });
export const insertFlowSchema = createInsertSchema(flows, { name: z.string().min(1, "Nome do fluxo é obrigatório."), status: z.enum(flowStatusEnum.enumValues).default('draft'), elements: FlowElementsSchema, campaignId: z.preprocess( (val) => (val === undefined || val === null || val === "" || String(val).toUpperCase() === "NONE" ? null : parseInt(String(val))), z.number().int().positive().nullable().optional() ), }).omit({ id: true, createdAt: true, updatedAt: true });
export const insertIntegrationSchema = createInsertSchema(integrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignPhaseSchema = createInsertSchema(campaignPhases).omit({ id: true });
export const insertCampaignTaskSchema = createInsertSchema(campaignTasks, {
  startDate: z.preprocess((arg) => { if (typeof arg === 'string' || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable()),
  endDate: z.preprocess((arg) => { if (typeof arg === 'string' || arg instanceof Date) return new Date(arg); return undefined; }, z.date().optional().nullable()),
}).omit({ id: true });

// --- SCHEMAS ZOD PARA SELEÇÃO (SELECT) ---
// O schema de seleção de usuário foi removido.
const selectCampaignSchema = createSelectSchema(campaigns);
const selectCreativeSchema = createSelectSchema(creatives);
const selectCopySchema = createSelectSchema(copies);
const selectMetricSchema = createSelectSchema(metrics);
const selectWhatsappMessageSchema = createSelectSchema(whatsappMessages);
const selectAlertSchema = createSelectSchema(alerts);
const selectBudgetSchema = createSelectSchema(budgets);
const selectLandingPageSchema = createSelectSchema(landingPages);
const selectChatSessionSchema = createSelectSchema(chatSessions);
const selectChatMessageSchema = createSelectSchema(chatMessages);
const selectFunnelSchema = createSelectSchema(funnels);
const selectFunnelStageSchema = createSelectSchema(funnelStages);
const selectFlowSchema = createSelectSchema(flows);
const selectIntegrationSchema = createSelectSchema(integrations);
const selectCampaignPhaseSchema = createSelectSchema(campaignPhases);
const selectCampaignTaskSchema = createSelectSchema(campaignTasks);

// --- Tipos Inferidos ---
// Os tipos de usuário foram removidos.
export type Campaign = z.infer<typeof selectCampaignSchema>; export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Creative = z.infer<typeof selectCreativeSchema>; export type InsertCreative = z.infer<typeof insertCreativeSchema>;
export type Copy = z.infer<typeof selectCopySchema>;  export type InsertCopy = z.infer<typeof insertCopySchema>;
export type Metric = z.infer<typeof selectMetricSchema>; export type InsertMetric = z.infer<typeof insertMetricSchema>;
export type WhatsappMessage = z.infer<typeof selectWhatsappMessageSchema>; export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type Alert = z.infer<typeof selectAlertSchema>; export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Budget = z.infer<typeof selectBudgetSchema>; export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type LandingPage = z.infer<typeof selectLandingPageSchema>; export type InsertLandingPage = z.infer<typeof insertLandingPageSchema>;
export type ChatSession = z.infer<typeof selectChatSessionSchema>; export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = z.infer<typeof selectChatMessageSchema>; export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Funnel = z.infer<typeof selectFunnelSchema>; export type InsertFunnel = z.infer<typeof insertFunnelSchema>;
export type FunnelStage = z.infer<typeof selectFunnelStageSchema>; export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;
export type Flow = z.infer<typeof selectFlowSchema>; export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type Integration = z.infer<typeof selectIntegrationSchema>; export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type CampaignPhase = z.infer<typeof selectCampaignPhaseSchema>; export type InsertCampaignPhase = z.infer<typeof insertCampaignPhaseSchema>;
export type CampaignTask = z.infer<typeof selectCampaignTaskSchema>; export type InsertCampaignTask = z.infer<typeof insertCampaignTaskSchema>;
// O tipo FullCampaignData foi simplificado para remover a dependência do usuário.
export type FullCampaignData = Campaign & { phases: (CampaignPhase & { tasks: CampaignTask[]; })[]; };

// --- CONFIGURAÇÕES DE COPY ---
export const allCopyPurposesConfig: CopyPurposeConfig[] = [
];

// --- Tipos Relacionados a Copy ---
export type SpecificPurposeData = Record<string, string | number | boolean>;
export interface FullGeneratorPayload extends BaseGeneratorFormState {
  launchPhase: LaunchPhase;
  copyPurposeKey: string;
  details: SpecificPurposeData;
}
export interface BackendGeneratedCopyItem {
    mainCopy: string;
    alternativeVariation1?: string;
    alternativeVariation2?: string;
    platformSuggestion?: string;
    notes?: string;
}
export interface DisplayGeneratedCopy extends BackendGeneratedCopyItem {
    timestamp: Date;
    purposeKey: string;
}
export type SavedCopy = {
    id: number;
    title: string;
    content: string;
    purposeKey: string;
    launchPhase: LaunchPhase;
    details: Record<string, any>;
    baseInfo: BaseGeneratorFormState;
    platform?: string | null;
    isFavorite: boolean;
    tags: string[];
    createdAt: string;
    lastUpdatedAt: string;
    campaignId?: number | null;
    fullGeneratedResponse: BackendGeneratedCopyItem;
}

// Adicionando um tipo User falso para evitar quebras em cascata em outros arquivos por enquanto.
// Isso será removido na refatoração final.
export type User = {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};