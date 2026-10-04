import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';

// ============================================================================
// 1. DATABASE COMPLETO DELLE CARTE ARMA & LIVELLI
// ============================================================================
export const WEAPONS_DATABASE = Object.freeze([
  {
    id: 'wp_gatling',
    name: 'Gatling Cinetica',
    category: 'POKER RAPIDO',
    type: 'poker',
    rarity: 'common',
    color: '#00f2fe',
    glowColor: 'rgba(0, 242, 254, 0.85)',
    allowedPatterns: ['one_pair', 'two_pair'],
    reqDescription: 'COPPIA',
    fxType: 'gatling_rotary',
    levels: {
      1: { damage: 14, shots: 8 },
      2: { damage: 20, shots: 10 },
      3: { damage: 28, shots: 12 },
      4: { damage: 38, shots: 16 }
    }
  },
  {
    id: 'wp_xbow',
    name: 'Arco-X Balistico',
    category: 'POKER AVANZATO',
    type: 'poker',
    rarity: 'rare',
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.85)',
    allowedPatterns: ['three_of_a_kind', 'straight', 'flush'],
    reqDescription: 'TRIS / COLORE',
    fxType: 'plasma_arrow',
    levels: {
      1: { damage: 24, shots: 1 },
      2: { damage: 34, shots: 1 },
      3: { damage: 46, shots: 2 },
      4: { damage: 62, shots: 3 }
    }
  },
  {
    id: 'wp_thunderstrike',
    name: 'Fulmine a Ciel Sereno',
    category: 'CALCOLO TATTICO',
    type: 'math',
    mathOp: '+',
    rarity: 'common',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.85)',
    reqDescription: 'SOMMA [+]',
    fxType: 'branching_lightning',
    levels: {
      1: { damage: 18, bolts: 1 },
      2: { damage: 26, bolts: 2 },
      3: { damage: 36, bolts: 3 },
      4: { damage: 50, bolts: 5 }
    }
  },
  {
    id: 'wp_orbital_cannon',
    name: 'Raggio Orbitale',
    category: 'CALCOLO PESANTE',
    type: 'math',
    mathOp: '*',
    rarity: 'rare',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.85)',
    reqDescription: 'MOLTIPLICA [*]',
    fxType: 'singularity_beam',
    levels: {
      1: { damage: 26, bolts: 1 },
      2: { damage: 38, bolts: 1 },
      3: { damage: 52, bolts: 2 },
      4: { damage: 72, bolts: 2 }
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
  if (activeAnomaly?.id === 'hearts_res' && suit === 'hearts') return baseVal * 2;
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
      return uniqueVals[uniqueVals.length - 1] - uniqueVals[0] <= 4;
    }
    case 'flush': return new Set(nonJokers.map(c => getCardSuit(c))).size <= 1 && validCards.length >= 3;
    case 'full_house': return jokers >= 2 || ((freq[0] || 0) >= 3 && (freq[1] || 0) >= 2);
    case 'four_of_a_kind': return ((freq[0] || 0) + jokers) >= 4;
    default: return false;
  }
};

const getMatchingPermutation = (cards, op, target, tolerance, activeAnomaly) => {
  if (!cards || cards.length < 2) return null;
  if (op === '+' || op === '*') {
    const res = calculateExpressionResult(cards, op, activeAnomaly);
    if (!isNaN(res) && Math.abs(res - target) <= (tolerance + 1e-5)) return { result: res, cards };
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
    if (!isNaN(res) && Math.abs(res - target) <= (tolerance + 1e-5)) return { result: res, cards: p };
  }
  return null;
};

export const generateHardpointObjectives = (equippedWeapons, weaponsLevels, handCards = [], activeAnomaly = null) => {
  const validHand = (handCards || []).filter(c => c && !c.isJoker && (Number(c.value) || 0) > 0);

  return (equippedWeapons || []).slice(0, 4).map((wpId, idx) => {
    const baseWp = WEAPONS_DATABASE.find(w => w.id === wpId) || WEAPONS_DATABASE[idx] || WEAPONS_DATABASE[0];
    const currentLvl = weaponsLevels?.[baseWp.id] || 1;
    const stats = baseWp.levels?.[currentLvl] || baseWp.levels?.[1] || { damage: 15 };

    if (baseWp.type === 'poker') {
      return { ...baseWp, slotIndex: idx, level: currentLvl, damage: stats.damage };
    }

    const op = baseWp.mathOp || '+';
    let target = null;

    if (baseWp.id === 'wp_orbital_cannon' && validHand.length >= 2) {
      const v0 = getCardEffectiveValue(validHand[0], activeAnomaly);
      const v1 = getCardEffectiveValue(validHand[1], activeAnomaly);
      target = v0 * v1;
    } else if (validHand.length >= 2) {
      const vals = validHand.map(c => getCardEffectiveValue(c, activeAnomaly));
      const candidates = [];
      for (let i = 0; i < vals.length; i++) {
        for (let j = 0; j < vals.length; j++) {
          if (i === j) continue;
          const a = vals[i];
          const b = vals[j];
          if (op === '+') candidates.push(a + b);
          else if (op === '-' && a > b) candidates.push(a - b);
          else if (op === '*' && a * b <= 72) candidates.push(a * b);
          else if (op === '/' && b > 0 && a % b === 0 && a !== b) candidates.push(a / b);
        }
      }
      if (candidates.length > 0) target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (target === null) {
      target = op === '*' ? 24 : 14;
    }

    return { ...baseWp, slotIndex: idx, level: currentLvl, op, target, damage: stats.damage };
  });
};

// ============================================================================
// 3. COMPONENTE SPRITE A 2 LIVELLI (BASE IMMOBILE + BRACCIO BRANDIEGGIABILE)
// ============================================================================
function WeaponSlotVisual({ weapon, isSelected, isArmed, isEnemy = false }) {
  const isOrbital = weapon.id === 'wp_orbital_cannon';

  // Se non è il cannone orbitale o il nemico, mostra l'icona tattica dell'arma
  if (!isEnemy && !isOrbital) {
    return (
      <div style={{
        width: '46px',
        height: '62px',
        borderRadius: '6px',
        background: 'radial-gradient(circle, #1e293b 0%, #090d16 100%)',
        border: `1.5px solid ${weapon.color || '#00f2fe'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.4rem'
      }}>
        {weapon.fxType === 'gatling_rotary' ? '⚙️' : (weapon.fxType === 'plasma_arrow' ? '🏹' : '⚡')}
      </div>
    );
  }

  // File sorgente: il giocatore usa i due file separati in public/
  const baseSrc = isEnemy ? '/laserfronte.png' : '/laserbase.png';
  const armSrc = isEnemy ? '/laserfronte.png' : '/lasercannone.png';

  const armId = isEnemy ? 'turret-arm-enemy' : `turret-arm-player-${weapon.slotIndex}`;

  return (
    <div
      className={`turret-sprite-stage ${isArmed ? 'is-armed' : ''}`}
      style={{
        width: '58px',
        height: '80px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* LIVELLO 1: BASE E ZAMPE (IMMOBILI A TERRA A 0°) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            clipPath: isEnemy ? 'polygon(0% 46%, 100% 46%, 100% 100%, 0% 100%)' : 'none'
          }}
        >
          <img
            src={baseSrc}
            alt="Base Torretta"
            onError={(e) => {
              if (!e.target.dataset.tried) {
                e.target.dataset.tried = '1';
                e.target.src = isEnemy ? '/laserfronte.png' : '/laserretro.png';
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* LIVELLO 2: BRACCIO E CANNONE (RUOTA E RINCULA CON IL LASER) */}
        <div
          id={armId}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            willChange: 'transform',
            pointerEvents: 'none',
            // Perno di rotazione meccanico calibrato
            transformOrigin: isEnemy ? '50% 48%' : '50% 64%',
            clipPath: isEnemy ? 'polygon(0% 0%, 100% 0%, 100% 68%, 0% 68%)' : 'none'
          }}
        >
          <img
            src={armSrc}
            alt="Cannone Brandeggiabile"
            onError={(e) => {
              if (!e.target.dataset.tried) {
                e.target.dataset.tried = '1';
                // Fallback in caso di differente battitura del nome
                e.target.src = '/lasercannore.png';
              } else if (e.target.dataset.tried === '1') {
                e.target.dataset.tried = '2';
                e.target.src = isEnemy ? '/laserfronte.png' : '/laserretro.png';
              }
            }}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. STILI CSS INIETTATI
// ============================================================================
(function injectLaserSpriteStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-laser-sprite-battle-styles';
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
      z-index: 1000000;
      overflow: hidden;
    }
    .ballistics-spark {
      position: absolute;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      pointer-events: none;
      will-change: transform;
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
      transition: width 0.05s linear;
    }
    .battle-viewport-classic .player-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #064e3b 0%, #059669 35%, #10b981 75%, #6ee7b7 100%);
      box-shadow: 0 0 14px #10b981, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.05s linear;
    }
    .battle-viewport-classic .hp-prismatic-dock.bar-hit-flash {
      filter: brightness(2.6) contrast(1.4);
      box-shadow: 0 0 20px #ffffff, 0 0 28px #00f2fe !important;
    }
    .battle-viewport-classic .hp-prismatic-dock.bar-shiver {
      animation: barMicroShiver 0.08s ease-in-out infinite;
    }
    @keyframes barMicroShiver {
      0% { transform: translateY(0); }
      50% { transform: translateY(1.5px) translateX(-1px); }
      100% { transform: translateY(0); }
    }

    .turret-sprite-stage.is-armed {
      filter: drop-shadow(0 0 8px rgba(0, 242, 254, 0.45));
    }

    .battle-viewport-classic .trapezoid-ramp-hub {
      position: relative;
      width: 100%;
      min-height: 195px;
      height: 195px;
      perspective: 800px;
      transform-style: preserve-3d;
      padding: 16px 0.35rem 8px 0.35rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 25;
      margin-top: -4px;
      margin-bottom: 2px;
    }
    .battle-viewport-classic .trapezoid-ramp-surface {
      position: absolute;
      inset: -45px -80px -25px -80px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.88) 35%, rgba(2, 6, 23, 0.99) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.45);
      border-bottom: 2px solid rgba(0, 242, 254, 0.9);
      clip-path: polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%);
      transform: rotateX(34deg);
      transform-origin: 50% 100%;
      box-shadow: inset 0 0 35px rgba(0, 242, 254, 0.25), 0 14px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
    }
    .battle-viewport-classic .trapezoid-grid-lines {
      position: absolute;
      inset: 0;
      background: 
        linear-gradient(180deg, transparent 0%, rgba(0, 242, 254, 0.1) 50%, transparent 100%),
        linear-gradient(to bottom right, transparent 48%, rgba(0, 242, 254, 0.2) 50%, transparent 52%),
        linear-gradient(to bottom left, transparent 48%, rgba(0, 242, 254, 0.2) 50%, transparent 52%);
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
      padding: 0 4px;
      gap: 12px;
      margin-top: 5px;
    }
    .battle-viewport-classic .target-pedestal-station {
      width: 58px;
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
      transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    .battle-viewport-classic .target-pedestal-station.is-armed {
      transform: translateY(-14px) translateZ(16px) scale(1.10);
    }
    .battle-viewport-classic .target-pedestal-station.is-selected {
      transform: translateY(-7px) scale(1.04);
    }
    .battle-viewport-classic .target-pit-socket {
      width: 44px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #060e22 55%, #18243e 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.4);
      border-top: 1.8px solid rgba(255, 255, 255, 0.65);
      border-bottom: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scaleY(0.55);
      margin-top: 4px;
    }
    .battle-viewport-classic .pit-lens {
      width: 22px;
      height: 4px;
      border-radius: 50%;
      filter: blur(1px);
      background: currentColor;
    }

    .tactical-test-controls-bar {
      width: 100%;
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 4px;
      z-index: 40;
    }
    .tactical-test-btn {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.54rem;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      border: 1.5px solid;
      background: rgba(15, 23, 42, 0.9);
      transition: transform 0.1s ease;
    }
    .tactical-test-btn:active { transform: scale(0.95); }
    .tactical-test-btn.player-test {
      color: #38bdf8;
      border-color: #38bdf8;
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
    }
    .tactical-test-btn.enemy-test {
      color: #f43f5e;
      border-color: #f43f5e;
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.4);
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
    .battle-viewport-classic .card-num-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
      color: #ffffff;
    }
    .battle-viewport-classic .card-suit-label { font-size: 0.68rem; line-height: 1; font-weight: 900; }
    .battle-viewport-classic .card-effect-tag { font-family: 'Orbitron', sans-serif; font-size: 0.48rem; font-weight: 900; }
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
      transition: transform 0.08s ease;
    }
    .battle-viewport-classic .tactile-btn-mech:active { transform: translateY(5px); }
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
// 5. COMPONENTE PRINCIPALE SANDBOXBATTLEVIEW
// ============================================================================
export default function SandboxBattleView({
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
  const [selectedHardpointIdx, setSelectedHardpointIdx] = useState(3);
  const [firingSlotIdx, setFiringSlotIdx] = useState(null);
  const [isFiringSequence, setIsFiringSequence] = useState(false);

  const [hardpoints, setHardpoints] = useState(() =>
    generateHardpointObjectives(equippedWeapons, weaponsLevels, playerHand, activeAnomaly)
  );

  const prevTurnRef = useRef(turn);
  useEffect(() => {
    if (turn === 'player1' && prevTurnRef.current !== 'player1') {
      setSelectedIndices([]);
      setSelectedHardpointIdx(3);
      setHardpoints(generateHardpointObjectives(equippedWeapons, weaponsLevels, playerHand, activeAnomaly));
    } else if (turn !== 'player1') {
      setSelectedIndices([]);
    }
    prevTurnRef.current = turn;
  }, [turn, playerHand, equippedWeapons, weaponsLevels, activeAnomaly]);

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
    if (turn !== 'player1' || isFiringSequence) return;
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
    if (isFiringSequence) return;
    try { playSound('click'); } catch (_) {}
    setSelectedHardpointIdx(idx);
  };

  const selectedCardsList = useMemo(() => {
    return (selectedIndices || []).map(idx => playerHand?.[idx]).filter(Boolean);
  }, [selectedIndices, playerHand]);

  const smartTargetInfo = useMemo(() => {
    const currentObj = hardpoints?.[selectedHardpointIdx] || hardpoints?.[3] || hardpoints?.[0];
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
  const activeHp = hardpoints?.[resolvedHardpointIdx] || hardpoints?.[3] || hardpoints?.[0];

  const currentAttackDamage = pistonOverrideActive
    ? pistonOverrideDamage
    : (activeHp?.damage || 26);

  const cardsCount = selectedIndices?.length || 0;
  const isFireReady = Boolean(
    turn === 'player1' &&
    !isSelectingDiscard &&
    !isFiringSequence &&
    cardsCount >= 2 &&
    smartTargetInfo?.isExactMatch
  );

  // =========================================================================
  // MOTORE DI FUSIONE CON BRANDEGGIO DINAMICO DEL SOLO BRACCIO
  // =========================================================================
  const fireContinuousOrbitalLaser = (originSide = 'player', onComplete) => {
    const layer = document.getElementById('classic-projectiles-layer');
    const isPlayer = originSide === 'player';

    const targetHpDock = isPlayer
      ? document.getElementById('classicEnemyHpDock')
      : document.getElementById('classicPlayerHpDock');

    // Seleziona ESCLUSIVAMENTE il nodo del braccio/cannone mobile
    const armNode = document.getElementById(isPlayer ? 'turret-arm-player-3' : 'turret-arm-enemy');

    if (!layer || !targetHpDock || !armNode) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    if (isPlayer) {
      setFiringSlotIdx(3);
      setTimeout(() => setFiringSlotIdx(null), 500);
    }

    try { playSound('cannon_hit'); } catch (_) {}

    const hpRect = targetHpDock.getBoundingClientRect();
    const armRect = armNode.getBoundingClientRect();

    // Perno meccanico calibrato
    const pivotX = armRect.left + armRect.width * 0.5;
    const pivotY = isPlayer
      ? (armRect.top + armRect.height * 0.64)
      : (armRect.top + armRect.height * 0.48);

    // Lunghezza utile fino alla volata
    const barrelLength = isPlayer
      ? (armRect.height * 0.58)
      : (armRect.height * 0.26);

    const targetY = hpRect.top + hpRect.height / 2;

    const startHp = isPlayer ? aiHp : playerHp;
    const damage = 26;
    const targetHp = Math.max(0, startHp - damage);
    const totalMax = isPlayer ? (maxAiHp || 1) : (maxPlayerHp || 1);

    const startRatio = Math.max(0, Math.min(1, startHp / totalMax));
    const endRatio = Math.max(0, Math.min(1, targetHp / totalMax));

    const startCutX = hpRect.left + (hpRect.width * startRatio);
    const endCutX = hpRect.left + (hpRect.width * endRatio);

    const fillEl = isPlayer
      ? document.querySelector('.enemy-hp-fill-3d')
      : document.querySelector('.player-hp-fill-3d');

    const hpTextEl = isPlayer
      ? document.querySelector('.boss-hp-3d')
      : document.querySelector('.player-hp-3d');

    // FASCIO LASER LINEARE SOTTILE
    const svgBeam = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgBeam.style.position = 'fixed';
    svgBeam.style.inset = '0';
    svgBeam.style.width = '100vw';
    svgBeam.style.height = '100dvh';
    svgBeam.style.pointerEvents = 'none';
    svgBeam.style.zIndex = '1000000';
    layer.appendChild(svgBeam);

    // 1. Alone di plasma (8px compatto)
    const beamAura = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    beamAura.setAttribute('stroke', isPlayer ? '#00f2fe' : '#f43f5e');
    beamAura.setAttribute('stroke-width', '8');
    beamAura.setAttribute('stroke-linecap', 'round');
    beamAura.style.filter = `drop-shadow(0 0 8px ${isPlayer ? '#00f2fe' : '#f43f5e'})`;
    beamAura.style.opacity = '0.5';
    svgBeam.appendChild(beamAura);

    // 2. Fascio ionico principale (4px)
    const beamBody = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    beamBody.setAttribute('stroke', isPlayer ? '#38bdf8' : '#fb7185');
    beamBody.setAttribute('stroke-width', '4');
    beamBody.setAttribute('stroke-linecap', 'round');
    svgBeam.appendChild(beamBody);

    // 3. Anima incandescente (lama da 1.8px)
    const beamCore = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    beamCore.setAttribute('stroke', '#ffffff');
    beamCore.setAttribute('stroke-width', '1.8');
    beamCore.setAttribute('stroke-linecap', 'round');
    svgBeam.appendChild(beamCore);

    // Flash compatto alla bocca del cannone
    const muzzleFlash = document.createElement('div');
    muzzleFlash.style.position = 'absolute';
    muzzleFlash.style.width = '10px';
    muzzleFlash.style.height = '10px';
    muzzleFlash.style.marginLeft = '-5px';
    muzzleFlash.style.marginTop = '-5px';
    muzzleFlash.style.borderRadius = '50%';
    muzzleFlash.style.background = '#ffffff';
    muzzleFlash.style.boxShadow = `0 0 10px ${isPlayer ? '#00f2fe' : '#f43f5e'}`;
    muzzleFlash.style.pointerEvents = 'none';
    layer.appendChild(muzzleFlash);

    // Micro-torcia di fusione sulla barra di impatto
    const cutFlare = document.createElement('div');
    cutFlare.style.position = 'absolute';
    cutFlare.style.width = '12px';
    cutFlare.style.height = '12px';
    cutFlare.style.marginLeft = '-6px';
    cutFlare.style.marginTop = '-6px';
    cutFlare.style.borderRadius = '50%';
    cutFlare.style.background = '#ffffff';
    cutFlare.style.boxShadow = `0 0 12px ${isPlayer ? '#00f2fe' : '#f43f5e'}, 0 0 6px #ffffff`;
    cutFlare.style.pointerEvents = 'none';
    layer.appendChild(cutFlare);

    const duration = 1300;
    const startTime = performance.now();

    armNode.style.transition = 'none';

    const createSparks = (x, y, color) => {
      for (let s = 0; s < 4; s++) {
        const spark = document.createElement('div');
        spark.className = 'ballistics-spark';
        spark.style.left = `${x}px`;
        spark.style.top = `${y}px`;
        spark.style.backgroundColor = color;
        spark.style.boxShadow = `0 0 6px ${color}`;
        layer.appendChild(spark);

        const vx = (Math.random() - 0.5) * 70;
        const vy = (Math.random() - 0.5) * 50;
        spark.animate([
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${vx}px, ${vy}px) scale(0.1)`, opacity: 0 }
        ], { duration: 240, easing: 'ease-out', fill: 'forwards' }).onfinish = () => spark.remove();
      }
    };

    const animateAimAndCut = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const curCutX = startCutX + (endCutX - startCutX) * progress;
      const curHp = startHp - (startHp - targetHp) * progress;
      const curRatio = Math.max(0, Math.min(1, curHp / totalMax));

      // CALCOLO TRIGONOMETRICO ANGOLO DI PUNTAMENTO (BRANDEGGIO DEL SOLO BRACCIO)
      const dx = curCutX - pivotX;
      const dy = targetY - pivotY;

      // Rinculo idraulico all'indietro lungo l'asse della canna
      const recoilOffset = Math.sin(Math.min(1, progress * 4) * Math.PI) * 5;

      const theta = Math.atan2(dx, isPlayer ? -dy : dy);
      const angleDeg = theta * (180 / Math.PI);

      let muzzleX = 0;
      let muzzleY = 0;

      if (isPlayer) {
        const effLength = barrelLength - recoilOffset;
        muzzleX = pivotX + Math.sin(theta) * effLength;
        muzzleY = pivotY - Math.cos(theta) * effLength;

        // Ruota ESCLUSIVAMENTE il livello del braccio, la base con le zampe resta a 0°
        armNode.style.transform = `rotate(${angleDeg}deg) translateY(${recoilOffset}px)`;
      } else {
        const effLength = barrelLength - recoilOffset;
        muzzleX = pivotX + Math.sin(theta) * effLength;
        muzzleY = pivotY + Math.cos(theta) * effLength;

        armNode.style.transform = `rotate(${angleDeg}deg) translateY(${-recoilOffset}px)`;
      }

      // Aggiornamento coordinate fascio SVG millimetrico dalla volata al bersaglio
      beamAura.setAttribute('x1', muzzleX);
      beamAura.setAttribute('y1', muzzleY);
      beamAura.setAttribute('x2', curCutX);
      beamAura.setAttribute('y2', targetY);

      beamBody.setAttribute('x1', muzzleX);
      beamBody.setAttribute('y1', muzzleY);
      beamBody.setAttribute('x2', curCutX);
      beamBody.setAttribute('y2', targetY);

      beamCore.setAttribute('x1', muzzleX);
      beamCore.setAttribute('y1', muzzleY);
      beamCore.setAttribute('x2', curCutX);
      beamCore.setAttribute('y2', targetY);

      muzzleFlash.style.transform = `translate(${muzzleX}px, ${muzzleY}px)`;
      cutFlare.style.transform = `translate(${curCutX}px, ${targetY}px)`;

      // Aggiornamento progressivo barra HP
      if (fillEl) fillEl.style.width = `${curRatio * 100}%`;
      if (hpTextEl) {
        hpTextEl.innerHTML = isPlayer
          ? `${Math.round(curHp)} <span>/ ${totalMax} HP</span>`
          : `HP: ${Math.round(curHp)} <span>/ ${totalMax} (L.${level})</span>`;
      }

      if (Math.random() > 0.35) {
        createSparks(curCutX, targetY, isPlayer ? '#00f2fe' : '#fb7185');
      }

      targetHpDock.classList.add('bar-shiver');

      if (progress < 1) {
        requestAnimationFrame(animateAimAndCut);
      } else {
        // FINE SPARO: RITORNO ELASTICO DEL SOLO BRACCIO IN POSIZIONE CENTRALE
        armNode.style.transition = 'transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
        armNode.style.transform = 'rotate(0deg) translateY(0px)';

        targetHpDock.classList.remove('bar-shiver');
        targetHpDock.classList.add('bar-hit-flash');

        const blast = document.createElement('div');
        blast.style.position = 'absolute';
        blast.style.left = `${endCutX}px`;
        blast.style.top = `${targetY}px`;
        blast.style.width = '44px';
        blast.style.height = '44px';
        blast.style.marginLeft = '-22px';
        blast.style.marginTop = '-22px';
        blast.style.borderRadius = '50%';
        blast.style.background = `radial-gradient(circle, #ffffff 0%, ${isPlayer ? '#38bdf8' : '#f43f5e'} 60%, transparent 100%)`;
        blast.style.boxShadow = `0 0 24px ${isPlayer ? '#00f2fe' : '#f43f5e'}, 0 0 12px #ffffff`;
        blast.style.pointerEvents = 'none';
        layer.appendChild(blast);

        blast.animate([
          { transform: 'scale(0.3)', opacity: 1 },
          { transform: 'scale(1.8)', opacity: 0 }
        ], { duration: 280, easing: 'ease-out', fill: 'forwards' }).onfinish = () => blast.remove();

        createSparks(endCutX, targetY, '#ffffff');

        setTimeout(() => {
          svgBeam.remove();
          cutFlare.remove();
          muzzleFlash.remove();
          targetHpDock.classList.remove('bar-hit-flash');
          if (typeof onComplete === 'function') onComplete();
        }, 160);
      }
    };

    requestAnimationFrame(animateAimAndCut);
  };

  const handleAttackExecute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (turn !== 'player1' || isSelectingDiscard || !isFireReady || isFiringSequence) {
      try { playSound('deselect'); } catch (_) {}
      return;
    }

    setIsFiringSequence(true);

    const cardsUsed = (selectedIndices || []).map(i => playerHand?.[i]).filter(Boolean);
    const chosenIndices = [...selectedIndices];
    const chosenHp = activeHp;
    const chosenDamage = currentAttackDamage;

    fireContinuousOrbitalLaser('player', () => {
      setSelectedIndices([]);
      setIsFiringSequence(false);

      if (typeof onAttack === 'function') {
        onAttack({
          targetIndex: resolvedHardpointIdx,
          usedIndices: chosenIndices,
          resolvedObj: chosenHp,
          damage: chosenDamage,
          usedCards: cardsUsed
        });
      }
    });
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
              {aiTimeTank > 0 && <span className="tank-readout enemy-tank">🛢 +{aiTimeTank}s</span>}
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
          </div>

          {/* TORRETTA DIFENSIVA NEMICA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            position: 'relative',
            zIndex: 5,
            padding: '2px 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <WeaponSlotVisual
                weapon={{ id: 'wp_orbital_cannon', name: 'Raggio Orbitale Nemico', slotIndex: 'enemy', color: '#f43f5e' }}
                isSelected={false}
                isArmed={true}
                isEnemy={true}
              />
              <span style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: '0.48rem',
                fontWeight: 900,
                color: '#fda4af'
              }}>
                CANUS DIFENSIVO
              </span>
            </div>

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
                <span style={{ fontSize: '0.72rem', color: '#00f2fe', fontWeight: 900 }}>
                  {topPlayerDiscard ? `${topPlayerDiscard.symbol} ${topPlayerDiscard.displayVal || topPlayerDiscard.value}` : '---'}
                </span>
              </div>
              <div className="deck-count-badge" style={{ bottom: '-6px', right: '2px', borderColor: '#00f2fe', color: '#00f2fe' }}>
                {playerDiscard?.length || 0}
              </div>
            </div>

            {isTerrainAllowed && (
              <div className="terrains-horizontal-bank">
                {(playerTerrainSlots || []).slice(0, 4).map((slot, idx) => {
                  if (!slot?.card) return <div key={idx} className="terrain-empty-slot">VUOTO</div>;
                  return (
                    <div key={idx} className="terrain-horizontal-card">
                      <div className="terrain-card-inner">
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
        </div>

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

        {/* 3. RAMPA CENTRALE: LE 4 ARMI CON laserbase.png e lasercannone.png SULLO SLOT ORBITALE */}
        <div className="trapezoid-ramp-hub">
          <div className="trapezoid-ramp-surface">
            <div className="trapezoid-grid-lines"></div>
          </div>

          <div style={{ position: 'relative', zIndex: 5, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {/* PULSANTI TATTICI DI TEST RAPIDO */}
            <div className="tactical-test-controls-bar">
              <button
                type="button"
                className="tactical-test-btn player-test"
                disabled={isFiringSequence}
                onClick={() => {
                  setIsFiringSequence(true);
                  fireContinuousOrbitalLaser('player', () => setIsFiringSequence(false));
                }}
              >
                ⚡ TEST LASER MIO (Brandeggio)
              </button>
              <button
                type="button"
                className="tactical-test-btn enemy-test"
                disabled={isFiringSequence}
                onClick={() => {
                  setIsFiringSequence(true);
                  fireContinuousOrbitalLaser('enemy', () => setIsFiringSequence(false));
                }}
              >
                ⚡ TEST LASER NEMICO (Brandeggio)
              </button>
            </div>

            <div className="classic-targets-horizontal-row">
              {(hardpoints || []).map((hp, oIdx) => {
                const isSelected = selectedHardpointIdx === oIdx;
                const isArmed = smartTargetInfo?.isExactMatch && smartTargetInfo?.matchedIndex === oIdx;
                const isPattern = hp.type === 'poker';
                const themeColor = hp.color || '#00f2fe';

                return (
                  <div
                    key={hp.id + oIdx}
                    id={`weapon-slot-${oIdx}`}
                    className={`target-pedestal-station ${isSelected ? 'is-selected' : ''} ${isArmed ? 'is-armed' : ''}`}
                    onClick={() => handleSelectHardpoint(oIdx)}
                    style={{ color: themeColor }}
                  >
                    <div style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0 1px',
                      marginBottom: '1px'
                    }}>
                      <span style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '0.48rem',
                        fontWeight: 900,
                        color: '#f87171',
                        background: 'rgba(69, 10, 10, 0.75)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap'
                      }}>
                        ⚔️ -{hp.damage}
                      </span>
                      <span style={{
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: '0.46rem',
                        color: '#facc15',
                        fontWeight: 900
                      }}>
                        L.{hp.level}
                      </span>
                    </div>

                    <WeaponSlotVisual
                      weapon={hp}
                      isSelected={isSelected}
                      isArmed={isArmed}
                      isEnemy={false}
                    />

                    <div style={{
                      width: '100%',
                      fontFamily: 'Orbitron, sans-serif',
                      fontSize: isPattern ? '0.50rem' : '0.64rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      color: isArmed ? '#ffffff' : themeColor,
                      textShadow: isArmed ? `0 0 10px #ffffff, 0 0 14px ${themeColor}` : `0 0 8px ${themeColor}`,
                      background: isArmed ? `${themeColor}44` : 'rgba(0,0,0,0.65)',
                      border: `1px solid ${isArmed ? '#ffffff' : `${themeColor}66`}`,
                      borderRadius: '3px',
                      padding: '1px 2px',
                      lineHeight: 1.1,
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}>
                      {isPattern ? hp.reqDescription : `[${hp.op}] ${hp.target}`}
                    </div>

                    <div className="target-pit-socket">
                      <div className="pit-lens"></div>
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
                  if (!slot?.card) return <div key={idx} className="terrain-empty-slot">VUOTO</div>;
                  return (
                    <div 
                      key={idx} 
                      className="terrain-horizontal-card"
                      style={{ cursor: slot.canRearm ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (slot.canRearm && typeof handleRearmTerrainSlot === 'function') handleRearmTerrainSlot(idx);
                      }}
                    >
                      {slot.canRearm && <div className="terrain-rearm-tag">RIARMA</div>}
                      <div className="terrain-card-inner">
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
                    <ModuleIcon id={selectedAbility} size={28} color="#00f2fe" />
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
                    <TacticalVisual id={item1Id} type="epic_item" color="#00f2fe" width={28} height={28} />
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
                    <TacticalVisual id={item2Id} type="epic_item" color="#ef4444" width={28} height={28} />
                  </div>
                  <span className="equip-label-tag">{isItem2Used ? 'USATO' : (EPIC_META[item2Id]?.name || 'EPICO 2')}</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}
            </div>
          </div>

          {/* CLUSTER AZIONI */}
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
                  disabled={turn !== 'player1' || isSelectingDiscard || !isFireReady || isFiringSequence}
                  onClick={handleAttackExecute}
                >
                  FUOCO
                </button>

                <button
                  className="tactile-btn-mech tactile-btn-change"
                  style={{
                    opacity: (hasExchangedThisTurn || isExchangeBlockedByModifier || turn !== 'player1' || isSelectingDiscard || isFiringSequence) ? 0.45 : 1
                  }}
                  disabled={hasExchangedThisTurn || isExchangeBlockedByModifier || turn !== 'player1' || isSelectingDiscard || isFiringSequence}
                  onClick={handleOpenExchangeMode || (() => setIsExchangeMode(true))}
                >
                  {hasExchangedThisTurn ? 'CAMBIATO' : 'CAMBIA'}
                </button>

                <button 
                  className="tactile-btn-mech tactile-btn-pass" 
                  disabled={turn !== 'player1' || isSelectingDiscard || isFiringSequence}
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
              <span className="tank-readout">🛢 +{playerTimeTank || 0}s</span>
              {isEtherAllowed && <span className="ether-status-text">🔮 {battleEther}/{maxBattleEther}</span>}
              <button className="tactile-aiuti-btn" onClick={toggleScanner}>
                📡 SCAN: {isScannerActive ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="hp-prismatic-dock" id="classicPlayerHpDock">
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
