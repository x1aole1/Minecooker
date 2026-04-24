const logger = require('../utils/logger');

class SurvivalModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
    this.antiAfkTimer = null;
  }

  init() {
    if (!this.config.safety.antiAfk.enabled) return;
    this.antiAfkTimer = setInterval(() => {
      const yaw = this.bot.entity.yaw + (Math.random() - 0.5) * this.config.safety.antiAfk.randomYaw;
      const pitch = this.bot.entity.pitch + (Math.random() - 0.5) * 0.05;
      this.bot.look(yaw, pitch, true).catch(() => {});
      this.bot.setControlState('jump', true);
      setTimeout(() => this.bot.setControlState('jump', false), 200);
    }, this.config.safety.antiAfk.intervalMs);

    logger.info('防挂机模块已启用');
  }
}

module.exports = SurvivalModule;
