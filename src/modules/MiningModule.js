const { Vec3 } = require('vec3');
const logger = require('../utils/logger');
const { hasFreeSlot, findItemByName } = require('../utils/inventory');

class MiningModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
    this.isPausedByCombat = false;
    this.lastDigAt = 0;
  }

  init() {
    this.bot.on('physicsTick', () => this.tickMine());
  }

  createTask() {
    return {
      name: '自动挖掘',
      loop: true,
      onErrorResume: true,
      run: async () => {
        if (this.manager.isMining) return;
        await this.runRegionMining();
      }
    };
  }

  async runRegionMining() {
    const { min, max } = this.config.mining.region;
    for (let x = min.x; x <= max.x; x++) {
      for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
          const pos = new Vec3(x, y, z);
          const loaded = await this.manager.waitChunkLoaded(pos, this.config.queue.chunkWaitTimeoutMs);
          if (!loaded) continue;
          const block = this.bot.blockAt(pos);
          if (!block) continue;
          if (!this.config.mining.includeBlocks.includes(block.name)) continue;
          try {
            await this.manager.goto(pos, 2);
            const tool = this.bot.pathfinder.bestHarvestTool(block);
            if (tool) await this.bot.equip(tool, 'hand');
            await this.bot.dig(block, true);
          } catch (error) {
            logger.warn('挖掘失败:', error.message);
          }
        }
      }
    }
  }

  startMine() {
    this.manager.isMining = true;
    this.manager.pveLock = false;
    logger.info('矿道挖掘已启动');
  }

  stopMine(reason = '手动停止') {
    this.manager.isMining = false;
    this.manager.pveLock = true;
    this.isPausedByCombat = false;
    try {
      this.bot.stopDigging();
    } catch (_) {}
    logger.info(`矿道挖掘已停止: ${reason}`);
  }

  setMineSize(width, height) {
    this.config.mining.tunnel.width = width;
    this.config.mining.tunnel.height = height;
    logger.info(`矿道尺寸已更新为 ${width}x${height}`);
  }

  pauseMiningForCombat() {
    if (!this.manager.isMining) return;
    this.isPausedByCombat = true;
    this.manager.isMining = false;
    try {
      this.bot.stopDigging();
    } catch (_) {}
  }

  resumeMiningAfterCombat() {
    if (!this.isPausedByCombat) return;
    this.isPausedByCombat = false;
    this.manager.isMining = true;
  }

  async tickMine() {
    if (!this.manager.isMining || this.manager.fightTarget) return;
    if (Date.now() - this.lastDigAt < (this.config.mining.tunnel.digRetryMs || 250)) return;

    if (!hasFreeSlot(this.bot)) {
      this.stopMine('背包已满');
      this.bot.chat('背包已满，已停止挖矿');
      return;
    }

    const targets = this.getTunnelTargetBlocks();
    const oreFirst = this.prioritizeTargets(targets);

    for (const block of oreFirst) {
      if (!block || !this.bot.canDigBlock(block)) continue;
      if (this.isBlacklisted(block.name)) continue;
      if (this.isUnsafeSupportBlock(block.position)) continue;
      if (this.isDangerBlock(block)) {
        this.stopMine(`检测到危险方块 ${block.name}`);
        this.bot.chat(`检测到危险方块 ${block.name}，已停止挖矿`);
        return;
      }

      try {
        const tool = this.bot.pathfinder.bestHarvestTool(block);
        if (tool) await this.bot.equip(tool, 'hand');
        await this.bot.dig(block, true);
        this.lastDigAt = Date.now();
        await this.tryPlaceTorch();
        return;
      } catch (error) {
        this.stopMine('遇到无法挖掘方块');
        this.bot.chat(`挖掘失败(${block.name})，已停止挖矿`);
        logger.warn('矿道挖掘异常', error.message);
        return;
      }
    }
  }

  getTunnelTargetBlocks() {
    const tunnel = this.config.mining.tunnel;
    const forward = this.getForwardVec();
    const right = new Vec3(-forward.z, 0, forward.x);
    const base = this.bot.entity.position.floored().plus(forward.scaled(tunnel.stepDistance || 1));

    const blocks = [];
    for (let h = 0; h < tunnel.height; h++) {
      for (let w = 0; w < tunnel.width; w++) {
        const offset = right.scaled(w - Math.floor(tunnel.width / 2)).plus(new Vec3(0, h, 0));
        const pos = base.plus(offset);
        const block = this.bot.blockAt(pos);
        if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
          blocks.push(block);
        }
      }
    }
    return blocks;
  }

  prioritizeTargets(blocks) {
    const oreSet = new Set(this.config.mining.tunnel.orePriorityBlocks || []);
    return [...blocks].sort((a, b) => {
      const oa = oreSet.has(a.name) ? 0 : 1;
      const ob = oreSet.has(b.name) ? 0 : 1;
      return oa - ob;
    });
  }

  isBlacklisted(name) {
    const list = this.config.mining.tunnel.blacklistBlocks || [];
    return list.some((key) => name.includes(key));
  }

  isUnsafeSupportBlock(pos) {
    const feet = this.bot.entity.position.floored();
    const head = feet.offset(0, 1, 0);
    const under = feet.offset(0, -1, 0);
    return pos.equals(feet) || pos.equals(head) || pos.equals(under);
  }

  isDangerBlock(block) {
    if (!block) return false;
    if (block.name.includes('lava')) return true;
    const neighbors = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
    return neighbors.some((d) => this.bot.blockAt(block.position.plus(d))?.name.includes('lava'));
  }

  async tryPlaceTorch() {
    const tunnel = this.config.mining.tunnel;
    const here = this.bot.blockAt(this.bot.entity.position.floored());
    const light = here?.light ?? 15;
    if (light >= (tunnel.lightThreshold ?? 7)) return;
    const torch = findItemByName(this.bot, tunnel.torchItem || 'torch');
    if (!torch) return;

    const placeOn = this.bot.blockAt(this.bot.entity.position.floored().offset(0, -1, 0));
    if (!placeOn) return;
    try {
      await this.bot.equip(torch, 'hand');
      await this.bot.placeBlock(placeOn, new Vec3(0, 1, 0));
    } catch (_) {}
  }

  getForwardVec() {
    const yaw = this.bot.entity.yaw;
    const x = Math.round(-Math.sin(yaw));
    const z = Math.round(-Math.cos(yaw));
    if (x === 0 && z === 0) return new Vec3(0, 0, 1);
    return new Vec3(x, 0, z);
  }
}

module.exports = MiningModule;
