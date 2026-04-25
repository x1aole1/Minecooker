# Minecooker

基于 mineflayer 的模块化 Minecraft Bot。

## 启动

```bash
npm install
npm start
```

## 任务执行方式（已改为手动触发）

Bot 进入游戏后**不会自动执行任务队列**，只会完成登录、插件加载与模块初始化。

需要你在控制台或游戏聊天中手动开始：

- 控制台输入：`start`
- 游戏内聊天输入：`!bot start`

## 常用控制命令

- `start` / `!bot start`：启动任务队列（仅首次真正启动，重复输入安全）
- `pause` / `!bot pause`：暂停队列
- `resume` / `!bot resume`：恢复队列
- `task` / `!bot task`：查看当前任务
- `goto x y z` / `!bot goto x y z`：移动到坐标
- `say <内容>` / `!bot say <内容>`：让 Bot 说话
- `help` / `!bot help`：输出命令帮助

## 说明

- 如果服务器出生点加载较慢，Bot 会在 `spawn` 后等待配置延迟与固定 500ms，再完成模块初始化。
- 若网络中断，重连逻辑会按配置自动处理。
