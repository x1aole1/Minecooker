# Minecooker

基于 mineflayer 的模块化 Minecraft Bot（1.21.1 矿道场景优先）。

## 启动

```bash
npm install
npm start
```

## 配置文件

当前运行配置统一使用：`src/config/config.json`。

> 这样修改服务器地址、账号、矿道参数时，不需要改 JS 代码逻辑文件。

## 任务执行方式（手动触发）

Bot 进入游戏后不会自动跑任务队列，需要手动触发：

- 控制台：`start`
- 游戏聊天：`!bot start`

## 矿道挖掘指令

- `!bot startmine`：启动/恢复矿道挖掘，同时激活 PVE 警戒
- `!bot stopmine`：停止矿道挖掘，同时锁定 PVE 自动追击
- `!bot setmine <宽> <高>`：动态设置矿道尺寸（默认 2x3）

## 保留的战斗指令

- 聊天输入 `fight me`：与发送者进入战斗逻辑
- 聊天输入 `stop`：停止战斗逻辑

## 其他常用命令

- `!bot pause` / `!bot resume`
- `!bot task`
- `!bot goto x y z`
- `!bot say <内容>`
- `!bot help`
