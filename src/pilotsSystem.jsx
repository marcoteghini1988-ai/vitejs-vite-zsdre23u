import React, { useState, useEffect } from 'react';

// ============================================================================
// MATRICE DELLE 4 FORZE COSMICHE E REGOLE DI DOMINANZA TERMODINAMICA
// ZERO ASSOLUTO (❄️) > ENERGIA (💥) > ENTROPIA (⏳) > GRAVITÀ (🪐) > ZERO ASSOLUTO (❄️️)
// ============================================================================
export const ELEMENT_CYCLE = Object.freeze({
  ZERO_ASSOLUTO: 'ENERGIA',   // Lo zero termico estingue l'agitazione cinetica ed energetica
  ENERGIA: 'ENTROPIA',        // L'immissione di energia inverte e contrasta localmente l'entropia
  ENTROPIA: 'GRAVITA',        // L'usura temporale ed entropica disgrega masse e singolarità (radiazione di Hawking)
  GRAVITA: 'ZERO_ASSOLUTO'    // Il collasso gravitazionale comprime il vuoto spezzando la stasi criogenica
});

export const ELEMENT_ICONS = Object.freeze({
  ENERGIA: '💥',
  ZERO_ASSOLUTO: '❄️',
  ENTROPIA: '⏳',
  GRAVITA: '🪐'
});

export const ELEMENT_COLORS = Object.freeze({
  ENERGIA: '#ef4444',
  ZERO_ASSOLUTO: '#38bdf8',
  ENTROPIA: '#00f2fe',
  GRAVITA: '#10b981'
});

export function compareElements(elem1, elem2) {
  if (!elem1 || !elem2 || elem1 === elem2) return 0;
  if (ELEMENT_CYCLE[elem1] === elem2) return 1;  // elem1 domina elem2
  if (ELEMENT_CYCLE[elem2] === elem1) return -1; // elem2 domina elem1
  return 0; // Relazione neutra o pareggio
}

export function evaluatePilotDominance(pilot1Id, pilot2Id) {
  const p1 = getPilotById(pilot1Id);
  const p2 = getPilotById(pilot2Id);

  if (!p1 || !p2) {
    return {
      status: 'DRAW',
      winner: 'draw',
      multiplier: 1.0,
      playerScale: 1.0,
      enemyScale: 1.0,
      label: 'DUELLO ALLA PARI',
      subLabel: 'Nessun Dominio Elementale',
      dominantElement: null,
      dominantPilot: null
    };
  }

  // 1. Confronto Primario vs Primario
  let result = compareElements(p1.primaryElement, p2.primaryElement);
  let dominantElem = null;

  if (result === 1) {
    dominantElem = p1.primaryElement;
  } else if (result === -1) {
    dominantElem = p2.primaryElement;
  } else {
    // 2. Pareggio o Neutro sul Primario: spareggio con Secondario vs Secondario
    result = compareElements(p1.secondaryElement, p2.secondaryElement);
    if (result === 1) {
      dominantElem = p1.secondaryElement;
    } else if (result === -1) {
      dominantElem = p2.secondaryElement;
    }
  }

  if (result === 1) {
    return {
      status: 'PLAYER_DOMINANT',
      winner: 'player',
      multiplier: 1.15,
      playerScale: 1.15,
      enemyScale: 0.90,
      label: `DOMINIO ${dominantElem}!`,
      subLabel: 'Vantaggio Tattico (+15% Danno & Prevalenza Regole)',
      dominantElement: dominantElem,
      dominantPilot: p1.id,
      dominantPilotName: p1.name
    };
  } else if (result === -1) {
    return {
      status: 'ENEMY_DOMINANT',
      winner: 'enemy',
      multiplier: 0.85,
      playerScale: 0.90,
      enemyScale: 1.15,
      label: `DOMINIO ${dominantElem} NEMICO!`,
      subLabel: 'Svantaggio Tattico (-15% Danno & Regole nemiche)',
      dominantElement: dominantElem,
      dominantPilot: p2.id,
      dominantPilotName: p2.name
    };
  }

  return {
    status: 'DRAW',
    winner: 'draw',
    multiplier: 1.0,
    playerScale: 1.0,
    enemyScale: 1.0,
    label: 'DUELLO ALLA PARI',
    subLabel: 'Forze Cosmiche Allineate (1.0x)',
    dominantElement: null,
    dominantPilot: null
  };
}

// Helper interno per lettura del seme sicuro
export const getCardSuit = (card) => {
  if (!card) return null;
  if (card.isJoker) return 'joker';
  if (card.suit) {
    const s = card.suit;
    if (s === 'H' || s === 'hearts' || s === '♥') return 'hearts';
    if (s === 'D' || s === 'diamonds' || s === '♦') return 'diamonds';
    if (s === 'S' || s === 'spades' || s === '♠') return 'spades';
    if (s === 'C' || s === 'clubs' || s === '♣') return 'clubs';
    return s;
  }
  if (typeof card.id === 'string') {
    if (card.id.startsWith('hearts') || card.id === 'hearts') return 'hearts';
    if (card.id.startsWith('diamonds') || card.id === 'diamonds') return 'diamonds';
    if (card.id.startsWith('spades') || card.id === 'spades') return 'spades';
    if (card.id.startsWith('clubs') || card.id === 'clubs') return 'clubs';
  }
  return 'hearts';
};

// ============================================================================
// SCOMPARTO 1: L'ARCHIVIO COMPLETO DEI PILOTI (33 EROI + 20 SENTINELLE NPC)
// ============================================================================
export const PILOTS_DATABASE = Object.freeze([
  // --- 4 COMUNI (GLI OPERATORI ELEMENTARI) ---
  {
    id: 'pilot_com_1',
    name: 'Cadetto Additivo',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_com_1.png',
    unlockLevelXP: 1,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    specialtyOp: '+',
    trait: 'Specialista Addizione [+]: assegna un bonus flat da +1 a +5 HP di danno quando la formula include [+].',
    weakness: 'Crescita lineare e contenuta; privo di picchi elevati o effetti secondari.',
    portrait: { bg: '#064e3b', visor: '#34d399', accent: '#6ee7b7', symbol: '+' },
    upgradeTable: {
      1: { flatBonus: 1, reqXP: 5, dust: 150, dia: 0, voidC: 0, prim: 0 },
      2: { flatBonus: 2, reqXP: 10, dust: 300, dia: 0, voidC: 0, prim: 0 },
      3: { flatBonus: 3, reqXP: 15, dust: 500, dia: 0, voidC: 0, prim: 0 },
      4: { flatBonus: 4, reqXP: 18, dust: 650, dia: 0, voidC: 0, prim: 0 },
      5: { flatBonus: 5, reqXP: 20, dust: 800, dia: 0, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_com_2',
    name: 'Calibratore Sottrattivo',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#10b981',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_com_2.png',
    unlockLevelXP: 5,
    unlockCost: { dust: 300, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    specialtyOp: '-',
    trait: 'Specialista Sottrazione [-]: assegna un bonus flat da +2 a +6 HP di danno quando la formula include [-].',
    weakness: 'Richiede scarti numerici favorevoli tra le carte; inefficiente su combinazioni basse.',
    portrait: { bg: '#1e293b', visor: '#f59e0b', accent: '#fde047', symbol: '−' },
    upgradeTable: {
      1: { flatBonus: 2, reqXP: 8, dust: 200, dia: 0, voidC: 0, prim: 0 },
      2: { flatBonus: 3, reqXP: 12, dust: 400, dia: 0, voidC: 0, prim: 0 },
      3: { flatBonus: 4, reqXP: 16, dust: 600, dia: 0, voidC: 0, prim: 0 },
      4: { flatBonus: 5, reqXP: 20, dust: 800, dia: 0, voidC: 0, prim: 0 },
      5: { flatBonus: 6, reqXP: 24, dust: 1000, dia: 0, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_com_3',
    name: 'Cannoniere Balistico',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#10b981',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_com_3.png',
    unlockLevelXP: 10,
    unlockCost: { dust: 600, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    specialtyOp: '*',
    trait: 'Specialista Moltiplicazione [*]: assegna un bonus flat da +2 a +8 HP di danno quando la formula include [*].',
    weakness: 'Rischio sovraccarico: inutilizzabile se i fattori superano il bersaglio.',
    portrait: { bg: '#450a0a', visor: '#ef4444', accent: '#fca5a5', symbol: '×' },
    upgradeTable: {
      1: { flatBonus: 2, reqXP: 14, dust: 350, dia: 0, voidC: 0, prim: 0 },
      2: { flatBonus: 3, reqXP: 18, dust: 600, dia: 0, voidC: 0, prim: 0 },
      3: { flatBonus: 5, reqXP: 22, dust: 900, dia: 0, voidC: 0, prim: 0 },
      4: { flatBonus: 6, reqXP: 25, dust: 1200, dia: 0, voidC: 0, prim: 0 },
      5: { flatBonus: 8, reqXP: 28, dust: 1500, dia: 0, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_com_4',
    name: 'Cecchino Quantico',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#10b981',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_com_4.png',
    unlockLevelXP: 15,
    unlockCost: { dust: 1000, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    specialtyOp: '/',
    trait: 'Specialista Divisione [/]: assegna un bonus flat da +2 a +10 HP di danno quando la formula include [/].',
    weakness: 'Rigido vincolo algebrico: dipende tassativamente dalla presenza di divisori esatti.',
    portrait: { bg: '#1e1b4b', visor: '#a855f7', accent: '#c084fc', symbol: '÷' },
    upgradeTable: {
      1: { flatBonus: 2, reqXP: 18, dust: 500, dia: 0, voidC: 0, prim: 0 },
      2: { flatBonus: 4, reqXP: 22, dust: 800, dia: 0, voidC: 0, prim: 0 },
      3: { flatBonus: 6, reqXP: 25, dust: 1100, dia: 0, voidC: 0, prim: 0 },
      4: { flatBonus: 8, reqXP: 28, dust: 1400, dia: 0, voidC: 0, prim: 0 },
      5: { flatBonus: 10, reqXP: 30, dust: 1800, dia: 0, voidC: 0, prim: 0 }
    }
  },

  // --- 4 CARTE EROE BOSS COMUNI (SBLOCCO DA SETTORE 10: P1 - P4) ---
  {
    id: 'pilot_boss_1',
    name: 'Guardiano di Gaia',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_boss_1.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 1,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Corazza Tellurica: le carte Rosse (♥/♦) aggiungono un bonus flat (+1...+5 HP) e raddoppiano la Polvere Stellare vinta. Danno alla corazza nemica calcolato con base + valore nominale.',
    weakness: 'Se la formula d’attacco non include almeno 2 carte Rosse, il danno totale subisce un malus di -3 HP.',
    portrait: { bg: '#064e3b', visor: '#34d399', accent: '#6ee7b7', symbol: 'GA' },
    upgradeTable: {
      1: { bonusFlat: 1, dustMult: 1.2, reqXP: 1, dust: 200, dia: 0, voidC: 0, prim: 0 },
      2: { bonusFlat: 2, dustMult: 1.4, reqXP: 10, dust: 450, dia: 0, voidC: 0, prim: 0 },
      3: { bonusFlat: 3, dustMult: 1.6, reqXP: 18, dust: 750, dia: 1, voidC: 0, prim: 0 },
      4: { bonusFlat: 4, dustMult: 1.8, reqXP: 24, dust: 1100, dia: 1, voidC: 0, prim: 0 },
      5: { bonusFlat: 5, dustMult: 2.0, reqXP: 30, dust: 1500, dia: 2, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_2',
    name: 'Colosso di Tharsis',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#ef4444',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_boss_2.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 2,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Distorsione di Tharsis: incrementa progressivamente il danno ad ogni colpo a segno (+2...+6 HP per striscia); attiva Critico x1.5 al 3° colpo e potenzia i colpi complessi [* /].',
    weakness: 'Passare il turno o subire timeout azzera istantaneamente la striscia e infligge 4 HP di contraccolpo termico.',
    portrait: { bg: '#450a0a', visor: '#ef4444', accent: '#fca5a5', symbol: 'TH' },
    upgradeTable: {
      1: { streakBonus: 2, complexBonus: 4, reqXP: 1, dust: 250, dia: 0, voidC: 0, prim: 0 },
      2: { streakBonus: 3, complexBonus: 6, reqXP: 12, dust: 500, dia: 0, voidC: 0, prim: 0 },
      3: { streakBonus: 4, complexBonus: 9, reqXP: 20, dust: 850, dia: 1, voidC: 0, prim: 0 },
      4: { streakBonus: 5, complexBonus: 12, reqXP: 26, dust: 1200, dia: 1, voidC: 0, prim: 0 },
      5: { streakBonus: 6, complexBonus: 16, reqXP: 32, dust: 1700, dia: 2, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_3',
    name: 'Matriarca Tossica',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#84cc16',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_3.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 3,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Neurotossina a Tempo: ogni colpo a segno inietta un veleno che consuma HP per ogni secondo trascorso sul timer nemico (1 HP/s per 10s fino a 3 HP/s per 10s al Livello 5).',
    weakness: 'Se il nemico chiude con [*], annulla il veleno e ti riflette 6 HP di danno termico puro.',
    portrait: { bg: '#14532d', visor: '#84cc16', accent: '#bef264', symbol: 'TX' },
    upgradeTable: {
      1: { dps: 1, duration: 10, reqXP: 1, dust: 300, dia: 0, voidC: 0, prim: 0 },
      2: { dps: 1, duration: 14, reqXP: 14, dust: 600, dia: 0, voidC: 0, prim: 0 },
      3: { dps: 2, duration: 10, reqXP: 22, dust: 950, dia: 1, voidC: 0, prim: 0 },
      4: { dps: 2, duration: 13, reqXP: 28, dust: 1350, dia: 2, voidC: 0, prim: 0 },
      5: { dps: 3, duration: 10, reqXP: 34, dust: 1800, dia: 2, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_4',
    name: 'Arconte Solare',
    rarity: 'Comune',
    rarityColor: '#10b981',
    color: '#f59e0b',
    primaryElement: 'ENERGIA',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_4.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 4,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Radiazione Solare: conferisce un bonus flat da +3 a +15 HP. Se la formula impiega 3 o più carte, il calore fonde le difese nemiche convertendo l’intero colpo in Danno Puro.',
    weakness: 'Dispersione Termica: le formule composte da sole 2 carte disperdono il calore e subiscono una penalità di -2 HP sul bonus.',
    portrait: { bg: '#451a03', visor: '#f59e0b', accent: '#fde047', symbol: 'AS' },
    upgradeTable: {
      1: { flatBonus: 3, reqXP: 1, dust: 350, dia: 0, voidC: 0, prim: 0 },
      2: { flatBonus: 5, reqXP: 16, dust: 700, dia: 0, voidC: 0, prim: 0 },
      3: { flatBonus: 8, reqXP: 24, dust: 1100, dia: 1, voidC: 0, prim: 0 },
      4: { flatBonus: 11, reqXP: 30, dust: 1500, dia: 2, voidC: 0, prim: 0 },
      5: { flatBonus: 15, reqXP: 36, dust: 2000, dia: 3, voidC: 0, prim: 0 }
    }
  },

  // --- 4 RARI (RISCHIO, TEMPO E RISORSE) ---
  {
    id: 'pilot_rare_1',
    name: 'Il Vendicatore',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#38bdf8',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_rare_1.png',
    unlockLevelXP: 38,
    unlockCost: { dust: 2800, diamonds: 1, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Finestra di Vendetta: ogni 30% di HP massimi persi congela il turno nemico e avvia una raffica da 60...90s. Ogni bersaglio risolto assegna un bonus cumulativo (+2...+10 HP).',
    weakness: 'Rigetto di [+] (-10s) e [-] (-5s) al timer della raffica. I due turni successivi hanno timer ridotto (20s il primo, 30s il secondo).',
    portrait: { bg: '#7f1d1d', visor: '#f87171', accent: '#fca5a5', symbol: 'VD' },
    upgradeTable: {
      1: { burstTime: 60, flatBonusPerHit: 2, reqXP: 40, dust: 2200, dia: 1, voidC: 0, prim: 0 },
      2: { burstTime: 65, flatBonusPerHit: 4, reqXP: 43, dust: 2800, dia: 1, voidC: 0, prim: 0 },
      3: { burstTime: 70, flatBonusPerHit: 6, reqXP: 46, dust: 3400, dia: 2, voidC: 0, prim: 0 },
      4: { burstTime: 80, flatBonusPerHit: 8, reqXP: 49, dust: 4000, dia: 2, voidC: 0, prim: 0 },
      5: { burstTime: 90, flatBonusPerHit: 10, reqXP: 52, dust: 4800, dia: 3, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_rare_2',
    name: "L'Adrenalinico",
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#38bdf8',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_rare_2.png',
    unlockLevelXP: 42,
    unlockCost: { dust: 3200, diamonds: 2, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Sovraccarico Vitale: aumenta il danno a scaglioni discreti per ogni 10% di HP persi (+2...+18 HP a Livello 5). Il bonus regredisce se la salute risale.',
    weakness: 'Offuscamento Visivo: sotto il 60% HP le carte Nere perdono i loro effetti; sotto il 30% HP anche le Rosse diventano grigie e le carte Cuori non curano più.',
    portrait: { bg: '#18181b', visor: '#ef4444', accent: '#f59e0b', symbol: 'AD' },
    upgradeTable: {
      1: { maxFlatBonus: 9, stepBonus: 1, reqXP: 44, dust: 2400, dia: 1, voidC: 0, prim: 0 },
      2: { maxFlatBonus: 12, stepBonus: 1, reqXP: 47, dust: 3000, dia: 2, voidC: 0, prim: 0 },
      3: { maxFlatBonus: 14, stepBonus: 1, reqXP: 50, dust: 3600, dia: 2, voidC: 0, prim: 0 },
      4: { maxFlatBonus: 16, stepBonus: 2, reqXP: 53, dust: 4200, dia: 2, voidC: 0, prim: 0 },
      5: { maxFlatBonus: 18, stepBonus: 2, reqXP: 56, dust: 5000, dia: 3, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_rare_3',
    name: 'Il Baro',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#38bdf8',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_rare_3.png',
    unlockLevelXP: 46,
    unlockCost: { dust: 3800, diamonds: 2, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Asso nella Manica: estrae direttamente dal mazzo la carta utile a chiudere la combinazione mancante, infliggendo danno maggiorato (+3...+15 HP).',
    weakness: 'Il Fiato sul Collo: ogni utilizzo taglia permanentemente il timer di tutti i turni successivi (-5s, -10s, -15s...) fino a un minimo di 15 secondi.',
    portrait: { bg: '#09090b', visor: '#facc15', accent: '#fafafa', symbol: 'BR' },
    upgradeTable: {
      1: { flatBonus: 3, reqXP: 48, dust: 2600, dia: 1, voidC: 0, prim: 0 },
      2: { flatBonus: 6, reqXP: 50, dust: 3200, dia: 2, voidC: 0, prim: 0 },
      3: { flatBonus: 9, reqXP: 52, dust: 3800, dia: 2, voidC: 0, prim: 0 },
      4: { flatBonus: 12, reqXP: 54, dust: 4400, dia: 2, voidC: 0, prim: 0 },
      5: { flatBonus: 15, reqXP: 56, dust: 5000, dia: 3, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_rare_4',
    name: 'Il Collezionista di Specchi',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#38bdf8',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_rare_4.png',
    unlockLevelXP: 50,
    unlockCost: { dust: 4500, diamonds: 3, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Riflesso Cinetico: infligge sempre e solo danno base, ma riflette automaticamente da +4 a +14 HP per ogni colpo subito fuori turno.',
    weakness: 'Specchi Infranti: inizia con 3 specchi intatti. Ogni colpo subito >=18 HP ne frantuma uno riducendo il contraccolpo (-4, -8, fino a 0 se tutti distrutti).',
    portrait: { bg: '#0f172a', visor: '#38bdf8', accent: '#94a3b8', symbol: 'SP' },
    upgradeTable: {
      1: { reflectDamage: 4, reqXP: 52, dust: 2800, dia: 1, voidC: 0, prim: 0 },
      2: { reflectDamage: 6, reqXP: 54, dust: 3400, dia: 2, voidC: 0, prim: 0 },
      3: { reflectDamage: 8, reqXP: 56, dust: 4000, dia: 2, voidC: 0, prim: 0 },
      4: { reflectDamage: 11, reqXP: 58, dust: 4600, dia: 2, voidC: 0, prim: 0 },
      5: { reflectDamage: 14, reqXP: 60, dust: 5200, dia: 3, voidC: 0, prim: 0 }
    }
  },

  // --- 8 CARTE EROE BOSS RARE (SBLOCCO DA SETTORE 10: P5 - P12) ---
  {
    id: 'pilot_boss_5',
    name: 'Occhio del Vortice',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#f97316',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_boss_5.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 5,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Sovratensione di Picche: ogni carta Picche (♠) giocata somma il proprio valore nominale + bonus di grado (+1...+5 HP). Se giochi una Picche Elettrizzata, rifletti il doppio del suo valore come Danno Puro al nemico.',
    weakness: 'Dispersione Statica: trattenere una carta Elettrizzata in mano senza giocarla disperde la carica infliggendoti 4 HP di autodanno.',
    portrait: { bg: '#431407', visor: '#f97316', accent: '#fdba74', symbol: 'OV' },
    upgradeTable: {
      1: { flatBonus: 1, reqXP: 1, dust: 1100, dia: 1, voidC: 0, prim: 0 },
      2: { flatBonus: 2, reqXP: 36, dust: 1700, dia: 2, voidC: 0, prim: 0 },
      3: { flatBonus: 3, reqXP: 42, dust: 2400, dia: 3, voidC: 0, prim: 0 },
      4: { flatBonus: 4, reqXP: 48, dust: 3100, dia: 4, voidC: 0, prim: 0 },
      5: { flatBonus: 5, reqXP: 56, dust: 3900, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_6',
    name: 'Crono il Distruttore',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#0284c7',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_6.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 6,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Distorsione Cronotopica: ogni attacco andato a segno infligge un bonus flat da +4 a +18 HP e sottrae 10 secondi dal timer del turno successivo del rivale.',
    weakness: 'Inerzia Temporale: se la riflessione supera i 20 secondi prima di attaccare, la distorsione collassa riducendo il bonus di 3 HP.',
    portrait: { bg: '#0c4a6e', visor: '#38bdf8', accent: '#7dd3fc', symbol: 'CR' },
    upgradeTable: {
      1: { flatBonus: 4, timeDrain: 10, reqXP: 1, dust: 1200, dia: 1, voidC: 0, prim: 0 },
      2: { flatBonus: 7, timeDrain: 10, reqXP: 38, dust: 1800, dia: 2, voidC: 0, prim: 0 },
      3: { flatBonus: 10, timeDrain: 10, reqXP: 44, dust: 2500, dia: 3, voidC: 0, prim: 0 },
      4: { flatBonus: 14, timeDrain: 10, reqXP: 50, dust: 3200, dia: 4, voidC: 0, prim: 0 },
      5: { flatBonus: 18, timeDrain: 10, reqXP: 58, dust: 4000, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_7',
    name: 'Sentinella Ionica',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#06b6d4',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_boss_7.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 7,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Parassitismo Quantico: aumenta il danno (+1...+5 HP) per ciascuna tacca attiva sui Dadi Quantici. Rispettare l’alternanza cromatica di fase (Rosse nei turni dispari, Nere nei turni pari) aggiunge un ulteriore bonus di +4 HP.',
    weakness: 'Nessun punto debole sfruttabile.',
    portrait: { bg: '#083344', visor: '#06b6d4', accent: '#67e8f9', symbol: 'SN' },
    upgradeTable: {
      1: { notchBonus: 1, phaseBonus: 4, reqXP: 1, dust: 1300, dia: 1, voidC: 0, prim: 0 },
      2: { notchBonus: 2, phaseBonus: 5, reqXP: 40, dust: 1900, dia: 2, voidC: 0, prim: 0 },
      3: { notchBonus: 3, phaseBonus: 6, reqXP: 46, dust: 2600, dia: 3, voidC: 0, prim: 0 },
      4: { notchBonus: 4, phaseBonus: 7, reqXP: 52, dust: 3400, dia: 4, voidC: 0, prim: 0 },
      5: { notchBonus: 5, phaseBonus: 8, reqXP: 60, dust: 4200, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_8',
    name: 'Leviatano Abissale',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#0369a1',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_boss_8.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 8,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Pressione degli Abissi: conferisce da +5 a +20 HP flat. Formule dense (somma dei valori delle carte >= 15) scatenano una morsa che rende il colpo Danno Puro ed estrae Polvere Stellare extra.',
    weakness: 'Bassa Pressione: combinazioni con somma totale delle carte inferiore a 10 non generano sufficiente pressione abissale e subiscono un malus di -4 HP.',
    portrait: { bg: '#082f49', visor: '#0284c7', accent: '#38bdf8', symbol: 'LV' },
    upgradeTable: {
      1: { flatBonus: 5, reqXP: 1, dust: 1400, dia: 1, voidC: 0, prim: 0 },
      2: { flatBonus: 8, reqXP: 42, dust: 2000, dia: 2, voidC: 0, prim: 0 },
      3: { flatBonus: 11, reqXP: 48, dust: 2800, dia: 3, voidC: 0, prim: 0 },
      4: { flatBonus: 15, reqXP: 54, dust: 3600, dia: 4, voidC: 0, prim: 0 },
      5: { flatBonus: 20, reqXP: 62, dust: 4500, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_9',
    name: 'Signore delle Ombre',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#64748b',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_boss_9.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 9,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Patto di Sangue: con 2 o più carte Rosse (♥/♦), converte l’attacco in Danno Puro e conferisce un bonus flat (+4...+18 HP). Sotto il 50% HP, la Furia dell’Ombra si intensifica aggiungendo un ulteriore bonus da disperazione (+6...+20 HP).',
    weakness: 'Attrito d’Ombra: se la formula non include almeno 2 carte Rosse, il legame con l’antimateria fallisce e subisci una penalità di -3 HP sul colpo.',
    portrait: { bg: '#18181b', visor: '#ef4444', accent: '#64748b', symbol: 'SO' },
    upgradeTable: {
      1: { flatBonus: 4, lowHpBonus: 6, reqXP: 1, dust: 1500, dia: 1, voidC: 0, prim: 0 },
      2: { flatBonus: 7, lowHpBonus: 9, reqXP: 44, dust: 2200, dia: 2, voidC: 0, prim: 0 },
      3: { flatBonus: 10, lowHpBonus: 12, reqXP: 50, dust: 3000, dia: 3, voidC: 0, prim: 0 },
      4: { flatBonus: 14, lowHpBonus: 15, reqXP: 56, dust: 3800, dia: 4, voidC: 0, prim: 0 },
      5: { flatBonus: 18, lowHpBonus: 20, reqXP: 64, dust: 4800, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_10',
    name: 'Colosso di Metano',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#facc15',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_10.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 10,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Corazza Spinata: allestisce una corazza reattiva (25...65 HP) che restituisce un danno fisso da spine (5...10 HP) a ogni attacco subito finché è integra. Giocare carte Picche (♠) riduce di 2 HP qualsiasi danno in arrivo al turno successivo.',
    weakness: 'Inerzia di Metano: sottrae 5s al timer di turno ed è vulnerabile alle formule chiuse con Divisione [/] (+4 HP di danno subito).',
    portrait: { bg: '#451a03', visor: '#facc15', accent: '#fde047', symbol: 'TT' },
    upgradeTable: {
      1: { armorHp: 25, reflectDamage: 5, reqXP: 1, dust: 1600, dia: 1, voidC: 0, prim: 0 },
      2: { armorHp: 35, reflectDamage: 6, reqXP: 46, dust: 2400, dia: 2, voidC: 0, prim: 0 },
      3: { armorHp: 45, reflectDamage: 7, reqXP: 52, dust: 3200, dia: 3, voidC: 0, prim: 0 },
      4: { armorHp: 55, reflectDamage: 8, reqXP: 58, dust: 4000, dia: 4, voidC: 0, prim: 0 },
      5: { armorHp: 65, reflectDamage: 10, reqXP: 66, dust: 5000, dia: 5, voidC: 0, prim: 0 }
    }
  },
  {
    id: 'pilot_boss_11',
    name: 'Idra Criogenica',
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#0284c7',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_11.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 11,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Rigenerazione Oceanica: passare il turno o scartare una carta rigenera HP pari al suo valore nominale moltiplicato per il grado (x1.0...x1.8). Chiudere formule con Divisione [/] assegna da +4 a +14 HP di danno puro.',
    weakness: 'Metabolismo Sommerso: le formule algebriche prive di divisione subiscono un malus di -2 HP al danno totale.',
    portrait: { bg: '#082f49', visor: '#38bdf8', accent: '#7dd3fc', symbol: 'ID' },
    upgradeTable: {
      1: { healMult: 1.0, divBonus: 4, reqXP: 1, dust: 1800, dia: 1, voidC: 0, prim: 0 },
      2: { healMult: 1.2, divBonus: 6, reqXP: 48, dust: 2600, dia: 2, voidC: 1, prim: 0 },
      3: { healMult: 1.4, divBonus: 8, reqXP: 54, dust: 3500, dia: 3, voidC: 1, prim: 0 },
      4: { healMult: 1.6, divBonus: 11, reqXP: 62, dust: 4400, dia: 4, voidC: 2, prim: 1 },
      5: { healMult: 1.8, divBonus: 14, reqXP: 70, dust: 5400, dia: 5, voidC: 3, prim: 1 }
    }
  },
  {
    id: 'pilot_boss_12',
    name: "Titano d'Acciaio",
    rarity: 'Rara',
    rarityColor: '#38bdf8',
    color: '#ef4444',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_boss_12.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 12,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Gabbia Ferromagnetica: sotto la soglia di emergenza (20%...30% HP) erige uno Scudo Magnetico (10...35 HP base + 100%...160% del valore delle Picche accumulate) e riduce i danni subiti del 30%...50%.',
    weakness: 'Sovraccarico Induttivo: finché la gabbia è attiva, il danno dei propri attacchi è ridotto (-50%...-35%).',
    portrait: { bg: '#1e293b', visor: '#ef4444', accent: '#f87171', symbol: 'GA' },
    upgradeTable: {
      1: { thresholdPct: 20, baseShield: 10, spadeMult: 1.0, dmgReductionPct: 0.30, atkMalusPct: 0.50, reqXP: 1, dust: 2000, dia: 2, voidC: 0, prim: 0 },
      2: { thresholdPct: 22, baseShield: 15, spadeMult: 1.1, dmgReductionPct: 0.35, atkMalusPct: 0.50, reqXP: 50, dust: 3000, dia: 3, voidC: 1, prim: 0 },
      3: { thresholdPct: 25, baseShield: 20, spadeMult: 1.25, dmgReductionPct: 0.40, atkMalusPct: 0.45, reqXP: 58, dust: 4200, dia: 4, voidC: 2, prim: 0 },
      4: { thresholdPct: 28, baseShield: 25, spadeMult: 1.4, dmgReductionPct: 0.45, atkMalusPct: 0.40, reqXP: 66, dust: 5500, dia: 5, voidC: 3, prim: 1 },
      5: { thresholdPct: 30, baseShield: 35, spadeMult: 1.6, dmgReductionPct: 0.50, atkMalusPct: 0.35, reqXP: 75, dust: 7000, dia: 6, voidC: 4, prim: 2 }
    }
  },

  // --- 4 EPICI (ALTERAZIONI AVANZATE DI CAMPO) ---
  {
    id: 'pilot_epic_1',
    name: "L'Artificiere di Bordo",
    rarity: 'Epica',
    rarityColor: '#c084fc',
    color: '#c084fc',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_epic_1.png',
    unlockLevelXP: 68,
    unlockCost: { dust: 6000, diamonds: 0, voidCrystals: 3, primordialMatter: 0 },
    trait: 'Deviazione Balistica: disinnescare una Bomba scarica l’onda d’urto sul nemico (+8...+26 HP Danno Puro). Se non ci sono bombe, ne arma una a inizio turno per sfruttare il tratto.',
    weakness: 'Innesco Ritorcente: fallire la bomba entro il tempo causa 15 HP di autodanno al giocatore e scarta 1 carta casuale per il turno successivo.',
    portrait: { bg: '#451a03', visor: '#ef4444', accent: '#f97316', symbol: 'AB' },
    upgradeTable: {
      1: { flatBonus: 8, reqXP: 68, dust: 4000, dia: 0, voidC: 2, prim: 0 },
      2: { flatBonus: 13, reqXP: 72, dust: 5500, dia: 0, voidC: 3, prim: 0 },
      3: { flatBonus: 18, reqXP: 76, dust: 7000, dia: 0, voidC: 4, prim: 0 },
      4: { flatBonus: 22, reqXP: 78, dust: 8000, dia: 0, voidC: 5, prim: 0 },
      5: { flatBonus: 26, reqXP: 80, dust: 9000, dia: 0, voidC: 6, prim: 0 }
    }
  },
  {
    id: 'pilot_epic_2',
    name: "L'Alchimista Aurico",
    rarity: 'Epica',
    rarityColor: '#c084fc',
    color: '#c084fc',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_epic_2.png',
    unlockLevelXP: 72,
    unlockCost: { dust: 7000, diamonds: 0, voidCrystals: 4, primordialMatter: 0 },
    trait: 'Transmutazione Dorata: trasforma la carta più alta in Carta Oro. Se giocata infligge +4...+16 HP ed estrae Polvere (+20...+60); se scartata genera 6...14 HP di Barriera.',
    weakness: 'Inerzia dell’Oro: chiudere il turno trattenendo la Carta Oro in mano senza usarla né scartarla infligge un malus di -8 HP sull’attacco del turno successivo.',
    portrait: { bg: '#1c1917', visor: '#facc15', accent: '#fef08a', symbol: 'AA' },
    upgradeTable: {
      1: { flatBonus: 4, dustBonus: 20, shieldBonus: 6, reqXP: 72, dust: 4400, dia: 0, voidC: 2, prim: 0 },
      2: { flatBonus: 7, dustBonus: 30, shieldBonus: 8, reqXP: 74, dust: 5900, dia: 0, voidC: 3, prim: 0 },
      3: { flatBonus: 10, dustBonus: 40, shieldBonus: 10, reqXP: 77, dust: 7400, dia: 0, voidC: 4, prim: 0 },
      4: { flatBonus: 13, dustBonus: 50, shieldBonus: 12, reqXP: 79, dust: 8400, dia: 0, voidC: 5, prim: 0 },
      5: { flatBonus: 16, dustBonus: 60, shieldBonus: 14, reqXP: 80, dust: 9000, dia: 0, voidC: 6, prim: 0 }
    }
  },
  {
    id: 'pilot_epic_3',
    name: 'Il Viaggiatore del Tempo',
    rarity: 'Epica',
    rarityColor: '#c084fc',
    color: '#c084fc',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_epic_3.png',
    unlockLevelXP: 76,
    unlockCost: { dust: 8000, diamonds: 0, voidCrystals: 5, primordialMatter: 0 },
    trait: 'Paradosso Visivo: a inizio turno evidenzia un gruppo di carte vincenti (2-4) senza svelare ordine o operatori. Usarle assegna da +6 a +22 HP flat di danno.',
    weakness: 'Oscuramento Strumentale: tutti gli aiuti e gli scanner sono disabilitati. Formule chiuse senza le carte suggerite infliggono solo danno base (+0).',
    portrait: { bg: '#042f2e', visor: '#00f2fe', accent: '#5eead4', symbol: 'VT' },
    upgradeTable: {
      1: { flatBonus: 6, reqXP: 76, dust: 5000, dia: 0, voidC: 2, prim: 0 },
      2: { flatBonus: 10, reqXP: 77, dust: 6500, dia: 0, voidC: 3, prim: 0 },
      3: { flatBonus: 14, reqXP: 78, dust: 8000, dia: 0, voidC: 4, prim: 0 },
      4: { flatBonus: 18, reqXP: 79, dust: 8700, dia: 0, voidC: 5, prim: 0 },
      5: { flatBonus: 22, reqXP: 80, dust: 9000, dia: 0, voidC: 6, prim: 0 }
    }
  },
  {
    id: 'pilot_epic_4',
    name: 'Il Re del Ghiaccio',
    rarity: 'Epica',
    rarityColor: '#c084fc',
    color: '#c084fc',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_epic_4.png',
    unlockLevelXP: 80,
    unlockCost: { dust: 9000, diamonds: 0, voidCrystals: 6, primordialMatter: 0 },
    trait: 'Era Glaciale: timer di turno interamente rimosso per entrambi i contendenti; i colpi a segno infliggono da +5 a +18 HP flat di danno criogenico.',
    weakness: 'Tempesta di Ghiaccio Simmetrica: congela a sorte da 1 a 4 carte in mano, il modulo o un bersaglio. Se congela una bomba al suo turno critico, esplode immediatamente.',
    portrait: { bg: '#082f49', visor: '#38bdf8', accent: '#e0f2fe', symbol: 'RG' },
    upgradeTable: {
      1: { flatBonus: 5, reqXP: 80, dust: 5500, dia: 0, voidC: 2, prim: 0 },
      2: { flatBonus: 8, reqXP: 80, dust: 7000, dia: 0, voidC: 3, prim: 0 },
      3: { flatBonus: 11, reqXP: 80, dust: 8400, dia: 0, voidC: 4, prim: 0 },
      4: { flatBonus: 14, reqXP: 80, dust: 9000, dia: 0, voidC: 5, prim: 0 },
      5: { flatBonus: 18, reqXP: 80, dust: 9500, dia: 0, voidC: 6, prim: 0 }
    }
  },

  // --- 6 LEGGENDARI (ARCHETIPI COMPLESSI D'ÉLITE) ---
  {
    id: 'pilot_leg_1',
    name: 'Il Gran Maestro',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'ENERGIA',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_leg_1.png',
    unlockLevelXP: 90,
    unlockCost: { dust: 12000, diamonds: 5, voidCrystals: 0, primordialMatter: 2 },
    trait: 'Maestro universale: ogni operatore eseguito nel turno cumula un bonus flat istantaneo ([+] +10, [-] +15, [*] +20, [/] +25 a Liv. 5).',
    weakness: 'Scanner disabilitato e timer di turno bloccato a 30 secondi fissi.',
    portrait: { bg: '#020617', visor: '#facc15', accent: '#ffffff', symbol: 'GM' },
    upgradeTable: {
      1: { reqXP: 90, dust: 8000, dia: 2, voidC: 4, prim: 1, opBonuses: { '+': 2, '-': 3, '*': 4, '/': 5 } },
      2: { reqXP: 93, dust: 10500, dia: 3, voidC: 5, prim: 2, opBonuses: { '+': 4, '-': 6, '*': 8, '/': 10 } },
      3: { reqXP: 96, dust: 13000, dia: 4, voidC: 6, prim: 2, opBonuses: { '+': 6, '-': 9, '*': 12, '/': 15 } },
      4: { reqXP: 98, dust: 15500, dia: 5, voidC: 7, prim: 3, opBonuses: { '+': 8, '-': 12, '*': 16, '/': 20 } },
      5: { reqXP: 100, dust: 18000, dia: 6, voidC: 8, prim: 4, opBonuses: { '+': 10, '-': 15, '*': 20, '/': 25 } }
    }
  },
  {
    id: 'pilot_leg_2',
    name: 'Il Veggente Supremo',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_leg_2.png',
    unlockLevelXP: 92,
    unlockCost: { dust: 13500, diamonds: 6, voidCrystals: 0, primordialMatter: 2 },
    trait: 'Preveggenza Rapida: mostra in anticipo il target. Risolvere entro i primi 15s assegna da +4 a +20 HP flat in Danno Puro.',
    weakness: 'Nessun suggerimento sulle carte da usare; superati i 15s infligge unicamente il danno base standard.',
    portrait: { bg: '#0f172a', visor: '#38bdf8', accent: '#fde047', symbol: 'VS' },
    upgradeTable: {
      1: { flatBonus: 4, reqXP: 92, dust: 8500, dia: 2, voidC: 4, prim: 1 },
      2: { flatBonus: 8, reqXP: 94, dust: 11000, dia: 3, voidC: 5, prim: 2 },
      3: { flatBonus: 12, reqXP: 97, dust: 13500, dia: 4, voidC: 6, prim: 2 },
      4: { flatBonus: 16, reqXP: 99, dust: 16000, dia: 5, voidC: 7, prim: 3 },
      5: { flatBonus: 20, reqXP: 100, dust: 18000, dia: 6, voidC: 8, prim: 4 }
    }
  },
  {
    id: 'pilot_leg_3',
    name: 'Il Fissatore',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_leg_3.png',
    unlockLevelXP: 94,
    unlockCost: { dust: 14500, diamonds: 6, voidCrystals: 0, primordialMatter: 3 },
    trait: 'Accumulo Trifase: 0 HP nei turni 1 e 2 (accumula buffer). Al 3°T scarica l’intero buffer. Al 4°T esilia permanentemente le carte scartate in T1-T3, aggiungendone il valore alla scarica del 7°T.',
    weakness: 'Zero danni per 2T consecutivi; al 4°T subisce malus danno (-15...-10 HP) e perde definitivamente le carte esiliate dal mazzo.',
    portrait: { bg: '#3b0764', visor: '#38bdf8', accent: '#c084fc', symbol: 'FI' },
    upgradeTable: {
      1: { chargeBonusPerTurn: 4, flatBonus: 4, t4Penalty: 15, reqXP: 94, dust: 9000, dia: 2, voidC: 4, prim: 1 },
      2: { chargeBonusPerTurn: 8, flatBonus: 8, t4Penalty: 14, reqXP: 96, dust: 11500, dia: 3, voidC: 5, prim: 2 },
      3: { chargeBonusPerTurn: 12, flatBonus: 12, t4Penalty: 12, reqXP: 98, dust: 14000, dia: 4, voidC: 6, prim: 2 },
      4: { chargeBonusPerTurn: 16, flatBonus: 16, t4Penalty: 11, reqXP: 99, dust: 16500, dia: 5, voidC: 7, prim: 3 },
      5: { chargeBonusPerTurn: 20, flatBonus: 20, t4Penalty: 10, reqXP: 100, dust: 18000, dia: 6, voidC: 8, prim: 4 }
    }
  },
  {
    id: 'pilot_leg_4',
    name: 'Il Lottatore di Sumo',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    image: '/assets/pilots/pilot_leg_4.png',
    unlockLevelXP: 96,
    unlockCost: { dust: 15500, diamonds: 7, voidCrystals: 0, primordialMatter: 3 },
    trait: 'Moltiplicazioni [*] (+25 HP a Liv. 5) e Divisioni [/] (+30 HP a Liv. 5) cumulano max una sola volta ciascuna nel turno. Incassare colpi >25 HP scatena Terremoto da 30 HP nemici fuori turno.',
    weakness: 'Formule chiuse solo con [+] e/o [-] subiscono malus di -5 HP. Scatenare il Terremoto infligge 15 HP di autodanno da caduta.',
    portrait: { bg: '#7f1d1d', visor: '#f87171', accent: '#fca5a5', symbol: 'LS' },
    upgradeTable: {
      1: { multBonus: 5, divBonus: 6, lowOpPenalty: 5, earthquakeDmg: 10, selfDmg: 15, reqXP: 96, dust: 9500, dia: 2, voidC: 4, prim: 1 },
      2: { multBonus: 10, divBonus: 12, lowOpPenalty: 5, earthquakeDmg: 15, selfDmg: 15, reqXP: 97, dust: 12000, dia: 3, voidC: 5, prim: 2 },
      3: { multBonus: 15, divBonus: 18, lowOpPenalty: 5, earthquakeDmg: 20, selfDmg: 15, reqXP: 98, dust: 14500, dia: 4, voidC: 6, prim: 2 },
      4: { multBonus: 20, divBonus: 24, lowOpPenalty: 5, earthquakeDmg: 25, selfDmg: 15, reqXP: 99, dust: 16500, dia: 5, voidC: 7, prim: 3 },
      5: { multBonus: 25, divBonus: 30, lowOpPenalty: 5, earthquakeDmg: 30, selfDmg: 15, reqXP: 100, dust: 18000, dia: 6, voidC: 8, prim: 4 }
    }
  },
  {
    id: 'pilot_leg_5',
    name: "L'Amante del Rosso",
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'ENERGIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    image: '/assets/pilots/pilot_leg_5.png',
    unlockLevelXP: 98,
    unlockCost: { dust: 16500, diamonds: 8, voidCrystals: 0, primordialMatter: 3 },
    trait: 'Risonanza Cremisi: ogni carta Rossa (Cuori/Quadri) aggiunge il suo valore nominale + bonus di grado (+1...+5 HP). Cuori cura il giocatore; Quadri estrae Polvere extra.',
    weakness: 'Ogni carta Nera usata sottrae dal timer del turno successivo un numero di secondi pari al suo valore facciale.',
    portrait: { bg: '#4c0519', visor: '#ef4444', accent: '#fda4af', symbol: 'AR' },
    upgradeTable: {
      1: { cardBonus: 1, reqXP: 98, dust: 10000, dia: 2, voidC: 4, prim: 1 },
      2: { cardBonus: 2, reqXP: 98, dust: 12500, dia: 3, voidC: 5, prim: 2 },
      3: { cardBonus: 3, reqXP: 99, dust: 15000, dia: 4, voidC: 6, prim: 2 },
      4: { cardBonus: 4, reqXP: 99, dust: 17000, dia: 5, voidC: 7, prim: 3 },
      5: { cardBonus: 5, reqXP: 100, dust: 18000, dia: 6, voidC: 8, prim: 4 }
    }
  },
  {
    id: 'pilot_leg_6',
    name: "L'Amante del Nero",
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#facc15',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_leg_6.png',
    unlockLevelXP: 100,
    unlockCost: { dust: 18000, diamonds: 10, voidCrystals: 0, primordialMatter: 4 },
    trait: 'Eclisse Ossidiana: ogni carta Nera (Picche/Fiori) aggiunge il suo valore nominale + bonus di grado (+1...+5 HP). Picche perfora armature; Fiori aggiunge tempo al Time Tank.',
    weakness: 'Ogni carta Rossa usata sottrae dal timer del turno successivo un numero di secondi pari al suo valore facciale.',
    portrait: { bg: '#09090b', visor: '#a855f7', accent: '#38bdf8', symbol: 'AN' },
    upgradeTable: {
      1: { cardBonus: 1, reqXP: 100, dust: 10000, dia: 3, voidC: 5, prim: 2 },
      2: { cardBonus: 2, reqXP: 100, dust: 12500, dia: 4, voidC: 6, prim: 2 },
      3: { cardBonus: 3, reqXP: 100, dust: 15000, dia: 5, voidC: 7, prim: 3 },
      4: { cardBonus: 4, reqXP: 100, dust: 17000, dia: 6, voidC: 8, prim: 3 },
      5: { cardBonus: 5, reqXP: 100, dust: 18000, dia: 7, voidC: 8, prim: 4 }
    }
  },

  // --- 3 CARTE EROE BOSS ENDGAME (SBLOCCO DA SETTORE 10: P18 - P20) ---
  {
    id: 'pilot_boss_18',
    name: 'Entità della Discordia',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#f97316',
    primaryElement: 'ENERGIA',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_18.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 18,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Inversione Termica: ogni attacco a segno incendia il nemico, infliggendo Danno Puro per ogni secondo del suo turno (0.5...2.0 HP/s). Se l’avversario passa il turno senza attaccare, implode: nel tuo turno successivo, ogni secondo che impieghi a riflettere prima di attaccare infligge Danno Puro continuo a lui.',
    weakness: 'Nessun punto debole.',
    portrait: { bg: '#431407', visor: '#f97316', accent: '#fdba74', symbol: 'ER' },
    upgradeTable: {
      1: { burnPerSec: 0.5, reqXP: 1, dust: 2800, dia: 4, voidC: 0, prim: 0 },
      2: { burnPerSec: 0.8, reqXP: 60, dust: 4200, dia: 5, voidC: 1, prim: 0 },
      3: { burnPerSec: 1.2, reqXP: 70, dust: 5800, dia: 6, voidC: 2, prim: 0 },
      4: { burnPerSec: 1.6, reqXP: 78, dust: 7500, dia: 7, voidC: 3, prim: 1 },
      5: { burnPerSec: 2.0, reqXP: 88, dust: 9800, dia: 8, voidC: 4, prim: 2 }
    }
  },
  {
    id: 'pilot_boss_19',
    name: 'Nucleo Magmatico',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#ef4444',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    image: '/assets/pilots/pilot_boss_19.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 19,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Ciclo Magmatico Trifase: T1 accumula il 50% del danno inflitto. T2 rilascia l’accumulo come Danno Puro aggiuntivo (+4...+20 HP). T3 in fase di gelo, risolvere bersagli con valore Dispari concede un 2° attacco consecutivo nello stesso turno.',
    weakness: 'Al Turno 2, se non trovi combinazioni e passi, l’accumulo magmatico implode infliggendoti 6 HP di contraccolpo puro.',
    portrait: { bg: '#450a0a', visor: '#ef4444', accent: '#fca5a5', symbol: 'IO' },
    upgradeTable: {
      1: { releaseBonus: 4, secondAttackBonus: 4, reqXP: 1, dust: 2800, dia: 4, voidC: 0, prim: 0 },
      2: { releaseBonus: 7, secondAttackBonus: 6, reqXP: 60, dust: 4200, dia: 5, voidC: 1, prim: 0 },
      3: { releaseBonus: 10, secondAttackBonus: 9, reqXP: 70, dust: 5800, dia: 6, voidC: 2, prim: 0 },
      4: { releaseBonus: 14, secondAttackBonus: 12, reqXP: 78, dust: 7500, dia: 7, voidC: 3, prim: 1 },
      5: { releaseBonus: 20, secondAttackBonus: 16, reqXP: 88, dust: 9800, dia: 8, voidC: 4, prim: 2 }
    }
  },
  {
    id: 'pilot_boss_20',
    name: 'Sovrano del Vuoto',
    rarity: 'Leggendaria',
    rarityColor: '#facc15',
    color: '#06b6d4',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    image: '/assets/pilots/pilot_boss_20.png',
    unlockLevelXP: 1,
    unlockBossPlanet: 20,
    isBossReward: true,
    unlockCost: { dust: 0, diamonds: 0, voidCrystals: 0, primordialMatter: 0 },
    trait: 'Dominio dei 4 Elementi: ♠ Picche aumenta il danno (+4...+16 HP o Danno x2.0). ♥ Cuori incrementa la cura (+40%...+100%). ♣ Fiori sottrae secondi al turno avversario pari al valore carta (50%...100%). ♦ Quadri ricarica di +1/+2 tacche extra il Modulo Abilità Ibrido.',
    weakness: 'Nessun punto debole.',
    portrait: { bg: '#083344', visor: '#00f2fe', accent: '#a5f3fc', symbol: 'EN' },
    upgradeTable: {
      1: { spadeBonus: 4, heartHealBoost: 0.40, clubTimeDrainPct: 0.50, diamondModuleNotches: 1, reqXP: 1, dust: 3500, dia: 5, voidC: 1, prim: 0 },
      2: { spadeBonus: 7, heartHealBoost: 0.60, clubTimeDrainPct: 0.70, diamondModuleNotches: 1, reqXP: 65, dust: 5000, dia: 6, voidC: 2, prim: 0 },
      3: { spadeBonus: 11, heartHealBoost: 0.80, clubTimeDrainPct: 0.85, diamondModuleNotches: 1, reqXP: 75, dust: 7000, dia: 7, voidC: 3, prim: 1 },
      4: { spadeBonus: 16, heartHealBoost: 0.90, clubTimeDrainPct: 1.00, diamondModuleNotches: 1, reqXP: 85, dust: 9500, dia: 8, voidC: 4, prim: 2 },
      5: { spadeDouble: true, heartHealBoost: 1.00, clubTimeDrainPct: 1.00, diamondModuleNotches: 2, reqXP: 95, dust: 13500, dia: 12, voidC: 5, prim: 3 }
    }
  },

  // ==========================================================================
  // LE 20 SENTINELLE PLANETARIE (NPC ONLY - SETTORI 1-9 DI CIASCUN PIANETA)
  // ==========================================================================
  {
    id: 'pilot_sentinel_1',
    name: 'Golema Tellurico',
    planetNum: 1,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#064e3b', visor: '#10b981', accent: '#34d399', symbol: 'GT' },
    trait: 'Sentinella Tellurica: presidia i settori 1-9 di Terra attraverso campi gravitazionali compatti.',
    weakness: 'Vulnerabile alle disgregazioni entropiche.',
    upgradeTable: {
      1: { flatBonus: 1 },
      2: { flatBonus: 3 },
      3: { flatBonus: 5 },
      4: { flatBonus: 7 },
      5: { flatBonus: 9 }
    }
  },
  {
    id: 'pilot_sentinel_2',
    name: 'Automa di Tharsis',
    planetNum: 2,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#ef4444',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#450a0a', visor: '#ef4444', accent: '#fca5a5', symbol: 'AT' },
    trait: 'Sentinella Marziana: accumula calore cinetico ed energia termica nel deserto di Tharsis.',
    weakness: 'Estinguibile dalla stasi criogenica.',
    upgradeTable: {
      1: { flatBonus: 2 },
      2: { flatBonus: 4 },
      3: { flatBonus: 6 },
      4: { flatBonus: 8 },
      5: { flatBonus: 10 }
    }
  },
  {
    id: 'pilot_sentinel_3',
    name: 'Chimera Acida',
    planetNum: 3,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#14532d', visor: '#00f2fe', accent: '#bef264', symbol: 'CA' },
    trait: 'Sentinella Venusiana: erode strutture e difese sfruttando la tossicità corrosiva dell’atmosfera.',
    weakness: 'Vulnerabile al bombardamento energetico diretto.',
    upgradeTable: {
      1: { flatBonus: 2 },
      2: { flatBonus: 4 },
      3: { flatBonus: 6 },
      4: { flatBonus: 8 },
      5: { flatBonus: 10 }
    }
  },
  {
    id: 'pilot_sentinel_4',
    name: 'Costrutto Termico',
    planetNum: 4,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#f59e0b',
    primaryElement: 'ENERGIA',
    secondaryElement: 'ENTROPIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#451a03', visor: '#f59e0b', accent: '#fde047', symbol: 'CT' },
    trait: 'Sentinella Solare: canalizza la radiazione incandescente dei crateri metallici di Mercurio.',
    weakness: 'Subisce il raffreddamento dello zero assoluto.',
    upgradeTable: {
      1: { flatBonus: 2 },
      2: { flatBonus: 5 },
      3: { flatBonus: 7 },
      4: { flatBonus: 9 },
      5: { flatBonus: 12 }
    }
  },
  {
    id: 'pilot_sentinel_5',
    name: 'Vortice Ionico',
    planetNum: 5,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#083344', visor: '#06b6d4', accent: '#67e8f9', symbol: 'VI' },
    trait: 'Sentinella Gioviana: attinge alle tempeste perenni della Grande Macchia espandendo il caos temporale.',
    weakness: 'Instabile contro concentrazioni elevate di energia.',
    upgradeTable: {
      1: { flatBonus: 3 },
      2: { flatBonus: 5 },
      3: { flatBonus: 7 },
      4: { flatBonus: 10 },
      5: { flatBonus: 13 }
    }
  },
  {
    id: 'pilot_sentinel_6',
    name: 'Spettro Anulare',
    planetNum: 6,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ZERO_ASSOLUTO',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#1c1917', visor: '#facc15', accent: '#fde68a', symbol: 'SA' },
    trait: 'Sentinella Saturniana: condensa polvere di ghiaccio e silicato negli anelli di Crono.',
    weakness: 'Cedevole sotto usura entropica.',
    upgradeTable: {
      1: { flatBonus: 3 },
      2: { flatBonus: 6 },
      3: { flatBonus: 8 },
      4: { flatBonus: 11 },
      5: { flatBonus: 14 }
    }
  },
  {
    id: 'pilot_sentinel_7',
    name: 'Drone Criomagnetico',
    planetNum: 7,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#38bdf8',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#082f49', visor: '#38bdf8', accent: '#7dd3fc', symbol: 'DC' },
    trait: 'Sentinella Uraniana: polarizza il campo ionico polare per congelare le frequenze tattiche rivali.',
    weakness: 'Vulnerabile a impulsi gravitazionali compressi.',
    upgradeTable: {
      1: { flatBonus: 3 },
      2: { flatBonus: 6 },
      3: { flatBonus: 9 },
      4: { flatBonus: 12 },
      5: { flatBonus: 15 }
    }
  },
  {
    id: 'pilot_sentinel_8',
    name: 'Guardiano Abissale',
    planetNum: 8,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#38bdf8',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#0f172a', visor: '#0284c7', accent: '#38bdf8', symbol: 'GA' },
    trait: 'Sentinella Nettuniana: manovra le correnti criogeniche delle profondità sub-oceaniche.',
    weakness: 'Soggetto a collasso da sovraccarico energetico.',
    upgradeTable: {
      1: { flatBonus: 4 },
      2: { flatBonus: 7 },
      3: { flatBonus: 10 },
      4: { flatBonus: 13 },
      5: { flatBonus: 16 }
    }
  },
  {
    id: 'pilot_sentinel_9',
    name: 'Ombra Subspaziale',
    planetNum: 9,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#09090b', visor: '#64748b', accent: '#94a3b8', symbol: 'OS' },
    trait: 'Sentinella Plutoniana: si mimetizza tra i banchi di antimateria e metano solido del pianeta nano.',
    weakness: 'Esposta alle scariche termiche concentrate.',
    upgradeTable: {
      1: { flatBonus: 4 },
      2: { flatBonus: 7 },
      3: { flatBonus: 10 },
      4: { flatBonus: 14 },
      5: { flatBonus: 18 }
    }
  },
  {
    id: 'pilot_sentinel_10',
    name: 'Colosso Idrocarburico',
    planetNum: 10,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENTROPIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#451a03', visor: '#b45309', accent: '#f59e0b', symbol: 'CI' },
    trait: 'Sentinella di Titano: corazza viscosa alimentata dai laghi di idrocarburi pressurizzati.',
    weakness: 'Frantumabile sotto forte pressione entropica.',
    upgradeTable: {
      1: { flatBonus: 4 },
      2: { flatBonus: 8 },
      3: { flatBonus: 11 },
      4: { flatBonus: 15 },
      5: { flatBonus: 19 }
    }
  },
  {
    id: 'pilot_sentinel_11',
    name: 'Serpente Glaciale',
    planetNum: 11,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#38bdf8',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#0284c7', visor: '#38bdf8', accent: '#e0f2fe', symbol: 'SG' },
    trait: 'Sentinella di Europa: pattuglia la crosta tettonica ghiacciata al di sopra dell’oceano caldo.',
    weakness: 'Esposto alla pressione gravitazionale profonda.',
    upgradeTable: {
      1: { flatBonus: 5 },
      2: { flatBonus: 8 },
      3: { flatBonus: 12 },
      4: { flatBonus: 16 },
      5: { flatBonus: 20 }
    }
  },
  {
    id: 'pilot_sentinel_12',
    name: 'Centurione Magnetico',
    planetNum: 12,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#1e293b', visor: '#ef4444', accent: '#94a3b8', symbol: 'CM' },
    trait: 'Sentinella di Ganimede: scudo pesante in titanite fusa guidato da rotori ferromagnetici.',
    weakness: 'Disgregabile da shock entropici accelerati.',
    upgradeTable: {
      1: { flatBonus: 5 },
      2: { flatBonus: 9 },
      3: { flatBonus: 13 },
      4: { flatBonus: 17 },
      5: { flatBonus: 21 }
    }
  },
  {
    id: 'pilot_sentinel_13',
    name: 'Eco Fotonico',
    planetNum: 13,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#ef4444',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#042f2e', visor: '#14b8a6', accent: '#5eead4', symbol: 'EF' },
    trait: 'Sentinella di Kepler: assorbe lo spettro infrarosso della nana rossa trasformandolo in fasci laser.',
    weakness: 'Neutralizzabile dalla stasi criogenica dello zero assoluto.',
    upgradeTable: {
      1: { flatBonus: 6 },
      2: { flatBonus: 10 },
      3: { flatBonus: 14 },
      4: { flatBonus: 18 },
      5: { flatBonus: 22 }
    }
  },
  {
    id: 'pilot_sentinel_14',
    name: 'Anomalia Caotica',
    planetNum: 14,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ENERGIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#3b0764', visor: '#6366f1', accent: '#a855f7', symbol: 'AC' },
    trait: 'Sentinella di Proxima: distorsione spazio-temporale refrattaria alle interferenze ambientali.',
    weakness: 'Vulnerabile al bombardamento energetico.',
    upgradeTable: {
      1: { flatBonus: 6 },
      2: { flatBonus: 10 },
      3: { flatBonus: 15 },
      4: { flatBonus: 19 },
      5: { flatBonus: 23 }
    }
  },
  {
    id: 'pilot_sentinel_15',
    name: 'Risonatore Polifonico',
    planetNum: 15,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#4a044e', visor: '#d946ef', accent: '#f0abfc', symbol: 'RP' },
    trait: 'Sentinella di TRAPPIST: intona le sette frequenze orbitali del sistema risonante.',
    weakness: 'Dispersione immediata sotto usura temporale.',
    upgradeTable: {
      1: { flatBonus: 7 },
      2: { flatBonus: 11 },
      3: { flatBonus: 16 },
      4: { flatBonus: 20 },
      5: { flatBonus: 25 }
    }
  },
  {
    id: 'pilot_sentinel_16',
    name: 'Ago di Lagrange',
    planetNum: 16,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#082f49', visor: '#0ea5e9', accent: '#38bdf8', symbol: 'AL' },
    trait: 'Sentinella di Gliese: ancora cinetica collocata nel baricentro d’equilibrio gravitazionale.',
    weakness: 'Sensibile a sbilanciamenti cinetici ed energetici.',
    upgradeTable: {
      1: { flatBonus: 7 },
      2: { flatBonus: 12 },
      3: { flatBonus: 17 },
      4: { flatBonus: 21 },
      5: { flatBonus: 26 }
    }
  },
  {
    id: 'pilot_sentinel_17',
    name: 'Vettore Cinetico',
    planetNum: 17,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#10b981',
    primaryElement: 'GRAVITA',
    secondaryElement: 'ENERGIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#14532d', visor: '#84cc16', accent: '#bef264', symbol: 'VC' },
    trait: 'Sentinella di Haumea: frammento di roccia e ghiaccio proiettato dalla rotazione ultra-rapida.',
    weakness: 'Dissolvibile sotto attacco entropico.',
    upgradeTable: {
      1: { flatBonus: 8 },
      2: { flatBonus: 13 },
      3: { flatBonus: 18 },
      4: { flatBonus: 23 },
      5: { flatBonus: 28 }
    }
  },
  {
    id: 'pilot_sentinel_18',
    name: 'Scheggia Entropica',
    planetNum: 18,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#00f2fe',
    primaryElement: 'ENTROPIA',
    secondaryElement: 'ZERO_ASSOLUTO',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#431407', visor: '#f97316', accent: '#fdba74', symbol: 'SE' },
    trait: 'Sentinella di Eris: frammento solitario ai confini della fascia che disgrega le certezze algebriche.',
    weakness: 'Vulnerabile a scariche di pura energia.',
    upgradeTable: {
      1: { flatBonus: 8 },
      2: { flatBonus: 14 },
      3: { flatBonus: 19 },
      4: { flatBonus: 24 },
      5: { flatBonus: 30 }
    }
  },
  {
    id: 'pilot_sentinel_19',
    name: 'Elementale Sulfureo',
    planetNum: 19,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#ef4444',
    primaryElement: 'ENERGIA',
    secondaryElement: 'GRAVITA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#450a0a', visor: '#ef4444', accent: '#f87171', symbol: 'ES' },
    trait: 'Sentinella di Io: plasma vulcanico scagliato a centinaia di chilometri dalle caldere attive.',
    weakness: 'Soggetto a spegnimento criogenico.',
    upgradeTable: {
      1: { flatBonus: 9 },
      2: { flatBonus: 15 },
      3: { flatBonus: 21 },
      4: { flatBonus: 26 },
      5: { flatBonus: 32 }
    }
  },
  {
    id: 'pilot_sentinel_20',
    name: 'Fenditura del Vuoto',
    planetNum: 20,
    rarity: 'Sentinella',
    rarityColor: '#94a3b8',
    color: '#38bdf8',
    primaryElement: 'ZERO_ASSOLUTO',
    secondaryElement: 'ENTROPIA',
    isNpcOnly: true,
    obtainable: false,
    image: null,
    portrait: { bg: '#083344', visor: '#00f2fe', accent: '#a5f3fc', symbol: 'FV' },
    trait: 'Sentinella di Encelado: geyser criogenico che convoglia la pressione dell’oceano verso il vuoto cosmico.',
    weakness: 'Compressione per opera di singolarità gravitazionali.',
    upgradeTable: {
      1: { flatBonus: 10 },
      2: { flatBonus: 16 },
      3: { flatBonus: 22 },
      4: { flatBonus: 28 },
      5: { flatBonus: 35 }
    }
  }
]);

export function getPilotById(pilotId) {
  if (!pilotId) return PILOTS_DATABASE[0];
  if (typeof pilotId === 'object' && pilotId.id) return pilotId;
  return PILOTS_DATABASE.find(p => p.id === pilotId) || PILOTS_DATABASE[0];
}

export function getPilotLevelData(pilotId, level = 1) {
  const p = getPilotById(pilotId);
  const curLvl = Math.max(1, Math.min(5, Number(level) || 1));
  return p.upgradeTable?.[curLvl] || p.upgradeTable?.[1] || {};
}

// ============================================================================
// ASSEGNAZIONE PILOTA INCONTRO SETTORE CAMPAGNA (SETTORI 1-9 SENTINELLA, 10 BOSS)
// ============================================================================
export function getSectorEncounterPilot(planet = 1, level = 1) {
  const p = Number(planet) || 1;
  const l = Number(level) || 1;

  if (l === 10) {
    const boss = PILOTS_DATABASE.find(item => item.id === `pilot_boss_${p}`);
    if (boss) return boss;
    const sentinel = PILOTS_DATABASE.find(item => item.id === `pilot_sentinel_${p}`);
    if (sentinel) {
      return {
        ...sentinel,
        assignedLevel: 5
      };
    }
    return getPilotById('pilot_com_1');
  }

  const sentinel = PILOTS_DATABASE.find(item => item.id === `pilot_sentinel_${p}`);
  if (sentinel) {
    const grade = l <= 3 ? 1 : (l <= 6 ? 2 : 3);
    return {
      ...sentinel,
      assignedLevel: grade
    };
  }

  return getPilotById('pilot_com_1');
}

// ============================================================================
// SCOMPARTO 2: LO STAMPO DELLA CARTA PILOTA CON BADGE ELEMENTALI A VISTA
// ============================================================================
export function PilotCard({ pilot, pilotId, isEquipped = false, isResonance = false, onClick = null, compact = false, size = null }) {
  const [imgError, setImgError] = useState(false);
  const targetId = pilot || pilotId;
  const p = (typeof targetId === 'string' ? PILOTS_DATABASE.find(x => x.id === targetId) : targetId) || PILOTS_DATABASE[0];

  useEffect(() => {
    setImgError(false);
  }, [targetId?.id || targetId]);

  const primIcon = ELEMENT_ICONS[p.primaryElement] || '🪐';
  const secIcon = ELEMENT_ICONS[p.secondaryElement] || '💥';

  const cardWidth = size ? `${size}px` : (compact ? '52px' : '78px');
  const cardHeight = size ? `${Math.round(size * 1.48)}px` : (compact ? '76px' : '116px');

  return (
    <div
      onClick={onClick}
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: '6px',
        border: isResonance ? '2px solid #fde047' : `1.5px solid ${p.rarityColor}`,
        boxShadow: isResonance ? '0 0 14px rgba(250, 204, 21, 0.85)' : `0 0 10px ${p.rarityColor}44`,
        background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        userSelect: 'none',
        flexShrink: 0
      }}
      title={`${p.name} (${p.rarity}) - [${p.primaryElement}/${p.secondaryElement}]${isResonance ? ' - RISONANZA DI SET ATTIVA!' : ''}`}
    >
      {/* Badge Grado / Boss Planet / Sentinel Planet */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          background: isResonance ? '#facc15' : p.rarityColor,
          color: '#020617',
          fontSize: compact ? '5px' : '7px',
          fontWeight: '900',
          padding: '1px 3px',
          borderRadius: '2px',
          zIndex: 3
        }}
      >
        {p.isBossReward ? `P${p.unlockBossPlanet}` : (p.isNpcOnly ? `P${p.planetNum}` : (p.rarity ? p.rarity[0].toUpperCase() : 'P'))}
      </div>

      {/* Badge Doppi Elementi a Vista in Alto a Destra */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          background: 'rgba(2, 6, 23, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '1px 3px',
          borderRadius: '3px',
          display: 'flex',
          gap: '2px',
          zIndex: 3,
          fontSize: compact ? '6px' : '8px',
          lineHeight: 1
        }}
        title={`Primario: ${p.primaryElement} | Secondario: ${p.secondaryElement}`}
      >
        <span>{primIcon}</span>
        <span>{secIcon}</span>
      </div>

      <div
        style={{
          width: '100%',
          height: compact ? '68%' : '72%',
          background: '#090d16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderBottom: `1px solid ${p.rarityColor}44`
        }}
      >
        {!imgError && p.image ? (
          <img
            src={p.image}
            alt={p.name}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: p.portrait?.bg || '#1e293b'
            }}
          >
            <span
              style={{
                fontSize: compact ? '1rem' : '1.5rem',
                color: p.portrait?.accent || p.rarityColor,
                fontWeight: '900',
                textShadow: '0 0 6px currentColor'
              }}
            >
              {p.portrait?.symbol || 'P'}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          padding: '1px 2px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(2, 6, 23, 0.85)'
        }}
      >
        <div
          style={{
            fontSize: compact ? '6px' : '8px',
            fontWeight: '900',
            color: isResonance ? '#fde047' : '#f8fafc',
            textAlign: 'center',
            width: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {p.name}
        </div>
        {isEquipped && (
          <div
            style={{
              fontSize: compact ? '5px' : '6px',
              fontWeight: '900',
              color: isResonance ? '#facc15' : '#10b981',
              letterSpacing: '0.3px'
            }}
          >
            {isResonance ? '★ RISONANTE' : '● IN PLANCIA'}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SCOMPARTO 3: LA CENTRALINA DI CALCOLO DEI DANNI
// ============================================================================
export function getPilotDamageMultiplier(pilotId, pilotLevel = 1, usedOperators = [], turnSeconds = null, extraContext = {}) {
  const pilot = PILOTS_DATABASE.find(p => p.id === pilotId);
  const baseReturn = {
    flat: 0,
    multiplier: 1.0,
    hasOpBonus: false,
    isPureDamage: false,
    healAmount: 0,
    shieldAmount: 0,
    dustExtra: 0,
    dustMultiplier: 1.0,
    timerPenaltyNextTurn: 0,
    turnTimerOverride: null,
    disableScanner: false,
    isTimerRemoved: false,
    isMonochromeActive: false,
    isHealBlocked: false,
    reflectedDamage: 0,
    poisonPerSecond: 0,
    poisonDurationSec: 0,
    selfDamage: 0,
    burnPerSecond: 0,
    isTimeBurn: false,
    storeDamagePct: 0,
    canDoubleAttack: false,
    enemyTimerDrain: 0,
    extraModuleNotches: 0,
    heartHealMultiplier: 1.0
  };

  if (!pilot) return baseReturn;

  const lvl = Math.max(1, Math.min(5, Number(pilotLevel) || 1));
  const lvlData = pilot.upgradeTable?.[lvl] || pilot.upgradeTable?.[1] || {};

  let flat = 0;
  let multiplier = 1.0;
  let hasOpBonus = false;
  let isPureDamage = false;
  let healAmount = 0;
  let shieldAmount = 0;
  let dustExtra = 0;
  let dustMultiplier = 1.0;
  let timerPenaltyNextTurn = 0;
  let turnTimerOverride = null;
  let disableScanner = false;
  let isTimerRemoved = false;
  let isMonochromeActive = false;
  let isHealBlocked = false;
  let reflectedDamage = 0;
  let poisonPerSecond = 0;
  let poisonDurationSec = 0;
  let selfDamage = 0;
  let burnPerSecond = 0;
  let isTimeBurn = false;
  let storeDamagePct = 0;
  let canDoubleAttack = false;
  let enemyTimerDrain = 0;
  let extraModuleNotches = 0;
  let heartHealMultiplier = 1.0;

  // Filtraggio rigoroso dei valori null/undefined negli operatori
  const rawOps = Array.isArray(usedOperators) ? usedOperators : (usedOperators ? [usedOperators] : []);
  const opsArray = rawOps.filter(Boolean);
  const playedCards = Array.isArray(extraContext?.playedCards) ? extraContext.playedCards : [];

  switch (pilot.id) {
    case 'pilot_boss_1': {
      const redCards = playedCards.filter(c => {
        const s = getCardSuit(c);
        return s === 'hearts' || s === 'diamonds' || c?.isRed;
      });
      if (redCards.length >= 2) {
        flat = redCards.length * (lvlData.bonusFlat || 1);
        dustMultiplier = lvlData.dustMult || 1.2;
        hasOpBonus = true;
      } else if (playedCards.length > 0) {
        flat = -3;
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_boss_2': {
      const streak = Number(extraContext?.streakCount || extraContext?.resonanceStreak || 0);
      const step = lvlData.streakBonus || 2;
      flat = streak * step;

      const hasComplexOp = opsArray.includes('*') || opsArray.includes('/');
      if (hasComplexOp) {
        flat += (lvlData.complexBonus || 4);
      }
      hasOpBonus = flat > 0;
      break;
    }

    case 'pilot_boss_3': {
      poisonPerSecond = lvlData.dps || 1;
      poisonDurationSec = lvlData.duration || 10;
      hasOpBonus = true;
      break;
    }

    case 'pilot_boss_4': {
      const baseFlat = lvlData.flatBonus || 3;
      if (playedCards.length >= 3) {
        flat = baseFlat;
        isPureDamage = true;
      } else {
        flat = Math.max(1, baseFlat - 2);
      }
      hasOpBonus = true;
      break;
    }

    case 'pilot_boss_5': {
      const cBonus = lvlData.flatBonus || 1;
      let spadesDamage = 0;
      let hasSpade = false;

      playedCards.forEach(c => {
        const val = Number(c?.value) || 0;
        const isSpade = getCardSuit(c) === 'spades';
        if (isSpade) {
          hasSpade = true;
          spadesDamage += (val + cBonus);
        }
      });

      if (hasSpade) {
        flat += spadesDamage;
        hasOpBonus = true;
      }

      if (extraContext?.playedElectrifiedCard) {
        const electVal = Number(extraContext?.electrifiedCardValue) || 7;
        flat += (electVal * 2);
        isPureDamage = true;
        hasOpBonus = true;
      }

      if (extraContext?.retainedElectrifiedCard) {
        selfDamage = 4;
      }
      break;
    }

    case 'pilot_boss_6': {
      const baseFlat = lvlData.flatBonus || 4;
      const elapsed = Number(turnSeconds ?? 0);
      if (elapsed > 20) {
        flat = Math.max(1, baseFlat - 3);
      } else {
        flat = baseFlat;
      }
      enemyTimerDrain = lvlData.timeDrain || 10;
      hasOpBonus = true;
      break;
    }

    case 'pilot_boss_7': {
      const notchBonus = lvlData.notchBonus || 1;
      const activeNotches = Number(extraContext?.quantumDiceNotches ?? extraContext?.activeDiceNotches ?? 0);
      if (activeNotches > 0) {
        flat += (activeNotches * notchBonus);
        hasOpBonus = true;
      }

      const turnNum = Number(extraContext?.turnNumber ?? extraContext?.cycleTurn ?? 1);
      const isDayPhase = (turnNum % 2 !== 0);

      if (playedCards.length > 0) {
        const allRed = playedCards.every(c => {
          const s = getCardSuit(c);
          return s === 'hearts' || s === 'diamonds' || c?.isRed;
        });
        const allBlack = playedCards.every(c => {
          const s = getCardSuit(c);
          return s === 'spades' || s === 'clubs' || c?.isBlack;
        });

        if (isDayPhase && allRed) {
          flat += (lvlData.phaseBonus || 4);
          hasOpBonus = true;
        } else if (!isDayPhase && allBlack) {
          flat += (lvlData.phaseBonus || 4);
          hasOpBonus = true;
        }
      }
      break;
    }

    case 'pilot_boss_8': {
      const baseFlat = lvlData.flatBonus || 5;
      const sumValues = playedCards.reduce((acc, c) => acc + (Number(c?.value) || 0), 0);
      if (sumValues >= 15) {
        flat = baseFlat;
        isPureDamage = true;
        dustExtra = baseFlat * 2;
      } else if (sumValues > 0 && sumValues < 10) {
        flat = Math.max(1, baseFlat - 4);
      } else {
        flat = baseFlat;
      }
      hasOpBonus = true;
      break;
    }

    case 'pilot_boss_9': {
      const redCards = playedCards.filter(c => {
        const s = getCardSuit(c);
        return s === 'hearts' || s === 'diamonds' || c?.isRed;
      });

      if (redCards.length >= 2) {
        flat = lvlData.flatBonus || 4;
        isPureDamage = true;
        hasOpBonus = true;

        const currentHpPct = Number(extraContext?.hpPercentage) || 100;
        if (currentHpPct <= 50) {
          flat += (lvlData.lowHpBonus || 6);
        }
      } else if (playedCards.length > 0) {
        flat = -3;
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_boss_10': {
      shieldAmount = lvlData.armorHp || 25;
      reflectedDamage = lvlData.reflectDamage || 5;

      const hasSpades = playedCards.some(c => getCardSuit(c) === 'spades');
      if (hasSpades) {
        flat += 2;
        hasOpBonus = true;
      }

      if (opsArray.includes('/')) {
        selfDamage += 4;
      }
      timerPenaltyNextTurn += 5;
      break;
    }

    case 'pilot_boss_11': {
      const hasDiv = opsArray.includes('/');
      if (hasDiv) {
        flat += (lvlData.divBonus || 4);
        isPureDamage = true;
        hasOpBonus = true;
      } else if (opsArray.length > 0) {
        flat -= 2;
        hasOpBonus = true;
      }

      if (extraContext?.discardedCard) {
        const cVal = Number(extraContext.discardedCard.value) || 0;
        const mult = lvlData.healMult || 1.0;
        healAmount += Math.round(cVal * mult);
      }
      break;
    }

    case 'pilot_boss_12': {
      const currentHpPct = Number(extraContext?.hpPercentage) || 100;
      const threshold = lvlData.thresholdPct || 20;

      if (currentHpPct <= threshold) {
        const baseS = lvlData.baseShield || 10;
        const sMult = lvlData.spadeMult || 1.0;
        const spadeVal = Number(extraContext?.playerSpadesAccumulated) || 0;
        shieldAmount = Math.round(baseS + spadeVal * sMult);

        const malusPct = lvlData.atkMalusPct || 0.50;
        flat = -Math.round((extraContext?.rawDamage || 10) * malusPct);
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_boss_18': {
      const bSec = lvlData.burnPerSec || 0.5;
      burnPerSecond = bSec;
      isTimeBurn = true;
      hasOpBonus = true;

      if (extraContext?.isOpponentImploding) {
        const secThinking = Number(turnSeconds ?? extraContext?.secondsThinking ?? 0);
        flat += Math.round(secThinking * bSec);
        isPureDamage = true;
      }
      break;
    }

    case 'pilot_boss_19': {
      const turnNum = Number(extraContext?.turnNumber ?? extraContext?.cycleTurn ?? 1);
      const cycleStep = ((turnNum - 1) % 3) + 1;

      if (cycleStep === 1) {
        storeDamagePct = 0.5;
      } else if (cycleStep === 2) {
        const pool = Number(extraContext?.magmaPool ?? extraContext?.storedDamage ?? 0);
        flat += (pool + (lvlData.releaseBonus || 4));
        isPureDamage = true;
        hasOpBonus = true;

        if (extraContext?.hasPassed) {
          selfDamage = 6;
        }
      } else if (cycleStep === 3) {
        const resTarget = extraContext?.resolvedTarget;
        let isOdd = false;
        if (resTarget?.type === 'pattern') {
          isOdd = ((resTarget.cardsCount || 0) % 2 !== 0);
        } else {
          const targetVal = Number(resTarget?.target ?? resTarget?.value ?? extraContext?.targetValue ?? 0);
          isOdd = !isNaN(targetVal) && targetVal % 2 !== 0;
        }
        if (isOdd) {
          canDoubleAttack = true;
          flat += (lvlData.secondAttackBonus || 4);
          hasOpBonus = true;
        }
      }
      break;
    }

    case 'pilot_boss_20': {
      hasOpBonus = true;

      const spades = playedCards.filter(c => getCardSuit(c) === 'spades');
      if (spades.length > 0) {
        if (lvlData.spadeDouble) {
          flat += Math.max(10, Number(extraContext?.rawDamage || 10));
          isPureDamage = true;
        } else {
          flat += (spades.length * (lvlData.spadeBonus || 4));
        }
      }

      const hearts = playedCards.filter(c => getCardSuit(c) === 'hearts');
      if (hearts.length > 0) {
        heartHealMultiplier = 1.0 + (lvlData.heartHealBoost || 0.40);
      }

      const clubs = playedCards.filter(c => getCardSuit(c) === 'clubs');
      if (clubs.length > 0) {
        const clubsSum = clubs.reduce((acc, c) => acc + (Number(c?.value) || 0), 0);
        const drainRatio = lvlData.clubTimeDrainPct || 0.50;
        enemyTimerDrain = Math.round(clubsSum * drainRatio);
      }

      const diamondsCards = playedCards.filter(c => getCardSuit(c) === 'diamonds');
      if (diamondsCards.length > 0) {
        extraModuleNotches = diamondsCards.length * (lvlData.diamondModuleNotches || 1);
      }
      break;
    }

    case 'pilot_rare_1': {
      if (extraContext?.isRevengeActive) {
        flat = lvlData.flatBonusPerHit || 2;
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_rare_2': {
      const currentHpPct = Number(extraContext?.hpPercentage) || 100;
      if (currentHpPct <= 90) {
        const lostTens = Math.min(9, Math.floor((100 - currentHpPct) / 10));
        const step = lvlData.stepBonus || 1;
        flat = Math.min(lvlData.maxFlatBonus || 18, lostTens * step);
        hasOpBonus = true;
      }
      if (currentHpPct <= 60) isMonochromeActive = true;
      if (currentHpPct <= 30) isHealBlocked = true;
      break;
    }

    case 'pilot_rare_3': {
      if (extraContext?.usedCheatedCard) {
        flat = lvlData.flatBonus || 3;
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_rare_4': {
      flat = 0;
      hasOpBonus = false;
      const intactMirrors = extraContext?.intactMirrors !== undefined ? Number(extraContext.intactMirrors) : 3;
      const baseReflect = lvlData.reflectDamage || 4;
      if (intactMirrors === 3) reflectedDamage = baseReflect;
      else if (intactMirrors === 2) reflectedDamage = Math.max(0, baseReflect - 4);
      else if (intactMirrors === 1) reflectedDamage = Math.max(0, baseReflect - 8);
      else reflectedDamage = 0;
      break;
    }

    case 'pilot_epic_1': {
      if (extraContext?.isBombDisarmed) {
        flat = lvlData.flatBonus || 8;
        hasOpBonus = true;
        isPureDamage = true;
      }
      break;
    }

    case 'pilot_epic_2': {
      const hasGoldCard = extraContext?.usedGoldCard || playedCards.some(c => c?.isGolden || c?.id === extraContext?.goldenCardId);
      if (hasGoldCard) {
        flat = lvlData.flatBonus || 4;
        dustExtra = lvlData.dustBonus || 20;
        hasOpBonus = true;
      } else if (extraContext?.discardedGoldCard) {
        shieldAmount = lvlData.shieldBonus || 6;
      } else if (extraContext?.retainedGoldCard) {
        flat = -8;
      }
      break;
    }

    case 'pilot_epic_3': {
      disableScanner = true;
      if (extraContext?.usedPredictedCards) {
        flat = lvlData.flatBonus || 6;
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_epic_4': {
      isTimerRemoved = true;
      flat = lvlData.flatBonus || 5;
      hasOpBonus = true;
      break;
    }

    case 'pilot_leg_1': {
      turnTimerOverride = 30;
      disableScanner = true;
      const opBonuses = lvlData.opBonuses || { '+': lvl * 2, '-': lvl * 3, '*': lvl * 4, '/': lvl * 5 };
      opsArray.forEach(op => {
        if (opBonuses[op] !== undefined) {
          flat += opBonuses[op];
          hasOpBonus = true;
        }
      });
      break;
    }

    case 'pilot_leg_2': {
      if (turnSeconds !== null && turnSeconds !== undefined && Number(turnSeconds) <= 15) {
        flat = lvlData.flatBonus || 4;
        hasOpBonus = true;
        isPureDamage = true;
      }
      break;
    }

    case 'pilot_leg_3': {
      const cycleTurn = Number(extraContext?.cycleTurn) || 1;
      if (cycleTurn === 1 || cycleTurn === 2 || cycleTurn === 5 || cycleTurn === 6) {
        flat = lvlData.chargeBonusPerTurn || 4;
        hasOpBonus = true;
      } else if (cycleTurn === 3 || cycleTurn === 7) {
        flat = lvlData.chargeBonusPerTurn || 4;
        hasOpBonus = true;
        isPureDamage = true;
      } else if (cycleTurn === 4) {
        flat = -(lvlData.t4Penalty || 10);
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_leg_4': {
      const hasMult = opsArray.includes('*');
      const hasDiv = opsArray.includes('/');
      const hasLowOnly = opsArray.length > 0 && !hasMult && !hasDiv;

      if (hasMult) {
        flat += lvlData.multBonus || 5;
        hasOpBonus = true;
      }
      if (hasDiv) {
        flat += lvlData.divBonus || 6;
        hasOpBonus = true;
      }
      if (hasLowOnly) {
        flat -= (lvlData.lowOpPenalty || 5);
        hasOpBonus = true;
      }
      break;
    }

    case 'pilot_leg_5': {
      const cBonus = lvlData.cardBonus || 1;
      playedCards.forEach(c => {
        const val = Number(c?.value) || 0;
        const suit = getCardSuit(c);
        if (suit === 'hearts' || suit === 'diamonds' || c?.isRed) {
          const cardImpact = val + cBonus;
          flat += cardImpact;
          hasOpBonus = true;
          if (suit === 'hearts') healAmount += cardImpact;
          if (suit === 'diamonds') dustExtra += cardImpact;
        } else {
          timerPenaltyNextTurn += val;
        }
      });
      break;
    }

    case 'pilot_leg_6': {
      const cBonus = lvlData.cardBonus || 1;
      playedCards.forEach(c => {
        const val = Number(c?.value) || 0;
        const suit = getCardSuit(c);
        if (suit === 'spades' || suit === 'clubs' || c?.isBlack) {
          const cardImpact = val + cBonus;
          flat += cardImpact;
          hasOpBonus = true;
          if (suit === 'spades') isPureDamage = true;
        } else {
          timerPenaltyNextTurn += val;
        }
      });
      break;
    }

    default: {
      if (pilot.specialtyOp) {
        if (opsArray.includes(pilot.specialtyOp)) {
          flat = lvlData.flatBonus || 0;
          hasOpBonus = true;
        }
      } else {
        flat = lvlData.flatBonus || 0;
      }
      break;
    }
  }

  return {
    flat: Number.isFinite(flat) ? flat : 0,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1.0,
    hasOpBonus: Boolean(hasOpBonus),
    isPureDamage: Boolean(isPureDamage),
    healAmount: Number.isFinite(healAmount) ? healAmount : 0,
    shieldAmount: Number.isFinite(shieldAmount) ? shieldAmount : 0,
    dustExtra: Number.isFinite(dustExtra) ? dustExtra : 0,
    dustMultiplier: Number.isFinite(dustMultiplier) ? dustMultiplier : 1.0,
    timerPenaltyNextTurn: Number.isFinite(timerPenaltyNextTurn) ? timerPenaltyNextTurn : 0,
    turnTimerOverride: turnTimerOverride !== null && Number.isFinite(turnTimerOverride) ? turnTimerOverride : null,
    disableScanner: Boolean(disableScanner),
    isTimerRemoved: Boolean(isTimerRemoved),
    isMonochromeActive: Boolean(isMonochromeActive),
    isHealBlocked: Boolean(isHealBlocked),
    reflectedDamage: Number.isFinite(reflectedDamage) ? reflectedDamage : 0,
    poisonPerSecond: Number.isFinite(poisonPerSecond) ? poisonPerSecond : 0,
    poisonDurationSec: Number.isFinite(poisonDurationSec) ? poisonDurationSec : 0,
    selfDamage: Number.isFinite(selfDamage) ? selfDamage : 0,
    burnPerSecond: Number.isFinite(burnPerSecond) ? burnPerSecond : 0,
    isTimeBurn: Boolean(isTimeBurn),
    storeDamagePct: Number.isFinite(storeDamagePct) ? storeDamagePct : 0,
    canDoubleAttack: Boolean(canDoubleAttack),
    enemyTimerDrain: Number.isFinite(enemyTimerDrain) ? enemyTimerDrain : 0,
    extraModuleNotches: Number.isFinite(extraModuleNotches) ? extraModuleNotches : 0,
    heartHealMultiplier: Number.isFinite(heartHealMultiplier) ? heartHealMultiplier : 1.0
  };
}

// ============================================================================
// SCOMPARTO 4: L'OFFICINA VISIVA (HANGAR TATTICO PILOTI)
// ============================================================================
export function TacticalHangarModal({
  selectedPilot,
  pilotInventory = {},
  playerLevel = 1,
  stardust = 0,
  diamonds = 0,
  voidCrystals = 0,
  primordialMatter = 0,
  onSelectPilot,
  onUnlockPilot,
  onUpgradePilot,
  onClose,
  triggerPopup
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [inspectedPilotId, setInspectedPilotId] = useState(selectedPilot || 'pilot_com_1');

  const inspectedPilot = PILOTS_DATABASE.find(p => p.id === inspectedPilotId) || PILOTS_DATABASE[0];
  const pilotData = pilotInventory[inspectedPilot.id] || { level: 1, unlocked: inspectedPilot.rarity === 'Comune' && !inspectedPilot.isBossReward };
  const curLevel = pilotData.level || 1;
  const isMax = curLevel >= 5;
  const nextLvlData = inspectedPilot.upgradeTable?.[curLevel + 1] || null;
  const isEquipped = selectedPilot === inspectedPilot.id;

  const filteredPilots = PILOTS_DATABASE.filter(p => {
    if (p.isNpcOnly) return false;
    if (activeFilter === 'ALL') return true;
    return p.rarity.toUpperCase() === activeFilter;
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 35000, padding: '0.5rem' }}>
      <div className="cyber-panel" style={{ width: '100%', maxWidth: '880px', height: '90vh', display: 'flex', flexDirection: 'column', border: '2px solid #00f2fe', boxShadow: '0 0 45px rgba(0, 242, 254, 0.35)', padding: '0.85rem' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 242, 254, 0.3)', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: '#fde047', fontWeight: '900', letterSpacing: '1px' }}>HANGAR TATTICO PILOTI</div>
            <h2 style={{ margin: 0, color: '#00f2fe', fontSize: '1.2rem', fontWeight: '900' }}>Selezione &amp; Assegnazione Carte Eroe (33 Totali)</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Livello XP: <strong style={{ color: '#00f2fe' }}>{playerLevel}</strong></span>
            <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.6rem', background: '#ef4444', borderColor: '#f87171' }}>X</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginBottom: '0.65rem', paddingBottom: '0.2rem' }}>
          {['ALL', 'COMUNE', 'RARA', 'EPICA', 'LEGGENDARIA'].map(flt => (
            <button
              key={flt}
              onClick={() => setActiveFilter(flt)}
              className="cyber-btn"
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.65rem',
                fontWeight: '900',
                background: activeFilter === flt ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : 'rgba(15, 23, 42, 0.8)',
                borderColor: activeFilter === flt ? '#00f2fe' : 'rgba(255,255,255,0.15)',
                color: activeFilter === flt ? '#fff' : '#cbd5e1'
              }}
            >
              {flt}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr) 250px', gap: '0.75rem', minHeight: 0 }}>
          
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '0.25rem' }}>
            {filteredPilots.map(p => {
              const pData = pilotInventory[p.id] || { level: 1, unlocked: p.rarity === 'Comune' && !p.isBossReward };
              const isSelected = p.id === inspectedPilotId;
              const isPUnlocked = pData.unlocked;
              const hasXP = playerLevel >= p.unlockLevelXP;

              return (
                <div
                  key={p.id}
                  onClick={() => setInspectedPilotId(p.id)}
                  className="cyber-panel"
                  style={{
                    padding: '0.4rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: isSelected ? '1.5px solid #00f2fe' : `1px solid ${p.rarityColor}44`,
                    background: isSelected ? 'rgba(8, 145, 178, 0.35)' : (isPUnlocked ? 'rgba(15, 23, 42, 0.85)' : 'rgba(2, 6, 23, 0.7)'),
                    opacity: isPUnlocked ? 1 : (p.isBossReward ? 0.75 : (hasXP ? 0.75 : 0.45))
                  }}
                >
                  <PilotCard pilot={p} compact={true} isEquipped={selectedPilot === p.id} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '900', color: p.rarityColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8' }}>
                      {isPUnlocked 
                        ? `Grado ${pData.level}/5` 
                        : (p.isBossReward ? `Boss P${p.unlockBossPlanet}` : (hasXP ? 'Reclutabile' : `Liv. XP ${p.unlockLevelXP}`))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cyber-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(2, 6, 23, 0.9)', border: '1.5px solid rgba(0, 242, 254, 0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.65rem', background: inspectedPilot.rarityColor, color: '#020617', padding: '2px 8px', borderRadius: '4px', fontWeight: '900' }}>
                {inspectedPilot.isBossReward ? `BOSS PIANETA ${inspectedPilot.unlockBossPlanet}` : `GRADO ${inspectedPilot.rarity.toUpperCase()}`}
              </span>
              <h3 style={{ margin: '8px 0 2px 0', color: '#fff', fontSize: '1.3rem', fontWeight: '900' }}>{inspectedPilot.name}</h3>
              <div style={{ fontSize: '0.75rem', color: '#00f2fe', fontWeight: 'bold' }}>
                {pilotData.unlocked ? `Potenziamento Attuale: Grado ${curLevel}/5` : 'Carta Non Sbloccata'}
              </div>
            </div>

            <div style={{ margin: 'auto 0' }}>
              <PilotCard pilot={inspectedPilot} isEquipped={isEquipped} compact={false} />
            </div>

            <button
              disabled={!pilotData.unlocked}
              onClick={() => {
                onSelectPilot(inspectedPilot.id);
                triggerPopup(`Carta ${inspectedPilot.name} assegnata alla plancia!`);
              }}
              className={`cyber-btn ${isEquipped ? '' : 'cyber-btn-primary'}`}
              style={{ width: '100%', padding: '0.65rem', fontWeight: '900', fontSize: '0.85rem' }}
            >
              {isEquipped ? 'Carta già Assegnata' : (pilotData.unlocked ? 'Assegna Carta alla Nave' : 'Carta Non Posseduta')}
            </button>
          </div>

          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
            <div className="cyber-panel" style={{ padding: '0.5rem', background: 'rgba(2, 6, 23, 0.85)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              <div style={{ fontSize: '0.62rem', color: '#fde047', fontWeight: '900' }}>AFFINITÀ DELLE FORZE (PVP)</div>
              <div style={{ fontSize: '0.72rem', color: '#fff', marginTop: '3px', display: 'flex', gap: '10px' }}>
                <span>Primario: <strong style={{ color: ELEMENT_COLORS[inspectedPilot.primaryElement] }}>{ELEMENT_ICONS[inspectedPilot.primaryElement]} {inspectedPilot.primaryElement}</strong></span>
                <span>Secondario: <strong style={{ color: ELEMENT_COLORS[inspectedPilot.secondaryElement] }}>{ELEMENT_ICONS[inspectedPilot.secondaryElement]} {inspectedPilot.secondaryElement}</strong></span>
              </div>
            </div>

            <div className="cyber-panel" style={{ padding: '0.5rem', background: 'rgba(15, 23, 42, 0.85)' }}>
              <div style={{ fontSize: '0.62rem', color: '#00f2fe', fontWeight: '900' }}>EFFETTO CARTA (TRATTO)</div>
              <div style={{ fontSize: '0.68rem', color: '#fff', marginTop: '2px', lineHeight: '1.3' }}>{inspectedPilot.trait}</div>
            </div>

            <div className="cyber-panel" style={{ padding: '0.5rem', background: 'rgba(69, 10, 10, 0.25)', border: '1px solid rgba(239, 68, 68, 0.4)' }}>
              <div style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: '900' }}>PUNTO DEBOLE</div>
              <div style={{ fontSize: '0.65rem', color: '#fca5a5', marginTop: '2px', lineHeight: '1.3' }}>{inspectedPilot.weakness}</div>
            </div>

            {!pilotData.unlocked ? (
              inspectedPilot.isBossReward ? (
                <div className="cyber-panel" style={{ padding: '0.65rem', background: 'rgba(15, 23, 42, 0.9)', border: '1.5px solid #facc15' }}>
                  <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900' }}>SBLOCCO CAMPAGNA</div>
                  <div style={{ fontSize: '0.68rem', color: '#cbd5e1', margin: '6px 0', lineHeight: '1.35' }}>
                    Sconfiggi il <strong>Boss del Pianeta {inspectedPilot.unlockBossPlanet} (Settore 10)</strong> nella Campagna Stellare per riscattare questa carta eroe a costo zero!
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#38bdf8', fontWeight: 'bold' }}>
                    Non acquistabile nel Bazar Galattico.
                  </div>
                  <button
                    disabled={true}
                    className="cyber-btn"
                    style={{ width: '100%', padding: '0.45rem', marginTop: '6px', fontSize: '0.72rem', fontWeight: '900', opacity: 0.5, cursor: 'not-allowed' }}
                  >
                    🔒 Sblocco da Settore 10
                  </button>
                </div>
              ) : (
                <div className="cyber-panel" style={{ padding: '0.65rem', background: 'rgba(15, 23, 42, 0.9)', border: '1.5px solid #facc15' }}>
                  <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: '900' }}>RECLUTAMENTO</div>
                  <div style={{ fontSize: '0.65rem', color: '#cbd5e1', margin: '4px 0' }}>
                    Requisito: <strong>Livello XP {inspectedPilot.unlockLevelXP}</strong> (Livello attuale: {playerLevel})
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>
                    Costo: {inspectedPilot.unlockCost.dust} 🌟 {inspectedPilot.unlockCost.diamonds > 0 && `+ ${inspectedPilot.unlockCost.diamonds} 💎`} {inspectedPilot.unlockCost.voidCrystals > 0 && `+ ${inspectedPilot.unlockCost.voidCrystals} 💠`} {inspectedPilot.unlockCost.primordialMatter > 0 && `+ ${inspectedPilot.unlockCost.primordialMatter} 🟣`}
                  </div>
                  <button
                    disabled={
                      playerLevel < inspectedPilot.unlockLevelXP ||
                      stardust < inspectedPilot.unlockCost.dust ||
                      diamonds < inspectedPilot.unlockCost.diamonds ||
                      voidCrystals < inspectedPilot.unlockCost.voidCrystals ||
                      primordialMatter < inspectedPilot.unlockCost.primordialMatter
                    }
                    onClick={() => onUnlockPilot(inspectedPilot.id, inspectedPilot.unlockCost)}
                    className="cyber-btn cyber-btn-warning"
                    style={{ width: '100%', padding: '0.45rem', marginTop: '6px', fontSize: '0.72rem', fontWeight: '900' }}
                  >
                    Sblocca Carta Pilota
                  </button>
                </div>
              )
            ) : (
              <div className="cyber-panel" style={{ padding: '0.65rem', background: 'rgba(15, 23, 42, 0.9)', border: '1.5px solid #10b981' }}>
                <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: '900' }}>POTENZIAMENTO GRADO</div>
                {!isMax && nextLvlData ? (
                  <>
                    <div style={{ fontSize: '0.65rem', color: '#cbd5e1', margin: '3px 0' }}>
                      Prossimo Livello: <strong>Grado {curLevel + 1}/5</strong>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                      Requisito: Livello XP {nextLvlData.reqXP} (Attuale: {playerLevel})
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#fde047', marginTop: '2px' }}>
                      Costo: {nextLvlData.dust} 🌟 {nextLvlData.dia > 0 && `+ ${nextLvlData.dia} 💎`} {nextLvlData.voidC > 0 && `+ ${nextLvlData.voidC} 💠`} {nextLvlData.prim > 0 && `+ ${nextLvlData.prim} 🟣`}
                    </div>
                    <button
                      disabled={
                        playerLevel < nextLvlData.reqXP ||
                        stardust < nextLvlData.dust ||
                        diamonds < (nextLvlData.dia || 0) ||
                        voidCrystals < (nextLvlData.voidC || 0) ||
                        primordialMatter < (nextLvlData.prim || 0)
                      }
                      onClick={() => onUpgradePilot(inspectedPilot.id, curLevel + 1, nextLvlData)}
                      className="cyber-btn cyber-btn-success"
                      style={{ width: '100%', padding: '0.45rem', marginTop: '6px', fontSize: '0.72rem', fontWeight: '900' }}
                    >
                      Potenzia al Grado {curLevel + 1} ➔
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: '0.7rem', color: '#fde047', fontWeight: '900', textAlign: 'center', margin: '6px 0' }}>
                    GRADO MASSIMO COMPLETATO (5/5)
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export function PilotPortraitVisual(props) {
  return <PilotCard {...props} compact={true} />;
}

export function checkPilotSetResonance(pilotId, deckId, abilityId) {
  if (!pilotId) return false;
  
  const pilot = getPilotById(pilotId);
  if (!pilot) return false;

  const resonanceMap = {
    // Comuni (Zodiaco 1-4)
    pilot_com_1: 'aries',
    pilot_com_2: 'taurus',
    pilot_com_3: 'gemini',
    pilot_com_4: 'cancer',
    // Rari (Zodiaco 5-8)
    pilot_rare_1: 'leo',
    pilot_rare_2: 'virgo',
    pilot_rare_3: 'libra',
    pilot_rare_4: 'scorpio',
    // Epici (Zodiaco 9-12)
    pilot_epic_1: 'sagittarius',
    pilot_epic_2: 'capricorn',
    pilot_epic_3: 'aquarius',
    pilot_epic_4: 'pisces',
    // Leggendari (Esclusivi & Apoteosi)
    pilot_leg_1: 'singularity_core',
    pilot_leg_2: 'ophiuchus',
    pilot_leg_3: 'supreme_eclipse',
    pilot_leg_4: 'leo',
    pilot_leg_5: 'aries',
    pilot_leg_6: 'scorpio'
  };

  let isMatched = false;
  if (resonanceMap[pilot.id]) {
    const targetKey = resonanceMap[pilot.id];
    isMatched = (deckId === targetKey) || (abilityId === targetKey);
  } else if (pilot.unlockBossPlanet) {
    const planetKey = `planet_char_${pilot.unlockBossPlanet}`;
    isMatched = (deckId === planetKey) || (abilityId === planetKey);
  } else {
    const pidSuffix = pilot.id.replace('pilot_', '');
    isMatched = (deckId && deckId.includes(pidSuffix)) || (abilityId && abilityId.includes(pidSuffix));
  }

  if (!isMatched) return false;

  return {
    hasResonance: true,
    bonusDmg: 5,
    label: `Risonanza Set: +5 HP (${pilot.name})`
  };
}

export default PILOTS_DATABASE;
