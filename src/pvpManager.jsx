import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, update, remove, onDisconnect } from 'firebase/database';
import { SciFiIcon } from './visualAssets';

// ============================================================================
// 1.0 CONFIGURAZIONE FIREBASE RTDB (CON PROTEZIONE DA ISTANZE DUPLICATE)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyD-i4ZHkZDvC_jXIJX90bW_X4u8XWrUtnk",
  authDomain: "gioco-eclissi-stellare.firebaseapp.com",
  databaseURL: "https://gioco-eclissi-stellare-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "gioco-eclissi-stellare",
  storageBucket: "gioco-eclissi-stellare.firebasestorage.app",
  messagingSenderId: "24416718121",
  appId: "1:24416718121:web:2608711e904e10a3e6fb38"
};

let firebaseApp = null;
export let db = null;

try {
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getDatabase(firebaseApp);
} catch (err) {
  console.warn("Inizializzazione Firebase:", err);
}

// ============================================================================
// 1.1 PARAMETRI ECONOMICI & REGOLE PVP
// ============================================================================
export const PVP_TRAINING_ENTRY_CREDITS = 5;
export const PVP_ELITE_DAILY_MATCHES_CAP = 10;
export const PVP_LOSS_TROPHIES = 10;
export const PVP_WIN_CREDITS = 5;       // Rimborso esatto del ticket d'ingresso (giocata a costo zero per chi vince)
export const PVP_WIN_STARDUST = 60;     // Farming polvere stellare incrementato per la Fascia 2
export const PVP_LOSS_STARDUST = 15;
export const PVP_WIN_XP = 80;
export const PVP_LOSS_XP = 25;

// SCAGLIONI TROFEI A STELLE (SOLO LEGA ÉLITE)
export const PVP_ELITE_STAR_REWARDS = Object.freeze({
  1: { 
    stars: 1, 
    percent: 50, 
    trophies: 15, 
    voidCrystals: 1, 
    primordialMatter: 0, 
    chancePrimordial: 0, 
    label: "Vittoria Tattica (+15 🏆, +1 💠)" 
  },
  2: { 
    stars: 2, 
    percent: 75, 
    trophies: 22, 
    voidCrystals: 1, 
    primordialMatter: 0, 
    chancePrimordial: 0.5, 
    label: "Vittoria Dominante (+22 🏆, +1 💠, 50% 🟣)" 
  },
  3: { 
    stars: 3, 
    percent: 100, 
    trophies: 30, 
    diamonds: 1, 
    voidCrystals: 1, 
    primordialMatter: 1, 
    chancePrimordial: 1.0, 
    label: "Vittoria Perfetta (+30 🏆, +1 💎, +1 💠, +1 🟣)" 
  }
});

// SBLOCCO MODALITÀ PVP DAL PROGRESSO NEI SETTORI AVVENTURA (ALLINEATO A SETTORE 11)
export const PVP_MODE_UNLOCKS = Object.freeze({
  classic: { sector: 11, label: 'Classica (4 Operazioni & Poker)' },
  vector: { sector: 21, label: 'Vettore Geometrico' },
  double_stage: { sector: 41, label: 'Convergenza (Banco 2+2 & Poker)' },
  tris: { sector: 61, label: 'Tris Stellare' }
});

export const isPvPModeUnlocked = (mode, currentSector = 1) => {
  const entry = PVP_MODE_UNLOCKS[mode];
  const req = (typeof entry === 'object' && entry !== null) ? entry.sector : (typeof entry === 'number' ? entry : 11);
  return currentSector >= req;
};

// ============================================================================
// 1.2 ROTAZIONE GIORNALIERA ÉLITE & SFIDA DELLA 3ª STELLA
// ============================================================================
export const getDailyPvPMode = () => {
  const day = new Date().getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sab
  if (day === 0) {
    return {
      mode: 'tris',
      title: 'Tris Stellare',
      desc: 'Incastro a 5 Carte [Tavolo Op1 C2 + C3 + C4 + C5 = Target / Parità]',
      star3Challenge: {
        title: 'Armonia Galattica',
        desc: 'Chiudi almeno un incastro con una combinazione pokeristica a 5 carte (da Coppia a Scala Reale).'
      }
    };
  }
  if (day === 1 || day === 4) {
    return {
      mode: 'classic',
      title: 'Modalità Classica',
      desc: '3 Piedistalli Tattici (Calcolo Puro, Pattern Poker, Bomba 3T)',
      star3Challenge: {
        title: 'Precisione Razionale',
        desc: 'Metti a segno almeno un attacco vincente con la Divisione [/] o una Combo 4 Semi.'
      }
    };
  }
  if (day === 2 || day === 5) {
    return {
      mode: 'vector',
      title: 'Vettore Geometrico',
      desc: 'Composizione Radar Vettoriale',
      star3Challenge: {
        title: 'Efficienza Balistica',
        desc: 'Centra il radar sommando algebricamente al massimo 2 carte nel Nucleo.'
      }
    };
  }
  return {
    mode: 'double_stage',
    title: 'Duello di Convergenza',
    desc: 'Banco Comune: centra il Target condiviso in 2 turni concatenati (2+2 carte) e domina con la figura Poker',
    star3Challenge: {
      title: 'Precisione di Convergenza',
      desc: 'Centra il Target condiviso o vinci il duello con il minor Delta o la migliore figura Poker.'
    }
  };
};

export const getWeeklyLeaderboardKey = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `settimana_${d.getUTCFullYear()}_${weekNo}`;
};

// ============================================================================
// 1.3 POOL DEI 33 PILOTI PER GENERAZIONE AVVERSARI E CLASSIFICHE
// ============================================================================
const POOL_PILOTS = Object.freeze([
  'pilot_com_1', 'pilot_com_2', 'pilot_com_3', 'pilot_com_4',
  'pilot_boss_1', 'pilot_boss_2', 'pilot_boss_3', 'pilot_boss_4',
  'pilot_boss_5', 'pilot_boss_6', 'pilot_boss_7', 'pilot_boss_8',
  'pilot_boss_9', 'pilot_boss_10', 'pilot_boss_11', 'pilot_boss_12',
  'pilot_rare_1', 'pilot_rare_2', 'pilot_rare_3', 'pilot_rare_4',
  'pilot_epic_1', 'pilot_epic_2', 'pilot_epic_3', 'pilot_epic_4',
  'pilot_leg_1', 'pilot_leg_2', 'pilot_leg_3', 'pilot_leg_4',
  'pilot_leg_5', 'pilot_leg_6', 'pilot_boss_18', 'pilot_boss_19', 'pilot_boss_20'
]);

// Helper per generare una Carta Base valida per il banco di Convergenza o Tris
export const generatePvpBaseCard = () => {
  const suits = [
    { id: 'hearts', symbol: '♥', color: '#f43f5e' },
    { id: 'diamonds', symbol: '♦', color: '#00f2fe' },
    { id: 'clubs', symbol: '♣', color: '#10b981' },
    { id: 'spades', symbol: '♠', color: '#c084fc' }
  ];
  const s = suits[Math.floor(Math.random() * suits.length)];
  const rawVal = Math.floor(Math.random() * 13) + 1;
  let displayVal = rawVal.toString();
  if (rawVal === 1) displayVal = 'A';
  else if (rawVal === 11) displayVal = 'J';
  else if (rawVal === 12) displayVal = 'Q';
  else if (rawVal === 13) displayVal = 'K';

  return {
    id: `base_${s.id}_${rawVal}_${Math.random().toString(36).substring(2, 6)}`,
    value: rawVal,
    displayVal,
    suit: s.id,
    symbol: s.symbol,
    color: s.color,
    isCourt: rawVal >= 11,
    isJoker: false,
    isGolden: false
  };
};

// ============================================================================
// 1.4 GENERATORE PROCEDURALE NOMI AD ALTA ENTROPIA (>150.000 COMBINAZIONI)
// ============================================================================
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

export const generateProceduralName = () => {
  const pattern = Math.floor(Math.random() * 6);
  const useClan = Math.random() < 0.18;
  const clan = useClan ? CLAN_TAGS[Math.floor(Math.random() * CLAN_TAGS.length)] : '';

  let baseName = '';
  switch (pattern) {
    case 0: {
      const base = REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)];
      const sep = Math.random() > 0.5 ? '_' : '.';
      const num = Math.floor(Math.random() * 90) + 10;
      baseName = `${base}${sep}${num}`;
      break;
    }
    case 1: {
      const pre = SCI_FI_PREFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      const suf = SCI_FI_SUFFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      baseName = `${pre}${suf}`;
      break;
    }
    case 2: {
      const base = Math.random() > 0.5 
        ? REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)] 
        : SCI_FI_PREFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      baseName = base;
      break;
    }
    case 3: {
      const pre = SCI_FI_PREFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      const base = SCI_FI_SUFFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      const num = Math.floor(Math.random() * 90) + 10;
      baseName = `${pre}_${base}${num}`;
      break;
    }
    case 4: {
      const base = SCI_FI_PREFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      const slang = Math.random() > 0.5 ? 'TTV' : 'Pro';
      baseName = `${base}_${slang}`;
      break;
    }
    default: {
      const base = REAL_NAMES[Math.floor(Math.random() * REAL_NAMES.length)];
      const role = SCI_FI_SUFFIXES[Math.floor(Math.random() * SCI_FI_PREFIXES.length)];
      baseName = `${base}${role}`;
      break;
    }
  }

  return clan ? `${clan}${baseName}` : baseName;
};

// ============================================================================
// 1.5 GENERATORE GHOST BOT SINGOLO (BILANCIAMENTO CANALE & HARDPOINT)
// ============================================================================
export const generateGhostProfile = (playerLevel = 1, playerTrophies = 0, channel = 'training') => {
  const botNick = generateProceduralName();

  let botLevel = Number(playerLevel) || 1;
  let botTrophies = 0;

  if (channel === 'elite') {
    botLevel = Math.max(80, Math.min(100, (Number(playerLevel) || 80) + (Math.floor(Math.random() * 5) - 2)));
    botTrophies = Math.max(100, Number(playerTrophies || 100) + (Math.floor(Math.random() * 80) - 40));
  } else {
    botLevel = Number(playerLevel) || 1;
  }

  const poolDecks = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'scorpio',
    'planet_char_1', 'planet_char_2', 'planet_char_6', 'planet_char_15', 'planet_char_20'
  ];
  const botDeck = poolDecks[Math.floor(Math.random() * poolDecks.length)];
  const botPilot = POOL_PILOTS[Math.floor(Math.random() * POOL_PILOTS.length)];

  let botDeckLevel = 1;
  if (botLevel >= 66) botDeckLevel = Math.min(9, Math.floor((botLevel - 65) / 5) + 7);
  else if (botLevel >= 31) botDeckLevel = Math.min(6, Math.floor((botLevel - 30) / 6) + 4);
  else botDeckLevel = Math.min(3, Math.max(1, Math.floor(botLevel / 10) + 1));

  return {
    id: `ghost_${Math.random().toString(36).substring(2, 9)}`,
    nickname: botNick,
    level: botLevel,
    deckLevel: botDeckLevel,
    trophies: botTrophies,
    deck: botDeck,
    ability: botDeck,
    pilot: botPilot,
    channel,
    equippedWeapons: ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
    weaponsLevels: {
      wp_gatling: botDeckLevel,
      wp_xbow: botDeckLevel,
      wp_thunderstrike: botDeckLevel,
      wp_orbital_cannon: botDeckLevel
    },
    isBot: true
  };
};

// ============================================================================
// 1.6 CLASSIFICA SETTIMANALE PERSISTENTE CON 500 PILOTI & SIMULAZIONE GIORNALIERA
// ============================================================================
const STORAGE_LEADERBOARD_KEY = 'eclissi_persistent_leaderboard';

export const getPersistentLeaderboardData = (currentWeekKey) => {
  try {
    const storedRaw = localStorage.getItem(STORAGE_LEADERBOARD_KEY);
    if (storedRaw) {
      const stored = JSON.parse(storedRaw);
      if (stored.weekKey === currentWeekKey && Array.isArray(stored.pilots)) {
        return simulateDailyLeaderboardGrowth(stored);
      }
    }
  } catch (_) {}

  return generateNewWeeklyRoster(currentWeekKey);
};

function generateNewWeeklyRoster(currentWeekKey) {
  const poolDecks = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio',
    'sagittarius', 'capricorn', 'aquarius', 'pisces', 'planet_char_1', 'planet_char_2',
    'planet_char_6', 'planet_char_9', 'planet_char_15', 'planet_char_20'
  ];

  const totalPilots = 500;
  const pilots = [];
  const usedNames = new Set();

  for (let i = 0; i < totalPilots; i++) {
    let name = generateProceduralName();
    while (usedNames.has(name)) {
      name = generateProceduralName();
    }
    usedNames.add(name);

    let minT, maxT, minL, maxL;
    if (i < 20) {
      minT = 850; maxT = 1200; minL = 92; maxL = 100;
    } else if (i < 100) {
      minT = 600; maxT = 849; minL = 86; maxL = 94;
    } else if (i < 300) {
      minT = 350; maxT = 599; minL = 82; maxL = 88;
    } else {
      minT = 100; maxT = 349; minL = 80; maxL = 84;
    }

    const trophies = Math.floor(Math.random() * (maxT - minT + 1)) + minT;
    const level = Math.floor(Math.random() * (maxL - minL + 1)) + minL;
    const wins = Math.max(1, Math.floor(trophies / 22));
    const losses = Math.max(0, Math.floor(wins * 0.45));

    pilots.push({
      id: `pilot_${i + 1}`,
      nickname: name,
      level,
      deck: poolDecks[i % poolDecks.length],
      pilot: POOL_PILOTS[i % POOL_PILOTS.length],
      trophies,
      wins,
      losses,
      isBot: true
    });
  }

  pilots.sort((a, b) => b.trophies - a.trophies);

  const payload = {
    weekKey: currentWeekKey,
    lastSimulatedDate: new Date().toDateString(),
    pilots
  };

  try {
    localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(payload));
  } catch (_) {}

  return pilots;
}

function simulateDailyLeaderboardGrowth(stored) {
  const todayStr = new Date().toDateString();
  if (stored.lastSimulatedDate === todayStr) {
    return stored.pilots;
  }

  const updatedPilots = stored.pilots.map((pilot, idx) => {
    let delta = 0;
    if (idx < 50) {
      delta = Math.floor(Math.random() * 70) + 70;
    } else if (idx < 250) {
      delta = Math.floor(Math.random() * 60) + 30;
    } else {
      delta = Math.floor(Math.random() * 50) - 20;
    }

    const nextTrophies = Math.max(100, pilot.trophies + delta);
    const extraWins = delta > 0 ? Math.floor(delta / 22) : 0;
    const extraLosses = delta < 0 ? Math.abs(Math.floor(delta / 10)) : 1;

    return {
      ...pilot,
      trophies: nextTrophies,
      wins: pilot.wins + extraWins,
      losses: pilot.losses + extraLosses,
      pilot: pilot.pilot || POOL_PILOTS[idx % POOL_PILOTS.length]
    };
  });

  updatedPilots.sort((a, b) => b.trophies - a.trophies);

  const payload = {
    ...stored,
    lastSimulatedDate: todayStr,
    pilots: updatedPilots
  };

  try {
    localStorage.setItem(STORAGE_LEADERBOARD_KEY, JSON.stringify(payload));
  } catch (_) {}

  return updatedPilots;
}

// ============================================================================
// 2.0 COMPONENTE MATCHMAKING LOBBY
// ============================================================================
export function MatchmakingLobby({
  myNickname,
  myDeck,
  myPilot = 'pilot_com_1',
  myLevel,
  myTrophies,
  pvpChannel = 'training',
  selectedMode = 'classic',
  myWeapons = ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
  myWeaponsLevels = { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 },
  onMatchFound,
  onCancel
}) {
  const [searchTime, setSearchTime] = useState(0);
  const queueTicketRef = useRef(null);
  const matchedRef = useRef(false);
  const unsubRoomsRef = useRef(null);

  useEffect(() => {
    matchedRef.current = false;
    const activeMode = pvpChannel === 'elite' ? getDailyPvPMode().mode : selectedMode;
    const timer = setInterval(() => setSearchTime(t => t + 1), 1000);

    const myId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const queueKey = `${pvpChannel}_${activeMode}`;

    // Calcolo HP universali corretti in base al livello per la stanza
    const myInitialHp = Math.min(400, Math.floor(50 + Math.floor((Number(myLevel) || 1) / 5) * 17.5));

    // Tentativo di matchmaking reale se Firebase RTDB è disponibile
    if (db) {
      const queueRef = ref(db, `matchmaking_queue/${queueKey}`);
      const myTicketRef = ref(db, `matchmaking_queue/${queueKey}/${myId}`);
      queueTicketRef.current = myTicketRef;

      // Pulizia automatica su disconnessione
      onDisconnect(myTicketRef).remove();

      // Scansione coda: se c'è un altro giocatore in attesa, unisciti alla sua partita
      get(queueRef).then(snapshot => {
        if (matchedRef.current) return;
        const queueData = snapshot.val();
        let matchedOpponent = null;
        let opponentKey = null;

        if (queueData) {
          const now = Date.now();
          for (const [k, ticket] of Object.entries(queueData)) {
            // Ignora il proprio ticket o ticket più vecchi di 15 secondi
            if (k !== myId && ticket && (now - ticket.timestamp < 15000)) {
              matchedOpponent = ticket;
              opponentKey = k;
              break;
            }
          }
        }

        if (matchedOpponent && opponentKey) {
          matchedRef.current = true;
          const roomId = `room_pvp_${opponentKey}_${myId}`;
          const oppInitialHp = Math.min(400, Math.floor(50 + Math.floor((Number(matchedOpponent.level) || 1) / 5) * 17.5));

          // Rimuove l'avversario dalla coda per evitare doppi match
          remove(ref(db, `matchmaking_queue/${queueKey}/${opponentKey}`)).catch(() => {});
          remove(myTicketRef).catch(() => {});

          // Crea la stanza sincronizzata per entrambi i giocatori con HP e Hardpoint reali
          const roomRef = ref(db, `rooms/${roomId}`);
          const initialRoomData = {
            status: 'active',
            mode: activeMode,
            channel: pvpChannel,
            turn: matchedOpponent.id,
            p1: {
              id: matchedOpponent.id,
              nickname: matchedOpponent.nickname,
              deck: matchedOpponent.deck,
              pilot: matchedOpponent.pilot,
              level: matchedOpponent.level,
              trophies: matchedOpponent.trophies,
              equippedWeapons: matchedOpponent.equippedWeapons || ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
              weaponsLevels: matchedOpponent.weaponsLevels || { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 },
              hp: oppInitialHp,
              maxHp: oppInitialHp,
              ether: 0,
              malus: 0
            },
            p2: {
              id: myId,
              nickname: myNickname,
              deck: myDeck,
              pilot: myPilot,
              level: myLevel,
              trophies: myTrophies,
              equippedWeapons: myWeapons,
              weaponsLevels: myWeaponsLevels,
              hp: myInitialHp,
              maxHp: myInitialHp,
              ether: 0,
              malus: 0
            },
            createdAt: Date.now()
          };

          // Sincronizzazione preventiva e atomica del banco comune per Convergenza, Tris o Vettore
          if (activeMode === 'double_stage') {
            initialRoomData.convergenceState = {
              baseCard: generatePvpBaseCard(),
              target: Math.floor(Math.random() * 41) + 20,
              turn: 1,
              subStep: 1,
              p1T1: 0,
              p2T1: 0
            };
          } else if (activeMode === 'tris') {
            initialRoomData.trisState = {
              tableCard: generatePvpBaseCard(),
              op1: ['+', '-', '*', '/'][Math.floor(Math.random() * 4)],
              op2: '+',
              target: Math.floor(Math.random() * 30) + 24
            };
          } else if (activeMode === 'vector') {
            initialRoomData.vectorState = {
              target: Math.floor(Math.random() * 26) + 15,
              parityFilter: Math.random() > 0.5 ? 'PARI' : 'DISPARI'
            };
          }

          set(roomRef, initialRoomData).then(() => {
            onMatchFound({
              roomId,
              myPlayerId: myId,
              myPilot: myPilot,
              opponent: {
                id: matchedOpponent.id,
                nickname: matchedOpponent.nickname,
                deck: matchedOpponent.deck,
                pilot: matchedOpponent.pilot,
                level: matchedOpponent.level,
                trophies: matchedOpponent.trophies,
                equippedWeapons: matchedOpponent.equippedWeapons || ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
                weaponsLevels: matchedOpponent.weaponsLevels || { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 }
              },
              isHost: false,
              isGhostMatch: false,
              channel: pvpChannel,
              mode: activeMode
            });
          });
        } else {
          // Nessun giocatore trovato: registrati nella coda in attesa con equipaggiamenti
          set(myTicketRef, {
            id: myId,
            nickname: myNickname,
            deck: myDeck,
            pilot: myPilot,
            level: myLevel,
            trophies: myTrophies,
            equippedWeapons: myWeapons,
            weaponsLevels: myWeaponsLevels,
            timestamp: Date.now()
          });

          // Ascolta se qualcuno crea una stanza per noi con pulizia del listener
          const roomsRef = ref(db, 'rooms');
          unsubRoomsRef.current = onValue(roomsRef, snap => {
            if (matchedRef.current) {
              if (unsubRoomsRef.current) {
                unsubRoomsRef.current();
                unsubRoomsRef.current = null;
              }
              return;
            }
            const rooms = snap.val();
            if (rooms) {
              for (const [rId, room] of Object.entries(rooms)) {
                if (room && room.status === 'active' && room.p1?.id === myId) {
                  matchedRef.current = true;
                  remove(myTicketRef).catch(() => {});
                  if (unsubRoomsRef.current) {
                    unsubRoomsRef.current();
                    unsubRoomsRef.current = null;
                  }
                  onMatchFound({
                    roomId: rId,
                    myPlayerId: myId,
                    myPilot: myPilot,
                    opponent: {
                      id: room.p2.id,
                      nickname: room.p2.nickname,
                      deck: room.p2.deck,
                      pilot: room.p2.pilot,
                      level: room.p2.level,
                      trophies: room.p2.trophies,
                      equippedWeapons: room.p2.equippedWeapons || ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
                      weaponsLevels: room.p2.weaponsLevels || { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 }
                    },
                    isHost: true,
                    isGhostMatch: false,
                    channel: pvpChannel,
                    mode: activeMode
                  });
                  break;
                }
              }
            }
          });
        }
      }).catch(err => {
        console.warn("Errore coda matchmaking Firebase:", err);
      });
    }

    // Safety Timeout (4.5 secondi): se non trova un giocatore reale, avvia la simulazione Ghost
    const fallbackTimeout = setTimeout(() => {
      if (matchedRef.current) return;
      matchedRef.current = true;

      if (unsubRoomsRef.current) {
        unsubRoomsRef.current();
        unsubRoomsRef.current = null;
      }

      if (queueTicketRef.current) {
        remove(queueTicketRef.current).catch(() => {});
      }

      const ghost = generateGhostProfile(myLevel, myTrophies, pvpChannel);

      onMatchFound({
        roomId: `room_pvp_${Date.now()}`,
        myPlayerId: `p1_${Date.now()}`,
        myPilot: myPilot,
        opponent: ghost,
        isHost: true,
        isGhostMatch: true,
        channel: pvpChannel,
        mode: activeMode
      });
    }, 4500);

    return () => {
      clearInterval(timer);
      clearTimeout(fallbackTimeout);
      if (unsubRoomsRef.current) {
        unsubRoomsRef.current();
        unsubRoomsRef.current = null;
      }
      if (queueTicketRef.current) {
        remove(queueTicketRef.current).catch(() => {});
      }
    };
  }, [myLevel, myTrophies, myPilot, myNickname, myDeck, pvpChannel, selectedMode, myWeapons, myWeaponsLevels, onMatchFound]);

  const handleCancelClick = () => {
    matchedRef.current = true;
    if (unsubRoomsRef.current) {
      unsubRoomsRef.current();
      unsubRoomsRef.current = null;
    }
    if (queueTicketRef.current) {
      remove(queueTicketRef.current).catch(() => {});
    }
    onCancel();
  };

  const channelTitle = pvpChannel === 'elite' ? 'Lega Élite Mondiale' : 'Canale Addestramento';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.75rem', maxWidth: '400px', width: '100%', textAlign: 'center', border: '2px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.6)' }}>
        <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>DUELLO ONLINE 1V1</div>
        <h3 style={{ color: '#00f2fe', margin: '0.2rem 0 0.6rem 0', fontWeight: '900', fontSize: '1.2rem' }}>
          {channelTitle}
        </h3>
        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '1rem auto' }}>
          <div className="radar-ring" style={{ width: '80px', height: '80px' }} />
          <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', background: 'radial-gradient(circle, #00f2fe 0%, transparent 70%)', animation: 'pulseGlow 1.2s infinite alternate' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 'bold' }}>
          Ricerca avversario in corso... ({searchTime}s)
        </div>
        <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '6px 0 1.25rem 0' }}>
          {pvpChannel === 'elite' ? "Abbinamento mondiale per Trofei (10 Partite al Giorno)" : "Addestramento alla pari senza rischio trofei (5 Crediti)"}
        </p>
        <button onClick={handleCancelClick} className="cyber-btn" style={{ width: '100%', padding: '0.65rem', borderColor: '#ef4444', color: '#fca5a5' }}>
          Annulla Ricerca
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 3.0 MODALE CLASSIFICA SETTIMANALE ÉLITE
// ============================================================================
export function WeeklyLeaderboardModal({ myNickname, myTrophies, myPlayerId, myLevel, onClose }) {
  const currentWeekKey = getWeeklyLeaderboardKey();
  const [pilots, setPilots] = useState(() => getPersistentLeaderboardData(currentWeekKey));
  const dailyMode = getDailyPvPMode();

  // Fallback reattivo sul livello pilota salvato localmente
  const effectiveMyLevel = Number(myLevel) > 1 
    ? Number(myLevel) 
    : parseInt(localStorage.getItem('eclissi_level') || '1', 10);

  // Sincronizzazione real-time con i punteggi reali salvati su Firebase RTDB
  useEffect(() => {
    if (!db) return;
    try {
      const lbRef = ref(db, `leaderboards/${currentWeekKey}`);
      const unsub = onValue(lbRef, snapshot => {
        const val = snapshot.val();
        if (!val) return;
        const onlinePlayers = Object.entries(val).map(([pId, data]) => ({
          id: pId,
          nickname: data.nickname || 'Pilota',
          level: Number(data.level) || 1,
          deck: data.deck || 'aries',
          trophies: Number(data.trophies) || 0,
          wins: Number(data.wins) || 0,
          losses: Number(data.losses) || 0,
          isBot: false,
          isRealOnline: true
        }));

        setPilots(prev => {
          const nonCollidingBots = prev.filter(p => p.isBot && !onlinePlayers.some(op => op.id === p.id));
          const merged = [...onlinePlayers, ...nonCollidingBots].sort((a, b) => b.trophies - a.trophies);
          return merged.slice(0, 500);
        });
      }, err => console.warn("Lettura classifica Firebase:", err));

      return () => {
        if (typeof unsub === 'function') unsub();
      };
    } catch (_) {}
  }, [currentWeekKey]);

  // Filtra per evitare che il giocatore compaia due volte se già registrato nel DB
  const filteredPilots = pilots.filter(p => p.id !== myPlayerId);
  const combinedList = [
    ...filteredPilots,
    { 
      id: myPlayerId, 
      nickname: myNickname, 
      trophies: myTrophies, 
      isPlayer: true, 
      level: effectiveMyLevel, 
      wins: Math.floor(myTrophies / 22), 
      losses: 2 
    }
  ].sort((a, b) => b.trophies - a.trophies);

  const playerRankIndex = combinedList.findIndex(p => p.isPlayer);
  const myRank = playerRankIndex + 1;

  const top10 = combinedList.slice(0, 10);
  const showAroundMe = myRank > 10;
  const aroundMe = showAroundMe 
    ? combinedList.slice(Math.max(10, playerRankIndex - 2), Math.min(combinedList.length, playerRankIndex + 3))
    : [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '1.5px solid #facc15', boxShadow: '0 0 45px rgba(250, 204, 21, 0.45)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.12)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ color: '#fde047', margin: 0, fontWeight: '900', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SciFiIcon name="trophy" size={20} color="#fde047" /> Classifica Settimanale Élite (500 Piloti)
            </h3>
            <div style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>
              I tuoi Trofei: <strong style={{ color: '#facc15' }}>{myTrophies} 🏆</strong> | Posizione: <strong style={{ color: '#00f2fe' }}>#{myRank}</strong>
            </div>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
        </div>

        <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #facc15', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.62rem', color: '#fde047', fontWeight: 'bold' }}>MODALITÀ ÉLITE DI OGGI:</div>
          <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '900' }}>{dailyMode.title}</div>
          <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>{dailyMode.desc}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.2rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', textTransform: 'uppercase' }}>
            ★ Top 10 Mondiale (Zona Diamanti)
          </div>
          {top10.map((pilot, idx) => {
            const isMe = pilot.isPlayer;
            const rankNum = idx + 1;
            const rankBadge = rankNum === 1 ? '🥇 1° (100 💎)' : rankNum === 2 ? '🥈 2° (50 💎)' : rankNum === 3 ? '🥉 3° (25 💎)' : `${rankNum}°`;

            return (
              <div
                key={pilot.id || idx}
                className="cyber-panel"
                style={{
                  padding: '0.45rem 0.65rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isMe ? 'rgba(8, 145, 178, 0.45)' : (rankNum <= 3 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.8)'),
                  border: isMe ? '1.5px solid #00f2fe' : (rankNum <= 3 ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.08)')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '900', color: rankNum <= 3 ? '#fde047' : '#94a3b8' }}>
                    {rankBadge}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>
                      {pilot.nickname} {isMe && '(Tu)'}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Liv. {pilot.level} • {pilot.wins}V / {pilot.losses}P</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#facc15' }}>
                  {pilot.trophies} 🏆
                </div>
              </div>
            );
          })}

          {showAroundMe && (
            <>
              <div style={{ fontSize: '0.65rem', color: '#00f2fe', fontWeight: '900', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                ↕ Intorno alla tua posizione (#{myRank})
              </div>
              {aroundMe.map((pilot, idx) => {
                const isMe = pilot.isPlayer;
                const pos = Math.max(10, playerRankIndex - 2) + idx + 1;
                return (
                  <div
                    key={pilot.id || `around_${idx}`}
                    className="cyber-panel"
                    style={{
                      padding: '0.45rem 0.65rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isMe ? 'rgba(8, 145, 178, 0.45)' : 'rgba(15, 23, 42, 0.8)',
                      border: isMe ? '1.5px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '900', color: isMe ? '#00f2fe' : '#94a3b8' }}>
                        #{pos}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>
                          {pilot.nickname} {isMe && '(Tu)'}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Liv. {pilot.level} • {pilot.wins}V / {pilot.losses}P</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: isMe ? '#00f2fe' : '#facc15' }}>
                      {pilot.trophies} 🏆
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchmakingLobby;
