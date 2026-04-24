module.exports = {
  connection: {
    host: '127.0.0.1',
    port: 25565,
    username: 'MinecookerBot',
    password: undefined,
    auth: 'offline',
    version: false,
    reconnect: {
      enabled: true,
      retries: 999,
      delayMs: 5000
    },
    loginCommands: [
      { command: '/register 123456 123456', delayMs: 3000 },
      { command: '/login 123456', delayMs: 5000 }
    ],
    scheduledCommands: [
      { cronMs: 1000 * 60 * 20, command: '/home' }
    ]
  },
  safety: {
    hungerThreshold: 12,
    healthThreshold: 10,
    safePoint: { x: 0, y: 64, z: 0 },
    antiAfk: {
      enabled: true,
      intervalMs: 1000 * 25,
      randomYaw: 0.2
    }
  },
  mining: {
    region: {
      min: { x: 0, y: 58, z: 0 },
      max: { x: 8, y: 62, z: 8 }
    },
    includeBlocks: ['stone', 'deepslate', 'coal_ore', 'iron_ore'],
    toolDurabilityMin: 20
  },
  farming: {
    region: {
      min: { x: 10, y: 63, z: 10 },
      max: { x: 20, y: 65, z: 20 }
    },
    cropType: 'wheat',
    seedItem: 'wheat_seeds'
  },
  fishing: {
    durationMs: 1000 * 60,
    intervalMs: 1000,
    loops: -1
  },
  storage: {
    basePoint: { x: 0, y: 64, z: 0 },
    chestSearchRadius: 16,
    rules: {
      ores: ['iron_ore', 'coal', 'raw_iron'],
      food: ['bread', 'cooked_beef', 'cooked_porkchop'],
      books: ['enchanted_book']
    },
    signChestMap: {
      ores: '矿物箱',
      food: '食物箱',
      books: '附魔书箱',
      tradeInput: '交易材料箱',
      tradeOutput: '交易产物箱'
    }
  },
  trading: {
    villagerName: null,
    villagerPosition: { x: 5, y: 64, z: 5 },
    plans: [
      { item: 'emerald', tradeIndex: 0, count: 16, loops: 5 }
    ]
  },
  combat: {
    hostileMobNames: ['zombie', 'skeleton', 'creeper', 'spider', 'drowned', 'witch'],
    ignoreEntityNames: ['villager', 'armor_stand', 'iron_golem'],
    engageDistance: 12
  },
  queue: {
    autoResumeAfterDeath: true,
    chunkWaitTimeoutMs: 8000
  }
};
