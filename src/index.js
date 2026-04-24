const config = require('./config/defaultConfig');
const BotManager = require('./core/BotManager');
const logger = require('./utils/logger');

function main() {
  const manager = new BotManager(config);
  manager.createBot();
  logger.info('Minecooker Bot 已启动');
}

main();
