const { Vec3 } = require('vec3');
const logger = require('../utils/logger');

class TradingModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  createTask() {
    return {
      name: '村民交易',
      loop: true,
      onErrorResume: true,
      run: async () => this.runTradeCycle()
    };
  }

  findVillager() {
    const pos = new Vec3(this.config.trading.villagerPosition.x, this.config.trading.villagerPosition.y, this.config.trading.villagerPosition.z);
    return Object.values(this.bot.entities).find((e) => e.name === 'villager' && e.position.distanceTo(pos) < 5);
  }

  async runTradeCycle() {
    const villager = this.findVillager();
    if (!villager) {
      logger.warn('未找到村民，跳过');
      return;
    }

    await this.manager.goto(villager.position.floored(), 2);
    const trader = await this.bot.openVillager(villager);

    try {
      for (const plan of this.config.trading.plans) {
        for (let i = 0; i < plan.loops; i++) {
          const trade = trader.trades[plan.tradeIndex];
          if (!trade || trade.disabled) {
            logger.warn('交易已锁定，等待恢复');
            await this.manager.sleep(30000);
            continue;
          }
          try {
            await trader.trade(trade, plan.count);
          } catch (error) {
            const ok = await this.manager.modules.storage.withdrawForTask(
              this.config.storage.signChestMap.tradeInput,
              trade.inputItem1.name,
              plan.count
            );
            if (!ok) {
              logger.warn('交易材料不足');
              break;
            }
            await trader.trade(trade, plan.count);
          }
        }
      }
    } finally {
      trader.close();
      await this.manager.modules.storage.depositByRules();
    }
  }
}

module.exports = TradingModule;
