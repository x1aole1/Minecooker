function getFoodItems(bot) {
  return bot.inventory.items().filter((item) => item.foodPoints && item.foodPoints > 0);
}

function getLowValueFood(bot) {
  return getFoodItems(bot).sort((a, b) => (a.foodPoints || 0) - (b.foodPoints || 0));
}

function findBestTool(bot, block) {
  const tools = bot.pathfinder?.bestHarvestTool(block);
  if (!tools) return null;
  return tools;
}

function hasFreeSlot(bot) {
  return bot.inventory.emptySlotCount() > 0;
}

function findItemByName(bot, itemName) {
  return bot.inventory.items().find((it) => it.name === itemName);
}

module.exports = {
  getFoodItems,
  getLowValueFood,
  findBestTool,
  hasFreeSlot,
  findItemByName
};
