const fs = require('fs');
const path = require('path');
const BotManager = require('./core/BotManager');
const logger = require('./utils/logger');

function loadConfig() {
  const configPath = path.join(__dirname, 'config', 'config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function main() {
  const config = loadConfig();
  const manager = new BotManager(config);
  manager.createBot();
  logger.info('Minecooker Bot 已启动');
}

main();
