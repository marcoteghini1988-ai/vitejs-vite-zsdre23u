// ============================================================================
// PROGRESSION ENGINE - LOGICA PURA AGGIORNATA
// ============================================================================

// PREMIO SPECIALE PER IL COMPLETAMENTO DI TUTTI E 3 I CONTRATTI (3/3)
export const DAILY_BOUNTIES_ALL_COMPLETED_REWARD = Object.freeze({
  diamonds: 2,
  scannerSeconds: 10,
  credits: 20
});

export const DAILY_BOUNTIES_POOL = Object.freeze([
  { id: 'bounty_div', name: 'Precisione Razionale', desc: 'Metti a segno 3 attacchi con [/]', target: 3, type: 'op_div', reward: { dust: 350, credits: 15, xp: 80, diamonds: 0 } },
  { id: 'bounty_hearts', name: 'Sintesi Vitale', desc: 'Gioca 8 carte di seme Cuori ()', target: 8, type: 'suit_hearts', reward: { dust: 300, credits: 15, xp: 70, diamonds: 0 } },
  { id: 'bounty_module', name: 'Scarica Massima', desc: 'Attiva il Modulo Abilità Ibrido 2 volte', target: 2, type: 'module_act', reward: { dust: 400, credits: 20, xp: 100, diamonds: 0 } },
  { id: 'bounty_fast', name: 'Colpo Lampo', desc: 'Chiudi 2 attacchi entro i primi 15 secondi', target: 2, type: 'fast_strike', reward: { dust: 350, credits: 15, xp: 90, diamonds: 0 } },
  { id: 'bounty_four_suits', name: 'Allineamento Eclissi', desc: 'Completa 1 Combo 4 Semi (   )', target: 1, type: 'four_suits', reward: { dust: 450, credits: 20, xp: 120, diamonds: 0 } }
]);

export const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const initDailyBounties = (forceRefresh = false) => {
  try {
    const saved = JSON.parse(localStorage.getItem('eclissi_daily_bounties') || '{}');
    const today = getTodayDateString();
    if (!forceRefresh && saved.date === today && Array.isArray(saved.bounties) && saved.bounties.length > 0) {
      if (saved.allCompletedClaimed === undefined) {
        saved.allCompletedClaimed = false;
      }
      return saved;
    }
    const seed = today.split('-').reduce((acc, v) => acc + parseInt(v, 10), 0);
    const shuffled = [...DAILY_BOUNTIES_POOL].sort((a, b) => ((a.id.length * seed) % 7) - ((b.id.length * seed) % 7));
    const selected = shuffled.slice(0, 3).map(b => ({ ...b, progress: 0, completed: false, claimed: false }));
    const payload = { date: today, bounties: selected, allCompletedClaimed: false };
    localStorage.setItem('eclissi_daily_bounties', JSON.stringify(payload));
    return payload;
  } catch (_) {
    return { date: getTodayDateString(), bounties: [], allCompletedClaimed: false };
  }
};

export const FORGE_CONFIG = Object.freeze({
  deck_or_ability: {
    2: { durationMs: 10 * 60 * 1000, etherRush: 1, label: '10 min' },
    3: { durationMs: 30 * 60 * 1000, etherRush: 1, label: '30 min' },
    4: { durationMs: 60 * 60 * 1000, etherRush: 2, label: '1 ora' },
    5: { durationMs: 120 * 60 * 1000, etherRush: 2, label: '2 ore' },
    6: { durationMs: 180 * 60 * 1000, etherRush: 3, label: '3 ore' },
    7: { durationMs: 240 * 60 * 1000, etherRush: 3, label: '4 ore' },
    8: { durationMs: 300 * 60 * 1000, etherRush: 4, label: '5 ore' },
    9: { durationMs: 360 * 60 * 1000, etherRush: 5, label: '6 ore' }
  },
  terrain: {
    2: { durationMs: 30 * 60 * 1000, etherRush: 1, label: '30 min' },
    3: { durationMs: 120 * 60 * 1000, etherRush: 2, label: '2 ore' }
  },
  epic: {
    2: { durationMs: 90 * 60 * 1000, etherRush: 2, label: '1h 30m' },
    3: { durationMs: 240 * 60 * 1000, etherRush: 4, label: '4 ore' }
  }
});

export const getForgeParams = (type, targetLevel) => {
  const category = (type === 'deck' || type === 'ability') ? 'deck_or_ability' : type;
  return FORGE_CONFIG[category]?.[targetLevel] || { durationMs: 15 * 60 * 1000, etherRush: 1, label: '15 min' };
};

export const UPGRADE_DUST_COSTS = Object.freeze({
  2: 450, 3: 1100, 4: 2200, 5: 3500, 6: 5000, 7: 7500, 8: 10500, 9: 15000
});

export const UPGRADE_PILOT_REQS = Object.freeze({
  1: 1,
  2: 12,
  3: 25,
  4: 35,
  5: 48,
  6: 60,
  7: 70,
  8: 82,
  9: 95
});

// BUFFER ACCUMULO POLVERE -> CRISTALLI DI VUOTO
export const calculateStardustOverflow = (currentDust, amountToAdd, walletCap, currentVoid, maxVoid, hasUnlockedVoid = false) => {
  const total = currentDust + amountToAdd;
  if (total <= walletCap) {
    return { newDust: total, newVoid: currentVoid, crystalsEarned: 0, isCapped: false };
  }

  const excess = total - walletCap;

  if (!hasUnlockedVoid) {
    return { newDust: walletCap, newVoid: currentVoid, crystalsEarned: 0, isCapped: true };
  }

  if (currentVoid >= maxVoid) {
    return { newDust: walletCap, newVoid: maxVoid, crystalsEarned: 0, isCapped: true };
  }

  let buffer = 0;
  try {
    buffer = parseInt(localStorage.getItem('eclissi_dust_overflow_buffer') || '0', 10);
  } catch (_) {}

  const accumulated = buffer + excess;
  const potentialCrystals = Math.floor(accumulated / 400);
  const remainingSpace = Math.max(0, maxVoid - currentVoid);
  const crystalsEarned = Math.min(potentialCrystals, remainingSpace);

  const remainingBuffer = crystalsEarned > 0 
    ? Math.max(0, accumulated - (crystalsEarned * 400)) 
    : accumulated;

  try {
    localStorage.setItem('eclissi_dust_overflow_buffer', remainingBuffer.toString());
  } catch (_) {}

  const newVoid = Math.min(maxVoid, currentVoid + crystalsEarned);
  return { newDust: walletCap, newVoid, crystalsEarned, isCapped: true };
};

export const calculateTelemetryOnDefeat = (turnsElapsed = 1, walletCap = 1500) => {
  const turns = Math.max(1, turnsElapsed);
  const xpEarned = Math.max(15, turns * 8);
  const dustEarned = Math.max(10, Math.floor((walletCap * 0.02) + turns * 4));
  return { xpEarned, dustEarned };
};

export const getPlanetStarsStats = (planetNum, campaignStarsMap = {}) => {
  let earnedCount = 0;
  for (let lvl = 1; lvl <= 10; lvl++) {
    const key = `P${planetNum}_L${lvl}`;
    const stars = campaignStarsMap[key] || [false, false, false];
    earnedCount += stars.filter(Boolean).length;
  }
  return { earned: earnedCount, total: 30, isMastered: earnedCount >= 30 };
};

export const getSectorStars = (planetNum, levelNum, campaignStarsMap = {}) => {
  const key = `P${planetNum}_L${levelNum}`;
  return campaignStarsMap[key] || [false, false, false];
};

export const calculateNearestMilestone = ({
  stardust = 0,
  diamonds = 0,
  level = 1,
  selectedDeck = 'neutral_starter',
  deckInventory = {},
  totalCampaignStars = 0,
  unlockedRelics = {},
  unlockedRifts = {},
  allDecks = []
}) => {
  const curDeckData = deckInventory[selectedDeck] || { level: 1 };
  const curDeckObj = allDecks.find(d => d.id === selectedDeck);
  if (curDeckObj && curDeckObj.id !== 'neutral_starter' && curDeckData.level < (curDeckObj.maxLevel || 3)) {
    const nextLvl = curDeckData.level + 1;
    const reqPilot = UPGRADE_PILOT_REQS[nextLvl] || 1;
    const costDust = UPGRADE_DUST_COSTS[nextLvl] || nextLvl * 500;

    if (level < reqPilot) {
      return {
        type: 'deck_pilot',
        tag: 'GRADO PILOTA RICHIESTO',
        color: '#c084fc',
        title: `Raggiungi il Livello ${reqPilot} per la passiva di ${curDeckObj.name.split(' ')[0]}!`,
        actionScreen: 'decks'
      };
    }

    if (stardust >= costDust) {
      return {
        type: 'deck_ready',
        tag: 'POTENZIAMENTO PRONTO',
        color: '#34d399',
        title: `${curDeckObj.name.split(' ')[0]} è pronto per il Livello ${nextLvl}!`,
        actionScreen: 'decks'
      };
    }

    if (costDust - stardust <= 400) {
      return {
        type: 'deck_dust',
        tag: 'POTENZIAMENTO VICINO',
        color: '#38bdf8',
        title: `Solo ${costDust - stardust}  per potenziare ${curDeckObj.name.split(' ')[0]} a Liv. ${nextLvl}!`,
        actionScreen: 'decks'
      };
    }
  }

  const nextMilestone = (Math.floor(totalCampaignStars / 15) + 1) * 15;
  if (nextMilestone <= 600) {
    const starsDiff = nextMilestone - totalCampaignStars;
    if (starsDiff <= 5) {
      return {
        type: 'stars',
        tag: 'ROTTA DELLE COSTELLAZIONI',
        color: '#facc15',
        title: `Ti mancano solo ${starsDiff}  per la Capsula ${nextMilestone} !`,
        actionScreen: 'star_capsules'
      };
    }
  }

  if (unlockedRelics['relic_p1'] && !unlockedRelics['relic_p2'] && !unlockedRifts['rift_1']) {
    return {
      type: 'rift',
      tag: 'VARCO I: PONTE MÖBIUS',
      color: '#00f2fe',
      title: 'Batti il Boss di Marte per forgiare l\'Anello di Möbius!',
      actionScreen: 'epic_items'
    };
  }

  const lockedDecks = allDecks.filter(d => d.id !== 'neutral_starter' && !deckInventory[d.id]?.unlocked);
  if (lockedDecks.length > 0) {
    let closestDeck = null;
    let minDiaDiff = Infinity;
    lockedDecks.forEach(d => {
      const cost = d.unlockCostDiamonds || 20;
      const diff = cost - diamonds;
      if (diff > 0 && diff < minDiaDiff) {
        minDiaDiff = diff;
        closestDeck = d;
      }
    });
    if (closestDeck && minDiaDiff <= 8) {
      return {
        type: 'deck_unlock',
        tag: 'NUOVO MAZZO IN ARRIVO',
        color: '#f43f5e',
        title: `Solo ${minDiaDiff}  per sbloccare il Mazzo ${closestDeck.name.split(' ')[0]}!`,
        actionScreen: 'decks'
      };
    }
  }

  return {
    type: 'default',
    tag: 'RADAR PROGRESSIONE',
    color: '#00f2fe',
    title: `Prossima Rotta Stellare: conquista stelle nei settori di P${(Math.floor(totalCampaignStars / 30) + 1)}!`,
    actionScreen: 'adv'
  };
};
