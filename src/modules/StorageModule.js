const { Vec3 } = require('vec3');
const logger = require('../utils/logger');
const { hasFreeSlot } = require('../utils/inventory');

class StorageModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
    this.chestCache = new Map();
  }

  async init() {
    const retries = this.config.storage.scanRetries || 1;
    for (let i = 1; i <= retries; i++) {
      await this.scanChestsBySigns();
      if (this.chestCache.size > 0) return;
      logger.warn(`未识别到告示牌箱子，准备重试 ${i}/${retries}`);
      await this.manager.sleep(this.config.storage.scanIntervalMs || 1500);
    }
  }

  createCleanupTask() {
    return {
      name: '背包整理入库',
      loop: true,
      onErrorResume: true,
      run: async () => {
        if (!hasFreeSlot(this.bot)) {
          await this.depositByRules();
        }
      }
    };
  }

  async scanChestsBySigns() {
    this.chestCache.clear();
    const radius = this.config.storage.chestSearchRadius;
    const center = this.bot.entity.position.floored();
    for (let x = -radius; x <= radius; x++) {
      for (let y = -3; y <= 3; y++) {
        for (let z = -radius; z <= radius; z++) {
          const pos = center.plus(new Vec3(x, y, z));
          const block = this.bot.blockAt(pos);
          if (!block) continue;
          if (!block.name.includes('sign')) continue;
          const text = await this.getSignText(block);
          const chestBlock = this.findNeighborChest(pos);
          const key = text.trim();
          if (key && chestBlock) this.chestCache.set(key, chestBlock.position);
        }
      }
    }
    logger.info('箱子识别完成，数量:', this.chestCache.size);
  }


  async getSignText(block) {
    try {
      if (!block || !block.name.includes('sign')) return '';
      const rawEntity = block.blockEntity || {};
      const nbtRoot = rawEntity?.value || rawEntity;
      const lineKeys = ['Text1', 'Text2', 'Text3', 'Text4', 'text1', 'text2', 'text3', 'text4'];
      const lines = [];

      for (const key of lineKeys) {
        const raw = nbtRoot?.[key];
        const line = this.parseSignLine(raw);
        if (line) lines.push(line);
      }

      return lines.join(' ').trim();
    } catch (error) {
      logger.warn('读取告示牌文本失败', error.message);
      return '';
    }
  }

  parseSignLine(raw) {
    if (raw == null) return '';

    const unwrap = (value) => {
      if (value == null) return '';
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        if (typeof value.value !== 'undefined') return unwrap(value.value);
        if (typeof value.text === 'string') return value.text;
      }
      return String(value);
    };

    let text = unwrap(raw).trim();
    if (!text) return '';

    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.text === 'string') return parsed.text.trim();
      } catch (_) {
        // keep raw string if not valid JSON text component
      }
    }

    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1);
    }
    return text.trim();
  }

  findNeighborChest(pos) {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
    for (const dir of dirs) {
      const block = this.bot.blockAt(pos.plus(dir));
      if (block && block.name.includes('chest')) return block;
    }
    return null;
  }

  parseBookLevel(item) {
    if (item.name !== 'enchanted_book') return null;
    const ench = item.nbt?.value?.StoredEnchantments?.value?.value || [];
    return ench.map((e) => ({ id: e.id.value, lvl: e.lvl.value }));
  }

  async depositByRules() {
    for (const item of this.bot.inventory.items()) {
      const group = Object.keys(this.config.storage.rules).find((key) => this.config.storage.rules[key].includes(item.name));
      if (!group) continue;
      const signText = this.config.storage.signChestMap[group];
      await this.depositItemToSignChest(signText, item);
    }
  }

  async depositItemToSignChest(signText, item) {
    const pos = this.chestCache.get(signText);
    if (!pos) return;
    const chestBlock = this.bot.blockAt(pos);
    if (!chestBlock) return;
    await this.manager.goto(pos, 2);
    const chest = await this.bot.openChest(chestBlock);
    try {
      await chest.deposit(item.type, null, item.count);
    } catch (error) {
      logger.warn('入库失败', error.message);
    } finally {
      chest.close();
    }
  }

  async withdrawForTask(signText, itemName, count) {
    const pos = this.chestCache.get(signText);
    if (!pos) return false;
    const chestBlock = this.bot.blockAt(pos);
    if (!chestBlock) return false;
    await this.manager.goto(pos, 2);
    const chest = await this.bot.openChest(chestBlock);
    try {
      const target = chest.containerItems().find((i) => i.name === itemName);
      if (!target) return false;
      await chest.withdraw(target.type, null, Math.min(target.count, count));
      return true;
    } catch (error) {
      logger.warn('取物失败', error.message);
      return false;
    } finally {
      chest.close();
    }
  }
}

module.exports = StorageModule;
