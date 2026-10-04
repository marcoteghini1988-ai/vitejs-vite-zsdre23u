import React, { useState, useEffect, useMemo, useRef } from 'react';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';

// ============================================================================
// 1. DATABASE COMPLETO DELLE CARTE ARMA & LIVELLI
// ============================================================================
export const WEAPONS_DATABASE = Object.freeze([
  // SLOT 1 & 2: POKER
  {
    id: 'wp_gatling',
    name: 'Gatling Cinetica',
    category: 'POKER RAPIDO',
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['one_pair', 'two_pair'],
    reqDescription: 'COPPIA',
    fxType: 'gatling',
    imgUrl: '/assets/weapons/gatling_cinetica.png',
    levels: {
      1: { damage: 14, shots: 4 },
      2: { damage: 20, shots: 8 },
      3: { damage: 28, shots: 12 },
      4: { damage: 38, shots: 16 }
    }
  },
  {
    id: 'wp_fuse_bolts',
    name: 'Balestra Dardi Fusi',
    category: 'POKER RAPIDO',
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['one_pair'],
    reqDescription: 'COPPIA (♦ / ♠)',
    fxType: 'fuse_bolts',
    imgUrl: '/assets/weapons/balestra_dardi_fusi.png',
    levels: {
      1: { damage: 16, shots: 2 },
      2: { damage: 22, shots: 2 },
      3: { damage: 30, shots: 3 },
      4: { damage: 42, shots: 4 }
    }
  },
  {
    id: 'wp_disc_blades',
    name: 'Lame Rotanti',
    category: 'POKER RAPIDO',
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['two_pair'],
    reqDescription: 'DOPPIA COPPIA',
    fxType: 'disc_blades',
    imgUrl: '/assets/weapons/lame_rotanti.png',
    levels: {
      1: { damage: 18, shots: 2 },
      2: { damage: 25, shots: 4 },
      3: { damage: 34, shots: 6 },
      4: { damage: 46, shots: 8 }
    }
  },
  {
    id: 'wp_xbow',
    name: 'Arco-X Balistico',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['three_of_a_kind', 'straight', 'flush'],
    reqDescription: 'TRIS / COLORE',
    fxType: 'arrow_barrage',
    imgUrl: '/assets/weapons/arco_x_balistico.png',
    levels: {
      1: { damage: 24, shots: 8 },
      2: { damage: 34, shots: 12 },
      3: { damage: 46, shots: 16 },
      4: { damage: 62, shots: 20 }
    }
  },
  {
    id: 'wp_siege_cannon',
    name: 'Cannone d\'Assedio',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['three_of_a_kind'],
    reqDescription: 'TRIS',
    fxType: 'heavy_cannon',
    imgUrl: '/assets/weapons/cannone_assedio.png',
    levels: {
      1: { damage: 22, shots: 1 },
      2: { damage: 32, shots: 1 },
      3: { damage: 44, shots: 1 },
      4: { damage: 58, shots: 1 }
    }
  },
  {
    id: 'wp_blood_siphon',
    name: 'Sifone di Sangue',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['flush'],
    reqDescription: '3+ CUORI ♥',
    fxType: 'blood_siphon',
    imgUrl: '/assets/weapons/sifone_sangue.png',
    levels: {
      1: { damage: 18, heal: 10, shots: 3 },
      2: { damage: 26, heal: 16, shots: 3 },
      3: { damage: 36, heal: 22, shots: 4 },
      4: { damage: 48, heal: 30, shots: 5 }
    }
  },
  {
    id: 'wp_flak_cannon',
    name: 'Flak a Grappolo',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'super_rare',
    color: '#f59e0b',
    allowedPatterns: ['full_house'],
    reqDescription: 'FULL',
    fxType: 'heavy_cannon',
    imgUrl: '/assets/weapons/flak_grappolo.png',
    levels: {
      1: { damage: 28, shots: 6 },
      2: { damage: 40, shots: 8 },
      3: { damage: 54, shots: 10 },
      4: { damage: 70, shots: 14 }
    }
  },
  {
    id: 'wp_micro_missiles',
    name: 'Sciame Microrazzi',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'legendary',
    color: '#facc15',
    allowedPatterns: ['four_of_a_kind'],
    reqDescription: 'POKER',
    fxType: 'gatling',
    imgUrl: '/assets/weapons/sciame_microrazzi.png',
    levels: {
      1: { damage: 35, shots: 4 },
      2: { damage: 50, shots: 6 },
      3: { damage: 68, shots: 8 },
      4: { damage: 88, shots: 10 }
    }
  },

  // SLOT 3 & 4: CALCOLO
  {
    id: 'wp_thunderstrike',
    name: 'Fulmine a Ciel Sereno',
    category: 'CALCOLO TATTICO',
    type: 'math',
    mathOp: '+',
    rarity: 'common',
    color: '#00f2fe',
    reqDescription: 'SOMMA [+]',
    fxType: 'lightning_strike',
    imgUrl: '/assets/weapons/fulmine_ciel_sereno.png',
    levels: {
      1: { damage: 18, bolts: 1 },
      2: { damage: 26, bolts: 2 },
      3: { damage: 36, bolts: 3 },
      4: { damage: 50, bolts: 5 }
    }
  },
  {
    id: 'wp_railgun',
    name: 'Railgun Ionico',
    category: 'CALCOLO TATTICO',
    type: 'math',
    mathOp: '-',
    rarity: 'common',
    color: '#00f2fe',
    reqDescription: 'DIFFERENZA [-]',
    fxType: 'railgun_beam',
    imgUrl: '/assets/weapons/railgun_ionico.png',
    levels: {
      1: { damage: 20 },
      2: { damage: 28 },
      3: { damage: 38 },
      4: { damage: 52 }
    }
  },
  {
    id: 'wp_orbital_cannon',
    name: 'Raggio Orbitale',
    category: 'CALCOLO PESANTE',
    type: 'math',
    mathOp: '*',
    rarity: 'rare',
    color: '#a855f7',
    reqDescription: 'MOLTIPLICA [*]',
    fxType: 'orbital_pillar',
    imgUrl: '/assets/weapons/raggio_orbitale.png',
    levels: {
      1: { damage: 26, bolts: 1 },
      2: { damage: 38, bolts: 1 },
      3: { damage: 52, bolts: 2 },
      4: { damage: 72, bolts: 2 }
    }
  },
  {
    id: 'wp_cross_laser',
    name: 'Taglio Frazionato',
    category: 'CALCOLO PESANTE',
    type: 'math',
    mathOp: '/',
    rarity: 'super_rare',
    color: '#f59e0b',
    reqDescription: 'DIVISIONE [/]',
    fxType: 'railgun_beam',
    imgUrl: '/assets/weapons/taglio_frazionato.png',
    levels: {
      1: { damage: 28 },
      2: { damage: 40 },
      3: { damage: 56 },
      4: { damage: 76 }
    }
  },
  {
    id: 'wp_reactor_bomb',
    name: 'Nucleo Instabile',
    category: 'ALLERTA BOMBA',
    type: 'math',
    isBomb: true,
    rarity: 'legendary',
    color: '#ff007f',
    reqDescription: 'DISINNESCO 3T',
    fxType: 'heavy_cannon',
    imgUrl: '/assets/weapons/nucleo_instabile.png',
    levels: {
      1: { damage: 35 },
      2: { damage: 52 },
      3: { damage: 72 },
      4: { damage: 100 }
    }
  }
]);

// ============================================================================
// 2. MOTORE MATEMATICO & POKER PERMUTATO
// ============================================================================
const CLASSIC_POKER_PATTERNS = Object.freeze([
  { id: 'one_pair', name: 'COPPIA', cardsCount: 2 },
  { id: 'two_pair', name: 'DOPPIA COPPIA', cardsCount: 4 },
  { id: 'three_of_a_kind', name: 'TRIS', cardsCount: 3 },
  { id: 'straight', name: 'SCALA', cardsCount: 5 },
  { id: 'flush', name: 'COLORE', cardsCount: 3 },
  { id: 'full_house', name: 'FULL', cardsCount: 5 },
  { id: 'four_of_a_kind', name: 'POKER', cardsCount: 4 },
  { id: 'royal_flush', name: 'SCALA REALE', cardsCount: 5 }
]);

const getCardSuit = (card) => {
  if (!card) return null;
  if (card.isJoker) return 'joker';
  if (card.suit) return card.suit;
  if (typeof card.id === 'string') {
    if (card.id.startsWith('hearts')) return 'hearts';
    if (card.id.startsWith('diamonds')) return 'diamonds';
    if (card.id.startsWith('spades')) return 'spades';
    if (card.id.startsWith('clubs')) return 'clubs';
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
    case '+': return vals.reduce((acc, v) => acc + v, 0);
    case '-': return vals.reduce((acc, v, idx) => (idx === 0 ? v : acc - v), 0);
    case '*': return vals.reduce((acc, v) => acc * v, 1);
    case '/': {
      if (vals.some((v, idx) => idx > 0 && Math.abs(v) < 1e-7)) return NaN;
      return vals.reduce((acc, v, idx) => (idx === 0 ? v : acc / v), 0);
    }
    default: return 0;
  }
};

const validateClassicPokerPattern = (cards, patternId) => {
  if (!cards || !patternId) return false;
  const validCards = cards.filter(Boolean);
  const targetDef = CLASSIC_POKER_PATTERNS.find(p => p.id === patternId);
  if (!targetDef || validCards.length < targetDef.cardsCount) return false;

  const jokers = validCards.filter(c => c.isJoker || c.suit === 'joker').length;
  const nonJokers = validCards.filter(c => !c.isJoker && c.suit !== 'joker');
  const nonJokerVals = nonJokers.map(c => Number(c.value) || 0).sort((a, b) => a - b);
  const nonJokerSuits = nonJokers.map(c => getCardSuit(c));

  const counts = {};
  nonJokerVals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const freq = Object.values(counts).sort((a, b) => b - a);

  switch (patternId) {
    case 'one_pair': return jokers >= 1 || (freq[0] || 0) >= 2;
    case 'two_pair': return jokers >= 2 || (jokers === 1 && (freq[0] || 0) >= 2) || ((freq[0] || 0) >= 2 && (freq[1] || 0) >= 2);
    case 'three_of_a_kind': return ((freq[0] || 0) + jokers) >= 3;
    case 'straight': {
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const checkSpan = (vals) => (vals.length === 0 || vals[vals.length - 1] - vals[0] <= 4);
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    case 'flush': return new Set(nonJokerSuits).size <= 1 && validCards.length >= 3;
    case 'full_house': return jokers >= 2 || ((freq[0] || 0) >= 3 && (freq[1] || 0) >= 2);
    case 'four_of_a_kind': return ((freq[0] || 0) + jokers) >= 4;
    case 'royal_flush': {
      if (new Set(nonJokerSuits).size > 1) return false;
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return broadwayVals.length === 5 && broadwayVals[4] - broadwayVals[0] <= 4;
    }
    default: return false;
  }
};

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

// ============================================================================
// 3. GENERAZIONE BERSAGLI DINAMICI GARANTITI DALLE CARTE IN MANO
// ============================================================================
export const generateHardpointObjectives = (equippedWeapons, weaponsLevels, handCards = [], activeAnomaly = null) => {
  const validHand = (handCards || []).filter(c => c && !c.isJoker && (Number(c.value) || 0) > 0);

  return (equippedWeapons || []).slice(0, 4).map((wpId, idx) => {
    const baseWp = WEAPONS_DATABASE.find(w => w.id === wpId) || WEAPONS_DATABASE[idx] || WEAPONS_DATABASE[0];
    const currentLvl = weaponsLevels?.[baseWp.id] || 1;
    const stats = baseWp.levels?.[currentLvl] || baseWp.levels?.[1] || { damage: 15 };

    if (baseWp.type === 'poker') {
      return {
        ...baseWp,
        slotIndex: idx,
        level: currentLvl,
        damage: stats.damage,
        stats
      };
    }

    const op = baseWp.mathOp || '+';
    let target = null;

    if (validHand.length >= 2) {
      const vals = validHand.map(c => getCardEffectiveValue(c, activeAnomaly));
      const candidates = [];
      for (let i = 0; i < vals.length; i++) {
        for (let j = 0; j < vals.length; j++) {
          if (i === j) continue;
          const a = vals[i];
          const b = vals[j];
          if (op === '+') {
            candidates.push(a + b);
          } else if (op === '-' && a > b) {
            candidates.push(a - b);
          } else if (op === '*' && a * b <= 72) {
            candidates.push(a * b);
          } else if (op === '/' && b > 0 && a % b === 0 && a !== b) {
            candidates.push(a / b);
          }
        }
      }
      if (candidates.length > 0) {
        target = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    if (target === null) {
      if (op === '+') target = 14;
      else if (op === '-') target = 4;
      else if (op === '*') target = 24;
      else target = 2;
    }

    return {
      ...baseWp,
      slotIndex: idx,
      level: currentLvl,
      op,
      target,
      damage: stats.damage,
      stats
    };
  });
};

// ============================================================================
// 4. INIEZIONE STILI 3D COMPLETI
// ============================================================================
(function injectHardpoint3DStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-hardpoint-3d-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    .classic-screen-wrapper {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      z-index: 2;
    }
    #classic-projectiles-layer {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100dvh;
      pointer-events: none;
      z-index: 999999;
      overflow: hidden;
    }
    .flight-arrow-screen {
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 36px;
      margin-left: -2px;
      margin-top: -18px;
      background: linear-gradient(180deg, #ffffff 0%, #38bdf8 55%, #0284c7 100%);
      box-shadow: 0 0 14px #00f2fe, 0 0 6px #ffffff;
      border-radius: 2px;
      pointer-events: none;
      transform-origin: center center;
      will-change: transform;
    }
    .flight-arrow-screen::after {
      content: '';
      position: absolute;
      top: -5px;
      left: -3px;
      width: 10px;
      height: 8px;
      background: #facc15;
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      box-shadow: 0 0 10px #facc15;
    }
    .battle-viewport-classic {
      position: relative;
      width: 440px;
      height: 840px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
      top: -20px;
      transform-origin: center center;
      perspective: 950px;
      transform-style: preserve-3d;
      backface-visibility: hidden;
      will-change: transform;
      z-index: 2;
    }
    .battle-viewport-classic .enemy-mega-plane {
      position: relative;
      width: 100%;
      height: 220px;
      transform: rotateX(24deg);
      transform-origin: 50% 100%;
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0.45rem 0.55rem 6px 0.55rem;
      z-index: 20;
    }
    .battle-viewport-classic .enemy-plane-backdrop {
      position: absolute;
      inset: -40px -15px -44px -15px;
      background: linear-gradient(180deg, rgba(8, 2, 6, 0.98) 0%, rgba(38, 12, 26, 0.88) 100%);
      border: 1.5px solid rgba(244, 63, 94, 0.5);
      border-top: none;
      border-radius: 0 0 10px 10px;
      box-shadow: inset 0 0 30px rgba(244, 63, 94, 0.2), 0 10px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }
    .battle-viewport-classic .hud-enemy-telemetry {
      position: relative;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
    }
    .battle-viewport-classic .boss-name-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 16px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }
    .battle-viewport-classic .boss-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 14px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }
    .battle-viewport-classic .hp-prismatic-dock {
      position: relative;
      width: 100%;
      height: 11px;
      background: #020612;
      border-radius: 4px;
      border: 1.5px solid rgba(255, 255, 255, 0.28);
      border-top: 2px solid rgba(255, 255, 255, 0.7);
      border-bottom: 2px solid #000;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.95), inset 0 3px 5px rgba(0, 0, 0, 0.9);
      overflow: hidden;
      display: flex;
      align-items: center;
    }
    .battle-viewport-classic .hp-segmented-grid {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(90deg, transparent 0, transparent 18px, rgba(0, 0, 0, 0.55) 18px, rgba(0, 0, 0, 0.55) 20px);
      pointer-events: none;
      z-index: 3;
    }
    .battle-viewport-classic .enemy-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #991b1b 0%, #dc2626 35%, #f43f5e 75%, #ff758f 100%);
      box-shadow: 0 0 14px #f43f5e, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    .battle-viewport-classic .player-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #064e3b 0%, #059669 35%, #10b981 75%, #6ee7b7 100%);
      box-shadow: 0 0 14px #10b981, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    .battle-viewport-classic .hp-prismatic-dock.bar-hit-flash {
      filter: brightness(2.6) contrast(1.4);
      box-shadow: 0 0 22px #ffffff, 0 0 30px #ef4444 !important;
    }
    .battle-viewport-classic .hp-prismatic-dock.bar-shiver {
      animation: barMicroShiver 0.08s ease-in-out;
    }
    @keyframes barMicroShiver {
      0% { transform: translateY(0); }
      50% { transform: translateY(2px) translateX(-1px); }
      100% { transform: translateY(0); }
    }
    .battle-viewport-classic .vital-telemetry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      width: 100%;
    }
    .battle-viewport-classic .timer-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 900;
      color: #facc15;
      white-space: nowrap;
    }
    .battle-viewport-classic .tank-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.62rem;
      font-weight: 900;
      color: #34d399;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 1px 4px;
      border-radius: 4px;
      white-space: nowrap;
    }
    .battle-viewport-classic .tank-readout.enemy-tank {
      color: #facc15;
      background: rgba(250, 204, 21, 0.15);
      border-color: rgba(250, 204, 21, 0.4);
    }
    .battle-viewport-classic .tactile-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 5px;
      border-radius: 4px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.54rem;
      font-weight: 900;
      white-space: nowrap;
    }
    .battle-viewport-classic .enemy-phase-tag {
      background: rgba(244, 63, 94, 0.2);
      border: 1px solid #f43f5e;
      color: #fda4af;
      box-shadow: 0 0 6px rgba(244, 63, 94, 0.35);
    }
    .battle-viewport-classic .equip-objects-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      width: 100%;
      min-height: 38px;
      position: relative;
      z-index: 5;
      padding: 2px 4px 1px 4px;
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .malus-gauge-box {
      width: 125px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      background: rgba(15, 23, 42, 0.85);
      border: 1.5px solid rgba(244, 63, 94, 0.5);
      border-radius: 6px;
      padding: 3px 6px;
      box-shadow: inset 0 1px 4px #000;
      margin-bottom: 2px;
      position: relative;
    }
    .battle-viewport-classic .malus-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      color: #fca5a5;
      letter-spacing: 0.5px;
    }
    .battle-viewport-classic .malus-pip-array {
      display: flex;
      gap: 3px;
      width: 100%;
    }
    .battle-viewport-classic .malus-pip-cell {
      flex: 1;
      height: 6px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 2px #000;
    }
    .battle-viewport-classic .malus-pip-cell.filled {
      background: #f43f5e;
      box-shadow: 0 0 6px #f43f5e;
    }
    .battle-viewport-classic .right-equip-cluster {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      transform-style: preserve-3d;
      margin-left: auto;
    }
    .battle-viewport-classic .equip-pedestal-station {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .equip-stationary-art {
      font-size: 1.5rem;
      line-height: 1;
      margin-bottom: 2px;
    }
    .battle-viewport-classic .equip-label-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-top: 1px;
      text-transform: uppercase;
    }
    .battle-viewport-classic .equip-pit-base {
      width: 44px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 45%, #18243e 0%, #060e22 55%, #010308 100%);
      border: 1.5px solid;
      border-top: 1.8px solid rgba(255, 255, 255, 0.65);
      border-bottom: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scaleY(0.55);
    }
    .battle-viewport-classic .equip-pit-lens {
      width: 22px;
      height: 4px;
      border-radius: 50%;
      filter: blur(1px);
      background: currentColor;
    }
    .battle-viewport-classic .station-dice { color: #00f2fe; }
    .battle-viewport-classic .station-dice .equip-pit-base { border-color: #00f2fe; }
    .battle-viewport-classic .station-dice .equip-label-tag { color: #38bdf8; }
    .battle-viewport-classic .station-module { color: #10b981; }
    .battle-viewport-classic .station-module .equip-pit-base { border-color: #10b981; }
    .battle-viewport-classic .station-module .equip-label-tag { color: #34d399; }
    .battle-viewport-classic .enemy-field-cards-row,
    .battle-viewport-classic .player-field-cards-row {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
      z-index: 5;
    }
    .battle-viewport-classic .enemy-field-cards-row { margin-bottom: -6px; }
    .battle-viewport-classic .card-deck-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      transform-style: preserve-3d;
      margin-right: 6px;
      --deck-thick: 14px;
    }
    .battle-viewport-classic .deck-cards-stack-body {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(80px + var(--deck-thick));
      border-radius: 7px;
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #f1f5f9 0px, #f1f5f9 1.2px, #091024 1.2px, #091024 2.6px);
      border: 1.2px solid rgba(0, 242, 254, 0.5);
      z-index: 2;
    }
    .battle-viewport-classic .card-deck-top {
      width: 100%;
      height: 80px;
      position: absolute;
      left: 0;
      bottom: var(--deck-thick);
      background: linear-gradient(150deg, #142854 0%, #081129 55%, #030714 100%);
      border: 1.5px solid #00f2fe;
      border-top: 2px solid #ffffff;
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 5px 3px;
      z-index: 5;
    }
    .battle-viewport-classic .deck-count-badge {
      position: absolute;
      bottom: -6px;
      background: rgba(2, 6, 23, 0.95);
      border: 1.5px solid #00f2fe;
      border-radius: 5px;
      padding: 1px 5px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.58rem;
      font-weight: 900;
      color: #00f2fe;
      z-index: 10;
    }
    .battle-viewport-classic .card-discard-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }
    .battle-viewport-classic .card-discard-top {
      width: 100%;
      height: 100%;
      background: linear-gradient(150deg, #241022 0%, #0f050e 100%);
      border: 1.5px solid rgba(244, 63, 94, 0.6);
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 4px;
    }
    .battle-viewport-classic .terrains-horizontal-bank {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      margin-left: auto;
      flex: 0 0 auto;
      position: relative;
      z-index: 5;
    }
    .battle-viewport-classic .terrain-horizontal-card {
      width: 48px;
      height: 68px;
      flex: 0 0 48px;
      perspective: 600px;
      cursor: pointer;
      position: relative;
    }
    .battle-viewport-classic .terrain-card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      border-radius: 7px;
    }
    .battle-viewport-classic .terrain-horizontal-card.is-revealed .terrain-card-inner { transform: rotateY(180deg); }
    .battle-viewport-classic .terrain-card-face {
      position: absolute;
      inset: 0;
      backface-visibility: hidden;
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95);
      overflow: hidden;
      box-sizing: border-box;
    }
    .battle-viewport-classic .terrain-face-back {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.45);
      z-index: 2;
    }
    .battle-viewport-classic .terrain-face-front {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid #00f2fe;
      transform: rotateY(180deg);
      z-index: 1;
    }
    .battle-viewport-classic .terrain-empty-slot {
      width: 48px;
      height: 68px;
      flex: 0 0 48px;
      border: 1.5px dashed rgba(255, 255, 255, 0.15);
      border-radius: 7px;
      background: rgba(2, 6, 23, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.5rem;
      color: #64748b;
      font-family: 'Orbitron', sans-serif;
    }
    .battle-viewport-classic .terrain-rearm-tag {
      position: absolute;
      top: -8px;
      right: -4px;
      background: #9333ea;
      color: #ffffff;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #f0abfc;
      box-shadow: 0 0 8px rgba(232, 121, 249, 0.85);
      z-index: 20;
      cursor: pointer;
      animation: pulseGlow 1.2s infinite alternate;
    }
    .battle-viewport-classic .enemy-action-ticker {
      width: 92%;
      margin: 2px auto 6px auto;
      background: linear-gradient(90deg, rgba(220, 38, 38, 0.3) 0%, rgba(69, 10, 10, 0.8) 50%, rgba(220, 38, 38, 0.3) 100%);
      border: 1.5px dashed rgba(244, 63, 94, 0.8);
      border-radius: 6px;
      padding: 4px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 800;
      color: #fecaca;
      z-index: 35;
    }
    .battle-viewport-classic .wall-hand-rack {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 3px;
      width: 100%;
      padding: 0 0.55rem;
      position: relative;
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .wall-hand-rack.enemy-side {
      transform: translateZ(38px);
      z-index: 30;
      margin-top: -4px;
      margin-bottom: -2px;
      pointer-events: none;
    }
    .battle-viewport-classic .enemy-card-pod {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      position: relative;
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .enemy-hologram-back {
      width: 38px;
      height: 52px;
      background: linear-gradient(155deg, #1e0d19 0%, #0c0409 100%);
      border: 1.5px solid #f43f5e;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95);
      z-index: 10;
    }
    .battle-viewport-classic .enemy-pedestal-base {
      width: 56px;
      height: 14px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #15060c 55%, #2a0b16 100%);
      border: 1.5px solid rgba(244, 63, 94, 0.55);
    }
    .battle-viewport-classic .trapezoid-ramp-hub {
      position: relative;
      width: 100%;
      perspective: 750px;
      transform-style: preserve-3d;
      padding: 16px 0.35rem 6px 0.35rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 25;
      margin-top: -10px;
    }
    .battle-viewport-classic .trapezoid-ramp-surface {
      position: absolute;
      inset: -95px -98px -60px -98px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.8) 35%, rgba(2, 6, 23, 0.98) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.45);
      border-bottom: 2px solid rgba(0, 242, 254, 0.85);
      clip-path: polygon(0% 0%, 100% 0%, 94.5% 100%, 5.5% 100%);
      transform: rotateX(34deg);
      transform-origin: 50% 100%;
      box-shadow: inset 0 0 32px rgba(0, 242, 254, 0.22), 0 14px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
    }
    .battle-viewport-classic .trapezoid-grid-lines {
      position: absolute;
      inset: 0;
      background: 
        linear-gradient(180deg, transparent 0%, rgba(0, 242, 254, 0.08) 50%, transparent 100%),
        linear-gradient(to bottom right, transparent 48%, rgba(0, 242, 254, 0.16) 50%, transparent 52%),
        linear-gradient(to bottom left, transparent 48%, rgba(0, 242, 254, 0.16) 50%, transparent 52%);
      pointer-events: none;
    }
    .battle-viewport-classic .classic-targets-horizontal-row {
      position: relative;
      z-index: 5;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      transform-style: preserve-3d;
      padding: 0 2px;
    }
    .battle-viewport-classic .target-pedestal-station {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      transform-style: preserve-3d;
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    .battle-viewport-classic .target-pit-socket {
      position: relative;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #050b18 55%, #101a35 100%);
      border: 1.5px solid currentColor;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95);
    }
    .battle-viewport-classic .target-pit-socket .pit-lens {
      border-radius: 50%;
      filter: blur(1px);
      background: currentColor;
    }
    .battle-viewport-classic .player-cards-section {
      position: relative;
      z-index: 35;
      transform: translateZ(40px);
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }
    .battle-viewport-classic .discard-alert-banner {
      width: 92%;
      margin: 0 auto 6px auto;
      background: linear-gradient(90deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.98));
      border: 2px solid #fecaca;
      border-radius: 8px;
      padding: 5px 8px;
      text-align: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      font-weight: 900;
      color: #ffffff;
      box-shadow: 0 0 18px rgba(239, 68, 68, 0.85);
      z-index: 50;
    }
    .battle-viewport-classic .wall-hand-rack.player-side {
      transform: translateZ(45px);
      z-index: 45;
      margin-top: -6px;
      margin-bottom: -4px;
    }
    .battle-viewport-classic .card-unit-station {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      gap: 2px;
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .tactile-card-body {
      width: 100%;
      max-width: 48px;
      height: 68px;
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3px 2px;
      position: relative;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.95);
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      transform-style: preserve-3d;
    }
    .battle-viewport-classic .card-pit-base {
      width: 60px;
      height: 15px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #050b18 55%, #101a35 100%);
      border: 1.5px solid rgba(255, 255, 255, 0.2);
      box-shadow: inset 0 2px 4px #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .battle-viewport-classic .card-pit-lens {
      width: 32px;
      height: 5px;
      border-radius: 50%;
      filter: blur(1px);
    }
    .battle-viewport-classic .card-num-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
      color: #ffffff;
    }
    .battle-viewport-classic .card-suit-label {
      font-size: 0.68rem;
      line-height: 1;
      font-weight: 900;
    }
    .battle-viewport-classic .card-effect-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
    }
    .battle-viewport-classic .card-hearts .tactile-card-body { border-color: rgba(244, 63, 94, 0.45); }
    .battle-viewport-classic .card-hearts .card-suit-label { color: #f43f5e; }
    .battle-viewport-classic .card-hearts .card-num-3d { text-shadow: 0 0 14px #f43f5e; }
    .battle-viewport-classic .card-diamonds .tactile-card-body { border-color: rgba(0, 242, 254, 0.45); }
    .battle-viewport-classic .card-diamonds .card-suit-label { color: #00f2fe; }
    .battle-viewport-classic .card-diamonds .card-num-3d { text-shadow: 0 0 14px #00f2fe; }
    .battle-viewport-classic .card-spades .tactile-card-body { border-color: rgba(192, 132, 252, 0.45); }
    .battle-viewport-classic .card-spades .card-suit-label { color: #c084fc; }
    .battle-viewport-classic .card-spades .card-num-3d { text-shadow: 0 0 14px #c084fc; }
    .battle-viewport-classic .card-clubs .tactile-card-body { border-color: rgba(16, 185, 129, 0.45); }
    .battle-viewport-classic .card-clubs .card-suit-label { color: #10b981; }
    .battle-viewport-classic .card-clubs .card-num-3d { text-shadow: 0 0 14px #10b981; }
    .battle-viewport-classic .card-unit-station.is-selected .tactile-card-body {
      transform: translateY(-20px) translateZ(16px) scale(1.08);
      border-color: #ffffff;
      box-shadow: 0 0 26px rgba(0, 242, 254, 0.95);
    }
    .battle-viewport-classic .player-mega-plane {
      position: relative;
      width: 100%;
      height: 275px;
      transform: rotateX(24deg);
      transform-origin: 50% 0%;
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 6px 0.55rem 0.35rem 0.55rem;
      z-index: 50;
    }
    .battle-viewport-classic .player-plane-backdrop {
      position: absolute;
      inset: 0 -15px -40px -15px;
      background: linear-gradient(180deg, rgba(14, 23, 46, 0.88) 0%, rgba(3, 8, 22, 0.99) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.5);
      border-bottom: none;
      border-radius: 10px 10px 0 0;
      box-shadow: inset 0 0 30px rgba(0, 242, 254, 0.18), 0 8px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }
    .battle-viewport-classic .actions-cluster {
      display: flex;
      gap: 5px;
      width: 100%;
      position: relative;
      z-index: 100;
      transform: translateZ(60px);
      padding: 2px 0 6px 0;
    }
    .battle-viewport-classic .tactile-btn-mech {
      border-radius: 8px;
      padding: 8px 4px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6rem;
      font-weight: 900;
      letter-spacing: 0.6px;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid;
      border-top: 2px solid rgba(255, 255, 255, 0.85);
      border-bottom: 2px solid #000;
      transition: transform 0.08s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.08s cubic-bezier(0.2, 0.8, 0.4, 1);
    }
    .battle-viewport-classic .tactile-btn-mech:active {
      transform: translateY(5px);
    }
    .battle-viewport-classic .tactile-btn-abandon {
      flex: 1;
      background: linear-gradient(180deg, #b91c1c 0%, #5f0d18 45%, #220508 100%);
      border-color: #ef4444;
      border-top: 2px solid #fecaca;
      color: #ffffff;
      box-shadow: 0 5px 0 #180306, 0 6px 0 #000;
    }
    .battle-viewport-classic .tactile-btn-deck {
      flex: 0.9;
      background: linear-gradient(180deg, #7e22ce 0%, #3b0764 45%, #140224 100%);
      border-color: #a855f7;
      border-top: 2px solid #f3e8ff;
      color: #ffffff;
      box-shadow: 0 5px 0 #120321, 0 6px 0 #000;
    }
    .battle-viewport-classic .tactile-btn-attack {
      flex: 1.8;
      background: linear-gradient(180deg, #0284c7 0%, #034870 45%, #011b2b 100%);
      border-color: #00f2fe;
      border-top: 2px solid #bae6fd;
      color: #ffffff;
      box-shadow: 0 5px 0 #011827, 0 6px 0 #000;
    }
    .battle-viewport-classic .tactile-btn-attack:disabled {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 45%, #020617 100%);
      border-color: #334155;
      border-top: 2px solid #475569;
      color: #64748b;
      opacity: 0.5;
      cursor: not-allowed;
    }
    .battle-viewport-classic .tactile-btn-change {
      flex: 0.9;
      background: linear-gradient(180deg, #ca8a04 0%, #713f12 45%, #231203 100%);
      border-color: #eab308;
      border-top: 2px solid #fef08a;
      color: #ffffff;
      box-shadow: 0 5px 0 #1c1102, 0 6px 0 #000;
    }
    .battle-viewport-classic .tactile-btn-pass {
      flex: 0.8;
      background: linear-gradient(180deg, #475569 0%, #1e293b 45%, #080c14 100%);
      border-color: #64748b;
      border-top: 2px solid #e2e8f0;
      color: #ffffff;
      box-shadow: 0 5px 0 #080c14, 0 6px 0 #000;
    }
    .battle-viewport-classic .player-hp-dock-bottom {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
      position: relative;
      z-index: 5;
      padding-bottom: 2px;
    }
    .battle-viewport-classic .player-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 14px rgba(16, 185, 129, 0.8);
      white-space: nowrap;
    }
    .battle-viewport-classic .ether-status-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      font-weight: 900;
      color: #f0abfc;
      text-shadow: 0 0 8px #e879f9;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .battle-viewport-classic .tactile-aiuti-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: 5px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.54rem;
      font-weight: 900;
      background: rgba(16, 185, 129, 0.25);
      border: 1px solid #10b981;
      color: #6ee7b7;
      cursor: pointer;
    }
  `;
  document.head.appendChild(styleEl);
})();

const EPIC_META = {
  epic_item_1: { name: 'MÖBIUS', color: '#00f2fe' },
  epic_item_2: { name: 'FORCELLA', color: '#f59e0b' },
  epic_item_3: { name: 'ASTROLABIO', color: '#10b981' },
  epic_item_4: { name: 'STELE', color: '#38bdf8' },
  epic_item_5: { name: 'PISTONE', color: '#ef4444' },
  epic_item_6: { name: 'PENDOLO', color: '#c084fc' },
  epic_item_7: { name: 'MONOLITE', color: '#14b8a6' },
  epic_item_8: { name: 'CALICE', color: '#d946ef' },
  epic_item_9: { name: 'MATRICE', color: '#84cc16' },
  epic_item_10: { name: 'SINGOLARITÀ', color: '#facc15' }
};

// ============================================================================
// 5. COMPONENTE HARDPOINT BATTLE VIEW
// ============================================================================
export default function HardpointBattleView({
  equippedWeapons = ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
  weaponsLevels = { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 },
  riftState,
  isSector1,
  isSector2,
  activeAnomaly,
  selectedPilot,
  pilotInventory,
  selectedDeck,
  aiDeckTheme,
  playerGoldenCardId,
  playerGoldenTurns,
  abilityMeter,
  isAbilityReady,
  aiAbilityMeter,
  handleManualSkillTrigger,
  playerDiceReady,
  executeQuantumDiceRoll,
  equippedEpicItems,
  usedEpicItemsInMatch,
  hasUsedEpicItemThisTurn,
  handleActivateEpicItem,
  isPvP,
  pvpMeta,
  isAdv,
  currentAdvPlanet,
  currentAdvLevel,
  currentPlanetNameSafe,
  bossPhase,
  maxBossPhases,
  aiHp,
  maxAiHp,
  aiTimer,
  aiTimeTank,
  aiMalusGauge,
  malusMaxTicks,
  aiNotches,
  aiDeckCount,
  aiDeck,
  aiDiscard,
  aiDiscardTop,
  isRealPvP,
  aiTerrainSlots,
  effectiveAiDeckLevel,
  effectiveAiAbilityId,
  aiHand,
  aiCardStates,
  aiActionMessage,
  lives,
  playerHp,
  maxPlayerHp,
  timer,
  playerTimeTank,
  playerMalusGauge,
  playerNotches,
  battleEther,
  maxBattleEther,
  isScannerActive,
  scannerMode,
  scannerSeconds,
  toggleScanner,
  effectivePlayerDeckLevel,
  selectedAbility,
  abilities,
  level,
  playerHand,
  playerDeck,
  playerDiscard,
  playerTerrainSlots,
  handleRearmTerrainSlot,
  onAttack,
  onCardClick,
  pistonOverrideActive,
  pistonOverrideDamage,
  handlePassTurn,
  isExchangeMode,
  setIsExchangeMode,
  handleOpenExchangeMode,
  selectedExchangeIndices,
  confirmCardExchange,
  setShowAbandonConfirm,
  setShowDeckExtractModal,
  isSelectingDiscard,
  hasExchangedThisTurn,
  isExchangeBlockedByModifier,
  turn,
  isBombAllowed = false
}) {
  const [scale, setScale] = useState(1);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [selectedHardpointIdx, setSelectedHardpointIdx] = useState(0);

  // Generazione Hardpoint dinamici con bersagli garantiti dalla mano
  const [hardpoints, setHardpoints] = useState(() =>
    generateHardpointObjectives(equippedWeapons, weaponsLevels, playerHand, activeAnomaly)
  );

  const prevTurnRef = useRef(turn);
  useEffect(() => {
    if (turn === 'player1' && prevTurnRef.current !== 'player1') {
      setSelectedIndices([]);
      setSelectedHardpointIdx(0);
      setHardpoints(generateHardpointObjectives(equippedWeapons, weaponsLevels, playerHand, activeAnomaly));
    } else if (turn !== 'player1') {
      setSelectedIndices([]);
    }
    prevTurnRef.current = turn;
  }, [turn, playerHand, equippedWeapons, weaponsLevels, activeAnomaly]);

  // Aggiorna i target non appena le carte arrivano in mano
  useEffect(() => {
    if (playerHand && playerHand.length >= 2) {
      setHardpoints(generateHardpointObjectives(equippedWeapons, weaponsLevels, playerHand, activeAnomaly));
    }
  }, [playerHand, equippedWeapons, weaponsLevels, activeAnomaly]);

  useEffect(() => {
    const updateScale = () => {
      const screenW = window.innerWidth || document.documentElement.clientWidth;
      const screenH = window.innerHeight || document.documentElement.clientHeight;
      const s = Math.min((screenW - 8) / 440, (screenH - 8) / 840);
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleCardClick = (idx) => {
    if (turn !== 'player1') return;
    if (isSelectingDiscard || isExchangeMode) {
      if (typeof onCardClick === 'function') onCardClick(idx);
      return;
    }
    setSelectedIndices(prev => {
      const isAlready = prev.includes(idx);
      try { playSound(isAlready ? 'deselect' : 'select'); } catch (_) {}
      return isAlready ? prev.filter(i => i !== idx) : [...prev, idx];
    });
  };

  const handleSelectHardpoint = (idx) => {
    try { playSound('click'); } catch (_) {}
    setSelectedHardpointIdx(idx);
  };

  // MOTORE DI RISOLUZIONE ALGEBRICA & POKER PERMUTATO
  const selectedCardsList = useMemo(() => {
    return (selectedIndices || []).map(idx => playerHand?.[idx]).filter(Boolean);
  }, [selectedIndices, playerHand]);

  const smartTargetInfo = useMemo(() => {
    const currentObj = hardpoints?.[selectedHardpointIdx] || hardpoints?.[0];
    const tolerance = selectedDeck === 'pisces' ? 2 : 0;

    if (!selectedCardsList || selectedCardsList.length < 2) {
      const single = selectedCardsList?.[0];
      const singleVal = single ? getCardEffectiveValue(single, activeAnomaly) : 0;
      return {
        matchedIndex: null,
        isExactMatch: false,
        currentResult: singleVal,
        formulaString: single ? singleVal.toString() : '',
        missingDiff: currentObj?.target ? Math.round((currentObj.target - singleVal) * 10) / 10 : null
      };
    }

    // 1. Controllo sull'Hardpoint selezionato
    if (currentObj?.type === 'poker') {
      const allowed = currentObj.allowedPatterns || ['one_pair'];
      for (const pat of allowed) {
        if (validateClassicPokerPattern(selectedCardsList, pat)) {
          return {
            matchedIndex: selectedHardpointIdx,
            isExactMatch: true,
            currentResult: currentObj.damage,
            formulaString: currentObj.name,
            missingDiff: 0
          };
        }
      }
    } else if (currentObj) {
      const match = getMatchingPermutation(selectedCardsList, currentObj.op, currentObj.target, tolerance, activeAnomaly);
      if (match) {
        return {
          matchedIndex: selectedHardpointIdx,
          isExactMatch: true,
          currentResult: match.result,
          formulaString: match.cards.map(c => getCardEffectiveValue(c, activeAnomaly)).join(` ${currentObj.op} `),
          missingDiff: 0
        };
      }
    }

    // 2. Controllo incrociato sugli altri 3 Hardpoint per auto-aggancio automatico
    for (let i = 0; i < (hardpoints || []).length; i++) {
      if (i === selectedHardpointIdx) continue;
      const obj = hardpoints[i];
      if (obj?.type === 'poker') {
        const allowed = obj.allowedPatterns || ['one_pair'];
        for (const pat of allowed) {
          if (validateClassicPokerPattern(selectedCardsList, pat)) {
            return {
              matchedIndex: i,
              isExactMatch: true,
              currentResult: obj.damage,
              formulaString: obj.name,
              missingDiff: 0
            };
          }
        }
      } else if (obj) {
        const matchOther = getMatchingPermutation(selectedCardsList, obj.op, obj.target, tolerance, activeAnomaly);
        if (matchOther) {
          return {
            matchedIndex: i,
            isExactMatch: true,
            currentResult: matchOther.result,
            formulaString: matchOther.cards.map(c => getCardEffectiveValue(c, activeAnomaly)).join(` ${obj.op} `),
            missingDiff: 0
          };
        }
      }
    }

    const fallbackRes = currentObj?.op ? calculateExpressionResult(selectedCardsList, currentObj.op, activeAnomaly) : 0;
    return {
      matchedIndex: null,
      isExactMatch: false,
      currentResult: fallbackRes,
      formulaString: currentObj?.op ? selectedCardsList.map(c => getCardEffectiveValue(c, activeAnomaly)).join(` ${currentObj.op} `) : '',
      missingDiff: currentObj?.target ? Math.round((currentObj.target - fallbackRes) * 10) / 10 : null
    };
  }, [selectedCardsList, hardpoints, selectedHardpointIdx, selectedDeck, activeAnomaly]);

  // Auto-aggancio automatico
  useEffect(() => {
    if (smartTargetInfo?.isExactMatch && smartTargetInfo?.matchedIndex !== null && smartTargetInfo?.matchedIndex !== undefined) {
      if (smartTargetInfo.matchedIndex !== selectedHardpointIdx) {
        handleSelectHardpoint(smartTargetInfo.matchedIndex);
      }
    }
  }, [smartTargetInfo?.isExactMatch, smartTargetInfo?.matchedIndex, selectedHardpointIdx]);

  const resolvedHardpointIdx = (smartTargetInfo?.isExactMatch && smartTargetInfo?.matchedIndex !== null && smartTargetInfo?.matchedIndex !== undefined)
    ? smartTargetInfo.matchedIndex
    : selectedHardpointIdx;
  const activeHp = hardpoints?.[resolvedHardpointIdx] || hardpoints?.[0];

  const currentAttackDamage = pistonOverrideActive
    ? pistonOverrideDamage
    : (activeHp?.damage || 15);

  const cardsCount = selectedIndices?.length || 0;
  const isFireReady = Boolean(
    turn === 'player1' &&
    !isSelectingDiscard &&
    cardsCount >= 2 &&
    smartTargetInfo?.isExactMatch
  );

  // Sistema Proiettili & Balistica verso la Barra Nemica
  const fireWeaponBalistics = (weapon) => {
    const layer = document.getElementById('classic-projectiles-layer');
    const hpDock = document.getElementById('classicEnemyHpDock');
    if (!layer || !hpDock) return;

    const hpRect = hpDock.getBoundingClientRect();
    const targetY = hpRect.top + hpRect.height / 2;
    const targetCenterX = hpRect.left + hpRect.width / 2;
    const fx = weapon.fxType || 'gatling';
    const lvl = weapon.level || 1;
    const stats = weapon.stats || {};
    const weaponColor = weapon.color || '#00f2fe';

    // 1. ARCO-X: TEMPESTA DI FRECCE DAL BASSO
    if (fx === 'arrow_barrage') {
      const shots = stats.shots || (8 + lvl * 4);
      for (let i = 0; i < shots; i++) {
        setTimeout(() => {
          try { playSound('arrow_launch'); } catch (_) {}
          const startX = (window.innerWidth / 2) + (Math.random() - 0.5) * 120;
          const startY = window.innerHeight + 30;
          const targetX = hpRect.left + (Math.random() * (hpRect.width - 24) + 12);
          const dx = targetX - startX;
          const dy = targetY - startY;
          const angleRad = Math.atan2(dy, dx) + Math.PI / 2;

          const arrow = document.createElement('div');
          arrow.className = 'flight-arrow-screen';
          layer.appendChild(arrow);

          arrow.animate([
            { transform: `translate(${startX}px, ${startY}px) rotate(${angleRad}rad) scale(1.3)`, opacity: 0.95 },
            { transform: `translate(${targetX}px, ${targetY}px) rotate(${angleRad}rad) scale(0.65)`, opacity: 1 }
          ], { duration: 280, easing: 'linear', fill: 'forwards' }).onfinish = () => {
            arrow.remove();
            hpDock.classList.remove('bar-hit-flash', 'bar-shiver');
            void hpDock.offsetWidth;
            hpDock.classList.add('bar-hit-flash', 'bar-shiver');
          };
        }, i * 30);
      }
      return;
    }

    // 2. FULMINI / RAGGI ORBITALI DALL'ALTO
    if (fx === 'lightning_strike' || fx === 'orbital_pillar') {
      const bolts = stats.bolts || lvl;
      for (let b = 0; b < bolts; b++) {
        setTimeout(() => {
          try { playSound('cannon_hit'); } catch (_) {}
          const targetX = fx === 'orbital_pillar' ? targetCenterX : (hpRect.left + Math.random() * (hpRect.width - 24) + 12);
          const bolt = document.createElement('div');
          bolt.style.position = 'absolute';
          bolt.style.top = '0';
          bolt.style.left = `${targetX - (fx === 'orbital_pillar' ? 20 : 3)}px`;
          bolt.style.width = fx === 'orbital_pillar' ? '40px' : '6px';
          bolt.style.height = `${targetY}px`;
          bolt.style.background = `linear-gradient(180deg, #fff 0%, ${weaponColor} 60%, transparent 100%)`;
          bolt.style.boxShadow = `0 0 25px ${weaponColor}, 0 0 45px #fff`;
          bolt.style.pointerEvents = 'none';
          layer.appendChild(bolt);

          setTimeout(() => {
            bolt.remove();
            hpDock.classList.add('bar-hit-flash', 'bar-shiver');
            setTimeout(() => hpDock.classList.remove('bar-hit-flash', 'bar-shiver'), 220);
          }, 140);
        }, b * 100);
      }
      return;
    }

    // 3. RAILGUN IONICO: FASCIO LASER ISTANTANEO
    if (fx === 'railgun_beam') {
      try { playSound('arrow_launch'); } catch (_) {}
      const beam = document.createElement('div');
      beam.style.position = 'absolute';
      beam.style.left = `${targetCenterX - 4}px`;
      beam.style.top = `${targetY}px`;
      beam.style.width = '8px';
      beam.style.height = `${window.innerHeight - targetY}px`;
      beam.style.background = `linear-gradient(0deg, transparent 0%, ${weaponColor} 30%, #fff 100%)`;
      beam.style.boxShadow = `0 0 24px ${weaponColor}, 0 0 40px #fff`;
      beam.style.pointerEvents = 'none';
      layer.appendChild(beam);

      hpDock.classList.add('bar-hit-flash', 'bar-shiver');
      setTimeout(() => {
        beam.remove();
        hpDock.classList.remove('bar-hit-flash', 'bar-shiver');
      }, 180);
      return;
    }

    // 4. SIFONE DI SANGUE: CREMISI IN SALITA, SMERALDO IN DISCESA PER CURA
    if (fx === 'blood_siphon') {
      const count = stats.shots || 3;
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          try { playSound('card_slide'); } catch (_) {}
          const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
          const startY = window.innerHeight + 20;
          const targetX = hpRect.left + (Math.random() * (hpRect.width - 20) + 10);

          const orb = document.createElement('div');
          orb.style.position = 'absolute';
          orb.style.width = '14px';
          orb.style.height = '14px';
          orb.style.borderRadius = '50%';
          orb.style.background = 'radial-gradient(circle, #ff4d6d 0%, #c9184a 100%)';
          orb.style.boxShadow = '0 0 16px #ff4d6d';
          layer.appendChild(orb);

          orb.animate([
            { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1 },
            { transform: `translate(${targetX}px, ${targetY}px) scale(0.6)`, opacity: 1 }
          ], { duration: 280, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
            orb.remove();
            hpDock.classList.add('bar-hit-flash', 'bar-shiver');
            setTimeout(() => hpDock.classList.remove('bar-hit-flash', 'bar-shiver'), 150);

            const healOrb = document.createElement('div');
            healOrb.style.position = 'absolute';
            healOrb.style.width = '12px';
            healOrb.style.height = '12px';
            healOrb.style.borderRadius = '50%';
            healOrb.style.background = 'radial-gradient(circle, #a7f3d0 0%, #10b981 100%)';
            healOrb.style.boxShadow = '0 0 16px #10b981';
            layer.appendChild(healOrb);

            healOrb.animate([
              { transform: `translate(${targetX}px, ${targetY}px)`, opacity: 1 },
              { transform: `translate(${window.innerWidth / 2}px, ${window.innerHeight + 10}px)`, opacity: 0 }
            ], { duration: 320, easing: 'ease-out', fill: 'forwards' }).onfinish = () => healOrb.remove();
          };
        }, i * 70);
      }
      return;
    }

    // 5. DEFAULT / CANNONE PESANTE: MAGLIO AD ALTA INERZIA
    try { playSound('cannon_hit'); } catch (_) {}
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight + 35;
    const targetX = targetCenterX;

    const ball = document.createElement('div');
    ball.style.position = 'absolute';
    ball.style.width = `${22 + lvl * 3}px`;
    ball.style.height = `${22 + lvl * 3}px`;
    ball.style.marginLeft = `-${(22 + lvl * 3) / 2}px`;
    ball.style.marginTop = `-${(22 + lvl * 3) / 2}px`;
    ball.style.borderRadius = '50%';
    ball.style.background = `radial-gradient(circle at 35% 35%, #fff 0%, ${weaponColor} 60%, #000 100%)`;
    ball.style.boxShadow = `0 0 24px ${weaponColor}, 0 0 35px #fff`;
    ball.style.pointerEvents = 'none';
    layer.appendChild(ball);

    ball.animate([
      { transform: `translate(${startX}px, ${startY}px) scale(1.4)`, opacity: 1 },
      { transform: `translate(${targetX}px, ${targetY}px) scale(0.6)`, opacity: 1 }
    ], { duration: 300, easing: 'cubic-bezier(0.18, 0.7, 0.35, 1)', fill: 'forwards' }).onfinish = () => {
      ball.remove();
      hpDock.classList.add('bar-hit-flash', 'bar-shiver');
      setTimeout(() => hpDock.classList.remove('bar-hit-flash', 'bar-shiver'), 200);
    };
  };

  const handleAttackExecute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (turn !== 'player1' || isSelectingDiscard || !isFireReady) {
      try { playSound('deselect'); } catch (_) {}
      return;
    }

    fireWeaponBalistics(activeHp);

    const cardsUsed = (selectedIndices || []).map(i => playerHand?.[i]).filter(Boolean);
    try { playSound('click'); } catch (_) {}
    setSelectedIndices([]);

    if (typeof onAttack === 'function') {
      onAttack({
        targetIndex: resolvedHardpointIdx,
        usedIndices: selectedIndices,
        resolvedObj: activeHp,
        damage: currentAttackDamage,
        usedCards: cardsUsed
      });
    }
  };

  const currentGlobalSector = isAdv ? ((currentAdvPlanet - 1) * 10 + currentAdvLevel) : 100;
  const isTerrainAllowed = isPvP || !isAdv || currentGlobalSector >= 8;
  const isAbilityModuleUnlocked = isPvP || !isAdv || currentGlobalSector >= 9;
  const isMalusAllowed = isPvP || !isAdv || (currentAdvPlanet > 1 || currentAdvLevel >= 11);
  const isDiceAllowed = isPvP || !isAdv || (currentAdvPlanet > 1 || currentAdvLevel >= 12);
  const isEtherAllowed = isPvP || !isAdv || currentGlobalSector >= 15;

  const playerDeckCount = playerDeck?.length || 0;
  const playerDeckThickness = Math.max(0, Math.round((playerDeckCount / 50) * 14));
  const enemyDeckCountVal = isRealPvP ? aiDeckCount : (aiDeck?.length || 0);
  const enemyDeckThickness = Math.max(0, Math.round((enemyDeckCountVal / 50) * 14));

  const pilotLevel = Number(level) || 1;
  const isEpic1Unlocked = pilotLevel >= 20 && equippedEpicItems?.[0];
  const isEpic2Unlocked = pilotLevel >= 60 && equippedEpicItems?.[1];

  const item1Id = equippedEpicItems?.[0];
  const item2Id = equippedEpicItems?.[1];
  const isItem1Used = Boolean(usedEpicItemsInMatch?.[item1Id]);
  const isItem2Used = Boolean(usedEpicItemsInMatch?.[item2Id]);
  const isItem1Usable = turn === 'player1' && !isItem1Used && !hasUsedEpicItemThisTurn;
  const isItem2Usable = turn === 'player1' && !isItem2Used && !hasUsedEpicItemThisTurn;

  const topPlayerDiscard = playerDiscard && playerDiscard.length > 0 ? playerDiscard[playerDiscard.length - 1] : null;
  const topAiDiscardCard = isRealPvP ? aiDiscardTop : (aiDiscard && aiDiscard.length > 0 ? aiDiscard[aiDiscard.length - 1] : null);

  const enemyName = isPvP
    ? (pvpMeta?.opponent?.nickname || 'AVVERSARIO')
    : (isAdv && currentAdvLevel === 10 ? `👑 BOSS ${currentPlanetNameSafe?.toUpperCase() || ''}` : `AVVERSARIO S.${currentAdvLevel}`);

  const currentPilotLvl = pilotInventory?.[selectedPilot]?.level || 1;
  const isPilotResonant = checkPilotSetResonance(selectedPilot, selectedDeck, selectedAbility);

  return (
    <div className="classic-screen-wrapper">
      <div id="classic-projectiles-layer"></div>

      <div className="battle-viewport-tris battle-viewport-classic" style={{ transform: `scale(${scale})` }}>

        {/* 1. PIANO SUPERIORE (AVVERSARIO) */}
        <div className="enemy-mega-plane">
          <div className="enemy-plane-backdrop">
            <div className="tactical-grid-overlay"></div>
          </div>

          <div className="hud-enemy-telemetry" style={{ position: 'relative' }}>
            <div className="vital-telemetry-row">
              <span className="boss-name-3d">{enemyName}</span>
              <span className="boss-hp-3d">{aiHp} <span>/ {maxAiHp} HP</span></span>
              <span className="timer-readout">⏳ {aiTimer}s</span>
              {aiTimeTank > 0 && <span className="tank-readout enemy-tank">🛢️ +{aiTimeTank}s</span>}
              <span className="tactile-status-badge enemy-phase-tag">
                {isAdv && currentAdvLevel === 10 ? `FASE ${bossPhase}/${maxBossPhases}` : 'ATTIVO'}
              </span>
            </div>

            <div className="hp-prismatic-dock" id="classicEnemyHpDock">
              <div className="hp-segmented-grid"></div>
              <div
                className="enemy-hp-fill-3d"
                style={{ width: `${Math.max(0, Math.min(100, (aiHp / (maxAiHp || 1)) * 100))}%` }}
              ></div>
            </div>

            {riftState?.active && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 6px',
                marginTop: '1px',
                background: 'rgba(250, 204, 21, 0.15)',
                border: '1px solid #facc15',
                borderRadius: '4px',
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.52rem',
                fontWeight: 900,
                color: '#fef08a'
              }}>
                <span>⚡ BERSAGLIO {riftState.targetSlotIndex + 1} VULNERABILE: {riftState.conditionLabel}</span>
                <span style={{ color: riftState.benefit?.color || '#34d399' }}>{riftState.benefit?.icon} {riftState.benefit?.name}</span>
              </div>
            )}
          </div>

          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div className={`malus-gauge-box ${aiMalusGauge > 0 ? 'warning-active' : ''}`}>
                <div className="malus-title-row">
                  <span>MALUS NEMICO</span>
                  <span>{aiMalusGauge}/{malusMaxTicks}</span>
                </div>
                <div className="malus-pip-array">
                  {Array.from({ length: malusMaxTicks }).map((_, i) => (
                    <div key={i} className={`malus-pip-cell ${aiMalusGauge > i ? 'filled' : ''}`}></div>
                  ))}
                </div>
              </div>
            ) : <div style={{ width: '125px' }}></div>}

            <div className="right-equip-cluster">
              {isDiceAllowed && (
                <div className="equip-pedestal-station station-enemy-dice station-dice">
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">DADI {Object.values(aiNotches || {}).filter(Boolean).length}/4</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div className="equip-pedestal-station station-enemy-module station-module">
                  <div className="equip-stationary-art">
                    <ModuleIcon id={effectiveAiAbilityId} size={28} color="#00f2fe" />
                  </div>
                  <span className="equip-label-tag">{effectiveAiAbilityId?.toUpperCase() || 'MODULO'} L.{effectiveAiDeckLevel}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}
            </div>
          </div>

          <div className="enemy-field-cards-row">
            <div className="card-deck-stack-block enemy-deck-theme" style={{ '--deck-thick': `${enemyDeckThickness}px` }}>
              <div className="deck-ground-shadow"></div>
              <div className="deck-cards-stack-body"></div>
              <div className="card-deck-top" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                <TacticalVisual id={aiDeckTheme || 'planet_char_1'} type="card_back" width={56} height={80} />
              </div>
              <div className="deck-count-badge" style={{ borderColor: '#f43f5e', color: '#f43f5e' }}>{enemyDeckCountVal}</div>
            </div>

            <div className="card-discard-stack-block">
              <div className="card-discard-top">
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 900, color: '#fda4af' }}>SCARTI</span>
                <span style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 900 }}>
                  {topAiDiscardCard ? `${topAiDiscardCard.symbol} ${topAiDiscardCard.displayVal || topAiDiscardCard.value}` : '---'}
                </span>
              </div>
              <div className="deck-count-badge" style={{ bottom: '-6px', right: '2px', borderColor: '#f43f5e', color: '#f43f5e' }}>
                {isRealPvP ? (aiDiscardTop ? 1 : 0) : (aiDiscard?.length || 0)}
              </div>
            </div>

            {isTerrainAllowed && (
              <div className="terrains-horizontal-bank">
                {(aiTerrainSlots || []).slice(0, 4).map((slot, idx) => {
                  if (!slot?.card) return null;
                  const isActivated = Boolean(slot.isTriggered);
                  return (
                    <div key={idx} className={`terrain-horizontal-card ${isActivated ? 'is-revealed' : ''}`} style={{ cursor: 'default' }}>
                      <div className="terrain-card-inner">
                        <div className="terrain-card-face terrain-face-back enemy-border" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                          <TerrainVisual isBack={true} color={slot.card?.color || '#f43f5e'} width={48} height={68} />
                        </div>
                        <div className="terrain-card-face terrain-face-front" style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#f43f5e'}` }}>
                          <TerrainVisual cardId={slot.card?.id || slot.cardId} color={slot.card?.color || '#f43f5e'} width={48} height={68} isBack={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {turn === 'ai' && (
          <div className="enemy-action-ticker">
            <span style={{ fontSize: '0.85rem' }}>⚡</span>
            <span>{aiActionMessage || "L'avversario sta scegliendo le carte..."}</span>
          </div>
        )}

        {/* 2. MANO AVVERSARIA */}
        <div className="wall-hand-rack enemy-side">
          {(aiHand || Array(7).fill(null)).slice(0, 7).map((_, idx) => (
            <div key={idx} className="enemy-card-pod">
              <div className="enemy-hologram-back" style={{ padding: 0, overflow: 'hidden' }}>
                <TacticalVisual id={aiDeckTheme || 'planet_char_1'} type="card_back" width={38} height={52} />
              </div>
              <div className="enemy-pedestal-base"></div>
            </div>
          ))}
        </div>

        {/* 3. RAMPA CENTRALE 3D: I 4 ALLOGGIAMENTI CARTE ARMA */}
        <div className="trapezoid-ramp-hub">
          <div className="trapezoid-ramp-surface">
            <div className="trapezoid-grid-lines"></div>
          </div>

          <div style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="classic-targets-horizontal-row" style={{ gap: '8px', transform: 'translateY(-8px) scale(1.18)' }}>
              {(hardpoints || []).map((hp, oIdx) => {
                const isSelected = selectedHardpointIdx === oIdx;
                const isArmed = smartTargetInfo?.isExactMatch && smartTargetInfo?.matchedIndex === oIdx;
                const isPattern = hp.type === 'poker';
                const themeColor = hp.color || '#00f2fe';

                return (
                  <div
                    key={hp.id + oIdx}
                    className={`target-pedestal-station ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleSelectHardpoint(oIdx)}
                    style={{
                      color: themeColor,
                      maxWidth: '102px',
                      minWidth: '84px',
                      transform: isArmed
                        ? 'translateY(-14px) scale(1.10)'
                        : (isSelected ? 'translateY(-7px) scale(1.04)' : 'none')
                    }}
                  >
                    {/* SOPRA: Danno + Livello */}
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0 2px',
                      marginBottom: '2px'
                    }}>
                      <span style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '0.52rem',
                        fontWeight: 900,
                        color: '#f87171',
                        background: 'rgba(69, 10, 10, 0.75)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap'
                      }}>
                        ⚔️ -{hp.damage}
                      </span>
                      <span style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '0.48rem',
                        color: '#facc15',
                        fontWeight: 900
                      }}>
                        L.{hp.level}
                      </span>
                    </div>

                    {/* CARTA ARMA */}
                    <div style={{
                      width: '100%',
                      height: '64px',
                      borderRadius: '6px',
                      background: 'radial-gradient(circle at 50% 50%, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.99) 100%)',
                      border: `1.8px solid ${isArmed ? '#ffffff' : themeColor}`,
                      boxShadow: isArmed
                        ? `0 0 20px ${themeColor}, 0 0 10px #ffffff, inset 0 0 10px ${themeColor}`
                        : `0 4px 12px rgba(0,0,0,0.85), inset 0 0 8px rgba(0,0,0,0.6)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 2px 3px 2px',
                      position: 'relative',
                      overflow: 'hidden',
                      boxSizing: 'border-box'
                    }}>
                      {/* Illustrazione centrale */}
                      <div style={{
                        width: '100%',
                        height: '38px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)'
                      }}>
                        <img
                          src={hp.imgUrl}
                          alt={hp.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerText = isPattern ? '🃏' : '⚡';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Requisito Poker o Target Matematico */}
                      <div style={{
                        width: '94%',
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: isPattern ? '0.54rem' : '0.74rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        color: isArmed ? '#ffffff' : themeColor,
                        textShadow: isArmed ? `0 0 10px #ffffff, 0 0 16px ${themeColor}` : `0 0 8px ${themeColor}`,
                        background: isArmed ? `${themeColor}44` : 'rgba(0,0,0,0.65)',
                        border: `1px solid ${isArmed ? '#ffffff' : `${themeColor}66`}`,
                        borderRadius: '3px',
                        padding: '1px 2px',
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap'
                      }}>
                        {isPattern ? hp.reqDescription : `[${hp.op}] ${hp.target}`}
                      </div>
                    </div>

                    {/* Pozzetto e Lente 3D */}
                    <div className="target-pit-socket" style={{ width: '44px', height: '12px', marginTop: '6px' }}>
                      <div className="pit-lens" style={{ width: '22px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. MANO DEL GIOCATORE */}
        <div className="player-cards-section">
          {isSelectingDiscard && (
            <div className="discard-alert-banner">
              ⚠️ TOCCA 1 CARTA DA SACRIFICARE PER PASSARE IL TURNO
            </div>
          )}

          <div className="wall-hand-rack player-side">
            {(playerHand || []).map((card, idx) => {
              if (!card) return null;
              const isSelected = isExchangeMode
                ? selectedExchangeIndices?.includes(idx)
                : selectedIndices?.includes(idx);

              const isGolden = Boolean(card.isGolden || (playerGoldenCardId && card.id === playerGoldenCardId));

              const suitKey = card.suit || 'hearts';
              const suitClass = suitKey === 'diamonds' ? 'card-diamonds' :
                                suitKey === 'spades' ? 'card-spades' :
                                suitKey === 'clubs' ? 'card-clubs' : 'card-hearts';

              const suitTag = suitKey === 'diamonds' ? '+2🌟' :
                              suitKey === 'spades' ? '+3HP' :
                              suitKey === 'clubs' ? '+5s' : '+8% HP';

              return (
                <div
                  key={card.id || idx}
                  className={`card-unit-station ${suitClass} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleCardClick(idx)}
                >
                  <div className={`tactile-card-body ${isSelectingDiscard ? 'discard-mode' : ''} ${isGolden ? 'golden-card' : ''}`}>
                    {isGolden && playerGoldenTurns > 0 && (
                      <div className="golden-turns-badge">{playerGoldenTurns}T</div>
                    )}
                    <span className="card-suit-label">{card.symbol}</span>
                    <span className="card-num-3d">{card.displayVal || card.value}</span>
                    <span className="card-effect-tag">
                      {isSelectingDiscard ? '✕ SCARTA' : (card.isCourt ? card.value : suitTag)}
                    </span>
                  </div>
                  <div className="card-pit-base"><div className="card-pit-lens"></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. PIANO INFERIORE GIOCATORE */}
        <div className="player-mega-plane">
          <div className="player-plane-backdrop">
            <div className="tactical-grid-overlay"></div>
          </div>

          <div className="player-field-cards-row">
            <div className="card-deck-stack-block" style={{ '--deck-thick': `${playerDeckThickness}px` }}>
              <div className="deck-ground-shadow"></div>
              <div className="deck-cards-stack-body"></div>
              <div className="card-deck-top" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                <TacticalVisual id={selectedDeck || 'neutral_starter'} type="card_back" width={56} height={80} />
              </div>
              <div className="deck-count-badge">{playerDeckCount}</div>
            </div>

            <div className="card-discard-stack-block">
              <div className="card-discard-top">
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 900, color: '#fda4af' }}>SCARTI</span>
                <span style={{ fontSize: '0.72rem', color: '#00f2fe', fontWeight: 900 }}>
                  {topPlayerDiscard ? `${topPlayerDiscard.symbol} ${topPlayerDiscard.displayVal || topPlayerDiscard.value}` : '---'}
                </span>
              </div>
              <div className="deck-count-badge" style={{ bottom: '-6px', right: '2px', borderColor: '#00f2fe', color: '#00f2fe' }}>
                {playerDiscard?.length || 0}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px' }}>
              <PilotPortraitVisual pilotId={selectedPilot} size={48} isResonance={isPilotResonant} />
              <span style={{ fontSize: '0.5rem', fontWeight: 900, color: '#00f2fe', marginTop: '2px' }}>
                L.{currentPilotLvl}
              </span>
            </div>

            {isTerrainAllowed && (
              <div className="terrains-horizontal-bank">
                {(playerTerrainSlots || []).slice(0, 4).map((slot, idx) => {
                  if (!slot?.card) {
                    return <div key={idx} className="terrain-empty-slot">VUOTO</div>;
                  }
                  const isActivated = Boolean(slot.isTriggered);
                  return (
                    <div 
                      key={idx} 
                      className={`terrain-horizontal-card ${isActivated ? 'is-revealed' : ''}`}
                      style={{ cursor: slot.canRearm ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (slot.canRearm && typeof handleRearmTerrainSlot === 'function') {
                          handleRearmTerrainSlot(idx);
                        }
                      }}
                      title={slot.card?.name ? `${slot.card.name} (L.${slot.level}): ${slot.card.desc}` : ''}
                    >
                      {slot.canRearm && (
                        <div className="terrain-rearm-tag">RIARMA</div>
                      )}
                      <div className="terrain-card-inner">
                        <div className="terrain-card-face terrain-face-back" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                          <TerrainVisual width={48} height={68} isBack={true} color={slot.card?.color || '#38bdf8'} />
                        </div>
                        <div className="terrain-card-face terrain-face-front" style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#38bdf8'}` }}>
                          <TerrainVisual cardId={slot.card?.id || slot.cardId} width={48} height={68} color={slot.card?.color || '#38bdf8'} isBack={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div className={`malus-gauge-box ${playerMalusGauge > 0 ? 'warning-active' : ''}`} style={{ borderColor: 'rgba(0,242,254,0.4)' }}>
                <div className="malus-title-row" style={{ color: '#7dd3fc' }}>
                  <span>BARRA MALUS</span>
                  <span>{playerMalusGauge}/{malusMaxTicks}</span>
                </div>
                <div className="malus-pip-array">
                  {Array.from({ length: malusMaxTicks }).map((_, i) => (
                    <div key={i} className={`malus-pip-cell ${playerMalusGauge > i ? 'filled' : ''}`}></div>
                  ))}
                </div>
              </div>
            ) : <div style={{ width: '125px' }}></div>}

            <div className="right-equip-cluster">
              {isDiceAllowed && (
                <div
                  className="equip-pedestal-station station-dice"
                  onClick={() => { if (playerDiceReady && typeof executeQuantumDiceRoll === 'function') executeQuantumDiceRoll(); }}
                >
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">{playerDiceReady ? 'LANCIA!' : `DADI ${Object.values(playerNotches || {}).filter(Boolean).length}/4`}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div
                  className="equip-pedestal-station station-module"
                  onClick={() => { if (isAbilityReady && typeof handleManualSkillTrigger === 'function') handleManualSkillTrigger(); }}
                >
                  <div className="equip-stationary-art">
                    <ModuleIcon id={selectedAbility} size={28} color={isAbilityReady ? '#00f2fe' : '#10b981'} />
                  </div>
                  <span className="equip-label-tag">{isAbilityReady ? 'PRONTO!' : 'MODULO'}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isEpic1Unlocked && (
                <div
                  className={`equip-pedestal-station station-mobius ${isItem1Used ? 'item-exhausted' : (isItem1Usable ? 'item-usable' : '')}`}
                  onClick={() => { if (isItem1Usable && typeof handleActivateEpicItem === 'function') handleActivateEpicItem(item1Id); }}
                >
                  <div className="equip-stationary-art">
                    <TacticalVisual id={item1Id} type="epic_item" color={EPIC_META[item1Id]?.color || '#00f2fe'} width={28} height={28} />
                  </div>
                  <span className="equip-label-tag">{isItem1Used ? 'USATO' : (EPIC_META[item1Id]?.name || 'EPICO 1')}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isEpic2Unlocked && (
                <div
                  className={`equip-pedestal-station station-piston ${isItem2Used ? 'item-exhausted' : (isItem2Usable ? 'item-usable' : '')}`}
                  onClick={() => { if (isItem2Usable && typeof handleActivateEpicItem === 'function') handleActivateEpicItem(item2Id); }}
                >
                  <div className="equip-stationary-art">
                    <TacticalVisual id={item2Id} type="epic_item" color={EPIC_META[item2Id]?.color || '#ef4444'} width={28} height={28} />
                  </div>
                  <span className="equip-label-tag">{isItem2Used ? 'USATO' : (EPIC_META[item2Id]?.name || 'EPICO 2')}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}
            </div>
          </div>

          {/* CLUSTER AZIONI: TASTI MECCANICI 3D UNIFORMATI */}
          <div className="actions-cluster">
            {isExchangeMode ? (
              <>
                <button 
                  className="tactile-btn-mech tactile-btn-change"
                  style={{ flex: 2 }}
                  disabled={!selectedExchangeIndices || selectedExchangeIndices.length === 0}
                  onClick={confirmCardExchange}
                >
                  CONFERMA ({selectedExchangeIndices?.length || 0}/3)
                </button>
                <button 
                  className="tactile-btn-mech tactile-btn-pass"
                  style={{ flex: 1 }}
                  onClick={() => setIsExchangeMode(false)}
                >
                  ANNULLA
                </button>
              </>
            ) : (
              <>
                <button className="tactile-btn-mech tactile-btn-abandon" onClick={() => setShowAbandonConfirm(true)}>
                  ABBANDONA
                </button>

                {isEtherAllowed && (
                  <button 
                    className="tactile-btn-mech tactile-btn-deck"
                    onClick={() => setShowDeckExtractModal(true)}
                  >
                    🔮 MAZZO
                  </button>
                )}

                <button
                  type="button"
                  className="tactile-btn-mech tactile-btn-attack"
                  disabled={turn !== 'player1' || isSelectingDiscard || !isFireReady}
                  onClick={handleAttackExecute}
                >
                  ATTACCA
                </button>

                <button
                  className="tactile-btn-mech tactile-btn-change"
                  style={{
                    opacity: (hasExchangedThisTurn || isExchangeBlockedByModifier || turn !== 'player1' || isSelectingDiscard) ? 0.45 : 1
                  }}
                  disabled={hasExchangedThisTurn || isExchangeBlockedByModifier || turn !== 'player1' || isSelectingDiscard}
                  onClick={handleOpenExchangeMode || (() => setIsExchangeMode(true))}
                >
                  {hasExchangedThisTurn ? 'CAMBIATO' : 'CAMBIA'}
                </button>

                <button 
                  className="tactile-btn-mech tactile-btn-pass" 
                  disabled={turn !== 'player1' || isSelectingDiscard}
                  onClick={handlePassTurn}
                >
                  PASSA
                </button>
              </>
            )}
          </div>

          <div className="player-hp-dock-bottom">
            <div className="vital-telemetry-row">
              <span className="player-hp-3d">HP: {playerHp} <span>/ {maxPlayerHp} (L.{level})</span></span>
              {!isPvP && (
                <span style={{ color: '#f43f5e', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                  💔 {lives ?? 3}
                </span>
              )}
              <span className="timer-readout">⏳ {timer}s</span>
              <span className="tank-readout">🛢️️ +{playerTimeTank || 0}s</span>
              {isEtherAllowed && <span className="ether-status-text">🔮 {battleEther}/{maxBattleEther}</span>}
              <button className="tactile-aiuti-btn" onClick={toggleScanner}>
                📡 SCAN: {isScannerActive ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="hp-prismatic-dock">
              <div className="hp-segmented-grid"></div>
              <div
                className="player-hp-fill-3d"
                style={{ width: `${Math.max(0, Math.min(100, (playerHp / (maxPlayerHp || 1)) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
