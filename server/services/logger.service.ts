import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Garante que o diretório de logs exista
const logDir = path.resolve(process.cwd());
const logFile = path.join(logDir, 'app.log');

// Cria um stream de escrita para o arquivo de log, em modo de apêndice
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Configuração do logger Pino para escrever no arquivo de log
const logger = pino({
  level: 'debug', // Captura todos os níveis de log
}, logStream);

// Adiciona um manipulador para garantir que os logs sejam gravados antes de sair
process.on('beforeExit', () => {
  logger.flush();
});

export default logger;