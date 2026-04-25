const readline = require('readline');
const logger = require('../utils/logger');

class CommandModule {
  constructor(bot, config, manager) {
    this.bot = bot;
    this.config = config;
    this.manager = manager;
  }

  init() {
    this.initConsole();
    this.initChatCommands();
  }

  initConsole() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('line', (line) => this.exec(line.trim(), 'console'));
  }

  initChatCommands() {
    this.bot.on('chat', (username, message) => {
      if (username === this.bot.username) return;

      const plain = message.trim();
      if (/^fight\s+me$/i.test(plain)) {
        const ok = this.manager.modules.combat?.fightMe(username);
        if (!ok) logger.warn(`未找到玩家目标: ${username}`);
        return;
      }
      if (/^stop$/i.test(plain)) {
        this.manager.modules.combat?.stopFight();
        return;
      }

      if (!plain.startsWith('!bot')) return;
      this.exec(plain.replace('!bot', '').trim(), username);
    });
  }

  exec(input, source) {
    const [cmd, ...args] = input.split(' ');
    switch (cmd) {
      case 'start':
        this.manager.startTasks();
        return logger.info(`任务队列已启动 by ${source}`);
      case 'pause':
        this.manager.queue.pause();
        return logger.info(`队列已暂停 by ${source}`);
      case 'resume':
        this.manager.queue.resume();
        return logger.info(`队列已恢复 by ${source}`);
      case 'task':
        return logger.info('当前任务:', this.manager.queue.current?.name || '无');
      case 'goto': {
        const [x, y, z] = args.map(Number);
        this.manager.goto({ x, y, z }, 1).catch((err) => logger.warn(err.message));
        return;
      }
      case 'startmine':
        this.manager.modules.mining?.startMine();
        this.manager.pveLock = false;
        return logger.info(`矿道挖掘已启动 by ${source}`);
      case 'stopmine':
        this.manager.modules.mining?.stopMine('手动停止');
        this.manager.modules.combat?.stopFight();
        this.manager.pveLock = true;
        return logger.info(`矿道挖掘已停止 by ${source}`);
      case 'setmine': {
        const [width, height] = args.map(Number);
        if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
          return logger.warn('用法: setmine <宽> <高>');
        }
        this.manager.modules.mining?.setMineSize(width, height);
        return;
      }
      case 'say':
        this.bot.chat(args.join(' '));
        return;
      case 'help':
        return logger.info('可用指令: start, pause, resume, task, goto x y z, startmine, stopmine, setmine <w> <h>, say <msg>');
      default:
        logger.warn('未知指令:', input);
    }
  }
}

module.exports = CommandModule;
