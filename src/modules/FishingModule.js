const logger = require('../utils/logger');
const { findItemByName } = require('../utils/inventory');

class FishingModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  createTask() {
    return {
      name: '自动钓鱼',
      loop: true,
      onErrorResume: true,
      run: async () => this.runFishingLoop()
    };
  }

  async runFishingLoop() {
    const rod = findItemByName(this.bot, 'fishing_rod');
    if (!rod) {
      logger.warn('没有钓鱼竿，跳过钓鱼任务');
      return;
    }

    await this.bot.equip(rod, 'hand');
    const started = Date.now();
    while (Date.now() - started < this.config.fishing.durationMs) {
      try {
        await this.bot.fish();
      } catch (error) {
        logger.warn('钓鱼失败:', error.message);
        await this.manager.sleep(this.config.fishing.intervalMs);
      }
    }
  }
}

module.exports = FishingModule;
