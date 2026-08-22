const rawLegends = [
  ['Dhani',12,1,0,0,0,5,0,4], ['Guardian',7,0,0,0,0,5,0,8], ['Ana',5,1,0,0,0,4,1,4], ['Naruto Prime',5,0,0,0,0,2,0,8], ['Dany',1,1,0,0,0,0,2,4], ['Demon',1,3,0,0,0,1,1,6], ['BT',1,0,0,0,0,2,0,12],
  ['Warden',0,3,0,0,0,0,2,0], ['Hsm',0,3,0,0,0,0,3,9], ['Hawk',0,3,0,0,0,0,6,13], ['Kabaal',0,3,0,0,0,2,1,5], ['Mukku',0,2,3,0,0,0,2,0], ['Sallu',0,2,2,1,0,0,5,10], ['Eagle',0,2,0,0,0,0,7,5], ['Pablo',0,2,0,0,0,0,5,10],
  ['Asfand',0,1,5,3,0,0,3,6], ['DGN',0,1,2,2,3,0,1,10], ['Spartian',0,1,2,1,0,0,0,2], ['Dimension',0,1,1,2,1,0,6,7], ['Salt',0,1,0,3,1,0,3,6], ['Sinner',0,1,0,0,0,0,0,3], ['Cold',0,0,3,3,0,0,4,10], ['AG',0,0,3,0,1,0,4,6], ['Toto',0,0,5,0,0,0,2,4], ['Zaheera',0,0,1,2,0,0,7,8], ['Bilal',0,0,1,2,0,0,1,1], ['Vzddd',0,0,1,1,0,0,4,6], ['Mamu',0,0,1,2,1,0,9,9], ['Kaka',0,0,2,0,0,0,1,0], ['Dj',0,0,0,4,1,0,7,10], ['Sr wow',0,0,0,2,3,0,4,7], ['JD',0,0,0,1,2,0,5,12], ['Sky',0,0,0,1,1,0,0,2], ['Mirza',0,0,0,1,0,0,0,4], ['BadBoy',0,0,0,1,0,0,0,0], ['Babloo',0,0,0,0,4,0,2,6], ['Rsv',0,0,0,0,4,0,3,3], ['GK',0,0,0,0,3,0,1,7], ['19/20',0,0,0,0,2,0,7,12], ['Akin',0,0,0,0,2,0,0,7], ['Dope',0,0,0,0,1,0,2,3], ['Boss',0,0,0,0,1,0,0,0], ['Tappayyy',0,0,0,0,1,0,3,2],
  ['Hardy',0,0,0,0,0,6,0,10], ['Keshu',0,0,0,0,0,4,2,12], ['Abdur',0,0,0,0,0,1,0,0], ['Daaku',0,0,0,0,0,0,1,2], ['Hazard',0,0,0,0,0,0,1,3], ['Faraz',0,0,0,0,0,0,1,0], ['Yagami',0,0,0,0,0,0,1,2], ['Mega',0,0,0,0,0,0,1,0], ['Muzikk',0,0,0,0,0,0,1,1], ['Lakshan',0,0,0,0,0,0,1,0], ['Mukesh',0,0,0,0,0,0,0,5], ['Poker',0,0,0,0,0,0,0,2], ['Buddy',0,0,0,0,0,0,0,1], ['Ameem Bhai',0,0,0,0,0,0,0,1], ['Gopal',0,0,0,0,0,0,0,2], ['Zero',0,0,0,0,0,0,0,1]
];

export const legends = rawLegends.map(([name,trophies,medals,gold,silver,bronze,captain,player,poolOuts], index) => ({
  id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`,
  name,
  achievements: { trophies, medals, gold, silver, bronze },
  runnerUp: { captain, player },
  poolOuts,
}));

export const legendsLastUpdated = '21 August 2026';

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
  return [...legends].sort((a, b) => calculateLegacyScore(b) - calculateLegacyScore(a));
}
