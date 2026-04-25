const { Vec3 } = require('vec3');
const logger = require('../utils/logger');

class MiningModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  createTask() {
    return {
      name: '自动挖掘',
      loop: true,
      onErrorResume: true,
      run: async (ctx) => this.runMining(ctx)
    };
  }

  iterRegion() {
    const { min, max } = this.config.mining.region;
    const list = [];
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          list.push(new Vec3(x, y, z));
        }
      }
    }
    return list;
  }

  async runMining(ctx) {
    for (const pos of this.iterRegion()) {
      const loaded = await ctx.waitChunkLoaded(pos, this.config.queue.chunkWaitTimeoutMs);
      if (!loaded) continue;
      const block = this.bot.blockAt(pos);
      if (!block) continue;
      if (!this.config.mining.includeBlocks.includes(block.name)) continue;
      try {
        await ctx.goto(pos, 2);
        const tool = this.bot.pathfinder.bestHarvestTool(block);
        if (tool) await this.bot.equip(tool, 'hand');
        await this.bot.dig(block, true);
      } catch (error) {
        logger.warn('挖掘失败:', error.message);
      }
    }
  }
}

module.exports = MiningModule;
