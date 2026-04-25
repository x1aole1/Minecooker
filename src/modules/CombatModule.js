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
    if (this.manager.pveLock) return;

    const hostile = Object.values(this.bot.entities)
      .filter((e) => this.isHostile(e))
      .sort((a, b) => this.bot.entity.position.distanceTo(a.position) - this.bot.entity.position.distanceTo(b.position))[0];

    if (!hostile) {
      if (this.manager.fightTarget) this.stopFightAndResumeMine();
      return;
    }

    const dist = this.bot.entity.position.distanceTo(hostile.position);
    if (dist > this.config.combat.engageDistance) {
      if (this.manager.fightTarget) this.stopFightAndResumeMine();
      return;
    }

    this.startFight(hostile);
  }

  startFight(target) {
    if (!target) return;
    this.manager.fightTarget = target;

    if (this.manager.modules.mining?.startMine && this.manager.isMining) {
      this.manager.modules.mining.pauseMiningForCombat();
    }

    try {
      this.bot.armorManager.equipAll();
      const sword = this.bot.inventory.items().find((i) => i.name.includes('sword') || i.name.includes('axe'));
      if (sword) this.bot.equip(sword, 'hand').catch(() => {});

      if (this.bot.customPvp?.attack) {
        this.bot.customPvp.attack(target);
      } else {
        this.bot.attack(target);
      }
    } catch (error) {
      logger.warn('战斗模块异常', error.message);
    }
  }

  stopFightAndResumeMine() {
    try {
      if (this.bot.customPvp?.stop) this.bot.customPvp.stop();
    } catch (_) {}
    this.manager.fightTarget = null;

    const pickaxe = this.bot.inventory.items().find((i) => i.name.includes('pickaxe'));
    if (pickaxe) this.bot.equip(pickaxe, 'hand').catch(() => {});

    this.manager.modules.mining?.resumeMiningAfterCombat();
  }

  fightMe(playerName) {
    const target = Object.values(this.bot.entities).find((e) => e.type === 'player' && e.username === playerName);
    if (!target) return false;
    this.manager.pveLock = false;
    this.startFight(target);
    return true;
  }

  stopFight() {
    this.manager.pveLock = true;
    this.stopFightAndResumeMine();
  }
}

module.exports = CombatModule;
