const logger = require('../utils/logger');

class CombatModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  init() {
    this.bot.on('physicsTick', () => this.scanAndFight());
  }

  isHostile(entity) {
    if (!entity || !entity.name) return false;
    if (this.config.combat.ignoreEntityNames.includes(entity.name)) return false;
    return this.config.combat.hostileMobNames.includes(entity.name);
  }

  scanAndFight() {
    const hostile = Object.values(this.bot.entities)
      .filter((e) => this.isHostile(e))
      .sort((a, b) => this.bot.entity.position.distanceTo(a.position) - this.bot.entity.position.distanceTo(b.position))[0];

    if (!hostile) return;
    const dist = this.bot.entity.position.distanceTo(hostile.position);
    if (dist > this.config.combat.engageDistance) return;

    try {
      this.bot.armorManager.equipAll();
      this.bot.pvp.attack(hostile);
    } catch (error) {
      logger.warn('战斗模块异常', error.message);
    }
  }
}

module.exports = CombatModule;
