import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import * as schema from '../../shared/schema';

// Mapeia os nomes das "tabelas" para suas definições de schema do Drizzle.
// Isso nos permite, por exemplo, obter os nomes das colunas para criar os cabeçalhos dos arquivos Excel.
const tableSchemas = {
    campaigns: schema.campaigns,
    campaignPhases: schema.campaignPhases,
    campaignTasks: schema.campaignTasks,
    copies: schema.copies,
    creatives: schema.creatives,
    metrics: schema.metrics,
    whatsappMessages: schema.whatsappMessages,
    alerts: schema.alerts,
    budgets: schema.budgets,
    landingPages: schema.landingPages,
    chatSessions: schema.chatSessions,
    chatMessages: schema.chatMessages,
    funnels: schema.funnels,
    funnelStages: schema.funnelStages,
    flows: schema.flows,
    integrations: schema.integrations,
};

type TableName = keyof typeof tableSchemas;

const DB_DIR = path.join(process.cwd(), 'database');

class ExcelStorageService {
    constructor() {
        this.initializeDatabase();
    }

    /**
     * Garante que o diretório 'database' e todos os arquivos .xlsx para cada tabela existam.
     * Se um arquivo não existir, ele é criado com os cabeçalhos correspondentes do schema.
     */
    private initializeDatabase() {
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }
        for (const tableName of Object.keys(tableSchemas)) {
            this.ensureTableFileExists(tableName as TableName);
        }
    }

    private getFilePath(tableName: string): string {
        return path.join(DB_DIR, `${tableName}.xlsx`);
    }

    private ensureTableFileExists(tableName: TableName) {
        const filePath = this.getFilePath(tableName);
        if (!fs.existsSync(filePath)) {
            const schemaObject = tableSchemas[tableName];
            const headers = Object.keys(schemaObject.columns);

            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet([headers]);
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
            XLSX.writeFile(workbook, filePath, { bookSST: true }); // bookSST é importante para compatibilidade
        }
    }

    /**
     * Lê todos os dados de um arquivo .xlsx e os converte em um array de objetos.
     * @param tableName O nome da "tabela" (arquivo sem a extensão .xlsx).
     * @returns Um array de objetos do tipo T.
     */
    private readTable<T>(tableName: string): T[] {
        const filePath = this.getFilePath(tableName);
        try {
            if (!fs.existsSync(filePath)) return [];
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!worksheet) return [];
            // Converte a planilha para JSON, tratando valores vazios
            return XLSX.utils.sheet_to_json<T>(worksheet, { defval: null });
        } catch (error) {
            console.error(`Erro ao ler a tabela ${tableName}:`, error);
            // Em caso de erro (ex: arquivo corrompido), retorna um array vazio para evitar que a aplicação quebre.
            return [];
        }
    }

    /**
     * Escreve um array de objetos para um arquivo .xlsx, sobrescrevendo o conteúdo existente.
     * @param tableName O nome da "tabela".
     * @param data O array de objetos a ser escrito.
     */
    private writeTable<T>(tableName: string, data: T[]) {
        const filePath = this.getFilePath(tableName);
        try {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
            XLSX.writeFile(workbook, filePath, { bookSST: true });
        } catch (error) {
            console.error(`Erro ao escrever na tabela ${tableName}:`, error);
        }
    }

    // --- MÉTODOS PÚBLICOS CRUD ---

    public getAll<T>(tableName: TableName): T[] {
        return this.readTable<T>(tableName);
    }

    public getById<T extends { id: number }>(tableName: TableName, id: number): T | undefined {
        const allRecords = this.readTable<T>(tableName);
        return allRecords.find(record => record.id === id);
    }

    public findBy<T>(tableName: TableName, predicate: (record: T) => boolean): T | undefined {
        const allRecords = this.readTable<T>(tableName);
        return allRecords.find(predicate);
    }

    public filterBy<T>(tableName: TableName, predicate: (record: T) => boolean): T[] {
        const allRecords = this.readTable<T>(tableName);
        return allRecords.filter(predicate);
    }

    public create<T extends { id?: number }>(tableName: TableName, newRecord: Omit<T, 'id'>): T {
        const allRecords = this.readTable<T & { id: number }>(tableName);
        const maxId = allRecords.reduce((max, record) => (record.id > max ? record.id : max), 0);
        const newId = maxId + 1;

        const recordToSave = { ...newRecord, id: newId, createdAt: new Date(), updatedAt: new Date() } as T;

        allRecords.push(recordToSave as T & { id: number });
        this.writeTable(tableName, allRecords);
        return recordToSave;
    }

    public update<T extends { id: number }>(tableName: TableName, id: number, updatedData: Partial<Omit<T, 'id'>>): T | undefined {
        const allRecords = this.readTable<T>(tableName);
        const recordIndex = allRecords.findIndex(record => record.id === id);

        if (recordIndex === -1) {
            return undefined; // Retorna undefined se o registro não for encontrado
        }

        // Atualiza o registro mantendo os dados antigos e aplicando os novos
        const updatedRecord = { ...allRecords[recordIndex], ...updatedData, updatedAt: new Date() };
        allRecords[recordIndex] = updatedRecord;

        this.writeTable(tableName, allRecords);
        return updatedRecord;
    }

    public delete(tableName: TableName, id: number): boolean {
        const allRecords = this.readTable<{ id: number }>(tableName);
        const initialLength = allRecords.length;
        const filteredRecords = allRecords.filter(record => record.id !== id);

        if (filteredRecords.length === initialLength) {
            return false; // Retorna false se nenhum registro foi removido
        }

        this.writeTable(tableName, filteredRecords);
        return true;
    }
}

// Exporta uma instância única do serviço para ser usada em toda a aplicação.
export const excelStorage = new ExcelStorageService();