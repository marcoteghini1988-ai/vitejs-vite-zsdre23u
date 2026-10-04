import React, { useState, useEffect, useRef, useMemo } from 'react';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';

// ============================================================================
// DATABASE & VALUTATORI POKER A PARITÀ PER LA STAZIONE 2
// ============================================================================
const CLASSIC_POKER_PATTERNS = Object.freeze([
  { id: 'one_pair', name: 'COPPIA', cardsCount: 2, damage: 10, desc: '2 carte dello stesso valore (-10 HP)' },
  { id: 'two_pair', name: 'DOPPIA COPPIA', cardsCount: 4, damage: 12, desc: '2 coppie distinte (-12 HP)' },
  { id: 'three_of_a_kind', name: 'TRIS', cardsCount: 3, damage: 14, desc: '3 carte dello stesso valore (-14 HP)' },
  { id: 'straight', name: 'SCALA', cardsCount: 5, damage: 16, desc: '5 carte in sequenza continua (-16 HP)' },
  { id: 'flush', name: 'COLORE', cardsCount: 5, damage: 17, desc: '5 carte dello stesso seme (-17 HP)' },
  { id: 'full_house', name: 'FULL', cardsCount: 5, damage: 18, desc: '1 Tris + 1 Coppia (-18 HP)' },
  { id: 'four_of_a_kind', name: 'POKER', cardsCount: 4, damage: 19, desc: '4 carte dello stesso valore (-19 HP)' },
  { id: 'royal_flush', name: 'SCALA REALE', cardsCount: 5, damage: 20, desc: '5 carte consecutive dello stesso seme (-20 HP)' }
]);

const getCardSuit = (card) => {
  if (!card) return null;
  if (card.isJoker || card.suit === 'joker') return 'joker';
  if (typeof card.id === 'string' && card.id.startsWith('joker')) return 'joker';
  if (card.suit) return card.suit;
  if (typeof card.id === 'string') {
    if (card.id.startsWith('hearts') || card.id === 'hearts') return 'hearts';
    if (card.id.startsWith('diamonds') || card.id === 'diamonds') return 'diamonds';
    if (card.id.startsWith('spades') || card.id === 'spades') return 'spades';
    if (card.id.startsWith('clubs') || card.id === 'clubs') return 'clubs';
  }
  return 'hearts';
};

const validateClassicPokerPattern = (cards, patternId) => {
  if (!cards || !patternId) return false;
  const validCards = cards.filter(Boolean);
  const targetDef = CLASSIC_POKER_PATTERNS.find(p => p.id === patternId);
  if (!targetDef || validCards.length !== targetDef.cardsCount) return false;

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
      const checkSpan = (vals) => (vals.length === 0 ? true : vals[vals.length - 1] - vals[0] <= 4);
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
      const checkSpan = (vals) => (vals.length === 0 ? true : vals[vals.length - 1] - vals[0] <= 4);
      if (checkSpan(uniqueVals)) return true;
      const broadwayVals = uniqueVals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      return checkSpan(broadwayVals);
    }
    default:
      return false;
  }
};

const evaluateVectorParityPoker = (cards, requiredParity = 'PARI') => {
  if (!cards || cards.length < 2) {
    return { isValid: false, combo: null, sum: 0, damage: 0, reason: 'Seleziona da 2 a 5 carte' };
  }
  const validCards = cards.filter(Boolean);
  if (validCards.length < 2 || validCards.length > 5) {
    return { isValid: false, combo: null, sum: 0, damage: 0, reason: 'Seleziona da 2 a 5 carte' };
  }
  const sum = validCards.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
  const isEven = sum % 2 === 0;
  const parityMatches = (requiredParity === 'PARI' && isEven) || (requiredParity === 'DISPARI' && !isEven);

  if (!parityMatches) {
    return { isValid: false, combo: null, sum, damage: 0, reason: `Somma ${sum} (${isEven ? 'PARI' : 'DISPARI'}): serve ${requiredParity}` };
  }

  let recognizedPattern = null;
  for (const p of CLASSIC_POKER_PATTERNS) {
    if (validateClassicPokerPattern(validCards, p.id)) {
      recognizedPattern = p;
      break;
    }
  }

  if (!recognizedPattern) {
    return { isValid: false, combo: null, sum, damage: 0, reason: 'Nessuna figura poker valida' };
  }

  return {
    isValid: true,
    combo: recognizedPattern,
    sum,
    damage: recognizedPattern.damage,
    cardsCount: validCards.length
  };
};

// ============================================================================
// STILI 3D DEDICATI ALLA MODALITÀ VETTORE
// ============================================================================
(function injectVector3DStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-vector-3d-styles';
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

    /* 1. PIANO SUPERIORE: AVVERSARIO */
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
      z-index: 5;
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
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), 0 0 10px currentColor;
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

    .battle-viewport-classic .station-module { color: #10b981; }
    .battle-viewport-classic .station-module .equip-pit-base { border-color: #10b981; }
    .battle-viewport-classic .station-module .equip-label-tag { color: #34d399; }

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
      -webkit-backface-visibility: hidden;
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
      gap: 6px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 800;
      color: #fecaca;
      text-shadow: 0 0 8px rgba(244, 63, 94, 0.8);
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95);
      z-index: 10;
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-classic .enemy-pedestal-base {
      width: 56px;
      height: 14px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #15060c 55%, #2a0b16 100%);
      border: 1.5px solid rgba(244, 63, 94, 0.55);
    }

    /* 2. RAMPA CENTRALE VETTORIALE 3D */
    .battle-viewport-classic .trapezoid-ramp-hub {
      position: relative;
      width: 100%;
      perspective: 750px;
      transform-style: preserve-3d;
      padding: 24px 0.55rem 6px 0.55rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 15;
      margin-top: -8px;
    }

    .battle-viewport-classic .trapezoid-ramp-surface {
      position: absolute;
      inset: -78px -82px -54px -82px;
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

    .vector-ramp-compact-stage {
      position: relative;
      width: 100%;
      min-height: 110px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      transform-style: preserve-3d;
      z-index: 10;
      padding: 0 8px 6px 8px;
      box-sizing: border-box;
    }

    .bomb-satellite-pod {
      position: absolute;
      top: -44px;
      right: -2px;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: scale(0.82);
      transform-style: preserve-3d;
      z-index: 25;
      pointer-events: none;
    }

    .bomb-satellite-pod .target-num-extruded {
      font-size: 1.25rem !important;
      color: #ffffff !important;
      text-shadow: 0 0 10px #ef4444, 0 0 18px #ef4444 !important;
      margin-bottom: -3px !important;
    }

    @keyframes floatVerticalSync {
      0%, 100% { transform: translateY(-4px) scale(1); }
      50% { transform: translateY(-14px) scale(1.06); }
    }

    @keyframes socketBreatheSync {
      0%, 100% { transform: scaleX(0.92) scaleY(0.92); }
      50% { transform: scaleX(1.15) scaleY(1.18); }
    }

    @keyframes corePulseSync {
      0%, 100% { opacity: 0.55; transform: scale(0.92); }
      50% { opacity: 1; transform: scale(1.25); }
    }

    .target-pedestal-station {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      cursor: pointer;
      transform-style: preserve-3d;
      min-width: 85px;
      transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .target-pedestal-station.elevated-top {
      transform: translateY(-36px);
    }

    .target-pedestal-station.active-station-highlight {
      filter: drop-shadow(0 0 16px currentColor);
    }

    .target-tag-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      margin-bottom: 2px;
      white-space: nowrap;
      text-shadow: 0 0 8px currentColor;
      position: relative;
      z-index: 2;
    }

    .target-pedestal-station.elevated-top .target-num-extruded {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.55rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: -4px;
      position: relative;
      z-index: 10;
      color: #ffffff;
      transform-style: preserve-3d;
      animation: floatVerticalSync 2.4s infinite ease-in-out;
      text-shadow: 0 1px 0 #fff, 0 2px 0 currentColor, 0 3px 0 #000, 0 0 14px currentColor, 0 0 26px currentColor;
    }

    .target-pit-socket {
      position: relative;
      width: 52px;
      height: 15px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #050b18 55%, #101a35 100%);
      border: 1.8px solid currentColor;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      animation: socketBreatheSync 2.4s infinite ease-in-out;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), 0 0 12px currentColor;
    }

    .target-pit-socket .pit-lens {
      width: 26px;
      height: 5px;
      border-radius: 50%;
      filter: blur(1px);
      background: currentColor;
      animation: corePulseSync 2.4s infinite ease-in-out;
    }

    .target-dmg-badge-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      color: #f87171;
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(239, 68, 68, 0.45);
      padding: 1px 5px;
      border-radius: 4px;
      margin-top: 4px;
      z-index: 6;
      white-space: nowrap;
    }

    /* NUCLEO CENTRALE CON ANELLO 3D VOLUMETRICO ED OMBRA DINAMICA */
    .vector-nucleus-socket {
      position: relative;
      width: 82px;
      height: 82px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 15;
      transform-style: preserve-3d;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      margin: 0 auto;
    }

    .vector-nucleus-socket::before {
      content: '';
      position: absolute;
      bottom: -24px;
      width: 105px;
      height: 22px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.5) 55%, transparent 75%);
      filter: blur(5px);
      transform-style: preserve-3d;
      animation: groundShadowSync 4.5s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    @keyframes groundShadowSync {
      0%, 50%, 100% {
        transform: scaleX(1) scaleY(1);
        opacity: 0.5;
      }
      25%, 75% {
        transform: scaleX(1.22) scaleY(0.4) translateY(6px);
        opacity: 0.95;
      }
    }

    .vector-3d-ring {
      position: absolute;
      inset: -26px;
      border-radius: 50%;
      border: 4.5px solid rgba(0, 242, 254, 0.85);
      border-top: 6px solid #ffffff;
      border-bottom: 6px solid #00f2fe;
      transform-style: preserve-3d;
      animation: rollForwardBackwardWithShadow 4.5s linear infinite;
      pointer-events: none;
    }

    .vector-nucleus-socket.has-val .vector-3d-ring {
      border-color: rgba(250, 204, 21, 0.9);
      border-top-color: #ffffff;
      border-bottom-color: #facc15;
      animation: rollForwardBackwardWithShadowGold 4.5s linear infinite;
    }

    .vector-3d-ring::after {
      content: '';
      position: absolute;
      inset: 7px;
      border-radius: 50%;
      border: 1.4px dashed rgba(255, 255, 255, 0.75);
      transform: translateZ(6px);
    }

    .vector-3d-ring::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      border: 1px solid rgba(0, 242, 254, 0.35);
      transform: translateZ(-6px);
    }

    @keyframes rollForwardBackwardWithShadow {
      0% {
        transform: rotateX(0deg);
        box-shadow: 
          0 14px 28px rgba(0, 0, 0, 0.85),
          0 0 32px rgba(0, 242, 254, 0.9),
          inset 0 4px 14px rgba(255, 255, 255, 0.6),
          inset 0 -10px 20px rgba(0, 0, 0, 0.9);
      }
      25% {
        transform: rotateX(90deg);
        box-shadow: 
          0 32px 18px rgba(0, 0, 0, 0.95),
          0 0 14px rgba(0, 242, 254, 0.4),
          inset 0 0 25px rgba(0, 0, 0, 0.95);
      }
      50% {
        transform: rotateX(180deg);
        box-shadow: 
          0 -14px 28px rgba(0, 0, 0, 0.85),
          0 0 32px rgba(0, 242, 254, 0.9),
          inset 0 -4px 14px rgba(255, 255, 255, 0.6),
          inset 0 10px 20px rgba(0, 0, 0, 0.9);
      }
      75% {
        transform: rotateX(270deg);
        box-shadow: 
          0 32px 18px rgba(0, 0, 0, 0.95),
          0 0 14px rgba(0, 242, 254, 0.4),
          inset 0 0 25px rgba(0, 0, 0, 0.95);
      }
      100% {
        transform: rotateX(360deg);
        box-shadow: 
          0 14px 28px rgba(0, 0, 0, 0.85),
          0 0 32px rgba(0, 242, 254, 0.9),
          inset 0 4px 14px rgba(255, 255, 255, 0.6),
          inset 0 -10px 20px rgba(0, 0, 0, 0.9);
      }
    }

    @keyframes rollForwardBackwardWithShadowGold {
      0% {
        transform: rotateX(0deg);
        box-shadow: 
          0 14px 28px rgba(0, 0, 0, 0.85),
          0 0 38px rgba(250, 204, 21, 0.95),
          inset 0 4px 14px rgba(255, 255, 255, 0.65),
          inset 0 -10px 20px rgba(0, 0, 0, 0.9);
      }
      25% {
        transform: rotateX(90deg);
        box-shadow: 
          0 32px 18px rgba(0, 0, 0, 0.95),
          0 0 16px rgba(250, 204, 21, 0.4),
          inset 0 0 25px rgba(0, 0, 0, 0.95);
      }
      50% {
        transform: rotateX(180deg);
        box-shadow: 
          0 -14px 28px rgba(0, 0, 0, 0.85),
          0 0 38px rgba(250, 204, 21, 0.95),
          inset 0 -4px 14px rgba(255, 255, 255, 0.65),
          inset 0 10px 20px rgba(0, 0, 0, 0.9);
      }
      75% {
        transform: rotateX(270deg);
        box-shadow: 
          0 32px 18px rgba(0, 0, 0, 0.95),
          0 0 16px rgba(250, 204, 21, 0.4),
          inset 0 0 25px rgba(0, 0, 0, 0.95);
      }
      100% {
        transform: rotateX(360deg);
        box-shadow: 
          0 14px 28px rgba(0, 0, 0, 0.85),
          0 0 38px rgba(250, 204, 21, 0.95),
          inset 0 4px 14px rgba(255, 255, 255, 0.65),
          inset 0 -10px 20px rgba(0, 0, 0, 0.9);
      }
    }

    @keyframes floatVerticalCore {
      0%, 100% { transform: translateY(-3px) scale(1); }
      50% { transform: translateY(-12px) scale(1.06); }
    }

    .nucleus-freestanding-data {
      position: relative;
      z-index: 25;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .nucleus-freestanding-data .target-num-extruded {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.85rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: -5px;
      color: #ffffff;
      transform-style: preserve-3d;
      animation: floatVerticalCore 2.4s infinite ease-in-out;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #00f2fe, 0 3px 0 #0284c7, 0 0 16px #00f2fe, 0 0 28px #00f2fe;
    }

    .vector-nucleus-socket.has-val .nucleus-freestanding-data .target-num-extruded {
      text-shadow: 0 1px 0 #fff, 0 2px 0 #facc15, 0 3px 0 #ca8a04, 0 0 16px #facc15, 0 0 28px #facc15;
    }

    .nucleus-freestanding-data .target-pit-socket {
      width: 44px;
      height: 12px;
      border-color: #00f2fe;
      box-shadow: 0 0 10px #00f2fe;
    }

    .vector-nucleus-socket.has-val .nucleus-freestanding-data .target-pit-socket {
      border-color: #facc15;
      box-shadow: 0 0 12px #facc15;
    }

    .nucleus-freestanding-data .target-pit-socket .pit-lens {
      background: #00f2fe;
    }

    .vector-nucleus-socket.has-val .nucleus-freestanding-data .target-pit-socket .pit-lens {
      background: #facc15;
    }

    /* I 4 SEGNI MATEMATICI ORIZZONTALI (TOP: 43%) */
    .horizontal-operators-overlay {
      position: absolute;
      top: 43%;
      left: 50%;
      transform: translate(-50%, -50%) translateZ(65px);
      width: 395px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      pointer-events: none;
      z-index: 60;
      transform-style: preserve-3d;
      animation: fadeInOperators 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    @keyframes fadeInOperators {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.82) translateZ(0); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1) translateZ(65px); }
    }

    .operator-station-unit {
      width: 72px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.16s cubic-bezier(0.18, 0.89, 0.32, 1.28), filter 0.16s ease;
      pointer-events: none;
    }

    .operator-glyph-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 3.2rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: -6px;
      color: #ffffff;
      transform-style: preserve-3d;
      -webkit-text-stroke: 2px var(--op-c);
      paint-order: stroke fill;
      text-shadow:
        -1.8px -1.8px 0 var(--op-c),
         1.8px -1.8px 0 var(--op-c),
        -1.8px  1.8px 0 var(--op-c),
         1.8px  1.8px 0 var(--op-c),
         0 2.5px 0 var(--op-shadow),
         0 5px 0 var(--op-dark),
         0 8px 14px rgba(0, 0, 0, 0.95),
         0 0 20px var(--op-c),
         0 0 35px var(--op-c);
      animation: opFloatSync 2.4s infinite ease-in-out;
      z-index: 5;
    }

    .operator-station-unit .target-pit-socket {
      width: 52px;
      height: 15px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 65%, #000206 0%, #050b18 55%, #101a35 100%);
      border: 1.8px solid var(--op-c);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.95), 0 0 14px var(--op-c);
      animation: socketBreatheSync 2.4s infinite ease-in-out;
      z-index: 2;
    }

    .operator-station-unit .target-pit-socket .pit-lens {
      background: var(--op-c);
      animation: corePulseSync 2.4s infinite ease-in-out;
    }

    .operator-station-unit.op-plus {
      --op-c: #10b981;
      --op-shadow: #059669;
      --op-dark: #064e3b;
    }
    .operator-station-unit.op-minus {
      --op-c: #f59e0b;
      --op-shadow: #b45309;
      --op-dark: #451a03;
    }
    .operator-station-unit.op-mul {
      --op-c: #c084fc;
      --op-shadow: #9333ea;
      --op-dark: #3b0764;
    }
    .operator-station-unit.op-div {
      --op-c: #00f2fe;
      --op-shadow: #0284c7;
      --op-dark: #082f49;
    }

    @keyframes opFloatSync {
      0%, 100% { transform: translateY(-4px) scale(1); }
      50% { transform: translateY(-16px) scale(1.06); }
    }

    .operator-station-unit.is-targeted {
      transform: scale(1.35) translateY(-14px) translateZ(35px) !important;
      filter: brightness(1.8) drop-shadow(0 0 28px var(--op-c));
      animation: none !important;
    }

    .operator-station-unit.suggested-op {
      filter: drop-shadow(0 0 24px #10b981) brightness(1.5) !important;
      animation: opSuggestBlink 0.9s infinite alternate ease-in-out !important;
    }
    .operator-station-unit.suggested-op .operator-glyph-3d {
      color: #6ee7b7 !important;
      text-shadow: 0 0 16px #10b981, 0 0 30px #10b981 !important;
    }
    .operator-station-unit.suggested-op .target-pit-socket {
      border-color: #10b981 !important;
      box-shadow: 0 0 18px #10b981, 0 0 28px rgba(52, 211, 153, 0.7) !important;
    }
    .operator-station-unit.suggested-op .pit-lens {
      background: #10b981 !important;
    }

    @keyframes opSuggestBlink {
      0% { transform: translateY(0) scale(1); }
      100% { transform: translateY(-10px) scale(1.22); }
    }

    .battle-viewport-classic .target-green-backlight-halo {
      position: absolute;
      top: 35%;
      left: 50%;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.8) 0%, rgba(16, 185, 129, 0.25) 50%, transparent 75%);
      filter: blur(8px);
      pointer-events: none;
      z-index: 1;
      animation: ledGreenAuraPulse 1s infinite alternate ease-in-out;
    }

    @keyframes ledGreenAuraPulse {
      0% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.85); }
      100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.2); }
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

    .battle-viewport-classic .tactile-card-body.golden-card {
      background: linear-gradient(150deg, #fef08a 0%, #facc15 50%, #eab308 100%) !important;
      border: 2px solid #facc15 !important;
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.9), inset 0 0 8px rgba(250, 204, 21, 0.5) !important;
    }

    .battle-viewport-classic .golden-turns-badge-vector {
      position: absolute;
      top: -9px;
      right: -5px;
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.5rem;
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #fde047;
      box-shadow: 0 0 8px rgba(250, 204, 21, 0.85);
      z-index: 20;
      line-height: 1;
      pointer-events: none;
    }

    .floating-drag-ghost {
      position: fixed;
      width: 52px;
      height: 74px;
      margin-left: -26px;
      margin-top: -37px;
      pointer-events: none;
      z-index: 9999;
      transform-style: preserve-3d;
      filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 20px rgba(0, 242, 254, 0.95));
      opacity: 0.95;
      animation: dragCardPop 0.15s ease-out;
    }

    @keyframes dragCardPop {
      from { transform: scale(0.8); }
      to { transform: scale(1.1); }
    }

    /* 3. PIANO INFERIORE: GIOCATORE */
    .battle-viewport-classic .player-cards-section {
      position: relative;
      z-index: 40;
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
      margin-top: -14px;
      margin-bottom: 22px;
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
      touch-action: none;
    }

    .battle-viewport-classic .card-unit-station.is-dragging {
      opacity: 0.35;
      transform: scale(0.92);
    }

    .battle-viewport-classic .card-unit-station.is-selected .tactile-card-body {
      transform: translateY(-20px) translateZ(16px) scale(1.08);
      border-color: #ffffff;
      box-shadow: 0 0 26px rgba(0, 242, 254, 0.95);
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

    .battle-viewport-classic .tactile-card-body.discard-mode {
      border: 2px dashed #ef4444 !important;
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
      z-index: 5;
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
      z-index: 10;
      padding: 2px 0 6px 0;
      background: transparent;
      border: none;
      box-shadow: none;
      transform-style: preserve-3d;
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
      border-bottom: 2px solid #00f2fe;
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

    .battle-viewport-classic .tactile-btn-deck {
      flex: 0.9;
      background: linear-gradient(180deg, #7e22ce 0%, #3b0764 45%, #140224 100%);
      border-color: #a855f7;
      border-top: 2px solid #f3e8ff;
      color: #ffffff;
      box-shadow: 0 5px 0 #120321, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    /* TASTO ATTACCA MECCANICO ALLINEATO A PASSA E ABBANDONA */
    .battle-viewport-classic .tactile-btn-attack {
      flex: 1.8;
      background: linear-gradient(180deg, #0284c7 0%, #034870 45%, #011b2b 100%);
      border-color: #00f2fe;
      border-top: 2px solid #bae6fd;
      color: #ffffff;
      box-shadow: 0 5px 0 #011827, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-classic .tactile-btn-attack.btn-attack-ready {
      background: linear-gradient(180deg, #059669 0%, #047857 45%, #064e3b 100%) !important;
      border-color: #34d399 !important;
      border-top: 2px solid #a7f3d0 !important;
      box-shadow: 0 5px 0 #022c22, 0 6px 0 #000, 0 0 20px rgba(52, 211, 153, 0.85) !important;
      animation: attackPulseGlow 0.9s infinite alternate ease-in-out;
    }

    .battle-viewport-classic .tactile-btn-attack:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      filter: grayscale(0.6);
    }

    @keyframes attackPulseGlow {
      0% { transform: translateY(0); box-shadow: 0 5px 0 #022c22, 0 6px 0 #000, 0 0 14px rgba(52, 211, 153, 0.6); }
      100% { transform: translateY(-2px); box-shadow: 0 7px 0 #022c22, 0 8px 0 #000, 0 0 28px rgba(52, 211, 153, 1); }
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

    /* SCRITTA CINEMATICA SENZA SCATOLA */
    @keyframes vectorCinematicIntro {
      0% {
        opacity: 0;
        transform: scale(0.35);
        filter: blur(10px);
      }
      22% {
        opacity: 1;
        transform: scale(1.08);
        filter: blur(0px);
      }
      75% {
        opacity: 1;
        transform: scale(1.2);
        filter: blur(0px);
      }
      100% {
        opacity: 0;
        transform: scale(1.48);
        filter: blur(12px);
      }
    }

    .vector-cinematic-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 150;
      animation: vectorCinematicIntro 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .vector-cinematic-sub {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 900;
      color: #facc15;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 12px #facc15, 0 0 25px rgba(250, 204, 21, 0.7);
      margin-bottom: 6px;
    }

    .vector-cinematic-main {
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

    /* GUIDED TUTORIAL HAND & TOOLTIP STYLES */
    @keyframes handBounceVector {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-7px) scale(1.15); }
    }
    @keyframes handPulseGlowVector {
      0% { filter: drop-shadow(0 0 5px #00f2fe); }
      50% { filter: drop-shadow(0 0 15px #fde047); }
      100% { filter: drop-shadow(0 0 5px #00f2fe); }
    }
    .guided-hand-beacon {
      position: absolute;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
      animation: handBounceVector 1.1s infinite ease-in-out;
    }
    .guided-hand-icon {
      font-size: 1.6rem;
      line-height: 1;
      animation: handPulseGlowVector 1.4s infinite alternate;
    }
    .guided-tooltip-bubble {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.99));
      border: 1.5px solid #facc15;
      box-shadow: 0 0 14px rgba(250, 204, 21, 0.7);
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.58rem;
      font-weight: 900;
      white-space: nowrap;
      margin-bottom: 2px;
      text-shadow: 0 0 8px rgba(0,0,0,0.9);
      letter-spacing: 0.5px;
    }
    .guided-pulse-target {
      outline: 2px dashed #fde047 !important;
      outline-offset: 3px;
      border-radius: 4px;
      animation: guidedTargetPulseVector 0.9s infinite alternate ease-in-out !important;
    }
    @keyframes guidedTargetPulseVector {
      0% { outline-color: #00f2fe; }
      100% { outline-color: #facc15; }
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

export default function VectorBattleView({
  vectorTutorialTurn = 0,
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

  // Dati Avversario
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

  // Dati Giocatore
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
  selectedIndices = [],
  setSelectedIndices,
  selectedVectorCardIndex,
  activeScannerHints,
  handleCardClick,

  playerDeck,
    playerDiscard,
  playerTerrainSlots,
  handleRearmTerrainSlot,

  // Meccanica Vettore a 3 Stazioni
  vectorStation,
  setVectorStation,
  vectorTarget,
  vectorNucleus,

  vectorHistorySuits = [],
  vectorUsedCardsCount = 0,
  onResetVectorNucleus,
  onResetNucleus,
  vectorParityFilter = 'PARI',
  onPlayVectorPokerAttack,
  vectorBombCountdown = 3,
  vectorBombData,
  isBombAllowed = true,
  onApplyVectorOp,

  // Azioni & Tasti
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
  turn
}) {
  const [scale, setScale] = useState(1);

  // STATO SCRITTA CINEMATICA (SOLO AL 1° INCONTRO ASSOLUTO)
  const [showCinematicSplash, setShowCinematicSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('eclissi_vector_intro_banner_seen') !== 'true';
  });

  // MACCHINA A STATI DEL TUTORIAL GUIDATO
  const [guidedStep, setGuidedStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return localStorage.getItem('eclissi_vector_guided_done') === 'true' ? 0 : 1;
  });

  useEffect(() => {
    if (!showCinematicSplash) return;
    try { playSound('epic_item_trigger'); } catch (_) {}
    const t = setTimeout(() => {
      setShowCinematicSplash(false);
      localStorage.setItem('eclissi_vector_intro_banner_seen', 'true');
    }, 2100);
    return () => clearTimeout(t);
  }, [showCinematicSplash]);

    // STATO STAZIONE ATTIVA (1: Radar Balistico / Nucleo | 2: Poker a Parità)
  const [activeStation, setActiveStation] = useState(() => (vectorStation === 'poker' ? 2 : 1));
  const handleReset = onResetVectorNucleus || onResetNucleus;

  // Gestore cambio stazione con restituzione automatica della carta dal Nucleo alla mano
  const handleSwitchStation = (stationNum) => {
    try { playSound('click'); } catch (_) {}
    setActiveStation(stationNum);
    if (typeof setVectorStation === 'function') {
      setVectorStation(stationNum === 2 ? 'poker' : 'nucleus');
    }

    if (stationNum === 2) {
      // Passando a Poker, svuota il nucleo per riavere tutte le carte in mano
      if (vectorNucleus !== null && typeof handleReset === 'function') {
        handleReset();
      }
    } else {
      // Passando al Radar, azzera le selezioni Poker
      if (typeof setSelectedIndices === 'function') {
        setSelectedIndices([]);
      }
    }
  };

  // SINCRONIZZAZIONE AUTOMATICA STAZIONE IN BASE AL TURNO DEL TUTORIAL
  useEffect(() => {
    if (vectorTutorialTurn === 2) {
      setActiveStation(2);
      if (typeof setVectorStation === 'function') setVectorStation('poker');
    } else if (vectorTutorialTurn === 1) {
      setActiveStation(1);
      if (typeof setVectorStation === 'function') setVectorStation('nucleus');
    }
  }, [vectorTutorialTurn, setVectorStation]);

    // Se siamo nel Turno 1 del Tutorial e il nucleo è vuoto, assicurati che la guida sia attiva
  useEffect(() => {
    if (vectorTutorialTurn === 1 && vectorNucleus === null) {
      setGuidedStep(1);
    }
  }, [vectorTutorialTurn, vectorNucleus]);

  // Allinea activeStation se vectorStation cambia da App.jsx
  useEffect(() => {
    if (vectorStation === 'poker' && activeStation !== 2) {
      setActiveStation(2);
    } else if (vectorStation === 'nucleus' && activeStation !== 1) {
      setActiveStation(1);
    }
  }, [vectorStation, activeStation]);

  const [draggingCardIndex, setDraggingCardIndex] = useState(null);

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoveredOperator, setHoveredOperator] = useState(null);

  const opPlusRef = useRef(null);
  const opMinusRef = useRef(null);
  const opMulRef = useRef(null);
  const opDivRef = useRef(null);

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

  const scannerOn = Boolean(isScannerActive || scannerMode === 'FREE_FULL');

    useEffect(() => {
    if (vectorTutorialTurn > 0) return;
    if (scannerOn && !isPvP && activeScannerHints?.station) {
      const st = activeScannerHints.station;
      setActiveStation(st);
      if (typeof setVectorStation === 'function') {
        setVectorStation(st === 2 ? 'poker' : 'nucleus');
      }
    }
  }, [scannerOn, isPvP, activeScannerHints?.station, vectorTutorialTurn, setVectorStation]);


  useEffect(() => {
    if (guidedStep === 0) return;

    if (turn === 'ai') {
      localStorage.setItem('eclissi_vector_guided_done', 'true');
      setGuidedStep(0);
      return;
    }

    if (activeStation === 1) {
      if (vectorNucleus === null) {
        setGuidedStep(1);
      } else if (vectorNucleus !== null && selectedVectorCardIndex === null) {
        setGuidedStep(2);
      } else if (vectorNucleus !== null && selectedVectorCardIndex !== null) {
        setGuidedStep(3);
      }
    }
  }, [guidedStep, vectorNucleus, selectedVectorCardIndex, turn, activeStation]);

  const guidedCardTargetIdx = useMemo(() => {
    if (isSelectingDiscard) return null;
    const hints = activeScannerHints?.cardIndices || [];
    if (guidedStep === 1) {
      return hints.length > 0 ? hints[0] : 0;
    }
    if (guidedStep === 2) {
      const hintCard = hints.find(i => i !== selectedVectorCardIndex);
      if (hintCard !== undefined) return hintCard;
      return 1;
    }
    return 0;
  }, [guidedStep, isSelectingDiscard, activeScannerHints, selectedVectorCardIndex]);

  const targetOpSymbol = useMemo(() => {
    const raw = activeScannerHints?.ops?.[0];
    if (raw === '-' || raw === '−') return '−';
    if (raw === '*' || raw === '×') return '×';
    if (raw === '/' || raw === '÷') return '÷';
    return '+';
  }, [activeScannerHints?.ops]);

  const selectedPokerCards = useMemo(() => {
    return (selectedIndices || []).map(idx => playerHand?.[idx]).filter(Boolean);
  }, [selectedIndices, playerHand]);

  const pokerEval = useMemo(() => {
    return evaluateVectorParityPoker(selectedPokerCards, vectorParityFilter);
  }, [selectedPokerCards, vectorParityFilter]);

  const isBombDisarmedByPoker = useMemo(() => {
    if (!isBombAllowed || !vectorBombData?.target || selectedPokerCards.length < 2) return false;
    const v1 = Number(selectedPokerCards[0]?.value) || 0;
    const v2 = Number(selectedPokerCards[1]?.value) || 0;
    return (v1 + v2) === vectorBombData.target;
  }, [isBombAllowed, vectorBombData, selectedPokerCards]);

  const handleCardInteraction = (idx, e = null) => {
    if (turn !== 'player1') return;

    if (isSelectingDiscard || isExchangeMode) {
      if (typeof handleCardClick === 'function') handleCardClick(idx);
      return;
    }

    if (activeStation === 2) {
      if (selectedIndices.includes(idx)) {
        try { playSound('deselect'); } catch (_) {}
        if (typeof setSelectedIndices === 'function') {
          setSelectedIndices(prev => prev.filter(i => i !== idx));
        }
      } else {
        if (selectedIndices.length >= 5) {
          try { playSound('deselect'); } catch (_) {}
          return;
        }
        try { playSound('select'); } catch (_) {}
        if (typeof setSelectedIndices === 'function') {
          setSelectedIndices(prev => [...prev, idx]);
        }
      }
    } else {
      if (vectorNucleus === null) {
        if (typeof handleCardClick === 'function') handleCardClick(idx);
      } else {
        if (typeof handleCardClick === 'function') handleCardClick(idx);
        if (e) {
          setDraggingCardIndex(idx);
          setDragPos({ x: e.clientX, y: e.clientY });
          setHoveredOperator(null);
        }
      }
    }
  };

  const handleOperatorDirectClick = (opSymbol) => {
    if (turn !== 'player1' || isSelectingDiscard || isExchangeMode || vectorNucleus === null) return;
    
    let cardIdxToUse = selectedVectorCardIndex;
    if ((cardIdxToUse === null || cardIdxToUse === undefined) && scannerOn && (activeScannerHints?.cardIndices || []).length > 0) {
      cardIdxToUse = activeScannerHints.cardIndices[0];
    }

    if (cardIdxToUse !== null && cardIdxToUse !== undefined && typeof onApplyVectorOp === 'function') {
      const vCard = Number(playerHand?.[cardIdxToUse]?.value) || 0;
      const vNuc = Number(vectorNucleus?.value) || 0;
      let res = 0;
      if (opSymbol === '+') res = vNuc + vCard;
      else if (opSymbol === '−' || opSymbol === '-') res = vNuc - vCard;
      else if (opSymbol === '×' || opSymbol === '*') res = vNuc * vCard;
      else if (opSymbol === '÷' || opSymbol === '/') res = vCard !== 0 ? vNuc / vCard : 0;

           if (Math.abs(res - vectorTarget) < 1e-5) {
        localStorage.setItem('eclissi_vector_guided_done', 'true');
        setGuidedStep(0);
      }
      onApplyVectorOp(opSymbol, cardIdxToUse);
    }
  };

  useEffect(() => {
    if (draggingCardIndex === null) return;

    const handlePointerMove = (e) => {
      setDragPos({ x: e.clientX, y: e.clientY });

      const targets = [
        { ref: opPlusRef, op: '+' },
        { ref: opMinusRef, op: '−' },
        { ref: opMulRef, op: '×' },
        { ref: opDivRef, op: '÷' }
      ];

      let bestOp = null;
      let minDist = 52;

      targets.forEach(({ ref, op }) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
        if (dist < minDist) {
          minDist = dist;
          bestOp = op;
        }
      });

      setHoveredOperator(bestOp);
    };

    const handlePointerUp = () => {
      if (hoveredOperator !== null && draggingCardIndex !== null) {
        if (typeof onApplyVectorOp === 'function') {
          const vCard = Number(playerHand?.[draggingCardIndex]?.value) || 0;
          const vNuc = Number(vectorNucleus?.value) || 0;
          let res = 0;
          if (hoveredOperator === '+') res = vNuc + vCard;
          else if (hoveredOperator === '−' || hoveredOperator === '-') res = vNuc - vCard;
          else if (hoveredOperator === '×' || hoveredOperator === '*') res = vNuc * vCard;
          else if (hoveredOperator === '÷' || hoveredOperator === '/') res = vCard !== 0 ? vNuc / vCard : 0;

          if (Math.abs(res - vectorTarget) < 1e-5) {
            localStorage.setItem('eclissi_vector_guided_done', 'true');
            setGuidedStep(0);
          }

          onApplyVectorOp(hoveredOperator, draggingCardIndex);
        }
      }
      setDraggingCardIndex(null);
      setHoveredOperator(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingCardIndex, hoveredOperator, onApplyVectorOp, vectorNucleus, vectorTarget, playerHand]);

  const currentGlobalSector = isAdv ? ((currentAdvPlanet - 1) * 10 + currentAdvLevel) : 100;
  const isTerrainAllowed = isPvP || !isAdv || currentGlobalSector >= 8 || (playerTerrainSlots || []).some(s => s?.card);
  const isAbilityModuleUnlocked = isPvP || !isAdv || currentGlobalSector >= 9 || Boolean(selectedAbility);
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

  const abilityName = selectedAbility?.toUpperCase() || 'MODULO';
  const abilityLvl = Math.min(abilities?.[selectedAbility]?.level || 1, 9);

  const draggingCard = draggingCardIndex !== null ? playerHand?.[draggingCardIndex] : null;

  const isOpSuggested = (opSymbol) => {
    if (!scannerOn || isPvP || activeStation !== 1) return false;
    const targetOps = activeScannerHints?.ops || [];
    if (opSymbol === '+' && targetOps.includes('+')) return true;
    if ((opSymbol === '−' || opSymbol === '-') && (targetOps.includes('-') || targetOps.includes('−'))) return true;
    if ((opSymbol === '×' || opSymbol === '*') && (targetOps.includes('*') || targetOps.includes('×'))) return true;
    if ((opSymbol === '÷' || opSymbol === '/') && (targetOps.includes('/') || targetOps.includes('÷'))) return true;
    return false;
  };

  const isPilotResonant = checkPilotSetResonance(selectedPilot, selectedDeck, selectedAbility);
  const currentPilotLvl = pilotInventory?.[selectedPilot]?.level || 1;

  // CONVALIDA DELLO STATO ATTACCO PER IL TASTO MECCANICO
  const isAttackReady = activeStation === 2 && pokerEval.isValid && turn === 'player1' && !isSelectingDiscard;
  const isGuidedAttack = !showCinematicSplash && isAttackReady;

  return (
    <div className="classic-screen-wrapper">
      <div className="battle-viewport-tris battle-viewport-classic" style={{ transform: `scale(${scale})` }}>
        
        {/* SCRITTA CINEMATICA PURA */}
        {showCinematicSplash && (
          <div className="vector-cinematic-overlay">
            <div className="vector-cinematic-sub">✦ NUOVA MODALITÀ ✦</div>
            <div className="vector-cinematic-main">VETTORE GEOMETRICO</div>
          </div>
        )}

        {/* 1. PIANO SUPERIORE: AVVERSARIO */}
        <div className="enemy-mega-plane">
          <div className="enemy-plane-backdrop"></div>

          <div className="hud-enemy-telemetry">
            <div className="vital-telemetry-row">
              <span className="boss-name-3d">{enemyName}</span>
              <span className="boss-hp-3d">{aiHp} <span>/ {maxAiHp} HP</span></span>
              <span className="timer-readout">⏳ {aiTimer}s</span>
              {aiTimeTank > 0 && <span className="tank-readout enemy-tank">🛢️ +{aiTimeTank}s</span>}
              <span className="tactile-status-badge enemy-phase-tag">
                {isAdv && currentAdvLevel === 10 ? `FASE ${bossPhase}/${maxBossPhases}` : 'ATTIVO'}
              </span>
            </div>

            <div className="hp-prismatic-dock">
              <div className="hp-segmented-grid"></div>
              <div 
                className="enemy-hp-fill-3d" 
                style={{ width: `${Math.max(0, Math.min(100, (aiHp / (maxAiHp || 1)) * 100))}%` }}
              ></div>
            </div>
          </div>

          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div className="malus-gauge-box">
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
                <div className="equip-pedestal-station station-enemy-dice">
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">DADI {Object.values(aiNotches || {}).filter(Boolean).length}/4</span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div className="equip-pedestal-station station-enemy-module">
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
              style={{ '--deck-thick': `${enemyDeckThickness}px` }}
            >
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

            {/* BANCO TERRENO NEMICO A 4 SLOT */}
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
            <span>{aiActionMessage || "L'avversario sta calcolando i vettori..."}</span>
          </div>
        )}

        {/* MANO AVVERSARIA */}
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

        {/* 2. RAMPA CENTRALE: LE 3 STAZIONI VETTORIALI COORDINATE */}
        <div className="trapezoid-ramp-hub">
          <div className="trapezoid-ramp-surface">
            <div className="trapezoid-grid-lines"></div>
          </div>

                    {/* SELETTORE TATTICO STAZIONE VETTORE (STAZ 1 vs STAZ 2) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', width: '100%', marginBottom: '8px', zIndex: 20 }}>
            <button
              onClick={() => handleSwitchStation(1)}
              className="cyber-btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.62rem',
                fontWeight: 900,
                fontFamily: 'Orbitron, sans-serif',
                border: activeStation === 1 ? '1.5px solid #00f2fe' : '1px solid rgba(255,255,255,0.15)',
                background: activeStation === 1 ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.6), rgba(15, 23, 42, 0.95))' : 'rgba(15, 23, 42, 0.7)',
                color: activeStation === 1 ? '#00f2fe' : '#94a3b8',
                boxShadow: activeStation === 1 ? '0 0 14px rgba(0, 242, 254, 0.5)' : 'none'
              }}
            >
              🎯 STAZ. 1: RADAR BALISTICO
            </button>

            <button
              onClick={() => handleSwitchStation(2)}
              className="cyber-btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.62rem',
                fontWeight: 900,
                fontFamily: 'Orbitron, sans-serif',
                border: activeStation === 2 ? '1.5px solid #facc15' : '1px solid rgba(255,255,255,0.15)',
                background: activeStation === 2 ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(15, 23, 42, 0.95))' : 'rgba(15, 23, 42, 0.7)',
                color: activeStation === 2 ? '#fde047' : '#94a3b8',
                boxShadow: activeStation === 2 ? '0 0 14px rgba(250, 204, 21, 0.5)' : 'none'
              }}
            >
              🃏 STAZ. 2: POKER A PARITÀ
            </button>
          </div>


          {/* PALCO CENTRALE 3D */}
          <div className="vector-ramp-compact-stage">
            
                        {/* 1. A SINISTRA: NUMERO BERSAGLIO (STAZIONE 1 - RADAR) */}
            <div 
              className={`target-pedestal-station elevated-top ${activeStation === 1 ? 'active-station-highlight' : ''}`}
              style={{ color: '#00f2fe' }}
              onClick={() => handleSwitchStation(1)}
              title="Stazione 1: Radar Balistico (Target)"
            >

              {scannerOn && activeScannerHints?.hasSolution && activeScannerHints?.station === 1 && (
                <div className="target-green-backlight-halo"></div>
              )}

              <span className="target-tag-label" style={{ color: activeStation === 1 ? '#00f2fe' : '#64748b' }}>
                BERSAGLIO
              </span>
              
              <div className="target-num-extruded" style={{ color: activeStation === 1 ? '#ffffff' : '#94a3b8' }}>
                {vectorTarget}
              </div>

              <div className="target-pit-socket" style={{ borderColor: activeStation === 1 ? '#00f2fe' : '#475569' }}>
                <div className="pit-lens" style={{ background: activeStation === 1 ? '#00f2fe' : '#475569' }}></div>
              </div>

              <div className="target-dmg-badge-3d" style={{ borderColor: '#00f2fe', color: '#7dd3fc' }}>
                ⚔️ 10-20 HP
              </div>
            </div>

                        {/* 2. AL CENTRO: IL GRANDE NUCLEO 3D */}
            <div 
              className={`vector-nucleus-socket ${vectorNucleus ? 'has-val' : ''}`}
              onClick={() => {
                handleSwitchStation(1);
                if (vectorNucleus && typeof handleReset === 'function') {
                  handleReset();
                }
              }}
              title={vectorNucleus ? "Tocca per azzerare il nucleo e riprendere la carta" : "Scegli una carta dalla mano per caricare il nucleo"}
            >

              <div className="vector-3d-ring"></div>

              <div className="nucleus-freestanding-data">
                <span className="target-tag-label" style={{ color: vectorNucleus ? '#fde047' : '#94a3b8', fontSize: '0.48rem', marginBottom: '1px' }}>
                  {vectorNucleus ? 'NUCLEO' : 'CARICA'}
                </span>
                
                <div className="target-num-extruded">
                  {vectorNucleus ? vectorNucleus.value : '---'}
                </div>

                <div className="target-pit-socket">
                  <div className="pit-lens"></div>
                </div>
                
                {vectorNucleus ? (
                  <span style={{ fontSize: '0.48rem', fontWeight: 900, color: '#facc15', textShadow: '0 0 6px #facc15', marginTop: '2px' }}>
                    {vectorUsedCardsCount}/4 C ↺
                  </span>
                ) : (
                  <span style={{ fontSize: '0.44rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                    1ª CARTA
                  </span>
                )}
              </div>
            </div>

            {/* 3. A DESTRA: POKER A PARITÀ CON SATELLITE BOMBA IN ALTO A DESTRA */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* SATELLITE IN ALTO A DESTRA: NUMERO BOMBA */}
              {isBombAllowed && (
                <div 
                  className="bomb-satellite-pod"
                  style={{ color: '#ef4444' }}
                >
                  <span className="target-tag-label" style={{ color: vectorBombCountdown <= 1 ? '#ef4444' : '#fca5a5', fontSize: '0.46rem' }}>
                    {vectorBombCountdown <= 0 ? '💣 ESPLOSA' : `💣 BOMBA ${vectorBombCountdown}T`}
                  </span>
                  
                  <div className="target-num-extruded">
                    {vectorBombData?.target || 16}
                  </div>

                  <div className="target-pit-socket" style={{ width: '42px', height: '12px', borderColor: '#ef4444' }}>
                    <div className="pit-lens" style={{ width: '20px', height: '4px', background: '#ef4444' }}></div>
                  </div>

                  <div className="target-dmg-badge-3d" style={{ fontSize: '0.44rem', padding: '1px 3px', borderColor: '#ef4444', color: '#fca5a5', marginTop: '2px' }}>
                    +30 HP (2C)
                  </div>
                </div>
              )}

                            {/* BERSAGLIO PARI DISPARI CON COMBINAZIONE POKER */}
              <div 
                className={`target-pedestal-station elevated-top ${activeStation === 2 ? 'active-station-highlight' : ''}`}
                style={{ color: vectorParityFilter === 'PARI' ? '#38bdf8' : '#facc15' }}
                onClick={() => handleSwitchStation(2)}
                title="Stazione 2: Bersaglio Pari/Dispari con combinazione Poker"
              >

                {scannerOn && activeScannerHints?.hasSolution && activeScannerHints?.station === 2 && (
                  <div className="target-green-backlight-halo"></div>
                )}

                <span className="target-tag-label" style={{ color: activeStation === 2 ? '#fde047' : '#64748b' }}>
                  POKER
                </span>

                <div className="target-num-extruded" style={{ fontSize: '1.25rem', letterSpacing: '1px', color: vectorParityFilter === 'PARI' ? '#38bdf8' : '#facc15' }}>
                  ∑ {vectorParityFilter}
                </div>

                <div className="target-pit-socket" style={{ borderColor: vectorParityFilter === 'PARI' ? '#38bdf8' : '#facc15' }}>
                  <div className="pit-lens" style={{ background: vectorParityFilter === 'PARI' ? '#38bdf8' : '#facc15' }}></div>
                </div>

                <div 
                  className="target-dmg-badge-3d" 
                  style={{ 
                    borderColor: activeStation === 2 && pokerEval.isValid ? '#10b981' : '#facc15', 
                    color: activeStation === 2 && pokerEval.isValid ? '#6ee7b7' : '#fef08a' 
                  }}
                >
                  {activeStation === 2 && pokerEval.isValid 
                    ? `${pokerEval.combo.name} (-${pokerEval.damage} HP)` 
                    : '2-5 CARTE'}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* OPERATORI MATEMATICI ORIZZONTALI (SOLO STAZIONE 1 E NUCLEO PRONTO) */}
        {activeStation === 1 && (draggingCardIndex !== null || selectedVectorCardIndex !== null) && vectorNucleus !== null && (
          <div className="horizontal-operators-overlay" style={{ pointerEvents: 'auto' }}>
            
            {/* [+] ADDIZIONE */}
            {(() => {
              const isHint = isOpSuggested('+');
              const isGuidedOp = !showCinematicSplash && turn === 'player1' && guidedStep === 3 && (targetOpSymbol === '+');
              return (
                <div 
                  ref={opPlusRef} 
                  onClick={() => handleOperatorDirectClick('+')}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  className={`operator-station-unit op-plus ${hoveredOperator === '+' ? 'is-targeted' : ''} ${isHint ? 'suggested-op' : ''} ${isGuidedOp ? 'guided-pulse-target' : ''}`}
                >
                  {isGuidedOp && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">3. Tocca operatore per il Target 🎯</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  <div className="operator-glyph-3d">+</div>
                  <div className="target-pit-socket"><div className="pit-lens"></div></div>
                </div>
              );
            })()}

            {/* [−] SOTTRAZIONE */}
            {(() => {
              const isHint = isOpSuggested('−');
              const isGuidedOp = !showCinematicSplash && turn === 'player1' && guidedStep === 3 && (targetOpSymbol === '−');
              return (
                <div 
                  ref={opMinusRef} 
                  onClick={() => handleOperatorDirectClick('−')}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  className={`operator-station-unit op-minus ${hoveredOperator === '−' ? 'is-targeted' : ''} ${isHint ? 'suggested-op' : ''} ${isGuidedOp ? 'guided-pulse-target' : ''}`}
                >
                  {isGuidedOp && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">3. Tocca operatore per il Target 🎯</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  <div className="operator-glyph-3d">−</div>
                  <div className="target-pit-socket"><div className="pit-lens"></div></div>
                </div>
              );
            })()}

            {/* [×] MOLTIPLICAZIONE */}
            {(() => {
              const isHint = isOpSuggested('×');
              const isGuidedOp = !showCinematicSplash && turn === 'player1' && guidedStep === 3 && (targetOpSymbol === '×');
              return (
                <div 
                  ref={opMulRef} 
                  onClick={() => handleOperatorDirectClick('×')}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  className={`operator-station-unit op-mul ${hoveredOperator === '×' ? 'is-targeted' : ''} ${isHint ? 'suggested-op' : ''} ${isGuidedOp ? 'guided-pulse-target' : ''}`}
                >
                  {isGuidedOp && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">3. Tocca operatore per il Target 🎯</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  <div className="operator-glyph-3d">×</div>
                  <div className="target-pit-socket"><div className="pit-lens"></div></div>
                </div>
              );
            })()}

            {/* [÷] DIVISIONE */}
            {(() => {
              const isHint = isOpSuggested('÷');
              const isGuidedOp = !showCinematicSplash && turn === 'player1' && guidedStep === 3 && (targetOpSymbol === '÷');
              return (
                <div 
                  ref={opDivRef} 
                  onClick={() => handleOperatorDirectClick('÷')}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  className={`operator-station-unit op-div ${hoveredOperator === '÷' ? 'is-targeted' : ''} ${isHint ? 'suggested-op' : ''} ${isGuidedOp ? 'guided-pulse-target' : ''}`}
                >
                  {isGuidedOp && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">3. Tocca operatore per il Target 🎯</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  <div className="operator-glyph-3d">÷</div>
                  <div className="target-pit-socket"><div className="pit-lens"></div></div>
                </div>
              );
            })()}

          </div>
        )}

        {/* 3. MANO DEL GIOCATORE CON GUIDA INTERATTIVA */}
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
                : (activeStation === 2 
                    ? selectedIndices.includes(idx)
                    : (draggingCardIndex === idx || selectedVectorCardIndex === idx));

              const isSuggested = !isPvP && scannerOn && !isSelectingDiscard && (activeScannerHints?.cardIndices || []).includes(idx);
              const isGolden = (playerGoldenCardId && card.id === playerGoldenCardId) || Boolean(card.isGolden);

              const suitKey = card.suit || 'hearts';
              const suitClass = suitKey === 'diamonds' ? 'card-diamonds' :
                                suitKey === 'spades' ? 'card-spades' :
                                suitKey === 'clubs' ? 'card-clubs' : 'card-hearts';

              const suitTag = suitKey === 'diamonds' ? '+2🌟' :
                              suitKey === 'spades' ? '+3HP' :
                              suitKey === 'clubs' ? '+5s' : '+8% HP';

              const isThisDragging = draggingCardIndex === idx;

                const isGuidedCard = !showCinematicSplash && turn === 'player1' && !isSelectingDiscard && (
    (activeStation === 1 && (
      ((guidedStep === 1 && vectorNucleus === null) || (guidedStep === 2 && vectorNucleus !== null && selectedVectorCardIndex === null)) && idx === guidedCardTargetIdx
    )) ||
    (activeStation === 2 && !isAttackReady && (
      (vectorTutorialTurn === 2 || guidedStep > 0) && (activeScannerHints?.cardIndices || [0, 1]).includes(idx) && !selectedIndices.includes(idx)
    ))
  );

  return (

                <div 
                  key={card.id || idx}
                  className={`card-unit-station ${suitClass} ${isThisDragging ? 'is-dragging' : (isSelected ? 'is-selected' : '')}`}
                  onPointerDown={(e) => {
                    if (activeStation === 1 && !isSelectingDiscard) handleCardInteraction(idx, e);
                  }}
                  onClick={() => {
                    if (activeStation === 2 || isExchangeMode || isSelectingDiscard) {
                      handleCardInteraction(idx);
                    }
                  }}
                >
                                    {isGuidedCard && (
                    <div className="guided-hand-beacon" style={{ bottom: '105%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">
                        {activeStation === 1
                          ? (guidedStep === 1 
                              ? '1. Tocca una carta per caricarla nel Nucleo' 
                              : '2. Scegli la 2ª carta per calcolare la traiettoria')
                          : 'Seleziona le carte per la figura Poker'}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}


                  <div className={`tactile-card-body ${isGolden ? 'golden-card' : ''} ${isSuggested ? 'suggested' : ''} ${isSelectingDiscard ? 'discard-mode' : ''} ${isGuidedCard ? 'guided-pulse-target' : ''}`}>
                    {isGolden && (
                      <span className="golden-turns-badge-vector">
                        {playerGoldenTurns ? `${playerGoldenTurns}T` : '2T'}
                      </span>
                    )}

                    <span className="card-suit-label">{card.symbol}</span>
                    <span className="card-num-3d">{card.displayVal || card.value}</span>
                    <span className="card-effect-tag">
                      {isSelectingDiscard ? '✕ SCARTA' : (activeStation === 2 && isSelected ? '✓ SCELTA' : (card.isCourt ? card.value : suitTag))}
                    </span>
                  </div>
                  <div className="card-pit-base"><div className="card-pit-lens"></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. PIANO INFERIORE GIOCATORE */}
        <div className="player-mega-plane">
          <div className="player-plane-backdrop"></div>

          <div className="player-field-cards-row">
            <div 
              className="card-deck-stack-block"
              style={{ '--deck-thick': `${playerDeckThickness}px` }}
            >
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

            {/* SLOT PILOTA TATTICO */}
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

            {/* BANCO TERRENO GIOCATORE A 4 SLOT */}
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
                        <div className="terrain-rearm-tag">
                          RIARMA
                        </div>
                      )}
                      <div className="terrain-card-inner">
                        <div className="terrain-card-face terrain-face-back" style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
                          <TerrainVisual width={48} height={68} isBack={true} color={slot.card?.color || '#38bdf8'} />
                        </div>
                        <div 
                          className="terrain-card-face terrain-face-front" 
                          style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#38bdf8'}` }}
                        >
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
              <div className="malus-gauge-box" style={{ borderColor: 'rgba(0,242,254,0.4)' }}>
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
                  onClick={() => {
                    if (playerDiceReady && typeof executeQuantumDiceRoll === 'function') {
                      executeQuantumDiceRoll();
                    }
                  }}
                >
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">
                    {playerDiceReady ? 'LANCIA!' : `DADI ${Object.values(playerNotches || {}).filter(Boolean).length}/4`}
                  </span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div 
                  className="equip-pedestal-station station-module"
                  onClick={() => {
                    if (isAbilityReady && typeof handleManualSkillTrigger === 'function') {
                      handleManualSkillTrigger();
                    }
                  }}
                >
                  <div className="equip-stationary-art">
                    <ModuleIcon id={selectedAbility} size={28} color="#00f2fe" />
                  </div>
                  <span className="equip-label-tag">
                    {isAbilityReady ? 'PRONTO!' : `${abilityName} L.${abilityLvl}`}
                  </span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isEpic1Unlocked && (
                <div 
                  className={`equip-pedestal-station station-mobius ${isItem1Used ? 'item-exhausted' : (isItem1Usable ? 'item-usable' : '')}`}
                  onClick={() => {
                    if (isItem1Usable && typeof handleActivateEpicItem === 'function') {
                      handleActivateEpicItem(item1Id);
                    }
                  }}
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

          {/* CLUSTER AZIONI: TUTTI I TASTI ALLINEATI CON LO STESSO STILE MECCANICO 3D */}
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
                <button 
                  className="tactile-btn-mech tactile-btn-abandon"
                  onClick={() => setShowAbandonConfirm(true)}
                >
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

                {/* TASTO ATTACCA MECCANICO 3D (STESSO IDENTICO STILE DI PASSA E ABBANDONA) */}
                <button
                  type="button"
                  className={`tactile-btn-mech tactile-btn-attack ${isAttackReady ? 'btn-attack-ready' : ''} ${isGuidedAttack ? 'guided-pulse-target' : ''}`}
                  disabled={turn !== 'player1' || isSelectingDiscard || !isAttackReady}
                  onClick={() => {
                    if (isAttackReady && typeof onPlayVectorPokerAttack === 'function') {
                      localStorage.setItem('eclissi_vector_guided_done', 'true');
                      setGuidedStep(0);
                      onPlayVectorPokerAttack();
                    }
                  }}
                >
                  {isGuidedAttack && (
                    <div className="guided-hand-beacon" style={{ bottom: '120%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">Attacca col Poker a Parità ➔</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  {isAttackReady ? 'ATTACCA ➔' : 'ATTACCA'}
                </button>

                <button 
                  className="tactile-btn-mech tactile-btn-change"
                  style={{
                    opacity: (hasExchangedThisTurn || isExchangeBlockedByModifier || turn !== 'player1' || isSelectingDiscard) ? 0.45 : 1
                  }}
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
              <span className="tank-readout">🛢️ +{playerTimeTank || 0}s</span>
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

      {/* CARTA GHOST FLUTTUANTE DURANTE IL TRASCINAMENTO */}
      {draggingCard && (
        <div 
          className="floating-drag-ghost"
          style={{ left: `${dragPos.x}px`, top: `${dragPos.y}px` }}
        >
          <div 
            className="tactile-card-body" 
            style={{ 
              width: '52px', 
              height: '74px', 
              borderColor: draggingCard.color || '#00f2fe',
              boxShadow: `0 0 24px ${draggingCard.color || '#00f2fe'}` 
            }}
          >
            <span className="card-num-3d" style={{ fontSize: '1.45rem', textShadow: `0 0 14px ${draggingCard.color}` }}>
              {draggingCard.displayVal || draggingCard.value}
            </span>

            <span className="card-effect-tag" style={{ color: draggingCard.color }}>
              {hoveredOperator ? `APPLICA ${hoveredOperator}` : 'TRASCINA'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
