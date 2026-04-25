const logger = require('../utils/logger');

class TaskQueue {
  constructor() {
    this.tasks = [];
    this.current = null;
    this.paused = false;
  }

  add(task) {
    this.tasks.push(task);
    logger.info('任务入队:', task.name);
  }

  clear() {
    this.tasks = [];
    this.current = null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  async run(botCtx) {
    while (true) {
      if (this.paused) {
        await botCtx.sleep(500);
        continue;
      }
      const task = this.tasks.shift();
      if (!task) {
        await botCtx.sleep(500);
        continue;
      }

      this.current = task;
      try {
        logger.info(`开始执行任务: ${task.name}`);
        await task.run(botCtx);
        logger.info(`任务完成: ${task.name}`);
        if (task.loop) this.tasks.push(task);
      } catch (error) {
        logger.error(`任务异常: ${task.name}`, error.message);
        if (task.onErrorResume) {
          this.tasks.push(task);
        }
      } finally {
        this.current = null;
      }
    }
  }
}

module.exports = TaskQueue;
