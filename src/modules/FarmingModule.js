const { Vec3 } = require('vec3');
const logger = require('../utils/logger');
const { findItemByName } = require('../utils/inventory');

class FarmingModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  createTask() {
    return {
      name: '自动农田',
      loop: true,
      onErrorResume: true,
      run: async (ctx) => this.runFarming(ctx)
    };
  }

  iterRegion() {
    const { min, max } = this.config.farming.region;
    const list = [];
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) list.push(new Vec3(x, y, z));
      }
    }
    return list;
  }

  isCropMature(block) {
    return block?.metadata >= 7;
  }

  async runFarming(ctx) {
    for (const pos of this.iterRegion()) {
      const above = this.bot.blockAt(pos.offset(0, 1, 0));
      const soil = this.bot.blockAt(pos);
      if (!soil || soil.name !== 'farmland') continue;

      try {
        if (above && above.name.includes(this.config.farming.cropType) && this.isCropMature(above)) {
          await ctx.goto(pos, 2);
          await this.bot.dig(above, true);
        }

        const now = this.bot.blockAt(pos.offset(0, 1, 0));
        if (!now || now.name === 'air') {
          const seeds = findItemByName(this.bot, this.config.farming.seedItem);
          if (!seeds) continue;
          await this.bot.equip(seeds, 'hand');
          await this.bot.activateBlock(soil);
        }
      } catch (error) {
        logger.warn('耕作失败:', error.message);
      }
    }
  }
}

module.exports = FarmingModule;
