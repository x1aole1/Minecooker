const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock, GoalNear } } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const { plugin: pvp } = require('mineflayer-pvp');
const TaskQueue = require('./TaskQueue');
const logger = require('../utils/logger');
const { getLowValueFood } = require('../utils/inventory');

const MiningModule = require('../modules/MiningModule');
const FarmingModule = require('../modules/FarmingModule');
const FishingModule = require('../modules/FishingModule');
const StorageModule = require('../modules/StorageModule');
const TradingModule = require('../modules/TradingModule');
const SurvivalModule = require('../modules/SurvivalModule');
const CombatModule = require('../modules/CombatModule');
const CommandModule = require('../modules/CommandModule');

class BotManager {
  constructor(config) {
    this.config = config;
    this.bot = null;
    this.queue = new TaskQueue();
    this.reconnectCount = 0;
    this.modules = {};
    this.scheduledTimers = [];
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  createBot() {
    this.bot = mineflayer.createBot(this.config.connection);
    this.bot.loadPlugin(pathfinder);
    this.bot.loadPlugin(armorManager);
    this.bot.loadPlugin(pvp);

    this.bot.once('spawn', async () => {
      logger.info('Bot spawned.');
      this.bot.pathfinder.setMovements(new Movements(this.bot));
      await this.runLoginCommands();
      await this.installModules();
      this.initQueue();
      this.startScheduledCommands();
      this.queue.run(this).catch((err) => logger.error('队列异常', err));
    });

    this.bot.on('health', () => this.handleSafety());
    this.bot.on('kicked', (reason) => logger.warn('被踢出:', reason));
    this.bot.on('error', (err) => logger.error('Bot错误:', err.message));
    this.bot.on('end', () => this.handleReconnect());
    this.bot.on('death', () => this.handleDeath());
  }

  async installModules() {
    this.modules.storage = new StorageModule(this.bot, this.config, this);
    this.modules.survival = new SurvivalModule(this.bot, this.config, this);
    this.modules.combat = new CombatModule(this.bot, this.config, this);
    this.modules.mining = new MiningModule(this.bot, this.config, this);
    this.modules.farming = new FarmingModule(this.bot, this.config, this);
    this.modules.fishing = new FishingModule(this.bot, this.config, this);
    this.modules.trading = new TradingModule(this.bot, this.config, this);
    this.modules.command = new CommandModule(this.bot, this.config, this);

    for (const module of Object.values(this.modules)) {
      try {
        await module.init?.();
      } catch (error) {
        logger.error(`模块初始化失败: ${module.constructor.name}`, error.message);
      }
    }
  }

  initQueue() {
    this.queue.add(this.modules.mining.createTask());
    this.queue.add(this.modules.farming.createTask());
    this.queue.add(this.modules.fishing.createTask());
    this.queue.add(this.modules.trading.createTask());
    this.queue.add(this.modules.storage.createCleanupTask());
  }

  async goto(pos, near = 1) {
    const goal = near <= 0 ? new GoalBlock(pos.x, pos.y, pos.z) : new GoalNear(pos.x, pos.y, pos.z, near);
    this.bot.pathfinder.setGoal(goal);
    await this.bot.pathfinder.goto(goal);
  }

  async runLoginCommands() {
    for (const cmd of this.config.connection.loginCommands || []) {
      await this.sleep(cmd.delayMs || 1000);
      this.bot.chat(cmd.command);
    }
  }

  startScheduledCommands() {
    for (const timer of this.scheduledTimers) clearInterval(timer);
    this.scheduledTimers = [];
    for (const scheduled of this.config.connection.scheduledCommands || []) {
      const id = setInterval(() => this.bot.chat(scheduled.command), scheduled.cronMs);
      this.scheduledTimers.push(id);
    }
  }

  async handleSafety() {
    const { hungerThreshold, healthThreshold } = this.config.safety;
    if (this.bot.food <= hungerThreshold) {
      this.queue.pause();
      const food = getLowValueFood(this.bot)[0];
      if (food) {
        try {
          await this.bot.equip(food, 'hand');
          await this.bot.consume();
        } catch (error) {
          logger.warn('进食失败', error.message);
        }
      }
      this.queue.resume();
    }

    if (this.bot.health <= healthThreshold) {
      this.queue.pause();
      try {
        await this.goto(this.config.safety.safePoint, 2);
      } catch (error) {
        logger.warn('撤退失败', error.message);
      } finally {
        this.queue.resume();
      }
    }
  }

  async waitChunkLoaded(position, timeoutMs) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const col = this.bot.world.getColumnAt(position);
      if (col) return true;
      await this.sleep(200);
    }
    return false;
  }

  async handleDeath() {
    logger.warn('Bot死亡，等待重生并恢复任务');
    if (!this.config.queue.autoResumeAfterDeath) return;
    await this.sleep(5000);
    if (this.queue.current) this.queue.add(this.queue.current);
  }

  async handleReconnect() {
    if (!this.config.connection.reconnect.enabled) return;
    this.reconnectCount += 1;
    if (this.reconnectCount > this.config.connection.reconnect.retries) return;
    logger.warn(`准备重连，第${this.reconnectCount}次`);
    await this.sleep(this.config.connection.reconnect.delayMs);
    this.createBot();
  }
}

module.exports = BotManager;
