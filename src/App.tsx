import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { ref, onValue, update, onDisconnect } from 'firebase/database';
import {
  db,
  PVP_TRAINING_ENTRY_CREDITS,
  PVP_ELITE_DAILY_MATCHES_CAP,
  PVP_LOSS_TROPHIES,
  PVP_WIN_CREDITS,
  PVP_WIN_STARDUST,
  PVP_LOSS_STARDUST,
  PVP_WIN_XP,
  PVP_LOSS_XP,
  PVP_ELITE_STAR_REWARDS,
  PVP_MODE_UNLOCKS,
  isPvPModeUnlocked,
  getDailyPvPMode,
  getWeeklyLeaderboardKey,
  generateGhostProfile,
  MatchmakingLobby,
  WeeklyLeaderboardModal
} from './pvpManager';

import {
  initAudio,
  playBGM,
  stopBGM,
  playSound,
  playAbilitySFX,
  toggleMuteBGM,
  toggleMuteSFX,
} from './audio';
import { TerrainVisual, SciFiIcon, ModuleIcon, TacticalVisual, RelicVisual } from './visualAssets';
import DeepSpaceUniverseCanvas, { SPECIAL_BACKGROUNDS, PLANET_ENVIRONMENTS } from './DeepSpaceUniverseCanvas';
import ClassicBattleView, { calculateAiTurnClassic, generateClassicObjectives } from './ClassicBattleView';
import { WEAPONS_DATABASE } from './weaponsSystem';


import CombatJuiceOverlay, { playSynthesizedOperatorSound, getOperatorMicroShakeClass } from './CombatJuiceOverlay';

import { 
  findVulnerabilityRiftOpportunity, 
  selectWeightedBenefit, 
  verifyRiftSatisfied 
} from './vulnerabilityRift';
import {
  getRomeDateString,
  getMsUntilRomeMidnight,
  generateDailyChallengeConfig,
  generateDailyGhostLeaderboard,
  getVisibleLeaderboard,
  loadDailyChallengeData,
  saveDailyChallengeData,
  checkDailyResetAndReport
} from './dailyChallengeEngine';

import {
  PILOTS_DATABASE,
  PilotCard,
  getPilotDamageMultiplier,
  evaluatePilotDominance,
  getPilotById,
  getSectorEncounterPilot,
  ELEMENT_ICONS,
  ELEMENT_COLORS
} from './pilotsSystem';


import {
  onBossAttack,
  onPlayerAttack,
  onPlayerDiscardOrPass,
  onQuantumDiceRoll as onBossQuantumDiceRoll,
  onRoundOrTurnEnd as onBossRoundOrTurnEnd,
  onBombDetonation,
  isTerrainDisabledForBoss,
  onBossStallOrPass
} from './bossMechanicsEngine';







import {
  initDailyBounties,
  DAILY_BOUNTIES_ALL_COMPLETED_REWARD,
  getForgeParams,
  calculateStardustOverflow,
  calculateTelemetryOnDefeat,
  getPlanetStarsStats,
  getSectorStars,
  calculateNearestMilestone
} from './progressionEngine';


import HomeScreen from './HomeScreen';
import PersonalLoadoutModal from './PersonalLoadoutModal';
import ShopModal from './ShopModal';






// 1.1 PARAMETRI DI BILANCIAMENTO, COSTANTI & CAP ECONOMICI
const MAX_PLAYER_LEVEL = 100;
const STANDARD_MALUS_CAP = 20;         // 20 Punti per riempire la Barra Malus (1-10 pt a colpo)
const MALUS_REFERENCE_TIME = 60;       // Tempo base (60s) da cui calcolare i secondi risparmiati a colpo

const HITS_TO_CHARGE_ABILITY = 3;      // 3 colpi a segno per il 100% del Modulo Abilità (4 tacche su 12 a colpo)
const DAILY_BETTING_DIAMOND_CAP = 10;
const PASSIVE_STARDUST_SILO_CAP = 120;
const DEFAULT_TURN_TIME = 60; // 60 secondi base



// Parametri Scanner Tattico e Colpo Lampo
const SCANNER_TANK_MAX = 60;                    // Capienza massima serbatoio (60 secondi)
const SCANNER_REFILL_INTERVAL_MS = 86400000;     // Ricarica totale gratuita ogni 24 ore (ms)
const SCANNER_MERIT_REFILL_SECONDS = 3;         // Recupero serbatoio su colpo lampo (+3s)
const SCANNER_MERIT_WINDOW_SECONDS = 15;        // Finestra colpo lampo (primi 15s)
const SCANNER_DIAMOND_REFILL_RATE = 10;         // 1 Diamante = +10s di ricarica

// Calcola la durata del turno per pianeta (da 60s a 45s)
const getPlanetBaseTurnTime = (planetNum) => {
  const p = Number(planetNum) || 1;
  if (p <= 10) return 60;
  if (p <= 15) return 50;
  return 45;
};


// Determina la modalit  operativa dello scanner per il settore
const getSectorScannerMode = (globalSector = 1, gameMode = 'adventure', bettingTier = 1) => {
  if (gameMode === 'pvp') return 'RESTRICTED';
  if (gameMode === 'pve') {
    if (bettingTier === 4) return 'RESTRICTED';
    return 'TANK_PAID';
  }
  const s = Number(globalSector) || 1;
  if (s >= 81) return 'TANK_PAID';

  const mod20 = ((s - 1) % 20) + 1;
  if (mod20 >= 1 && mod20 <= 5) return 'FREE_FULL';
  if (mod20 >= 6 && mod20 <= 10) return 'FREE_EMERGENCY';
  return 'TANK_PAID';
};

const GOLDEN_CARD_UNLOCK_SECTOR = 6;          // Sblocco Carta Dorata al Settore 6 (Terra S6)
const BOMB_UNLOCK_ADVENTURE_SECTOR = 7;       // Sblocco Nucleo Instabile al Settore 7 (Terra S7)
const TERRAIN_CARDS_UNLOCK_SECTOR = 8;        // Sblocco Banco Terreno a 4 Slot al Settore 8 (Terra S8)
const MAX_TERRAIN_SLOTS = 4;                  // 4 slot coperti orizzontali in plancia

const TIME_TANK_MAX_CAP = 30;                 // Riserva tempo accumulabile (+30s max)
const INITIAL_PLAYER_CREDITS = 200;           // Dotazione iniziale per i primi settori

// SBLOCCHI BASATI SUL PROGRESSO NEI SETTORI DELL'AVVENTURA (1-200)
// Formula Settore Globale = (Pianeta - 1) * 10 + Livello
const BETTING_UNLOCK_ADVENTURE_SECTOR = 11;       // P2 Marte Settore 1 (Settore 11 - Tier 1 & Classica)
const PVP_TRAINING_UNLOCK_SECTOR = 11;            // P2 Marte Settore 1 (Settore 11 - Sblocco Addestramento)
const ETHER_UNLOCK_SECTOR = 15;                   // P2 Marte Settore 5 (Settore 15 - Sblocco Etere & Estrattore)
const VECTOR_BETTING_UNLOCK_SECTOR = 21;          // P3 Venere Settore 1 (Settore 21 - Tier 2 & Vettore)
const DUEL_BETTING_UNLOCK_SECTOR = 41;            // P5 Giove Settore 1 (Settore 41 - Tier 3 & Duello)
const TRIS_BETTING_UNLOCK_SECTOR = 61;            // P7 Urano Settore 1 (Settore 61 - Tier 4 & Tris Stellare)
const PVP_ELITE_UNLOCK_SECTOR = 81;               // P8 Nettuno completato (Settore 81+)


// SBLOCCO UNICO MODULO ABILITÃ€ IBRIDO IN PLANCIA & SLOT EPICI
const ABILITY_MODULE_UNLOCK_CAMPAIGN_SECTOR = 9;  // Sblocco 1Â° e UNICO Slot Modulo AbilitÃ  (Terra Settore 9)
const EPIC_SLOT_1_UNLOCK_LEVEL = 20;               // Sblocco 1Â° Slot Epico a Livello Pilota 20
const EPIC_SLOT_2_UNLOCK_LEVEL = 60;               // Sblocco 2Â° Slot Epico a Livello Pilota 60

// ============================================================================
// 1.1b MATRICE DEI 3 SCAGLIONI DI PROGRESSIONE PILOTA (LEVEL GATING)
//      Fascia 1 (1â€“30): Max Liv. 3 per Mazzi/Moduli, Liv. 1 per Carte Terreno
//      Fascia 2 (31â€“65): Max Liv. 6 per Mazzi/Moduli, Liv. 2 per Carte Terreno
//      Fascia 3 (66â€“100): Max Liv. 9 per Mazzi/Moduli, Liv. 3 per Carte Terreno
// ============================================================================
const PILOT_LEVEL_GATING = Object.freeze({
  TIER_1_MAX_PILOT: 30,
  TIER_2_MAX_PILOT: 65,
  TIER_3_MAX_PILOT: 100,

  // Requisiti minimi di Livello Pilota per il potenziamento di Mazzi e Moduli AbilitÃ  (1â€“9)
  UPGRADE_PILOT_REQS: Object.freeze({
    1: 1,   // Sblocco iniziale
    2: 12,  // Fascia 1
    3: 25,  // Fascia 1 (Cap massimo per la Fascia 1)
    4: 35,  // Fascia 2 (Sblocco 2Âª AbilitÃ  attiva/passiva)
    5: 48,  // Fascia 2
    6: 60,  // Fascia 2 (Cap massimo per la Fascia 2)
    7: 70,  // Fascia 3 (Sblocco 3Âª AbilitÃ  attiva/passiva)
    8: 82,  // Fascia 3
    9: 95   // Fascia 3 (Apoteosi Finale)
  }),

  // Requisiti minimi di Livello Pilota per il potenziamento delle Carte Terreno (1â€“3)
  TERRAIN_PILOT_REQS: Object.freeze({
    1: 1,   // Fascia 1: Effetto salvavita base mono-uso
    2: 31,  // Fascia 2: Abilitazione riarmo tramite Etere Cosmico
    3: 66   // Fascia 3: Forma Suprema con scudi, cure o danni puri extra
  })
});

// Helper unificato: Requisito Livello Pilota per Mazzo / Modulo AbilitÃ 
const getRequiredPilotLevelForUpgrade = (targetLevel) => {
  return PILOT_LEVEL_GATING.UPGRADE_PILOT_REQS[targetLevel] || 1;
};

// Helper unificato: Requisito Livello Pilota per Carte Terreno
const getRequiredPilotLevelForTerrain = (targetLevel) => {
  return PILOT_LEVEL_GATING.TERRAIN_PILOT_REQS[targetLevel] || 1;
};

// Helper: Massimo livello sbloccabile in base al livello attuale del Pilota
const getMaxAllowedLevelForPilot = (pilotLevel, maxItemCap = 9) => {
  const pLvl = Number(pilotLevel) || 1;
  let tierCap = 3;
  if (pLvl >= 66) tierCap = 9;
  else if (pLvl >= 31) tierCap = 6;
  return Math.min(tierCap, maxItemCap);
};

// ============================================================================
// MATRICE COSTI MIGLIORAMENTI UNIFICATA (MAZZI, ABILITÃ€ E TERRENI)
// Fascia 1 (Liv. 1â€“3): Solo Polvere Stellare 🌟
// Fascia 2 (Liv. 4â€“6): Polvere Stellare 🌟 + Cristalli di Vuoto ðŸ’ 
// Fascia 3 (Liv. 7â€“9): Polvere Stellare 🌟 + Cristalli ðŸ’  + Materia Primordiale 🟣
// ============================================================================
const UNIFIED_UPGRADE_COSTS = Object.freeze({
  2: { dust: 450, voidCrystals: 0, primordialMatter: 0 },
  3: { dust: 1100, voidCrystals: 0, primordialMatter: 0 },
  4: { dust: 2200, voidCrystals: 2, primordialMatter: 0 },
  5: { dust: 3500, voidCrystals: 4, primordialMatter: 0 },
  6: { dust: 5000, voidCrystals: 6, primordialMatter: 0 },
  7: { dust: 7500, voidCrystals: 8, primordialMatter: 2 },
  8: { dust: 10500, voidCrystals: 10, primordialMatter: 3 },
  9: { dust: 15000, voidCrystals: 12, primordialMatter: 5 }
});

// Costi Carte Terreno (Liv. 1 Base / Liv. 2 Riarmo Etere / Liv. 3 Suprema)
const TERRAIN_UPGRADE_COSTS = Object.freeze({
  2: { dust: 500, voidCrystals: 2, primordialMatter: 0 },
  3: { dust: 1400, voidCrystals: 4, primordialMatter: 2 }
});

// ============================================================================
// GENERATORE DELLA 3Âª STELLA DETERMINISTICA (CAMPAGNA 200 SETTORI)
// ============================================================================
const SECTOR_CHALLENGE_TYPES = Object.freeze([
  { id: 'speed_run', name: 'CeleritÃ  Tattica', desc: 'Vinci entro 45 secondi di tempo totale', check: (s) => (s?.totalTimeElapsed || 0) <= 45 },
  { id: 'heavy_hit', name: 'Colpo Devastante', desc: 'Sferra un singolo attacco da almeno 25 HP', check: (s) => (s?.maxSingleHitDmg || 0) >= 25 },
  { id: 'no_exchange', name: 'Disciplina di Mano', desc: 'Vinci senza usare il Cambio Carte', check: (s) => (s?.exchangesUsed || 0) === 0 },
  { id: 'division_master', name: 'Precisione Razionale', desc: 'Metti a segno almeno 2 attacchi con [/]', check: (s) => (s?.opCounts?.['/'] || 0) >= 2 },
  { id: 'cosmic_resonance', name: 'Armonia Stellare', desc: 'Gioca almeno 1 Carta Dorata o Combo 4 Semi', check: (s) => (s?.goldenOrComboCount || 0) > 0 },
  { id: 'pure_tactics', name: 'Scarica Totale', desc: 'Attiva il Modulo AbilitÃ  Ibrido almeno 1 volta', check: (s) => (s?.moduleActivations || 0) >= 1 }
]);

const getSectorSpecialChallenge = (planetNum, levelNum) => {
  const p = Number(planetNum) || 1;
  const l = Number(levelNum) || 1;
  if (l === 10) {
    return { id: 'boss_speed', name: 'Cacciatore di Titani', desc: 'Abbatti il Boss entro 75 secondi', check: (s) => (s?.totalTimeElapsed || 0) <= 75 };
  }
  const idx = Math.abs((p * 7) + (l * 13)) % SECTOR_CHALLENGE_TYPES.length;
  return SECTOR_CHALLENGE_TYPES[idx] || SECTOR_CHALLENGE_TYPES[0];
};


// ============================================================================
// REGISTRO DELLE 40 CAPSULE DI RIFORNIMENTO (OGNI 15 STELLE FINO A 600 â­)
// ============================================================================
const getStarCapsuleReward = (milestone) => {
  const m = Number(milestone) || 15;
  const idx = Math.max(1, Math.min(40, Math.floor(m / 15)));
  let dust = 120 + idx * 40;
  let diamonds = (idx % 2 === 0) ? Math.floor(idx / 2) : 0;
  let ether = Math.min(10, Math.floor(idx / 4) + 1);
  let voidCrystals = (idx >= 15 && idx % 5 === 0) ? 1 : 0;
  let primordialMatter = (idx >= 30 && idx % 5 === 0) ? 1 : 0;
  let unlockItem = null;

  // I 4 Sblocchi Esclusivi della Rotta Stellare
  if (m === 90) {
    unlockItem = { type: 'terrain', id: 'entropic_refraction', name: 'Scudo a Rifrazione Entropica' };
  } else if (m === 210) {
    unlockItem = { type: 'ability', id: 'singularity_core', name: 'Modulo SingolaritÃ  (Buco Nero)' };
  } else if (m === 390) {
    unlockItem = { type: 'deck', id: 'ophiuchus', name: 'Mazzo Ophiuchus (Il Serpentario)' };
  } else if (m === 600) {
    dust = 3000;
    diamonds = 30;
    ether = 15;
    voidCrystals = 5;
    primordialMatter = 3;
    unlockItem = { type: 'deck', id: 'supreme_eclipse', name: 'Mazzo Eclissi Suprema (Leggendario)' };
  }

  return { milestone: m, dust, diamonds, ether, voidCrystals, primordialMatter, unlockItem };
};

// Costante di fallback provvisoria per trofei
const PVP_WIN_TROPHIES = 25;


// Formula Curva Vitale Universale del Giocatore (HP Pilota 50â€“400)
// HP Pilota = min(400, 50 + floor(Livello / 5) * 17.5)
const calculateUniversalPlayerHp = (lvl) => {
  const currentLvl = Number(lvl) || 1;
  return Math.min(400, Math.floor(50 + Math.floor(currentLvl / 5) * 17.5));
};

// Calcola il Settore Globale dell'Avventura raggiunto dal giocatore (1-200)
const calculateGlobalAdventureSector = (maxPlanet = 1, unlockedLevelsMap = { 1: 1 }) => {
  const p = Number(maxPlanet) || 1;
  const l = Number(unlockedLevelsMap?.[p]) || 1;
  return Math.min(200, (p - 1) * 10 + l);
};

// Accumulatore di Carica Modulo Tattico Scalare per Pianeta (30 / 45 / 60 HP)
const getAbilityChargeThreshold = (planet = 1) => {
  const p = Number(planet) || 1;
  if (p <= 5) return 30;   // Pianeti 1â€“5: 30 HP di danno cumulativo per il 100%
  if (p <= 10) return 45;  // Pianeti 6â€“10: 45 HP di danno cumulativo per il 100%
  return 60;               // Pianeti 11â€“20: 60 HP di danno cumulativo per il 100%
};

// Helper Centralizzato: Verifica Sconfitta Boss Pianeta (Settore 10 Completato)
const isPlanetBossDefeated = (planetNum, unlockedLevelsMap = {}, maxPlanet = 1) => {
  const p = Number(planetNum) || 1;
  const maxLvlInPlanet = Number(unlockedLevelsMap?.[p]) || 1;
  const currentMaxPlanet = Number(maxPlanet) || 1;
  return maxLvlInPlanet > 10 || currentMaxPlanet > p;
};


const getStardustWalletCap = (lvl) => {
  const currentLvl = Number(lvl) || 1;
  if (currentLvl >= 85) return 20000; // Fascia 3 Endgame: Apoteosi L9 (15.000) e Leggendari (18.000)
  if (currentLvl >= 66) return 12500; // Fascia 3 Ingresso: Upgrade L7 (7.500) e L8 (10.500)
  if (currentLvl >= 50) return 7500;  // Fascia 2 Picco: Upgrade L6 (5.000) e Piloti Rari Grado 5
  if (currentLvl >= 31) return 5000;  // Fascia 2 Ingresso: Upgrade L4 (2.200) e L5 (3.500)
  if (currentLvl >= 15) return 2500;  // Fascia 1 Avanzata: Upgrade L3 (1.100)
  return 1500;                        // Fascia 1 Base: Starter e L2 (450)
};


// Milestone Vite: Sostituzione dello sblocco slot a Liv. 30 con +1 Vita Massima Permanente
const getMaxLivesForLevel = (lvl) => {
  const currentLvl = Number(lvl) || 1;
  let extra = 0;
  if (currentLvl >= 15) extra++;
  if (currentLvl >= 30) extra++; // Sostituzione sblocco 2Â° slot: +1 Vita permanente
  if (currentLvl >= 50) extra++;
  if (currentLvl >= 75) extra++;
  return 3 + extra;
};

// ============================================================================
// 1.2 DATABASE SCOMMESSE DEL BANCO: RADDOPPIO PURO (2X) SU 4 TAVOLI
//     L'IA   DINAMICA A SPECCHIO (HP +15% E LIVELLO MAZZO N+1)
// ============================================================================
const BETTING_LEVELS = Object.freeze({
  1: {
    level: 1,
    resource: 'stardust',
    name: "Banco della Polvere Stellare",
    icon: "🌟",
    unit: "Polvere 🌟",
    minBet: 100,
    maxBet: 2500,
    step: 50,
    costCredits: 10,
    aiPower: 0.82,
    reqAdventureSector: BETTING_UNLOCK_ADVENTURE_SECTOR, // Settore 11
    xp: 60,
    desc: "Punta da 100 a 2.500 🌟: vincendo raddoppi la cifra (2x) contro un'IA a specchio."
  },
  2: {
    level: 2,
    resource: 'voidCrystals',
    name: "Tavolo dei Cristalli di Vuoto",
    icon: "💠",
    unit: "Cristalli 💠",
    minBet: 1,
    maxBet: 4,
    step: 1,
    costCredits: 20,
    aiPower: 0.84,
    reqAdventureSector: DUEL_BETTING_UNLOCK_SECTOR, // Settore 41
    xp: 150,
    desc: "Punta da 1 a 4 💠: vincendo raddoppi la cifra (2x) per chiudere gli upgrade di Fascia 2."
  },
  3: {
    level: 3,
    resource: 'primordialMatter',
    name: "Azzardo Materia Primordiale",
    icon: "🟣",
    unit: "Materia 🟣",
    minBet: 1,
    maxBet: 2,
    step: 1,
    costCredits: 30,
    aiPower: 0.86,
    reqAdventureSector: TRIS_BETTING_UNLOCK_SECTOR, // Settore 61
    xp: 300,
    desc: "Punta da 1 a 2 🟣: vincendo raddoppi la cifra (2x) per raggiungere l'Apoteosi."
  },
  4: {
    level: 4,
    resource: 'diamonds',
    name: "Tavolo dei Diamanti Galattici",
    icon: "💎",
    unit: "Diamanti 💎",
    minBet: 1,
    maxBet: 5,
    step: 1,
    costCredits: 40,
    aiPower: 0.88,
    reqAdventureSector: PVP_ELITE_UNLOCK_SECTOR, // Settore 81 (Post-Nettuno)
    xp: 500,
    desc: "Punta da 1 a 5 💎: vincendo raddoppi la valuta premium (Tetto: max +10 💎 netti al giorno)."
  }
});





// ============================================================================
// 1.4 ECONOMIA SUBSPAZIALE & SILO SERBATOI
// ============================================================================
const SUBSPACE_TANK_LEVELS = {
  1: { level: 1, name: 'Silo Subspaziale Cadetto', maxVoid: 4, maxPrimordial: 0, costDust: 0, reqLevel: 1 },
  2: { level: 2, name: 'Camera di Risonanza Quantica', maxVoid: 8, maxPrimordial: 3, costDust: 2000, reqLevel: 31 },
  3: { level: 3, name: 'Matrice di Contenimento Singolarit ', maxVoid: 16, maxPrimordial: 8, costDust: 6000, reqLevel: 66 }
};


const EPIC_ITEM_UPGRADE_COSTS = {
  1: { level: 1, dust: 0, voidCrystals: 0, primordialMatter: 0 },
  2: { level: 2, dust: 600, voidCrystals: 3, primordialMatter: 0 },
  3: { level: 3, dust: 1800, voidCrystals: 0, primordialMatter: 2 }
};

// ============================================================================
// 1.5 REGISTRO COMPLETO DELLE REGOLE DI GIOCO (RULES_DATABASE)
// ============================================================================
const RULES_DATABASE = Object.freeze([
  {
    id: 'rule_1',
    num: '01',
    title: 'Calcolo & Minimo 2 Carte',
    tag: 'FONDAMENTA',
    color: '#00f2fe',
    summary: 'Per eseguire un attacco servono obbligatoriamente da 2 a 4 carte. Formule a carta singola sono bloccate.',
    details: [
      'Seleziona un bersaglio numerico attivo sulla plancia centrale tra quelli proposti.',
      'Scegli da 2 a 4 carte dalla tua mano la cui combinazione con l\'operatore richiesto raggiunge esattamente il valore target.',
      'Danni Base Fissi Simmetrici (Giocatore e Nemico): [+] 10 HP | [-] 12 HP | [*] 16 HP | [/] 20 HP.',
      'Toggle Aiuti di Calcolo: se impostato su OFF, radar e plancia nascondono ogni calcolo automatico o suggerimento (A + B = ?).'
    ]
  },
  {
    id: 'rule_2',
    num: '02',
    title: 'I 4 Semi & Sinergie con Carta Dorata',
    tag: 'EFFETTI SEMI',
    color: '#f43f5e',
    summary: 'Ogni seme attiva un effetto immediato. La Carta Dorata raddoppia e potenzia la risonanza del proprio seme.',
    details: [
      'â™¥ Cuori (Cura HP): +8% HP Massimi (+12% con Mazzo Toro). Carta Dorata: +16% HP Massimi (+24% Toro).',
      'â™¦ Quadri (Polvere): +2 Polvere Stellare 🌟. Carta Dorata: +20 Polvere Stellare 🌟 e 10% probabilitÃ  +1 Diamante 💎.',
      'â™£ Fiori (Tempo Extra): +5s nel Serbatoio (Cap +30s). Carta Dorata: +15s nel Serbatoio e +1 Etere Cosmico 🔮.',
      'â™  Picche (Danno Extra): +3 HP danno aggiuntivo. Carta Dorata: +8 HP Danno Puro Extra (ignora difese).',
      'Combo 4 Semi: combinare Cuori, Quadri, Fiori e Picche in una formula attiva Critico x2.0 (+30🌟, +1💎, +10% HP). Con Carta Dorata sale a Critico x3.0 (+50🌟, +2💎).'
    ]
  },
    {
    id: 'rule_3',
    num: '03',
    title: 'Modalità Tris Stellare a 5 Carte',
    tag: 'FORMULA AD INCASTRO',
    color: '#a855f7',
    summary: 'Risolvi la formula (Tavolo [Op1] C2) + C3 + C4 + C5 = Target (o PARI/DISPARI) liberando la Doppia Esplosione.',
    details: [
      'Formula a 5 Carte: 1 carta fissa al tavolo + 4 carte scelte liberamente dalla tua mano.',
      'Struttura del Calcolo: il primo blocco usa l\'operatore libero scelto (+, -, *, /), le restanti carte vengono obbligatoriamente sommate.',
      'Bersagli Multipli: Bersaglio 1 (Numero esatto), Bersaglio 2 (Filtro PARI o DISPARI), Bersaglio 3 (Nucleo Bomba a 3 turni).',
      'Doppia Esplosione: a t=0ms impatto dell\'operatore math ([+] 10, [-] 12, [*] 16, [/] 20 HP); a t=350ms detonazione della combinazione Poker.',
      'Valori Poker a 5 Carte: Carta Alta 8 HP, Coppia 10 HP, Doppia Coppia 12 HP, Tris 14 HP, Scala 16 HP, Colore 17 HP, Full 18 HP, Poker 19 HP, Scala Reale 20 HP.',
      'Fase di Scarica Finale: dopo l\'attacco, tocca 1 delle 3 carte rimaste in mano per sacrificare il suo seme e attivare i poteri di risonanza.'
    ]
  },

  {
    id: 'rule_4',
    num: '04',
    title: 'Modulo Abilità Ibrido (3 Colpi a Segno)',
    tag: 'SLOT UNICO IBRIDO',
    color: '#10b981',
    summary: '1 solo slot attivo in plancia. Ogni colpo a segno ricarica 1 tacca su 3: a 3 colpi premi ATTIVA per rilasciare tutti i poteri sbloccati.',
    details: [
      'Slot Unico Ibrido: sbloccato ed equipaggiato in plancia al Settore 9 dell\'Avventura (Terra).',
      'Ricarica a 3 Colpi: ogni attacco andato a segno carica 1/3 del Modulo (100% in 3 turni).',
      'Attivazione Simultanea: al 100% il pulsante pulsa ed eroga insieme tutti gli effetti sbloccati (Fascia 1, 2 e 3).',
      'Faccia Nera Dadi: estrarre la Faccia Nera carica istantaneamente il modulo al 100%.'
    ]
  },
    {
    id: 'rule_5',
    num: '05',
    title: 'Barra Malus (Sabotaggio Rapido a 20 Pt)',
    tag: 'SISTEMA TATTICO',
    color: '#fb923c',
    summary: 'Premia la velocità di calcolo: ogni colpo a segno converte il tempo residuo in carica (da 1 a 10 punti) per sabotare il nemico.',
    details: [
      'Carica a Tempo: ogni colpo assegna da 1 a 10 punti (massimo 10pt per risposte rapide entro 8s, minimo 1pt al limite).',
      'Soglia 20 Punti: raggiunti i 20 punti la barra esplode sabotando l\'avversario con carry-over dei punti eccedenti.',
      'Passa Turno / Timeout: non assegnano alcun punto alla barra (si carica solo colpendo a segno).',
      'I 4 Sabotaggi: Perdita 10 HP diretti, Blocco Modulo nemico per 2 turni, Mano ridotta a 5 carte o Salto Turno.'
    ]
  },



  {
    id: 'rule_6',
    num: '06',
    title: 'Dadi Quantici Digitali 2D',
    tag: 'REQUISITO ALGEBRICO',
    color: '#c084fc',
    summary: 'Risolvi calcoli con tutti e 4 gli operatori (+, -, *, /) per caricare e lanciare i Dadi.',
    details: [
      'Ogni operatore completato accende una tacca sui dadi.',
      'Completati tutti e 4 gli operatori, puoi lanciare il dado ed estrarre moltiplicatori ed effetti speciali (Faccia Nera = Carica AbilitÃ  100%, Faccia Rossa = Scarica Malus).',
      'Facce Semi: erogano massicci bonus di HP percentuali, Polvere Stellare, Tempo o Danno Diretto.'
    ]
  },
  {
    id: 'rule_7',
    num: '07',
    title: 'ModalitÃ  Vettore Geometrico',
    tag: 'RADAR BALISTICO',
    color: '#06b6d4',
    summary: 'Manovra il radar coordinando gli impulsi cardinali verso il valore target (10-55).',
    details: [
      'Destra: impulso di Addizione [+].',
      'Alto: impulso di Sottrazione [-].',
      'Sinistra: impulso di Moltiplicazione [*].',
      'Basso: impulso di Divisione [/].',
      'Scala Danni in base alle carte usate: 2 Carte = 20 HP, 3 Carte = 15 HP, 4 Carte = 10 HP, 5+ = 5 HP.'
    ]
  },
    {
    id: 'rule_8',
    num: '08',
    title: 'Duello di Convergenza',
    tag: 'BANCO COMUNE 2+2',
    color: '#eab308',
    summary: 'Sfida su Banco Comune: centra il Target condiviso in 2 turni concatenati (2+2 carte) e domina con la figura Poker.',
    details: [
      'Banco Comune: 1 Carta Base, 1 Numero Target condiviso e 1 Nucleo Bomba a 3 turni.',
      'Turno 1 (Apertura): gioca 2 carte dalla mano per concatenare (Base [Op1] C1) [Op2] C2 e fissare il tuo Parziale T1.',
      'Turno 2 (Chiusura): mano ripristinata a 7 carte; gioca altre 2 carte su (Parziale T1 [Op3] C3) [Op4] C4 per chiudere la traiettoria.',
      'Verdetto & Danni: vince chi ha il Delta (distanza) minore dal Target; in parità di Delta spareggia il rango Poker delle 5 carte (Base + 4 giocate). Danni: 8-20 HP da figura Poker (+3 HP perforanti se Bullseye Delta 0).'
    ]
  },

  {
    id: 'rule_9',
    num: '09',
    title: 'Boss Multi-Fase & Reset Mazzo a 54 Carte',
    tag: 'CAMPAGNA 200 SETTORI',
    color: '#ec4899',
    summary: 'I Boss scalano da 1 a 4 fasi sequenziali con cambio dinamico di plancia e ricarica integrale mazzo.',
    details: [
      'Pianeti 1-10: 1 Fase (Boss Gaia Terra 75 HP, Boss Marte 100 HP con Anello di Möbius).',
      'Pianeti 11-13: 2 Fasi (Boss Europa P11 260 HP -> Classica 130 HP + Vettore 130 HP).',
      'Pianeti 14-16: 2 Fasi (Boss Proxima b P14 320 HP -> Vettore 160 HP + Convergenza 160 HP).',
      'Pianeti 17-19: 3 Fasi (Boss Haumea P17 420 HP -> Classica 140 HP + Vettore 140 HP + Convergenza 140 HP).',
      'Boss Finale Encelado (P20): 4 barre da 200 HP (800 HP totali) su Classica ➔ Vettore ➔ Convergenza ➔ Tris Stellare con innesco autonomo di Oggetti Epici da parte dell\'IA.',
      'Reset Mazzo a 54 Carte: ad ogni passaggio di fase, mazzo e scarti di entrambi i contendenti vengono resettati, ricaricati e rimescolati a 54 carte con pesca di una nuova mano.'
    ]
  },
  {
    id: 'rule_10',
    num: '10',
    title: 'PvP a Doppio Canale (Addestramento & Élite)',
    tag: 'DUELLI ONLINE',
    color: '#3b82f6',
    summary: 'Circuito separato per farming senza rischio e competizione mondiale a 10 partite giornaliere.',
    details: [
      'Canale A - Addestramento & Farming (Sblocco Settore 11 Avventura): Costa 5 Crediti ⚡, nessun impatto sui Trofei, ideale per farming XP e Polvere.',
      'Canale B - Lega Élite Mondiale (Sblocco Settore 81 Avventura / Post-Nettuno): 10 Partite Giornaliere a costo 0 Crediti visualizzate sul pulsante "Gioca (10/10)", +25 Trofei per vittoria / -10 per sconfitta.',
      'Rotazione Giornaliera Élite: Lun/Gio Classica, Mar/Ven Vettore, Mer/Sab Convergenza, Domenica Tris Stellare.',
      'Premi di Podio Settimanale: 100 💎 al 1°, 50 💎 al 2°, 25 💎 al 3° classificato.'
    ]
  },

  {
    id: 'rule_11',
    num: '11',
    title: 'Cripta delle SingolaritÃ  & 10 Oggetti Epici',
    tag: 'MANUFATTI DIMENSIONALI',
    color: '#6366f1',
    summary: 'Collassa i 10 Varchi Gravitazionali fondendo le 20 Reliquie Boss per forgiare Manufatti Epici.',
    details: [
      'Equipaggia fino a 2 Oggetti Epici in plancia (1Â° Slot sbloccato a Liv. 20, 2Â° Slot a Liv. 60).',
      'Costo 0, utilizzabili 1 volta per scontro, max 1 per turno.',
      'Include: Anello di MÃ¶bius, Forcella Neutonica, Astrolabio, Stele d\'Ombra, Pistone Gravimetrico, Pendolo Entropico, Monolite Dielettrico, Calice a Vortice, Matrice Poliedrica, Nucleo SingolaritÃ .',
      'Migliorabili fino al Livello 3 usando Cristalli di Vuoto ðŸ’  e Materia Primordiale 🟣 immagazzinati nel Silo.'
    ]
  },
  {
    id: 'rule_12',
    num: '12',
    title: 'Curva Vitale Universale & I 3 Scaglioni Pilota',
    tag: 'PROGRESSIONE GLOBALE',
    color: '#14b8a6',
    summary: 'HP pilota unificati (50â€“400 HP), sblocco slot unico al Settore 9 e progressione rigida su 3 fasce di livello.',
    details: [
      'Formula HP Universale: HP = min(400, 50 + floor(Livello / 5) * 17.5).',
      '1 Solo Slot Modulo AbilitÃ : sbloccato al Settore 9 dell\'Avventura (nessun alloggiamento aggiuntivo a Liv. 30 o 61).',
      'Fascia 1 (Liv. 1â€“30): Max Liv. 3 per Mazzi e Moduli AbilitÃ ; Liv. 1 per Carte Terreno.',
      'Fascia 2 (Liv. 31â€“65): Max Liv. 6 per Mazzi e Moduli AbilitÃ  (2Âª abilitÃ  attiva/passiva); Liv. 2 per Carte Terreno (con riarmo tramite Etere).',
      'Fascia 3 (Liv. 66â€“100): Max Liv. 9 per Mazzi e Moduli AbilitÃ  (3Âª abilitÃ  / Apoteosi); Liv. 3 per Carte Terreno.',
      'Slot Epici: 1Â° Slot a Liv. 20, 2Â° Slot a Liv. 60.',
         'Cap Portafoglio Polvere : 1.500 (Liv. 1-14) -> 2.500 (Liv. 15-30) -> 5.000 (Liv. 31-49) -> 7.500 (Liv. 50-65) -> 12.500 (Liv. 66-84) -> 20.000 (Liv. 85+).'

    ]
  }
]);



// 1.4 DANNI FISSI SIMMETRICI MODALITÃ€ CLASSICA PER OPERATORE (IDENTICI PER PLAYER E IA)
const getClassicOpDamage = (op) => {
  switch (op) {
    case '/': return 20;
    case '*': return 16;
    case '-': return 12;
    case '+': default: return 10;
  }
};

// 1.5 DANNI FISSI MODALITÃ€ VETTORE PER NUMERO DI CARTE IMPIEGATE
const getVectorCardDamage = (cardsCount) => {
  const count = Number(cardsCount) || 0;
  if (count <= 2) return 20;
  if (count === 3) return 15;
  if (count === 4) return 10;
  return 5;
};

// 1.5b HELPER LETTURA SEME & VALORE EFFETTIVO CARTA
const getCardSuit = (card) => {
  if (!card) return null;
  if (card.isJoker) return 'joker';
  if (card.suit) return card.suit;
  if (typeof card.id === 'string') {
    if (card.id.startsWith('hearts') || card.id === 'hearts') return 'hearts';
    if (card.id.startsWith('diamonds') || card.id === 'diamonds') return 'diamonds';
    if (card.id.startsWith('spades') || card.id === 'spades') return 'spades';
    if (card.id.startsWith('clubs') || card.id === 'clubs') return 'clubs';
  }
  return 'hearts';
};

const getCardEffectiveValue = (card, activeAnomaly = null) => {
  if (!card) return 0;
  const baseVal = Number(card.value) || 0;
  const suit = getCardSuit(card);
  if (activeAnomaly?.id === 'hearts_res' && suit === 'hearts') {
    return baseVal * 2;
  }
  return baseVal;
};

const calculateExpressionResult = (cards, op, activeAnomaly = null) => {
  if (!cards || cards.length === 0) return 0;
  const validCards = cards.filter(Boolean);
  if (validCards.length === 0) return 0;

  const vals = validCards.map(c => getCardEffectiveValue(c, activeAnomaly));
  if (vals.length === 1) return vals[0];

  switch (op) {
    case '+':
      return vals.reduce((acc, v) => acc + v, 0);
    case '-':
      return vals.reduce((acc, v, idx) => (idx === 0 ? v : acc - v), 0);
    case '*':
      return vals.reduce((acc, v) => acc * v, 1);
    case '/':
      if (vals.some((v, idx) => idx > 0 && Math.abs(v) < 1e-7)) return NaN;
      return vals.reduce((acc, v, idx) => (idx === 0 ? v : acc / v), 0);
    default:
      return 0;
  }
};

// 1.6 VALUTATORE COMBINAZIONI POKER A 5 CARTE (TABELLA DANNI UNIVERSALE & RANGO SPAREGGIO)
const evaluate5CardPokerHand = (cards) => {
  if (!cards || cards.length < 5) {
    return { type: 'incomplete', name: 'Incompleta', rank: 0, damage: 0, color: '#94a3b8', desc: 'Incompleta (0 HP)' };
  }

  const validCards = cards.filter(Boolean);
  if (validCards.length < 5) {
    return { type: 'incomplete', name: 'Incompleta', rank: 0, damage: 0, color: '#94a3b8', desc: 'Incompleta (0 HP)' };
  }


  const values = validCards.map(c => Number(c.value) || 0).sort((a, b) => a - b);
  const suits = validCards.map(c => getCardSuit(c));

  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const freq = Object.values(counts).sort((a, b) => b - a);

  const nonJokerSuits = suits.filter(s => s && s !== 'joker');
  const isFlush = nonJokerSuits.length >= 4 && new Set(nonJokerSuits).size === 1;

  let isStraight = false;
  const uniqueVals = [...new Set(values)];
  if (uniqueVals.length === 5) {
    if (uniqueVals[4] - uniqueVals[0] === 4) {
      isStraight = true;
    } else if (uniqueVals[0] === 1 && uniqueVals[1] === 10 && uniqueVals[2] === 11 && uniqueVals[3] === 12 && uniqueVals[4] === 13) {
      isStraight = true;
    }
  }

  if (isStraight && isFlush) {
    return { type: 'royal_flush', name: 'Scala Reale', rank: 9, damage: 20, color: '#facc15', desc: 'Scala Reale / a Colore (-20 HP)' };
  }
  if (freq[0] === 4) {
    return { type: 'four_of_a_kind', name: 'Poker', rank: 8, damage: 19, color: '#ec4899', desc: 'Poker (-19 HP)' };
  }
  if (freq[0] === 3 && freq[1] === 2) {
    return { type: 'full_house', name: 'Full', rank: 7, damage: 18, color: '#c084fc', desc: 'Full: Tris + Coppia (-18 HP)' };
  }
  if (isFlush) {
    return { type: 'flush', name: 'Colore', rank: 6, damage: 17, color: '#38bdf8', desc: 'Colore: 5 carte stesso seme (-17 HP)' };
  }
  if (isStraight) {
    return { type: 'straight', name: 'Scala', rank: 5, damage: 16, color: '#a855f7', desc: 'Scala (-16 HP)' };
  }
  if (freq[0] === 3) {
    return { type: 'three_of_a_kind', name: 'Tris', rank: 4, damage: 14, color: '#ef4444', desc: 'Tris (-14 HP)' };
  }
  if (freq[0] === 2 && freq[1] === 2) {
    return { type: 'two_pair', name: 'Doppia Coppia', rank: 3, damage: 12, color: '#f59e0b', desc: 'Doppia Coppia (-12 HP)' };
  }
  if (freq[0] === 2) {
    return { type: 'one_pair', name: 'Coppia', rank: 2, damage: 10, color: '#10b981', desc: 'Coppia (-10 HP)' };
  }

  return { type: 'high_card', name: 'Carta Alta', rank: 1, damage: 8, color: '#94a3b8', desc: 'Carta Alta (-8 HP)' };
};

// Alias per compatibilità con Tris Stellare
const evaluateTrisStellareCombination = evaluate5CardPokerHand;

// 1.6b RISOLUZIONE MODALITÀ CONVERGENZA: PROSSIMITÀ (DELTA) & POKER A 5 CARTE
const resolveConvergenceDuel = (pFinalVal, aiFinalVal, targetVal, p5Cards, ai5Cards) => {
  const deltaP = Math.abs(pFinalVal - targetVal);
  const deltaAi = Math.abs(aiFinalVal - targetVal);

  const pCombo = evaluate5CardPokerHand(p5Cards);
  const aiCombo = evaluate5CardPokerHand(ai5Cards);

  let winner = 'draw';
  let isBullseye = false;
  let tieBreakReason = null;

  if (deltaP < deltaAi) {
    winner = 'player';
    isBullseye = (deltaP === 0);
  } else if (deltaAi < deltaP) {
    winner = 'ai';
    isBullseye = (deltaAi === 0);
  } else {
    // Parità di Delta: spareggio sul rango Poker delle 5 carte
    if (pCombo.rank > aiCombo.rank) {
      winner = 'player';
      isBullseye = (deltaP === 0);
      tieBreakReason = `Spareggio Poker: ${pCombo.name} batte ${aiCombo.name}`;
    } else if (aiCombo.rank > pCombo.rank) {
      winner = 'ai';
      isBullseye = (deltaAi === 0);
      tieBreakReason = `Spareggio Poker: ${aiCombo.name} batte ${pCombo.name}`;
    } else {
      winner = 'draw';
      tieBreakReason = 'Perfetta Parità di Delta e Figura Poker';
    }
  }

  const winningCombo = winner === 'player' ? pCombo : (winner === 'ai' ? aiCombo : null);
  const baseDamage = winningCombo ? winningCombo.damage : 0;
  const bullseyeBonus = isBullseye ? 3 : 0; // Regola del Centro Perfetto: +3 HP perforanti

  return {
    winner,
    deltaP,
    deltaAi,
    isBullseye,
    pCombo,
    aiCombo,
    winningCombo,
    tieBreakReason,
    baseDamage,
    bullseyeBonus,
    damage: baseDamage + bullseyeBonus
  };
};


// Risoluzione formula a 5 carte con convalida parità intera
const evaluateTrisStellare = (tableCard, c2, c3, c4, c5, op1, targetObj, activeAnomaly = null) => {
  if (!tableCard || !c2 || !c3 || !c4 || !c5) {
    return { isValid: false, result: 0, mathDamage: 0, pokerDamage: 0, totalDamage: 0, combo: null };
  }

  const vTable = getCardEffectiveValue(tableCard, activeAnomaly);
  const v2 = getCardEffectiveValue(c2, activeAnomaly);
  const v3 = getCardEffectiveValue(c3, activeAnomaly);
  const v4 = getCardEffectiveValue(c4, activeAnomaly);
  const v5 = getCardEffectiveValue(c5, activeAnomaly);

  let step1 = 0;
  if (op1 === '+') step1 = vTable + v2;
  else if (op1 === '-') step1 = vTable - v2;
  else if (op1 === '*') step1 = vTable * v2;
  else if (op1 === '/') step1 = v2 !== 0 ? vTable / v2 : NaN;

  if (isNaN(step1)) {
    return { isValid: false, result: NaN, mathDamage: 0, pokerDamage: 0, totalDamage: 0, combo: null };
  }

  const finalResult = step1 + v3 + v4 + v5;
  if (isNaN(finalResult)) {
    return { isValid: false, result: NaN, mathDamage: 0, pokerDamage: 0, totalDamage: 0, combo: null };
  }

  let isValid = false;
  if (targetObj?.isParity) {
    const isInt = Number.isInteger(finalResult);
    if (isInt) {
      const isEven = Math.abs(finalResult) % 2 === 0;
      isValid = (targetObj.parityType === 'PARI' && isEven) || (targetObj.parityType === 'DISPARI' && !isEven);
    } else {
      isValid = false;
    }
  } else {
    const expectedTarget = Number(targetObj?.target ?? targetObj) || 0;
    isValid = Math.abs(finalResult - expectedTarget) < 1e-5;
  }

  const mathDamage = getClassicOpDamage(op1);
  const combo = evaluateTrisStellareCombination([tableCard, c2, c3, c4, c5]);
  const pokerDamage = combo.damage;
  const totalDamage = mathDamage + pokerDamage;

  return {
    isValid,
    step1: Math.round(step1 * 100) / 100,
    result: Math.round(finalResult * 100) / 100,
    mathDamage,
    pokerDamage,
    totalDamage,
    combo,
    cardsUsed: [c2, c3, c4, c5]
  };
};



// ============================================================================
// 1.6b2 DATABASE COMBINAZIONI POKERISTICHE MODALITÀ CLASSICA (IBRIDO)
// ============================================================================
const CLASSIC_POKER_PATTERNS = Object.freeze([
  { id: 'one_pair', name: 'COPPIA', cardsCount: 2, damage: 10, desc: '2 carte dello stesso valore (-10 HP)' },
  { id: 'two_pair', name: 'DOPPIA COPPIA', cardsCount: 4, damage: 12, desc: '2 coppie distinte (-12 HP)' },
  { id: 'three_of_a_kind', name: 'TRIS', cardsCount: 3, damage: 14, desc: '3 carte dello stesso valore (-14 HP)' },
  { id: 'straight', name: 'SCALA', cardsCount: 5, damage: 16, desc: '5 carte in sequenza continua (-16 HP)' },
  { id: 'flush', name: 'COLORE', cardsCount: 5, damage: 17, desc: '5 carte dello stesso seme (-17 HP)' },
  { id: 'full_house', name: 'FULL', cardsCount: 5, damage: 18, desc: '1 Tris + 1 Coppia (-18 HP)' },
  { id: 'four_of_a_kind', name: 'POKER', cardsCount: 4, damage: 19, desc: '4 carte dello stesso identico valore (-19 HP)' },
  { id: 'royal_flush', name: 'SCALA REALE', cardsCount: 5, damage: 20, desc: '5 carte consecutive dello stesso seme (-20 HP)' }
]);



const validateClassicPokerPattern = (cards, patternId) => {
  if (!cards || !patternId) return false;
  const validCards = cards.filter(Boolean);
  const targetDef = CLASSIC_POKER_PATTERNS.find(p => p.id === patternId);
  if (!targetDef) return false;
  if (validCards.length !== targetDef.cardsCount) return false;

  const jokers = validCards.filter(c => c.isJoker || c.suit === 'joker').length;
  const nonJokers = validCards.filter(c => !c.isJoker && c.suit !== 'joker');
  const nonJokerVals = nonJokers.map(c => Number(c.value) || 0).sort((a, b) => a - b);
  const nonJokerSuits = nonJokers.map(c => getCardSuit(c));

  const counts = {};
  nonJokerVals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const freq = Object.values(counts).sort((a, b) => b - a);

  switch (patternId) {
    case 'one_pair': {
      if (jokers >= 1) return true;
      return (freq[0] || 0) >= 2;
    }
    case 'two_pair': {
      if (jokers >= 2) return true;
      if (jokers === 1) return (freq[0] || 0) >= 2;
      return (freq[0] || 0) >= 2 && (freq[1] || 0) >= 2;
    }
    case 'three_of_a_kind': {
      return ((freq[0] || 0) + jokers) >= 3;
    }
    case 'straight': {
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const checkSpan = (vals) => {
        if (vals.length === 0) return true;
        return (vals[vals.length - 1] - vals[0] <= 4);
      };
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    case 'flush': {
      const suitSet = new Set(nonJokerSuits);
      return suitSet.size <= 1;
    }
    case 'full_house': {
      if (jokers >= 2) return true;
      if (jokers === 1) return ((freq[0] || 0) >= 2 && (freq[1] || 0) >= 2) || ((freq[0] || 0) >= 3);
      return (freq[0] || 0) >= 3 && (freq[1] || 0) >= 2;
    }
    case 'four_of_a_kind': {
      return ((freq[0] || 0) + jokers) >= 4;
    }
    case 'royal_flush': {
      const suitSet = new Set(nonJokerSuits);
      if (suitSet.size > 1) return false;
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const checkSpan = (vals) => {
        if (vals.length === 0) return true;
        return (vals[vals.length - 1] - vals[0] <= 4);
      };
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    default:
      return false;
  }
};

// ============================================================================
// 1.6c REGISTRO DEI 12 ARCHETIPI NUCLEO INSTABILE (BERSAGLIO BOMBA)
// ============================================================================

const BOMB_ARCHETYPES = Object.freeze([
  // AREA 1: BALISTICA & DIFESA
  {
    id: 'fracture',
    title: 'Bomba a Frattura',
    icon: '💥',
    color: '#ef4444',
    minSector: 6,
    successDesc: '+30 HP danno puro al nemico',
    failDesc: 'Il nemico recupera +25 HP'
  },
  {
    id: 'barrier',
    title: 'Bomba a Barriera',
    icon: '🛡️',
    color: '#38bdf8',
    minSector: 6,
    successDesc: 'Scudo barriera da 25 HP',
    failDesc: 'Subisci 15 HP di danno diretto'
  },
  {
    id: 'vampiric',
    title: 'Bomba Vampirica',
    icon: 'ðŸ©¸',
    color: '#f43f5e',
    minSector: 6,
    successDesc: 'Ruba 15 HP al nemico curando te',
    failDesc: 'Il nemico ruba 15 HP a te'
  },

  // AREA 2: ECONOMIA & BOTTINO RARO
  {
    id: 'diamond',
    title: 'Bomba di Diamanti',
    icon: '💎',
    color: '#00f2fe',
    minSector: 6,
    successDesc: '+1 Diamante 💎 e +50 Polvere 🌟',
    failDesc: 'Azzeramento polvere stellare del match'
  },
  {
    id: 'ether',
    title: "Bomba d'Etere",
    icon: '🔮',
    color: '#d946ef',
    minSector: 16,
    successDesc: '+3 Etere Cosmico 🔮 istantaneo',
    failDesc: "Brucia tutto l'Etere della battaglia (0 🔮)"
  },
  {
    id: 'stardust_core',
    title: 'Bomba di Plasma Stellare',
    icon: '🌟',
    color: '#facc15',
    minSector: 6,
    successDesc: '+100 Polvere Stellare 🌟 immediata',
    failDesc: 'Perdi 40 Polvere Stellare 🌟'
  },

  // AREA 3: CONTROLLO TATTICO & MODULI
  {
    id: 'overcharge',
    title: 'Bomba a Sovraccarico',
    icon: 'âš¡',
    color: '#fde047',
    minSector: 6,
    successDesc: 'Modulo abilitÃ  ibrido al 100%',
    failDesc: 'Blocco modulo attivo per 2 turni'
  },
  {
    id: 'purge',
    title: 'Bomba di Spurgo',
    icon: 'ðŸ§¯',
    color: '#10b981',
    minSector: 6,
    successDesc: 'Azzera la barra malus nemica (0 tacche)',
    failDesc: 'Barra malus al massimo (Contraccolpo)'
  },
  {
    id: 'quantum',
    title: 'Bomba Quantica',
    icon: 'ðŸŽ²',
    color: '#c084fc',
    minSector: 6,
    successDesc: 'Accende tutte e 4 le tacche Dadi Quantici',
    failDesc: 'Azzera le tacche accumulate sui Dadi'
  },

  // AREA 4: GESTIONE MAZZO & TEMPO
  {
    id: 'temporal',
    title: 'Bomba Temporale',
    icon: 'â³',
    color: '#eab308',
    minSector: 6,
    successDesc: 'Serbatoio tempo al massimo (+30s)',
    failDesc: 'Serbatoio a 0s e prossimo timer a 15s'
  },
  {
    id: 'holographic',
    title: 'Bomba Olografica',
    icon: 'â˜…',
    color: '#e879f9',
    minSector: 6,
    successDesc: 'Carta piÃ¹ bassa diventa Jolly Quantico â˜…',
    failDesc: 'Prossima mano ridotta a sole 5 carte'
  },
  {
    id: 'resonance',
    title: 'Bomba di Risonanza',
    icon: 'ðŸƒ',
    color: '#a855f7',
    minSector: 6,
    successDesc: 'Raddoppia effetti semi (â™¥,â™¦,â™£,â™ ) per 2 turni',
    failDesc: 'Disattiva sinergie dei semi per 2 turni'
  }
]);

// ============================================================================
// 1.6d DATABASE DELLE 20 CARTE TERRENO / DIFESA (4 RARITÀ & 5 CATEGORIE)
// ============================================================================
const TERRAIN_CARDS_DATABASE = Object.freeze([
  // --- CATEGORIA 1: CRIO & STASI ---
  {
    id: 'cryo_stasis', name: 'Criostasi di Emergenza', category: 'cryo', categoryName: 'Crio & Stasi',
    rarity: 'Comune', rarityTier: 1, color: '#38bdf8', cost: { dust: 200, diamonds: 0 },
    image: '/assets/terrain/cryo_stasis.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'bomb_timeout', desc: 'Se il timer della Bomba tocca 0T, la congela evitando la detonazione.',
    levels: {
      1: { effectValue: 2, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Congela la Bomba per +2 Turni extra (Uso singolo).' },
      2: { effectValue: 2, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Congela per +2 Turni extra. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 3, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Congela per +3 Turni extra e conferisce uno scudo da 15 HP.' }
    }
  },
  {
    id: 'sub_zero_seal', name: 'Sigillo Sub-Zero', category: 'cryo', categoryName: 'Crio & Stasi',
    rarity: 'Rara', rarityTier: 2, color: '#0284c7', cost: { dust: 250, diamonds: 0 },
    image: '/assets/terrain/sub_zero_seal.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'bomb_critical', desc: 'Se la Bomba scende a 1T, dimezza il valore target richiesto per il disinnesco.',
    levels: {
      1: { effectValue: 0.5, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Dimezza il target della Bomba a 1T (Uso singolo).' },
      2: { effectValue: 0.5, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Dimezza il target della Bomba a 1T. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 0.3, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Riduce del 70% il valore target della Bomba a 1T.' }
    }
  },
  {
    id: 'cryo_absorber', name: 'Assorbitore Criogenico', category: 'cryo', categoryName: 'Crio & Stasi',
    rarity: 'Super Rara', rarityTier: 3, color: '#67e8f9', cost: { dust: 300, diamonds: 5 },
    image: '/assets/terrain/cryo_absorber.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'bomb_fail', desc: 'All\'esplosione di una Bomba, annulla la penalità e la converte in cura HP.',
    levels: {
      1: { effectValue: 15, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Annulla la detonazione e rigenera +15 HP (Uso singolo).' },
      2: { effectValue: 25, etherRearmCost: 2, reqPilotLevel: 31, desc: 'Fascia 2: Annulla la detonazione e rigenera +25 HP. Riarmabile con 2🔮.' },
      3: { effectValue: 40, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Annulla detonazione, rigenera +40 HP e azzera il malus nemico.' }
    }
  },
  {
    id: 'frost_bite', name: 'Morsa del Gelo', category: 'cryo', categoryName: 'Crio & Stasi',
    rarity: 'Leggendaria', rarityTier: 4, color: '#06b6d4', cost: { dust: 350, diamonds: 5 },
    image: '/assets/terrain/frost_bite.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'enemy_crit', desc: 'Se subisci un colpo critico dal nemico, ne congela il timer al turno successivo.',
    levels: {
      1: { effectValue: 15, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Sottrae 15s al prossimo timer nemico (Uso singolo).' },
      2: { effectValue: 25, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Sottrae 25s al prossimo timer nemico. Riarmabile con 1🔮.' },
      3: { effectValue: 35, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Sottrae 35s al timer nemico e gli infligge 10 HP di gelo puro.' }
    }
  },

  // --- CATEGORIA 2: GRAVITÀ & CONDENSAZIONE ---
  {
    id: 'magnetic_valve', name: 'Valvola di Sfogo', category: 'gravity', categoryName: 'Gravità',
    rarity: 'Comune', rarityTier: 1, color: '#f59e0b', cost: { dust: 200, diamonds: 0 },
    image: '/assets/terrain/magnetic_valve.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'malus_full', desc: 'Quando la Barra Malus raggiunge il massimo, scarica le tacche senza contraccolpo.',
    levels: {
      1: { effectValue: 6, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Azzera 6 tacche Malus bloccando il contraccolpo (Uso singolo).' },
      2: { effectValue: 6, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Azzera le tacche Malus senza contraccolpo. Riarmabile con 1🔮.' },
      3: { effectValue: 6, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Azzera le tacche Malus e carica il modulo abilità del +50%.' }
    }
  },
  {
    id: 'charge_splitter', name: 'Ripartitore di Carica', category: 'gravity', categoryName: 'Gravità',
    rarity: 'Rara', rarityTier: 2, color: '#facc15', cost: { dust: 250, diamonds: 0 },
    image: '/assets/terrain/charge_splitter.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'enemy_hit', desc: 'Converte le tacche Malus accumulate in barriera difensiva a ogni colpo subito.',
    levels: {
      1: { effectValue: 3, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Assorbe fino a 3 HP di danno per ogni tacca Malus (Uso singolo).' },
      2: { effectValue: 5, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Assorbe 5 HP per tacca. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 8, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Assorbe 8 HP per tacca e riflette il 50% dell\'assorbimento.' }
    }
  },
  {
    id: 'gravimetric_anchor', name: 'Ancora Gravimetrica', category: 'gravity', categoryName: 'Gravità',
    rarity: 'Super Rara', rarityTier: 3, color: '#ea580c', cost: { dust: 300, diamonds: 5 },
    image: '/assets/terrain/gravimetric_anchor.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'heavy_damage', desc: 'Se subisci un attacco superiore a 18 HP, ne dimezza immediatamente l\'impatto.',
    levels: {
      1: { effectValue: 0.5, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Dimezza (-50%) i danni nemici >18 HP (Uso singolo).' },
      2: { effectValue: 0.6, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Riduce del 60% i danni nemici >18 HP. Riarmabile con 1🔮.' },
      3: { effectValue: 0.75, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Riduce del 75% i danni pesanti e azzera il timer di riserva nemico.' }
    }
  },
  {
    id: 'rebound_condenser', name: 'Condensatore di Rimbalzo', category: 'gravity', categoryName: 'Gravità',
    rarity: 'Leggendaria', rarityTier: 4, color: '#d97706', cost: { dust: 350, diamonds: 5 },
    image: '/assets/terrain/rebound_condenser.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'malus_backfire', desc: 'Quando scatta un Malus, devia l\'effetto negativo direttamente contro l\'avversario.',
    levels: {
      1: { effectValue: 1, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Riflette il malus scattato contro il nemico (Uso singolo).' },
      2: { effectValue: 1, etherRearmCost: 2, reqPilotLevel: 31, desc: 'Fascia 2: Riflette il malus contro il nemico. Riarmabile con 2🔮 Etere.' },
      3: { effectValue: 1, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Riflette il malus e infligge 15 HP di contraccolpo puro al nemico.' }
    }
  },

  // --- CATEGORIA 3: ETERE & SPAZIO-TEMPO ---
  {
    id: 'frequency_reserve', name: 'Riserva di Frequenza', category: 'tachyon', categoryName: 'Spazio-Tempo',
    rarity: 'Comune', rarityTier: 1, color: '#10b981', cost: { dust: 200, diamonds: 0 },
    image: '/assets/terrain/frequency_reserve.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'timer_depleted', desc: 'Se il timer tocca 0s, concede secondi extra evitando il timeout.',
    levels: {
      1: { effectValue: 20, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Concede +20s di emergenza evitando il timeout (Uso singolo).' },
      2: { effectValue: 25, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Concede +25s di emergenza. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 30, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Concede +30s di emergenza e ricarica +2 carte mirate dal mazzo.' }
    }
  },
  {
    id: 'tachyon_siphon', name: 'Sifone Tachionico', category: 'tachyon', categoryName: 'Spazio-Tempo',
    rarity: 'Rara', rarityTier: 2, color: '#059669', cost: { dust: 250, diamonds: 0 },
    image: '/assets/terrain/tachyon_siphon.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'pass_turn', desc: 'Se passi il turno senza attaccare, sintetizza Etere Cosmico e ricarica il Time Tank.',
    levels: {
      1: { effectValue: 2, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Passare conferisce +2🔮 Etere e +10s al Time Tank (Uso singolo).' },
      2: { effectValue: 3, etherRearmCost: 0, reqPilotLevel: 31, desc: 'Fascia 2: Passare conferisce +3🔮 Etere e +15s. Auto-riarmo dopo 3 turni.' },
      3: { effectValue: 4, etherRearmCost: 0, reqPilotLevel: 66, desc: 'Fascia 3: Passare conferisce +4🔮 Etere, +20s al Time Tank e cura +10% HP.' }
    }
  },
  {
    id: 'temporal_singularity', name: 'Singolarità Temporale', category: 'tachyon', categoryName: 'Spazio-Tempo',
    rarity: 'Super Rara', rarityTier: 3, color: '#047857', cost: { dust: 300, diamonds: 5 },
    image: '/assets/terrain/temporal_singularity.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'enemy_fast_turn', desc: 'Se il nemico sferra un attacco rapido (<12s), taglia tempo dal suo turno successivo.',
    levels: {
      1: { effectValue: 15, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Taglia 15s dal turno successivo dell\'avversario (Uso singolo).' },
      2: { effectValue: 25, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Taglia 25s dal turno nemico. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 35, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Taglia 35s e svuota il Time Tank nemico a 0s.' }
    }
  },
  {
    id: 'entropic_filter', name: 'Filtro Entropico', category: 'tachyon', categoryName: 'Spazio-Tempo',
    rarity: 'Leggendaria', rarityTier: 4, color: '#34d399', cost: { dust: 350, diamonds: 5 },
    image: '/assets/terrain/entropic_filter.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'player_timeout', desc: 'Se subisci un timeout, azzera i danni da penalità e rimescola subito la mano.',
    levels: {
      1: { effectValue: 0, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Annulla i danni da timeout e ripristina la mano a 7 carte.' },
      2: { effectValue: 0, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Annulla danni da timeout e ricarica mano. Riarmabile con 1🔮.' },
      3: { effectValue: 10, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Annulla danni, ricarica mano e rigenera +10 HP.' }
    }
  },

  // --- CATEGORIA 4: MATRICE OTTICA ---
  {
    id: 'resonance_lock', name: 'Fissatore di Risonanza', category: 'optical', categoryName: 'Matrice Ottica',
    rarity: 'Comune', rarityTier: 1, color: '#e879f9', cost: { dust: 200, diamonds: 0 },
    image: '/assets/terrain/resonance_lock.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'golden_expire', desc: 'Se la Carta Dorata sta per scadere (1T), ne estende la durata di turni extra.',
    levels: {
      1: { effectValue: 2, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Estende la Carta Dorata di +2 Turni aggiuntivi (Uso singolo).' },
      2: { effectValue: 2, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Estende la Dorata di +2 Turni. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 3, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Estende la Dorata di +3 Turni e raddoppia il moltiplicatore a x3.0.' }
    }
  },
  {
    id: 'suit_catalyst', name: 'Catalizzatore di Semi', category: 'optical', categoryName: 'Matrice Ottica',
    rarity: 'Rara', rarityTier: 2, color: '#d946ef', cost: { dust: 250, diamonds: 0 },
    image: '/assets/terrain/suit_catalyst.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'three_suits_hand', desc: 'Se hai carte di 3 semi diversi, converte la carta restante nel 4° seme mancante.',
    levels: {
      1: { effectValue: 1, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Converte 1 carta nel seme mancante per la Combo 4 Semi.' },
      2: { effectValue: 1, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Converte nel seme mancante. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 1, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Converte nel seme mancante e la trasforma in Carta Dorata.' }
    }
  },
  {
    id: 'holographic_prism', name: 'Prisma Olografico', category: 'optical', categoryName: 'Matrice Ottica',
    rarity: 'Super Rara', rarityTier: 3, color: '#c084fc', cost: { dust: 300, diamonds: 5 },
    image: '/assets/terrain/holographic_prism.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'hand_stagnation', desc: 'Se non attacchi per 1 turno, transmuta le 2 carte più basse nei semi ideali.',
    levels: {
      1: { effectValue: 2, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Trasmuta le 2 carte più basse nei semi ideali (Uso singolo).' },
      2: { effectValue: 2, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Trasmuta le 2 carte più basse. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 3, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Trasmuta 3 carte e assegna +10 Polvere Stellare 🌟.' }
    }
  },
  {
    id: 'spectral_multiplier', name: 'Moltiplicatore Spettrale', category: 'optical', categoryName: 'Matrice Ottica',
    rarity: 'Leggendaria', rarityTier: 4, color: '#a855f7', cost: { dust: 350, diamonds: 5 },
    image: '/assets/terrain/spectral_multiplier.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'golden_played', desc: 'Quando giochi una Carta Dorata, ne amplifica l\'effetto specifico.',
    levels: {
      1: { effectValue: 1.5, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Amplifica del +50% il bonus della Carta Dorata (Uso singolo).' },
      2: { effectValue: 2.0, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Raddoppia (x2) il bonus della Carta Dorata. Riarmabile con 1🔮.' },
      3: { effectValue: 2.5, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Moltiplica x2.5 il bonus e garantisce +1 Diamante 💎.' }
    }
  },

  // --- CATEGORIA 5: PRISMA & OPERATORI ---
  {
    id: 'sign_inverter', name: 'Invertitore di Segno', category: 'prism', categoryName: 'Prisma',
    rarity: 'Comune', rarityTier: 1, color: '#f43f5e', cost: { dust: 200, diamonds: 0 },
    image: '/assets/terrain/sign_inverter.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'all_complex_ops', desc: 'Se tutti i bersagli sono [*] o [/], ne converte uno in Addizione [+].',
    levels: {
      1: { effectValue: 1, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Converte 1 bersaglio complesso in [+] Addizione (Uso singolo).' },
      2: { effectValue: 1, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Converte in [+] Addizione. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 2, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Converte fino a 2 bersagli in [+] e ne riduce il valore del 20%.' }
    }
  },
  {
    id: 'quantum_polarizer', name: 'Polarizzatore Quantico', category: 'prism', categoryName: 'Prisma',
    rarity: 'Rara', rarityTier: 2, color: '#ef4444', cost: { dust: 250, diamonds: 0 },
    image: '/assets/terrain/quantum_polarizer.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'high_target_lock', desc: 'Se un bersaglio supera il valore 45, ne arrotonda la cifra a un multiplo di 5.',
    levels: {
      1: { effectValue: 5, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Ricalibra bersagli >45 su multipli esatti di 5 (Uso singolo).' },
      2: { effectValue: 5, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Ricalibra bersagli >45 su multipli di 5. Riarmabile con 1🔮.' },
      3: { effectValue: 10, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Ricalibra e sottrae 10 punti al bersaglio.' }
    }
  },
  {
    id: 'algebraic_refraction', name: 'Rifrazione Algebrica', category: 'prism', categoryName: 'Prisma',
    rarity: 'Super Rara', rarityTier: 3, color: '#fb7185', cost: { dust: 300, diamonds: 5 },
    image: '/assets/terrain/algebraic_refraction.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'no_solvable_targets', desc: 'Se nessun bersaglio è risolvibile, riduce tutti i valori target del 25%.',
    levels: {
      1: { effectValue: 0.25, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Riduce del 25% i target non risolvibili (Uso singolo).' },
      2: { effectValue: 0.35, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Riduce del 35% i target. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 0.50, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Dimezza (-50%) i target e accende 2 tacche sui Dadi Quantici.' }
    }
  },
  {
    id: 'harmonic_matrix', name: 'Matrice Armonica', category: 'prism', categoryName: 'Prisma',
    rarity: 'Leggendaria', rarityTier: 4, color: '#fda4af', cost: { dust: 350, diamonds: 5 },
    image: '/assets/terrain/harmonic_matrix.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'division_hit', desc: 'Quando chiudi un attacco con la Divisione [/], infligge danni puri bonus e azzera il Malus.',
    levels: {
      1: { effectValue: 10, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: +10 HP Danno Puro su attacchi con [/] (Uso singolo).' },
      2: { effectValue: 15, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: +15 HP Danno Puro su [/]. Riarmabile con 1🔮 Etere.' },
      3: { effectValue: 25, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: +25 HP Danno Puro su [/] e azzera totalmente la Barra Malus nemica.' }
    }
  },

  // CARRELLO ESCLUSIVO CAPSULE STELLARI (90 ⭐)
  {
    id: 'entropic_refraction',
    name: 'Scudo a Rifrazione Entropica',
    category: 'gravity',
    categoryName: 'Gravità',
    rarity: 'Super Rara',
    rarityTier: 3,
    color: '#a855f7',
    exclusiveStarMilestone: 90,
    cost: { dust: 0, diamonds: 0 },
    image: '/assets/terrain/entropic_refraction.png', backImage: '/assets/terrain/terrain_back.png',
    triggerCondition: 'malus_backfire',
    desc: 'Trappola Esclusiva (90⭐): quando scatta un Malus, ne converte la forza distruttiva in scudo energetico e ritorsione.',
    levels: {
      1: { effectValue: 0.5, etherRearmCost: 0, reqPilotLevel: 1, desc: 'Fascia 1: Annulla il contraccolpo e conferisce uno Scudo pari al 50% del danno assorbito.' },
      2: { effectValue: 1.0, etherRearmCost: 1, reqPilotLevel: 31, desc: 'Fascia 2: Annulla il contraccolpo, dona Scudo e riflette 10 HP al nemico. Riarmabile con 1🔮.' },
      3: { effectValue: 1.5, etherRearmCost: 1, reqPilotLevel: 66, desc: 'Fascia 3: Riflette l\'intero contraccolpo, dona Scudo e carica istantaneamente il Modulo Abilità del +50%!' }
    }
  }
]);


// ============================================================================
// 1.7 REGISTRO COMPLETO TUTORIAL VISIVI 3D CINETICI (31 GUIDE TOTALI)
// ============================================================================
const DISCOVERY_TUTORIALS = Object.freeze({
  // 1. INGRESSO CAMPAGNA
  campaign_first_entry: {
    id: 'campaign_first_entry',
    subtitle: 'CAMPAGNA STELLARE',
    title: 'LA ROTTA DEI 20 PIANETI',
    rule: '20 Pianeti. 200 Settori.<br>Ogni calcolo ti avvicina ai <strong>Manufatti che piegano le leggi dell\'universo</strong>.',
    pods: [
      { type: 'station-cyan', tag: 'ESPLORA', num: '20', badge: 'PIANETI' },
      { type: 'station-crimson', tag: 'ABATTI', num: '20', badge: 'BOSS' },
      { type: 'station-gold', tag: 'FORGIA', num: '10', badge: 'MANUFATTI' }
    ],
    buttonText: 'APRI MAPPA STELLARE ➔'
  },


  // 3. LIVELLO 2
  level_2_intro: {
    id: 'level_2_intro',
    subtitle: 'PIANETA 01 — TERRA S2',
    title: 'POTERE DEI 4 SEMI COSMICI',
    rule: 'Ogni seme racchiude un\'energia vitale.<br>Scegli le carte non solo per il numero, ma <strong>per il potere che rilasciano</strong>.',
    pods: [
      { type: 'station-crimson', tag: 'CUORI', num: '♥', badge: '+8% HP' },
      { type: 'station-magenta', tag: 'PICCHE', num: '♠', badge: '+3 HP' },
      { type: 'station-emerald', tag: 'FIORI', num: '♣', badge: '+5s TEMPO' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 4. LIVELLO 3
  level_3_intro: {
    id: 'level_3_intro',
    subtitle: 'PIANETA 01 — TERRA S3',
    title: 'COMBO 4 SEMI = ECLISSI',
    rule: 'L\'allineamento totale scatena l\'Eclissi.<br>Raccogli tutti e quattro i semi per <strong>raddoppiare la violenza del colpo</strong>.',
    pods: [
      { type: 'station-crimson', tag: 'DANNO', num: 'x2.0', badge: 'CRITICO' },
      { type: 'station-gold', tag: 'PREMIO', num: '+1', badge: 'DIAMANTE 💎' },
      { type: 'station-cyan', tag: 'RISORSE', num: '+30', badge: 'POLVERE 🌟' }
    ],
    buttonText: 'PROVA LA COMBO ➔'
  },

   // 5. CARTA DORATA (SBLOCCO SETTORE 6)
  golden_card_intro: {
    id: 'golden_card_intro',
    subtitle: 'RISONANZA — SETTORE 6',
    title: 'CARTA DORATA [2 TURNI]',
    rule: 'Una risonanza pura attraversa la tua mano.<br>Riconosci la carta d\'oro e <strong>sfrutta il suo potere prima che svanisca</strong>.',
    pods: [
      { type: 'station-gold', tag: 'DURATA', num: '2T', badge: 'RISONANZA' },
      { type: 'station-magenta', tag: 'POTERE', num: '2X', badge: 'EFFETTO SEME' },
      { type: 'station-crimson', tag: 'COMBO 4', num: 'x3.0', badge: 'CRITICO SUPREMO' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 6. NUCLEO INSTABILE (SBLOCCO SETTORE 7)
  bomb_target_intro: {
    id: 'bomb_target_intro',
    subtitle: 'ALLERTA TATTICA — SETTORE 7',
    title: 'NUCLEO INSTABILE IN CAMPO',
    rule: 'Un reattore instabile sulla plancia.<br><strong>Disinnescalo con un calcolo freddo</strong> o subisci l\'onda d\'urto.',
    pods: [
      { type: 'station-gold', tag: 'CONTO', num: '3T', badge: 'DETONAZIONE' },
      { type: 'station-emerald', tag: 'DISINNESCO', num: 'PREMIO', badge: 'INCASSI BOTTINO' },
      { type: 'station-crimson', tag: 'ESPLOSIONE', num: 'MALUS', badge: 'SUBISCI DANNO' }
    ],
    buttonText: 'RICEVUTO ➔'
  },

  // 7. PVP ADDESTRAMENTO (SBLOCCO SETTORE 11)
  pvp_training_unlock_intro: {
    id: 'pvp_training_unlock_intro',
    subtitle: 'SBLOCCO SETTORE 11',
    title: 'DUELLO 1v1: ADDESTRAMENTO',
    rule: 'La simulazione finisce qui.<br>Entra nell\'arena contro piloti reali <strong>senza rischiare il tuo rango</strong>.',
    pods: [
      { type: 'station-cyan', tag: 'COSTO', num: '5 ⚡', badge: 'CREDITI' },
      { type: 'station-emerald', tag: 'RISCHIO', num: '0', badge: 'TROFEI PERSI' },
      { type: 'station-gold', tag: 'FARMING', num: '+45', badge: 'POLVERE 🌟' }
    ],
    buttonText: 'VAI AI DUELLI ➔'
  },


  // 8. BANCO TERRENO
  terrain_cards_intro: {
    id: 'terrain_cards_intro',
    subtitle: 'DIFESA PASSIVA — SETTORE 8',
    title: 'BANCO TERRENO COPERTO',
    rule: 'Le minacce aumentano.<br>La tua nave schiera in automatico la <strong>Criostasi di Emergenza</strong>: scatterà da sola per salvarti!',
    pods: [
      { type: 'station-cyan', tag: 'DIFESA', num: '1/4', badge: 'CRIOSTASI' },
      { type: 'station-emerald', tag: 'INNESCO', num: 'AUTO', badge: 'A COSTO ZERO' },
      { type: 'station-magenta', tag: 'SALVEZZA', num: 'CONGELA', badge: 'BLOCCO BOMBA' }
    ],
    buttonText: 'ARMATURA PRONTA ➔'
  },


   // 9. MODULO ABILITÀ IBRIDO
  level_9_intro: {
    id: 'level_9_intro',
    subtitle: 'DOTAZIONE PLANCIA — SETTORE 9',
    title: 'MODULO ABILITÀ IBRIDO',
    rule: 'Ogni colpo a segno ricarica la cella energetica.<br>Metti a segno 3 colpi e <strong>scatena l\'apoteosi del modulo</strong>.',
    pods: [
      { type: 'station-cyan', tag: 'ACCUMULO', num: '3 COLPI', badge: '100% CARICA' },
      { type: 'station-gold', tag: 'ATTIVAZIONE', num: 'LIBERA', badge: '0s TURNO SALVO' },
      { type: 'station-emerald', tag: 'RILASCIO', num: 'UNITO', badge: 'TUTTI I POTERI' }
    ],
    buttonText: 'ENTRA IN BATTAGLIA ➔'
  },


  // 10. BOSS GAIA
  level_10_intro: {
    id: 'level_10_intro',
    subtitle: 'DUELLO TITANICO — SETTORE 10',
    title: 'BOSS GAIA (75 HP)',
    rule: 'Il Guardiano planetario non concede errori.<br>Equipaggia la passiva adatta e <strong>strappagli la prima Reliquia</strong>.',
    pods: [
      { type: 'station-crimson', tag: 'TITANO', num: '75', badge: 'PUNTI VITA' },
      { type: 'station-cyan', tag: 'MAZZO', num: 'PASSIVA', badge: 'SPECIALIZZATO' },
      { type: 'station-gold', tag: 'PREMIO', num: '1/2', badge: 'RELIQUIA TELLURICA' }
    ],
    buttonText: 'SFIDA IL BOSS ➔'
  },

  // 11. RELIQUIA TELLURICA
  telluric_relic_intro: {
    id: 'telluric_relic_intro',
    subtitle: 'CRIPTA DELLE SINGOLARITÀ',
    title: 'RELIQUIA TELLURICA (1/2)',
    rule: 'La litosfera terrestre è tua.<br>Abbatti Marte per chiudere la morsa e <strong>aprire il primo Varco Gravitazionale</strong>.',
    pods: [
      { type: 'station-emerald', tag: 'TERRA', num: '1/2', badge: 'CONQUISTATA ✓' },
      { type: 'station-crimson', tag: 'MARTE', num: '2/2', badge: 'DA BATTERE' },
      { type: 'station-gold', tag: 'VARCO I', num: 'ANELLO', badge: 'PONTE MÖBIUS' }
    ],
    buttonText: 'CONTINUA IL VIAGGIO ➔'
  },

  // 12. BARRA MALUS & SCOMMESSE
  level_11_intro: {
    id: 'level_11_intro',
    subtitle: 'PIANETA 02 — MARTE S1',
    title: 'SABOTAGGIO MALUS & SCOMMESSE',
    rule: 'La velocità di calcolo è la tua arma segreta.<br>Più colpisci in fretta, più secondi accumuli per <strong>sabotare e mandare in tilt l\'avversario</strong>.',
    pods: [
      { type: 'station-gold', tag: 'CARICA', num: 'RAPIDA', badge: 'SECONDI RISPARMIATI' },
      { type: 'station-crimson', tag: 'SABOTAGGIO', num: '60s', badge: 'COLPO A NEMICO' },
      { type: 'station-cyan', tag: 'BANCO', num: 'PvE', badge: 'QUOTE FISSE' }
    ],
    buttonText: 'ENTRA IN BATTAGLIA ➔'
  },


  // 13. DADI QUANTICI
  level_12_intro: {
    id: 'level_12_intro',
    subtitle: 'PIANETA 02 — MARTE S2',
    title: 'DADI QUANTICI DIGITALI',
    rule: 'La padronanza totale richiede tutte le operazioni.<br><strong>Accendi le quattro frequenze</strong> per piegare le probabilità.',
    pods: [
      { type: 'station-cyan', tag: 'OPERATORI', num: '+ - * /', badge: '4 FREQUENZE' },
      { type: 'station-magenta', tag: 'LANCIO', num: 'DADO', badge: 'EFFETTI SUBITO' },
      { type: 'station-gold', tag: 'FACCIA NERA', num: '100%', badge: 'CARICA MODULO' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 14. CAMBIO CARTE
  level_13_intro: {
    id: 'level_13_intro',
    subtitle: 'PIANETA 02 — MARTE S3',
    title: 'CAMBIO CARTE TATTICO',
    rule: 'Una mano sfavorevole non è una scusa: è un costo da calcolare.<br><strong>Sacrifica risorse e riprendi l\'iniziativa</strong>.',
    pods: [
      { type: 'station-gold', tag: '1ª CARTA', num: '+3 HP', badge: 'CURA NEMICO' },
      { type: 'station-crimson', tag: '2ª CARTA', num: '-3s', badge: 'TIMER RIDOTTO' },
      { type: 'station-magenta', tag: '3ª CARTA', num: '-3 HP', badge: 'DANNO PROPRIO' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 15. ANOMALIE AMBIENTALI
  level_14_intro: {
    id: 'level_14_intro',
    subtitle: 'PIANETA 02 — MARTE S4',
    title: 'ANOMALIE AMBIENTALI',
    rule: 'Lo spazio profondo altera le regole del calcolo.<br><strong>Aggira i blocchi ambientali</strong> o sfrutta le risonanze a tuo favore.',
    pods: [
      { type: 'station-crimson', tag: 'BLOCCO', num: 'OP', badge: 'OPERATORE VIETATO' },
      { type: 'station-gold', tag: 'RISONANZA', num: 'SEME', badge: 'SEME RADDOPPIATO' },
      { type: 'station-cyan', tag: 'BYPASS', num: 'MAZZI', badge: 'EFFETTI SPECIALI' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 16. ETERE COSMICO
  level_15_intro: {
    id: 'level_15_intro',
    subtitle: 'PIANETA 02 — MARTE S5',
    title: 'ETERE, JOLLY & ESTRATTORE',
    rule: 'Sintetizza l\'Etere per piegare il valore delle carte:<br><strong>trasforma il caos in Jolly</strong> o pesca il numero esatto.',
    pods: [
      { type: 'station-magenta', tag: 'JOLLY', num: '2 🔮', badge: 'VALORE LIBERO 1-13' },
      { type: 'station-cyan', tag: 'PESCA', num: '4 🔮', badge: 'PRESA DAL MAZZO' },
      { type: 'station-emerald', tag: 'ESTRATTORE', num: 'HOME', badge: 'SINTESI PASSIVA' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

   // 18. MODALITÀ VETTORE

  vector_intro: {
    id: 'vector_intro',
    subtitle: 'MODALITÀ — SETTORE 21',
    title: 'VETTORE GEOMETRICO',
    rule: 'Il calcolo diventa radar.<br>Manovra le coordinate cardinali e <strong>centra il bersaglio con il minimo dispendio di carte</strong>.',
    pods: [
      { type: 'station-emerald', tag: 'RADAR', num: '2 C', badge: '20 HP (MASSIMO)' },
      { type: 'station-gold', tag: 'PRECISO', num: '3 C', badge: '15 HP' },
      { type: 'station-crimson', tag: 'BASE', num: '4+ C', badge: '10-5 HP' }
    ],
    buttonText: 'ALLINEA RADAR ➔'
  },

    // 19. DUELLO DI CONVERGENZA
  duel_intro: {
    id: 'duel_intro',
    subtitle: 'MODALITÀ — SETTORE 41',
    title: 'DUELLO DI CONVERGENZA',
    rule: 'Banco Comune: <strong>(Base [Op] C1) [Op] C2</strong> in T1, poi chiudi con altre 2 carte in T2.<br><strong>Centra il Target comune: vince il minor Delta e la figura Poker a 5 carte!</strong>',
    pods: [
      { type: 'station-gold', tag: 'TURNO 1', num: '2 CARTE', badge: 'APERTURA SU BASE' },
      { type: 'station-cyan', tag: 'TURNO 2', num: '2 CARTE', badge: 'CHIUSURA DELTA' },
      { type: 'station-emerald', tag: 'POKER', num: '5 CARTE', badge: '8-20 HP (+3 BULLSEYE)' }
    ],
    buttonText: 'ENTRA IN CONVERGENZA ➔'
  },


    // 20. TRIS STELLARE
  tris_intro: {
    id: 'tris_intro',
    subtitle: 'MODALITÀ — SETTORE 61',
    title: 'TRIS STELLARE A 5 CARTE',
    rule: 'Incastra 4 carte con il tavolo: <strong>(Tavolo [Op1] C2) + C3 + C4 + C5</strong>.<br>Scatena la <strong>Doppia Esplosione</strong>: Danno Operatore + Danno Poker!',
    pods: [
      { type: 'station-cyan', tag: 'MATH', num: 'OP', badge: '10-20 HP (t=0)' },
      { type: 'station-gold', tag: 'POKER', num: '5 CARTE', badge: '8-20 HP (t=350ms)' },
      { type: 'station-emerald', tag: 'SCARICA', num: '1 CARTA', badge: 'EFFETTO SEME' }
    ],
    buttonText: 'INCASTRA LE CARTE ➔'
  },


  // 21. LEGA ÉLITE PVP
  pvp_elite_unlock_intro: {
    id: 'pvp_elite_unlock_intro',
    subtitle: 'POST-NETTUNO — SETTORE 81',
    title: 'LEGA ÉLITE MONDIALE',
    rule: 'I migliori piloti della galassia ti aspettano.<br><strong>Dieci scontri al giorno</strong> per scalare il podio mondiale e conquistare diamanti.',
    pods: [
      { type: 'station-gold', tag: 'MATCH', num: '10/GG', badge: 'COSTO 0 ⚡' },
      { type: 'station-cyan', tag: 'TROFEI', num: '+25/-10', badge: 'SCALATA RANK' },
      { type: 'station-emerald', tag: 'PODIO', num: '100 💎', badge: 'PREMIO 1° POSTO' }
    ],
    buttonText: 'VEDI CLASSIFICA ➔'
  },

  // 22. COLLEZIONE MAZZI
  decks_menu_intro: {
    id: 'decks_menu_intro',
    subtitle: 'COLLEZIONE MAZZI',
    title: '33 MAZZI TATTICI',
    rule: 'Ogni mazzo modifica la fisica del tuo scontro.<br><strong>Potenzia la tua risonanza</strong> attraverso i tre scaglioni pilota.',
    pods: [
      { type: 'station-cyan', tag: 'FASCIA 1', num: 'L1-3', badge: '1ª PASSIVA BASE' },
      { type: 'station-magenta', tag: 'FASCIA 2', num: 'L4-6', badge: 'DOPPIA PASSIVA' },
      { type: 'station-gold', tag: 'FASCIA 3', num: 'L7-9', badge: 'APOTEOSI FINALE' }
    ],
    buttonText: 'SFOGLIA MAZZI ➔'
  },

  // 23. MENU ABILITÀ
  abilities_menu_intro: {
    id: 'abilities_menu_intro',
    subtitle: 'DOTAZIONE TATTICA',
    title: 'MODULO ABILITÀ IBRIDO',
    rule: 'Un solo alloggiamento, un solo colpo risolutivo.<br><strong>Sali di grado per scatenare fino a tre poteri</strong> in un unico istante.',
    pods: [
      { type: 'station-magenta', tag: 'PLANCIA', num: '1 SLOT', badge: 'MODULO ATTIVO' },
      { type: 'station-cyan', tag: 'ENERGIA', num: 'DANNO', badge: 'ALIMENTA CARICA' },
      { type: 'station-gold', tag: 'APOTEOSI', num: '3 EFF.', badge: 'SCATENATI INSIEME' }
    ],
    buttonText: 'GESTISCI MODULO ➔'
  },

    // 25. VOLTA CELESTE

  environments_menu_intro: {
    id: 'environments_menu_intro',
    subtitle: 'PERSONALIZZAZIONE 3D',
    title: 'VOLTA CELESTE: 24 SFONDI',
    rule: 'Plancia tattica immersa nello spazio profondo.<br><strong>Conquista le orbite dei pianeti</strong> e personalizza la tua volta visiva.',
    pods: [
      { type: 'station-cyan', tag: 'COSMICI', num: '4', badge: 'DIAMANTI 💎' },
      { type: 'station-gold', tag: 'PLANETARI', num: '20', badge: 'BATTI I BOSS' },
      { type: 'station-emerald', tag: '3D VIVO', num: 'ORBITA', badge: 'EFFETTI DINAMICI' }
    ],
    buttonText: 'VEDI SFONDI ➔'
  },

  // 26. SCOMMESSE DEL BANCO
  betting_menu_intro: {
    id: 'betting_menu_intro',
    subtitle: 'SFIDA PVE A QUOTE FISSE',
    title: 'SCOMMESSE DEL BANCO',
    rule: 'Sfida l\'algoritmo a quote fisse.<br><strong>Dimostra che la mente umana batte la macchina</strong> e incassa diamanti garantiti.',
    pods: [
      { type: 'station-gold', tag: 'SCALATA', num: '4 TIER', badge: 'DIFFICOLTÀ' },
      { type: 'station-cyan', tag: 'PARITÀ', num: 'IA = TU', badge: 'STESSO LIVELLO' },
      { type: 'station-emerald', tag: 'TETTO MAX', num: '10 💎', badge: 'AL GIORNO' }
    ],
    buttonText: 'VAI ALLE SCOMMESSE ➔'
  },

  // 27. CIRCUITO DUELLI
  pvp_menu_intro: {
    id: 'pvp_menu_intro',
    subtitle: 'DUELLI ONLINE 1v1',
    title: 'CIRCUITI COMPETITIVI',
    rule: 'Due rotte per il duello:<br><strong>collauda tattiche e accumula risorse in Addestramento</strong>, o rischia i trofei nella Lega Élite.',
    pods: [
      { type: 'station-cyan', tag: 'TRAINING', num: '5 ⚡', badge: 'ZERO RISCHI' },
      { type: 'station-gold', tag: 'ÉLITE', num: '10/GG', badge: 'SCALATA RANK' },
      { type: 'station-magenta', tag: 'SFIDA', num: 'DAILY', badge: 'ROTAZIONE REGOLE' }
    ],
    buttonText: 'SCEGLI CIRCUITO ➔'
  },

  // 28. ESTRATTORE DI ETERE
  extractor_menu_intro: {
    id: 'extractor_menu_intro',
    subtitle: 'SINTESI PASSIVA',
    title: 'ESTRATTORE DI ETERE',
    rule: 'Il reattore sintetizza energia subspaziale anche mentre la nave riposa.<br><strong>Raccoglila per alimentare jolly e trappole</strong>.',
    pods: [
      { type: 'station-magenta', tag: 'ENERGIA', num: '🔮', badge: 'ACCUMULO PASSIVO' },
      { type: 'station-cyan', tag: 'USO', num: 'JOLLY', badge: 'PESCA & RIARMO' },
      { type: 'station-gold', tag: 'UPGRADE', num: '4 LIV.', badge: 'CAPIENZA SILO' }
    ],
    buttonText: 'RAGGIUNGI ESTRATTORE ➔'
  },

  // 29. NEGOZIO GALATTICO
  store_menu_intro: {
    id: 'store_menu_intro',
    subtitle: 'RIFORNIMENTI',
    title: 'NEGOZIO GALATTICO',
    rule: 'Converti i diamanti guadagnati sul campo in <strong>scorte energetiche, recupero vite e minerali di vuoto</strong> per i manufatti.',
    pods: [
      { type: 'station-cyan', tag: 'ENERGIA', num: '⚡', badge: 'CONTINUA A GIOCARE' },
      { type: 'station-crimson', tag: 'SALUTE', num: '💔', badge: 'RIANIMAZIONI' },
      { type: 'station-gold', tag: 'MINERALI', num: '💠', badge: 'FORGIA EPICI' }
    ],
    buttonText: 'ENTRA NELLO SHOP ➔'
  },

  // 30. MODULO CARICO IN PARTITA
  ability_combat_intro: {
    id: 'ability_combat_intro',
    subtitle: 'PLANCIA DI BATTAGLIA',
    title: 'MODULO CARICO AL 100%!',
    rule: 'L\'accumulatore ha raggiunto il collasso critico.<br><strong>Premi Attiva in qualsiasi momento</strong>: l\'energia non consuma il tuo turno.',
    pods: [
      { type: 'station-cyan', tag: 'ENERGIA', num: '100%', badge: 'CARICA PIENA' },
      { type: 'station-gold', tag: 'RILASCIO', num: 'TOTALE', badge: 'TUTTI GLI EFFETTI' },
      { type: 'station-emerald', tag: 'AZIONE', num: '0s', badge: 'TURNO SALVO' }
    ],
    buttonText: 'HO CAPITO ➔'
  },

  // 31. BOSS MULTI-FASE
  boss_phases_intro: {
    id: 'boss_phases_intro',
    subtitle: 'SFIDA AVANZATA',
    title: 'BOSS MULTI-FASE & RESET',
    rule: 'I titani galattici combattono su più stadi.<br><strong>A ogni barra infranta la plancia cambia</strong> e le 54 carte tornano nel mazzo.',
    pods: [
      { type: 'station-crimson', tag: 'VITA', num: '1-4', badge: 'FASI SEQUENZIALI' },
      { type: 'station-cyan', tag: 'MAZZO', num: '54 C', badge: 'RICARICA TOTALE' },
      { type: 'station-gold', tag: 'IA BOSS', num: 'EPICI', badge: 'ATTIVATI DA NEMICO' }
    ],
    buttonText: 'ALLA BATTAGLIA ➔'
  },


  // 32. FAGLIA DI VULNERABILITÀ
  vulnerability_rift_intro: {
    id: 'vulnerability_rift_intro',
    subtitle: 'BRECCIA TATTICA',
    title: 'FAGLIA DI VULNERABILITÀ',
    rule: 'Subire gravi danni apre una breccia quantica nel nemico.<br>Risolvi il bersaglio indicato <strong>rispettando il vincolo speciale</strong> per incassare poteri supremi.',
    pods: [
      { type: 'station-crimson', tag: 'INNESCO', num: '30%', badge: 'DANNO SUBITO' },
      { type: 'station-gold', tag: 'DURATA', num: '1T', badge: 'TURNO SINGOLO' },
      { type: 'station-emerald', tag: 'PREMIO', num: 'SUPREMO', badge: 'BONUS O CURA' }
    ],
    buttonText: 'SFRUTTA LA BRECCIA ⚡'
  }
});



// 1.8 LOCALIZZAZIONE LINGUISTICA A 6 LINGUE (IT, EN, DE, ES, FR, ZH)
const LANGUAGES = Object.freeze({
  it: {
    welcome: "Benvenuto a Bordo",
    start: "Inizia a Giocare",
    homeTitle: "Eclissi Stellare",
    homeSubtitle: "Allena la Mente con il Calcolo Strategico",
    adv: "Campagna Stellare",
    pve: "Scommesse del Banco",
    pvp: "Duello Online 1v1",
    pvpTraining: "PvP Addestramento",
    pvpElite: "Lega Ã‰lite Mondiale",
    trisMode: "Tris Stellare",
    leaderboard: "Classifica Settimanale",
    decks: "Collezione Mazzi",
    abilitiesMenu: "Modulo AbilitÃ  Ibrido",
    epicItemsMenu: "Varchi & Epici",
    environments: "Sfondi e Pianeti",
    back: "Indietro",
    playSelected: "Attacca",
    passTurn: "Passa Turno",
    abandon: "Ritirati",
    winTitle: "Hai Vinto!",
    loseTitle: "Hai Perso",
    settingsTitle: "Impostazioni",
    musicToggle: "Musica di Sottofondo",
    sfxToggle: "Effetti Sonori",
    activeState: "ATTIVO",
    disabledState: "DISATTIVATO",
    langSelect: "Lingua"
  },
  en: {
    welcome: "Welcome Aboard",
    start: "Start Playing",
    homeTitle: "Stellar Eclipse",
    homeSubtitle: "Train Your Brain with Strategic Math",
    adv: "Stellar Campaign",
    pve: "Dealer Betting",
    pvp: "1v1 Online Duel",
    pvpTraining: "Training PvP",
    pvpElite: "Global Elite League",
    trisMode: "Stellar Trio",
    leaderboard: "Weekly Leaderboard",
    decks: "Deck Collection",
    abilitiesMenu: "Hybrid Ability Module",
    epicItemsMenu: "Rifts & Epics",
    environments: "Celestial Vault",
    back: "Back",
    playSelected: "Attack",
    passTurn: "Pass Turn",
    abandon: "Retreat",
    winTitle: "Victory!",
    loseTitle: "Defeat",
    settingsTitle: "Settings",
    musicToggle: "Music",
    sfxToggle: "Sound Effects",
    activeState: "ACTIVE",
    disabledState: "OFF",
    langSelect: "Language"
  },
  de: {
    welcome: "Willkommen an Bord",
    start: "Jetzt Spielen",
    homeTitle: "Sternen-Finsternis",
    homeSubtitle: "Gehirntraining mit strategischer Mathematik",
    adv: "Sternen-Kampagne",
    pve: "Bank-Wetten",
    pvp: "1v1 Online-Duell",
    pvpTraining: "Trainings-PvP",
    pvpElite: "Weltweite Elite-Liga",
    trisMode: "Sternen-Trio",
    leaderboard: "WÃ¶chentliche Bestenliste",
    decks: "Deck-Sammlung",
    abilitiesMenu: "Hybrides FÃ¤higkeitsmodul",
    epicItemsMenu: "Risse & Epische",
    environments: "HimmelsgewÃ¶lbe",
    back: "ZurÃ¼ck",
    playSelected: "Angriff",
    passTurn: "Zug Beenden",
    abandon: "Aufgeben",
    winTitle: "Gewonnen!",
    loseTitle: "Verloren",
    settingsTitle: "Einstellungen",
    musicToggle: "Musik",
    sfxToggle: "Soundeffekte",
    activeState: "AKTIV",
    disabledState: "AUS",
    langSelect: "Sprache"
  },
  es: {
    welcome: "Bienvenido a Bordo",
    start: "Empezar a Jugar",
    homeTitle: "Eclipse Estelar",
    homeSubtitle: "Entrena tu Mente con CÃ¡lculo EstratÃ©gico",
    adv: "CampaÃ±a Estelar",
    pve: "Apuestas de la Banca",
    pvp: "Duelo Online 1v1",
    pvpTraining: "PvP de Entrenamiento",
    pvpElite: "Liga Ã‰lite Mundial",
    trisMode: "TrÃ­o Estelar",
    leaderboard: "ClasificaciÃ³n Semanal",
    decks: "ColecciÃ³n de Mazos",
    abilitiesMenu: "MÃ³dulo Habilidad HÃ­brido",
    epicItemsMenu: "Grietas y Ã‰picos",
    environments: "BÃ³veda Celeste",
    back: "Volver",
    playSelected: "Atacar",
    passTurn: "Pasar Turno",
    abandon: "Retirarse",
    winTitle: "Â¡Has Ganado!",
    loseTitle: "Has Perdido",
    settingsTitle: "ConfiguraciÃ³n",
    musicToggle: "MÃºsica",
    sfxToggle: "Efectos de Sonido",
    activeState: "ACTIVO",
    disabledState: "DESACTIVADO",
    langSelect: "Idioma"
  },
  fr: {
    welcome: "Bienvenue Ã  Bord",
    start: "Jouer Maintenant",
    homeTitle: "Ã‰clipse Stellaire",
    homeSubtitle: "EntraÃ®nez votre Cerveau par le Calcul StratÃ©gique",
    adv: "Campagne Stellaire",
    pve: "Paris de la Banque",
    pvp: "Duel en Ligne 1v1",
    pvpTraining: "PvP d'EntraÃ®nement",
    pvpElite: "Ligue Ã‰lite Mondiale",
    trisMode: "Trio Stellaire",
    leaderboard: "Classement Hebdomadaire",
    decks: "Collection de Decks",
    abilitiesMenu: "Module CapacitÃ© Hybride",
    epicItemsMenu: "Failles & Ã‰piques",
    environments: "VoÃ»te CÃ©leste",
    back: "Retour",
    playSelected: "Attaquer",
    passTurn: "Passer Tour",
    abandon: "Abandonner",
    winTitle: "Victoire !",
    loseTitle: "DÃ©faite",
    settingsTitle: "ParamÃ¨tres",
    musicToggle: "Musique",
    sfxToggle: "Effets Sonores",
    activeState: "ACTIF",
    disabledState: "DÃ‰SACTIVÃ‰",
    langSelect: "Langue"
  },
  zh: {
    welcome: "æ¬¢è¿Žç™»èˆ°",
    start: "å¼€å§‹å¯¹å±€",
    homeTitle: "æ˜Ÿèš€æˆ˜æ£‹",
    homeSubtitle: "æ•°å­¦ç­–ç•¥æ€ç»´è®­ç»ƒ",
    adv: "æ˜Ÿé™…æˆ˜å½¹",
    pve: "åº„å®¶å¯¹å†³",
    pvp: "1v1å®žæ—¶åœ¨çº¿å¯¹å†³",
    pvpTraining: "è®­ç»ƒæ®µä½æˆ˜",
    pvpElite: "å…¨çƒç²¾è‹±è”èµ›",
    trisMode: "æ˜Ÿé™…ä¸‰é˜¶ç®—é˜µ",
    leaderboard: "æ¯å‘¨å¤©æ¢¯æ¦œ",
    decks: "å¡ç»„æ”¶è—",
    abilitiesMenu: "å¤åˆæŠ€èƒ½æ¨¡å—",
    epicItemsMenu: "è£‚éš™ä¸Žå²è¯—ç‰©",
    environments: "ç©¹é¡¶æ˜Ÿç©º",
    back: "è¿”å›ž",
    playSelected: "å‡ºç‰Œæ”»å‡»",
    passTurn: "ç»“æŸå›žåˆ",
    abandon: "è®¤è¾“é€€å‡º",
    winTitle: "å¯¹å±€èƒœåˆ©ï¼",
    loseTitle: "å¯¹å±€å¤±è´¥",
    settingsTitle: "ç³»ç»Ÿè®¾ç½®",
    musicToggle: "èƒŒæ™¯éŸ³ä¹",
    sfxToggle: "æˆ˜æ–—éŸ³æ•ˆ",
    activeState: "å¼€å¯",
    disabledState: "å…³é—­",
    langSelect: "è¯­è¨€é€‰æ‹©"
  }
});

// 1.9 SEMI BALISTICI & SINERGIE TEMPORALI / ECONOMICHE / CURE PERCENTUALI
const SUITS = Object.freeze([
  { id: 'hearts', name: 'Cuori', symbol: 'â™¥', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', synergy: '+8% HP Max Cura (+12% Toro) | Dorato: +16% (+24%)' },
  { id: 'diamonds', name: 'Quadri', symbol: 'â™¦', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', synergy: '+2 Polvere 🌟 | Dorato: +20 🌟 e 10% 💎' },
  { id: 'spades', name: 'Picche', symbol: 'â™ ', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', synergy: '+3 HP Danno Diretto | Dorato: +8 HP Puro' },
  { id: 'clubs', name: 'Fiori', symbol: 'â™£', color: '#10b981', glow: 'rgba(16, 185, 129, 0.85)', synergy: '+5s Serbatoio Tempo | Dorato: +15s e +1🔮' }
]);

// 1.10 FACCE DADI QUANTICI 2D (DISPLAY B)
const QUANTUM_DICE_B_FACES = Object.freeze([
  { id: 'black', symbol: 'âš¡', name: 'Carica Modulo', color: '#facc15', border: '#fde047' },
  { id: 'red', symbol: '🛡️', name: 'Scarica Malus', color: '#38bdf8', border: '#7dd3fc' },
  { id: 'hearts', symbol: 'â™¥', name: 'Cura HP %', color: '#f43f5e', border: '#fca5a5' },
  { id: 'diamonds', symbol: 'â™¦', name: 'Polvere Stellare', color: '#f59e0b', border: '#fde68a' },
  { id: 'spades', symbol: 'â™ ', name: 'Colpo Diretto', color: '#c084fc', border: '#f5d0fe' },
  { id: 'clubs', symbol: 'â™£', name: 'Tempo di Riserva', color: '#10b981', border: '#6ee7b7' }
]);

// 1.11 POOL DEI 4 MALUS TATTICI
const MALUS_POOL = Object.freeze([
  { id: 'hp_drain', title: '1. Perdita HP Immediata', desc: 'Infligge 10 HP di danno diretto.', icon: 'hazard', color: '#ef4444' },
  { id: 'module_lock', title: '2. Blocco Modulo Abilità', desc: 'Disattiva il Modulo Abilità per 2 turni.', icon: 'tactical_slot', color: '#f59e0b' },
  { id: 'hand_reduction', title: '3. Mano Ridotta', desc: 'La mano del prossimo turno avrà solo 5 carte.', icon: 'deck_stack', color: '#8b5cf6' },
  { id: 'skip_turn', title: '4. Salto Turno', desc: 'Il turno termina subito e l\'iniziativa passa all\'avversario.', icon: 'hazard', color: '#ec4899' }
]);


// 1.12 MODIFICATORI AMBIENTALI & ANOMALIE DI CAMPO
const ADVENTURE_MODIFIERS = Object.freeze([
  { id: 'standard', name: 'Campo Neutro e Stabile', desc: 'Nessun effetto speciale attivo.' },
  { id: 'fast_timer', name: 'Tempo Rapido', desc: 'Timer di turno ridotto a 30 secondi.' },
  { id: 'no_pass', name: 'Blocco Cambio Carte', desc: 'Impossibile cambiare le carte della mano.' },
  { id: 'boss_combined', name: 'Sfida Boss', desc: 'Timer ridotto e attacchi nemici rinforzati.' }
]);

const FIELD_ANOMALIES = Object.freeze([
  { id: 'normal', name: 'Campo Neutro', desc: 'Nessun vincolo particolare.', blockedOp: null },
  { id: 'hearts_res', name: 'Risonanza Cuori', desc: 'Il valore di tutte le carte Cuori Ã¨ raddoppiato.', blockedOp: null },
  { id: 'op_lock_add', name: 'Addizione Bloccata [+]', desc: 'Impossibile usare l\'addizione in questo turno.', blockedOp: '+' },
  { id: 'op_lock_mul', name: 'Moltiplicazione Bloccata [*]', desc: 'Impossibile usare la moltiplicazione in questo turno.', blockedOp: '*' },
  { id: 'op_lock_sub', name: 'Sottrazione Bloccata [-]', desc: 'Impossibile usare la sottrazione in questo turno.', blockedOp: '-' },
  { id: 'op_lock_div', name: 'Divisione Bloccata [/]', desc: 'Impossibile usare la divisione in questo turno.', blockedOp: '/' }
]);

const AI_ARCHETYPES = Object.freeze(['calculator', 'rusher', 'controller', 'disruptor']);

// 1.13 LIVELLI ESTRATTORE ETERE COSMICO
const EXTRACTOR_LEVELS = Object.freeze({
  1: { level: 1, name: 'Estrattore Base', intervalMs: 28800000, maxStore: 4, battleCap: 2, costDust: 0, reqLevel: 1 },
  2: { level: 2, name: 'Condensatore Tachionico', intervalMs: 21600000, maxStore: 6, battleCap: 3, costDust: 300, reqLevel: 10 },
  3: { level: 3, name: 'Matrice di Risonanza', intervalMs: 14400000, maxStore: 8, battleCap: 4, costDust: 700, reqLevel: 20 },
  4: { level: 4, name: 'Reattore a Punto Zero', intervalMs: 7200000, maxStore: 12, battleCap: 6, costDust: 1500, reqLevel: 35 }
});


// ============================================================================
// 1.16 DATABASE DEI 33 MAZZI & MODULI ABILITÃ€ IBRIDI (3, 6 O 9 LIVELLI)
//      OGNI ELEMENTO DEFINISCE:
//      - Passiva del Mazzo: traits attivi cumulativi (da getDeckActiveTraits)
//      - Attiva del Modulo Ibrido: poteri sbloccati simultaneamente al 100% carica
//      - UpgradeCosts: vincoli precisi di Pilota e Risorse per ciascun livello
// ============================================================================
const ALL_ABILITIES = Object.freeze([
  // MAZZO STARTER BASE (Fisso a Livello 1)
  {
    id: 'neutral_starter',
    name: 'Mazzo Neutro Cadetto',
    element: 'Neutro',
    type: 'starter',
    tier: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'ST',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.55)',
    desc: 'Mazzo di addestramento standard da 54 carte. Nessuna passiva e nessun modulo attivo.',
    deckPassiveDesc: 'Mazzo Neutro Cadetto (Standard di addestramento).',
    deckTrait: {},
    unlockCostDust: 0,
    unlockCostDiamonds: 0,
    baseCostDust: 0,
    maxLevel: 1,
    upgradeCosts: {},
    levels: {
      1: { desc: 'Mazzo standard di addestramento (nessuna passiva/attiva).', activeDesc: 'Nessun effetto attivo.', traits: [] }
    },
    bgGradient: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.95))'
  },

  // ==========================================================================
  // I 12 SEGNI ZODIACALI (4 SINGOLI A 3 LIV. / 8 DOPPI A 6 LIV.)
  // ==========================================================================

  // 1. ARIETE (Comune - Effetto Singolo - Max Livello 3)
  {
    id: 'aries',
    name: 'Ariete (Impatto Diretto)',
    element: 'ENERGIA',
    type: 'zodiac',

    tier: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'AR',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.75)',
    desc: 'Modulo Attivo: Scarica istantanea di Danni Puri. Passiva: Danno su [* /] e Perforazione.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 400, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1000, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: '+4 HP danno su formule con [*] o [/].', activeDesc: 'Scarica 15 HP di Danno Puro.', traits: [{ type: 'op_boost', ops: ['*', '/'], bonus: 4 }], activeDamage: 15 },
      2: { desc: '+6 HP danno su formule con [*] o [/].', activeDesc: 'Scarica 22 HP di Danno Puro.', traits: [{ type: 'op_boost', ops: ['*', '/'], bonus: 6 }], activeDamage: 22 },
      3: { desc: '+9 HP danno su [* /] e ignora 3 HP di scudi.', activeDesc: 'Scarica 30 HP di Danno Puro.', traits: [{ type: 'op_boost', ops: ['*', '/'], bonus: 9 }, { type: 'armor_pierce', pierce: 3 }], activeDamage: 30 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(69, 10, 10, 0.8), rgba(239, 68, 68, 0.4))'
  },

   // 2. TORO (Comune - Effetto Singolo - Max Livello 3)
  {
    id: 'taurus',
    name: 'Toro (Sintesi Biologica)',
    element: 'GRAVITA',
    type: 'zodiac',

    tier: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'TO',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.75)',
    desc: 'Modulo Attivo: Ripristino vitale immediato. Passiva: Cura potenziata carte Cuori.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 400, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1000, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Carte Cuori curano +12% HP Max.', activeDesc: 'Rigenera +18% HP Max.', traits: [{ type: 'suit_heal_boost', suit: 'hearts', bonusPct: 0.12 }], activeHealPct: 0.18 },
      2: { desc: 'Carte Cuori curano +16% HP Max.', activeDesc: 'Rigenera +26% HP Max.', traits: [{ type: 'suit_heal_boost', suit: 'hearts', bonusPct: 0.16 }], activeHealPct: 0.26 },
      3: { desc: 'Carte Cuori curano +20% HP Max e 50% eccesso diventa Danno.', activeDesc: 'Rigenera +35% HP Max.', traits: [{ type: 'suit_heal_boost', suit: 'hearts', bonusPct: 0.20 }, { type: 'overheal_to_damage', ratio: 0.5 }], activeHealPct: 0.35 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.8), rgba(16, 185, 129, 0.4))'
  },

  // 3. GEMELLI (Comune - Effetto Singolo - Max Livello 3)
  {
    id: 'gemini',
    name: 'Gemelli (Efficienza Rapida)',
    element: 'ENTROPIA',
    type: 'zodiac',

    tier: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'GE',
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.75)',
    desc: 'Modulo Attivo: Ricarica immediata Serbatoio Tempo. Passiva: Riserva tempo iniziale.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 400, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1000, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: '+15s riserva tempo iniziale nel serbatoio.', activeDesc: '+15s al Time Tank.', traits: [{ type: 'initial_tank_bonus', bonus: 15 }], activeTime: 15 },
      2: { desc: '+22s riserva tempo iniziale nel serbatoio.', activeDesc: '+22s al Time Tank.', traits: [{ type: 'initial_tank_bonus', bonus: 22 }], activeTime: 22 },
      3: { desc: '+30s riserva tempo iniziale (Cap) e pesca extra in turni rapidi.', activeDesc: '+30s al Time Tank.', traits: [{ type: 'initial_tank_bonus', bonus: 30 }, { type: 'fast_turn_draw', thresholdSeconds: 10, bonusCards: 1 }], activeTime: 30 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(30, 58, 138, 0.8), rgba(0, 242, 254, 0.4))'
  },

  // 4. CANCRO (Comune - Effetto Singolo - Max Livello 3)
  {
    id: 'cancer',
    name: 'Cancro (Pesca Protettiva)',
    element: 'ZERO_ASSOLUTO',
    type: 'zodiac',
    tier: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'CA',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.75)',
    desc: 'Modulo Attivo: Espansione istantanea mano. Passiva: Recupero risorse su Passa/Timeout.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 400, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1000, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Pesca +1 carta extra se passi il turno o subisci timeout.', activeDesc: 'Ricarica subito la mano a 8 carte.', traits: [{ type: 'pass_draw_boost', bonus: 1 }], activeHandSize: 8 },
      2: { desc: 'Pesca +1 carta e curi +5% HP Max se passi o subisci timeout.', activeDesc: 'Ricarica mano a 8 carte e cura +5% HP.', traits: [{ type: 'pass_draw_boost', bonus: 1 }, { type: 'pass_heal_pct', bonusPct: 0.05 }], activeHandSize: 8 },
      3: { desc: 'Pesca +2 carte, curi +10% HP Max e sotto il 40% HP mano sale a 9 carte.', activeDesc: 'Ricarica mano a 9 carte e cura +10% HP.', traits: [{ type: 'pass_draw_boost', bonus: 2 }, { type: 'pass_heal_pct', bonusPct: 0.10 }, { type: 'low_hp_hand_expansion', thresholdPct: 0.4, handSize: 9 }], activeHandSize: 9 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(8, 51, 68, 0.8), rgba(6, 182, 212, 0.4))'
  },

  // 5. LEONE (Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'leo',
    name: 'Leone (Furia di Grazia)',
    element: 'Fuoco',
    type: 'zodiac',
    tier: 2,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'LE',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.75)',
    desc: 'Modulo Ibrido: Danno Diretto + Semplificazione Bersagli. Passiva: Danno di Esecuzione + Danno Moltiplicazione.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 500, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1200, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3000, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: '+8 HP danno se bersaglio nemico ha <30% HP.', activeDesc: 'Scarica 14 HP di Danno Puro.', traits: [{ type: 'execute_damage', threshold: 0.3, bonus: 8 }], activeDamage: 14 },
      2: { desc: '+12 HP danno se bersaglio nemico ha <35% HP.', activeDesc: 'Scarica 20 HP di Danno Puro.', traits: [{ type: 'execute_damage', threshold: 0.35, bonus: 12 }], activeDamage: 20 },
      3: { desc: '+18 HP danno se bersaglio nemico ha <40% HP.', activeDesc: 'Scarica 26 HP di Danno Puro.', traits: [{ type: 'execute_damage', threshold: 0.4, bonus: 18 }], activeDamage: 26 },
      4: { desc: '[2Âª AbilitÃ ] +18 HP esecuzione e +3 HP su formule [*].', activeDesc: 'Scarica 26 HP Puro + Riduce del 20% i bersagli >30.', traits: [{ type: 'execute_damage', threshold: 0.4, bonus: 18 }, { type: 'op_flat_bonus', op: '*', bonus: 3 }], activeDamage: 26, simplifyTargets: 0.20 },
      5: { desc: '+18 HP esecuzione e +5 HP su formule [*].', activeDesc: 'Scarica 26 HP Puro + Riduce del 35% i bersagli >30.', traits: [{ type: 'execute_damage', threshold: 0.4, bonus: 18 }, { type: 'op_flat_bonus', op: '*', bonus: 5 }], activeDamage: 26, simplifyTargets: 0.35 },
      6: { desc: '+22 HP esecuzione e +8 HP su formule [*].', activeDesc: 'Scarica 30 HP Puro + Ricalibra tutti i bersagli a multipli di 5.', traits: [{ type: 'execute_damage', threshold: 0.45, bonus: 22 }, { type: 'op_flat_bonus', op: '*', bonus: 8 }], activeDamage: 30, simplifyTargets: 0.50 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(69, 26, 3, 0.8), rgba(245, 158, 11, 0.4))'
  },

  // 6. VERGINE (Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'virgo',
    name: 'Vergine (Precisione Pura)',
    element: 'Terra',
    type: 'zodiac',
    tier: 2,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'VI',
    color: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.75)',
    desc: 'Modulo Ibrido: Blocco AbilitÃ  Nemiche + Polvere Rapida. Passiva: Danno al 1Â° colpo + Estrazione Polvere.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 500, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1200, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3000, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: '+5 HP danno se attacchi al 1Â° tentativo.', activeDesc: 'Blocca abilitÃ  nemiche per 1 turno.', traits: [{ type: 'first_try_boost', bonus: 5 }], lockTurns: 1 },
      2: { desc: '+8 HP danno se attacchi al 1Â° tentativo.', activeDesc: 'Blocca abilitÃ  nemiche per 2 turni.', traits: [{ type: 'first_try_boost', bonus: 8 }], lockTurns: 2 },
      3: { desc: '+12 HP danno se attacchi al 1Â° tentativo.', activeDesc: 'Blocca abilitÃ  nemiche per 2 turni e azzera dadi nemici.', traits: [{ type: 'first_try_boost', bonus: 12 }], lockTurns: 2, resetEnemyDice: true },
      4: { desc: '[2Âª AbilitÃ ] +12 HP 1Â° colpo e +10🌟 su calcolo rapido (<15s).', activeDesc: 'Blocca abilitÃ  per 2 turni + Genera +25🌟.', traits: [{ type: 'first_try_boost', bonus: 12 }, { type: 'perfect_speed_dust', thresholdSeconds: 15, bonusDust: 10 }], lockTurns: 2, grantDust: 25 },
      5: { desc: '+12 HP 1Â° colpo e +15🌟 su calcolo rapido.', activeDesc: 'Blocca abilitÃ  per 2 turni + Genera +40🌟.', traits: [{ type: 'first_try_boost', bonus: 12 }, { type: 'perfect_speed_dust', thresholdSeconds: 15, bonusDust: 15 }], lockTurns: 2, grantDust: 40 },
      6: { desc: '+16 HP 1Â° colpo e +25🌟 su calcolo rapido.', activeDesc: 'Blocca abilitÃ  per 3 turni + Genera +60🌟 e 1💎.', traits: [{ type: 'first_try_boost', bonus: 16 }, { type: 'perfect_speed_dust', thresholdSeconds: 15, bonusDust: 25 }], lockTurns: 3, grantDust: 60, grantDiamonds: 1 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(54, 83, 20, 0.8), rgba(132, 204, 22, 0.4))'
  },

  // 7. BILANCIA (Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'libra',
    name: 'Bilancia (Blindatura Calibrata)',
    element: 'Aria',
    type: 'zodiac',
    tier: 2,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'LI',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.75)',
    desc: 'Modulo Ibrido: Sifone Vitale + Scudo Reattivo. Passiva: Difesa fissa + Furto HP.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 500, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1200, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3000, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Riduce di 3 HP ogni danno subito.', activeDesc: 'Ruba 10 HP al nemico curando te.', traits: [{ type: 'flat_defense', reduction: 3 }], siphonHp: 10 },
      2: { desc: 'Riduce di 5 HP ogni danno subito.', activeDesc: 'Ruba 16 HP al nemico curando te.', traits: [{ type: 'flat_defense', reduction: 5 }], siphonHp: 16 },
      3: { desc: 'Riduce di 7 HP ogni danno subito.', activeDesc: 'Ruba 22 HP al nemico curando te.', traits: [{ type: 'flat_defense', reduction: 7 }], siphonHp: 22 },
      4: { desc: '[2Âª AbilitÃ ] Difesa -7 HP e ogni attacco ruba 3 HP al nemico.', activeDesc: 'Ruba 22 HP + Barriera da 15 HP.', traits: [{ type: 'flat_defense', reduction: 7 }, { type: 'hit_siphon', hp: 3 }], siphonHp: 22, shieldHp: 15 },
      5: { desc: 'Difesa -8 HP e ogni attacco ruba 5 HP.', activeDesc: 'Ruba 26 HP + Barriera da 20 HP.', traits: [{ type: 'flat_defense', reduction: 8 }, { type: 'hit_siphon', hp: 5 }], siphonHp: 26, shieldHp: 20 },
      6: { desc: 'Difesa -10 HP e ogni attacco ruba 7 HP.', activeDesc: 'Ruba 32 HP + Barriera da 30 HP.', traits: [{ type: 'flat_defense', reduction: 10 }, { type: 'hit_siphon', hp: 7 }], siphonHp: 32, shieldHp: 30 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(54, 7, 100, 0.8), rgba(168, 85, 247, 0.4))'
  },

  // 8. SCORPIONE (Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'scorpio',
    name: 'Scorpione (Perforazione Tracciante)',
    element: 'Acqua',
    type: 'zodiac',
    tier: 2,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'SC',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.75)',
    desc: 'Modulo Ibrido: Mutilazione Mano Nemica + Veleno. Passiva: Danni Picche + TossicitÃ  continua.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 500, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1200, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3000, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Carte Picche (â™ ) infliggono +5 HP di danno (invece di +3).', activeDesc: 'Riduce la mano nemica a 5 carte per 1 turno.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 2 }], restrictEnemyHand: 5 },
      2: { desc: 'Carte Picche (â™ ) infliggono +7 HP di danno.', activeDesc: 'Riduce mano nemica a 5 carte per 2 turni.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 4 }], restrictEnemyHand: 5 },
      3: { desc: 'Carte Picche (â™ ) infliggono +10 HP di danno.', activeDesc: 'Riduce mano nemica a 4 carte per 1 turno.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 7 }], restrictEnemyHand: 4 },
      4: { desc: '[2Âª AbilitÃ ] Picche +10 HP e formule con Picche applicano 3 HP veleno per 2T.', activeDesc: 'Mano nemica a 5 carte + Applica 5 HP veleno per 2 turni.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 7 }, { type: 'poison_dot', dotDmg: 3, duration: 2 }], restrictEnemyHand: 5, poisonDmg: 5 },
      5: { desc: 'Picche +12 HP e veleno sale a 5 HP per 2T.', activeDesc: 'Mano nemica a 5 carte + Applica 8 HP veleno per 2 turni.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 9 }, { type: 'poison_dot', dotDmg: 5, duration: 2 }], restrictEnemyHand: 5, poisonDmg: 8 },
      6: { desc: 'Picche +15 HP e veleno sale a 8 HP per 3 turni consecutivi.', activeDesc: 'Mano nemica a 4 carte + Applica 12 HP veleno per 3 turni.', traits: [{ type: 'suit_damage_boost', suit: 'spades', bonus: 12 }, { type: 'poison_dot', dotDmg: 8, duration: 3 }], restrictEnemyHand: 4, poisonDmg: 12 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(80, 7, 36, 0.8), rgba(244, 63, 94, 0.4))'
  },

  // 9. SAGITTARIO (Super Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'sagittarius',
    name: 'Sagittario (Buffer Temporale)',
    element: 'Fuoco',
    type: 'zodiac',
    tier: 3,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'SA',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.75)',
    desc: 'Modulo Ibrido: Annullamento Timeout + Danno Balistico. Passiva: Tempo Fiori + Cecchino Bersagli Alti.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1600, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2500, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3800, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Carte Fiori (â™£) donano +10s al serbatoio tempo.', activeDesc: 'Annulla danni da timeout e dona +15s.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 5 }], timeoutShield: true, activeTime: 15 },
      2: { desc: 'Carte Fiori (â™£) donano +15s al serbatoio tempo.', activeDesc: 'Annulla danni da timeout e dona +25s.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 10 }], timeoutShield: true, activeTime: 25 },
      3: { desc: 'Carte Fiori (â™£) donano +20s al serbatoio tempo.', activeDesc: 'Annulla danni da timeout e riempie Time Tank al 100%.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 15 }], timeoutShield: true, activeTime: 30 },
      4: { desc: '[2Âª AbilitÃ ] Fiori +20s e +5 HP danno se il target centrato Ã¨ >= 30.', activeDesc: 'Time Tank al max (+30s) + Prossimo colpo >30 ha +10 HP danno.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 15 }, { type: 'high_target_snipe', minTarget: 30, bonus: 5 }], activeTime: 30, snipeBonus: 10 },
      5: { desc: 'Fiori +25s e +8 HP danno su target >= 30.', activeDesc: 'Time Tank al max + Prossimo colpo ha +15 HP danno.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 20 }, { type: 'high_target_snipe', minTarget: 30, bonus: 8 }], activeTime: 30, snipeBonus: 15 },
      6: { desc: 'Fiori +30s e +14 HP danno su target >= 30.', activeDesc: 'Time Tank al max + Infligge subito 20 HP e azzera timer nemico.', traits: [{ type: 'suit_time_boost', suit: 'clubs', bonus: 25 }, { type: 'high_target_snipe', minTarget: 30, bonus: 14 }], activeTime: 30, snipeBonus: 20, drainEnemyTime: 20 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(67, 20, 7, 0.8), rgba(249, 115, 22, 0.4))'
  },

  // 10. CAPRICORNO (Super Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'capricorn',
    name: 'Capricorno (Ammortizzatore Rinculo)',
    element: 'Terra',
    type: 'zodiac',
    tier: 3,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'CP',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.75)',
    desc: 'Modulo Ibrido: Assorbimento Danno Nemico + Scarica Malus. Passiva: Dimezza rinculo + ImmunitÃ  danni diretti.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1600, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2500, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3800, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Danni da contraccolpo e timeout ridotti del 50%.', activeDesc: 'Assorbe e annulla il prossimo attacco nemico.', traits: [{ type: 'recoil_halved', reductionPct: 0.50 }], absorbHit: true },
      2: { desc: 'Danni da contraccolpo e timeout ridotti del 65%.', activeDesc: 'Annulla prossimo attacco nemico e scarica 2 tacche malus.', traits: [{ type: 'recoil_halved', reductionPct: 0.65 }], absorbHit: true, dischargeMalus: 2 },
      3: { desc: 'Danni da contraccolpo e timeout ridotti dell\'80%.', activeDesc: 'Annulla prossimo attacco nemico e scarica 4 tacche malus.', traits: [{ type: 'recoil_halved', reductionPct: 0.80 }], absorbHit: true, dischargeMalus: 4 },
      4: { desc: '[2Âª AbilitÃ ] Rinculo ridotto dell\'80% e immunitÃ  totale a Perdita HP Immediata.', activeDesc: 'Annulla prossimo attacco + Azzera totalmente Barra Malus.', traits: [{ type: 'recoil_halved', reductionPct: 0.80 }, { type: 'malus_drain_immunity' }], absorbHit: true, dischargeMalus: 6 },
      5: { desc: 'Rinculo ridotto dell\'85% e immunitÃ  Perdita HP.', activeDesc: 'Annulla attacco, azzera malus e riflette 10 HP al nemico.', traits: [{ type: 'recoil_halved', reductionPct: 0.85 }, { type: 'malus_drain_immunity' }], absorbHit: true, dischargeMalus: 6, reflectDmg: 10 },
            6: { desc: 'Rinculo ridotto del 90% e immunità Perdita HP.', activeDesc: 'Annulla attacco, azzera malus e riflette 20 HP puri.', traits: [{ type: 'recoil_halved', reductionPct: 0.90 }, { type: 'malus_drain_immunity' }], absorbHit: true, dischargeMalus: 6, reflectDmg: 20 }

    },
    bgGradient: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(148, 163, 184, 0.4))'
  },

  // 11. ACQUARIO (Super Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'aquarius',
    name: 'Acquario (Catalizzatore Etere)',
    element: 'Aria',
    type: 'zodiac',
    tier: 3,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'AQ',
    color: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.75)',
    desc: 'Modulo Ibrido: Sintesi Istantanea Etere + Risonanza Dorata. Passiva: Sconto Jolly + Cura Eterea.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1600, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2500, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3800, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Il Jolly Quantico costa 1 Etere (invece di 2).', activeDesc: 'Genera subito +2 Etere Cosmico 🔮.', traits: [{ type: 'joker_cost_discount', discount: 1 }], grantEther: 2 },
      2: { desc: 'Jolly a 1 Etere e inizi ogni match con +1 Etere.', activeDesc: 'Genera subito +3 Etere Cosmico 🔮.', traits: [{ type: 'joker_cost_discount', discount: 1 }, { type: 'initial_ether_bonus', amount: 1 }], grantEther: 3 },
      3: { desc: 'Jolly a 1 Etere e inizi ogni match con +2 Etere.', activeDesc: 'Genera subito +4 Etere Cosmico 🔮.', traits: [{ type: 'joker_cost_discount', discount: 1 }, { type: 'initial_ether_bonus', amount: 2 }], grantEther: 4 },
      4: { desc: '[2Âª AbilitÃ ] Jolly a 1 Etere e spendere Etere cura +10% HP Max.', activeDesc: 'Genera +4 Etere + Trasforma 1 carta in Carta Dorata [2T].', traits: [{ type: 'joker_cost_discount', discount: 1 }, { type: 'initial_ether_bonus', amount: 2 }, { type: 'ether_spend_heal', healPct: 0.10 }], grantEther: 4, makeGolden: true },
      5: { desc: 'Spendere Etere cura +15% HP Max e inizi con +3 Etere.', activeDesc: 'Genera +5 Etere + Trasforma 1 carta in Carta Dorata [2T].', traits: [{ type: 'joker_cost_discount', discount: 1 }, { type: 'initial_ether_bonus', amount: 3 }, { type: 'ether_spend_heal', healPct: 0.15 }], grantEther: 5, makeGolden: true },
      6: { desc: 'Spendere Etere cura +20% HP Max e pescare dal mazzo costa -2 Etere.', activeDesc: 'Genera +6 Etere + 2 Carte Dorate garantite in mano.', traits: [{ type: 'joker_cost_discount', discount: 1 }, { type: 'initial_ether_bonus', amount: 3 }, { type: 'ether_spend_heal', healPct: 0.20 }, { type: 'deck_extract_discount', cost: 2 }], grantEther: 6, makeGolden: true, doubleGolden: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(12, 74, 110, 0.8), rgba(14, 165, 233, 0.4))'
  },

  // 12. PESCI (Super Rara - Effetto Doppio - Max Livello 6)
  {
    id: 'pisces',
    name: 'Pesci (Tolleranza Quantica)',
    element: 'Acqua',
    type: 'zodiac',
    tier: 3,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'PI',
    color: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.75)',
    desc: 'Modulo Ibrido: Tolleranza Calcolo Istantanea + Ricarica Tempo. Passiva: Scarto numerico valido + Danno tolleranza.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1600, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2500, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3800, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5500, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Scarto numerico di +-1 dal target valido per l\'attacco.', activeDesc: 'Valida qualsiasi calcolo con scarto +-2 per questo turno.', traits: [{ type: 'tolerance_margin', margin: 1 }], activeMargin: 2 },
      2: { desc: 'Scarto numerico di +-2 dal target valido per l\'attacco.', activeDesc: 'Valida calcoli con scarto +-3 per questo turno.', traits: [{ type: 'tolerance_margin', margin: 2 }], activeMargin: 3 },
      3: { desc: 'Scarto +-2 e calcolo con tolleranza assegna +5s al serbatoio.', activeDesc: 'Valida scarto +-3 e accredita +10s al Time Tank.', traits: [{ type: 'tolerance_margin', margin: 2 }, { type: 'tolerance_time_reward', bonusSeconds: 5 }], activeMargin: 3, activeTime: 10 },
      4: { desc: '[2Âª AbilitÃ ] Scarto +-2, +5s tempo e +5 HP danno con tolleranza.', activeDesc: 'Valida scarto +-4 + Aggiunge +10 HP danno puro all\'attacco.', traits: [{ type: 'tolerance_margin', margin: 2 }, { type: 'tolerance_time_reward', bonusSeconds: 5 }, { type: 'tolerance_flat_dmg', bonus: 5 }], activeMargin: 4, activeDmg: 10 },
      5: { desc: 'Scarto +-2, +8s tempo e +8 HP danno con tolleranza.', activeDesc: 'Valida scarto +-4 + Aggiunge +15 HP danno puro all\'attacco.', traits: [{ type: 'tolerance_margin', margin: 2 }, { type: 'tolerance_time_reward', bonusSeconds: 8 }, { type: 'tolerance_flat_dmg', bonus: 8 }], activeMargin: 4, activeDmg: 15 },
      6: { desc: 'Scarto +-3, +12s tempo e +14 HP danno con tolleranza.', activeDesc: 'Valida scarto +-5 + Aggiunge +25 HP danno puro all\'attacco.', traits: [{ type: 'tolerance_margin', margin: 3 }, { type: 'tolerance_time_reward', bonusSeconds: 12 }, { type: 'tolerance_flat_dmg', bonus: 14 }], activeMargin: 5, activeDmg: 25 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(99, 102, 241, 0.4))'
  },

  // ==========================================================================
  // I 20 MAZZI PLANETARI (P1-P4 SINGOLI / P5-P14 DOPPI / P15-P20 TRIPLI)
  // ==========================================================================

  // P1 TERRA (Comune - Singolo - Max Livello 3)
  {
    id: 'planet_char_1',
    name: 'Terra (Gaia)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 1,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'P1',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.75)',
    desc: 'Modulo Attivo: Sovraccarico Ricompense Vittoria. Passiva: Estrazione Polvere da Quadri.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Carte Quadri (â™¦) estraggono +4 Polvere (invece di +2).', activeDesc: '+30% Crediti e Polvere se vinci la partita.', traits: [{ type: 'suit_dust_boost', suit: 'diamonds', bonus: 2 }, { type: 'victory_reward_mult', mult: 1.15 }] },
      2: { desc: 'Carte Quadri (â™¦) estraggono +6 Polvere.', activeDesc: '+50% Crediti e Polvere se vinci la partita.', traits: [{ type: 'suit_dust_boost', suit: 'diamonds', bonus: 4 }, { type: 'victory_reward_mult', mult: 1.30 }] },
      3: { desc: 'Carte Quadri (â™¦) estraggono +9 Polvere e vittoria assegna +50% risorse fisso.', activeDesc: '+80% Crediti e Polvere se vinci la partita.', traits: [{ type: 'suit_dust_boost', suit: 'diamonds', bonus: 7 }, { type: 'victory_reward_mult', mult: 1.50 }] }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(56, 189, 248, 0.35))'
  },


  // P2 MARTE (Comune - Singolo - Max Livello 3)
  {
    id: 'planet_char_2',
    name: 'Marte (Tharsis)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 2,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'P2',
    color: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.75)',
    desc: 'Modulo Attivo: Bombardamento Orbitale. Passiva: Danni progressivi per attacchi consecutivi.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Ogni attacco consecutivo a segno aumenta il danno di +3 HP.', activeDesc: 'Scarica 18 HP di Danno Termico.', traits: [{ type: 'streak_damage_buildup', bonusPerHit: 3 }], activeDamage: 18 },
      2: { desc: 'Ogni attacco consecutivo a segno aumenta il danno di +6 HP.', activeDesc: 'Scarica 25 HP di Danno Termico.', traits: [{ type: 'streak_damage_buildup', bonusPerHit: 6 }], activeDamage: 25 },
      3: { desc: 'Ogni attacco consecutivo +10 HP danno e al 3Â° colpo attiva Critico x1.5.', activeDesc: 'Scarica 35 HP di Danno Termico.', traits: [{ type: 'streak_damage_buildup', bonusPerHit: 10 }, { type: 'streak_crit_trigger', hitsRequired: 3, critMult: 1.5 }], activeDamage: 35 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(244, 63, 94, 0.35))'
  },

  // P3 VENERE (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_3',
    name: 'Venere (Afrodite)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 3,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P3',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.75)',
    desc: 'Modulo Ibrido: Cambio Carte Istantaneo Gratuito + Rigenerazione. Passiva: Annullamento costi cambio carte.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3200, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4800, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Cambiare carte non consuma secondi dal timer.', activeDesc: 'Cambia fino a 3 carte a costo zero.', traits: [{ type: 'free_exchange_time' }], freeExchange: true },
      2: { desc: 'Cambio carte senza perdita di tempo e senza cura avversaria.', activeDesc: 'Cambia 3 carte gratis e cura +8% HP.', traits: [{ type: 'free_exchange_time' }, { type: 'exchange_no_enemy_heal' }], freeExchange: true, healPct: 0.08 },
      3: { desc: 'Cambio carte gratis a 0 HP, no tempo, no cura avversaria.', activeDesc: 'Cambia 3 carte gratis e cura +15% HP.', traits: [{ type: 'free_exchange_time' }, { type: 'exchange_no_enemy_heal' }, { type: 'free_exchange_no_self_dmg' }], freeExchange: true, healPct: 0.15 },
      4: { desc: '[2Âª AbilitÃ ] Cambio carte gratis e cambiare carte rigenera +5% HP Max.', activeDesc: 'Cambia carte gratis, cura +15% HP e rimuove 2 tacche malus.', traits: [{ type: 'free_exchange_time' }, { type: 'exchange_no_enemy_heal' }, { type: 'free_exchange_no_self_dmg' }, { type: 'exchange_heal_pct', bonusPct: 0.05 }], freeExchange: true, healPct: 0.15, purgeMalus: 2 },
      5: { desc: 'Cambiare carte rigenera +8% HP Max.', activeDesc: 'Cambia carte gratis, cura +20% HP e rimuove 3 tacche malus.', traits: [{ type: 'free_exchange_time' }, { type: 'exchange_no_enemy_heal' }, { type: 'free_exchange_no_self_dmg' }, { type: 'exchange_heal_pct', bonusPct: 0.08 }], freeExchange: true, healPct: 0.20, purgeMalus: 3 },
      6: { desc: 'Cambiare carte rigenera +12% HP Max e assegna +5s al Time Tank.', activeDesc: 'Cambia carte gratis, cura +25% HP, azzera malus e dona +15s.', traits: [{ type: 'free_exchange_time' }, { type: 'exchange_no_enemy_heal' }, { type: 'free_exchange_no_self_dmg' }, { type: 'exchange_heal_pct', bonusPct: 0.12 }], freeExchange: true, healPct: 0.25, purgeMalus: 6, addTime: 15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(139, 92, 246, 0.35))'
  },

  // P4 MERCURIO (Comune - Singolo - Max Livello 3)
  {
    id: 'planet_char_4',
    name: 'Mercurio (Termico)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 4,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'P4',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.75)',
    desc: 'Modulo Attivo: Sovraccarico Dadi Quantici. Passiva: Riduzione requisiti tacche dadi.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Dadi Quantici richiedono 3 operatori (anzichÃ© 4).', activeDesc: 'Accende subito 2 tacche sui Dadi Quantici.', traits: [{ type: 'dice_notches_req', required: 3 }], grantNotches: 2 },
      2: { desc: 'Dadi richiedono 3 operatori e iniziano con 1 tacca accesa.', activeDesc: 'Accende subito 3 tacche sui Dadi Quantici.', traits: [{ type: 'dice_notches_req', required: 3 }, { type: 'dice_start_notch', count: 1 }], grantNotches: 3 },
      3: { desc: 'Dadi richiedono 2 soli operatori e ogni lancio infligge 5 HP danno puro.', activeDesc: 'Attiva istantaneamente il lancio dei Dadi Quantici.', traits: [{ type: 'dice_notches_req', required: 2 }, { type: 'dice_start_notch', count: 1 }, { type: 'dice_roll_burn', damage: 5 }], instantRoll: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(236, 72, 153, 0.35))'
  },

  // P5 GIOVE (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_5',
    name: 'Giove (Grande Macchia)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 5,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P5',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.75)',
    desc: 'Modulo Ibrido: Espansione Mano + Raffica Ciclonica. Passiva: Mano permanentemente a 8/9 carte + Danno carte.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2000, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3200, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 4800, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Mano aumentata permanentemente a 8 carte.', activeDesc: 'Pesca subito +2 carte dal mazzo.', traits: [{ type: 'hand_size_bonus', size: 8 }], drawCards: 2 },
      2: { desc: 'Mano a 8 carte e prima pesca mirata a costo 0 Etere.', activeDesc: 'Pesca +2 carte e la prima pesca mirata Ã¨ gratis.', traits: [{ type: 'hand_size_bonus', size: 8 }, { type: 'first_extract_free' }], drawCards: 2, freeExtract: true },
      3: { desc: 'Mano aumentata permanentemente a 9 carte.', activeDesc: 'Pesca +3 carte dal mazzo.', traits: [{ type: 'hand_size_bonus', size: 9 }, { type: 'first_extract_free' }], drawCards: 3, freeExtract: true },
      4: { desc: '[2Âª AbilitÃ ] Mano a 9 carte e +4 HP danno su formule da 3+ carte.', activeDesc: 'Pesca +3 carte + Infligge 15 HP di Danno Ciclonico.', traits: [{ type: 'hand_size_bonus', size: 9 }, { type: 'first_extract_free' }, { type: 'cards_count_flat_dmg', minCards: 3, bonus: 4 }], drawCards: 3, activeDamage: 15 },
      5: { desc: 'Mano a 9 carte e +7 HP danno su formule da 3+ carte.', activeDesc: 'Pesca +3 carte + Infligge 22 HP di Danno Ciclonico.', traits: [{ type: 'hand_size_bonus', size: 9 }, { type: 'first_extract_free' }, { type: 'cards_count_flat_dmg', minCards: 3, bonus: 7 }], drawCards: 3, activeDamage: 22 },
      6: { desc: 'Mano a 9 carte e +12 HP danno su formule da 3+ carte.', activeDesc: 'Pesca +4 carte + Infligge 30 HP di Danno Ciclonico puro.', traits: [{ type: 'hand_size_bonus', size: 9 }, { type: 'first_extract_free' }, { type: 'cards_count_flat_dmg', minCards: 3, bonus: 12 }], drawCards: 4, activeDamage: 30 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(16, 185, 129, 0.35))'
  },

  // P6 SATURNO (Comune - Singolo - Max Livello 3)
  {
    id: 'planet_char_6',
    name: 'Saturno (Anelli di Crono)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 6,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'P6',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.75)',
    desc: 'Modulo Attivo: Rallentamento Cronotopico. Passiva: Estensione Barra Malus + Scudo Anulare (-50%).',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Barra Malus richiede 7 tacche (anzichÃ© 6) per il contraccolpo.', activeDesc: 'Sottrae 15s al timer nemico.', traits: [{ type: 'malus_capacity_bonus', extraTicks: 1 }], slowEnemy: 15 },
      2: { desc: 'Barra Malus richiede 8 tacche per il contraccolpo.', activeDesc: 'Sottrae 25s al timer nemico.', traits: [{ type: 'malus_capacity_bonus', extraTicks: 2 }], slowEnemy: 25 },
      3: { desc: 'Barra Malus richiede 9 tacche e Scudo Anulare dimezza (-50%) il primo colpo subito.', activeDesc: 'Dimezza il timer nemico e svuota 15s dal suo Time Tank.', traits: [{ type: 'malus_capacity_bonus', extraTicks: 3 }, { type: 'first_hit_shield', reductionPct: 0.50 }], slowEnemy: 30, drainTank: 15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(245, 158, 11, 0.35))'
  },

  // P7 URANO (Comune - Singolo - Max Livello 3)
  {
    id: 'planet_char_7',
    name: 'Urano (Sentinella Ionica)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 1,
    planetNum: 7,
    rarity: 'Comune',
    category: 'single',
    categoryName: 'Effetto Singolo',
    symbol: 'P7',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.75)',
    desc: 'Modulo Attivo: Blocco Totale Cambio Carte Nemico. Passiva: Bypass anomalie + Sovratensione.',
    unlockCostDust: 150,
    unlockCostDiamonds: 10,
    baseCostDust: 100,
    maxLevel: 3,
    upgradeCosts: {
      2: { dust: 450, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1100, diamonds: 5, reqPilotLevel: 25 }
    },
    levels: {
      1: { desc: 'Bypassa 1 volta per turno l\'operatore bloccato da anomalie.', activeDesc: 'Blocca il cambio carte nemico per 1 turno.', traits: [{ type: 'bypass_anomaly_op', usesPerTurn: 1 }], lockEnemyExchange: 1 },
      2: { desc: 'Bypassa 2 volte per turno l\'operatore bloccato da anomalie.', activeDesc: 'Blocca il cambio carte nemico per 2 turni.', traits: [{ type: 'bypass_anomaly_op', usesPerTurn: 2 }], lockEnemyExchange: 2 },
      3: { desc: 'ImmunitÃ  al blocco operatori e +6 HP danno alternando operatori diversi.', activeDesc: 'Blocca cambio carte nemico per 3 turni e infligge 15 HP di shock.', traits: [{ type: 'bypass_anomaly_op', usesPerTurn: 999 }, { type: 'rotation_ops_boost', bonus: 6 }], lockEnemyExchange: 3, activeDmg: 15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(6, 182, 212, 0.35))'
  },

  // P8 NETTUNO (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_8',
    name: 'Nettuno (Leviatano)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 8,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P8',
    color: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.75)',
    desc: 'Modulo Ibrido: Iniezione Jolly Quantici + Onda Abissale. Passiva: Mazzo personale con piÃ¹ Jolly.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Il tuo mazzo personale contiene 3 Jolly Quantici (anzichÃ© 2).', activeDesc: 'Genera subito 1 Jolly Quantico in mano.', traits: [{ type: 'joker_deck_count', count: 3 }], addJoker: 1 },
      2: { desc: 'Il tuo mazzo contiene 4 Jolly Quantici.', activeDesc: 'Genera 1 Jolly Quantico a valore libero (0 Etere).', traits: [{ type: 'joker_deck_count', count: 4 }], addJoker: 1, freeJokerVal: true },
      3: { desc: 'Il tuo mazzo contiene 5 Jolly Quantici.', activeDesc: 'Genera 2 Jolly Quantici in mano.', traits: [{ type: 'joker_deck_count', count: 5 }], addJoker: 2 },
      4: { desc: '[2Âª AbilitÃ ] Mazzo con 5 Jolly e giocare un Jolly infligge +5 HP danno.', activeDesc: 'Genera 2 Jolly + Scarica 15 HP di Danno Abissale.', traits: [{ type: 'joker_deck_count', count: 5 }, { type: 'joker_play_dmg', bonus: 5 }], addJoker: 2, activeDmg: 15 },
      5: { desc: 'Mazzo con 5 Jolly e giocare un Jolly infligge +8 HP danno.', activeDesc: 'Genera 2 Jolly + Scarica 22 HP di Danno Abissale.', traits: [{ type: 'joker_deck_count', count: 5 }, { type: 'joker_play_dmg', bonus: 8 }], addJoker: 2, activeDmg: 22 },
      6: { desc: 'Mazzo con 6 Jolly e giocare un Jolly infligge +14 HP danno puro.', activeDesc: 'Genera 2 Jolly + Scarica 30 HP Danno Puro e cura +15% HP.', traits: [{ type: 'joker_deck_count', count: 6 }, { type: 'joker_play_dmg', bonus: 14 }], addJoker: 2, activeDmg: 30, healPct: 0.15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(132, 204, 22, 0.35))'
  },

  // P9 PLUTONE (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_9',
    name: 'Plutone (Signore delle Ombre)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 9,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P9',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.75)',
    desc: 'Modulo Ibrido: Scarica Antimateria + Sifone Oscuro. Passiva: Patto di Sangue + Cura Transizione Boss.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Patto di Sangue: sacrifica 2 HP per +8 HP di danno su ogni colpo.', activeDesc: 'Sacrifica 6 HP per infliggere 22 HP di Danno Puro.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 8 }], selfDmg: 6, activeDmg: 22 },
      2: { desc: 'Patto di Sangue: sacrifica 2 HP per +13 HP di danno.', activeDesc: 'Sacrifica 6 HP per infliggere 30 HP di Danno Puro.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 13 }], selfDmg: 6, activeDmg: 30 },
      3: { desc: 'Patto di Sangue: sacrifica 2 HP per +20 HP di danno.', activeDesc: 'Sacrifica 6 HP per infliggere 40 HP di Danno Puro.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 20 }], selfDmg: 6, activeDmg: 40 },
      4: { desc: '[2Âª AbilitÃ ] Danno +20 HP e ogni cambio fase Boss rigenera +25 HP.', activeDesc: 'Sacrifica 6 HP per 40 HP danno + Rigenera subito 20 HP.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 20 }, { type: 'phase_clear_heal', hp: 25 }], selfDmg: 6, activeDmg: 40, healHp: 20 },
      5: { desc: 'Danno +24 HP e cambio fase Boss rigenera +35 HP.', activeDesc: 'Sacrifica 4 HP per 45 HP danno + Rigenera subito 25 HP.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 24 }, { type: 'phase_clear_heal', hp: 35 }], selfDmg: 4, activeDmg: 45, healHp: 25 },
      6: { desc: 'Danno +30 HP puro e cambio fase Boss rigenera +50 HP.', activeDesc: 'Sacrifica 4 HP per 55 HP danno + Rigenera 35 HP e ruba 10s nemici.', traits: [{ type: 'blood_damage', selfDamage: 2, bonusDamage: 30 }, { type: 'phase_clear_heal', hp: 50 }], selfDmg: 4, activeDmg: 55, healHp: 35, drainTime: 10 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(56, 189, 248, 0.35))'
  },

  // P10 TITANO (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_10',
    name: 'Titano (Colosso di Metano)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 10,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P10',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.75)',
    desc: 'Modulo Ibrido: Spine Difensive Reattive + Cappa di Metano. Passiva: Danno riflesso + Protezione da critici.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Spine: riflette 4 HP di danno fisso a ogni colpo subito.', activeDesc: 'Riflette il 40% del prossimo danno subito.', traits: [{ type: 'thorns_damage', value: 4 }], reflectPct: 0.40 },
      2: { desc: 'Spine: riflette 7 HP di danno fisso a ogni colpo subito.', activeDesc: 'Riflette il 60% del prossimo danno subito.', traits: [{ type: 'thorns_damage', value: 7 }], reflectPct: 0.60 },
      3: { desc: 'Spine: riflette 11 HP di danno fisso a ogni colpo subito.', activeDesc: 'Riflette l\'80% del prossimo danno subito.', traits: [{ type: 'thorns_damage', value: 11 }], reflectPct: 0.80 },
      4: { desc: '[2Âª AbilitÃ ] Spine 11 HP e riduce del 50% i danni da colpi critici nemici.', activeDesc: 'Riflette l\'80% danno + Riduce del 50% tutti i danni per 2 turni.', traits: [{ type: 'thorns_damage', value: 11 }, { type: 'crit_damage_reduction', reductionPct: 0.50 }], reflectPct: 0.80, damageCutPct: 0.50 },
      5: { desc: 'Spine 14 HP e riduce del 65% i critici nemici.', activeDesc: 'Riflette il 100% danno + Riduce del 60% i danni per 2 turni.', traits: [{ type: 'thorns_damage', value: 14 }, { type: 'crit_damage_reduction', reductionPct: 0.65 }], reflectPct: 1.00, damageCutPct: 0.60 },
      6: { desc: 'Spine 18 HP e riduce dell\'80% i critici nemici.', activeDesc: 'Riflette il 120% danno + ImmunitÃ  totale ai danni critici per 3 turni.', traits: [{ type: 'thorns_damage', value: 18 }, { type: 'crit_damage_reduction', reductionPct: 0.80 }], reflectPct: 1.20, damageCutPct: 0.75 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(250, 204, 21, 0.35))'
  },

  // P11 EUROPA (Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_11',
    name: 'Europa (Idra Criogenica)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 11,
    rarity: 'Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P11',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.75)',
    desc: 'Modulo Ibrido: Pesca Mirata Istantanea + Danno Crioidrotermale. Passiva: Sconto Etere pesca + Danno [/].',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Pescare carte mirate dal mazzo costa 2 Etere (anzichÃ© 4).', activeDesc: 'Estrai subito 1 carta mirata dal mazzo a 0 Etere.', traits: [{ type: 'deck_extract_discount', cost: 2 }], freeExtractCount: 1 },
      2: { desc: 'Pescare carte mirate dal mazzo costa 1 Etere.', activeDesc: 'Estrai subito 1 carta mirata a 0 Etere e dona +10s.', traits: [{ type: 'deck_extract_discount', cost: 1 }], freeExtractCount: 1, addTime: 10 },
      3: { desc: 'Pesca mirata a 1 Etere ed estrae fino a 2 carte contemporaneamente.', activeDesc: 'Estrai 2 carte mirate a 0 Etere.', traits: [{ type: 'deck_extract_discount', cost: 1, multiExtract: 2 }], freeExtractCount: 2 },
      4: { desc: '[2Âª AbilitÃ ] Pesca mirata a 1 Etere e +5 HP danno su formule con Divisione [/].', activeDesc: 'Estrai 2 carte mirate + Scarica 16 HP Danno Puro su [/].', traits: [{ type: 'deck_extract_discount', cost: 1, multiExtract: 2 }, { type: 'op_flat_bonus', op: '/', bonus: 5 }], freeExtractCount: 2, activeDamage: 16 },
      5: { desc: 'Pesca mirata a 1 Etere e +8 HP danno su formule con Divisione [/].', activeDesc: 'Estrai 2 carte mirate + Scarica 24 HP Danno Puro su [/].', traits: [{ type: 'deck_extract_discount', cost: 1, multiExtract: 2 }, { type: 'op_flat_bonus', op: '/', bonus: 8 }], freeExtractCount: 2, activeDamage: 24 },
      6: { desc: 'Pesca mirata a 0 Etere e +14 HP danno su formule con Divisione [/].', activeDesc: 'Estrai 3 carte mirate + Scarica 32 HP Danno Puro su [/].', traits: [{ type: 'deck_extract_discount', cost: 0, multiExtract: 3 }, { type: 'op_flat_bonus', op: '/', bonus: 14 }], freeExtractCount: 3, activeDamage: 32 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(168, 85, 247, 0.35))'
  },

  // P12 GANIMEDE (Super Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_12',
    name: 'Ganimede (Titano d\'Acciaio)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 12,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P12',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.75)',
    desc: 'Modulo Ibrido: Attrazione Magnetica + Danno Alta DensitÃ . Passiva: Bonus danno e pesca con 3+ carte.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: '+6 HP danno su formule da 3 o piÃ¹ carte.', activeDesc: 'Scarica 16 HP di Danno Magnetico.', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 6 }], activeDamage: 16 },
      2: { desc: '+11 HP danno su formule da 3 o piÃ¹ carte.', activeDesc: 'Scarica 24 HP di Danno Magnetico.', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 11 }], activeDamage: 24 },
      3: { desc: '+18 HP danno su formule da 3 o piÃ¹ carte.', activeDesc: 'Scarica 32 HP di Danno Magnetico.', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 18 }], activeDamage: 32 },
      4: { desc: '[2Âª AbilitÃ ] Danno +18 HP e chiudere una formula a 3+ carte fa pescare +1 carta.', activeDesc: 'Scarica 32 HP Magnetico + Pesca subito 2 carte dal mazzo.', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 18 }, { type: 'high_density_draw', minCards: 3, drawCount: 1 }], activeDamage: 32, drawCards: 2 },
      5: { desc: 'Danno +22 HP e chiudere a 3+ carte fa pescare +1 carta e cura +5% HP.', activeDesc: 'Scarica 38 HP Magnetico + Pesca 2 carte e cura +10% HP.', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 22 }, { type: 'high_density_draw', minCards: 3, drawCount: 1 }], activeDamage: 38, drawCards: 2, healPct: 0.10 },
      6: { desc: 'Danno +28 HP e chiudere a 3+ carte fa pescare +2 carte e cura +10% HP.', activeDesc: 'Scarica 46 HP Puro + Pesca 3 carte e ricarica Time Tank (+15s).', traits: [{ type: 'high_density_damage', minCards: 3, bonus: 28 }, { type: 'high_density_draw', minCards: 3, drawCount: 2 }], activeDamage: 46, drawCards: 3, addTime: 15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(239, 68, 68, 0.35))'
  },

  // P13 KEPLER-186F (Super Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_13',
    name: 'Kepler-186f (Eco dei Mondi)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 13,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P13',
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.75)',
    desc: 'Modulo Ibrido: Purificazione Ambientale + Risonanza Nana Rossa. Passiva: ImmunitÃ  anomalie + Cura/Danno.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'ImmunitÃ  permanente ad anomalie e modificatori ambientali.', activeDesc: 'Rimuove ogni effetto anomalia attivo dal campo.', traits: [{ type: 'anomaly_immunity' }], clearAnomaly: true },
      2: { desc: 'ImmunitÃ  e curi +5% HP Max se un\'anomalia Ã¨ attiva sul campo.', activeDesc: 'Rimuove anomalia e rigenera +12% HP Max.', traits: [{ type: 'anomaly_immunity' }, { type: 'anomaly_heal_pct', bonusPct: 0.05 }], clearAnomaly: true, healPct: 0.12 },
      3: { desc: 'ImmunitÃ , curi +10% HP Max e infliggi +5 HP danno con anomalie.', activeDesc: 'Rimuove anomalia, rigenera +18% HP e infligge 15 HP danno.', traits: [{ type: 'anomaly_immunity' }, { type: 'anomaly_heal_pct', bonusPct: 0.10 }, { type: 'anomaly_damage_boost', bonus: 5 }], clearAnomaly: true, healPct: 0.18, activeDmg: 15 },
      4: { desc: '[2Âª AbilitÃ ] ImmunitÃ  anomalie e carte Cuori curano +2 HP fissi extra.', activeDesc: 'Rimuove anomalia + Tutte le carte in mano diventano Cuori (â™¥).', traits: [{ type: 'anomaly_immunity' }, { type: 'anomaly_heal_pct', bonusPct: 0.10 }, { type: 'anomaly_damage_boost', bonus: 5 }, { type: 'hearts_flat_heal', bonus: 2 }], clearAnomaly: true, convertHandSuit: 'hearts' },
      5: { desc: 'Carte Cuori curano +4 HP fissi extra e danno anomalie sale a +8 HP.', activeDesc: 'Rimuove anomalia + Converte mano in Cuori e cura +20% HP.', traits: [{ type: 'anomaly_immunity' }, { type: 'anomaly_heal_pct', bonusPct: 0.12 }, { type: 'anomaly_damage_boost', bonus: 8 }, { type: 'hearts_flat_heal', bonus: 4 }], clearAnomaly: true, convertHandSuit: 'hearts', healPct: 0.20 },
      6: { desc: 'Carte Cuori curano +7 HP fissi extra e danno anomalie sale a +14 HP.', activeDesc: 'Rimuove anomalia + Converte mano in Cuori Dorati e cura +30% HP.', traits: [{ type: 'anomaly_immunity' }, { type: 'anomaly_heal_pct', bonusPct: 0.15 }, { type: 'anomaly_damage_boost', bonus: 14 }, { type: 'hearts_flat_heal', bonus: 7 }], clearAnomaly: true, convertHandSuit: 'hearts', healPct: 0.30, makeGolden: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(20, 184, 166, 0.35))'
  },

  // P14 PROXIMA B (Super Rara - Doppio - Max Livello 6)
  {
    id: 'planet_char_14',
    name: 'Proxima b (Generatore del Caos)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 2,
    planetNum: 14,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'P14',
    color: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.75)',
    desc: 'Modulo Ibrido: Neutralizzazione Malus + Furia Caotica. Passiva: ImmunitÃ  totale a contraccolpi + Danno a bassa vita.',
    unlockCostDust: 350,
    unlockCostDiamonds: 20,
    baseCostDust: 200,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 650, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1400, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2200, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3500, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5000, diamonds: 20, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'ImmunitÃ  al malus Mano Ridotta (5 carte).', activeDesc: 'Azzera le tacche della tua Barra Malus.', traits: [{ type: 'malus_hand_immunity' }], resetPlayerMalus: true },
      2: { desc: 'ImmunitÃ  a Mano Ridotta e Blocco AbilitÃ  (2 turni).', activeDesc: 'Azzera Barra Malus e trasferisce 2 tacche al nemico.', traits: [{ type: 'malus_hand_immunity' }, { type: 'malus_lock_immunity' }], resetPlayerMalus: true, transferMalus: 2 },
      3: { desc: 'ImmunitÃ  assoluta a tutti i 7 effetti contraccolpo della Barra Malus.', activeDesc: 'Azzera Barra Malus e riempie istantaneamente la barra nemica (Contraccolpo).', traits: [{ type: 'malus_hand_immunity' }, { type: 'malus_lock_immunity' }, { type: 'full_malus_immunity' }], resetPlayerMalus: true, fillEnemyMalus: true },
      4: { desc: '[2Âª AbilitÃ ] ImmunitÃ  Malus e +6 HP danno su tutti gli attacchi con HP < 50%.', activeDesc: 'Innesca contraccolpo nemico + Scarica 18 HP Danno da Furia.', traits: [{ type: 'malus_hand_immunity' }, { type: 'malus_lock_immunity' }, { type: 'full_malus_immunity' }, { type: 'low_hp_rage_dmg', thresholdPct: 0.5, bonus: 6 }], fillEnemyMalus: true, activeDamage: 18 },
      5: { desc: 'ImmunitÃ  Malus e +10 HP danno con HP < 50%.', activeDesc: 'Innesca contraccolpo nemico + Scarica 26 HP Danno da Furia.', traits: [{ type: 'malus_hand_immunity' }, { type: 'malus_lock_immunity' }, { type: 'full_malus_immunity' }, { type: 'low_hp_rage_dmg', thresholdPct: 0.5, bonus: 10 }], fillEnemyMalus: true, activeDamage: 26 },
      6: { desc: 'ImmunitÃ  Malus e +16 HP danno con HP < 50%.', activeDesc: 'Innesca contraccolpo nemico + Scarica 36 HP Danno Puro e cura +15% HP.', traits: [{ type: 'malus_hand_immunity' }, { type: 'malus_lock_immunity' }, { type: 'full_malus_immunity' }, { type: 'low_hp_rage_dmg', thresholdPct: 0.5, bonus: 16 }], fillEnemyMalus: true, activeDamage: 36, healPct: 0.15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(99, 102, 241, 0.35))'
  },

  // ==========================================================================
  // I 6 MAZZI PLANETARI TRIPLI (P15 - P20) â€” SCALA A 9 LIVELLI (APOTEOSI)
  // ==========================================================================

  // P15 TRAPPIST-1E (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_15',
    name: 'TRAPPIST-1e (Arconte dei Sette)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 15,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P15',
    color: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.75)',
    desc: 'Modulo Ibrido: Percentuale HP Nemico + Sintesi Diamanti + Risonanza Armonica. Passiva: Multi-Seme x3.5 + Diamanti + Cura.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: 'Combo Multi-Seme moltiplica il danno x2.5.', activeDesc: 'Colpisce per il 15% degli HP attuali nemici.', traits: [{ type: 'combo_4suits_mult', mult: 2.5 }], activePercentDamage: 0.15 },
      2: { desc: 'Combo Multi-Seme moltiplica il danno x3.0.', activeDesc: 'Colpisce per il 20% degli HP attuali nemici.', traits: [{ type: 'combo_4suits_mult', mult: 3.0 }], activePercentDamage: 0.20 },
      3: { desc: 'Combo Multi-Seme moltiplica il danno x3.5.', activeDesc: 'Colpisce per il 25% degli HP attuali nemici.', traits: [{ type: 'combo_4suits_mult', mult: 3.5 }], activePercentDamage: 0.25 },
      4: { desc: '[2Âª AbilitÃ ] Multi-Seme x3.5 ed eroga +1 Diamante 💎 garantito.', activeDesc: 'Colpisce per 25% HP nemici + Sintetizza 1 Diamante 💎.', traits: [{ type: 'combo_4suits_mult', mult: 3.5, bonusDiamonds: 1 }], activePercentDamage: 0.25, grantDiamonds: 1 },
      5: { desc: 'Multi-Seme x3.5 ed eroga +2 Diamanti 💎 garantiti.', activeDesc: 'Colpisce per 25% HP nemici + Sintetizza 2 Diamanti 💎.', traits: [{ type: 'combo_4suits_mult', mult: 3.5, bonusDiamonds: 2 }], activePercentDamage: 0.25, grantDiamonds: 2 },
      6: { desc: 'Multi-Seme x3.8 ed eroga +2 Diamanti 💎 e +50 Polvere 🌟.', activeDesc: 'Colpisce per 30% HP nemici + 2 Diamanti 💎 e 50 Polvere 🌟.', traits: [{ type: 'combo_4suits_mult', mult: 3.8, bonusDiamonds: 2 }], activePercentDamage: 0.30, grantDiamonds: 2, grantDust: 50 },
      7: { desc: '[3Âª AbilitÃ ] Multi-Seme x3.8, +2💎 e completare la Multi-Seme rigenera +10% HP Max.', activeDesc: '30% HP nemici + 2 Diamanti + Rigenera +15% HP Max.', traits: [{ type: 'combo_4suits_mult', mult: 3.8, bonusDiamonds: 2 }, { type: 'combo_multisuit_heal', healPct: 0.10 }], activePercentDamage: 0.30, grantDiamonds: 2, healPct: 0.15 },
      8: { desc: 'Multi-Seme x4.0, +3💎 e cura sale a +15% HP Max.', activeDesc: '35% HP nemici + 3 Diamanti + Rigenera +20% HP Max.', traits: [{ type: 'combo_4suits_mult', mult: 4.0, bonusDiamonds: 3 }, { type: 'combo_multisuit_heal', healPct: 0.15 }], activePercentDamage: 0.35, grantDiamonds: 3, healPct: 0.20 },
      9: { desc: 'Apoteosi: Multi-Seme x4.5, +4💎, cura +25% HP e raddoppia tutte le risorse vinte.', activeDesc: 'Colpisce per 40% HP nemici + 4 Diamanti + Rigenera +30% HP Max.', traits: [{ type: 'combo_4suits_mult', mult: 4.5, bonusDiamonds: 4 }, { type: 'combo_multisuit_heal', healPct: 0.25 }, { type: 'victory_reward_mult', mult: 2.0 }], activePercentDamage: 0.40, grantDiamonds: 4, healPct: 0.30 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(217, 70, 239, 0.35))'
  },

  // P16 GLIESE 581G (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_16',
    name: 'Gliese 581g (Custode di Lagrange)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 16,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P16',
    color: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.75)',
    desc: 'Modulo Ibrido: Generatore Etere + Trasmutazione Alto Valore + Equilibrio di Lagrange.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: '+1 Etere Cosmico ogni 2 attacchi andati a segno.', activeDesc: 'Genera +2 Etere Cosmico 🔮.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 2, amount: 1 }], grantEther: 2 },
      2: { desc: '+2 Etere Cosmico ogni 2 attacchi andati a segno.', activeDesc: 'Genera +3 Etere Cosmico 🔮.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 2, amount: 2 }], grantEther: 3 },
      3: { desc: '+2 Etere Cosmico per ogni singolo attacco a segno.', activeDesc: 'Genera +4 Etere Cosmico 🔮.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }], grantEther: 4 },
      4: { desc: '[2Âª AbilitÃ ] Etere a segno e inizi ogni match con +2 Etere Cosmico.', activeDesc: 'Genera +4 Etere + Converte 1 carta della mano al valore 9.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }, { type: 'initial_ether_bonus', amount: 2 }], grantEther: 4, convertCardVal: 9, convertCount: 1 },
      5: { desc: 'Etere a segno e inizi ogni match con +3 Etere Cosmico.', activeDesc: 'Genera +5 Etere + Converte 2 carte della mano al valore 9.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }, { type: 'initial_ether_bonus', amount: 3 }], grantEther: 5, convertCardVal: 9, convertCount: 2 },
      6: { desc: 'Etere a segno e inizi ogni match con +4 Etere Cosmico.', activeDesc: 'Genera +6 Etere + Converte 3 carte della mano al valore 10.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }, { type: 'initial_ether_bonus', amount: 4 }], grantEther: 6, convertCardVal: 10, convertCount: 3 },
      7: { desc: '[3Âª AbilitÃ ] Etere a segno, +4 Etere iniziale e le carte 9-10 infliggono +4 HP danno.', activeDesc: 'Genera +6 Etere, converte 3 carte in 10 e cura +15% HP.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }, { type: 'initial_ether_bonus', amount: 4 }, { type: 'court_card_damage', minVal: 9, bonus: 4 }], grantEther: 6, convertCardVal: 10, convertCount: 3, healPct: 0.15 },
      8: { desc: 'Carte 9-10 infliggono +7 HP danno e +2s nel Time Tank.', activeDesc: 'Genera +7 Etere, converte 3 carte in 10 e cura +20% HP.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 2 }, { type: 'initial_ether_bonus', amount: 4 }, { type: 'court_card_damage', minVal: 9, bonus: 7 }], grantEther: 7, convertCardVal: 10, convertCount: 3, healPct: 0.20 },
      9: { desc: 'Apoteosi: +3 Etere per attacco, +5 Etere iniziale, carte 9-13 infliggono +12 HP puro.', activeDesc: 'Ricarica Etere al massimo, trasforma 3 carte in Re (13) Dorati e cura +30% HP.', traits: [{ type: 'ether_generation_on_hit', hitsRequired: 1, amount: 3 }, { type: 'initial_ether_bonus', amount: 5 }, { type: 'court_card_damage', minVal: 9, bonus: 12 }], grantEther: 10, convertCardVal: 13, convertCount: 3, healPct: 0.30, makeGolden: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(14, 165, 233, 0.35))'
  },

  // P17 HAUMEA (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_17',
    name: 'Haumea (Cristallo di Risonanza)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 17,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P17',
    color: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.75)',
    desc: 'Modulo Ibrido: Spinta Cinetica + Momento Rotazionale + Mimesi Neurale.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: '+6 HP danno extra se attacchi entro i primi 10s del turno.', activeDesc: 'Aggiunge +15 HP danno al prossimo attacco rapido.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 6 }], activeSpeedDmg: 15 },
      2: { desc: '+10 HP danno extra se attacchi entro 10s.', activeDesc: 'Aggiunge +22 HP danno al prossimo attacco rapido.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 10 }], activeSpeedDmg: 22 },
      3: { desc: '+15 HP danno extra se attacchi entro 10s.', activeDesc: 'Aggiunge +30 HP danno al prossimo attacco rapido.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 15 }], activeSpeedDmg: 30 },
      4: { desc: '[2Âª AbilitÃ ] Danno rapido +15 HP e ogni attacco entro 10s dona +5s al serbatoio.', activeDesc: '+30 HP danno rapido + Dona +15s al Time Tank.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 15 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 5 }], activeSpeedDmg: 30, addTime: 15 },
      5: { desc: 'Danno rapido +18 HP e attacco entro 10s dona +8s al serbatoio.', activeDesc: '+35 HP danno rapido + Dona +22s al Time Tank.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 18 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 8 }], activeSpeedDmg: 35, addTime: 22 },
      6: { desc: 'Danno rapido +22 HP e attacco entro 10s dona +12s al serbatoio.', activeDesc: '+40 HP danno rapido + Riempie Time Tank al massimo (+30s).', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 22 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 12 }], activeSpeedDmg: 40, addTime: 30 },
      7: { desc: '[3Âª AbilitÃ ] Copia istantaneamente e attiva l\'effetto del modulo avversario.', activeDesc: 'Time Tank al max + Copia ed esegue l\'abilitÃ  nemica.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 22 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 12 }, { type: 'copy_enemy_skill' }], addTime: 30, copyEnemySkill: true },
      8: { desc: 'Copia abilitÃ  nemica potenziandola del +30% e danno rapido sale a +26 HP.', activeDesc: 'Time Tank al max + Copia abilitÃ  nemica potenziata del +30%.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 26 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 15 }, { type: 'copy_enemy_skill', boost: 1.3 }], addTime: 30, copyEnemySkill: true, copyBoost: 1.3 },
      9: { desc: 'Apoteosi: Danno rapido +32 HP, +20s nel tank e copia abilitÃ  nemica con danno raddoppiato.', activeDesc: 'Scarica 35 HP puri, riempie il tank e copia abilitÃ  nemica x2.0.', traits: [{ type: 'speed_damage_boost', thresholdSeconds: 10, bonus: 32 }, { type: 'speed_time_bonus', thresholdSeconds: 10, bonusSeconds: 20 }, { type: 'copy_enemy_skill', boost: 2.0 }], activeSpeedDmg: 35, addTime: 30, copyEnemySkill: true, copyBoost: 2.0 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(132, 204, 22, 0.35))'
  },

  // P18 ERIS (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_18',
    name: 'Eris (EntitÃ  della Discordia)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 18,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P18',
    color: '#f97316',
    glow: 'rgba(249, 115, 22, 0.75)',
    desc: 'Modulo Ibrido: Distruzione Serbatoio Nemico + Danno Puro + Punizione del Vuoto.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: 'Ogni colpo a segno distrugge 10s dal serbatoio tempo nemico.', activeDesc: 'Distrugge subito 15s dal Time Tank nemico.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 10 }], drainTank: 15 },
      2: { desc: 'Ogni colpo a segno distrugge 15s dal serbatoio nemico.', activeDesc: 'Distrugge subito 22s dal Time Tank nemico.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 15 }], drainTank: 22 },
      3: { desc: 'Ogni colpo distrugge 20s dal serbatoio nemico.', activeDesc: 'Svuota totalmente il Time Tank nemico a 0s.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 20 }], drainTank: 30 },
      4: { desc: '[2Âª AbilitÃ ] Distrugge 20s dal serbatoio e infligge +5 HP danno puro.', activeDesc: 'Azzera tank nemico + Infligge 16 HP Danno Puro.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 20 }, { type: 'drain_extra_dmg', bonus: 5 }], drainTank: 30, activeDmg: 16 },
      5: { desc: 'Distrugge 20s dal serbatoio e infligge +8 HP danno puro.', activeDesc: 'Azzera tank nemico + Infligge 24 HP Danno Puro.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 20 }, { type: 'drain_extra_dmg', bonus: 8 }], drainTank: 30, activeDmg: 24 },
      6: { desc: 'Distrugge 25s dal serbatoio e infligge +12 HP danno puro.', activeDesc: 'Azzera tank nemico + Infligge 32 HP Danno Puro.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 25 }, { type: 'drain_extra_dmg', bonus: 12 }], drainTank: 30, activeDmg: 32 },
      7: { desc: '[3Âª AbilitÃ ] Se il serbatoio nemico Ã¨ a 0s, infliggi +8 HP danno extra.', activeDesc: 'Azzera tank nemico, infligge 32 HP danno e +15 HP se tank era a 0s.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 25 }, { type: 'drain_extra_dmg', bonus: 12 }, { type: 'empty_tank_punish', bonus: 8 }], drainTank: 30, activeDmg: 32, emptyTankBonus: 15 },
      8: { desc: 'Se il serbatoio nemico Ã¨ a 0s, infliggi +12 HP danno extra.', activeDesc: 'Azzera tank nemico, infligge 38 HP danno e +22 HP se tank a 0s.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 25 }, { type: 'drain_extra_dmg', bonus: 14 }, { type: 'empty_tank_punish', bonus: 12 }], drainTank: 30, activeDmg: 38, emptyTankBonus: 22 },
      9: { desc: 'Apoteosi: Distrugge 30s, +16 HP danno e +20 HP punizione su serbatoio a zero.', activeDesc: 'Azzera tank nemico, riduce timer a 10s e infligge 50 HP di Danno Puro.', traits: [{ type: 'drain_enemy_tank', drainSeconds: 30 }, { type: 'drain_extra_dmg', bonus: 16 }, { type: 'empty_tank_punish', bonus: 20 }], drainTank: 30, enemyTimerCap: 10, activeDmg: 50 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(249, 115, 22, 0.35))'
  },

  // P19 IO (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_19',
    name: 'Io (Nucleo Magmatico)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 19,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P19',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.75)',
    desc: 'Modulo Ibrido: Eruzione Vulcanica + Ustione Continua + Sovraccarico Moduli.',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: 'Ogni attacco applica 3 danni residui da ustione per 2 turni.', activeDesc: 'Scarica 18 HP di Danno Magmatico.', traits: [{ type: 'burn_damage_passive', burnDmg: 3, duration: 2 }], activeDmg: 18 },
      2: { desc: 'Ogni attacco applica 5 danni residui da ustione per 2 turni.', activeDesc: 'Scarica 25 HP di Danno Magmatico.', traits: [{ type: 'burn_damage_passive', burnDmg: 5, duration: 2 }], activeDmg: 25 },
      3: { desc: 'Ogni attacco applica 7 danni da ustione per 3 turni consecutivi.', activeDesc: 'Scarica 32 HP di Danno Magmatico.', traits: [{ type: 'burn_damage_passive', burnDmg: 7, duration: 3 }], activeDmg: 32 },
      4: { desc: '[2Âª AbilitÃ ] Ustione 7 HP e ogni tick di ustione carica il tuo Modulo del +5%.', activeDesc: 'Scarica 32 HP Danno + Applica 8 HP ustione per 3 turni.', traits: [{ type: 'burn_damage_passive', burnDmg: 7, duration: 3 }, { type: 'burn_tick_charge_module', chargePct: 0.05 }], activeDmg: 32, applyBurn: 8 },
      5: { desc: 'Ustione 9 HP e ogni tick di ustione carica il Modulo del +8%.', activeDesc: 'Scarica 38 HP Danno + Applica 10 HP ustione per 3 turni.', traits: [{ type: 'burn_damage_passive', burnDmg: 9, duration: 3 }, { type: 'burn_tick_charge_module', chargePct: 0.08 }], activeDmg: 38, applyBurn: 10 },
      6: { desc: 'Ustione 12 HP e ogni tick di ustione carica il Modulo del +12%.', activeDesc: 'Scarica 45 HP Danno + Applica 14 HP ustione per 3 turni.', traits: [{ type: 'burn_damage_passive', burnDmg: 12, duration: 3 }, { type: 'burn_tick_charge_module', chargePct: 0.12 }], activeDmg: 45, applyBurn: 14 },
      7: { desc: '[3Âª AbilitÃ ] Danni da moltiplicazione [*] infliggono un ulteriore +6 HP di calore puro.', activeDesc: 'Scarica 45 HP + Applica 14 HP ustione + Ricarica Modulo del 30%.', traits: [{ type: 'burn_damage_passive', burnDmg: 12, duration: 3 }, { type: 'burn_tick_charge_module', chargePct: 0.12 }, { type: 'op_flat_bonus', op: '*', bonus: 6 }], activeDmg: 45, applyBurn: 14, rechargeModule: 0.30 },
      8: { desc: 'Danni da moltiplicazione [*] infliggono +10 HP di calore puro.', activeDesc: 'Scarica 52 HP + Applica 18 HP ustione + Ricarica Modulo del 40%.', traits: [{ type: 'burn_damage_passive', burnDmg: 14, duration: 3 }, { type: 'burn_tick_charge_module', chargePct: 0.15 }, { type: 'op_flat_bonus', op: '*', bonus: 10 }], activeDmg: 52, applyBurn: 18, rechargeModule: 0.40 },
      9: { desc: 'Apoteosi: Ustione 16 HP per 4T, ricarica modulo +15% a tick e +15 HP su moltiplicazione.', activeDesc: 'Scarica 60 HP Puro, applica 20 HP ustione per 4T e ricarica il Modulo al 50%.', traits: [{ type: 'burn_damage_passive', burnDmg: 16, duration: 4 }, { type: 'burn_tick_charge_module', chargePct: 0.15 }, { type: 'op_flat_bonus', op: '*', bonus: 15 }], activeDmg: 60, applyBurn: 20, rechargeModule: 0.50 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(148, 163, 184, 0.35))'
  },
  

  // P20 ENCELADO (Leggendaria - Triplo - Max Livello 9)
  {
    id: 'planet_char_20',
    name: 'Encelado (Sovrano del Vuoto)',
    element: 'Cosmo',
    type: 'planet_char',
    tier: 3,
    planetNum: 20,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'P20',
    color: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.75)',
    desc: 'Modulo Ibrido: Sovrano del Vuoto (Auto-Rianimazione + Zero Assoluto Nemico + Scarica Plasma Puro).',
    unlockCostDust: 750,
    unlockCostDiamonds: 30,
    baseCostDust: 350,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 700, diamonds: 0, reqPilotLevel: 12 },
      3: { dust: 1500, diamonds: 5, reqPilotLevel: 25 },
      4: { dust: 2400, diamonds: 10, reqPilotLevel: 35 },
      5: { dust: 3600, diamonds: 15, reqPilotLevel: 48 },
      6: { dust: 5200, diamonds: 20, reqPilotLevel: 60 },
      7: { dust: 7200, diamonds: 30, reqPilotLevel: 70 },
      8: { dust: 9800, diamonds: 40, reqPilotLevel: 82 },
      9: { dust: 14000, diamonds: 50, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: 'Al primo collasso letale ti rianima a 15 HP senza consumare Vite.', activeDesc: 'Rigenera subito +20% HP Max.', traits: [{ type: 'auto_revive_free', hp: 15 }], activeHealPct: 0.20 },
      2: { desc: 'Al primo collasso letale ti rianima con il 25% degli HP Massimi.', activeDesc: 'Rigenera subito +30% HP Max.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.25 }], activeHealPct: 0.30 },
      3: { desc: 'Al primo collasso letale ti rianima con il 45% degli HP Massimi.', activeDesc: 'Rigenera subito +45% HP Max.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.45 }], activeHealPct: 0.45 },
      4: { desc: '[2Âª AbilitÃ ] Rianimazione 45% e Zero Assoluto riduce di 10s il timer avversario.', activeDesc: 'Rigenera +45% HP Max + Congela 15s dal timer nemico.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.45 }, { type: 'revive_freeze_enemy', freezeSeconds: 10 }], activeHealPct: 0.45, freezeEnemySec: 15 },
      5: { desc: 'Rianimazione 50% e Zero Assoluto riduce di 15s il timer avversario.', activeDesc: 'Rigenera +50% HP Max + Congela 20s dal timer nemico.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.50 }, { type: 'revive_freeze_enemy', freezeSeconds: 15 }], activeHealPct: 0.50, freezeEnemySec: 20 },
      6: { desc: 'Rianimazione 60% e Zero Assoluto riduce di 20s il timer avversario.', activeDesc: 'Rigenera +60% HP Max + Congela 25s dal timer nemico.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.60 }, { type: 'revive_freeze_enemy', freezeSeconds: 20 }], activeHealPct: 0.60, freezeEnemySec: 25 },
      7: { desc: '[3Âª AbilitÃ ] Rianimazione 60%, -20s al nemico e scarica 15 HP di plasma puro alla rinascita.', activeDesc: 'Rigenera +60% HP, congela 25s e scarica 25 HP di Danno Puro.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.60 }, { type: 'revive_freeze_enemy', freezeSeconds: 20 }, { type: 'revive_blast_damage', damage: 15 }], activeHealPct: 0.60, freezeEnemySec: 25, activeDmg: 25 },
      8: { desc: 'Rianimazione 70%, -25s al nemico e scarica 25 HP di plasma puro.', activeDesc: 'Rigenera +70% HP, congela 30s e scarica 35 HP di Danno Puro.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.70 }, { type: 'revive_freeze_enemy', freezeSeconds: 25 }, { type: 'revive_blast_damage', damage: 25 }], activeHealPct: 0.70, freezeEnemySec: 30, activeDmg: 35 },
      9: { desc: 'Apoteosi: Rianimazione 80% HP Max, azzera serbatoio nemico e scarica 40 HP Danno Puro.', activeDesc: 'Rigenera +80% HP Max, azzera timer nemico a 10s e scarica 50 HP Danno Puro.', traits: [{ type: 'auto_revive_free_pct', hpPct: 0.80 }, { type: 'revive_freeze_enemy', freezeSeconds: 30 }, { type: 'revive_blast_damage', damage: 40 }], activeHealPct: 0.80, freezeEnemySec: 30, activeDmg: 50 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(2, 6, 23, 0.9), rgba(6, 182, 212, 0.35))'
  },

  // ==========================================================================
  // SBLOCCHI ESCLUSIVI DELLA ROTTA DELLE CAPSULE STELLARI
  // ==========================================================================

  // 1. MODULO SINGOLARITÃ€ / BUCO NERO (CAPSULA 210 â­)
  {
    id: 'singularity_core',
    name: 'Modulo SingolaritÃ  (Buco Nero)',
    element: 'Cosmo',
    type: 'capsule_exclusive',
    tier: 2,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'BH',
    color: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.85)',
    exclusiveStarMilestone: 210,
    desc: 'Modulo Gravitazionale Esclusivo: risucchia salute nemica e implode il tempo di riserva avversario.',
    unlockCostDust: 0,
    unlockCostDiamonds: 0,
    baseCostDust: 300,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 450, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 12 },
      3: { dust: 1100, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 25 },
      4: { dust: 2200, voidCrystals: 2, primordialMatter: 0, reqPilotLevel: 35 },
      5: { dust: 3500, voidCrystals: 4, primordialMatter: 0, reqPilotLevel: 48 },
      6: { dust: 5000, voidCrystals: 6, primordialMatter: 0, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'Passiva: Formule con [* /] assorbono 2 HP.', activeDesc: 'Risucchia il 15% degli HP nemici correnti.', traits: [{ type: 'hit_siphon', hp: 2 }], activePercentSiphon: 0.15 },
      2: { desc: 'Passiva: Formule con [* /] assorbono 4 HP.', activeDesc: 'Risucchia il 20% degli HP nemici correnti.', traits: [{ type: 'hit_siphon', hp: 4 }], activePercentSiphon: 0.20 },
      3: { desc: 'Passiva: Formule con [* /] assorbono 6 HP.', activeDesc: 'Risucchia il 25% degli HP nemici correnti.', traits: [{ type: 'hit_siphon', hp: 6 }], activePercentSiphon: 0.25 },
      4: { desc: '[2Âª AbilitÃ ] Risucchio 6 HP e riduce di 15s il tank nemico.', activeDesc: 'Risucchia il 25% HP nemici + Brucia 15s dal tank nemico.', traits: [{ type: 'hit_siphon', hp: 6 }, { type: 'drain_enemy_tank', drainSeconds: 15 }], activePercentSiphon: 0.25, drainTankSec: 15 },
      5: { desc: 'Risucchio 8 HP e riduce di 20s il tank nemico.', activeDesc: 'Risucchia il 25% HP nemici + Brucia 22s dal tank nemico.', traits: [{ type: 'hit_siphon', hp: 8 }, { type: 'drain_enemy_tank', drainSeconds: 20 }], activePercentSiphon: 0.25, drainTankSec: 22 },
      6: { desc: 'Risucchio 10 HP, brucia 25s e azzera il modulo nemico.', activeDesc: 'Risucchia il 30% HP nemici, svuota il tank a 0s e azzera il modulo avversario.', traits: [{ type: 'hit_siphon', hp: 10 }, { type: 'drain_enemy_tank', drainSeconds: 25 }], activePercentSiphon: 0.30, drainTankSec: 30, resetEnemyModule: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(46, 16, 101, 0.9), rgba(15, 23, 42, 0.95))'
  },

  // 2. MAZZO OPHIUCHUS / IL SERPENTARIO (CAPSULA 390 â­)
  {
    id: 'ophiuchus',
    name: 'Ophiuchus (Il Serpentario)',
    element: 'Cosmo',
    type: 'capsule_exclusive',
    tier: 2,
    rarity: 'Super Rara',
    category: 'double',
    categoryName: 'Effetto Doppio',
    symbol: 'OPH',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.85)',
    exclusiveStarMilestone: 390,
    desc: 'Il 13Â° Segno Escluso: immunitÃ  totale a tutte le anomalie di campo e tossicitÃ  neurotossica progressiva.',
    unlockCostDust: 0,
    unlockCostDiamonds: 0,
    baseCostDust: 300,
    maxLevel: 6,
    upgradeCosts: {
      2: { dust: 450, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 12 },
      3: { dust: 1100, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 25 },
      4: { dust: 2200, voidCrystals: 2, primordialMatter: 0, reqPilotLevel: 35 },
      5: { dust: 3500, voidCrystals: 4, primordialMatter: 0, reqPilotLevel: 48 },
      6: { dust: 5000, voidCrystals: 6, primordialMatter: 0, reqPilotLevel: 60 }
    },
    levels: {
      1: { desc: 'ImmunitÃ  permanente alle anomalie ambientali e +4 HP con Picche (â™ ).', activeDesc: 'Inietta veleno neurotossico (4 HP per 2 turni).', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 4 }], poisonDmg: 4 },
      2: { desc: 'ImmunitÃ  anomalie e +6 HP con Picche (â™ ).', activeDesc: 'Inietta veleno (6 HP per 2 turni).', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 6 }], poisonDmg: 6 },
      3: { desc: 'ImmunitÃ  anomalie e +9 HP con Picche (â™ ).', activeDesc: 'Inietta veleno (9 HP per 3 turni).', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 9 }], poisonDmg: 9 },
      4: { desc: '[2Âª AbilitÃ ] Picche +9 HP e formule da 3+ carte infliggono +6 HP fissi.', activeDesc: 'Inietta veleno 9 HP + Scarica 18 HP di veleno puro.', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 9 }, { type: 'high_density_damage', minCards: 3, bonus: 6 }], poisonDmg: 9, activeDamage: 18 },
      5: { desc: 'Picche +11 HP e formule da 3+ carte infliggono +9 HP fissi.', activeDesc: 'Inietta veleno 12 HP + Scarica 24 HP di veleno puro.', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 11 }, { type: 'high_density_damage', minCards: 3, bonus: 9 }], poisonDmg: 12, activeDamage: 24 },
      6: { desc: 'Picche +14 HP e formule da 3+ carte curano il 10% HP infliggendo +14 HP.', activeDesc: 'Inietta veleno 15 HP, scarica 32 HP Danno Puro e cura +15% HP.', traits: [{ type: 'anomaly_immunity' }, { type: 'suit_damage_boost', suit: 'spades', bonus: 14 }, { type: 'high_density_damage', minCards: 3, bonus: 14 }], poisonDmg: 15, activeDamage: 32, healPct: 0.15 }
    },
    bgGradient: 'linear-gradient(135deg, rgba(6, 78, 59, 0.9), rgba(15, 23, 42, 0.95))'
  },

  // 3. MAZZO SUPREMO: ECLISSI SUPREMA (CAPSULA FINALE 600 â­)
  {
    id: 'supreme_eclipse',
    name: 'Eclissi Suprema (Signore dei Manufatti)',
    element: 'Cosmo',
    type: 'capsule_exclusive',
    tier: 3,
    rarity: 'Leggendaria',
    category: 'triple',
    categoryName: 'Effetto Triplo',
    symbol: 'ECL',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.9)',
    exclusiveStarMilestone: 600,
    desc: 'L\'Apoteosi Galattica (600â­): domina la fisica quantica con la SCARICA OGGETTI, ricaricando ed eseguendo Manufatti Epici a raffica.',
    unlockCostDust: 0,
    unlockCostDiamonds: 0,
    baseCostDust: 500,
    maxLevel: 9,
    upgradeCosts: {
      2: { dust: 450, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 12 },
      3: { dust: 1100, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 25 },
      4: { dust: 2200, voidCrystals: 2, primordialMatter: 0, reqPilotLevel: 35 },
      5: { dust: 3500, voidCrystals: 4, primordialMatter: 0, reqPilotLevel: 48 },
      6: { dust: 5000, voidCrystals: 6, primordialMatter: 0, reqPilotLevel: 60 },
      7: { dust: 7500, voidCrystals: 8, primordialMatter: 2, reqPilotLevel: 70 },
      8: { dust: 10500, voidCrystals: 10, primordialMatter: 3, reqPilotLevel: 82 },
      9: { dust: 15000, voidCrystals: 12, primordialMatter: 5, reqPilotLevel: 95 }
    },
    levels: {
      1: { desc: 'Fascia 1: Danni base +5 HP. 1 volta per match riarma 1 Oggetto Epico giÃ  consumato.', activeDesc: 'Scarica 20 HP di Danno Cosmico Puro.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 5 }, { type: 'rearm_epic_single' }], activeDamage: 20 },
      2: { desc: 'Danni base +8 HP e ricarica +10s nel Time Tank.', activeDesc: 'Scarica 26 HP di Danno Cosmico Puro.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 8 }, { type: 'rearm_epic_single' }], activeDamage: 26 },
      3: { desc: 'Danni base +12 HP e riarma fino a 2 Oggetti Epici per scontro.', activeDesc: 'Scarica 32 HP di Danno Cosmico Puro.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 12 }, { type: 'rearm_epic_single' }], activeDamage: 32 },
      4: { desc: '[2Âª AbilitÃ ] Fascia 2: Rimosso limite di 1 Epico per turno (puoi usarli insieme!).', activeDesc: 'Scarica 35 HP Puro + Resetta i tempi degli Oggetti Epici.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 12 }, { type: 'remove_epic_turn_limit' }], activeDamage: 35, resetEpics: true },
      5: { desc: 'Danni base +15 HP e usare un Epico rigenera +15% HP.', activeDesc: 'Scarica 40 HP Puro + Ricarica 1 Epico al 100%.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 15 }, { type: 'remove_epic_turn_limit' }], activeDamage: 40, resetEpics: true },
      6: { desc: 'Danni base +18 HP e usare un Epico dona +1 Diamante 💎 (max 2/match).', activeDesc: 'Scarica 46 HP Puro + Ricarica tutti gli Epici.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 18 }, { type: 'remove_epic_turn_limit' }], activeDamage: 46, resetEpics: true },
      7: { desc: '[3Âª AbilitÃ ] Fascia 3: Gli Oggetti Epici infliggono o curano il doppio (+100%).', activeDesc: 'Ricarica tutti gli Epici + Scarica 50 HP di Luce Eclissata.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 20 }, { type: 'double_epic_potency' }, { type: 'remove_epic_turn_limit' }], activeDamage: 50, resetEpics: true },
      8: { desc: 'Epici raddoppiati, danni +25 HP e immunitÃ  totale alle ritorsioni nemico.', activeDesc: 'Scarica 60 HP Puro + Reset totale degli Oggetti Epici.', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 25 }, { type: 'double_epic_potency' }, { type: 'remove_epic_turn_limit' }], activeDamage: 60, resetEpics: true },
      9: { desc: 'APOTEOSI FINALE (600â­): Ricarica infinita Oggetti Epici ogni volta che il Modulo tocca il 100%!', activeDesc: 'Ricarica istantanea di tutti gli Oggetti Epici, azzera timer nemico e infligge 75 HP Puri!', traits: [{ type: 'op_boost', ops: ['+', '-', '*', '/'], bonus: 30 }, { type: 'double_epic_potency' }, { type: 'infinite_epic_overcharge' }], activeDamage: 75, resetEpics: true }
    },
    bgGradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.45), rgba(2, 6, 23, 0.98))'
  }
]);


// 1.18 REGISTRO DELLE 20 RELIQUIE PLANETARIE DEI BOSS
const PLANET_BOSS_RELICS = Object.freeze({
  1: { id: 'relic_p1', planetNum: 1, name: 'Reliquia Tellurica', planetName: 'Terra', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.75)', desc: 'Frammento della litosfera primordiale di Gaia a strati piezoelettrici (1/2 per il Varco I).' },
  2: { id: 'relic_p2', planetNum: 2, name: 'Reliquia Magmatica', planetName: 'Marte', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.75)', desc: 'Nucleo ferromagnetico spento del Colosso di Tharsis con vene di plasma (2/2 per il Varco I).' },
  3: { id: 'relic_p3', planetNum: 3, name: 'Reliquia Acida', planetName: 'Venere', color: '#ca8a04', glow: 'rgba(202, 138, 4, 0.75)', desc: 'Condensato chimico ultra-denso e corrosivo della Matriarca Tossica.' },
  4: { id: 'relic_p4', planetNum: 4, name: 'Reliquia Termica', planetName: 'Mercurio', color: '#fb923c', glow: 'rgba(251, 146, 60, 0.75)', desc: 'Lingotto esagonale forgiato all\'apice termico dell\'Arconte Solare.' },
  5: { id: 'relic_p5', planetNum: 5, name: 'Reliquia delle Tempeste', planetName: 'Giove', color: '#ea580c', glow: 'rgba(234, 88, 12, 0.75)', desc: 'Cella toroidale di vortice ciclonico stabilizzato estratta dalla Grande Macchia.' },
  6: { id: 'relic_p6', planetNum: 6, name: 'Reliquia Anulare', planetName: 'Saturno', color: '#facc15', glow: 'rgba(250, 204, 21, 0.75)', desc: 'Prisma ottagonale di silicato di ghiaccio e polvere minerale di Crono.' },
  7: { id: 'relic_p7', planetNum: 7, name: 'Reliquia dei Ghiacci', planetName: 'Urano', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.75)', desc: 'Monolite a freccia ionica in zaffiro polarizzato della Sentinella.' },
  8: { id: 'relic_p8', planetNum: 8, name: 'Reliquia Abissale', planetName: 'Nettuno', color: '#1d4ed8', glow: 'rgba(29, 78, 216, 0.75)', desc: 'Scaglia idrodinamica subspaziale bioluminescente del Leviatano.' },
  9: { id: 'relic_p9', planetNum: 9, name: 'Reliquia d\'Antimateria', planetName: 'Plutone', color: '#64748b', glow: 'rgba(100, 116, 139, 0.75)', desc: 'Tetraedro d\'ombra e materia oscura del Signore delle Ombre.' },
  10: { id: 'relic_p10', planetNum: 10, name: 'Reliquia di Metano', planetName: 'Titano', color: '#b45309', glow: 'rgba(180, 83, 9, 0.75)', desc: 'Goccia criogenica di idrocarburi liquidi pressurizzati del Colosso.' },
  11: { id: 'relic_p11', planetNum: 11, name: 'Reliquia Oceanica', planetName: 'Europa', color: '#0284c7', glow: 'rgba(2, 132, 199, 0.75)', desc: 'Nucleo idrotermale primordiale racchiuso nel ghiaccio tettonico dell\'Idra.' },
  12: { id: 'relic_p12', planetNum: 12, name: 'Reliquia Magnetica', planetName: 'Ganimede', color: '#475569', glow: 'rgba(71, 85, 105, 0.75)', desc: 'Doppio giroscopio in titanite fusa del Titano d\'Acciaio.' },
  13: { id: 'relic_p13', planetNum: 13, name: 'Reliquia Esoplanetaria', planetName: 'Kepler-186f', color: '#14b8a6', glow: 'rgba(20, 184, 166, 0.75)', desc: 'Matrice a diffrazione fotonica binaria dell\'Eco dei Mondi.' },
  14: { id: 'relic_p14', planetNum: 14, name: 'Reliquia Primordiale', planetName: 'Proxima b', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.75)', desc: 'Ancora dipolare gravitazionale del Generatore del Caos.' },
  15: { id: 'relic_p15', planetNum: 15, name: 'Reliquia Armonica', planetName: 'TRAPPIST-1e', color: '#d946ef', glow: 'rgba(217, 70, 239, 0.75)', desc: 'Diapason a 7 risonatori polifonici orbitali dell\'Arconte.' },
  16: { id: 'relic_p16', planetNum: 16, name: 'Reliquia Neutrale', planetName: 'Gliese 581g', color: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.75)', desc: 'Sfera a baricentro di equilibrio perenne del Custode di Lagrange.' },
  17: { id: 'relic_p17', planetNum: 17, name: 'Reliquia Cinetica', planetName: 'Haumea', color: '#84cc16', glow: 'rgba(132, 204, 22, 0.75)', desc: 'Ellissoide cinetico ad asse di rotazione ultra-rapida del Cristallo.' },
  18: { id: 'relic_p18', planetNum: 18, name: 'Reliquia della Discordia', planetName: 'Eris', color: '#f97316', glow: 'rgba(249, 115, 22, 0.75)', desc: 'Scheggia tachionica asimmetrica a campo entropico dell\'EntitÃ .' },
  19: { id: 'relic_p19', planetNum: 19, name: 'Reliquia Vulcanica', planetName: 'Io', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.75)', desc: 'Camera magmatica al plasma sulfureo attivo del Nucleo Magmatico.' },
  20: { id: 'relic_p20', planetNum: 20, name: 'Reliquia del Vuoto', planetName: 'Encelado', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.75)', desc: 'SingolaritÃ  criomagnetica allo zero assoluto del Sovrano del Vuoto.' }
});



// ============================================================================
// 1.20 REGISTRO DEI 10 VARCHI GRAVITAZIONALI
// ============================================================================
const GRAVITATIONAL_RIFTS = Object.freeze([
  {
    id: 'rift_1',
    number: 1,
    roman: 'I',
    name: 'Varco I: Biforcazione Cronotopica',
    codeName: 'Ponte Cronotopico',
    itemId: 'epic_item_1',
    relicsRequired: ['relic_p1', 'relic_p2'],
    bossPlanets: [1, 2],
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.75)',
    desc: 'Genera un orizzonte degli eventi bidirezionale collegando la litosfera terrestre ai vulcani marziani.'
  },
  {
    id: 'rift_2',
    number: 2,
    roman: 'II',
    name: 'Varco II: Risoluzione Neutonica',
    codeName: 'Risonanza Bifronte',
    itemId: 'epic_item_2',
    relicsRequired: ['relic_p3', 'relic_p4'],
    bossPlanets: [3, 4],
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.75)',
    desc: 'Unifica le nubi corrosive di Venere con l\'incandescenza metallica di Mercurio.'
  },
  {
    id: 'rift_3',
    number: 3,
    roman: 'III',
    name: 'Varco III: Coordinate Libere',
    codeName: 'Canto della Creazione',
    itemId: 'epic_item_3',
    relicsRequired: ['relic_p5', 'relic_p6'],
    bossPlanets: [5, 6],
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.75)',
    desc: 'Canalizza l\'energia ciclonica di Giove e la perfezione armonica degli anelli saturniani.'
  },
  {
    id: 'rift_4',
    number: 4,
    roman: 'IV',
    name: 'Varco IV: Ombra Assoluta',
    codeName: 'Velo del Silenzio',
    itemId: 'epic_item_4',
    relicsRequired: ['relic_p7', 'relic_p8'],
    bossPlanets: [7, 8],
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.75)',
    desc: 'Sovrappone le tempeste magnetiche di Urano alle profonditÃ  criogeniche di Nettuno.'
  },
  {
    id: 'rift_5',
    number: 5,
    roman: 'V',
    name: 'Varco V: Impulso Gravimetrico',
    codeName: 'Giudizio Primordiale',
    itemId: 'epic_item_5',
    relicsRequired: ['relic_p9', 'relic_p10'],
    bossPlanets: [9, 10],
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.75)',
    desc: 'Condensa i flussi di antimateria plutoniana con i mari densi di metano di Titano.'
  },
  {
    id: 'rift_6',
    number: 6,
    roman: 'VI',
    name: 'Varco VI: Inversione d\'Entropia',
    codeName: 'Strappo Temporale',
    itemId: 'epic_item_6',
    relicsRequired: ['relic_p11', 'relic_p12'],
    bossPlanets: [11, 12],
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.75)',
    desc: 'Inverte la freccia del tempo fondendo le maree sotterranee di Europa con l\'elettromagnetismo di Ganimede.'
  },
  {
    id: 'rift_7',
    number: 7,
    roman: 'VII',
    name: 'Varco VII: Specchi Dielettrici',
    codeName: 'Specchio di Ritorsione',
    itemId: 'epic_item_7',
    relicsRequired: ['relic_p13', 'relic_p14'],
    bossPlanets: [13, 14],
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.75)',
    desc: 'Estrae le geometrie di riflessione esoplanetaria di Kepler-186f e Proxima b.'
  },
  {
    id: 'rift_8',
    number: 8,
    roman: 'VIII',
    name: 'Varco VIII: Drenaggio a Vortice',
    codeName: 'Sifone dell\'Abisso',
    itemId: 'epic_item_8',
    relicsRequired: ['relic_p15', 'relic_p16'],
    bossPlanets: [15, 16],
    color: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.75)',
    desc: 'Risonanza armonica tra il sistema a 7 mondi TRAPPIST-1e e l\'equilibrio di Lagrange di Gliese 581g.'
  },
  {
    id: 'rift_9',
    number: 9,
    roman: 'IX',
    name: 'Varco IX: Matrice di ProbabilitÃ ',
    codeName: 'Furia dei Dadi Celesti',
    itemId: 'epic_item_9',
    relicsRequired: ['relic_p17', 'relic_p18'],
    bossPlanets: [17, 18],
    color: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.75)',
    desc: 'Amplifica l\'entropia probabilistica intercettando la rotazione folle di Haumea e la discordia di Eris.'
  },
  {
    id: 'rift_10',
    number: 10,
    roman: 'X',
    name: 'Varco X: SingolaritÃ  Compressa',
    codeName: 'Tempesta dell\'Eclissi',
    itemId: 'epic_item_10',
    relicsRequired: ['relic_p19', 'relic_p20'],
    bossPlanets: [19, 20],
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.75)',
    desc: 'L\'apice dimensionale assoluto: fonde il plasma magmatico di Io con il vuoto criogenico di Encelado.'
  }
]);

// ============================================================================
// 1.21 DATABASE DEI 10 MANUFATTI EPICI DIMENSIONALI
// ============================================================================
const EPIC_ITEMS_DATABASE = Object.freeze([
  {
    id: 'epic_item_1',
    riftNumber: 1,
    name: 'Anello Bifasico di MÃ¶bius',
    codeName: 'Ponte Cronotopico',
    symbol: 'M1',
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.85)',
    desc: 'Apre un portale quantico per scambiare carte della mano con quelle del futuro pescate dal mazzo.',
    levels: {
      1: { visionTurn: 1, maxCards: 2, label: 'Visione +1 Turno (Scambia fino a 2 carte)' },
      2: { visionTurn: 2, maxCards: 3, label: 'Visione +2 Turni (Scambia fino a 3 carte)' },
      3: { visionTurn: 3, maxCards: 3, label: 'Visione +3 Turni (Apoteosi: Scambio Profondo)' }
    }
  },
  {
    id: 'epic_item_2',
    riftNumber: 2,
    name: 'Forcella a Risoluzione Neutonica',
    codeName: 'Risonanza Bifronte',
    symbol: 'M2',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.85)',
    desc: 'Fonde algebricamente piÃ¹ carte della mano in un\'unica carta composita ad altissimo valore.',
    levels: {
      1: { maxFuse: 2, label: 'Fusione Neutonica (Fino a 2 carte)' },
      2: { maxFuse: 3, label: 'Fusione Iper-Densa (Fino a 3 carte)' },
      3: { maxFuse: 4, label: 'Apoteosi Composita (Fino a 4 carte fuse)' }
    }
  },
  {
    id: 'epic_item_3',
    riftNumber: 3,
    name: 'Astrolabio a Coordinate Libere',
    codeName: 'Canto della Creazione',
    symbol: 'M3',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.85)',
    desc: 'Permette di riscrivere manualmente il valore target dei bersagli presenti sulla plancia.',
    levels: {
      1: { maxTargets: 1, label: 'Riscrive 1 Target a scelta' },
      2: { maxTargets: 2, label: 'Riscrive fino a 2 Target' },
      3: { maxTargets: 3, label: 'Apoteosi: Riscrive tutti e 3 i Target' }
    }
  },
  {
    id: 'epic_item_4',
    riftNumber: 4,
    name: 'Stele d\'Ombra Assoluta',
    codeName: 'Velo del Silenzio',
    symbol: 'M4',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.85)',
    desc: 'Emette un impulso subspaziale che spegne e disattiva completamente la Passiva del mazzo avversario.',
    levels: {
      1: { silenceDurationTurns: 2, label: 'Silenzia Passiva Nemica per 2 turni' },
      2: { silenceDurationTurns: 4, label: 'Silenzia Passiva Nemica per 4 turni' },
      3: { silenceDurationTurns: 999, label: 'Apoteosi: Silenzio Permanente per l\'intero scontro' }
    }
  },
  {
    id: 'epic_item_5',
    riftNumber: 5,
    name: 'Pistone a Impulso Gravimetrico',
    codeName: 'Giudizio Primordiale',
    symbol: 'M5',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.85)',
    desc: 'Accumula pressione gravitazionale; il prossimo attacco a segno infligge un danno fisso massiccio.',
    levels: {
      1: { overrideDamage: 20, label: 'Prossimo colpo infligge 20 HP fissi' },
      2: { overrideDamage: 25, label: 'Prossimo colpo infligge 25 HP fissi' },
      3: { overrideDamage: 30, label: 'Apoteosi: Prossimo colpo infligge 30 HP fissi' }
    }
  },
  {
    id: 'epic_item_6',
    riftNumber: 6,
    name: 'Pendolo a Inversione d\'Entropia',
    codeName: 'Strappo Temporale',
    symbol: 'M6',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.85)',
    desc: 'Riavvolge lo stato esatto del duello (HP, mani, mazzi, scarti, timer e moduli) ai turni precedenti.',
    levels: {
      1: { turnsBack: 1, label: 'Riavvolge lo scontro di 1 turno' },
      2: { turnsBack: 2, label: 'Riavvolge lo scontro fino a 2 turni' },
      3: { turnsBack: 3, label: 'Apoteosi: Riavvolge lo scontro fino a 3 turni' }
    }
  },
  {
    id: 'epic_item_7',
    riftNumber: 7,
    name: 'Monolite a Specchi Dielettrici',
    codeName: 'Specchio di Ritorsione',
    symbol: 'M7',
    color: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.85)',
    desc: 'Innalza una barriera reattiva: assorbe il prossimo attacco nemico e lo riflette amplificato.',
    levels: {
      1: { reflectMultiplier: 1.0, label: 'Riflette il 100% del danno subito' },
      2: { reflectMultiplier: 1.5, label: 'Riflette il 150% del danno subito' },
      3: { reflectMultiplier: 2.0, label: 'Apoteosi: Riflette il 200% del danno subito' }
    }
  },
  {
    id: 'epic_item_8',
    riftNumber: 8,
    name: 'Calice di Drenaggio a Vortice',
    codeName: 'Sifone dell\'Abisso',
    symbol: 'M8',
    color: '#d946ef',
    glow: 'rgba(217, 70, 239, 0.85)',
    desc: 'Azzera le barre energia dei moduli avversari e sovraccarica istantaneamente i moduli alleati.',
    levels: {
      1: { chargePercent: 1.0, label: 'Svuota nemico, ricarica moduli al 100%' },
      2: { chargePercent: 1.5, label: 'Svuota nemico, ricarica moduli al 150%' },
      3: { chargePercent: 2.0, label: 'Apoteosi: Doppio uso immediato (200%)' }
    }
  },
  {
    id: 'epic_item_9',
    riftNumber: 9,
    name: 'Matrice Poliedrica di ProbabilitÃ ',
    codeName: 'Furia dei Dadi Celesti',
    symbol: 'M9',
    color: '#84cc16',
    glow: 'rgba(132, 204, 22, 0.85)',
    desc: 'Attiva una raffica istantanea di lanci dei Dadi Quantici 2D senza intagli algebrici richiesti.',
    levels: {
      1: { rollCount: 3, label: 'Raffica di 3 lanci Dadi cumulativi' },
      2: { rollCount: 4, label: 'Raffica di 4 lanci Dadi cumulativi' },
      3: { rollCount: 5, label: 'Apoteosi: Raffica di 5 lanci Dadi cumulativi' }
    }
  },
  {
    id: 'epic_item_10',
    riftNumber: 10,
    name: 'Nucleo a SingolaritÃ  Compressa',
    codeName: 'Tempesta dell\'Eclissi',
    symbol: 'M10',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.85)',
    desc: 'Innesca la modalitÃ  Raffica Continua: mano sempre ricaricata a 7 carte e bersagli rigenerati subito.',
    levels: {
      1: { durationSeconds: 60, label: 'Tempesta dell\'Eclissi per 60 secondi' },
      2: { durationSeconds: 75, label: 'Tempesta dell\'Eclissi per 75 secondi' },
      3: { durationSeconds: 90, label: 'Apoteosi: Tempesta dell\'Eclissi per 90 secondi' }
    }
  }
]);


// 2.2 DATI DEI 20 PIANETI E NOMI DEI 200 SETTORI
const realPlanetNames = Object.freeze([
  "Terra", "Marte", "Venere", "Mercurio", "Giove", "Saturno", "Urano", "Nettuno", "Plutone", "Titano",
  "Europa", "Ganimede", "Kepler-186f", "Proxima b", "TRAPPIST-1e", "Gliese 581g", "Haumea", "Eris", "Io", "Encelado"
]);

const planetSymbols = Object.freeze([
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19', 'P20'
]);

const PLANET_ZONE_NAMES = Object.freeze([
  ["Valle di Cristallo", "Cratere Boreale", "Avamposto Alpha", "Piana dei Venti", "Barriera Ovest", "Tempio Sommerso", "Gola Silenziosa", "Polo Magnetico", "Faglia Profonda", "Guardiano di Gaia"],
  ["Duna Cremisi", "Canyon Eolico", "Bacino di Vetro", "Rovine di Tharsis", "Avamposto Marziano", "Valle Marineris", "Labirinto Notturno", "Caldera Spenta", "Soglia del Plasma", "Colosso di Tharsis"],
  ["Nuvole di Acido", "Valle dei Fiori", "Cratere Luminoso", "Tempio di Afrodite", "Piana di Zolfo", "Altopiano Dorato", "Sorgente Celeste", "Barriera Radiante", "Santuario del Sole", "Matriarca Tossica"],
  ["Bacino Solare", "Cratere di Mercurio", "Piana di Metallo", "Avamposto Termico", "Faglia di Calore", "Rovine di Piombo", "Sito di Fusione", "Santuario del Fuoco", "Tempio della Forgia", "Arconte Solare"],
  ["Oceano di Ammoniaca", "Tempesta Perenne", "Anello di Ghiaccio", "Nucleo di Metano", "Piattaforma Galleggiante", "Vortice di Nubi", "Abisso Elettrico", "Soglia della GravitÃ ", "Cuore Gassoso", "Occhio del Vortice"],
  ["Anelli di Ghiaccio", "Tempesta di Pulviscolo", "Monolito Esagonale", "Fortezza di Titanite", "Piazzale dei Venti", "Avamposto Saturniano", "Landa Dorata", "Roccaforte di Crono", "Soglia Eterea", "Crono il Distruttore"],
  ["Tempesta Polare", "Abisso di Ghiaccio", "Cratere di Urano", "Piana Magnetica", "Avamposto Blu", "Rifugio Glaciale", "Landa di Zaffiro", "Fortezza Celeste", "Tempio di Urania", "Sentinella Ionica"],
  ["Abisso Blu", "Cratere di Nettuno", "Piana di Ghiaccio Scuro", "Avamposto Abissale", "Faglia Nettuniana", "Rovine Sommerse", "Landa di Neve", "Cittadella Marina", "Soglia Profonda", "Leviatano Abissale"],
  ["Pianeta Nano", "Cratere di Plutone", "Landa di Ghiaccio Scuro", "Avamposto di Plutone", "Faglia Gelata", "Rovine di Ghiaccio", "Santuario del Buio", "Fortezza di Plutone", "Tempio dell'Oltretomba", "Signore delle Ombre"],
  ["Lago di Metano", "Cratere di Titano", "Piana di Neve", "Avamposto di Titano", "Faglia di Idrocarburi", "Atmosfera Densa", "Santuario del Freddo", "Cittadella di Titano", "Portale Titanico", "Colosso di Metano"],
  ["Oceano Sotterraneo", "Cratere di Europa", "Piana di Ghiaccio", "Avamposto di Europa", "Faglia Marina", "Rovine di Cristallo", "Santuario della Vita", "Fortezza Sotterranea", "Tempio delle Maree", "Idra Criogenica"],
  ["Valle dei Giganti", "Cratere di Ganimede", "Piana di Rupi", "Avamposto Ganimede", "Faglia dei Titani", "Rovine Antiche", "Santuario della Luna", "Cittadella di Ganimede", "Portale di Giove", "Titano d'Acciaio"],
  ["Valle di Ghiaccio", "Cratere di Kepler", "Piana Rossa", "Avamposto Kepler", "Faglia Esoplanetaria", "Rovine di Kepler", "Santuario della Terra", "Fortezza Esoterica", "Portale Stellare", "Eco dei Mondi"],
  ["Valle Sconosciuta", "Cratere di Proxima", "Piana Centauri", "Avamposto Proxima", "Faglia Vicina", "Rovine Alfa", "Santuario di Centauri", "Cittadella di Proxima", "Portale di Alpha", "Generatore del Caos"],
  ["Valle di Vetro", "Cratere di Trappist", "Piana dei Sette", "Avamposto Trappist", "Faglia Armonica", "Rovine di Trappist", "Santuario di Trappist", "Cittadella Armonica", "Portale dei Sette", "Arconte dei Sette"],
  ["Valle di Gliese", "Cratere di Gliese", "Piana di Gliese", "Avamposto Gliese", "Faglia di Gliese", "Rovine di Gliese", "Santuario di Gliese", "Fortezza Gliese", "Portale Gliese", "Custode di Lagrange"],
  ["Valle di Haumea", "Cratere di Haumea", "Piana di Haumea", "Avamposto Haumea", "Faglia di Haumea", "Rovine di Haumea", "Santuario di Haumea", "Fortezza Haumea", "Portale Haumea", "Cristallo di Risonanza"],
  ["Valle di Eris", "Cratere di Eris", "Piana di Eris", "Avamposto Eris", "Faglia di Eris", "Rovine di Eris", "Santuario di Eris", "Cittadella Eris", "Portale Eris", "EntitÃ  della Discordia"],
  ["Valle di Io", "Cratere di Io", "Piana di Io", "Avamposto Io", "Faglia di Io", "Rovine di Io", "Santuario di Io", "Cittadella Io", "Portale Io", "Nucleo Magmatico"],
  ["Valle di Encelado", "Cratere di Encelado", "Piana di Encelado", "Faglia Glaciale", "Rovine Criogeniche", "Sito Geyser", "Santuario del Gelo", "Cittadella di Encelado", "Portale dell'Oceano", "Sovrano del Vuoto (Boss Finale Multi-Fase)"]
]);


// ============================================================================
// 2.4 COMPONENTE VENTAGLI D'ANGOLO DEI 4 ASSI (CORNERACEFAN)
//     CON VISIBILITÃ€ DEL DORSO ESTRUSA E DOPPI INDICI REATTIVI
// ============================================================================
function CornerAceFan({ suitId, selectedDeck, currentDeckObj, corner = 'nw', onClick }) {
  const suitInfo = SUITS.find(s => s.id === suitId) || SUITS[0];

  return (
    <div
      onClick={onClick}
      className={`corner-ace-fan-container fan-${corner}`}
      title={`Asso di ${suitInfo.name}: ${suitInfo.synergy}`}
    >
      {/* Carta Sotto: Retro del Mazzo Attivo visibilmente sporgente */}
      <div className="corner-card-under">
        <TacticalVisual
          id={selectedDeck}
          type="card_back"
          color={currentDeckObj?.color || '#38bdf8'}
          glowColor={currentDeckObj?.glow || 'rgba(56, 189, 248, 0.65)'}
          width={40}
          height={58}
        />
      </div>

      {/* Carta Sopra: Asso Olografico ad Alta Definizione */}
      <div
        className="corner-card-top fan-ace-card"
        style={{
          border: `1.5px solid ${suitInfo.color}`,
          boxShadow: `0 0 14px ${suitInfo.glow}, inset 0 0 8px ${suitInfo.color}33`
        }}
      >
        <div className="fan-ace-index-tl">
          <span style={{ color: '#ffffff', fontWeight: '900', lineHeight: 1 }}>A</span>
          <span style={{ color: suitInfo.color, lineHeight: 1 }}>{suitInfo.symbol}</span>
        </div>

        <div className="fan-ace-center">
          <span style={{ color: suitInfo.color, textShadow: `0 0 8px ${suitInfo.color}` }}>
            {suitInfo.symbol}
          </span>
        </div>

        <div className="fan-ace-index-br">
          <span style={{ color: '#ffffff', fontWeight: '900', lineHeight: 1 }}>A</span>
          <span style={{ color: suitInfo.color, lineHeight: 1 }}>{suitInfo.symbol}</span>
        </div>
      </div>
    </div>
  );
}


(function injectCyberStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-global-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Rajdhani:wght@600;700;800&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    *::-webkit-scrollbar {
      display: none;
      width: 0px;
      height: 0px;
      background: transparent;
    }

    body, html {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100dvh;
      background-color: #020308;
      color: #f8fafc;
      font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    /* ANIMAZIONI ORBITALI E NODI SPLASH SCREEN */
    .pulse-glow {
      box-shadow: 0 0 35px rgba(0, 242, 254, 0.35), inset 0 0 20px rgba(0, 242, 254, 0.1);
    }

    .orbit-planet-node {
      border-radius: 50%;
      pointer-events: none;
    }

    .orbit-card-node {
      width: 20px;
      height: 30px;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1px;
      pointer-events: none;
    }

    @keyframes spinClockwise { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes spinCounterClockwise { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }


    @keyframes coreStellarPulse {
      0% { transform: scale(0.9); box-shadow: 0 0 15px #00f2fe, 0 0 30px #38bdf8; }
      50% { transform: scale(1.18); box-shadow: 0 0 35px #00f2fe, 0 0 70px #818cf8, 0 0 90px rgba(0, 242, 254, 0.8); }
      100% { transform: scale(0.9); box-shadow: 0 0 15px #00f2fe, 0 0 30px #38bdf8; }
    }

      /* VIEWPORT STRUTTURALE PRINCIPALE ADATTIVO 9:16 */
    .app-viewport-916 {
      width: 100vw;
      max-width: 480px;
      height: 100dvh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2px;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }

       .battle-viewport {
      width: 100%;
      height: 100%;
      max-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0;
      position: relative;
      overflow: hidden;
      min-width: 0;
      box-sizing: border-box;
      transition: box-shadow 0.3s ease, border-color 0.3s ease;
    }




    .deck-trait-pill {
      font-size: clamp(0.55rem, 1dvh, 0.65rem);
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      background: rgba(15, 23, 42, 0.75);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60%;
    }







    /* PANNELLI CYBERPUNK CON GLOW */
    .cyber-panel {
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.97) 100%);
      border: 1px solid rgba(0, 242, 254, 0.35);
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.75), inset 0 0 12px rgba(0, 242, 254, 0.08);
      position: relative;
      transition: all 0.25s ease;
    }

        /* PULSANTI TATTICI */
    .cyber-btn {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-top: 1.5px solid rgba(255, 255, 255, 0.4);
      border-bottom: 2.5px solid rgba(0, 0, 0, 0.85);
      border-radius: 8px;
      color: #ffffff;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
    }
    .cyber-btn:active { transform: scale(0.96); }
    .cyber-btn:disabled { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.8); }

    .cyber-btn-primary {
      background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
      border-color: #00f2fe;
      box-shadow: 0 0 14px rgba(0, 242, 254, 0.4);
    }
    .cyber-btn-warning {
      background: linear-gradient(180deg, #d97706 0%, #b45309 100%);
      border-color: #facc15;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.4);
    }
    .cyber-btn-success {
      background: linear-gradient(180deg, #059669 0%, #047857 100%);
      border-color: #10b981;
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.4);
    }
    .cyber-btn-ether {
      background: linear-gradient(180deg, #9333ea 0%, #7e22ce 100%);
      border-color: #e879f9;
      box-shadow: 0 0 14px rgba(232, 121, 249, 0.45);
    }
    .cyber-btn-epic {
      background: linear-gradient(180deg, #eab308 0%, #a16207 100%);
      border-color: #fef08a;
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.6);
      animation: pulseGlow 1.5s infinite alternate;
    }
    .cyber-btn.btn-attack-ready {
      background: linear-gradient(180deg, #059669 0%, #065f46 100%);
      border: 2px solid #34d399;
      box-shadow: 0 0 20px rgba(52, 211, 153, 0.7);
      animation: attackReadyPulse 1s infinite alternate ease-in-out;
    }

    /* CARTE OLOGRAFICHE PLANCIA GIOCATORE */
    .holo-card {
      width: clamp(28px, 7.8vw, 38px);
      height: clamp(42px, 5.8dvh, 52px);
      background: linear-gradient(150deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3px 2px;
      cursor: pointer;
      position: relative;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
      transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
      flex-shrink: 0;
    }

    .holo-card.court-card { border-color: rgba(250, 204, 21, 0.65); }
    .holo-card.joker-card { border-color: #e879f9; box-shadow: 0 0 12px rgba(232, 121, 249, 0.5); }
    .holo-card.fused-card { border: 2px solid #f59e0b; box-shadow: 0 0 14px rgba(245, 158, 11, 0.6); }

    .holo-card.selected {
      border: 2px solid #00f2fe;
      box-shadow: 0 0 16px rgba(0, 242, 254, 0.75), inset 0 0 8px rgba(0, 242, 254, 0.4);
      transform: translateY(-8px) scale(1.08);
      background: linear-gradient(150deg, rgba(8, 145, 178, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%);
      z-index: 10;
    }
    .holo-card.exchange-selected {
      border: 2px solid #f59e0b;
      box-shadow: 0 0 14px rgba(245, 158, 11, 0.7);
      transform: translateY(-6px);
      background: linear-gradient(150deg, rgba(180, 83, 9, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%);
    }
    .holo-card.discard-candidate {
      border: 2px solid #00f2fe;
      background: linear-gradient(150deg, rgba(8, 145, 178, 0.45) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
      box-shadow: 0 0 18px rgba(0, 242, 254, 0.85), inset 0 0 10px rgba(250, 204, 21, 0.3) !important;
      animation: resonanceSurgePulse 0.8s infinite alternate ease-in-out;
      cursor: pointer;
    }
    @keyframes resonanceSurgePulse {
      0% { transform: translateY(0) scale(1); box-shadow: 0 0 10px rgba(0, 242, 254, 0.6); }
      100% { transform: translateY(-7px) scale(1.06); box-shadow: 0 0 24px rgba(250, 204, 21, 0.95), 0 0 12px #00f2fe; }
    }


    /* CARTA DORATA & BADGE TURNI RIMASTI [2T] */
    .holo-card.golden-card {
      border: 2px solid #facc15;
      background: linear-gradient(150deg, rgba(234, 179, 8, 0.35) 0%, rgba(15, 23, 42, 0.98) 100%);
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.75), inset 0 0 10px rgba(250, 204, 21, 0.35);
      animation: goldenCardPulse 1.4s infinite alternate ease-in-out;
    }

    /* EFFETTO CARTA PICCHE ELETTRIZZATA (GIOVE P5) */
    .holo-card.electrified-card {
      border: 2px solid #00f2fe !important;
      background: linear-gradient(150deg, rgba(8, 145, 178, 0.45) 0%, rgba(15, 23, 42, 0.98) 100%) !important;
      box-shadow: 0 0 16px rgba(0, 242, 254, 0.9), inset 0 0 10px rgba(0, 242, 254, 0.5) !important;
      animation: electricShockPulse 0.8s infinite alternate ease-in-out !important;
    }
    @keyframes electricShockPulse {
      0% { box-shadow: 0 0 8px #00f2fe, inset 0 0 4px #00f2fe; }
      100% { box-shadow: 0 0 22px #00f2fe, 0 0 10px #fde047, inset 0 0 12px #00f2fe; }
    }

    .holo-card.golden-card.selected {
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 24px rgba(250, 204, 21, 1), 0 0 10px #ffffff, inset 0 0 12px rgba(250, 204, 21, 0.5);
      transform: translateY(-9px) scale(1.1);
    }

    .golden-turns-badge {
      position: absolute;
      top: -12px;
      right: -5px;
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
      font-size: 0.52rem;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #fde047;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.85);
      z-index: 15;
      pointer-events: none;
    }
    @keyframes goldenCardPulse {
      0% { box-shadow: 0 0 10px rgba(250, 204, 21, 0.5), inset 0 0 6px rgba(250, 204, 21, 0.2); }
      100% { box-shadow: 0 0 24px rgba(250, 204, 21, 0.95), 0 0 8px rgba(255, 255, 255, 0.6), inset 0 0 12px rgba(250, 204, 21, 0.45); }
    }

    .ai-card-wrapper.ai-golden-card {
      border: 1.5px solid #facc15;
      border-radius: 4px;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.85);
      animation: goldenCardPulse 1.4s infinite alternate ease-in-out;
    }

    .exchange-cost-tag {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(234, 88, 12, 0.95);
      border: 1px solid #fde047;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 0.52rem;
      font-weight: 900;
      color: #ffffff;
      white-space: nowrap;
      pointer-events: none;
      z-index: 15;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
      animation: pulseGlow 1s infinite alternate;
    }

    .card-prediction-badge {
      position: absolute;
      top: -16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(2, 6, 23, 0.95);
      border: 1px solid #00f2fe;
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 0.55rem;
      font-weight: 900;
      color: #00f2fe;
      white-space: nowrap;
      pointer-events: none;
      z-index: 15;
    }
    .card-prediction-badge.match-exact {
      border-color: #34d399;
      color: #34d399;
      box-shadow: 0 0 8px #34d399;
    }
    .card-suggest-glow { animation: suggestPulse 1.2s infinite alternate; }

    /* RADAR E BERSAGLI CENTRALI */
    .radar-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 1.5px dashed rgba(0, 242, 254, 0.45);
      animation: spinRadar 12s linear infinite;
      pointer-events: none;
    }

    .target-badge-box {
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .target-badge-box.smart-matched {
      border-color: #34d399 !important;
      box-shadow: 0 0 18px rgba(52, 211, 153, 0.75) !important;
      animation: pulseGlow 1s infinite alternate;
    }
    .target-badge-box.target-solvable-glow {
      border-color: #facc15 !important;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.6) !important;
    }
    .target-badge-box.incompatible { opacity: 0.35; filter: grayscale(0.5); }

    /* NUCLEO INSTABILE / BERSAGLIO BOMBA */
    .target-badge-bomb {
      border: 1.5px solid #f43f5e !important;
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.35) 0%, rgba(15, 23, 42, 0.95) 100%) !important;
      box-shadow: 0 0 16px rgba(244, 63, 94, 0.5), inset 0 0 8px rgba(244, 63, 94, 0.25) !important;
      animation: bombPulse 1.5s infinite alternate ease-in-out;
      position: relative;
    }
    .target-badge-bomb.critical-turn {
      border: 2px solid #ef4444 !important;
      animation: bombCriticalPulse 0.6s infinite alternate ease-in-out !important;
    }
    .bomb-turns-badge {
      position: absolute;
      top: -8px;
      right: -6px;
      background: #dc2626;
      color: #ffffff;
      font-size: 0.55rem;
      font-weight: 900;
      padding: 1px 5px;
      border-radius: 6px;
      border: 1px solid #fca5a5;
      box-shadow: 0 0 8px #ef4444;
      z-index: 10;
    }
    .bomb-telegraph-preview {
      font-size: 0.52rem;
      color: #fde047;
      font-weight: bold;
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 90px;
    }
    @keyframes bombPulse {
      from { box-shadow: 0 0 10px rgba(244, 63, 94, 0.4); }
      to { box-shadow: 0 0 20px rgba(244, 63, 94, 0.85); }
    }
    @keyframes bombCriticalPulse {
      from { transform: scale(1); box-shadow: 0 0 14px #ef4444; }
      to { transform: scale(1.04); box-shadow: 0 0 28px #ef4444; }
    }

    .target-damage-badge {
      font-size: 0.6rem;
      font-weight: 800;
      color: #ef4444;
      background: rgba(69, 10, 10, 0.6);
      padding: 1px 4px;
      border-radius: 3px;
      margin-top: 2px;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .target-solvable-badge {
      font-size: 0.55rem;
      font-weight: bold;
      color: #fde047;
      margin-top: 1px;
    }

        .formula-live-board {
      background: rgba(2, 6, 23, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      padding: 3px 8px;
      text-align: center;
      font-size: clamp(0.7rem, 1.35dvh, 0.82rem);
      min-height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }


    .formula-live-board.locked { border-color: #34d399; background: rgba(6, 78, 59, 0.4); }
    .formula-live-board.mismatch { border-color: rgba(239, 68, 68, 0.5); }

    /* BARRE FASE BOSS PLANETARIO MULTI-BARRA */
    .boss-phase-bar-container {
      display: flex;
      gap: 3px;
      width: 100%;
      height: 7px;
      margin: 3px 0;
    }
    .boss-phase-segment {
      flex: 1;
      height: 100%;
      background: rgba(30, 41, 59, 0.85);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .boss-phase-segment.completed { background: #334155; border-color: rgba(255, 255, 255, 0.05); }
    .boss-phase-segment.active { border-color: #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
    .boss-phase-fill { height: 100%; background: linear-gradient(90deg, #ef4444, #f87171); transition: width 0.3s ease; }

    /* MODALITÃ€ TRIS STELLARE */
    .tris-slot-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(3px, 1.2vw, 6px);
      width: 100%;
      padding: 4px 0;
    }
    .tris-table-card {
      width: clamp(38px, 9vw, 46px);
      height: clamp(56px, 8.5dvh, 68px);
      background: linear-gradient(135deg, rgba(88, 28, 135, 0.85), rgba(15, 23, 42, 0.95));
      border: 2px solid #a855f7;
      border-radius: 6px;
      box-shadow: 0 0 14px rgba(168, 85, 247, 0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3px 2px;
    }
    .tris-slot-box {
      width: clamp(36px, 8.5vw, 44px);
      height: clamp(54px, 8.2dvh, 66px);
      border: 1.5px dashed rgba(168, 85, 247, 0.5);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .tris-slot-box.filled {
      border: 1.5px solid #00f2fe;
      background: rgba(8, 145, 178, 0.35);
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.5);
    }
    .tris-combo-banner {
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      animation: spotlightPop 0.25s ease-out;
    }

    /* BARRE METER LED CON MICRO-FLASH */
    .led-meter-bar {
      width: 100%;
      height: 6px;
      background: rgba(15, 23, 42, 0.9);
      border-radius: 3px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
      position: relative;
    }
    .led-meter-fill {
      height: 100%;
      transition: width 0.3s ease;
      box-shadow: 0 0 8px currentColor;
    }
    .hp-flash-white {
      animation: hpFlashAnim 0.3s ease-out;
    }
    @keyframes hpFlashAnim {
      0% { filter: brightness(3.5) contrast(1.5); }
      100% { filter: brightness(1); }
    }

    /* ========================================================================== */
    /* ALLOGGIAMENTO MODULO ABILITÃ€ IBRIDO UNICO (PLANCIA BATTAGLIA)             */
    /* ========================================================================== */
    .hybrid-ability-module-container {
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.98) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.4);
      border-radius: 8px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
      transition: all 0.25s ease;
    }
    .hybrid-ability-module-container.ready {
      border-color: #00f2fe;
      box-shadow: 0 0 16px rgba(0, 242, 254, 0.65), inset 0 0 8px rgba(0, 242, 254, 0.25);
      background: linear-gradient(145deg, rgba(8, 145, 178, 0.35) 0%, rgba(15, 23, 42, 0.95) 100%);
    }

    .ability-ready-pulse {
      animation: abilityChargedPulse 1s infinite alternate ease-in-out;
    }
    @keyframes abilityChargedPulse {
      from { transform: scale(1); box-shadow: 0 0 10px rgba(0, 242, 254, 0.5); }
      to { transform: scale(1.02); box-shadow: 0 0 22px rgba(0, 242, 254, 0.9); }
    }

    /* BANNER NOTIFICHE COMBATTIMENTO & CAMBIO TURNO */
    .turn-banner-container {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 18000;
      pointer-events: none;
    }
    .turn-banner-card {
      padding: 0.8rem 1.8rem;
      border-radius: 12px;
      text-align: center;
      animation: turnBannerPop 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .turn-banner-player {
      background: linear-gradient(135deg, rgba(8, 145, 178, 0.95), rgba(15, 23, 42, 0.98));
      border: 2px solid #00f2fe;
      box-shadow: 0 0 45px rgba(0, 242, 254, 0.75);
    }
    .turn-banner-opponent {
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(15, 23, 42, 0.98));
      border: 2px solid #f43f5e;
      box-shadow: 0 0 45px rgba(244, 63, 94, 0.75);
    }

    /* BANNER SCI-FI A 4 GRADI DI RISOLUZIONE & AURA AL PLASMA */
    .resolution-banner-container {
      position: fixed;
      top: 44%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 22000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .banner-grade-convergenza {
      background: linear-gradient(135deg, rgba(8, 145, 178, 0.95), rgba(15, 23, 42, 0.98));
      border: 2px solid #00f2fe;
      box-shadow: 0 0 35px rgba(0, 242, 254, 0.8), inset 0 0 15px rgba(0, 242, 254, 0.3);
      animation: popConvergenza 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .banner-grade-sincronia {
      background: linear-gradient(135deg, rgba(5, 150, 105, 0.95), rgba(6, 78, 59, 0.98));
      border: 2px solid #10b981;
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.85), inset 0 0 15px rgba(16, 185, 129, 0.35);
      animation: popSincronia 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .banner-grade-risonanza {
      background: linear-gradient(135deg, rgba(202, 138, 4, 0.95), rgba(69, 26, 3, 0.98));
      border: 2px solid #facc15;
      box-shadow: 0 0 45px rgba(250, 204, 21, 0.9), inset 0 0 20px rgba(250, 204, 21, 0.4);
      animation: popRisonanza 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    .banner-grade-eclissi {
      background: linear-gradient(135deg, rgba(217, 70, 239, 0.95), rgba(59, 7, 100, 0.98));
      border: 2.5px solid #ffffff;
      box-shadow: 0 0 60px rgba(217, 70, 239, 1), 0 0 25px #ffffff, inset 0 0 25px rgba(217, 70, 239, 0.6);
      animation: popEclissiTotale 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes popConvergenza {
      0% { transform: scale(0.6); opacity: 0; }
      25% { transform: scale(1.08); opacity: 1; }
      75% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.85); opacity: 0; }
    }
    @keyframes popSincronia {
      0% { transform: scale(0.5) rotate(-3deg); opacity: 0; }
      25% { transform: scale(1.12) rotate(0deg); opacity: 1; }
      75% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.85); opacity: 0; }
    }
    @keyframes popRisonanza {
      0% { transform: scale(0.4) rotate(3deg); opacity: 0; }
      20% { transform: scale(1.18) rotate(0deg); opacity: 1; }
      75% { transform: scale(1.02); opacity: 1; }
      100% { transform: scale(0.85); opacity: 0; }
    }
    @keyframes popEclissiTotale {
      0% { transform: scale(0.3); opacity: 0; filter: brightness(3); }
      15% { transform: scale(1.25); opacity: 1; filter: brightness(1.5); }
      75% { transform: scale(1.05); opacity: 1; filter: brightness(1); }
      100% { transform: scale(0.8); opacity: 0; }
    }

    .streak-plasma-active {
      animation: plasmaOvercharge 2s infinite alternate ease-in-out !important;
      border: 1.5px solid #00f2fe !important;
    }
    @keyframes plasmaOvercharge {
      0% { box-shadow: 0 0 15px rgba(0, 242, 254, 0.4), inset 0 0 10px rgba(217, 70, 239, 0.2); }
      50% { box-shadow: 0 0 30px rgba(217, 70, 239, 0.6), inset 0 0 18px rgba(0, 242, 254, 0.4); }
      100% { box-shadow: 0 0 25px rgba(0, 242, 254, 0.7), inset 0 0 15px rgba(217, 70, 239, 0.35); }
    }

    /* SCREEN SHAKES */
    @keyframes screenShakeLight {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 2px); }
      50% { transform: translate(2px, -2px); }
      75% { transform: translate(-1px, 1px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes screenShakeHeavy {
      0% { transform: translate(0, 0); }
      20% { transform: translate(-5px, 5px); }
      40% { transform: translate(5px, -5px); }
      60% { transform: translate(-4px, -3px); }
      80% { transform: translate(4px, 3px); }
      100% { transform: translate(0, 0); }
    }
    .anim-shake-light { animation: screenShakeLight 0.25s ease-in-out; }
    .anim-shake-heavy { animation: screenShakeHeavy 0.45s ease-in-out; }

    /* FLUSSI NUMERICI FLOTTANTI SPAZIALIZZATI */
    .floating-combat-text {
      position: fixed;
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.15rem, 3.2vw, 1.55rem);
      font-weight: 900;
      text-shadow: 0 0 14px currentColor, 0 2px 4px #000;
      pointer-events: none;
      z-index: 19000;
      white-space: nowrap;
    }
    .ftext-top-right {
      top: 18%;
      right: 12%;
      animation: floatDamageRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes floatDamageRight {
      0% { transform: translateY(0) scale(0.7); opacity: 0; }
      20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
      80% { transform: translateY(-25px) scale(1); opacity: 1; }
      100% { transform: translateY(-40px) scale(0.85); opacity: 0; }
    }
    .ftext-bottom-left {
      bottom: 22%;
      left: 12%;
      animation: floatHealLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes floatHealLeft {
      0% { transform: translateY(0) scale(0.7); opacity: 0; }
      20% { transform: translateY(-10px) scale(1.15); opacity: 1; }
      80% { transform: translateY(-25px) scale(1); opacity: 1; }
      100% { transform: translateY(-40px) scale(0.85); opacity: 0; }
    }
    .ftext-cascade-left {
      left: 8%;
      animation: floatCascadeLeft 1.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes floatCascadeLeft {
      0% { transform: translateY(0) scale(0.75); opacity: 0; }
      20% { transform: translateY(-8px) scale(1.1); opacity: 1; }
      80% { transform: translateY(-20px) scale(1); opacity: 1; }
      100% { transform: translateY(-35px) scale(0.8); opacity: 0; }
    }

    .vignette-warning-20s {
      position: fixed;
      inset: 0;
      box-shadow: inset 0 0 50px rgba(245, 158, 11, 0.35);
      pointer-events: none;
      z-index: 12000;
      animation: pulseGlow 1.2s infinite alternate;
    }
    .vignette-critical-10s {
      position: fixed;
      inset: 0;
      box-shadow: inset 0 0 75px rgba(239, 68, 68, 0.55);
      pointer-events: none;
      z-index: 12000;
      animation: pulseGlow 0.6s infinite alternate;
    }

    /* HOME PEDESTAL & 4 ASSI 3D */
    .corner-ace-fan-container {
      position: relative;
      cursor: pointer;
      width: 68px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .corner-ace-fan-container:hover {
      transform: scale(1.14);
      z-index: 25;
    }
    .corner-card-under {
      position: absolute;
      z-index: 1;
      transition: transform 0.25s ease, filter 0.25s ease;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.9));
      pointer-events: none;
    }
    .corner-card-top {
      position: absolute;
      z-index: 2;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .fan-nw .corner-card-under { transform: translate(-14px, -3px) rotate(-26deg); }
    .fan-nw .corner-card-top { transform: translate(5px, 2px) rotate(8deg); }
    .fan-nw:hover .corner-card-under { transform: translate(-18px, -5px) rotate(-32deg); }
    .fan-nw:hover .corner-card-top { transform: translate(7px, 3px) rotate(12deg); }

    .fan-ne .corner-card-under { transform: translate(14px, -3px) rotate(26deg); }
    .fan-ne .corner-card-top { transform: translate(-5px, 2px) rotate(-8deg); }
    .fan-ne:hover .corner-card-under { transform: translate(18px, -5px) rotate(32deg); }
    .fan-ne:hover .corner-card-top { transform: translate(-7px, 3px) rotate(-12deg); }

    .fan-sw .corner-card-under { transform: translate(-14px, 3px) rotate(-26deg); }
    .fan-sw .corner-card-top { transform: translate(5px, -2px) rotate(8deg); }
    .fan-sw:hover .corner-card-under { transform: translate(-18px, 5px) rotate(-32deg); }
    .fan-sw:hover .corner-card-top { transform: translate(7px, -3px) rotate(12deg); }

    .fan-se .corner-card-under { transform: translate(14px, 3px) rotate(26deg); }
    .fan-se .corner-card-top { transform: translate(-5px, -2px) rotate(-8deg); }
    .fan-se:hover .corner-card-under { transform: translate(18px, 5px) rotate(32deg); }
    .fan-se:hover .corner-card-top { transform: translate(-7px, -3px) rotate(-12deg); }

    .fan-ace-card {
      width: 36px;
      height: 52px;
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.99) 100%);
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 2px 3px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.85);
      user-select: none;
    }
    .fan-ace-index-tl, .fan-ace-index-br {
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 0.52rem;
      line-height: 0.9;
    }
    .fan-ace-index-br { transform: rotate(180deg); }
    .fan-ace-center {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      line-height: 1;
    }

    .corner-nw { position: absolute; top: 6px; left: 6px; z-index: 4; }
    .corner-ne { position: absolute; top: 6px; right: 6px; z-index: 4; }
    .corner-sw { position: absolute; bottom: 6px; left: 6px; z-index: 4; }
    .corner-se { position: absolute; bottom: 6px; right: 6px; z-index: 4; }

        .trophy-pedestal-container {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: auto 0;
    }
    .trophy-beam {
      position: absolute;
      width: clamp(100px, 25vw, 140px);
      height: clamp(130px, 24dvh, 180px);
      background: radial-gradient(ellipse at 50% 50%, rgba(0, 242, 254, 0.25) 0%, transparent 70%);
      pointer-events: none;
      animation: pulseGlow 3s infinite alternate;
    }
    .hero-card-anim { animation: heroFloat 4s infinite alternate ease-in-out; }
    /* ANIMAZIONI DEL VORTICE SINCRONIZZATO ALLA CARTA (4s) */
    @keyframes vortexSwirlOuter {
      0%, 100% {
        transform: scale(0.82, 0.25) rotate(0deg);
        box-shadow: 0 0 12px rgba(0, 242, 254, 0.45), inset 0 0 8px rgba(0, 242, 254, 0.25);
        opacity: 0.7;
      }
      50% {
        transform: scale(1.25, 0.38) rotate(180deg);
        box-shadow: 0 0 32px rgba(0, 242, 254, 1), 0 0 50px rgba(168, 85, 247, 0.7), inset 0 0 20px rgba(0, 242, 254, 0.85);
        opacity: 1;
      }
    }

    @keyframes vortexSpinInner {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(-360deg); }
    }

    @keyframes vortexCorePulse {
      0%, 100% { opacity: 0.4; transform: scale(0.65); }
      50% { opacity: 1; transform: scale(1.4); }
    }

    .trophy-base-platform {
      position: relative;
      width: clamp(80px, 20vmin, 105px);
      height: clamp(80px, 20vmin, 105px);
      background: radial-gradient(circle, rgba(0, 242, 254, 0.45) 0%, rgba(14, 116, 144, 0.25) 45%, rgba(2, 6, 23, 0.9) 75%, transparent 100%);
      border: 2px dashed #00f2fe;
      border-radius: 50%;
      margin-top: -34px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: vortexSwirlOuter 4s infinite ease-in-out;
      pointer-events: none;
      z-index: 1;
    }

    .trophy-base-ring {
      width: 65%;
      height: 65%;
      border-radius: 50%;
      border: 1.5px dashed rgba(250, 204, 21, 0.85);
      box-shadow: 0 0 12px rgba(250, 204, 21, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: vortexSpinInner 2s linear infinite;
    }

    .trophy-base-core {
      width: 32%;
      height: 32%;
      border-radius: 50%;
      background: radial-gradient(circle, #ffffff 0%, #00f2fe 70%, transparent 100%);
      box-shadow: 0 0 14px #00f2fe, 0 0 24px #ffffff;
      animation: vortexCorePulse 4s infinite ease-in-out;
    }


    .home-side-btn {
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: clamp(0.35rem, 0.8dvh, 0.55rem) 0.2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      cursor: pointer;
      font-size: 0.62rem;
      font-weight: 800;
      transition: all 0.2s;
    }
    .home-side-btn:active { transform: scale(0.94); }

    .varchi-relic-pulse {
      border-color: #fde047 !important;
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.85) !important;
      animation: pulseGlow 1.2s infinite alternate ease-in-out;
    }

    /* SPOTLIGHT INTERATTIVO HOME */
    .spotlight-tour-overlay {
      position: fixed;
      inset: 0;
      z-index: 30000;
      pointer-events: auto;
    }
    .spotlight-cutout-box {
      position: absolute;
      border-radius: 10px;
      box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.88);
      border: 2px solid #00f2fe;
      animation: spotlightPulse 1.5s infinite alternate ease-in-out;
      pointer-events: none;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes spotlightPulse {
      from { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.88), 0 0 14px rgba(0, 242, 254, 0.5); }
      to { box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.88), 0 0 28px rgba(0, 242, 254, 0.95); }
    }
    .spotlight-tooltip-card {
      position: absolute;
      max-width: 420px;
      width: 92%;
      z-index: 30001;
      animation: spotlightPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      transition: top 0.35s ease, bottom 0.35s ease;
    }

    /* MODALI DISCOVERY */
    .discovery-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 4, 12, 0.94);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 34000;
      padding: 1rem;
    }
    .discovery-modal-card {
      max-width: 440px;
      width: 100%;
      padding: 1.5rem;
      text-align: center;
      animation: spotlightPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .aiuti-toggle-btn {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 900;
      cursor: pointer;
      transition: all 0.2s;
    }
    .aiuti-toggle-btn.on {
      background: rgba(16, 185, 129, 0.25);
      border: 1px solid #10b981;
      color: #6ee7b7;
    }
    .aiuti-toggle-btn.off {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }

    .pvp-channel-card {
      background: rgba(15, 23, 42, 0.85);
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 0.85rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.2s;
    }
    .pvp-channel-card:active { transform: scale(0.98); }
    .pvp-channel-card.locked { opacity: 0.45; cursor: not-allowed; }
    .pvp-ticket-counter {
      font-size: 0.65rem;
      font-weight: 900;
      color: #fde047;
      background: rgba(234, 179, 8, 0.2);
      border: 1px solid #facc15;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .epic-battle-slot {
      background: rgba(15, 23, 42, 0.9);
      border: 1.5px solid #facc15;
      border-radius: 6px;
      padding: 2px 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: all 0.2s;
    }
    .epic-battle-slot.used {
      opacity: 0.4;
      filter: grayscale(0.8);
      cursor: not-allowed;
    }

    /* BANCO TERRENO COPERTO A 5 SLOT */
    .terrain-slot-bar {
      display: flex;
      justify-content: center;
      gap: clamp(3px, 1vw, 6px);
      width: 100%;
      padding: 2px 0;
      perspective: 800px;
    }
      .terrain-slot-card {
      width: clamp(22px, 5.5vw, 30px);
      height: clamp(22px, 3.2dvh, 28px);

      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s;
      transform-style: preserve-3d;
      flex-shrink: 0;
    }

    .terrain-slot-card.face-down {
      background: linear-gradient(145deg, #0f172a 0%, #020617 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.4);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
    }
    .terrain-slot-card.face-up {
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
      transform: rotateY(0deg) scale(1.04);
    }
    .terrain-slot-card.triggered {
      animation: terrainTriggerPulse 1.2s infinite alternate ease-in-out;
    }
    .terrain-slot-card.exhausted {
      opacity: 0.4;
      filter: grayscale(0.85);
      border-style: dashed !important;
    }
    @keyframes terrainTriggerPulse {
      0% { transform: translateY(0) scale(1); box-shadow: 0 0 8px currentColor; }
      50% { transform: translateY(-3px) scale(1.1); box-shadow: 0 0 20px currentColor, 0 0 30px #ffffff; }
      100% { transform: translateY(0) scale(1); box-shadow: 0 0 8px currentColor; }
    }
    .terrain-rearm-btn {
      position: absolute;
      top: -8px;
      right: -6px;
      background: #9333ea;
      color: #ffffff;
      font-size: 0.5rem;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #e879f9;
      box-shadow: 0 0 6px rgba(232, 121, 249, 0.8);
      cursor: pointer;
      z-index: 20;
    }

    /* DIGITAL DICE SCREEN */
    .digital-roll-container {
      display: flex;
      justify-content: center;
      gap: 1.25rem;
      margin: 1rem 0;
    }
    .digital-dice-screen {
      width: clamp(75px, 18vw, 95px);
      height: clamp(85px, 20vw, 110px);
      background: rgba(2, 6, 23, 0.92);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-around;
      padding: 0.4rem;
    }
    .digital-cycling { animation: diceShake 0.1s infinite; }

    /* ANIMAZIONI PROCEDURALI */
    @keyframes spinRadar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulseGlow { from { filter: drop-shadow(0 0 4px currentColor); } to { filter: drop-shadow(0 0 14px currentColor); } }
    @keyframes heroFloat {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-8px) rotate(1deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes attackReadyPulse {
      from { transform: scale(1); box-shadow: 0 0 14px rgba(52, 211, 153, 0.5); }
      to { transform: scale(1.03); box-shadow: 0 0 26px rgba(52, 211, 153, 0.9); }
    }
    @keyframes suggestPulse {
      from { box-shadow: 0 0 6px #00f2fe; }
      to { box-shadow: 0 0 16px #00f2fe; border-color: #00f2fe; }
    }
    @keyframes turnBannerPop {
      0% { transform: scale(0.6); opacity: 0; }
      30% { transform: scale(1.08); opacity: 1; }
      70% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    @keyframes spotlightPop { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes diceShake {
      0% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(-2px, 2px) rotate(-2deg); }
      50% { transform: translate(2px, -1px) rotate(2deg); }
      75% { transform: translate(-1px, -2px) rotate(-1deg); }
      100% { transform: translate(1px, 2px) rotate(1deg); }
    }
    @keyframes animShakeScreen {
      0% { transform: translate(0,0); }
      20% { transform: translate(-4px, 4px); }
      40% { transform: translate(4px, -4px); }
      60% { transform: translate(-3px, -2px); }
      80% { transform: translate(3px, 2px); }
      100% { transform: translate(0,0); }
    }

    .anim-shake { animation: animShakeScreen 0.4s ease-in-out; }
    .anim-damage { animation: animDamageFlash 0.45s ease-out; }
    .anim-heal { animation: animHealFlash 0.45s ease-out; }

    @keyframes animDamageFlash { 0% { background: rgba(220, 38, 38, 0.4); } 100% { background: transparent; } }
    @keyframes animHealFlash { 0% { background: rgba(16, 185, 129, 0.4); } 100% { background: transparent; } }

    /* OVERLAY VFX ABILITÃ€ */
    .vfx-timewarp-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 16000;
      background: radial-gradient(circle, rgba(0, 242, 254, 0.25) 0%, transparent 80%);
      animation: pulseGlow 0.4s ease-out;
    }
    .vfx-heal-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 16000;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 80%);
      animation: pulseGlow 0.4s ease-out;
    }
    .vfx-plasma-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 16000;
      background: radial-gradient(circle, rgba(239, 68, 68, 0.28) 0%, transparent 80%);
      animation: pulseGlow 0.4s ease-out;
    }
    .vfx-emp-glitch {
      position: fixed; inset: 0; pointer-events: none; z-index: 16000;
      background: radial-gradient(circle, rgba(192, 132, 252, 0.28) 0%, transparent 80%);
      animation: diceShake 0.4s ease-out;
    }
      .vfx-siphon-overlay {
      position: fixed; inset: 0; pointer-events: none; z-index: 16000;
      background: radial-gradient(circle, rgba(217, 70, 239, 0.25) 0%, transparent 80%);
      animation: pulseGlow 0.4s ease-out;
    }

       /* ========================================================================== */
    /* POPUP TUTORIAL 3D IN RILIEVO: VASSOIO INCASSATO & POZZETTI CINETICI       */
    /* ========================================================================== */
    .modal-backdrop-3d {
      position: fixed;
      inset: 0;
      background: rgba(1, 3, 8, 0.78);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(6px, 1.5dvh, 12px);
      z-index: 34000;
    }

    .tactile-chassis {
      position: relative;
      max-width: min(420px, 92vw);
      width: 100%;
      max-height: 94dvh;
      background: linear-gradient(175deg, rgba(16, 28, 64, 0.96) 0%, rgba(7, 13, 33, 0.98) 55%, rgba(2, 5, 15, 1) 100%);
      border-radius: clamp(16px, 3dvh, 28px);
      padding: clamp(10px, 2dvh, 18px) clamp(10px, 2.5vw, 16px);
      border: 2px solid #00f2fe;
      box-shadow: 
        0 20px 50px rgba(0, 0, 0, 0.95),
        0 0 25px rgba(0, 242, 254, 0.35),
        inset 0 2px 3px rgba(255, 255, 255, 0.7),
        inset 0 -4px 10px rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      gap: clamp(6px, 1.2dvh, 12px);
      box-sizing: border-box;
      animation: spotlightPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tactile-chassis::before {
      content: '';
      position: absolute;
      top: 0;
      left: 12%;
      right: 12%;
      height: 3px;
      background: linear-gradient(90deg, transparent, #00f2fe, #facc15, #00f2fe, transparent);
      filter: drop-shadow(0 0 8px #00f2fe);
      border-radius: 50%;
    }

    .badge-ridge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: linear-gradient(180deg, #0b1a38 0%, #030816 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.5);
      padding: 2px 10px;
      border-radius: 20px;
      font-size: clamp(0.55rem, 1dvh, 0.62rem);
      font-weight: 900;
      letter-spacing: 1px;
      color: #00f2fe;
      text-shadow: 0 0 8px #00f2fe;
    }

    .title-embossed {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(0.9rem, 2.2dvh, 1.15rem);
      font-weight: 900;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #ffffff;
      margin: 0;
      line-height: 1.15;
      text-shadow: 
        0 1px 0 #ffffff,
        0 2px 0 #0284c7,
        0 0 16px rgba(0, 242, 254, 0.7);
    }

    .rule-box {
      font-size: clamp(0.68rem, 1.3dvh, 0.78rem);
      font-weight: 700;
      color: #cbd5e1;
      line-height: 1.3;
      max-width: 340px;
      margin: 0;
    }
    .rule-box strong { color: #facc15; text-shadow: 0 0 8px rgba(250, 204, 21, 0.6); }

    .dock-bed {
      width: 100%;
      background: linear-gradient(180deg, rgba(3, 7, 20, 0.9) 0%, rgba(1, 3, 10, 0.95) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.25);
      border-radius: 16px;
      padding: clamp(8px, 1.5dvh, 14px) 4px clamp(6px, 1dvh, 10px) 4px;
      box-shadow: 
        inset 0 4px 10px rgba(0, 0, 0, 0.9),
        0 1px 1px rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      position: relative;
      box-sizing: border-box;
    }

    .pad-station {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      background: transparent;
      border: none;
      outline: none;
      padding: 0 2px;
    }

    .pad-tag {
      font-size: clamp(0.52rem, 0.95dvh, 0.62rem);
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .monolith-number {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(1.05rem, 2.5dvh, 1.35rem);
      font-weight: 900;
      line-height: 1;
      margin-bottom: -4px;
      z-index: 5;
      color: #ffffff;
      animation: floatSync 2.4s infinite ease-in-out;
      transition: transform 0.25s, text-shadow 0.25s;
    }

    .pit-socket {
      position: relative;
      width: clamp(55px, 15vw, 75px);
      height: clamp(18px, 2.8dvh, 24px);
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #050b18 55%, #0e1b38 100%);
      border: 2px solid;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      animation: socketBreatheSync 2.4s infinite ease-in-out;
    }

    .pit-core-lens {
      width: 55%;
      height: 35%;
      border-radius: 50%;
      filter: blur(1.5px);
      animation: corePulseSync 2.4s infinite ease-in-out;
    }

    .dmg-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(0.58rem, 1.1dvh, 0.68rem);
      font-weight: 900;
      margin-top: 5px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .pad-sep {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.75rem;
      font-weight: 900;
      color: #334155;
      margin-bottom: 12px;
    }

    @keyframes floatSync {
      0%, 100% { transform: translateY(-4px) scale(1); }
      50% { transform: translateY(-12px) scale(1.06); }
    }

    @keyframes socketBreatheSync {
      0%, 100% { transform: scaleX(0.96) scaleY(0.96); }
      50% { transform: scaleX(1.08) scaleY(1.1); }
    }

    @keyframes corePulseSync {
      0%, 100% { opacity: 0.55; transform: scale(0.95); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    /* COLORI PER OPERATORE E TIPOLOGIA */
    .station-cyan .pad-tag { color: #38bdf8; text-shadow: 0 0 8px #00f2fe; }
    .station-cyan .dmg-readout { color: #7dd3fc; text-shadow: 0 0 8px #00f2fe; }
    .station-cyan .pit-socket {
      border-color: #00f2fe;
      box-shadow: inset 0 4px 8px #000, 0 0 16px rgba(0, 242, 254, 0.65), inset 0 0 10px rgba(0, 242, 254, 0.4);
    }
    .station-cyan .pit-core-lens { background: #00f2fe; box-shadow: 0 0 12px #00f2fe; }
    .station-cyan .monolith-number {
      text-shadow: 0 1px 0 #ffffff, 0 2px 0 #00f2fe, 0 0 16px #00f2fe;
    }

    .station-gold .pad-tag { color: #fde047; text-shadow: 0 0 8px #facc15; }
    .station-gold .dmg-readout { color: #fef08a; text-shadow: 0 0 8px #facc15; }
    .station-gold .pit-socket {
      border-color: #facc15;
      box-shadow: inset 0 4px 8px #000, 0 0 16px rgba(250, 204, 21, 0.65), inset 0 0 10px rgba(250, 204, 21, 0.4);
    }
    .station-gold .pit-core-lens { background: #facc15; box-shadow: 0 0 12px #facc15; }
    .station-gold .monolith-number {
      text-shadow: 0 1px 0 #ffffff, 0 2px 0 #facc15, 0 0 16px #facc15;
    }

    .station-magenta .pad-tag { color: #f5d0fe; text-shadow: 0 0 8px #d946ef; }
    .station-magenta .dmg-readout { color: #fbcfe8; text-shadow: 0 0 8px #d946ef; }
    .station-magenta .pit-socket {
      border-color: #d946ef;
      box-shadow: inset 0 4px 8px #000, 0 0 16px rgba(217, 70, 239, 0.65), inset 0 0 10px rgba(217, 70, 239, 0.4);
    }
    .station-magenta .pit-core-lens { background: #d946ef; box-shadow: 0 0 12px #d946ef; }
    .station-magenta .monolith-number {
      text-shadow: 0 1px 0 #ffffff, 0 2px 0 #d946ef, 0 0 16px #d946ef;
    }

    .station-emerald .pad-tag { color: #6ee7b7; text-shadow: 0 0 8px #10b981; }
    .station-emerald .dmg-readout { color: #a7f3d0; text-shadow: 0 0 8px #10b981; }
    .station-emerald .pit-socket {
      border-color: #10b981;
      box-shadow: inset 0 4px 8px #000, 0 0 16px rgba(16, 185, 129, 0.65), inset 0 0 10px rgba(16, 185, 129, 0.4);
    }
    .station-emerald .pit-core-lens { background: #10b981; box-shadow: 0 0 12px #10b981; }
    .station-emerald .monolith-number {
      text-shadow: 0 1px 0 #ffffff, 0 2px 0 #10b981, 0 0 16px #10b981;
    }

    .station-crimson .pad-tag { color: #fca5a5; text-shadow: 0 0 8px #ef4444; }
    .station-crimson .dmg-readout { color: #fecaca; text-shadow: 0 0 8px #ef4444; }
    .station-crimson .pit-socket {
      border-color: #ef4444;
      box-shadow: inset 0 4px 8px #000, 0 0 16px rgba(239, 68, 68, 0.65), inset 0 0 10px rgba(239, 68, 68, 0.4);
    }
    .station-crimson .pit-core-lens { background: #ef4444; box-shadow: 0 0 12px #ef4444; }
    .station-crimson .monolith-number {
      text-shadow: 0 1px 0 #ffffff, 0 2px 0 #ef4444, 0 0 16px #ef4444;
    }

    .tactile-btn {
      width: 100%;
      background: linear-gradient(180deg, #00f2fe 0%, #0284c7 45%, #034870 100%);
      border: 2px solid #e0f2fe;
      border-radius: 16px;
      padding: clamp(7px, 1.4dvh, 12px) 10px;
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(0.75rem, 1.4dvh, 0.88rem);
      font-weight: 900;
      letter-spacing: 1px;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 
        0 4px 0 #01283d,
        0 10px 20px rgba(0, 242, 254, 0.55),
        inset 0 2px 2px rgba(255, 255, 255, 0.8);
      flex-shrink: 0;
    }
    .tactile-btn:active {
      transform: translateY(3px);
      box-shadow: 
        0 1px 0 #01283d,
        0 4px 10px rgba(0, 242, 254, 0.4);
    }


  `;
  document.head.appendChild(styleEl);
})();

// ============================================================================
// 2.6 COMPONENTE BANNER DI RISOLUZIONE DEI COLPI (LINGUAGGIO COMUNE)
// ============================================================================
function ResolutionGradeBanner({ grade, streakCount = 0, onAnimationEnd }) {
  if (!grade) return null;

  let gradeClass = 'banner-grade-convergenza';
  let title = 'COLPO A SEGNO!';
  let subtitle = 'Calcolo riuscito';
  let color = '#00f2fe';

  const normalized = String(grade).toLowerCase();

  if (normalized.includes('sincronia')) {
    gradeClass = 'banner-grade-sincronia';
    title = 'COLPO VELOCE!';
    subtitle = 'Calcolo rapido e preciso';
    color = '#10b981';
  } else if (normalized.includes('risonanza')) {
    gradeClass = 'banner-grade-risonanza';
    title = 'GRAN COLPO!';
    subtitle = 'Ottima combinazione di carte';
    color = '#facc15';
  } else if (normalized.includes('eclissi')) {
    gradeClass = 'banner-grade-eclissi';
    title = 'POKER DI SEMI!';
    subtitle = 'Tutti e 4 i semi insieme!';
    color = '#d946ef';
  }

  return (
    <div className="resolution-banner-container" onAnimationEnd={onAnimationEnd}>
      <div className={`cyber-panel ${gradeClass}`} style={{ padding: '0.85rem 1.8rem', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.62rem', color: '#ffffff', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
          {subtitle}
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#ffffff', textShadow: `0 0 14px ${color}, 0 0 28px ${color}`, margin: '2px 0' }}>
          {title}
        </div>
        {streakCount >= 2 && (
          <div style={{ fontSize: '0.7rem', color: '#fde047', fontWeight: '900', marginTop: '3px', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '6px', border: '1px solid #facc15', display: 'inline-block' }}>
            ⚡ SERIE DI COLPI x{streakCount}!
          </div>
        )}
      </div>
    </div>
  );
}



// 3.1 MODALE INTERATTIVO ANELLO BIFASICO DI MÃ–BIUS (MANUFATTO EPICO 1)
function MobiusBridgeModal({ playerHand, playerDeck, maxSwaps = 2, onConfirm, onCancel }) {
  const [selectedHandIdx, setSelectedHandIdx] = useState(null);
  const [selectedDeckIdx, setSelectedDeckIdx] = useState(null);
  const [tempHand, setTempHand] = useState([...playerHand]);
  const [tempDeck, setTempDeck] = useState([...playerDeck]);
  const [swapsLeft, setSwapsLeft] = useState(maxSwaps);

  const handleSwap = () => {
    if (selectedHandIdx === null || selectedDeckIdx === null || swapsLeft <= 0) return;
    try { playSound('card_slide'); } catch (_) {}

    const nextHand = [...tempHand];
    const nextDeck = [...tempDeck];
    const cardHand = nextHand[selectedHandIdx];
    const cardDeck = nextDeck[selectedDeckIdx];

    nextHand[selectedHandIdx] = cardDeck;
    nextDeck[selectedDeckIdx] = cardHand;

    setTempHand(nextHand);
    setTempDeck(nextDeck);
    setSelectedHandIdx(null);
    setSelectedDeckIdx(null);
    setSwapsLeft(prev => prev - 1);
  };

  const previewCards = tempDeck.slice(0, Math.min(tempDeck.length, 6));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 28000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '88vh', overflowY: 'auto', border: '2px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.55)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>MANUFATTO EPICO I</div>
          <h3 style={{ color: '#00f2fe', margin: '2px 0 0 0', fontWeight: '900', fontSize: '1.1rem', textShadow: '0 0 10px rgba(0, 242, 254, 0.6)' }}>
            Ponte Cronotopico di MÃ¶bius
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '4px 0 0 0' }}>
            Scambia carte della mano con quelle future del mazzo. Scambi disponibili: <strong style={{ color: '#fde047' }}>{swapsLeft}/{maxSwaps}</strong>
          </p>
        </div>

        {/* 1. Carte nella Mano del Giocatore */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.35rem' }}>
            1. Seleziona Carta dalla Mano:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {tempHand.map((c, idx) => {
              if (!c) return null;
              const isSelected = selectedHandIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => { try { playSound('select'); } catch (_) {} setSelectedHandIdx(idx); }}
                  className={`holo-card ${isSelected ? 'selected' : ''}`}
                  style={{ border: isSelected ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <span style={{ fontSize: '0.65rem', color: c.color }}>{c.symbol}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fff' }}>{c.displayVal || c.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Carte Future in Cima al Mazzo */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#facc15', fontWeight: 'bold', marginBottom: '0.35rem' }}>
            2. Seleziona Carta Futura dal Mazzo:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', background: 'rgba(2, 6, 23, 0.75)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {previewCards.map((c, idx) => {
              if (!c) return null;
              const isSelected = selectedDeckIdx === idx;
              return (
                <div
                  key={idx}
                  onClick={() => { try { playSound('select'); } catch (_) {} setSelectedDeckIdx(idx); }}
                  className={`holo-card ${isSelected ? 'selected' : ''}`}
                  style={{ border: isSelected ? '2px solid #fde047' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <span style={{ fontSize: '0.65rem', color: c.color }}>{c.symbol}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fde047' }}>{c.displayVal || c.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pulsante di Scambio Temporaneo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <button
            disabled={selectedHandIdx === null || selectedDeckIdx === null || swapsLeft <= 0}
            onClick={handleSwap}
            className="cyber-btn cyber-btn-warning"
            style={{ width: '100%', padding: '0.55rem', fontSize: '0.78rem', fontWeight: 'bold' }}
          >
            â‡„ Esegui Scambio Quantico
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="cyber-btn" onClick={onCancel} style={{ flex: 1, padding: '0.55rem' }}>Annulla</button>
          <button
            onClick={() => onConfirm(tempHand, tempDeck, maxSwaps - swapsLeft)}
            className="cyber-btn cyber-btn-primary"
            style={{ flex: 1.5, padding: '0.55rem', fontWeight: '900' }}
          >
            Conferma Plancia âž”
          </button>
        </div>
      </div>
    </div>
  );
}

// 3.2 MODALE INTERATTIVO FORCELLA NEUTONICA (MANUFATTO EPICO 2)
function NeutonicFusionModal({ playerHand, maxFuse = 2, activeAnomaly = null, onConfirm, onCancel }) {
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [selectedOp, setSelectedOp] = useState('+');

  const handleToggleCard = (idx) => {
    if (selectedIndices.includes(idx)) {
      try { playSound('deselect'); } catch (_) {}
      setSelectedIndices(prev => prev.filter(i => i !== idx));
    } else {
      if (selectedIndices.length >= maxFuse) {
        try { playSound('deselect'); } catch (_) {}
        return;
      }
      try { playSound('select'); } catch (_) {}
      setSelectedIndices(prev => [...prev, idx]);
    }
  };

  const selectedCards = selectedIndices.map(i => playerHand[i]).filter(Boolean);
  const fusedVal = calculateExpressionResult(selectedCards, selectedOp, activeAnomaly);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 28000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '480px', width: '100%', maxHeight: '88vh', overflowY: 'auto', border: '2px solid #f59e0b', boxShadow: '0 0 45px rgba(245, 158, 11, 0.55)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>MANUFATTO EPICO II</div>
          <h3 style={{ color: '#fde047', margin: '2px 0 0 0', fontWeight: '900', fontSize: '1.1rem', textShadow: '0 0 10px rgba(245, 158, 11, 0.6)' }}>
            Fusione a Risoluzione Neutonica
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '4px 0 0 0' }}>
            Fondi da 2 a {maxFuse} carte in una carta composita ad altissimo valore algebrico.
          </p>
        </div>

        {/* Selezione Carte da Fondere */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 'bold', marginBottom: '0.35rem' }}>
            Scegli carte da fondere ({selectedIndices.length}/{maxFuse}):
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {playerHand.map((c, idx) => {
              if (!c) return null;
              const isSelected = selectedIndices.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => handleToggleCard(idx)}
                  className={`holo-card ${isSelected ? 'selected' : ''}`}
                  style={{ border: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.2)' }}
                >
                  <span style={{ fontSize: '0.65rem', color: c.color }}>{c.symbol}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fff' }}>{c.displayVal || c.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selezione Operatore di Fusione */}
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#facc15', fontWeight: 'bold', marginBottom: '0.35rem' }}>
            Operatore di Fusione:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
            {['+', '-', '*', '/'].map(op => (
              <button
                key={op}
                onClick={() => { try { playSound('click'); } catch (_) {} setSelectedOp(op); }}
                className="cyber-btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  background: selectedOp === op ? '#d97706' : 'rgba(15, 23, 42, 0.8)',
                  borderColor: selectedOp === op ? '#fde047' : 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  fontWeight: '900'
                }}
              >
                {op}
              </button>
            ))}
          </div>
        </div>

        {/* Anteprima Risultato Fusione */}
        <div style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #f59e0b', textAlign: 'center', marginBottom: '1.1rem' }}>
          <div style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 'bold' }}>CARTA FUSA RISULTANTE:</div>
          <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#fde047', textShadow: '0 0 10px #f59e0b', margin: '2px 0' }}>
            {selectedIndices.length >= 2 && !isNaN(fusedVal) ? fusedVal : '---'}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
            {selectedIndices.length >= 2 ? selectedCards.map(c => c.value).join(` ${selectedOp} `) : 'Seleziona almeno 2 carte'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="cyber-btn" onClick={onCancel} style={{ flex: 1, padding: '0.55rem' }}>Annulla</button>
          <button
            disabled={selectedIndices.length < 2 || isNaN(fusedVal)}
            onClick={() => {
              const fusedCard = {
                id: `fused_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                value: fusedVal,
                displayVal: fusedVal.toString(),
                suit: 'diamonds',
                symbol: 'â‘‚',
                color: '#f59e0b',
                glow: 'rgba(245, 158, 11, 0.85)',
                isFused: true,
                isCourt: false,
                isJoker: false
              };
              onConfirm(fusedCard, selectedIndices);
            }}
            className="cyber-btn cyber-btn-warning"
            style={{ flex: 1.5, padding: '0.55rem', fontWeight: '900' }}
          >
            Genera Carta Fusa âž”
          </button>
        </div>
      </div>
    </div>
  );
}

// 3.3 MODALE INTERATTIVO ASTROLABIO A COORDINATE LIBERE (MANUFATTO EPICO 3)
function RewriteTargetModal({ objectives, maxTargets = 1, onConfirm, onCancel }) {
  const [targetValues, setTargetValues] = useState(() => objectives.map(o => (typeof o.target === 'number' ? o.target : 15)));

  const handleValueChange = (idx, delta) => {
    try { playSound('tick'); } catch (_) {}
    setTargetValues(prev => {
      const next = [...prev];
      next[idx] = Math.max(1, Math.min(99, (next[idx] || 15) + delta));
      return next;
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 28000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '460px', width: '100%', maxHeight: '88vh', overflowY: 'auto', border: '2px solid #10b981', boxShadow: '0 0 45px rgba(16, 185, 129, 0.55)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>MANUFATTO EPICO III</div>
          <h3 style={{ color: '#10b981', margin: '2px 0 0 0', fontWeight: '900', fontSize: '1.1rem', textShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }}>
            Astrolabio a Coordinate Libere
          </h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.72rem', margin: '4px 0 0 0' }}>
            Riscrivi direttamente il valore numerico dei bersagli algebrici sulla plancia (Max {maxTargets} bersaglio/i).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.1rem' }}>
          {objectives.slice(0, maxTargets).map((obj, idx) => {
            const isPattern = obj.type === 'pattern';
            return (
              <div key={idx} style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '0.65rem', borderRadius: '8px', border: `1px solid ${isPattern ? '#facc15' : 'rgba(16, 185, 129, 0.35)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: isPattern ? '#fde047' : '#94a3b8', fontWeight: 'bold' }}>
                    BERSAGLIO {idx + 1} {isPattern ? `[POKER: ${obj.name}]` : `[${obj.op}]`}:
                  </span>
                  <div style={{ fontSize: '1.15rem', fontWeight: '900', color: isPattern ? '#fde047' : '#6ee7b7' }}>
                    {isPattern ? obj.name : `${obj.op} ${targetValues[idx]}`}
                  </div>
                </div>

                {!isPattern ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => handleValueChange(idx, -5)} className="cyber-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>-5</button>
                    <button onClick={() => handleValueChange(idx, -1)} className="cyber-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>-1</button>
                    <button onClick={() => handleValueChange(idx, +1)} className="cyber-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>+1</button>
                    <button onClick={() => handleValueChange(idx, +5)} className="cyber-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>+5</button>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontStyle: 'italic' }}>Figura fissa</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="cyber-btn" onClick={onCancel} style={{ flex: 1, padding: '0.55rem' }}>Annulla</button>
          <button
            onClick={() => {
              const updated = objectives.map((o, idx) => {
                if (idx < maxTargets && o.type !== 'pattern') {
                  return { ...o, target: targetValues[idx] };
                }
                return o;
              });
              onConfirm(updated);
            }}
            className="cyber-btn cyber-btn-success"
            style={{ flex: 1.5, padding: '0.55rem', fontWeight: '900' }}
          >
            Riscrivi Coordinate ➔
          </button>
        </div>
      </div>
    </div>
  );
}


// 3.4 CINEMATICA DI APERTURA VARCO GRAVITAZIONALE NELLA CRIPTA
function RiftCollapseModal({ rift, relic1, relic2, epicItem, onComplete }) {
  const [phase, setPhase] = useState(1);

  useEffect(() => {
    try { playSound('rift_collapse'); } catch (_) {}
    const t1 = setTimeout(() => {
      setPhase(2);
      try { playSound('epic_item_trigger'); } catch (_) {}
    }, 1800);

    const t2 = setTimeout(() => {
      setPhase(3);
    }, 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 32000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.75rem', maxWidth: '440px', width: '100%', textAlign: 'center', border: `2px solid ${rift.color}`, boxShadow: `0 0 50px ${rift.glow}` }}>
        
        {phase === 1 && (
          <div style={{ animation: 'pulseGlow 1s infinite alternate' }}>
            <div style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 'bold', textTransform: 'uppercase' }}>FUSIONE RELIQUIE IN CORSO...</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', margin: '1.25rem 0' }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <RelicVisual relicId={relic1?.id} size={48} />
                <div style={{ fontSize: '0.65rem', color: relic1?.color, fontWeight: 'bold', marginTop: '4px' }}>{relic1?.planetName}</div>
              </div>
              <span style={{ fontSize: '1.8rem', color: '#00f2fe', alignSelf: 'center' }}>âš¡</span>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <RelicVisual relicId={relic2?.id} size={48} />
                <div style={{ fontSize: '0.65rem', color: relic2?.color, fontWeight: 'bold', marginTop: '4px' }}>{relic2?.planetName}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>I campi gravitazionali collassano creando una singolaritÃ  stabile...</p>
          </div>
        )}

        {phase >= 2 && (
          <div style={{ animation: 'spotlightPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', letterSpacing: '1px' }}>VARCO {rift.roman} STABILIZZATO!</div>
            <h2 style={{ color: epicItem.color, margin: '0.3rem 0', fontWeight: '900', fontSize: '1.25rem' }}>
              {epicItem.name}
            </h2>
            <div style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 'bold', marginBottom: '0.75rem' }}>
              Â« {epicItem.codeName} Â»
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
              <TacticalVisual id={epicItem.id} type="epic_item" color={epicItem.color} width={80} height={80} />
            </div>

                        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1.5px solid #00f2fe', borderRadius: '8px', padding: '0.65rem 0.85rem', margin: '0 0 1.1rem 0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 900, color: '#facc15', marginBottom: '4px' }}>
                <span>⚡ COSTO: 0 RISORSE</span>
                <span>⏱️ USO: 1 VOLTA A MATCH</span>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#ffffff', lineHeight: '1.35', margin: 0, fontWeight: 700 }}>
                {epicItem.desc}
              </p>
            </div>

            <button onClick={onComplete} className="cyber-btn cyber-btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '900' }}>
              Equipaggia in Plancia ➔
            </button>


          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================================
// 3.5 SCHEDA DI BRIEFING SETTORE (STILE FLUTTUANTE SENZA SCATOLE)
// ============================================================================
function CampaignLevelBriefingModal({
  planetNum,
  levelNum,
  playerPilotId = 'pilot_com_1',
  sectorStars = [false, false, false],
  onLaunch,
  onClose,
  credits = 200,
  isUnlocked = true,
  isReplay = false,
  scannerSeconds = 60,
  diamonds = 0,
  onBuyScannerRefill
}) {
  const specialChallenge = typeof getSectorSpecialChallenge === 'function' 
    ? getSectorSpecialChallenge(planetNum, levelNum) 
    : { name: 'Sfida Tattica', desc: 'Obiettivo speciale del settore' };

  const isBoss = levelNum === 10;

  const enemyPilot = typeof getSectorEncounterPilot === 'function'
    ? getSectorEncounterPilot(planetNum, levelNum)
    : null;
  const enemyPilotId = enemyPilot?.id || (isBoss ? `pilot_boss_${planetNum}` : 'pilot_com_1');
  const dominance = typeof evaluatePilotDominance === 'function'
    ? evaluatePilotDominance(playerPilotId, enemyPilotId)
    : null;
  const playerPilotObj = typeof getPilotById === 'function' ? getPilotById(playerPilotId) : null;
  const enemyPilotObj = enemyPilot || (typeof getPilotById === 'function' ? getPilotById(enemyPilotId) : null);

  const planetName = realPlanetNames?.[planetNum - 1] || `Pianeta ${planetNum}`;
  const zoneName = (PLANET_ZONE_NAMES?.[planetNum - 1] || [])[levelNum - 1] || `Settore ${levelNum}`;
  const modeOfSector = getSectorGameType(planetNum, levelNum);
  const cost = (levelNum <= 5 ? 5 : (levelNum <= 9 ? 10 : 15));
  const modifier = getPlanetLevelModifier(planetNum, levelNum);
  const reward = getLevelReward(planetNum, levelNum, isReplay);
  const relic = isBoss ? PLANET_BOSS_RELICS[planetNum] : null;

  let estimatedEnemyHp = 35;
  if (isBoss) {
    if (planetNum === 1) estimatedEnemyHp = 75;
    else if (planetNum === 2) estimatedEnemyHp = 100;
    else if (planetNum === 11) estimatedEnemyHp = 260;
    else if (planetNum === 14) estimatedEnemyHp = 320;
    else if (planetNum === 17) estimatedEnemyHp = 420;
    else if (planetNum === 20) estimatedEnemyHp = 800;
    else estimatedEnemyHp = Math.floor(75 + planetNum * 15);
  } else {
    estimatedEnemyHp = Math.floor(35 + (planetNum - 1) * 12 + levelNum * 2.5);
  }

    const modeLabels = {
    classic: { name: 'Classica (4 Operazioni)', color: '#00f2fe' },
    vector: { name: 'Vettore Geometrico', color: '#38bdf8' },
    double_stage: { name: 'Convergenza (Banco 2+2)', color: '#f59e0b' },
    tris: { name: 'Tris Stellare', color: '#a855f7' }
  };


  const currentModeInfo = modeLabels[modeOfSector] || modeLabels.classic;
  const canAfford = credits >= cost;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.9) 0%, rgba(1, 3, 10, 0.98) 100%)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 33000,
      padding: 'clamp(10px, 2vmin, 20px) 16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* INTESTAZIONE OLOGRAFICA FLUTTUANTE */}
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 }}>
        <div>
          <div style={{
            fontSize: 'clamp(0.6rem, 1.4vmin, 0.72rem)',
            color: isBoss ? '#f87171' : '#facc15',
            fontWeight: 900,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            textShadow: isBoss ? '0 0 10px rgba(239, 68, 68, 0.8)' : '0 0 10px rgba(250, 204, 21, 0.8)'
          }}>
            {isBoss ? '👑 TITANO PLANETARIO' : `SETTORE ${levelNum}/10`}
          </div>
          <h1 style={{
            margin: '2px 0 0 0',
            fontSize: 'clamp(1.2rem, 3vmin, 1.6rem)',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '1px',
            textShadow: '0 0 14px rgba(255, 255, 255, 0.6)'
          }}>
            {planetName} — {zoneName}
          </h1>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.4rem',
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>

      {/* CONFRONTO FORZE PILOTI SOSPESE SUL PIANO COSMICO */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(12px, 3.5vmin, 26px)',
        zIndex: 10,
        margin: 'auto 0'
      }}>
        {/* Pilota Giocatore */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ filter: 'drop-shadow(0 0 16px rgba(0, 242, 254, 0.6))' }}>
            <PilotCard pilot={playerPilotId} compact={true} isEquipped={true} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#00f2fe' }}>
            {playerPilotObj?.name || 'Tuo Pilota'}
          </span>
        </div>

        {/* Separatore VS con Verdetto Dominanza */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{
            fontSize: '1.1rem',
            fontWeight: 900,
            color: dominance?.status === 'PLAYER_DOMINANT' ? '#34d399' : (dominance?.status === 'ENEMY_DOMINANT' ? '#f87171' : '#facc15'),
            textShadow: '0 0 10px currentColor'
          }}>
            VS
          </span>
          <span style={{
            fontSize: '0.52rem',
            fontWeight: 900,
            color: dominance?.status === 'PLAYER_DOMINANT' ? '#34d399' : (dominance?.status === 'ENEMY_DOMINANT' ? '#fca5a5' : '#fde047'),
            letterSpacing: '0.5px'
          }}>
            {dominance?.status === 'PLAYER_DOMINANT' ? '+15% DANNO' : (dominance?.status === 'ENEMY_DOMINANT' ? '-15% DANNO' : '1.0x PARI')}
          </span>
        </div>

        {/* Pilota Nemico */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ filter: isBoss ? 'drop-shadow(0 0 18px rgba(239, 68, 68, 0.7))' : 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))' }}>
            <PilotCard pilot={enemyPilotObj || enemyPilotId} compact={true} isEquipped={false} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: isBoss ? '#f87171' : '#fff' }}>
            {enemyPilotObj?.name || (isBoss ? 'Titano' : 'Sentinella')}
          </span>
        </div>
      </div>

      {/* DETTAGLI MISSIONE & BERSAGLIO (TESTO FLUTTUANTE SENZA SCATOLE) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        textAlign: 'center',
        zIndex: 10,
        margin: 'auto 0'
      }}>
        <div style={{ fontSize: 'clamp(0.72rem, 1.8vmin, 0.88rem)', fontWeight: 900, color: currentModeInfo.color }}>
          {currentModeInfo.name} • Nemico: <span style={{ color: '#ef4444' }}>{estimatedEnemyHp} HP</span>
        </div>

        {modifier && modifier.id !== 'standard' && (
          <div style={{ fontSize: '0.65rem', color: '#c084fc', fontWeight: 700 }}>
            Anomalia: {modifier.name} ({modifier.desc})
          </div>
        )}

        <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '2px' }}>
          Sfida 3ª Stella: <strong style={{ color: '#fde047' }}>{specialChallenge.name}</strong> ({specialChallenge.desc})
        </div>
      </div>

      {/* SBLOCCHI DEL BOSS (SE LIVELLO 10: RELIQUIA + PILOTA + PIANETA SUCCESSIVO) */}
      {isBoss && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          zIndex: 10,
          margin: 'auto 0',
          padding: '6px 0',
          borderTop: '1px solid rgba(250, 204, 21, 0.3)',
          borderBottom: '1px solid rgba(250, 204, 21, 0.3)',
          width: '100%',
          maxWidth: '380px'
        }}>
          <div style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
            🏆 BOTTINO ALLA VITTORIA DEL TITANO
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px, 4vmin, 24px)' }}>
            {relic && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ filter: 'drop-shadow(0 0 10px #facc15)' }}>
                  <RelicVisual relicId={relic.id} size={28} />
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: 900 }}>{relic.name}</div>
                  <div style={{ fontSize: '0.52rem', color: '#94a3b8' }}>1/2 per il Varco I</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 8px #00f2fe)' }}>👤</span>
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <div style={{ fontSize: '0.65rem', color: '#00f2fe', fontWeight: 900 }}>Pilota {enemyPilotObj?.name || 'Gaia'}</div>
                <div style={{ fontSize: '0.52rem', color: '#94a3b8' }}>Sbloccato Gratis</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.58rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.5px' }}>
            ✦ SBLOCCHI: MARTE (P2) • SCOMMESSE DEL BANCO • DUELLI PVP ✦
          </div>
        </div>
      )}

      {/* RICOMPENSE STANDARD (SE NON BOSS) */}
      {!isBoss && reward && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fef08a' }}>+{reward.stardust} 🌟</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#00f2fe' }}>+{reward.xp} XP</span>
          {reward.diamonds > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f5d0fe' }}>+{reward.diamonds} 💎</span>}
        </div>
      )}

      {/* PULSANTE CINETICO FLUTTUANTE */}
      <div style={{ width: '100%', maxWidth: '360px', zIndex: 10, marginBottom: 'clamp(4px, 1vmin, 10px)' }}>
        <button
          type="button"
          disabled={!canAfford || !isUnlocked}
          onClick={onLaunch}
          className={`cyber-btn ${isBoss ? 'cyber-btn-warning' : 'cyber-btn-primary'}`}
          style={{
            width: '100%',
            padding: 'clamp(11px, 2.2vmin, 15px)',
            fontSize: 'clamp(0.88rem, 2vmin, 1.05rem)',
            fontWeight: 900,
            letterSpacing: '1px',
            boxShadow: isBoss ? '0 0 25px rgba(250, 204, 21, 0.65)' : '0 0 25px rgba(0, 242, 254, 0.65)'
          }}
        >
          {canAfford ? `CONFERMA & AVVIA (${cost}⚡) ➔` : `Crediti Insufficienti (${cost}⚡)`}
        </button>
      </div>

    </div>
  );
}



// ============================================================================
// 3.6 MODALE DISCOVERY TUTORIAL (CHASSIS 3D, DOCK-BED E POZZETTI CINETICI)
// ============================================================================
function FeatureDiscoveryModal({ tutorialKey, onDismiss }) {
  const tut = DISCOVERY_TUTORIALS[tutorialKey];
  if (!tut) return null;

  return (
    <div className="modal-backdrop-3d" onClick={onDismiss}>
      <div className="tactile-chassis" onClick={e => e.stopPropagation()}>
        
        {/* Targhetta Incisa */}
        <div className="badge-ridge">
          <span>⚡</span> {tut.subtitle || 'GUIDA TATTICA'}
        </div>

        {/* Titolo 3D Estruso */}
        <div className="title-embossed">
          {tut.title}
        </div>

        {/* Frase Psicologica / Regola */}
        <div className="rule-box" dangerouslySetInnerHTML={{ __html: tut.rule }} />

        {/* Vassoio Scavato (Dock-Bed) con Pozzetti Cinetici */}
        {Array.isArray(tut.pods) && tut.pods.length > 0 && (
          <div className="dock-bed">
            {tut.pods.map((pod, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="pad-sep">/</span>}
                <div className={`pad-station ${pod.type || 'station-cyan'}`}>
                  <span className="pad-tag">{pod.tag}</span>
                  <div className="monolith-number">{pod.num}</div>
                  <div className="pit-socket">
                    <div className="pit-core-lens"></div>
                  </div>
                  {pod.badge && <span className="dmg-readout">{pod.badge}</span>}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Pulsante Meccanico a Rilievo */}
        <button
          onClick={() => {
            try { playSound('click'); } catch (_) {}
            onDismiss();
          }}
          className="tactile-btn"
        >
          {tut.buttonText || 'ENTRA IN BATTAGLIA ➔'}
        </button>
      </div>
    </div>
  );
}



// Il Banco Terreno a Terra S8 viene equipaggiato automaticamente con Criostasi di Emergenza:
// nessun popup bloccante di scelta prima di aver compreso il valore delle difese.



// 3.7 SPOTLIGHT HOME TOUR MIRATO CON ILLUMINAZIONE DELLA SEZIONE IN QUESTIONE
function SpotlightHomeTour({ onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const tourSteps = [
    {
      targetId: 'tour-target-header',
      title: "1. Profilo Pilota & Barra Risorse",
      subtitle: "GESTIONE RISORSE SUPERIORE",
      desc: "In alto monitori il tuo Grado Pilota e la Barra XP. A destra trovi Crediti âš¡ (per avviare le partite), Vite ðŸ’” (rianimazioni), Polvere Stellare 🌟 (upgrade moduli) e Diamanti 💎 (acquisti rari e sblocchi). Tocca il tuo nome per visualizzare la Progressione Livelli 1â€“100.",
      icon: "trophy",
      color: "#00f2fe"
    },
                  {
      targetId: 'tour-target-left',
      title: "2. Ala Sinistra: Bazar Galattico",
      subtitle: "SHOP DEI COLLEZIONABILI",
      desc: "Accesso rapido al Bazar galattico: recluta Piloti, sblocca Mazzi, equipaggia Moduli, acquista Trappole Terreno e cambia Sfondi 3D.\n(Per convertire i Diamanti in risorse, tocca direttamente il contatore dei Diamanti in alto a destra).",
      icon: "shop_cart",
      color: "#00f2fe"
    },


    {
      targetId: 'tour-target-center',
      title: "3. Vano Centrale: Carosello & Assetto",
      subtitle: "PLANCIA D'ARMI & AREA PERSONALE",
      desc: "Carosello rotante a 5 slide per visualizzare Mazzo, Pilota, Modulo e le sub-rotazioni automatiche di Epici e Terreni. Tocca qualsiasi elemento o il pulsante 'Area Personale' per aprire il centro di comando completo.",
      icon: "deck_stack",
      color: "#fde047"
    },

       {
      targetId: 'tour-target-right',
      title: "4. Ala Destra: Hub & Servizi",
      subtitle: "CLASSIFICHE, REGOLE & OPZIONI",
      desc: "Qui controlli i tuoi Trofei PvP ed entri nella Classifica Settimanale Élite, consulti il Registro delle Regole e configuri le Impostazioni.\n(Per convertire i Diamanti in risorse, tocca direttamente il contatore dei Diamanti in alto a destra).",
      icon: "database",
      color: "#38bdf8"
    },

    {
      targetId: 'tour-target-bottom',
      title: "5. Barra Inferiore: Le 3 ModalitÃ  di Battaglia",
      subtitle: "CAMPAGNA, SCOMMESSE & DUELLO 1v1",
      desc: "In basso avvii le 3 modalitÃ  di gioco:\nâ€¢ Campagna Stellare: 200 settori attraverso 20 Pianeti con Boss e Reliquie.\nâ€¢ Scommesse del Banco: sfida l'IA simmetrica a quote fisse per vincere Diamanti garantiti.\nâ€¢ Duello 1v1: sfide online in tempo reale (Canale Addestramento & Lega Ã‰lite).",
      icon: "campaign",
      color: "#10b981"
    }
  ];

  const currentStep = tourSteps[stepIndex];

  useEffect(() => {
    const updateTargetPosition = () => {
      if (typeof document === 'undefined') return;
      const el = document.getElementById(currentStep.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8
        });
      } else {
        setTargetRect(null);
      }
    };

    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    return () => window.removeEventListener('resize', updateTargetPosition);
  }, [stepIndex, currentStep.targetId]);

  const isPositionedNearBottom = targetRect && (targetRect.top + targetRect.height / 2 > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400));

  return (
    <div className="spotlight-tour-overlay">
      {targetRect && (
        <div
          className="spotlight-cutout-box"
          style={{
            top: `${targetRect.top}px`,
            left: `${targetRect.left}px`,
            width: `${targetRect.width}px`,
            height: `${targetRect.height}px`,
            borderColor: currentStep.color
          }}
        />
      )}

      <div
        className="cyber-panel spotlight-tooltip-card"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          top: isPositionedNearBottom ? '10%' : 'auto',
          bottom: !isPositionedNearBottom ? '8%' : 'auto',
          padding: '1.15rem 1.3rem',
          border: `2px solid ${currentStep.color}`,
          boxShadow: `0 0 35px ${currentStep.color}88, inset 0 0 15px rgba(0,0,0,0.85)`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          <span style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: 'bold', letterSpacing: '1px' }}>
            GUIDA DELLA BASE ({stepIndex + 1}/{tourSteps.length})
          </span>
          <span style={{ fontSize: '0.6rem', background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: '4px', color: '#cbd5e1' }}>
            {currentStep.subtitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0.3rem 0' }}>
          <SciFiIcon name={currentStep.icon} size={22} color={currentStep.color} />
          <h3 style={{ color: currentStep.color, margin: 0, fontWeight: '900', fontSize: '1.05rem' }}>
            {currentStep.title}
          </h3>
        </div>

        <p style={{ color: '#cbd5e1', fontSize: '0.76rem', lineHeight: '1.4', margin: '0.45rem 0 1.15rem 0', whiteSpace: 'pre-line', textAlign: 'left' }}>
          {currentStep.desc}
        </p>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {stepIndex > 0 && (
            <button
              onClick={() => {
                try { playSound('click'); } catch (_) {}
                setStepIndex(s => s - 1);
              }}
              className="cyber-btn"
              style={{ flex: 1, padding: '0.55rem', fontSize: '0.78rem' }}
            >
              Indietro
            </button>
          )}

          <button
            onClick={() => {
              try { playSound('click'); } catch (_) {}
              if (stepIndex < tourSteps.length - 1) {
                setStepIndex(s => s + 1);
              } else {
                onComplete();
              }
            }}
            className="cyber-btn cyber-btn-primary"
            style={{ flex: 2, padding: '0.55rem', fontSize: '0.82rem', fontWeight: '900' }}
          >
            {stepIndex < tourSteps.length - 1 ? "Avanti âž”" : "Inizia a Giocare! ðŸš€"}
          </button>
        </div>
      </div>
    </div>
  );
}

// (FastIntroMiniTutorial rimosso: tutorial gestiti da FeatureDiscoveryModal)


// ============================================================================
// 3.10 CELEBRAZIONE VITTORIA COSMICA (STILE FLUTTUANTE HOME CON TACHIMETRO)
// ============================================================================
function CosmicVictoryModal({
  winnerName,
  nickname,
  isFirstLevelTutorial,
  isAdv,
  currentAdvLevel,
  currentPlanetName,
  rewards,
  starsResult,
  starsAnimStep,
  onNextLevel,
  onGoToRifts,
  onClose
}) {
  const isDraw = winnerName === 'DRAW_GAME' || String(winnerName).toLowerCase().includes('parit');
  const isPlayerWin = !isDraw && (winnerName === nickname || winnerName === 'Giocatore 1');
  const isBossVictory = Boolean(isPlayerWin && isAdv && currentAdvLevel === 10 && rewards?.relic);

  const [countDust, setCountDust] = useState(0);
  const [countXp, setCountXp] = useState(0);
  const [countDiamonds, setCountDiamonds] = useState(0);

  useEffect(() => {
    if (!rewards) return;
    let count = 0;
    const totalSteps = 16;
    const interval = setInterval(() => {
      count++;
      const ratio = count / totalSteps;
      setCountDust(Math.floor((rewards.stardust || 0) * ratio));
      setCountXp(Math.floor((rewards.xp || 0) * ratio));
      setCountDiamonds(Math.floor((rewards.diamonds || 0) * ratio));
      try { playSound('dopamine_tick'); } catch (_) {}

      if (count >= totalSteps) {
        clearInterval(interval);
        setCountDust(rewards.stardust || 0);
        setCountXp(rewards.xp || 0);
        setCountDiamonds(rewards.diamonds || 0);
      }
    }, 55);

    return () => clearInterval(interval);
  }, [rewards]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.88) 0%, rgba(1, 3, 10, 0.98) 100%)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 32000,
      padding: 'clamp(12px, 2.5vmin, 24px) 16px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
          {/* INTESTAZIONE OLOGRAFICA FLUTTUANTE */}
      <div style={{ textAlign: 'center', zIndex: 10, marginTop: 'clamp(2px, 0.8vmin, 10px)' }}>
             <div style={{
          fontSize: 'clamp(0.6rem, 1.4vmin, 0.72rem)',
          color: isDraw ? '#facc15' : (!isPlayerWin ? '#ef4444' : (isBossVictory ? '#fde047' : '#facc15')),
          fontWeight: 900,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: isDraw ? '0 0 10px rgba(250, 204, 21, 0.75)' : (!isPlayerWin ? '0 0 10px rgba(239, 68, 68, 0.75)' : '0 0 10px rgba(250, 204, 21, 0.75)')
        }}>
          {isDraw
            ? '✦ PARITÀ TATTICA ✦'
            : (!isPlayerWin
                ? '✗ MISSIONE FALLITA'
                : (isBossVictory 
                    ? '👑 TITANO PLANETARIO ABBATTUTO!' 
                    : (isFirstLevelTutorial ? '✦ ADDESTRAMENTO COMPLETATO ✦' : '✦ MISSIONE COMPIUTA ✦')))}
        </div>
        <h1 style={{
          margin: '3px 0 0 0',
          fontSize: 'clamp(1.3rem, 3.6vmin, 1.95rem)',
          fontWeight: 900,
          color: isDraw ? '#facc15' : (!isPlayerWin ? '#ef4444' : (isBossVictory ? '#facc15' : '#00f2fe')),
          letterSpacing: '1.5px',
          textShadow: isDraw ? '0 0 20px rgba(250, 204, 21, 0.9)' : (!isPlayerWin ? '0 0 20px rgba(239, 68, 68, 0.9)' : (isBossVictory ? '0 0 22px rgba(250, 204, 21, 0.9)' : '0 0 20px rgba(0, 242, 254, 0.9)'))
        }}>
          {isDraw
            ? 'PAREGGIO PER CARTE FINITE'
            : (isPlayerWin 
                ? (isBossVictory ? `CONQUISTA DI ${currentPlanetName.toUpperCase()}!` : (isFirstLevelTutorial ? 'PRIMA VITTORIA!' : 'VITTORIA TATTICA!'))
                : 'SCONFITTA TATTICA')}
        </h1>
      </div>


      {/* SEZIONE SPECIALE RELIQUIA DEL BOSS FLUTTUANTE NEL VUOTO */}
      {isBossVictory && rewards?.relic ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10,
          margin: 'auto 0'
        }}>
          <div style={{
            filter: 'drop-shadow(0 0 24px rgba(250, 204, 21, 0.95))',
            transform: 'scale(1.35)',
            animation: 'heroFloat 3s infinite ease-in-out'
          }}>
            <RelicVisual relicId={rewards.relic.id} size={56} />
          </div>

          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{ fontSize: 'clamp(0.85rem, 2vmin, 1.05rem)', fontWeight: 900, color: '#fde047', textShadow: '0 0 10px #facc15' }}>
              « {rewards.relic.name.toUpperCase()} »
            </div>
            <div style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 700, marginTop: '2px' }}>
              Reliquia 1/2 per il Varco I (Ponte Cronotopico)
            </div>
          </div>

          <div style={{
            fontSize: '0.62rem',
            color: '#34d399',
            fontWeight: 900,
            letterSpacing: '0.8px',
            background: 'rgba(6, 78, 59, 0.65)',
            padding: '2px 10px',
            borderRadius: '12px',
            border: '1px solid #10b981',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
          }}>
            ✓ NUOVO PILOTA SBLOCCATO: GAIA (GRATIS)
          </div>
        </div>
      ) : (
        /* LE 3 STELLE STANDARD PER SETTORI 1-9 */
        isPlayerWin && isAdv && starsResult && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            zIndex: 10,
            margin: 'auto 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(10px, 3vmin, 20px)' }}>
              {[1, 2, 3].map(starNum => {
                const earned = starsResult.stars[starNum - 1];
                const active = earned && starsAnimStep >= starNum;
                return (
                  <div
                    key={starNum}
                    style={{
                      transform: active ? 'scale(1.25)' : 'scale(0.85)',
                      opacity: active ? 1 : 0.25,
                      transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      filter: active ? 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.95))' : 'none'
                    }}
                  >
                    <svg width="42" height="42" viewBox="0 0 24 24" fill={active ? '#facc15' : '#334155'} stroke={active ? '#fde047' : '#1e293b'} strokeWidth="1.5">
                      <polygon points="12,2 15,8.5 22,9.2 16.8,14.3 18.2,21.5 12,17.8 5.8,21.5 7.2,14.3 2,9.2 9.2,8.5" />
                    </svg>
                  </div>
                );
              })}
            </div>

            <div style={{
              fontSize: 'clamp(0.62rem, 1.4vmin, 0.72rem)',
              color: '#cbd5e1',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textAlign: 'center'
            }}>
              {starsResult.stars.filter(Boolean).length}/3 Obiettivi Conseguiti
            </div>
          </div>
        )
      )}

      {/* TACHIMETRO BOTTINO A RAFFICA */}
      {isPlayerWin && rewards && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(16px, 4.5vmin, 28px)',
          zIndex: 10,
          margin: 'auto 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: 'clamp(1.1rem, 2.8vmin, 1.45rem)', filter: 'drop-shadow(0 0 10px #facc15)' }}>🌟</span>
            <span style={{ fontSize: 'clamp(1.1rem, 3vmin, 1.4rem)', fontWeight: 900, color: '#fef08a', textShadow: '0 0 12px #facc15' }}>
              +{countDust}
            </span>
            <span style={{ fontSize: '0.55rem', color: '#facc15', fontWeight: 900, letterSpacing: '0.8px' }}>POLVERE</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <span style={{ fontSize: 'clamp(1.1rem, 2.8vmin, 1.45rem)', filter: 'drop-shadow(0 0 10px #00f2fe)' }}>⚡</span>
            <span style={{ fontSize: 'clamp(1.1rem, 3vmin, 1.4rem)', fontWeight: 900, color: '#00f2fe', textShadow: '0 0 12px #00f2fe' }}>
              +{countXp}
            </span>
            <span style={{ fontSize: '0.55rem', color: '#00f2fe', fontWeight: 900, letterSpacing: '0.8px' }}>XP PILOTA</span>
          </div>

          {(rewards.diamonds > 0 || countDiamonds > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: 'clamp(1.1rem, 2.8vmin, 1.45rem)', filter: 'drop-shadow(0 0 10px #d946ef)' }}>💎</span>
              <span style={{ fontSize: 'clamp(1.1rem, 3vmin, 1.4rem)', fontWeight: 900, color: '#f5d0fe', textShadow: '0 0 12px #d946ef' }}>
                +{countDiamonds}
              </span>
              <span style={{ fontSize: '0.55rem', color: '#d946ef', fontWeight: 900, letterSpacing: '0.8px' }}>DIAMANTI</span>
            </div>
          )}
        </div>
      )}

      {/* PULSANTE CINETICO: SE BOSS PORTA ALLA CRIPTA */}
      <div style={{ width: '100%', maxWidth: '360px', zIndex: 10, marginBottom: 'clamp(4px, 1vmin, 10px)' }}>
        {isBossVictory ? (
          <button 
            type="button"
            className="cyber-btn cyber-btn-warning" 
            onClick={() => {
              try { playSound('epic_item_trigger'); } catch (_) {}
              if (typeof onGoToRifts === 'function') onGoToRifts(rewards.relic);
              else onClose();
            }} 
            style={{ 
              width: '100%', 
              padding: 'clamp(12px, 2.2vmin, 16px)', 
              fontSize: 'clamp(0.88rem, 2vmin, 1.02rem)', 
              fontWeight: 900, 
              letterSpacing: '1px',
              boxShadow: '0 0 25px rgba(250, 204, 21, 0.85)'
            }}
          >
            INCASTRA NELLA CRIPTA ➔
          </button>
        ) : isFirstLevelTutorial ? (
          <button 
            type="button"
            className="cyber-btn cyber-btn-primary" 
            onClick={() => {
              try { playSound('click'); } catch (_) {}
              onClose();
            }} 
            style={{ 
              width: '100%', 
              padding: 'clamp(12px, 2.2vmin, 16px)', 
              fontSize: 'clamp(0.9rem, 2.2vmin, 1.05rem)', 
              fontWeight: 900, 
              letterSpacing: '1.5px',
              boxShadow: '0 0 25px rgba(0, 242, 254, 0.75)'
            }}
          >
            RICEVI LICENZA PILOTA ➔
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.65rem', flexDirection: 'column', width: '100%' }}>
            {isPlayerWin && isAdv && currentAdvLevel < 10 && (
              <button 
                type="button"
                className="cyber-btn cyber-btn-success" 
                onClick={() => {
                  try { playSound('click'); } catch (_) {}
                  if (typeof onNextLevel === 'function') onNextLevel();
                  else onClose();
                }} 
                style={{ 
                  padding: 'clamp(10px, 2vmin, 14px)', 
                  fontSize: 'clamp(0.85rem, 2vmin, 1rem)', 
                  width: '100%', 
                  fontWeight: 900,
                  letterSpacing: '1px'
                }}
              >
                PROSSIMO SETTORE ➔
              </button>
            )}
            <button 
              type="button"
              className="cyber-btn cyber-btn-primary" 
              onClick={() => {
                try { playSound('click'); } catch (_) {}
                onClose();
              }} 
              style={{ 
                padding: 'clamp(10px, 2vmin, 14px)', 
                fontSize: 'clamp(0.85rem, 2vmin, 1rem)', 
                width: '100%', 
                fontWeight: 900,
                letterSpacing: '1px'
              }}
            >
              {isAdv ? 'MAPPA STELLARE' : 'HOME'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}



// 3.11 HUB CRIPTA DELLE SINGOLARITÃ€ (10 VARCHI, PLANCIA CON MISTERO & SERBATOIO)
function EpicItemsHubScreen({
  unlockedRelics = {},
  unlockedRifts = {},
  epicItemsInventory = {},
  equippedEpicItems = [null, null],
  voidCrystals = 0,
  primordialMatter = 0,
  tankLevel = 1,
  hasStabilizedRift1 = false,
  stardust = 0,
  level = 1,
  socketingRelic = null,
  onClearSocketingRelic = () => {},
  onGoToNextPlanet = () => {},
  onEquipItem,
  onUpgradeItem,
  onCollapseRift,
  onUpgradeTank,
  onBack,
  triggerPopup
}) {
  const [activeTab, setActiveTab] = useState('rifts');
  const [selectedRiftForCollapse, setSelectedRiftForCollapse] = useState(null);
  const [selectedItemForUpgrade, setSelectedItemForUpgrade] = useState(null);
  const [socketStep, setSocketStep] = useState(1);

  // Cinematica Reliquia che scende nell'alloggio
  useEffect(() => {
    if (!socketingRelic) return;
    try { playSound('relic_claim'); } catch (_) {}
    const t = setTimeout(() => {
      setSocketStep(2);
      try { playSound('epic_item_trigger'); } catch (_) {}
    }, 1200);
    return () => clearTimeout(t);
  }, [socketingRelic]);


  const tankConfig = SUBSPACE_TANK_LEVELS[tankLevel] || SUBSPACE_TANK_LEVELS[1];
  const nextTankConfig = SUBSPACE_TANK_LEVELS[tankLevel + 1];

  const handleTriggerRiftCollapse = (rift) => {
    const hasRelic1 = Boolean(unlockedRelics[rift.relicsRequired[0]]);
    const hasRelic2 = Boolean(unlockedRelics[rift.relicsRequired[1]]);
    if (!hasRelic1 || !hasRelic2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Servono entrambe le Reliquie dei Boss per aprire questo Varco!");
      return;
    }
    const r1 = PLANET_BOSS_RELICS[rift.bossPlanets[0]];
    const r2 = PLANET_BOSS_RELICS[rift.bossPlanets[1]];
    const item = EPIC_ITEMS_DATABASE.find(e => e.id === rift.itemId);
    setSelectedRiftForCollapse({ rift, r1, r2, item });
  };

    return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '2.5rem', position: 'relative', zIndex: 5, overflowY: 'auto', maxHeight: '90dvh' }}>
      
      {/* CINEMATICA FLUTTUANTE: RELIQUIA CHE ENTRA NELL'ALLOGGIO DEL VARCO */}
      {socketingRelic && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.94) 0%, rgba(1, 3, 10, 0.99) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 38000,
          padding: 'clamp(14px, 3vmin, 28px) 16px',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          {/* Intestazione Cosmica */}
          <div style={{ textAlign: 'center', marginTop: 'clamp(4px, 1.5vmin, 16px)' }}>
            <div style={{
              fontSize: 'clamp(0.6rem, 1.4vmin, 0.75rem)',
              color: '#facc15',
              fontWeight: 900,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(250, 204, 21, 0.8)'
            }}>
              ✦ CRIPTA DELLE SINGOLARITÀ ✦
            </div>
            <h1 style={{
              margin: '3px 0 0 0',
              fontSize: 'clamp(1.3rem, 3.8vmin, 2rem)',
              fontWeight: 900,
              color: '#38bdf8',
              letterSpacing: '1.2px',
              textShadow: '0 0 18px rgba(56, 189, 248, 0.85)'
            }}>
              RELIQUIA ALLOGGIATA!
            </h1>
          </div>

          {/* Animazione di discesa e inserimento nel pozzetto */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            margin: 'auto 0'
          }}>
            <div style={{
              transform: socketStep === 1 ? 'scale(1.5) translateY(-30px)' : 'scale(1.2) translateY(0px)',
              transition: 'transform 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              filter: `drop-shadow(0 0 26px ${socketingRelic.color || '#38bdf8'})`
            }}>
              <RelicVisual relicId={socketingRelic.id} size={64} />
            </div>

            {/* Pozzetto / Alloggio di ricezione luminoso */}
            <div style={{
              width: '90px',
              height: '32px',
              borderRadius: '50%',
              border: `2px solid ${socketStep === 2 ? '#38bdf8' : 'rgba(255,255,255,0.2)'}`,
              background: socketStep === 2 ? 'radial-gradient(ellipse at 50% 50%, rgba(56, 189, 248, 0.5) 0%, transparent 70%)' : 'transparent',
              boxShadow: socketStep === 2 ? '0 0 25px rgba(56, 189, 248, 0.85)' : 'none',
              transition: 'all 0.6s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '0.6rem', color: '#fde047', fontWeight: 900 }}>
                {socketStep === 2 ? '1/2 INCASSATA ✓' : 'RICEZIONE...'}
              </span>
            </div>

            {/* Testo Motivazionale */}
            <div style={{ maxWidth: '360px', textAlign: 'center', lineHeight: 1.35, marginTop: '8px' }}>
              <div style={{ fontSize: 'clamp(0.85rem, 2vmin, 1.05rem)', fontWeight: 900, color: '#ffffff' }}>
                « {socketingRelic.name.toUpperCase()} »
              </div>
              <p style={{
                fontSize: 'clamp(0.7rem, 1.6vmin, 0.82rem)',
                color: '#cbd5e1',
                margin: '8px 0 0 0',
                fontWeight: 700,
                textShadow: '0 0 8px rgba(0,0,0,0.9)'
              }}>
                Sconfiggi tutti i <strong style={{ color: '#facc15' }}>20 boss</strong> per conquistare tutte le reliquie e sbloccare i <strong style={{ color: '#00f2fe' }}>10 Manufatti Epici</strong>!
              </p>
            </div>
          </div>

          {/* Pulsanti di Prosecuzione */}
          <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: 'clamp(4px, 1vmin, 12px)' }}>
            <button
              type="button"
              className="cyber-btn cyber-btn-primary"
              onClick={onGoToNextPlanet}
              style={{
                width: '100%',
                padding: 'clamp(11px, 2.2vmin, 15px)',
                fontSize: 'clamp(0.88rem, 2vmin, 1.02rem)',
                fontWeight: 900,
                letterSpacing: '1px',
                boxShadow: '0 0 24px rgba(0, 242, 254, 0.75)'
              }}
            >
              ROTTURA ORBITALE: VERSO MARTE ➔
            </button>

            <button
              type="button"
              className="cyber-btn"
              onClick={onClearSocketingRelic}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}
            >
              Esplora la Cripta
            </button>
          </div>
        </div>
      )}

      <div className="cyber-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', padding: '0.85rem 1.1rem', border: '1.5px solid #facc15', boxShadow: '0 0 30px rgba(250, 204, 21, 0.4)' }}>

        <div>
          <h2 style={{ color: '#facc15', margin: 0, fontWeight: '900', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem', textShadow: '0 0 10px rgba(250, 204, 21, 0.6)' }}>
            <SciFiIcon name="epic_item" size={22} color="#facc15" /> Cripta delle SingolaritÃ  &amp; Oggetti Epici
          </h2>
          <div style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#cbd5e1' }}>
            {hasStabilizedRift1 ? (
              <>Serbatoio: <strong style={{ color: '#00f2fe' }}>{voidCrystals}/{tankConfig.maxVoid} ðŸ’ </strong> | <strong style={{ color: '#d946ef' }}>{primordialMatter}/{tankConfig.maxPrimordial} 🟣</strong></>
            ) : (
              <span style={{ color: '#94a3b8' }}>Apri il Varco I per sbloccare i Minerali Rari (ðŸ’  e 🟣)</span>
            )}
          </div>
        </div>
        <button className="cyber-btn" onClick={onBack}>Indietro</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => { try { playSound('click'); } catch (_) {} setActiveTab('rifts'); }}
          className="cyber-btn"
          style={{ flex: 1, padding: '0.65rem', background: activeTab === 'rifts' ? 'linear-gradient(180deg, #d97706 0%, #78350f 100%)' : 'rgba(15, 23, 42, 0.75)', borderColor: activeTab === 'rifts' ? '#facc15' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.8rem' }}
        >
          ðŸŒŒ I 10 Varchi Gravitazionali
        </button>
        <button
          onClick={() => { try { playSound('click'); } catch (_) {} setActiveTab('inventory'); }}
          className="cyber-btn"
          style={{ flex: 1, padding: '0.65rem', background: activeTab === 'inventory' ? 'linear-gradient(180deg, #0284c7 0%, #03527e 100%)' : 'rgba(15, 23, 42, 0.75)', borderColor: activeTab === 'inventory' ? '#00f2fe' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.8rem' }}
        >
          🛡️ Oggetti Equipaggiati ({equippedEpicItems.filter(Boolean).length}/2)
        </button>
        {hasStabilizedRift1 && (
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} setActiveTab('tank'); }}
            className="cyber-btn"
            style={{ flex: 1, padding: '0.65rem', background: activeTab === 'tank' ? 'linear-gradient(180deg, #7c3aed 0%, #4c1d95 100%)' : 'rgba(15, 23, 42, 0.75)', borderColor: activeTab === 'tank' ? '#c084fc' : 'rgba(255,255,255,0.15)', fontWeight: 'bold', fontSize: '0.8rem' }}
          >
            ðŸ›¢ï¸ Serbatoio (Liv.{tankLevel})
          </button>
        )}
      </div>

      {activeTab === 'rifts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {GRAVITATIONAL_RIFTS.map(rift => {
            const isCollapsed = Boolean(unlockedRifts[rift.id]);
            const r1 = PLANET_BOSS_RELICS[rift.bossPlanets[0]];
            const r2 = PLANET_BOSS_RELICS[rift.bossPlanets[1]];
            const hasR1 = Boolean(unlockedRelics[r1.id]);
            const hasR2 = Boolean(unlockedRelics[r2.id]);
            const canCollapse = hasR1 && hasR2 && !isCollapsed;
            const item = EPIC_ITEMS_DATABASE.find(e => e.id === rift.itemId);

            return (
              <div
                key={rift.id}
                className="cyber-panel"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isCollapsed ? `1.5px solid ${rift.color}` : (canCollapse ? '2px solid #facc15' : '1px solid rgba(255,255,255,0.12)'),
                  boxShadow: canCollapse ? '0 0 20px rgba(250, 204, 21, 0.5)' : (isCollapsed ? `0 0 14px ${rift.glow}` : 'none'),
                  opacity: (!hasR1 && !hasR2 && !isCollapsed) ? 0.6 : 1
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold' }}>
                      VARCO {rift.roman}
                    </span>
                    <span style={{ fontSize: '0.65rem', background: isCollapsed ? '#059669' : (canCollapse ? '#d97706' : '#334155'), padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }}>
                      {isCollapsed ? "APERTO" : (canCollapse ? "PRONTO AD APRIRE" : "SIGILLATO")}
                    </span>
                  </div>

                  <h3 style={{ color: isCollapsed ? '#fff' : (canCollapse ? '#fde047' : '#94a3b8'), fontSize: '0.92rem', margin: '0 0 0.35rem 0', fontWeight: '900' }}>
                    {isCollapsed || hasR1 || hasR2 ? rift.name : `??? [VARCO ${rift.roman}]`}
                  </h3>

                  <p style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.35', margin: '0 0 0.75rem 0' }}>
                    {isCollapsed ? rift.desc : (canCollapse ? "Hai entrambe le Reliquie: tocca per aprire il Varco e prendere l'oggetto!" : "Batti i Boss dei due pianeti per ottenere le Reliquie necessarie.")}
                  </p>

                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
                    <div style={{ flex: 1, padding: '0.35rem', background: 'rgba(2, 6, 23, 0.75)', borderRadius: '6px', border: hasR1 ? `1px solid ${r1.color}` : '1px dashed rgba(255,255,255,0.15)', textAlign: 'center', opacity: hasR1 ? 1 : 0.45, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <RelicVisual relicId={r1.id} size={28} />
                      <div style={{ fontSize: '0.58rem', color: hasR1 ? r1.color : '#94a3b8', fontWeight: 'bold', marginTop: '2px' }}>{r1.planetName} (Boss)</div>
                    </div>
                    <div style={{ flex: 1, padding: '0.35rem', background: 'rgba(2, 6, 23, 0.75)', borderRadius: '6px', border: hasR2 ? `1px solid ${r2.color}` : '1px dashed rgba(255,255,255,0.15)', textAlign: 'center', opacity: hasR2 ? 1 : 0.45, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <RelicVisual relicId={r2.id} size={28} />
                      <div style={{ fontSize: '0.58rem', color: hasR2 ? r2.color : '#94a3b8', fontWeight: 'bold', marginTop: '2px' }}>{r2.planetName} (Boss)</div>
                    </div>
                  </div>
                </div>

                {isCollapsed ? (
                  <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>
                      âœ“ Oggetto Sbloccato: {item?.name}
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={!canCollapse}
                    onClick={() => handleTriggerRiftCollapse(rift)}
                    className={`cyber-btn ${canCollapse ? 'cyber-btn-epic' : ''}`}
                    style={{ width: '100%', padding: '0.55rem', fontSize: '0.8rem', fontWeight: '900' }}
                  >
                    {canCollapse ? "Apri Varco Gravitazionale âž”" : "Reliquie Insufficienti"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <div className="cyber-panel" style={{ padding: '1rem', marginBottom: '1.25rem', border: '1.5px solid #00f2fe' }}>
            <h3 style={{ color: '#00f2fe', margin: '0 0 0.5rem 0', fontSize: '0.92rem', fontWeight: '900' }}>
              Slot Plancia di Battaglia (Max 2 Oggetti Epici)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                       {[0, 1].map(slotIdx => {
                const isSlotLocked = (slotIdx === 0 && (level || 1) < EPIC_SLOT_1_UNLOCK_LEVEL && !hasStabilizedRift1) ||
                                     (slotIdx === 1 && (level || 1) < EPIC_SLOT_2_UNLOCK_LEVEL);
                const itemId = equippedEpicItems[slotIdx];

                const item = EPIC_ITEMS_DATABASE.find(e => e.id === itemId);
                const itemData = epicItemsInventory[itemId] || { level: 1 };

                return (
                  <div key={slotIdx} className="cyber-panel" style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.85)', border: isSlotLocked ? '1px dashed rgba(239, 68, 68, 0.4)' : (item ? `1.5px solid ${item.color}` : '1px dashed rgba(255,255,255,0.2)'), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '100px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: isSlotLocked ? '#f87171' : '#94a3b8', fontWeight: 'bold' }}>
                        SLOT {slotIdx + 1} {isSlotLocked && `(Sblocco Liv. ${slotIdx === 0 ? EPIC_SLOT_1_UNLOCK_LEVEL : EPIC_SLOT_2_UNLOCK_LEVEL})`}
                      </div>
                      {isSlotLocked ? (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', margin: '1.2rem 0' }}>ðŸ”’ Bloccato</div>
                      ) : item ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                            <TacticalVisual id={item.id} type="epic_item" color={item.color} width={42} height={42} />
                          </div>
                          <div style={{ fontSize: '0.82rem', color: item.color, fontWeight: '900' }}>{item.name}</div>
                          <div style={{ fontSize: '0.65rem', color: '#facc15' }}>Liv. {itemData.level} ({item.codeName})</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '1.2rem 0' }}>Slot Vuoto</div>
                      )}
                    </div>

                    {!isSlotLocked && item && (
                      <button
                        onClick={() => {
                          try { playSound('click'); } catch (_) {}
                          const next = [...equippedEpicItems];
                          next[slotIdx] = null;
                          onEquipItem(next);
                        }}
                        className="cyber-btn"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', borderColor: '#ef4444', color: '#fca5a5', marginTop: '0.4rem' }}
                      >
                        Rimuovi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {EPIC_ITEMS_DATABASE.map(item => {
              const itemData = epicItemsInventory[item.id];
              const isUnlocked = Boolean(itemData && itemData.unlocked);
              const curLevel = itemData?.level || 1;
              const isEquipped = equippedEpicItems.includes(item.id);
              const isMax = curLevel >= 3;
              const nextUpgradeCost = EPIC_ITEM_UPGRADE_COSTS[curLevel + 1] || null;

              if (!isUnlocked) {
                return (
                  <div
                    key={item.id}
                    className="cyber-panel"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      background: 'linear-gradient(145deg, rgba(8, 12, 28, 0.95), rgba(2, 4, 12, 0.98))',
                      border: '1px dashed rgba(250, 204, 21, 0.35)',
                      boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9)',
                      minHeight: '220px'
                    }}
                  >
                    <div style={{ margin: '0 auto 0.5rem auto', display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.4))' }}>
                      <SciFiIcon name="epic_item" size={40} color="#facc15" />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#fde047', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      OGGETTO EPICO {item.riftNumber}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 'bold', margin: '4px 0 8px 0' }}>
                      [MANUFATTO SEGRETO]
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: '1.4', margin: 0 }}>
                      Apri il <strong>Varco {item.riftNumber}</strong> nella Cripta per svelare e ottenere questo artefatto speciale.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="cyber-panel"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isEquipped ? '2px solid #00f2fe' : `1.5px solid ${item.color}`,
                    boxShadow: isEquipped ? '0 0 20px rgba(0, 242, 254, 0.5)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.65rem', background: curLevel === 3 ? '#d97706' : '#0284c7', padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }}>
                        {curLevel === 3 ? 'LIV. 3 (MAX)' : `LIV. ${curLevel}/3`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', margin: '0.4rem 0' }}>
                      <TacticalVisual id={item.id} type="epic_item" color={item.color} width={64} height={64} />
                    </div>

                    <h3 style={{ color: item.color, fontSize: '0.92rem', margin: '0 0 0.2rem 0', fontWeight: '900', textAlign: 'center' }}>
                      {item.name}
                    </h3>
                    <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 'bold', marginBottom: '0.4rem', textAlign: 'center' }}>
                      {item.codeName}
                    </div>

                    <p style={{ fontSize: '0.72rem', color: '#cbd5e1', lineHeight: '1.35', margin: '0 0 0.65rem 0' }}>
                      {item.desc}
                    </p>

                    <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.45rem', borderRadius: '6px', fontSize: '0.68rem', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '0.75rem' }}>
                      Effetto Attuale: <strong>{item.levels[curLevel]?.label}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                    <button
                                            onClick={() => {
                        try { playSound('click'); } catch (_) {}
                        const slot1Open = (level || 1) >= EPIC_SLOT_1_UNLOCK_LEVEL || hasStabilizedRift1;
                        const slot2Open = (level || 1) >= EPIC_SLOT_2_UNLOCK_LEVEL;


                        if (!slot1Open && !slot2Open) {
                          triggerPopup(`Gli Slot per Oggetti Epici si sbloccano a Livello ${EPIC_SLOT_1_UNLOCK_LEVEL}!`);
                          return;
                        }

                        if (isEquipped) {
                          const next = equippedEpicItems.map(id => id === item.id ? null : id);
                          onEquipItem(next);
                        } else {
                          if (equippedEpicItems[0] === null && slot1Open) onEquipItem([item.id, equippedEpicItems[1]]);
                          else if (equippedEpicItems[1] === null && slot2Open) onEquipItem([equippedEpicItems[0], item.id]);
                          else if (slot1Open) onEquipItem([item.id, equippedEpicItems[1]]);
                        }
                      }}
                      className={`cyber-btn ${isEquipped ? '' : 'cyber-btn-primary'}`}
                      style={{ padding: '0.45rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                      {isEquipped ? "Rimuovi da Plancia" : "Equipaggia in Plancia"}
                    </button>

                    {!isMax && (
                      <button
                        onClick={() => {
                          try { playSound('click'); } catch (_) {}
                          setSelectedItemForUpgrade({ item, curLevel, nextCost: nextUpgradeCost });
                        }}
                        className="cyber-btn cyber-btn-warning"
                        style={{ padding: '0.45rem', fontSize: '0.72rem', fontWeight: 'bold' }}
                      >
                        Potenzia a Liv. {curLevel + 1} âž”
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'tank' && hasStabilizedRift1 && (
        <div className="cyber-panel" style={{ padding: '1.5rem', maxWidth: '560px', margin: '0 auto', border: '1.5px solid #c084fc' }}>
          <h3 style={{ color: '#f0abfc', margin: '0 0 0.5rem 0', fontWeight: '900', fontSize: '1.1rem', textShadow: '0 0 8px rgba(192, 132, 252, 0.6)' }}>
            {tankConfig.name} (Livello {tankLevel}/3)
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            Il Serbatoio conserva i minerali rari (ðŸ’  e 🟣) che ottieni vincendo nei Duelli PvP e nelle Scommesse del Banco.
          </p>

          <div style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#00f2fe', fontWeight: 'bold' }}>Capienza Cristalli di Vuoto (ðŸ’ ):</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{voidCrystals} / {tankConfig.maxVoid}</strong>
            </div>
            <div className="led-meter-bar" style={{ height: '7px', marginBottom: '1rem' }}>
              <div className="led-meter-fill" style={{ width: `${Math.min(100, (voidCrystals / tankConfig.maxVoid) * 100)}%`, background: '#00f2fe' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#d946ef', fontWeight: 'bold' }}>Capienza Materia Primordiale (🟣):</span>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>{primordialMatter} / {tankConfig.maxPrimordial}</strong>
            </div>
            <div className="led-meter-bar" style={{ height: '7px' }}>
              <div className="led-meter-fill" style={{ width: `${Math.min(100, (primordialMatter / tankConfig.maxPrimordial) * 100)}%`, background: '#d946ef' }} />
            </div>
          </div>

          {nextTankConfig ? (
            <div style={{ background: 'rgba(74, 4, 78, 0.35)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(232, 121, 249, 0.3)', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#f5d0fe', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                PROSSIMO LIVELLO: {nextTankConfig.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                Capienza: <strong>{nextTankConfig.maxVoid} ðŸ’  / {nextTankConfig.maxPrimordial} 🟣</strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 'bold', marginTop: '0.3rem' }}>
                Costo: {nextTankConfig.costDust} 🌟 | Richiede Livello Pilota {nextTankConfig.reqLevel}
              </div>
            </div>
          ) : (
            <div style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'center', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              âœ“ Serbatoio al Massimo Livello!
            </div>
          )}

          {nextTankConfig && (
            <button
              disabled={stardust < nextTankConfig.costDust || (level || 1) < nextTankConfig.reqLevel}
              onClick={() => {
                if (stardust < nextTankConfig.costDust || (level || 1) < nextTankConfig.reqLevel) return;
                try { playSound('ability'); } catch (_) {}
                onUpgradeTank(nextTankConfig.costDust, tankLevel + 1);
              }}
              className="cyber-btn cyber-btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '900' }}
            >
              Potenzia Serbatoio ({nextTankConfig.costDust} 🌟)
            </button>
          )}
        </div>
      )}

      {selectedItemForUpgrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 28000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.5rem', maxWidth: '420px', width: '100%', textAlign: 'center', border: '2px solid #facc15', boxShadow: '0 0 45px rgba(250, 204, 21, 0.55)' }}>
            <h3 style={{ color: '#fde047', margin: '0 0 0.35rem 0', fontWeight: '900' }}>
              Potenzia {selectedItemForUpgrade.item.name}
            </h3>
            <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '0.85rem' }}>
              Passaggio a <strong>Livello {selectedItemForUpgrade.curLevel + 1}</strong>
            </div>

            <div style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.3rem' }}>COSTI RICHIESTI:</div>
              <div style={{ fontSize: '0.8rem', color: '#facc15', fontWeight: 'bold' }}>â€¢ Polvere Stellare: {selectedItemForUpgrade.nextCost.dust} 🌟 (Hai: {stardust})</div>
              {selectedItemForUpgrade.nextCost.voidCrystals > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 'bold' }}>â€¢ Cristalli di Vuoto: {selectedItemForUpgrade.nextCost.voidCrystals} ðŸ’  (Hai: {voidCrystals})</div>
              )}
              {selectedItemForUpgrade.nextCost.primordialMatter > 0 && (
                <div style={{ fontSize: '0.8rem', color: '#d946ef', fontWeight: 'bold' }}>â€¢ Materia Primordiale: {selectedItemForUpgrade.nextCost.primordialMatter} 🟣 (Hai: {primordialMatter})</div>
              )}
            </div>

            {(() => {
              const canAfford = stardust >= selectedItemForUpgrade.nextCost.dust &&
                voidCrystals >= selectedItemForUpgrade.nextCost.voidCrystals &&
                primordialMatter >= selectedItemForUpgrade.nextCost.primordialMatter;

              return (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="cyber-btn" onClick={() => setSelectedItemForUpgrade(null)} style={{ flex: 1, padding: '0.55rem' }}>Annulla</button>
                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      if (!canAfford) return;
                      try { playSound('epic_item_trigger'); } catch (_) {}
                      onUpgradeItem(selectedItemForUpgrade.item.id, selectedItemForUpgrade.curLevel + 1, selectedItemForUpgrade.nextCost);
                      setSelectedItemForUpgrade(null);
                    }}
                    className={`cyber-btn ${canAfford ? 'cyber-btn-warning' : ''}`}
                    style={{ flex: 1.5, padding: '0.55rem', fontWeight: '900' }}
                  >
                    Conferma Potenziamento âž”
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {selectedRiftForCollapse && (
        <RiftCollapseModal
          rift={selectedRiftForCollapse.rift}
          relic1={selectedRiftForCollapse.r1}
          relic2={selectedRiftForCollapse.r2}
          epicItem={selectedRiftForCollapse.item}
          onComplete={() => {
            onCollapseRift(selectedRiftForCollapse.rift.id, selectedRiftForCollapse.item.id);
            setSelectedRiftForCollapse(null);
          }}
        />
      )}
    </div>
  );
}




// 4.0 MOTORE CARTE & MAZZI INDIPENDENTI (54 CARTE), ALGORITMI BALISTICI
const PLANET_MODS_TABLE = Object.freeze([
  [0, 0], [2, 3], [3, 1], [1, 3], [2, 1], [3, 2], [1, 2], [2, 3], [3, 1], [1, 3],
  [2, 1], [3, 2], [1, 2], [2, 3], [3, 1], [1, 3], [2, 1], [3, 2], [1, 2], [2, 3]
]);


// 4.1 HELPER RECUPERO TRATTI ATTIVI DEL MAZZO (SCALA CUMULATIVA A 3, 6 E 9 LIVELLI)
const getDeckActiveTraits = (deckId = 'neutral_starter', deckLevel = 1) => {
  if (!deckId || deckId === 'neutral_starter') return [];
  const deckObj = (typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === deckId) : null);
  if (!deckObj || !deckObj.levels) return [];
  
  const currentLvl = Math.max(1, Math.min(Number(deckLevel) || 1, deckObj.maxLevel || 9));
  const levelData = deckObj.levels[currentLvl];
  if (levelData && Array.isArray(levelData.traits)) {
    return levelData.traits;
  }
  
  // Fallback al livello piÃ¹ alto disponibile
  for (let l = currentLvl; l >= 1; l--) {
    if (deckObj.levels[l]?.traits) return deckObj.levels[l].traits;
  }
  return [];
};

const createRandomCard = (forceJoker = false) => {
  if (forceJoker || Math.random() < 0.05) {
    return {
      id: `joker_${Math.random().toString(36).substring(2, 7)}`,
      suit: 'joker',
      name: 'Jolly Quantico',
      symbol: 'â˜…',
      color: '#e879f9',
      glow: 'rgba(232, 121, 249, 0.75)',
      value: 0,
      displayVal: 'â˜…',
      isJoker: true,
      isCourt: false,
      isGolden: false
    };
  }
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const rawVal = Math.floor(Math.random() * 13) + 1;
  let displayVal = rawVal.toString();
  if (rawVal === 1) displayVal = 'A';
  else if (rawVal === 11) displayVal = 'J';
  else if (rawVal === 12) displayVal = 'Q';
  else if (rawVal === 13) displayVal = 'K';

  return {
    id: `${suit.id}_${rawVal}_${Math.random().toString(36).substring(2, 7)}`,
    value: rawVal,
    displayVal,
    suit: suit.id,
    symbol: suit.symbol,
    color: suit.color,
    glow: suit.glow,
    isCourt: rawVal >= 11,
    isJoker: false,
    isGolden: false
  };
};

const createStandardDeck = (deckThemeId = 'neutral_starter', deckLevel = 1) => {
  const traits = getDeckActiveTraits(deckThemeId, deckLevel);
  const suitKeys = ['hearts', 'diamonds', 'clubs', 'spades'];
  const fullDeck = [];

  suitKeys.forEach((suitKey) => {
    const suitInfo = SUITS.find(s => s.id === suitKey) || SUITS[0];
    for (let val = 1; val <= 13; val++) {
      let displayVal = val.toString();
      let isCourt = false;

      if (val === 1) displayVal = 'A';
      else if (val === 11) { displayVal = 'J'; isCourt = true; }
      else if (val === 12) { displayVal = 'Q'; isCourt = true; }
      else if (val === 13) { displayVal = 'K'; isCourt = true; }

      fullDeck.push({
        id: `${suitKey}_${val}_${Math.random().toString(36).substring(2, 7)}`,
        value: val,
        displayVal,
        suit: suitKey,
        symbol: suitInfo.symbol,
        color: suitInfo.color,
        glow: suitInfo.glow,
        isCourt,
        isJoker: false,
        isGolden: false
      });
    }
  });

  const jokerTrait = traits.find(t => t.type === 'joker_deck_count');
  const jokerCount = jokerTrait ? (jokerTrait.count || 3) : 2;
  for (let j = 1; j <= jokerCount; j++) {
    fullDeck.push({
      id: `joker_${j}_${Math.random().toString(36).substring(2, 7)}`,
      value: 0,
      displayVal: 'â˜…',
      suit: 'joker',
      symbol: 'â˜…',
      color: '#e879f9',
      glow: 'rgba(232, 121, 249, 0.85)',
      isCourt: false,
      isJoker: true,
      isGolden: false
    });
  }

  return shuffleArray(fullDeck);
};

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};





// HELPER PERMUTAZIONI CALCOLO (Riconosce l'operazione in qualsiasi ordine di click)
const getMatchingPermutation = (cards, op, target, tolerance, activeAnomaly) => {
  if (!cards || cards.length < 2) return null;
  if (op === '+' || op === '*') {
    const res = calculateExpressionResult(cards, op, activeAnomaly);
    if (!isNaN(res) && Math.abs(res - target) <= (tolerance + 1e-5)) {
      return { result: res, cards };
    }
    return null;
  }
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const curr = arr[i];
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permute(rest)) out.push([curr, ...p]);
    }
    return out;
  };
  for (const p of permute(cards)) {
    const res = calculateExpressionResult(p, op, activeAnomaly);
    if (!isNaN(res) && Math.abs(res - target) <= (tolerance + 1e-5)) {
      return { result: res, cards: p };
    }
  }
  return null;
};


// Solutore a 3 Stazioni per Modalità Vettore (Nucleo + Poker a Parità + Allerta Bomba)
const scanVectorSolution = (playerHand, vectorTarget, currentNucleus = null, activeAnomaly = null, parityFilter = 'PARI', bombTarget = null, allowedOps = null, allowedPatterns = null) => {
  if (!playerHand || playerHand.length === 0) return null;
  const baseOps = allowedOps && allowedOps.length > 0 ? allowedOps : ['+', '-', '*', '/'];
  const ops = baseOps.filter(op => op !== activeAnomaly?.blockedOp);

  // 1. SCANSIONE POKER A PARITÀ (STAZIONE 2)
  let bestPoker = null;
  const n = playerHand.length;

  for (let len = 5; len >= 2; len--) {
    if (bestPoker) break;
    const testIndices = [];
    const backtrack = (start, chosen) => {
      if (bestPoker) return;
      if (chosen.length === len) {
        const candidateCards = chosen.map(idx => playerHand[idx]);
        const pRes = evaluateVectorParityPoker(candidateCards, parityFilter);
        if (pRes.isValid) {
          if (allowedPatterns && allowedPatterns.length > 0 && !allowedPatterns.includes(pRes.combo.id)) {
            return;
          }

          // Verifica se le prime 2 carte disinnescano anche la bomba
          const disarmsBomb = bombTarget && candidateCards.length >= 2 &&
            ((Number(candidateCards[0].value) || 0) + (Number(candidateCards[1].value) || 0) === bombTarget);
          
          bestPoker = {
            station: 2,
            cardIndices: [...chosen],
            combo: pRes.combo,
            damage: pRes.damage + (disarmsBomb ? 30 : 0),
            disarmsBomb
          };
        }
        return;
      }
      for (let i = start; i < n; i++) {
        chosen.push(i);
        backtrack(i + 1, chosen);
        chosen.pop();
      }
    };
    backtrack(0, testIndices);
  }

  // 2. SCANSIONE NUCLEO VETTORIALE (STAZIONE 1)
  let bestNucleus = null;

  if (currentNucleus === null) {
    // A 2 carte: c1 [op] c2 = target
    for (let i = 0; i < playerHand.length && !bestNucleus; i++) {
      const v1 = getCardEffectiveValue(playerHand[i], activeAnomaly);
      for (let j = 0; j < playerHand.length && !bestNucleus; j++) {
        if (i === j) continue;
        const v2 = getCardEffectiveValue(playerHand[j], activeAnomaly);
        for (const op of ops) {
          if (op === '/' && Math.abs(v2) < 1e-7) continue;
          let res = op === '+' ? v1 + v2 : op === '-' ? v1 - v2 : op === '*' ? v1 * v2 : v1 / v2;
          if (!isNaN(res) && Math.abs(res - vectorTarget) < 1e-5) {
            const disarmsBomb = bombTarget && (v1 + v2 === bombTarget);
            bestNucleus = {
              station: 1,
              nucleusIndex: i,
              targetCardIndex: j,
              op,
              totalCards: 2,
              damage: 20 + (disarmsBomb ? 30 : 0),
              disarmsBomb
            };
            break;
          }
        }
      }
    }

    // A 3 carte: (c1 [op1] c2) [op2] c3 = target
    if (!bestNucleus && playerHand.length >= 3) {
      for (let i = 0; i < playerHand.length && !bestNucleus; i++) {
        const v1 = getCardEffectiveValue(playerHand[i], activeAnomaly);
        for (let j = 0; j < playerHand.length && !bestNucleus; j++) {
          if (i === j) continue;
          const v2 = getCardEffectiveValue(playerHand[j], activeAnomaly);
          for (const op1 of ops) {
            if (op1 === '/' && Math.abs(v2) < 1e-7) continue;
            let s1 = op1 === '+' ? v1 + v2 : op1 === '-' ? v1 - v2 : op1 === '*' ? v1 * v2 : v1 / v2;
            if (isNaN(s1)) continue;

            for (let k = 0; k < playerHand.length && !bestNucleus; k++) {
              if (k === i || k === j) continue;
              const v3 = getCardEffectiveValue(playerHand[k], activeAnomaly);
              for (const op2 of ops) {
                if (op2 === '/' && Math.abs(v3) < 1e-7) continue;
                let s2 = op2 === '+' ? s1 + v3 : op2 === '-' ? s1 - v3 : op2 === '*' ? s1 * v3 : s1 / v3;
                if (!isNaN(s2) && Math.abs(s2 - vectorTarget) < 1e-5) {
                  const disarmsBomb = bombTarget && (v1 + v2 === bombTarget);
                  bestNucleus = {
                    station: 1,
                    nucleusIndex: i,
                    targetCardIndex: j,
                    op: op1,
                    nextCardIndex: k,
                    op2,
                    totalCards: 3,
                    damage: 15 + (disarmsBomb ? 30 : 0),
                    disarmsBomb
                  };
                  break;
                }
              }
            }
          }
        }
      }
    }
  } else {
    // Nucleo già caricato: cerca chiusura
    const v1 = currentNucleus.value;
    for (let j = 0; j < playerHand.length && !bestNucleus; j++) {
      const v2 = getCardEffectiveValue(playerHand[j], activeAnomaly);
      for (const op of ops) {
        if (op === '/' && Math.abs(v2) < 1e-7) continue;
        let res = op === '+' ? v1 + v2 : op === '-' ? v1 - v2 : op === '*' ? v1 * v2 : v1 / v2;
        if (!isNaN(res) && Math.abs(res - vectorTarget) < 1e-5) {
          bestNucleus = {
            station: 1,
            targetCardIndex: j,
            op,
            totalCards: 1,
            damage: 20
          };
          break;
        }
      }
    }
  }

  // Ritorna la soluzione a priorità più alta (danno maggiore o disinnesco bomba)
  if (bestPoker && bestNucleus) {
    return bestPoker.damage >= bestNucleus.damage ? bestPoker : bestNucleus;
  }
  return bestPoker || bestNucleus || null;
};





// Solutore completo Tris Stellare a 5 Carte: scansiona i 3 bersagli (numerici e parità)
const scanTrisSolution = (playerHand, tableCard, targetsInput, selectedIdx = 0, activeAnomaly = null) => {
  if (!playerHand || playerHand.length < 4 || !tableCard) return null;
  const targets = Array.isArray(targetsInput) 
    ? targetsInput 
    : [{ target: Number(targetsInput) || 24, isParity: false, isBomb: false }];

  const ops = ['+', '-', '*', '/'].filter(op => op !== activeAnomaly?.blockedOp);
  const solutions = {};

  targets.forEach((tObj, tIdx) => {
    let best = null;
    let highestDamage = -1;

    const len = playerHand.length;
    for (let i = 0; i < len; i++) {
      const c2 = playerHand[i];
      if (!c2 || (c2.isJoker && !c2.isTransformed)) continue;

      for (const op of ops) {
        for (let j = 0; j < len; j++) {
          if (j === i) continue;
          const c3 = playerHand[j];
          if (!c3 || (c3.isJoker && !c3.isTransformed)) continue;

          for (let k = j + 1; k < len; k++) {
            if (k === i) continue;
            const c4 = playerHand[k];
            if (!c4 || (c4.isJoker && !c4.isTransformed)) continue;

            for (let m = k + 1; m < len; m++) {
              if (m === i) continue;
              const c5 = playerHand[m];
              if (!c5 || (c5.isJoker && !c5.isTransformed)) continue;

              const res = evaluateTrisStellare(tableCard, c2, c3, c4, c5, op, tObj, activeAnomaly);
              if (res.isValid) {
                if (res.totalDamage > highestDamage) {
                  highestDamage = res.totalDamage;
                  best = {
                    targetIndex: tIdx,
                    cardIndices: [i, j, k, m],
                    op1: op,
                    combo: res.combo,
                    totalDamage: res.totalDamage,
                    mathDamage: res.mathDamage,
                    pokerDamage: res.pokerDamage,
                    weight: res.totalDamage
                  };
                }
              }
            }
          }
        }
      }
    }

    if (best) solutions[tIdx] = best;
  });

  if (solutions[selectedIdx]) return solutions[selectedIdx];

  const allSolIndices = Object.keys(solutions);
  if (allSolIndices.length === 0) return null;

  allSolIndices.sort((a, b) => solutions[b].weight - solutions[a].weight);
  return solutions[allSolIndices[0]];
};



// 4.7 VALUTATORE SINERGIE SEMI CON SUPPORTO ALLA CARTA DORATA
const evaluateSuitBonus = (cards, deckId = 'neutral_starter', deckLevel = 1, maxHp = 50, goldenCardId = null, isSector1 = false) => {
  if (!cards || cards.length === 0 || isSector1) {
    return { heal: 0, dust: 0, timeTankBonus: 0, extraDamage: 0, isFourSuitsCombo: false, damageMultiplier: 1, bonusDiamonds: 0, etherBonus: 0, hasGoldenCard: false };
  }


  const validCards = cards.filter(Boolean);
  const traits = getDeckActiveTraits(deckId, deckLevel);

  const suitsUsed = new Set();
  let heal = 0;
  let dust = 0;
  let timeTankBonus = 0;
  let extraDamage = 0;
  let bonusDiamonds = 0;
  let etherBonus = 0;
  let hasGoldenCard = false;

  const healBoostTrait = traits.find(t => t.type === 'suit_heal_boost' && t.suit === 'hearts');
  const heartRatio = healBoostTrait ? (healBoostTrait.bonusPct || 0.12) : 0.08;
  const heartHealPerCard = Math.max(4, Math.round((Number(maxHp) || 50) * heartRatio));

  const dustBoostTrait = traits.find(t => t.type === 'suit_dust_boost' && t.suit === 'diamonds');
  const diamondBaseDust = dustBoostTrait ? (2 + (dustBoostTrait.bonus || 2)) : 2;

  const timeBoostTrait = traits.find(t => t.type === 'suit_time_boost' && t.suit === 'clubs');
  const clubBaseTime = timeBoostTrait ? (5 + (timeBoostTrait.bonus || 5)) : 5;

  const dmgBoostTrait = traits.find(t => t.type === 'suit_damage_boost' && t.suit === 'spades');
  const spadeBaseDamage = dmgBoostTrait ? (3 + (dmgBoostTrait.bonus || 2)) : 3;

  const flatHeartsTrait = traits.find(t => t.type === 'hearts_flat_heal');
  const flatHeartsBonus = flatHeartsTrait ? (flatHeartsTrait.bonus || 2) : 0;

  validCards.forEach(c => {
    const suitKey = getCardSuit(c);
    const isThisCardGolden = Boolean(c.isGolden || (goldenCardId && c.id === goldenCardId));
    if (isThisCardGolden) hasGoldenCard = true;

    if (suitKey && suitKey !== 'joker') {
      suitsUsed.add(suitKey);

      if (suitKey === 'hearts') {
        if (isThisCardGolden) {
          const goldenHeartHeal = Math.max(8, Math.round((Number(maxHp) || 50) * (heartRatio * 2)));
          heal += (goldenHeartHeal + flatHeartsBonus * 2);
        } else {
          heal += (heartHealPerCard + flatHeartsBonus);
        }
      }

      if (suitKey === 'diamonds') {
        if (isThisCardGolden) {
          dust += 20;
          if (Math.random() < 0.10) bonusDiamonds += 1;
        } else {
          dust += diamondBaseDust;
        }
      }

      if (suitKey === 'clubs') {
        if (isThisCardGolden) {
          timeTankBonus += 15;
          etherBonus += 1;
        } else {
          timeTankBonus += clubBaseTime;
        }
      }

      if (suitKey === 'spades') {
        if (isThisCardGolden) {
          extraDamage += 8;
        } else {
          extraDamage += spadeBaseDamage;
        }
      }
    }
  });

    const isFourSuitsCombo = suitsUsed.size >= 4 && validCards.length >= 4;

  let damageMultiplier = 1;
  if (isFourSuitsCombo) {
    const comboTrait = traits.find(t => t.type === 'combo_4suits_mult');
    const baseMult = comboTrait ? (comboTrait.mult || 2.5) : 2.0;

    if (hasGoldenCard) {
      damageMultiplier = comboTrait ? 3.5 : 3.0;
      bonusDiamonds += 2;
      dust += 50;
    } else {
      damageMultiplier = baseMult;
    }
  }

  return {
    heal,
    dust,
    timeTankBonus,
    extraDamage,
    isFourSuitsCombo,
    damageMultiplier,
    bonusDiamonds,
    etherBonus,
    hasGoldenCard
  };
};

// 4.7b GENERATORE BERSAGLIO NUCLEO INSTABILE (BOMBA)
const generateBombTarget = (currentGlobalSector = 6) => {
  const availableArchetypes = typeof BOMB_ARCHETYPES !== 'undefined' 
    ? BOMB_ARCHETYPES.filter(b => currentGlobalSector >= (b.minSector || 6))
    : [];
  const archetype = availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)] || {
    id: 'fracture',
    title: 'Bomba a Frattura',
    icon: '💥',
    color: '#ef4444',
    successDesc: '+30 HP danno al nemico',
    failDesc: 'Il nemico cura +25 HP'
  };

  const ops = ['+', '-', '*', '/'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let target = 20;

  if (op === '+') target = Math.floor(Math.random() * 25) + 10;
  else if (op === '-') target = Math.floor(Math.random() * 12) + 2;
  else if (op === '*') {
    const factors = [12, 16, 18, 20, 24, 30, 36, 40, 48];
    target = factors[Math.floor(Math.random() * factors.length)];
  } else if (op === '/') {
    const quotients = [2, 3, 4, 5, 6];
    target = quotients[Math.floor(Math.random() * quotients.length)];
  }

    return {
    ...archetype,
    op,
    target,
    turnsRemaining: 3,
    isBomb: true,
    type: archetype.id
  };
};



// Generatore dedicato al bersaglio Bomba per Vettore (Target somma a 2 carte: range 4 - 24)
const generateVectorBombTarget = (currentGlobalSector = 6) => {
  const availableArchetypes = typeof BOMB_ARCHETYPES !== 'undefined' 
    ? BOMB_ARCHETYPES.filter(b => currentGlobalSector >= (b.minSector || 6))
    : [];
  const archetype = availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)] || {
    id: 'fracture',
    title: 'Bomba a Frattura',
    icon: '💥',
    color: '#ef4444',
    successDesc: '+30 HP danno puro al nemico',
    failDesc: 'Subisci 25 HP di danno allo scafo'
  };

  // Target di somma intera componibile con 2 carte (da 4 a 24)
  const target = Math.floor(Math.random() * 21) + 4;

  return {
    ...archetype,
    target,
    turnsRemaining: 3,
    isBomb: true,
    type: archetype.id
  };
};

// Generatore dedicato al bersaglio Bomba per Duello a Doppio Stadio
const generateDuelBombTarget = (currentGlobalSector = 6) => {
  const availableArchetypes = typeof BOMB_ARCHETYPES !== 'undefined'
    ? BOMB_ARCHETYPES.filter(b => currentGlobalSector >= (b.minSector || 6))
    : [];
  const archetype = availableArchetypes[Math.floor(Math.random() * availableArchetypes.length)] || {
    id: 'fracture',
    title: 'Bomba a Frattura',
    icon: '💥',
    color: '#ef4444',
    successDesc: '+30 HP danno puro al nemico',
    failDesc: 'Subisci 25 HP di danno allo scafo'
  };

  const target = Math.floor(Math.random() * 20) + 10;
  return {
    ...archetype,
    target,
    turnsRemaining: 3,
    isBomb: true,
    type: archetype.id
  };
};

// Valutatore Poker a Parità per Modalità Vettore (Stazione 2)

const evaluateVectorParityPoker = (cards, requiredParity = 'PARI') => {
  if (!cards || cards.length < 2) {
    return { isValid: false, combo: null, sum: 0, damage: 0, reason: 'Servono almeno 2 carte' };
  }

  const validCards = cards.filter(Boolean);
  if (validCards.length < 2 || validCards.length > 5) {
    return { isValid: false, combo: null, sum: 0, damage: 0, reason: 'Seleziona da 2 a 5 carte' };
  }

  // 1. Somma algebrica nominale delle carte
  const sum = validCards.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  const isEven = sum % 2 === 0;
  const parityMatches = (requiredParity === 'PARI' && isEven) || (requiredParity === 'DISPARI' && !isEven);

  if (!parityMatches) {
    return { isValid: false, combo: null, sum, damage: 0, reason: `Somma ${sum} non conforme: richiesto ${requiredParity}` };
  }

  // 2. Riconoscimento Figura Poker
  let recognizedPattern = null;
  for (const p of CLASSIC_POKER_PATTERNS) {
    if (validateClassicPokerPattern(validCards, p.id)) {
      recognizedPattern = p;
      break;
    }
  }

  if (!recognizedPattern) {
    return { isValid: false, combo: null, sum, damage: 0, reason: 'Nessuna combinazione poker valida trovata' };
  }

  return {
    isValid: true,
    combo: recognizedPattern,
    sum,
    damage: recognizedPattern.damage,
    cardsCount: validCards.length
  };
};



const generateTrisStellareObjectives = (
  existingBomb = null,
  currentGlobalSector = 1,
  isBombAllowed = false,
  handCards = [],
  activeAnomaly = null,
  existingTableCard = null
) => {
  const isPersistentBomb = isBombAllowed && existingBomb && existingBomb.turnsRemaining > 0;

  // Preserva la carta tavolo se la bomba è ancora attiva, altrimenti ne pesca una nuova
  const tableCard = (isPersistentBomb && (existingBomb?.tableCard || existingTableCard))
    ? (existingBomb.tableCard || existingTableCard)
    : createRandomCard(false);

  const ops = ['+', '-', '*', '/'].filter(op => op !== activeAnomaly?.blockedOp);
  const getRandomOp = () => (ops.length > 0 ? ops[Math.floor(Math.random() * ops.length)] : '+');

  const validHand = (handCards || []).filter(c => c && !c.isJoker && (c.value || 0) > 0);
  const tableVal = getCardEffectiveValue(tableCard, activeAnomaly);

  // 1. Calcolo Bersaglio 1 (Numero Esatto Garantito a 4 carte: (Tavolo [op] C2) + C3 + C4 + C5)
  let guaranteedTarget = null;
  let guaranteedOp1 = '+';

  if (validHand.length >= 4) {
    const candidates = [];
    const len = validHand.length;

    // Campiona combinazioni di 4 carte reali per trovare target puliti
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len; j++) {
        if (i === j) continue;
        for (let k = 0; k < len; k++) {
          if (k === i || k === j) continue;
          for (let m = 0; m < len; m++) {
            if (m === i || m === j || m === k) continue;

            const v2 = getCardEffectiveValue(validHand[i], activeAnomaly);
            const v3 = getCardEffectiveValue(validHand[j], activeAnomaly);
            const v4 = getCardEffectiveValue(validHand[k], activeAnomaly);
            const v5 = getCardEffectiveValue(validHand[m], activeAnomaly);

            for (const op of ops) {
              if (op === '/' && (v2 === 0 || tableVal % v2 !== 0)) continue;
              let step1 = 0;
              if (op === '+') step1 = tableVal + v2;
              else if (op === '-') step1 = tableVal - v2;
              else if (op === '*') step1 = tableVal * v2;
              else if (op === '/') step1 = tableVal / v2;

              const total = step1 + v3 + v4 + v5;
              if (Number.isInteger(total) && total >= 18 && total <= 65) {
                candidates.push({ target: total, op1: op });
              }
            }
          }
        }
      }
    }

    if (candidates.length > 0) {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      guaranteedTarget = chosen.target;
      guaranteedOp1 = chosen.op1;
    }
  }

  if (!guaranteedTarget) {
    guaranteedTarget = Math.floor(Math.random() * 30) + 24;
    guaranteedOp1 = getRandomOp();
  }

  const targetNumericObj = {
    target: guaranteedTarget,
    op1: guaranteedOp1,
    isParity: false,
    isBomb: false
  };

  // 2. Calcolo Bersaglio 2 (Filtro Parità: PARI o DISPARI)
  const isEvenChoice = Math.random() < 0.5;
  const targetParityObj = {
    target: null,
    op1: '+',
    isParity: true,
    parityType: isEvenChoice ? 'PARI' : 'DISPARI',
    isBomb: false
  };

  // 3. Calcolo Bersaglio 3 (Bomba a 3 Turni o bersaglio numerico alternativo)
  let thirdTarget;
  if (isBombAllowed) {
    if (isPersistentBomb) {
      thirdTarget = {
        ...existingBomb,
        tableCard,
        isParity: false,
        isBomb: true,
        op1: existingBomb.op1 || getRandomOp()
      };
    } else {
      const rawBomb = generateBombTarget(currentGlobalSector);
      thirdTarget = {
        ...rawBomb,
        tableCard,
        isParity: false,
        turnsRemaining: 3,
        isBomb: true,
        op1: getRandomOp()
      };
    }
  } else {
    let t3 = Math.floor(Math.random() * 35) + 20;
    while (t3 === guaranteedTarget) {
      t3 = Math.floor(Math.random() * 35) + 20;
    }
    thirdTarget = {
      target: t3,
      op1: getRandomOp(),
      isParity: false,
      isBomb: false
    };
  }

  const targets = [targetNumericObj, targetParityObj, thirdTarget];

  return {
    tableCard,
    targets,
    op1: targets[0].op1,
    target: targets[0].target
  };
};





const getSectorGameType = () => {
  return 'classic';
};



const getLevelReward = (planet, level, isReplay) => {
  const mult = isReplay ? 0.5 : 1.0;
  let diamondsBonus = 0;
  let dustBase = (20 + planet * 6 + level * 3);

  if (!isReplay) {
    if (level === 5) {
      diamondsBonus = 3;
    }
    if (level === 10) {
      diamondsBonus = Math.floor(6 + planet * 0.5);
      dustBase += (150 + planet * 15);
    }
  }

  return {
    stardust: Math.floor(dustBase * mult),
    diamonds: diamondsBonus,
    xp: Math.floor((30 + planet * 8 + level * 5) * mult)
  };
};

const getXpThresholdForLevel = (lvl) => {
  const currentLvl = Number(lvl) || 1;
  return 120 + (currentLvl * 45) + Math.floor(Math.pow(currentLvl, 1.3) * 15);
};

const getPlanetLevelModifier = (planet, level) => {
  const modPair = PLANET_MODS_TABLE[(planet - 1) % PLANET_MODS_TABLE.length] || [0, 0];
  const modId = level % 2 === 0 ? modPair[0] : modPair[1];
  return ADVENTURE_MODIFIERS[modId] || ADVENTURE_MODIFIERS[0];
};

const getAdventureAiPower = (planet, level) => {
  return Math.min(0.95, 0.65 + (planet - 1) * 0.015 + (level - 1) * 0.005);
};

// HELPER ASSEGNAZIONE MODULO ABILITÃ€ UNICO PER L'AVVERSARIO
const getComputerAbilityForPlanet = (planet) => {
  const p = Number(planet) || 1;
  if (p <= 2) return 'taurus';
  if (p <= 4) return 'aries';
  if (p <= 6) return 'gemini';
  if (p <= 8) return 'leo';
  if (p <= 10) return 'virgo';
  if (p <= 12) return 'libra';
  if (p <= 14) return 'planet_char_14'; // Proxima b
  if (p <= 16) return 'planet_char_16'; // Gliese 581g
  if (p <= 18) return 'planet_char_18'; // Eris
  if (p <= 19) return 'planet_char_19'; // Io
  return 'planet_char_20';              // Encelado
};

// RetrocompatibilitÃ  per chiamate che si aspettano un array
const getComputerEquipmentsForPlanet = (planet) => {
  return [getComputerAbilityForPlanet(planet)];
};

// HELPER CALCOLO LIVELLO MAZZO E MODULO AVVERSARIO SIMMETRICO SUI 3 SCAGLIONI
const getAdventureAiDeckLevel = (planet) => {
  const p = Number(planet) || 1;
  if (p <= 6) {
    return p <= 2 ? 1 : p <= 4 ? 2 : 3;
  } else if (p <= 13) {
    return p <= 9 ? 4 : p <= 11 ? 5 : 6;
  } else {
    return p <= 16 ? 7 : p <= 18 ? 8 : 9;
  }
};

const getLevelUpRewards = (lvl) => ({
  stardust: 80 + lvl * 10,
  diamonds: lvl % 5 === 0 ? 5 : 1,
  lives: (lvl === 15 || lvl === 30 || lvl === 50 || lvl === 75) ? 1 : 0
});

const generateHumanPacing = (isCampaign = false, planet = 1) => {
  let totalTime;
  let profile = 'standard';

  if (isCampaign) {
    if (planet <= 4) {
      totalTime = Math.floor(Math.random() * 4000) + 10000;
    } else {
      totalTime = Math.floor(Math.random() * 5000) + 12000;
    }
  } else {
    const rand = Math.random();
    if (rand < 0.15) {
      profile = 'fast';
      totalTime = Math.floor(Math.random() * 6000) + 8000;
    } else if (rand < 0.75) {
      profile = 'standard';
      totalTime = Math.floor(Math.random() * 10000) + 18000;
    } else if (rand < 0.93) {
      profile = 'overtime';
      totalTime = Math.floor(Math.random() * 10000) + 40000;
    } else {
      profile = 'timeout';
      totalTime = 60000;
    }
  }

  const firstTap = profile === 'fast' ? Math.floor(totalTime * 0.35) : Math.floor(totalTime * 0.30);
  const hasHesitation = profile !== 'fast' && (profile === 'timeout' || Math.random() < 0.4);
  const hesitationTime = Math.floor(totalTime * 0.50);
  const secondTap = Math.floor(totalTime * 0.75);

  return {
    profile,
    totalTime,
    firstTap,
    hasHesitation,
    hesitationTime,
    secondTap,
    executeTime: totalTime
  };
};



const calculateAiTurnVector = (aiHand, vectorTarget, currentNucleus = null, activeAnomaly = null) => {
  if (!aiHand || aiHand.length < 2) return { found: false };

  const ops = ['+', '-', '*', '/'].filter(op => op !== activeAnomaly?.blockedOp);
  const target = vectorTarget;

  for (let i = 0; i < aiHand.length; i++) {
    for (let j = 0; j < aiHand.length; j++) {
      if (i === j) continue;
      const c1 = aiHand[i];
      const c2 = aiHand[j];
      if (!c1 || !c2) continue;

      const v1 = getCardEffectiveValue(c1, activeAnomaly);
      const v2 = getCardEffectiveValue(c2, activeAnomaly);

          for (const op of ops) {
        if (op === '/' && Math.abs(v2) < 1e-7) continue;

        let res = NaN;
        if (op === '+') res = v1 + v2;
        else if (op === '-') res = v1 - v2;
        else if (op === '*') res = v1 * v2;
        else if (op === '/') res = v1 / v2;

        if (!isNaN(res) && Math.abs(res - target) < 1e-5) {

          return {
            found: true,
            cardsCount: 2,
            cardIndices: [i, j],
            cardsUsed: [c1, c2],
            nucleusValue: v1,
            op,
            result: res
          };
        }
      }
    }
  }

  if (aiHand.length >= 3) {
    for (let i = 0; i < aiHand.length; i++) {
      for (let j = 0; j < aiHand.length; j++) {
        if (i === j) continue;
        for (let k = 0; k < aiHand.length; k++) {
          if (k === i || k === j) continue;
          const c1 = aiHand[i], c2 = aiHand[j], c3 = aiHand[k];
          if (!c1 || !c2 || !c3) continue;

          const v1 = getCardEffectiveValue(c1, activeAnomaly);
          const v2 = getCardEffectiveValue(c2, activeAnomaly);
          const v3 = getCardEffectiveValue(c3, activeAnomaly);

          for (const op1 of ops) {
            let s1 = 0;
            if (op1 === '+') s1 = v1 + v2;
            else if (op1 === '-') s1 = v1 - v2;
            else if (op1 === '*') s1 = v1 * v2;
            else if (op1 === '/' && v2 !== 0) s1 = v1 / v2;

            if (isNaN(s1)) continue;

                      for (const op2 of ops) {
              if (op2 === '/' && Math.abs(v3) < 1e-7) continue;

              let s2 = NaN;
              if (op2 === '+') s2 = s1 + v3;
              else if (op2 === '-') s2 = s1 - v3;
              else if (op2 === '*') s2 = s1 * v3;
              else if (op2 === '/') s2 = s1 / v3;

              if (!isNaN(s2) && Math.abs(s2 - target) < 1e-5) {

                return {
                  found: true,
                  cardsCount: 3,
                  cardIndices: [i, j, k],
                  cardsUsed: [c1, c2, c3],
                  nucleusValue: v1,
                  op: `${op1},${op2}`,
                  result: s2
                };
              }
            }
          }
        }
      }
    }
  }

  return { found: false };
};

// SOLUTORE AI MODALITÀ CONVERGENZA: TURNO 1 (2 CARTE SU BASE) & TURNO 2 (2 CARTE SU PARZIALE T1)
const calculateAiTurnConvergence = (
  turnPhase, // 1 (Apertura) o 2 (Chiusura)
  aiHand,
  baseCard,
  targetVal,
  partialT1Val = 0,
  bombTarget = null,
  activeAnomaly = null
) => {
  if (!aiHand || aiHand.length < 2) return { found: false };
  const ops = ['+', '-', '*', '/'].filter(op => op !== activeAnomaly?.blockedOp);
  const n = aiHand.length;

    const evalStep = (vLeft, op, vRight) => {
    if (op === '+') return vLeft + vRight;
    if (op === '-') return vLeft - vRight;
    if (op === '*') return vLeft * vRight;
    if (op === '/') return (vRight !== 0 && Math.abs(vRight) > 1e-7) ? (vLeft / vRight) : NaN;
    return NaN;
  };


  // --- TURNO 1 (APERTURA): (Base [op1] C1) [op2] C2 = Parziale T1 ---
  if (turnPhase === 1) {
    const vBase = getCardEffectiveValue(baseCard, activeAnomaly);
    let bestT1Move = null;
    let minTrajectoryDiff = Infinity;

    for (let i = 0; i < n; i++) {
      const v1 = getCardEffectiveValue(aiHand[i], activeAnomaly);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const v2 = getCardEffectiveValue(aiHand[j], activeAnomaly);

        for (const op1 of ops) {
          const s1 = evalStep(vBase, op1, v1);
          if (isNaN(s1)) continue;

          for (const op2 of ops) {
            const resT1 = evalStep(s1, op2, v2);
            if (isNaN(resT1)) continue;

            // Priorità 1: Disinnesco bomba in Turno 1
            if (bombTarget && Math.abs(resT1 - bombTarget) < 1e-5) {
              return {
                found: true,
                cardIndices: [i, j],
                cardsUsed: [aiHand[i], aiHand[j]],
                op1,
                op2,
                result: resT1,
                isBombDisarm: true
              };
            }

            // Priorità 2: Traiettoria verso metà del Target
            const trajectoryTarget = Math.max(10, Math.round(targetVal * 0.5));
            const diff = Math.abs(resT1 - trajectoryTarget);
            if (diff < minTrajectoryDiff) {
              minTrajectoryDiff = diff;
              bestT1Move = {
                found: true,
                cardIndices: [i, j],
                cardsUsed: [aiHand[i], aiHand[j]],
                op1,
                op2,
                result: resT1,
                isBombDisarm: false
              };
            }
          }
        }
      }
    }
    return bestT1Move || { found: false };
  }

  // --- TURNO 2 (CHIUSURA): (ParzialeT1 [op3] C3) [op4] C4 = Finale ---
  if (turnPhase === 2) {
    let bestT2Move = null;
    let minDelta = Infinity;

    for (let i = 0; i < n; i++) {
      const v3 = getCardEffectiveValue(aiHand[i], activeAnomaly);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const v4 = getCardEffectiveValue(aiHand[j], activeAnomaly);

        for (const op3 of ops) {
          const s2 = evalStep(partialT1Val, op3, v3);
          if (isNaN(s2)) continue;

          for (const op4 of ops) {
            const finalRes = evalStep(s2, op4, v4);
            if (isNaN(finalRes)) continue;

            // Disinnesco bomba in Turno 2 se non ancora disinnescata
            const isBombHit = bombTarget && Math.abs(finalRes - bombTarget) < 1e-5;
            const delta = Math.abs(finalRes - targetVal);

            if (delta < minDelta || (isBombHit && delta <= minDelta + 5)) {
              minDelta = delta;
              bestT2Move = {
                found: true,
                cardIndices: [i, j],
                cardsUsed: [aiHand[i], aiHand[j]],
                op1: op3,
                op2: op4,
                result: finalRes,
                isBombDisarm: Boolean(isBombHit)
              };
            }
          }
        }
      }
    }
    return bestT2Move || { found: false };
  }

  return { found: false };
};

// Alias per compatibilità
const calculateAiTurnDoubleStage = calculateAiTurnConvergence;


const calculateAiTurnTrisStellare = (aiHand, tableCard, op1, op2, targetInput, activeAnomaly = null) => {
  if (!aiHand || aiHand.length < 4 || !tableCard) return { found: false };

  const targets = Array.isArray(targetInput)
    ? targetInput
    : [{ target: typeof targetInput === 'number' ? targetInput : (targetInput?.target || 20), isParity: false, isBomb: false }];

  const ops = ['+', '-', '*', '/'].filter(op => op !== activeAnomaly?.blockedOp);
  let bestMove = null;
  let highestDamage = -1;

  for (let tIdx = 0; tIdx < targets.length; tIdx++) {
    const tObj = targets[tIdx];

    const len = aiHand.length;
    for (let i = 0; i < len; i++) {
      const c2 = aiHand[i];
      if (!c2) continue;

      for (const op of ops) {
        for (let j = 0; j < len; j++) {
          if (j === i) continue;
          const c3 = aiHand[j];
          if (!c3) continue;

          for (let k = j + 1; k < len; k++) {
            if (k === i) continue;
            const c4 = aiHand[k];
            if (!c4) continue;

            for (let m = k + 1; m < len; m++) {
              if (m === i) continue;
              const c5 = aiHand[m];
              if (!c5) continue;

              const res = evaluateTrisStellare(tableCard, c2, c3, c4, c5, op, tObj, activeAnomaly);
              if (res.isValid) {
                if (res.totalDamage > highestDamage) {
                  highestDamage = res.totalDamage;
                  bestMove = {
                    found: true,
                    targetIndex: tIdx,
                    targetObj: tObj,
                    cardIndices: [i, j, k, m],
                    cardsUsed: [c2, c3, c4, c5],
                    op1: op,
                    totalDamage: res.totalDamage,
                    mathDamage: res.mathDamage,
                    pokerDamage: res.pokerDamage,
                    combo: res.combo
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return bestMove || { found: false };
};



// ============================================================================
// 5.0 MOTORE DI BATTAGLIA GAMESCREEN (INIZIALIZZAZIONE & STATI STRUTTURALI)
// ============================================================================


function GameScreen({
  nickname = 'Pilota',
  selectedPilot = 'pilot_com_1',

  pilotInventory = {},
  abilities = {},
  selectedAbility = null,
  selectedAbilities = null, // Retrocompatibilità
  selectedDeck = 'neutral_starter',

  playerDeckLevel = 1,
  aiDeckLevel = 1,
  deckInventory = {},
  equippedEnvironment = 'deep_space',
  equippedEpicItems = [null, null],
  epicItemsInventory = {},
  gameMode = 'adventure',
  bettingTier = 1,
  bettingGameType = 'classic',
  activeAdventure = null,
  pvpMeta = null,
  maxPlayerHp: baseMaxPlayerHp = 50,
  onGameEnd,

  onNextLevel,
  onAbandon,
  t,
  setStardust,
  setDiamonds,
    dailyBettingDiamondsEarned = 0,
  setDailyBettingDiamondsEarned,
  lives = 3,
  setLives,
  customBetAmount = 0,
  stakedLives = 0,
  ether = 0,

  setEther,
  extractorLevel = 1,
  level = 1,
  hasStabilizedRift1 = false,
  pvpChannel = 'training',
        equippedTerrainSlots = [null, null, null, null],

  unlockedTerrainCards = {},
  scannerSeconds = 60,
  setScannerSeconds,
  onBuyScannerRefill,
  equippedWeapons = ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
  weaponsLevels = { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 }
}) {



    const isPvP = gameMode === 'pvp' && Boolean(pvpMeta?.roomId);
  const isGhostMatch = Boolean(pvpMeta?.isGhostMatch);
  const isRealPvP = isPvP && !isGhostMatch;
    const isDailyChallenge = gameMode === 'daily_challenge';
  const dailyCfg = isDailyChallenge ? activeAdventure?.dailyConfig : null;
  const maxPlayerHp = dailyCfg ? dailyCfg.playerHp : baseMaxPlayerHp;


    const tierConfig = (gameMode === 'pve' && bettingTier && BETTING_LEVELS[bettingTier]) ? BETTING_LEVELS[bettingTier] : null;
  const isAdv = (gameMode === 'adventure' || isDailyChallenge) && Boolean(activeAdventure);
  const currentAdvPlanet = isAdv ? (activeAdventure.planet || 1) : 1;
  const currentAdvLevel = isAdv ? (activeAdventure.level || 1) : 1;
    const isExchangeBlockedByModifier = isAdv && activeAdventure?.modifier?.id === 'no_pass';
  const isFirstLevelTutorial = isAdv && currentAdvPlanet === 1 && currentAdvLevel === 1 && !localStorage.getItem('eclissi_profile');


  // Risoluzione Pilota Giocatore & Nemico per tutte le modalita'
  const effectivePlayerPilotId = useMemo(() => {
    if (dailyCfg?.assignedPilot) return dailyCfg.assignedPilot;
    return selectedPilot || 'pilot_com_1';
  }, [dailyCfg, selectedPilot]);

  const effectivePlayerPilotLvl = useMemo(() => {
    if (dailyCfg?.assignedPilotLevel) return dailyCfg.assignedPilotLevel;
    return pilotInventory?.[effectivePlayerPilotId]?.level || 1;
  }, [dailyCfg, pilotInventory, effectivePlayerPilotId]);

     const effectiveAiPilotId = useMemo(() => {
    if (dailyCfg?.nemesisPilot) return dailyCfg.nemesisPilot;
    if (isPvP) return pvpMeta?.opponent?.pilot || 'pilot_boss_1';
    if (isAdv) {
      if (currentAdvLevel === 10) {
        return `pilot_boss_${currentAdvPlanet}`;
      }
      const npcPilot = getSectorEncounterPilot(currentAdvPlanet, currentAdvLevel);
      return npcPilot?.id || 'pilot_com_1';
    }
    if (gameMode === 'pve') {
      if (bettingTier === 4) return 'pilot_boss_20';
      if (bettingTier === 3) return 'pilot_boss_10';
      if (bettingTier === 2) return 'pilot_rare_2';
      return 'pilot_com_3';
    }
    return 'pilot_com_1';
  }, [dailyCfg, isPvP, pvpMeta, isAdv, currentAdvPlanet, currentAdvLevel, gameMode, bettingTier]);



  const pilotDominance = useMemo(() => {
    return evaluatePilotDominance(effectivePlayerPilotId, effectiveAiPilotId);
  }, [effectivePlayerPilotId, effectiveAiPilotId]);

  const [showFaceOff, setShowFaceOff] = useState(true);

  useEffect(() => {
    const timerFaceOff = setTimeout(() => {
      setShowFaceOff(false);
    }, 2400);
    return () => clearTimeout(timerFaceOff);
  }, []);


  // Verifica abilitazione Slot Modulo Abilità Unico (anticipato per essere disponibile a effectivePlayerAbilityId)
  const isAbilityModuleUnlocked = useMemo(() => {
    if (isPvP || gameMode === 'pve') return true;
    if (isAdv) {
      const globalSector = (currentAdvPlanet - 1) * 10 + currentAdvLevel;
      return globalSector >= ABILITY_MODULE_UNLOCK_CAMPAIGN_SECTOR;
    }
    return false;
  }, [isPvP, gameMode, isAdv, currentAdvPlanet, currentAdvLevel]);

  // Risoluzione Modulo Abilità Unico Giocatore (stringa ID singola)
    const effectivePlayerAbilityId = useMemo(() => {
    if (dailyCfg) return dailyCfg.assignedModule || 'taurus';
    if (selectedAbility && typeof selectedAbility === 'string') return selectedAbility;
    if (Array.isArray(selectedAbilities) && selectedAbilities.length > 0 && selectedAbilities[0]) return selectedAbilities[0];
    return isAbilityModuleUnlocked ? 'taurus' : null;
  }, [selectedAbility, selectedAbilities, dailyCfg, isAbilityModuleUnlocked]);




   // Risoluzione Mazzo Avversario
  const aiDeckTheme = useMemo(() => {
    if (isPvP) return pvpMeta?.opponent?.deck || 'aries';
    if (isAdv) {
      if (currentAdvPlanet === 1 && currentAdvLevel < 10) {
        return 'neutral_starter';
      }
      return `planet_char_${currentAdvPlanet}`;
    }
    if (bettingTier === 4) return 'planet_char_20';
    if (bettingTier === 3) return 'planet_char_10';
    if (bettingTier === 2) return 'scorpio';
    return 'neutral_starter';
  }, [isPvP, pvpMeta, isAdv, currentAdvPlanet, currentAdvLevel, bettingTier]);

  // Livello Mazzo Giocatore (1–9 in base a Fascia Pilota o Prefissato in Sfida del Giorno)
  const effectivePlayerDeckLevel = useMemo(() => {
    if (dailyCfg) return dailyCfg.assignedDeckLevel || 1;
    if (selectedDeck === 'neutral_starter') return 1;
    const invLvl = deckInventory?.[selectedDeck]?.level || Number(playerDeckLevel) || 1;
    return Math.min(invLvl, getMaxAllowedLevelForPilot(level, 9));
  }, [dailyCfg, selectedDeck, deckInventory, playerDeckLevel, level]);

  const effectiveMaxPlayerHp = useMemo(() => {
    return dailyCfg ? dailyCfg.playerHp : (maxPlayerHp || 50);
  }, [dailyCfg, maxPlayerHp]);


  // Livello Mazzo Avversario Simmetrico (1 9)
  const effectiveAiDeckLevel = useMemo(() => {
    if (aiDeckTheme === 'neutral_starter') return 1;
    if (isPvP) return pvpMeta?.opponent?.deckLevel || getMaxAllowedLevelForPilot(pvpMeta?.opponent?.level || 1, 9);
    if (isAdv) return getAdventureAiDeckLevel(currentAdvPlanet);
    // Nelle Scommesse del Banco l'IA ha il mazzo del giocatore potenziato di +1 grado (max 9)
    if (tierConfig) return Math.min(9, (Number(effectivePlayerDeckLevel) || 1) + 1);
    return Number(aiDeckLevel) || 1;
  }, [aiDeckTheme, isPvP, pvpMeta, isAdv, currentAdvPlanet, tierConfig, effectivePlayerDeckLevel, aiDeckLevel]);


  // Modulo AbilitÃ  Unico Avversario
  const effectiveAiAbilityId = useMemo(() => {
    if (isPvP) return pvpMeta?.opponent?.ability || 'aries';
    if (isAdv) return getComputerAbilityForPlanet(currentAdvPlanet);
    if (gameMode === 'pve' && tierConfig) {
      if (bettingTier === 4) return 'planet_char_20';
      if (bettingTier === 3) return 'planet_char_15';
      if (bettingTier === 2) return 'leo';
      return 'taurus';
    }
    return 'taurus';
  }, [isPvP, pvpMeta, isAdv, currentAdvPlanet, gameMode, tierConfig, bettingTier]);

    const playerDeckObj = useMemo(() => {
    if (dailyCfg) {
      const foundDaily = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === dailyCfg.assignedDeck) : null;
      return foundDaily || { id: dailyCfg.assignedDeck, name: dailyCfg.assignedDeck, color: '#facc15', glow: 'rgba(250,204,21,0.6)' };
    }
    if (selectedDeck === 'neutral_starter' || (isAdv && currentAdvPlanet === 1 && currentAdvLevel < 10 && selectedDeck === 'neutral_starter')) {

      return {
        id: 'neutral_starter',
        name: 'Mazzo Neutro Cadetto',
        color: '#94a3b8',
        glow: 'rgba(148, 163, 184, 0.5)',
        deckPassiveDesc: 'Mazzo Neutro Cadetto (Standard di addestramento).'
      };
    }
    const found = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === selectedDeck) : null;
    return found || ALL_ABILITIES?.find(a => a.id === 'neutral_starter') || ALL_ABILITIES?.[0] || {
      id: 'neutral_starter',
      name: 'Mazzo Neutro Cadetto',
      color: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.5)',
      deckPassiveDesc: 'Mazzo Neutro Cadetto (Standard di addestramento).'
    };
  }, [selectedDeck, isAdv, currentAdvPlanet, currentAdvLevel]);

  const aiDeckObj = useMemo(() => {
    if (aiDeckTheme === 'neutral_starter') {
      return {
        id: 'neutral_starter',
        name: 'Mazzo Neutro Cadetto',
        color: '#94a3b8',
        glow: 'rgba(148, 163, 184, 0.5)',
        deckPassiveDesc: 'Mazzo Neutro Cadetto (Standard di addestramento).'
      };
    }
    const found = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === aiDeckTheme) : null;
    return found || {
      id: 'planet_char_1',
      name: 'Terra (Gaia)',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.75)',
      deckPassiveDesc: 'Mazzo standard avversario.'
    };
  }, [aiDeckTheme]);

  const [enemyPassiveSilencedTurns, setEnemyPassiveSilencedTurns] = useState(0);

  const playerTraits = useMemo(() => {
    return getDeckActiveTraits(playerDeckObj.id, effectivePlayerDeckLevel);
  }, [playerDeckObj.id, effectivePlayerDeckLevel]);

  const aiTraits = useMemo(() => {
    if (enemyPassiveSilencedTurns > 0) return [];
    return getDeckActiveTraits(aiDeckObj.id, effectiveAiDeckLevel);
  }, [enemyPassiveSilencedTurns, aiDeckObj.id, effectiveAiDeckLevel]);

  const maxBossPhases = useMemo(() => {
    if (!isAdv || currentAdvLevel !== 10) return 1;
    if (currentAdvPlanet === 11) return 2;
    if (currentAdvPlanet === 14) return 2;
    if (currentAdvPlanet === 17) return 3;
    if (currentAdvPlanet === 20) return 4;
    return 1;
  }, [isAdv, currentAdvPlanet, currentAdvLevel]);

  const [bossPhase, setBossPhase] = useState(1);

    const currentSectorMode = useMemo(() => {
    if (dailyCfg) return dailyCfg.mode;
    if (isPvP) return pvpMeta?.mode || 'classic';
    if (gameMode === 'pve') return bettingGameType || 'classic';
    if (isAdv) {
      return getSectorGameType(currentAdvPlanet, currentAdvLevel, bossPhase);
    }
    return 'classic';
  }, [isPvP, pvpMeta, gameMode, bettingGameType, isAdv, currentAdvPlanet, currentAdvLevel, bossPhase, dailyCfg]);


      const isHardpointMode = false;
const isVectorMode = false;
const isDoubleStageMode = false;
const isTrisMode = false;





  // 1. CALCOLO SETTORE GLOBALE (1-200) PRIMA DEL GATING
  const currentGlobalSectorNum = (currentAdvPlanet - 1) * 10 + currentAdvLevel;

  // 2. GATING DETERMINISTICO MECCANICHE
  const isMalusAllowed = isPvP || !isAdv || currentGlobalSectorNum >= 11;
  const isDiceAllowed = isPvP || !isAdv || currentGlobalSectorNum >= 12;
  const isAnomalyAllowed = !isPvP && (!isAdv || currentGlobalSectorNum >= 14);
  const isTerrainAllowed = isPvP || gameMode === 'pve' || (isAdv && currentGlobalSectorNum >= TERRAIN_CARDS_UNLOCK_SECTOR) || equippedTerrainSlots.some(Boolean);



  const [playerTerrainSlots, setPlayerTerrainSlots] = useState(() => {
    return [0, 1, 2, 3].map(idx => {
      const cId = equippedTerrainSlots[idx];
      const cardDef = cId ? TERRAIN_CARDS_DATABASE.find(c => c.id === cId) : null;
      const cardLvl = cId ? (unlockedTerrainCards[cId]?.level || 1) : 1;
      return {
        slotIdx: idx,
        cardId: cId || null,
        card: cardDef,
        level: Math.min(cardLvl, getMaxAllowedLevelForPilot(level, 3)),
        isTriggered: false,
        isExhausted: false,
        canRearm: false
      };
    });
  });

  const playerTerrainSlotsRef = useRef(playerTerrainSlots);
  useEffect(() => { playerTerrainSlotsRef.current = playerTerrainSlots; }, [playerTerrainSlots]);

  const [aiTerrainSlots, setAiTerrainSlots] = useState(() => {
    if (!isTerrainAllowed) return [];
      const aiPool = ['cryo_stasis', 'magnetic_valve', 'frequency_reserve', 'resonance_lock'];

    
    // Livello simmetrico carte terreno nemico basato sulla fascia del contesto
    let aiTerrainTier = 1;
    if (isAdv) {
      aiTerrainTier = currentAdvPlanet >= 14 ? 3 : currentAdvPlanet >= 7 ? 2 : 1;
    } else if (gameMode === 'pve') {
      aiTerrainTier = bettingTier >= 3 ? 3 : bettingTier === 2 ? 2 : 1;
    } else if (isPvP) {
      aiTerrainTier = getMaxAllowedLevelForPilot(pvpMeta?.opponent?.level || 1, 3);
    }

    return aiPool.map((cId, idx) => {
      const cardDef = TERRAIN_CARDS_DATABASE.find(c => c.id === cId);
      return {
        slotIdx: idx,
        cardId: cId,
        card: cardDef,
        level: aiTerrainTier,
        isTriggered: false,
        isExhausted: false,
        canRearm: false
      };
    });
  });

  const aiTerrainSlotsRef = useRef(aiTerrainSlots);
  useEffect(() => { aiTerrainSlotsRef.current = aiTerrainSlots; }, [aiTerrainSlots]);

    // CURVA VITALE UNIVERSALE DEL GIOCATORE (50–400 HP O DETERMINISTICA SFIDA)
  const universalPlayerHp = dailyCfg ? dailyCfg.playerHp : calculateUniversalPlayerHp(level);

    let calculatedInitialAiHp = 50;
  if (dailyCfg) {
    calculatedInitialAiHp = dailyCfg.aiHp;
  } else if (isPvP) {
    calculatedInitialAiHp = calculateUniversalPlayerHp(pvpMeta?.opponent?.level || 1);
  } else if (tierConfig) {
    // Nelle Scommesse del Banco l'IA ha sempre il 15% di HP in pi  rispetto al giocatore
    calculatedInitialAiHp = Math.round(universalPlayerHp * 1.15);
  } else if (isAdv) {


    if (currentAdvLevel === 10) {
      if (currentAdvPlanet === 1) calculatedInitialAiHp = 75;
      else if (currentAdvPlanet === 2) calculatedInitialAiHp = 100;
      else if (currentAdvPlanet === 11) calculatedInitialAiHp = 130;
      else if (currentAdvPlanet === 14) calculatedInitialAiHp = 160;
      else if (currentAdvPlanet === 17) calculatedInitialAiHp = 140;
      else if (currentAdvPlanet === 20) calculatedInitialAiHp = 200;
      else calculatedInitialAiHp = Math.floor(75 + currentAdvPlanet * 15);
    } else {
      calculatedInitialAiHp = Math.floor(35 + (currentAdvPlanet - 1) * 12 + currentAdvLevel * 2.5);
    }
  }

  const [playerHp, setPlayerHp] = useState(universalPlayerHp);
  const [aiHp, setAiHp] = useState(calculatedInitialAiHp);
  const [maxAiHp, setMaxAiHp] = useState(calculatedInitialAiHp);
  const [showReviveModal, setShowReviveModal] = useState(false);
  const [hasUsedRevive, setHasUsedRevive] = useState(false);
  const [enceladoAutoReviveUsed, setEnceladoAutoReviveUsed] = useState(false);
  const [hasUsedFirstHitShield, setHasUsedFirstHitShield] = useState(false);
  const [hasUsedFreeExtract, setHasUsedFreeExtract] = useState(false);
  const [glieseHitCounter, setGlieseHitCounter] = useState(0);
  const [lastPlayerOp, setLastPlayerOp] = useState(null);

  const [popupMsg, setPopupMsg] = useState(null);
  const [turnBanner, setTurnBanner] = useState(null);

  const isBombAllowed = useMemo(() => {
    if (isPvP || gameMode === 'pve') return true;
    if (isAdv) {
      const globalSector = (currentAdvPlanet - 1) * 10 + currentAdvLevel;
      return globalSector >= (typeof BOMB_UNLOCK_ADVENTURE_SECTOR !== 'undefined' ? BOMB_UNLOCK_ADVENTURE_SECTOR : 6);
    }
    return false;
  }, [isPvP, gameMode, isAdv, currentAdvPlanet, currentAdvLevel]);

     const [bombState, setBombState] = useState(() => {
    if (!isBombAllowed) return null;
    const raw = generateBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
    const ops = ['+', '-', '*', '/'];
    return {
      ...raw,
      op1: ops[Math.floor(Math.random() * ops.length)],
      op2: ops[Math.floor(Math.random() * ops.length)],
      turnsRemaining: 3,
      tableCard: createRandomCard(false)
    };
  });


  const bombStateRef = useRef(bombState);
  useEffect(() => { bombStateRef.current = bombState; }, [bombState]);


  const isGoldenCardAllowed = useMemo(() => {
    if (isPvP || gameMode === 'pve') return true;
    if (isAdv) {
      const globalSector = (currentAdvPlanet - 1) * 10 + currentAdvLevel;
      return globalSector >= (typeof GOLDEN_CARD_UNLOCK_SECTOR !== 'undefined' ? GOLDEN_CARD_UNLOCK_SECTOR : 7);
    }
    return false;
  }, [isPvP, gameMode, isAdv, currentAdvPlanet, currentAdvLevel]);

  const [playerGoldenCardId, setPlayerGoldenCardId] = useState(null);
  const [playerGoldenTurns, setPlayerGoldenTurns] = useState(0);
  const [aiGoldenCardId, setAiGoldenCardId] = useState(null);
  const [aiGoldenTurns, setAiGoldenTurns] = useState(0);

  const playerGoldenCardIdRef = useRef(playerGoldenCardId);
  const playerGoldenTurnsRef = useRef(playerGoldenTurns);
  const aiGoldenCardIdRef = useRef(aiGoldenCardId);
  const aiGoldenTurnsRef = useRef(aiGoldenTurns);

  useEffect(() => { playerGoldenCardIdRef.current = playerGoldenCardId; }, [playerGoldenCardId]);
  useEffect(() => { playerGoldenTurnsRef.current = playerGoldenTurns; }, [playerGoldenTurns]);
  useEffect(() => { aiGoldenCardIdRef.current = aiGoldenCardId; }, [aiGoldenCardId]);
  useEffect(() => { aiGoldenTurnsRef.current = aiGoldenTurns; }, [aiGoldenTurns]);

        const [isSelectingDiscard, setIsSelectingDiscard] = useState(false);
  const [isTruePassTurn, setIsTruePassTurn] = useState(false);
  const [juiceFeedbackData, setJuiceFeedbackData] = useState(null);
  const [microShakeClass, setMicroShakeClass] = useState('');
  const [resonanceStreak, setResonanceStreak] = useState(0);



    // --- STATI FAGLIA DI VULNERABILITÀ ---
  const damageTakenAccumulatorRef = useRef(0);
  const [riftState, setRiftState] = useState(null);
  const riftStateRef = useRef(riftState);
  useEffect(() => { riftStateRef.current = riftState; }, [riftState]);
    const [enemySkipNextTurn, setEnemySkipNextTurn] = useState(false);
  const [playerSkipNextTurn, setPlayerSkipNextTurn] = useState(false);


  // Monitoraggio automatico del danno subito (soglia 30% HP Max)
  const prevPlayerHpRef = useRef(playerHp);
  useEffect(() => {
    if (playerHp < prevPlayerHpRef.current) {
      const lostHp = prevPlayerHpRef.current - playerHp;
      damageTakenAccumulatorRef.current += lostHp;
    }
    prevPlayerHpRef.current = playerHp;
  }, [playerHp]);



  // ACCUMULATORE E STATI DI CARICA: 1 SOLO MODULO ATTIVO PER GIOCATORE E IA
  const [abilityDamageAccumulator, setAbilityDamageAccumulator] = useState(0);
  const [abilityMeter, setAbilityMeter] = useState(0);
  const [isAbilityReady, setIsAbilityReady] = useState(false);
  const [aiAbilityMeter, setAiAbilityMeter] = useState(0);

  // Array di retrocompatibilitÃ 
  const slotMeters = useMemo(() => [abilityMeter, 0, 0], [abilityMeter]);
  const slotReady = useMemo(() => [isAbilityReady, false, false], [isAbilityReady]);
  const aiSlotMeters = useMemo(() => [aiAbilityMeter, 0, 0], [aiAbilityMeter]);

  const [usedEpicItemsInMatch, setUsedEpicItemsInMatch] = useState({});
  const [hasUsedEpicItemThisTurn, setHasUsedEpicItemThisTurn] = useState(false);

  const [showMobiusModal, setShowMobiusModal] = useState(false);
  const [mobiusMaxSwaps, setMobiusMaxSwaps] = useState(2);

  const [showNeutonicModal, setShowNeutonicModal] = useState(false);
  const [neutonicMaxFuse, setNeutonicMaxFuse] = useState(2);

  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteMaxTargets, setRewriteMaxTargets] = useState(1);

  const [pistonOverrideActive, setPistonOverrideActive] = useState(false);
  const [pistonOverrideDamage, setPistonOverrideDamage] = useState(20);
  const [enemyPistonOverrideActive, setEnemyPistonOverrideActive] = useState(false);
  const [enemyPistonOverrideDamage, setEnemyPistonOverrideDamage] = useState(30);

  const [battleHistorySnapshots, setBattleHistorySnapshots] = useState([]);

  const [mirrorShieldActive, setMirrorShieldActive] = useState(false);
  const [mirrorShieldMultiplier, setMirrorShieldMultiplier] = useState(1.0);
  const [enemyMirrorShieldActive, setEnemyMirrorShieldActive] = useState(false);
  const [enemyMirrorShieldMultiplier, setEnemyMirrorShieldMultiplier] = useState(1.0);

  const [isEclipseStormActive, setIsEclipseStormActive] = useState(false);


   // =========================================================================
  // BANCO TERRENO: INNESCO PASSIVO E RIARMO
  // =========================================================================
    


  // STATI DI SCARTO MANUALE E FEEDBACK 


  // SBLOCCO ETERE IN BATTAGLIA: ATTIVO DAL SETTORE 15 DELL'AVVENTURA O IN PvP/PvE
  const isEtherAllowed = useMemo(() => {
    if (isPvP) return true;
    if (gameMode === 'pve') return true;
    if (isAdv) {
      const globalSector = (currentAdvPlanet - 1) * 10 + currentAdvLevel;
      return globalSector >= ETHER_UNLOCK_SECTOR;
    }
    return true;
  }, [isPvP, gameMode, isAdv, currentAdvPlanet, currentAdvLevel]);

  // SISTEMA TUTORIAL CONTESTUALI (DISCOVERY POPUPS IN PRIMO PIANO CON BLOCCO TIMER)
  const [activeDiscoveryTutorial, setActiveDiscoveryTutorial] = useState(null);
  const triggerDiscoveryTutorial = useCallback((tutorialKey) => {
    if (typeof window === 'undefined') return;
    try {
      const seen = JSON.parse(localStorage.getItem('eclissi_seen_tutorials') || '{}');
      if (!seen[tutorialKey]) {
        seen[tutorialKey] = true;
        localStorage.setItem('eclissi_seen_tutorials', JSON.stringify(seen));
        setActiveDiscoveryTutorial(tutorialKey);
      }
    } catch (_) {}
  }, []);

    // STATO E MODALITÀ OPERATIVA SCANNER TATTICO (BLOCCATO IN SFIDA DEL GIORNO)
  const scannerMode = useMemo(() => {
    if (dailyCfg) return 'RESTRICTED';
    return getSectorScannerMode(currentGlobalSectorNum, gameMode, bettingTier);
  }, [dailyCfg, currentGlobalSectorNum, gameMode, bettingTier]);


    const [isScannerActive, setIsScannerActive] = useState(() => scannerMode === 'FREE_FULL');
  const [scannerUsedThisTurn, setScannerUsedThisTurn] = useState(false);
  const [turnTimeElapsed, setTurnTimeElapsed] = useState(0);
  const turnTimeElapsedRef = useRef(turnTimeElapsed);
  useEffect(() => { turnTimeElapsedRef.current = turnTimeElapsed; }, [turnTimeElapsed]);
  const isScannerActiveRef = useRef(isScannerActive);
  useEffect(() => { isScannerActiveRef.current = isScannerActive; }, [isScannerActive]);
  const scannerSecondsRef = useRef(scannerSeconds);
  useEffect(() => { scannerSecondsRef.current = scannerSeconds; }, [scannerSeconds]);



  // Manteniamo aiutiEnabled allineato a isScannerActive per retrocompatibilit  grafica
  const aiutiEnabled = isScannerActive;

    const toggleScanner = () => {
    if (scannerMode === 'RESTRICTED') {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Lo Scanner Tattico è disabilitato in questa modalità competitiva!");
      return;
    }
    if (scannerMode === 'FREE_FULL') {
      triggerPopup("In questo settore lo Scanner è sempre attivo e gratuito!");
      return;
    }
    if (scannerMode === 'FREE_EMERGENCY') {
      if (timer > 30) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup("Assistenza di emergenza: si attiverà gratuitamente solo se restano <= 30s!");
      }
      return;
    }
    if (scannerMode === 'TANK_PAID') {
      if (!isScannerActive && scannerSeconds <= 0) {
        if (typeof onBuyScannerRefill === 'function') {
          onBuyScannerRefill();
        } else {
          try { playSound('deselect'); } catch (_) {}
          triggerPopup("Serbatoio Scanner esaurito! Ricarica 10s al costo di 1 💎.");
        }
        return;
      }
      try { playSound('click'); } catch (_) {}
      const next = !isScannerActive;
      isScannerActiveRef.current = next;
      setIsScannerActive(next);
      if (next) setScannerUsedThisTurn(true);
    }
  };



  // FLOATING COMBAT TEXT SPAZIALIZZATI (NO SOVRAPPOSIZIONI)
  const [floatingTexts, setFloatingTexts] = useState([]);
  const triggerFloatingText = useCallback((text, color = '#facc15', position = 'top-right', delayMs = 0) => {
    const id = `ftext_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    const trigger = () => {
      setFloatingTexts(prev => [...prev, { id, text, color, position }]);
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(item => item.id !== id));
      }, 1200);
    };

    if (delayMs > 0) {
      setTimeout(trigger, delayMs);
    } else {
      trigger();
    }
  }, []);

     // Vite isolate: nella Sfida del Giorno usa solo quelle fornite dal seed (0 o 1), altrimenti saldo account
  const availableReviveLives = dailyCfg 
    ? (dailyCfg.livesProvided || 0) 
    : Math.max(0, lives);


  const walletCap = getStardustWalletCap(level);

  // Helper Economici
  const addStardustWithCap = useCallback((amount) => {
    if (typeof setStardust !== 'function') return;
    setStardust(prev => {
      const next = prev + amount;
      if (next >= walletCap) return walletCap;
      return next;
    });
  }, [setStardust, walletCap]);

  // CAP 10 DIAMANTI APPLICATO ESCLUSIVAMENTE ALLE SCOMMESSE PvE
  const addBettingDiamondsWithCap = useCallback((amount) => {
    if (dailyBettingDiamondsEarned >= DAILY_BETTING_DIAMOND_CAP) return 0;
    const canEarn = Math.min(amount, DAILY_BETTING_DIAMOND_CAP - dailyBettingDiamondsEarned);
    if (canEarn > 0) {
      if (typeof setDiamonds === 'function') setDiamonds(d => d + canEarn);
      if (typeof setDailyBettingDiamondsEarned === 'function') {
        setDailyBettingDiamondsEarned(prev => prev + canEarn);
      }
    }
    return canEarn;
  }, [dailyBettingDiamondsEarned, setDiamonds, setDailyBettingDiamondsEarned]);

  // Etere e Modali Tattici
  const maxBattleEther = EXTRACTOR_LEVELS[extractorLevel]?.battleCap || 2;
  const [battleEther, setBattleEther] = useState(() => {
    if (!isEtherAllowed) return 0;
    let initialBonus = 0;
    playerTraits.forEach(t => {
      if (t.type === 'initial_ether_bonus') initialBonus += (t.amount || 1);
    });
    return Math.min(maxBattleEther, Math.min(ether, maxBattleEther) + initialBonus);
  });
  const [aiBattleEther, setAiBattleEther] = useState(0);
  const [jokerTargetIndex, setJokerTargetIndex] = useState(null);
  const [showDeckExtractModal, setShowDeckExtractModal] = useState(false);
  const [extractHandIndex, setExtractHandIndex] = useState(null);

  // =========================================================================
  // MAZZI & SCARTI INDIPENDENTI: ISTANZA SINGOLA DA 54 CARTE (ZERO DOPPIONI)
  // =========================================================================
  const initialPlayerHandSize = useMemo(() => {
    const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
    return sizeTrait ? (sizeTrait.size || 8) : 7;
  }, [playerTraits]);
  
  const initialPlayerDeckFull = useMemo(() => {
    return createStandardDeck(playerDeckObj.id, effectivePlayerDeckLevel);
  }, [playerDeckObj.id, effectivePlayerDeckLevel]);

  const initialAiDeckFull = useMemo(() => {
    return createStandardDeck(aiDeckObj.id, effectiveAiDeckLevel);
  }, [aiDeckObj.id, effectiveAiDeckLevel]);

        const [playerHand, setPlayerHand] = useState(() => {
    const baseHand = initialPlayerDeckFull.slice(0, initialPlayerHandSize);

    // Tutorial Vettore Turno 1: Mano fissa con 4♠ (idx 0) e 5♦ (idx 1) -> 4 * 5 = 20
    if (isVectorMode && !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true') {
      return [
        { id: 'tut_v1_1', value: 4, displayVal: '4', suit: 'spades', symbol: '♠', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_2', value: 5, displayVal: '5', suit: 'diamonds', symbol: '♦', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_3', value: 2, displayVal: '2', suit: 'hearts', symbol: '♥', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_4', value: 8, displayVal: '8', suit: 'clubs', symbol: '♣', color: '#10b981', glow: 'rgba(16, 185, 129, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_5', value: 7, displayVal: '7', suit: 'diamonds', symbol: '♦', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_6', value: 9, displayVal: '9', suit: 'spades', symbol: '♠', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', isCourt: false, isJoker: false, isGolden: false },
        { id: 'tut_v1_7', value: 6, displayVal: '6', suit: 'hearts', symbol: '♥', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', isCourt: false, isJoker: false, isGolden: false }
      ];
    }

    // Didattica Livello 2: garantisce almeno 1 carta Cuori per far testare la cura
    if (isAdv && currentAdvPlanet === 1 && currentAdvLevel === 2) {
      const hasHearts = baseHand.some(c => c && c.suit === 'hearts');
      if (!hasHearts) {
        const heartCard = initialPlayerDeckFull.slice(initialPlayerHandSize).find(c => c && c.suit === 'hearts');
        if (heartCard && baseHand.length > 0) {
          baseHand[0] = heartCard;
        }
      }
    }
    return baseHand;
  });


  const [playerDeck, setPlayerDeck] = useState(() => initialPlayerDeckFull.slice(initialPlayerHandSize));
  const [playerDiscard, setPlayerDiscard] = useState([]);

  const [aiHand, setAiHand] = useState(() => initialAiDeckFull.slice(0, 7));
  const [aiDeck, setAiDeck] = useState(() => initialAiDeckFull.slice(7));
  const [aiDiscard, setAiDiscard] = useState([]);

  const [aiDeckCount, setAiDeckCount] = useState(47);
  const [aiDiscardTop, setAiDiscardTop] = useState(null);
  const [aiDiscardCount, setAiDiscardCount] = useState(0);

  const [aiCardStates, setAiCardStates] = useState(() => Array(7).fill(''));
  const [activeAbilityVfx, setActiveAbilityVfx] = useState('');

  // Obiettivi Classica & Anomalia Attiva
  const [activeAnomaly, setActiveAnomaly] = useState(FIELD_ANOMALIES[0]);
  const [usedAnomalyBypassThisTurn, setUsedAnomalyBypassThisTurn] = useState(false);

  

    const [selectedIndices, setSelectedIndices] = useState([]);
  const [selectedObjectiveIndex, setSelectedObjectiveIndex] = useState(0);
  const [hasDeselectedThisTurn, setHasDeselectedThisTurn] = useState(false);

  const [consecutiveHitsCount, setConsecutiveHitsCount] = useState(0);
  const [burnRoundsRemaining, setBurnRoundsRemaining] = useState(0);

  
    // Modalità Tris Stellare: Formula ad Incastro con 3 Bersagli (2 Normali + 1 Bomba)
  const [trisObjectives, setTrisObjectives] = useState(() => 
    generateTrisStellareObjectives(
      bombState, 
      (currentAdvPlanet - 1) * 10 + currentAdvLevel, 
      isBombAllowed,
      initialPlayerDeckFull.slice(0, initialPlayerHandSize),
      null,
      bombState?.tableCard
    )
  );

  // Piedistalli unificati per la Modalità Classica
  const [classicObjectives, setClassicObjectives] = useState(() => 
    generateClassicObjectives(initialPlayerDeckFull.slice(0, initialPlayerHandSize), isBombAllowed)
  );





  const [selectedTrisHandIndices, setSelectedTrisHandIndices] = useState([]);
  const [trisSelectedOp1, setTrisSelectedOp1] = useState('+');
  const [trisSelectedOp2, setTrisSelectedOp2] = useState('*');
  const [activeTrisCombo, setActiveTrisCombo] = useState(null);

        // Modalità Vettore Geometrico: Stazione 1 (Nucleo), Stazione 2 (Filtro Parità), Stazione 3 (Bomba 3T Trasversale)
  const [vectorTarget, setVectorTarget] = useState(() => {
    if (isVectorMode && !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true') {
      return 20;
    }
    return 24;
  });
  const [vectorNucleus, setVectorNucleus] = useState(null);

  const [vectorHistorySuits, setVectorHistorySuits] = useState([]);
  const [vectorUsedCardsCount, setVectorUsedCardsCount] = useState(0);
  const [selectedVectorCardIndex, setSelectedVectorCardIndex] = useState(null);
  
    // Stazione attiva: 'nucleus' (Radar) oppure 'poker' (Poker a Parità)
  const [vectorStation, setVectorStation] = useState('nucleus');

  // Stazione 2: Filtro Parità
  const [vectorParityFilter, setVectorParityFilter] = useState('PARI');

  const vectorParityFilterRef = useRef(vectorParityFilter);
  useEffect(() => { vectorParityFilterRef.current = vectorParityFilter; }, [vectorParityFilter]);

  // Stazione 3: Bomba Trasversale (3T)
  const [vectorBombCountdown, setVectorBombCountdown] = useState(3);
  const [vectorBombData, setVectorBombData] = useState(() => 
    generateVectorBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel)
  );
  const vectorBombCountdownRef = useRef(vectorBombCountdown);
  const vectorBombDataRef = useRef(vectorBombData);
  useEffect(() => { vectorBombCountdownRef.current = vectorBombCountdown; }, [vectorBombCountdown]);
  useEffect(() => { vectorBombDataRef.current = vectorBombData; }, [vectorBombData]);

      // MODALITÀ CONVERGENZA: BANCO COMUNE (CARTA BASE + NUMERO TARGET + BOMBA 3T) & CICLO 2 TURNI (2+2)
  const [convergenceTurn, setConvergenceTurn] = useState(1); // 1: Apertura (2C), 2: Chiusura (2C)
  const [convergenceSubStep, setConvergenceSubStep] = useState(1); // 1: P1 T1, 2: AI T1, 3: P1 T2, 4: AI T2
  const [convergenceBaseCard, setConvergenceBaseCard] = useState(() => createRandomCard(false));
  const [convergenceTarget, setConvergenceTarget] = useState(48);
  const [convergencePlayerT1Val, setConvergencePlayerT1Val] = useState(0);
  const [convergenceAiT1Val, setConvergenceAiT1Val] = useState(0);
  const [convergencePlayerTableCards, setConvergencePlayerTableCards] = useState([]); // 2 carte in T1, 4 carte in T2
  const [convergenceAiTableCards, setConvergenceAiTableCards] = useState([]);
  const [convergenceOp1, setConvergenceOp1] = useState('+');
  const [convergenceOp2, setConvergenceOp2] = useState('+');
  const [convergenceBombData, setConvergenceBombData] = useState(() => 
    generateDuelBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel)
  );
  const [convergenceBombCountdown, setConvergenceBombCountdown] = useState(3);
  const convergenceBombDataRef = useRef(convergenceBombData);
  const convergenceBombCountdownRef = useRef(convergenceBombCountdown);
  useEffect(() => { convergenceBombDataRef.current = convergenceBombData; }, [convergenceBombData]);
  useEffect(() => { convergenceBombCountdownRef.current = convergenceBombCountdown; }, [convergenceBombCountdown]);

  // Alias di retrocompatibilità
  const duelStage = convergenceTurn;
  const duelSubStep = convergenceSubStep;
  const duelTargetFull = convergenceTarget;
  const duelTargetMasked = convergenceTarget.toString();
  const duelInequality = '=';
  const duelPlayerValue = convergencePlayerT1Val;
  const duelAiValue = convergenceAiT1Val;
  const duelSelectedOp = convergenceOp1;
  const duelBombData = convergenceBombData;
  const duelBombCountdown = convergenceBombCountdown;



            // Banco Comune Condiviso a 5 Slot (Giocatore e IA)
  const [tableSlots, setTableSlots] = useState([null, null, null, null, null]);
  const tableSlotsRef = useRef(tableSlots);
  useEffect(() => { tableSlotsRef.current = tableSlots; }, [tableSlots]);

      // Serbatoi Munizioni per i 4 Semi delle Armi (Giocatore e IA)
  const [weaponTanks, setWeaponTanks] = useState({
    spades: 0,
    hearts: 0,
    diamonds: 0,
    clubs: 0
  });
  const weaponTanksRef = useRef(weaponTanks);
  useEffect(() => { weaponTanksRef.current = weaponTanks; }, [weaponTanks]);


  const [aiWeaponTanks, setAiWeaponTanks] = useState({
    spades: 0,
    hearts: 0,
    diamonds: 0,
    clubs: 0
  });
  const aiWeaponTanksRef = useRef(aiWeaponTanks);
  useEffect(() => { aiWeaponTanksRef.current = aiWeaponTanks; }, [aiWeaponTanks]);


  // Cambio Carte nei Tempi Morti (consentito solo durante il turno nemico, max 2 volte)
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  const [selectedExchangeIndices, setSelectedExchangeIndices] = useState([]);
  const [downtimeExchangesLeft, setDowntimeExchangesLeft] = useState(2);


      // Barra Malus: Cap a 20 Punti (con riduzione nei pianeti avanzati e bonus passiva Saturno +3 pt a tacca)
  const malusMaxTicks = useMemo(() => {
    let cap = (isAdv && currentAdvPlanet >= 14) ? 16 : STANDARD_MALUS_CAP;
    const capTrait = playerTraits.find(t => t.type === 'malus_capacity_bonus');
    if (capTrait) cap += (capTrait.extraTicks || 1) * 3;
    return cap;
  }, [isAdv, currentAdvPlanet, playerTraits]);



  const [playerMalusGauge, setPlayerMalusGauge] = useState(0);
  const [aiMalusGauge, setAiMalusGauge] = useState(0);
  const [activePenaltyBanner, setActivePenaltyBanner] = useState(null);
  const [, setAiArchetype] = useState('calculator');
  const [shakeScreen, setShakeScreen] = useState(false);
  const [playerFx, setPlayerFx] = useState('');
  const [aiFx, setAiFx] = useState('');
  const [playerHpFlash, setPlayerHpFlash] = useState(false);
  const [aiHpFlash, setAiHpFlash] = useState(false);
  const [aiActionMessage, setAiActionMessage] = useState('');

  const [playerDisabledAbilitiesTurns, setPlayerDisabledAbilitiesTurns] = useState(0);
    const [playerHandLimitNextTurn, setPlayerHandLimitNextTurn] = useState(null);
  const [aiHandLimitNextTurn, setAiHandLimitNextTurn] = useState(null);


  const requiredNotchesCount = useMemo(() => {
    const diceReqTrait = playerTraits.find(t => t.type === 'dice_notches_req');
    return diceReqTrait ? (diceReqTrait.required || 3) : 4;
  }, [playerTraits]);

  const [playerNotches, setPlayerNotches] = useState(() => {
    const startTrait = playerTraits.find(t => t.type === 'dice_start_notch');
    return { '+': Boolean(startTrait), '-': false, '*': false, '/': false };
  });
  const [aiNotches, setAiNotches] = useState({ '+': false, '-': false, '*': false, '/': false });
  const [playerDiceReady, setPlayerDiceReady] = useState(false);

    const [showDigitalDiceModal, setShowDigitalDiceModal] = useState(false);
  const [isCyclingDice, setIsCyclingDice] = useState(false);
  const [diceDisplayValue, setDiceDisplayValue] = useState(1);
  const [diceDisplayFace, setDiceDisplayFace] = useState(QUANTUM_DICE_B_FACES[0]);
  const [diceResultSummary, setDiceResultSummary] = useState('');
  const diceIntervalRef = useRef(null);


    // (Dichiarazione anticipata in cima alla funzione)



  // CALIBRAZIONE TEMPO BASE: 120s PER I BOSS (SETTORE 10), 90s STANDARD
    const getBaseTime = useCallback(() => {
    if (dailyCfg) return dailyCfg.turnTime;
    if (isPvP) return DEFAULT_TURN_TIME;
    let baseT = getPlanetBaseTurnTime(currentAdvPlanet);


        if (gameMode === 'pve') {
      baseT = bettingTier === 1 ? 60 : bettingTier === 2 ? 55 : bettingTier === 3 ? 50 : 45;
    }


    const currentMod = isAdv ? activeAdventure?.modifier : null;
    if (currentMod && (currentMod.id === 'fast_timer' || currentMod.id === 'boss_combined')) {
      baseT = Math.max(25, Math.floor(baseT / 2));
    }
    return baseT;
  }, [isPvP, isAdv, currentAdvPlanet, gameMode, bettingTier, activeAdventure]);

 // Turno, Timer Giocatore, Timer Avversario & Serbatoi Tempo (Cap +30s)
  const [turn, setTurn] = useState(isPvP ? (pvpMeta?.isHost ? 'player1' : 'ai') : 'player1');
  const [timer, setTimer] = useState(() => getBaseTime());
  const [aiTimer, setAiTimer] = useState(() => getBaseTime());
  const [playerTimeTank, setPlayerTimeTank] = useState(() => {
    const tankTrait = playerTraits.find(t => t.type === 'initial_tank_bonus');
    return tankTrait ? Math.min(TIME_TANK_MAX_CAP, tankTrait.bonus || 15) : 0;
  });
  const [aiTimeTank, setAiTimeTank] = useState(() => {
    const tankTrait = aiTraits.find(t => t.type === 'initial_tank_bonus');
    return tankTrait ? Math.min(TIME_TANK_MAX_CAP, tankTrait.bonus || 15) : 0;
  });
  const [isOvertimeActive, setIsOvertimeActive] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // STATO RIEPILOGO RICOMPENSE DI FINE BATTAGLIA
  const [wonBattleRewards, setWonBattleRewards] = useState(null);

        const isInitializedRef = useRef(false);
  const prevTurnRef = useRef('player1'); // Evita che il montaggio scali la bomba a 2T prima del tempo
  const activeTimeoutsRef = useRef([]);



     // Telemetria di combattimento per la validazione delle 3 Stelle e Sfida del Giorno
  const matchStartTimeRef = useRef(Date.now());
    const playerTurnsCountRef = useRef(1);

  const playerActiveTimeMsRef = useRef(0);
  const turnStartTimestampRef = useRef(Date.now());

      const matchStatsRef = useRef({
    exchangesUsed: 0,
    opCounts: { '+': 0, '-': 0, '*': 0, '/': 0 },
    maxSingleHitDmg: 0,
    goldenOrComboCount: 0,
    heartsPlayed: 0,
    moduleActivations: 0,
    fastStrikesCount: 0,
    vectorMax2CardsHit: false,
    duelPrecisionHit: false,
    trisPokerComboHit: false
  });





  const [adventureStarsResult, setAdventureStarsResult] = useState(null);
  const [starsAnimStep, setStarsAnimStep] = useState(0);


  // Refs per sincronizzazione affidabile dei dati vitali e di plancia
  const playerHpRef = useRef(playerHp);
  const aiHpRef = useRef(aiHp);
  const playerHandRef = useRef(playerHand);
  const playerDeckRef = useRef(playerDeck);
  const playerDiscardRef = useRef(playerDiscard);
  const aiHandRef = useRef(aiHand);
  const aiDeckRef = useRef(aiDeck);
  const aiDiscardRef = useRef(aiDiscard);
  const battleEtherRef = useRef(battleEther);
  const playerTimeTankRef = useRef(playerTimeTank);
  const aiTimeTankRef = useRef(aiTimeTank);
  const playerMalusGaugeRef = useRef(playerMalusGauge);
  useEffect(() => { playerMalusGaugeRef.current = playerMalusGauge; }, [playerMalusGauge]);
  const aiMalusGaugeRef = useRef(aiMalusGauge);
  useEffect(() => { aiMalusGaugeRef.current = aiMalusGauge; }, [aiMalusGauge]);



    // Refs di isolamento per esecuzione del turno avversario
  const aiTurnRunningRef = useRef(false);
  const aiTimeoutIdsRef = useRef([]);
    const aiPlayedDuelCardsRef = useRef([]);
  const aiIonShieldRef = useRef(0);
  const aiTitanArmorRef = useRef(40);
  const aiMagneticShieldRef = useRef(0);
  const aiMagneticTriggeredRef = useRef(false);
  const aiHarmonicBarrierRef = useRef(0);
  const playerSpadesAccumulatedRef = useRef(0);
  const playerDuelPlayedCardsRef = useRef([]);

  // Stati dinamici per meccaniche Boss P14, P15, P16, P17, P18, P19, P20
  const [bombReactorCharge, setBombReactorCharge] = useState(0);
  const [bombDamagePool, setBombDamagePool] = useState(0);
  const [centrifugalCharge, setCentrifugalCharge] = useState(0);
  const [totalAttacksCount, setTotalAttacksCount] = useState(0);
  const [temporaryTerrainUnlocked, setTemporaryTerrainUnlocked] = useState(false);

  // P18 Eris (Brace & Implosione Termica)
  const [playerTimeBurnActive, setPlayerTimeBurnActive] = useState(false);
  const [playerTimeBurnDps, setPlayerTimeBurnDps] = useState(2);
  const [isBossImploding, setIsBossImploding] = useState(false);
  const [bossImplosionDps, setBossImplosionDps] = useState(2);

  // P19 Io (Trifase Magmatica)
  const [ioCycleTurn, setIoCycleTurn] = useState(1);
  const [ioMagmaPool, setIoMagmaPool] = useState(0);
  const [ioDoubleAttackUsed, setIoDoubleAttackUsed] = useState(false);


  

    const activeAnomalyRef = useRef(activeAnomaly);
  const trisObjectivesRef = useRef(trisObjectives);

  const playerTraitsRef = useRef(playerTraits);
  const mirrorShieldActiveRef = useRef(mirrorShieldActive);
  const mirrorShieldMultiplierRef = useRef(mirrorShieldMultiplier);
  const duelTargetFullRef = useRef(duelTargetFull);
  const duelInequalityRef = useRef(duelInequality);
  const duelAiValueRef = useRef(duelAiValue);
  const duelPlayerValueRef = useRef(duelPlayerValue);

   useEffect(() => { playerHpRef.current = playerHp; }, [playerHp]);
  useEffect(() => { aiHpRef.current = aiHp; }, [aiHp]);
  useEffect(() => { playerHandRef.current = playerHand; }, [playerHand]);
  useEffect(() => { playerDeckRef.current = playerDeck; }, [playerDeck]);
  useEffect(() => { playerDiscardRef.current = playerDiscard; }, [playerDiscard]);
  useEffect(() => { aiHandRef.current = aiHand; }, [aiHand]);
  useEffect(() => { aiDeckRef.current = aiDeck; }, [aiDeck]);
    useEffect(() => { aiDiscardRef.current = aiDiscard; }, [aiDiscard]);
  useEffect(() => { battleEtherRef.current = battleEther; }, [battleEther]);
  useEffect(() => { playerTimeTankRef.current = playerTimeTank; }, [playerTimeTank]);
  useEffect(() => { aiTimeTankRef.current = aiTimeTank; }, [aiTimeTank]);



    useEffect(() => { activeAnomalyRef.current = activeAnomaly; }, [activeAnomaly]);
  useEffect(() => { trisObjectivesRef.current = trisObjectives; }, [trisObjectives]);

  useEffect(() => { playerTraitsRef.current = playerTraits; }, [playerTraits]);
  useEffect(() => { mirrorShieldActiveRef.current = mirrorShieldActive; }, [mirrorShieldActive]);
  useEffect(() => { mirrorShieldMultiplierRef.current = mirrorShieldMultiplier; }, [mirrorShieldMultiplier]);
  useEffect(() => { duelTargetFullRef.current = duelTargetFull; }, [duelTargetFull]);
  useEffect(() => { duelInequalityRef.current = duelInequality; }, [duelInequality]);
  useEffect(() => { duelAiValueRef.current = duelAiValue; }, [duelAiValue]);
    useEffect(() => { duelPlayerValueRef.current = duelPlayerValue; }, [duelPlayerValue]);

  const clearAllActiveTimeouts = useCallback(() => {
    activeTimeoutsRef.current.forEach(clearTimeout);
    activeTimeoutsRef.current = [];
  }, []);

  const safeSetTimeout = useCallback((fn, delay) => {
    const id = setTimeout(() => {
      activeTimeoutsRef.current = activeTimeoutsRef.current.filter(tId => tId !== id);
      fn();
    }, delay);
    activeTimeoutsRef.current.push(id);
    return id;
  }, []);

  const triggerPopup = useCallback((msg) => {
    setPopupMsg(msg);
    safeSetTimeout(() => setPopupMsg(null), 2500);
  }, [safeSetTimeout]);

  const triggerJuiceFeedback = useCallback((payload) => {
    playSynthesizedOperatorSound(payload.operator);
    const shake = getOperatorMicroShakeClass(payload.operator);
    setMicroShakeClass(shake);
    safeSetTimeout(() => setMicroShakeClass(''), 130);
    setJuiceFeedbackData(payload);
  }, [safeSetTimeout]);

  const clearAiTurnTimeouts = useCallback(() => {
    aiTimeoutIdsRef.current.forEach(clearTimeout);
    aiTimeoutIdsRef.current = [];
    aiTurnRunningRef.current = false;
  }, []);

    useEffect(() => {
    return () => {
      clearAllActiveTimeouts();
      clearAiTurnTimeouts();
      if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    };
  }, [clearAllActiveTimeouts, clearAiTurnTimeouts]);


  // TRIGGER BANNER CAMBIO TURNO ANIMATO + AUDIO DEDICATO

  const triggerTurnBanner = useCallback((isPlayerTurn) => {
    const bannerData = isPlayerTurn 
      ? { type: 'player', title: 'TOCCA A TE', subtitle: 'TUO TURNO' }
      : { 
          type: 'opponent', 
          title: 'TURNO CEDUTO', 
          subtitle: isPvP ? `TURNO DI ${(pvpMeta?.opponent?.nickname || 'AVVERSARIO').toUpperCase()}` : 'TURNO AVVERSARIO' 
        };
    
    setTurnBanner(bannerData);
    try {
      playSound(isPlayerTurn ? 'turn_player' : 'turn_opponent');
    } catch (_) {}

    safeSetTimeout(() => {
      setTurnBanner(null);
    }, 1100);
  }, [isPvP, pvpMeta, safeSetTimeout]);

 // =========================================================================
// ACCUMULATORE MODULO ABILITÀ IBRIDO: 3 COLPI A SEGNO = 100% (4 TACCHE SU 12 A COLPO)
// =========================================================================
const accumulateAbilityDamage = useCallback((amountOrHits, isPlayer = true, forceNotches = null) => {
  let notchesToAdd = 4; // Default: 1 colpo a segno = 4 tacche (1/3 di barra)

  if (forceNotches !== null) {
    notchesToAdd = forceNotches;
  } else if (amountOrHits === 'FULL' || amountOrHits === 60 || (typeof amountOrHits === 'number' && amountOrHits >= 999)) {
    notchesToAdd = 12; // Ricarica istantanea 100% (Dadi Faccia Nera, Bomba Sovraccarico, Calice)
  } else if (typeof amountOrHits === 'number' && amountOrHits <= 3) {
    notchesToAdd = amountOrHits; // Apporti minimi da ustioni o tick passivi
  }

  if (notchesToAdd <= 0) return;

  if (isPlayer) {
    if (!isAbilityModuleUnlocked) return;

    setAbilityMeter(prev => {
      const next = Math.min(12, prev + notchesToAdd);
      if (next >= 12 && prev < 12) {
        setIsAbilityReady(true);
        try { playSound('ability_charged_100'); } catch (_) {}
        triggerFloatingText("MODULO CARICO (100%)", "#00f2fe", "bottom-left");
      }
      return next;
    });
  } else {
    setAiAbilityMeter(prev => Math.min(12, prev + notchesToAdd));
  }
}, [isAbilityModuleUnlocked, triggerFloatingText]);





  // =========================================================================
  // GESTIONE TRANSIZIONI MULTI-FASE BOSS CON RESET MAZZO A 54 CARTE
  // =========================================================================
  const advanceBossPhase = useCallback(() => {
    if (!isAdv || currentAdvLevel !== 10) return false;
    if (bossPhase >= maxBossPhases) return false;

    const nextPhase = bossPhase + 1;
    setBossPhase(nextPhase);

    let nextPhaseHp = 100;
    if (currentAdvPlanet === 20) nextPhaseHp = 200;
    else if (currentAdvPlanet === 17) nextPhaseHp = 140;
    else if (currentAdvPlanet === 14) nextPhaseHp = 160;
    else if (currentAdvPlanet === 11) nextPhaseHp = 130;
    else nextPhaseHp = Math.floor(75 + currentAdvPlanet * 15);

    setAiHp(nextPhaseHp);
    setMaxAiHp(nextPhaseHp);

    playerTraits.forEach(t => {
      if (t.type === 'phase_clear_heal') {
        const healAmt = t.hp || 25;
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
        triggerFloatingText(`+${healAmt} HP (SIFONE)`, '#38bdf8', 'bottom-left');
      }
    });

    const handSizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
    const playerTargetHand = handSizeTrait ? (handSizeTrait.size || 8) : 7;
    const freshPlayerDeck = createStandardDeck(playerDeckObj.id, effectivePlayerDeckLevel);
    
    setPlayerHand(freshPlayerDeck.slice(0, playerTargetHand));
    setPlayerDeck(freshPlayerDeck.slice(playerTargetHand));
    setPlayerDiscard([]);

    const freshAiDeck = createStandardDeck(aiDeckObj.id, effectiveAiDeckLevel);
    setAiHand(freshAiDeck.slice(0, 7));
    setAiDeck(freshAiDeck.slice(7));
    setAiDiscard([]);

           // Pulizia totale selezioni e modificatori di fase precedente
        setSelectedIndices([]);
    setSelectedTrisHandIndices([]);
    setTableSlots([null, null, null, null, null]);
    tableSlotsRef.current = [null, null, null, null, null];
    setVectorNucleus(null);
    setSelectedVectorCardIndex(null);
    setPlayerGoldenCardId(null);
    setPlayerGoldenTurns(0);
    setAiGoldenCardId(null);
    setAiGoldenTurns(0);
    setIsSelectingDiscard(false);
    setRiftState(null);
    riftStateRef.current = null;
    damageTakenAccumulatorRef.current = 0;


    // Ripristino timer di turno e rigenerazione parametri per la nuova fase/modalità
    setTimer(getBaseTime());
    setAiTimer(getBaseTime());
    setIsOvertimeActive(false);
    setTurnTimeElapsed(0);
    randomizeTurnParameters();

    try { playSound('boss_phase_transition'); } catch (_) {}

    setShakeScreen(true);
    safeSetTimeout(() => setShakeScreen(false), 500);


    triggerFloatingText(`BOSS: FASE ${nextPhase}/${maxBossPhases}!`, "#ef4444", "top-right");

       if (currentAdvPlanet === 20) {
      if (nextPhase === 2) {
        setEnemyMirrorShieldMultiplier(1.5);
        setEnemyMirrorShieldActive(true);
        triggerPopup("ENCELADO FASE 2: Attiva Monolite Dielettrico L2! RifletterÃ  il tuo prossimo colpo x1.5!");
      } else if (nextPhase === 3) {

        setPlayerDisabledAbilitiesTurns(2);
        setIsAbilityReady(false);
        setAbilityMeter(0);
        triggerPopup("ENCELADO FASE 3: Attiva Stele d'Ombra! Il tuo Modulo AbilitÃ  Ã¨ bloccato per 2 turni!");
          } else if (nextPhase === 4) {
        setEnemyPistonOverrideActive(true);
        setEnemyPistonOverrideDamage(30);
        triggerPopup("ENCELADO APOTEOSI: Attiva Pistone Gravimetrico L3! Il suo prossimo attacco infliggerÃ  30 HP fissi!");
      }

    } else {
      triggerPopup(`ATTENZIONE: Il Boss entra in FASE ${nextPhase}/${maxBossPhases}!\nMazzi e scarti ricaricati a 54 carte.`);
    }

    return true;
  }, [isAdv, currentAdvLevel, bossPhase, maxBossPhases, currentAdvPlanet, playerTraits, playerDeckObj.id, effectivePlayerDeckLevel, aiDeckObj.id, effectiveAiDeckLevel, maxPlayerHp, triggerFloatingText, triggerPopup, safeSetTimeout]);

  // =========================================================================
  // SNAPSHOT ENGINE PER RIAVVOLGIMENTO TEMPORALE (PENDOLO ENTROPICO)
  // =========================================================================
  const saveBattleSnapshot = useCallback(() => {
    const snapshot = {
      playerHp: playerHpRef.current,
      aiHp: aiHpRef.current,
      playerHand: [...playerHandRef.current],
      playerDeck: [...playerDeckRef.current],
      playerDiscard: [...playerDiscardRef.current],
      aiHand: [...aiHandRef.current],
      aiDeck: [...aiDeckRef.current],
      aiDiscard: [...aiDiscardRef.current],
      abilityMeter,
      isAbilityReady,
      aiAbilityMeter,
      abilityDamageAccumulator,
      timer,
      playerTimeTank,
      timestamp: Date.now()
    };

    setBattleHistorySnapshots(prev => [snapshot, ...prev.slice(0, 5)]);
  }, [abilityMeter, isAbilityReady, aiAbilityMeter, abilityDamageAccumulator, timer, playerTimeTank]);

  const rewindBattleSnapshot = useCallback((turnsToRewind = 1) => {
    if (battleHistorySnapshots.length === 0) {
      triggerPopup("Nessun punto temporale salvato per il riavvolgimento!");
      return false;
    }

    const targetIdx = Math.min(turnsToRewind - 1, battleHistorySnapshots.length - 1);
    const snap = battleHistorySnapshots[targetIdx];
    if (!snap) return false;

    setPlayerHp(snap.playerHp);
    setAiHp(snap.aiHp);
    setPlayerHand(snap.playerHand);
    setPlayerDeck(snap.playerDeck);
    setPlayerDiscard(snap.playerDiscard);
    setAiHand(snap.aiHand);
    setAiDeck(snap.aiDeck);
    setAiDiscard(snap.aiDiscard);
    setAbilityMeter(snap.abilityMeter || 0);
    setIsAbilityReady(Boolean(snap.isAbilityReady));
    setAiAbilityMeter(snap.aiAbilityMeter || 0);
    setAbilityDamageAccumulator(snap.abilityDamageAccumulator || 0);
    setTimer(snap.timer);
    setPlayerTimeTank(snap.playerTimeTank);

    setBattleHistorySnapshots(prev => prev.slice(targetIdx + 1));
    return true;
  }, [battleHistorySnapshots, triggerPopup]);

  // =========================================================================
  // GESTORE ATTIVAZIONE DEI 10 OGGETTI EPICI (0 COSTO, MONOUSO PER MATCH)
  // =========================================================================
  const handleActivateEpicItem = (itemId) => {
    if (turn !== 'player1') {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Puoi usare gli Oggetti Epici solo durante il tuo turno!");
      return;
    }
    if (hasUsedEpicItemThisTurn) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Puoi usare massimo 1 Oggetto Epico per turno!");
      return;
    }
    if (usedEpicItemsInMatch[itemId]) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Questo Oggetto Epico Ã¨ giÃ  stato usato per questa partita!");
      return;
    }

    const itemData = epicItemsInventory[itemId] || { level: 1 };
    const curLevel = itemData.level || 1;

    // 1. ANELLO BIFASICO DI MÃ–BIUS
    if (itemId === 'epic_item_1') {
      const maxSwaps = curLevel === 1 ? 2 : 3;
      setMobiusMaxSwaps(maxSwaps);
      setShowMobiusModal(true);
      return;
    }

    // 2. FORCELLA A RISOLUZIONE NEUTONICA
    if (itemId === 'epic_item_2') {
      const maxFuse = curLevel === 1 ? 2 : (curLevel === 2 ? 3 : 4);
      setNeutonicMaxFuse(maxFuse);
      setShowNeutonicModal(true);
      return;
    }

    // 3. ASTROLABIO A COORDINATE LIBERE
    if (itemId === 'epic_item_3') {
      const maxTargets = curLevel === 1 ? 1 : (curLevel === 2 ? 2 : 3);
      setRewriteMaxTargets(maxTargets);
      setShowRewriteModal(true);
      return;
    }

    try { playSound('epic_item_trigger'); } catch (_) {}
    setUsedEpicItemsInMatch(prev => ({ ...prev, [itemId]: true }));
    setHasUsedEpicItemThisTurn(true);

    // 4. STELE D'OMBRA ASSOLUTA
    if (itemId === 'epic_item_4') {
      const turns = curLevel === 1 ? 2 : (curLevel === 2 ? 4 : 999);
      setEnemyPassiveSilencedTurns(turns);
      triggerFloatingText(`SILENZIO PASSIVA (${turns} T)`, '#38bdf8', 'top-right');
      triggerPopup(`Stele d'Ombra Assoluta: Passiva nemica bloccata per ${turns === 999 ? 'tutta la partita' : `${turns} turni`}!`);
    }
    // 5. PISTONE A IMPULSO GRAVIMETRICO
    else if (itemId === 'epic_item_5') {
      const dmg = curLevel === 1 ? 20 : (curLevel === 2 ? 25 : 30);
      setPistonOverrideDamage(dmg);
      setPistonOverrideActive(true);
      triggerFloatingText(`PROSSIMO COLPO ${dmg} HP`, '#ef4444', 'bottom-left');
      triggerPopup(`Pistone Gravimetrico: il tuo prossimo attacco infliggerÃ  ${dmg} HP fissi!`);
    }
    // 6. PENDOLO A INVERSIONE D'ENTROPIA
    else if (itemId === 'epic_item_6') {
      const turnsBack = curLevel;
      const success = rewindBattleSnapshot(turnsBack);
      if (success) {
        triggerFloatingText(`RIAVVOLGI -${turnsBack} T`, '#c084fc', 'bottom-left');
        triggerPopup(`Pendolo Entropico: partita riavvolta di ${turnsBack} turno/i!`);
      }
    }
    // 7. MONOLITE A SPECCHI DIELETTRICI
    else if (itemId === 'epic_item_7') {
      const mult = curLevel === 1 ? 1.0 : (curLevel === 2 ? 1.5 : 2.0);
      setMirrorShieldMultiplier(mult);
      setMirrorShieldActive(true);
      triggerFloatingText(`BARRIERA x${mult}`, '#14b8a6', 'bottom-left');
      triggerPopup(`Monolite Dielettrico: barriera attiva! Il prossimo attacco nemico sarÃ  annullato e riflesso x${mult}!`);
    }
    // 8. CALICE DI DRENAGGIO A VORTICE
    else if (itemId === 'epic_item_8') {
      setAiAbilityMeter(0);
      setAbilityMeter(12);
      setIsAbilityReady(true);
      triggerFloatingText(`MODULO AL 100%`, '#d946ef', 'bottom-left');
      triggerPopup(`Calice di Drenaggio: modulo nemico azzerato! Il tuo modulo Ã¨ carico al 100%!`);
    }
    // 9. MATRICE POLIEDRICA DI PROBABILITÃ€
    else if (itemId === 'epic_item_9') {
      const rollCount = curLevel === 1 ? 3 : (curLevel === 2 ? 4 : 5);
      triggerFloatingText(`LANCIO DADI (${rollCount}X)`, '#84cc16', 'bottom-left');
      triggerPopup(`Matrice di ProbabilitÃ : raffica di ${rollCount} lanci Dadi in corso!`);
      
      let rollsDone = 0;
      const diceInterval = setInterval(() => {
        rollsDone++;
        const valX = Math.floor(Math.random() * 6) + 1;
        const face = QUANTUM_DICE_B_FACES[Math.floor(Math.random() * 6)];
        const summary = resolveQuantumDiceEffect(true, valX, face);
        triggerPopup(`[LANCIO ${rollsDone}/${rollCount}]\n${summary}`);

        if (rollsDone >= rollCount) {
          clearInterval(diceInterval);
        }
      }, 750);
    }
    // 10. NUCLEO A SINGOLARITÃ€ COMPRESSA
    else if (itemId === 'epic_item_10') {
      const duration = curLevel === 1 ? 60 : (curLevel === 2 ? 75 : 90);
      setIsEclipseStormActive(true);
      setTimer(duration);
      triggerFloatingText(`TEMPESTA ${duration}s`, '#facc15', 'bottom-left');
      triggerPopup(`Tempesta dell'Eclissi ATTIVATA: finestra di raffica continua per ${duration} secondi!`);
    }
  };

  const onScoreSuccessRef = useRef();
  const declareWinnerRef = useRef();
  const activeAdventureRef = useRef(activeAdventure);
  const tierConfigRef = useRef(tierConfig);
    const availableReviveLivesRef = useRef(availableReviveLives);
  const maxPlayerHpRef = useRef(maxPlayerHp);
  const maxAiHpRef = useRef(maxAiHp);
  const bossPhaseRef = useRef(bossPhase);
  const maxBossPhasesRef = useRef(maxBossPhases);
  const isTrisModeRef = useRef(isTrisMode);
  const isVectorModeRef = useRef(isVectorMode);

  useEffect(() => { availableReviveLivesRef.current = availableReviveLives; }, [availableReviveLives]);
  useEffect(() => { maxPlayerHpRef.current = maxPlayerHp; }, [maxPlayerHp]);
  useEffect(() => { maxAiHpRef.current = maxAiHp; }, [maxAiHp]);
  useEffect(() => { bossPhaseRef.current = bossPhase; }, [bossPhase]);

  useEffect(() => { maxBossPhasesRef.current = maxBossPhases; }, [maxBossPhases]);
      useEffect(() => { isTrisModeRef.current = isTrisMode; }, [isTrisMode]);
  useEffect(() => { isVectorModeRef.current = isVectorMode; }, [isVectorMode]);


  useEffect(() => {
    playBGM(isPvP ? 'pvp' : (isAdv && currentAdvLevel === 10 ? 'boss' : 'battle'));
  }, [isPvP, isAdv, currentAdvLevel]);

                 // TRIGGER AUTOMATICO TUTORIAL CONTESTUALI DI SETTORE E MODALITÀ
  useEffect(() => {
        if (isVectorMode) {
      // Disattivato pop-up testuale: la modalità usa la scritta cinematografica pura e la guida interattiva in plancia
      return;
    }

        if (isDoubleStageMode) {
      // Disattivato pop-up testuale: la modalità usa la scritta cinematografica pura e la guida interattiva in plancia
      return;
    }

    if (isTrisMode) {
      // Disattivato pop-up a scatola: la modalità usa la scritta cinematografica pura e la guida in plancia
      return;
    }

        // Settori specifici della Campagna: eliminati tutti i pop-up testuali bloccanti
    // Ogni novità viene appresa direttamente sulla plancia tramite la guida cinetica attiva
    if (isAdv) {
      return;
    }
  }, [isAdv, isVectorMode, isDoubleStageMode, isTrisMode]);




  const declareWinner = useCallback((winnerName) => {
    clearAllActiveTimeouts();
    clearAiTurnTimeouts();
        setWinner(winnerName);
    const isDraw = winnerName === 'DRAW_GAME' || String(winnerName).toLowerCase().includes('parit');
    const isPlayerWin = !isDraw && (winnerName === nickname || winnerName === 'Giocatore 1');


    let starsEarned = [false, false, false];
    let challengeData = null;

    if (isPlayerWin && isAdv) {
      const elapsed = Math.max(1, Math.floor((Date.now() - matchStartTimeRef.current) / 1000));
      const finalHpRatio = playerHpRef.current / (maxPlayerHpRef.current || 50);
      const star1 = true;
      const star2 = finalHpRatio >= 0.50;
      const challenge = typeof getSectorSpecialChallenge === 'function' 
        ? getSectorSpecialChallenge(currentAdvPlanet, currentAdvLevel) 
        : { desc: 'Completamento', check: () => true };
      
      const statsObj = {
        totalTimeElapsed: elapsed,
        finalHp: playerHpRef.current,
        maxHp: maxPlayerHpRef.current || 50,
        exchangesUsed: matchStatsRef.current?.exchangesUsed || 0,
        opCounts: matchStatsRef.current?.opCounts || {},
        maxSingleHitDmg: matchStatsRef.current?.maxSingleHitDmg || 0,
        goldenOrComboCount: matchStatsRef.current?.goldenOrComboCount || 0,
        moduleActivations: matchStatsRef.current?.moduleActivations || 0
      };

      const star3 = Boolean(challenge.check(statsObj));
      starsEarned = [star1, star2, star3];
      challengeData = { challenge, stats: statsObj, starsEarned };
      setAdventureStarsResult({ challenge, stats: statsObj, stars: starsEarned });

      // Animazione sequenziale di accensione stelle
      setTimeout(() => { setStarsAnimStep(1); try { playSound('dopamine_tick'); } catch (_) {} }, 400);
      setTimeout(() => { if (star2) { setStarsAnimStep(2); try { playSound('dopamine_tick'); } catch (_) {} } }, 850);
      setTimeout(() => { if (star3) { setStarsAnimStep(3); try { playSound('relic_claim'); } catch (_) {} } }, 1300);
    }

    
    if (isPlayerWin) {
      let rewardMult = 1.0;
      playerTraits.forEach(t => {
        if (t.type === 'victory_reward_mult') rewardMult = Math.max(rewardMult, t.mult || 1.5);
      });

     if (isPvP) {
        const isEliteChannel = pvpChannel === 'elite';
        let pvpStars = [false, false, false];
        let pvpTrophiesEarned = 0;
        let pvpBonusDiamonds = 0;

        if (isEliteChannel) {
          // 1ª Stella: Vittoria
          const star1 = true;
          // 2ª Stella: HP >= 50%
          const star2 = (playerHpRef.current / (maxPlayerHpRef.current || 50)) >= 0.50;
          // 3ª Stella: Obiettivo Tattico
          let star3 = false;
          if (currentSectorMode === 'classic') {
            star3 = Boolean((matchStatsRef.current?.opCounts?.['/'] || 0) > 0 || (matchStatsRef.current?.goldenOrComboCount || 0) > 0);
          } else if (currentSectorMode === 'vector') {
            star3 = Boolean(matchStatsRef.current?.vectorMax2CardsHit);
          } else if (currentSectorMode === 'double_stage') {
            star3 = Boolean(matchStatsRef.current?.duelPrecisionHit);
          } else if (currentSectorMode === 'tris') {
            star3 = Boolean(matchStatsRef.current?.trisPokerComboHit);
          }

          pvpStars = [star1, star2, star3];
          const starCount = pvpStars.filter(Boolean).length;
          const rewardConfig = PVP_ELITE_STAR_REWARDS[starCount] || PVP_ELITE_STAR_REWARDS[1];
          pvpTrophiesEarned = rewardConfig.trophies;
          pvpBonusDiamonds = rewardConfig.diamonds || 0;
        }

        setWonBattleRewards({
          stardust: Math.round((isEliteChannel ? (PVP_WIN_STARDUST * 1.5) : PVP_WIN_STARDUST) * rewardMult),
          xp: isEliteChannel ? (PVP_WIN_XP * 1.5) : PVP_WIN_XP,
          credits: Math.round((isEliteChannel ? 0 : PVP_WIN_CREDITS) * rewardMult),
          diamonds: pvpBonusDiamonds,
          trophies: pvpTrophiesEarned,
          voidCrystals: hasStabilizedRift1 ? 1 : 0,
          primordialMatter: (hasStabilizedRift1 && isEliteChannel) ? 1 : 0,
          pvpStars
        });
      } else if (isAdv && activeAdventure) {
        const pNum = activeAdventure.planet || 1;
        const lNum = activeAdventure.level || 1;
        const isBoss = lNum === 10;
        const baseRew = getLevelReward(pNum, lNum, false);
        setWonBattleRewards({
          stardust: Math.round(baseRew.stardust * rewardMult),
          xp: baseRew.xp,
          credits: Math.round(baseRew.credits * rewardMult || 0),
          diamonds: baseRew.diamonds,
          trophies: 0,
          voidCrystals: 0,
          primordialMatter: 0,
          relic: isBoss ? PLANET_BOSS_RELICS[pNum] : null
        });
            } else if (gameMode === 'pve' && tierConfig) {
        const wonAmt = (customBetAmount || tierConfig.minBet) * 2;
        setWonBattleRewards({
          stardust: tierConfig.resource === 'stardust' ? wonAmt : 0,
          xp: tierConfig.xp || 60,
          credits: tierConfig.costCredits,
          diamonds: tierConfig.resource === 'diamonds' ? wonAmt : 0,
          trophies: 0,
          voidCrystals: tierConfig.resource === 'voidCrystals' ? wonAmt : 0,
          primordialMatter: tierConfig.resource === 'primordialMatter' ? wonAmt : 0
        });
      }

    }

    try {
      if (isDraw) {
        playSound('click');
        playBGM('menu');
      } else {
        playSound(isPlayerWin ? 'win' : 'lose');
        playBGM(isPlayerWin ? 'win' : 'lose');
      }
    } catch (_) {}

    if (isRealPvP && db && pvpMeta?.roomId) {
      update(ref(db, `rooms/${pvpMeta.roomId}`), {
        status: 'finished',
        winner: winnerName
      });
    }

            if (typeof onGameEnd === 'function') {
      const isEliteChannel = pvpChannel === 'elite';
      const starCount = isEliteChannel && isPlayerWin 
        ? [
            true, 
            (playerHpRef.current / (maxPlayerHpRef.current || 50)) >= 0.50,
            currentSectorMode === 'classic' 
              ? ((matchStatsRef.current?.opCounts?.['/'] || 0) > 0 || (matchStatsRef.current?.goldenOrComboCount || 0) > 0)
              : currentSectorMode === 'vector' 
              ? Boolean(matchStatsRef.current?.vectorMax2CardsHit)
              : currentSectorMode === 'double_stage'
              ? Boolean(matchStatsRef.current?.duelPrecisionHit)
              : Boolean(matchStatsRef.current?.trisPokerComboHit)
          ].filter(Boolean).length
        : 1;

      const pvpRewardConfig = isEliteChannel ? (PVP_ELITE_STAR_REWARDS[starCount] || PVP_ELITE_STAR_REWARDS[1]) : null;

      // Telemetria di fine match calcolata in ms e turni reali
      const totalElapsedMs = Math.max(1000, Date.now() - matchStartTimeRef.current);
      const remainingHpRatio = Math.max(0, playerHpRef.current / (maxPlayerHpRef.current || 50));

      onGameEnd(winnerName, { 
        usedRevive: hasUsedRevive, 
        isDraw, 
        isPvP, 
        pvpMeta, 
        pvpChannel,
        starsEarned,
        adventureChallenge: challengeData,
        pvpTrophiesAwarded: pvpRewardConfig ? pvpRewardConfig.trophies : 0,
        pvpBonusDiamonds: pvpRewardConfig ? (pvpRewardConfig.diamonds || 0) : 0,
                turnsElapsed: Math.max(1, playerTurnsCountRef.current),
        activeTimeElapsedMs: totalElapsedMs,
        remainingHpPct: Math.round(remainingHpRatio * 100) / 100,
        matchStats: matchStatsRef.current
      });
    }



  }, [nickname, onGameEnd, hasUsedRevive, isPvP, isRealPvP, pvpMeta, pvpChannel, isAdv, currentAdvPlanet, currentAdvLevel, activeAdventure, gameMode, tierConfig, bettingTier, hasStabilizedRift1, playerTraits, clearAllActiveTimeouts, clearAiTurnTimeouts]);


  const broadcastLiveSelection = (indices) => {
    if (!isRealPvP || !db || !pvpMeta?.roomId) return;
    update(ref(db, `rooms/${pvpMeta.roomId}/liveInput`), {
      by: pvpMeta.myPlayerId,
      selectedIndices: indices,
      updatedAt: Date.now()
    });
  };

  // --------------------------------------------------------------------------
  // SINCRONIZZAZIONE REAL-TIME FIREBASE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isRealPvP || !db || !pvpMeta?.roomId) return;

    const roomRef = ref(db, `rooms/${pvpMeta.roomId}`);
    const disconnectHandler = onDisconnect(roomRef);

    disconnectHandler.update({
      status: 'abandoned',
      abandonedBy: pvpMeta.myPlayerId
    });

    const unsubscribe = onValue(roomRef, (snapshot) => {

      const data = snapshot.val();
      if (!data) return;

            if (data.status === 'abandoned') {
        if (data.abandonedBy !== pvpMeta.myPlayerId) {
          triggerPopup("L'avversario ha abbandonato! Vittoria a tavolino!");
          declareWinner(nickname);
        }
        return;
      }

      if (data.status === 'finished' && data.winner && !winner) {
        declareWinner(data.winner);
        return;
      }

      const isHost = pvpMeta.isHost;

      const myData = isHost ? data.p1 : data.p2;
      const oppData = isHost ? data.p2 : data.p1;

      if (myData && oppData) {
        setPlayerHp(myData.hp);
        setAiHp(oppData.hp);
        setMaxAiHp(oppData.maxHp || 50);

        setAiBattleEther(oppData.ether || 0);
        setAiMalusGauge(oppData.malus || 0);
        setAiDeckCount(oppData.deckCount !== undefined ? oppData.deckCount : 47);
        setAiDiscardTop(oppData.discardTop || null);
        setAiDiscardCount(oppData.discardCount || 0);

        if (data.liveInput && data.liveInput.by !== pvpMeta.myPlayerId) {
          const remoteSelected = data.liveInput.selectedIndices || [];
          const updatedCardStates = Array(7).fill('');
          remoteSelected.forEach(idx => {
            if (idx < 7) updatedCardStates[idx] = 'ai-card-selected';
          });
          setAiCardStates(updatedCardStates);
          if (remoteSelected.length > 0) {
            try { playSound('select'); } catch (_) {}
          }
        }

             if (isDoubleStageMode) {
          const cs = data.convergenceState || data.duelState;
          if (cs) {
            if (cs.baseCard) setConvergenceBaseCard(cs.baseCard);
            if (cs.target) setConvergenceTarget(cs.target);
            setConvergenceTurn(cs.turn || cs.stage || 1);
            setConvergenceSubStep(cs.subStep || cs.step || 1);
            if (isHost) {
              setConvergencePlayerT1Val(cs.p1T1 || cs.p1Val || 0);
              setConvergenceAiT1Val(cs.p2T1 || cs.p2Val || 0);
            } else {
              setConvergencePlayerT1Val(cs.p2T1 || cs.p2Val || 0);
              setConvergenceAiT1Val(cs.p1T1 || cs.p1Val || 0);
            }
          }
        }


               if (isTrisMode && data.trisState) {
          const ts = data.trisState;
          setTrisObjectives({
            tableCard: ts.tableCard || createRandomCard(false),
            op1: ts.op1 || '+',
            op2: ts.op2 || '*',
            target: ts.target || 24,
            targets: ts.targets || null
          });
        }


        const isMyTurn = data.turn === pvpMeta.myPlayerId;
        const nextTurn = isMyTurn ? 'player1' : 'ai';
        if (nextTurn !== turn) {
          setTurn(nextTurn);
          triggerTurnBanner(isMyTurn);
        }

        if (data.lastAction && data.lastAction.by !== pvpMeta.myPlayerId) {
          triggerPopup(`L'avversario ha attaccato:\n${data.lastAction.desc}`);
          triggerPlayerDamageFx();
        }

        if (myData.hp <= 0 && !winner) {
          declareWinner(pvpMeta.opponent?.nickname || 'Avversario');
        } else if (oppData.hp <= 0 && !winner) {
          declareWinner(nickname);
        }
      }
    });

          return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      if (disconnectHandler && typeof disconnectHandler.cancel === 'function') {
        try { disconnectHandler.cancel(); } catch (_) {}
      }
    };
  }, [isRealPvP, pvpMeta, nickname, winner, isDoubleStageMode, isTrisMode, turn, declareWinner, triggerPopup, triggerTurnBanner]);



    const sendPvPAction = (damageDealt, formulaDesc) => {
    if (!isRealPvP || !db || !pvpMeta?.roomId) return;
    const roomRef = ref(db, `rooms/${pvpMeta.roomId}`);
    const isHost = pvpMeta.isHost;
    const oppKey = isHost ? 'p2/hp' : 'p1/hp';
    const myMalusKey = isHost ? 'p1/malus' : 'p2/malus';
    const myEtherKey = isHost ? 'p1/ether' : 'p2/ether';
    const myDeckCountKey = isHost ? 'p1/deckCount' : 'p2/deckCount';
    const myDiscardTopKey = isHost ? 'p1/discardTop' : 'p2/discardTop';
    const myDiscardCountKey = isHost ? 'p1/discardCount' : 'p2/discardCount';

       const lastDiscarded = playerDiscard.length > 0 ? playerDiscard[playerDiscard.length - 1] : null;
    const topDisc = lastDiscarded ? {
      displayVal: String(lastDiscarded.displayVal || lastDiscarded.value || ''),
      value: Number(lastDiscarded.value) || 0,
      color: String(lastDiscarded.color || '#00f2fe'),
      symbol: String(lastDiscarded.symbol || '♥')
    } : {
      displayVal: '',
      value: 0,
      color: '#94a3b8',
      symbol: ''
    };


    const payload = {
      [oppKey]: Math.max(0, aiHp - damageDealt),
      [myMalusKey]: playerMalusGauge || 0,
      [myEtherKey]: battleEther || 0,
      [myDeckCountKey]: playerDeck.length || 0,
      [myDiscardTopKey]: topDisc,
      [myDiscardCountKey]: playerDiscard.length || 0,
      turn: pvpMeta?.opponent?.id || 'opponent',
      liveInput: null,
      lastAction: {
        by: pvpMeta.myPlayerId,
        desc: `${formulaDesc} (-${damageDealt} HP)`,
        timestamp: Date.now()
      }
    };

    update(roomRef, payload).catch(err => console.warn("Sync Firebase:", err));
  };

    const checkDeckOutCondition = useCallback((pHand, pDeck, pDiscard, aHand, aDeck, aDiscard) => {
    const pReserve = (pDeck?.length || 0) + (pDiscard?.length || 0);
    const aReserve = (aDeck?.length || 0) + (aDiscard?.length || 0);

    const pHandCount = pHand?.length || 0;
    const aHandCount = aHand?.length || 0;

    // Il match termina se ALMENO UNO dei due contendenti ha esaurito mazzo e scarti ed Ã¨ a 5 o meno carte
    const playerDepleted = pReserve === 0 && pHandCount <= 5;
    const aiDepleted = aReserve === 0 && aHandCount <= 5;

    if (playerDepleted || aiDepleted) {
      const curPlayerHp = playerHpRef.current;
      const curAiHp = aiHpRef.current;
      const depletedName = playerDepleted ? nickname : (isPvP ? (pvpMeta?.opponent?.nickname || 'Avversario') : 'Avversario');

      if (curPlayerHp > curAiHp) {
        triggerPopup(`FINE CARTE (${depletedName} a ${playerDepleted ? pHandCount : aHandCount} carte)!\nHai più HP (${curPlayerHp} vs ${curAiHp}): Vittoria ai punti!`);
        declareWinner(nickname);
      } else if (curAiHp > curPlayerHp) {
        triggerPopup(`FINE CARTE (${depletedName} a ${playerDepleted ? pHandCount : aHandCount} carte)!\nL'avversario ha più HP (${curAiHp} vs ${curPlayerHp}): Sconfitta.`);
        declareWinner(isPvP ? (pvpMeta?.opponent?.nickname || 'Avversario') : 'Avversario');
      } else {
        triggerPopup(`FINE CARTE (${depletedName} a ${playerDepleted ? pHandCount : aHandCount} carte)!\nStessi HP (${curPlayerHp}): Pareggio!`);
        declareWinner('DRAW_GAME');
      }

      return true;
    }

    return false;
  }, [declareWinner, nickname, triggerPopup, isPvP, pvpMeta]);


        // TIMER AVVERSARIO CON CONSUMO SERBATOIO E TIMEOUT REALE (IN PAUSA DURANTE IL CAMBIO CARTE)
  useEffect(() => {
    if (winner || showReviveModal || turn !== 'ai' || activeDiscoveryTutorial || isExchangeMode) return;

    const interval = setInterval(() => {

      setAiTimer((prev) => {
        if (prev > 1) return prev - 1;

        if (aiTimeTankRef.current > 0) {
          setAiTimeTank(t => Math.max(0, t - 1));
          return 0;
        }

                // L'avversario ha esaurito timer e serbatoio: subisce timeout
        setTimeout(() => {
          if (turn === 'ai' && !winner) {
            triggerAiDamageFx();
            triggerFloatingText(`-5 HP (TIMEOUT NEMICO)`, '#ef4444', 'top-right');
            setAiHp(hp => Math.max(0, hp - 5));
            clearAiTurnTimeouts();

            // Ripristino mano IA prima di cedere il turno
            const refilledAiOnTimeout = refillHandToTargetSize(aiHandRef.current, aiDeckRef.current, aiDiscardRef.current, 7);
            aiHandRef.current = refilledAiOnTimeout.newHand;
            aiDeckRef.current = refilledAiOnTimeout.newDeck;
            aiDiscardRef.current = refilledAiOnTimeout.newDiscard;
            setAiHand(refilledAiOnTimeout.newHand);
            setAiDeck(refilledAiOnTimeout.newDeck);
            setAiDiscard(refilledAiOnTimeout.newDiscard);

            setAiActionMessage("Tempo nemico esaurito (-5 HP). Turno ceduto.");
            setTimeout(() => {
              setAiActionMessage("");
              setTurn('player1');
            }, 800);
          }
        }, 0);


        return 0;
      });
    }, 1000);

        return () => clearInterval(interval);
  }, [turn, winner, showReviveModal, activeDiscoveryTutorial, isExchangeMode, clearAiTurnTimeouts]);



  const handleRevive = () => {
    if (availableReviveLives <= 0 || isPvP) return;
    try { playSound('biotherapy'); } catch (_) {}
    if (typeof setLives === 'function') setLives(l => l - 1);
    setHasUsedRevive(true);
    const restoredHp = Math.max(25, Math.floor((maxPlayerHp || 50) * 0.5));
    setPlayerHp(restoredHp);
    setShowReviveModal(false);
    setTimer(getBaseTime());
    setIsOvertimeActive(false);
    setTurn('player1');
    triggerTurnBanner(true);
    triggerPopup(`Rianimazione completata! Vita ripristinata al 50% (${restoredHp} HP).`);
  };

      // Encelado: Rianimazione autonoma + Congelamento nemico + Esplosione di Plasma Puro
  const checkEnceladoRevive = () => {
    const autoReviveTrait = playerTraits.find(t => t.type === 'auto_revive_free' || t.type === 'auto_revive_free_pct');
    if (!autoReviveTrait || enceladoAutoReviveUsed) return null;
    setEnceladoAutoReviveUsed(true);
    const restored = autoReviveTrait.hp || Math.round((maxPlayerHp || 50) * (autoReviveTrait.hpPct || 0.25));

    const freezeTrait = playerTraits.find(t => t.type === 'revive_freeze_enemy');
    if (freezeTrait) {
      const freezeSec = freezeTrait.freezeSeconds || 10;
      setAiTimer(t => Math.max(5, t - freezeSec));
      setAiTimeTank(t => Math.max(0, t - freezeSec));
      triggerFloatingText(`ZERO ASSOLUTO (-${freezeSec}s Nemico)`, '#00f2fe', 'top-right');
    }

    let blastDmg = 0;
    const blastTrait = playerTraits.find(t => t.type === 'revive_blast_damage');
    if (blastTrait) {
      blastDmg = blastTrait.damage || 15;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - blastDmg));
      triggerFloatingText(`ESPLOSIONE PLASMA -${blastDmg} HP`, '#facc15', 'top-right');
    }

    try { playSound('biotherapy'); } catch (_) {}
    triggerFloatingText(`+${restored} HP (RIANIMAZIONE)`, '#00f2fe', 'bottom-left');
    triggerPopup(`Encelado (Sovrano del Vuoto): Rinascita con ${restored} HP!${blastDmg > 0 ? `\nScarica di Plasma al nemico: -${blastDmg} HP!` : ''}`);
    return restored;
  };


  const [koBanner, setKoBanner] = useState(null);

    // Gestione centralizzata e pura della sconfitta o rianimazione con banner stimolante
  useEffect(() => {
    if (playerHp > 0 || winner || koBanner || showReviveModal) return;

    const revivedHp = checkEnceladoRevive();
    if (revivedHp !== null) {
      setPlayerHp(revivedHp);
      return;
    }


    const maxAiHpVal = maxAiHp || 50;
    const enemyHpRatio = aiHp / maxAiHpVal;

    let bannerData = {
      title: "PECCATO!",
      subtitle: "Ti ha preso alla sprovvista. Concentrati e rifatti subito!",
      color: "#ef4444"
    };

    if (enemyHpRatio < 0.30) {
      bannerData = {
        title: "C'È MANCATO UN SOFFIO!",
        subtitle: "Gli mancava un colpo solo. Rigioca subito e finiscilo!",
        color: "#f97316"
      };
    }

    setKoBanner(bannerData);
    setShakeScreen(true);
    try { playSound('lose'); } catch (_) {}

    setTimeout(() => {
      setShakeScreen(false);
    }, 450);

          setTimeout(() => {
      setKoBanner(null);
      if (!isPvP && availableReviveLivesRef.current > 0) {
        setShowReviveModal(true);
      } else {
        declareWinner(isPvP ? (pvpMeta?.opponent?.nickname || 'Avversario') : 'Avversario');
      }
    }, 1800);
  }, [playerHp, winner, koBanner, showReviveModal, isPvP, declareWinner, aiHp, maxAiHp, pvpMeta]);



  // Gestione della vittoria con banner graduato a 3 livelli
  useEffect(() => {
    if (aiHp > 0 || winner || koBanner) return;

    const hasMorePhases = advanceBossPhase();
    if (!hasMorePhases) {
      const maxHpVal = maxPlayerHp || 50;
      const hpRatio = playerHp / maxHpVal;

      let bannerData = {
        title: "PER IL ROTTO DELLA CUFFIA!",
        subtitle: "Hai rischiato grosso, ma l'hai portata a casa.",
        color: "#f59e0b"
      };

      if (hpRatio >= 0.80) {
        bannerData = {
          title: "VITTORIA PERFETTA!",
          subtitle: "Non ti ha nemmeno sfiorato. Mostruoso!",
          color: "#facc15"
        };
      } else if (hpRatio >= 0.40) {
        bannerData = {
          title: "BELLA VITTORIA!",
          subtitle: "Partita gestita benissimo. Avanti così!",
          color: "#00f2fe"
        };
      }

      setKoBanner(bannerData);
      setShakeScreen(true);
      try { playSound('win'); } catch (_) {}

      setTimeout(() => {
        setShakeScreen(false);
      }, 450);

      setTimeout(() => {
        setKoBanner(null);
        declareWinner(nickname);
      }, 1800);
    }
  }, [aiHp, winner, koBanner, advanceBossPhase, declareWinner, nickname, playerHp, maxPlayerHp]);


  const triggerPlayerDamageFx = () => {

    try { playSound('plasma_damage'); } catch (_) {}
    setPlayerFx('anim-damage');
    setPlayerHpFlash(true);
    safeSetTimeout(() => {
      setPlayerFx('');
      setPlayerHpFlash(false);
    }, 500);
  };

  const triggerPlayerHealFx = () => {
    try { playSound('biotherapy'); } catch (_) {}
    setPlayerFx('anim-heal');
    safeSetTimeout(() => setPlayerFx(''), 500);
  };

  const triggerAiDamageFx = () => {
    try { playSound('plasma_damage'); } catch (_) {}
    setAiFx('anim-damage');
    setAiHpFlash(true);
    safeSetTimeout(() => {
      setAiFx('');
      setAiHpFlash(false);
    }, 500);
  };

   const refillHandToTargetSize = (currentHand, currentDeck, currentDiscard, targetSize = 7) => {
    let d = [...currentDeck], disc = [...currentDiscard], h = currentHand.filter(Boolean);
    while (h.length < targetSize) {
      if (d.length === 0) {
        if (disc.length === 0) break;
        d = shuffleArray(disc.filter(Boolean));
        disc = [];
      }
      if (d.length === 0) break;
      const nextCard = d.pop();
      if (nextCard) h.push(nextCard);
    }
    return { newHand: h, newDeck: d, newDiscard: disc };
  };

      // Risoluzione dei benefici del colpo su nemico scoperto
  const applyRiftBenefit = useCallback((benefit) => {
    if (!benefit) return { bonusDamage: 0, critMultiplier: 1.0, extraDraw: 0 };
    try { playSound('epic_item_trigger'); } catch (_) {}
    triggerFloatingText(`COLPO RIUSCITO: ${benefit.name.toUpperCase()}!`, benefit.color, 'bottom-left');
    triggerPopup(`⚡ OCCASIONE SFRUTTATA!\n${benefit.name}: ${benefit.desc}`);

    let bonusDamage = 0;
    let critMultiplier = 1.0;
    let extraDraw = 0;

    switch (benefit.id) {
      case 'pure_damage_20':
        bonusDamage = 20;
        break;
      case 'crit_2_5':
        critMultiplier = 2.5;
        break;
      case 'draw_3_cards':
        extraDraw = 3;
        break;
      case 'gravity_collapse_20':
        bonusDamage = Math.max(10, Math.round(aiHpRef.current * 0.20));
        break;
      case 'burn_dot_8':
        setBurnRoundsRemaining(prev => prev + 3);
        break;
      case 'super_heal_25': {
        const healAmt = Math.round((maxPlayerHp || 50) * 0.25);
        triggerPlayerHealFx();
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
        break;
      }
      case 'siphon_blood_15':
        bonusDamage = 15;
        triggerPlayerHealFx();
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 15));
        break;
      case 'barrier_shield_20':
        setMirrorShieldActive(true);
        setMirrorShieldMultiplier(1.0);
        break;
      case 'stun_boss_turn':
        setEnemySkipNextTurn(true);
        triggerFloatingText("BOSS STORDITO (SALTA TURNO)", '#06b6d4', 'top-right');
        break;
      case 'malus_inversion_3':
        setPlayerMalusGauge(g => Math.max(0, g - 3));
        setAiMalusGauge(g => Math.min(malusMaxTicks, g + 3));
        break;
      case 'tachyon_drain':
        setAiTimeTank(0);
        setAiTimer(10);
        break;
      case 'module_reset_enemy':
        setAiAbilityMeter(0);
        setAiNotches({ '+': false, '-': false, '*': false, '/': false });
        break;
      case 'module_charge_100':
        setAbilityMeter(12);
        setIsAbilityReady(true);
        break;
      case 'dice_charge_all':
        setPlayerNotches({ '+': true, '-': true, '*': true, '/': true });
        setPlayerDiceReady(true);
        break;
      case 'time_tank_max':
        setPlayerTimeTank(TIME_TANK_MAX_CAP);
        break;
      case 'ether_catalysis_3':
        setBattleEther(e => Math.min(maxBattleEther, e + 3));
        if (typeof setEther === 'function') setEther(e => e + 3);
        break;
            case 'joker_synthesis':
        setPlayerHand(prevHand => {
          const h = [...prevHand];
          let minIdx = 0;
          h.forEach((c, idx) => {
            if (c && !c.isJoker && (Number(c.value) || 0) < (Number(h[minIdx]?.value) || 99)) minIdx = idx;
          });
          if (h[minIdx]) {
            h[minIdx] = {
              ...h[minIdx],
              value: 0,
              displayVal: '★',
              suit: 'joker',
              symbol: '★',
              color: '#e879f9',
              isJoker: true
            };
          }
          return h;
        });
        break;
      case 'golden_resonance':
        setPlayerHand(prevHand => {
          const h = [...prevHand];
          let count = 0;
          for (let i = 0; i < h.length && count < 2; i++) {
            if (h[i] && !h[i].isGolden) {
              h[i] = { ...h[i], isGolden: true };
              count++;
            }
          }
          return h;
        });
        setPlayerGoldenTurns(2);
        break;
      case 'diamond_vein':
        if (typeof setDiamonds === 'function') setDiamonds(d => d + 1);
        addStardustWithCap(50);
        break;
      default:
        break;

    }
    return { bonusDamage, critMultiplier, extraDraw };
  }, [maxPlayerHp, malusMaxTicks, maxBattleEther, playerTraits, addStardustWithCap, setEther, setDiamonds, triggerFloatingText, triggerPlayerHealFx, triggerPopup]);


    const checkAndTriggerTerrainCards = useCallback((condition, isPlayer = true, extraData = {}) => {
    if (!isTerrainAllowed) return false;
    // P16 Gliese 581g: blocco delle trappole a microgravit  a meno di sblocco temporaneo per parit /disparit 
    if (isAdv && isTerrainDisabledForBoss(currentAdvPlanet, currentAdvLevel, temporaryTerrainUnlocked)) {
      if (isPlayer) triggerFloatingText("MICROGRAVIT : BANCO BLOCCATO!", "#0ea5e9", "bottom-left");
      return false;
    }
    const currentSlots = isPlayer ? playerTerrainSlotsRef.current : aiTerrainSlotsRef.current;

    const setSlots = isPlayer ? setPlayerTerrainSlots : setAiTerrainSlots;

    let triggeredAny = false;

    const updatedSlots = currentSlots.map(slot => {
      if (!slot.card || slot.isTriggered || slot.isExhausted) return slot;

      if (slot.card.triggerCondition === condition) {
        triggeredAny = true;
        const lvl = slot.level || 1;
        const lvlData = slot.card.levels[lvl] || slot.card.levels[1];
        const effVal = lvlData.effectValue;

        try { playSound('terrain_flip'); } catch (_) {}
        try { playSound('terrain_trigger'); } catch (_) {}

                if (isPlayer) {
          // Feedback visivo immediato a schermo intero
          setActiveAbilityVfx('vfx-timewarp-overlay');
          setShakeScreen(true);
          safeSetTimeout(() => { setActiveAbilityVfx(''); setShakeScreen(false); }, 500);

          if (typeof triggerFloatingText === 'function') {
            triggerFloatingText(`🛡️ DIFESA ATTIVA: ${slot.card.name.toUpperCase()}!`, '#00f2fe', 'bottom-left');
          }
          if (typeof triggerPopup === 'function') {
            triggerPopup(`🛡️ BANCO TERRENO: ${slot.card.name.toUpperCase()}!\nLa tua trappola è scattata e ha congelato la minaccia!`);
          }
        } else {

          if (typeof triggerFloatingText === 'function') {
            triggerFloatingText(`TRAPPOLA NEMICA: ${slot.card.name.toUpperCase()}!`, slot.card.color, 'top-right');
          }
          if (typeof triggerPopup === 'function') {
            triggerPopup(`⚠️ L'avversario attiva dal Banco Terreno: ${slot.card.name}!\n${lvlData.desc}`);
          }
        }

        switch (slot.cardId) {
                    case 'cryo_stasis':
            if (bombStateRef.current) {
              const newTurns = bombStateRef.current.turnsRemaining + effVal;
              bombStateRef.current = { ...bombStateRef.current, turnsRemaining: newTurns };
              setBombState(prev => prev ? ({ ...prev, turnsRemaining: newTurns }) : null);
            }
            if (vectorBombCountdownRef.current !== undefined) {
              vectorBombCountdownRef.current += effVal;
              setVectorBombCountdown(prev => prev + effVal);
            }

            if (lvl === 3) {
              if (isPlayer) setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 15));
              else setAiHp(h => Math.min(maxAiHp || 50, h + 15));
            }
            break;

          case 'sub_zero_seal':
            if (bombStateRef.current) {
              setBombState(prev => prev ? ({ ...prev, target: Math.max(1, Math.round(prev.target * effVal)) }) : null);
            }
            if (vectorBombDataRef.current) {
              setVectorBombData(prev => prev ? ({ ...prev, target: Math.max(1, Math.round(prev.target * effVal)) }) : null);
            }
            break;

          case 'cryo_absorber':
            if (isPlayer) {
              if (typeof triggerPlayerHealFx === 'function') triggerPlayerHealFx();
              setPlayerHp(h => Math.min(maxPlayerHp || 50, h + effVal));
              if (lvl === 3) setAiMalusGauge(0);
            } else {
              setAiHp(h => Math.min(maxAiHp || 50, h + effVal));
              if (lvl === 3) setPlayerMalusGauge(0);
            }
            break;

          case 'frost_bite':
            if (isPlayer) {
              setAiTimeTank(t => Math.max(0, t - effVal));
              if (lvl === 3) {
                triggerAiDamageFx();
                setAiHp(h => Math.max(0, h - 10));
                triggerFloatingText(`GELO PURO -10 HP`, '#06b6d4', 'top-right');
              }
            } else {
              setPlayerTimeTank(t => Math.max(0, t - effVal));
              if (lvl === 3) {
                triggerPlayerDamageFx();
                setPlayerHp(h => Math.max(0, h - 10));
              }
            }
            break;

          case 'magnetic_valve':
            if (isPlayer) setPlayerMalusGauge(0);
            else setAiMalusGauge(0);
            if (lvl === 3 && isPlayer) {
              setAbilityMeter(12);
              setIsAbilityReady(true);
            }
            break;

          case 'charge_splitter': {
            const notches = isPlayer ? playerMalusGaugeRef.current : aiMalusGaugeRef.current;
            const absorbedHp = Math.min(extraData.incomingDamage || 10, notches * effVal);
            if (absorbedHp > 0) {
              if (isPlayer) {
                setPlayerHp(h => Math.min(maxPlayerHp || 50, h + absorbedHp));
                triggerFloatingText(`RIPARTITORE +${absorbedHp} HP`, '#facc15', 'bottom-left');
                if (lvl === 3) {
                  const refl = Math.round(absorbedHp * 0.5);
                  triggerAiDamageFx();
                  setAiHp(h => Math.max(0, h - refl));
                  triggerFloatingText(`RIFLESSO -${refl} HP`, '#facc15', 'top-right');
                }
              } else {
                setAiHp(h => Math.min(maxAiHp || 50, h + absorbedHp));
              }
            }
            break;
          }

          case 'gravimetric_anchor': {
            const incDmg = extraData.incomingDamage || 20;
            const mitigated = Math.round(incDmg * effVal);
            if (mitigated > 0) {
              if (isPlayer) {
                setPlayerHp(h => Math.min(maxPlayerHp || 50, h + mitigated));
                triggerFloatingText(`ANCORA GRAVIMETRICA +${mitigated} HP`, '#ea580c', 'bottom-left');
                if (lvl === 3) setAiTimeTank(0);
              } else {
                setAiHp(h => Math.min(maxAiHp || 50, h + mitigated));
                if (lvl === 3) setPlayerTimeTank(0);
              }
            }
            break;
          }

          case 'rebound_condenser': {
            if (isPlayer) {
              const reflDmg = lvl === 3 ? 15 : 10;
              triggerAiDamageFx();
              setAiHp(h => Math.max(0, h - reflDmg));
              triggerFloatingText(`RIMBALZO CONTRACCOLPO -${reflDmg} HP!`, '#d97706', 'top-right');
            }
            break;
          }

          case 'frequency_reserve':
            if (isPlayer) {
              setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + effVal));
              setTimer(effVal);
              if (lvl === 3) {
                const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
                const targetSize = (sizeTrait ? (sizeTrait.size || 8) : 7) + 2;
                const refilled = refillHandToTargetSize(playerHandRef.current, playerDeckRef.current, playerDiscardRef.current, targetSize);
                setPlayerHand(refilled.newHand);
                setPlayerDeck(refilled.newDeck);
                setPlayerDiscard(refilled.newDiscard);
              }
            } else {
              setAiTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + effVal));
              setAiTimer(effVal);
            }
            break;

          case 'tachyon_siphon':
            if (isPlayer) {
              const canUseEther = isPvP || gameMode === 'pve' || (isAdv && currentGlobalSectorNum >= (typeof ETHER_UNLOCK_SECTOR !== 'undefined' ? ETHER_UNLOCK_SECTOR : 15));
              const etherCap = typeof EXTRACTOR_LEVELS !== 'undefined' ? (EXTRACTOR_LEVELS[extractorLevel]?.battleCap || 2) : 2;
              if (canUseEther) {
                if (typeof setBattleEther === 'function') setBattleEther(e => Math.min(etherCap, e + effVal));
                if (typeof setEther === 'function') setEther(e => e + effVal);
              }
              setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + 10));
              if (lvl === 3) {
                setPlayerHp(h => Math.min(maxPlayerHp || 50, h + Math.round((maxPlayerHp || 50) * 0.10)));
              }
            }
            break;

          case 'temporal_singularity':
            if (isPlayer) {
              setAiTimer(t => Math.max(5, t - effVal));
              if (lvl === 3) setAiTimeTank(0);
            } else {
              setTimer(t => Math.max(5, t - effVal));
            }
            break;

          case 'entropic_filter':
            if (isPlayer) {
              setPlayerHp(h => Math.min(maxPlayerHp || 50, h + (lvl === 3 ? 15 : 5)));
              triggerFloatingText(`FILTRO ENTROPICO (TIMEOUT ANNULLATO)`, '#34d399', 'bottom-left');
            }
            break;

          case 'resonance_lock':
            if (isPlayer) setPlayerGoldenTurns(prev => prev + effVal);
            else setAiGoldenTurns(prev => prev + effVal);
            break;

          case 'suit_catalyst':
            if (isPlayer) {
              setPlayerHand(prevHand => {
                const h = [...prevHand];
                const suitsPresent = new Set(h.map(c => getCardSuit(c)));
                const missingSuit = ['hearts', 'diamonds', 'clubs', 'spades'].find(s => !suitsPresent.has(s));
                if (missingSuit && h.length > 0) {
                  const suitObj = SUITS.find(s => s.id === missingSuit) || SUITS[0];
                  h[h.length - 1] = {
                    ...h[h.length - 1],
                    suit: missingSuit,
                    symbol: suitObj.symbol,
                    color: suitObj.color,
                    glow: suitObj.glow,
                    isGolden: (lvl === 3)
                  };
                  if (lvl === 3) {
                    setPlayerGoldenCardId(h[h.length - 1].id);
                    setPlayerGoldenTurns(2);
                  }
                }
                return h;
              });
            }
            break;

          case 'holographic_prism':
            if (isPlayer) {
              setPlayerHand(prevHand => {
                const nextHand = [...prevHand];
                const count = lvl === 3 ? 3 : 2;
                for (let i = 0; i < Math.min(count, nextHand.length); i++) {
                  if (nextHand[i] && !nextHand[i].isJoker) {
                    nextHand[i] = { ...nextHand[i], suit: 'spades', symbol: '♠', color: '#c084fc' };
                  }
                }
                return nextHand;
              });
              if (lvl === 3) addStardustWithCap(10);
              triggerFloatingText(`PRISMA: CARTE TRASMUTATE`, '#c084fc', 'bottom-left');
            }
            break;

          case 'spectral_multiplier':
            if (isPlayer) {
              addStardustWithCap(Math.round(20 * effVal));
              if (lvl === 3 && typeof setDiamonds === 'function') setDiamonds(d => d + 1);
              triggerFloatingText(`SPETTRALE x${effVal}!`, '#a855f7', 'cascade-left');
            }
            break;

                    case 'sign_inverter':
            triggerFloatingText(`INVERSIONE OPERATORE`, '#f43f5e', 'bottom-left');
            break;

          case 'quantum_polarizer':
            triggerFloatingText(`BERSAGLI RICALIBRATI`, '#ef4444', 'bottom-left');
            break;

          case 'algebraic_refraction':
            if (lvl === 3 && isPlayer) {
              setPlayerNotches(prev => ({ ...prev, '+': true, '-': true }));
            }
            triggerFloatingText(`RIFRAZIONE TARGET -${Math.round(effVal * 100)}%`, '#fb7185', 'bottom-left');
            break;



          case 'harmonic_matrix':
            if (isPlayer) {
              triggerAiDamageFx();
              setAiHp(h => Math.max(0, h - effVal));
              if (lvl === 3) setAiMalusGauge(0);
              triggerFloatingText(`MATRICE ARMONICA -${effVal} HP PURO`, '#fda4af', 'top-right');
            }
            break;

          case 'entropic_refraction': {
            if (isPlayer) {
              const absorbedDmg = extraData.incomingDamage || 10;
              const shieldAmt = Math.round(absorbedDmg * effVal);
              setPlayerHp(h => Math.min(maxPlayerHp || 50, h + shieldAmt));
              triggerFloatingText(`RIFRAZIONE ENTROPICA +${shieldAmt} SCUDO`, '#a855f7', 'bottom-left');
              if (lvl === 2) {
                triggerAiDamageFx();
                setAiHp(h => Math.max(0, h - 10));
                triggerFloatingText(`RITORSIONE -10 HP`, '#a855f7', 'top-right');
              } else if (lvl === 3) {
                accumulateAbilityDamage(Math.round(getAbilityChargeThreshold(currentAdvPlanet) * 0.5), true);
                triggerFloatingText(`MODULO +50% CARICA!`, '#00f2fe', 'bottom-left');
              }
            }
            break;
          }

          default:
            break;
        }

        const canRearmWithEther = (lvl >= 2 && lvlData.etherRearmCost > 0);
        const hasAutoRearm = (slot.cardId === 'tachyon_siphon' && lvl >= 2);
        return {
          ...slot,
          isTriggered: true,
          isExhausted: !canRearmWithEther && !hasAutoRearm,
          canRearm: canRearmWithEther,
          autoRearmTurns: hasAutoRearm ? 3 : 0
        };
      }

      return slot;
    });

    if (triggeredAny) {
      if (isPlayer) playerTerrainSlotsRef.current = updatedSlots;
      else aiTerrainSlotsRef.current = updatedSlots;
      setSlots(updatedSlots);
    }
    return triggeredAny;
  }, [isTerrainAllowed, isPvP, gameMode, isAdv, currentGlobalSectorNum, extractorLevel, maxPlayerHp, maxAiHp, setEther, playerTraits, currentAdvPlanet, currentAdvLevel, temporaryTerrainUnlocked]);




    const handleRearmTerrainSlot = useCallback((slotIdx) => {
    const slot = playerTerrainSlotsRef.current[slotIdx];
    if (!slot || !slot.canRearm || !slot.card) return;
    const lvl = slot.level || 2;
    const cost = slot.card.levels[lvl]?.etherRearmCost || 1;

    if (battleEtherRef.current < cost) {
      try { playSound('deselect'); } catch (_) {}
      if (typeof triggerPopup === 'function') triggerPopup(`Etere insufficiente! Servono ${cost}🔮 Etere per riarmare la trappola.`);
      return;
    }

    // Protezione exploit: detrazione sincrona immediata sul ref per bloccare click a raffica
    battleEtherRef.current = Math.max(0, battleEtherRef.current - cost);

    try { playSound('terrain_rearm'); } catch (_) {}
    if (typeof setBattleEther === 'function') setBattleEther(e => Math.max(0, e - cost));
    if (typeof setEther === 'function') setEther(e => Math.max(0, e - cost));

    const next = [...playerTerrainSlotsRef.current];
    next[slotIdx] = {
      ...next[slotIdx],
      isTriggered: false,
      isExhausted: false,
      canRearm: false,
      autoRearmTurns: 0
    };
    playerTerrainSlotsRef.current = next;
    setPlayerTerrainSlots(next);

    if (typeof triggerFloatingText === 'function') triggerFloatingText(`RIARMO ${slot.card.name.toUpperCase()}`, '#e879f9', 'bottom-left');
    if (typeof triggerPopup === 'function') triggerPopup(`Trappola ${slot.card.name} riarmata a faccia in giÃ¹! (-${cost}🔮 Etere)`);
  }, [setEther]);


  const selectedCardsList = useMemo(() => {
    return selectedIndices.map(idx => playerHand[idx]).filter(Boolean);
  }, [selectedIndices, playerHand]);

  const smartTargetInfo = useMemo(() => {
    if (isTrisMode) {
      if (!selectedTrisHandIndices || selectedTrisHandIndices.length !== 4 || !trisObjectives?.tableCard) {
        return { matchedIndex: null, isExactMatch: false, currentResult: 0, targetValue: 0, formulaString: '', missingDiff: null, isCompatible: true };
      }
      const handCards = selectedTrisHandIndices.map(idx => playerHand[idx]).filter(Boolean);
      const activeTObj = trisObjectives.targets ? (trisObjectives.targets[selectedObjectiveIndex] || trisObjectives.targets[0]) : { target: trisObjectives.target };
      let valid = false;
      for (let i = 0; i < handCards.length; i++) {
        const c2 = handCards[i];
        const others = handCards.filter((_, idx) => idx !== i);
        const res = evaluateTrisStellare(trisObjectives.tableCard, c2, others[0], others[1], others[2], trisSelectedOp1 || '+', activeTObj, activeAnomaly);
        if (res?.isValid) { valid = true; break; }
      }
      return { matchedIndex: selectedObjectiveIndex, isExactMatch: valid, currentResult: 0, targetValue: activeTObj?.target || 0, formulaString: 'TRIS', missingDiff: 0, isCompatible: true };
    }

    if (isVectorMode) {
      if (selectedIndices.length >= 2) {
        const chosenCards = selectedIndices.map(idx => playerHand[idx]).filter(Boolean);
        const pRes = evaluateVectorParityPoker(chosenCards, vectorParityFilter);
        return { matchedIndex: null, isExactMatch: Boolean(pRes?.isValid), currentResult: pRes?.sum || 0, targetValue: vectorTarget, formulaString: pRes?.combo?.name || '', missingDiff: 0, isCompatible: true };
      }
      return { matchedIndex: null, isExactMatch: false, currentResult: 0, targetValue: vectorTarget, formulaString: '', missingDiff: null, isCompatible: true };
    }

    if (isDoubleStageMode) {
      const isExact = selectedIndices.length === 2;
      return { matchedIndex: null, isExactMatch: isExact, currentResult: 0, targetValue: convergenceTarget, formulaString: '', missingDiff: null, isCompatible: true };
    }

        return { matchedIndex: null, isExactMatch: false, currentResult: 0, targetValue: 0, formulaString: '', missingDiff: null, isCompatible: true };
  }, [selectedCardsList, playerDeckObj.id, effectivePlayerDeckLevel, activeAnomaly, isVectorMode, isDoubleStageMode, isTrisMode, selectedTrisHandIndices, trisObjectives, trisSelectedOp1, playerHand, selectedIndices, vectorParityFilter, vectorTarget, convergenceTarget]);


  // Calcolo indici e suggerimenti attivi sequenziali (UNA CARTA ALLA VOLTA) per tutte le 4 modalità
  const activeScannerHints = useMemo(() => {
    if (!isScannerActive || isPvP) return { cardIndices: [], ops: [], direction: null };

   

           // ------------------------------------------------------------------------
    // 2. MODALITÀ VETTORE GEOMETRICO: GUIDA SCANNER STAZIONE 1 & STAZIONE 2
    // ------------------------------------------------------------------------
    if (isVectorMode) {
      const pokerWps = (equippedWeapons || []).slice(0, 2).map(id => WEAPONS_DATABASE.find(w => w.id === id)).filter(Boolean);
      const mathWps = (equippedWeapons || []).slice(2, 4).map(id => WEAPONS_DATABASE.find(w => w.id === id)).filter(Boolean);
      
      const allowedPatterns = pokerWps.flatMap(w => w.allowedPatterns || (w.pattern ? [w.pattern] : (w.reqPattern ? [w.reqPattern] : [])));
      const allowedOps = mathWps.map(w => w.mathOp || w.op || w.operator).filter(Boolean);

      const vecSol = scanVectorSolution(
        playerHand,
        vectorTarget,
        vectorNucleus,
        activeAnomaly,
        vectorParityFilter,
        vectorBombData?.target,
        allowedOps.length > 0 ? allowedOps : null,
        allowedPatterns.length > 0 ? allowedPatterns : null
      );

      if (!vecSol) return { cardIndices: [], ops: [], direction: null, hasSolution: false };

      // Se la soluzione migliore è un Poker a Parità (Stazione 2)
      if (vecSol.station === 2) {
        return {
          station: 2,
          cardIndices: vecSol.cardIndices || [],
          ops: [],
          direction: null,
          combo: vecSol.combo,
          hasSolution: true
        };
      }

      // Se la soluzione migliore è al Nucleo (Stazione 1)
      const cardIdxs = [];
      if (vectorNucleus === null) {
        if (vecSol.nucleusIndex !== undefined) cardIdxs.push(vecSol.nucleusIndex);
      } else {
        if (vecSol.targetCardIndex !== undefined && vecSol.targetCardIndex !== null) {
          cardIdxs.push(vecSol.targetCardIndex);
        }
      }

      return {
        station: 1,
        cardIndices: cardIdxs,
        ops: vecSol.op ? [vecSol.op] : [],
        direction: null,
        hasSolution: true
      };
    }


       // ------------------------------------------------------------------------
    // 3. MODALITÀ CONVERGENZA: GUIDA SEQUENZIALE 2 CARTE (T1 o T2)
    // ------------------------------------------------------------------------
    if (isDoubleStageMode) {
      const isTurn1 = convergenceTurn === 1;
      const hintMove = calculateAiTurnConvergence(
        isTurn1 ? 1 : 2,
        playerHand,
        convergenceBaseCard,
        convergenceTarget,
        convergencePlayerT1Val,
        convergenceBombData?.target,
        activeAnomaly
      );

      if (!hintMove || !hintMove.found) {
        return { cardIndices: [], ops: [convergenceOp1, convergenceOp2], direction: null };
      }

      const solCards = hintMove.cardIndices || [];
      const nextCardIdx = solCards.find(idx => !selectedIndices.includes(idx));

      return {
        cardIndices: nextCardIdx !== undefined && selectedIndices.length < 2 ? [nextCardIdx] : [],
        ops: [hintMove.op1 || '+', hintMove.op2 || '+'],
        direction: null
      };
    }


        // ------------------------------------------------------------------------
    // 4. MODALITÀ TRIS STELLARE: INCASTRO A 5 CARTE (TAVOLO + 4 MANO)
    // ------------------------------------------------------------------------
    if (isTrisMode) {
      const trisTargets = trisObjectives.targets || [{ target: trisObjectives.target, isParity: false, isBomb: false }];
      const trisSol = scanTrisSolution(playerHand, trisObjectives.tableCard, trisTargets, selectedObjectiveIndex, activeAnomaly);
      if (!trisSol) return { cardIndices: [], ops: [], direction: null, targetIndex: null };

      const solCards = trisSol.cardIndices || [];
      // Suggerisce una alla volta la prossima carta della soluzione non ancora selezionata
      const nextCardIdx = solCards.find(idx => !selectedTrisHandIndices.includes(idx));

      return {
        targetIndex: trisSol.targetIndex,
        cardIndices: nextCardIdx !== undefined && selectedTrisHandIndices.length < 4 ? [nextCardIdx] : [],
        ops: [trisSol.op1],
        direction: null
      };
    }


    return { cardIndices: [], ops: [], direction: null };
    }, [
    isScannerActive,
    isPvP,
    isVectorMode,
    isDoubleStageMode,
    isTrisMode,
    selectedObjectiveIndex,
    playerHand,
    selectedIndices,
    selectedTrisHandIndices,
    vectorTarget,
    vectorNucleus,
    activeAnomaly,
    duelTargetFull,
    duelStage,
    duelInequality,
        duelPlayerValue,
    trisObjectives,
    playerTraits,
    equippedWeapons
  ]);




    // Allineamento automatico operatori suggeriti dallo scanner per la Convergenza
  useEffect(() => {
    if (!isScannerActive || isPvP || !isDoubleStageMode) return;
    const op1 = activeScannerHints?.ops?.[0];
    const op2 = activeScannerHints?.ops?.[1];
    if (selectedIndices.length === 0) {
      if (op1 && convergenceOp1 !== op1) setConvergenceOp1(op1);
      if (op2 && convergenceOp2 !== op2) setConvergenceOp2(op2);
    }
  }, [isScannerActive, isPvP, isDoubleStageMode, activeScannerHints, convergenceOp1, convergenceOp2, selectedIndices.length]);



  useEffect(() => {
    if (!isPvP && smartTargetInfo.matchedIndex !== null && smartTargetInfo.matchedIndex !== selectedObjectiveIndex) {
      setSelectedObjectiveIndex(smartTargetInfo.matchedIndex);
      try { playSound('select'); } catch (_) {}
    }
  }, [smartTargetInfo.matchedIndex, selectedObjectiveIndex, isPvP]);

  // Allineamento iniziale dello scanner: a inizio turno seleziona subito il bersaglio risolvibile (inclusa modalità Tris)
     useEffect(() => {
    if (!isScannerActive || isPvP || !isTrisMode) return;
    if (selectedTrisHandIndices.length > 0) return;
    const recIdx = activeScannerHints?.targetIndex;
    if (recIdx !== null && recIdx !== undefined && recIdx !== selectedObjectiveIndex) {
      setSelectedObjectiveIndex(recIdx);
      if (trisObjectives?.targets?.[recIdx]) {
        setTrisSelectedOp1(trisObjectives.targets[recIdx].op1 || '+');
        setTrisSelectedOp2(trisObjectives.targets[recIdx].op2 || '*');
      }
    }
  }, [isScannerActive, isPvP, isTrisMode, activeScannerHints, selectedObjectiveIndex, selectedTrisHandIndices.length, trisObjectives]);




  const randomizeTurnParameters = useCallback(() => {
        const hasAnomalyImmunity = playerTraits.some(t => t.type === 'anomaly_immunity');
    const newAnomaly = (!isPvP && !hasAnomalyImmunity && isAnomalyAllowed)
      ? FIELD_ANOMALIES[Math.floor(Math.random() * FIELD_ANOMALIES.length)]
      : FIELD_ANOMALIES[0];
    activeAnomalyRef.current = newAnomaly;
    setActiveAnomaly(newAnomaly);


    setIsExchangeMode(false);
    setSelectedExchangeIndices([]);
    setIsSelectingDiscard(false);
    setHasDeselectedThisTurn(false);
    setUsedAnomalyBypassThisTurn(false);

     // La Carta Dorata Ã¨ gestita deterministicamente all'inizio del turno nel ciclo principale

    // Cancro Livello 3: Espansione mano sotto il 40% HP
    const lowHPTrait = playerTraits.find(t => t.type === 'low_hp_hand_expansion');
    if (lowHPTrait && (playerHp / (maxPlayerHp || 50)) < (lowHPTrait.thresholdPct || 0.4)) {
      triggerFloatingText("GUSCIO REATTIVO (9 CARTE)", "#06b6d4", "bottom-left");
    }

        if (isTrisMode) {
      const newTris = generateTrisStellareObjectives(
        bombStateRef.current,
        (currentAdvPlanet - 1) * 10 + currentAdvLevel,
        isBombAllowed,
        playerHandRef.current,
        newAnomaly,
        bombStateRef.current?.tableCard || trisObjectivesRef.current?.tableCard
      );

      // Preserva e sincronizza la bomba corrente completa di Carta Tavolo
      if (isBombAllowed && newTris.targets?.[2]?.isBomb) {
        const currentBomb = newTris.targets[2];
        bombStateRef.current = currentBomb;
        setBombState(currentBomb);
      }

      trisObjectivesRef.current = newTris;
      setTrisObjectives(newTris);

      setSelectedObjectiveIndex(0);
      setSelectedTrisHandIndices([]);
      setTrisSelectedOp1(newTris.targets?.[0]?.op1 || newTris.op1);
      setTrisSelectedOp2(newTris.targets?.[0]?.op2 || newTris.op2);
      setActiveTrisCombo(null);

      if (isRealPvP && db && pvpMeta?.roomId && pvpMeta?.isHost) {
        update(ref(db, `rooms/${pvpMeta.roomId}/trisState`), {
          tableCard: newTris.tableCard,
          op1: newTris.op1,
          op2: newTris.op2,
          target: newTris.targets?.[0]?.target || newTris.target,
          targets: newTris.targets
        });
      }
               } else if (isVectorMode) {
      setVectorNucleus(null);
      setVectorHistorySuits([]);
      setVectorUsedCardsCount(0);
      setSelectedVectorCardIndex(null);

      const isVectorTutorial = !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true';

      if (isVectorTutorial) {
        if (playerTurnsCountRef.current <= 1) {
          // Turno 1 Tutorial: Radar Nucleo (Target 20)
          setVectorTarget(20);
          setVectorParityFilter('DISPARI');
          vectorParityFilterRef.current = 'DISPARI';
        } else {
          // Turno 2 Tutorial: Poker a Parità (Filtro PARI)
          setVectorTarget(36);
          setVectorParityFilter('PARI');
          vectorParityFilterRef.current = 'PARI';
        }
      } else {
        // Rigenera Stazione 1: Target Radar Nucleo
        const maxTarget = (!isPvP && isAdv && currentAdvPlanet >= 11) ? 55 : 35;
        const minTarget = (!isPvP && isAdv && currentAdvPlanet >= 11) ? 25 : 10;
        setVectorTarget(Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget);

        // Rigenera Stazione 2: Filtro Parità (PARI o DISPARI)
        const nextParity = Math.random() > 0.5 ? 'PARI' : 'DISPARI';
        setVectorParityFilter(nextParity);
        vectorParityFilterRef.current = nextParity;
      }
   } else if (isDoubleStageMode) {

      // Setup Banco Comune Modalità Convergenza: Carta Base + Target Comune (range 20–60)
      const baseCard = createRandomCard(false);
      const targetNumber = Math.floor(Math.random() * 41) + 20; // Target tra 20 e 60
      setConvergenceBaseCard(baseCard);
      setConvergenceTarget(targetNumber);
      setConvergenceTurn(1);
      setConvergenceSubStep(1);
      setConvergencePlayerT1Val(0);
      setConvergenceAiT1Val(0);
      setConvergencePlayerTableCards([]);
      setConvergenceAiTableCards([]);
      setSelectedIndices([]);
      setConvergenceOp1('+');
      setConvergenceOp2('+');

      if (isRealPvP && db && pvpMeta?.roomId && pvpMeta?.isHost) {
        update(ref(db, `rooms/${pvpMeta.roomId}/convergenceState`), {
          baseCard,
          target: targetNumber,
          turn: 1,
          subStep: 1,
          p1T1: 0,
          p2T1: 0
        });
      }

                              } else {
                 setSelectedIndices([]);
               }



    const suitsInHand = new Set(playerHandRef.current.map(c => getCardSuit(c)).filter(s => s && s !== 'joker'));
    if (suitsInHand.size === 3) {
      checkAndTriggerTerrainCards('three_suits_hand', true);
    }

  }, [isPvP, isRealPvP, isAnomalyAllowed, isVectorMode, isDoubleStageMode, isTrisMode, isAdv, currentAdvPlanet, currentAdvLevel, isBombAllowed, isGoldenCardAllowed, playerTraits, playerHp, maxPlayerHp, triggerFloatingText, pvpMeta, checkAndTriggerTerrainCards]);



  // INIZIALIZZAZIONE TURNO TATTICO
  useEffect(() => {
    setAiArchetype(AI_ARCHETYPES[Math.floor(Math.random() * AI_ARCHETYPES.length)]);
    randomizeTurnParameters();
    setTimer(getBaseTime());
    setAiTimer(getBaseTime());
    setIsOvertimeActive(false);

    try { initAudio(); } catch (_) {}
    isInitializedRef.current = true;
    prevTurnRef.current = 'player1';
  }, []);



  // TRANSIZIONE DI TURNO PULITA
  useEffect(() => {
    if (!isInitializedRef.current || winner) return;

                if (turn === 'player1' && prevTurnRef.current !== 'player1') {
      prevTurnRef.current = 'player1';

      // Ripristino cambi tempi morti per il turno nemico successivo
      setDowntimeExchangesLeft(2);
      setIsExchangeMode(false);
      setSelectedExchangeIndices([]);

      // Controllo salto turno pulito da sabotaggio nemico: blocco input per 1200ms
      if (playerSkipNextTurn) {

        triggerPopup("SISTEMI IN TILT: Turno saltato per sabotaggio nemico!");
        safeSetTimeout(() => {
          setPlayerSkipNextTurn(false);
          setTurn('ai');
        }, 1200);
        return;
      }


                    playerTurnsCountRef.current += 1;
          setHasUsedEpicItemThisTurn(false);
          setIsSelectingDiscard(false);
          setTemporaryTerrainUnlocked(false);

          // SIMMETRIA: Cambio carte IA nei tempi morti (mentre tocca al giocatore)
          if (!isRealPvP && !isExchangeBlockedByModifier && Math.random() < 0.35) {
            safeSetTimeout(() => {
              if (turn === 'player1' && aiHandRef.current.length >= 2) {
                let aiHandCopy = [...aiHandRef.current];
                let aiDiscCopy = [...aiDiscardRef.current];
                const cardsToSwap = Math.min(2, aiHandCopy.length);
                for (let i = 0; i < cardsToSwap; i++) {
                  aiDiscCopy.push(aiHandCopy.shift());
                }
                const refilledAi = refillHandToTargetSize(aiHandCopy, aiDeckRef.current, aiDiscCopy, 7);
                aiHandRef.current = refilledAi.newHand;
                aiDeckRef.current = refilledAi.newDeck;
                aiDiscardRef.current = refilledAi.newDiscard;
                setAiHand(refilledAi.newHand);
                setAiDeck(refilledAi.newDeck);
                setAiDiscard(refilledAi.newDiscard);

                // Penalità simmetrica: l'IA ti regala +3 HP per il cambio
                setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 3));
                triggerFloatingText("+3 HP (CAMBIO CARTE NEMICO)", "#10b981", "bottom-left");
                triggerPopup("L'avversario ha effettuato un cambio carte nei tempi morti (+3 HP a te)!");
              }
            }, 3000);
          }


          if (enemyPassiveSilencedTurns > 0) {
            setEnemyPassiveSilencedTurns(prev => prev - 1);
          }
          if (playerDisabledAbilitiesTurns > 0) {
            setPlayerDisabledAbilitiesTurns(prev => prev - 1);
          }

          if (burnRoundsRemaining > 0) {
            const burnTrait = playerTraits.find(t => t.type === 'burn_damage_passive');
            const burnDmg = burnTrait ? (burnTrait.burnDmg || 3) : 3;
            triggerAiDamageFx();
            setAiHp(prev => Math.max(0, prev - burnDmg));
            if (playerTraits.some(t => t.type === 'burn_tick_charge_module')) {
              accumulateAbilityDamage(Math.round(getAbilityChargeThreshold(currentAdvPlanet) * 0.05), true);
            }
            setBurnRoundsRemaining(prev => prev - 1);
            triggerPopup(`Scorie Magmatiche: -${burnDmg} HP all'avversario!`);
          }

          // 1. REFILL MANO ANTICIPATO (CARICAMENTO COMPLETO A 7/8 CARTE)
          const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
          let targetHandSize = sizeTrait ? (sizeTrait.size || 8) : 7;

          const lowHPTrait = playerTraits.find(t => t.type === 'low_hp_hand_expansion');
          if (lowHPTrait && (playerHp / (maxPlayerHp || 50)) < (lowHPTrait.thresholdPct || 0.4)) {
            targetHandSize = lowHPTrait.handSize || 9;
          }

          const hasHandImmunity = playerTraits.some(t => t.type === 'malus_hand_immunity');
          if (playerHandLimitNextTurn !== null && !hasHandImmunity) {
            targetHandSize = playerHandLimitNextTurn;
          }
          setPlayerHandLimitNextTurn(null);

                                    if (!isDoubleStageMode) {
            const isVectorTutorial = isVectorMode && !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true';

            if (isVectorTutorial && playerTurnsCountRef.current === 2) {
              // Mano Scriptata Turno 2: Coppia di 8 in posizione 0 e 1 (8 + 8 = 16 PARI)
              const tutHand2 = [
                { id: 'tut_v2_1', value: 8, displayVal: '8', suit: 'hearts', symbol: '♥', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_2', value: 8, displayVal: '8', suit: 'spades', symbol: '♠', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_3', value: 3, displayVal: '3', suit: 'diamonds', symbol: '♦', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_4', value: 7, displayVal: '7', suit: 'clubs', symbol: '♣', color: '#10b981', glow: 'rgba(16, 185, 129, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_5', value: 9, displayVal: '9', suit: 'diamonds', symbol: '♦', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_6', value: 2, displayVal: '2', suit: 'hearts', symbol: '♥', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', isCourt: false, isJoker: false, isGolden: false },
                { id: 'tut_v2_7', value: 6, displayVal: '6', suit: 'spades', symbol: '♠', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', isCourt: false, isJoker: false, isGolden: false }
              ];
              playerHandRef.current = tutHand2;
              setPlayerHand(tutHand2);
              randomizeTurnParameters();
            } else {
              const res = refillHandToTargetSize(playerHandRef.current, playerDeckRef.current, playerDiscardRef.current, targetHandSize);
              playerHandRef.current = res.newHand;
              playerDeckRef.current = res.newDeck;
              playerDiscardRef.current = res.newDiscard;
              setPlayerHand(res.newHand);
              setPlayerDeck(res.newDeck);
              setPlayerDiscard(res.newDiscard);

              if (checkDeckOutCondition(res.newHand, res.newDeck, res.newDiscard, aiHandRef.current, aiDeckRef.current, aiDiscardRef.current)) {
                return;
              }

              randomizeTurnParameters();
            }
          }



                    // 2. INNESCO BERSAGLI E FAGLIA SU MANO PIENA (TUTTE LE MODALITÀ)
          let nextClassicObjs = classicObjectives;
          if (!isTrisMode && !isVectorMode && !isDoubleStageMode) {
            nextClassicObjs = generateClassicObjectives(playerHandRef.current, isBombAllowed, bombStateRef.current);
            setClassicObjectives(nextClassicObjs);
          }

          const isRiftUnlocked = (isAdv && (currentAdvPlanet > 2 || (currentAdvPlanet === 2 && currentAdvLevel === 10))) || isPvP || gameMode === 'pve';
          const hpLossThreshold = (maxPlayerHp || 50) * 0.30;

          if (isRiftUnlocked && damageTakenAccumulatorRef.current >= hpLossThreshold && !isSelectingDiscard) {
            let curObjectives = [];
            if (!isTrisMode && !isVectorMode && !isDoubleStageMode) {
              curObjectives = nextClassicObjs;
            } else if (isTrisMode) {
              curObjectives = (trisObjectives.targets || []).map((t, idx) => ({
                targetIndex: idx,
                op: t.op1 || '+',
                target: t.target || 24,
                isParity: t.isParity,
                isBomb: t.isBomb
              }));
            } else if (isVectorMode) {
              curObjectives = [
                { targetIndex: 0, op: '+', target: vectorTarget, label: 'Radar Nucleo' },
                { targetIndex: 1, op: '+', target: 20, isParity: true, parityType: vectorParityFilter, label: 'Poker a Parità' }
              ];
            } else if (isDoubleStageMode) {
              curObjectives = [
                { targetIndex: 0, op: convergenceOp1 || '+', target: convergenceTarget, label: 'Target Comune' }
              ];
            }

            const opportunity = findVulnerabilityRiftOpportunity(playerHandRef.current, curObjectives, activeAnomalyRef.current);


            if (opportunity) {
              const benefit = selectWeightedBenefit(playerHpRef.current, maxPlayerHp, aiHpRef.current);
              const newRift = {
                active: true,
                targetSlotIndex: opportunity.targetIndex,
                conditionType: opportunity.conditionType,
                conditionLabel: opportunity.conditionLabel,
                benefit
              };
              setRiftState(newRift);
              riftStateRef.current = newRift;
              damageTakenAccumulatorRef.current = 0;

              if (localStorage.getItem('eclissi_rift_tutorial_seen') !== 'true') {
                localStorage.setItem('eclissi_rift_tutorial_seen', 'true');
                if (typeof triggerDiscoveryTutorial === 'function') {
                  triggerDiscoveryTutorial('vulnerability_rift_intro');
                }
              }
            }
          } else if (riftStateRef.current?.active) {
            setRiftState(null);
            riftStateRef.current = null;
          }

          // 3. SCALAMENTO BOMBA
          if (isBombAllowed && !isVectorMode && !isDoubleStageMode && bombStateRef.current) {
            if (bombStateRef.current.isNew) {
              const updatedBomb = { ...bombStateRef.current, isNew: false };
              bombStateRef.current = updatedBomb;
              setBombState(updatedBomb);
              triggerFloatingText(`NUOVA BOMBA: 3T!`, '#facc15', 'top-right');
            } else {
              const remaining = bombStateRef.current.turnsRemaining - 1;
              if (remaining <= 0) {
                const savedByTerrain = checkAndTriggerTerrainCards('bomb_timeout', true);
                if (!savedByTerrain) {
                  bombStateRef.current = { ...bombStateRef.current, turnsRemaining: 0 };
                  resolveBombEffect(false, true);
                }
              } else {
                if (remaining === 1) {
                  checkAndTriggerTerrainCards('bomb_critical', true);
                }
                const updatedBomb = { ...bombStateRef.current, turnsRemaining: remaining };
                bombStateRef.current = updatedBomb;
                setBombState(updatedBomb);
                triggerFloatingText(`BOMBA: ${remaining}T RIMASTI!`, '#facc15', 'top-right');
              }
            }
          }

          if (isBombAllowed && isVectorMode && vectorBombDataRef.current) {
            const remaining = vectorBombCountdownRef.current - 1;
            if (remaining <= 0) {
              const savedByTerrain = checkAndTriggerTerrainCards('bomb_timeout', true);
              if (!savedByTerrain) {
                resolveBombEffect(false, true);
              }
              const nextBomb = generateVectorBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
              vectorBombDataRef.current = nextBomb;
              setVectorBombData(nextBomb);
              vectorBombCountdownRef.current = 3;
              setVectorBombCountdown(3);
            } else {
              if (remaining === 1) {
                checkAndTriggerTerrainCards('bomb_critical', true);
              }
              vectorBombCountdownRef.current = remaining;
              setVectorBombCountdown(remaining);
              triggerFloatingText(`ALLERTA BOMBA: [${remaining}T] - TARGET: ${vectorBombDataRef.current.target}`, '#facc15', 'top-right');
            }
          }

          // 4. SCALAMENTO CARTA DORATA
          if (isGoldenCardAllowed) {
            if (playerGoldenTurnsRef.current > 0) {
              const nextTurns = playerGoldenTurnsRef.current - 1;
              if (nextTurns === 1) {
                checkAndTriggerTerrainCards('golden_expire', true);
              }
              setPlayerGoldenTurns(nextTurns);
              if (nextTurns <= 0) {
                setPlayerGoldenCardId(null);
                triggerFloatingText("EFFETTO CARTA DORATA TERMINATO", "#94a3b8", "bottom-left");
              } else {
                triggerFloatingText(`CARTA DORATA: ${nextTurns}T RIMASTO!`, "#facc15", "bottom-left");
              }
            } else {
              const pHand = playerHandRef.current;
              if (pHand && pHand.length > 0) {
                const newGoldenCard = pHand[Math.floor(Math.random() * pHand.length)];
                if (newGoldenCard) {
                  setPlayerGoldenCardId(newGoldenCard.id);
                  setPlayerGoldenTurns(2);
                  triggerFloatingText("NUOVA CARTA DORATA [2T]!", "#facc15", "bottom-left");
                }
              }
            }
          }

          // 5. AUTO-RIARMO CARTE TERRENO
          if (isTerrainAllowed) {
            let rearmedCount = 0;
            const updatedTerrain = playerTerrainSlotsRef.current.map(slot => {
              if (slot.autoRearmTurns && slot.autoRearmTurns > 0) {
                const rem = slot.autoRearmTurns - 1;
                if (rem <= 0) {
                  rearmedCount++;
                  return {
                    ...slot,
                    isTriggered: false,
                    isExhausted: false,
                    canRearm: false,
                    autoRearmTurns: 0
                  };
                }
                return { ...slot, autoRearmTurns: rem };
              }
              return slot;
            });

            if (rearmedCount > 0) {
              playerTerrainSlotsRef.current = updatedTerrain;
              setPlayerTerrainSlots(updatedTerrain);
              try { playSound('terrain_rearm'); } catch (_) {}
              triggerFloatingText("AUTO-RIARMO SIFONE TACHIONICO!", "#10b981", "bottom-left");
            }
          }

          saveBattleSnapshot();
          setAiCardStates(Array(7).fill(''));


      if (!isEclipseStormActive) {
        setTimer(getBaseTime());
      }
      setIsOvertimeActive(false);

      // Reset parametri di turno per Scanner e Colpo Lampo
      setTurnTimeElapsed(0);
      setScannerUsedThisTurn(false);
      setIsScannerActive(scannerMode === 'FREE_FULL');

      triggerTurnBanner(true);

            } else if (turn === 'ai' && prevTurnRef.current !== 'ai') {
      prevTurnRef.current = 'ai';

      // RIPRISTINO PREVENTIVO MANO IA A 7 CARTE
      const refilledAiAtStart = refillHandToTargetSize(aiHandRef.current, aiDeckRef.current, aiDiscardRef.current, 7);
      aiHandRef.current = refilledAiAtStart.newHand;
      aiDeckRef.current = refilledAiAtStart.newDeck;
      aiDiscardRef.current = refilledAiAtStart.newDiscard;
      setAiHand(refilledAiAtStart.newHand);
      setAiDeck(refilledAiAtStart.newDeck);
      setAiDiscard(refilledAiAtStart.newDiscard);

      // Applica eventuale limitazione mano da sabotaggio giocatore (5 carte)
      if (aiHandLimitNextTurn !== null) {
        setAiHand(prev => prev.slice(0, aiHandLimitNextTurn));
        setAiHandLimitNextTurn(null);
        triggerFloatingText("MANO NEMICA RIDOTTA (5 CARTE)", "#8b5cf6", "top-right");
      }



      if (isGoldenCardAllowed) {
        if (aiGoldenTurnsRef.current > 0) {
          const nextAiTurns = aiGoldenTurnsRef.current - 1;
          setAiGoldenTurns(nextAiTurns);
          if (nextAiTurns <= 0) setAiGoldenCardId(null);
        } else {
          const aHand = aiHandRef.current;
          if (aHand && aHand.length > 0) {
            const randCard = aHand[Math.floor(Math.random() * aHand.length)];
            if (randCard) {
              setAiGoldenCardId(randCard.id);
              setAiGoldenTurns(2);
            }
          }
        }
      }

      setAiTimer(getBaseTime());
      triggerTurnBanner(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, winner]);

    


    // Scarica Tattica Malus
  const executeBackfireMalus = useCallback((isTargetPlayer, lastDamageDealt) => {
    try { playSound('malus_backfire'); } catch (_) {}
    setShakeScreen(true);
    safeSetTimeout(() => setShakeScreen(false), 500);

        if (isTargetPlayer) {
      const deflected = checkAndTriggerTerrainCards('malus_backfire', true);
      if (deflected) return;
    }


    const chosenMalus = MALUS_POOL[Math.floor(Math.random() * MALUS_POOL.length)];
    const targetLabel = isTargetPlayer ? 'SU DI TE!' : 'SULL\'AVVERSARIO!';

    setActivePenaltyBanner({
      ...chosenMalus,
      targetName: targetLabel
    });
    safeSetTimeout(() => setActivePenaltyBanner(null), 2800);

    const hasRecoilHalved = playerTraits.some(t => t.type === 'recoil_halved');
    const hasMalusImmunity = playerTraits.some(t => t.type === 'full_malus_immunity');

    if (isTargetPlayer && hasMalusImmunity) {
      triggerPopup("Proxima b (Ancoraggio del Caos): Immunità assoluta alla scarica tattica!");
      return;
    }

    switch (chosenMalus.id) {
      case 'hp_drain': {
        const hasDrainImmunity = playerTraits.some(t => t.type === 'malus_drain_immunity');
        if (isTargetPlayer && hasDrainImmunity) {
          triggerPopup("Capricorno Liv. 3: Immunità totale alla perdita HP diretta!");
          return;
        }

        const drainAmount = (isTargetPlayer && hasRecoilHalved) ? 5 : 10;
        if (isTargetPlayer) {
          triggerPlayerDamageFx();
          setPlayerHp(prev => Math.max(0, prev - drainAmount));
        } else {
          triggerAiDamageFx();
          setAiHp(prev => Math.max(0, prev - 10));
        }
        break;
      }

      case 'module_lock': {
        if (isTargetPlayer) {
          const hasLockImmunity = playerTraits.some(t => t.type === 'malus_lock_immunity');
          if (!hasLockImmunity) {
            setPlayerDisabledAbilitiesTurns(2);
            setIsAbilityReady(false);
            setAbilityMeter(0);
          }
        } else {
          setAiAbilityMeter(0);
          setAiActionMessage("Modulo avversario disattivato!");
        }
        break;
      }

            case 'hand_reduction': {
        if (isTargetPlayer) {
          const hasHandImmunity = playerTraits.some(t => t.type === 'malus_hand_immunity');
          if (!hasHandImmunity) {
            setPlayerHandLimitNextTurn(5);
          }
        } else {
          setAiHandLimitNextTurn(5);
          setAiHand(prev => {
            let newAiHand = [...prev];
            if (newAiHand.length > 5) newAiHand = newAiHand.slice(0, 5);
            return newAiHand;
          });
        }
        break;
      }


                case 'skip_turn': {
        if (isTargetPlayer) {
          setPlayerSkipNextTurn(true);
          triggerFloatingText("SABOTAGGIO: TUO TURNO BLOCCATO!", '#ef4444', 'bottom-left');
          triggerPopup("SABOTAGGIO NEMICO!\nL'avversario ha mandato in tilt i tuoi sistemi: salterai il prossimo turno.");
        } else {
          setEnemySkipNextTurn(true);
          triggerFloatingText("SABOTAGGIO: NEMICO STORDITO!", '#ec4899', 'top-right');
          triggerPopup("SABOTAGGIO MALUS RIUSCITO!\nL'avversario salterà completamente il suo prossimo turno.");
        }
        break;
      }



      default:
        break;
    }
  }, [availableReviveLives, declareWinner, advanceBossPhase, safeSetTimeout, playerTraits, maxPlayerHp, enceladoAutoReviveUsed, triggerPopup, isPvP, isRealPvP, pvpMeta, nickname]);


      const onScoreSuccess = useCallback((isAttackerPlayer, damageDealt = 10) => {
    // 1. Il Modulo Abilità avanza di 1 colpo a segno (3 colpi = 100%)
    accumulateAbilityDamage(damageDealt, isAttackerPlayer);

    if (!isMalusAllowed) return;

    if (isAttackerPlayer) {
      // 2. Barra Malus Giocatore: scala da 1 a 10 punti (massimo 10pt entro 8s, minimo 1pt al limite)
      const timeSpent = turnTimeElapsedRef.current || 0;
      const timeLeft = Math.max(0, 60 - timeSpent);
      const pointsEarned = Math.max(1, Math.min(10, Math.ceil(timeLeft / 6)));

      triggerFloatingText(`+${pointsEarned} PT SABOTAGGIO`, '#fb923c', 'bottom-left');

      setPlayerMalusGauge(prev => {
        const next = prev + pointsEarned;
        if (next >= malusMaxTicks) {
          setTimeout(() => executeBackfireMalus(false, damageDealt), 0);
          return next - malusMaxTicks; // Carry-over dei punti in eccesso
        }
        return next;
      });
    } else {
      // 3. Barra Malus Avversario: attiva in tutte le modalità, calibrata sul livello di sfida
      let aiPoints = 4;
      if (isAdv) {
        if (currentAdvPlanet <= 5) aiPoints = 4;          // 5 colpi a segno per riempire la barra (20 pt)
        else if (currentAdvPlanet <= 12) aiPoints = 6;     // 4 colpi a segno (giocatore medio)
        else aiPoints = 8;                                 // 3 colpi a segno (titani e boss finali)
      } else if (gameMode === 'pve') {
        aiPoints = bettingTier >= 3 ? 8 : (bettingTier === 2 ? 6 : 5);
      } else {
        // PvP (duello o simulazione ghost)
        aiPoints = Math.floor(Math.random() * 3 + 5);      // Tra 5 e 7 punti
      }

      setAiMalusGauge(prev => {
        const next = prev + aiPoints;
        if (next >= malusMaxTicks) {
          setTimeout(() => {
            const absorbed = (typeof checkAndTriggerTerrainCards === 'function')
              ? checkAndTriggerTerrainCards('malus_full', true)
              : false;
            if (!absorbed) {
              executeBackfireMalus(true, damageDealt);
            }
          }, 0);
          return next - malusMaxTicks; // Carry-over per l'avversario
        }
        return next;
      });
    }
  }, [isMalusAllowed, malusMaxTicks, executeBackfireMalus, accumulateAbilityDamage, triggerFloatingText, isAdv, currentAdvPlanet, gameMode, bettingTier, checkAndTriggerTerrainCards]);





  // =========================================================================
  // RISOLUZIONE EFFETTI NUCLEO INSTABILE (DISINNESCO O DETONAZIONE)
  // =========================================================================
      const resolveBombEffect = useCallback((isDisarmed, isPlayer = true) => {
    const bomb = isVectorMode 
      ? vectorBombDataRef.current 
      : (isDoubleStageMode ? convergenceBombDataRef.current : bombStateRef.current);
    if (!bomb) return;



    const bType = bomb.type;

    const targetName = isPlayer ? nickname : (isPvP ? (pvpMeta?.opponent?.nickname || 'Nemico') : 'Avversario');

    if (isDisarmed) {
      try { playSound('convergenza'); } catch (_) {}
      triggerFloatingText(`BOMBA DISINNESCATA!`, '#10b981', isPlayer ? 'bottom-left' : 'top-right');
      triggerPopup(`💥 NUCLEO INSTABILE DISINNESCATO da ${targetName}!\nBonus: ${bomb.successDesc}`);

      switch (bType) {
                        case 'fracture':        
          if (isPlayer) {
            triggerAiDamageFx();
            setAiHp(h => Math.max(0, h - 30));


            // P14 Proxima b: registra il danno subito dalla bomba e carica il contraccolpo (+33%)
            if (isAdv && currentAdvPlanet === 14) {
              const bDet = onBombDetonation({
                planet: currentAdvPlanet,
                level: currentAdvLevel,
                bombDamage: 30,
                currentBombReactorCharge: bombReactorCharge,
                currentBombDamagePool: bombDamagePool
              });
              setBombReactorCharge(bDet.newBombReactorCharge);
              setBombDamagePool(bDet.newBombDamagePool);
              bDet.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
              if (bDet.popupMessage) triggerPopup(bDet.popupMessage);
            }
          } else {
            triggerPlayerDamageFx();
            setPlayerHp(h => Math.max(0, h - 30));
          }
          break;


        case 'barrier':
          if (isPlayer) {
            setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 25));
          } else {
            setAiHp(h => Math.min(maxAiHp || 50, h + 25));
          }
          break;

        case 'vampiric':
          if (isPlayer) {
            triggerAiDamageFx();
            setAiHp(h => Math.max(0, h - 15));
            setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 15));
          } else {
            triggerPlayerDamageFx();
            setPlayerHp(h => Math.max(0, h - 15));
            setAiHp(h => Math.min(maxAiHp || 50, h + 15));
          }
          break;

        case 'diamond':
          if (isPlayer) {
            if (typeof setDiamonds === 'function') setDiamonds(d => d + 1);
            addStardustWithCap(50);
          }
          break;

        case 'ether':
          if (isPlayer) {
            setBattleEther(e => Math.min(maxBattleEther, e + 3));
            if (typeof setEther === 'function') setEther(e => e + 3);
          }
          break;

        case 'stardust_core':
          if (isPlayer) addStardustWithCap(100);
          break;

        case 'overcharge':
          if (isPlayer) {
            setAbilityMeter(12);
            setIsAbilityReady(true);
          } else {
            setAiAbilityMeter(12);
          }
          break;

        case 'purge':
          if (isPlayer) setAiMalusGauge(0);
          else setPlayerMalusGauge(0);
          break;

        case 'quantum':
          if (isPlayer) {
            setPlayerNotches({ '+': true, '-': true, '*': true, '/': true });
            setPlayerDiceReady(true);
          } else {
            setAiNotches({ '+': true, '-': true, '*': true, '/': true });
          }
          break;

        case 'temporal':
          if (isPlayer) setPlayerTimeTank(TIME_TANK_MAX_CAP);
          else setAiTimeTank(TIME_TANK_MAX_CAP);
          break;

        case 'holographic':
          if (isPlayer) {
            setPlayerHand(prevHand => {
              const h = [...prevHand];
              let minIdx = 0;
              h.forEach((c, idx) => {
                if (c && !c.isJoker && c.value < (h[minIdx]?.value || 99)) minIdx = idx;
              });
              if (h[minIdx]) {
                h[minIdx] = {
                  ...h[minIdx],
                  value: 0,
                  displayVal: 'â˜…',
                  suit: 'joker',
                  symbol: 'â˜…',
                  color: '#e879f9',
                  isJoker: true
                };
              }
              return h;
            });
          }
          break;

        case 'resonance':
          setResonanceStreak(prev => prev + 2);
          break;
        default:
          break;
      }
            } else {
      const absorbed = checkAndTriggerTerrainCards('bomb_fail', isPlayer);
      if (absorbed) {
        if (isBombAllowed && !isVectorMode && !isDoubleStageMode) {
          const raw = generateBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
          const ops = ['+', '-', '*', '/'];
          const newBomb = {
            ...raw,
            op1: ops[Math.floor(Math.random() * ops.length)],
            op2: ops[Math.floor(Math.random() * ops.length)],
            turnsRemaining: 3,
            tableCard: createRandomCard(false),
            isNew: true
          };
          bombStateRef.current = newBomb;
          setBombState(newBomb);
        }
        return;
      }

      try { playSound('damage'); } catch (_) {}
      setShakeScreen(true);
      safeSetTimeout(() => setShakeScreen(false), 500);

      triggerFloatingText(`BOMBA DETONATA!`, '#ef4444', isPlayer ? 'top-right' : 'bottom-left');
      triggerPopup(`⚠️ NUCLEO ESPLOSO SU ${targetName.toUpperCase()}!\nPenalità: ${bomb.failDesc}`);

      switch (bType) {
                case 'fracture':
          if (isPlayer) {
            // Detonazione contro la nave del giocatore: -25 HP e azzeramento Etere
            triggerPlayerDamageFx();
            setPlayerHp(h => Math.max(0, h - 25));
            setBattleEther(0);
            if (typeof setEther === 'function') setEther(0);
            triggerFloatingText("-25 HP SCULLO & ETERE A ZERO!", '#ef4444', 'bottom-left');
          } else {
            triggerAiDamageFx();
            setAiHp(h => Math.max(0, h - 25));
            setAiBattleEther(0);
          }
          break;


        case 'barrier':
          if (isPlayer) {
            triggerPlayerDamageFx();
            setPlayerHp(h => Math.max(0, h - 15));
          } else {
            triggerAiDamageFx();
            setAiHp(h => Math.max(0, h - 15));
          }
          break;

        case 'vampiric':
          if (isPlayer) {
            triggerPlayerDamageFx();
            setPlayerHp(h => Math.max(0, h - 15));
            setAiHp(h => Math.min(maxAiHp || 50, h + 15));
          } else {
            triggerAiDamageFx();
            setAiHp(h => Math.max(0, h - 15));
            triggerPlayerHealFx();
            setPlayerHp(h => Math.min(maxPlayerHp || 50, h + 15));
          }
          break;

        case 'diamond':
          break;

        case 'ether':
          if (isPlayer) {
            setBattleEther(0);
            if (typeof setEther === 'function') setEther(0);
          } else {
            setAiBattleEther(0);
          }
          break;

        case 'stardust_core':
          if (isPlayer && typeof setStardust === 'function') {
            setStardust(s => Math.max(0, s - 40));
          }
          break;

        case 'overcharge':
          if (isPlayer) {
            setPlayerDisabledAbilitiesTurns(2);
            setIsAbilityReady(false);
            setAbilityMeter(0);
          } else {
            setAiAbilityMeter(0);
          }
          break;

        case 'purge':
          executeBackfireMalus(isPlayer, 10);
          break;

        case 'quantum':
          if (isPlayer) {
            setPlayerNotches({ '+': false, '-': false, '*': false, '/': false });
            setPlayerDiceReady(false);
          } else {
            setAiNotches({ '+': false, '-': false, '*': false, '/': false });
          }
          break;

        case 'temporal':
          if (isPlayer) {
            setPlayerTimeTank(0);
            setTimer(15);
          } else {
            setAiTimeTank(0);
            setAiTimer(15);
          }
          break;

        case 'holographic':
          if (isPlayer) {
            setPlayerHandLimitNextTurn(5);
          }
          break;

        case 'resonance':
          setResonanceStreak(0);
          break;

        default:
          break;
      }
    }


                      if (isBombAllowed && !isVectorMode && !isDoubleStageMode) {
      const raw = generateBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
      const ops = ['+', '-', '*', '/'];
      const newBomb = {
        ...raw,
        op1: ops[Math.floor(Math.random() * ops.length)],
        op2: ops[Math.floor(Math.random() * ops.length)],
        turnsRemaining: 3,
        tableCard: createRandomCard(false),
        isNew: Boolean(isDisarmed)
      };
      bombStateRef.current = newBomb;
      setBombState(newBomb);
    }




  }, [nickname, isPvP, pvpMeta, maxPlayerHp, maxAiHp, isBombAllowed, isVectorMode, isDoubleStageMode, currentAdvPlanet, currentAdvLevel, addStardustWithCap, executeBackfireMalus, maxBattleEther, safeSetTimeout, triggerAiDamageFx, triggerFloatingText, triggerPlayerDamageFx, triggerPopup, setEther, setStardust, bombReactorCharge, bombDamagePool]);

    useEffect(() => {
    onScoreSuccessRef.current = onScoreSuccess;
    declareWinnerRef.current = declareWinner;
    activeAdventureRef.current = activeAdventure;
    tierConfigRef.current = tierConfig;
    availableReviveLivesRef.current = availableReviveLives;
    maxPlayerHpRef.current = maxPlayerHp;
    maxAiHpRef.current = maxAiHp;
  });

    const getAiDamageForCurrentLevel = (chosenOp = '+') => {
    let dmg = getClassicOpDamage(chosenOp);
    const isBoss = (isAdv && currentAdvLevel === 10);

    if (isBoss) {
      dmg += (4 * bossPhase);
    }

    // Integrazione Dominanza Elementale sul danno dell'avversario
    if (pilotDominance?.status === 'ENEMY_DOMINANT') {
      dmg = Math.round(dmg * 1.15);
    } else if (pilotDominance?.status === 'PLAYER_DOMINANT') {
      dmg = Math.max(1, Math.round(dmg * 0.85));
    }


    // Applicazione passive del mazzo avversario (se non silenziato dalla Stele d'Ombra)
    if (enemyPassiveSilencedTurns <= 0) {
      aiTraits.forEach(trait => {
        if (trait.type === 'op_boost' && trait.ops?.includes(chosenOp)) {
          dmg += (trait.bonus || 4);
        }
        if (trait.type === 'op_flat_bonus' && trait.op === chosenOp) {
          dmg += (trait.bonus || 5);
        }
      });
    }

    // Difesa passiva del giocatore (es. Bilancia)
    const flatDef = playerTraits.find(t => t.type === 'flat_defense');
    if (flatDef) {
      dmg = Math.max(1, dmg - (flatDef.reduction || 3));
    }
    return dmg;
  };


  const resolveQuantumDiceEffect = useCallback((isPlayerRoll, valX, effectFace) => {
    let summary = '';
    const faceId = effectFace.id;

    if (isPlayerRoll) {
      playerTraits.forEach(t => {
        if (t.type === 'dice_roll_burn') {
          triggerAiDamageFx();
          setAiHp(prev => Math.max(0, prev - (t.damage || 5)));
          triggerFloatingText(`-5 HP (LANCIO TERMICO)`, '#ef4444', 'top-right');
        }
      });
    }

    if (faceId === 'black') {
      if (isPlayerRoll) {
        accumulateAbilityDamage(60, true);
        summary = `âš¡ Carica Istantanea: Modulo AbilitÃ  Ibrido al 100%!`;
      } else {
        accumulateAbilityDamage(60, false);
        summary = `âš¡ L'avversario carica istantaneamente il proprio Modulo AbilitÃ !`;
      }
    } else if (faceId === 'red') {
      if (isPlayerRoll) {
        setAiMalusGauge(g => Math.max(0, g - valX));
        summary = `🛡️ Scarica Malus: Rimosse ${valX} tacche dalla barra nemica!`;
      } else {
        setPlayerMalusGauge(g => Math.max(0, g - valX));
        summary = `🛡️ L'avversario riduce la tua barra malus di ${valX} tacche!`;
      }
    } else if (faceId === 'hearts') {
      if (isPlayerRoll) {
        const healPctAmount = Math.max(5, Math.round((maxPlayerHp || 50) * (valX * 0.04)));
        triggerPlayerHealFx();
        setPlayerHp(hp => Math.min(maxPlayerHp || 50, hp + healPctAmount));
        triggerFloatingText(`+${healPctAmount} HP CURA`, '#10b981', 'bottom-left');
        summary = `â™¥ Cura HP: Rigenerati +${healPctAmount} HP (+${valX * 4}%)!`;
      } else {
        const aiHealPct = Math.max(5, Math.round((maxAiHp || 50) * (valX * 0.04)));
        setAiHp(hp => Math.min(maxAiHp || 50, hp + aiHealPct));
        triggerFloatingText(`+${aiHealPct} HP NEMICO`, '#10b981', 'top-right');
        summary = `â™¥ L'avversario rigenera +${aiHealPct} HP!`;
      }
    } else if (faceId === 'diamonds') {
      if (isPlayerRoll) {
        addStardustWithCap(valX * 10);
        triggerFloatingText(`+${valX * 10} 🌟`, '#facc15', 'cascade-left');
        summary = `â™¦ Polvere Stellare: +${valX * 10} Polvere ottenuta!`;
      } else {
        summary = `â™¦ L'avversario raccoglie ${valX * 10} risorse!`;
      }
    } else if (faceId === 'spades') {
       if (isPlayerRoll) {
        triggerAiDamageFx();
        setAiHp(prev => Math.max(0, prev - valX));
        triggerFloatingText(`-${valX} HP (COLPO PURO)`, '#ef4444', 'top-right');
;
        summary = `â™  Colpo Diretto: Inflitti ${valX} Danni Puri al nemico!`;
      } else {
        triggerPlayerDamageFx();
        setPlayerHp(prev => Math.max(0, prev - valX));
        triggerFloatingText(`-${valX} HP (COLPO NEMICO)`, '#ef4444', 'bottom-left');
        summary = `â™  L'avversario ti infligge un colpo diretto di ${valX} Danni Puri!`;
      }

    } else if (faceId === 'clubs') {
      const addedTime = Math.min(TIME_TANK_MAX_CAP, valX * 4);
      if (isPlayerRoll) {
        setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + addedTime));
        triggerFloatingText(`+${addedTime}s RISERVA`, '#34d399', 'cascade-left');
        summary = `â™£ Tempo Extra: +${addedTime}s nel tuo Serbatoio di Riserva!`;
      } else {
        setAiTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + addedTime));
        summary = `â™£ L'avversario aggiunge +${addedTime}s nel proprio Serbatoio!`;
      }
    }

    return summary;
  }, [maxPlayerHp, maxAiHp, nickname, declareWinner, advanceBossPhase, safeSetTimeout, availableReviveLives, addStardustWithCap, playerTraits, enceladoAutoReviveUsed, accumulateAbilityDamage, isPvP, pvpMeta, triggerFloatingText]);

    const executeQuantumDiceRoll = () => {
    setShowDigitalDiceModal(true);
    setIsCyclingDice(true);
    setDiceResultSummary('');
    try { playSound('dice_roll'); } catch (_) {}

             if (isAdv) {
      const bossDiceRes = onBossQuantumDiceRoll({
        planet: currentAdvPlanet,
        level: currentAdvLevel,
        currentIonShield: aiIonShieldRef.current,
        bossAbilityMeter: aiAbilityMeter,
        operatorsRolledCount: 1
      });
      aiIonShieldRef.current = bossDiceRes.newIonShield;
      setAiAbilityMeter(bossDiceRes.updatedBossAbilityMeter);
      bossDiceRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
      if (bossDiceRes.popupMessage) triggerPopup(bossDiceRes.popupMessage);
    }





    const targetValX = Math.floor(Math.random() * 6) + 1;
    const targetFace = QUANTUM_DICE_B_FACES[Math.floor(Math.random() * 6)];

        let cycleCount = 0;
    if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    diceIntervalRef.current = setInterval(() => {
      setDiceDisplayValue(Math.floor(Math.random() * 6) + 1);
      setDiceDisplayFace(QUANTUM_DICE_B_FACES[Math.floor(Math.random() * 6)]);
      cycleCount++;
      if (cycleCount > 10) {
        clearInterval(diceIntervalRef.current);
        diceIntervalRef.current = null;
        setIsCyclingDice(false);

        setDiceDisplayValue(targetValX);
        setDiceDisplayFace(targetFace);

        const summary = resolveQuantumDiceEffect(true, targetValX, targetFace);
        setDiceResultSummary(summary);

                              setPlayerDiceReady(false);
        const startTrait = playerTraits.find(t => t.type === 'dice_start_notch');
        setPlayerNotches({ '+': Boolean(startTrait), '-': false, '*': false, '/': false });

        safeSetTimeout(() => {
          setShowDigitalDiceModal(false);
          triggerPopup(`[DADI QUANTICI]\n${summary}`);
        }, 1200);


      }
    }, 70);
  };

  const registerOp = (opSymbol) => {
    if (opSymbol && matchStatsRef.current?.opCounts) {
      matchStatsRef.current.opCounts[opSymbol] = (matchStatsRef.current.opCounts[opSymbol] || 0) + 1;
    }
    if (!isDiceAllowed) return;
    setPlayerNotches(prev => {

      const updated = { ...prev, [opSymbol]: true };
      const count = Object.values(updated).filter(Boolean).length;
      if (count >= requiredNotchesCount) setPlayerDiceReady(true);
      return updated;
    });
  };

  const registerAiOp = useCallback((opSymbol) => {
    if (!isDiceAllowed || isRealPvP) return;
    let shouldTriggerDice = false;
    setAiNotches(prev => {
      const updated = { ...prev, [opSymbol]: true };
      const count = Object.values(updated).filter(Boolean).length;
      if (count >= 4) {
        shouldTriggerDice = true;
        return { '+': false, '-': false, '*': false, '/': false };
      }
      return updated;
    });
    if (shouldTriggerDice) {
      const valX = Math.floor(Math.random() * 6) + 1;
      const face = QUANTUM_DICE_B_FACES[Math.floor(Math.random() * 6)];
      const summary = resolveQuantumDiceEffect(false, valX, face);
      triggerPopup(`[DADI QUANTICI NEMICI]\n${summary}`);
    }
  }, [isDiceAllowed, isRealPvP, resolveQuantumDiceEffect, triggerPopup]);

   // =========================================================================
  // GESTORE ATTIVAZIONE MODULO ABILITÀ IBRIDO DELL'AVVERSARIO (1 SOLO MODULO)
  // =========================================================================
  const checkAndTriggerAiAbilities = useCallback(() => {
    if (isRealPvP || !effectiveAiAbilityId) return;

    if (aiAbilityMeter >= 12) {
      try { playAbilitySFX(effectiveAiAbilityId); } catch (_) {}
      const abObj = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === effectiveAiAbilityId) : null;
      const abName = abObj?.name?.split(' ')[0] || 'Modulo Nemico';
      const abLevel = effectiveAiDeckLevel;

      const t1 = Math.min(3, abLevel);
      const t2 = abLevel >= 4 ? Math.min(3, abLevel - 3) : 0;
      const t3 = abLevel >= 7 ? Math.min(3, abLevel - 6) : 0;

      // --- EFFETTO 1 (FASCIA 1: LIVELLI 1-3) ---
      if (effectiveAiAbilityId === 'taurus' || effectiveAiAbilityId === 'planet_char_1') {
        const aiHeal = Math.max(15, Math.round((maxAiHp || 50) * (0.12 + t1 * 0.08)));
        setAiHp(hp => Math.min(maxAiHp || 50, hp + aiHeal));
        triggerFloatingText(`+${aiHeal} HP (CURA NEMICA)`, '#10b981', 'top-right');
        triggerPopup(`L'avversario attiva ${abName}: +${aiHeal} HP rigenerati!`);
      } else if (effectiveAiAbilityId === 'aries' || effectiveAiAbilityId === 'planet_char_2') {
        const dmg = 12 + t1 * 6;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - dmg));
        triggerFloatingText(`-${dmg} HP (COLPO NEMICO)`, '#ef4444', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: subisci -${dmg} HP di danno puro!`);
      } else if (effectiveAiAbilityId === 'gemini') {
        const sec = 15 + t1 * 5;
        setAiTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + sec));
        triggerFloatingText(`+${sec}s TEMPO NEMICO`, '#38bdf8', 'top-right');
        triggerPopup(`L'avversario attiva ${abName}: +${sec}s accumulati nel proprio Time Tank!`);
      } else if (effectiveAiAbilityId === 'leo') {
        const dmg = 14 + t1 * 6;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - dmg));
        triggerFloatingText(`-${dmg} HP (FURIA NEMICA)`, '#f59e0b', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: subisci -${dmg} HP di esecuzione!`);
      } else if (effectiveAiAbilityId === 'virgo' || effectiveAiAbilityId === 'planet_char_7') {
        const lockTurns = t1 >= 2 ? 2 : 1;
        setPlayerDisabledAbilitiesTurns(prev => Math.max(prev, lockTurns));
        setIsAbilityReady(false);
        triggerFloatingText(`MODULO BLOCCATO (${lockTurns}T)`, '#84cc16', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: il tuo Modulo Abilità è disattivato per ${lockTurns} turni!`);
      } else if (effectiveAiAbilityId === 'libra') {
        const siphonDmg = 10 + t1 * 4;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - siphonDmg));
        setAiHp(hp => Math.min(maxAiHp || 50, hp + Math.floor(siphonDmg * 0.5)));
        triggerFloatingText(`SIFONE NEMICO -${siphonDmg} HP`, '#a855f7', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: ti ruba ${siphonDmg} HP!`);
      } else if (effectiveAiAbilityId === 'scorpio') {
        setPlayerHandLimitNextTurn(5);
        triggerFloatingText("MANO RIDOTTA A 5 CARTE", '#f43f5e', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: al prossimo turno avrai solo 5 carte in mano!`);
      } else if (effectiveAiAbilityId === 'sagittarius') {
        const tankSec = 15 + t1 * 5;
        setAiTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + tankSec));
        setTimer(t => Math.max(5, t - 10));
        triggerFloatingText(`-10s TIMER GIOCATORE`, '#f97316', 'bottom-left');
        triggerPopup(`L'avversario attiva ${abName}: +${tankSec}s al suo tank e ti toglie 10s!`);
      } else if (effectiveAiAbilityId === 'capricorn' || effectiveAiAbilityId === 'planet_char_10') {
        const reflectMult = 0.40 + t1 * 0.20;
        setEnemyMirrorShieldActive(true);
        setEnemyMirrorShieldMultiplier(reflectMult);
        triggerFloatingText(`BARRIERA NEMICA x${reflectMult}`, '#94a3b8', 'top-right');
        triggerPopup(`L'avversario attiva ${abName}: erige uno Scudo Reattivo che rifletterà il tuo prossimo colpo!`);
      } else if (effectiveAiAbilityId === 'planet_char_6') {
        const drainTime = 15 + t1 * 5;
        setTimer(t => Math.max(5, t - drainTime));
        triggerFloatingText(`TEMPO -${drainTime}s`, '#f59e0b', 'bottom-left');
        triggerPopup(`Saturno (Anelli di Crono): ti sottrae ${drainTime}s dal timer di turno!`);
      } else if (effectiveAiAbilityId === 'planet_char_9') {
        const dmg = 20 + t1 * 8;
        setAiHp(hp => Math.max(1, hp - 4));
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - dmg));
        triggerFloatingText(`ANTIMATERIA -${dmg} HP`, '#38bdf8', 'bottom-left');
        triggerPopup(`Plutone (Signore delle Ombre): sacrifica 4 HP e ti infligge -${dmg} HP Puri!`);
      } else if (effectiveAiAbilityId === 'planet_char_14') {
        setAiMalusGauge(0);
        setPlayerMalusGauge(prev => Math.min(malusMaxTicks, prev + 2));
        triggerFloatingText("MALUS TRASFERITO (+2)", '#6366f1', 'bottom-left');
        triggerPopup(`Proxima b: azzera la propria Barra Malus e carica la tua di +2 tacche!`);
      } else if (effectiveAiAbilityId === 'planet_char_15') {
        const pctDmg = Math.max(10, Math.round(playerHp * (0.15 + t1 * 0.05)));
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - pctDmg));
        triggerFloatingText(`GRAVITÀ -${pctDmg} HP`, '#d946ef', 'bottom-left');
        triggerPopup(`TRAPPIST-1e: scarica un colpo gravitazionale pari al ${Math.round((0.15 + t1 * 0.05) * 100)}% dei tuoi HP (-${pctDmg} HP)!`);
      } else if (effectiveAiAbilityId === 'planet_char_18') {
        setPlayerTimeTank(0);
        triggerFloatingText("TIME TANK SVUOTATO!", '#f97316', 'bottom-left');
        triggerPopup(`Eris (Discordia): ha svuotato interamente il tuo Serbatoio di Riserva Tempo (0s)!`);
      } else if (effectiveAiAbilityId === 'planet_char_19') {
        const dmg = 18 + t1 * 6;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - dmg));
        setBurnRoundsRemaining(prev => prev + 3);
        triggerFloatingText(`ERUZIONE -${dmg} HP (+USTIONE)`, '#ef4444', 'bottom-left');
        triggerPopup(`Io (Nucleo Magmatico): ti infligge -${dmg} HP e applica ustione continua per 3 turni!`);
      } else if (effectiveAiAbilityId === 'planet_char_20') {
        const aiHeal = Math.round((maxAiHp || 200) * 0.25);
        setAiHp(hp => Math.min(maxAiHp || 200, hp + aiHeal));
        setTimer(t => Math.max(5, t - 15));
        triggerFloatingText(`SOVRANO +${aiHeal} HP (-15s A TE)`, '#06b6d4', 'top-right');
        triggerPopup(`Encelado (Sovrano del Vuoto): rigenera +${aiHeal} HP e congela 15s dal tuo timer!`);
      } else {
        const dmg = 10 + t1 * 5;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - dmg));
        triggerFloatingText(`-${dmg} HP ${abName.toUpperCase()}`, '#ef4444', 'bottom-left');
      }

      // --- EFFETTO 2 SIMULTANEO (FASCIA 2: LIVELLI 4-6) ---
      if (t2 > 0) {
        setPlayerMalusGauge(prev => Math.min(malusMaxTicks, prev + t2));
        triggerFloatingText(`+${t2} MALUS CONTRACCOLPO`, '#fb923c', 'bottom-left');
      }

      // --- EFFETTO 3 SIMULTANEO (FASCIA 3: LIVELLI 7-9) ---
      if (t3 > 0) {
        const bonusPure = t3 * 7;
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - bonusPure));
        triggerFloatingText(`APOTEOSI NEMICA -${bonusPure} HP!`, '#f43f5e', 'bottom-left');
      }

      setAiAbilityMeter(0);
    }
  }, [isRealPvP, effectiveAiAbilityId, aiAbilityMeter, effectiveAiDeckLevel, maxAiHp, playerHp, malusMaxTicks, triggerFloatingText, triggerPopup, triggerPlayerDamageFx]);



      // --------------------------------------------------------------------------
  // MOTORE AVVERSARIO CON TIMING REALISTICI (IN PAUSA SE IL GIOCATORE CAMBIA CARTE)
  // --------------------------------------------------------------------------
    useEffect(() => {
    if (isRealPvP || turn !== 'ai' || winner || activeDiscoveryTutorial || isExchangeMode) {
      clearAiTurnTimeouts();
      return;
    }



        if (enemySkipNextTurn) {
      setEnemySkipNextTurn(false);
      setAiActionMessage("Nemico stordito dall'occasione: turno saltato!");
      setTimeout(() => {
        setAiActionMessage("");
        setTurn('player1');
      }, 1200);
      return;
    }


    if (aiTurnRunningRef.current) return;
    aiTurnRunningRef.current = true;


    const isOver = checkDeckOutCondition(
      playerHandRef.current, playerDeckRef.current, playerDiscardRef.current,
      aiHandRef.current, aiDeckRef.current, aiDiscardRef.current
    );
    if (isOver) {
      aiTurnRunningRef.current = false;
      return;
    }

    checkAndTriggerAiAbilities();
    const pacing = generateHumanPacing(isAdv, currentAdvPlanet);

    const safeAiTimeout = (fn, delay) => {
      const id = setTimeout(() => {
        aiTimeoutIdsRef.current = aiTimeoutIdsRef.current.filter(tId => tId !== id);
        fn();
      }, delay);
      aiTimeoutIdsRef.current.push(id);
      return id;
    };

       // 1. MODALITÀ TRIS STELLARE (5 CARTE)
    if (isTrisModeRef.current) {
      setAiActionMessage(isGhostMatch ? `Turno di ${pvpMeta?.opponent?.nickname || 'Avversario'}...` : "L'avversario compone la mano a 5 carte...");
      setAiCardStates(Array(7).fill(''));

      safeAiTimeout(() => {
        const nextStates = Array(7).fill('');
        [0, 1, 2, 3].forEach(idx => { nextStates[idx] = 'ai-card-selected'; });
        setAiCardStates(nextStates);
        try { playSound('select'); } catch (_) {}

        safeAiTimeout(() => {
          try {
            const aiTrisMove = calculateAiTurnTrisStellare(
              aiHandRef.current, 
              trisObjectivesRef.current.tableCard, 
              trisObjectivesRef.current.op1, 
              '+', 
              trisObjectivesRef.current.targets || trisObjectivesRef.current.target, 
              activeAnomalyRef.current
            );

            if (aiTrisMove.found) {
              if (aiTrisMove.targetObj?.isBomb) {
                resolveBombEffect(true, false);
              }

              const comboName = aiTrisMove.combo?.name || 'Carta Alta';
              let damageDealt = aiTrisMove.totalDamage || 18;

              if (isAdv) {
                const bossTrisAtk = onBossAttack({
                  planet: currentAdvPlanet,
                  level: currentAdvLevel,
                  rawDamage: damageDealt,
                  aiCards: aiTrisMove.cardsUsed || [],
                  playerNotches,
                  bossPhase
                });
                if (bossTrisAtk.extraBossModuleCharge > 0) {
                  setAiAbilityMeter(prev => Math.min(12, prev + bossTrisAtk.extraBossModuleCharge));
                }
                damageDealt = bossTrisAtk.finalDamage;
                bossTrisAtk.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
                if (bossTrisAtk.popupMessage) triggerPopup(bossTrisAtk.popupMessage);
              }

              if (enemyPistonOverrideActive) {
                damageDealt = enemyPistonOverrideDamage;
                setEnemyPistonOverrideActive(false);
                triggerFloatingText("PISTONE ENCELADO 30 HP!", "#ef4444", "top-right");
              }

              const thornsTrait = playerTraitsRef.current.find(t => t.type === 'thorns_damage');
              if (thornsTrait) {
                setAiHp(h => Math.max(0, h - (thornsTrait.value || 4)));
              }

              if (mirrorShieldActiveRef.current) {
                const reflected = Math.round(damageDealt * mirrorShieldMultiplierRef.current);
                setMirrorShieldActive(false);
                triggerAiDamageFx();
                triggerFloatingText(`BARRIERA! -${reflected} HP`, '#14b8a6', 'top-right');
                setAiActionMessage(`TRIS RIFLESSO! Subisce -${reflected} HP!`);
                setAiHp(prev => Math.max(0, prev - reflected));
                triggerPopup(`BARRIERA DIELETTRICA!\nAttacco nemico annullato e riflesso per -${reflected} HP!`);
              } else {
                const shieldTrait = playerTraitsRef.current.find(t => t.type === 'first_hit_shield');
                if (shieldTrait && !hasUsedFirstHitShield) {
                  damageDealt = Math.max(1, Math.round(damageDealt * (1 - (shieldTrait.reductionPct || 0.50))));
                  setHasUsedFirstHitShield(true);
                  triggerFloatingText(`SCUDO ANULARE (-50%)`, '#f59e0b', 'bottom-left');
                }

                try { playSound('plasma_damage'); } catch (_) {}
                triggerPlayerDamageFx();
                triggerFloatingText(`-${damageDealt} HP (${comboName})`, '#ef4444', 'bottom-left');
                setAiActionMessage(`Mano nemica completata: ${comboName} (-${damageDealt} HP)!`);

                checkAndTriggerTerrainCards('enemy_hit', true, { incomingDamage: damageDealt });
                if (damageDealt > 18) checkAndTriggerTerrainCards('heavy_damage', true, { incomingDamage: damageDealt });

                setPlayerHp(prev => Math.max(0, prev - damageDealt));
                onScoreSuccess(false, damageDealt);
              }

              // L'IA scarta le 4 carte giocate e rifilla a 7
              let remainingAi = [...aiHandRef.current];
              aiTrisMove.cardIndices.sort((a, b) => b - a).forEach(i => remainingAi.splice(i, 1));
              let curAiDiscard = [...aiDiscardRef.current];
              if (remainingAi.length > 0) curAiDiscard.push(remainingAi.shift());
              const refilled = refillHandToTargetSize(remainingAi, aiDeckRef.current, curAiDiscard, 7);
              setAiHand(refilled.newHand);
              setAiDeck(refilled.newDeck);
              setAiDiscard(refilled.newDiscard);
            } else {
              let curAiHand = [...aiHandRef.current];
              let curAiDisc = [...aiDiscardRef.current];
              if (curAiHand.length > 0) curAiDisc.push(curAiHand.shift());
              const refilled = refillHandToTargetSize(curAiHand, aiDeckRef.current, curAiDisc, 7);
              setAiHand(refilled.newHand);
              setAiDeck(refilled.newDeck);
              setAiDiscard(refilled.newDiscard);
              setAiActionMessage("Nessuna combinazione valida. L'avversario scarta 1 carta e passa.");
              try { playSound('deselect'); } catch (_) {}
            }
          } finally {
            safeAiTimeout(() => {
              setAiActionMessage("");
              setAiCardStates(Array(7).fill(''));
              aiTurnRunningRef.current = false;
              setTurn('player1');
            }, 900);
          }
        }, Math.max(1000, pacing.executeTime - pacing.firstTap));
      }, pacing.firstTap);

      return;
    }


            // 2. MODALITÀ VETTORE GEOMETRICO (RISOLTO E LINEARIZZATO)
    if (isVectorModeRef.current) {
      const isVectorTutorial = !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true';

      // Nel Turno 1 del tutorial, l'avversario calibra i sensori e cede il turno
      if (isVectorTutorial && playerTurnsCountRef.current <= 1) {
        setAiActionMessage("L'avversario calibra i sensori radar e passa il turno...");
        safeAiTimeout(() => {
          let curAiHand = [...aiHandRef.current];
          let curAiDisc = [...aiDiscardRef.current];
          if (curAiHand.length > 0) curAiDisc.push(curAiHand.shift());
          const refilled = refillHandToTargetSize(curAiHand, aiDeckRef.current, curAiDisc, 7);
          aiHandRef.current = refilled.newHand;
          aiDeckRef.current = refilled.newDeck;
          aiDiscardRef.current = refilled.newDiscard;
          setAiHand(refilled.newHand);
          setAiDeck(refilled.newDeck);
          setAiDiscard(refilled.newDiscard);
          setAiActionMessage("");
          aiTurnRunningRef.current = false;
          setTurn('player1');
        }, 1400);
        return;
      }

      setAiActionMessage(isGhostMatch ? `Turno di ${pvpMeta?.opponent?.nickname || 'Avversario'}...` : "L'avversario allinea i vettori sul radar...");
      setAiCardStates(Array(7).fill(''));

      // Animazione 1° tocco carta
      safeAiTimeout(() => {
        const nextStates = Array(7).fill('');
        nextStates[0] = 'ai-card-selected';
        setAiCardStates(nextStates);
        try { playSound('select'); } catch (_) {}
      }, pacing.firstTap);

      // Animazione 2° tocco carta
      safeAiTimeout(() => {
        const nextStates = Array(7).fill('');
        nextStates[0] = 'ai-card-selected';
        nextStates[1] = 'ai-card-selected';
        setAiCardStates(nextStates);
        try { playSound('select'); } catch (_) {}
      }, pacing.secondTap);

      // Risoluzione e attacco calcolato
      safeAiTimeout(() => {
        try {
          const aiVecMove = calculateAiTurnVector(
            aiHandRef.current,
            vectorTarget,
            vectorNucleus,
            activeAnomalyRef.current
          );

          if (aiVecMove.found) {
            let damageDealt = getVectorCardDamage(aiVecMove.cardsCount);

            if (isAdv) {
              const bAtkRes = onBossAttack({
                planet: currentAdvPlanet,
                level: currentAdvLevel,
                rawDamage: damageDealt,
                aiCards: aiVecMove.cardsUsed || [],
                currentAiHp: aiHpRef.current,
                playerHp: playerHpRef.current,
                bossPhase
              });
              if (bAtkRes?.finalDamage !== undefined) damageDealt = bAtkRes.finalDamage;
              if (bAtkRes?.bossSelfHeal > 0) {
                setAiHp(prev => Math.min(maxAiHpRef.current || 200, prev + bAtkRes.bossSelfHeal));
              }
              if (bAtkRes?.floatingTexts && Array.isArray(bAtkRes.floatingTexts)) {
                bAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
              }
              if (bAtkRes?.popupMessage) triggerPopup(bAtkRes.popupMessage);
            }

            if (enemyPistonOverrideActive) {
              damageDealt = enemyPistonOverrideDamage;
              setEnemyPistonOverrideActive(false);
              triggerFloatingText("PISTONE ENCELADO 30 HP!", "#ef4444", "top-right");
            }

            const thornsTrait = playerTraitsRef.current.find(t => t.type === 'thorns_damage');
            if (thornsTrait) {
              setAiHp(h => Math.max(0, h - (thornsTrait.value || 4)));
            }

            if (mirrorShieldActiveRef.current) {
              const reflected = Math.round(damageDealt * mirrorShieldMultiplierRef.current);
              setMirrorShieldActive(false);
              triggerAiDamageFx();
              triggerFloatingText(`BARRIERA! -${reflected} HP`, '#14b8a6', 'top-right');
              setAiActionMessage(`VETTORE RIFLESSO! Subisce -${reflected} HP!`);
              setAiHp(prev => Math.max(0, prev - reflected));
              triggerPopup(`BARRIERA DIELETTRICA!\nVettore nemico annullato e riflesso per -${reflected} HP!`);
            } else {
              const shieldTrait = playerTraitsRef.current.find(t => t.type === 'first_hit_shield');
              if (shieldTrait && !hasUsedFirstHitShield) {
                damageDealt = Math.max(1, Math.round(damageDealt * (1 - (shieldTrait.reductionPct || 0.50))));
                setHasUsedFirstHitShield(true);
                triggerFloatingText(`SCUDO ANULARE (-50%)`, '#f59e0b', 'bottom-left');
              }

              try { playSound('plasma_damage'); } catch (_) {}
              triggerPlayerDamageFx();
              triggerFloatingText(`-${damageDealt} HP (Vettore Centrato)`, '#ef4444', 'bottom-left');
              setAiActionMessage(`Vettore a segno! (${aiVecMove.cardsCount} carte: -${damageDealt} HP)`);

              checkAndTriggerTerrainCards('enemy_hit', true, { incomingDamage: damageDealt });
              if (damageDealt > 18) checkAndTriggerTerrainCards('heavy_damage', true, { incomingDamage: damageDealt });

              setPlayerHp(prev => Math.max(0, prev - damageDealt));
              onScoreSuccess(false, damageDealt);
            }

            let remainingAi = [...aiHandRef.current];
            aiVecMove.cardIndices.sort((a, b) => b - a).forEach(i => remainingAi.splice(i, 1));
            const refilled = refillHandToTargetSize(remainingAi, aiDeckRef.current, aiDiscardRef.current, 7);
            aiHandRef.current = refilled.newHand;
            aiDeckRef.current = refilled.newDeck;
            aiDiscardRef.current = refilled.newDiscard;
            setAiHand(refilled.newHand);
            setAiDeck(refilled.newDeck);
            setAiDiscard(refilled.newDiscard);
          } else {
            let curAiHand = [...aiHandRef.current];
            let curAiDisc = [...aiDiscardRef.current];
            if (curAiHand.length > 0) curAiDisc.push(curAiHand.shift());
            const refilled = refillHandToTargetSize(curAiHand, aiDeckRef.current, curAiDisc, 7);
            aiHandRef.current = refilled.newHand;
            aiDeckRef.current = refilled.newDeck;
            aiDiscardRef.current = refilled.newDiscard;
            setAiHand(refilled.newHand);
            setAiDeck(refilled.newDeck);
            setAiDiscard(refilled.newDiscard);
            setAiActionMessage("Nessun vettore centrato. L'avversario scarta 1 carta e passa.");
            try { playSound('deselect'); } catch (_) {}
          }
        } catch (err) {
          console.error("Errore turno IA Vettore:", err);
          setAiActionMessage("Errore di calcolo nemico. Turno ceduto.");
        } finally {
          safeAiTimeout(() => {
            setAiActionMessage("");
            setAiCardStates(Array(7).fill(''));
            aiTurnRunningRef.current = false;
            setTurn('player1');
          }, 900);
        }
      }, pacing.executeTime);

      return;
    }


           // 3. MODALITÀ CONVERGENZA: DUELLO DI PRECISIONE A DUE TURNI (2 + 2 CARTE)
    if (isDoubleStageMode) {
      // SUBSTEP 2: TURNO 1 AVVERSARIO (APERTURA 2 CARTE)
      if (convergenceSubStep === 2) {
        setAiActionMessage(isGhostMatch ? "L'avversario formula l'Apertura T1..." : "L'avversario concatena le prime 2 carte...");
        setAiCardStates(Array(7).fill(''));

        safeAiTimeout(() => {
          try {
            const aiT1Move = calculateAiTurnConvergence(
              1,
              aiHandRef.current,
              convergenceBaseCard,
              convergenceTarget,
              0,
              convergenceBombDataRef.current?.target,
              activeAnomalyRef.current
            );

            const c1Idx = aiT1Move.cardIndices ? aiT1Move.cardIndices[0] : 0;
            const c2Idx = aiT1Move.cardIndices ? aiT1Move.cardIndices[1] : 1;
            const playedCardsAi = [aiHandRef.current[c1Idx], aiHandRef.current[c2Idx]].filter(Boolean);

            const newAiStates = Array(7).fill('');
            newAiStates[c1Idx] = 'ai-card-selected';
            newAiStates[c2Idx] = 'ai-card-selected';
            setAiCardStates(newAiStates);
            try { playSound('card_slide'); } catch (_) {}

            safeAiTimeout(() => {
              try {
                const aiT1Result = aiT1Move.result || 20;
                setConvergenceAiT1Val(aiT1Result);
                setConvergenceAiTableCards(playedCardsAi);

                // Disinnesco bomba nemico in T1
                if (aiT1Move.isBombDisarm) {
                  resolveBombEffect(true, false);
                  triggerFloatingText("BOMBA DISINNESCATA DA NEMICO!", "#10b981", "top-right");
                }

                // Consuma 2 carte e ripristina la mano nemica a 7 carte per il Turno 2
                let remainingAi = [...aiHandRef.current];
                [c1Idx, c2Idx].sort((a, b) => b - a).forEach(i => {
                  if (i < remainingAi.length) remainingAi.splice(i, 1);
                });
                const refilledAi = refillHandToTargetSize(remainingAi, aiDeckRef.current, aiDiscardRef.current, 7);
                setAiHand(refilledAi.newHand);
                setAiDeck(refilledAi.newDeck);
                setAiDiscard(refilledAi.newDiscard);

                // Passa al Turno 2 del Giocatore (Chiusura)
                setConvergenceTurn(2);
                setConvergenceSubStep(3);
                setAiCardStates(Array(7).fill(''));
                setAiActionMessage("");
                triggerPopup(`Apertura Avversario: Parziale ${Math.round(aiT1Result * 10) / 10}.\nTurno 2 (Chiusura): tocca a te completare con le ultime 2 carte!`);
              } finally {
                aiTurnRunningRef.current = false;
                setTurn('player1');
              }
            }, Math.max(800, pacing.executeTime - pacing.firstTap));
          } catch (e) {
            aiTurnRunningRef.current = false;
            setTurn('player1');
          }
        }, pacing.firstTap);

        return;
      }

      // SUBSTEP 4: TURNO 2 AVVERSARIO & RISOLUZIONE FINALE (STEP 1 DELTA + STEP 2 POKER)
      if (convergenceSubStep === 4) {
        setAiActionMessage(isGhostMatch ? "L'avversario formula la Chiusura T2..." : "L'avversario converge sul target...");
        setAiCardStates(Array(7).fill(''));

        safeAiTimeout(() => {
          try {
            const aiT2Move = calculateAiTurnConvergence(
              2,
              aiHandRef.current,
              convergenceBaseCard,
              convergenceTarget,
              convergenceAiT1Val,
              convergenceBombDataRef.current?.target,
              activeAnomalyRef.current
            );

            const c3Idx = aiT2Move.cardIndices ? aiT2Move.cardIndices[0] : 0;
            const c4Idx = aiT2Move.cardIndices ? aiT2Move.cardIndices[1] : 1;
            const playedCardsAiT2 = [aiHandRef.current[c3Idx], aiHandRef.current[c4Idx]].filter(Boolean);

            const newAiStates = Array(7).fill('');
            newAiStates[c3Idx] = 'ai-card-attack-anim';
            newAiStates[c4Idx] = 'ai-card-attack-anim';
            setAiCardStates(newAiStates);
            try { playSound('card_slide'); } catch (_) {}

            safeAiTimeout(() => {
              try {
                const aiFinalResult = aiT2Move.result || 40;

                // Disinnesco bomba nemico in T2
                if (aiT2Move.isBombDisarm) {
                  resolveBombEffect(true, false);
                  triggerFloatingText("BOMBA DISINNESCATA DA NEMICO!", "#10b981", "top-right");
                }

                                // Carte definitive al tavolo (1 Base + 4 Giocate)
                const p5Cards = [convergenceBaseCard, ...convergencePlayerTableCards];
                const ai5Cards = [convergenceBaseCard, ...convergenceAiTableCards, ...playedCardsAiT2];

                // Consuma le 2 carte del Turno 2 per l'IA
                let remainingAi = [...aiHandRef.current];
                [c3Idx, c4Idx].sort((a, b) => b - a).forEach(i => {
                  if (i < remainingAi.length) remainingAi.splice(i, 1);
                });

                // Spostamento delle 4 carte giocate nei rispettivi scarti (evita memory leak di carte)
                const p4Cards = convergencePlayerTableCards;
                const ai4Cards = [...convergenceAiTableCards, ...playedCardsAiT2];
                const updatedPlayerDiscard = [...playerDiscardRef.current, ...p4Cards];
                const updatedAiDiscard = [...aiDiscardRef.current, ...ai4Cards];
                playerDiscardRef.current = updatedPlayerDiscard;
                aiDiscardRef.current = updatedAiDiscard;
                setPlayerDiscard(updatedPlayerDiscard);
                setAiDiscard(updatedAiDiscard);

                // RISOLUZIONE DEL DUELLO DI CONVERGENZA
                const duelRes = resolveConvergenceDuel(
                  convergencePlayerT1Val,
                  aiFinalResult,
                  convergenceTarget,
                  p5Cards,
                  ai5Cards
                );

                let calculatedDamage = duelRes.damage;

                // Sinergie Semi del vincitore applicate alle 4 carte giocate
                const winnerPlayedCards = duelRes.winner === 'player' ? convergencePlayerTableCards : ai4Cards;
                const suitBonus = evaluateSuitBonus(winnerPlayedCards, playerDeckObj.id, effectivePlayerDeckLevel, maxPlayerHp, playerGoldenCardId);

                // Aggiornamento flag 3ª Stella per la Campagna e la Lega Élite
                if (duelRes.winner === 'player' && matchStatsRef.current) {
                  matchStatsRef.current.duelPrecisionHit = true;
                }

                // Scalamento Contatore Bomba 3T di Convergenza ad ogni round concluso
                if (isBombAllowed && convergenceBombCountdownRef.current > 0) {
                  const nextCount = convergenceBombCountdownRef.current - 1;
                  setConvergenceBombCountdown(nextCount);
                  convergenceBombCountdownRef.current = nextCount;
                  if (nextCount <= 0) {
                    resolveBombEffect(false, true);
                    const nextBomb = generateDuelBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
                    setConvergenceBombData(nextBomb);
                    convergenceBombDataRef.current = nextBomb;
                    setConvergenceBombCountdown(3);
                    convergenceBombCountdownRef.current = 3;
                  }
                }

                                                                               // --- VITTORIA GIOCATORE ---
                if (duelRes.winner === 'player') {
                  let riftBonusDamage = 0;
                  let riftCritMultiplier = 1.0;
                  let riftExtraDraw = 0;

                  if (riftStateRef.current && riftStateRef.current.active) {
                    const isSatisfied = verifyRiftSatisfied(
                      riftStateRef.current,
                      0,
                      p5Cards,
                      convergenceOp1 || '+'
                    );

                    if (isSatisfied) {
                      const riftResults = applyRiftBenefit(riftStateRef.current.benefit);
                      riftBonusDamage = riftResults.bonusDamage;
                      riftCritMultiplier = riftResults.critMultiplier;
                      riftExtraDraw = riftResults.extraDraw;
                      setRiftState(null);
                      riftStateRef.current = null;
                    }
                  }

                  // Consumo ed effetti Carta Dorata

                  if (suitBonus.hasGoldenCard) {
                    if (matchStatsRef.current) matchStatsRef.current.goldenOrComboCount += 1;
                    setPlayerGoldenCardId(null);
                    setPlayerGoldenTurns(0);
                    triggerFloatingText("CARTA DORATA ATTIVATA!", "#facc15", "bottom-left");
                    checkAndTriggerTerrainCards('golden_played', true);
                  }

                  // Accredito Sinergie Semi del vincitore (Cura, Polvere, Tempo, Diamanti)
                  if (suitBonus.heal > 0) {
                    triggerPlayerHealFx();
                    playerHpRef.current = Math.min(maxPlayerHpRef.current || 50, playerHpRef.current + suitBonus.heal);
                    setPlayerHp(playerHpRef.current);
                    triggerFloatingText(`+${suitBonus.heal} HP`, '#10b981', 'bottom-left');
                  }
                  if (suitBonus.dust > 0) {
                    addStardustWithCap(suitBonus.dust);
                    triggerFloatingText(`+${suitBonus.dust} 🌟`, '#facc15', 'cascade-left');
                  }
                  if (suitBonus.timeTankBonus > 0) {
                    setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + suitBonus.timeTankBonus));
                    triggerFloatingText(`+${suitBonus.timeTankBonus}s TEMPO`, '#34d399', 'cascade-left');
                  }
                  if (suitBonus.bonusDiamonds > 0) {
                    if (typeof setDiamonds === 'function') setDiamonds(d => d + suitBonus.bonusDiamonds);
                    triggerFloatingText(`+${suitBonus.bonusDiamonds} 💎`, '#00f2fe', 'cascade-left');
                  }

                  const pilotScaling = getPilotDamageMultiplier(
                    effectivePlayerPilotId,
                    effectivePlayerPilotLvl,
                    [convergenceOp1],
                    turnTimeElapsed,
                    { playedCards: p5Cards, hpPercentage: (playerHpRef.current / (maxPlayerHpRef.current || 50)) * 100 }
                  );

                                    calculatedDamage = Math.round(((calculatedDamage + riftBonusDamage + pilotScaling.flat + suitBonus.extraDamage) * suitBonus.damageMultiplier * riftCritMultiplier) * (pilotDominance?.multiplier || 1.0));

                  calculatedDamage = applyLightningStrikeAndMerit(calculatedDamage);

                  if (duelRes.isBullseye) {
                    accumulateAbilityDamage(1, true); // +1 tacca Modulo su Centro Perfetto
                    triggerFloatingText("🎯 BULLSEYE! CRITICO +3 HP & +1 MODULO", "#fde047", "top-right");
                  }

                  let reflectedDmg = 0;

                  // Gestione reazioni Boss all'attacco
                  if (isAdv) {
                    const playerAtkRes = onPlayerAttack({
                      planet: currentAdvPlanet,
                      level: currentAdvLevel,
                      baseDamage: calculatedDamage,
                      usedCards: p5Cards,
                      turnNumber: playerTurnsCountRef.current,
                      currentTitanArmor: aiTitanArmorRef.current
                    });
                    calculatedDamage = playerAtkRes.finalDamage;
                    aiTitanArmorRef.current = playerAtkRes.newTitanArmor;
                    reflectedDmg = playerAtkRes.reflectedToBoss || 0;

                    if (playerAtkRes.recoilDamage > 0) {
                      triggerPlayerDamageFx();
                      playerHpRef.current = Math.max(0, playerHpRef.current - playerAtkRes.recoilDamage);
                      setPlayerHp(playerHpRef.current);
                    }
                    if (playerAtkRes.floatingTexts) {
                      playerAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
                    }
                    if (playerAtkRes.popupMessage) triggerPopup(playerAtkRes.popupMessage);
                  }

                  try { playSound('win'); } catch (_) {}
                  triggerAiDamageFx();
                  
                  // Unificazione atomica dei danni al Boss (evita race condition su setAiHp)
                  const totalAiDamage = calculatedDamage + reflectedDmg;
                  const nextAiHp = Math.max(0, aiHpRef.current - totalAiDamage);
                  aiHpRef.current = nextAiHp;
                  setAiHp(nextAiHp);

                  triggerFloatingText(`VITTORIA! -${calculatedDamage} HP [${duelRes.pCombo.name}]`, '#10b981', 'top-right');
                  triggerPopup(`DUELLO VINTO!\nTarget: ${convergenceTarget} • Tuo: ${Math.round(convergencePlayerT1Val * 10) / 10} (Δ${duelRes.deltaP}) vs Nemico: ${Math.round(aiFinalResult * 10) / 10} (Δ${duelRes.deltaAi})\nFigura: ${duelRes.pCombo.name} (-${calculatedDamage} HP)${duelRes.isBullseye ? ' • BULLSEYE CENTRATO!' : ''}`);
                  onScoreSuccess(true, calculatedDamage);
                }

                // --- VITTORIA NEMICO ---
                else if (duelRes.winner === 'ai') {
                  let aiDmg = calculatedDamage;
                  const flatDef = playerTraitsRef.current.find(t => t.type === 'flat_defense');
                  if (flatDef) aiDmg = Math.max(1, aiDmg - (flatDef.reduction || 3));

                                    // Innesco meccaniche Boss per l'attacco dell'IA
                  if (isAdv) {
                    const bossAtkRes = onBossAttack({
                      planet: currentAdvPlanet,
                      level: currentAdvLevel,
                      rawDamage: aiDmg,
                      aiCards: ai5Cards,
                      playerHand: playerHandRef.current,
                      currentAiHp: aiHpRef.current,
                      playerHp: playerHpRef.current,
                      bombReactorCharge,
                      bombDamagePool,
                      bossPhase
                    });
                    aiDmg = bossAtkRes.finalDamage;
                    setBombReactorCharge(bossAtkRes.updatedBombReactorCharge);
                    setBombDamagePool(bossAtkRes.updatedBombDamagePool);

                    if (bossAtkRes.bossSelfHeal > 0) {
                      aiHpRef.current = Math.min(maxAiHpRef.current || 200, aiHpRef.current + bossAtkRes.bossSelfHeal);
                      setAiHp(aiHpRef.current);
                    }
                    if (bossAtkRes.bossSelfDamage > 0) {
                      aiHpRef.current = Math.max(1, aiHpRef.current - bossAtkRes.bossSelfDamage);
                      setAiHp(aiHpRef.current);
                    }
                    if (bossAtkRes.activatePlayerBurn) {
                      setPlayerTimeBurnActive(true);
                      setPlayerTimeBurnDps(bossAtkRes.burnDamagePerSecond || 2);
                      setIsBossImploding(false);
                    }
                    if (bossAtkRes.extraBossModuleCharge > 0) {
                      setAiAbilityMeter(prev => Math.min(12, prev + bossAtkRes.extraBossModuleCharge));
                    }
                    if (bossAtkRes.timeDrainSeconds > 0) {
                      setTimer(t => Math.max(5, t - bossAtkRes.timeDrainSeconds));
                    }
                    if (bossAtkRes.updatedPlayerHand) {
                      playerHandRef.current = bossAtkRes.updatedPlayerHand;
                      setPlayerHand(bossAtkRes.updatedPlayerHand);
                    }
                    if (bossAtkRes.floatingTexts) {
                      bossAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
                    }
                    if (bossAtkRes.popupMessage) triggerPopup(bossAtkRes.popupMessage);
                  }


                  if (mirrorShieldActiveRef.current) {
                    const reflectedDmg = Math.round(aiDmg * mirrorShieldMultiplierRef.current);
                    setMirrorShieldActive(false);
                    triggerAiDamageFx();
                    aiHpRef.current = Math.max(0, aiHpRef.current - reflectedDmg);
                    setAiHp(aiHpRef.current);
                    triggerFloatingText(`BARRIERA! -${reflectedDmg} HP AL NEMICO`, '#14b8a6', 'top-right');
                  } else {
                    try { playSound('plasma_damage'); } catch (_) {}
                    triggerPlayerDamageFx();
                    playerHpRef.current = Math.max(0, playerHpRef.current - aiDmg);
                    setPlayerHp(playerHpRef.current);
                    triggerFloatingText(`-${aiDmg} HP [${duelRes.aiCombo.name}]`, '#ef4444', 'bottom-left');
                    triggerPopup(`DUELLO PERSO!\nTarget: ${convergenceTarget} • Tuo: ${Math.round(convergencePlayerT1Val * 10) / 10} (Δ${duelRes.deltaP}) vs Nemico: ${Math.round(aiFinalResult * 10) / 10} (Δ${duelRes.deltaAi})\nFigura Nemica: ${duelRes.aiCombo.name} (Subisci -${aiDmg} HP)`);
                    onScoreSuccess(false, aiDmg);
                  }
                }


                // --- PAREGGIO NULLO ---
                else {
                  try { playSound('click'); } catch (_) {}
                  triggerFloatingText("DUELLO IN PARITÀ", "#facc15", "bottom-left");
                  triggerPopup(`PARITÀ PERFETTA!\nEntrambi a Delta ${duelRes.deltaP} con la stessa figura: nessun danno.`);
                }

                                // Pulizia Banco & Ricarica integrale mani a 7 carte per il nuovo ciclo
                const sizeTrait = playerTraitsRef.current.find(t => t.type === 'hand_size_bonus');
                const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
                const refilledP = refillHandToTargetSize(playerHandRef.current, playerDeckRef.current, playerDiscardRef.current, targetSize);

                // Controllo e risoluzione fine round Boss (Giove P5: dispersione statica carte elettrizzate)
                if (isAdv) {
                  const roundEndRes = onBossRoundOrTurnEnd({
                    planet: currentAdvPlanet,
                    level: currentAdvLevel,
                    playerHand: refilledP.newHand
                  });
                  if (roundEndRes.selfDamage > 0) {
                    triggerPlayerDamageFx();
                    playerHpRef.current = Math.max(0, playerHpRef.current - roundEndRes.selfDamage);
                    setPlayerHp(playerHpRef.current);
                  }
                  if (roundEndRes.updatedPlayerHand) {
                    refilledP.newHand = roundEndRes.updatedPlayerHand;
                  }
                  if (roundEndRes.floatingTexts) {
                    roundEndRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
                  }
                  if (roundEndRes.popupMessage) triggerPopup(roundEndRes.popupMessage);
                }

                setPlayerHand(refilledP.newHand);
                setPlayerDeck(refilledP.newDeck);
                setPlayerDiscard(refilledP.newDiscard);


                const refilledAi = refillHandToTargetSize(remainingAi, aiDeckRef.current, aiDiscardRef.current, 7);
                setAiHand(refilledAi.newHand);
                setAiDeck(refilledAi.newDeck);
                setAiDiscard(refilledAi.newDiscard);

                // Nuova Carta Base e Target per il prossimo ciclo a 2 turni
                randomizeTurnParameters();
                setAiCardStates(Array(7).fill(''));
                setAiActionMessage("");
              } finally {
                aiTurnRunningRef.current = false;
                setTurn('player1');
              }
            }, Math.max(800, pacing.executeTime - pacing.firstTap));
          } catch (e) {
            aiTurnRunningRef.current = false;
            setTurn('player1');
          }
        }, pacing.firstTap);

        return;
      }

      aiTurnRunningRef.current = false;
      setTurn('player1');
      return;
    }


    // 4. MODALITÀ STANDARD (CLASSICA - BANCO COMUNE CONDIVISO)
    setAiActionMessage(isGhostMatch ? `Turno di ${pvpMeta?.opponent?.nickname || 'Avversario'}...` : "L'avversario osserva il banco comune...");
    setAiCardStates(Array(7).fill(''));

    safeAiTimeout(() => {
            // 1. L'IA cala fino a 3 carte dalla mano sul banco comune (riempie vuoti o sostituisce la peggiore)
      let curAiHand = [...aiHandRef.current];
      let curTable = [...tableSlotsRef.current];
      let overwrittenCards = [];
      const cardsToPlay = Math.min(3, curAiHand.length);

      for (let c = 0; c < cardsToPlay; c++) {
        if (curAiHand.length === 0) break;
        const cardToPlace = curAiHand.shift();

        // Cerca prima se esiste uno slot vuoto
        const emptyIdx = curTable.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          curTable[emptyIdx] = cardToPlace;
        } else {
          // Banco pieno (5/5): trova lo slot con la carta dal valore più basso da sacrificare
          let replaceIdx = 0;
          let minVal = 99;
          curTable.forEach((slotCard, idx) => {
            const val = Number(slotCard?.value) || 0;
            if (val < minVal) {
              minVal = val;
              replaceIdx = idx;
            }
          });

          // Sposta la carta scartata nella lista per gli scarti e piazza la nuova
          if (curTable[replaceIdx] !== null) {
            overwrittenCards.push(curTable[replaceIdx]);
          }
          curTable[replaceIdx] = cardToPlace;
        }
      }

      // Le carte sostituite sul banco vanno negli scarti dell'avversario
      if (overwrittenCards.length > 0) {
        const nextDisc = [...aiDiscardRef.current, ...overwrittenCards];
        aiDiscardRef.current = nextDisc;
        setAiDiscard(nextDisc);
      }

      setTableSlots(curTable);
      tableSlotsRef.current = curTable;
      setAiHand(curAiHand);
      aiHandRef.current = curAiHand;


      const nextStates = Array(7).fill('');
      nextStates[0] = 'ai-card-selected';
      nextStates[1] = 'ai-card-selected';
      setAiCardStates(nextStates);
      setAiActionMessage("L'avversario ha posato le sue carte sul banco...");
      try { playSound('card_slide'); } catch (_) {}
    }, pacing.firstTap);

    safeAiTimeout(() => {
      try {
        if (pacing.profile === 'timeout') {
          const timeoutPenalty = 5;
          triggerAiDamageFx();
          triggerFloatingText(`-5 HP (TEMPO SCADUTO)`, '#ef4444', 'top-right');
          setAiActionMessage(isGhostMatch ? `Tempo scaduto per ${pvpMeta?.opponent?.nickname || 'Avversario'} (-5 HP)` : "Tempo scaduto per l'avversario (-5 HP)");
          setAiHp(prev => Math.max(0, prev - timeoutPenalty));

          let curAiHand = [...aiHandRef.current];
          const refilled = refillHandToTargetSize(curAiHand, aiDeckRef.current, aiDiscardRef.current, 7);
          setAiHand(refilled.newHand);
          setAiDeck(refilled.newDeck);
          setAiDiscard(refilled.newDiscard);
          aiHandRef.current = refilled.newHand;
          aiDeckRef.current = refilled.newDeck;
          aiDiscardRef.current = refilled.newDiscard;

          safeSetTimeout(() => {
            setAiActionMessage("");
            setAiCardStates(Array(7).fill(''));
            aiTurnRunningRef.current = false;
            setTurn('player1');
          }, 900);
          return;
        }

        const adv = activeAdventureRef.current;
        const tc = tierConfigRef.current;
        const aiSuccessChance = isGhostMatch ? 0.75 : (adv ? adv.aiPower : (tc ? tc.aiPower : 0.65));
        const isSuccess = Math.random() < aiSuccessChance;

        if (pacing.profile === 'fast' || pacing.totalTime <= 12000) {
          checkAndTriggerTerrainCards('enemy_fast_turn', true);
        }

        if (isSuccess) {
          const nextStates = Array(7).fill('');
          [0, 1].forEach(idx => { nextStates[idx] = 'ai-card-attack-anim'; });
          setAiCardStates(nextStates);

          const opsPool = ['+', '-', '*', '/'];
          const executedOp = opsPool[Math.floor(Math.random() * opsPool.length)];
          let rawDamage = getAiDamageForCurrentLevel(executedOp);

          if (enemyPistonOverrideActive) {
            rawDamage = enemyPistonOverrideDamage;
            setEnemyPistonOverrideActive(false);
            triggerFloatingText("PISTONE ENCELADO 30 HP!", "#ef4444", "top-right");
          }

          if (mirrorShieldActiveRef.current) {
            const reflectedDamage = Math.round(rawDamage * mirrorShieldMultiplierRef.current);
            setMirrorShieldActive(false);
            triggerAiDamageFx();
            triggerFloatingText(`BARRIERA! -${reflectedDamage} HP AL NEMICO`, '#14b8a6', 'top-right');
            setAiActionMessage(`ATTACCO RIFLESSO! Subisce -${reflectedDamage} HP!`);
            setAiHp(prev => Math.max(0, prev - reflectedDamage));
            triggerPopup(`BARRIERA DIELETTRICA:\nDanno nemico annullato e riflesso (-${reflectedDamage} HP)!`);
          } else {
            let finalAiDmg = rawDamage;
            const shieldTrait = playerTraitsRef.current.find(t => t.type === 'first_hit_shield');
            if (shieldTrait && !hasUsedFirstHitShield) {
              finalAiDmg = Math.max(1, Math.round(rawDamage * (1 - (shieldTrait.reductionPct || 0.50))));
              setHasUsedFirstHitShield(true);
              triggerFloatingText(`SCUDO ANULARE (-50%)`, '#f59e0b', 'bottom-left');
            }

            setAiActionMessage(isGhostMatch ? `${pvpMeta?.opponent?.nickname || 'Avversario'} attacca!` : `L'avversario spara dal banco comune! (-${finalAiDmg} HP)`);
            try { playSound('plasma_damage'); } catch (_) {}
            triggerPlayerDamageFx();
            triggerFloatingText(`-${finalAiDmg} HP`, '#ef4444', 'bottom-left');

            checkAndTriggerTerrainCards('enemy_hit', true, { incomingDamage: finalAiDmg });
            if (finalAiDmg > 18) checkAndTriggerTerrainCards('heavy_damage', true, { incomingDamage: finalAiDmg });

            registerAiOp(executedOp);
            setAiAbilityMeter(prev => Math.min(12, prev + 4));

            const thornsTrait = playerTraitsRef.current.find(t => t.type === 'thorns_damage');
            if (thornsTrait) {
              triggerAiDamageFx();
              setAiHp(prev => Math.max(0, prev - (thornsTrait.value || 4)));
            }

            setPlayerHp(prev => Math.max(0, prev - finalAiDmg));
            if (onScoreSuccessRef.current) onScoreSuccessRef.current(false, finalAiDmg);
          }

          // L'IA consuma le carte usate per fare fuoco, le manda negli scarti e scarica le munizioni
          let tableAfterAi = [...tableSlotsRef.current];
          let removedCards = [];
          for (let i = 0; i < tableAfterAi.length && removedCards.length < 2; i++) {
            if (tableAfterAi[i] !== null) {
              removedCards.push(tableAfterAi[i]);
              tableAfterAi[i] = null;
            }
          }
          setTableSlots(tableAfterAi);
          tableSlotsRef.current = tableAfterAi;

          // Invia le carte usate agli scarti dell'IA per evitare memory leak
          const updatedAiDiscard = [...aiDiscardRef.current, ...removedCards];
          aiDiscardRef.current = updatedAiDiscard;
          setAiDiscard(updatedAiDiscard);

                              // Ricarica con le carte usate e consuma munizioni dell'IA in base all'arma specifica
          setAiWeaponTanks(prev => {
            const next = { ...prev };
            removedCards.forEach(c => {
              const s = getCardSuit(c);
              const val = Number(c?.value) || 0;
              if (s && next[s] !== undefined) {
                const wp = WEAPONS_DATABASE.find(w => w.suit === s);
                const cap = wp?.maxCapacity || wp?.maxSalvo || 10;
                next[s] = Math.min(cap, next[s] + val);
              }
            });
            removedCards.forEach(c => {
              const s = getCardSuit(c);
              const wp = WEAPONS_DATABASE.find(w => w.suit === s);
              if (wp && next[s] !== undefined) {
                const salvo = wp.maxSalvo || wp.maxCapacity || 10;
                next[s] = Math.max(0, next[s] - salvo);
              }
            });
            return next;
          });



          const refilled = refillHandToTargetSize(aiHandRef.current, aiDeckRef.current, updatedAiDiscard, 7);
          setAiHand(refilled.newHand);
          setAiDeck(refilled.newDeck);
          setAiDiscard(refilled.newDiscard);
          aiHandRef.current = refilled.newHand;
          aiDeckRef.current = refilled.newDeck;
          aiDiscardRef.current = refilled.newDiscard;

          if (checkDeckOutCondition(playerHandRef.current, playerDeckRef.current, playerDiscardRef.current, refilled.newHand, refilled.newDeck, refilled.newDiscard)) {
            aiTurnRunningRef.current = false;
            return;
          }
        } else {
          setAiActionMessage("Nessuna combinazione per il nemico. Le carte restano sul banco!");
          try { playSound('deselect'); } catch (_) {}

          const refilled = refillHandToTargetSize(aiHandRef.current, aiDeckRef.current, aiDiscardRef.current, 7);
          setAiHand(refilled.newHand);
          setAiDeck(refilled.newDeck);
          setAiDiscard(refilled.newDiscard);
          aiHandRef.current = refilled.newHand;
          aiDeckRef.current = refilled.newDeck;
          aiDiscardRef.current = refilled.newDiscard;
        }
      } catch (err) {
        console.warn("Errore turno avversario:", err);
      } finally {
        safeAiTimeout(() => {
          setAiActionMessage("");
          setAiCardStates(Array(7).fill(''));
          aiTurnRunningRef.current = false;
          setTurn('player1');
        }, 900);
      }
    }, pacing.executeTime);



  }, [turn, activeDiscoveryTutorial, isExchangeMode]);


  // GESTIONE SCARTO MANUALE SU PASSA TURNO & TIMEOUT
  const handleTimeOut = () => {
    checkAndTriggerTerrainCards('player_timeout', true);

    const hasRecoilHalved = playerTraits.some(t => t.type === 'recoil_halved');


    const penaltyDamage = hasRecoilHalved ? 3 : 5;
    triggerPlayerDamageFx();
    triggerFloatingText(`-${penaltyDamage} HP (TEMPO SCADUTO)`, '#ef4444', 'bottom-left');
    setResonanceStreak(0);
    setPlayerTimeBurnActive(false);
    setIsBossImploding(false);
    setIoDoubleAttackUsed(false);



    setPlayerHp(prev => Math.max(0, prev - penaltyDamage));


                let curHand = [...playerHandRef.current];
    let curDisc = [...playerDiscardRef.current];
    if (curHand.length > 0) {
      const dropped = curHand.shift();
      if (dropped && !dropped.isJoker && dropped.suit !== 'joker') {
        curDisc.push(dropped);

        // Tracciamento metallo Picche per P12 (Ganimede)
        if (getCardSuit(dropped) === 'spades') {
          playerSpadesAccumulatedRef.current += (Number(dropped?.value) || 0);
        }

                // P11 Idra (Cura) & P17 Haumea (Inerzia Centrifuga +35%)
        if (isAdv) {
          const passRes = onPlayerDiscardOrPass({
            planet: currentAdvPlanet,
            level: currentAdvLevel,
            discardedCard: dropped,
            currentAiHp: aiHpRef.current,
            maxPhaseHp: 130,
            centrifugalCharge
          });
          if (passRes.healedAmount > 0) setAiHp(passRes.newAiHp);
          setCentrifugalCharge(passRes.updatedCentrifugalCharge);
          passRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
          if (passRes.popupMessage) triggerPopup(passRes.popupMessage);
        }

      }
    }
    const drawBoostTrait = playerTraits.find(t => t.type === 'pass_draw_boost');

    const handSizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
    const targetSize = drawBoostTrait ? (7 + (drawBoostTrait.bonus || 1)) : (handSizeTrait ? (handSizeTrait.size || 8) : 7);
    const refilled = refillHandToTargetSize(curHand, playerDeckRef.current, curDisc, targetSize);
    playerHandRef.current = refilled.newHand;
    playerDeckRef.current = refilled.newDeck;
    playerDiscardRef.current = refilled.newDiscard;
    setPlayerHand(refilled.newHand);
    setPlayerDeck(refilled.newDeck);
    setPlayerDiscard(refilled.newDiscard);


            if (isDoubleStageMode) {
      if (convergenceSubStep === 1) setConvergenceSubStep(2);
      else if (convergenceSubStep === 3) setConvergenceSubStep(4);
    }


    setSelectedIndices([]);
    setSelectedTrisHandIndices([]);
    setVectorNucleus(null);
    setVectorHistorySuits([]);
    setVectorUsedCardsCount(0);
    setSelectedVectorCardIndex(null);
    setIsExchangeMode(false);
    setSelectedExchangeIndices([]);
    setIsSelectingDiscard(false);
    setIsOvertimeActive(false);

    if (isRealPvP && db && pvpMeta?.roomId) {

      update(ref(db, `rooms/${pvpMeta.roomId}`), {
        turn: pvpMeta.opponent.id,
        lastAction: { by: pvpMeta.myPlayerId, desc: "Tempo Scaduto - Turno ceduto", timestamp: Date.now() }
      });
    } else {
      setTurn('ai');
    }
  };

            // TIMER GIOCATORE CON CONSUMO SCANNER E SOCCORSO EMERGENZA (CONGELATO DURANTE IL FACE-OFF)
  useEffect(() => {
    if (winner || showReviveModal || turn !== 'player1' || activeDiscoveryTutorial || showFaceOff) return;

    // Se il pilota attivo rimuove il timer (Re del Ghiaccio), il tempo non scorre

    const pCheck = getPilotDamageMultiplier(effectivePlayerPilotId, effectivePlayerPilotLvl);
    if (pCheck.isTimerRemoved) return;

    
        const interval = setInterval(() => {

      setTurnTimeElapsed(t => t + 1);

      // P18 Eris: Fuoco residuo sul giocatore (2 HP/s) o Implosione Boss sul timer di riflessione (2 HP/s)
      if (isAdv && currentAdvPlanet === 18 && currentAdvLevel === 10) {
        if (playerTimeBurnActive) {
          triggerPlayerDamageFx();
          setPlayerHp(h => Math.max(0, h - playerTimeBurnDps));
          triggerFloatingText(`-${playerTimeBurnDps} HP (BRACE ERIS)`, '#f97316', 'bottom-left');
        }
        if (isBossImploding) {
          triggerAiDamageFx();
          setAiHp(h => Math.max(0, h - bossImplosionDps));
          triggerFloatingText(`-${bossImplosionDps} HP (IMPLOSIONE)`, '#f97316', 'top-right');
        }
      }

                        if (scannerMode === 'TANK_PAID' && isScannerActiveRef.current) {
        if (!scannerUsedThisTurn) setScannerUsedThisTurn(true);

        if (scannerSecondsRef.current <= 1) {
          isScannerActiveRef.current = false;
          setIsScannerActive(false);
          scannerSecondsRef.current = 0;
          if (typeof setScannerSeconds === 'function') setScannerSeconds(0);
          setPopupMsg("Serbatoio Scanner esaurito!");
        } else {
          scannerSecondsRef.current = Math.max(0, scannerSecondsRef.current - 1);
          if (typeof setScannerSeconds === 'function') setScannerSeconds(scannerSecondsRef.current);
        }
      }



      setTimer((prev) => {
        // Attivazione emergenza gratuita (<= 30s)
        if (scannerMode === 'FREE_EMERGENCY' && prev <= 31 && !isScannerActiveRef.current) {
          isScannerActiveRef.current = true;
          setTimeout(() => {
            setIsScannerActive(true);
            setScannerUsedThisTurn(true);
            triggerFloatingText("SOCCORSO GRATUITO ATTIVO", "#10b981", "bottom-left");
          }, 0);
        }

        if (prev > 1) {
          const next = prev - 1;
          if (next <= 20 && next > 10) {
            try { playSound('timer_warning'); } catch (_) {}
          } else if (next <= 10 && next > 0) {
            try { playSound('timer_critical'); } catch (_) {}
          }
          return next;
        }

        if (isEclipseStormActive) {
          setTimeout(() => {
            setIsEclipseStormActive(false);
            triggerPopup("Tempesta dell'Eclissi terminata!");
          }, 0);
          return getBaseTime();
        }

        if (playerTimeTankRef.current > 0) {
          setIsOvertimeActive(true);
          setPlayerTimeTank(t => Math.max(0, t - 1));
          return 0;
        }

        setTimeout(() => {
          const savedByTachyon = checkAndTriggerTerrainCards('timer_depleted', true);
          if (savedByTachyon) {
            setTimer(20);
          } else {
            handleTimeOut();
          }
        }, 0);

        return 0;
      });
    }, 1000);

        return () => clearInterval(interval);
  }, [turn, winner, showReviveModal, getBaseTime, isEclipseStormActive, activeDiscoveryTutorial, showFaceOff, checkAndTriggerTerrainCards]);



   



      const handleSelectObjective = (idx) => {
    try { playSound('click'); } catch (_) {}
    setSelectedObjectiveIndex(idx);
    if (isTrisMode && trisObjectives?.targets?.[idx]) {
      setTrisSelectedOp1(trisObjectives.targets[idx].op1 || '+');
      setTrisSelectedOp2(trisObjectives.targets[idx].op2 || '*');
    }
  };



  const handleApplyJokerVal = (chosenVal) => {
    if (jokerTargetIndex === null || !isEtherAllowed) return;
    const jokerDiscount = playerTraits.find(t => t.type === 'joker_cost_discount');
    const requiredEther = jokerDiscount ? Math.max(1, 2 - (jokerDiscount.discount || 1)) : 2;

    if (battleEther < requiredEther) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Etere insufficiente! Servono ${requiredEther} Etere.`);
      setJokerTargetIndex(null);
      return;
    }
    try { playSound('joker_activate'); } catch (_) {}
    setBattleEther(e => Math.max(0, e - requiredEther));
    if (typeof setEther === 'function') setEther(e => Math.max(0, e - requiredEther));

    playerTraits.forEach(t => {
      if (t.type === 'ether_spend_heal') {
        const healAmt = Math.round((maxPlayerHp || 50) * (t.healPct || 0.10));
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
        triggerFloatingText(`+${healAmt} HP (FONTE ETEREA)`, '#10b981', 'bottom-left');
      }
    });

    let displayVal = chosenVal.toString();
    if (chosenVal === 1) displayVal = 'A';
    if (chosenVal === 11) displayVal = 'J';
    if (chosenVal === 12) displayVal = 'Q';
    if (chosenVal === 13) displayVal = 'K';

    const newHand = [...playerHand];
    newHand[jokerTargetIndex] = {
      ...newHand[jokerTargetIndex],
      value: chosenVal,
      displayVal,
      isJoker: true,
      isTransformed: true,
      color: '#f0abfc',
      symbol: 'â˜…'
    };
    setPlayerHand(newHand);
    setJokerTargetIndex(null);
    triggerFloatingText(`JOLLY [${displayVal}]`, '#e879f9', 'bottom-left');
    triggerPopup(`Jolly impostato sul valore [${displayVal}]! (-${requiredEther} Etere)`);
  };

  const handleExecuteDeckExtract = (deckCardIndex) => {
    if (extractHandIndex === null || !playerDeck[deckCardIndex] || !isEtherAllowed) return;

    const hasFreeExtractTrait = playerTraits.some(t => t.type === 'first_extract_free');
    const isFree = hasFreeExtractTrait && !hasUsedFreeExtract;

    const extractDiscount = playerTraits.find(t => t.type === 'deck_extract_discount');
    const requiredEther = isFree ? 0 : (extractDiscount ? (extractDiscount.cost !== undefined ? extractDiscount.cost : 1) : 4);


    if (battleEther < requiredEther) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Etere insufficiente! Servono ${requiredEther} Etere.`);
      setShowDeckExtractModal(false);
      setExtractHandIndex(null);
      return;
    }
    try { playSound('ether_warp'); } catch (_) {}
    if (requiredEther > 0) {
      setBattleEther(e => Math.max(0, e - requiredEther));
      if (typeof setEther === 'function') setEther(e => Math.max(0, e - requiredEther));
    } else {
      setHasUsedFreeExtract(true);
      triggerFloatingText("PESCA GRATUITA (GIOVE)", "#10b981", "bottom-left");
    }

    const cardFromDeck = playerDeck[deckCardIndex];
    const cardFromHand = playerHand[extractHandIndex];

    const newHand = [...playerHand];
    newHand[extractHandIndex] = cardFromDeck;

    const newDeck = [...playerDeck];
    newDeck.splice(deckCardIndex, 1);
    if (cardFromHand && !cardFromHand.isJoker && cardFromHand.suit !== 'joker') {
      newDeck.push(cardFromHand);
    }

    setPlayerHand(newHand);
    setPlayerDeck(newDeck);
    setShowDeckExtractModal(false);
    setExtractHandIndex(null);
    triggerFloatingText(`PESCA DAL MAZZO`, '#00f2fe', 'bottom-left');
    triggerPopup(`Carta presa dal mazzo con successo! (-${requiredEther} Etere)`);
  };

        // GESTIONE CLICK CARTE IN MANO
  const handleCardClick = (cardIndex) => {
    if (winner || showReviveModal || playerSkipNextTurn) return;

    // 1. PRIORITÀ ASSOLUTA AL CAMBIO CARTE NEI TEMPI MORTI
    if (isExchangeMode) {
      if (selectedExchangeIndices.includes(cardIndex)) {
        try { playSound('deselect'); } catch (_) {}
        setSelectedExchangeIndices(prev => prev.filter(i => i !== cardIndex));
      } else {
        if (selectedExchangeIndices.length >= 3) {
          try { playSound('deselect'); } catch (_) {}
          triggerPopup('Puoi cambiare al massimo 3 carte!');
          return;
        }
        try { playSound('select'); } catch (_) {}
        setSelectedExchangeIndices(prev => [...prev, cardIndex]);
      }
      return;
    }

    // 2. Se è il turno nemico e NON stiamo cambiando carte, blocca l'input
    if (turn !== 'player1') return;

    const card = playerHand[cardIndex];
    if (!card) return;



    if (isSelectingDiscard) {
      try { playSound('card_slide'); } catch (_) {}
      let nextHand = [...playerHand];
      const sacrificed = nextHand.splice(cardIndex, 1)[0];
      let nextDiscard = [...playerDiscardRef.current];

      if (sacrificed && !sacrificed.isJoker && sacrificed.suit !== 'joker') {
        nextDiscard.push(sacrificed);
      }

            if (sacrificed?.id === playerGoldenCardId) {
        setPlayerGoldenCardId(null);
        setPlayerGoldenTurns(0);
      }

                                                  // Scarica di Risonanza Spettacolare (Disattivata a Livello 1, attiva dal Livello 2 in poi)
                    const isSector1 = isAdv && currentAdvPlanet === 1 && currentAdvLevel === 1;
          const discardVal = Number(sacrificed?.value) || 1;
          const discardSuit = getCardSuit(sacrificed);

                    // 1. RICARICA BALISTICA: alimenta il serbatoio dell'arma rispettando la capienza univoca della carta arma
          if (discardSuit && ['spades', 'hearts', 'diamonds', 'clubs'].includes(discardSuit)) {
            setWeaponTanks(prev => {
              const wp = WEAPONS_DATABASE.find(w => w.suit === discardSuit);
              const cap = wp?.maxCapacity || wp?.maxSalvo || 10;
              const cur = prev[discardSuit] || 0;
              return {
                ...prev,
                [discardSuit]: Math.min(cap, cur + discardVal)
              };
            });
            triggerFloatingText(`+${discardVal} 🎯 TANK ${discardSuit.toUpperCase()}`, '#facc15', 'bottom-left');
          }


          let enemyKilledByDiscard = false;

          if (!isSector1) {
            if (discardSuit === 'spades') {
              try { playSound('plasma_damage'); } catch (_) {}
              setActiveAbilityVfx('vfx-plasma-overlay');
              setShakeScreen(true);
              safeSetTimeout(() => { setActiveAbilityVfx(''); setShakeScreen(false); }, 400);
              triggerAiDamageFx();
              const remAiHp = Math.max(0, aiHpRef.current - discardVal);
              setAiHp(remAiHp);
              if (remAiHp <= 0) enemyKilledByDiscard = true;
              triggerFloatingText(`⚔️ SCARICA PICCHE: -${discardVal} HP!`, '#c084fc', 'top-right');
            } else if (discardSuit === 'hearts') {
              try { playSound('biotherapy'); } catch (_) {}
              setActiveAbilityVfx('vfx-heal-overlay');
              safeSetTimeout(() => setActiveAbilityVfx(''), 400);
              triggerPlayerHealFx();
              setPlayerHp(h => Math.min(maxPlayerHp || 50, h + discardVal));
              triggerFloatingText(`💖 IMPULSO VITALE: +${discardVal} HP!`, '#10b981', 'bottom-left');
            } else if (discardSuit === 'clubs') {
              try { playSound('suit_clubs'); } catch (_) {}
              setActiveAbilityVfx('vfx-timewarp-overlay');
              safeSetTimeout(() => setActiveAbilityVfx(''), 400);
              setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + discardVal));
              triggerFloatingText(`⏱️ SOVRACCARICO TEMPO: +${discardVal}s!`, '#00f2fe', 'bottom-left');
            } else if (discardSuit === 'diamonds') {
              try { playSound('dust_extract'); } catch (_) {}
              setActiveAbilityVfx('vfx-siphon-overlay');
              safeSetTimeout(() => setActiveAbilityVfx(''), 400);
              addStardustWithCap(discardVal);
              triggerFloatingText(`✨ SINTESI MATERIA: +${discardVal} 🌟!`, '#facc15', 'bottom-left');
            }
          }




      // Tracciamento metallo Picche per P12 (Ganimede)
      if (discardSuit === 'spades') {
        playerSpadesAccumulatedRef.current += discardVal;
      }


            // P11 Idra (Cura) & P17 Haumea (Inerzia Centrifuga +35%)
      if (isAdv) {
        const passRes = onPlayerDiscardOrPass({
          planet: currentAdvPlanet,
          level: currentAdvLevel,
          discardedCard: sacrificed,
          currentAiHp: aiHpRef.current,
          maxPhaseHp: 130,
          centrifugalCharge
        });
        if (passRes.healedAmount > 0) setAiHp(passRes.newAiHp);
        setCentrifugalCharge(passRes.updatedCentrifugalCharge);
        passRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
        if (passRes.popupMessage) triggerPopup(passRes.popupMessage);
      }


         let extraDraw = 0;

      // I bonus passivi di Cancro scattano SOLO se hai rinunciato all'attacco (Passa Turno reale)
      if (isTruePassTurn) {
        playerTraits.forEach(t => {
          if (t.type === 'pass_draw_boost') extraDraw += (t.bonus || 1);
          if (t.type === 'pass_heal_pct') {
            const healAmt = Math.round((maxPlayerHp || 50) * (t.bonusPct || 0.05));
            setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
            triggerFloatingText(`+${healAmt} HP (RIGENERAZIONE)`, '#10b981', 'bottom-left');
          }
        });
      }

               const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = (sizeTrait ? (sizeTrait.size || 8) : 7) + extraDraw;
      const refilled = refillHandToTargetSize(nextHand, playerDeckRef.current, nextDiscard, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);

            setIsSelectingDiscard(false);
      setIsTruePassTurn(false);

      // Avanzamento SubStep in Modalità Convergenza su scarto/passo turno
      if (isDoubleStageMode) {
        if (convergenceSubStep === 1) setConvergenceSubStep(2);
        else if (convergenceSubStep === 3) setConvergenceSubStep(4);
      }

      setSelectedIndices([]);
      setSelectedTrisHandIndices([]);
      setVectorNucleus(null);
      setVectorHistorySuits([]);
      setVectorUsedCardsCount(0);
      setSelectedVectorCardIndex(null);

      triggerFloatingText(`SCARTATA [${sacrificed?.displayVal || sacrificed?.value}]`, '#ef4444', 'bottom-left');


      // Verifica immediata: se dopo la pesca il giocatore rimane a <= 5 carte senza riserve, chiude subito la partita
      if (checkDeckOutCondition(refilled.newHand, refilled.newDeck, refilled.newDiscard, aiHandRef.current, aiDeckRef.current, aiDiscardRef.current)) {
        return;
      }


      triggerPopup(`Carta [${sacrificed?.displayVal || sacrificed?.value}] sacrificata. Turno ceduto all'avversario!`);


            if (enemyKilledByDiscard) {
        return;
      }

      if (isRealPvP && db && pvpMeta?.roomId) {
        update(ref(db, `rooms/${pvpMeta.roomId}`), {
          turn: pvpMeta.opponent.id,
          lastAction: { by: pvpMeta.myPlayerId, desc: `Scartata ${sacrificed?.displayVal || sacrificed?.value}`, timestamp: Date.now() }
        });
      } else {
        setTurn('ai');
      }
      return;

    }

    if (card.isJoker && !card.isTransformed && !isExchangeMode) {
      if (!isEtherAllowed) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup("Il Jolly Quantico richiede lo sblocco dell'Etere Cosmico (Settore 15+ dell'Avventura)!");
        return;
      }
      const jokerDiscount = playerTraits.find(t => t.type === 'joker_cost_discount');
      const reqEth = jokerDiscount ? Math.max(1, 2 - (jokerDiscount.discount || 1)) : 2;
      if (battleEther < reqEth) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Jolly Quantico: servono almeno ${reqEth} Etere per scegliere il valore!`);
        return;
      }
      try { playSound('click'); } catch (_) {}
      setJokerTargetIndex(cardIndex);
      return;
    }

    if (isExchangeMode) {
      if (selectedExchangeIndices.includes(cardIndex)) {
        try { playSound('deselect'); } catch (_) {}
        setSelectedExchangeIndices(prev => prev.filter(i => i !== cardIndex));
      } else {
        if (selectedExchangeIndices.length >= 3) {
          try { playSound('deselect'); } catch (_) {}
          triggerPopup('Puoi cambiare al massimo 3 carte!');
          return;
        }
        try { playSound('select'); } catch (_) {}
        setSelectedExchangeIndices(prev => [...prev, cardIndex]);
      }
      return;
    }

     if (isTrisMode) {
      if (selectedTrisHandIndices.includes(cardIndex)) {
        try { playSound('deselect'); } catch (_) {}
        setSelectedTrisHandIndices(prev => prev.filter(i => i !== cardIndex));
      } else {
        if (selectedTrisHandIndices.length >= 4) {
          try { playSound('deselect'); } catch (_) {}
          setSelectedTrisHandIndices([cardIndex]);
        } else {
          try { playSound('select'); } catch (_) {}
          setSelectedTrisHandIndices(prev => [...prev, cardIndex]);
        }
      }
      return;
    }


               if (isVectorMode) {
      const isVectorTutorialT2 = !isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true' && playerTurnsCountRef.current === 2;

      // Selezione per Poker a Parità (Turno 2 tutorial o se la stazione attiva è poker)
      if (isVectorTutorialT2 || vectorStation === 'poker') {
        if (selectedIndices.includes(cardIndex)) {
          try { playSound('deselect'); } catch (_) {}
          setSelectedIndices(prev => prev.filter(i => i !== cardIndex));
        } else {
          if (selectedIndices.length >= 5) {
            try { playSound('deselect'); } catch (_) {}
            triggerPopup("Massimo 5 carte per la combinazione Poker!");
            return;
          }
          try { playSound('select'); } catch (_) {}
          setSelectedIndices(prev => [...prev, cardIndex]);
        }
        return;
      }

      // Gestione Radar Nucleo
      if (vectorNucleus === null) {
        let cardVal = getCardEffectiveValue(card, activeAnomaly);

        try { playSound('select'); } catch (_) {}
        setVectorNucleus({ value: cardVal, suit: getCardSuit(card), symbol: card.symbol, color: card.color, glow: card.glow });
        setVectorHistorySuits(prev => [...prev, card]);
        setVectorUsedCardsCount(1);
        setSelectedVectorCardIndex(null);

        const newHand = [...playerHand];
        newHand.splice(cardIndex, 1);
        setPlayerHand(newHand);

        triggerFloatingText(`NUCLEO ${cardVal}`, '#00f2fe', 'bottom-left');
        triggerPopup(`Primo valore impostato nel nucleo: ${cardVal}`);
      } else {
        if (selectedVectorCardIndex === cardIndex) {
          try { playSound('deselect'); } catch (_) {}
          setSelectedVectorCardIndex(null);
        } else {
          try { playSound('select'); } catch (_) {}
          setSelectedVectorCardIndex(cardIndex);
        }
      }
      return;
    }


       if (isDoubleStageMode) {
      if (selectedIndices.includes(cardIndex)) {
        try { playSound('deselect'); } catch (_) {}
        const nextIndices = selectedIndices.filter(i => i !== cardIndex);
        setSelectedIndices(nextIndices);
        broadcastLiveSelection(nextIndices);
      } else {
        // In Modalità Convergenza servono sempre 2 carte sia in T1 che in T2
        const requiredLimit = 2;
        if (selectedIndices.length >= requiredLimit) {
          try { playSound('deselect'); } catch (_) {}
          setSelectedIndices([cardIndex]);
          broadcastLiveSelection([cardIndex]);
        } else {
          try { playSound('select'); } catch (_) {}
          const nextIndices = [...selectedIndices, cardIndex];
          setSelectedIndices(nextIndices);
          broadcastLiveSelection(nextIndices);
        }
      }
      return;
    }


        // Il controllo anomalie operatore della classica viene gestito autonomamente da ClassicBattleView



        if (selectedIndices.includes(cardIndex)) {
      try { playSound('deselect'); } catch (_) {}
      setHasDeselectedThisTurn(true);
      const nextIndices = selectedIndices.filter(i => i !== cardIndex);
      setSelectedIndices(nextIndices);
      broadcastLiveSelection(nextIndices);
       } else {
      if (selectedIndices.length >= 5) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup("Massimo 5 carte per combinazione sul banco!");
        return;
      }
      try { playSound('select'); } catch (_) {}
      const nextIndices = [...selectedIndices, cardIndex];
      setSelectedIndices(nextIndices);
      broadcastLiveSelection(nextIndices);
    }


  };

              const handlePassTurn = () => {
    if (turn !== 'player1' || isSelectingDiscard || playerSkipNextTurn) return;

    setResonanceStreak(0);
    setPlayerTimeBurnActive(false);
    setIsBossImploding(false);
    setIoDoubleAttackUsed(false);
    checkAndTriggerTerrainCards('pass_turn', true);
    checkAndTriggerTerrainCards('hand_stagnation', true);
    try { playSound('click'); } catch (_) {}

    // Se la mano è già vuota, ripesca direttamente a 7 e passa
    if (playerHand.length === 0) {
      let extraDraw = 0;
      playerTraits.forEach(t => {
        if (t.type === 'pass_draw_boost') extraDraw += (t.bonus || 1);
        if (t.type === 'pass_heal_pct') {
          const healAmt = Math.round((maxPlayerHp || 50) * (t.bonusPct || 0.05));
          setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
          triggerFloatingText(`+${healAmt} HP (RIGENERAZIONE)`, '#10b981', 'bottom-left');
        }
      });

      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = (sizeTrait ? (sizeTrait.size || 8) : 7) + extraDraw;
      const refilled = refillHandToTargetSize([], playerDeckRef.current, playerDiscardRef.current, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);

      triggerPopup("Mano vuota: ripescaggio completato e turno ceduto.");
      setTurn('ai');
      return;
    }

    // Attiva la fase di Scarica / Scarto prima di passare
    setIsTruePassTurn(true);
    setIsSelectingDiscard(true);
    triggerPopup("PASSA TURNO!\n⚡ SCARICA: tocca 1 carta in mano per sacrificare il suo seme!");
  };





  const confirmCardExchange = () => {
    const count = selectedExchangeIndices.length;
    if (count === 0) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup('Seleziona da 1 a 3 carte da cambiare!');
      return;
    }

    const noEnemyHeal = playerTraits.some(t => t.type === 'exchange_no_enemy_heal');
    const noTimeLoss = playerTraits.some(t => t.type === 'free_exchange_time');
    const noSelfDmg = playerTraits.some(t => t.type === 'free_exchange_no_self_dmg');

    const penaltyDetails = [];
    if (count >= 1 && !noEnemyHeal) {
      setAiHp(prev => Math.min(maxAiHp || 50, prev + 3));
      penaltyDetails.push("+3 HP Nemico");
    }
             if (count >= 2 && !noTimeLoss) {
           setPlayerTimeTank(prev => Math.max(0, prev - 3));
           penaltyDetails.push("-3s Serbatoio Tempo");
         }

     if (count >= 3 && !noSelfDmg) {
      triggerPlayerDamageFx();
      setPlayerHp(prev => Math.max(0, prev - 3));
      penaltyDetails.push("-3 Tuoi HP");
    }


    playerTraits.forEach(t => {
      if (t.type === 'exchange_heal_pct') {
        const healAmt = Math.round((maxPlayerHp || 50) * (t.bonusPct || 0.05));
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
        triggerFloatingText(`+${healAmt} HP (GRAZIA)`, '#10b981', 'bottom-left');
      }
    });

        try { playSound('card_slide'); } catch (_) {}
    let curDiscard = [...playerDiscardRef.current], newHand = [...playerHandRef.current];
    [...selectedExchangeIndices].sort((a, b) => b - a).forEach(idx => {
      const cardToExchange = newHand[idx];
      if (cardToExchange) {
        if (cardToExchange.id === playerGoldenCardId) {
          setPlayerGoldenCardId(null);
          setPlayerGoldenTurns(0);
        }
        newHand.splice(idx, 1);
        if (!cardToExchange.isJoker && cardToExchange.suit !== 'joker') {
          curDiscard.push(cardToExchange);
        }
      }
    });

    const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
    const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
    const refilled = refillHandToTargetSize(newHand, playerDeckRef.current, curDiscard, targetSize);
    playerHandRef.current = refilled.newHand;
    playerDeckRef.current = refilled.newDeck;
    playerDiscardRef.current = refilled.newDiscard;
    setPlayerHand(refilled.newHand);
    setPlayerDeck(refilled.newDeck);
    setPlayerDiscard(refilled.newDiscard);

        setDowntimeExchangesLeft(prev => Math.max(0, prev - 1));
    setIsExchangeMode(false);
    setSelectedExchangeIndices([]);
    if (matchStatsRef.current) {
      matchStatsRef.current.exchangesUsed += count;
    }

    triggerFloatingText(`CAMBIATE (${count})`, '#f59e0b', 'bottom-left');
    triggerPopup(`Cambiate ${count} carte nei tempi morti. (${downtimeExchangesLeft - 1} cambi rimasti)\n${penaltyDetails.length > 0 ? `Penalità: ${penaltyDetails.join(' + ')}` : 'Manovra Gratuita!'}`);
  };


            const handleOpenExchangeMode = useCallback((initialCardIdx = null) => {
    if (downtimeExchangesLeft <= 0) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup('Hai già esaurito i 2 cambi per questo turno nemico!');
      return;
    }

    try { playSound('click'); } catch (_) {}
    setIsSelectingDiscard(false);
    setSelectedIndices([]);
    setSelectedTrisHandIndices([]);
    setSelectedVectorCardIndex(null);
    setSelectedExchangeIndices(initialCardIdx !== null ? [initialCardIdx] : []);
    setIsExchangeMode(true);
  }, [downtimeExchangesLeft, triggerPopup]);



  const handleCancelExchangeMode = useCallback(() => {
    try { playSound('deselect'); } catch (_) {}
    setSelectedExchangeIndices([]);
    setIsExchangeMode(false);
  }, []);




    // Valuta il Colpo Rapido (primi 15s senza aiuti) e ricarica +3s di tempo
  const applyLightningStrikeAndMerit = useCallback((damage) => {
    let finalDmg = damage;
    const isLightning = (turnTimeElapsed <= SCANNER_MERIT_WINDOW_SECONDS) && !scannerUsedThisTurn && !isScannerActiveRef.current;

    if (isLightning) {
      finalDmg = Math.round(finalDmg * 1.3);
      if (matchStatsRef.current) {
        matchStatsRef.current.fastStrikesCount = (matchStatsRef.current.fastStrikesCount || 0) + 1;
      }
      triggerFloatingText("⚡ VELOCISSIMO! DANNO x1.3", "#facc15", "top-right");

      if (typeof setScannerSeconds === 'function') {
        setScannerSeconds(prev => Math.min(SCANNER_TANK_MAX, prev + SCANNER_MERIT_REFILL_SECONDS));
        triggerFloatingText("+3s DI TEMPO EXTRA!", "#38bdf8", "bottom-left");
      }
    }

    return finalDmg;
  }, [turnTimeElapsed, scannerUsedThisTurn, setScannerSeconds, triggerFloatingText]);

   // Verifica ed esecuzione del disinnesco trasversale della Bomba (somma prime 2 carte)
  const checkTransverseVectorBombDisarm = useCallback((cards) => {
    if (!isBombAllowed || !vectorBombDataRef.current || cards.length < 2) return 0;
    const v1 = Number(cards[0]?.value) || 0;
    const v2 = Number(cards[1]?.value) || 0;
    const requiredTarget = vectorBombDataRef.current.target;

    if (v1 + v2 === requiredTarget) {
      try { playSound('convergenza'); } catch (_) {}
      triggerFloatingText(`💥 BOMBA DISINNESCATA! (${v1}+${v2}=${requiredTarget}) +30 HP!`, '#10b981', 'top-right');
      triggerPopup(`💥 NUCLEO INSTABILE DISINNESCATO!\nLa combinazione iniziale ${v1} + ${v2} = ${requiredTarget} inverte la testata contro il Boss (+30 HP al colpo)!`);
      
      // Reset contatore bomba e predisposizione per il ciclo successivo (3T)
      const nextBomb = generateVectorBombTarget((currentAdvPlanet - 1) * 10 + currentAdvLevel);
      vectorBombDataRef.current = nextBomb;
      setVectorBombData(nextBomb);
      vectorBombCountdownRef.current = 3;
      setVectorBombCountdown(3);
      return 30; // Bonus secco di +30 HP applicato al colpo del turno
    }
    return 0;
  }, [isBombAllowed, currentAdvPlanet, currentAdvLevel, triggerFloatingText, triggerPopup]);


    // Esecuzione Attacco Stazione 2 (Poker a Parità)
  const playVectorPokerAttack = useCallback(async (cardsOverride = null) => {
    if (turn !== 'player1' || winner || showReviveModal || playerSkipNextTurn) return;

    let chosenCards = [];
    let chosenIndices = [];

    if (Array.isArray(cardsOverride) && cardsOverride.length >= 2) {
      if (typeof cardsOverride[0] === 'number') {
        chosenIndices = cardsOverride;
        chosenCards = cardsOverride.map(idx => playerHand[idx]).filter(Boolean);
      } else {
        chosenCards = cardsOverride;
        chosenIndices = cardsOverride.map(c => playerHand.findIndex(h => h?.id === c?.id)).filter(i => i !== -1);
      }
    } else {
      chosenIndices = selectedIndices;
      chosenCards = selectedIndices.map(idx => playerHand[idx]).filter(Boolean);
    }

    if (chosenCards.length < 2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Seleziona da 2 a 5 carte per formare una figura poker conforme al filtro!");
      return;
    }

    const evalRes = evaluateVectorParityPoker(chosenCards, vectorParityFilter);

        if (!evalRes.isValid) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Attacco non valido!\n${evalRes.reason}`);
      return;
    }

        const equippedPokerWeapons = (equippedWeapons || []).slice(0, 2).map(wpId => 
      WEAPONS_DATABASE.find(w => w.id === wpId)
    ).filter(Boolean);

    const matchingPokerWeapon = equippedPokerWeapons.find(wp => {
      if (Array.isArray(wp.allowedPatterns)) return wp.allowedPatterns.includes(evalRes.combo.id);
      if (wp.pattern) return wp.pattern === evalRes.combo.id;
      if (wp.reqPattern) return wp.reqPattern === evalRes.combo.id;
      return false;
    });


    if (!matchingPokerWeapon) {
      try { playSound('deselect'); } catch (_) {}
      const allowedNames = equippedPokerWeapons.map(w => w.reqDescription || w.name).join(' o ');
      triggerPopup(`Figura [${evalRes.combo.name}] valida per la parità, ma non hai armi equipaggiate per spararla!\nArmi a bordo: ${allowedNames}`);
      return;
    }

    const pokerWeaponLvl = weaponsLevels?.[matchingPokerWeapon.id] || 1;
    const nominalWeaponDmg = matchingPokerWeapon.levels?.[pokerWeaponLvl]?.damage || matchingPokerWeapon.levels?.[1]?.damage || evalRes.damage;

    // 1. Verifica disinnesco trasversale bomba
    const bombBonus = checkTransverseVectorBombDisarm(chosenCards);


    // 2. Calcolo semi e bonus
    const suitBonus = evaluateSuitBonus(chosenCards, playerDeckObj.id, effectivePlayerDeckLevel, maxPlayerHp, playerGoldenCardId);
    if (suitBonus.hasGoldenCard) {
      setPlayerGoldenCardId(null);
      setPlayerGoldenTurns(0);
      triggerFloatingText("CARTA DORATA ATTIVATA!", "#facc15", "bottom-left");
    }

        // 3. Calcolo Danno Combinazione
    let riftBonusDamage = 0;
    let riftCritMultiplier = 1.0;
    let riftExtraDraw = 0;

    if (riftStateRef.current && riftStateRef.current.active) {
      const isSatisfied = verifyRiftSatisfied(
        riftStateRef.current,
        1,
        chosenCards,
        '+'
      );

      if (isSatisfied) {
        const riftResults = applyRiftBenefit(riftStateRef.current.benefit);
        riftBonusDamage = riftResults.bonusDamage;
        riftCritMultiplier = riftResults.critMultiplier;
        riftExtraDraw = riftResults.extraDraw;
        setRiftState(null);
        riftStateRef.current = null;
      }
    }

        let baseDmg = nominalWeaponDmg + bombBonus + riftBonusDamage;

    if (pistonOverrideActive) {
      baseDmg = pistonOverrideDamage + bombBonus + riftBonusDamage;
      setPistonOverrideActive(false);
    }


    const pilotScaling = getPilotDamageMultiplier(
      effectivePlayerPilotId,
      effectivePlayerPilotLvl,
      [],
      turnTimeElapsed,
      { playedCards: chosenCards, hpPercentage: (playerHp / (maxPlayerHp || 50)) * 100 }
    );

        let totalDmg = Math.round(((baseDmg + pilotScaling.flat + suitBonus.extraDamage) * suitBonus.damageMultiplier * riftCritMultiplier) * (pilotDominance?.multiplier || 1.0));

    totalDmg = applyLightningStrikeAndMerit(totalDmg);

        // 4. Rimozione carte giocate
    let remainingHand = [...playerHand];
    [...chosenIndices].sort((a, b) => b - a).forEach(i => remainingHand.splice(i, 1));
    setSelectedIndices([]);
    setPlayerHand(remainingHand);
    playerHandRef.current = remainingHand;


    // 5. Juice & Audio Feedback
    try { playSound('convergenza'); } catch (_) {}
    triggerAiDamageFx();
    triggerFloatingText(`-${totalDmg} HP [${evalRes.combo.name}]`, evalRes.combo.color || '#facc15', 'top-right');
    triggerPopup(`POKER A PARITÀ CENTRATO!\n${evalRes.combo.name} (Somma: ${evalRes.sum} ${vectorParityFilter}) -> -${totalDmg} HP al nemico!`);

        const nextAiHp = Math.max(0, aiHp - totalDmg);
    setAiHp(nextAiHp);
    onScoreSuccess(true, totalDmg);

    // Chiusura definitiva del tutorial dopo l'attacco Poker del Turno 2
    if (!isPvP && gameMode !== 'pve' && localStorage.getItem('eclissi_vector_tutorial_done') !== 'true') {
      localStorage.setItem('eclissi_vector_tutorial_done', 'true');
      triggerPopup("🎯 ADDESTRAMENTO VETTORE COMPLETATO!\nOra sei libero di manovrare il radar e combinare figure.");
    }


    if (isRealPvP) {
      sendPvPAction(totalDmg, `Poker Parità: ${evalRes.combo.name} (${evalRes.sum})`);
    }

    // 6. Refill o passaggio alla fase scarica
    if (nextAiHp > 0 && !isEclipseStormActive) {
      setIsSelectingDiscard(true);
    } else {
      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
      const refilled = refillHandToTargetSize(remainingHand, playerDeckRef.current, playerDiscardRef.current, targetSize);
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
    }
  }, [turn, winner, showReviveModal, playerSkipNextTurn, selectedIndices, playerHand, vectorParityFilter, checkTransverseVectorBombDisarm, evaluateSuitBonus, playerDeckObj.id, effectivePlayerDeckLevel, maxPlayerHp, playerGoldenCardId, pistonOverrideActive, pistonOverrideDamage, effectivePlayerPilotId, effectivePlayerPilotLvl, turnTimeElapsed, playerHp, pilotDominance, applyLightningStrikeAndMerit, triggerAiDamageFx, triggerFloatingText, triggerPopup, aiHp, onScoreSuccess, isRealPvP, sendPvPAction, isEclipseStormActive, playerTraits, refillHandToTargetSize]);


  const executeVectorVictory = async (cardsUsed, updatedHandAfterHit = null, historySuits = vectorHistorySuits, weaponDamageOverride = null, firedWeaponObj = null) => {


    const suitBonus = evaluateSuitBonus(historySuits, playerDeckObj.id, effectivePlayerDeckLevel, maxPlayerHp, playerGoldenCardId);




          if (suitBonus.hasGoldenCard) {
      if (matchStatsRef.current) matchStatsRef.current.goldenOrComboCount += 1;
      setPlayerGoldenCardId(null);
      setPlayerGoldenTurns(0);
      triggerFloatingText("CARTA DORATA ATTIVATA!", "#facc15", "bottom-left");
      checkAndTriggerTerrainCards('golden_played', true);
    }

    if (suitBonus.isFourSuitsCombo && matchStatsRef.current) {
      matchStatsRef.current.goldenOrComboCount += 1;
    }
        if (cardsUsed <= 2 && matchStatsRef.current) {
      matchStatsRef.current.vectorMax2CardsHit = true;
    }
    if (matchStatsRef.current) {
      const hCount = historySuits.filter(c => getCardSuit(c) === 'hearts').length;
      matchStatsRef.current.heartsPlayed = (matchStatsRef.current.heartsPlayed || 0) + hCount;
    }






        const nextStreak = resonanceStreak + 1;
    setResonanceStreak(nextStreak);

        // Controllo disinnesco trasversale della Bomba se le prime 2 carte impiegate nel Nucleo ne fanno la somma
    const bombBonus = checkTransverseVectorBombDisarm(historySuits);

    let riftBonusDamage = 0;
    let riftCritMultiplier = 1.0;
    let riftExtraDraw = 0;

    if (riftStateRef.current && riftStateRef.current.active) {
      const isSatisfied = verifyRiftSatisfied(
        riftStateRef.current,
        0,
        historySuits,
        '+'
      );

      if (isSatisfied) {
        const riftResults = applyRiftBenefit(riftStateRef.current.benefit);
        riftBonusDamage = riftResults.bonusDamage;
        riftCritMultiplier = riftResults.critMultiplier;
        riftExtraDraw = riftResults.extraDraw;
        setRiftState(null);
        riftStateRef.current = null;
      }
    }




       // Striscia colpi attiva


    await new Promise(r => setTimeout(r, 50));

    if (suitBonus.heal > 0) {
      try { playSound('biotherapy'); } catch (_) {}
      triggerPlayerHealFx();
      triggerFloatingText(`+${suitBonus.heal} HP`, '#10b981', 'bottom-left');

      const overhealTrait = playerTraits.find(t => t.type === 'overheal_to_damage');
      if (overhealTrait && (playerHp + suitBonus.heal) > (maxPlayerHp || 50)) {
        const excess = (playerHp + suitBonus.heal) - (maxPlayerHp || 50);
        const bonusDmg = Math.round(excess * (overhealTrait.ratio || 0.5));
        if (bonusDmg > 0) {
          setAiHp(prev => Math.max(0, prev - bonusDmg));
          triggerFloatingText(`-${bonusDmg} HP (COLPO EXTRA VITA PIENA)`, '#ef4444', 'top-right');

        }
      }
      setPlayerHp(hp => Math.min(maxPlayerHp || 50, hp + suitBonus.heal));
    }
    if (suitBonus.dust > 0) {
      try { playSound('dust_extract'); } catch (_) {}
      triggerFloatingText(`+${suitBonus.dust} 🌟`, '#facc15', 'cascade-left');
      addStardustWithCap(suitBonus.dust);
    }
        if (suitBonus.bonusDiamonds > 0) {
      if (typeof setDiamonds === 'function') setDiamonds(d => d + suitBonus.bonusDiamonds);
      triggerFloatingText(`+${suitBonus.bonusDiamonds} 💎`, '#00f2fe', 'cascade-left');
      if (suitBonus.isFourSuitsCombo) {
        triggerPopup(`🌌 ALLINEAMENTO DEI 4 SEMI!\nBonus speciale: +${suitBonus.bonusDiamonds} Diamanti 💎 incassati!`);
      }
    }

    if (suitBonus.timeTankBonus > 0) {
      try { playSound('suit_clubs'); } catch (_) {}
      setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + suitBonus.timeTankBonus));
      triggerFloatingText(`+${suitBonus.timeTankBonus}s TEMPO`, '#34d399', 'cascade-left');
    }

                        let baseDamage = (weaponDamageOverride !== null ? weaponDamageOverride : getVectorCardDamage(cardsUsed)) + bombBonus;

    if (pistonOverrideActive) {

      baseDamage = pistonOverrideDamage;
      setPistonOverrideActive(false);
      triggerFloatingText(`PISTONE GRAVIMETRICO!`, '#ef4444', 'top-right');
    } else {
      playerTraits.forEach(trait => {
             if (trait.type === 'execute_damage' && (aiHp / (maxAiHp || 50)) <= (trait.threshold || 0.3)) baseDamage += (trait.bonus || 8);
        if (trait.type === 'first_try_boost' && !hasDeselectedThisTurn) baseDamage += (trait.bonus || 5);
                if (trait.type === 'court_card_damage' && historySuits.some(c => (c.value >= (trait.minVal || 9) || c.isCourt))) baseDamage += (trait.bonus || 4);
        if (trait.type === 'joker_play_dmg' && historySuits.some(c => c.isJoker || c.suit === 'joker')) baseDamage += (trait.bonus || 5);

        if (trait.type === 'high_density_damage' && cardsUsed >= (trait.minCards || 3)) baseDamage += (trait.bonus || 6);
        if (trait.type === 'cards_count_flat_dmg' && cardsUsed >= (trait.minCards || 3)) baseDamage += (trait.bonus || 4);
        if (trait.type === 'low_hp_rage_dmg' && (playerHp / (maxPlayerHp || 50)) < (trait.thresholdPct || 0.5)) baseDamage += (trait.bonus || 6);

        if (trait.type === 'streak_damage_buildup') baseDamage += (trait.bonusPerHit || 3) * nextStreak;
        if (trait.type === 'speed_damage_boost' && timer >= (getBaseTime() - (trait.thresholdSeconds || 10))) baseDamage += (trait.bonus || 6);
        if (trait.type === 'armor_pierce') baseDamage += (trait.pierce || 3);
        if (trait.type === 'drain_enemy_tank') setAiTimeTank(t => Math.max(0, t - (trait.drainSeconds || 10)));
        if (trait.type === 'burn_damage_passive') setBurnRoundsRemaining(trait.duration || 2);
        if (trait.type === 'hit_siphon') {
          const sHp = trait.hp || 3;
          setPlayerHp(h => Math.min(maxPlayerHp || 50, h + sHp));
          triggerFloatingText(`+${sHp} HP (OSMOSI)`, '#10b981', 'bottom-left');
        }
        if (trait.type === 'ether_generation_on_hit' && isEtherAllowed) {
          const hitsNeeded = trait.hitsRequired || 1;
          const nextCounter = glieseHitCounter + 1;
          if (nextCounter >= hitsNeeded) {
            const ethAmt = trait.amount || 1;
            setBattleEther(e => Math.min(maxBattleEther, e + ethAmt));
            if (typeof setEther === 'function') setEther(e => Math.min(maxBattleEther, e + ethAmt));
            triggerFloatingText(`+${ethAmt} ETERE (LAGRANGE)`, '#0ea5e9', 'cascade-left');
            setGlieseHitCounter(0);
          } else {
            setGlieseHitCounter(nextCounter);
          }
        }
      });
    }

                   // Calcolo Danno Pilota in Modalit  Vettore
    const pilotScaling = getPilotDamageMultiplier(
      effectivePlayerPilotId,
      effectivePlayerPilotLvl,
      [],
      turnTimeElapsed,
      {
        playedCards: historySuits,
        hpPercentage: (playerHp / (maxPlayerHp || 50)) * 100
      }
    );

    // Effetti secondari del Pilota: cura, polvere stellare e taglio timer
    if (pilotScaling.healAmount > 0) {
      triggerPlayerHealFx();
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + pilotScaling.healAmount));
      triggerFloatingText(`+${pilotScaling.healAmount} HP (PILOTA)`, '#10b981', 'bottom-left');
    }
    if (pilotScaling.dustExtra > 0) {
      addStardustWithCap(pilotScaling.dustExtra);
      triggerFloatingText(`+${pilotScaling.dustExtra}  (PILOTA)`, '#facc15', 'cascade-left');
    }
    if (pilotScaling.enemyTimerDrain > 0) {
      setAiTimer(t => Math.max(5, t - pilotScaling.enemyTimerDrain));
      setAiTimeTank(t => Math.max(0, t - pilotScaling.enemyTimerDrain));
      triggerFloatingText(`-${pilotScaling.enemyTimerDrain}s TEMPO NEMICO (PILOTA)`, '#10b981', 'top-right');
    }

        let finalDamage = Math.round(((baseDamage + riftBonusDamage + pilotScaling.flat + suitBonus.extraDamage) * suitBonus.damageMultiplier * riftCritMultiplier) * (pilotDominance?.multiplier || 1.0));




        // Accumulo delle Picche giocate per Ganimede (P12)
    historySuits.forEach(c => {
      if (getCardSuit(c) === 'spades') {
        playerSpadesAccumulatedRef.current += (Number(c?.value) || 0);
      }
    });

    const martianCrit = playerTraits.find(t => t.type === 'streak_crit_trigger');
    if (martianCrit && nextStreak >= (martianCrit.hitsRequired || 3)) {
      finalDamage = Math.round(finalDamage * (martianCrit.critMult || 1.5));
      triggerFloatingText("COLPO CRITICO x1.5!", "#ef4444", "top-right");

    }

    // Applicazione Colpo Lampo x1.3 e Merito +3s
    finalDamage = applyLightningStrikeAndMerit(finalDamage);

    if (isAdv) {
      const pAtkRes = onPlayerAttack({
        planet: currentAdvPlanet,
        level: currentAdvLevel,
        baseDamage: finalDamage,
        usedCards: historySuits,
        turnNumber: playerTurnsCountRef.current,
        currentAiHp: aiHpRef.current,
        currentMagneticShield: aiMagneticShieldRef.current,
        playerSpadesAccumulated: playerSpadesAccumulatedRef.current,
        hasTriggeredMagneticShield: aiMagneticTriggeredRef.current
      });
      finalDamage = pAtkRes.finalDamage;
      aiMagneticShieldRef.current = pAtkRes.newMagneticShield;
      aiMagneticTriggeredRef.current = pAtkRes.magneticShieldTriggered;
      if (pAtkRes?.floatingTexts && Array.isArray(pAtkRes.floatingTexts)) {
        pAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
      }
      if (pAtkRes?.popupMessage) triggerPopup(pAtkRes.popupMessage);
    }

    if (matchStatsRef.current) {
      matchStatsRef.current.maxSingleHitDmg = Math.max(matchStatsRef.current.maxSingleHitDmg, finalDamage);
    }

    triggerJuiceFeedback({
      operator: '*',
      cards: historySuits,
      timeRemaining: timer,
      didDeselect: false,
      streak: nextStreak,
      damageDealt: finalDamage
    });


        const isBypassingShield = Boolean(pilotScaling.isPureDamage) && pilotDominance?.status !== 'ENEMY_DOMINANT';
    const nextAiHp = (enemyMirrorShieldActive && !isBypassingShield) ? aiHp : Math.max(0, aiHp - finalDamage);


    if (enemyMirrorShieldActive && !isBypassingShield) {
      const reflectedToPlayer = Math.round(finalDamage * enemyMirrorShieldMultiplier);
      setEnemyMirrorShieldActive(false);
      triggerPlayerDamageFx();
      setPlayerHp(hp => Math.max(0, hp - reflectedToPlayer));
      triggerFloatingText(`BARRIERA BOSS! -${reflectedToPlayer} HP A TE`, '#ef4444', 'bottom-left');
      triggerPopup(`COLPO RESPINTO!\nEncelado ha riflesso il tuo vettore x${enemyMirrorShieldMultiplier} (-${reflectedToPlayer} HP a te)!`);
    } else {
      if (enemyMirrorShieldActive && isBypassingShield) {
        triggerFloatingText("DIFESA NEMICA PERFORATA!", "#00f2fe", "top-right");
      }
      triggerAiDamageFx();
      setAiHp(nextAiHp);
      triggerFloatingText(`BERSAGLIO CENTRATO! -${finalDamage} HP`, '#c084fc', 'top-right');
    }

    setVectorNucleus(null);
    setVectorHistorySuits([]);
    setVectorUsedCardsCount(0);
    setSelectedVectorCardIndex(null);

    if (isRealPvP) {
      sendPvPAction(finalDamage, `Vettore Geometrico (${cardsUsed} carte)`);
    }

        onScoreSuccess(true, finalDamage);

    const currentHandAfterVector = updatedHandAfterHit !== null ? updatedHandAfterHit : playerHandRef.current;

    if (nextAiHp <= 0) {
      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
      const refilled = refillHandToTargetSize(currentHandAfterVector, playerDeckRef.current, playerDiscardRef.current, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
    } else if (currentHandAfterVector.length === 0) {
      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
      const refilled = refillHandToTargetSize([], playerDeckRef.current, playerDiscardRef.current, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
      setIsSelectingDiscard(false);
      triggerPopup(`BERSAGLIO CENTRATO (-${finalDamage} HP)!\nMano esaurita: pescate nuove carte e turno ceduto.`);
      if (isRealPvP && db && pvpMeta?.roomId) {
        update(ref(db, `rooms/${pvpMeta.roomId}`), {
          turn: pvpMeta.opponent.id,
          lastAction: { by: pvpMeta.myPlayerId, desc: `Vettore Centrato - Mano esaurita`, timestamp: Date.now() }
        });
      } else {
        setTurn('ai');
      }
    } else if (nextAiHp > 0 && !isEclipseStormActive) {

      setIsSelectingDiscard(true);
      triggerPopup(`BERSAGLIO RADAR CENTRATO (-${finalDamage} HP)!\n⚡ SCARICA: tocca 1 carta per liberare il potere del suo seme!`);

    } else {
      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
      const refilled = refillHandToTargetSize(currentHandAfterVector, playerDeckRef.current, playerDiscardRef.current, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
    }

  };


    const handleVectorOperation = (direction, cardIndexOverride = null) => {
    const cardIdx = cardIndexOverride !== null ? cardIndexOverride : selectedVectorCardIndex;
    if (winner || cardIdx === null || vectorNucleus === null || isExchangeMode || showReviveModal || turn !== 'player1') return;
    const card = playerHand[cardIdx];
    if (!card) return;
    let cardVal = getCardEffectiveValue(card, activeAnomaly);
    let nextVal = vectorNucleus.value, opSymbol = '+';
    if (direction === 'right') {
      opSymbol = '+';
      nextVal += cardVal;
    } else if (direction === 'left') {
      opSymbol = '*';
      nextVal *= cardVal;
    } else if (direction === 'up') {
      opSymbol = '-';
      nextVal -= cardVal;
    } else if (direction === 'down') {
      opSymbol = '/';
      nextVal = cardVal !== 0 ? nextVal / cardVal : nextVal;
    }
       const isHit = Math.abs(nextVal - vectorTarget) < 1e-5;

    if (isHit) {
      const equippedMathWeapons = (equippedWeapons || []).slice(2, 4).map(wpId => 
        WEAPONS_DATABASE.find(w => w.id === wpId)
      ).filter(Boolean);

      const matchingMathWeapon = equippedMathWeapons.find(wp => 
        (wp.mathOp || wp.op || wp.operator) === opSymbol
      );

      if (!matchingMathWeapon) {
        try { playSound('deselect'); } catch (_) {}
        const requiredOps = equippedMathWeapons.map(w => `[${w.mathOp || w.op || w.operator}] ${w.name}`).join(' o ');
        triggerPopup(`Target ${vectorTarget} raggiunto con [${opSymbol}], ma non hai armi montate con questo operatore!\nArmi Calcolo equipaggiate: ${requiredOps}`);
        return;
      }

      registerOp(opSymbol);
      try { playSound('card_slide'); } catch (_) {}

      const updatedHistory = [...vectorHistorySuits, card];
      const totalCardsUsed = vectorUsedCardsCount + 1;
      setVectorHistorySuits(updatedHistory);
      setVectorUsedCardsCount(totalCardsUsed);
      setVectorNucleus(prev => ({ ...prev, value: nextVal }));
      setSelectedVectorCardIndex(null);

      const newHand = [...playerHand];
      newHand.splice(cardIdx, 1);
      setPlayerHand(newHand);
      playerHandRef.current = newHand;

      triggerFloatingText(`${opSymbol} ${cardVal} ➔ ${nextVal}`, '#38bdf8', 'bottom-left');

      const mathWeaponLvl = weaponsLevels?.[matchingMathWeapon.id] || 1;
      const nominalMathDmg = matchingMathWeapon.levels?.[mathWeaponLvl]?.damage || matchingMathWeapon.levels?.[1]?.damage || 20;

      executeVectorVictory(totalCardsUsed, newHand, updatedHistory, nominalMathDmg, matchingMathWeapon);
      return;
    }

    registerOp(opSymbol);
    try { playSound('card_slide'); } catch (_) {}

    const updatedHistory = [...vectorHistorySuits, card];
    const totalCardsUsed = vectorUsedCardsCount + 1;
    setVectorHistorySuits(updatedHistory);
    setVectorUsedCardsCount(totalCardsUsed);
    setVectorNucleus(prev => ({ ...prev, value: nextVal }));
    setSelectedVectorCardIndex(null);

    const newHand = [...playerHand];
    newHand.splice(cardIdx, 1);
    setPlayerHand(newHand);
    playerHandRef.current = newHand;

    triggerFloatingText(`${opSymbol} ${cardVal} ➔ ${nextVal}`, '#38bdf8', 'bottom-left');


            };
  
    // Reset/Svuotamento Nucleo a costo zero: restituisce le carte caricate nella mano
    const handleResetVectorNucleus = useCallback(() => {
      if (turn !== 'player1' || vectorNucleus === null || winner) return;
      try { playSound('card_slide'); } catch (_) {}
      
      // Restituisce le carte caricate nel nucleo alla mano del giocatore
      setPlayerHand(prev => [...prev, ...vectorHistorySuits]);
      setVectorNucleus(null);
      setVectorHistorySuits([]);
      setVectorUsedCardsCount(0);
      setSelectedVectorCardIndex(null);
      triggerFloatingText("NUCLEO AZZERATO", "#94a3b8", "bottom-left");
    }, [turn, vectorNucleus, winner, vectorHistorySuits, triggerFloatingText]);
  
      const handleSelectDuelOp = (op) => {
    try { playSound('click'); } catch (_) {}
    setConvergenceOp1(op);
  };



    // ESECUZIONE FORMULE MODALITÀ CONVERGENZA: STRUTTURA 2 + 2 CON BANCO COMUNE
  const playConvergenceExpression = () => {
    if (turn !== 'player1' || winner || showReviveModal || playerSkipNextTurn) return;

    if (selectedIndices.length !== 2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Seleziona esattamente 2 carte per il ${convergenceTurn === 1 ? 'Turno 1 (Apertura)' : 'Turno 2 (Chiusura)'}!`);
      return;
    }

    const c1 = playerHand[selectedIndices[0]];
    const c2 = playerHand[selectedIndices[1]];
    if (!c1 || !c2) return;

    const op1 = convergenceOp1 || '+';
    const op2 = convergenceOp2 || '+';

    const evalStep = (vLeft, op, vRight) => {
      if (op === '+') return vLeft + vRight;
      if (op === '-') return vLeft - vRight;
      if (op === '*') return vLeft * vRight;
      if (op === '/') return vRight !== 0 ? vLeft / vRight : NaN;
      return NaN;
    };

    // --- TURNO 1: APERTURA (2 CARTE SU CARTA BASE) ---
    if (convergenceTurn === 1) {
      const vBase = getCardEffectiveValue(convergenceBaseCard, activeAnomaly);
      const v1 = getCardEffectiveValue(c1, activeAnomaly);
      const v2 = getCardEffectiveValue(c2, activeAnomaly);

      const s1 = evalStep(vBase, op1, v1);
      const t1Result = evalStep(s1, op2, v2);

      if (isNaN(t1Result)) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup("Calcolo non valido (divisione per zero o frazione indefinita)!");
        return;
      }

      registerOp(op1);
      registerOp(op2);
      try { playSound('card_slide'); } catch (_) {}

      setConvergencePlayerT1Val(t1Result);
      setConvergencePlayerTableCards([c1, c2]);

      // Verifica Disinnesco Bomba in Turno 1
      if (isBombAllowed && convergenceBombCountdownRef.current > 0 && convergenceBombDataRef.current) {
        if (Math.abs(t1Result - convergenceBombDataRef.current.target) < 1e-5) {
          resolveBombEffect(true, true);
          triggerFloatingText("💥 BOMBA DISINNESCATA IN T1!", "#10b981", "bottom-left");
        }
      }

      // Rimuove le 2 carte dalla mano e ripristina la mano a 7 carte per il Turno 2
      let newHand = [...playerHand];
      [...selectedIndices].sort((a, b) => b - a).forEach(i => newHand.splice(i, 1));
      const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
      const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
      const refilled = refillHandToTargetSize(newHand, playerDeckRef.current, playerDiscardRef.current, targetSize);
      playerHandRef.current = refilled.newHand;
      playerDeckRef.current = refilled.newDeck;
      playerDiscardRef.current = refilled.newDiscard;
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);

            setSelectedIndices([]);
      setConvergenceSubStep(2); // Cede il turno all'avversario per il suo T1
      triggerFloatingText(`PARZIALE T1: ${Math.round(t1Result * 10) / 10}`, '#00f2fe', 'bottom-left');
      triggerPopup(`Turno 1 concluso: Parziale ${Math.round(t1Result * 10) / 10}.\nMano ripristinata a 7 carte! Turno all'avversario per l'Apertura.`);

      // Sincronizzazione Firebase RTDB per PvP Online
      if (isRealPvP && db && pvpMeta?.roomId) {
        const isHost = pvpMeta.isHost;
        update(ref(db, `rooms/${pvpMeta.roomId}/convergenceState`), {
          [isHost ? 'p1T1' : 'p2T1']: t1Result,
          subStep: 2,
          turn: 1
        });
        update(ref(db, `rooms/${pvpMeta.roomId}`), {
          turn: pvpMeta.opponent.id
        });
      }

      setTurn('ai');
      return;
    }

    // --- TURNO 2: CHIUSURA E CONVERGENZA FINALE ---
    if (convergenceTurn === 2) {
      const v3 = getCardEffectiveValue(c1, activeAnomaly);
      const v4 = getCardEffectiveValue(c2, activeAnomaly);

      const s2 = evalStep(convergencePlayerT1Val, op1, v3);
      const finalResult = evalStep(s2, op2, v4);

      if (isNaN(finalResult)) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup("Calcolo finale non valido (divisione indefinita)!");
        return;
      }

      registerOp(op1);
      registerOp(op2);
      try { playSound('card_slide'); } catch (_) {}

      // Verifica Disinnesco Bomba in Turno 2
      if (isBombAllowed && convergenceBombCountdownRef.current > 0 && convergenceBombDataRef.current) {
        if (Math.abs(finalResult - convergenceBombDataRef.current.target) < 1e-5) {
          resolveBombEffect(true, true);
          triggerFloatingText("💥 BOMBA DISINNESCATA IN T2!", "#10b981", "bottom-left");
        }
      }

            // Imposta le 4 carte definitive del giocatore accanto alla Carta Base
      const all4PlayedCards = [...convergencePlayerTableCards, c1, c2];
      setConvergencePlayerTableCards(all4PlayedCards);

      let newHand = [...playerHand];
      [...selectedIndices].sort((a, b) => b - a).forEach(i => newHand.splice(i, 1));
      setSelectedIndices([]);
      setPlayerHand(newHand);
      playerHandRef.current = newHand;

      setConvergencePlayerT1Val(finalResult); // Memorizza il valore finale per il confronto

      setConvergenceSubStep(4); // L'IA formula la sua chiusura, poi si risolve il duello
      triggerFloatingText(`FINALE: ${Math.round(finalResult * 10) / 10}`, '#10b981', 'bottom-left');
      triggerPopup(`Turno 2 completato: Risultato Finale ${Math.round(finalResult * 10) / 10}!\nIn attesa della mossa di chiusura avversaria.`);

           // Sincronizzazione Firebase RTDB per PvP Online
      if (isRealPvP && db && pvpMeta?.roomId) {
        const isHost = pvpMeta.isHost;
        update(ref(db, `rooms/${pvpMeta.roomId}/convergenceState`), {
          [isHost ? 'p1Final' : 'p2Final']: finalResult,
          subStep: 4,
          turn: 2
        });
        update(ref(db, `rooms/${pvpMeta.roomId}`), {
          turn: pvpMeta.opponent.id
        });
      }

      setTurn('ai');
    }
  };

  // Alias per retrocompatibilità pulsante
  const playDoubleStageExpression = playConvergenceExpression;



    // RISOLUZIONE TRIS STELLARE A 5 CARTE CON DOPPIA ESPLOSIONE SEQUENZIALE
  const handleSelectTrisOp1 = (op) => {
    try { playSound('click'); } catch (_) {}
    setTrisSelectedOp1(op);
  };

  const handleSelectTrisOp2 = (op) => {
    // Op2 fisso a [+] per la somma progressiva delle carte 3, 4, 5
    try { playSound('click'); } catch (_) {}
  };

  const playTrisStellareExpression = async () => {
    if (turn !== 'player1' || winner || showReviveModal || playerSkipNextTurn) return;
    if (selectedTrisHandIndices.length !== 4) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Formula incompleta! Devi selezionare esattamente 4 carte dalla tua mano.");
      return;
    }

    const tableCard = trisObjectives.tableCard;
    const handCards = selectedTrisHandIndices.map(idx => playerHand[idx]);
    const activeTargetObj = trisObjectives.targets 
      ? (trisObjectives.targets[selectedObjectiveIndex] || trisObjectives.targets[0]) 
      : { target: trisObjectives.target, isParity: false, isBomb: false };

    const chosenOp1 = trisSelectedOp1 || '+';

    // Auto-permutazione: verifica se una qualsiasi delle 4 carte usata come C2 valida la formula
    let trisResult = null;
    for (let i = 0; i < 4; i++) {
      const c2Candidate = handCards[i];
      const others = handCards.filter((_, idx) => idx !== i);
      const res = evaluateTrisStellare(tableCard, c2Candidate, others[0], others[1], others[2], chosenOp1, activeTargetObj, activeAnomaly);
      if (res.isValid) {
        trisResult = res;
        break;
      }
    }

    if (!trisResult || !trisResult.isValid) {
      try { playSound('deselect'); } catch (_) {}
      const targetDesc = activeTargetObj.isParity 
        ? `Richiesta: ${activeTargetObj.parityType}` 
        : `Target richiesto: ${activeTargetObj.target}`;
      triggerPopup(`Incastro non valido con l'operatore [${chosenOp1}].\n${targetDesc}`);
      return;
    }

    registerOp(chosenOp1);

    if (activeTargetObj.isBomb) {
      resolveBombEffect(true, true);
    }

    const usedTrisCards = [tableCard, ...handCards];
    const suitBonus = evaluateSuitBonus(usedTrisCards, playerDeckObj.id, effectivePlayerDeckLevel, maxPlayerHp, playerGoldenCardId);

    if (suitBonus.hasGoldenCard) {
      if (matchStatsRef.current) matchStatsRef.current.goldenOrComboCount += 1;
      setPlayerGoldenCardId(null);
      setPlayerGoldenTurns(0);
      triggerFloatingText("CARTA DORATA ATTIVATA!", "#facc15", "bottom-left");
      checkAndTriggerTerrainCards('golden_played', true);
    }

    if (suitBonus.isFourSuitsCombo && matchStatsRef.current) {
      matchStatsRef.current.goldenOrComboCount += 1;
    }

    if (matchStatsRef.current) {
      const hCount = usedTrisCards.filter(c => getCardSuit(c) === 'hearts').length;
      matchStatsRef.current.heartsPlayed = (matchStatsRef.current.heartsPlayed || 0) + hCount;
      if (trisResult.combo?.type !== 'high_card') {
        matchStatsRef.current.trisPokerComboHit = true;
      }
    }

    const combo = trisResult.combo;
    setActiveTrisCombo(combo);

    const nextStreak = resonanceStreak + 1;
    setResonanceStreak(nextStreak);

    if (suitBonus.heal > 0) {
      try { playSound('biotherapy'); } catch (_) {}
      triggerPlayerHealFx();
      triggerFloatingText(`+${suitBonus.heal} HP`, '#10b981', 'bottom-left');
      setPlayerHp(hp => Math.min(maxPlayerHp || 50, hp + suitBonus.heal));
    }
    if (suitBonus.dust > 0) {
      try { playSound('dust_extract'); } catch (_) {}
      triggerFloatingText(`+${suitBonus.dust} 🌟`, '#facc15', 'cascade-left');
      addStardustWithCap(suitBonus.dust);
    }
    if (suitBonus.bonusDiamonds > 0) {
      if (typeof setDiamonds === 'function') setDiamonds(d => d + suitBonus.bonusDiamonds);
      triggerFloatingText(`+${suitBonus.bonusDiamonds} 💎`, '#00f2fe', 'cascade-left');
    }
    if (suitBonus.timeTankBonus > 0) {
      try { playSound('suit_clubs'); } catch (_) {}
      setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + suitBonus.timeTankBonus));
      triggerFloatingText(`+${suitBonus.timeTankBonus}s TEMPO`, '#34d399', 'cascade-left');
    }

            let rawMathDmg = trisResult.mathDamage;
    let rawPokerDmg = trisResult.pokerDamage;

    let riftBonusDamage = 0;
    let riftCritMultiplier = 1.0;
    let riftExtraDraw = 0;

    if (riftStateRef.current && riftStateRef.current.active) {
      const targetHit = selectedObjectiveIndex !== undefined ? selectedObjectiveIndex : riftStateRef.current.targetSlotIndex;
      const isSatisfied = verifyRiftSatisfied(
        riftStateRef.current,
        targetHit,
        usedTrisCards,
        chosenOp1
      );

      if (isSatisfied) {
        const riftResults = applyRiftBenefit(riftStateRef.current.benefit);
        riftBonusDamage = riftResults.bonusDamage;
        riftCritMultiplier = riftResults.critMultiplier;
        riftExtraDraw = riftResults.extraDraw;
        setRiftState(null);
        riftStateRef.current = null;
      }
    }

    if (pistonOverrideActive) {
      rawMathDmg = pistonOverrideDamage;
      setPistonOverrideActive(false);
      triggerFloatingText(`PISTONE GRAVIMETRICO!`, '#ef4444', 'top-right');
    }



    const activeNotchesCount = Object.values(playerNotches).filter(Boolean).length;
    const pilotScaling = getPilotDamageMultiplier(
      effectivePlayerPilotId,
      effectivePlayerPilotLvl,
      [chosenOp1],
      turnTimeElapsed,
      {
        playedCards: usedTrisCards,
        hpPercentage: (playerHp / (maxPlayerHp || 50)) * 100,
        quantumDiceNotches: activeNotchesCount,
        turnNumber: playerTurnsCountRef.current
      }
    );

        const domMult = pilotDominance?.multiplier || 1.0;
    let finalMathDmg = Math.round(((rawMathDmg + riftBonusDamage + pilotScaling.flat + suitBonus.extraDamage) * domMult) * riftCritMultiplier);
    let finalPokerDmg = Math.round(((rawPokerDmg * suitBonus.damageMultiplier) * domMult) * riftCritMultiplier);


       finalMathDmg = applyLightningStrikeAndMerit(finalMathDmg);

    if (isAdv) {
      const playerAtkRes = onPlayerAttack({
        planet: currentAdvPlanet,
        level: currentAdvLevel,
        baseDamage: finalMathDmg + finalPokerDmg,
        usedCards: handCards,
        turnNumber: playerTurnsCountRef.current,
        currentIonShield: aiIonShieldRef.current
      });
      aiIonShieldRef.current = playerAtkRes.newIonShield;

      if (playerAtkRes.floatingTexts) {
        playerAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
      }
      if (playerAtkRes.popupMessage) triggerPopup(playerAtkRes.popupMessage);

      if (playerAtkRes.reflectedToBoss > 0) {
        triggerAiDamageFx();
        setAiHp(prev => Math.max(0, prev - playerAtkRes.reflectedToBoss));
      }
      if (playerAtkRes.recoilDamage > 0) {
        triggerPlayerDamageFx();
        setPlayerHp(prev => Math.max(0, prev - playerAtkRes.recoilDamage));
      }

      const totalApproved = playerAtkRes.finalDamage;
      const sumDmg = finalMathDmg + finalPokerDmg;
      if (sumDmg > 0) {
        const ratio = totalApproved / sumDmg;
        finalMathDmg = Math.round(finalMathDmg * ratio);
        finalPokerDmg = Math.max(0, totalApproved - finalMathDmg);
      } else {
        finalMathDmg = 0;
        finalPokerDmg = 0;
      }
    }

    if (matchStatsRef.current) {
      matchStatsRef.current.maxSingleHitDmg = Math.max(matchStatsRef.current.maxSingleHitDmg, finalMathDmg + finalPokerDmg);
    }


    // Rimuove subito le 4 carte usate dalla mano (ne restano 3)
    let remainingHand = [...playerHand];
    [...selectedTrisHandIndices].sort((a, b) => b - a).forEach(idx => remainingHand.splice(idx, 1));
    setSelectedTrisHandIndices([]);
    setPlayerHand(remainingHand);
    playerHandRef.current = remainingHand;

       // Calcolo perforazione scudo nemico
    const isBypassingShield = Boolean(pilotScaling.isPureDamage) && pilotDominance?.status !== 'ENEMY_DOMINANT';

    // ESPLOSIONE 1: IMPATTO OPERATORE (t = 0 ms)
    playSynthesizedOperatorSound(chosenOp1);
    setMicroShakeClass(getOperatorMicroShakeClass(chosenOp1));
    safeSetTimeout(() => setMicroShakeClass(''), 130);

    // Se il nemico ha la barriera attiva e il colpo non la fora, non subisce il danno al tempo 0
    if (!enemyMirrorShieldActive || isBypassingShield) {
      triggerAiDamageFx();
      triggerFloatingText(`-${finalMathDmg} HP [${chosenOp1}]`, '#00f2fe', 'top-right');
      setAiHp(prev => Math.max(1, prev - finalMathDmg));
    }

    // ESPLOSIONE 2: DETONAZIONE POKER (t = 350 ms)
    safeSetTimeout(() => {
      try { playSound('convergenza'); } catch (_) {}
      triggerAiDamageFx();
      setShakeScreen(true);
      safeSetTimeout(() => setShakeScreen(false), 350);

      triggerFloatingText(`-${finalPokerDmg} HP [${combo.name.toUpperCase()}]`, combo.color || '#facc15', 'top-right');

      // Gestione scudo riflettente di Encelado
      if (enemyMirrorShieldActive && !isBypassingShield) {
        const reflectedToPlayer = Math.round((finalMathDmg + finalPokerDmg) * enemyMirrorShieldMultiplier);
        setEnemyMirrorShieldActive(false);
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - reflectedToPlayer));
        triggerFloatingText(`BARRIERA BOSS! -${reflectedToPlayer} HP A TE`, '#ef4444', 'bottom-left');
        triggerPopup(`COLPO RESPINTO!\nIl nemico ha riflesso il tuo attacco (-${reflectedToPlayer} HP a te)!`);
      } else {
        const nextAiHp = Math.max(0, aiHpRef.current - finalPokerDmg);
        setAiHp(nextAiHp);

        onScoreSuccess(true, finalMathDmg + finalPokerDmg);

        if (isRealPvP) {
          sendPvPAction(finalMathDmg + finalPokerDmg, `Tris a 5 Carte (${chosenOp1} + ${combo.name})`);
        }

        // Se il nemico è vivo, si passa alla fase di scarica sulle 3 carte residue
        if (nextAiHp > 0 && !isEclipseStormActive) {
          setIsSelectingDiscard(true);
          triggerPopup(`DOPPIA ESPLOSIONE A SEGNO (-${finalMathDmg + finalPokerDmg} HP)!\n⚡ SCARICA: tocca 1 delle 3 carte rimaste per sacrificare il suo seme!`);
        } else {
          const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
          const targetSize = sizeTrait ? (sizeTrait.size || 8) : 7;
          const refilled = refillHandToTargetSize(remainingHand, playerDeckRef.current, playerDiscardRef.current, targetSize);
          playerHandRef.current = refilled.newHand;
          playerDeckRef.current = refilled.newDeck;
          playerDiscardRef.current = refilled.newDiscard;
          setPlayerHand(refilled.newHand);
          setPlayerDeck(refilled.newDeck);
          setPlayerDiscard(refilled.newDiscard);
        }
      }
    }, 350);
  };




      // GESTORE ATTACCO MODALITÀ CLASSICA (RICEVE IL COLPO DA ClassicBattleView)
  const handleClassicAttack = async (attackPayload) => {
    if (!attackPayload || turn !== 'player1' || winner || showReviveModal || playerSkipNextTurn) return;

    try {
                        const { resolvedObj, damage: baseDamageToAi, usedCards, targetIndex: attackedTargetIndex } = attackPayload;
      if (!usedCards || usedCards.length < 2 || usedCards.length > 5) return;




      let riftBonusDamage = 0;
      let riftCritMultiplier = 1.0;
      let riftExtraDraw = 0;

      if (riftStateRef.current && riftStateRef.current.active) {
        const targetHit = attackedTargetIndex !== undefined ? attackedTargetIndex : riftStateRef.current.targetSlotIndex;
        const isSatisfied = verifyRiftSatisfied(
          riftStateRef.current, 
          targetHit, 
          usedCards, 
          resolvedObj?.op
        );

        if (isSatisfied) {
          const riftResults = applyRiftBenefit(riftStateRef.current.benefit);
          riftBonusDamage = riftResults.bonusDamage;
          riftCritMultiplier = riftResults.critMultiplier;
          riftExtraDraw = riftResults.extraDraw;
          setRiftState(null);
          riftStateRef.current = null;
        }
      }




      if (resolvedObj?.op) {
        registerOp(resolvedObj.op);
        if (resolvedObj.op === '/') {
          setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + 4));
          triggerFloatingText("+4s DIVISIONE", '#34d399', 'cascade-left');
          checkAndTriggerTerrainCards('division_hit', true);
        }
      }

      if (resolvedObj?.isBomb) {
        resolveBombEffect(true, true);
        accumulateAbilityDamage('FULL', true);
        triggerFloatingText("MODULO 100% RICARICATO!", "#00f2fe", "bottom-left");
      }

      const isSector1 = isAdv && currentAdvPlanet === 1 && currentAdvLevel === 1;
      const suitBonus = evaluateSuitBonus(
        usedCards, 
        playerDeckObj.id, 
        effectivePlayerDeckLevel, 
        maxPlayerHp, 
        playerGoldenCardId, 
        isSector1
      );

      if (suitBonus?.hasGoldenCard) {
        if (matchStatsRef.current) matchStatsRef.current.goldenOrComboCount += 1;
        setPlayerGoldenCardId(null);
        setPlayerGoldenTurns(0);
        triggerFloatingText("CARTA DORATA ATTIVATA!", "#facc15", "bottom-left");
        checkAndTriggerTerrainCards('golden_played', true);
      }

      if (suitBonus?.isFourSuitsCombo && matchStatsRef.current) {
        matchStatsRef.current.goldenOrComboCount += 1;
      }

      if (matchStatsRef.current) {
        const hCount = (usedCards || []).filter(c => getCardSuit(c) === 'hearts').length;
        matchStatsRef.current.heartsPlayed = (matchStatsRef.current.heartsPlayed || 0) + hCount;
      }

      const nextStreak = resonanceStreak + 1;
      setResonanceStreak(nextStreak);

      const rawPilotMultiplier = (typeof getPilotDamageMultiplier === 'function')
        ? getPilotDamageMultiplier(
            effectivePlayerPilotId,
            effectivePlayerPilotLvl,
            resolvedObj?.op ? [resolvedObj.op] : [],
            turnTimeElapsed,
            {
              playedCards: usedCards,
              hpPercentage: (playerHp / (maxPlayerHp || 50)) * 100,
              isBombDisarmed: Boolean(resolvedObj?.isBomb)
            }
          )
        : null;

      const pilotScaling = rawPilotMultiplier || {
        flat: 0,
        multiplier: 1,
        heartHealMultiplier: 1.0,
        isPureDamage: false
      };

      const effectiveHeal = Math.round((suitBonus?.heal || 0) * (pilotScaling.heartHealMultiplier || 1.0));
      if (effectiveHeal > 0) {
        try { playSound('biotherapy'); } catch (_) {}
        triggerPlayerHealFx();
        setPlayerHp(hp => Math.min(maxPlayerHp || 50, hp + effectiveHeal));
        triggerFloatingText(`+${effectiveHeal} HP`, '#10b981', 'bottom-left');
      }

      if (suitBonus?.dust > 0) {
        try { playSound('dust_extract'); } catch (_) {}
        addStardustWithCap(suitBonus.dust);
        triggerFloatingText(`+${suitBonus.dust} 🌟`, '#facc15', 'cascade-left');
      }
      if (suitBonus?.bonusDiamonds > 0) {
        if (typeof setDiamonds === 'function') setDiamonds(d => d + suitBonus.bonusDiamonds);
        triggerFloatingText(`+${suitBonus.bonusDiamonds} 💎`, '#00f2fe', 'cascade-left');
      }
      if (suitBonus?.timeTankBonus > 0) {
        try { playSound('suit_clubs'); } catch (_) {}
        setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + suitBonus.timeTankBonus));
        triggerFloatingText(`+${suitBonus.timeTankBonus}s TEMPO`, '#34d399', 'cascade-left');
      }

            let finalDamage = Math.round(
        ((baseDamageToAi + riftBonusDamage + (pilotScaling.flat || 0) + (suitBonus?.extraDamage || 0)) * 
          (suitBonus?.damageMultiplier || 1) * 
          riftCritMultiplier) * 
        (pilotDominance?.multiplier || 1.0)
      );


      if (typeof applyLightningStrikeAndMerit === 'function') {
        finalDamage = applyLightningStrikeAndMerit(finalDamage);
      }

      if (isAdv && currentAdvLevel === 10 && typeof onPlayerAttack === 'function') {
        const pAtkRes = onPlayerAttack({
          planet: currentAdvPlanet,
          level: currentAdvLevel,
          baseDamage: finalDamage,
          usedCards,
          usedOperators: resolvedObj?.op ? [resolvedObj.op] : ['+'],
          turnNumber: playerTurnsCountRef.current,
          turnSeconds: turnTimeElapsed,
          currentIonShield: aiIonShieldRef.current,
          currentTitanArmor: aiTitanArmorRef.current,
          currentAiHp: aiHpRef.current,
          currentMagneticShield: aiMagneticShieldRef.current,
          playerSpadesAccumulated: playerSpadesAccumulatedRef.current,
          hasTriggeredMagneticShield: aiMagneticTriggeredRef.current,
          bossAbilityMeter: aiAbilityMeter,
          currentHarmonicBarrier: aiHarmonicBarrierRef.current,
          totalAttacksCount: totalAttacksCount + 1,
          playerHp: playerHpRef.current,
          centrifugalCharge,
          bossPhase,
          ioCycleTurn,
          ioMagmaPool,
          isBossImploding
        });

        if (pAtkRes?.finalDamage !== undefined) finalDamage = pAtkRes.finalDamage;
        if (pAtkRes?.floatingTexts) pAtkRes.floatingTexts.forEach(f => triggerFloatingText(f.text, f.color, f.position));
      }

      try {
        if (typeof triggerJuiceFeedback === 'function') {
          triggerJuiceFeedback({
            operator: resolvedObj?.type === 'pattern' ? 'pattern' : (resolvedObj?.op || '+'),
            patternName: resolvedObj?.name,
            cards: usedCards,
            timeRemaining: timer,
            didDeselect: hasDeselectedThisTurn,
            streak: nextStreak,
            damageDealt: finalDamage
          });
        }
      } catch (_) {}

      const isBypassingShield = Boolean(pilotScaling.isPureDamage) && pilotDominance?.status !== 'ENEMY_DOMINANT';
      const nextAiHp = (enemyMirrorShieldActive && !isBypassingShield) ? aiHp : Math.max(0, aiHp - finalDamage);

      if (enemyMirrorShieldActive && !isBypassingShield) {
        const reflected = Math.round(finalDamage * enemyMirrorShieldMultiplier);
        setEnemyMirrorShieldActive(false);
        triggerPlayerDamageFx();
        setPlayerHp(hp => Math.max(0, hp - reflected));
        triggerFloatingText(`BARRIERA BOSS! -${reflected} HP A TE`, '#ef4444', 'bottom-left');
      } else {
        triggerAiDamageFx();
        setAiHp(nextAiHp);
        triggerFloatingText(`-${finalDamage} HP`, '#ef4444', 'top-right');
      }

                 // Le carte usate per fare fuoco vanno nella pila degli scarti
      const updatedDiscard = [...playerDiscardRef.current, ...usedCards];
      playerDiscardRef.current = updatedDiscard;
      setPlayerDiscard(updatedDiscard);

      if (isRealPvP) {
        sendPvPAction(finalDamage, `Attacco Classica (-${finalDamage} HP)`);
      }

      onScoreSuccess(true, finalDamage);

                  // Se il nemico è vivo e abbiamo carte in mano, apre la fase di SCARICA / SCARTO
      if (nextAiHp > 0 && playerHandRef.current.length > 0) {
        setIsSelectingDiscard(true);
        triggerPopup(`ATTACCO A SEGNO (-${finalDamage} HP)!\n⚡ SCARICA: tocca 1 carta in mano per scartarla e ricaricare il serbatoio!`);
      } else {
        // Nemico sconfitto o mano vuota: rifilla e passa il turno
        const sizeTrait = playerTraits.find(t => t.type === 'hand_size_bonus');
        const targetSize = (sizeTrait ? (sizeTrait.size || 8) : 7) + riftExtraDraw;
        const refilled = refillHandToTargetSize(playerHandRef.current, playerDeckRef.current, updatedDiscard, targetSize);
        playerHandRef.current = refilled.newHand;
        playerDeckRef.current = refilled.newDeck;
        playerDiscardRef.current = refilled.newDiscard;
        setPlayerHand(refilled.newHand);
        setPlayerDeck(refilled.newDeck);
        setPlayerDiscard(refilled.newDiscard);

        setIsSelectingDiscard(false);

        if (checkDeckOutCondition(refilled.newHand, refilled.newDeck, refilled.newDiscard, aiHandRef.current, aiDeckRef.current, aiDiscardRef.current)) {
          return;
        }

        if (nextAiHp > 0) {
          setTurn('ai');
        }
      }






    } catch (err) {
      console.error("Errore critico durante l'attacco:", err);
      setIsSelectingDiscard(true);
    }
  };



// DISPATCHER UNIVERSALE ATTACCO (Indirizza alla modalità corretta)
const handleUniversalAttack = () => {
  if (isTrisMode) {
    playTrisStellareExpression();
  } else if (isVectorMode) {
    if (selectedIndices.length >= 2) {
      playVectorPokerAttack();
    } else if (selectedVectorCardIndex !== null && vectorNucleus !== null) {
      handleVectorOperation('right', selectedVectorCardIndex);
    } else {
      playVectorPokerAttack();
    }
  } else if (isDoubleStageMode) {
    playConvergenceExpression();
  }
};


// Fallback per chiamate dirette legacy
const playExpression = async (payload) => {
  handleClassicAttack(payload);
};

  // =========================================================================
  // GESTORE ATTIVAZIONE MODULO ABILITÃ€ IBRIDO DEL GIOCATORE (1 SOLO MODULO)
  // SCATENA SIMULTANEAMENTE TUTTI I LIVELLI (1â€“3, 4â€“6, 7â€“9) SBLOCCATI!
  // =========================================================================
  const handleManualSkillTrigger = () => {
    if (turn !== 'player1' || winner) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Puoi attivare il Modulo AbilitÃ  solo durante il tuo turno!");
      return;
    }

    if (playerDisabledAbilitiesTurns > 0) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Modulo abilitÃ  bloccato per ancora ${playerDisabledAbilitiesTurns} turni!`);
      return;
    }

    if (!isAbilityReady || !isAbilityModuleUnlocked) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Modulo abilitÃ  non ancora carico (richiede 100%)!");
      return;
    }

        const abId = effectivePlayerAbilityId;
    const currentPilotAllowedMax = getMaxAllowedLevelForPilot(level, 9);
    const rawModuleLvl = dailyCfg ? (dailyCfg.assignedModuleLevel || 1) : (abilities?.[abId]?.level || 1);
    const abLevel = dailyCfg ? rawModuleLvl : Math.min(rawModuleLvl, currentPilotAllowedMax);


    const abObj = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === abId) : null;
    const abName = abObj?.name?.split(' ')[0] || 'Modulo';

    try { playAbilitySFX(abId); } catch (_) {}

    if (matchStatsRef.current) {
      matchStatsRef.current.moduleActivations += 1;
    }
    let vfxClass = 'vfx-timewarp-overlay';
    if (abId === 'taurus' || abId === 'planet_char_1' || abId === 'planet_char_20') vfxClass = 'vfx-heal-overlay';

    else if (abId === 'gemini' || abId === 'sagittarius' || abId === 'planet_char_6') vfxClass = 'vfx-timewarp-overlay';
    else if (abId === 'aries' || abId === 'leo' || abId === 'planet_char_2' || abId === 'planet_char_9' || abId === 'planet_char_19') vfxClass = 'vfx-plasma-overlay';
    else if (abId === 'virgo' || abId === 'scorpio' || abId === 'planet_char_7' || abId === 'planet_char_12') vfxClass = 'vfx-emp-glitch';
    else if (abId === 'libra' || abId === 'planet_char_10' || abId === 'planet_char_15') vfxClass = 'vfx-siphon-overlay';

    setActiveAbilityVfx(vfxClass);
    safeSetTimeout(() => setActiveAbilityVfx(''), 800);

    const t1 = Math.min(3, abLevel);
    const t2 = abLevel >= 4 ? Math.min(3, abLevel - 3) : 0;
    const t3 = abLevel >= 7 ? Math.min(3, abLevel - 6) : 0;

    let popupDetails = [];

    // --- EFFETTO 1 (FASCIA 1: LIVELLI 1-3) ---
    if (abId === 'taurus') {
      const healAmt = Math.max(15, Math.round((maxPlayerHp || 50) * (0.12 + t1 * 0.08)));
      triggerPlayerHealFx();
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
      triggerFloatingText(`+${healAmt} HP CURA`, '#10b981', 'bottom-left');
      popupDetails.push(`+${healAmt} HP rigenerati`);
    } else if (abId === 'aries') {
      const directDmg = 12 + t1 * 6;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - directDmg));
      triggerFloatingText(`-${directDmg} HP PURO`, '#ef4444', 'top-right');
      popupDetails.push(`-${directDmg} HP di danno puro`);
    } else if (abId === 'gemini') {
      const timeBonus = 12 + t1 * 6;
      setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + timeBonus));
      triggerFloatingText(`+${timeBonus}s TEMPO`, '#38bdf8', 'cascade-left');
      popupDetails.push(`+${timeBonus}s nel Time Tank`);
    } else if (abId === 'cancer') {
      const handTarget = t1 === 3 ? 9 : 8;
      const refilled = refillHandToTargetSize(playerHand, playerDeck, playerDiscard, handTarget);
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
      triggerFloatingText(`MANO (${handTarget})`, '#06b6d4', 'bottom-left');
      popupDetails.push(`Mano ricaricata a ${handTarget} carte`);
    } else if (abId === 'leo') {
      const dmg = 14 + (t1 - 1) * 6;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - dmg));
      triggerFloatingText(`-${dmg} HP FURIA`, '#f59e0b', 'top-right');
      popupDetails.push(`-${dmg} HP esecuzione pura`);
    } else if (abId === 'virgo') {
      const lockTurns = t1 >= 2 ? 2 : 1;
      setEnemyPassiveSilencedTurns(prev => Math.max(prev, lockTurns));
      if (t1 === 3) setAiNotches({ '+': false, '-': false, '*': false, '/': false });
      triggerFloatingText(`BLOCCO NEMICO (${lockTurns}T)`, '#84cc16', 'top-right');
      popupDetails.push(`AbilitÃ /Passive nemiche bloccate per ${lockTurns}T`);
    } else if (abId === 'libra') {
      const siphonDmg = 10 + t1 * 4;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - siphonDmg));
      triggerPlayerHealFx();
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + Math.floor(siphonDmg * 0.5)));
      triggerFloatingText(`SIFONE ${siphonDmg} HP`, '#a855f7', 'top-right');
      popupDetails.push(`Rubati ${siphonDmg} HP al nemico`);
    } else if (abId === 'scorpio') {
      triggerFloatingText("MANO NEMICA RIDOTTA", '#f43f5e', 'top-right');
      popupDetails.push("Prossima mano nemica ristretta a 5 carte");
    } else if (abId === 'sagittarius') {
      const tankSec = Math.min(TIME_TANK_MAX_CAP, 15 + t1 * 5);
      setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + tankSec));
      triggerFloatingText(`+${tankSec}s TIME TANK`, '#f97316', 'bottom-left');
      popupDetails.push(`+${tankSec}s riserva tempo`);
    } else if (abId === 'capricorn') {
      setHasUsedFirstHitShield(false);
      setMirrorShieldActive(true);
      setMirrorShieldMultiplier(1.0);
      triggerFloatingText("BARRIERA REATTIVA ATTIVA", '#94a3b8', 'bottom-left');
      popupDetails.push("Prossimo attacco nemico assorbito e annullato");
    } else if (abId === 'aquarius') {
      if (isEtherAllowed) {
        const genEth = 1 + t1;
        setBattleEther(e => Math.min(maxBattleEther, e + genEth));
        if (typeof setEther === 'function') setEther(e => e + genEth);
        triggerFloatingText(`+${genEth} ETERE`, '#e879f9', 'cascade-left');
        popupDetails.push(`+${genEth} Etere Cosmico 🔮`);
      }
    } else if (abId === 'pisces') {
      const bonusSec = 10 + t1 * 5;
      setPlayerTimeTank(t => Math.min(TIME_TANK_MAX_CAP, t + bonusSec));
      triggerFloatingText(`CALIBRAZIONE +${bonusSec}s`, '#6366f1', 'bottom-left');
      popupDetails.push(`Tolleranza algebrica attiva e +${bonusSec}s`);
    } else if (abId === 'planet_char_1') {
      addStardustWithCap(30 + t1 * 20);
      triggerFloatingText(`+${30 + t1 * 20} 🌟 POLVERE`, '#38bdf8', 'cascade-left');
      popupDetails.push(`+${30 + t1 * 20} Polvere Stellare 🌟 immediata`);
    } else if (abId === 'planet_char_2') {
      const dmg = 18 + (t1 - 1) * 7;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - dmg));
      triggerFloatingText(`-${dmg} HP TERMICO`, '#f43f5e', 'top-right');
      popupDetails.push(`-${dmg} HP danno termico`);
        } else if (abId === 'planet_char_3') {
      const healPct = 0.08 + (t1 - 1) * 0.04;
      const healAmt = Math.round((maxPlayerHp || 50) * healPct);
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
      setDowntimeExchangesLeft(2);
      triggerFloatingText(`CAMBIO RESET +${healAmt} HP`, '#8b5cf6', 'bottom-left');
      popupDetails.push(`Cambio carte ripristinato e +${healAmt} HP`);

    } else if (abId === 'planet_char_4') {
      const notchesToAdd = t1;
      setPlayerNotches(prev => {
        const ops = ['+', '-', '*', '/'];
        const updated = { ...prev };
        let added = 0;
        for (const op of ops) {
          if (!updated[op] && added < notchesToAdd) {
            updated[op] = true;
            added++;
          }
        }
        const count = Object.values(updated).filter(Boolean).length;
        if (count >= requiredNotchesCount) setPlayerDiceReady(true);
        return updated;
      });
      triggerFloatingText(`+${notchesToAdd} TACCHE DADI`, '#ec4899', 'bottom-left');
      popupDetails.push(`Accese +${notchesToAdd} tacche Dadi Quantici`);
    } else if (abId === 'planet_char_5') {
      const cardsToDraw = t1 + 1;
      const refilled = refillHandToTargetSize(playerHand, playerDeck, playerDiscard, playerHand.length + cardsToDraw);
      setPlayerHand(refilled.newHand);
      setPlayerDeck(refilled.newDeck);
      setPlayerDiscard(refilled.newDiscard);
      triggerFloatingText(`PESCA +${cardsToDraw} CARTE`, '#10b981', 'bottom-left');
      popupDetails.push(`Pescate +${cardsToDraw} carte dal mazzo`);
    } else if (abId === 'planet_char_6') {
      const slowSec = 15 + (t1 - 1) * 10;
      setAiTimer(t => Math.max(5, t - slowSec));
      triggerFloatingText(`TEMPO NEMICO -${slowSec}s`, '#f59e0b', 'top-right');
      popupDetails.push(`Sottratti -${slowSec}s al timer nemico`);
    } else if (abId === 'planet_char_7') {
      setEnemyPassiveSilencedTurns(prev => Math.max(prev, t1));
      triggerFloatingText(`SHOCK IONICO (${t1}T)`, '#06b6d4', 'top-right');
      popupDetails.push(`Bypass anomalie attivo e blocco nemico per ${t1}T`);
    } else if (abId === 'planet_char_8') {
      const numJokers = t1 >= 3 ? 2 : 1;
      setPlayerHand(prevHand => {
        const h = [...prevHand];
        for (let j = 0; j < numJokers && h.length < 9; j++) {
          h.push(createRandomCard(true));
        }
        return h;
      });
      triggerFloatingText(`+${numJokers} JOLLY QUANTICO`, '#84cc16', 'bottom-left');
      popupDetails.push(`Aggiunti +${numJokers} Jolly Quantici in mano`);
    } else if (abId === 'planet_char_9') {
      const selfSacrifice = 4;
      const blastDmg = 22 + (t1 - 1) * 8;
      triggerPlayerDamageFx();
      setPlayerHp(h => Math.max(1, h - selfSacrifice));
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - blastDmg));
      triggerFloatingText(`ANTIMATERIA -${blastDmg} HP`, '#38bdf8', 'top-right');
      popupDetails.push(`Sacrificati ${selfSacrifice} HP per infliggere -${blastDmg} HP Puri`);
    } else if (abId === 'planet_char_10') {
      const reflectRate = 0.40 + (t1 - 1) * 0.20;
      setMirrorShieldActive(true);
      setMirrorShieldMultiplier(reflectRate);
      triggerFloatingText(`SCUDO TITANO x${reflectRate}`, '#facc15', 'bottom-left');
      popupDetails.push(`Riflessione reattiva nemica attiva (x${reflectRate})`);
    } else if (abId === 'planet_char_11') {
      setShowDeckExtractModal(true);
      triggerFloatingText("PESCA MIRATA GRATUITA", '#a855f7', 'bottom-left');
      popupDetails.push("Aperta estrazione mirata a costo zero");
    } else if (abId === 'planet_char_12') {
      const magDmg = 16 + (t1 - 1) * 8;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - magDmg));
      triggerFloatingText(`IMPULSO -${magDmg} HP`, '#ef4444', 'top-right');
      popupDetails.push(`-${magDmg} HP danno magnetico`);
    } else if (abId === 'planet_char_13') {
      setActiveAnomaly(FIELD_ANOMALIES[0]);
      const healAmt = Math.round((maxPlayerHp || 50) * 0.12);
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
      triggerFloatingText(`CAMPO PURIFICATO +${healAmt} HP`, '#14b8a6', 'bottom-left');
      popupDetails.push("Anomalia azzerata e +12% HP");
    } else if (abId === 'planet_char_14') {
      setPlayerMalusGauge(0);
      setAiMalusGauge(prev => Math.min(malusMaxTicks, prev + t1));
      triggerFloatingText("PURGA MALUS", '#6366f1', 'bottom-left');
      popupDetails.push(`Malus alleato azzerato e +${t1} tacche al nemico`);
    } else if (abId === 'planet_char_15') {
      const pct = 0.15 + (t1 - 1) * 0.05;
      const pctDmg = Math.max(10, Math.round(aiHp * pct));
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - pctDmg));
      triggerFloatingText(`GRAVITÃ€ -${pctDmg} HP`, '#d946ef', 'top-right');
      popupDetails.push(`-${pctDmg} HP (${Math.round(pct * 100)}% vita attuale nemica)`);
    } else if (abId === 'planet_char_16') {
      const genEth = t1 + 1;
      setBattleEther(e => Math.min(maxBattleEther, e + genEth));
      if (typeof setEther === 'function') setEther(e => e + genEth);
      triggerFloatingText(`+${genEth} ETERE (LAGRANGE)`, '#0ea5e9', 'cascade-left');
      popupDetails.push(`+${genEth} Etere Cosmico sintetizzato`);
    } else if (abId === 'planet_char_17') {
      const speedBonusDmg = 15 + (t1 - 1) * 7;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - speedBonusDmg));
      triggerFloatingText(`CINETICA -${speedBonusDmg} HP`, '#84cc16', 'top-right');
      popupDetails.push(`-${speedBonusDmg} HP scarica cinetica`);
    } else if (abId === 'planet_char_18') {
      const drainSec = 15 + (t1 - 1) * 7;
      setAiTimeTank(t => Math.max(0, t - drainSec));
      triggerFloatingText(`TANK NEMICO -${drainSec}s`, '#f97316', 'top-right');
      popupDetails.push(`Svuotati -${drainSec}s dal Time Tank nemico`);
    } else if (abId === 'planet_char_19') {
      const magmaticDmg = 18 + (t1 - 1) * 7;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - magmaticDmg));
      setBurnRoundsRemaining(prev => prev + 2);
      triggerFloatingText(`ERUZIONE -${magmaticDmg} HP`, '#ef4444', 'top-right');
      popupDetails.push(`-${magmaticDmg} HP e ustione prolungata`);
    } else if (abId === 'planet_char_20') {
      const healAmt = Math.round((maxPlayerHp || 50) * (0.20 + (t1 - 1) * 0.10));
      triggerPlayerHealFx();
      setPlayerHp(h => Math.min(maxPlayerHp || 50, h + healAmt));
      triggerFloatingText(`ZERO ASSOLUTO +${healAmt} HP`, '#06b6d4', 'bottom-left');
      popupDetails.push(`Rigenerazione Sovrano: +${healAmt} HP`);
    } else {
      const tacticalDmg = 10 + t1 * 6;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - tacticalDmg));
      triggerFloatingText(`-${tacticalDmg} HP`, '#c084fc', 'top-right');
      popupDetails.push(`-${tacticalDmg} HP inflitti`);
    }

    // --- EFFETTO 2 SIMULTANEO (FASCIA 2: LIVELLI 4-6) ---
    if (t2 > 0) {
            if (abId === 'leo') {
        triggerFloatingText("BERSAGLI SEMPLIFICATI!", "#facc15", "bottom-left");
        popupDetails.push("Bersagli plancia semplificati");
      } else if (abId === 'virgo') {

        addStardustWithCap(20 + t2 * 15);
        triggerFloatingText(`+${20 + t2 * 15} 🌟 POLVERE`, "#84cc16", "cascade-left");
        popupDetails.push(`+${20 + t2 * 15} Polvere Stellare 🌟`);
      } else if (abId === 'scorpio') {
        setBurnRoundsRemaining(prev => prev + 2 + t2);
        triggerFloatingText(`VELENO (${2 + t2}T)`, "#f43f5e", "top-right");
        popupDetails.push(`Applicato veleno tossico (${2 + t2} turni)`);
      } else if (abId === 'libra') {
        const barrierHp = 10 + t2 * 5;
        setPlayerHp(h => Math.min(maxPlayerHp || 50, h + barrierHp));
        triggerFloatingText(`+${barrierHp} SCUDO REATTIVO`, "#a855f7", "bottom-left");
        popupDetails.push(`+${barrierHp} HP scudo reattivo`);
      } else if (abId === 'planet_char_5') {
        const cycloneDmg = 10 + t2 * 5;
        triggerAiDamageFx();
        setAiHp(prev => Math.max(0, prev - cycloneDmg));
        triggerFloatingText(`CICLONE -${cycloneDmg} HP`, "#10b981", "top-right");
        popupDetails.push(`-${cycloneDmg} HP raffica ciclonica`);
      } else if (abId === 'planet_char_14') {
        const rageDmg = 12 + t2 * 6;
        triggerAiDamageFx();
        setAiHp(prev => Math.max(0, prev - rageDmg));
        triggerFloatingText(`FURIA CAOTICA -${rageDmg} HP`, "#6366f1", "top-right");
        popupDetails.push(`-${rageDmg} HP furia caotica`);
      } else {
        setAiMalusGauge(prev => Math.max(0, prev - t2 * 2));
        popupDetails.push(`Scaricata barra malus nemica di ${t2 * 2} tacche`);
      }
    }

    // --- EFFETTO 3 SIMULTANEO (FASCIA 3: LIVELLI 7-9) ---
    if (t3 > 0) {
      const pureBlast = 15 + t3 * 8;
      triggerAiDamageFx();
      setAiHp(prev => Math.max(0, prev - pureBlast));
      triggerFloatingText(`APOTEOSI -${pureBlast} HP!`, '#facc15', 'top-right');
      popupDetails.push(`Scarica finale Apoteosi: -${pureBlast} HP Puri`);
    }

    setAbilityDamageAccumulator(0);
    setAbilityMeter(0);
    setIsAbilityReady(false);
    triggerPopup(`âš¡ ${abName.toUpperCase()} (Liv. ${abLevel}) SCATENATO!\n${popupDetails.join(' â€¢ ')}`);
  };



    const currentTrisTargetObj = trisObjectives?.targets ? (trisObjectives.targets[selectedObjectiveIndex] || trisObjectives.targets[0]) : { target: trisObjectives?.target };
  const targetValue = isVectorMode ? vectorTarget : (isTrisMode ? currentTrisTargetObj?.target : 15);


  const topPlayerDiscard = playerDiscard.length > 0 ? playerDiscard[playerDiscard.length - 1] : null;
  const topAiDiscard = isRealPvP ? aiDiscardTop : (aiDiscard.length > 0 ? aiDiscard[aiDiscard.length - 1] : null);

  const currentZoneNameSafe = (PLANET_ZONE_NAMES?.[currentAdvPlanet - 1]?.[currentAdvLevel - 1]) || `Settore ${currentAdvLevel}`;
  const currentPlanetNameSafe = realPlanetNames?.[currentAdvPlanet - 1] || `Pianeta ${currentAdvPlanet}`;
  const playerDeckPrefix = (playerDeckObj?.name || 'Mazzo').split(' ')[0] || 'Mazzo';
  const aiDeckPrefix = (aiDeckObj?.name || 'Mazzo').split(' ')[0] || 'Mazzo';


    return (
    <div className={`battle-viewport ${microShakeClass} ${shakeScreen ? 'anim-shake' : ''} ${resonanceStreak >= 2 ? 'streak-plasma-active' : ''}`}>

      
      <DeepSpaceUniverseCanvas currentEnvironmentId={equippedEnvironment} planetNumber={currentAdvPlanet} isPaused={showDigitalDiceModal} />

      {activeAbilityVfx && <div className={activeAbilityVfx} />}

      {turn === 'player1' && timer <= 20 && timer > 10 && (
        <div className="vignette-warning-20s" />
      )}
      {turn === 'player1' && timer <= 10 && timer > 0 && (
        <div className="vignette-critical-10s" />
      )}

             {/* MODULO JUICE: CELEBRAZIONE CALCOLO & AUTOSTIMA */}
      {juiceFeedbackData && (
        <CombatJuiceOverlay
          data={juiceFeedbackData}
          onAnimationEnd={() => setJuiceFeedbackData(null)}
        />
      )}


            {/* OVERLAY INTRODUTTIVO 3D: FACE-OFF PILOTI CON RILIEVO ELEMENTALE */}
      {showFaceOff && (
        <div
          onClick={() => {
            try { playSound('click'); } catch (_) {}
            setShowFaceOff(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle, rgba(2, 6, 23, 0.95) 0%, rgba(1, 3, 10, 0.98) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 29000,
            animation: 'spotlightPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
            padding: '1rem'
          }}
        >

          <div style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            CONFRONTO ELEMENTALE PILOTI
          </div>

          {/* AREA A 2 CARTE CON DIFFERENZIAZIONE IN RILIEVO 3D */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(14px, 4vw, 28px)', margin: '0.8rem 0' }}>
            
            {/* CARTA PILOTA GIOCATORE (A SINISTRA) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: `scale(${pilotDominance.playerScale}) translateY(${pilotDominance.status === 'PLAYER_DOMINANT' ? '-10px' : (pilotDominance.status === 'ENEMY_DOMINANT' ? '10px' : '0px')})`,
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: pilotDominance.status === 'PLAYER_DOMINANT' ? 10 : 2,
                opacity: pilotDominance.status === 'ENEMY_DOMINANT' ? 0.7 : 1,
                filter: pilotDominance.status === 'PLAYER_DOMINANT' ? 'drop-shadow(0 0 25px rgba(0, 242, 254, 0.85))' : 'none'
              }}
            >
              <PilotCard pilot={effectivePlayerPilotId} compact={false} isEquipped={true} />
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#00f2fe', marginTop: '6px' }}>
                {nickname} (Tu)
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>
                {ELEMENT_ICONS[getPilotById(effectivePlayerPilotId)?.primaryElement]} {getPilotById(effectivePlayerPilotId)?.primaryElement} / {ELEMENT_ICONS[getPilotById(effectivePlayerPilotId)?.secondaryElement]} {getPilotById(effectivePlayerPilotId)?.secondaryElement}
              </div>
            </div>

            {/* BADGE CENTRALE VS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 5 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 0 15px rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  color: '#facc15'
                }}
              >
                VS
              </div>
            </div>

            {/* CARTA PILOTA AVVERSARIO (A DESTRA) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: `scale(${pilotDominance.enemyScale}) translateY(${pilotDominance.status === 'ENEMY_DOMINANT' ? '-10px' : (pilotDominance.status === 'PLAYER_DOMINANT' ? '10px' : '0px')})`,
                transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                zIndex: pilotDominance.status === 'ENEMY_DOMINANT' ? 10 : 2,
                opacity: pilotDominance.status === 'PLAYER_DOMINANT' ? 0.7 : 1,
                filter: pilotDominance.status === 'ENEMY_DOMINANT' ? 'drop-shadow(0 0 25px rgba(239, 68, 68, 0.85))' : 'none'
              }}
            >
              <PilotCard pilot={effectiveAiPilotId} compact={false} isEquipped={false} />
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#f87171', marginTop: '6px' }}>
                {isPvP ? (pvpMeta?.opponent?.nickname || 'Avversario') : (isAdv && currentAdvLevel === 10 ? `Boss ${currentPlanetNameSafe}` : 'Avversario')}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1' }}>
                {ELEMENT_ICONS[getPilotById(effectiveAiPilotId)?.primaryElement]} {getPilotById(effectiveAiPilotId)?.primaryElement} / {ELEMENT_ICONS[getPilotById(effectiveAiPilotId)?.secondaryElement]} {getPilotById(effectiveAiPilotId)?.secondaryElement}
              </div>
            </div>

          </div>

          {/* VERDETTO DI DOMINANZA SOTTO LE CARTE */}
          <div
            className="cyber-panel"
            style={{
              marginTop: '0.8rem',
              padding: '0.6rem 1.4rem',
              borderRadius: '20px',
              border: `2px solid ${pilotDominance.status === 'PLAYER_DOMINANT' ? '#10b981' : (pilotDominance.status === 'ENEMY_DOMINANT' ? '#ef4444' : '#facc15')}`,
              background: pilotDominance.status === 'PLAYER_DOMINANT' 
                ? 'rgba(6, 78, 59, 0.85)' 
                : (pilotDominance.status === 'ENEMY_DOMINANT' ? 'rgba(69, 10, 10, 0.85)' : 'rgba(15, 23, 42, 0.85)'),
              boxShadow: `0 0 25px ${pilotDominance.status === 'PLAYER_DOMINANT' ? 'rgba(16, 185, 129, 0.6)' : (pilotDominance.status === 'ENEMY_DOMINANT' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(250, 204, 21, 0.4)')}`,
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 900,
                color: pilotDominance.status === 'PLAYER_DOMINANT' ? '#34d399' : (pilotDominance.status === 'ENEMY_DOMINANT' ? '#fca5a5' : '#fde047'),
                letterSpacing: '1px'
              }}
            >
              {pilotDominance.label}
            </div>
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 'bold' }}>
              {pilotDominance.subLabel}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              try { playSound('click'); } catch (_) {}
              setShowFaceOff(false);
            }}
            className="cyber-btn cyber-btn-primary"
            style={{
              marginTop: '1rem',
              padding: '6px 18px',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '1px',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.6)'
            }}
          >
            SALTA (O TOCCA OVUNQUE) ➔
          </button>
        </div>
      )}



           {turnBanner && (
        <div className="turn-banner-container">
          <div className={`turn-banner-card ${turnBanner.type === 'player' ? 'turn-banner-player' : 'turn-banner-opponent'}`}>
            <div style={{ fontSize: '0.62rem', color: turnBanner.type === 'player' ? '#7dd3fc' : '#fca5a5', fontWeight: 'bold', letterSpacing: '1px' }}>
              {turnBanner.title}
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '900', color: turnBanner.type === 'player' ? '#00f2fe' : '#f43f5e', textShadow: turnBanner.type === 'player' ? '0 0 12px #00f2fe' : '0 0 12px #f43f5e' }}>
              {turnBanner.subtitle}
            </div>
          </div>
        </div>
      )}

      {koBanner && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(2, 6, 23, 0.88) 0%, rgba(1, 3, 10, 0.98) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30000,
            pointerEvents: 'none',
            padding: '1.5rem',
            animation: 'spotlightPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div
            className="cyber-panel"
            style={{
              padding: '1.5rem 1.8rem',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              border: `2px solid ${koBanner.color}`,
              boxShadow: `0 0 50px ${koBanner.color}66, inset 0 0 20px ${koBanner.color}33`,
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 1) 100%)'
            }}
          >
            <h1
              style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 'clamp(1.5rem, 4.5vw, 2rem)',
                fontWeight: 900,
                color: '#ffffff',
                margin: '0 0 0.5rem 0',
                letterSpacing: '1px',
                textShadow: `0 0 15px ${koBanner.color}, 0 0 25px ${koBanner.color}`
              }}
            >
              {koBanner.title}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4', margin: 0, fontWeight: 700 }}>
              {koBanner.subtitle}
            </p>
          </div>
        </div>
      )}


      {/* FLUSSI NUMERICI SPAZIALIZZATI (TOP-RIGHT, BOTTOM-LEFT, CASCADE-LEFT) */}
      {floatingTexts.map(f => (
        <div
          key={f.id}
          className={`floating-combat-text ${
            f.position === 'bottom-left' 
              ? 'ftext-bottom-left' 
              : f.position === 'cascade-left' 
              ? 'ftext-cascade-left' 
              : 'ftext-top-right'
          }`}
          style={{ color: f.color }}
        >
          {f.text}
        </div>
      ))}

            {/* FeatureDiscoveryModal rimosso dal combattimento: guida interattiva fisica in plancia */}


      {/* MODALE MÃ–BIUS */}
      {showMobiusModal && (
        <MobiusBridgeModal
          playerHand={playerHand}
          playerDeck={playerDeck}
          maxSwaps={mobiusMaxSwaps}
          onConfirm={(newHand, newDeck, swapsCount) => {
            setPlayerHand(newHand);
            setPlayerDeck(newDeck);
            setUsedEpicItemsInMatch(prev => ({ ...prev, ['epic_item_1']: true }));
            setHasUsedEpicItemThisTurn(true);
            setShowMobiusModal(false);
            triggerFloatingText(`MÃ–BIUS SCAMBIO (${swapsCount})`, '#00f2fe', 'bottom-left');
            triggerPopup(`Ponte Cronotopico: Scambiate ${swapsCount} carte con successo!`);
          }}
          onCancel={() => setShowMobiusModal(false)}
        />
      )}

      {/* MODALE FORCELLA NEUTONICA */}
      {showNeutonicModal && (
        <NeutonicFusionModal
          playerHand={playerHand}
          maxFuse={neutonicMaxFuse}
          activeAnomaly={activeAnomaly}
          onConfirm={(fusedCard, fusedIndices) => {
            let nextHand = [...playerHand];
            [...fusedIndices].sort((a, b) => b - a).forEach(idx => nextHand.splice(idx, 1));
            nextHand.push(fusedCard);
            setPlayerHand(nextHand);
            setUsedEpicItemsInMatch(prev => ({ ...prev, ['epic_item_2']: true }));
            setHasUsedEpicItemThisTurn(true);
            setShowNeutonicModal(false);
            triggerFloatingText(`FUSIONE [${fusedCard.value}]`, '#f59e0b', 'bottom-left');
            triggerPopup(`Forcella Neutonica: creata carta fusa dal valore [${fusedCard.value}]!`);
          }}
          onCancel={() => setShowNeutonicModal(false)}
        />
      )}

           {/* MODALE ASTROLABIO */}
      {showRewriteModal && (
        <RewriteTargetModal
          objectives={classicObjectives}
          maxTargets={rewriteMaxTargets}
          onConfirm={(updated) => {
            setClassicObjectives(updated);
            setShowRewriteModal(false);
          }}
          onCancel={() => setShowRewriteModal(false)}
        />
      )}



      {/* MODALE DADI QUANTICI DIGITALI */}
      {showDigitalDiceModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: 'clamp(1rem, 2.5dvh, 2rem)', maxWidth: '420px', width: '92%', textAlign: 'center', border: '2px solid #00f2fe', boxShadow: '0 0 40px rgba(0, 242, 254, 0.65)' }}>
            <h3 style={{ color: '#00f2fe', margin: '0 0 0.3rem 0', fontWeight: '900', letterSpacing: '1px', fontSize: 'clamp(0.9rem, 2dvh, 1.15rem)', textShadow: '0 0 10px rgba(0, 242, 254, 0.6)' }}>DADI QUANTICI DIGITALI</h3>
            <p style={{ color: '#cbd5e1', fontSize: 'clamp(0.72rem, 1.3dvh, 0.82rem)', margin: '0 0 0.85rem 0' }}>
              {isCyclingDice ? "Lancio in corso..." : "Effetto estratto!"}
            </p>

            <div className="digital-roll-container">
              <div className={`digital-dice-screen ${isCyclingDice ? 'digital-cycling' : ''}`} style={{ border: '2px solid #00f2fe', boxShadow: '0 0 18px rgba(0, 242, 254, 0.45)' }}>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>INTENSITÃ€</span>
                <span style={{ fontSize: 'clamp(2rem, 5vw, 2.6rem)', fontWeight: '900', color: '#fff', textShadow: '0 0 12px rgba(255,255,255,0.8)' }}>{diceDisplayValue}</span>
              </div>

              <div className={`digital-dice-screen ${isCyclingDice ? 'digital-cycling' : ''}`} style={{ border: `2px solid ${diceDisplayFace.border}`, boxShadow: `0 0 18px ${diceDisplayFace.color}` }}>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>EFFETTO</span>
                <span style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.2rem)', filter: `drop-shadow(0 0 10px ${diceDisplayFace.color})` }}>{diceDisplayFace.symbol}</span>
              </div>
            </div>

            <div style={{ minHeight: '34px', fontSize: 'clamp(0.8rem, 1.5dvh, 0.92rem)', fontWeight: 'bold', color: diceDisplayFace.color, marginTop: '0.4rem', textShadow: `0 0 8px ${diceDisplayFace.color}` }}>
              {!isCyclingDice ? diceResultSummary : "Analisi probabilitÃ  in corso..."}
            </div>
          </div>
        </div>
      )}

      {/* MODALE RIANIMAZIONE */}
      {showReviveModal && !isPvP && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ border: '2px solid #ef4444', padding: '1.5rem', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(239, 68, 68, 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.35rem', filter: 'drop-shadow(0 0 12px #ef4444)' }}>
              <SciFiIcon name="life" size={40} color="#ef4444" />
            </div>
            <h2 style={{ color: '#f87171', margin: '0 0 0.4rem 0', fontWeight: '900', letterSpacing: '1px', fontSize: '1.2rem', textShadow: '0 0 10px rgba(248, 113, 113, 0.6)' }}>HP ESAURITI!</h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: '1.4', marginBottom: '1rem' }}>
              Vuoi usare <strong>1 Vita</strong> per riprendere la partita con il <strong>50% di vita ({Math.max(25, Math.floor((maxPlayerHp || 50) * 0.5))} HP)</strong>?
            </p>
            <div style={{ fontSize: '0.95rem', color: '#f43f5e', fontWeight: 'bold', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>Vite Rimaste: {availableReviveLives}</span>
              <SciFiIcon name="life" size={18} color="#f43f5e" />
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexDirection: 'column' }}>
              <button className="cyber-btn cyber-btn-success" onClick={handleRevive} style={{ padding: '0.75rem', fontSize: '0.88rem' }}>
                Rianima col 50% HP (Usa 1 Vita)
              </button>
              <button className="cyber-btn" onClick={() => { setShowReviveModal(false); declareWinner('Avversario'); }} style={{ color: '#fca5a5', padding: '0.6rem' }}>
                Accetta la Sconfitta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SELEZIONE VALORE JOLLY */}
      {jokerTargetIndex !== null && isEtherAllowed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ border: '2px solid #e879f9', padding: '1.25rem', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(232, 121, 249, 0.65)' }}>
            <div style={{ margin: '0 auto 0.35rem auto', display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 0 10px #e879f9)' }}>
              <SciFiIcon name="ether" size={32} color="#e879f9" />
            </div>
            <h3 style={{ color: '#f0abfc', margin: '0 0 0.3rem 0', fontWeight: '900', fontSize: '1.05rem', textShadow: '0 0 10px rgba(240, 171, 252, 0.6)' }}>Scegli Valore del Jolly</h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 0.85rem 0' }}>
              Assegna un numero (1-13). Costo: <strong style={{ color: '#e879f9' }}>{playerTraits.some(t => t.type === 'joker_cost_discount') ? 1 : 2} Etere</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '1rem' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(val => {
                const label = val === 1 ? 'A (1)' : val === 11 ? 'J (11)' : val === 12 ? 'Q (12)' : val === 13 ? 'K (13)' : val;
                return (
                  <button key={val} onClick={() => handleApplyJokerVal(val)} className="cyber-btn cyber-btn-ether" style={{ padding: '0.45rem 0.2rem', fontSize: '0.78rem', fontWeight: 'bold' }}>
                    {label}
                  </button>
                );
              })}
            </div>
            <button className="cyber-btn" onClick={() => setJokerTargetIndex(null)} style={{ width: '100%', padding: '0.5rem' }}>Annulla</button>
          </div>
        </div>
      )}

      {/* MODALE PESCA MIRATA DAL MAZZO */}
      {showDeckExtractModal && isEtherAllowed && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ border: '2px solid #00f2fe', padding: '1.25rem', maxWidth: '540px', width: '100%', maxHeight: '82vh', overflowY: 'auto', textAlign: 'center', boxShadow: '0 0 40px rgba(0, 242, 254, 0.55)' }}>
            <h3 style={{ color: '#00f2fe', margin: '0 0 0.35rem 0', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', fontSize: '1.05rem', textShadow: '0 0 10px rgba(0, 242, 254, 0.5)' }}>
              <SciFiIcon name="ether" size={20} color="#00f2fe" /> Scegli Carta dal Mazzo
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '0 0 0.85rem 0' }}>
              {extractHandIndex === null ? "1. Seleziona la carta della tua mano che vuoi sostituire:" : `2. Scegli la carta dal tuo mazzo con cui cambiarla (Costo: ${playerTraits.some(t => t.type === 'deck_extract_discount') ? (playerTraits.find(t => t.type === 'deck_extract_discount')?.cost || 1) : 4} Etere):`}
            </p>

            {extractHandIndex === null ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {playerHand.map((c, hIdx) => {
                  if (!c) return null;
                  return (
                    <div key={hIdx} onClick={() => { try { playSound('click'); } catch (_) {} setExtractHandIndex(hIdx); }} className="holo-card" style={{ cursor: 'pointer', border: '1.5px solid #00f2fe', boxShadow: '0 0 12px rgba(0, 242, 254, 0.4)' }}>
                      <span style={{ fontSize: '0.7rem', color: c.color, filter: `drop-shadow(0 0 4px ${c.glow || '#00f2fe'})` }}>{c.symbol}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{c.displayVal || c.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: '0.35rem', maxHeight: '240px', overflowY: 'auto', padding: '0.4rem', background: 'rgba(2, 6, 23, 0.75)', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                {playerDeck.map((dc, dIdx) => {
                  if (!dc) return null;
                  return (
                    <div key={dIdx} onClick={() => handleExecuteDeckExtract(dIdx)} className="holo-card" style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}>
                      <span style={{ fontSize: '0.7rem', color: dc.color, filter: `drop-shadow(0 0 4px ${dc.glow || '#00f2fe'})` }}>{dc.symbol}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{dc.displayVal || dc.value}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <button className="cyber-btn" onClick={() => { setShowDeckExtractModal(false); setExtractHandIndex(null); }} style={{ width: '100%', padding: '0.55rem' }}>Annulla</button>
          </div>
        </div>
      )}

            {/* BANNER CONTRACCOLPO MALUS */}
      {activePenaltyBanner && (
        <div style={{ position: 'fixed', top: '35%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000, pointerEvents: 'none' }} className="anim-penalty-popup">
          <div className="cyber-panel" style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.98), rgba(69, 10, 10, 0.99))', border: `2px solid ${activePenaltyBanner.color || '#fca5a5'}`, padding: '1rem 1.4rem', borderRadius: '12px', textAlign: 'center', boxShadow: `0 0 40px ${activePenaltyBanner.color || 'rgba(239, 68, 68, 0.85)'}` }}>
            <div style={{ margin: '0 auto 0.35rem auto', display: 'flex', justifyContent: 'center', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.7))' }}>
              <SciFiIcon name={activePenaltyBanner.icon || 'hazard'} size={32} color={activePenaltyBanner.color || '#ef4444'} />
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#fef08a', letterSpacing: '0.8px', textShadow: '0 0 10px rgba(254, 240, 138, 0.6)' }}>{activePenaltyBanner.title}</div>
            <div style={{ fontSize: '0.82rem', color: '#00f2fe', fontWeight: 'bold', margin: '2px 0', textShadow: '0 0 6px rgba(0, 242, 254, 0.5)' }}>CONTRACCOLPO {activePenaltyBanner.targetName}</div>
            <div style={{ fontSize: '0.72rem', color: '#f1f5f9', fontWeight: '600' }}>{activePenaltyBanner.desc}</div>
          </div>
        </div>
      )}
      
                                  
      {/* Motore Unificato Attivo */}



            {!isHardpointMode && !isTrisMode && !isVectorMode && !isDoubleStageMode && (
        <ClassicBattleView
          equippedWeapons={equippedWeapons}
          weaponsLevels={weaponsLevels}
          riftState={riftState}

          objectives={classicObjectives}
          setObjectives={setClassicObjectives}
          isSector1={isAdv && currentAdvPlanet === 1 && currentAdvLevel === 1}

          isSector2={isAdv && currentAdvPlanet === 1 && currentAdvLevel === 2}
          activeAnomaly={activeAnomaly}

          selectedPilot={effectivePlayerPilotId}
          pilotInventory={pilotInventory}
          abilityMeter={abilityMeter}
          selectedDeck={selectedDeck}
          aiDeckTheme={aiDeckTheme}
          playerGoldenCardId={playerGoldenCardId}
          playerGoldenTurns={playerGoldenTurns}
          effectivePlayerDeckLevel={effectivePlayerDeckLevel}
          isAbilityReady={isAbilityReady}
          aiAbilityMeter={aiAbilityMeter}
          handleManualSkillTrigger={handleManualSkillTrigger}
          playerDiceReady={playerDiceReady}
          executeQuantumDiceRoll={executeQuantumDiceRoll}
          equippedEpicItems={equippedEpicItems}
          usedEpicItemsInMatch={usedEpicItemsInMatch}
          hasUsedEpicItemThisTurn={hasUsedEpicItemThisTurn}
          handleActivateEpicItem={handleActivateEpicItem}
          isPvP={isPvP}
          pvpMeta={pvpMeta}
          isAdv={isAdv}
          currentAdvPlanet={currentAdvPlanet}
          currentAdvLevel={currentAdvLevel}
          currentPlanetNameSafe={currentPlanetNameSafe}
          bossPhase={bossPhase}
          maxBossPhases={maxBossPhases}
          aiHp={aiHp}
          maxAiHp={maxAiHp}
          aiTimer={aiTimer}
          aiTimeTank={aiTimeTank}
          aiMalusGauge={aiMalusGauge}
          malusMaxTicks={malusMaxTicks}
          aiNotches={aiNotches}
          aiDeckCount={isRealPvP ? aiDeckCount : (aiDeck?.length || 0)}
          aiDeck={aiDeck}
          aiDiscard={aiDiscard}
          aiDiscardTop={aiDiscardTop}
          isRealPvP={isRealPvP}
          aiTerrainSlots={aiTerrainSlots}
          effectiveAiDeckLevel={effectiveAiDeckLevel}
          effectiveAiAbilityId={effectiveAiAbilityId}
          aiHand={aiHand}
          aiCardStates={aiCardStates}
          aiActionMessage={aiActionMessage}
          playerHp={playerHp}
          maxPlayerHp={maxPlayerHp}
          lives={availableReviveLives}
          timer={timer}
          playerTimeTank={playerTimeTank}
          playerMalusGauge={playerMalusGauge}
          playerNotches={playerNotches}
          battleEther={battleEther}
          maxBattleEther={maxBattleEther}
          isScannerActive={isScannerActive}
          scannerMode={scannerMode}
          scannerSeconds={scannerSeconds}
          toggleScanner={toggleScanner}
          selectedAbility={effectivePlayerAbilityId}
          abilities={abilities}
          level={level}
                                        tableSlots={tableSlots}
          setTableSlots={setTableSlots}
          playerHand={playerHand}
          setPlayerHand={setPlayerHand}
          playerDeck={playerDeck}
          playerDiscard={playerDiscard}
          setPlayerDiscard={setPlayerDiscard}
          playerTerrainSlots={playerTerrainSlots}
          


              handleRearmTerrainSlot={handleRearmTerrainSlot}
    onAttack={handleClassicAttack}
    onCardClick={handleCardClick}
    pistonOverrideActive={pistonOverrideActive}
    pistonOverrideDamage={pistonOverrideDamage}


                    handlePassTurn={handlePassTurn}
                    isExchangeMode={isExchangeMode}
          setIsExchangeMode={setIsExchangeMode}
          handleOpenExchangeMode={handleOpenExchangeMode}
          handleCancelExchangeMode={handleCancelExchangeMode}
          selectedExchangeIndices={selectedExchangeIndices}

          confirmCardExchange={confirmCardExchange}
          setShowAbandonConfirm={setShowAbandonConfirm}
          setShowDeckExtractModal={setShowDeckExtractModal}
          isSelectingDiscard={isSelectingDiscard}
          hasExchangedThisTurn={downtimeExchangesLeft <= 0}
          downtimeExchangesLeft={downtimeExchangesLeft}
                    weaponTanks={weaponTanks}
          setWeaponTanks={setWeaponTanks}
          aiWeaponTanks={aiWeaponTanks}

          isExchangeBlockedByModifier={isExchangeBlockedByModifier}
          turn={turn}
          isBombAllowed={isBombAllowed}
          t={t}
        />

      )}


                 {/* Vista Tris rimossa */}


                        {/* Vista Vettore rimossa */}


                        {/* Vista Convergenza rimossa */}



      {/* 3. SEZIONE INFERIORE: GIOCATORE CON MODULO ABILITÃ€ IBRIDO UNICO */}

               {/* CELEBRAZIONE VITTORIA COSMICA (STILE FLUTTUANTE SENZA SCATOLE) */}
      {winner && (
        <CosmicVictoryModal
          winnerName={winner}
          nickname={nickname}
          isFirstLevelTutorial={isFirstLevelTutorial}
          isAdv={isAdv}
          currentAdvLevel={currentAdvLevel}
          currentPlanetName={currentPlanetNameSafe}
          rewards={wonBattleRewards}
          starsResult={adventureStarsResult}
          starsAnimStep={starsAnimStep}
          onNextLevel={onNextLevel}
          onGoToRifts={(relic) => onAbandon(true, 'epic_items', relic)}
          onClose={() => onAbandon(true)}
        />
      )}




          {showAbandonConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 12000 }} onClick={() => setShowAbandonConfirm(false)}>
          <div className="cyber-panel" style={{ border: '2px solid #ef4444', padding: '1.25rem', maxWidth: '340px', width: '90%', textAlign: 'center', boxShadow: '0 0 35px rgba(239, 68, 68, 0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '0.62rem', color: '#fca5a5', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>PROTOCOLLO DI SICUREZZA</div>
            <h3 style={{ color: '#f87171', margin: '0.2rem 0 0.5rem 0', fontWeight: '900', fontSize: '1.1rem' }}>
              {isFirstLevelTutorial ? 'RITIRATA NON DISPONIBILE' : 'Vuoi Ritirarti?'}
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.75rem', lineHeight: '1.4', margin: '0 0 1rem 0' }}>
              {isFirstLevelTutorial 
                ? "Il Settore 1 è il test di qualificazione essenziale per calibrare la nave: devi portare a termine lo scontro!" 
                : (isPvP ? "La resa assegnerà la vittoria all'avversario e perderai trofei." : "La ritirata comporterà la perdita dei crediti spesi.")}
            </p>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="cyber-btn cyber-btn-primary" onClick={() => setShowAbandonConfirm(false)} style={{ flex: 1, padding: '0.65rem' }}>
                {isFirstLevelTutorial ? 'Continua Battaglia ➔' : 'Annulla'}
              </button>
              {!isFirstLevelTutorial && (
                <button
                  className="cyber-btn"
                  onClick={() => {
                    setShowAbandonConfirm(false);
                    if (isPvP || isDailyChallenge) {
                      declareWinner(isPvP ? (pvpMeta?.opponent?.nickname || 'Avversario') : 'Nemesi Quantica');
                    } else {
                      onAbandon();
                    }
                  }}
                  style={{ flex: 1, background: '#dc2626', borderColor: '#f87171' }}
                >
                  Ritirati
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {popupMsg && (
        <div className="cyber-panel" style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', padding: '0.65rem 1.2rem', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold', zIndex: 15000, pointerEvents: 'none', boxShadow: '0 6px 25px rgba(0,242,254,0.45)', whiteSpace: 'pre-line', border: '1px solid #00f2fe', fontSize: '0.82rem' }}>
          {popupMsg}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 7.0 COMPONENTE RESOURCE HEADER OLOGRAFICO (CON COPPA ÉLITE ANIMATA)
// ============================================================================
function ResourceHeader({
  nickname = 'Pilota',
  level = 1,
  xp = 0,
  trophies = 0,
  diamonds = 0,
  lives = 3,
  credits = 200,
  creditTimerText = 'MAX',
  setShowProgression,
  onOpenStore,
  onOpenLeaderboard,
  onOpenSettings
}) {

  const [timeLeft, setTimeLeft] = useState({ diamonds: 0, lives: 0 });
  const [trophyBouncing, setTrophyBouncing] = useState(false);
  const maxLives = getMaxLivesForLevel(level);

  const handleTrophyClick = () => {
    try { playSound('click'); } catch (_) {}
    setTrophyBouncing(true);
    setTimeout(() => {
      setTrophyBouncing(false);
      if (typeof onOpenLeaderboard === 'function') onOpenLeaderboard();
    }, 220);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let diaTime = 0;
      const lastDiaStr = localStorage.getItem('lastDiamondReward');
      if (lastDiaStr) {
        const elapsed = now - parseInt(lastDiaStr, 10);
        diaTime = Math.max(0, 604800000 - (elapsed % 604800000));
      } else {
        diaTime = 604800000;
      }
      let liveTime = 0;
      if (lives < maxLives) {
        const lastLifeStr = localStorage.getItem('eclissi_lastLifeUpdate');
        if (lastLifeStr) {
          const elapsedLife = now - parseInt(lastLifeStr, 10);
          liveTime = Math.max(0, 28800000 - (elapsedLife % 28800000));
        }
      }
      setTimeLeft({ diamonds: diaTime, lives: liveTime });
    }, 1000);
    return () => clearInterval(interval);
  }, [level, lives, maxLives]);

  const formatTime = (ms) => {
    if (ms <= 0) return "MAX";
    const ts = Math.floor(ms / 1000), d = Math.floor(ts / 86400), h = Math.floor((ts % 86400) / 3600), m = Math.floor((ts % 3600) / 60), s = ts % 60;
    return d > 0 ? `${d}g ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  };

  const xpThreshold = getXpThresholdForLevel(level);

  return (
    <div id="tour-target-header" style={{ width: '100%', position: 'relative', zIndex: 10, flexShrink: 0, padding: 'clamp(2px, 0.6vmin, 6px) clamp(4px, 1vmin, 8px)', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        
        {/* PARTE SINISTRA: COPPA ÉLITE ANIMATA + NOME + LIVELLO + BARRA XP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.6vmin, 12px)' }}>
          
          {/* Coppa Élite interattiva con animazione al tocco */}
          <div
            onClick={handleTrophyClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              cursor: 'pointer',
              transform: trophyBouncing ? 'scale(1.4) rotate(-14deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            title="Tocca per aprire la Classifica Élite"
          >
            <SciFiIcon name="trophy" size={17} color="#fde047" />
            <span style={{ fontSize: 'clamp(0.72rem, 1.8vmin, 0.88rem)', fontWeight: 900, color: '#facc15', textShadow: '0 0 10px rgba(250, 204, 21, 0.85)' }}>
              {trophies}
            </span>
          </div>

          {/* Nome Giocatore + Livello + Barra Esperienza */}
          <div 
            onClick={() => { try { playSound('click'); } catch (_) {} if (typeof setShowProgression === 'function') setShowProgression(true); }} 
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px' }}
            title="Tocca per visualizzare la progressione livelli"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color: '#00f2fe', fontWeight: 900, fontSize: 'clamp(0.75rem, 1.8vmin, 0.9rem)', textShadow: '0 0 10px rgba(0, 242, 254, 0.8)', letterSpacing: '0.5px' }}>
                {nickname}
              </span>
              <span style={{ fontSize: 'clamp(0.55rem, 1.3vmin, 0.68rem)', color: '#94a3b8', fontWeight: 800 }}>
                Lv.{level}
              </span>
            </div>

            {/* Micro-linea laser XP */}
            <div style={{ width: 'clamp(60px, 16vmin, 95px)', height: '2.5px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (xp / xpThreshold) * 100)}%`, height: '100%', background: '#00f2fe', boxShadow: '0 0 8px #00f2fe' }} />
            </div>
          </div>

        </div>

        {/* PARTE DESTRA: CREDITI, VITE E DIAMANTI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2.5vmin, 16px)' }}>
          
          {/* Crediti */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={`Crediti: ${credits}⚡ (${creditTimerText})`}>
            <SciFiIcon name="credit" size={14} color="#00f2fe" />
            <span style={{ fontSize: 'clamp(0.7rem, 1.7vmin, 0.85rem)', fontWeight: 900, color: '#00f2fe', textShadow: '0 0 8px rgba(0, 242, 254, 0.7)' }}>
              {credits}
            </span>
          </div>

          {/* Vite */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title={`Vite: ${lives}/${maxLives} (${formatTime(timeLeft.lives)})`}>
            <SciFiIcon name="life" size={14} color="#f43f5e" />
            <span style={{ fontSize: 'clamp(0.7rem, 1.7vmin, 0.85rem)', fontWeight: 900, color: '#fca5a5', textShadow: '0 0 8px rgba(244, 63, 94, 0.7)' }}>
              {lives}
            </span>
          </div>

                    {/* Diamanti */}
          <div 
            onClick={onOpenStore} 
            style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }} 
            title="Tocca per aprire il Negozio"
          >
            <SciFiIcon name="diamond" size={14} color="#d946ef" />
            <span style={{ fontSize: 'clamp(0.7rem, 1.7vmin, 0.85rem)', fontWeight: 900, color: '#f5d0fe', textShadow: '0 0 8px rgba(217, 70, 239, 0.7)' }}>
              {diamonds}
            </span>
          </div>

          {/* Impostazioni ⚙️ */}
          <div 
            onClick={onOpenSettings} 
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px', marginLeft: '2px' }} 
            title="Impostazioni"
          >
            <SciFiIcon name="settings" size={15} color="#cbd5e1" />
          </div>

        </div>

      </div>
    </div>
  );
}



// ============================================================================
// MAPPA A NODI DELLA ROTTA DELLE COSTELLAZIONI (40 CAPSULE / 600 STELLE)
// ============================================================================
function StarRouteMapModal({ totalStars = 0, claimedCapsules = {}, onClaim, onClose }) {
  const milestones = Array.from({ length: 40 }, (_, i) => (i + 1) * 15);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.2rem', maxWidth: '640px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '2px solid #facc15', boxShadow: '0 0 50px rgba(250, 204, 21, 0.45)' }}>
        
        {/* Header Rotta Stellare */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(250, 204, 21, 0.3)', paddingBottom: '0.5rem', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
              ROTTA DELLE COSTELLAZIONI
            </div>
            <h3 style={{ margin: '2px 0 0 0', color: '#fff', fontSize: '1.15rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>â­</span> {totalStars} / 600 Stelle Conquistate
            </h3>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.25rem 0.6rem', background: '#ef4444', borderColor: '#f87171' }}>âœ•</button>
        </div>

        {/* Barra di Avanzamento Globale */}
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '3px' }}>
            <span>Avanzamento Totale</span>
            <strong style={{ color: '#facc15' }}>{Math.round((totalStars / 600) * 100)}%</strong>
          </div>
          <div className="led-meter-bar" style={{ height: '7px' }}>
            <div className="led-meter-fill" style={{ width: `${Math.min(100, (totalStars / 600) * 100)}%`, background: 'linear-gradient(90deg, #f59e0b, #facc15)' }} />
          </div>
        </div>

        {/* Mappa a Nodi Sinuosa a Scorrimento */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {milestones.map((m, idx) => {
            const isUnlocked = totalStars >= m;
            const isClaimed = Boolean(claimedCapsules[m]);
            const reward = getStarCapsuleReward(m);
            const isMajorNode = Boolean(reward.unlockItem);

            return (
              <div
                key={m}
                className="cyber-panel"
                style={{
                  padding: isMajorNode ? '0.85rem' : '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  border: isMajorNode 
                    ? (isClaimed ? '1.5px solid #059669' : isUnlocked ? '2px solid #facc15' : '1.5px dashed rgba(250, 204, 21, 0.4)')
                    : (isClaimed ? '1px solid rgba(255,255,255,0.1)' : isUnlocked ? '1.5px solid #00f2fe' : '1px dashed rgba(255,255,255,0.1)'),
                  background: isMajorNode
                    ? (isClaimed ? 'rgba(6, 78, 59, 0.35)' : isUnlocked ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(15, 23, 42, 0.95))' : 'rgba(30, 27, 75, 0.45)')
                    : (isClaimed ? 'rgba(15, 23, 42, 0.5)' : isUnlocked ? 'rgba(8, 145, 178, 0.2)' : 'rgba(15, 23, 42, 0.75)'),
                  boxShadow: isUnlocked && !isClaimed ? (isMajorNode ? '0 0 20px rgba(250, 204, 21, 0.5)' : '0 0 14px rgba(0, 242, 254, 0.35)') : 'none',
                  opacity: isClaimed ? 0.65 : 1
                }}
              >
                {/* Nodo con Indicatore Numerico */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                  <div
                    style={{
                      width: isMajorNode ? '44px' : '36px',
                      height: isMajorNode ? '44px' : '36px',
                      borderRadius: '50%',
                      background: isClaimed ? '#059669' : isUnlocked ? (isMajorNode ? '#facc15' : '#00f2fe') : '#1e293b',
                      color: isUnlocked && !isClaimed ? '#020617' : '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: isMajorNode ? '0.82rem' : '0.7rem',
                      flexShrink: 0,
                      boxShadow: isUnlocked && !isClaimed ? '0 0 12px currentColor' : 'none'
                    }}
                  >
                    <span>{isClaimed ? 'âœ“' : isMajorNode ? 'â˜…' : `${idx + 1}`}</span>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: '900', color: isMajorNode ? '#fde047' : '#fff' }}>
                        Traguardo {m} â­
                      </span>
                      {isMajorNode && (
                        <span style={{ fontSize: '0.55rem', background: '#eab308', color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: '900' }}>
                          OGGETTO ESCLUSIVO
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.68rem', color: isMajorNode ? '#6ee7b7' : '#cbd5e1', marginTop: '2px', fontWeight: isMajorNode ? 'bold' : 'normal' }}>
                      {reward.unlockItem ? (
                        <span>ðŸŽ {reward.unlockItem.name} + {reward.dust}🌟 {reward.diamonds > 0 ? `+${reward.diamonds}💎` : ''}</span>
                      ) : (
                        <span>+{reward.dust}🌟 {reward.diamonds > 0 ? `+${reward.diamonds}💎 ` : ''}+{reward.ether}🔮 {reward.voidCrystals > 0 ? `+${reward.voidCrystals}ðŸ’  ` : ''}{reward.primordialMatter > 0 ? `+${reward.primordialMatter}🟣` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pulsante Riscatta */}
                <button
                  disabled={!isUnlocked || isClaimed}
                  onClick={() => onClaim(m)}
                  className={`cyber-btn ${isUnlocked && !isClaimed ? (isMajorNode ? 'cyber-btn-epic' : 'cyber-btn-success') : ''}`}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.72rem',
                    fontWeight: '900',
                    minWidth: '85px',
                    flexShrink: 0
                  }}
                >
                  {isClaimed ? "Riscossa" : isUnlocked ? "RISCATTA âž”" : `-${m - totalStars} â­`}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// MODALE BRIEFING & CLASSIFICA SFIDA DEL GIORNO (DAILY CHALLENGE)
// ============================================================================
function DailyChallengeModal({
  dailyData,
  countdownText,
  onLaunch,
  onClose
}) {
  const todayRome = getRomeDateString();
  const config = useMemo(() => generateDailyChallengeConfig(todayRome), [todayRome]);
  const allBots = useMemo(() => generateDailyGhostLeaderboard(todayRome), [todayRome]);
  const visibleBots = useMemo(() => getVisibleLeaderboard(allBots, dailyData.todayResult), [allBots, dailyData.todayResult]);

    const modeLabels = {
    classic: 'Classica (4 Operazioni)',
    vector: 'Vettore Geometrico',
    double_stage: 'Convergenza (Banco 2+2)',
    tris: 'Tris Stellare'
  };


  const hasAttempted = Boolean(dailyData.hasAttemptedToday);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 33000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '2px solid #facc15', boxShadow: '0 0 45px rgba(250, 204, 21, 0.5)' }}>
        
        {/* Intestazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(250, 204, 21, 0.3)', paddingBottom: '0.4rem', marginBottom: '0.65rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
              FREQUENZA QUANTICA GIORNALIERA • {todayRome}
            </div>
            <h3 style={{ margin: '2px 0 0 0', color: '#fff', fontSize: '1.15rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span> Sfida del Giorno
            </h3>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
        </div>

        {/* Box Briefing Assetto Sandbox */}
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1.5px solid rgba(250, 204, 21, 0.4)', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.68rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#cbd5e1' }}>Modalità: <strong style={{ color: '#00f2fe' }}>{modeLabels[config.mode]}</strong></span>
            <span style={{ color: '#cbd5e1' }}>Timer Turno: <strong style={{ color: '#facc15' }}>{config.turnTime}s (Blitz)</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#cbd5e1' }}>Mazzo Assegnato: <strong style={{ color: '#38bdf8' }}>{config.assignedDeck} (Liv.{config.assignedDeckLevel})</strong></span>
            <span style={{ color: '#cbd5e1' }}>Vite Fornite: <strong style={{ color: config.livesProvided > 0 ? '#10b981' : '#ef4444' }}>{config.livesProvided > 0 ? '1 Vita' : '0 Vite (Morte Secca)'}</strong></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ color: '#cbd5e1' }}>Rapporto HP: <strong style={{ color: '#10b981' }}>{config.playerHp} HP</strong> vs <strong style={{ color: '#ef4444' }}>{config.aiHp} HP Nemesi</strong></span>
            <span style={{ color: '#cbd5e1' }}>Scanner: <strong style={{ color: '#ef4444' }}>BLOCCATO 🔒</strong></span>
          </div>
          <div style={{ color: '#fde047', fontSize: '0.62rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '3px', marginTop: '3px' }}>
            Regole: 1 solo tentativo ogni 24h solari. Nessun costo crediti. Chiusura alle 23:59:59 (Tempo rimasto: <strong>{countdownText}</strong>).
          </div>
        </div>

        {/* Tabella Classifica 150 Ghost Bot (Pacing Orario 24h) */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingRight: '0.2rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: '900', textTransform: 'uppercase' }}>
            Classifica Attiva (Piloti nel Quadrante: {visibleBots.length}/150)
          </div>

          {visibleBots.map((pilot, idx) => {
            const rank = idx + 1;
            const isMe = pilot.isPlayer;

            return (
              <div
                key={pilot.id || idx}
                className="cyber-panel"
                style={{
                  padding: '0.35rem 0.55rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isMe ? 'rgba(8, 145, 178, 0.45)' : (rank <= 3 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.8)'),
                  border: isMe ? '1.5px solid #00f2fe' : (rank <= 3 ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.08)')
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: rank <= 3 ? '#fde047' : '#94a3b8', minWidth: '22px' }}>
                    #{rank}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>
                      {pilot.nickname} {isMe && '(Tu)'}
                    </div>
                    <div style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>
                      {pilot.turns} Turni • {Math.round(pilot.timeElapsedMs / 1000)}s • HP {Math.round(pilot.remainingHpPct * 100)}%
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900' }}>
                  {pilot.timeStr || '--:--'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pulsante di Avvio o Stato Tentativo */}
        <div>
          {hasAttempted ? (
            <button
              disabled
              className="cyber-btn"
              style={{ width: '100%', padding: '0.65rem', opacity: 0.5, cursor: 'not-allowed' }}
            >
              {dailyData.todayResult?.victory ? '✓ SFIDA COMPLETATA PER OGGI' : '✗ TENTATIVO CONSUMATO (RITENTA DOMANI)'}
            </button>
          ) : (
            <button
              onClick={() => onLaunch(config)}
              className="cyber-btn cyber-btn-warning"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.88rem', fontWeight: '900' }}
            >
              AVVIA SFIDA (1 TENTATIVO • 0 CREDITI) ➔
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

// ============================================================================
// MODALE REPORT GIORNALIERO ORE 00:00:01 (CONSEGNA PREMI & STREAK)
// ============================================================================
function DailyReportModal({
  reportData,
  onClaim
}) {
  if (!reportData) return null;

  const { placement, totalParticipants, tier, rewards, streakBonus, playerResult, streak } = reportData;

  const tierNames = {
    rank_1: '1° Posto Mondiale 👑',
    rank_2_3: 'Podio Galattico 🥈🥉',
    top_1_pct: 'Top 1% Élite 🌟',
    top_10_pct: 'Top 10% Maestri ⭐',
    top_25_pct: 'Top 25% Esploratori',
    top_50_pct: 'Top 50% Sopravvissuti',
    base_win: 'Vittoria Standard'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 36000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.5rem', maxWidth: '440px', width: '100%', textAlign: 'center', border: '2px solid #facc15', boxShadow: '0 0 50px rgba(250, 204, 21, 0.65)' }}>
        
        <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', letterSpacing: '1px' }}>
          REPORT UFFICIALE SFIDA DEL GIORNO
        </div>
        <h2 style={{ color: '#fff', margin: '0.2rem 0 0.4rem 0', fontWeight: '900', fontSize: '1.3rem' }}>
          Risultati del {reportData.forDate}
        </h2>

        {/* Piazzamento & Fascia */}
        <div style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(15, 23, 42, 0.95))', border: '1.5px solid #facc15', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fde047' }}>
            Posizione #{placement} / {totalParticipants}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>
            Fascia: {tierNames[tier] || 'Vittoria'}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginTop: '4px' }}>
            Prestazione: {playerResult?.turns} turni • {Math.round((playerResult?.timeElapsedMs || 0) / 1000)}s • HP {Math.round((playerResult?.remainingHpPct || 0) * 100)}%
          </div>
        </div>

        {/* Serie (Streak) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.85rem', fontSize: '0.85rem', fontWeight: '900', color: '#f97316' }}>
          <span>🔥 SERIE CONSECUTIVA: {streak} GIORNI!</span>
        </div>

        {/* Premi Accreditati */}
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', marginBottom: '4px' }}>
            BOTTINO ACCREDITATO
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: '900' }}>
            {rewards.dust > 0 && <span style={{ color: '#fef08a' }}>+{rewards.dust} 🌟</span>}
            {rewards.diamonds > 0 && <span style={{ color: '#f5d0fe' }}>+{rewards.diamonds} 💎</span>}
            {rewards.voidCrystals > 0 && <span style={{ color: '#00f2fe' }}>+{rewards.voidCrystals} 💠</span>}
            {rewards.primordialMatter > 0 && <span style={{ color: '#d946ef' }}>+{rewards.primordialMatter} 🟣</span>}
            {rewards.scannerSeconds > 0 && <span style={{ color: '#38bdf8' }}>+{rewards.scannerSeconds}s Scanner</span>}
          </div>

          {streakBonus && (
            <div style={{ marginTop: '6px', fontSize: '0.68rem', color: '#fde047', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              🎁 Traguardo Serie: {streakBonus.label} (+{streakBonus.dust} 🌟, +{streakBonus.diamonds} 💎)
            </div>
          )}
        </div>

           <button
          onClick={onClaim}
          className="cyber-btn cyber-btn-warning"
          style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '900' }}
        >
          RISCATTA E CONTINUA ➔
        </button>

      </div>
    </div>
  );
}

// ============================================================================
// WIDGET MONITORAGGIO CANTIERE DI SINTESI (2 SLOT INDIPENDENTI)
// ============================================================================
function ActiveForgeWidget({ queue = [], onRush, ether = 0 }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!queue || queue.length === 0) return null;

  const formatRemaining = (finishTime) => {
    const sec = Math.max(0, Math.floor((finishTime - Date.now()) / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s` : `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div
      style={{
        width: 'calc(100% - 16px)',
        margin: '2px auto 4px auto',
        display: 'grid',
        gridTemplateColumns: queue.length > 1 ? 'repeat(2, 1fr)' : '1fr',
        gap: '6px',
        zIndex: 12
      }}
    >
      {queue.slice(0, 2).map((item) => {
        const canRush = ether >= item.etherRush;

        return (
          <div
            key={item.type + '_' + item.id}
            className="cyber-panel"
            style={{
              padding: '4px 6px',
              background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.5) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid #c084fc',
              boxShadow: '0 0 10px rgba(192, 132, 252, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '4px'
            }}
          >
            <div style={{ textAlign: 'left', lineHeight: 1.1, minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.52rem', color: '#f0abfc', fontWeight: 900, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                 {item.name}  L.{item.targetLevel}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: 'bold' }}>
                {formatRemaining(item.finishTime)}
              </div>
            </div>

            <button
              disabled={!canRush}
              onClick={() => onRush(item)}
              className="cyber-btn cyber-btn-ether"
              style={{
                padding: '2px 5px',
                fontSize: '0.55rem',
                fontWeight: 900,
                flexShrink: 0,
                opacity: canRush ? 1 : 0.5
              }}
              title={`Salta tempo (${item.etherRush} Etere)`}
            >
               {item.etherRush} 
            </button>
          </div>
        );
      })}
    </div>
  );
}


// ============================================================================
// MODALE DEI 3 CONTRATTI TATTICI GIORNALIERI (CON PREMIO TRITTICO 3/3)
// ============================================================================
function DailyBountiesModal({
  bounties = [],
  allCompletedClaimed = false,
  onClaim,
  onClaimAllCompleted,
  onClose
}) {
  const completedCount = bounties.filter(b => b.completed).length;
  const allCompleted = bounties.length === 3 && bounties.every(b => b.completed);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 35000, padding: '1rem' }}>
      <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '460px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '2px solid #38bdf8', boxShadow: '0 0 40px rgba(56, 189, 248, 0.45)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: '900', letterSpacing: '1px' }}>OBIETTIVI TATTICI (RESET 00:00)</div>
            <h3 style={{ color: '#38bdf8', margin: 0, fontWeight: '900', fontSize: '1.1rem' }}>
               Contratti del Giorno ({completedCount}/3)
            </h3>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
        </div>

        {/* 1. I 3 CONTRATTI SINGOLI */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.75rem', paddingRight: '0.2rem' }}>
          {bounties.map(bounty => {
            const isDone = bounty.completed;
            const isClaimed = bounty.claimed;
            const pct = Math.min(100, Math.round((bounty.progress / bounty.target) * 100));

            return (
              <div
                key={bounty.id}
                className="cyber-panel"
                style={{
                  padding: '0.7rem',
                  border: isClaimed ? '1px solid rgba(255,255,255,0.1)' : (isDone ? '1.5px solid #10b981' : '1px solid rgba(56, 189, 248, 0.3)'),
                  background: isClaimed ? 'rgba(15, 23, 42, 0.4)' : (isDone ? 'rgba(6, 78, 59, 0.35)' : 'rgba(15, 23, 42, 0.85)'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '900', color: isClaimed ? '#94a3b8' : (isDone ? '#34d399' : '#fff') }}>
                    {bounty.name}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '900', color: isDone ? '#34d399' : '#facc15' }}>
                    {bounty.progress} / {bounty.target}
                  </span>
                </div>

                <div style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>{bounty.desc}</div>

                <div className="led-meter-bar" style={{ height: '5px', margin: '3px 0' }}>
                  <div className="led-meter-fill" style={{ width: `${pct}%`, background: isDone ? '#10b981' : '#38bdf8' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#fef08a', fontWeight: 'bold' }}>
                    +{bounty.reward.dust}  | +{bounty.reward.credits || 15}  | +{bounty.reward.xp} XP
                  </div>

                  <button
                    disabled={!isDone || isClaimed}
                    onClick={() => onClaim(bounty.id)}
                    className={`cyber-btn ${isDone && !isClaimed ? 'cyber-btn-success' : ''}`}
                    style={{ padding: '0.25rem 0.65rem', fontSize: '0.65rem', fontWeight: '900' }}
                  >
                    {isClaimed ? ' Riscossa' : (isDone ? 'RISCATTA' : 'In Corso')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. CASSA RIFORNIMENTO TRITTICO (3/3 COMPLETATI -> 2 DIAMANTI) */}
        <div
          style={{
            background: allCompleted 
              ? (allCompletedClaimed ? 'rgba(15, 23, 42, 0.6)' : 'linear-gradient(135deg, rgba(217, 70, 239, 0.25), rgba(15, 23, 42, 0.95))')
              : 'rgba(15, 23, 42, 0.5)',
            border: allCompleted 
              ? (allCompletedClaimed ? '1px solid rgba(255,255,255,0.15)' : '1.5px solid #d946ef')
              : '1px dashed rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '0.65rem 0.75rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: (allCompleted && !allCompletedClaimed) ? '0 0 20px rgba(217, 70, 239, 0.4)' : 'none'
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: '900', color: allCompleted ? '#f5d0fe' : '#94a3b8' }}>
               CASSA TRITTICO ({completedCount}/3)
            </div>
            <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: 'bold' }}>
              Premio: +2  Diamanti   +10s Scanner   +20 
            </div>
          </div>

          <button
            disabled={!allCompleted || allCompletedClaimed}
            onClick={onClaimAllCompleted}
            className={`cyber-btn ${allCompleted && !allCompletedClaimed ? 'cyber-btn-warning' : ''}`}
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.72rem',
              fontWeight: '900',
              opacity: (allCompleted && !allCompletedClaimed) ? 1 : 0.4
            }}
          >
            {allCompletedClaimed ? ' Riscossa' : (allCompleted ? 'APRI CASSA ' : 'Bloccata')}
          </button>
        </div>

        <button className="cyber-btn" onClick={onClose} style={{ width: '100%', padding: '0.55rem' }}>
          Chiudi
        </button>
      </div>
    </div>
  );
}




function App() {
  // 1. STATI DI NAVIGAZIONE E PROFILO
    const [step, setStep] = useState('splash');
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('eclissi_lang');
    if (saved) return saved;
    if (typeof navigator !== 'undefined' && navigator.language && !navigator.language.startsWith('it')) {
      return 'en';
    }
    return 'it';
  });

  
  const [nickname, setNickname] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem('eclissi_profile') || '{}');
      return p.nickname || '';
    } catch (_) { return ''; }
  });
  const [myPlayerId] = useState(() => {
    let id = localStorage.getItem('eclissi_player_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('eclissi_player_id', id);
    }
    return id;
  });
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem('eclissi_level') || '1', 10));
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('eclissi_xp') || '0', 10));
  const [trophies, setTrophies] = useState(() => parseInt(localStorage.getItem('eclissi_trophies') || '0', 10));
  const [pvpWins, setPvpWins] = useState(() => parseInt(localStorage.getItem('eclissi_pvp_wins') || '0', 10));
  const [pvpLosses, setPvpLosses] = useState(() => parseInt(localStorage.getItem('eclissi_pvp_losses') || '0', 10));

  // 2. STATI PvP A DUE CANALI (CON CONTATORE 10/10 ÉLITE GIORNALIERO)
  const [selectedPvPChannel, setSelectedPvPChannel] = useState('training');
  const [selectedPvPMode, setSelectedPvPMode] = useState('classic');

  const [eliteMatchesPlayedToday, setEliteMatchesPlayedToday] = useState(() => {
    const savedDate = localStorage.getItem('eclissi_elite_matches_date');
    const todayStr = new Date().toDateString();
    if (savedDate !== todayStr) {
      localStorage.setItem('eclissi_elite_matches_date', todayStr);
      localStorage.setItem('eclissi_elite_matches_played', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('eclissi_elite_matches_played') || '0', 10);
  });
  const [showPvPChannelModal, setShowPvPChannelModal] = useState(false);
  const [pendingPvPConfirmation, setPendingPvPConfirmation] = useState(null);

  // 3. STATI RELIQUIE, VARCHI & OGGETTI EPICI (2 SLOT A LIV. 20 E LIV. 60)
  const [unlockedRelics, setUnlockedRelics] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_unlocked_relics') || '{}');
    } catch (_) { return {}; }
  });

  const [unlockedRifts, setUnlockedRifts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_unlocked_rifts') || '{}');
    } catch (_) { return {}; }
  });

  const [epicItemsInventory, setEpicItemsInventory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_epic_inventory') || '{}');
    } catch (_) { return {}; }
  });

  const [equippedEpicItems, setEquippedEpicItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_equipped_epic_items') || '[null, null]');
    } catch (_) { return [null, null]; }
  });

  const [voidCrystals, setVoidCrystals] = useState(() => parseInt(localStorage.getItem('eclissi_void_crystals') || '0', 10));
  const [primordialMatter, setPrimordialMatter] = useState(() => parseInt(localStorage.getItem('eclissi_primordial_matter') || '0', 10));
    const [tankLevel, setTankLevel] = useState(() => parseInt(localStorage.getItem('eclissi_tank_level') || '1', 10));
  const [socketingRelic, setSocketingRelic] = useState(null);


   // STATI BANCO TERRENO COPERTO A 5 SLOT & CODEX
  const [unlockedTerrainCards, setUnlockedTerrainCards] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_unlocked_terrain_cards');
      return saved ? JSON.parse(saved) : { cryo_stasis: { level: 1, unlocked: true } };
    } catch (_) {
      return { cryo_stasis: { level: 1, unlocked: true } };
    }
  });

        const [equippedTerrainSlots, setEquippedTerrainSlots] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_equipped_terrain_slots');
      return saved ? JSON.parse(saved).slice(0, 4) : ['cryo_stasis', null, null, null];
    } catch (_) {
      return ['cryo_stasis', null, null, null];
    }
  });

    // STATI ARMI SBLOCCATE, LOADOUT 4 HARDPOINT E LIVELLI
  const [unlockedWeapons, setUnlockedWeapons] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_unlocked_weapons');
      return saved ? JSON.parse(saved) : {
        wp_gatling: true,
        wp_xbow: true,
        wp_thunderstrike: true,
        wp_orbital_cannon: true
      };
    } catch (_) {
      return {
        wp_gatling: true,
        wp_xbow: true,
        wp_thunderstrike: true,
        wp_orbital_cannon: true
      };
    }
  });

  const [equippedWeapons, setEquippedWeapons] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_equipped_weapons');
      return saved ? JSON.parse(saved) : ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'];
    } catch (_) {
      return ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'];
    }
  });

  const [weaponsLevels, setWeaponsLevels] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_weapons_levels');
      return saved ? JSON.parse(saved) : { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 };
    } catch (_) {
      return { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 };
    }
  });

    useEffect(() => {
    localStorage.setItem('eclissi_unlocked_weapons', JSON.stringify(unlockedWeapons));
  }, [unlockedWeapons]);

  useEffect(() => {
    localStorage.setItem('eclissi_equipped_weapons', JSON.stringify(equippedWeapons));
  }, [equippedWeapons]);

  useEffect(() => {
    localStorage.setItem('eclissi_weapons_levels', JSON.stringify(weaponsLevels));
  }, [weaponsLevels]);



  
  
  // STATI MODALI ASSETTO & SHOP UNIFICATO
  const [showPersonalLoadout, setShowPersonalLoadout] = useState(false);
  const [showUnifiedShop, setShowUnifiedShop] = useState(false);
  const [unifiedShopDefaultTab, setUnifiedShopDefaultTab] = useState('decks');
  const [shopOpenedFromLoadout, setShopOpenedFromLoadout] = useState(false);



  // STATI SFIDA DEL GIORNO (DAILY CHALLENGE)
  const [dailyData, setDailyData] = useState(() => loadDailyChallengeData());
  const [dailyCountdown, setDailyCountdown] = useState('00:00:00');
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyReportData, setDailyReportData] = useState(null);

   // STATI CONTRATTI GIORNALIERI & CANTIERE DI SINTESI
  const [dailyBountiesState, setDailyBountiesState] = useState(() => initDailyBounties());
  const dailyBountiesStateRef = useRef(dailyBountiesState);
  useEffect(() => { dailyBountiesStateRef.current = dailyBountiesState; }, [dailyBountiesState]);
  const [showBountiesModal, setShowBountiesModal] = useState(false);

  const [forgeQueue, setForgeQueue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_forge_queue') || '[]');
    } catch (_) { return []; }
  });

  useEffect(() => {
    localStorage.setItem('eclissi_daily_bounties', JSON.stringify(dailyBountiesState));
  }, [dailyBountiesState]);

  useEffect(() => {
    localStorage.setItem('eclissi_forge_queue', JSON.stringify(forgeQueue));
  }, [forgeQueue]);

   



  // Controllo Reset 00:00:01 & Loop Timer Mezzanotte Roma
  useEffect(() => {
    // 1. Controllo report pendente all'avvio
    const resetCheck = checkDailyResetAndReport();
    if (resetCheck.shouldShowReport && resetCheck.reportData) {
      setDailyReportData(resetCheck.reportData);
    }
    setDailyData(loadDailyChallengeData());

    // 2. Timer conto alla rovescia al secondo
    const updateTimer = () => {
      const ms = getMsUntilRomeMidnight();
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setDailyCountdown(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );

        // Reset istantaneo allo scoccare delle 00:00:00
      if (totalSec === 0) {
        const midnightCheck = checkDailyResetAndReport();
        if (midnightCheck.shouldShowReport && midnightCheck.reportData) {
          setDailyReportData(midnightCheck.reportData);
        }
        setDailyData(loadDailyChallengeData());
        setDailyBountiesState(initDailyBounties(true));
      }

    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // STATI STELLE CAMPAGNA & ROTTA DELLE 40 CAPSULE (MAX 600 â­)

  const [campaignStars, setCampaignStars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_campaign_stars') || '{}');
    } catch (_) { return {}; }
  });

  const [claimedStarCapsules, setClaimedStarCapsules] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_claimed_capsules') || '{}');
    } catch (_) { return {}; }
  });

  const [showStarCapsulesModal, setShowStarCapsulesModal] = useState(false);

  // Calcolo cumulativo istantaneo di tutte le stelle conquistate nella campagna
  const totalCampaignStars = useMemo(() => {
    let count = 0;
    Object.values(campaignStars).forEach(starsArr => {
      if (Array.isArray(starsArr)) {
        starsArr.forEach(st => { if (st) count++; });
      }
    });
    return Math.min(600, count);
  }, [campaignStars]);


  // 4. TUTORIAL & DISCOVERY
  const [hasCompletedHomeTour, setHasCompletedHomeTour] = useState(() => localStorage.getItem('eclissi_tour_completed') === 'true');
  const [showHomeTour, setShowHomeTour] = useState(false);
    // (hasCompletedMiniTut rimosso)

  const [activeAppDiscoveryTutorial, setActiveAppDiscoveryTutorial] = useState(null);

  // SCHEDA DI BRIEFING SETTORE AVVENTURA
  const [selectedSectorForBriefing, setSelectedSectorForBriefing] = useState(null);

    // Modali Pre-Partita Onboarding Liv. 9 e Liv. 10 rimossi: sblocco integrato in launchSectorBattle


  // 5. MODULO ABILITÀ IBRIDO UNICO (selectedAbility) & INVENTARIO MAZZI A 3/6/9 LIVELLI
  const [abilities, setAbilities] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_abilities');
      return saved ? JSON.parse(saved) : {};
    } catch (_) { return {}; }
  });

  // SLOT UNICO IBRIDO (stringa ID singolo, null prima del Settore 9)
  const [selectedAbility, setSelectedAbility] = useState(() => {
    const legacy = localStorage.getItem('eclissi_selected_abilities');
    if (legacy) {
      try {
        const arr = JSON.parse(legacy);
        if (Array.isArray(arr) && arr[0]) return arr[0];
      } catch (_) {}
    }
    const saved = localStorage.getItem('eclissi_selected_ability');
    return (saved && saved !== 'null') ? saved : null;
  });


    // STATI DEL SISTEMA PILOTI TATTICI (18 CARTE PILOTA AUTONOME)
  const [selectedPilot, setSelectedPilot] = useState(() => {
    const saved = localStorage.getItem('eclissi_selected_pilot');
    return (saved && saved !== 'pilot_starter_1') ? saved : 'pilot_com_1';
  });
   const [pilotInventory, setPilotInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_pilot_inventory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pilot_starter_1 && !parsed.pilot_com_1) {
          parsed.pilot_com_1 = { level: parsed.pilot_starter_1.level || 1, unlocked: true };
          delete parsed.pilot_starter_1;
        }
        return parsed;
      }
      const curSelected = localStorage.getItem('eclissi_selected_pilot') || 'pilot_com_1';
      return { [curSelected]: { level: 1, unlocked: true } };
    } catch (_) {
      return { pilot_com_1: { level: 1, unlocked: true } };
    }
  });


    useEffect(() => {
    localStorage.setItem('eclissi_selected_pilot', selectedPilot);
  }, [selectedPilot]);


  useEffect(() => {
    localStorage.setItem('eclissi_pilot_inventory', JSON.stringify(pilotInventory));
  }, [pilotInventory]);


  // RetrocompatibilitÃ  per GameScreen e vecchie referenze
  const selectedAbilities = useMemo(() => [selectedAbility, null, null], [selectedAbility]);

  const [selectedDeck, setSelectedDeck] = useState(() => {
    return localStorage.getItem('eclissi_selected_deck') || 'neutral_starter';
  });

    // Filtri rimossi: gestiti internamente da PersonalLoadoutModal e ShopModal



  // Inventario Mazzi con Livello di Risonanza (1â€“3 Singoli / 1â€“6 Doppi / 1â€“9 Tripli)
  const [deckInventory, setDeckInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_deck_inventory');
      if (saved) return JSON.parse(saved);
      const legacyUnlocked = JSON.parse(localStorage.getItem('eclissi_unlocked_decks') || '{"neutral_starter":true}');
      const initialMap = {};
      Object.keys(legacyUnlocked).forEach(dId => {
        initialMap[dId] = { level: 1, unlocked: true };
      });
      if (!initialMap.neutral_starter) initialMap.neutral_starter = { level: 1, unlocked: true };
      return initialMap;
    } catch (_) {
      return { neutral_starter: { level: 1, unlocked: true } };
    }
  });

  const [equippedEnvironment, setEquippedEnvironment] = useState(() => localStorage.getItem('eclissi_env') || 'deep_space');
  const [unlockedEnvironments, setUnlockedEnvironments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_unlocked_envs') || '{"deep_space":true}');
    } catch (_) { return { deep_space: true }; }
  });
  const [previewEnvironment, setPreviewEnvironment] = useState(null);

  // 6. RISORSE ED ECONOMIA
  const [stardust, setStardust] = useState(() => parseInt(localStorage.getItem('eclissi_stardust') || '100', 10));
    // STATO SERBATOIO SCANNER (CAP 60s, RESET 24H)
  const [scannerSeconds, setScannerSeconds] = useState(() => {
    const saved = parseInt(localStorage.getItem('eclissi_scanner_seconds') || '60', 10);
    const lastRefill = parseInt(localStorage.getItem('eclissi_last_scanner_refill') || '0', 10);

    if (Date.now() - lastRefill >= SCANNER_REFILL_INTERVAL_MS) {
      localStorage.setItem('eclissi_last_scanner_refill', Date.now().toString());
      localStorage.setItem('eclissi_scanner_seconds', '60');
      return 60;
    }
    return Math.min(SCANNER_TANK_MAX, Math.max(0, saved));
  });

  useEffect(() => {
    localStorage.setItem('eclissi_scanner_seconds', scannerSeconds.toString());
  }, [scannerSeconds]);

    // stardustSiloStored rimosso: l'overflow è calcolato dinamicamente tramite progressionEngine

  const [diamonds, setDiamonds] = useState(() => parseInt(localStorage.getItem('eclissi_diamonds') || '0', 10));
  const [lives, setLives] = useState(() => {
    const current = parseInt(localStorage.getItem('eclissi_lives') || '3', 10);
    const lvl = parseInt(localStorage.getItem('eclissi_level') || '1', 10);
    const maxL = typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(lvl) : 3;
    if (current >= maxL) return current;

    const lastStr = localStorage.getItem('eclissi_lastLifeUpdate');
    if (!lastStr) {
      localStorage.setItem('eclissi_lastLifeUpdate', Date.now().toString());
      return current;
    }

    const elapsed = Date.now() - parseInt(lastStr, 10);
    const recovered = Math.floor(elapsed / 28800000);
    if (recovered > 0) {
      const updated = Math.min(maxL, current + recovered);
      localStorage.setItem('eclissi_lastLifeUpdate', (Date.now() - (elapsed % 28800000)).toString());
      return updated;
    }
    return current;
  });

  // Loop di verifica e ripristino automatico delle Vite
  useEffect(() => {
    const maxL = typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(level) : 3;
    if (lives >= maxL) return;

    const interval = setInterval(() => {
      const lastStr = localStorage.getItem('eclissi_lastLifeUpdate');
      const last = lastStr ? parseInt(lastStr, 10) : Date.now();
      const elapsed = Date.now() - last;

      if (elapsed >= 28800000) {
        setLives(prev => {
          const next = Math.min(maxL, prev + 1);
          localStorage.setItem('eclissi_lastLifeUpdate', Date.now().toString());
          return next;
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [lives, level]);

  const [credits, setCredits] = useState(() => {
    const saved = parseInt(localStorage.getItem('eclissi_credits') || (typeof INITIAL_PLAYER_CREDITS !== 'undefined' ? INITIAL_PLAYER_CREDITS.toString() : '200'), 10);
    const maxCredits = typeof INITIAL_PLAYER_CREDITS !== 'undefined' ? INITIAL_PLAYER_CREDITS : 200;
    if (saved >= maxCredits) return saved;

    const lastTime = parseInt(localStorage.getItem('eclissi_last_credit_time') || Date.now().toString(), 10);
    const elapsed = Date.now() - lastTime;
    const recovered = Math.floor(elapsed / 180000); // 1 credito ogni 3 minuti (180.000 ms)

    if (recovered > 0) {
      const updated = Math.min(maxCredits, saved + recovered);
      localStorage.setItem('eclissi_last_credit_time', (Date.now() - (elapsed % 180000)).toString());
      return updated;
    }
    return saved;
  });
  const [creditTimerText, setCreditTimerText] = useState('MAX');

  // Loop di ricarica crediti passiva (+1âš¡ ogni 3 min) e aggiornamento timer HUD
  useEffect(() => {
    const maxCredits = typeof INITIAL_PLAYER_CREDITS !== 'undefined' ? INITIAL_PLAYER_CREDITS : 200;
    
    const interval = setInterval(() => {
      if (credits >= maxCredits) {
        setCreditTimerText('MAX');
        localStorage.setItem('eclissi_last_credit_time', Date.now().toString());
        return;
      }

      const lastTime = parseInt(localStorage.getItem('eclissi_last_credit_time') || Date.now().toString(), 10);
      const elapsed = Date.now() - lastTime;
      const remainingMs = Math.max(0, 180000 - (elapsed % 180000));
      const secTotal = Math.ceil(remainingMs / 1000);
      const m = Math.floor(secTotal / 60);
      const s = secTotal % 60;
      setCreditTimerText(`${m}:${s < 10 ? '0' : ''}${s}`);

      if (elapsed >= 180000) {
        const units = Math.floor(elapsed / 180000);
        setCredits(prev => {
          const next = Math.min(maxCredits, prev + units);
          localStorage.setItem('eclissi_last_credit_time', (Date.now() - (elapsed % 180000)).toString());
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [credits]);

  
  const [dailyBettingDiamondsEarned, setDailyBettingDiamondsEarned] = useState(() => {
    const savedDate = localStorage.getItem('eclissi_betting_diamond_date');
    const todayStr = new Date().toDateString();
    if (savedDate !== todayStr) {
      localStorage.setItem('eclissi_betting_diamond_date', todayStr);
      localStorage.setItem('eclissi_daily_betting_diamonds', '0');
      return 0;
    }
    return parseInt(localStorage.getItem('eclissi_daily_betting_diamonds') || '0', 10);
  });

    const [ether, setEther] = useState(() => parseInt(localStorage.getItem('eclissi_ether') || '0', 10));
  const [extractorLevel, setExtractorLevel] = useState(() => parseInt(localStorage.getItem('eclissi_extractor_level') || '1', 10));
  const [extractorStored, setExtractorStored] = useState(() => {
    const stored = parseInt(localStorage.getItem('eclissi_extractor_stored') || '0', 10);
    const lastTime = parseInt(localStorage.getItem('eclissi_extractor_last_time') || Date.now().toString(), 10);
    const lvl = parseInt(localStorage.getItem('eclissi_extractor_level') || '1', 10);
    const cfg = typeof EXTRACTOR_LEVELS !== 'undefined' ? (EXTRACTOR_LEVELS[lvl] || EXTRACTOR_LEVELS[1]) : { intervalMs: 28800000, maxStore: 4 };
    const elapsed = Date.now() - lastTime;
    const gained = Math.floor(elapsed / cfg.intervalMs);
    return Math.min(cfg.maxStore, stored + gained);
  });
  const [extractorLastTime, setExtractorLastTime] = useState(() => parseInt(localStorage.getItem('eclissi_extractor_last_time') || Date.now().toString(), 10));

  // Loop passivo per l'accumulo temporale di Etere Cosmico
  useEffect(() => {
    const checkExtractor = () => {
      const cfg = typeof EXTRACTOR_LEVELS !== 'undefined' ? (EXTRACTOR_LEVELS[extractorLevel] || EXTRACTOR_LEVELS[1]) : { intervalMs: 28800000, maxStore: 4 };
      if (extractorStored >= cfg.maxStore) return;

      const now = Date.now();
      const elapsed = now - extractorLastTime;
      const units = Math.floor(elapsed / cfg.intervalMs);

      if (units > 0) {
        setExtractorStored(prev => Math.min(cfg.maxStore, prev + units));
        setExtractorLastTime(now - (elapsed % cfg.intervalMs));
      }
    };

    checkExtractor();
    const interval = setInterval(checkExtractor, 15000);
    return () => clearInterval(interval);
  }, [extractorLevel, extractorStored, extractorLastTime]);


  // MODALI & CLASSIFICA
  const [showProgression, setShowProgression] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [isSearchingPvP, setIsSearchingPvP] = useState(false);
  const [pvpMeta, setPvpMeta] = useState(null);
  const [bgmMutedState, setBgmMutedState] = useState(() => localStorage.getItem('eclissi_muted_bgm') === 'true');
  const [sfxMutedState, setSfxMutedState] = useState(() => localStorage.getItem('eclissi_muted_sfx') === 'true');

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeRuleDetail, setActiveRuleDetail] = useState(null);
  const [showExtractorModal, setShowExtractorModal] = useState(false);

  const [gameMode, setGameMode] = useState('adventure');
  const [bettingTier, setBettingTier] = useState(1);
  const [customBetAmount, setCustomBetAmount] = useState(250);
  const [bettingGameType, setBettingGameType] = useState('classic');
  const [activeAdventure, setActiveAdventure] = useState(null);
  const [popupMsg, setPopupMsg] = useState(null);
  const [pendingBetTier, setPendingBetTier] = useState(null);
  const [pendingBetConfirmation, setPendingBetConfirmation] = useState(null);

  const [battleSessionId, setBattleSessionId] = useState(0);
  const [maxUnlockedPlanet, setMaxUnlockedPlanet] = useState(() => parseInt(localStorage.getItem('eclissi_max_planet') || '1', 10));
  const [unlockedLevels, setUnlockedLevels] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('eclissi_unlocked_levels') || '{"1":1}');
    } catch (_) {
      return { 1: 1 };
    }
  });
  const [expandedPlanet, setExpandedPlanet] = useState(null);

  // STATO E FUNZIONE DEBUG PER TEST DIRETTO MODALITÀ
  const [showDebugModal, setShowDebugModal] = useState(false);

    const launchDirectTest = (planetNum, levelNum) => {
    // Campo Neutro forzato nei test: garantisce che il cambio carte e i comandi siano sempre attivi e testabili
    const modifier = { id: 'standard', name: 'Campo Neutro e Stabile', desc: 'Nessun effetto speciale attivo.' };
    const aiPower = typeof getAdventureAiPower === 'function' ? getAdventureAiPower(planetNum, levelNum) : 0.65;
    setGameMode('adventure');
    setPvpMeta(null);
    setActiveAdventure({ planet: planetNum, level: levelNum, modifier, aiPower });
    if (typeof playBGM === 'function') playBGM(levelNum === 10 ? 'boss' : 'battle');
    setBattleSessionId(s => s + 1);
    setStep('game');
    setShowDebugModal(false);
  };

  const launchHardpointTest = () => {
    const modifier = { id: 'standard', name: 'Collaudo 4 Hardpoint', desc: 'Test 2 Poker + 2 Calcolo' };
    setGameMode('hardpoint_test');
    setPvpMeta(null);
    setActiveAdventure({ planet: 1, level: 1, modifier, aiPower: 0.70 });
    if (typeof playBGM === 'function') playBGM('battle');
    setBattleSessionId(s => s + 1);
    setStep('game');
    setShowDebugModal(false);
  };



  // =========================================================================
  // CALCOLI DERIVATI & MEMO GLOBALI
  // =========================================================================
  const etherUnlockThreshold = typeof ETHER_UNLOCK_SECTOR !== 'undefined' ? ETHER_UNLOCK_SECTOR : 15;
  const pvpTrainingUnlockThreshold = typeof PVP_TRAINING_UNLOCK_SECTOR !== 'undefined' ? PVP_TRAINING_UNLOCK_SECTOR : 5;
  const pvpEliteUnlockThreshold = typeof PVP_ELITE_UNLOCK_SECTOR !== 'undefined' ? PVP_ELITE_UNLOCK_SECTOR : 81;
  const bettingUnlockThreshold = typeof BETTING_UNLOCK_ADVENTURE_SECTOR !== 'undefined' ? BETTING_UNLOCK_ADVENTURE_SECTOR : 11;
  const moduleUnlockThreshold = typeof ABILITY_MODULE_UNLOCK_CAMPAIGN_SECTOR !== 'undefined' ? ABILITY_MODULE_UNLOCK_CAMPAIGN_SECTOR : 9;
  const epic1LvlThreshold = typeof EPIC_SLOT_1_UNLOCK_LEVEL !== 'undefined' ? EPIC_SLOT_1_UNLOCK_LEVEL : 20;
  const epic2LvlThreshold = typeof EPIC_SLOT_2_UNLOCK_LEVEL !== 'undefined' ? EPIC_SLOT_2_UNLOCK_LEVEL : 60;
  const maxDailyEliteMatches = typeof PVP_ELITE_DAILY_MATCHES_CAP !== 'undefined' ? PVP_ELITE_DAILY_MATCHES_CAP : 10;
  const trainingEntryCost = typeof PVP_TRAINING_ENTRY_CREDITS !== 'undefined' ? PVP_TRAINING_ENTRY_CREDITS : 5;

  const currentGlobalAdventureSector = useMemo(() => {
    if (typeof calculateGlobalAdventureSector === 'function') {
      return calculateGlobalAdventureSector(maxUnlockedPlanet, unlockedLevels);
    }
    const p = Number(maxUnlockedPlanet) || 1;
    const l = Number(unlockedLevels?.[p]) || 1;
    return Math.min(200, (p - 1) * 10 + l);
  }, [maxUnlockedPlanet, unlockedLevels]);

  // Slot Modulo Ibrido sbloccato rigorosamente al raggiungimento del Settore 9 di Terra
  const isAbilityModuleUnlocked = useMemo(() => {
    return currentGlobalAdventureSector >= moduleUnlockThreshold;
  }, [currentGlobalAdventureSector, moduleUnlockThreshold]);


  const isEtherUnlocked = useMemo(() => {
    return currentGlobalAdventureSector > etherUnlockThreshold;
  }, [currentGlobalAdventureSector, etherUnlockThreshold]);

  const walletCap = useMemo(() => {
    return typeof getStardustWalletCap === 'function' ? getStardustWalletCap(level) : 1500;
  }, [level]);

  const tankConfig = useMemo(() => {
    if (typeof SUBSPACE_TANK_LEVELS !== 'undefined' && SUBSPACE_TANK_LEVELS[tankLevel]) {
      return SUBSPACE_TANK_LEVELS[tankLevel];
    }
    return { level: 1, name: 'Silo Subspaziale', maxVoid: 4, maxPrimordial: 2 };
  }, [tankLevel]);

  const maxPlayerHp = useMemo(() => {
    return typeof calculateUniversalPlayerHp === 'function' ? calculateUniversalPlayerHp(level) : 50;
  }, [level]);

  const t = useMemo(() => {
    if (typeof LANGUAGES !== 'undefined' && LANGUAGES[lang]) return LANGUAGES[lang];
    if (typeof LANGUAGES !== 'undefined' && LANGUAGES.it) return LANGUAGES.it;
    return { welcome: 'Benvenuto', start: 'Inizia', playSelected: 'Attacca', passTurn: 'Passa Turno', settingsTitle: 'Impostazioni', musicToggle: 'Musica', sfxToggle: 'Effetti', activeState: 'ATTIVO', disabledState: 'DISATTIVATO', langSelect: 'Lingua' };
  }, [lang]);

  const hasStabilizedRift1 = useMemo(() => Object.keys(unlockedRifts).length > 0, [unlockedRifts]);
  const hasTelluricRelic = useMemo(() => Boolean(unlockedRelics['relic_p1']), [unlockedRelics]);

  const currentDeckObj = useMemo(() => {
    if (typeof ALL_ABILITIES !== 'undefined') {
      return ALL_ABILITIES.find(c => c.id === selectedDeck) || ALL_ABILITIES.find(c => c.id === 'neutral_starter') || ALL_ABILITIES[0];
    }
    return { id: 'neutral_starter', name: 'Mazzo Neutro Cadetto', color: '#94a3b8', glow: 'rgba(148,163,184,0.5)' };
  }, [selectedDeck]);

  const currentPlanetName = useMemo(() => {
    if (typeof realPlanetNames !== 'undefined' && realPlanetNames[(maxUnlockedPlanet || 1) - 1]) {
      return realPlanetNames[(maxUnlockedPlanet || 1) - 1];
    }
    return `Pianeta ${maxUnlockedPlanet || 1}`;
  }, [maxUnlockedPlanet]);

  const currentPlanetLevel = (unlockedLevels && unlockedLevels[maxUnlockedPlanet]) || 1;
  
  const currentPlanetZone = useMemo(() => {
    if (typeof PLANET_ZONE_NAMES !== 'undefined' && PLANET_ZONE_NAMES[(maxUnlockedPlanet || 1) - 1]) {
      return PLANET_ZONE_NAMES[(maxUnlockedPlanet || 1) - 1][currentPlanetLevel - 1] || `Settore ${currentPlanetLevel}`;
    }
    return `Settore ${currentPlanetLevel}`;
  }, [maxUnlockedPlanet, currentPlanetLevel]);

  const currentSectorMode = useMemo(() => {
    if (typeof getSectorGameType === 'function') {
      return getSectorGameType(maxUnlockedPlanet || 1, Math.min(10, currentPlanetLevel));
    }
    return 'classic';
  }, [maxUnlockedPlanet, currentPlanetLevel]);

  const hasCompletedSector1 = useMemo(() => ((unlockedLevels?.[1] || 1) > 1) || (maxUnlockedPlanet > 1), [unlockedLevels, maxUnlockedPlanet]);

    // =========================================================================
  // CALLBACKS & HANDLERS
  // =========================================================================
  const triggerPopup = useCallback((msg) => {
    setPopupMsg(msg);
    setTimeout(() => setPopupMsg(null), 2500);
  }, []);

  const handleUnlockWeapon = useCallback((weaponId, cost = {}) => {
    const dustCost = cost.dust || 0;
    const diaCost = cost.diamonds || 0;
    if (stardust < dustCost || diamonds < diaCost) {
      triggerPopup("Risorse insufficienti per sbloccare quest'arma!");
      return;
    }
    try { playSound('ability'); } catch (_) {}
    if (dustCost > 0) setStardust(s => s - dustCost);
    if (diaCost > 0) setDiamonds(d => d - diaCost);
    setUnlockedWeapons(prev => ({ ...prev, [weaponId]: true }));
    triggerPopup("Nuova Arma sbloccata ed equipaggiabile!");
  }, [stardust, diamonds, triggerPopup]);


    // TICKER AUTOMATICO CANTIERE CON CONTROLLO IMMEDIATO AL BOOT
  useEffect(() => {
    if (forgeQueue.length === 0) return;

    const processCompleted = () => {
      const now = Date.now();
      const completed = forgeQueue.filter(item => now >= item.finishTime);
      if (completed.length > 0) {
        completed.forEach(item => {
          if (item.type === 'deck') {
            setDeckInventory(prev => ({ ...prev, [item.id]: { level: item.targetLevel, unlocked: true } }));
          } else if (item.type === 'ability') {
            setAbilities(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), level: item.targetLevel, unlocked: true } }));
          } else if (item.type === 'terrain') {
            setUnlockedTerrainCards(prev => ({ ...prev, [item.id]: { level: item.targetLevel, unlocked: true } }));
          } else if (item.type === 'epic') {
            setEpicItemsInventory(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { unlocked: true }), level: item.targetLevel } }));
          }
          try { playSound('epic_item_trigger'); } catch (_) {}
          triggerPopup(`⚙️ CANTIERE COMPLETATO:\n${item.name} potenziato a Livello ${item.targetLevel}!`);
        });
        setForgeQueue(prev => prev.filter(item => now < item.finishTime));
      }
    };

    // Esegui immediatamente al montaggio per sbloccare progetti già scaduti offline
    processCompleted();
    const interval = setInterval(processCompleted, 3000);
    return () => clearInterval(interval);
  }, [forgeQueue, triggerPopup]);


  // ACCELERAZIONE ISTANTANEA TRAMITE ETERE COSMICO
  const handleRushForge = useCallback((item) => {
    if (!item) return;
    if (ether < item.etherRush) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Etere insufficiente! Servono ${item.etherRush} 🔮 (Disponibile: ${ether}).`);
      return;
    }
    try { playSound('epic_item_trigger'); } catch (_) {}
    setEther(e => e - item.etherRush);

    if (item.type === 'deck') {
      setDeckInventory(prev => ({ ...prev, [item.id]: { level: item.targetLevel, unlocked: true } }));
    } else if (item.type === 'ability') {
      setAbilities(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), level: item.targetLevel, unlocked: true } }));
    } else if (item.type === 'terrain') {
      setUnlockedTerrainCards(prev => ({ ...prev, [item.id]: { level: item.targetLevel, unlocked: true } }));
    } else if (item.type === 'epic') {
      setEpicItemsInventory(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { unlocked: true }), level: item.targetLevel } }));
    }

    setForgeQueue(prev => prev.filter(q => !(q.id === item.id && q.type === item.type)));
    triggerPopup(`⚡ ACCELERAZIONE COMPLETATA!\n${item.name} potenziato immediatamente a Livello ${item.targetLevel}!`);
  }, [ether, triggerPopup]);


  const triggerAppDiscoveryTutorial = useCallback((tutorialKey) => {
    if (typeof window === 'undefined') return;
    try {
      const seen = JSON.parse(localStorage.getItem('eclissi_seen_tutorials') || '{}');
      if (!seen[tutorialKey]) {
        seen[tutorialKey] = true;
        localStorage.setItem('eclissi_seen_tutorials', JSON.stringify(seen));
        setActiveAppDiscoveryTutorial(tutorialKey);
      }
    } catch (_) {}
  }, []);

  const handlePvPMatchFound = useCallback((meta) => {
    setIsSearchingPvP(false);
    setPvpMeta(meta);
    setGameMode('pvp');
    setBattleSessionId(s => s + 1);
    setStep('game');
  }, []);

  const handlePvPCancel = useCallback(() => {
    setIsSearchingPvP(false);
    if (selectedPvPChannel === 'training') {
      setCredits(c => c + trainingEntryCost);
    } else {
      setEliteMatchesPlayedToday(p => Math.max(0, p - 1));
    }
    triggerPopup("Ricerca annullata. Rimborsato.");
  }, [selectedPvPChannel, trainingEntryCost, triggerPopup]);

      const addStardustSafe = useCallback((amount) => {
    setStardust(prev => {
      const maxVoid = tankConfig?.maxVoid || 4;
      const res = calculateStardustOverflow(prev, amount, walletCap, voidCrystals, maxVoid, hasStabilizedRift1);

      
      if (res.crystalsEarned > 0) {
        setVoidCrystals(res.newVoid);
        try { playSound('dust_extract'); } catch (_) {}
        triggerPopup(`🌟 Portafoglio pieno!\nL'eccedenza è stata condensata in +${res.crystalsEarned} Cristallo/i di Vuoto 💠!`);
      } else if (res.isCapped) {
        triggerPopup(`⚠️ Portafoglio al limite massimo (${walletCap} 🌟)!`);
      }
      return res.newDust;
    });
  }, [walletCap, voidCrystals, tankConfig, hasStabilizedRift1, triggerPopup]);



  const addVoidCrystalsSafe = useCallback((amount) => {
    if (!hasStabilizedRift1) return;
    setVoidCrystals(prev => {
      const next = prev + amount;
      if (next >= tankConfig.maxVoid) return tankConfig.maxVoid;
      return next;
    });
  }, [hasStabilizedRift1, tankConfig.maxVoid]);

  const addPrimordialMatterSafe = useCallback((amount) => {
    if (!hasStabilizedRift1) return;
    setPrimordialMatter(prev => {
      const next = prev + amount;
      if (next >= tankConfig.maxPrimordial) return tankConfig.maxPrimordial;
      return next;
    });
  }, [hasStabilizedRift1, tankConfig.maxPrimordial]);

  const addBettingDiamondsSafe = useCallback((amount) => {
    const dailyCap = typeof DAILY_BETTING_DIAMOND_CAP !== 'undefined' ? DAILY_BETTING_DIAMOND_CAP : 10;
    if (dailyBettingDiamondsEarned >= dailyCap) return 0;
    const canEarn = Math.min(amount, dailyCap - dailyBettingDiamondsEarned);
    if (canEarn > 0) {
      setDiamonds(d => d + canEarn);
      setDailyBettingDiamondsEarned(prev => {
        const next = prev + canEarn;
        localStorage.setItem('eclissi_daily_betting_diamonds', next.toString());
        return next;
      });
    }
    return canEarn;
  }, [dailyBettingDiamondsEarned]);

    const handleCollapseRift = useCallback((riftId, itemId) => {
    setUnlockedRifts(prev => ({ ...prev, [riftId]: true }));
    setEpicItemsInventory(prev => ({
      ...prev,
      [itemId]: { level: 1, unlocked: true }
    }));
    // Auto-equipaggia nello Slot 1 se vuoto, oppure nello Slot 2
    setEquippedEpicItems(prev => {
      if (!prev[0]) return [itemId, prev[1]];
      if (!prev[1] && prev[0] !== itemId) return [prev[0], itemId];
      return prev;
    });
    triggerPopup(`🌌 VARCO STABILIZZATO!\nManufatto Epico forgiato ed equipaggiato in Plancia!`);
  }, [triggerPopup]);


    const handleUpgradeEpicItem = useCallback((itemId, targetLevel, cost) => {
        if (forgeQueue.length >= 2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Entrambi i 2 Slot del Cantiere sono occupati!");
      return;
    }
    if (forgeQueue.some(item => item.id === itemId && item.type === 'epic')) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Questo manufatto   gi  in lavorazione nel Cantiere!");
      return;
    }
    if (stardust < cost.dust || voidCrystals < cost.voidCrystals || primordialMatter < cost.primordialMatter) {
      triggerPopup("Risorse o minerali insufficienti per il potenziamento!");
      return;
    }
    const itemObj = typeof EPIC_ITEMS_DATABASE !== 'undefined' ? EPIC_ITEMS_DATABASE.find(e => e.id === itemId) : null;
    const forgeParams = getForgeParams('epic', targetLevel);

    try { playSound('ability'); } catch (_) {}
    setStardust(s => s - cost.dust);
    if (cost.voidCrystals > 0) setVoidCrystals(v => v - cost.voidCrystals);
    if (cost.primordialMatter > 0) setPrimordialMatter(p => p - cost.primordialMatter);

    setForgeQueue(prev => [...prev, {
      type: 'epic',
      id: itemId,
      name: itemObj?.name?.split(' ')[0] || 'Manufatto',
      targetLevel,
      finishTime: Date.now() + forgeParams.durationMs,
      etherRush: forgeParams.etherRush
    }]);
    triggerPopup(` FORGIATURA AVVIATA!\nManufatto ${itemObj?.name?.split(' ')[0] || ''} in sintesi (Slot ${forgeQueue.length + 1}/2). Pronto tra ${forgeParams.label}.`);

  }, [stardust, voidCrystals, primordialMatter, forgeQueue, triggerPopup]);


  const handleUpgradeSubspaceTank = useCallback((costDust, nextLevel) => {
    if (stardust < costDust) {
      triggerPopup("Polvere Stellare insufficiente!");
      return;
    }
    setStardust(s => s - costDust);
    setTankLevel(nextLevel);
    triggerPopup(`Serbatoio potenziato al Livello ${nextLevel}!`);
  }, [stardust, triggerPopup]);
    // Ricarica serbatoio scanner: 1 Diamante = +10 Secondi
    const handleBuyScannerRefill = useCallback(() => {
    if (scannerSeconds >= SCANNER_TANK_MAX) {
      triggerPopup("Il Serbatoio Scanner è già al massimo (60s)!");
      return;
    }
    if (diamonds < 1) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Ti serve 1 Diamante 💎 per acquistare 10 secondi di Scanner!");
      return;
    }
    try { playSound('ability'); } catch (_) {}
    setDiamonds(d => d - 1);
    setScannerSeconds(s => Math.min(SCANNER_TANK_MAX, s + SCANNER_DIAMOND_REFILL_RATE));
    triggerPopup("+10s Scanner aggiunti al serbatoio! (-1 💎)");
  }, [scannerSeconds, diamonds, triggerPopup]);


  // GESTORE AVVIO SFIDA DEL GIORNO IN SANDBOX ISOLATA
  const handleLaunchDailyChallenge = useCallback((cfg) => {
    // 1. Blocco immediato anti-exploit
    const updated = {
      ...dailyData,
      hasAttemptedToday: true,
      lastCompletedDate: cfg.dateStr
    };
    saveDailyChallengeData(updated);
    setDailyData(updated);

    // 2. Imposta sandbox e avvia
    setShowDailyModal(false);
    setGameMode('daily_challenge');
    setPvpMeta(null);
    setActiveAdventure({
      planet: 7,
      level: 1,
      modifier: { id: 'standard', name: 'Sfida del Giorno', desc: `Regole del giorno: ${cfg.dateStr}` },
      aiPower: 0.85,
      dailyConfig: cfg
    });

    if (typeof playBGM === 'function') playBGM('boss');
    setBattleSessionId(s => s + 1);
    setStep('game');
  }, [dailyData]);

  // GESTORE RISCATTO REPORT GIORNALIERO (ORE 00:00:01)
  const handleClaimDailyReport = useCallback(() => {
    if (!dailyReportData) return;
    const { rewards, streakBonus } = dailyReportData;

    try { playSound('epic_item_trigger'); } catch (_) {}

    // Accredito premi piazzamento
    if (rewards.dust > 0) addStardustSafe(rewards.dust);
    if (rewards.diamonds > 0) setDiamonds(d => d + rewards.diamonds);
    if (rewards.voidCrystals > 0) addVoidCrystalsSafe(rewards.voidCrystals);
    if (rewards.primordialMatter > 0) addPrimordialMatterSafe(rewards.primordialMatter);
    if (rewards.scannerSeconds > 0) setScannerSeconds(s => Math.min(SCANNER_TANK_MAX, s + rewards.scannerSeconds));

    // Accredito premi streak milestone
    if (streakBonus) {
      if (streakBonus.dust > 0) addStardustSafe(streakBonus.dust);
      if (streakBonus.diamonds > 0) setDiamonds(d => d + streakBonus.diamonds);
      if (streakBonus.voidCrystals > 0) addVoidCrystalsSafe(streakBonus.voidCrystals);
      if (streakBonus.primordialMatter > 0) addPrimordialMatterSafe(streakBonus.primordialMatter);
      if (streakBonus.scannerRefill) setScannerSeconds(SCANNER_TANK_MAX);
    }

    // Segna report come riscosso
    const saved = loadDailyChallengeData();
    saved.pendingReward = { ...saved.pendingReward, claimed: true };
    saveDailyChallengeData(saved);
    setDailyData(saved);
    setDailyReportData(null);

    triggerPopup("Premi della Sfida del Giorno riscossi con successo!");
  }, [dailyReportData, addStardustSafe, addVoidCrystalsSafe, addPrimordialMatterSafe, triggerPopup]);


  // =========================================================================
  // GESTORE POTENZIAMENTO MAZZI (3, 6 E 9 LIVELLI CON GATING PILOTA)
  // =========================================================================
    // GESTIONE SBLOCCO & UPGRADE PILOTI TATTICI
    const handleUnlockPilot = useCallback((pilotId, cost) => {
    const diaCost = cost.diamonds ?? cost.dia ?? 0;
    const voidCost = cost.voidCrystals ?? cost.voidC ?? 0;
    const primCost = cost.primordialMatter ?? cost.prim ?? 0;

    if (stardust < (cost.dust || 0) || diamonds < diaCost || voidCrystals < voidCost || primordialMatter < primCost) {
      triggerPopup("Risorse insufficienti per reclutare questo pilota!");
      return;
    }
    try { playSound('ability'); } catch (_) {}
    if (cost.dust > 0) setStardust(s => s - cost.dust);
    if (diaCost > 0) setDiamonds(d => d - diaCost);
    if (voidCost > 0) setVoidCrystals(v => v - voidCost);
    if (primCost > 0) setPrimordialMatter(p => p - primCost);

    setPilotInventory(prev => ({
      ...prev,
      [pilotId]: { level: 1, unlocked: true }
    }));
    triggerPopup("Nuovo Pilota Tattico reclutato nell'Hangar!");
  }, [stardust, diamonds, voidCrystals, primordialMatter, triggerPopup]);


    const handleUpgradePilot = useCallback((pilotId, targetLevel, cost) => {
    const diaCost = cost.dia ?? cost.diamonds ?? 0;
    const voidCost = cost.voidC ?? cost.voidCrystals ?? 0;
    const primCost = cost.prim ?? cost.primordialMatter ?? 0;

    if (stardust < (cost.dust || 0) || diamonds < diaCost || voidCrystals < voidCost || primordialMatter < primCost) {
      triggerPopup("Risorse insufficienti per il potenziamento di grado!");
      return;
    }
    try { playSound('epic_item_trigger'); } catch (_) {}
    if (cost.dust > 0) setStardust(s => s - cost.dust);
    if (diaCost > 0) setDiamonds(d => d - diaCost);
    if (voidCost > 0) setVoidCrystals(v => v - voidCost);
    if (primCost > 0) setPrimordialMatter(p => p - primCost);

    setPilotInventory(prev => ({
      ...prev,
      [pilotId]: { ...(prev[pilotId] || { unlocked: true }), level: targetLevel }
    }));
    triggerPopup(`Pilota potenziato al Grado ${targetLevel}/5!`);
  }, [stardust, diamonds, voidCrystals, primordialMatter, triggerPopup]);


    // (handleEquipEntireSet rimosso: non referenziato)


  const handleUpgradeDeck = useCallback((deckId) => {

    const deckObj = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === deckId) : null;
    if (!deckObj || deckObj.id === 'neutral_starter') {
      triggerPopup("Il Mazzo Neutro Cadetto rimane fisso a Livello 1.");
      return;
    }

    const curData = deckInventory[deckId] || { level: 1, unlocked: false };
    if (!curData.unlocked) {
      triggerPopup("Devi prima sbloccare il mazzo!");
      return;
    }

    const curLvl = curData.level || 1;
    const maxDeckLevel = deckObj.maxLevel || 3;
    if (curLvl >= maxDeckLevel) {
      triggerPopup(`Mazzo giÃ  al Livello Massimo (${maxDeckLevel}/3/6/9)!`);
      return;
    }

    const nextLvl = curLvl + 1;
    const upgradeCostObj = deckObj.upgradeCosts?.[nextLvl];
    const reqPilotLevel = upgradeCostObj?.reqPilotLevel || getRequiredPilotLevelForUpgrade(nextLvl);

    if (level < reqPilotLevel) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`ðŸ”’ Richiede Pilota Livello ${reqPilotLevel} (Attuale: ${level})!`);
      return;
    }

        const costConfig = UNIFIED_UPGRADE_COSTS[nextLvl] || { dust: nextLvl * 500, voidCrystals: 0, primordialMatter: 0 };
    const dustCost = costConfig.dust;
    const voidCost = costConfig.voidCrystals || 0;
    const primCost = costConfig.primordialMatter || 0;

    if (stardust < dustCost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Polvere Stellare insufficiente! Servono ${dustCost} 🌟 (Hai: ${stardust}).`);
      return;
    }

    if (voidCrystals < voidCost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Cristalli di Vuoto insufficienti! Servono ${voidCost} ðŸ’  (Hai: ${voidCrystals}).`);
      return;
    }

    if (primordialMatter < primCost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Materia Primordiale insufficiente! Servono ${primCost} 🟣 (Hai: ${primordialMatter}).`);
      return;
    }

          if (forgeQueue.length >= 2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Entrambi i 2 Slot del Cantiere sono occupati!");
      return;
    }
    if (forgeQueue.some(item => item.id === deckId && item.type === 'deck')) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Questo mazzo   gi  in lavorazione nel Cantiere!");
      return;
    }

    const forgeParams = getForgeParams('deck', nextLvl);

    try { playSound('ability'); } catch (_) {}
    setStardust(s => s - dustCost);
    if (voidCost > 0) setVoidCrystals(v => v - voidCost);
    if (primCost > 0) setPrimordialMatter(p => p - primCost);

    setForgeQueue(prev => [...prev, {
      type: 'deck',
      id: deckId,
      name: deckObj.name.split(' ')[0],
      targetLevel: nextLvl,
      finishTime: Date.now() + forgeParams.durationMs,
      etherRush: forgeParams.etherRush
    }]);

    triggerPopup(` FORGIATURA AVVIATA!\nMazzo ${deckObj.name.split(' ')[0]} in sintesi (Slot ${forgeQueue.length + 1}/2). Pronto tra ${forgeParams.label}.`);

  }, [deckInventory, level, stardust, voidCrystals, primordialMatter, forgeQueue, triggerPopup]);



    const launchSectorBattle = useCallback((planetNum, levelNum) => {
    const cost = (levelNum <= 5 ? 5 : (levelNum <= 9 ? 10 : 15));

    // A Terra S9: sblocco ed equipaggiamento automatico del Modulo Abilità in base al Pilota scelto
    const hasAnyAbilityUnlocked = Object.keys(abilities).some(k => abilities[k]?.unlocked);
    if (planetNum === 1 && levelNum === 9 && !hasAnyAbilityUnlocked) {
      const pilotToModuleMap = {
        pilot_com_1: 'aries',
        pilot_com_2: 'taurus',
        pilot_com_3: 'gemini',
        pilot_com_4: 'cancer'
      };
      const autoModuleId = pilotToModuleMap[selectedPilot] || 'aries';
      setAbilities(prev => ({ ...prev, [autoModuleId]: { unlocked: true, level: 1 } }));
      setSelectedAbility(autoModuleId);
      triggerPopup("⚡ SETTORE 9: Modulo Abilità Ibrido sbloccato ed equipaggiato in plancia!");
    }

        // A Terra S10: sblocco ed equipaggiamento automatico del primo Mazzo con Passiva allineato al Pilota
    if (planetNum === 1 && levelNum === 10 && Object.keys(deckInventory).filter(k => deckInventory[k]?.unlocked).length <= 1) {
      const pilotToDeckMap = {
        pilot_com_1: 'aries',
        pilot_com_2: 'taurus',
        pilot_com_3: 'gemini',
        pilot_com_4: 'cancer'
      };
      const autoDeckId = pilotToDeckMap[selectedPilot] || 'aries';
      const updatedDeckInv = {
        ...deckInventory,
        [autoDeckId]: { level: 1, unlocked: true }
      };
      localStorage.setItem('eclissi_deck_inventory', JSON.stringify(updatedDeckInv));
      setDeckInventory(updatedDeckInv);
      setSelectedDeck(autoDeckId);
      triggerPopup(`👑 SCONTRO BOSS: Equipaggiato Mazzo ${autoDeckId.toUpperCase()} con Abilità Passiva!`);
    }


    if (credits < cost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Crediti insufficienti! Servono ${cost} Crediti âš¡.`);
      return;
    }

    try { playSound('click'); } catch (_) {}
    setCredits(c => c - cost);
    const modifier = typeof getPlanetLevelModifier === 'function' ? getPlanetLevelModifier(planetNum, levelNum) : null;
    const aiPower = typeof getAdventureAiPower === 'function' ? getAdventureAiPower(planetNum, levelNum) : 0.65;
    
    setSelectedSectorForBriefing(null);
    setGameMode('adventure');
    setPvpMeta(null);
    setActiveAdventure({ planet: planetNum, level: levelNum, modifier, aiPower });
    if (typeof playBGM === 'function') playBGM(levelNum === 10 ? 'boss' : 'battle');
        setBattleSessionId(s => s + 1);
    setStep('game');
  }, [abilities, deckInventory, credits, selectedPilot, triggerPopup]);


  const handleQuickResumeRadar = useCallback(() => {
    const curP = maxUnlockedPlanet || 1;
    const curL = (unlockedLevels && unlockedLevels[curP]) || 1;
    const targetLvl = Math.min(10, curL);
    try { playSound('click'); } catch (_) {}
    setSelectedSectorForBriefing({ planetNum: curP, levelNum: targetLvl });
  }, [maxUnlockedPlanet, unlockedLevels]);

  const unlockAbilityWithDust = useCallback((id) => {
    const ab = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === id) : null;
    if (!ab) return;
    const cost = ab.unlockCostDust || 150;

    if (ab.type === 'planet_char') {
      const isBossBeaten = typeof isPlanetBossDefeated === 'function' ? isPlanetBossDefeated(ab.planetNum, unlockedLevels, maxUnlockedPlanet) : true;
      if (!isBossBeaten) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Devi prima sconfiggere il Boss al Settore 10 per abilitare questo modulo!`);
        return;
      }
    }

    if (stardust < cost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Polvere Stellare insufficiente! Servono ${cost} Polvere 🌟.`);
      return;
    }

    try { playSound('ability'); } catch (_) {}
    setStardust(s => s - cost);
    setAbilities(prev => ({ ...prev, [id]: { unlocked: true, level: 1 } }));
    triggerPopup(`Modulo ${ab.name} sbloccato a Livello 1 ed equipaggiabile! (-${cost} 🌟)`);
  }, [unlockedLevels, maxUnlockedPlanet, stardust, triggerPopup]);

  // POTENZIAMENTO MODULO ABILITÃ€ IBRIDO CON GATING PILOTA SUI 3 SCAGLIONI (1â€“9)
  const upgradeAbilityWithDust = useCallback((id) => {
    const ab = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === id) : null;
    if (!ab) return;
    const current = abilities[id] || { level: 1, unlocked: false };
    const maxAbLevel = ab.maxLevel || 3;
    const nextLvl = current.level + 1;

    if (current.level >= maxAbLevel) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Livello massimo raggiunto per questo Modulo (${maxAbLevel})!`);
      return;
    }

    const reqPilotLvl = getRequiredPilotLevelForUpgrade(nextLvl);
    if ((level || 1) < reqPilotLvl) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`ðŸ”’ Richiede Pilota Livello ${reqPilotLvl} (Fascia ${nextLvl >= 7 ? '3' : nextLvl >= 4 ? '2' : '1'})!`);
      return;
    }

    const costConfig = UNIFIED_UPGRADE_COSTS[nextLvl] || { dust: nextLvl * 400, voidCrystals: 0, primordialMatter: 0 };
    const costDust = costConfig.dust;
    const costVoid = costConfig.voidCrystals || 0;
    const costPrim = costConfig.primordialMatter || 0;

    if (stardust < costDust) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Polvere Stellare insufficiente. Servono ${costDust} 🌟.`);
      return;
    }
    if (voidCrystals < costVoid) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Cristalli di Vuoto insufficienti. Servono ${costVoid} ðŸ’ .`);
      return;
    }
    if (primordialMatter < costPrim) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Materia Primordiale insufficiente. Servono ${costPrim} 🟣.`);
      return;
    }

      if (forgeQueue.length >= 2) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Entrambi i 2 Slot del Cantiere sono occupati!");
      return;
    }
    if (forgeQueue.some(item => item.id === id && item.type === 'ability')) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Questo modulo   gi  in lavorazione nel Cantiere!");
      return;
    }

    const forgeParams = getForgeParams('ability', nextLvl);

    try { playSound('ability'); } catch (_) {}
    setStardust(s => s - costDust);
    if (costVoid > 0) setVoidCrystals(v => v - costVoid);
    if (costPrim > 0) setPrimordialMatter(p => p - costPrim);

    setForgeQueue(prev => [...prev, {
      type: 'ability',
      id: id,
      name: ab.name.split(' ')[0],
      targetLevel: nextLvl,
      finishTime: Date.now() + forgeParams.durationMs,
      etherRush: forgeParams.etherRush
    }]);

    triggerPopup(` FORGIATURA AVVIATA!\nModulo ${ab.name.split(' ')[0]} in sintesi (Slot ${forgeQueue.length + 1}/2). Pronto tra ${forgeParams.label}.`);

  }, [abilities, level, stardust, voidCrystals, primordialMatter, forgeQueue, triggerPopup]);



  const unlockDeck = useCallback((deckId) => {
    const deckObj = typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES.find(a => a.id === deckId) : null;
    if (!deckObj) return;

    const curData = deckInventory[deckId] || { level: 1, unlocked: false };

    if (curData.unlocked) {
      try { playSound('click'); } catch (_) {}
      setSelectedDeck(deckId);
      triggerPopup(`Mazzo ${deckObj.name} (Liv. ${curData.level}) selezionato!`);
      return;
    }

    if (deckObj.type === 'planet_char') {
      const isBossBeaten = typeof isPlanetBossDefeated === 'function' ? isPlanetBossDefeated(deckObj.planetNum, unlockedLevels, maxUnlockedPlanet) : true;
      if (!isBossBeaten) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Devi prima sconfiggere il Boss al Settore 10 per abilitare questo mazzo!`);
        return;
      }
    }

    const diamondCost = deckObj.unlockCostDiamonds || (deckObj.tier === 3 ? 30 : (deckObj.tier === 2 ? 20 : 10));
    if (diamonds < diamondCost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Ti servono ${diamondCost} Diamanti per sbloccare questo mazzo!`);
      return;
    }

    try { playSound('ability'); } catch (_) {}
    setDiamonds(d => d - diamondCost);
    setDeckInventory(prev => {
      const updated = {
        ...prev,
        [deckId]: { level: 1, unlocked: true }
      };
      localStorage.setItem('eclissi_deck_inventory', JSON.stringify(updated));
      return updated;
    });
    setSelectedDeck(deckId);
    triggerPopup(`Mazzo ${deckObj.name} sbloccato a Livello 1 ed equipaggiato! (-${diamondCost} 💎)`);
  }, [deckInventory, unlockedLevels, maxUnlockedPlanet, diamonds, triggerPopup]);

  const handleUnlockOrEquipEnvironment = useCallback((envId, cost = 0, isPlanetEnv = false, planetNum = 1) => {
    if (unlockedEnvironments[envId]) {
      try { playSound('click'); } catch (_) {}
      setEquippedEnvironment(envId);
      triggerPopup(`Sfondo selezionato con successo!`);
      if (previewEnvironment) setPreviewEnvironment(prev => ({ ...prev, isEquipped: true, isUnlocked: true }));
      return;
    }

    if (isPlanetEnv) {
      const isBossDefeated = typeof isPlanetBossDefeated === 'function' ? isPlanetBossDefeated(planetNum, unlockedLevels, maxUnlockedPlanet) : true;
      if (!isBossDefeated) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Devi prima sconfiggere il Boss del Settore 10 per abilitare l'acquisto!`);
        return;
      }
    }

    if (diamonds < cost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Diamanti insufficienti! Servono ${cost} Diamanti 💎.`);
      return;
    }

    try { playSound('ability'); } catch (_) {}
    setDiamonds(d => d - cost);
    setUnlockedEnvironments(prev => ({ ...prev, [envId]: true }));
    setEquippedEnvironment(envId);
    triggerPopup(`Nuovo Sfondo sbloccato ed equipaggiato! (-${cost} 💎)`);
    if (previewEnvironment) setPreviewEnvironment(prev => ({ ...prev, isEquipped: true, isUnlocked: true }));
  }, [unlockedEnvironments, unlockedLevels, maxUnlockedPlanet, diamonds, previewEnvironment, triggerPopup]);

  const handleBuyStorePackage = useCallback((pkg) => {
    const { type, amount, cost } = pkg;
    if (diamonds < cost) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Diamanti insufficienti! Servono ${cost} Diamanti 💎.`);
      return;
    }

    if (type === 'void_crystals') {
      if (voidCrystals + amount > tankConfig.maxVoid) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Capienza Serbatoio superata! Potenzia prima il Silo.`);
        return;
      }
      setDiamonds(d => d - cost);
      addVoidCrystalsSafe(amount);
      triggerPopup(`+${amount} Cristalli di Vuoto ðŸ’  salvati nel serbatoio!`);
    } else if (type === 'primordial_matter') {
      if (primordialMatter + amount > tankConfig.maxPrimordial) {
        try { playSound('deselect'); } catch (_) {}
        triggerPopup(`Capienza Serbatoio superata! Potenzia prima il Silo.`);
        return;
      }
      setDiamonds(d => d - cost);
      addPrimordialMatterSafe(amount);
      triggerPopup(`+${amount} Materia Primordiale 🟣 salvata nel serbatoio!`);
    } else if (type === 'lives') {
      setDiamonds(d => d - cost);
      const maxL = typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(level) : 3;
      setLives(l => Math.min(maxL, l + amount));
      triggerPopup(`+${amount} Vite ripristinate con successo!`);
    } else if (type === 'credits') {
      setDiamonds(d => d - cost);
      setCredits(c => c + amount);
      triggerPopup(`+${amount} Crediti aggiunti al conto!`);
    } else if (type === 'stardust') {
      setDiamonds(d => d - cost);
      addStardustSafe(amount);
      triggerPopup(`+${amount} Polvere Stellare ottenuta!`);
    } else if (type === 'ether') {
      setDiamonds(d => d - cost);
      setEther(e => e + amount);
      triggerPopup(`+${amount} Etere Cosmico aggiunto!`);
    }
  }, [diamonds, voidCrystals, primordialMatter, tankConfig, level, addVoidCrystalsSafe, addPrimordialMatterSafe, addStardustSafe, triggerPopup]);

    const handleGameEnd = useCallback((winnerName, battleMeta = {}) => {
    const isPlayerWin = (winnerName === nickname);

       // TRACCIAMENTO GLOBALE CONTRATTI (ATTIVO IN TUTTE LE MODALITÀ: CAMPAGNA, PVE, PVP)
    const stats = battleMeta?.matchStats;
    const currentBounties = dailyBountiesStateRef.current?.bounties;
    if (stats && currentBounties) {
      const completedNow = [];
      let changed = false;

      const updated = currentBounties.map(b => {

        if (b.completed) return b;
        let added = 0;
        if (b.type === 'op_div') added = stats.opCounts?.['/'] || 0;
        else if (b.type === 'suit_hearts') added = stats.heartsPlayed || 0;
        else if (b.type === 'module_act') added = stats.moduleActivations || 0;
        else if (b.type === 'four_suits') added = stats.goldenOrComboCount || 0;
        else if (b.type === 'fast_strike') added = stats.fastStrikesCount || 0;

        if (added > 0) {
          changed = true;
          const nextP = Math.min(b.target, b.progress + added);
          const isDone = nextP >= b.target;
          if (isDone) completedNow.push(b.name);
          return { ...b, progress: nextP, completed: isDone };
        }
        return b;
      });

      if (changed) {
        setDailyBountiesState(prev => ({ ...prev, bounties: updated }));
        if (completedNow.length > 0) {
          try { playSound('win'); } catch (_) {}
          triggerPopup(`🎯 CONTRATTO COMPLETATO:\n${completedNow.join(', ')}!`);
        }
      }
    }


    // GESTIONE COMPLETAMENTO SFIDA DEL GIORNO
    if (gameMode === 'daily_challenge') {

      const current = loadDailyChallengeData();
      if (isPlayerWin) {
        current.streak = (current.streak || 0) + 1;
        current.todayResult = {
          victory: true,
          turns: battleMeta.turnsElapsed || 4,
          timeElapsedMs: battleMeta.activeTimeElapsedMs || 32000,
          remainingHpPct: battleMeta.remainingHpPct || 0.65,
          timestamp: Date.now()
        };
        triggerPopup(`🏆 SFIDA DEL GIORNO VINTA!\nSerie: 🔥 ${current.streak} Giorni! Il piazzamento finale arriverà a mezzanotte.`);
      } else {
        current.streak = 0; // Hard reset streak su sconfitta
        current.todayResult = {
          victory: false,
          turns: 0,
          timeElapsedMs: 0,
          remainingHpPct: 0.0,
          timestamp: Date.now()
        };
        triggerPopup("✗ SCONFITTA NELLA SFIDA DEL GIORNO\nSerie azzerata a 0. Nessun recupero possibile.");
      }
      saveDailyChallengeData(current);
      setDailyData(current);
      return;
    }


       if (battleMeta.isDraw) {
      if (gameMode === 'pve') {
        const tier = typeof BETTING_LEVELS !== 'undefined' ? BETTING_LEVELS[bettingTier] : null;
        if (tier) {
          setCredits(c => c + tier.costCredits);
          if (tier.resource === 'stardust') addStardustSafe(customBetAmount);
          if (tier.resource === 'voidCrystals') addVoidCrystalsSafe(customBetAmount);
          if (tier.resource === 'primordialMatter') addPrimordialMatterSafe(customBetAmount);
          if (tier.resource === 'diamonds') setDiamonds(d => d + customBetAmount);
        }
      } else if (battleMeta.isPvP && battleMeta.pvpChannel === 'training') {
        setCredits(c => c + trainingEntryCost);
      }
      triggerPopup("PAREGGIO PER CARTE FINITE!\nNessun vincitore: crediti e risorse rimborsati.");
      return;
    }

    if (battleMeta.isPvP) {
      const isElite = battleMeta.pvpChannel === 'elite';
      const currentWeekKey = typeof getWeeklyLeaderboardKey === 'function' ? getWeeklyLeaderboardKey() : 'current_week';

      if (isPlayerWin) {
        const pvpWinCredits = typeof PVP_WIN_CREDITS !== 'undefined' ? PVP_WIN_CREDITS : 20;
        const pvpWinStardust = typeof PVP_WIN_STARDUST !== 'undefined' ? PVP_WIN_STARDUST : 45;
        const pvpWinXp = typeof PVP_WIN_XP !== 'undefined' ? PVP_WIN_XP : 80;

        const earnedTrophies = isElite ? (battleMeta.pvpTrophiesAwarded || 15) : 0;
        const earnedBonusDiamonds = isElite ? (battleMeta.pvpBonusDiamonds || 0) : 0;
        const newTrophies = trophies + earnedTrophies;
        const newWins = pvpWins + 1;

        if (isElite) {
          setTrophies(newTrophies);
          if (earnedBonusDiamonds > 0) setDiamonds(d => d + earnedBonusDiamonds);
        }
        setPvpWins(newWins);
        if (!isElite) setCredits(c => c + pvpWinCredits);
        addStardustSafe(pvpWinStardust);
        if (hasStabilizedRift1) addVoidCrystalsSafe(1);
        setXp(x => x + pvpWinXp);

        if (typeof db !== 'undefined' && db && isElite) {
          update(ref(db, `leaderboards/${currentWeekKey}/${myPlayerId}`), {
            nickname,
            deck: selectedDeck,
            level,
            trophies: newTrophies,
            wins: newWins,
            losses: pvpLosses,
            lastUpdated: Date.now()
          });
        }
      } else {
        const pvpLossTrophies = typeof PVP_LOSS_TROPHIES !== 'undefined' ? PVP_LOSS_TROPHIES : 10;
        const pvpLossStardust = typeof PVP_LOSS_STARDUST !== 'undefined' ? PVP_LOSS_STARDUST : 15;
        const pvpLossXp = typeof PVP_LOSS_XP !== 'undefined' ? PVP_LOSS_XP : 25;

        const lostTrophies = (isElite && trophies > 100) ? pvpLossTrophies : 0;
        const newTrophies = isElite 
          ? Math.max(100, trophies - lostTrophies) 
          : Math.max(0, trophies - lostTrophies);
        const newLosses = pvpLosses + 1;

        if (isElite) setTrophies(newTrophies);
        setPvpLosses(newLosses);
        addStardustSafe(pvpLossStardust);
        setXp(x => x + pvpLossXp);

        if (typeof db !== 'undefined' && db && isElite) {
          update(ref(db, `leaderboards/${currentWeekKey}/${myPlayerId}`), {
            nickname,
            deck: selectedDeck,
            level,
            trophies: newTrophies,
            wins: pvpWins,
            losses: newLosses,
            lastUpdated: Date.now()
          });
        }

        triggerPopup(`Partita terminata. Consolazione: +${pvpLossStardust} Polvere 🌟, +${pvpLossXp} XP`);
      }
      return;
    }


     if (isPlayerWin) {
      if (gameMode === 'adventure' && activeAdventure) {
                const planetNum = activeAdventure.planet;
        const levelNum = activeAdventure.level;
        const sectorKey = `P${planetNum}_L${levelNum}`;
        const newEarned = battleMeta?.starsEarned || [true, false, false];

        setCampaignStars(prev => {
          const prevStars = prev[sectorKey] || [false, false, false];
          const mergedStars = [
            prevStars[0] || newEarned[0],
            prevStars[1] || newEarned[1],
            prevStars[2] || newEarned[2]
          ];
          const updated = { ...prev, [sectorKey]: mergedStars };
          localStorage.setItem('eclissi_campaign_stars', JSON.stringify(updated));
          return updated;
        });


        const maxLvl = unlockedLevels?.[planetNum] || 1;
        const isReplay = levelNum < maxLvl;
        let reward = typeof getLevelReward === 'function' ? getLevelReward(planetNum, levelNum, isReplay) : { stardust: 50, diamonds: 0, xp: 40 };

        const isBossFight = levelNum === 10;
        const isFlawlessBossWin = isBossFight && !battleMeta.usedRevive;

        if (isFlawlessBossWin) {
          reward = {
            ...reward,
            stardust: reward.stardust * 2,
            diamonds: reward.diamonds * 2,
            xp: reward.xp * 2
          };
        }

        addStardustSafe(reward.stardust);
        if (reward.diamonds > 0) setDiamonds(d => d + reward.diamonds);
        setXp(x => x + reward.xp);

        if (isBossFight) {
          const relicKey = `relic_p${planetNum}`;
          setUnlockedRelics(prev => ({ ...prev, [relicKey]: true }));

          // SBLOCCO AUTOMATICO CARTA PILOTA BOSS (COSTO ZERO A GRADO 1)
          const bossPilotId = `pilot_boss_${planetNum}`;
          setPilotInventory(prev => {
            if (prev[bossPilotId]) return prev;
            return {
              ...prev,
              [bossPilotId]: { level: 1, unlocked: true }
            };
          });

          triggerPopup(` BOSS PIANETA ${planetNum} SCONFITTO!\nReliquia acquisita e Carta Pilota sbloccata nell'Hangar!`);

          const nextP = Math.min(20, planetNum + 1);
          setMaxUnlockedPlanet(p => Math.min(20, Math.max(p, nextP)));
          setUnlockedLevels(prev => {
            const nextMap = { ...prev, [planetNum]: 11 };
            if (planetNum < 20) {
              nextMap[planetNum + 1] = Math.max(prev?.[planetNum + 1] || 1, 1);
            }
            return nextMap;
          });
        } else {
          setUnlockedLevels(prev => ({
            ...prev,
            [planetNum]: Math.max(prev?.[planetNum] || 1, levelNum + 1)
          }));
        }

      } else if (gameMode === 'pve') {
        const tier = typeof BETTING_LEVELS !== 'undefined' ? BETTING_LEVELS[bettingTier] : null;
        if (tier) {
          const totalWon = customBetAmount * 2; // Raddoppio secco 2x
          setCredits(c => c + tier.costCredits); // Rimborso ticket

          if (tier.resource === 'stardust') {
            addStardustSafe(totalWon);
          } else if (tier.resource === 'voidCrystals') {
            addVoidCrystalsSafe(totalWon);
          } else if (tier.resource === 'primordialMatter') {
            addPrimordialMatterSafe(totalWon);
          } else if (tier.resource === 'diamonds') {
            // Restituisce la puntata e aggiunge il guadagno netto con il cap giornaliero
            setDiamonds(d => d + customBetAmount);
            addBettingDiamondsSafe(customBetAmount);
          }

          setXp(x => x + (tier.xp || 60));
          triggerPopup(` SCOMMESSA VINTA!\nIncassati ${totalWon} ${tier.unit} (Raddoppio 2x confermato!)`);
        }
      }

    } else {
      // PROTOCOLLO DATI DI TELEMETRIA SULLA SCONFITTA
      const telemetry = calculateTelemetryOnDefeat(battleMeta.turnsElapsed || 1, walletCap);
      setXp(x => x + telemetry.xpEarned);
      addStardustSafe(telemetry.dustEarned);
      triggerPopup(`Sconfitta Tattica.\nDati di Telemetria: +${telemetry.dustEarned} 🌟 Polvere | +${telemetry.xpEarned} XP Pilota!`);
    }

                  }, [nickname, trophies, pvpWins, pvpLosses, selectedDeck, level, myPlayerId, hasStabilizedRift1, addStardustSafe, addVoidCrystalsSafe, addPrimordialMatterSafe, addBettingDiamondsSafe, gameMode, bettingTier, customBetAmount, activeAdventure, unlockedLevels, walletCap, triggerPopup]);




  const handleNextAdventureLevel = useCallback(() => {
    const savedProfile = localStorage.getItem('eclissi_profile');
    if (!savedProfile) {
      setStep('welcome');
      return;
    }
    if (!activeAdventure) {
      setStep('adv');
      return;
    }
    const currentP = activeAdventure.planet || 1;
    const currentL = activeAdventure.level || 1;
    if (currentL >= 10) {
      setStep('adv');
      return;
    }
    const nextL = currentL + 1;
    setStep('adv');
    setSelectedSectorForBriefing({ planetNum: currentP, levelNum: nextL });
  }, [activeAdventure]);


  const handleHardResetData = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm("ATTENZIONE: Vuoi azzerare tutti i salvataggi e ripristinare il gioco allo stato iniziale? Tutti i progressi andranno persi.")) {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  // GESTORE RISCATTO CAPSULE STELLARI (40 MILESTONE OGNI 15 â­)
  const handleClaimStarCapsule = useCallback((milestone) => {
    if (totalCampaignStars < milestone) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup(`Richiede ${milestone} Stelle! (Ne hai: ${totalCampaignStars})`);
      return;
    }
    if (claimedStarCapsules[milestone]) {
      try { playSound('deselect'); } catch (_) {}
      triggerPopup("Capsula giÃ  riscattata!");
      return;
    }

    const reward = getStarCapsuleReward(milestone);
    try { playSound('epic_item_trigger'); } catch (_) {}

    // Accredito risorse standard
    addStardustSafe(reward.dust);
    if (reward.diamonds > 0) setDiamonds(d => d + reward.diamonds);
    if (reward.ether > 0) setEther(e => e + reward.ether);
    if (reward.voidCrystals > 0) addVoidCrystalsSafe(reward.voidCrystals);
    if (reward.primordialMatter > 0) addPrimordialMatterSafe(reward.primordialMatter);

    // Sblocco oggetto esclusivo se presente
    if (reward.unlockItem) {
      const item = reward.unlockItem;
      if (item.type === 'terrain') {
        setUnlockedTerrainCards(prev => ({ ...prev, [item.id]: { level: 1, unlocked: true } }));
      } else if (item.type === 'ability') {
        setAbilities(prev => ({ ...prev, [item.id]: { level: 1, unlocked: true } }));
      } else if (item.type === 'deck') {
        setDeckInventory(prev => ({ ...prev, [item.id]: { level: 1, unlocked: true } }));
      }
    }

    setClaimedStarCapsules(prev => {
      const updated = { ...prev, [milestone]: true };
      localStorage.setItem('eclissi_claimed_capsules', JSON.stringify(updated));
      return updated;
    });

    triggerPopup(`🌟 CAPSULA ${milestone}â­ RISCATTATA!\n+${reward.dust}🌟 ${reward.diamonds > 0 ? `+${reward.diamonds}💎 ` : ''}${reward.unlockItem ? `\nðŸŽ‰ SBLOCCATO: ${reward.unlockItem.name}!` : ''}`);
  }, [totalCampaignStars, claimedStarCapsules, addStardustSafe, addVoidCrystalsSafe, addPrimordialMatterSafe, triggerPopup]);


    const handleStartBettingGame = useCallback((tierNum, amount, chosenGameType) => {
    const tier = typeof BETTING_LEVELS !== 'undefined' ? BETTING_LEVELS[tierNum] : null;
    if (!tier) return;

    const bet = Number(amount) || tier.minBet;

    if (credits < tier.costCredits) {
      triggerPopup(`Crediti insufficienti! Servono ${tier.costCredits} Crediti .`);
      return;
    }

    if (tier.resource === 'stardust' && stardust < bet) {
      triggerPopup(`Polvere insufficiente! Vuoi puntare ${bet}  ma ne possiedi ${stardust}.`);
      return;
    }
    if (tier.resource === 'voidCrystals' && voidCrystals < bet) {
      triggerPopup(`Cristalli insufficienti! Vuoi puntare ${bet}  ma ne possiedi ${voidCrystals}.`);
      return;
    }
    if (tier.resource === 'primordialMatter' && primordialMatter < bet) {
      triggerPopup(`Materia insufficiente! Vuoi puntare ${bet}  ma ne possiedi ${primordialMatter}.`);
      return;
    }
    if (tier.resource === 'diamonds' && diamonds < bet) {
      triggerPopup(`Diamanti insufficienti! Vuoi puntare ${bet}  ma ne possiedi ${diamonds}.`);
      return;
    }

    // Detrae la puntata e i crediti: se perdi la partita, l'importo   perso
    setCredits(c => c - tier.costCredits);
    if (tier.resource === 'stardust') setStardust(s => s - bet);
    if (tier.resource === 'voidCrystals') setVoidCrystals(v => v - bet);
    if (tier.resource === 'primordialMatter') setPrimordialMatter(p => p - bet);
    if (tier.resource === 'diamonds') setDiamonds(d => d - bet);

    setBettingTier(tierNum);
    setCustomBetAmount(bet);
    setBettingGameType(chosenGameType);
    setGameMode('pve');
    setPvpMeta(null);
    setPendingBetTier(null);
    setPendingBetConfirmation(null);
    setBattleSessionId(s => s + 1);
    setStep('game');
  }, [credits, stardust, voidCrystals, primordialMatter, diamonds, triggerPopup]);


  // =========================================================================
  // EFFETTI GLOBALI & SINCRONIZZAZIONE STORAGE
  // =========================================================================
  useEffect(() => {
    if (typeof playBGM === 'function') {
      if (['home', 'welcome', 'decks', 'abilities', 'environments', 'epic_items'].includes(step)) playBGM('menu');
      else if (step === 'adv') playBGM('adventure');
    }
  }, [step]);

  // Nessun popup invasivo al cambio schermata: navigazione libera ed esplorativa
  useEffect(() => {
    // La Home e i modali rimangono esplorabili senza interruzioni automatiche
  }, [step]);



    useEffect(() => {
    // Spotlight tour automatico disattivato per non bloccare l'ingresso in Home
  }, []);


  // CONTROLLO LEVEL UP PILOTA
  useEffect(() => {
    const neededXp = typeof getXpThresholdForLevel === 'function' ? getXpThresholdForLevel(level) : 120 + level * 50;
    const maxLvl = typeof MAX_PLAYER_LEVEL !== 'undefined' ? MAX_PLAYER_LEVEL : 100;
    if (xp >= neededXp && level < maxLvl) {
      setXp(prev => prev - neededXp);
      setLevel(prev => {
        const nextLvl = prev + 1;
        const rewards = typeof getLevelUpRewards === 'function' ? getLevelUpRewards(nextLvl) : { stardust: 100, diamonds: 1, lives: 0 };
        addStardustSafe(rewards.stardust);
        if (rewards.diamonds > 0) setDiamonds(d => d + rewards.diamonds);
        if (rewards.lives > 0) setLives(l => l + rewards.lives);

        const newHp = typeof calculateUniversalPlayerHp === 'function' ? calculateUniversalPlayerHp(nextLvl) : 50;
        triggerPopup(`ðŸŽ‰ LIVELLO PILOTA ${nextLvl} RAGGIUNTO!\n+${rewards.stardust} 🌟 | +${rewards.diamonds} 💎 | HP: ${newHp}`);
        return nextLvl;
      });
    }
  }, [xp, level, addStardustSafe, triggerPopup]);

  useEffect(() => { localStorage.setItem('eclissi_level', level.toString()); }, [level]);
  useEffect(() => { localStorage.setItem('eclissi_xp', xp.toString()); }, [xp]);
  useEffect(() => { localStorage.setItem('eclissi_trophies', trophies.toString()); }, [trophies]);
  useEffect(() => { localStorage.setItem('eclissi_pvp_wins', pvpWins.toString()); }, [pvpWins]);
  useEffect(() => { localStorage.setItem('eclissi_pvp_losses', pvpLosses.toString()); }, [pvpLosses]);
  useEffect(() => { localStorage.setItem('eclissi_elite_matches_played', eliteMatchesPlayedToday.toString()); }, [eliteMatchesPlayedToday]);
  useEffect(() => { localStorage.setItem('eclissi_abilities', JSON.stringify(abilities)); }, [abilities]);
    useEffect(() => {
    if (selectedAbility) {
      localStorage.setItem('eclissi_selected_ability', selectedAbility);
    } else {
      localStorage.removeItem('eclissi_selected_ability');
    }
  }, [selectedAbility]);

  useEffect(() => { localStorage.setItem('eclissi_selected_deck', selectedDeck); }, [selectedDeck]);
  useEffect(() => { localStorage.setItem('eclissi_deck_inventory', JSON.stringify(deckInventory)); }, [deckInventory]);
  useEffect(() => { localStorage.setItem('eclissi_stardust', stardust.toString()); }, [stardust]);
    // (Rimossa persistenza ridondante del silo polvere)

  useEffect(() => { localStorage.setItem('eclissi_diamonds', diamonds.toString()); }, [diamonds]);
  useEffect(() => { localStorage.setItem('eclissi_lives', lives.toString()); }, [lives]);
  useEffect(() => { localStorage.setItem('eclissi_credits', credits.toString()); }, [credits]);
  useEffect(() => { localStorage.setItem('eclissi_tour_completed', hasCompletedHomeTour.toString()); }, [hasCompletedHomeTour]);
    // (Rimossa persistenza ridondante mini tut)

  useEffect(() => { localStorage.setItem('eclissi_ether', ether.toString()); }, [ether]);
  useEffect(() => { localStorage.setItem('eclissi_extractor_level', extractorLevel.toString()); }, [extractorLevel]);
  useEffect(() => { localStorage.setItem('eclissi_extractor_stored', extractorStored.toString()); }, [extractorStored]);
  useEffect(() => { localStorage.setItem('eclissi_extractor_last_time', extractorLastTime.toString()); }, [extractorLastTime]);
  useEffect(() => { localStorage.setItem('eclissi_env', equippedEnvironment); }, [equippedEnvironment]);
  useEffect(() => { localStorage.setItem('eclissi_unlocked_envs', JSON.stringify(unlockedEnvironments)); }, [unlockedEnvironments]);
  useEffect(() => { localStorage.setItem('eclissi_max_planet', maxUnlockedPlanet.toString()); }, [maxUnlockedPlanet]);
  useEffect(() => { localStorage.setItem('eclissi_unlocked_levels', JSON.stringify(unlockedLevels)); }, [unlockedLevels]);
  useEffect(() => { localStorage.setItem('eclissi_muted_bgm', bgmMutedState.toString()); }, [bgmMutedState]);
  useEffect(() => { localStorage.setItem('eclissi_muted_sfx', sfxMutedState.toString()); }, [sfxMutedState]);
  useEffect(() => { localStorage.setItem('eclissi_unlocked_relics', JSON.stringify(unlockedRelics)); }, [unlockedRelics]);
  useEffect(() => { localStorage.setItem('eclissi_unlocked_rifts', JSON.stringify(unlockedRifts)); }, [unlockedRifts]);
  useEffect(() => { localStorage.setItem('eclissi_epic_inventory', JSON.stringify(epicItemsInventory)); }, [epicItemsInventory]);
  useEffect(() => { localStorage.setItem('eclissi_equipped_epic_items', JSON.stringify(equippedEpicItems)); }, [equippedEpicItems]);
  useEffect(() => { localStorage.setItem('eclissi_void_crystals', voidCrystals.toString()); }, [voidCrystals]);
  useEffect(() => { localStorage.setItem('eclissi_primordial_matter', primordialMatter.toString()); }, [primordialMatter]);
  useEffect(() => { localStorage.setItem('eclissi_tank_level', tankLevel.toString()); }, [tankLevel]);
  useEffect(() => { localStorage.setItem('eclissi_unlocked_terrain_cards', JSON.stringify(unlockedTerrainCards)); }, [unlockedTerrainCards]);
  useEffect(() => { localStorage.setItem('eclissi_equipped_terrain_slots', JSON.stringify(equippedTerrainSlots)); }, [equippedTerrainSlots]);

    const extractorConfig = typeof EXTRACTOR_LEVELS !== 'undefined' && EXTRACTOR_LEVELS[extractorLevel] ? EXTRACTOR_LEVELS[extractorLevel] : { level: 1, name: 'Estrattore', maxStore: 4 };
  const nextExtractorConfig = typeof EXTRACTOR_LEVELS !== 'undefined' ? EXTRACTOR_LEVELS[extractorLevel + 1] : null;

    // --------------------------------------------------------------------------
  // 1. SCHERMATA SPLASH FLUIDA & COERENTE CON LA HOME (SENZA SCATOLE GRIGIE)
  // --------------------------------------------------------------------------
  if (step === 'splash') {
    const handleProceed = () => {
      try { playSound('click'); } catch (_) {}
      const savedProfile = localStorage.getItem('eclissi_profile');

      if (!savedProfile) {
        // Primo avvio: lancia subito Terra Settore 1
        setNickname('Cadetto');
        const modifier = typeof getPlanetLevelModifier === 'function' ? getPlanetLevelModifier(1, 1) : null;
        const aiPower = typeof getAdventureAiPower === 'function' ? getAdventureAiPower(1, 1) : 0.65;
        setGameMode('adventure');
        setPvpMeta(null);
        setActiveAdventure({ planet: 1, level: 1, modifier, aiPower });
        if (typeof playBGM === 'function') playBGM('battle');
        setBattleSessionId(s => s + 1);
        setStep('game');
      } else {
        try {
          const p = JSON.parse(savedProfile);
          setNickname(p.nickname || 'Pilota');
        } catch (_) {}
        setStep('home');
      }
    };

    return (
      <div 
        onClick={handleProceed}
        style={{ 
          width: '100vw', 
          height: '100dvh', 
          maxHeight: '100dvh', 
          position: 'relative', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: 'clamp(14px, 3vmin, 28px) 16px', 
          boxSizing: 'border-box', 
          color: '#fff', 
          cursor: 'pointer' 
        }}
      >
        <DeepSpaceUniverseCanvas currentEnvironmentId={equippedEnvironment} />

        {/* I 4 VENTAGLI D'ANGOLO DEGLI ASSI (IDENTICI ALLA HOME) */}
        <div style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 30 }}>
          <CornerAceFan suitId="hearts" corner="nw" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} />
        </div>
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 30 }}>
          <CornerAceFan suitId="diamonds" corner="ne" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} />
        </div>
        <div style={{ position: 'absolute', bottom: '80px', left: '8px', zIndex: 30 }}>
          <CornerAceFan suitId="spades" corner="sw" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} />
        </div>
        <div style={{ position: 'absolute', bottom: '80px', right: '8px', zIndex: 30 }}>
          <CornerAceFan suitId="clubs" corner="se" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} />
        </div>

        {/* INTESTAZIONE SUPERIORE FLUTTUANTE */}
        <div style={{ textAlign: 'center', zIndex: 10, marginTop: 'clamp(4px, 1.5vmin, 16px)' }}>
          <div style={{ 
            fontSize: 'clamp(0.6rem, 1.4vmin, 0.75rem)', 
            color: '#facc15', 
            fontWeight: 900, 
            letterSpacing: '2.5px', 
            textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(250, 204, 21, 0.8)' 
          }}>
            ✦ COMBATTIMENTO MATEMATICO TATTICO ✦
          </div>
          <h1 style={{ 
            margin: '4px 0 0 0', 
            fontSize: 'clamp(1.6rem, 4.5vmin, 2.5rem)', 
            fontWeight: 900, 
            letterSpacing: '3px', 
            color: '#ffffff', 
            textShadow: '0 0 20px rgba(0, 242, 254, 0.9), 0 0 40px rgba(0, 242, 254, 0.5)' 
          }}>
            ECLISSI STELLARE
          </h1>
        </div>

        {/* VANO CENTRALE: FASCIO DI LUCE, CARTA FLUTTUANTE E VORTICE CINETICO */}
        <div style={{ 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: 'auto 0', 
          zIndex: 10 
        }}>
          <div className="trophy-beam" />

          {/* CARTA DEL MAZZO FLUTTUANTE (78x116 PX) */}
          <div className="hero-card-anim" style={{ zIndex: 2, width: 78, height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TacticalVisual
              id={selectedDeck}
              type="card_back"
              color={currentDeckObj?.color || '#38bdf8'}
              glowColor={currentDeckObj?.glow || 'rgba(56, 189, 248, 0.7)'}
              width={78}
              height={116}
            />
          </div>

          {/* VORTICE A 3 STRATI SINCRONIZZATO */}
          <div className="trophy-base-platform">
            <div className="trophy-base-ring">
              <div className="trophy-base-core" />
            </div>
          </div>

          <div style={{ 
            marginTop: '10px', 
            fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', 
            fontWeight: 800, 
            color: '#94a3b8', 
            letterSpacing: '1px' 
          }}>
            TOCCA OVUNQUE PER ENTRARE
          </div>
        </div>

        {/* PULSANTE CINETICO IN BASSO */}
        <div style={{ width: '100%', maxWidth: '360px', zIndex: 10, marginBottom: 'clamp(6px, 1.5vmin, 16px)' }}>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); handleProceed(); }} 
            className="cyber-btn cyber-btn-primary" 
            style={{ 
              width: '100%', 
              padding: 'clamp(11px, 2.2vmin, 16px)', 
              fontSize: 'clamp(0.88rem, 2vmin, 1.05rem)', 
              fontWeight: 900,
              letterSpacing: '1.5px',
              boxShadow: '0 0 25px rgba(0, 242, 254, 0.7)'
            }}
          >
            ENTRA IN BATTAGLIA ➔
          </button>
        </div>

      </div>
    );
  }


  // --------------------------------------------------------------------------
  // 2. SELEZIONE LINGUA
  // --------------------------------------------------------------------------
  if (step === 'lang') {

    const isFirstAccess = !localStorage.getItem('eclissi_profile');

    const selectLanguage = (selectedLang) => {
      try { playSound('click'); } catch (_) {}
      setLang(selectedLang);
      localStorage.setItem('eclissi_lang', selectedLang);
      if (isFirstAccess) setStep('welcome');
      else setStep('home');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#fff', position: 'relative' }}>
        <DeepSpaceUniverseCanvas currentEnvironmentId={equippedEnvironment} />
        <div className="cyber-panel" style={{ padding: '2rem', textAlign: 'center', maxWidth: '380px', width: '90%', position: 'relative', zIndex: 5, border: '1.5px solid #00f2fe', boxShadow: '0 0 30px rgba(0, 242, 254, 0.35)' }}>
          <h2 style={{ color: '#00f2fe', marginTop: 0, fontWeight: '900', textShadow: '0 0 10px rgba(0, 242, 254, 0.5)' }}>Seleziona Lingua</h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1rem 0' }}>Choose language / Scegli la lingua:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
            <button className="cyber-btn" onClick={() => selectLanguage('it')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡®ðŸ‡¹ Italiano</button>
            <button className="cyber-btn" onClick={() => selectLanguage('en')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡¬ðŸ‡§ English</button>
            <button className="cyber-btn" onClick={() => selectLanguage('de')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡©ðŸ‡ª Deutsch</button>
            <button className="cyber-btn" onClick={() => selectLanguage('es')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡ªðŸ‡¸ EspaÃ±ol</button>
            <button className="cyber-btn" onClick={() => selectLanguage('fr')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡«ðŸ‡· FranÃ§ais</button>
            <button className="cyber-btn" onClick={() => selectLanguage('zh')} style={{ padding: '0.75rem', fontSize: '0.82rem' }}>ðŸ‡¨ðŸ‡³ ä¸­æ–‡</button>
          </div>
          <button className="cyber-btn" onClick={() => setStep(isFirstAccess ? 'splash' : 'home')} style={{ width: '100%', marginTop: '1rem', padding: '0.5rem' }}>
            Indietro
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. REGISTRAZIONE LICENZA PILOTA & SCELTA STARTER (STILE FLUTTUANTE HOME)
  // --------------------------------------------------------------------------
  if (step === 'welcome') {
    const starterPilots = ['pilot_com_1', 'pilot_com_2', 'pilot_com_3', 'pilot_com_4'];
    const currentChosenPilot = selectedPilot || 'pilot_com_1';

    const handleRegister = (e) => {
      e.preventDefault();
      const finalName = nickname.trim() || 'Pilota Alpha';
      const chosenPilotId = currentChosenPilot;

      try { playSound('epic_item_trigger'); } catch (_) {}

      localStorage.setItem('eclissi_profile', JSON.stringify({ nickname: finalName }));
      localStorage.setItem('eclissi_selected_pilot', chosenPilotId);
      
      const newInventory = {
        [chosenPilotId]: { level: 1, unlocked: true }
      };
      localStorage.setItem('eclissi_pilot_inventory', JSON.stringify(newInventory));

      setNickname(finalName);
      setSelectedPilot(chosenPilotId);
      setPilotInventory(newInventory);
      setStep('home');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '100dvh', maxHeight: '100dvh', color: '#ffffff', padding: 'clamp(12px, 2.5vmin, 24px) 16px', position: 'relative', boxSizing: 'border-box', overflow: 'hidden' }}>
        <DeepSpaceUniverseCanvas currentEnvironmentId={equippedEnvironment} />
        
        {/* INTESTAZIONE OLOGRAFICA SOSPESA */}
        <div style={{ textAlign: 'center', zIndex: 10, flexShrink: 0, marginTop: 'clamp(4px, 1vmin, 10px)' }}>
          <div style={{ fontSize: 'clamp(0.6rem, 1.4vmin, 0.72rem)', color: '#facc15', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>
            ADDESTRAMENTO COMPLETATO 🏆
          </div>
          <h1 style={{ margin: '2px 0 0 0', fontSize: 'clamp(1.4rem, 3.8vmin, 1.9rem)', fontWeight: 900, color: '#00f2fe', letterSpacing: '1.5px', textShadow: '0 0 18px rgba(0, 242, 254, 0.85)' }}>
            RILASCIO LICENZA
          </h1>
        </div>

        {/* INPUT NICKNAME LASER MINIMALE (SENZA SCATOLE) */}
        <div style={{ width: '100%', maxWidth: '320px', zIndex: 10, textAlign: 'center', flexShrink: 0 }}>
          <input 
            type="text" 
            required 
            placeholder="INSERISCI IL TUO NICKNAME..." 
            value={nickname === 'Cadetto' ? '' : nickname} 
            onChange={(e) => setNickname(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '6px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: '2px solid #00f2fe', 
              color: '#fff', 
              outline: 'none', 
              fontSize: 'clamp(0.95rem, 2.2vmin, 1.15rem)', 
              fontWeight: 900, 
              textAlign: 'center', 
              letterSpacing: '1px',
              textShadow: '0 0 10px rgba(0, 242, 254, 0.75)',
              boxShadow: '0 4px 12px -4px rgba(0, 242, 254, 0.5)'
            }} 
          />
          <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '6px', fontWeight: 700 }}>
            Tocca la carta per scegliere il tuo Pilota Starter gratuito:
          </div>
        </div>

        {/* LE 4 CARTE REALI SOSPESE SUL PIANO SPAZIALE */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, auto)', 
          gap: 'clamp(10px, 2.5vmin, 20px)', 
          alignItems: 'center', 
          justifyContent: 'center',
          zIndex: 10,
          margin: 'auto 0'
        }}>
          {starterPilots.map((pilotId) => {
            const isSelected = currentChosenPilot === pilotId;
            return (
              <div
                key={pilotId}
                onClick={() => {
                  try { playSound('select'); } catch (_) {}
                  setSelectedPilot(pilotId);
                }}
                style={{
                  cursor: 'pointer',
                  transform: isSelected ? 'scale(1.08)' : 'scale(0.94)',
                  transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.25s ease',
                  filter: isSelected ? 'drop-shadow(0 0 20px rgba(0, 242, 254, 0.95))' : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.85)) opacity(0.72)',
                  position: 'relative'
                }}
              >
                <PilotCard pilot={pilotId} compact={true} isEquipped={isSelected} />

                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#00f2fe',
                    color: '#020617',
                    fontSize: '0.52rem',
                    fontWeight: 900,
                    padding: '1px 8px',
                    borderRadius: '10px',
                    boxShadow: '0 0 10px #00f2fe',
                    whiteSpace: 'nowrap'
                  }}>
                    ✓ ATTIVO
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PULSANTE CINETICO FLUTTUANTE */}
        <div style={{ width: '100%', maxWidth: '360px', zIndex: 10, flexShrink: 0, marginBottom: 'clamp(4px, 1vmin, 10px)' }}>
          <button 
            type="button" 
            onClick={handleRegister} 
            className="cyber-btn cyber-btn-primary" 
            style={{ 
              width: '100%', 
              padding: 'clamp(10px, 2vmin, 15px)', 
              fontSize: 'clamp(0.85rem, 2vmin, 1rem)', 
              fontWeight: 900, 
              letterSpacing: '1px' 
            }}
          >
            CONFERMA & ENTRA ALLA BASE ➔
          </button>
        </div>
      </div>
    );
  }




  // --------------------------------------------------------------------------
  // 4. VISTE MODULARI (AVVENTURA, MAZZI, ABILITÃ€ & SFONDI)
  // --------------------------------------------------------------------------
  // ============================================================================
  // ROTTA ORBITALE STELLARE (STILE FLUTTUANTE SENZA SCATOLE GRIGIE)
  // ============================================================================
  const renderAdventureView = () => {
    const activePlanetNum = expandedPlanet || maxUnlockedPlanet || 1;
    const activePlanetIdx = activePlanetNum - 1;
    const activePlanetName = realPlanetNames?.[activePlanetIdx] || `Pianeta ${activePlanetNum}`;
    const maxLvlInActivePlanet = unlockedLevels?.[activePlanetNum] || 1;
    const pStats = getPlanetStarsStats(activePlanetNum, campaignStars);

    // Palette colore specifica per pianeta per immergere la vista
    const planetColors = [
      '#00f2fe', '#ef4444', '#f59e0b', '#ec4899', '#10b981',
      '#eab308', '#06b6d4', '#3b82f6', '#64748b', '#d97706',
      '#0284c7', '#6366f1', '#14b8a6', '#f43f5e', '#d946ef',
      '#0ea5e9', '#84cc16', '#f97316', '#dc2626', '#38bdf8'
    ];
    const curPlanetThemeColor = planetColors[activePlanetIdx] || '#00f2fe';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxHeight: '100dvh', justifyContent: 'space-between', padding: 'clamp(6px, 1.2vmin, 14px) clamp(8px, 2vmin, 16px)', boxSizing: 'border-box', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
        
        {/* BARRA SUPERIORE FLUTTUANTE: TITOLO + STATS + CRIPTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexShrink: 0, zIndex: 10 }}>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <div style={{ fontSize: 'clamp(0.55rem, 1.2vmin, 0.65rem)', color: '#facc15', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              CAMPAGNA • 200 SETTORI
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.8vmin, 1.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '0.8px', textShadow: '0 0 14px rgba(0, 242, 254, 0.7)' }}>
              ROTTA ORBITALE
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => {
                try { playSound('click'); } catch (_) {}
                setStep('epic_items');
              }}
              className="cyber-btn"
              style={{ padding: '5px 8px', fontSize: 'clamp(0.6rem, 1.3vmin, 0.72rem)', fontWeight: 900, borderColor: '#fde047', color: '#fde047' }}
              title="Apri Cripta dei Manufatti"
            >
              🌌 Cripta
            </button>

            <button
              onClick={() => {
                try { playSound('click'); } catch (_) {}
                setShowStarCapsulesModal(true);
              }}
              className="cyber-btn cyber-btn-warning"
              style={{ padding: '5px 9px', fontSize: 'clamp(0.6rem, 1.3vmin, 0.72rem)', fontWeight: 900 }}
              title="Rotta delle 40 Capsule"
            >
              ⭐ {totalCampaignStars}/600
            </button>

            <button 
              className="cyber-btn" 
              onClick={() => setStep('home')} 
              style={{ padding: '5px 10px', fontSize: 'clamp(0.62rem, 1.3vmin, 0.75rem)' }}
            >
              Base
            </button>
          </div>
        </div>

        {/* NOTIFICA OLOGRAFICA SBLOCCHI AL SETTORE 11+ (SCOMMESSE & PVP) */}
        {currentGlobalAdventureSector >= 11 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px',
            background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.2) 0%, rgba(2, 6, 23, 0.6) 100%)',
            borderLeft: '2px solid #facc15',
            borderRadius: '4px',
            width: '100%',
            maxWidth: '440px',
            margin: '2px auto 0 auto',
            flexShrink: 0,
            zIndex: 10
          }}>
            <div style={{ fontSize: 'clamp(0.55rem, 1.2vmin, 0.65rem)', color: '#fef08a', fontWeight: 800 }}>
              ✦ CIRCUITI APERTI: BANCO SCOMMESSE (2X) • DUELLI 1v1
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setPendingBetTier(1)}
                className="cyber-btn cyber-btn-warning"
                style={{ padding: '2px 6px', fontSize: '0.52rem', fontWeight: 900 }}
              >
                Banco ➔
              </button>
              <button
                onClick={() => setShowPvPChannelModal(true)}
                className="cyber-btn cyber-btn-ether"
                style={{ padding: '2px 6px', fontSize: '0.52rem', fontWeight: 900 }}
              >
                PvP ➔
              </button>
            </div>
          </div>
        )}

        {/* CAROSELLO SELETTORE PIANETI FLUTTUANTE */}
        <div style={{ width: '100%', flexShrink: 0, zIndex: 10, margin: '4px 0' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '4px 2px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            {Array.from({ length: 20 }).map((_, pIdx) => {
              const pNum = pIdx + 1;
              const isUnlocked = pNum <= (maxUnlockedPlanet || 1);
              const isCurrent = pNum === activePlanetNum;
              const pName = realPlanetNames?.[pIdx] || `P${pNum}`;
              const pColor = planetColors[pIdx] || '#00f2fe';

              return (
                <div
                  key={pNum}
                  onClick={() => {
                    if (!isUnlocked) {
                      try { playSound('deselect'); } catch (_) {}
                      triggerPopup(`Sconfiggi il Boss del Pianeta ${pNum - 1} per viaggiare qui!`);
                      return;
                    }
                    try { playSound('click'); } catch (_) {}
                    setExpandedPlanet(pNum);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isCurrent ? 1 : (isUnlocked ? 0.65 : 0.3),
                    transform: isCurrent ? 'scale(1.08)' : 'scale(0.92)',
                    transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    flexShrink: 0,
                    minWidth: '60px'
                  }}
                >
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isCurrent ? `radial-gradient(circle, ${pColor}55 0%, rgba(2,6,23,0.95) 75%)` : 'rgba(15, 23, 42, 0.8)',
                    border: isCurrent ? `2px solid ${pColor}` : '1.5px solid rgba(255,255,255,0.15)',
                    boxShadow: isCurrent ? `0 0 16px ${pColor}` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <RelicVisual relicId={`relic_p${pNum}`} size={22} />
                    {!isUnlocked && (
                      <span style={{ position: 'absolute', fontSize: '0.65rem' }}>🔒</span>
                    )}
                  </div>

                  <span style={{ fontSize: '0.58rem', fontWeight: 900, color: isCurrent ? pColor : '#cbd5e1', whiteSpace: 'nowrap' }}>
                    {pName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* STADIO ORBITALE DEL PIANETA ATTIVO (IL CUORE DELLA MAPPA) */}
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 0,
          zIndex: 10,
          position: 'relative'
        }}>
          {/* Titolo Pianeta Fluttuante & Dominio */}
          <div style={{ textAlign: 'center', lineHeight: 1.15, marginTop: '2px' }}>
            <span style={{ fontSize: 'clamp(0.6rem, 1.3vmin, 0.72rem)', color: curPlanetThemeColor, fontWeight: 900, letterSpacing: '1px' }}>
              PIANETA 0{activePlanetNum} • {activePlanetName.toUpperCase()}
            </span>
            <div style={{ fontSize: 'clamp(0.55rem, 1.2vmin, 0.65rem)', color: pStats.isMastered ? '#fde047' : '#94a3b8', fontWeight: 700 }}>
              {pStats.earned}/30 ⭐ {pStats.isMastered ? '👑 DOMINIO PERFETTO' : `(Progresso: ${Math.min(10, maxLvlInActivePlanet)}/10 Settori)`}
            </div>
          </div>

          {/* I 10 NODI ORBITALI SOSPESI NEL VUOTO (2 COLONNE DA 5 O GRIGLIA FLUIDA) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 'clamp(6px, 1.4vmin, 12px) clamp(4px, 1.2vmin, 10px)',
            width: '100%',
            maxWidth: '440px',
            margin: 'auto 0',
            padding: '4px 0',
            boxSizing: 'border-box'
          }}>
            {Array.from({ length: 10 }).map((_, lIdx) => {
              const levelNum = lIdx + 1;
              const isLevelUnlocked = levelNum <= maxLvlInActivePlanet;
              const isCurrentTarget = levelNum === maxLvlInActivePlanet;
              const isBoss = levelNum === 10;
              const cost = (levelNum <= 5 ? 5 : (levelNum <= 9 ? 10 : 15));
              const sStars = getSectorStars(activePlanetNum, levelNum, campaignStars);
              const starsCount = sStars.filter(Boolean).length;

              return (
                <div
                  key={levelNum}
                  onClick={() => {
                    if (!isLevelUnlocked) {
                      try { playSound('deselect'); } catch (_) {}
                      triggerPopup("Devi completare i settori precedenti per sbloccare questa rotta!");
                      return;
                    }
                    try { playSound('click'); } catch (_) {}
                    setSelectedSectorForBriefing({ planetNum: activePlanetNum, levelNum });
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 'clamp(58px, 11vmin, 76px)',
                    padding: '4px 2px',
                    borderRadius: '8px',
                    cursor: isLevelUnlocked ? 'pointer' : 'not-allowed',
                    background: isBoss
                      ? (isCurrentTarget ? 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, rgba(2, 6, 23, 0.95) 75%)' : 'rgba(69, 10, 10, 0.6)')
                      : (isCurrentTarget 
                          ? `radial-gradient(circle, ${curPlanetThemeColor}35 0%, rgba(2, 6, 23, 0.9) 75%)` 
                          : (isLevelUnlocked ? 'rgba(15, 23, 42, 0.75)' : 'rgba(2, 6, 23, 0.4)')),
                    border: isBoss 
                      ? (isCurrentTarget ? '2px solid #ef4444' : '1.5px solid rgba(239, 68, 68, 0.5)')
                      : (isCurrentTarget 
                          ? `2px solid ${curPlanetThemeColor}` 
                          : (isLevelUnlocked ? '1px solid rgba(255,255,255,0.18)' : '1px dashed rgba(255,255,255,0.08)')),
                    boxShadow: isCurrentTarget 
                      ? (isBoss ? '0 0 20px rgba(239, 68, 68, 0.85)' : `0 0 16px ${curPlanetThemeColor}`) 
                      : 'none',
                    transform: isCurrentTarget ? 'scale(1.05)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    opacity: isLevelUnlocked ? 1 : 0.4,
                    position: 'relative',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Nodo Numero Settore o Icona Corona Boss */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                    <span style={{
                      fontSize: isBoss ? 'clamp(0.75rem, 1.6vmin, 0.9rem)' : 'clamp(0.65rem, 1.4vmin, 0.78rem)',
                      fontWeight: 900,
                      color: isBoss ? '#fca5a5' : (isCurrentTarget ? curPlanetThemeColor : '#ffffff')
                    }}>
                      {isBoss ? '👑 TITANO' : `S.${levelNum}`}
                    </span>
                    <span style={{ fontSize: '0.48rem', color: '#facc15', fontWeight: 800, marginTop: '1px' }}>
                      {cost}⚡
                    </span>
                  </div>

                  {/* Le 3 Stelle Conquistate */}
                  <div style={{ display: 'flex', gap: '1px', justifyContent: 'center' }}>
                    {[0, 1, 2].map(sIdx => (
                      <span key={sIdx} style={{
                        fontSize: 'clamp(0.55rem, 1.1vmin, 0.65rem)',
                        color: sStars[sIdx] ? '#facc15' : 'rgba(255,255,255,0.18)',
                        lineHeight: 1,
                        filter: sStars[sIdx] ? 'drop-shadow(0 0 3px #facc15)' : 'none'
                      }}>
                        ★
                      </span>
                    ))}
                  </div>

                  {/* Particella di Rotta Attiva */}
                  {isCurrentTarget && (
                    <div style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isBoss ? '#ef4444' : curPlanetThemeColor,
                      boxShadow: `0 0 8px ${isBoss ? '#ef4444' : curPlanetThemeColor}`,
                      animation: 'coreStellarPulse 1.5s infinite alternate ease-in-out'
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Prompt Rapido Tattico Inferiore */}
          <div style={{
            fontSize: 'clamp(0.6rem, 1.3vmin, 0.72rem)',
            color: '#cbd5e1',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '4px'
          }}>
            Tocca un settore per visualizzare il briefing tattico ed entrare in combattimento.
          </div>
        </div>

      </div>
    );
  };


   // (renderDecksView rimosso: integrato in CardsCollectionModal)


  // (renderAbilitiesView e renderEnvironmentsView rimossi: integrati in PersonalLoadoutModal e ShopModal)


  const remainingEliteMatches = Math.max(0, maxDailyEliteMatches - eliteMatchesPlayedToday);


  // --------------------------------------------------------------------------
  // 5. RENDER PRINCIPALE APP & SCHERMATE DI GIOCO
  // --------------------------------------------------------------------------
  return (
    <div className="app-viewport-916">
      {step !== 'game' && <DeepSpaceUniverseCanvas currentEnvironmentId={equippedEnvironment} />}


                {/* Header Risorse Compatto Superiore */}
      {step !== 'game' && (
        <ResourceHeader
          nickname={nickname}
          level={level}
          xp={xp}
          trophies={trophies}
          diamonds={diamonds}
          lives={lives}
          credits={credits}
          creditTimerText={creditTimerText}
          setShowProgression={setShowProgression}
          onOpenStore={() => {
            try { playSound('click'); } catch (_) {}
            setShowStoreModal(true);
          }}
          onOpenLeaderboard={() => {
            try { playSound('click'); } catch (_) {}
            setShowLeaderboardModal(true);
          }}
          onOpenSettings={() => {
            try { playSound('click'); } catch (_) {}
            setShowSettingsModal(true);
          }}
        />
      )}


      {/* Widget Monitoraggio Cantiere a 2 Slot Attivi in Home */}
      {step === 'home' && forgeQueue.length > 0 && (
        <ActiveForgeWidget
          queue={forgeQueue}
          onRush={handleRushForge}
          ether={ether}
        />
      )}


                 {/* VISTE PRINCIPALI */}
      {step === 'game' && (
        <GameScreen
          key={`battle_${gameMode}_${gameMode === 'pvp' ? (pvpMeta?.roomId || 'pvp') : (gameMode === 'adventure' ? `${activeAdventure?.planet || 1}_${activeAdventure?.level || 1}` : `${bettingTier || 1}`)}_${battleSessionId}`}
          nickname={nickname}
          selectedPilot={selectedPilot}
          pilotInventory={pilotInventory}
          abilities={abilities}
          selectedAbility={selectedAbility}
          selectedAbilities={selectedAbilities}
          selectedDeck={selectedDeck}


          playerDeckLevel={deckInventory[selectedDeck]?.level || 1}
          aiDeckLevel={1}
          deckInventory={deckInventory}
          equippedEnvironment={equippedEnvironment}
          equippedEpicItems={equippedEpicItems}
          epicItemsInventory={epicItemsInventory}
          gameMode={gameMode}
          bettingTier={bettingTier}
          bettingGameType={bettingGameType}
          activeAdventure={activeAdventure}
          pvpMeta={pvpMeta}
          maxPlayerHp={maxPlayerHp}
          onGameEnd={handleGameEnd}
          onNextLevel={handleNextAdventureLevel}
                                            onAbandon={(isMatchFinished = false, targetStep = null, targetRelic = null) => {
            if (!isMatchFinished && gameMode === 'pvp' && !pvpMeta?.isGhostMatch && typeof db !== 'undefined' && db && pvpMeta?.roomId) {
              update(ref(db, `rooms/${pvpMeta.roomId}`), {
                status: 'abandoned',
                abandonedBy: myPlayerId
              });
            }
            if (targetStep === 'epic_items') {
              setSocketingRelic(targetRelic || { id: 'relic_p1', name: 'Reliquia Tellurica', planetName: 'Terra', color: '#38bdf8' });
              setStep('epic_items');
              return;
            }
            const savedProfile = localStorage.getItem('eclissi_profile');
            if (!savedProfile) {
              setStep('welcome');
            } else {
              setStep(gameMode === 'adventure' ? 'adv' : 'home');
            }
          }}



          t={t}
          setStardust={setStardust}
          setDiamonds={setDiamonds}
          dailyBettingDiamondsEarned={dailyBettingDiamondsEarned}
          setDailyBettingDiamondsEarned={setDailyBettingDiamondsEarned}
                    lives={lives}
          setLives={setLives}
          customBetAmount={customBetAmount}
          stakedLives={0}
          ether={ether}

          setEther={setEther}
          extractorLevel={extractorLevel}
          level={level}
          hasStabilizedRift1={hasStabilizedRift1}
          pvpChannel={selectedPvPChannel}
                              equippedTerrainSlots={equippedTerrainSlots}
          unlockedTerrainCards={unlockedTerrainCards}
          scannerSeconds={scannerSeconds}
          setScannerSeconds={setScannerSeconds}
          onBuyScannerRefill={handleBuyScannerRefill}
          equippedWeapons={equippedWeapons}
          weaponsLevels={weaponsLevels}
        />

      )}

         {step === 'adv' && renderAdventureView()}



            {step === 'epic_items' && (
        <EpicItemsHubScreen
          unlockedRelics={unlockedRelics}
          unlockedRifts={unlockedRifts}
          epicItemsInventory={epicItemsInventory}
          equippedEpicItems={equippedEpicItems}
          voidCrystals={voidCrystals}
          primordialMatter={primordialMatter}
          tankLevel={tankLevel}
          hasStabilizedRift1={hasStabilizedRift1}
          stardust={stardust}
          level={level}
          socketingRelic={socketingRelic}
          onClearSocketingRelic={() => setSocketingRelic(null)}
                    onGoToNextPlanet={() => {
            const currentP = socketingRelic?.planetNum || 1;
            const nextP = Math.min(20, currentP + 1);
            setSocketingRelic(null);
            setMaxUnlockedPlanet(p => Math.min(20, Math.max(p, nextP)));
            setExpandedPlanet(nextP);
            setStep('adv');
          }}

          onEquipItem={(newEquipped) => setEquippedEpicItems(newEquipped)}
          onUpgradeItem={handleUpgradeEpicItem}
          onCollapseRift={handleCollapseRift}
          onUpgradeTank={handleUpgradeSubspaceTank}
          onBack={() => setStep('home')}
          triggerPopup={triggerPopup}
        />
      )}


                    {/* HOME PRINCIPALE MODULARE */}
      {step === 'home' && (
        <HomeScreen
          nickname={nickname}
          level={level}
          maxPlayerHp={maxPlayerHp}
          selectedDeck={selectedDeck}
          currentDeckObj={currentDeckObj}
          selectedPilot={selectedPilot}



          selectedAbility={selectedAbility}
          isAbilityModuleUnlocked={isAbilityModuleUnlocked}
          equippedEpicItems={equippedEpicItems}
          epicItemsDatabase={typeof EPIC_ITEMS_DATABASE !== 'undefined' ? EPIC_ITEMS_DATABASE : []}
          equippedTerrainSlots={equippedTerrainSlots}
          terrainCardsDatabase={typeof TERRAIN_CARDS_DATABASE !== 'undefined' ? TERRAIN_CARDS_DATABASE : []}
          maxUnlockedPlanet={maxUnlockedPlanet}
          currentPlanetLevel={currentPlanetLevel}
          currentPlanetName={currentPlanetName}
          hasCompletedSector1={hasCompletedSector1}
          handleQuickResumeRadar={handleQuickResumeRadar}
          currentGlobalAdventureSector={currentGlobalAdventureSector}
          dailyData={dailyData}
          dailyCountdown={dailyCountdown}
          onOpenDailyModal={() => setShowDailyModal(true)}
          onOpenLoadout={() => setShowPersonalLoadout(true)}
          onOpenShop={() => {
            setShopOpenedFromLoadout(false);
            setUnifiedShopDefaultTab('decks');
            setShowUnifiedShop(true);
          }}
          onOpenLeaderboard={() => setShowLeaderboardModal(true)}
          onOpenBounties={() => setShowBountiesModal(true)}
          onOpenRules={() => setShowRulesModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenAdventure={() => setStep('adv')}
          onOpenBetting={() => setPendingBetTier(1)}
          onOpenPvP={() => setShowPvPChannelModal(true)}
                    trophies={trophies}
          dailyBountiesState={dailyBountiesState}
          triggerPopup={triggerPopup}
          onOpenDebug={() => setShowDebugModal(true)}
        />
      )}



      {/* MODALI & DIALOGHI */}
      {showHomeTour && (
        <SpotlightHomeTour
          onComplete={() => {
            setShowHomeTour(false);
            setHasCompletedHomeTour(true);
          }}
        />
      )}

      {activeAppDiscoveryTutorial && !showHomeTour && (
        <FeatureDiscoveryModal
          tutorialKey={activeAppDiscoveryTutorial}
          onDismiss={() => setActiveAppDiscoveryTutorial(null)}
        />
      )}

                          {selectedSectorForBriefing && (
        <CampaignLevelBriefingModal
          planetNum={selectedSectorForBriefing.planetNum}
          levelNum={selectedSectorForBriefing.levelNum}
          playerPilotId={selectedPilot}
          sectorStars={getSectorStars(selectedSectorForBriefing.planetNum, selectedSectorForBriefing.levelNum, campaignStars)}
          credits={credits}
          isReplay={selectedSectorForBriefing.levelNum < (unlockedLevels?.[selectedSectorForBriefing.planetNum] || 1)}
          scannerSeconds={scannerSeconds}
          diamonds={diamonds}
          onBuyScannerRefill={handleBuyScannerRefill}
          onLaunch={() => launchSectorBattle(selectedSectorForBriefing.planetNum, selectedSectorForBriefing.levelNum)}
          onClose={() => setSelectedSectorForBriefing(null)}
        />
      )}


                {/* MODALE CONTRATTI TATTICI GIORNALIERI */}
      {showBountiesModal && (
        <DailyBountiesModal
          bounties={dailyBountiesState.bounties || []}
          allCompletedClaimed={Boolean(dailyBountiesState.allCompletedClaimed)}
          onClaim={(bId) => {
            const target = (dailyBountiesState.bounties || []).find(b => b.id === bId);
            if (!target || !target.completed || target.claimed) return;

            try { playSound('epic_item_trigger'); } catch (_) {}
            if (target.reward.dust) addStardustSafe(target.reward.dust);
            if (target.reward.credits) setCredits(c => c + target.reward.credits);
            if (target.reward.xp) setXp(x => x + target.reward.xp);

            triggerPopup(` Contratto Riscosso!\n+${target.reward.dust}  | +${target.reward.credits || 15}  Crediti | +${target.reward.xp} XP`);

            setDailyBountiesState(prev => ({
              ...prev,
              bounties: (prev.bounties || []).map(b => b.id === bId ? { ...b, claimed: true } : b)
            }));
          }}
          onClaimAllCompleted={() => {
            if (dailyBountiesState.allCompletedClaimed) return;
            const allDone = (dailyBountiesState.bounties || []).every(b => b.completed);
            if (!allDone) return;

            try { playSound('win'); } catch (_) {}
            setDiamonds(d => d + 2);
            setCredits(c => c + 20);
            setScannerSeconds(s => Math.min(SCANNER_TANK_MAX, s + 10));

            setDailyBountiesState(prev => ({
              ...prev,
              allCompletedClaimed: true
            }));

            triggerPopup(" CASSA TRITTICO APERTA!\n+2 Diamanti    +10s Scanner Tattico   +20 Crediti ");
          }}
          onClose={() => setShowBountiesModal(false)}
        />
      )}





      {/* MODALE PROGRESSIONE PILOTA 1-100 CON LEVEL GATING AGGIORNATO */}
      {showProgression && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '1.5px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.45)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              <h3 style={{ color: '#00f2fe', margin: 0, fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SciFiIcon name="trophy" size={20} color="#00f2fe" /> Progressione Pilota (Livelli 1â€“100)
              </h3>
              <button className="cyber-btn" onClick={() => setShowProgression(false)} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.35), rgba(15, 23, 42, 0.85))', padding: '0.75rem', borderRadius: '8px', border: '1px solid #00f2fe', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#fff' }}>{nickname}</div>
                  <div style={{ fontSize: '0.7rem', color: '#facc15', fontWeight: 'bold' }}>
                    Grado Pilota: Livello {level} / 100 ({level >= 66 ? 'Fascia 3' : level >= 31 ? 'Fascia 2' : 'Fascia 1'})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#10b981', textShadow: '0 0 8px #10b981' }}>{maxPlayerHp} HP</div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Curva Vitale Universale</div>
                </div>
              </div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.68rem', color: '#cbd5e1' }}>
                XP Accumulati: <strong>{xp} / {typeof getXpThresholdForLevel === 'function' ? getXpThresholdForLevel(level) : 120 + level * 50}</strong>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
              {Array.from({ length: 100 }).map((_, idx) => {
                const lvlNum = idx + 1;
                const isReached = lvlNum <= level;
                const isCurrent = lvlNum === level;
                const hpOfLevel = typeof calculateUniversalPlayerHp === 'function' ? calculateUniversalPlayerHp(lvlNum) : 50;

                let milestoneText = null;
                if (lvlNum === 9) milestoneText = "ðŸ”“ Sblocco Modulo AbilitÃ  Ibrido";
                else if (lvlNum === 15) milestoneText = "ðŸ’” +1 Vita Massima";
                else if (lvlNum === epic1LvlThreshold) milestoneText = "â­ 1Â° Slot Manufatti Epici";
                else if (lvlNum === 30) milestoneText = "ðŸ’” +1 Vita Massima Permanente";
                else if (lvlNum === 31) milestoneText = "âš¡ Ingresso Fascia 2 (Sblocco Liv. 4-6 Mazzi/Moduli & Liv. 2 Terreni)";
                else if (lvlNum === 50) milestoneText = "ðŸ’” +1 Vita Massima";
                else if (lvlNum === epic2LvlThreshold) milestoneText = "â­ 2Â° Slot Manufatti Epici";
                else if (lvlNum === 61) milestoneText = "💎 +25 Diamanti + Titolo Pilota Veterano";
                else if (lvlNum === 66) milestoneText = "ðŸ”¥ Ingresso Fascia 3 (Sblocco Liv. 7-9 Mazzi/Moduli & Liv. 3 Terreni)";
                else if (lvlNum === 75) milestoneText = "ðŸ’” +1 Vita Massima";
                else if (lvlNum === 95) milestoneText = "🌟 Sblocco Apoteosi Suprema (Livello 9)";

                return (
                  <div
                    key={lvlNum}
                    className="cyber-panel"
                    style={{
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isCurrent ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.45), rgba(15, 23, 42, 0.9))' : (isReached ? 'rgba(15, 23, 42, 0.85)' : 'rgba(30, 41, 59, 0.4)'),
                      border: isCurrent ? '1.5px solid #00f2fe' : (milestoneText ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.08)'),
                      opacity: isReached ? 1 : 0.5
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: '900', color: isCurrent ? '#00f2fe' : (isReached ? '#fff' : '#94a3b8') }}>
                        Livello {lvlNum} {isCurrent && <span style={{ color: '#facc15', fontSize: '0.65rem' }}>(Attuale)</span>}
                      </div>
                      {milestoneText && (
                        <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: 'bold' }}>{milestoneText}</div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '900', color: '#10b981' }}>{hpOfLevel} HP</div>
                      <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>+{80 + lvlNum * 10} 🌟</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

                 {/* 1. SELEZIONE TAVOLO SCOMMESSE (STILE FLUTTUANTE SENZA SCATOLE) */}
      {pendingBetTier !== null && (() => {
        const curTier = BETTING_LEVELS[pendingBetTier] || BETTING_LEVELS[1];
        const playerBalance = curTier.resource === 'stardust' 
          ? stardust 
          : (curTier.resource === 'voidCrystals' ? voidCrystals : (curTier.resource === 'primordialMatter' ? primordialMatter : diamonds));
        
        const maxAllowed = Math.min(curTier.maxBet, playerBalance);
        const currentBet = Math.max(curTier.minBet, Math.min(customBetAmount, maxAllowed || curTier.minBet));

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.92) 0%, rgba(1, 3, 10, 0.98) 100%)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 25000,
            padding: 'clamp(10px, 2vmin, 20px) 16px',
            boxSizing: 'border-box'
          }}>
            
            {/* INTESTAZIONE FLUTTUANTE */}
            <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 'clamp(0.55rem, 1.2vmin, 0.65rem)', color: '#facc15', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  RADDOPPIO PURO 2X • DEALER AI
                </div>
                <h2 style={{ margin: 0, fontSize: 'clamp(1.1rem, 2.8vmin, 1.45rem)', fontWeight: 900, color: '#ffffff' }}>
                  BANCO SCOMMESSE
                </h2>
              </div>
              <button 
                onClick={() => setPendingBetTier(null)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* SELETTORE RISORSA SU 4 TAVOLI */}
            <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 800 }}>1. SELEZIONA IL TAVOLO RISORSA:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[1, 2, 3, 4].map(tNum => {
                  const tObj = BETTING_LEVELS[tNum];
                  const isUnlocked = currentGlobalAdventureSector >= tObj.reqAdventureSector;
                  const isSelected = pendingBetTier === tNum;
                  return (
                    <button
                      key={tNum}
                      disabled={!isUnlocked}
                      onClick={() => {
                        try { playSound('click'); } catch (_) {}
                        setPendingBetTier(tNum);
                        setCustomBetAmount(tObj.minBet);
                      }}
                      className="cyber-btn"
                      style={{
                        padding: '8px 2px',
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        border: isSelected ? '1.5px solid #facc15' : '1px solid rgba(255,255,255,0.12)',
                        background: isSelected ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.45), rgba(15, 23, 42, 0.95))' : 'rgba(15, 23, 42, 0.7)',
                        boxShadow: isSelected ? '0 0 14px rgba(250, 204, 21, 0.5)' : 'none',
                        opacity: isUnlocked ? 1 : 0.35
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{tObj.icon}</span>
                      <span>{isUnlocked ? tObj.unit.split(' ')[0] : `🔒 S.${tObj.reqAdventureSector}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELETTORE IMPORTO PUNTATA FLUTTUANTE */}
            <div style={{
              width: '100%',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '10px 0',
              borderTop: '1px solid rgba(250, 204, 21, 0.25)',
              borderBottom: '1px solid rgba(250, 204, 21, 0.25)'
            }}>
              <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                Disponibilità attuale: <strong style={{ color: '#00f2fe' }}>{playerBalance} {curTier.unit}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '4px 0' }}>
                <button
                  disabled={currentBet <= curTier.minBet}
                  onClick={() => {
                    try { playSound('tick'); } catch (_) {}
                    setCustomBetAmount(prev => Math.max(curTier.minBet, prev - curTier.step));
                  }}
                  className="cyber-btn"
                  style={{ width: '38px', height: '38px', fontSize: '1.2rem', fontWeight: 900 }}
                >
                  -
                </button>

                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fde047', textShadow: '0 0 12px rgba(250, 204, 21, 0.7)' }}>
                    {currentBet} {curTier.icon}
                  </div>
                  <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>
                    Min: {curTier.minBet} • Max: {curTier.maxBet}
                  </div>
                </div>

                <button
                  disabled={currentBet >= maxAllowed}
                  onClick={() => {
                    try { playSound('tick'); } catch (_) {}
                    setCustomBetAmount(prev => Math.min(maxAllowed, prev + curTier.step));
                  }}
                  className="cyber-btn"
                  style={{ width: '38px', height: '38px', fontSize: '1.2rem', fontWeight: 900 }}
                >
                  +
                </button>

                <button
                  disabled={maxAllowed <= curTier.minBet || currentBet === maxAllowed}
                  onClick={() => {
                    try { playSound('click'); } catch (_) {}
                    setCustomBetAmount(maxAllowed);
                  }}
                  className="cyber-btn cyber-btn-warning"
                  style={{ padding: '4px 8px', fontSize: '0.62rem', fontWeight: 900 }}
                >
                  MAX
                </button>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>
                Vincita potenziale: <strong>{currentBet * 2} {curTier.unit}</strong> (Netto: +{currentBet})
              </div>
            </div>

                        {/* ACCESSO DIRETTO ALLA SFIDA */}
            <div style={{ width: '100%', maxWidth: '420px', marginTop: '4px' }}>
              <button
                disabled={playerBalance < curTier.minBet}
                onClick={() => {
                  try { playSound('click'); } catch (_) {}
                  setPendingBetConfirmation({
                    tierNum: pendingBetTier,
                    amount: currentBet,
                    gameType: 'classic'
                  });
                }}
                className="cyber-btn cyber-btn-warning"
                style={{
                  width: '100%',
                  padding: '12px 4px',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  opacity: playerBalance >= curTier.minBet ? 1 : 0.35
                }}
              >
                PROCEDI AL DUELLO ➔
              </button>
            </div>


          </div>
        );
      })()}

      {/* 2. CONFERMA BRIEFING SCOMMESSA (STILE FLUTTUANTE SENZA SCATOLE) */}
      {pendingBetConfirmation && (() => {
        const tier = BETTING_LEVELS[pendingBetConfirmation.tierNum];
        if (!tier) return null;

        const betAmt = pendingBetConfirmation.amount;
        const winAmt = betAmt * 2;
        const canAffordCredits = credits >= tier.costCredits;
        const playerBalance = tier.resource === 'stardust' 
          ? stardust 
          : (tier.resource === 'voidCrystals' ? voidCrystals : (tier.resource === 'primordialMatter' ? primordialMatter : diamonds));
        const canAffordResource = playerBalance >= betAmt;
        const canPlay = canAffordCredits && canAffordResource;

        const aiEstimatedHp = Math.round(maxPlayerHp * 1.15);
        const playerCurDeckLvl = deckInventory[selectedDeck]?.level || 1;
        const aiEstimatedDeckLvl = Math.min(9, playerCurDeckLvl + 1);

                const modeLabels = {
          classic: 'Classica (4 Operazioni)',
          vector: 'Vettore Geometrico',
          double_stage: 'Convergenza (Banco 2+2)',
          tris: 'Tris Stellare'
        };

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(2, 6, 23, 0.94) 0%, rgba(1, 3, 10, 0.99) 100%)',

            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 32000,
            padding: 'clamp(12px, 2.5vmin, 24px) 16px',
            boxSizing: 'border-box'
          }}>
            {/* INTESTAZIONE */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <div style={{ fontSize: '0.62rem', color: '#facc15', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>
                BRIEFING DUELLO A SPECCHIO
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: 'clamp(1.2rem, 3vmin, 1.6rem)', fontWeight: 900, color: '#ffffff' }}>
                {tier.name}
              </h2>
              <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 800 }}>
                {modeLabels[pendingBetConfirmation.gameType]}
              </div>
            </div>

            {/* CONFRONTO IA A SPECCHIO */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              maxWidth: '380px',
              padding: '10px 0',
              borderTop: '1px solid rgba(250, 204, 21, 0.25)',
              borderBottom: '1px solid rgba(250, 204, 21, 0.25)'
            }}>
              <div style={{ fontSize: '0.62rem', color: '#00f2fe', fontWeight: 900, letterSpacing: '1px' }}>
                PARAMETRI DEALER AI (+15% HP • MAZZO N+1)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', fontSize: '0.8rem' }}>
                <span>Nemico: <strong style={{ color: '#ef4444' }}>{aiEstimatedHp} HP</strong></span>
                <span>Mazzo IA: <strong style={{ color: '#facc15' }}>Liv. {aiEstimatedDeckLvl}</strong></span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                Potenza di calcolo: {Math.round(tier.aiPower * 100)}% • Reazione simmetrica
              </div>
            </div>

            {/* PROSPETTO POSTA IN GIOCO & RADDOPPIO */}
            <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: '#fca5a5', fontWeight: 900 }}>POSTA A RISCHIO:</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: canAffordResource ? '#fde047' : '#ef4444' }}>
                  {betAmt} {tier.unit} + {tier.costCredits}⚡ Crediti
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6rem', color: '#6ee7b7', fontWeight: 900 }}>INCASSO ALLA VITTORIA (2X):</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', textShadow: '0 0 14px rgba(52, 211, 153, 0.7)' }}>
                  +{winAmt} {tier.unit}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#38bdf8' }}>
                  (Netto: +{betAmt} • Crediti rimborsati al 100%)
                </div>
              </div>
            </div>

            {/* PULSANTI CONFERMA */}
            <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
              <button
                disabled={!canPlay}
                onClick={() => handleStartBettingGame(pendingBetConfirmation.tierNum, betAmt, pendingBetConfirmation.gameType)}
                className={`cyber-btn ${canPlay ? 'cyber-btn-warning' : ''}`}
                style={{ width: '100%', padding: '12px', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '1px' }}
              >
                {canPlay ? `CONFERMA & PUNTA ${betAmt} ${tier.icon} ➔` : "Risorse Insufficienti"}
              </button>
              <button 
                className="cyber-btn" 
                onClick={() => setPendingBetConfirmation(null)} 
                style={{ width: '100%', padding: '6px', fontSize: '0.72rem', color: '#94a3b8' }}
              >
                Annulla e Torna Indietro
              </button>
            </div>

          </div>
        );
      })()}



           {/* ==================================================================== */}
      {/* BANCA DEI DIAMANTI & CONVERTITORE VALUTA (SENZA SCATOLE GRIGIE)       */}
      {/* ==================================================================== */}
      {showStoreModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(20, 5, 30, 0.94) 0%, rgba(2, 4, 12, 0.99) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 32000,
          padding: 'clamp(12px, 2.5vmin, 22px) 16px',
          boxSizing: 'border-box'
        }}>
          {/* HEADER BANCA FLUTTUANTE */}
          <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 'clamp(0.55rem, 1.2vmin, 0.65rem)', color: '#d946ef', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase' }}>
                DEPOSITO CENTRALE SUBSPAZIALE
              </div>
              <h2 style={{ margin: '2px 0 0 0', fontSize: 'clamp(1.15rem, 2.8vmin, 1.55rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '1px', textShadow: '0 0 16px rgba(217, 70, 239, 0.8)' }}>
                BANCA DEI DIAMANTI
              </h2>
            </div>

            <button 
              onClick={() => setShowStoreModal(false)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>

          {/* BILANCIO ATTIVO DIAMANTI OLOGRAFICO */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(217, 70, 239, 0.25) 0%, transparent 80%)',
            border: '1px solid rgba(217, 70, 239, 0.4)',
            boxShadow: '0 0 20px rgba(217, 70, 239, 0.35)',
            margin: '4px 0',
            flexShrink: 0
          }}>
            <SciFiIcon name="diamond" size={20} color="#d946ef" />
            <span style={{ fontSize: 'clamp(1.1rem, 2.6vmin, 1.4rem)', fontWeight: 900, color: '#f5d0fe', textShadow: '0 0 12px #d946ef' }}>
              {diamonds}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px' }}>
              DIAMANTI DISPONIBILI
            </span>
          </div>

          {/* LISTA PACCHETTI A SCORRIMENTO FLUTTUANTE */}
          <div style={{
            flex: 1,
            width: '100%',
            maxWidth: '420px',
            overflowY: 'auto',
            paddingRight: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(8px, 1.8vmin, 14px)',
            margin: '4px 0',
            scrollbarWidth: 'none'
          }}>
            
            {/* 1. SEZIONE FUTURA: ACQUISTO CON DENARO REALE (IAP READY) */}
            <div style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(217, 70, 239, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px dashed rgba(217, 70, 239, 0.45)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.65rem', color: '#f5d0fe', fontWeight: 900, letterSpacing: '1px' }}>
                ✦ FORNITURE DIRETTE (PROSSIMAMENTE) ✦
              </div>
              <div style={{ fontSize: '0.58rem', color: '#cbd5e1', marginTop: '2px' }}>
                I pacchetti per l'acquisto di Diamanti con fondi reali saranno attivati nelle prossime versioni di rete.
              </div>
            </div>

            {/* 2. CONVERSIONE: CREDITI ENERGETICI */}
            <div>
              <div style={{ fontSize: '0.65rem', color: '#00f2fe', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                ⚡ CONVERTI IN CREDITI (PER GIOCARE)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { name: '50 ⚡', amount: 50, cost: 3, type: 'credits', bonus: '' },
                  { name: '120 ⚡', amount: 120, cost: 6, type: 'credits', bonus: '+20%' },
                  { name: '300 ⚡', amount: 300, cost: 12, type: 'credits', bonus: '+50%' }
                ].map((pkg, idx) => (
                  <button
                    key={idx}
                    disabled={diamonds < pkg.cost}
                    onClick={() => handleBuyStorePackage(pkg)}
                    className="cyber-btn cyber-btn-primary"
                    style={{
                      padding: '8px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      opacity: diamonds >= pkg.cost ? 1 : 0.45
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{pkg.name}</span>
                    <span style={{ fontSize: '0.52rem', color: '#6ee7b7' }}>{pkg.bonus || 'Base'}</span>
                    <span style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 900, marginTop: '2px' }}>
                      {pkg.cost} 💎
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. CONVERSIONE: VITE & RIANIMAZIONI */}
            <div>
              <div style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                💔 CONVERTI IN VITE
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {[
                  { name: '+1 Vita 💔', amount: 1, cost: 3, type: 'lives', desc: 'Ricarica immediata' },
                  { name: `Max Vite (${typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(level) : 3} 💔)`, amount: typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(level) : 3, cost: 8, type: 'lives', desc: 'Serbatoio al 100%' }
                ].map((pkg, idx) => (
                  <button
                    key={idx}
                    disabled={diamonds < pkg.cost}
                    onClick={() => handleBuyStorePackage(pkg)}
                    className="cyber-btn"
                    style={{
                      padding: '8px 6px',
                      borderColor: '#f43f5e',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      opacity: diamonds >= pkg.cost ? 1 : 0.45
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fca5a5' }}>{pkg.name}</span>
                    <span style={{ fontSize: '0.52rem', color: '#cbd5e1' }}>{pkg.desc}</span>
                    <span style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 900, marginTop: '2px' }}>
                      {pkg.cost} 💎
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. CONVERSIONE: POLVERE STELLARE */}
            <div>
              <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                🌟 CONVERTI IN POLVERE (UPGRADE MODULI)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { name: '+300 🌟', amount: 300, cost: 5, type: 'stardust' },
                  { name: '+800 🌟', amount: 800, cost: 10, type: 'stardust' },
                  { name: '+2.000 🌟', amount: 2000, cost: 20, type: 'stardust' }
                ].map((pkg, idx) => (
                  <button
                    key={idx}
                    disabled={diamonds < pkg.cost}
                    onClick={() => handleBuyStorePackage(pkg)}
                    className="cyber-btn cyber-btn-warning"
                    style={{
                      padding: '8px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      opacity: diamonds >= pkg.cost ? 1 : 0.45
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>{pkg.name}</span>
                    <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 900, marginTop: '2px' }}>
                      {pkg.cost} 💎
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 5. CONVERSIONE: ETERE COSMICO (SE SBLOCCATO) */}
            {isEtherUnlocked && (
              <div>
                <div style={{ fontSize: '0.65rem', color: '#e879f9', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  🔮 CONVERTI IN ETERE (JOLLY & RIARMO)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { name: '+3 Etere 🔮', amount: 3, cost: 6, type: 'ether' },
                    { name: '+8 Etere 🔮', amount: 8, cost: 14, type: 'ether' }
                  ].map((pkg, idx) => (
                    <button
                      key={idx}
                      disabled={diamonds < pkg.cost}
                      onClick={() => handleBuyStorePackage(pkg)}
                      className="cyber-btn cyber-btn-ether"
                      style={{
                        padding: '8px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        opacity: diamonds >= pkg.cost ? 1 : 0.45
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', fontWeight: 900 }}>{pkg.name}</span>
                      <span style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 900, marginTop: '2px' }}>
                        {pkg.cost} 💎
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. CONVERSIONE: MINERALI RARI (SE VARCO 1 APERTO) */}
            {hasStabilizedRift1 && (
              <div>
                <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  💠 MINERALI SUBSPAZIALI (PER MANUFATTI)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { name: '+2 Cristalli 💠', amount: 2, cost: 10, type: 'void_crystals' },
                    { name: '+1 Materia 🟣', amount: 1, cost: 15, type: 'primordial_matter' }
                  ].map((pkg, idx) => (
                    <button
                      key={idx}
                      disabled={diamonds < pkg.cost}
                      onClick={() => handleBuyStorePackage(pkg)}
                      className="cyber-btn"
                      style={{
                        padding: '8px 6px',
                        borderColor: '#00f2fe',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        opacity: diamonds >= pkg.cost ? 1 : 0.45
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#38bdf8' }}>{pkg.name}</span>
                      <span style={{ fontSize: '0.68rem', color: '#fde047', fontWeight: 900, marginTop: '2px' }}>
                        {pkg.cost} 💎
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* PULSANTE CHIUSURA INFERIORE */}
          <div style={{ width: '100%', maxWidth: '360px', flexShrink: 0, marginTop: '4px' }}>
            <button
              onClick={() => setShowStoreModal(false)}
              className="cyber-btn"
              style={{ width: '100%', padding: '10px', fontSize: '0.8rem', color: '#94a3b8' }}
            >
              Torna alla Base
            </button>
          </div>

        </div>
      )}


            {/* MODALE SELEZIONE CANALE PVP & 4 MODALITÀ FARMING */}
      {showPvPChannelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 15000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '460px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '2px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.12)', paddingBottom: '0.4rem', marginBottom: '0.85rem' }}>
              <h3 style={{ color: '#00f2fe', margin: 0, fontWeight: '900', fontSize: '1.1rem', textShadow: '0 0 8px rgba(0, 242, 254, 0.6)' }}>
                Seleziona Circuito PvP
              </h3>
              <button className="cyber-btn" onClick={() => setShowPvPChannelModal(false)} style={{ background: '#ef4444', borderColor: '#f87171', padding: '0.2rem 0.5rem' }}>X</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              
              {/* CANALE A: ADDESTRAMENTO & FARMING CON LE 4 MODALITÀ SBLOCCABILI */}
              {(() => {
                const isTrainingUnlocked = currentGlobalAdventureSector >= pvpTrainingUnlockThreshold;
                return (
                  <div
                    className="cyber-panel"
                    style={{
                      padding: '0.75rem',
                      border: '1.5px solid #38bdf8',
                      background: 'rgba(15, 23, 42, 0.85)',
                      opacity: isTrainingUnlocked ? 1 : 0.5
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#38bdf8' }}>Canale Addestramento (Farming)</span>
                      <span style={{ fontSize: '0.62rem', background: '#0284c7', padding: '2px 6px', borderRadius: '4px', color: '#fff', fontWeight: 'bold' }}>{trainingEntryCost} Crediti ⚡</span>
                    </div>
                                        <p style={{ fontSize: '0.68rem', color: '#cbd5e1', margin: '0 0 0.5rem 0' }}>
                      Nessun rischio Trofei. Scegli la modalità di combattimento per allenarti:
                    </p>

                                        <button
                      disabled={!isTrainingUnlocked}
                      onClick={() => {
                        try { playSound('click'); } catch (_) {}
                        setSelectedPvPMode('classic');
                        setPendingPvPConfirmation({ channel: 'training', mode: 'classic' });
                      }}
                      className="cyber-btn cyber-btn-primary"
                      style={{
                        width: '100%',
                        padding: '0.65rem',
                        fontSize: '0.8rem',
                        fontWeight: '900'
                      }}
                    >
                      {isTrainingUnlocked ? 'ENTRA IN ADDESTRAMENTO ➔' : `🔒 Richiede Settore ${pvpTrainingUnlockThreshold}`}
                    </button>

                  </div>
                );
              })()}

              {/* CANALE B: LEGA ÉLITE MONDIALE */}
              {(() => {
                const isEliteUnlocked = currentGlobalAdventureSector >= pvpEliteUnlockThreshold;
                const canPlayElite = isEliteUnlocked && remainingEliteMatches > 0;
                const dailyMode = getDailyPvPMode();

                return (
                  <div
                    onClick={() => {
                      if (!isEliteUnlocked) {
                        try { playSound('deselect'); } catch (_) {}
                        triggerPopup(`Richiede Settore ${pvpEliteUnlockThreshold} dell'Avventura (Supera il Pianeta 8 Nettuno)!`);
                        return;
                      }
                      if (remainingEliteMatches <= 0) {
                        try { playSound('deselect'); } catch (_) {}
                        triggerPopup("Hai esaurito le 10 partite giornaliere per oggi!");
                        return;
                      }
                      try { playSound('click'); } catch (_) {}
                      setSelectedPvPMode(dailyMode.mode);
                      setPendingPvPConfirmation({ channel: 'elite', mode: dailyMode.mode });
                    }}
                    className={`pvp-channel-card ${!canPlayElite ? 'locked' : ''}`}
                    style={{ borderColor: '#facc15', background: 'rgba(234, 179, 8, 0.1)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#fde047' }}>Lega Élite Mondiale</span>
                      <span className="pvp-ticket-counter">Gioca ({remainingEliteMatches}/10)</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 'bold', margin: '2px 0' }}>
                      Modalità di oggi: {dailyMode.title}
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#cbd5e1', margin: 0, lineHeight: '1.3' }}>
                      Valutazione esclusiva a 3 Stelle, classifica a 500 piloti e premi settimanali in Diamanti 💎.
                    </p>
                    <div style={{ fontSize: '0.62rem', color: isEliteUnlocked ? '#facc15' : '#f87171', fontWeight: 'bold', marginTop: '2px' }}>
                      {isEliteUnlocked ? (remainingEliteMatches > 0 ? `✓ Sbloccato (Costo 0⚡ | ${remainingEliteMatches} partite rimaste)` : '⚠️ Partite Giornaliere Esaurite') : `🔒 Richiede Settore ${pvpEliteUnlockThreshold} Avventura`}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        </div>
      )}


            {/* BRIEFING TATTICO PRE-MATCH PVP & CONFERMA INGRESSO */}
      {pendingPvPConfirmation && (() => {
        const isElite = pendingPvPConfirmation.channel === 'elite';
        const costCredits = isElite ? 0 : trainingEntryCost;
        const canAfford = credits >= costCredits;
        const dailyMode = getDailyPvPMode();
                const modeLabels = {
          classic: 'Classica (4 Operazioni)',
          vector: 'Vettore Geometrico',
          double_stage: 'Convergenza (Banco 2+2)',
          tris: 'Tris Stellare'
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 32000, padding: '1rem' }}>

            <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center', border: `2px solid ${isElite ? '#facc15' : '#00f2fe'}`, boxShadow: `0 0 45px ${isElite ? 'rgba(250, 204, 21, 0.6)' : 'rgba(0, 242, 254, 0.6)'}` }}>
              
              <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', letterSpacing: '1px' }}>
                {isElite ? 'BRIEFING TATTICO ÉLITE' : 'CONFERMA ADDESTRAMENTO'}
              </div>
              <h3 style={{ color: isElite ? '#fde047' : '#00f2fe', margin: '0.2rem 0 0.5rem 0', fontWeight: '900', fontSize: '1.15rem' }}>
                {isElite ? `Lega Élite — ${dailyMode.title}` : `Addestramento — ${modeLabels[pendingPvPConfirmation.mode]}`}
              </h3>

              {/* Riquadro Dettagliato a 3 Stelle Esclusivo per l'Élite */}
              {isElite ? (
                <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid rgba(250, 204, 21, 0.4)', marginBottom: '0.85rem', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.4rem', textAlign: 'center' }}>
                    🎯 OBIETTIVI 3 STELLE & SCAGLIONI TROFEI
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.68rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2, 6, 23, 0.7)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <span style={{ color: '#facc15', fontWeight: '900' }}>⭐ 1ª Stella:</span> <span>Vittoria Base</span>
                      </div>
                      <strong style={{ color: '#38bdf8' }}>+15 🏆 (50%)</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(2, 6, 23, 0.7)', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div>
                        <span style={{ color: '#facc15', fontWeight: '900' }}>⭐⭐ 2ª Stella:</span> <span>HP Residui ≥ 50%</span>
                      </div>
                      <strong style={{ color: '#38bdf8' }}>+22 🏆 (75%)</strong>
                    </div>

                    <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '5px 6px', borderRadius: '4px', border: '1px solid #facc15' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fde047', fontWeight: '900' }}>⭐⭐⭐ 3ª Stella (Oggi):</span>
                        <strong style={{ color: '#facc15' }}>+30 🏆 + 1 💎 (100%)</strong>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 'bold', marginTop: '2px' }}>
                        « {dailyMode.star3Challenge.title} »
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: '0.62rem', lineHeight: '1.2' }}>
                        {dailyMode.star3Challenge.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '0.62rem', color: '#fca5a5', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                    * Penalità sconfitta: <strong>-10 🏆</strong> (attiva solo sopra i 100 Trofei).
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '0.85rem', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>
                    • Costo d'Ingresso: <strong style={{ color: canAfford ? '#00f2fe' : '#ef4444' }}>{trainingEntryCost} Crediti ⚡</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>
                    • Impatto Trofei: <strong style={{ color: '#10b981' }}>Nessuno (0 🏆 persi/vinti)</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    • Ricompense Vittoria: <strong style={{ color: '#fde047' }}>+45 🌟 Polvere | +80 XP | +20 ⚡ Crediti</strong>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button
                  disabled={!canAfford}
                  onClick={() => {
                    if (!isElite) setCredits(c => c - trainingEntryCost);
                    else setEliteMatchesPlayedToday(p => p + 1);

                    setSelectedPvPChannel(pendingPvPConfirmation.channel);
                    setSelectedPvPMode(pendingPvPConfirmation.mode);
                    setPendingPvPConfirmation(null);
                    setShowPvPChannelModal(false);
                    setIsSearchingPvP(true);
                  }}
                  className={`cyber-btn ${isElite ? 'cyber-btn-warning' : 'cyber-btn-primary'}`}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '900' }}
                >
                  {canAfford ? "AVVIA MATCHMAKING ➔" : `Crediti Insufficienti (${costCredits}⚡)`}
                </button>
                <button className="cyber-btn" onClick={() => setPendingPvPConfirmation(null)} style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem' }}>
                  Annulla
                </button>
              </div>

            </div>
          </div>
        );
      })()}


            {/* Sblocco Modulo Settore 9 integrato direttamente all'avvio in base al Pilota */}


          {/* Sblocco Mazzo con Passiva per Boss Gaia integrato direttamente all'avvio in base al Pilota */}


                 {isSearchingPvP && (
        <MatchmakingLobby
          myNickname={nickname}
          myDeck={selectedDeck}
          myPilot={selectedPilot}
          myLevel={level}
          myTrophies={trophies}
          pvpChannel={selectedPvPChannel}
          selectedMode={selectedPvPMode}
          onMatchFound={handlePvPMatchFound}
          onCancel={handlePvPCancel}
        />
      )}



            {showLeaderboardModal && (
        <WeeklyLeaderboardModal
          myNickname={nickname}
          myPlayerId={myPlayerId}
          myTrophies={trophies}
          myLevel={level}
          onClose={() => setShowLeaderboardModal(false)}
        />
      )}


      {/* MODALE REGOLE DI GIOCO */}
      {showRulesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', border: '1.5px solid #00f2fe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
              <h3 style={{ color: '#00f2fe', margin: 0, fontWeight: '900', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <SciFiIcon name="database" size={18} color="#00f2fe" /> Registro delle Regole di Gioco
              </h3>
              <button className="cyber-btn" onClick={() => { setShowRulesModal(false); setActiveRuleDetail(null); }} style={{ padding: '0.2rem 0.5rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.2rem' }}>
              {typeof RULES_DATABASE !== 'undefined' && RULES_DATABASE.map(rule => (
                <div
                  key={rule.id}
                  onClick={() => setActiveRuleDetail(activeRuleDetail?.id === rule.id ? null : rule)}
                  className="cyber-panel"
                  style={{ padding: '0.65rem', border: `1px solid ${rule.color}`, cursor: 'pointer', background: 'rgba(15, 23, 42, 0.85)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '900', color: rule.color }}>{rule.num}. {rule.title}</span>
                    <span style={{ fontSize: '0.6rem', color: '#facc15', fontWeight: 'bold' }}>{rule.tag}</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#cbd5e1', margin: '4px 0 0 0' }}>{rule.summary}</p>
                  {activeRuleDetail?.id === rule.id && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '0.4rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                      {rule.details.map((d, dIdx) => <div key={dIdx} style={{ marginBottom: '3px' }}>â€¢ {d}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALE ESTRATTORE ETERE */}
      {showExtractorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1.5px solid #e879f9', boxShadow: '0 0 35px rgba(232, 121, 249, 0.4)' }}>
            <h3 style={{ color: '#f0abfc', margin: '0 0 0.35rem 0', fontWeight: '900' }}>
              {extractorConfig.name} (Liv.{extractorLevel}/4)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '0 0 1rem 0' }}>
              Estrae passivamente Etere Cosmico 🔮 nel tempo.
            </p>

            <div style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#f5d0fe', fontWeight: 'bold' }}>
                Etere Immagazzinato: {extractorStored} / {extractorConfig.maxStore} 🔮
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                Tuo Etere Attuale: {ether} 🔮
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                disabled={extractorStored <= 0}
                onClick={() => {
                  try { playSound('dust_extract'); } catch (_) {}
                  setEther(e => e + extractorStored);
                  setExtractorStored(0);
                  setExtractorLastTime(Date.now());
                  triggerPopup(`Raccolti +${extractorStored} Etere Cosmico!`);
                }}
                className="cyber-btn cyber-btn-ether"
                style={{ padding: '0.65rem', fontWeight: '900' }}
              >
                Raccogli Etere ({extractorStored} 🔮)
              </button>

              {nextExtractorConfig && (
                <button
                  disabled={stardust < nextExtractorConfig.costDust || (level || 1) < nextExtractorConfig.reqLevel}
                  onClick={() => {
                    if (stardust < nextExtractorConfig.costDust || (level || 1) < nextExtractorConfig.reqLevel) return;
                    try { playSound('ability'); } catch (_) {}
                    setStardust(s => s - nextExtractorConfig.costDust);
                    setExtractorLevel(l => l + 1);
                    triggerPopup(`Estrattore potenziato a ${nextExtractorConfig.name}!`);
                  }}
                  className="cyber-btn cyber-btn-primary"
                  style={{ padding: '0.55rem', fontSize: '0.75rem' }}
                >
                  Potenzia Estrattore ({nextExtractorConfig.costDust} 🌟 | Req Liv.{nextExtractorConfig.reqLevel})
                </button>
              )}

              <button className="cyber-btn" onClick={() => setShowExtractorModal(false)} style={{ padding: '0.45rem' }}>
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE IMPOSTAZIONI */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '380px', width: '100%', textAlign: 'center', border: '1.5px solid #00f2fe' }}>
            <h3 style={{ color: '#00f2fe', margin: '0 0 0.75rem 0', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <SciFiIcon name="settings" size={20} color="#00f2fe" /> {t.settingsTitle}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem' }}>{t.musicToggle}</span>
                <button className="cyber-btn" onClick={() => setBgmMutedState(toggleMuteBGM())} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                  {bgmMutedState ? t.disabledState : t.activeState}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.8rem' }}>{t.sfxToggle}</span>
                <button className="cyber-btn" onClick={() => setSfxMutedState(toggleMuteSFX())} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                  {sfxMutedState ? t.disabledState : t.activeState}
                </button>
              </div>

                            <button className="cyber-btn" onClick={() => setStep('lang')} style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                {t.langSelect} (Attuale: {lang.toUpperCase()})
              </button>

              {/* Registro Regole di Gioco */}
              <button 
                className="cyber-btn" 
                onClick={() => {
                  try { playSound('click'); } catch (_) {}
                  setShowSettingsModal(false);
                  setShowRulesModal(true);
                }} 
                style={{ padding: '0.5rem', fontSize: '0.75rem', borderColor: '#00f2fe', color: '#00f2fe', fontWeight: 'bold' }}
              >
                📖 Registro Regole di Gioco
              </button>

              <button className="cyber-btn" onClick={handleHardResetData} style={{ padding: '0.5rem', fontSize: '0.72rem', borderColor: '#ef4444', color: '#fca5a5', marginTop: '0.5rem' }}>
                ⚠️ Ripristino Totale Dati
              </button>

            </div>

            <button className="cyber-btn cyber-btn-primary" onClick={() => setShowSettingsModal(false)} style={{ width: '100%', padding: '0.55rem' }}>
              Chiudi Impostazioni
            </button>
          </div>
        </div>
      )}

      {/* MODALE INGRANDIMENTO & ANTEPRIMA SFONDO PROCEDURALE */}
      {previewEnvironment && (() => {
        const isPlanet = previewEnvironment.isPlanet;
        const pNum = previewEnvironment.planetNum;
        const envId = previewEnvironment.envId;
        const cost = previewEnvironment.cost || 0;
        const isPurchased = Boolean(unlockedEnvironments[envId]);
        const isEquipped = equippedEnvironment === envId;
        const isBossDefeated = !isPlanet || (typeof isPlanetBossDefeated === 'function' && isPlanetBossDefeated(pNum, unlockedLevels, maxUnlockedPlanet));

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 35000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '1.25rem' }}>
            <DeepSpaceUniverseCanvas currentEnvironmentId={envId} planetNumber={isPlanet ? pNum : null} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
              <div className="cyber-panel" style={{ padding: '0.4rem 0.8rem', background: 'rgba(2, 6, 23, 0.85)' }}>
                <span style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 'bold' }}>ANTEPRIMA SFONDO 3D</span>
              </div>
              <button
                className="cyber-btn"
                onClick={() => setPreviewEnvironment(null)}
                style={{ background: '#ef4444', borderColor: '#f87171', padding: '0.4rem 0.8rem', zIndex: 10 }}
              >
                âœ• Chiudi
              </button>
            </div>

            <div className="cyber-panel" style={{ padding: '1rem 1.25rem', background: 'rgba(2, 6, 23, 0.92)', border: '1.5px solid #00f2fe', zIndex: 10, maxWidth: '460px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
              <h3 style={{ color: '#00f2fe', margin: '0 0 0.2rem 0', fontWeight: '900', fontSize: '1.1rem' }}>
                {previewEnvironment.name}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0 0 0.85rem 0' }}>
                {previewEnvironment.desc}
              </p>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={!isBossDefeated && !isPurchased}
                  onClick={() => {
                    handleUnlockOrEquipEnvironment(envId, cost, isPlanet, pNum);
                    setPreviewEnvironment(null);
                  }}
                  className={`cyber-btn ${isEquipped ? '' : (isPurchased ? 'cyber-btn-primary' : (isBossDefeated ? 'cyber-btn-warning' : ''))}`}
                  style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem', fontWeight: '900' }}
                >
                  {isEquipped ? "GiÃ  in Uso" : (isPurchased ? "Equipaggia Ora" : (isBossDefeated ? `Acquista & Equipaggia (${cost} 💎)` : `ðŸ”’ Richiede Boss P${pNum}`))}
                </button>
                <button
                  className="cyber-btn"
                  onClick={() => setPreviewEnvironment(null)}
                  style={{ padding: '0.65rem 1rem' }}
                >
                  Indietro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODALE CODEX & BANCO TERRENO */}
         {/* MODALE MAPPA A NODI ROTTA STELLARE (600 STELLE / 40 CAPSULE) */}
      {showStarCapsulesModal && (
        <StarRouteMapModal
          totalStars={totalCampaignStars}
          claimedCapsules={claimedStarCapsules}
          onClaim={handleClaimStarCapsule}
          onClose={() => setShowStarCapsulesModal(false)}
        />
      )}
      
            {/* MODALE SFIDA DEL GIORNO */}
      {showDailyModal && (
        <DailyChallengeModal
          dailyData={dailyData}
          countdownText={dailyCountdown}
          onLaunch={handleLaunchDailyChallenge}
          onClose={() => setShowDailyModal(false)}
        />
      )}

      {/* MODALE REPORT DELLE 00:00:01 (CONSEGNA PREMI & STREAK) */}
      {dailyReportData && (
        <DailyReportModal
          reportData={dailyReportData}
          onClaim={handleClaimDailyReport}
        />
      )}
      
      
            {/* MODALE AREA PERSONALE (HUB DI PLANCIA CON ISPEZIONE & CAMBIO DIRETTO) */}
      {showPersonalLoadout && (
        <PersonalLoadoutModal
          nickname={nickname}
          level={level}
          xp={xp}
          xpThreshold={typeof getXpThresholdForLevel === 'function' ? getXpThresholdForLevel(level) : 120 + level * 50}
          maxPlayerHp={maxPlayerHp}
          credits={credits}
          lives={lives}
          maxLives={typeof getMaxLivesForLevel === 'function' ? getMaxLivesForLevel(level) : 3}
          stardust={stardust}
          walletCap={walletCap}
          diamonds={diamonds}
          ether={ether}
          voidCrystals={voidCrystals}
          primordialMatter={primordialMatter}
          tankConfig={tankConfig}
          scannerSeconds={scannerSeconds}
          isEtherUnlocked={isEtherUnlocked}
          extractorLevel={extractorLevel}
          extractorStored={extractorStored}
          extractorConfig={extractorConfig}
          nextExtractorConfig={nextExtractorConfig}
          onHarvestEther={() => {
            try { playSound('dust_extract'); } catch (_) {}
            setEther(e => e + extractorStored);
            setExtractorStored(0);
            setExtractorLastTime(Date.now());
            triggerPopup(`Raccolti +${extractorStored} Etere Cosmico!`);
          }}
          onUpgradeExtractor={() => {
            if (!nextExtractorConfig || stardust < nextExtractorConfig.costDust) return;
            try { playSound('ability'); } catch (_) {}
            setStardust(s => s - nextExtractorConfig.costDust);
            setExtractorLevel(l => l + 1);
            triggerPopup(`Estrattore potenziato a ${nextExtractorConfig.name}!`);
          }}
          selectedPilot={selectedPilot}
          pilotInventory={pilotInventory}
          onSelectPilot={(id) => setSelectedPilot(id)}
          onUpgradePilot={handleUpgradePilot}
          selectedDeck={selectedDeck}
          currentDeckObj={currentDeckObj}
          deckInventory={deckInventory}
          onSelectDeck={(id) => setSelectedDeck(id)}
          onUpgradeDeck={(id) => handleUpgradeDeck(id)}
          selectedAbility={selectedAbility}
          abilities={abilities}
          isAbilityModuleUnlocked={isAbilityModuleUnlocked}
          onSelectAbility={(id) => setSelectedAbility(id)}
          onUpgradeAbility={(id) => upgradeAbilityWithDust(id)}
                              allDecks={typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES : []}
                    allAbilities={typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES : []}
          weaponsDatabase={typeof WEAPONS_DATABASE !== 'undefined' ? WEAPONS_DATABASE : []}
          unlockedWeapons={unlockedWeapons}
          onUnlockWeapon={handleUnlockWeapon}
          equippedWeapons={equippedWeapons}
          weaponsLevels={weaponsLevels}
          onEquipWeapon={(slotIdx, weaponId) => {
            setEquippedWeapons(prev => {
              const next = [...prev];
              next[slotIdx] = weaponId;
              return next;
            });
          }}
          onUpgradeWeapon={(weaponId, targetLvl, cost) => {

            if (stardust < (cost.dust || 0) || voidCrystals < (cost.voidCrystals || 0) || primordialMatter < (cost.primordialMatter || 0)) {
              triggerPopup("Risorse insufficienti per potenziare l'arma!");
              return;
            }
            setStardust(s => s - (cost.dust || 0));
            if (cost.voidCrystals > 0) setVoidCrystals(v => v - cost.voidCrystals);
            if (cost.primordialMatter > 0) setPrimordialMatter(p => p - cost.primordialMatter);
            setWeaponsLevels(prev => ({ ...prev, [weaponId]: targetLvl }));
          }}
          equippedEpicItems={equippedEpicItems}
          epicItemsDatabase={typeof EPIC_ITEMS_DATABASE !== 'undefined' ? EPIC_ITEMS_DATABASE : []}


                    equippedTerrainSlots={equippedTerrainSlots}
          terrainCardsDatabase={typeof TERRAIN_CARDS_DATABASE !== 'undefined' ? TERRAIN_CARDS_DATABASE : []}
          onEquipTerrainSlot={(slotIdx, cardId) => {
            setEquippedTerrainSlots(prev => {
              const next = [...prev];
              next[slotIdx] = cardId;
              return next;
            });
          }}
                    onUnequipTerrainSlot={(slotIdx) => {
            setEquippedTerrainSlots(prev => {
              const next = [...prev];
              next[slotIdx] = null;
              return next;
            });
          }}
          onUpgradeTerrainCard={(id, targetLvl, cost) => {
            const reqPilot = typeof getRequiredPilotLevelForTerrain === 'function' ? getRequiredPilotLevelForTerrain(targetLvl) : 1;
            if ((level || 1) < reqPilot) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup(`Richiede Pilota Livello ${reqPilot}!`);
              return;
            }
            if (forgeQueue.length >= 2) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup("Entrambi i 2 Slot del Cantiere sono occupati!");
              return;
            }
            if (forgeQueue.some(item => item.id === id && item.type === 'terrain')) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup("Questa carta terreno è già in lavorazione nel Cantiere!");
              return;
            }
            if (stardust < (cost.dust || 0) || voidCrystals < (cost.voidCrystals || 0) || primordialMatter < (cost.primordialMatter || 0)) {
              triggerPopup("Risorse insufficienti per il potenziamento!");
              return;
            }
            const cardObj = typeof TERRAIN_CARDS_DATABASE !== 'undefined' ? TERRAIN_CARDS_DATABASE.find(c => c.id === id) : null;
            const forgeParams = getForgeParams('terrain', targetLvl);
            try { playSound('ability'); } catch (_) {}
            setStardust(s => s - (cost.dust || 0));
            if (cost.voidCrystals > 0) setVoidCrystals(v => v - cost.voidCrystals);
            if (cost.primordialMatter > 0) setPrimordialMatter(p => p - cost.primordialMatter);
            setForgeQueue(prev => [...prev, {
              type: 'terrain',
              id: id,
              name: cardObj?.name?.split(' ')[0] || 'Terreno',
              targetLevel: targetLvl,
              finishTime: Date.now() + forgeParams.durationMs,
              etherRush: forgeParams.etherRush
            }]);
            triggerPopup(`⚙️ FORGIATURA AVVIATA!\nTrappola ${cardObj?.name?.split(' ')[0] || ''} in sintesi. Pronta tra ${forgeParams.label}.`);
          }}
          onOpenShopTab={(tabName) => {


            setShowPersonalLoadout(false);
            setShopOpenedFromLoadout(true);
            setUnifiedShopDefaultTab(tabName);
            setShowUnifiedShop(true);
          }}
          onClose={() => setShowPersonalLoadout(false)}
        />
      )}

                                    {/* MODALE BAZAR GALATTICO UNIFICATO (6 TABS) */}
      {showUnifiedShop && (
        <ShopModal
          initialTab={unifiedShopDefaultTab}
          selectedPilot={selectedPilot}


          pilotInventory={pilotInventory}
          onSelectPilot={(id) => setSelectedPilot(id)}
          onUnlockPilot={handleUnlockPilot}
          onUpgradePilot={handleUpgradePilot}
          selectedDeck={selectedDeck}
          deckInventory={deckInventory}
          allDecks={typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES : []}
          onSelectDeck={(id) => unlockDeck(id)}
          onUpgradeDeck={(id) => handleUpgradeDeck(id)}
          selectedAbility={selectedAbility}
          abilities={abilities}
          allAbilities={typeof ALL_ABILITIES !== 'undefined' ? ALL_ABILITIES : []}
          onSelectAbility={(id) => setSelectedAbility(id)}
          onUnlockAbility={(id) => unlockAbilityWithDust(id)}
          onUpgradeAbility={(id) => upgradeAbilityWithDust(id)}
          weaponsDatabase={typeof WEAPONS_DATABASE !== 'undefined' ? WEAPONS_DATABASE : []}
          unlockedWeapons={unlockedWeapons}
          onUnlockWeapon={handleUnlockWeapon}
          equippedWeapons={equippedWeapons}
          weaponsLevels={weaponsLevels}
          onEquipWeapon={(slotIdx, weaponId) => {
            setEquippedWeapons(prev => {
              const next = [...prev];
              next[slotIdx] = weaponId;
              return next;
            });
          }}
                    onUpgradeWeapon={(weaponId, targetLvl, cost) => {

            if (stardust < (cost.dust || 0) || voidCrystals < (cost.voidCrystals || 0) || primordialMatter < (cost.primordialMatter || 0)) {
              triggerPopup("Risorse insufficienti per potenziare l'arma!");
              return;
            }
            setStardust(s => s - (cost.dust || 0));
            if (cost.voidCrystals > 0) setVoidCrystals(v => v - cost.voidCrystals);
            if (cost.primordialMatter > 0) setPrimordialMatter(p => p - cost.primordialMatter);
            setWeaponsLevels(prev => ({ ...prev, [weaponId]: targetLvl }));
          }}

          unlockedTerrainCards={unlockedTerrainCards}

          equippedTerrainSlots={equippedTerrainSlots}
          terrainCardsDatabase={typeof TERRAIN_CARDS_DATABASE !== 'undefined' ? TERRAIN_CARDS_DATABASE : []}
          onEquipTerrainSlot={(slotIdx, cardId) => {
            setEquippedTerrainSlots(prev => {
              const next = [...prev];
              next[slotIdx] = cardId;
              return next;
            });
          }}
          onUnequipTerrainSlot={(slotIdx) => {
            setEquippedTerrainSlots(prev => {
              const next = [...prev];
              next[slotIdx] = null;
              return next;
            });
          }}
                              onUpgradeTerrainCard={(id, targetLvl, cost) => {
            const reqPilot = typeof getRequiredPilotLevelForTerrain === 'function' ? getRequiredPilotLevelForTerrain(targetLvl) : 1;
            if ((level || 1) < reqPilot) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup(`Richiede Pilota Livello ${reqPilot}!`);
              return;
            }
            if (forgeQueue.length >= 2) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup("Entrambi i 2 Slot del Cantiere sono occupati!");
              return;
            }

            if (forgeQueue.some(item => item.id === id && item.type === 'terrain')) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup("Questa carta terreno   gi  in lavorazione nel Cantiere!");
              return;
            }
            if (stardust < (cost.dust || 0) || voidCrystals < (cost.voidCrystals || 0) || primordialMatter < (cost.primordialMatter || 0)) {
              triggerPopup("Risorse insufficienti per il potenziamento!");
              return;
            }

            const cardObj = typeof TERRAIN_CARDS_DATABASE !== 'undefined' ? TERRAIN_CARDS_DATABASE.find(c => c.id === id) : null;
            const forgeParams = getForgeParams('terrain', targetLvl);

            try { playSound('ability'); } catch (_) {}
            setStardust(s => s - (cost.dust || 0));
            if (cost.voidCrystals > 0) setVoidCrystals(v => v - cost.voidCrystals);
            if (cost.primordialMatter > 0) setPrimordialMatter(p => p - cost.primordialMatter);

            setForgeQueue(prev => [...prev, {
              type: 'terrain',
              id: id,
              name: cardObj?.name?.split(' ')[0] || 'Terreno',
              targetLevel: targetLvl,
              finishTime: Date.now() + forgeParams.durationMs,
              etherRush: forgeParams.etherRush
            }]);

            triggerPopup(` FORGIATURA AVVIATA!\nTrappola ${cardObj?.name?.split(' ')[0] || ''} in sintesi (Slot ${forgeQueue.length + 1}/2). Pronto tra ${forgeParams.label}.`);
          }}

                    onBuyTerrainCard={(id, cost) => {
            const reqDust = cost.dust || 0;
            const reqDia = cost.diamonds || 0;

            if (stardust < reqDust || diamonds < reqDia) {
              try { playSound('deselect'); } catch (_) {}
              triggerPopup(`Risorse insufficienti! Servono ${reqDust > 0 ? `${reqDust} 🌟 ` : ''}${reqDia > 0 ? `${reqDia} 💎` : ''}`);
              return;
            }

            try { playSound('ability'); } catch (_) {}
            if (reqDust > 0) setStardust(s => s - reqDust);
            if (reqDia > 0) setDiamonds(d => d - reqDia);
            setUnlockedTerrainCards(prev => ({ ...prev, [id]: { level: 1, unlocked: true } }));
            triggerPopup("Carta Terreno sbloccata!");
          }}

          equippedEnvironment={equippedEnvironment}
          unlockedEnvironments={unlockedEnvironments}
          specialBackgrounds={typeof SPECIAL_BACKGROUNDS !== 'undefined' ? SPECIAL_BACKGROUNDS : []}
          planetEnvironments={typeof PLANET_ENVIRONMENTS !== 'undefined' ? Object.values(PLANET_ENVIRONMENTS) : []}
          onUnlockOrEquipEnvironment={handleUnlockOrEquipEnvironment}
          onPreviewEnvironment={(env) => setPreviewEnvironment(env)}
          stardust={stardust}
          diamonds={diamonds}
          voidCrystals={voidCrystals}
          primordialMatter={primordialMatter}
          ether={ether}
          level={level}
          onBuyStorePackage={handleBuyStorePackage}
          fromLoadout={shopOpenedFromLoadout}
          onBackToLoadout={() => {
            setShowUnifiedShop(false);
            setShowPersonalLoadout(true);
          }}
          onCloseToHome={() => {
            setShowUnifiedShop(false);
            setShowPersonalLoadout(false);
          }}
        />
      )}

      {/* Toast Popup Notifiche */}
      {popupMsg && (
        <div className="cyber-panel" style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', padding: '0.75rem 1.4rem', textAlign: 'center', borderRadius: '10px', fontWeight: 'bold', zIndex: 35000, pointerEvents: 'none', boxShadow: '0 6px 25px rgba(0,242,254,0.45)', whiteSpace: 'pre-line', border: '1px solid #00f2fe', fontSize: '0.85rem' }}>
          {popupMsg}
        </div>
      )}




      {/* MODALE DI TEST RAPIDO MODALITÀ (DEBUG) */}

      {showDebugModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '360px', width: '100%', textAlign: 'center', border: '2px solid #ef4444', boxShadow: '0 0 35px rgba(239, 68, 68, 0.5)' }}>
            <div style={{ fontSize: '0.65rem', color: '#fca5a5', fontWeight: 900, letterSpacing: '1px' }}>PANNELLO DI COLLAUDO</div>
            <h3 style={{ color: '#fff', margin: '0.2rem 0 0.8rem 0', fontWeight: 900, fontSize: '1.1rem' }}>Scegli Modalità da Testare</h3>
            
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                className="cyber-btn cyber-btn-primary" 
                style={{ padding: '0.65rem', fontSize: '0.78rem' }}
                onClick={() => launchDirectTest(1, 1)}
              >
                ⚔️ Terra Settore 1 (Avvio Standard)
              </button>

              <button 
                className="cyber-btn cyber-btn-warning" 
                style={{ padding: '0.65rem', fontSize: '0.78rem' }}
                onClick={() => launchDirectTest(1, 10)}
              >
                👑 Boss Gaia (Terra Settore 10)
              </button>

              <button 
                className="cyber-btn cyber-btn-primary" 
                style={{ padding: '0.65rem', fontSize: '0.78rem', borderColor: '#00f2fe' }}
                onClick={() => launchDirectTest(2, 1)}
              >
                🪐 Marte Settore 1 (Pianeta 2)
              </button>

              <button 
                className="cyber-btn cyber-btn-ether" 
                style={{ padding: '0.65rem', fontSize: '0.78rem' }}
                onClick={() => launchDirectTest(20, 10)}
              >
                👑 Boss Finale Encelado (P20 S.10)
              </button>
            </div>



            <button 
              className="cyber-btn"
              onClick={() => setShowDebugModal(false)}
              style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem' }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// 8.0 INIZIALIZZAZIONE & MOUNTING SUL DOM CON ATTRIBUTI ANTI-TRANSLATE
// ============================================================================
export default App;