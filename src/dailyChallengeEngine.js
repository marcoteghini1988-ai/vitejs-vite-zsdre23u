// ============================================================================
// SPECIFICA TECNICA: SFIDA DEL GIORNO (DAILY CHALLENGE ENGINE)
// Motore deterministico Mulberry32, Fuso Orario Roma, Pacing 24h & 150 Ghost Bot
// ============================================================================

const STORAGE_KEY = 'eclissi_daily_challenge';
const ROME_TZ = 'Europe/Rome';

// 1.0 GENERATORE DETERMINISTICO (MULBERRY32 & HASH STRINGA DATA)
function hashDateString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

function createMulberry32(seed) {
  let s = seed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1.1 DATA ATTUALE NEL FUSO ORARIO DI ROMA (YYYY-MM-DD)
export function getRomeDateString(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: ROME_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(date);
  } catch (_) {
    return date.toISOString().split('T')[0];
  }
}

// Helper: Data del giorno precedente nel fuso di Roma (indipendente dal fuso locale del client)
function getYesterdayRomeDateString() {
  const todayRome = getRomeDateString();
  const [y, m, d] = todayRome.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().split('T')[0];
}

// 1.2 MILLISECONDI RIMASTI ALLA MEZZANOTTE DI ROMA (23:59:59)
export function getMsUntilRomeMidnight() {
  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME_TZ,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  const parts = romeFormatter.formatToParts(now);
  let h = 0, m = 0, s = 0;
  parts.forEach(p => {
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
    if (p.type === 'second') s = parseInt(p.value, 10);
  });
  if (h === 24) h = 0;
  const totalSecondsToday = h * 3600 + m * 60 + s;
  return Math.max(0, (86400 - totalSecondsToday) * 1000);
}

// 1.3 LIBRERIA PROCEDURALE NOMI GHOST BOT (>150.000 COMBINAZIONI)
const CLAN_TAGS = [
  '[VOID]', '[APEX]', '[NOVA]', '[ECL]', '[TITAN]', '[WARP]', '[PULSE]', '[NEO]',
  '[ZERO]', '[CHRONO]', '[AURA]', '[NEXUS]', '[HYPER]', '[AETHER]', '[ZENITH]',
  '[SOLAR]', '[DRIFT]', '[VALK]', '[OMEGA]', '[PRIME]'
];

const REAL_NAMES = [
  'Marco', 'Matteo', 'Luca', 'Davide', 'Elena', 'Sofia', 'Chiara', 'Gabriel', 'Noemi',
  'Alessandro', 'Lorenzo', 'Leonardo', 'Giulia', 'Sara', 'Andrea', 'Tommaso', 'Federico',
  'Edoardo', 'Diego', 'Simone', 'Alex', 'Lucas', 'Sarah', 'Liam', 'Noah', 'Ethan',
  'Mason', 'Oliver', 'Logan', 'Emma', 'Chloe', 'Ava', 'Dylan', 'Dmitri', 'Viktor',
  'Kael', 'Boris', 'Nikolai', 'Ivan', 'Sasha', 'Milan', 'Andrei', 'Sven', 'Erik',
  'Lars', 'Astrid', 'Freja', 'Magnus', 'Carlos', 'Mateo', 'Javier', 'Lucia', 'Yuki',
  'Ren', 'Kenji', 'Haruto', 'Kaito', 'Jin', 'Shin', 'Akira'
];

const SCI_FI_PREFIXES = [
  'Nova', 'Star', 'Cosmo', 'Astro', 'Solar', 'Lunar', 'Nebula', 'Zenith', 'Polaris',
  'Orion', 'Eclipse', 'Pulsar', 'Quasar', 'Helix', 'Abyss', 'Comet', 'Aurora', 'Vortex',
  'Quantum', 'Cyber', 'Neon', 'Hyper', 'Vector', 'Matrix', 'Flux', 'Protocol', 'Glitch',
  'Shadow', 'Dark', 'Iron', 'Apex', 'Phantom', 'Ghost', 'Strike', 'Viper', 'Titan'
];

const SCI_FI_SUFFIXES = [
  'Pilot', 'Commander', 'Hunter', 'Blade', 'Knight', 'Rider', 'Scout', 'Gunner',
  'Captain', 'Operative', 'Striker', 'Vanguard', 'Trooper', 'Prime', 'Zero', 'Core',
  'Edge', 'Drift', 'Shift', 'Pulse', 'Hawk', 'Gale', 'Shard', 'Scythe', 'Reign',
  'TTV', 'Pro', 'God', 'Main', 'Exe'
];

function generateDailyProceduralName(rng) {
  const pattern = Math.floor(rng() * 6);
  const useClan = rng() < 0.18;
  const clan = useClan ? CLAN_TAGS[Math.floor(rng() * CLAN_TAGS.length)] : '';

  let name = '';
  switch (pattern) {
    case 0: {
      const base = REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)];
      const sep = rng() > 0.5 ? '_' : '.';
      const num = Math.floor(rng() * 90) + 10;
      name = `${base}${sep}${num}`;
      break;
    }
    case 1: {
      const pre = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const suf = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_SUFFIXES.length)];
      name = `${pre}${suf}`;
      break;
    }
    case 2: {
      const base = rng() > 0.5 
        ? REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)] 
        : SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      name = `${base}`;
      break;
    }
    case 3: {
      const pre = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const base = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_SUFFIXES.length)];
      const num = Math.floor(rng() * 90) + 10;
      name = `${pre}_${base}${num}`;
      break;
    }
    case 4: {
      const base = SCI_FI_PREFIXES[Math.floor(rng() * SCI_FI_PREFIXES.length)];
      const slang = rng() > 0.5 ? 'TTV' : 'Pro';
      name = `${base}_${slang}`;
      break;
    }
    default: {
      const base = REAL_NAMES[Math.floor(rng() * REAL_NAMES.length)];
      const role = SCI_FI_SUFFIXES[Math.floor(rng() * SCI_FI_SUFFIXES.length)];
      name = `${base}${role}`;
      break;
    }
  }

  return clan ? `${clan}${name}` : name;
}

// 2.0 CONFIGURATORE DETERMINISTICO DEL GIORNO
export function generateDailyChallengeConfig(dateStr = getRomeDateString()) {
  const seed = hashDateString(dateStr);
  const rng = createMulberry32(seed);

  const modes = ['classic', 'vector', 'double_stage', 'tris'];
  const mode = modes[Math.floor(rng() * modes.length)];

  const turnTimes = [20, 25, 30, 40, 45, 60];
  const turnTime = turnTimes[Math.floor(rng() * turnTimes.length)];

  const livesProvided = rng() < 0.4 ? 1 : 0;

  const poolDecks = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
    'sagittarius', 'capricorn', 'aquarius', 'pisces',
    'planet_char_1', 'planet_char_2', 'planet_char_3', 'planet_char_4', 'planet_char_5',
    'planet_char_6', 'planet_char_7', 'planet_char_8', 'planet_char_9', 'planet_char_10',
    'planet_char_11', 'planet_char_12', 'planet_char_13', 'planet_char_14', 'planet_char_15',
    'planet_char_16', 'planet_char_17', 'planet_char_18', 'planet_char_19', 'planet_char_20',
    'ophiuchus', 'supreme_eclipse'
  ];
  const assignedDeck = poolDecks[Math.floor(rng() * poolDecks.length)];
  const assignedDeckLevel = Math.floor(rng() * 4) + 3; // Livello 3–6

  const hasModule = rng() > 0.25;
  const assignedModule = hasModule ? poolDecks[Math.floor(rng() * poolDecks.length)] : null;
  const assignedModuleLevel = hasModule ? (Math.floor(rng() * 4) + 3) : 1;

  const poolPilots = [
    'pilot_com_1', 'pilot_com_2', 'pilot_com_3', 'pilot_com_4',
    'pilot_boss_1', 'pilot_boss_2', 'pilot_boss_3', 'pilot_boss_4',
    'pilot_boss_5', 'pilot_boss_6', 'pilot_boss_7', 'pilot_boss_8',
    'pilot_boss_9', 'pilot_boss_10', 'pilot_boss_11', 'pilot_boss_12',
    'pilot_rare_1', 'pilot_rare_2', 'pilot_rare_3', 'pilot_rare_4',
    'pilot_epic_1', 'pilot_epic_2', 'pilot_epic_3', 'pilot_epic_4',
    'pilot_leg_1', 'pilot_leg_2', 'pilot_leg_3', 'pilot_leg_4',
    'pilot_leg_5', 'pilot_leg_6', 'pilot_boss_18', 'pilot_boss_19', 'pilot_boss_20'
  ];
  const assignedPilot = poolPilots[Math.floor(rng() * poolPilots.length)];
  const assignedPilotLevel = Math.floor(rng() * 3) + 1;

  let nemesisPilot = poolPilots[Math.floor(rng() * poolPilots.length)];
  if (nemesisPilot === assignedPilot) {
    nemesisPilot = poolPilots[(poolPilots.indexOf(assignedPilot) + 7) % poolPilots.length];
  }
  const nemesisPilotLevel = assignedPilotLevel;

  const hasEpic = rng() > 0.4;
  const epicItems = ['epic_item_1', 'epic_item_2', 'epic_item_3', 'epic_item_4', 'epic_item_5', 'epic_item_6', 'epic_item_7', 'epic_item_8', 'epic_item_9', 'epic_item_10'];
  const assignedEpicItem = hasEpic ? epicItems[Math.floor(rng() * epicItems.length)] : null;
  const assignedEpicLevel = hasEpic ? (rng() > 0.5 ? 2 : 1) : 1;

  const terrainPool = [
    'cryo_stasis', 'sub_zero_seal', 'cryo_absorber', 'frost_bite',
    'magnetic_valve', 'charge_splitter', 'gravimetric_anchor', 'rebound_condenser',
    'frequency_reserve', 'tachyon_siphon', 'temporal_singularity', 'entropic_filter',
    'resonance_lock', 'suit_catalyst', 'holographic_prism', 'spectral_multiplier',
    'sign_inverter', 'quantum_polarizer', 'algebraic_refraction', 'harmonic_matrix'
  ];
  const terrainCount = Math.floor(rng() * 3);
  const assignedTerrains = [null, null, null, null];
  for (let t = 0; t < terrainCount; t++) {
    assignedTerrains[t] = terrainPool[(Math.floor(rng() * terrainPool.length) + t) % terrainPool.length];
  }

  const playerHp = Math.floor(rng() * 51) + 70; // 70–120 HP
  const aiHp = Math.round(playerHp * 1.25);      // Nemesi +25%

  const anomalyIds = ['normal', 'hearts_res', 'op_lock_add', 'op_lock_mul', 'op_lock_sub', 'op_lock_div'];
  const assignedAnomalyId = anomalyIds[Math.floor(rng() * anomalyIds.length)];

  const aiDeck = poolDecks[Math.floor(rng() * poolDecks.length)];
  const aiDeckLevel = assignedDeckLevel;
  const aiModule = poolDecks[Math.floor(rng() * poolDecks.length)];

  return {
    dateStr,
    mode,
    turnTime,
    livesProvided,
    assignedDeck,
    assignedDeckLevel,
    assignedModule,
    assignedModuleLevel,
    assignedPilot,
    assignedPilotLevel,
    assignedEpicItem,
    assignedEpicLevel,
    assignedTerrains,
    playerHp,
    aiHp,
    assignedAnomalyId,
    aiDeck,
    aiDeckLevel,
    aiModule,
    nemesisPilot,
    nemesisPilotLevel,
    scannerMode: 'RESTRICTED'
  };
}

// 3.0 CLASSIFICA DETERMINISTICA A 150 GHOST BOT (PACING 24H CON CALIBRAZIONE CONVERGENZA)
export function generateDailyGhostLeaderboard(dateStr = getRomeDateString()) {
  const seed = hashDateString(dateStr) + 999;
  const rng = createMulberry32(seed);

  const dailyConfig = generateDailyChallengeConfig(dateStr);
  const isConvergence = dailyConfig.mode === 'double_stage';

  const totalBots = 150;
  const bots = [];
  const usedNames = new Set();

  for (let i = 0; i < totalBots; i++) {
    let name = generateDailyProceduralName(rng);
    while (usedNames.has(name)) {
      name = generateDailyProceduralName(rng);
    }
    usedNames.add(name);

    const minuteOfDay = Math.floor(rng() * 1430) + 2;
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

    let turns, timeElapsedMs, remainingHpPct;
    if (isConvergence) {
      // In Convergenza ogni round dura 2 turni esatti (T1 Apertura + T2 Chiusura)
      if (i < 10) {
        turns = 2;
        timeElapsedMs = Math.floor(rng() * 12000) + 16000;
        remainingHpPct = Math.round((0.80 + rng() * 0.20) * 100) / 100;
      } else if (i < 40) {
        turns = rng() < 0.65 ? 2 : 4;
        timeElapsedMs = turns === 2 ? Math.floor(rng() * 10000) + 22000 : Math.floor(rng() * 15000) + 38000;
        remainingHpPct = Math.round((0.55 + rng() * 0.35) * 100) / 100;
      } else if (i < 100) {
        turns = rng() < 0.6 ? 4 : 6;
        timeElapsedMs = turns === 4 ? Math.floor(rng() * 18000) + 42000 : Math.floor(rng() * 22000) + 65000;
        remainingHpPct = Math.round((0.30 + rng() * 0.40) * 100) / 100;
      } else {
        turns = rng() < 0.4 ? 6 : (rng() < 0.75 ? 8 : 10);
        timeElapsedMs = Math.floor(rng() * 35000) + (turns * 12000);
        remainingHpPct = Math.round((0.10 + rng() * 0.30) * 100) / 100;
      }
    } else {
      if (i < 10) {
        turns = Math.floor(rng() * 2) + 2;
        timeElapsedMs = Math.floor(rng() * 12000) + 15000;
        remainingHpPct = Math.round((0.85 + rng() * 0.15) * 100) / 100;
      } else if (i < 40) {
        turns = Math.floor(rng() * 3) + 3;
        timeElapsedMs = Math.floor(rng() * 25000) + 25000;
        remainingHpPct = Math.round((0.60 + rng() * 0.30) * 100) / 100;
      } else if (i < 100) {
        turns = Math.floor(rng() * 4) + 5;
        timeElapsedMs = Math.floor(rng() * 40000) + 40000;
        remainingHpPct = Math.round((0.35 + rng() * 0.35) * 100) / 100;
      } else {
        turns = Math.floor(rng() * 5) + 8;
        timeElapsedMs = Math.floor(rng() * 50000) + 70000;
        remainingHpPct = Math.round((0.10 + rng() * 0.30) * 100) / 100;
      }
    }

    bots.push({
      id: `bot_daily_${i + 1}`,
      nickname: name,
      turns,
      timeElapsedMs,
      remainingHpPct,
      timeStr,
      minuteOfDay,
      isBot: true
    });
  }

  return bots.sort((a, b) => {
    if (a.turns !== b.turns) return a.turns - b.turns;
    if (a.timeElapsedMs !== b.timeElapsedMs) return a.timeElapsedMs - b.timeElapsedMs;
    return b.remainingHpPct - a.remainingHpPct;
  });
}

// 3.1 FILTRO BOT VISIBILI ALL'ORA ATTUALE DI ROMA (SENZA ORARI FUTURI)
export function getVisibleLeaderboard(allBots, playerResult = null) {
  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ROME_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = romeFormatter.formatToParts(now);
  let h = 0, m = 0;
  parts.forEach(p => {
    if (p.type === 'hour') h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
  });
  if (h === 24) h = 0;
  const currentMinuteOfDay = h * 60 + m;

  let visible = allBots.filter(b => b.minuteOfDay <= currentMinuteOfDay);
  
  if (visible.length < 15) {
    visible = allBots.slice(0, 15).map(b => {
      if (b.minuteOfDay > currentMinuteOfDay) {
        const clampedMin = Math.max(1, currentMinuteOfDay - Math.floor(Math.random() * 5));
        const ch = Math.floor(clampedMin / 60);
        const cm = clampedMin % 60;
        return {
          ...b,
          minuteOfDay: clampedMin,
          timeStr: `${ch.toString().padStart(2, '0')}:${cm.toString().padStart(2, '0')}`
        };
      }
      return b;
    });
  }

  if (playerResult && playerResult.victory) {
    let pTimeStr = playerResult.timeStr;
    if (!pTimeStr && playerResult.timestamp) {
      try {
        const dt = new Date(playerResult.timestamp);
        const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: ROME_TZ, hour: '2-digit', minute: '2-digit' });
        pTimeStr = fmt.format(dt);
      } catch (_) {
        pTimeStr = 'Oggi';
      }
    }

    visible.push({
      ...playerResult,
      nickname: playerResult.nickname || 'Tu',
      timeStr: pTimeStr || 'Oggi',
      isPlayer: true
    });
  }

  visible.sort((a, b) => {
    if (a.turns !== b.turns) return a.turns - b.turns;
    if (a.timeElapsedMs !== b.timeElapsedMs) return a.timeElapsedMs - b.timeElapsedMs;
    return b.remainingHpPct - a.remainingHpPct;
  });

  return visible;
}

// 4.0 FASCE DI PIAZZAMENTO & TABELLA RICOMPENSE
export function calculateDailyPlacementTier(placement, totalParticipants = 150) {
  if (placement === 1) return 'rank_1';
  if (placement <= 3) return 'rank_2_3';
  const pct = (placement / totalParticipants) * 100;
  if (pct <= 1) return 'top_1_pct';
  if (pct <= 10) return 'top_10_pct';
  if (pct <= 25) return 'top_25_pct';
  if (pct <= 50) return 'top_50_pct';
  return 'base_win';
}

export function getTierRewards(tier) {
  switch (tier) {
    case 'rank_1':
      return { dust: 500, diamonds: 15, voidCrystals: 2, primordialMatter: 1, scannerSeconds: 60 };
    case 'rank_2_3':
      return { dust: 350, diamonds: 10, voidCrystals: 2, primordialMatter: 0, scannerSeconds: 45 };
    case 'top_1_pct':
      return { dust: 250, diamonds: 8, voidCrystals: 1, primordialMatter: 1, scannerSeconds: 30 };
    case 'top_10_pct':
      return { dust: 120, diamonds: 3, voidCrystals: 1, primordialMatter: 0, scannerSeconds: 30 };
    case 'top_25_pct':
      return { dust: 80, diamonds: 2, voidCrystals: 0, primordialMatter: 0, scannerSeconds: 30 };
    case 'top_50_pct':
      return { dust: 50, diamonds: 1, voidCrystals: 0, primordialMatter: 0, scannerSeconds: 15 };
    case 'base_win':
    default:
      return { dust: 30, diamonds: 1, voidCrystals: 0, primordialMatter: 0, scannerSeconds: 0 };
  }
}

export function getStreakMilestoneBonus(streak) {
  if (streak === 3) return { dust: 80, diamonds: 2, voidCrystals: 0, primordialMatter: 0, scannerRefill: false, label: '3 Giorni Consecutivi!' };
  if (streak === 5) return { dust: 150, diamonds: 3, voidCrystals: 1, primordialMatter: 0, scannerRefill: false, label: '5 Giorni Consecutivi!' };
  if (streak >= 7 && streak % 7 === 0) return { dust: 300, diamonds: 7, voidCrystals: 0, primordialMatter: 1, scannerRefill: true, label: `${streak} Giorni Consecutivi!` };
  return null;
}

// 5.0 GESTIONE STORAGE LOCALE E RESET GIORNALIERO
export function loadDailyChallengeData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    lastCompletedDate: null,
    streak: 0,
    hasAttemptedToday: false,
    todayResult: null,
    pendingReward: null
  };
}

export function saveDailyChallengeData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function checkDailyResetAndReport() {
  const currentRomeDate = getRomeDateString();
  const data = loadDailyChallengeData();

  let shouldShowReport = false;
  let reportData = null;

  if (data.pendingReward && !data.pendingReward.claimed) {
    shouldShowReport = true;
    reportData = data.pendingReward;
  }

  if (data.lastCompletedDate && data.lastCompletedDate !== currentRomeDate) {
    const yesterdayRome = getYesterdayRomeDateString();

    // 1. Elabora la ricompensa del giorno precedente prima di resettare la serie
    if (data.todayResult && data.todayResult.victory && (!data.pendingReward || data.pendingReward.claimed)) {
      const allBots = generateDailyGhostLeaderboard(data.lastCompletedDate);
      const allSorted = [...allBots, { ...data.todayResult, isPlayer: true }].sort((a, b) => {
        if (a.turns !== b.turns) return a.turns - b.turns;
        if (a.timeElapsedMs !== b.timeElapsedMs) return a.timeElapsedMs - b.timeElapsedMs;
        return b.remainingHpPct - a.remainingHpPct;
      });
      const finalPlacement = allSorted.findIndex(b => b.isPlayer) + 1;
      const tier = calculateDailyPlacementTier(finalPlacement, allSorted.length);
      const rewards = getTierRewards(tier);
      const streakBonus = getStreakMilestoneBonus(data.streak);

      const pending = {
        claimed: false,
        forDate: data.lastCompletedDate,
        placement: finalPlacement,
        totalParticipants: allSorted.length,
        tier,
        rewards,
        streakBonus,
        playerResult: data.todayResult,
        streak: data.streak
      };

      data.pendingReward = pending;
      shouldShowReport = true;
      reportData = pending;
    }

    // 2. Se è stato saltato un giorno completo senza giocare, la serie per la nuova giornata riparte da 0
    if (data.lastCompletedDate !== yesterdayRome) {
      data.streak = 0;
    }

    data.hasAttemptedToday = false;
    data.todayResult = null;
    saveDailyChallengeData(data);
  }

  return { shouldShowReport, reportData, currentStreak: data.streak };
}
