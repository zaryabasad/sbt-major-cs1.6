export const legends = [];

export function calculateLegacyScore(player) {
  const achievements = player.achievements || {};
  const runnerUp = player.runnerUp || {};

  return (
    (achievements.trophies || 0) * 100 +
    (achievements.medals || 0) * 50 +
    (achievements.gold || 0) * 30 +
    (achievements.silver || 0) * 20 +
    (achievements.bronze || 0) * 10 +
    (runnerUp.captain || 0) * 15 +
    (runnerUp.player || 0) * 10 -
    (player.poolOuts || 0) * 5
  );
}

export function getLegendsLeaderboard() {
  return [...legends].sort(
    (a, b) => calculateLegacyScore(b) - calculateLegacyScore(a)
  );
}
