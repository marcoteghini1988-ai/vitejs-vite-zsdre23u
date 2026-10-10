import React, { useState, useEffect, useMemo, useRef } from 'react';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';
import { WEAPONS_DATABASE } from './weaponsSystem';




// ============================================================================
// MOTORE MATEMATICO, POKER & SCANNER INTERNO ALLA MODALITÀ CLASSICA
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
    case 'one_pair':
      return jokers >= 1 || (freq[0] || 0) >= 2;
    case 'two_pair':
      if (jokers >= 2) return true;
      if (jokers === 1) return (freq[0] || 0) >= 2;
      return (freq[0] || 0) >= 2 && (freq[1] || 0) >= 2;
    case 'three_of_a_kind':
      return ((freq[0] || 0) + jokers) >= 3;
    case 'straight': {
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const checkSpan = (vals) => (vals.length === 0 || vals[vals.length - 1] - vals[0] <= 4);
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    case 'flush':
      return new Set(nonJokerSuits).size <= 1;
    case 'full_house':
      if (jokers >= 2) return true;
      if (jokers === 1) return ((freq[0] || 0) >= 2 && (freq[1] || 0) >= 2) || ((freq[0] || 0) >= 3);
      return (freq[0] || 0) >= 3 && (freq[1] || 0) >= 2;
    case 'four_of_a_kind':
      return ((freq[0] || 0) + jokers) >= 4;
    case 'royal_flush': {
      if (new Set(nonJokerSuits).size > 1) return false;
      const uniqueVals = [...new Set(nonJokerVals)];
      if (uniqueVals.length + jokers < 5) return false;
      const checkSpan = (vals) => (vals.length === 0 || vals[vals.length - 1] - vals[0] <= 4);
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    default:
      return false;
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

const evaluateAllWeaponTriggers = (cards, weapon, activeAnomaly = null) => {
  const validCards = (cards || []).filter(Boolean);
  if (validCards.length < 2) return [];

  const found = [];

  if (weapon.slotType === 'poker' || weapon.type === 'poker') {
    const patternToCheck = weapon.pattern || weapon.allowedPatterns?.[0] || 'one_pair';
    const targetDef = CLASSIC_POKER_PATTERNS.find(p => p.id === patternToCheck) || CLASSIC_POKER_PATTERNS[0];
    const reqCount = targetDef.cardsCount || 2;

    if (reqCount === 2) {
      for (let i = 0; i < validCards.length; i++) {
        for (let j = i + 1; j < validCards.length; j++) {
          if (validateClassicPokerPattern([validCards[i], validCards[j]], patternToCheck)) {
            found.push([validCards[i], validCards[j]]);
          }
        }
      }
    } else if (reqCount === 3) {
      for (let i = 0; i < validCards.length; i++) {
        for (let j = i + 1; j < validCards.length; j++) {
          for (let k = j + 1; k < validCards.length; k++) {
            if (validateClassicPokerPattern([validCards[i], validCards[j], validCards[k]], patternToCheck)) {
              found.push([validCards[i], validCards[j], validCards[k]]);
            }
          }
        }
      }
    } else if (reqCount === 4) {
      for (let i = 0; i < validCards.length; i++) {
        for (let j = i + 1; j < validCards.length; j++) {
          for (let k = j + 1; k < validCards.length; k++) {
            for (let m = k + 1; m < validCards.length; m++) {
              if (validateClassicPokerPattern([validCards[i], validCards[j], validCards[k], validCards[m]], patternToCheck)) {
                found.push([validCards[i], validCards[j], validCards[k], validCards[m]]);
              }
            }
          }
        }
      }
    } else if (reqCount === 5 && validCards.length >= 5) {
      if (validateClassicPokerPattern(validCards.slice(0, 5), patternToCheck)) {
        found.push(validCards.slice(0, 5));
      }
    }
  } else if (weapon.slotType === 'math' || weapon.type === 'math') {
    const op = weapon.mathOp || '+';
    const target = weapon.target || 14;
    for (let i = 0; i < validCards.length; i++) {
      for (let j = 0; j < validCards.length; j++) {
        if (i === j) continue;
        const match = getMatchingPermutation([validCards[i], validCards[j]], op, target, 0, activeAnomaly);
        if (match) {
          found.push(match.cards);
        }
      }
    }
  }
  return found;
};

export const getClassicOpDamage = (op) => {
  switch (op) {
    case '/': return 20;
    case '*': return 16;
    case '-': return 12;
    case '+': default: return 10;
  }
};

export const generateClassicObjectives = (handCards = [], isBombAllowed = false, existingBomb = null) => {
  const validHand = (handCards || []).filter(c => c && !c.isJoker && (Number(c.value) || 0) > 0);
  
  let p1Op = '+';
  let p1Target = 14;
  if (validHand.length >= 2) {
    const vA = Number(validHand[0].value) || 7;
    const vB = Number(validHand[1].value) || 7;
    p1Target = vA + vB;
  } else {
    p1Target = Math.floor(Math.random() * 16) + 6;
  }

  const pedestal1 = {
    type: 'math',
    op: p1Op,
    target: p1Target,
    damage: 10,
    isBomb: false
  };

  const patternWeights = ['one_pair', 'one_pair', 'two_pair', 'two_pair', 'three_of_a_kind', 'straight', 'flush', 'full_house'];
  const chosenPatternId = patternWeights[Math.floor(Math.random() * patternWeights.length)];
  const pDef = CLASSIC_POKER_PATTERNS.find(p => p.id === chosenPatternId) || CLASSIC_POKER_PATTERNS[0];
  const pedestal2 = {
    type: 'pattern',
    patternId: pDef.id,
    name: pDef.name,
    cardsCount: pDef.cardsCount,
    damage: pDef.damage,
    isBomb: false
  };

  let pedestal3;
  if (isBombAllowed) {
    if (existingBomb && existingBomb.turnsRemaining > 0) {
      pedestal3 = existingBomb;
    } else {
      const bOp = Math.random() < 0.5 ? '*' : '/';
      const bTarget = bOp === '*' ? [24, 30, 36, 40][Math.floor(Math.random() * 4)] : [3, 4, 5][Math.floor(Math.random() * 3)];
      pedestal3 = {
        type: 'math',
        op: bOp,
        target: bTarget,
        damage: 30,
        turnsRemaining: 3,
        isBomb: true
      };
    }
  } else {
    let p3Op = '*';
    let p3Target = 24;
    if (validHand.length >= 2) {
      const vA = Number(validHand[0].value) || 3;
      const vB = Number(validHand[1].value) || 4;
      if (vA * vB <= 60) {
        p3Target = vA * vB;
      }
    }
    pedestal3 = {
      type: 'math',
      op: p3Op,
      target: p3Target,
      damage: 16,
      isBomb: false
    };
  }

  return [pedestal1, pedestal2, pedestal3];
};

export const calculateAiTurnClassic = (aiHand, objectives, activeAnomaly = null) => {
  if (!aiHand || aiHand.length === 0 || !objectives || objectives.length === 0) {
    return { found: false, shouldExchange: false };
  }

  for (let o = 0; o < objectives.length; o++) {
    const obj = objectives[o];
    if (obj.type === 'pattern') {
      const count = obj.cardsCount || 2;
      if (aiHand.length >= count) {
        for (let i = 0; i < aiHand.length; i++) {
          for (let j = i + 1; j < aiHand.length; j++) {
            if (count === 2 && validateClassicPokerPattern([aiHand[i], aiHand[j]], obj.patternId)) {
              return { found: true, objectiveIndex: o, cardIndices: [i, j], cardsUsed: [aiHand[i], aiHand[j]], resolvedObj: obj };
            }
          }
        }
      }
      continue;
    }

    const { op, target } = obj;
    if (activeAnomaly?.blockedOp === op) continue;

    for (let i = 0; i < aiHand.length; i++) {
      for (let j = 0; j < aiHand.length; j++) {
        if (i === j) continue;
        const c1 = aiHand[i], c2 = aiHand[j];
        if (!c1 || !c2) continue;
        const res = calculateExpressionResult([c1, c2], op, activeAnomaly);
        if (!isNaN(res) && Math.abs(res - target) < 1e-5) {
          return { found: true, objectiveIndex: o, cardIndices: [i, j], cardsUsed: [c1, c2], op, target, resolvedObj: obj };
        }
      }
    }
  }

  return { found: false, shouldExchange: Math.random() > 0.4 };
};

// ============================================================================
// STILI 3D DEDICATI ALLA MODALITÀ CLASSICA
// ============================================================================

(function injectClassic3DStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-classic-3d-styles';
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

    .guided-hud-floating-strip {
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 420px;
      width: 92%;
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 100%);
      border: 1.5px solid #facc15;
      border-radius: 8px;
      padding: 6px 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 0 20px rgba(250, 204, 21, 0.65), 0 8px 24px rgba(0, 0, 0, 0.9);
      z-index: 25000;
      pointer-events: none;
      animation: hudStripSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .guided-hud-badge {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      color: #facc15;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .guided-hud-text {
      font-size: 0.72rem;
      font-weight: 700;
      color: #ffffff;
      margin-top: 2px;
      line-height: 1.25;
    }
    @keyframes hudStripSlideDown {
      0% { opacity: 0; transform: translate(-50%, -15px); }
      100% { opacity: 1; transform: translate(-50%, 0); }
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

    .battle-viewport-classic .boss-hp-3d span {
      font-size: 0.62rem;
      color: #fda4af;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
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
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .battle-viewport-classic .malus-gauge-box.warning-active {
      animation: malusBoxPulse var(--pulse-speed, 1s) infinite alternate ease-in-out;
    }

    @keyframes malusBoxPulse {
      0% {
        border-color: rgba(244, 63, 94, 0.4);
        box-shadow: inset 0 1px 4px #000, 0 0 4px rgba(244, 63, 94, 0.2);
      }
      100% {
        border-color: #ff0055;
        box-shadow: inset 0 1px 4px #000, 0 0 14px rgba(255, 0, 85, 0.85);
      }
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
      transition: all 0.2s;
    }

    .battle-viewport-classic .malus-pip-cell.filled {
      background: #f43f5e;
      box-shadow: 0 0 6px #f43f5e;
    }

    .battle-viewport-classic .malus-detonation-ring {
      position: absolute;
      inset: -6px;
      border-radius: 8px;
      border: 2px solid #ff0055;
      pointer-events: none;
      animation: malusExplodeRing 0.75s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      z-index: 10;
    }

    @keyframes malusExplodeRing {
      0% { transform: scale(0.95); opacity: 1; border-color: #ffffff; }
      50% { border-color: #ff0055; }
      100% { transform: scale(1.45); opacity: 0; }
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
      transition: transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-classic .equip-stationary-art {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      font-size: 1.5rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
      z-index: 6;
      transform-style: preserve-3d;
      transform-origin: 50% 90%;
      animation: standUpBobbing3D 2.8s infinite ease-in-out;
    }

    @keyframes standUpBobbing3D {
      0%, 100% { transform: rotateX(-30deg) translateZ(12px) translateY(0px); }
      50% { transform: rotateX(-34deg) translateZ(24px) translateY(-6px) scale(1.1); }
    }

    .battle-viewport-classic .equip-label-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-top: 1px;
      margin-bottom: 2px;
      line-height: 1;
      white-space: nowrap;
      text-transform: uppercase;
      z-index: 4;
    }

    .battle-viewport-classic .equip-pit-base {
      width: 44px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 45%, #18243e 0%, #060e22 55%, #010308 100%);
      border: 1.5px solid;
      border-top: 1.8px solid rgba(255, 255, 255, 0.65);
      border-bottom: 2px solid #000;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 2px 3px rgba(255, 255, 255, 0.25), inset 0 -2px 4px #000, 0 0 10px currentColor;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scaleY(0.55);
      position: relative;
      z-index: 2;
    }

    .battle-viewport-classic .equip-pit-lens {
      width: 22px;
      height: 4px;
      border-radius: 50%;
      filter: blur(1px);
      background: currentColor;
      opacity: 0.85;
    }

    .battle-viewport-classic .station-dice { color: #00f2fe; }
    .battle-viewport-classic .station-dice .equip-pit-base { border-color: #00f2fe; }
    .battle-viewport-classic .station-dice .equip-label-tag { color: #38bdf8; }

    .battle-viewport-classic .station-dice.dice-is-ready {
      color: #facc15;
      filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-classic .station-module { color: #10b981; }
    .battle-viewport-classic .station-module .equip-pit-base { border-color: #10b981; }
    .battle-viewport-classic .station-module .equip-label-tag { color: #34d399; }

    .battle-viewport-classic .station-module.is-overcharged {
      color: #00f2fe;
      filter: drop-shadow(0 0 12px rgba(0, 242, 254, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-classic .module-beacon-beam {
      position: absolute;
      bottom: 6px;
      width: 30px;
      height: 75px;
      background: linear-gradient(180deg, transparent 0%, rgba(0, 242, 254, 0.45) 60%, rgba(255, 255, 255, 0.8) 100%);
      clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
      pointer-events: none;
      z-index: 3;
      filter: blur(1.5px);
    }

    .battle-viewport-classic .station-enemy-dice { color: #f43f5e; }
    .battle-viewport-classic .station-enemy-dice .equip-pit-base { border-color: #f43f5e; }
    .battle-viewport-classic .station-enemy-dice .equip-label-tag { color: #fca5a5; }

    .battle-viewport-classic .station-enemy-module { color: #00f2fe; }
    .battle-viewport-classic .station-enemy-module .equip-pit-base { border-color: #00f2fe; }
    .battle-viewport-classic .station-enemy-module .equip-label-tag { color: #7dd3fc; }

    .battle-viewport-classic .station-mobius { color: #facc15; }
    .battle-viewport-classic .station-mobius .equip-pit-base { border-color: #facc15; }
    .battle-viewport-classic .station-mobius .equip-label-tag { color: #fde047; }

    .battle-viewport-classic .station-piston { color: #ef4444; }
    .battle-viewport-classic .station-piston .equip-pit-base { border-color: #ef4444; }
    .battle-viewport-classic .station-piston .equip-label-tag { color: #f87171; }

    .battle-viewport-classic .equip-pedestal-station.item-usable {
      cursor: pointer !important;
      filter: drop-shadow(0 0 10px currentColor);
    }
    .battle-viewport-classic .equip-pedestal-station.item-exhausted {
      opacity: 0.35;
      filter: grayscale(0.9);
      cursor: not-allowed !important;
    }

    /* EFFETTO CONGELAMENTO ARMI IN RAFFREDDAMENTO */
    .weapon-frozen-card {
      position: relative;
      overflow: hidden;
      filter: brightness(0.85) contrast(1.1) !important;
      border: 1.5px solid #38bdf8 !important;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.65), inset 0 0 8px rgba(56, 189, 248, 0.4) !important;
    }

    .weapon-ice-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.6) 0%, rgba(224, 242, 254, 0.35) 50%, rgba(2, 132, 199, 0.5) 100%);
      backdrop-filter: blur(1.5px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 15;
      pointer-events: none;
      animation: iceShimmer 1.8s infinite alternate ease-in-out;
    }

    .weapon-ice-badge {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.5rem;
      font-weight: 900;
      color: #ffffff;
      background: rgba(2, 6, 23, 0.85);
      border: 1px solid #38bdf8;
      border-radius: 4px;
      padding: 1px 3px;
      box-shadow: 0 0 8px #38bdf8;
      letter-spacing: 0.5px;
      line-height: 1;
      margin-top: 1px;
    }

    @keyframes iceShimmer {
      0% { opacity: 0.8; box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.4); }
      100% { opacity: 1; box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.85), 0 0 12px #38bdf8; }
    }

    /* DRAG & DROP EVIDENZIAZIONE SLOT BANCO */
    .table-slot-drag-hover {
      border: 2px solid #fde047 !important;
      background: rgba(250, 204, 21, 0.25) !important;
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.85) !important;
      transform: scale(1.08) !important;
    }


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

    .battle-viewport-classic .enemy-deck-theme .deck-cards-stack-body {
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #fecaca 0px, #fecaca 1.2px, #1c050d 1.2px, #1c050d 2.6px);
      border-color: rgba(244, 63, 94, 0.5);
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

    .battle-viewport-classic .card-deck-stack-block.enemy-deck-theme .card-deck-top {
      background: linear-gradient(150deg, #3d1020 0%, #1c050d 55%, #0d0206 100%);
      border-color: #f43f5e;
      border-top-color: #ffe4e6;
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
      transform: rotateY(0deg);
    }
    .battle-viewport-classic .terrain-face-back.enemy-border { border-color: rgba(244, 63, 94, 0.45); }

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

    .battle-viewport-classic .enemy-action-ticker {
      position: absolute;
      top: 145px;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      margin: 0;
      background: linear-gradient(90deg, rgba(220, 38, 38, 0.3) 0%, rgba(69, 10, 10, 0.85) 50%, rgba(220, 38, 38, 0.3) 100%);
      border: 1.5px dashed rgba(244, 63, 94, 0.8);
      border-radius: 6px;
      padding: 3px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.62rem;
      font-weight: 800;
      color: #fecaca;
      text-shadow: 0 0 8px rgba(244, 63, 94, 0.8);
      animation: tickerPulse 1s infinite alternate ease-in-out;
      z-index: 40;
      pointer-events: none;
    }

    @keyframes tickerPulse {
      0% { box-shadow: 0 0 6px rgba(244, 63, 94, 0.3); transform: scale(0.99); }
      100% { box-shadow: 0 0 16px rgba(244, 63, 94, 0.7); transform: scale(1.01); }
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95);
      z-index: 10;
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s, border-color 0.2s;
    }

    .battle-viewport-classic .enemy-pedestal-base {
      width: 56px;
      height: 14px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #15060c 55%, #2a0b16 100%);
      border: 1.5px solid rgba(244, 63, 94, 0.55);
      transition: transform 0.22s, box-shadow 0.2s;
    }

    .battle-viewport-classic .enemy-card-pod.is-selected .enemy-hologram-back {
      transform: translateY(-16px) translateZ(20px) scale(1.12);
      border-color: #ffffff;
      box-shadow: 0 0 24px rgba(244, 63, 94, 0.95), 0 0 10px #ffffff;
    }
    .battle-viewport-classic .enemy-card-pod.is-selected .enemy-pedestal-base {
      transform: scaleX(1.35) scaleY(1.3);
      border-color: #ffffff;
      box-shadow: 0 0 16px #f43f5e, 0 0 26px rgba(244, 63, 94, 0.7);
    }

    .battle-viewport-classic .enemy-card-pod.is-attacking .enemy-hologram-back {
      transform: translateY(22px) translateZ(35px) scale(1.22);
      border-color: #fef08a;
      background: linear-gradient(155deg, #7f1d1d 0%, #450a0a 100%);
      box-shadow: 0 0 30px #ef4444, 0 0 50px #ff0055;
      animation: enemyLunge 0.35s ease-in-out;
    }

    @keyframes enemyLunge {
      0% { transform: translateY(-12px) scale(1.05); }
      50% { transform: translateY(26px) scale(1.3); }
      100% { transform: translateY(20px) scale(1.22); }
    }

    .battle-viewport-classic .enemy-card-pod.is-discarding .enemy-hologram-back {
      transform: translateY(-24px) scale(0.65);
      opacity: 0.25;
      border-color: #64748b;
      transition: all 0.4s ease-out;
    }

    .battle-viewport-classic .trapezoid-ramp-hub {
      position: relative;
      width: 100%;
      perspective: 750px;
      transform-style: preserve-3d;
      padding: 30px 0.55rem 6px 0.55rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 25;
      margin-top: -8px;
      top: 14px;
    }

    .battle-viewport-classic .trapezoid-ramp-surface {
      position: absolute;
      inset: -78px -82px -68px -82px;

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

    .battle-viewport-classic .player-cards-section {
      position: relative;
      z-index: 35;
      transform: translateZ(40px);
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
      margin: auto 0;
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
      animation: discardPulseBanner 0.9s infinite alternate;
      z-index: 50;
    }

    @keyframes discardPulseBanner {
      0% { transform: scale(0.98); box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
      100% { transform: scale(1.02); box-shadow: 0 0 22px rgba(239, 68, 68, 1); }
    }

    .battle-viewport-classic .wall-hand-rack.player-side {
      transform: translateZ(45px);
      z-index: 45;
      margin: 0;
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
      transform: translateY(0);
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease, border-color 0.2s ease;
      transform-style: preserve-3d;
    }

    .battle-viewport-classic .tactile-card-body.suggested {
      border: 2px solid #10b981 !important;
      box-shadow: 0 0 22px rgba(16, 185, 129, 0.95), inset 0 0 10px rgba(52, 211, 153, 0.6) !important;
      animation: cardSuggestPulse 0.9s infinite alternate ease-in-out;
    }

    @keyframes cardSuggestPulse {
      0% { transform: translateY(0); box-shadow: 0 0 10px #10b981; }
      100% { transform: translateY(-6px); box-shadow: 0 0 24px #10b981, 0 0 35px #34d399; }
    }

    .battle-viewport-classic .tactile-card-body.discard-mode {
      border: 2px dashed #ef4444 !important;
      box-shadow: 0 0 14px rgba(239, 68, 68, 0.85) !important;
      animation: cardDiscardShake 0.85s infinite alternate ease-in-out;
    }

    @keyframes cardDiscardShake {
      0% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-3px) rotate(-1deg); }
      100% { transform: translateY(0) rotate(1deg); }
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
      transform-origin: 50% 50%;
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
    .battle-viewport-classic .card-hearts .card-pit-base { border-color: rgba(244, 63, 94, 0.45); color: #f43f5e; }
    .battle-viewport-classic .card-hearts .card-pit-lens { background: #f43f5e; }

    .battle-viewport-classic .card-diamonds .tactile-card-body { border-color: rgba(0, 242, 254, 0.45); }
    .battle-viewport-classic .card-diamonds .card-suit-label { color: #00f2fe; }
    .battle-viewport-classic .card-diamonds .card-num-3d { text-shadow: 0 0 14px #00f2fe; }
    .battle-viewport-classic .card-diamonds .card-pit-base { border-color: rgba(0, 242, 254, 0.45); color: #00f2fe; }
    .battle-viewport-classic .card-diamonds .card-pit-lens { background: #00f2fe; }

    .battle-viewport-classic .card-spades .tactile-card-body { border-color: rgba(192, 132, 252, 0.45); }
    .battle-viewport-classic .card-spades .card-suit-label { color: #c084fc; }
    .battle-viewport-classic .card-spades .card-num-3d { text-shadow: 0 0 14px #c084fc; }
    .battle-viewport-classic .card-spades .card-pit-base { border-color: rgba(192, 132, 252, 0.45); color: #c084fc; }
    .battle-viewport-classic .card-spades .card-pit-lens { background: #c084fc; }

    .battle-viewport-classic .card-clubs .tactile-card-body { border-color: rgba(16, 185, 129, 0.45); }
    .battle-viewport-classic .card-clubs .card-suit-label { color: #10b981; }
    .battle-viewport-classic .card-clubs .card-num-3d { text-shadow: 0 0 14px #10b981; }
    .battle-viewport-classic .card-clubs .card-pit-base { border-color: rgba(16, 185, 129, 0.45); color: #10b981; }
    .battle-viewport-classic .card-clubs .card-pit-lens { background: #10b981; }

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
      background: transparent;
      border: none;
      box-shadow: none;
      transform-style: preserve-3d;
    }

    .guided-hand-beacon,
    .guided-hand-beacon * {
      pointer-events: none !important;
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
      transition: transform 0.08s cubic-bezier(0.2, 0.8, 0.4, 1), box-shadow 0.08s cubic-bezier(0.2, 0.8, 0.4, 1);
      transform: translateY(0);
      border: 1.5px solid;
      border-top: 2px solid rgba(255, 255, 255, 0.85);
      border-bottom: 2px solid #000;
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
      box-shadow: 0 5px 0 #180306, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }
    
    .battle-viewport-classic .tactile-btn-attack {
      flex: 2;
      background: linear-gradient(180deg, #10b981 0%, #059669 45%, #064e3b 100%);
      border-color: #34d399;
      border-top: 2px solid #a7f3d0;
      color: #ffffff;
      box-shadow: 0 5px 0 #064e3b, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }
    .battle-viewport-classic .tactile-btn-attack:disabled {
      background: linear-gradient(180deg, #334155 0%, #1e293b 45%, #0f172a 100%);
      border-color: #475569;
      border-top: 2px solid #64748b;
      color: #94a3b8;
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: 0 4px 0 #090e17, 0 6px 0 #000;
    }

    .battle-viewport-classic .tactile-btn-deck {
      flex: 0.9;
      background: linear-gradient(180deg, #7e22ce 0%, #3b0764 45%, #140224 100%);
      border-color: #a855f7;
      border-top: 2px solid #f3e8ff;
      color: #ffffff;
      box-shadow: 0 5px 0 #120321, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-classic .tactile-btn-change {
      flex: 0.9;
      background: linear-gradient(180deg, #ca8a04 0%, #713f12 45%, #231203 100%);
      border-color: #eab308;
      border-top: 2px solid #fef08a;
      color: #ffffff;
      box-shadow: 0 5px 0 #1c1102, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

        .battle-viewport-classic .tactile-btn-pass {
      flex: 0.8;
      background: linear-gradient(180deg, #475569 0%, #1e293b 45%, #080c14 100%);
      border-color: #64748b;
      border-top: 2px solid #e2e8f0;
      color: #ffffff;
      box-shadow: 0 5px 0 #080c14, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }
    .battle-viewport-classic .tactile-btn-pass:disabled {
      background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
      border-color: #334155;
      border-top: 2px solid #475569;
      color: #64748b;
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: 0 3px 0 #080c14;
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

    .battle-viewport-classic .player-hp-3d span {
      font-size: 0.62rem;
      color: #6ee7b7;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
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

    @keyframes classicCinematicIntro {
      0% { opacity: 0; transform: scale(0.35); filter: blur(10px); }
      22% { opacity: 1; transform: scale(1.08); filter: blur(0px); }
      75% { opacity: 1; transform: scale(1.2); filter: blur(0px); }
      100% { opacity: 0; transform: scale(1.48); filter: blur(12px); }
    }

    .classic-cinematic-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 150;
      animation: classicCinematicIntro 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .classic-cinematic-sub {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 900;
      color: #facc15;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 12px #facc15, 0 0 25px rgba(250, 204, 21, 0.7);
      margin-bottom: 6px;
    }

    .classic-cinematic-main {
      font-family: 'Orbitron', sans-serif;
      font-size: 2.1rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
      text-shadow: 0 0 20px #00f2fe, 0 0 45px rgba(0, 242, 254, 0.85), 0 0 70px #38bdf8;
    }

    @keyframes handBounceClassic {
      0%, 100% { transform: translateX(-50%) translateZ(160px) translateY(0) scale(1); }
      50% { transform: translateX(-50%) translateZ(180px) translateY(-8px) scale(1.15); }
    }

    @keyframes handPulseGlowClassic {
      0% { filter: drop-shadow(0 0 8px #00f2fe); }
      50% { filter: drop-shadow(0 0 18px #fde047); }
      100% { filter: drop-shadow(0 0 8px #00f2fe); }
    }

    .guided-hand-beacon {
      position: absolute;
      z-index: 99999 !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      transform-style: preserve-3d;
      will-change: transform;
      animation: handBounceClassic 1.1s infinite ease-in-out;
    }

    .guided-hand-beacon.point-down {
      bottom: 112%;
      left: 50%;
      transform: translateX(-50%) translateZ(160px);
    }

    .guided-hand-beacon.point-up {
      top: 112%;
      left: 50%;
      transform: translateX(-50%) translateZ(160px);
    }

    .guided-hand-icon {
      font-size: 1.8rem;
      line-height: 1;
      filter: drop-shadow(0 0 12px #facc15);
      animation: handPulseGlowClassic 1.4s infinite alternate;
    }

    .guided-tooltip-bubble {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.99));
      border: 1.5px solid #facc15;
      box-shadow: 0 0 16px rgba(250, 204, 21, 0.8), 0 4px 14px rgba(0, 0, 0, 0.95);
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.6rem;
      font-weight: 900;
      white-space: nowrap;
      margin-bottom: 2px;
      text-shadow: 0 0 8px rgba(0,0,0,0.9);
      letter-spacing: 0.5px;
    }

    .guided-pulse-target {
      outline: 2px dashed #fde047 !important;
      outline-offset: 3px;
      border-radius: 6px;
      animation: guidedTargetPulseClassic 0.9s infinite alternate ease-in-out !important;
    }

    @keyframes guidedTargetPulseClassic {
      0% { outline-color: #00f2fe; box-shadow: 0 0 8px #00f2fe; }
      100% { outline-color: #facc15; box-shadow: 0 0 20px #facc15; }
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

export default function ClassicBattleView({
  tableSlots = [null, null, null, null, null],
  setTableSlots,
  setPlayerHand,
  setPlayerDiscard,
  equippedWeapons = ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],



  weaponsLevels = { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 },
  riftState,
  objectives: externalObjectives,
  setObjectives: setExternalObjectives,
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
  handleCancelExchangeMode,
  selectedExchangeIndices,
  confirmCardExchange,
  setShowAbandonConfirm,
  setShowDeckExtractModal,
  isSelectingDiscard,
  hasExchangedThisTurn,
  downtimeExchangesLeft = 2,
  weaponTanks = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 },
  setWeaponTanks,
  aiWeaponTanks = { spades: 0, hearts: 0, diamonds: 0, clubs: 0 },
  isExchangeBlockedByModifier,
  turn,
  isBombAllowed = false,
  t
}) {
        const [scale, setScale] = useState(1);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [selectedHardpointIndex, setSelectedHardpointIndex] = useState(0);
  const [cardsPlayedThisTurn, setCardsPlayedThisTurn] = useState(0);
  const cardsPlayedThisTurnRef = useRef(0);
  const [selectedHandToReplaceIdx, setSelectedHandToReplaceIdx] = useState(null);

  useEffect(() => {
    if (turn === 'player1') {
      setCardsPlayedThisTurn(0);
      cardsPlayedThisTurnRef.current = 0;
      setSelectedHandToReplaceIdx(null);
    }
  }, [turn]);

  const currentGlobalSector = isAdv ? ((currentAdvPlanet - 1) * 10 + currentAdvLevel) : 100;
  const isSlot2Unlocked = !isAdv || isPvP || currentGlobalSector >= 6;
  const isSlot4Unlocked = !isAdv || isPvP || currentGlobalSector >= 6;

  const [draggedCardHandIdx, setDraggedCardHandIdx] = useState(null);
  const [hoveredSlotIdx, setHoveredSlotIdx] = useState(null);

    const [weaponHeatState, setWeaponHeatState] = useState({});


  const prevTurnHeatRef = useRef(turn);
  useEffect(() => {
    if (turn === 'player1' && prevTurnHeatRef.current !== 'player1') {
      setWeaponHeatState(prevHeat => {
        const next = { ...prevHeat };
        let changed = false;
        Object.keys(next).forEach(wId => {
          if (next[wId] && next[wId].cooldownTurns > 0) {
            const rem = next[wId].cooldownTurns - 1;
            next[wId] = { ...next[wId], cooldownTurns: rem, shotsFired: rem === 0 ? 0 : next[wId].shotsFired };
            changed = true;
          }
        });
        return changed ? next : prevHeat;
      });
    }
    prevTurnHeatRef.current = turn;
  }, [turn]);

    // STATO TRASCINAMENTO CON REF PER EVITARE RITARDI DI CHIUSURA (Touch & Mouse)
  const [activeDrag, setActiveDrag] = useState(null);
  const activeDragRef = useRef(null);

  // Rileva lo slot corretto calcolando la distanza sia dal dito sia dalla carta visiva sollevata
  const findSlotAt = (touchX, touchY) => {
    if (typeof document === 'undefined') return null;
    const slotElements = document.querySelectorAll('[data-table-slot]');
    if (!slotElements || slotElements.length === 0) return null;

    let bestSlot = null;
    let minDistance = Infinity;

    // Poiché la carta visiva fluttua 45px sopra il dito, testiamo sia il dito che il centro della carta
    const testPoints = [
      { x: touchX, y: touchY },
      { x: touchX, y: touchY - 45 }
    ];

    for (let i = 0; i < slotElements.length; i++) {
      const el = slotElements[i];
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      for (const pt of testPoints) {
        const dx = pt.x - centerX;
        const dy = pt.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Raggio di aggancio generoso di 80px
        if (dist < 80 && dist < minDistance) {
          minDistance = dist;
          bestSlot = Number(el.getAttribute('data-table-slot'));
        }
      }
    }
    return bestSlot;
  };

  // Esecuzione posizionamento carta su slot (con protezione anti-sparizione)
  const executePlaceCardOnSlot = (cardToPlace, targetSlotIdx) => {
    if (!cardToPlace || targetSlotIdx === null || targetSlotIdx < 0 || targetSlotIdx > 4) return;
    if (cardsPlayedThisTurnRef.current >= 3) return;

    setTableSlots(prevTable => {
      let finalSlot = targetSlotIdx;
      const hasEmptySlots = prevTable.some(s => s === null);

      // Protezione: se ci sono posti vuoti sul tavolo, non sovrascrivere una carta esistente!
      if (hasEmptySlots && prevTable[finalSlot] !== null) {
        const firstEmpty = prevTable.findIndex(s => s === null);
        if (firstEmpty !== -1) finalSlot = firstEmpty;
      }

      const oldCard = prevTable[finalSlot];

            // Sostituzione vera: scatta SOLO quando il tavolo è al completo (5/5)
      if (oldCard !== null && oldCard !== undefined) {
        if (typeof setPlayerDiscard === 'function') {
          setPlayerDiscard(prevDisc => [...prevDisc, oldCard]);
        }
        const oldSuit = getCardSuit(oldCard);
        const oldVal = Number(oldCard.value) || 0;
        if (oldSuit && typeof setWeaponTanks === 'function') {
          setWeaponTanks(prevTanks => {
            const wpForSuit = resolvedWeapons.find(w => w.suit === oldSuit);
            const cap = wpForSuit ? (wpForSuit.maxCapacity || wpForSuit.maxSalvo || 10) : 10;
            const curVal = prevTanks[oldSuit] || 0;
            return {
              ...prevTanks,
              [oldSuit]: Math.min(cap, curVal + oldVal)
            };
          });
        }
      }

      const nextTable = [...prevTable];
      nextTable[finalSlot] = cardToPlace;
      return nextTable;
    });

    setCardsPlayedThisTurn(prev => {
      const next = prev + 1;
      cardsPlayedThisTurnRef.current = next;
      return next;
    });

    // Rimuove SOLO la singola istanza calata, senza cancellare eventuali carte doppie in mano
    if (typeof setPlayerHand === 'function') {
      setPlayerHand(prevHand => {
        const idxToRemove = prevHand.findIndex(c => c === cardToPlace || (c && c.id === cardToPlace.id));
        if (idxToRemove === -1) return prevHand;
        const next = [...prevHand];
        next.splice(idxToRemove, 1);
        return next;
      });
    }


    try { playSound('card_slide'); } catch (_) {}
  };

  // Inizio trascinamento (Mouse o Dito Touch)
  const handleCardPointerDown = (e, handIdx) => {
    if (turn !== 'player1' || isSelectingDiscard || isExchangeMode) return;
    if (cardsPlayedThisTurnRef.current >= 3) {
      try { playSound('deselect'); } catch (_) {}
      return;
    }

    const card = playerHand?.[handIdx];
    if (!card) return;

    try { playSound('select'); } catch (_) {}

    const dragData = {
      card,
      handIdx,
      x: e.clientX,
      y: e.clientY,
      hoveredSlot: null
    };
    activeDragRef.current = dragData;
    setActiveDrag(dragData);
  };

  // Tracciamento continuo del movimento del dito o mouse
  useEffect(() => {
    if (!activeDrag) return;

    const handlePointerMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const slotIdx = findSlotAt(x, y);

      if (activeDragRef.current) {
        activeDragRef.current.x = x;
        activeDragRef.current.y = y;
        activeDragRef.current.hoveredSlot = slotIdx;
      }

      setActiveDrag(prev => (prev ? { ...prev, x, y, hoveredSlot: slotIdx } : null));
    };

    const handlePointerUp = (e) => {
      const currentDrag = activeDragRef.current;
      if (currentDrag) {
        const dropX = (e && typeof e.clientX === 'number' && e.clientX > 0) ? e.clientX : currentDrag.x;
        const dropY = (e && typeof e.clientY === 'number' && e.clientY > 0) ? e.clientY : currentDrag.y;

        let targetSlot = findSlotAt(dropX, dropY);
        if (targetSlot === null) {
          targetSlot = currentDrag.hoveredSlot;
        }

        if (targetSlot !== null && !isNaN(targetSlot) && targetSlot >= 0 && targetSlot <= 4) {
          executePlaceCardOnSlot(currentDrag.card, targetSlot);
        }
      }
      activeDragRef.current = null;
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag]);







  // Risoluzione delle armi equipaggiate interrogando dinamicamente il WEAPONS_DATABASE
  const resolvedWeapons = useMemo(() => {
    return (equippedWeapons || []).slice(0, 4).map((wId, slotIdx) => {
      const def = WEAPONS_DATABASE.find(w => w.id === wId) || WEAPONS_DATABASE[slotIdx] || WEAPONS_DATABASE[0];
      const curLvl = weaponsLevels?.[def.id] || 1;
      const lvlData = def.levels?.[curLvl] || def.levels?.[1] || {};
      const isLocked = (slotIdx === 1 && !isSlot2Unlocked) || (slotIdx === 3 && !isSlot4Unlocked);

            const maxCap = def.maxCapacity || def.maxSalvo || 10;
      return {
        ...def,
        maxCapacity: maxCap,
        maxSalvo: def.maxSalvo || maxCap,
        slotIdx,
        isLocked,
        currentLevel: curLvl,
        currentDamage: lvlData.damage || def.baseDamage || 2,
        themeColor: def.color || '#00f2fe',
        mathInfo: { op: def.mathOp || '+', target: def.target || 14, isBomb: false }
      };

    });
  }, [equippedWeapons, weaponsLevels, isSlot2Unlocked, isSlot4Unlocked]);

  const resolvedHardpoints = resolvedWeapons;

  // Motore di Risoluzione Inneschi
  const bestTrigger = useMemo(() => {
    const validCards = tableSlots.filter(Boolean);
    if (validCards.length < 2) return null;

    const hits = [];
    resolvedWeapons.forEach((wp, wIdx) => {
      if (wp.isLocked) return;
      const heatInfo = weaponHeatState[wp.id] || { heat: 0, cooldownTurns: 0 };
      if (heatInfo.cooldownTurns > 0) return;

      const matchedSets = evaluateAllWeaponTriggers(validCards, wp, activeAnomaly);
      matchedSets.forEach(cardsSet => {
        hits.push({ weaponIdx: wIdx, weapon: wp, cards: cardsSet });
      });
    });

    if (hits.length === 0) return null;

            const calcWeaponDamage = (wp, comboCards) => {
      if (pistonOverrideActive) return pistonOverrideDamage;
      const maxCap = wp.maxCapacity || wp.maxSalvo || 10;
      const storedAmmo = weaponTanks[wp.suit] || 0;
      const addedAmmoFromCombo = (comboCards || [])
        .filter(c => getCardSuit(c) === wp.suit)
        .reduce((acc, c) => acc + (Number(c?.value) || 0), 0);
      const totalAmmo = Math.min(maxCap, storedAmmo + addedAmmoFromCombo);
      const salvo = Math.min(totalAmmo, wp.maxSalvo || maxCap);
      return salvo > 0 ? (wp.currentDamage * salvo) : wp.currentDamage;
    };

    const scenarios = [];

    // Combinazioni simultanee a 2 armi (verifica disgiunta per istanza esatta)
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        const hitA = hits[i];
        const hitB = hits[j];
        if (hitA.weaponIdx === hitB.weaponIdx) continue;

        const setA = new Set(hitA.cards);
        const isDisjoint = !hitB.cards.some(c => setA.has(c));


                if (isDisjoint) {
          const combinedCards = [...hitA.cards, ...hitB.cards];
          const dmgA = calcWeaponDamage(hitA.weapon, combinedCards);
          const dmgB = calcWeaponDamage(hitB.weapon, combinedCards);

          scenarios.push({
            isDual: true,
            weapons: [hitA.weapon, hitB.weapon],
            weaponIdx: hitA.weaponIdx,
            participatingCards: combinedCards,
            damage: dmgA + dmgB,
            nominalSum: combinedCards.reduce((acc, c) => acc + (Number(c.value) || 0), 0)
          });
        }
      }
    }

    // Piani a singola arma
        hits.forEach(hit => {
      const dmg = calcWeaponDamage(hit.weapon, hit.cards);
      scenarios.push({

        isDual: false,
        weapons: [hit.weapon],
        weaponIdx: hit.weaponIdx,
        weapon: hit.weapon,
        participatingCards: hit.cards,
        damage: dmg,
        nominalSum: hit.cards.reduce((acc, c) => acc + (Number(c.value) || 0), 0)
      });
    });

        scenarios.sort((a, b) => {
      if (b.damage !== a.damage) return b.damage - a.damage;
      // Priorità alla combinazione con più carte (Tris da 3 carte batte sempre Coppia da 2 carte)
      if (b.participatingCards.length !== a.participatingCards.length) {
        return b.participatingCards.length - a.participatingCards.length;
      }
      return b.nominalSum - a.nominalSum;
    });

    return scenarios[0] || null;

  }, [tableSlots, resolvedWeapons, weaponTanks, weaponHeatState, activeAnomaly, pistonOverrideActive, pistonOverrideDamage]);

  const prevTurnRef = useRef(turn);
  useEffect(() => {
    if (turn !== 'player1') {
      setSelectedIndices([]);
    }
    prevTurnRef.current = turn;
  }, [turn]);

         // Click/Tap carta dalla mano: supporta lo scarto/cambio e posa direttamente la carta nel primo slot vuoto del banco
  const handleCardClick = (idx) => {
    if (isExchangeMode || isSelectingDiscard) {
      if (typeof onCardClick === 'function') {
        onCardClick(idx);
      }
      return;
    }

    if (turn === 'player1' && cardsPlayedThisTurnRef.current < 3) {
      const card = playerHand?.[idx];
      if (!card) return;

      // Trova il primo slot vuoto disponibile sul banco comune
      const emptySlotIdx = tableSlots.findIndex(s => s === null);
      if (emptySlotIdx !== -1) {
        executePlaceCardOnSlot(card, emptySlotIdx);
      } else {
        // Se il banco è al completo (5/5), seleziona la carta per la sostituzione
        setSelectedHandToReplaceIdx(prev => prev === idx ? null : idx);
        try { playSound('select'); } catch (_) {}
      }
    }
  };




  const scannerOn = Boolean(isScannerActive || scannerMode === 'FREE_FULL');

  const computedScannerHints = useMemo(() => {
    if (!scannerOn || !playerHand || playerHand.length < 2) return { cardIndices: [], targetIndex: null };

    for (const hp of resolvedHardpoints) {
      if (hp.isLocked) continue;

      if (hp.slotType === 'poker') {
        const patternsToCheck = hp.allowedPatterns || [hp.pattern || 'one_pair'];
        for (let i = 0; i < playerHand.length; i++) {
          for (let j = i + 1; j < playerHand.length; j++) {
            if (patternsToCheck.some(pId => validateClassicPokerPattern([playerHand[i], playerHand[j]], pId))) {
              const sol = [i, j];
              const nextUnselected = sol.find(idx => !selectedIndices.includes(idx));
              return { targetIndex: hp.slotIdx, cardIndices: nextUnselected !== undefined ? [nextUnselected] : [] };
            }
          }
        }
      } else {
        const op = hp.mathInfo?.op || '+';
        const target = hp.mathInfo?.target || 14;
        for (let i = 0; i < playerHand.length; i++) {
          for (let j = 0; j < playerHand.length; j++) {
            if (i === j) continue;
            const match = getMatchingPermutation([playerHand[i], playerHand[j]], op, target, 0, activeAnomaly);
            if (match) {
              const sol = [i, j];
              const nextUnselected = sol.find(idx => !selectedIndices.includes(idx));
              return { targetIndex: hp.slotIdx, cardIndices: nextUnselected !== undefined ? [nextUnselected] : [] };
            }
          }
        }
      }
    }
    return { cardIndices: [], targetIndex: null };
  }, [scannerOn, playerHand, resolvedHardpoints, selectedIndices, activeAnomaly]);

  const activeScannerHints = computedScannerHints;

  const [showCinematicSplash, setShowCinematicSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eclissi_classic_intro_banner_seen') !== 'true';
  });

  const activeSectorTutorial = useMemo(() => {
    if (!isAdv || isPvP) return null;
    const p = Number(currentAdvPlanet) || 1;
    const l = Number(currentAdvLevel) || 1;

    if (p === 1) {
      if (l === 1 && localStorage.getItem('eclissi_tut_s1_done') !== 'true' && localStorage.getItem('eclissi_classic_guided_done') !== 'true') return 'S1';
      if (l === 2 && localStorage.getItem('eclissi_tut_s2_done') !== 'true') return 'S2';
      if (l === 3 && localStorage.getItem('eclissi_tut_s3_done') !== 'true') return 'S3';
      if (l === 6 && localStorage.getItem('eclissi_tut_s6_done') !== 'true') return 'S6';
      if (l === 7 && localStorage.getItem('eclissi_tut_s7_done') !== 'true') return 'S7';
      if (l === 8 && localStorage.getItem('eclissi_tut_s8_done') !== 'true') return 'S8';
      if (l === 9 && localStorage.getItem('eclissi_tut_s9_done') !== 'true') return 'S9';
      if (l === 10 && localStorage.getItem('eclissi_tut_s10_done') !== 'true') return 'S10';
    }
    if (p === 2) {
      if (l === 1 && localStorage.getItem('eclissi_tut_s11_done') !== 'true') return 'S11';
      if (l === 2 && localStorage.getItem('eclissi_tut_s12_done') !== 'true') return 'S12';
      if (l === 3 && localStorage.getItem('eclissi_tut_s13_done') !== 'true') return 'S13';
      if (l === 4 && localStorage.getItem('eclissi_tut_s14_done') !== 'true') return 'S14';
      if (l === 5 && localStorage.getItem('eclissi_tut_s15_done') !== 'true') return 'S15';
      if (l === 10 && localStorage.getItem('eclissi_tut_s20_done') !== 'true') return 'S20';
    }
    return null;
  }, [isAdv, isPvP, currentAdvPlanet, currentAdvLevel]);

  const [dismissedTuts, setDismissedTuts] = useState({});

  const markTutDone = (tutKey) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`eclissi_tut_${tutKey.toLowerCase()}_done`, 'true');
      if (tutKey === 'S1') localStorage.setItem('eclissi_classic_guided_done', 'true');
    }
    setDismissedTuts(prev => ({ ...prev, [tutKey]: true }));
  };

  const currentTut = (!activeSectorTutorial || dismissedTuts[activeSectorTutorial]) ? null : activeSectorTutorial;

  const [guidedStep, setGuidedStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const isS1 = isAdv && currentAdvPlanet === 1 && currentAdvLevel === 1;
    if (!isS1) return 0;
    return (localStorage.getItem('eclissi_tut_s1_done') === 'true' || localStorage.getItem('eclissi_classic_guided_done') === 'true') ? 0 : 1;
  });

  useEffect(() => {
    if (!showCinematicSplash) return;
    try { playSound('epic_item_trigger'); } catch (_) {}
    const t = setTimeout(() => {
      setShowCinematicSplash(false);
      localStorage.setItem('eclissi_classic_intro_banner_seen', 'true');
    }, 2100);
    return () => clearTimeout(t);
  }, [showCinematicSplash]);

  useEffect(() => {
    const updateScale = () => {
      const screenW = window.innerWidth || document.documentElement.clientWidth;
      const screenH = window.innerHeight || document.documentElement.clientHeight;
      const s = Math.min((screenW - 8) / 440, (screenH - 8) / 840);
      setScale(s);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  const isTerrainAllowed = isPvP || !isAdv || currentGlobalSector >= 8;
  const isAbilityModuleUnlocked = isPvP || !isAdv || currentGlobalSector >= 9;
  const isMalusAllowed = isPvP || !isAdv || (currentAdvPlanet > 1 || currentAdvLevel >= 11);
  const isDiceAllowed = isPvP || !isAdv || (currentAdvPlanet > 1 || currentAdvLevel >= 12);
  const isEtherAllowed = isPvP || !isAdv || currentGlobalSector >= 15;

  const playerDeckCount = playerDeck?.length || 0;
  const playerDeckThickness = Math.max(0, Math.round((playerDeckCount / 50) * 14));
  const enemyDeckCountVal = isRealPvP ? aiDeckCount : (aiDeck?.length || 0);
  const enemyDeckThickness = Math.max(0, Math.round((enemyDeckCountVal / 50) * 14));

  const getMalusPulseSpeed = (gauge, max) => {
    if (!gauge || gauge <= 0) return '0s';
    const ratio = Math.min(1, gauge / (max || 6));
    return `${(1.25 - ratio * 1.05).toFixed(2)}s`;
  };

  const aiPulseSpeed = getMalusPulseSpeed(aiMalusGauge, malusMaxTicks);
  const playerPulseSpeed = getMalusPulseSpeed(playerMalusGauge, malusMaxTicks);

  const getModuleStageClass = (meter, isReady) => {
    if (isReady || (meter || 0) >= 12) return 'is-overcharged';
    const m = meter || 0;
    if (m >= 9) return 'charge-stage-3';
    if (m >= 5) return 'charge-stage-2';
    if (m >= 1) return 'charge-stage-1';
    return '';
  };

  const playerModuleStage = getModuleStageClass(abilityMeter, isAbilityReady);
  const aiModuleStage = getModuleStageClass(aiAbilityMeter, false);

  const getDiceStageClass = (count, isReady) => {
    if (isReady || count >= 4) return 'dice-is-ready';
    if (count === 3) return 'dice-stage-3';
    if (count === 2) return 'dice-stage-2';
    if (count === 1) return 'dice-stage-1';
    return '';
  };

  const playerDiceCount = Object.values(playerNotches || {}).filter(Boolean).length;
  const aiDiceCount = Object.values(aiNotches || {}).filter(Boolean).length;
  const playerDiceStage = getDiceStageClass(playerDiceCount, playerDiceReady);
  const aiDiceStage = getDiceStageClass(aiDiceCount, false);

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

  const abilityName = selectedAbility?.toUpperCase() || 'MODULO';
  const abilityLvl = Math.min(abilities?.[selectedAbility]?.level || 1, 9);

    const cardsOnTableCount = tableSlots.filter(Boolean).length;

  // Sistema flessibile: l'attacco è pronto non appena sul banco si forma una combinazione valida
  const isFireReady = Boolean(
    turn === 'player1' && 
    !isSelectingDiscard && 
    bestTrigger !== null
  );



  useEffect(() => {
    if (currentTut !== 'S1' || guidedStep === 0) return;

    if (turn === 'ai') {
      markTutDone('S1');
      setGuidedStep(0);
      return;
    }

    if (guidedStep === 2 && isFireReady) {
      setGuidedStep(3);
    } else if (guidedStep === 3 && !isFireReady) {
      setGuidedStep(2);
    }
  }, [guidedStep, isFireReady, turn, currentTut]);

  const guidedCardTargetIdx = useMemo(() => {
    if (currentTut !== 'S1' || guidedStep !== 2 || isSelectingDiscard) return null;
    const hints = activeScannerHints?.cardIndices || [];
    const hintUnselected = hints.find(i => !selectedIndices?.includes(i));
    if (hintUnselected !== undefined) return hintUnselected;
    return null;
  }, [currentTut, guidedStep, isSelectingDiscard, activeScannerHints, selectedIndices]);

  const heartsCardIdx = useMemo(() => {
    return (playerHand || []).findIndex(c => c && c.suit === 'hearts');
  }, [playerHand]);

  const goldenCardIdx = useMemo(() => {
    return (playerHand || []).findIndex(c => c && (c.isGolden || c.id === playerGoldenCardId));
  }, [playerHand, playerGoldenCardId]);

  const isPilotResonant = checkPilotSetResonance(selectedPilot, selectedDeck, selectedAbility);
  const currentPilotLvl = pilotInventory?.[selectedPilot]?.level || 1;

    const handleAttackExecute = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (turn !== 'player1' || isSelectingDiscard || !bestTrigger) {
      try { playSound('deselect'); } catch (_) {}
      return;
    }



    const firingWeapons = bestTrigger.weapons || [bestTrigger.weapon];
    const { participatingCards, damage } = bestTrigger;

                // Ricarica i serbatoi per tutte le carte giocate (inclusi doppi dello stesso seme) e consuma la salva
    if (typeof setWeaponTanks === 'function') {
      setWeaponTanks(prev => {
        const next = { ...prev };

        // 1. Tutte le carte della combinazione ricaricano il serbatoio fino al cap dell'arma
        participatingCards.forEach(c => {
          const s = getCardSuit(c);
          const val = Number(c?.value) || 0;
          if (s && next[s] !== undefined) {
            const wpForSuit = resolvedWeapons.find(w => w.suit === s);
            const cap = wpForSuit ? (wpForSuit.maxCapacity || wpForSuit.maxSalvo || 10) : 10;
            next[s] = Math.min(cap, next[s] + val);
          }
        });

        // 2. Le armi che sparano consumano la propria salva specifica
        firingWeapons.forEach(wp => {
          const available = next[wp.suit] || 0;
          const maxCap = wp.maxCapacity || wp.maxSalvo || 10;
          const salvo = Math.min(available, wp.maxSalvo || maxCap);
          next[wp.suit] = Math.max(0, available - salvo);
        });

        return next;
      });
    }

        // Incrementa i colpi sparati leggendo la soglia maxShots e cooldownDuration della carta
    setWeaponHeatState(prevHeat => {
      const next = { ...prevHeat };
      firingWeapons.forEach(wp => {
        const cur = next[wp.id] || { shotsFired: 0, cooldownTurns: 0 };
        const nextShots = cur.shotsFired + 1;
        const limit = wp.maxShots || 1;

        if (nextShots >= limit) {
          // Raggiunto il limite stabilito dalla carta: entra in stop per i turni previsti
          next[wp.id] = {
            shotsFired: 0,
            cooldownTurns: wp.cooldownDuration || 1
          };
          try { playSound('terrain_flip'); } catch (_) {}
        } else {
          next[wp.id] = {
            ...cur,
            shotsFired: nextShots
          };
        }
      });
      return next;
    });


    // Rimuove dal banco SOLO le istanze esatte delle carte usate per fare fuoco
    const partSet = new Set(participatingCards);
    setTableSlots(prev => prev.map(c => (c && partSet.has(c) ? null : c)));


    const attackDamage = pistonOverrideActive ? pistonOverrideDamage : damage;
    const primaryWeapon = firingWeapons[0];

    const payload = {
      targetIndex: primaryWeapon.slotIdx,
      resolvedObj: {
        type: firingWeapons.length > 1 ? 'dual_fire' : primaryWeapon.slotType,
        name: firingWeapons.map(w => w.name).join(' + '),
        op: primaryWeapon.mathOp || '+',
        target: primaryWeapon.target || 14,
        isBomb: false
      },
      damage: attackDamage,
      usedCards: participatingCards
    };

                try { playSound('click'); } catch (_) {}

    setCardsPlayedThisTurn(0);
    cardsPlayedThisTurnRef.current = 0;
    setSelectedHandToReplaceIdx(null);

    if (typeof onAttack === 'function') {
      onAttack(payload);
    }
  };


  return (
    <div className="classic-screen-wrapper">
      {!showCinematicSplash && currentTut && turn === 'player1' && (
        <div className="guided-hud-floating-strip">
          <div className="guided-hud-badge">ISTRUZIONI MISSIONE</div>
          <div className="guided-hud-text">
            {currentTut === 'S1' && guidedStep === 1 && "1. Scegli il bersaglio numerico o figura Poker sulla rampa centrale."}
            {currentTut === 'S1' && guidedStep === 2 && "2. Tocca le carte dalla tua mano per caricarle nel banco (min. 2 carte)."}
            {currentTut === 'S1' && guidedStep === 3 && "3. Calcolo valido! Premi ATTACCA per sferrare il colpo!"}
            {currentTut === 'S2' && "♥ CUORI: Gioca o scarta carte Cuori per rigenerare i tuoi HP."}
            {currentTut === 'S3' && "🌌 COMBO 4 SEMI: Unisci ♥ ♦ ♣ ♠ in un'unica formula per Critico x2.0 e +1 💎!"}
            {currentTut === 'S6' && "✨ CARTA DORATA: Giocala entro 2 turni per raddoppiare i bonus del seme!"}
            {currentTut === 'S7' && "💥 NUCLEO INSTABILE: Disinnesca la Bomba entro 3 turni per infliggere -30 HP al nemico!"}
            {currentTut === 'S8' && "🛡️ BANCO TERRENO: Le tue trappole difensive si attivano automaticamente a faccia in giù!"}
            {currentTut === 'S9' && "⚡ MODULO ABILITÀ: Ricarica 3 colpi per rilasciare l'apoteosi energetica!"}
            {currentTut === 'S10' && "👑 BOSS GAIA: Abbatti il guardiano planetario (75 HP) per conquistare la 1ª Reliquia!"}
            {currentTut === 'S11' && "⏱️ BARRA MALUS: Calcola velocemente per riempirla e sabotare l'avversario!"}
            {currentTut === 'S12' && "🎲 DADI QUANTICI: Completa calcoli con +, -, *, / per sbloccare il lancio!"}
            {currentTut === 'S13' && "🔄 CAMBIO CARTE: Se la mano è sfavorevole, tocca CAMBIA per scambiare fino a 3 carte."}
            {currentTut === 'S14' && "🌌 ANOMALIA AMBIENTALE: Alcuni operatori sono bloccati dalle condizioni del pianeta."}
            {currentTut === 'S15' && "🔮 ETERE: Sintetizza energia per pescare carte mirate o creare Jolly."}
            {currentTut === 'S20' && "⭐ MANUFATTO EPICO: Attivalo 1 volta a match a costo 0 per capovolgere lo scontro!"}
          </div>
        </div>
      )}

      <div className="battle-viewport-tris battle-viewport-classic" style={{ transform: `scale(${scale})` }}>
        {showCinematicSplash && (
          <div className="classic-cinematic-overlay">
            <div className="classic-cinematic-sub">✦ MODALITÀ CLASSICA ✦</div>
            <div className="classic-cinematic-main">CALCOLO & POKER</div>
          </div>
        )}

        {/* 1. PIANO SUPERIORE (AVVERSARIO) */}
        <div className="enemy-mega-plane">
          <div className="enemy-plane-backdrop">
            <div className="tactical-grid-overlay"></div>
          </div>

          <div className="hud-enemy-telemetry" style={{ position: 'relative' }}>
            {!showCinematicSplash && currentTut === 'S10' && turn === 'player1' && (
              <div className="guided-hand-beacon point-down" style={{ top: '35px', left: '50%' }}>
                <div className="guided-tooltip-bubble">👑 TITANO GAIA (75 HP): Passiva del mazzo attiva! Abbattilo per la 1ª Reliquia.</div>
                <div className="guided-hand-icon">👇</div>
              </div>
            )}

            <div className="vital-telemetry-row">
              <span className="boss-name-3d">{enemyName}</span>
              <span className="boss-hp-3d">{aiHp} <span>/ {maxAiHp} HP</span></span>
              <span className="timer-readout">⏳ {aiTimer}s</span>
              {aiTimeTank > 0 && <span className="tank-readout enemy-tank">🛢️ +{aiTimeTank}s</span>}
              <span className="tactile-status-badge enemy-phase-tag">
                {isAdv && currentAdvLevel === 10 ? `FASE ${bossPhase}/${maxBossPhases}` : 'ATTIVO'}
              </span>
            </div>

            <div 
              className="hp-prismatic-dock"
              style={riftState?.active ? {
                borderColor: '#facc15',
                boxShadow: '0 0 16px rgba(250, 204, 21, 0.85), inset 0 0 6px #facc15'
              } : {}}
            >
              <div className="hp-segmented-grid"></div>
              <div 
                className="enemy-hp-fill-3d" 
                style={{ 
                  width: `${Math.max(0, Math.min(100, (aiHp / (maxAiHp || 1)) * 100))}%`,
                  background: riftState?.active 
                    ? 'linear-gradient(90deg, #d97706 0%, #facc15 50%, #fef08a 100%)' 
                    : undefined,
                  boxShadow: riftState?.active ? '0 0 16px #facc15' : undefined
                }}
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
                color: '#fef08a',
                textShadow: '0 0 6px rgba(250, 204, 21, 0.8)'
              }}>
                <span>⚡ BERSAGLIO {riftState.targetSlotIndex + 1} VULNERABILE: {riftState.conditionLabel}</span>
                <span style={{ color: riftState.benefit?.color || '#34d399' }}>{riftState.benefit?.icon} {riftState.benefit?.name}</span>
              </div>
            )}
          </div>

          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div 
                className={`malus-gauge-box ${aiMalusGauge > 0 ? 'warning-active' : ''}`}
                style={{ '--pulse-speed': aiPulseSpeed }}
              >
                {aiMalusGauge >= malusMaxTicks && <div className="malus-detonation-ring"></div>}
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
                <div className={`equip-pedestal-station station-enemy-dice station-dice ${aiDiceStage}`}>
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">DADI {aiDiceCount}/4</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div className={`equip-pedestal-station station-enemy-module station-module ${aiModuleStage}`}>
                  {(aiAbilityMeter || 0) >= 12 && <div className="module-beacon-beam"></div>}
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
            <div 
              className="card-deck-stack-block enemy-deck-theme"
              style={{ '--deck-thick': `${enemyDeckThickness}px`, '--deck-count': enemyDeckCountVal }}
            >
              <div className="deck-ground-shadow"></div>
              <div className="deck-cards-stack-body"></div>
              <div className="card-deck-top" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                <TacticalVisual id={aiDeckTheme || 'planet_char_1'} type="card_back" width={56} height={80} />
              </div>
              <div className="deck-count-badge" style={{ borderColor: '#f43f5e', color: '#f43f5e' }}>
                {enemyDeckCountVal}
              </div>
            </div>

            <div className="card-discard-stack-block">
              <div className="card-discard-top">
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 900, color: '#fda4af' }}>SCARTI</span>
                <span style={{ fontSize: '0.72rem', color: topAiDiscardCard?.color || '#f43f5e', fontWeight: 900 }}>
                  {topAiDiscardCard ? `${topAiDiscardCard.symbol} ${topAiDiscardCard.displayVal || topAiDiscardCard.value}` : '---'}
                </span>
                <span style={{ fontSize: '0.42rem', color: '#64748b', fontWeight: 'bold' }}>TOP CARD</span>
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
                    <div 
                      key={idx}
                      className={`terrain-horizontal-card ${isActivated ? 'is-revealed' : ''}`}
                      style={{ cursor: 'default' }}
                    >
                      <div className="terrain-card-inner">
                        <div className="terrain-card-face terrain-face-back enemy-border" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                          <TerrainVisual isBack={true} color={slot.card?.color || '#f43f5e'} width={48} height={68} />
                        </div>
                        <div 
                          className="terrain-card-face terrain-face-front" 
                          style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#f43f5e'}` }}
                        >
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

        {/* 2. MANO AVVERSARIA ANIMATA */}
        <div className="wall-hand-rack enemy-side">
          {(aiHand || Array(7).fill(null)).slice(0, 7).map((_, idx) => {
            const st = aiCardStates?.[idx] || '';
            const isSelected = st.includes('selected');
            const isAttacking = st.includes('attack');
            const isDiscarding = st.includes('discard');

            return (
              <div 
                key={idx} 
                className={`enemy-card-pod ${isSelected ? 'is-selected' : ''} ${isAttacking ? 'is-attacking' : ''} ${isDiscarding ? 'is-discarding' : ''}`}
              >
                <div className="enemy-hologram-back" style={{ padding: 0, overflow: 'hidden' }}>
                  <TacticalVisual id={aiDeckTheme || 'planet_char_1'} type="card_back" width={38} height={52} />
                </div>
                <div className="enemy-pedestal-base"></div>
              </div>
            );
          })}
        </div>

                        {/* 3. CAMPO CENTRALE: RAMPA ALLARGATA NEI LATERALI ALTI */}
        <div className="trapezoid-ramp-hub" style={{ padding: '6px 8px', top: '-10px' }}>
          <div
            className="trapezoid-ramp-surface"
            style={{
              bottom: '-50px',
              top: '-135px',
              left: '-110px',
              right: '-110px',
              clipPath: 'polygon(0% 0%, 100% 0%, 91% 100%, 9% 100%)'
            }}
          >
            <div className="trapezoid-grid-lines"></div>
          </div>



          <div style={{
            position: 'relative',
            zIndex: 5,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            transform: 'rotateX(24deg)',
            transformOrigin: '50% 100%',
            transformStyle: 'preserve-3d'
          }}>

                                    {/* FILA 1: ARMI AVVERSARIO CON CORNICE STILE FELTRO TAVOLO DA POKER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: 'calc(100% + 40px)',
              margin: '0 -20px',
              position: 'relative',
              top: '-8px',
              zIndex: 10,
              boxSizing: 'border-box'
            }}>
              {/* Sinistra: Cornice Panno per SLOT ARMI POKER NEMICO (Picche ♠, Cuori ♥) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 4px 4px 4px',
                borderRadius: '8px',
                border: '1.5px solid rgba(255, 255, 255, 0.75)',
                background: 'rgba(2, 6, 23, 0.75)',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.85)',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  fontSize: '0.44rem',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#ffffff',
                  textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1
                }}>
                  <span style={{ color: '#c084fc' }}>♠</span>
                  <span style={{ color: '#f43f5e' }}>♥</span>
                  <span>SLOT POKER</span>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {resolvedWeapons.slice(0, 2).map((wp, wIdx) => {
                    const storedBullets = (aiWeaponTanks && aiWeaponTanks[wp.suit]) || 0;
                    return (
                      <div
                        key={`ai_wp_${wp.id || wIdx}`}
                        style={{
                          width: '44px',
                          height: '60px',
                          boxSizing: 'border-box',
                          background: 'linear-gradient(165deg, rgba(38, 12, 26, 0.95), rgba(13, 2, 6, 0.98))',
                          border: `1.5px solid ${wp.themeColor}`,
                          borderRadius: '6px',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.85)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', lineHeight: 1 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: wp.themeColor }}>{wp.suitSymbol}</span>
                          <span style={{ fontSize: '0.42rem', fontWeight: 900, color: '#fca5a5', background: 'rgba(0,0,0,0.6)', padding: '1px 2px', borderRadius: '2px' }}>
                            L.{effectiveAiDeckLevel || 1}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{wp.icon}</span>
                        <span style={{ fontSize: '0.44rem', fontWeight: 900, color: '#ffffff', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>
                          {wp.name}
                        </span>
                                                <div style={{ fontSize: '0.40rem', fontWeight: 900, color: '#fde047', background: 'rgba(0,0,0,0.7)', padding: '1px 2px', borderRadius: '2px', lineHeight: 1 }}>
                          📦 {storedBullets}/{wp.maxCapacity || wp.maxSalvo || 10}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destra: Cornice Panno per SLOT ARMI CALCOLO NEMICO (Quadri ♦, Fiori ♣) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 4px 4px 4px',
                borderRadius: '8px',
                border: '1.5px solid rgba(255, 255, 255, 0.75)',
                background: 'rgba(2, 6, 23, 0.75)',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.85)',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  fontSize: '0.44rem',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#ffffff',
                  textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1
                }}>
                  <span style={{ color: '#00f2fe' }}>♦</span>
                  <span style={{ color: '#10b981' }}>♣</span>
                  <span>SLOT CALCOLO</span>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {resolvedWeapons.slice(2, 4).map((wp, wIdx) => {
                    const storedBullets = (aiWeaponTanks && aiWeaponTanks[wp.suit]) || 0;
                    return (
                      <div
                        key={`ai_wp_${wp.id || (wIdx + 2)}`}
                        style={{
                          width: '44px',
                          height: '60px',
                          boxSizing: 'border-box',
                          background: 'linear-gradient(165deg, rgba(38, 12, 26, 0.95), rgba(13, 2, 6, 0.98))',
                          border: `1.5px solid ${wp.themeColor}`,
                          borderRadius: '6px',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.85)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', lineHeight: 1 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 900, color: wp.themeColor }}>{wp.suitSymbol}</span>
                          <span style={{ fontSize: '0.42rem', fontWeight: 900, color: '#fca5a5', background: 'rgba(0,0,0,0.6)', padding: '1px 2px', borderRadius: '2px' }}>
                            L.{effectiveAiDeckLevel || 1}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{wp.icon}</span>
                        <span style={{ fontSize: '0.44rem', fontWeight: 900, color: '#ffffff', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>
                          {wp.name}
                        </span>
                                                <div style={{ fontSize: '0.40rem', fontWeight: 900, color: '#fde047', background: 'rgba(0,0,0,0.7)', padding: '1px 2px', borderRadius: '2px', lineHeight: 1 }}>
                          📦 {storedBullets}/{wp.maxCapacity || wp.maxSalvo || 10}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </div>



                                               {/* FILA 2: CORNICE BANCO COMUNE 5 CARTE STILE FELTRO TAVOLO DA POKER */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4px 6px 5px 6px',
              borderRadius: '8px',
              border: '1.5px solid rgba(255, 255, 255, 0.75)',
              background: 'rgba(2, 6, 23, 0.75)',
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.85)',
              boxSizing: 'border-box',
              zIndex: 10
            }}>
              {/* Serigrafia descrittiva stampata sul tavolo */}
              <div style={{
                fontSize: '0.44rem',
                fontFamily: 'Orbitron, sans-serif',
                fontWeight: 900,
                letterSpacing: '1px',
                color: '#ffffff',
                textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                marginBottom: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                lineHeight: 1
              }}>
                <span style={{ color: '#facc15' }}>✦</span>
                <span>BANCO COMUNE</span>
                <span style={{ color: '#facc15' }}>✦</span>
              </div>

              {/* I 5 Slot dentro la cornice */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                {tableSlots.map((card, slotIdx) => {
                  const isHovered = activeDrag?.hoveredSlot === slotIdx;

                  if (!card) {
                    return (
                      <div
                        key={`empty_${slotIdx}`}
                        data-table-slot={slotIdx}
                        style={{
                          width: '46px',
                          height: '66px',
                          borderRadius: '6px',
                          border: isHovered ? '2.5px solid #00f2fe' : '1.5px dashed rgba(56, 189, 248, 0.45)',
                          background: isHovered ? 'rgba(0, 242, 254, 0.32)' : 'rgba(15, 23, 42, 0.45)',
                          boxShadow: isHovered ? '0 0 25px #00f2fe, 0 8px 20px rgba(0,0,0,0.9)' : 'none',
                          transform: isHovered ? 'scale(1.35) translateY(-14px)' : 'none',
                          zIndex: isHovered ? 100 : 5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isHovered ? '0.58rem' : '0.5rem',
                          color: isHovered ? '#ffffff' : '#38bdf8',
                          fontWeight: 900,
                          fontFamily: 'Orbitron, sans-serif',
                          transition: 'transform 0.16s cubic-bezier(0.2, 0.8, 0.4, 1.2), box-shadow 0.16s ease, border-color 0.16s ease'
                        }}
                      >
                        {isHovered ? '📥 METTI QUI' : `SLOT ${slotIdx + 1}`}
                      </div>
                    );
                  }

                  const isFiring = bestTrigger?.participatingCards.some(c => c.id === card.id);
                  const cardSuitVal = getCardSuit(card);
                  const isRed = cardSuitVal === 'hearts' || cardSuitVal === 'diamonds';

                  return (
                    <div
                      key={card.id || slotIdx}
                      data-table-slot={slotIdx}
                      style={{
                        width: '46px',
                        height: '66px',
                        borderRadius: '6px',
                        background: isHovered ? 'linear-gradient(180deg, #fef08a 0%, #fef9c3 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
                        border: isHovered 
                          ? '2.5px solid #facc15' 
                          : (isFiring ? '2.5px solid #00f2fe' : `2px solid ${isRed ? 'rgba(239, 68, 68, 0.75)' : 'rgba(71, 85, 105, 0.75)'}`),
                        boxShadow: isHovered 
                          ? '0 0 26px rgba(250, 204, 21, 1), 0 10px 24px rgba(0,0,0,0.95)' 
                          : (isFiring ? '0 0 16px #00f2fe' : '0 4px 10px rgba(0,0,0,0.85)'),
                        transform: isHovered ? 'scale(1.35) translateY(-14px)' : (isFiring ? 'translateY(-4px)' : 'none'),
                        zIndex: isHovered ? 100 : 5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '3px 2px',
                        transition: 'transform 0.16s cubic-bezier(0.2, 0.8, 0.4, 1.2), box-shadow 0.16s ease, border-color 0.16s ease',
                        color: isRed ? '#dc2626' : '#0f172a'
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', fontWeight: 900, lineHeight: 1 }}>{card.symbol}</span>
                      <span style={{ fontFamily: 'Orbitron', fontSize: '1.3rem', fontWeight: 900, lineHeight: 1 }}>{card.displayVal || card.value}</span>
                      <span style={{ fontSize: '0.45rem', fontWeight: 900 }}>{isHovered ? '🔄 CAMBIA' : (isFiring ? '⚡' : '🔒')}</span>
                    </div>
                  );
                })}
              </div>
            </div>





                        {/* FILA 3: ARMI GIOCATORE CON CORNICE STILE FELTRO TAVOLO DA POKER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: 'calc(100% + 40px)',
              margin: '0 -20px 0 -20px',
              position: 'relative',
              top: '4px',
              zIndex: 5,
              boxSizing: 'border-box'
            }}>
              {/* Sinistra: Cornice Panno Bianco per SLOT ARMI POKER (Picche ♠, Cuori ♥) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 4px 4px 4px',
                borderRadius: '8px',
                border: '1.5px solid rgba(255, 255, 255, 0.75)',
                background: 'rgba(2, 6, 23, 0.75)',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.85)',
                boxSizing: 'border-box'
              }}>
                {/* Tratteggio descrittivo stampato sul tavolo */}
                <div style={{
                  fontSize: '0.44rem',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#ffffff',
                  textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1
                }}>
                  <span style={{ color: '#c084fc' }}>♠</span>
                  <span style={{ color: '#f43f5e' }}>♥</span>
                  <span>SLOT POKER</span>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {resolvedWeapons.slice(0, 2).map((wp, wIdx) => {
                    const isArmed = bestTrigger?.weapons?.some(w => w.id === wp.id) || bestTrigger?.weaponIdx === wIdx;
                    const storedBullets = weaponTanks[wp.suit] || 0;
                    const heatInfo = weaponHeatState[wp.id] || { heat: 0, shotsFired: 0, cooldownTurns: 0 };
                    const isFrozen = heatInfo.cooldownTurns > 0;
                    const salvo = Math.min(storedBullets, wp.maxSalvo || 10);
                    const individualDmg = salvo > 0 ? (wp.currentDamage * salvo) : wp.currentDamage;

                    return (
                      <div
                        key={`p_wp_${wp.id}`}
                        className={isFrozen ? 'weapon-frozen-card' : ''}
                        style={{
                          width: '44px',
                          height: '62px',
                          boxSizing: 'border-box',
                          background: isArmed ? 'rgba(8, 145, 178, 0.65)' : 'rgba(15, 23, 42, 0.95)',
                          border: isArmed ? '2px solid #ffffff' : `1.5px solid ${wp.themeColor}`,
                          borderRadius: '6px',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isArmed ? `0 0 16px ${wp.themeColor}` : '0 6px 12px rgba(0,0,0,0.9)',
                          transform: isArmed ? 'translateY(-4px)' : 'none',
                          transition: 'all 0.16s ease',
                          position: 'relative'
                        }}
                      >
                        {isFrozen && (
                          <div className="weapon-ice-overlay">
                            <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>❄️</span>
                            <span className="weapon-ice-badge">{heatInfo.cooldownTurns}T</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px', alignItems: 'center', lineHeight: 1 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: wp.themeColor }}>{wp.suitSymbol}</span>
                          <span style={{ fontSize: '0.62rem' }}>{wp.icon}</span>
                        </div>

                        <span style={{ fontSize: '0.44rem', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>
                          {wp.name}
                        </span>

                                                <div style={{ fontSize: '0.40rem', color: '#38bdf8', fontWeight: 900, background: 'rgba(0,0,0,0.6)', padding: '1px 2px', borderRadius: '2px', lineHeight: 1 }}>
                          📦 {storedBullets}/{wp.maxCapacity || wp.maxSalvo || 10}
                        </div>


                        <div style={{
                          fontSize: '0.42rem',
                          fontWeight: 900,
                          color: isArmed ? '#34d399' : wp.themeColor,
                          background: 'rgba(0,0,0,0.6)',
                          padding: '1px 2px',
                          borderRadius: '2px',
                          lineHeight: 1,
                          whiteSpace: 'nowrap'
                        }}>
                          {isArmed ? `-${individualDmg}` : wp.reqDescription}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Destra: Cornice Panno Bianco per SLOT ARMI CALCOLO (Quadri ♦, Fiori ♣) */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '3px 4px 4px 4px',
                borderRadius: '8px',
                border: '1.5px solid rgba(255, 255, 255, 0.75)',
                background: 'rgba(2, 6, 23, 0.75)',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.25), inset 0 0 12px rgba(0, 0, 0, 0.85)',
                boxSizing: 'border-box'
              }}>
                {/* Tratteggio descrittivo stampato sul tavolo */}
                <div style={{
                  fontSize: '0.44rem',
                  fontFamily: 'Orbitron, sans-serif',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#ffffff',
                  textShadow: '0 0 6px rgba(255, 255, 255, 0.6)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  lineHeight: 1
                }}>
                  <span style={{ color: '#00f2fe' }}>♦</span>
                  <span style={{ color: '#10b981' }}>♣</span>
                  <span>SLOT CALCOLO</span>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {resolvedWeapons.slice(2, 4).map((wp, subIdx) => {
                    const wIdx = subIdx + 2;
                    const isArmed = bestTrigger?.weapons?.some(w => w.id === wp.id) || bestTrigger?.weaponIdx === wIdx;
                    const storedBullets = weaponTanks[wp.suit] || 0;
                    const heatInfo = weaponHeatState[wp.id] || { heat: 0, shotsFired: 0, cooldownTurns: 0 };
                    const isFrozen = heatInfo.cooldownTurns > 0;
                    const salvo = Math.min(storedBullets, wp.maxSalvo || 10);
                    const individualDmg = salvo > 0 ? (wp.currentDamage * salvo) : wp.currentDamage;

                    return (
                      <div
                        key={`p_wp_${wp.id}`}
                        className={isFrozen ? 'weapon-frozen-card' : ''}
                        style={{
                          width: '44px',
                          height: '62px',
                          boxSizing: 'border-box',
                          background: isArmed ? 'rgba(8, 145, 178, 0.65)' : 'rgba(15, 23, 42, 0.95)',
                          border: isArmed ? '2px solid #ffffff' : `1.5px solid ${wp.themeColor}`,
                          borderRadius: '6px',
                          padding: '2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isArmed ? `0 0 16px ${wp.themeColor}` : '0 6px 12px rgba(0,0,0,0.9)',
                          transform: isArmed ? 'translateY(-4px)' : 'none',
                          transition: 'all 0.16s ease',
                          position: 'relative'
                        }}
                      >
                        {isFrozen && (
                          <div className="weapon-ice-overlay">
                            <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>❄️</span>
                            <span className="weapon-ice-badge">{heatInfo.cooldownTurns}T</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px', alignItems: 'center', lineHeight: 1 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: wp.themeColor }}>{wp.suitSymbol}</span>
                          <span style={{ fontSize: '0.62rem' }}>{wp.icon}</span>
                        </div>

                        <span style={{ fontSize: '0.44rem', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '40px' }}>
                          {wp.name}
                        </span>

                                                <div style={{ fontSize: '0.40rem', color: '#38bdf8', fontWeight: 900, background: 'rgba(0,0,0,0.6)', padding: '1px 2px', borderRadius: '2px', lineHeight: 1 }}>
                          📦 {storedBullets}/{wp.maxCapacity || wp.maxSalvo || 10}
                        </div>


                        <div style={{
                          fontSize: '0.42rem',
                          fontWeight: 900,
                          color: isArmed ? '#34d399' : wp.themeColor,
                          background: 'rgba(0,0,0,0.6)',
                          padding: '1px 2px',
                          borderRadius: '2px',
                          lineHeight: 1,
                          whiteSpace: 'nowrap'
                        }}>
                          {isArmed ? `-${individualDmg}` : wp.reqDescription}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>




          </div>
        </div>

        {/* 4. MANO DEL GIOCATORE */}
        <div className="player-cards-section" style={{ top: '-25px' }}>
          {isSelectingDiscard && (
            <div className="discard-alert-banner">
              ⚠️ TOCCA 1 CARTA DA SACRIFICARE PER PASSARE IL TURNO
              {currentTut === 'S2' && (
                <div style={{ fontSize: '0.58rem', color: '#fef08a', marginTop: '3px', fontWeight: 'bold' }}>
                  ⚡ SCARICA: Sacrifica 1 carta per liberare il potere del suo seme (♥ Cura, ♠ Danno, ♣ Tempo, ♦ Polvere)!
                </div>
              )}
            </div>
          )}

                    <div className="wall-hand-rack player-side">
            {(playerHand || []).map((card, idx) => {
              const isPlacedOnTable = tableSlots.some(s => s && s === card);
              const isExchangeSelected = isExchangeMode && selectedExchangeIndices?.includes(idx);
              const isSelected = isExchangeMode ? isExchangeSelected : isPlacedOnTable;


              const isGolden = Boolean(card?.isGolden || (playerGoldenCardId && card?.id === playerGoldenCardId));

              const suitKey = card?.suit || 'hearts';
              const suitClass = suitKey === 'diamonds' ? 'card-diamonds' :
                                suitKey === 'spades' ? 'card-spades' :
                                suitKey === 'clubs' ? 'card-clubs' : 'card-hearts';

              const suitTag = suitKey === 'diamonds' ? '+2🌟' :
                              suitKey === 'spades' ? '+3HP' :
                              suitKey === 'clubs' ? '+5s' : '+8% HP';

              const isSuggested = scannerOn && !isSelectingDiscard && (activeScannerHints?.cardIndices || []).includes(idx);

              const isGuidedCardS1 = !showCinematicSplash && turn === 'player1' && (
                currentTut === 'S1' && guidedStep === 2 && !isSelectingDiscard && idx === guidedCardTargetIdx
              );

              const isGuidedHeartsS2 = !showCinematicSplash && turn === 'player1' && (
                currentTut === 'S2' && !isSelectingDiscard && idx === heartsCardIdx && !isSelected
              );

              const isGuidedGoldenS6 = !showCinematicSplash && turn === 'player1' && (
                currentTut === 'S6' && !isSelectingDiscard && (idx === goldenCardIdx || isGolden) && !isSelected
              );

                                          const canDrag = turn === 'player1' && !isSelectingDiscard && !isExchangeMode && cardsPlayedThisTurn < 3;
              const isBeingDragged = activeDrag?.handIdx === idx;

              return (
                <div 
                  key={card?.id || idx}
                  className={`card-unit-station ${suitClass} ${isSelected ? 'is-selected hand-card-placed' : ''}`}
                  onPointerDown={(e) => handleCardPointerDown(e, idx)}
                  onClick={() => handleCardClick(idx)}
                  style={{ 
                    cursor: canDrag ? 'grab' : 'default',
                    touchAction: 'none',
                    opacity: isBeingDragged ? 0.35 : 1
                  }}
                >


                  {isGuidedCardS1 && (
                    <div className="guided-hand-beacon point-down">
                      <div className="guided-tooltip-bubble">2. Componi il banco (min. 2 carte)</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  {isGuidedHeartsS2 && (
                    <div className="guided-hand-beacon point-down">
                      <div className="guided-tooltip-bubble">♥ CUORI: Giocala per rigenerare i tuoi HP!</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  {isGuidedGoldenS6 && (
                    <div className="guided-hand-beacon point-down">
                      <div className="guided-tooltip-bubble">🌟 CARTA DORATA [2T]: Raddoppia gli effetti del seme!</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <div className={`tactile-card-body ${isSuggested ? 'suggested' : ''} ${isSelectingDiscard ? 'discard-mode' : ''} ${isGolden ? 'golden-card' : ''} ${(isGuidedCardS1 || isGuidedHeartsS2 || isGuidedGoldenS6) ? 'guided-pulse-target' : ''}`}>
                    {isGolden && playerGoldenTurns > 0 && (
                      <div className="golden-turns-badge">{playerGoldenTurns}T</div>
                    )}

                    <span className="card-suit-label">{card?.symbol}</span>
                    <span className="card-num-3d">{card?.displayVal || card?.value}</span>
                                        <span className="card-effect-tag" style={{ color: isExchangeSelected || selectedHandToReplaceIdx === idx ? '#facc15' : undefined }}>
                      {isSelectingDiscard 
                        ? '✕ SCARTA' 
                        : (isExchangeSelected 
                            ? '🔄 CAMBIA' 
                            : (selectedHandToReplaceIdx === idx 
                                ? '⚡ SOSTITUISCI' 
                                : (isPlacedOnTable ? 'IN BANCO' : suitTag)))}
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
            <div 
              className="card-deck-stack-block"
              style={{ '--deck-thick': `${playerDeckThickness}px`, '--deck-count': playerDeckCount }}
            >
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
                <span style={{ fontSize: '0.72rem', color: topPlayerDiscard?.color || '#00f2fe', fontWeight: 900 }}>
                  {topPlayerDiscard ? `${topPlayerDiscard.symbol} ${topPlayerDiscard.displayVal || topPlayerDiscard.value}` : '---'}
                </span>
                <span style={{ fontSize: '0.42rem', color: '#64748b', fontWeight: 'bold' }}>TOP CARD</span>
              </div>
              <div className="deck-count-badge" style={{ bottom: '-6px', right: '2px', borderColor: '#00f2fe', color: '#00f2fe' }}>
                {playerDiscard?.length || 0}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 8px',
                position: 'relative',
                flexShrink: 0
              }}
              title={`Pilota Assegnato (Grado ${currentPilotLvl}/5)${isPilotResonant ? ' - RISONANZA DI SET ATTIVA!' : ''}`}
            >
              <PilotPortraitVisual
                pilotId={selectedPilot}
                size={48}
                isResonance={isPilotResonant}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-5px',
                  background: isPilotResonant ? 'linear-gradient(135deg, #d97706, #b45309)' : 'rgba(15, 23, 42, 0.95)',
                  border: isPilotResonant ? '1.5px solid #fde047' : '1px solid #00f2fe',
                  color: '#ffffff',
                  fontSize: '0.48rem',
                  fontWeight: 900,
                  fontFamily: 'Orbitron, sans-serif',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  boxShadow: isPilotResonant ? '0 0 10px #facc15' : '0 0 5px rgba(0, 242, 254, 0.5)',
                  whiteSpace: 'nowrap',
                  zIndex: 6
                }}
              >
                L.{currentPilotLvl} {isPilotResonant ? '★' : ''}
              </div>
            </div>

            {isTerrainAllowed && (
              <div className="terrains-horizontal-bank" style={{ position: 'relative' }}>
                {!showCinematicSplash && currentTut === 'S8' && turn === 'player1' && (
                  <div className="guided-hand-beacon point-down" style={{ bottom: '105%', right: '15px' }}>
                    <div className="guided-tooltip-bubble">🛡️ BANCO TERRENO: Difesa passiva pronta a salvarti!</div>
                    <div className="guided-hand-icon">👇</div>
                  </div>
                )}

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
                        if (currentTut === 'S8') markTutDone('S8');
                        if (slot.canRearm && typeof handleRearmTerrainSlot === 'function') {
                          handleRearmTerrainSlot(idx);
                        }
                      }}
                    >
                      <div className="terrain-card-inner">
                        <div className="terrain-card-face terrain-face-back" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                          <TerrainVisual isBack={true} color={slot.card?.color || '#38bdf8'} width={48} height={68} />
                        </div>
                        <div 
                          className="terrain-card-face terrain-face-front" 
                          style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#38bdf8'}` }}
                        >
                          <TerrainVisual cardId={slot.card?.id || slot.cardId} color={slot.card?.color || '#38bdf8'} width={48} height={68} isBack={false} />
                        </div>
                      </div>

                      {slot.canRearm && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-4px',
                            background: '#9333ea',
                            color: '#ffffff',
                            fontSize: '0.45rem',
                            fontWeight: 900,
                            padding: '1px 3px',
                            borderRadius: '3px',
                            border: '1px solid #e879f9',
                            boxShadow: '0 0 6px rgba(232, 121, 249, 0.8)',
                            zIndex: 10,
                            pointerEvents: 'none'
                          }}
                        >
                          🔮 RIARMO
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div 
                className={`malus-gauge-box ${playerMalusGauge > 0 ? 'warning-active' : ''} ${currentTut === 'S11' ? 'guided-pulse-target' : ''}`} 
                style={{ borderColor: 'rgba(0,242,254,0.4)', '--pulse-speed': playerPulseSpeed, position: 'relative' }}
                onClick={() => { if (currentTut === 'S11') markTutDone('S11'); }}
              >
                {!showCinematicSplash && currentTut === 'S11' && turn === 'player1' && (
                  <div className="guided-hand-beacon point-down" style={{ bottom: '115%', left: '50%' }}>
                    <div className="guided-tooltip-bubble">⏱️ BARRA MALUS: Calcola rapido per riempirla e sabotare il nemico!</div>
                    <div className="guided-hand-icon">👇</div>
                  </div>
                )}

                {playerMalusGauge >= malusMaxTicks && <div className="malus-detonation-ring"></div>}
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
                  className={`equip-pedestal-station station-dice ${playerDiceStage} ${currentTut === 'S12' ? 'guided-pulse-target' : ''}`}
                  onClick={() => {
                    if (currentTut === 'S12') markTutDone('S12');
                    if (playerDiceReady && typeof executeQuantumDiceRoll === 'function') {
                      executeQuantumDiceRoll();
                    }
                  }}
                  title={playerDiceReady ? "DADI PRONTI!" : `Operatori: ${playerDiceCount}/4`}
                  style={{ position: 'relative' }}
                >
                  {!showCinematicSplash && currentTut === 'S12' && turn === 'player1' && (
                    <div className="guided-hand-beacon point-down" style={{ bottom: '115%', left: '50%' }}>
                      <div className="guided-tooltip-bubble">
                        {playerDiceReady 
                          ? "🎲 DADI PRONTI: Tocca 'LANCIA!' per estrarre effetti!" 
                          : "🎲 DADI: Usa +, -, *, / per accendere le 4 tacche!"}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">
                    {playerDiceReady ? 'LANCIA!' : `DADI ${playerDiceCount}/4`}
                  </span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div 
                  className={`equip-pedestal-station station-module ${playerModuleStage} ${currentTut === 'S9' ? 'guided-pulse-target' : ''}`}
                  onClick={() => {
                    if (currentTut === 'S9') markTutDone('S9');
                    if (isAbilityReady && typeof handleManualSkillTrigger === 'function') {
                      handleManualSkillTrigger();
                    }
                  }}
                  title={isAbilityReady ? "MODULO CARICO!" : `Carica: ${Math.round(((abilityMeter || 0) / 12) * 100)}%`}
                  style={{ position: 'relative' }}
                >
                  {!showCinematicSplash && currentTut === 'S9' && turn === 'player1' && (
                    <div className="guided-hand-beacon point-down" style={{ bottom: '115%', left: '50%' }}>
                      <div className="guided-tooltip-bubble">
                        {isAbilityReady 
                          ? "⚡ MODULO CARICO: Tocca per attivarlo a costo 0s!" 
                          : "⚡ MODULO IBRIDO: 3 colpi a segno per il 100%!"}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  {isAbilityReady && <div className="module-beacon-beam"></div>}
                  <div className="equip-stationary-art">
                    <ModuleIcon id={selectedAbility} size={28} color={isAbilityReady ? '#00f2fe' : '#10b981'} />
                  </div>
                  <span className="equip-label-tag">
                    {isAbilityReady ? 'PRONTO!' : `${abilityName} L.${abilityLvl}`}
                  </span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isEpic1Unlocked && (
                <div 
                  className={`equip-pedestal-station station-mobius ${isItem1Used ? 'item-exhausted' : (isItem1Usable ? 'item-usable' : '')} ${currentTut === 'S20' ? 'guided-pulse-target' : ''}`}
                  onClick={() => {
                    if (currentTut === 'S20') markTutDone('S20');
                    if (isItem1Usable && typeof handleActivateEpicItem === 'function') {
                      handleActivateEpicItem(item1Id);
                    }
                  }}
                  style={{ position: 'relative' }}
                >
                  {!showCinematicSplash && currentTut === 'S20' && turn === 'player1' && (
                    <div className="guided-hand-beacon point-down" style={{ bottom: '115%', left: '50%' }}>
                      <div className="guided-tooltip-bubble">⭐ MANUFATTO EPICO: 1 volta per match a costo zero! Usalo contro il Boss.</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

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
                  onClick={() => {
                    if (isItem2Usable && typeof handleActivateEpicItem === 'function') {
                      handleActivateEpicItem(item2Id);
                    }
                  }}
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

                    {/* 6. PULSANTIERA INFERIORE TATTICA */}
          <div className="actions-cluster">
            {isExchangeMode ? (
              <>
                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-change"
                  style={{ flex: 2, background: 'linear-gradient(180deg, #ca8a04 0%, #713f12 100%)', borderColor: '#facc15', color: '#ffffff' }}
                  disabled={!selectedExchangeIndices || selectedExchangeIndices.length === 0}
                  onClick={() => {
                    if (currentTut === 'S13') markTutDone('S13');
                    if (typeof confirmCardExchange === 'function') {
                      confirmCardExchange();
                    }
                  }}
                >
                  CONFERMA ({selectedExchangeIndices?.length || 0}/3)
                </button>
                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-pass"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (typeof handleCancelExchangeMode === 'function') {
                      handleCancelExchangeMode();
                    } else if (typeof setIsExchangeMode === 'function') {
                      setIsExchangeMode(false);
                    }
                  }}
                >
                  ANNULLA
                </button>
              </>
            ) : turn === 'player1' ? (
              <>
                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-abandon"
                  onClick={() => setShowAbandonConfirm(true)}
                >
                  ABBANDONA
                </button>
                
                {isEtherAllowed && (
                  <div style={{ flex: 0.9, position: 'relative', display: 'flex' }}>
                    <button 
                      type="button"
                      className="tactile-btn-mech tactile-btn-deck"
                      style={{ width: '100%' }}
                      onClick={() => setShowDeckExtractModal(true)}
                    >
                      🔮 MAZZO
                    </button>
                  </div>
                )}

                                                <button 
                  type="button"
                  className={`tactile-btn-mech tactile-btn-attack ${isFireReady ? 'ready-attack' : ''}`}
                  disabled={isSelectingDiscard || !isFireReady}
                  onClick={handleAttackExecute}
                  style={{ position: 'relative' }}
                >
                  {isFireReady 
                    ? `ATTACCA (-${bestTrigger.damage} HP)` 
                    : (cardsPlayedThisTurn === 0 
                        ? 'CALA CARTE (0/3)' 
                        : `NESSUN INNESCO (${cardsPlayedThisTurn}/3)`)}
                </button>

                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-pass"
                  disabled={isSelectingDiscard}
                  onClick={() => {
                    if (typeof handlePassTurn === 'function') {
                      handlePassTurn();
                    }
                  }}
                >
                  PASSA
                </button>


              </>
            ) : (
              <>
                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-abandon"
                  onClick={() => setShowAbandonConfirm(true)}
                >
                  ABBANDONA
                </button>

                <button 
                  type="button"
                  className="tactile-btn-mech tactile-btn-change"
                  style={{ flex: 3 }}
                  disabled={downtimeExchangesLeft <= 0}
                  onClick={() => {
                    try { playSound('click'); } catch (_) {}
                    if (typeof handleOpenExchangeMode === 'function') {
                      handleOpenExchangeMode();
                    }
                    if (typeof setIsExchangeMode === 'function') {
                      setIsExchangeMode(true);
                    }
                  }}
                >
                  {downtimeExchangesLeft > 0 ? `CAMBIA CARTE (${downtimeExchangesLeft}/2)` : 'CAMBI ESAURITI'}
                </button>
              </>
            )}
          </div>


          {/* TELEMETRIA SALUTE & TIMER INFERIORE */}
          <div className="player-hp-dock-bottom">
            <div className="vital-telemetry-row">
              <span className="player-hp-3d">HP: {playerHp} <span>/ {maxPlayerHp} (L.{level})</span></span>
              {!isPvP && (
                <span style={{ color: '#f43f5e', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                  💔 {lives ?? 3}
                </span>
              )}
              <span className="timer-readout">⏳ {timer}s</span>
              {playerTimeTank > 0 && <span className="tank-readout">🛢️ +{playerTimeTank || 0}s</span>}
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

      {/* CARTA FLUTTUANTE SOTTO AL DITO/MOUSE DURANTE IL TRASCINAMENTO */}
      {activeDrag && (
        <div
          style={{
            position: 'fixed',
            top: activeDrag.y - 48,
            left: activeDrag.x - 28,
            width: '56px',
            height: '80px',
            pointerEvents: 'none',
            zIndex: 999999,
            borderRadius: '8px',
            background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 0.99) 100%)',
            border: '2.5px solid #facc15',
            boxShadow: '0 0 25px rgba(250, 204, 21, 0.9), 0 12px 28px rgba(0,0,0,0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 3px',
            transform: 'scale(1.15) rotate(4deg)',
            color: activeDrag.card?.color || '#ffffff'
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 900, lineHeight: 1 }}>{activeDrag.card?.symbol}</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: '1.4rem', fontWeight: 900, lineHeight: 1, color: '#ffffff' }}>{activeDrag.card?.displayVal || activeDrag.card?.value}</span>
          <span style={{ fontFamily: 'Orbitron', fontSize: '0.45rem', fontWeight: 900, color: '#facc15' }}>TRASCINA</span>
        </div>
      )}
    </div>
  );
}
