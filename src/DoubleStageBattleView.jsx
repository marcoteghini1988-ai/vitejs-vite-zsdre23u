import React, { useState, useEffect, useMemo } from 'react';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';

// ============================================================================
// METADATI OGGETTI EPICI (NECESSARI PER GLI SLOT LIVELLO 20 & 60)
// ============================================================================
const EPIC_META = Object.freeze({
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
});

// Iniezione isolata degli stili 3D per Modalità Convergenza
(function injectDuel3DStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-duel-3d-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    :root {
      --vortex-spiral: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='sGrad' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='1'/%3E%3Cstop offset='22%25' stop-color='%23fde047' stop-opacity='0.95'/%3E%3Cstop offset='45%25' stop-color='%23d97706' stop-opacity='0.8'/%3E%3Cstop offset='75%25' stop-color='%23451a03' stop-opacity='0.35'/%3E%3Cstop offset='100%25' stop-color='%23000000' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='none' stroke='url(%23sGrad)' stroke-linecap='round'%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(72 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(144 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(216 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(288 50 50)'/%3E%3C/g%3E%3C/svg%3E");
    }

    .duel-screen-wrapper {
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

    .battle-viewport-duel {
      position: relative;
      width: 440px;
      height: 840px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
      transform-origin: center center;
      perspective: 950px;
      transform-style: preserve-3d;
      backface-visibility: hidden;
      will-change: transform;
      z-index: 2;
    }

    @keyframes blackHoleVortexSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes bombStepBlink {
      0% { filter: brightness(1); }
      100% { filter: brightness(1.8); }
    }

    @keyframes cardSlotSnap {
      0% { transform: scale(0.65) translateY(14px) translateZ(30px); opacity: 0.4; }
      70% { transform: scale(1.15) translateY(-4px) translateZ(10px); }
      100% { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
    }

    .battle-viewport-duel .enemy-mega-plane {
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

    .battle-viewport-duel .enemy-plane-backdrop {
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

    .battle-viewport-duel .hud-enemy-telemetry {
      position: relative;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
    }

    .battle-viewport-duel .boss-name-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 16px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-duel .boss-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 14px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-duel .boss-hp-3d span {
      font-size: 0.62rem;
      color: #fda4af;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
    }

    .battle-viewport-duel .hp-prismatic-dock {
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

    .battle-viewport-duel .hp-segmented-grid {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(90deg, transparent 0, transparent 18px, rgba(0, 0, 0, 0.55) 18px, rgba(0, 0, 0, 0.55) 20px);
      pointer-events: none;
      z-index: 3;
    }

    .battle-viewport-duel .enemy-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #991b1b 0%, #dc2626 35%, #f43f5e 75%, #ff758f 100%);
      box-shadow: 0 0 14px #f43f5e, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-duel .player-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #064e3b 0%, #059669 35%, #10b981 75%, #6ee7b7 100%);
      box-shadow: 0 0 14px #10b981, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-duel .vital-telemetry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .battle-viewport-duel .timer-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 900;
      color: #facc15;
      white-space: nowrap;
    }

    .battle-viewport-duel .tank-readout {
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

    .battle-viewport-duel .tank-readout.enemy-tank {
      color: #facc15;
      background: rgba(250, 204, 21, 0.15);
      border-color: rgba(250, 204, 21, 0.4);
    }

    .battle-viewport-duel .tactile-status-badge {
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

    .battle-viewport-duel .enemy-phase-tag {
      background: rgba(244, 63, 94, 0.2);
      border: 1px solid #f43f5e;
      color: #fda4af;
      box-shadow: 0 0 6px rgba(244, 63, 94, 0.35);
    }

    .battle-viewport-duel .equip-objects-row {
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

    .battle-viewport-duel .malus-gauge-box {
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

    .battle-viewport-duel .malus-gauge-box.warning-active {
      animation: malusBoxPulse var(--pulse-speed, 1s) infinite alternate ease-in-out;
    }

    @keyframes malusBoxPulse {
      0% { border-color: rgba(244, 63, 94, 0.4); box-shadow: inset 0 1px 4px #000, 0 0 4px rgba(244, 63, 94, 0.2); }
      100% { border-color: #ff0055; box-shadow: inset 0 1px 4px #000, 0 0 14px rgba(255, 0, 85, 0.85); }
    }

    .battle-viewport-duel .malus-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      color: #fca5a5;
      letter-spacing: 0.5px;
    }

    .battle-viewport-duel .malus-pip-array {
      display: flex;
      gap: 3px;
      width: 100%;
    }

    .battle-viewport-duel .malus-pip-cell {
      flex: 1;
      height: 6px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 2px #000;
      transition: all 0.2s;
    }

    .battle-viewport-duel .malus-pip-cell.filled {
      background: #f43f5e;
      box-shadow: 0 0 6px #f43f5e;
    }

    .battle-viewport-duel .malus-detonation-ring {
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

    .battle-viewport-duel .right-equip-cluster {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      transform-style: preserve-3d;
      margin-left: auto;
    }

    .battle-viewport-duel .equip-pedestal-station {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-duel .equip-stationary-art {
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

    .battle-viewport-duel .equip-label-tag {
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

    .battle-viewport-duel .equip-pit-base {
      width: 44px;
      height: 12px;
      border-radius: 50%;
      background: #000000;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-top: 1.8px solid rgba(255, 255, 255, 0.7);
      border-bottom: 2px solid #000;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 3px 5px #000000, 0 0 10px currentColor;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scaleY(0.55);
      position: relative;
      overflow: hidden;
      z-index: 2;
    }

    .battle-viewport-duel .equip-pit-base::before {
      content: '';
      position: absolute;
      width: 44px;
      height: 44px;
      top: calc(50% - 22px);
      left: calc(50% - 22px);
      border-radius: 50%;
      background: var(--vortex-spiral) center/cover no-repeat;
      animation: blackHoleVortexSpin 4.5s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    .battle-viewport-duel .equip-pit-lens {
      position: relative;
      z-index: 3;
      width: 16px;
      height: 5px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 6px #facc15, inset 0 0 3px #000000;
    }

    .battle-viewport-duel .station-dice { color: #f59e0b; }
    .battle-viewport-duel .station-dice .equip-label-tag { color: #fde047; }
    .battle-viewport-duel .station-dice.dice-is-ready {
      color: #facc15;
      filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-duel .station-module { color: #10b981; }
    .battle-viewport-duel .station-module .equip-label-tag { color: #34d399; }
    .battle-viewport-duel .station-module.is-overcharged {
      color: #00f2fe;
      filter: drop-shadow(0 0 12px rgba(0, 242, 254, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-duel .module-beacon-beam {
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

    .battle-viewport-duel .station-enemy-dice { color: #f43f5e; }
    .battle-viewport-duel .station-enemy-dice .equip-label-tag { color: #fca5a5; }
    .battle-viewport-duel .station-enemy-module { color: #00f2fe; }
    .battle-viewport-duel .station-enemy-module .equip-label-tag { color: #7dd3fc; }
    .battle-viewport-duel .station-mobius { color: #facc15; }
    .battle-viewport-duel .station-mobius .equip-label-tag { color: #fde047; }
    .battle-viewport-duel .station-piston { color: #ef4444; }
    .battle-viewport-duel .station-piston .equip-label-tag { color: #f87171; }

    .battle-viewport-duel .equip-pedestal-station.item-usable {
      cursor: pointer !important;
      filter: drop-shadow(0 0 10px currentColor);
    }
    .battle-viewport-duel .equip-pedestal-station.item-exhausted {
      opacity: 0.35;
      filter: grayscale(0.9);
      cursor: not-allowed !important;
    }

    .battle-viewport-duel .enemy-field-cards-row,
    .battle-viewport-duel .player-field-cards-row {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
      z-index: 5;
    }
    .battle-viewport-duel .enemy-field-cards-row { margin-bottom: 6px; }

    .battle-viewport-duel .card-deck-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      transform-style: preserve-3d;
      margin-right: 6px;
      --deck-thick: 14px;
    }

    .battle-viewport-duel .deck-ground-shadow {
      position: absolute;
      bottom: -5px;
      left: -4px;
      right: -4px;
      height: 20px;
      border-radius: 50%;
      background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.5) 60%, transparent 80%);
      filter: blur(3px);
      z-index: 1;
      pointer-events: none;
    }

    .battle-viewport-duel .deck-cards-stack-body {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(80px + var(--deck-thick));
      border-radius: 7px;
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #f1f5f9 0px, #f1f5f9 1.2px, #091024 1.2px, #091024 2.6px);
      border: 1.2px solid rgba(245, 158, 11, 0.5);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95), inset 0 0 6px rgba(0, 0, 0, 0.9);
      z-index: 2;
    }

    .battle-viewport-duel .enemy-deck-theme .deck-cards-stack-body {
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #fecaca 0px, #fecaca 1.2px, #1c050d 1.2px, #1c050d 2.6px);
      border-color: rgba(244, 63, 94, 0.5);
    }

    .battle-viewport-duel .card-deck-top {
      width: 100%;
      height: 80px;
      position: absolute;
      left: 0;
      bottom: var(--deck-thick);
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 0;
      z-index: 5;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
    }

    .battle-viewport-duel .deck-count-badge {
      position: absolute;
      bottom: -6px;
      background: rgba(2, 6, 23, 0.95);
      border: 1.5px solid #f59e0b;
      border-radius: 5px;
      padding: 1px 5px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.58rem;
      font-weight: 900;
      color: #fde047;
      z-index: 10;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.6);
    }

    .battle-viewport-duel .card-discard-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }

    .battle-viewport-duel .card-discard-top {
      width: 100%;
      height: 100%;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 4px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
    }

    .battle-viewport-duel .terrains-horizontal-bank {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      margin-left: auto;
      flex: 0 0 auto;
      position: relative;
      z-index: 5;
    }

    .battle-viewport-duel .terrain-horizontal-card {
      width: 48px;
      height: 68px;
      flex: 0 0 48px;
      perspective: 600px;
      position: relative;
    }

    .battle-viewport-duel .terrain-card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      border-radius: 7px;
    }
    .battle-viewport-duel .terrain-horizontal-card.is-revealed .terrain-card-inner { transform: rotateY(180deg); }

    .battle-viewport-duel .terrain-card-face {
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

    .battle-viewport-duel .terrain-face-back {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.45);
      z-index: 2;
      transform: rotateY(0deg);
    }
    .battle-viewport-duel .terrain-face-back.enemy-border { border-color: rgba(244, 63, 94, 0.45); }

    .battle-viewport-duel .terrain-face-front {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid #00f2fe;
      transform: rotateY(180deg);
      z-index: 1;
    }

    .battle-viewport-duel .terrain-empty-slot {
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

    .battle-viewport-duel .terrain-rearm-tag {
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

    .battle-viewport-duel .enemy-action-ticker {
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

    .battle-viewport-duel .wall-hand-rack {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 3px;
      width: 100%;
      padding: 0 0.55rem;
      position: relative;
      transform-style: preserve-3d;
    }

    .battle-viewport-duel .wall-hand-rack.enemy-side {
      transform: translateZ(38px);
      z-index: 30;
      margin-top: 4px;
      margin-bottom: -2px;
      pointer-events: none;
    }

    .battle-viewport-duel .enemy-card-pod {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      position: relative;
      transform-style: preserve-3d;
      cursor: default;
    }

    .battle-viewport-duel .enemy-hologram-back {
      width: 38px;
      height: 52px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95);
      z-index: 10;
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease;
      transform-style: preserve-3d;
      overflow: hidden;
      padding: 0;
    }

    .battle-viewport-duel .enemy-pedestal-base {
      width: 56px;
      height: 14px;
      border-radius: 50%;
      background: #000000;
      border: 1.5px solid rgba(244, 63, 94, 0.55);
      border-top: 1.5px solid rgba(255, 255, 255, 0.6);
      border-bottom: 2px solid #000000;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9), inset 0 3px 6px #000;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .battle-viewport-duel .enemy-pedestal-base::before {
      content: '';
      position: absolute;
      width: 56px;
      height: 56px;
      top: calc(50% - 28px);
      left: calc(50% - 28px);
      border-radius: 50%;
      background: var(--vortex-spiral) center/cover no-repeat;
      animation: blackHoleVortexSpin 4.5s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    .battle-viewport-duel .enemy-pedestal-base::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 5px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 5px #f59e0b, inset 0 0 3px #000000;
      z-index: 3;
    }

    /* RAMPA CENTRALE: BANCO COMUNE 3D */
    .battle-viewport-duel .duel-ramp-hub {
      position: relative;
      width: 100%;
      perspective: 850px;
      transform-style: preserve-3d;
      padding: 8px 0.55rem 4px 0.55rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 15;
      margin-top: -6px;
    }

    .battle-viewport-duel .duel-ramp-surface {
      position: absolute;
      inset: -50px -75px -42px -75px;
      background: linear-gradient(180deg, rgba(69, 26, 3, 0.4) 0%, rgba(15, 23, 42, 0.8) 30%, rgba(2, 6, 23, 0.98) 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.5);
      border-bottom: 2px solid rgba(245, 158, 11, 0.85);
      clip-path: polygon(0% 0%, 100% 0%, 94.5% 100%, 5.5% 100%);
      transform: rotateX(32deg);
      transform-origin: 50% 100%;
      box-shadow: inset 0 0 35px rgba(245, 158, 11, 0.22), 0 14px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
    }

    .battle-viewport-duel .duel-console-3d {
      position: relative;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transform-style: preserve-3d;
      transform: translateY(-2px);
      z-index: 5;
    }

    .battle-viewport-duel .duel-target-capsule {
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98));
      border: 2px solid #f59e0b;
      border-radius: 12px;
      padding: 4px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.6), inset 0 0 10px rgba(245, 158, 11, 0.25);
      z-index: 10;
      position: relative;
    }

    .battle-viewport-duel .duel-target-capsule .stage-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.54rem;
      font-weight: 900;
      color: #00f2fe;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .battle-viewport-duel .duel-target-capsule .target-value-glow {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.45rem;
      font-weight: 900;
      color: #ffffff;
      -webkit-text-stroke: 1.5px #000000;
      text-shadow: 0 0 16px #facc15, -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000;
      line-height: 1;
      margin: 2px 0;
    }

    .battle-viewport-duel .duel-target-capsule .sub-instruction {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 800;
      color: #fde047;
    }

    .battle-viewport-duel .duel-bomb-checkpoint {
      position: absolute;
      top: -8px;
      right: -24px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(15, 23, 42, 0.98));
      border: 2px solid #ef4444;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 0 14px #ef4444;
      z-index: 15;
    }

    .battle-viewport-duel .duel-bomb-checkpoint.critical {
      animation: bombStepBlink 0.3s infinite alternate;
    }

    .battle-viewport-duel .duel-clash-telemetry-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: rgba(2, 6, 23, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 3px 10px;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.8);
      width: 100%;
      max-width: 420px;
      box-sizing: border-box;
    }

    .battle-viewport-duel .clash-val-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 70px;
    }

    .battle-viewport-duel .clash-val-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 800;
      color: #94a3b8;
    }

    .battle-viewport-duel .clash-val-num {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.92rem;
      font-weight: 900;
      line-height: 1;
    }

    .battle-viewport-duel .clash-mini-cards {
      display: flex;
      gap: 2px;
      margin-top: 2px;
    }

    .battle-viewport-duel .clash-mini-chip {
      font-family: 'Rajdhani', sans-serif;
      font-size: 0.5rem;
      font-weight: 900;
      padding: 1px 3px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: #0f172a;
    }

    /* BANCO POKER 5 CARTE IN LINEA */
    .battle-viewport-duel .banco-poker-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.85);
      border: 1.5px solid rgba(250, 204, 21, 0.4);
      border-radius: 8px;
      padding: 3px 8px;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.85);
    }

    .battle-viewport-duel .poker-mini-card {
      width: 28px;
      height: 38px;
      border-radius: 4px;
      background: #ffffff;
      border: 1px solid #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 1px;
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .battle-viewport-duel .poker-mini-card.is-base {
      border: 1.5px solid #facc15;
      box-shadow: 0 0 6px #facc15;
      background: #fffbeb;
    }

    .battle-viewport-duel .poker-mini-card.is-empty {
      background: rgba(2, 6, 23, 0.6);
      border: 1px dashed rgba(255, 255, 255, 0.25);
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 0.5rem;
      font-family: 'Orbitron', sans-serif;
      font-weight: 900;
    }

    .battle-viewport-duel .poker-badge-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.58rem;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid currentColor;
      margin-left: 6px;
      white-space: nowrap;
      text-shadow: 0 0 6px currentColor;
    }

    .battle-viewport-duel .duel-formula-mount {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
      transform-style: preserve-3d;
      padding: 2px 0;
    }

    .battle-viewport-duel .formula-card-pod {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      transform-style: preserve-3d;
    }

    .battle-viewport-duel .duel-card-billboard {
      width: 36px;
      height: 52px;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 2px;
      z-index: 5;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
      transform-style: preserve-3d;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }

    .battle-viewport-duel .duel-card-billboard.slotted {
      border: 2px solid #00f2fe !important;
      box-shadow: 0 0 12px rgba(0, 242, 254, 0.8);
      animation: cardSlotSnap 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.35) forwards;
    }

    .battle-viewport-duel .duel-card-billboard.empty-slot {
      border: 1.5px dashed rgba(255, 255, 255, 0.35) !important;
      background: rgba(2, 6, 23, 0.65) !important;
      justify-content: center;
      align-items: center;
      box-shadow: none;
    }

    .battle-viewport-duel .duel-card-billboard.empty-slot::after {
      content: '+';
      font-family: 'Orbitron', sans-serif;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.4);
      font-weight: 900;
    }

    .battle-viewport-duel .duel-card-billboard.base-phase1-mount {
      background: linear-gradient(135deg, rgba(8, 145, 178, 0.9), rgba(15, 23, 42, 0.98)) !important;
      border: 2px solid #00f2fe !important;
      justify-content: center;
      align-items: center;
    }

    .battle-viewport-duel .base-phase1-val {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.05rem;
      font-weight: 900;
      color: #00f2fe;
      text-shadow: 0 0 8px #00f2fe;
      line-height: 1;
    }

    .battle-viewport-duel .base-phase1-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.42rem;
      font-weight: 900;
      color: #cbd5e1;
      margin-top: 2px;
    }

    .battle-viewport-duel .formula-pit-base {
      position: relative;
      width: 38px;
      height: 12px;
      border-radius: 50%;
      background: #000000;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-top: 1.5px solid rgba(255, 255, 255, 0.7);
      border-bottom: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 2px 4px #000;
      transform-origin: 50% 50%;
    }

    .battle-viewport-duel .formula-pit-base::before {
      content: '';
      position: absolute;
      width: 38px;
      height: 38px;
      top: calc(50% - 19px);
      left: calc(50% - 19px);
      border-radius: 50%;
      background: var(--vortex-spiral) center/cover no-repeat;
      animation: blackHoleVortexSpin 3.8s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    .battle-viewport-duel .formula-pit-lens {
      position: relative;
      z-index: 3;
      width: 12px;
      height: 4px;
      border-radius: 50%;
      background: #000000;
      border: 1px solid #ffffff;
      box-shadow: 0 0 4px #facc15, inset 0 0 2px #000000;
    }

    .battle-viewport-duel .duel-op-selector-pod {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      align-self: flex-end;
      margin-bottom: 12px;
      z-index: 10;
    }

    .battle-viewport-duel .duel-op-buttons-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 2px;
    }

    .battle-viewport-duel .op-toggle-btn {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1.2px solid rgba(255, 255, 255, 0.2);
      background: rgba(15, 23, 42, 0.9);
      color: #ffffff;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .battle-viewport-duel .op-toggle-btn.active {
      border-color: #facc15;
      background: #d97706;
      box-shadow: 0 0 8px #facc15;
      transform: scale(1.1);
    }

    .battle-viewport-duel .op-toggle-btn.is-scanner-hint {
      border: 2px solid #10b981 !important;
      background: rgba(16, 185, 129, 0.35) !important;
      color: #ffffff !important;
      box-shadow: 0 0 14px #10b981, inset 0 0 8px #10b981 !important;
      animation: scannerOpPulseDuel 0.85s infinite alternate ease-in-out;
    }

    @keyframes scannerOpPulseDuel {
      0% { transform: scale(1); filter: brightness(1); }
      100% { transform: scale(1.15); filter: brightness(1.5) drop-shadow(0 0 10px #34d399); }
    }

    .battle-viewport-duel .tactile-fire-btn.btn-ready-attack {
      background: linear-gradient(180deg, #059669 0%, #047857 35%, #064e3b 100%) !important;
      border: 2px solid #34d399 !important;
      box-shadow: 0 6px 0 #02261d, 0 0 24px rgba(52, 211, 153, 0.85) !important;
      animation: attackReadyPulseDuel 0.9s infinite alternate ease-in-out;
    }

    @keyframes attackReadyPulseDuel {
      0% { transform: scale(1); }
      100% { transform: scale(1.02); box-shadow: 0 6px 0 #02261d, 0 0 32px #10b981; }
    }

    .battle-viewport-duel .duel-equals-glyph {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.2rem;
      font-weight: 900;
      color: #ffffff;
      -webkit-text-stroke: 1.2px #000000;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
      align-self: flex-end;
      margin-bottom: 16px;
      padding: 0 2px;
    }

    .battle-viewport-duel .duel-live-result-pod {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      align-self: flex-end;
      margin-bottom: 10px;
    }

    .battle-viewport-duel .duel-live-result-badge {
      background: rgba(2, 6, 23, 0.95);
      border: 2px solid #00f2fe;
      border-radius: 8px;
      padding: 4px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 0 14px rgba(0, 242, 254, 0.5);
    }

    .battle-viewport-duel .duel-live-result-badge .res-label {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.44rem;
      font-weight: 800;
      color: #94a3b8;
    }

    .battle-viewport-duel .duel-live-result-badge .res-val {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.05rem;
      font-weight: 900;
      color: #00f2fe;
      line-height: 1;
    }

    /* CARTE IN MANO GIOCATORE */
    .battle-viewport-duel .player-cards-section {
      position: relative;
      z-index: 40;
      transform: translateZ(40px);
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }

    .battle-viewport-duel .discard-alert-banner {
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
      animation: discardPulseBannerDuel 0.9s infinite alternate;
      z-index: 50;
    }

    @keyframes discardPulseBannerDuel {
      0% { transform: scale(0.98); box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
      100% { transform: scale(1.02); box-shadow: 0 0 22px rgba(239, 68, 68, 1); }
    }

    .battle-viewport-duel .wall-hand-rack.player-side {
      transform: translateZ(45px);
      z-index: 45;
      margin-top: -14px;
      margin-bottom: 22px;
    }

    .battle-viewport-duel .card-unit-station {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      gap: 2px;
      transform-style: preserve-3d;
    }

    .battle-viewport-duel .tactile-card-body {
      width: 100%;
      max-width: 48px;
      height: 68px;
      background: #ffffff !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 7px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 3px 2px;
      position: relative;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.7);
      transform: translateY(0);
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease;
      transform-style: preserve-3d;
    }

    .battle-viewport-duel .tactile-card-body.golden-card {
      background: linear-gradient(135deg, #fef08a 0%, #facc15 50%, #eab308 100%) !important;
      border: 1.5px solid #0f172a !important;
      box-shadow: 0 8px 20px rgba(234, 179, 8, 0.45) !important;
    }

    .battle-viewport-duel .golden-turns-badge-duel {
      position: absolute;
      top: 2px;
      right: 2px;
      background: #0f172a;
      color: #fde047;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      padding: 1px 3px;
      border-radius: 3px;
      border: 1px solid #facc15;
      line-height: 1;
    }

    .battle-viewport-duel .tactile-card-body.suggested {
      border: 2px solid #10b981 !important;
      box-shadow: 0 0 22px rgba(16, 185, 129, 0.95), inset 0 0 10px rgba(52, 211, 153, 0.6) !important;
      animation: cardSuggestPulseDuel 0.9s infinite alternate ease-in-out;
    }

    @keyframes cardSuggestPulseDuel {
      0% { transform: translateY(0); box-shadow: 0 0 10px #10b981; }
      100% { transform: translateY(-6px); box-shadow: 0 0 24px #10b981, 0 0 35px #34d399; }
    }

    .battle-viewport-duel .tactile-card-body.discard-mode {
      border: 2px dashed #ef4444 !important;
      animation: cardDiscardShakeDuel 0.85s infinite alternate ease-in-out;
    }

    @keyframes cardDiscardShakeDuel {
      0% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-3px) rotate(-1deg); }
      100% { transform: translateY(0) rotate(1deg); }
    }

    .battle-viewport-duel .card-pit-base {
      width: 60px;
      height: 15px;
      border-radius: 50%;
      background: #000000;
      border: 1.5px solid rgba(255, 255, 255, 0.25);
      border-top: 1.8px solid rgba(255, 255, 255, 0.7);
      border-bottom: 2px solid #000;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.95), inset 0 3px 6px #000;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: 50% 50%;
      position: relative;
      overflow: hidden;
    }

    .battle-viewport-duel .card-pit-base::before {
      content: '';
      position: absolute;
      width: 60px;
      height: 60px;
      top: calc(50% - 30px);
      left: calc(50% - 30px);
      border-radius: 50%;
      background: var(--vortex-spiral) center/cover no-repeat;
      animation: blackHoleVortexSpin 4.2s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    .battle-viewport-duel .card-pit-lens {
      position: relative;
      z-index: 3;
      width: 20px;
      height: 6px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 6px #facc15, 0 0 10px rgba(250, 204, 21, 0.6), inset 0 0 4px #000000;
    }

    .battle-viewport-duel .card-num-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
    }

    .battle-viewport-duel .card-suit-label {
      font-size: 0.72rem;
      line-height: 1;
      font-weight: 900;
    }

    .battle-viewport-duel .card-effect-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      color: #334155;
    }

    .battle-viewport-duel .card-hearts .card-suit-label,
    .battle-viewport-duel .card-hearts .card-num-3d,
    .battle-viewport-duel .card-diamonds .card-suit-label,
    .battle-viewport-duel .card-diamonds .card-num-3d {
      color: #dc2626 !important;
    }

    .battle-viewport-duel .card-spades .card-suit-label,
    .battle-viewport-duel .card-spades .card-num-3d,
    .battle-viewport-duel .card-clubs .card-suit-label,
    .battle-viewport-duel .card-clubs .card-num-3d {
      color: #0f172a !important;
    }

    .battle-viewport-duel .card-unit-station.is-selected .tactile-card-body {
      transform: translateY(-20px) translateZ(16px) scale(1.08);
      border: 2px solid #f59e0b !important;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.6), 0 0 14px rgba(245, 158, 11, 0.8) !important;
    }

    /* PLANCIA INFERIORE GIOCATORE */
    .battle-viewport-duel .player-mega-plane {
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

    .battle-viewport-duel .player-plane-backdrop {
      position: absolute;
      inset: 0 -15px -40px -15px;
      background: linear-gradient(180deg, rgba(14, 23, 46, 0.88) 0%, rgba(3, 8, 22, 0.99) 100%);
      border: 1.5px solid rgba(245, 158, 11, 0.5);
      border-bottom: none;
      border-radius: 10px 10px 0 0;
      box-shadow: inset 0 0 30px rgba(245, 158, 11, 0.18), 0 8px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    }

    .battle-viewport-duel .actions-cluster {
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

    .battle-viewport-duel .tactile-btn-mech {
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
      transition: transform 0.08s cubic-bezier(0.2, 0.8, 0.4, 1);
      transform: translateY(0);
      border: 1.5px solid;
      border-top: 2px solid rgba(255, 255, 255, 0.85);
      border-bottom: 2px solid #00f2fe;
    }

    .battle-viewport-duel .tactile-btn-mech:active {
      transform: translateY(5px);
    }

    .battle-viewport-duel .tactile-btn-abandon {
      flex: 1;
      background: linear-gradient(180deg, #b91c1c 0%, #5f0d18 45%, #220508 100%);
      border-color: #ef4444;
      border-top: 2px solid #fecaca;
      color: #ffffff;
      box-shadow: 0 5px 0 #180306, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-duel .tactile-btn-deck {
      flex: 0.9;
      background: linear-gradient(180deg, #7e22ce 0%, #3b0764 45%, #140224 100%);
      border-color: #a855f7;
      border-top: 2px solid #f3e8ff;
      color: #ffffff;
      box-shadow: 0 5px 0 #120321, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-duel .tactile-fire-btn {
      flex: 2.3;
      background: linear-gradient(180deg, #f59e0b 0%, #d97706 35%, #b45309 75%, #451a03 100%);
      border: 1.8px solid #fde047;
      border-top: 2.5px solid #ffffff;
      border-bottom: 2.5px solid #000;
      border-radius: 9px;
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.6px;
      cursor: pointer;
      box-shadow: 0 6px 0 #1c0b02, 0 8px 0 #000, 0 14px 20px rgba(0, 0, 0, 0.95), 0 0 16px rgba(245, 158, 11, 0.4);
      text-shadow: 0 0 10px #ffffff, 0 2px 4px #000;
    }

    .battle-viewport-duel .tactile-fire-btn:active {
      transform: translateY(6px);
      box-shadow: 0 1px 0 #1c0b02, 0 2px 0 #000, 0 4px 8px rgba(0, 0, 0, 0.9), 0 0 25px rgba(245, 158, 11, 0.8);
    }

    .battle-viewport-duel .tactile-fire-btn.discard-action {
      background: linear-gradient(180deg, #dc2626 0%, #991b1b 45%, #450a0a 100%) !important;
      border-color: #fca5a5 !important;
      color: #fef08a !important;
      box-shadow: 0 6px 0 #220306, 0 0 18px rgba(239, 68, 68, 0.9) !important;
      animation: discardPulseBannerDuel 0.9s infinite alternate;
    }

    .battle-viewport-duel .tactile-btn-change {
      flex: 0.9;
      background: linear-gradient(180deg, #ca8a04 0%, #713f12 45%, #231203 100%);
      border-color: #eab308;
      border-top: 2px solid #fef08a;
      color: #ffffff;
      box-shadow: 0 5px 0 #1c1102, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-duel .tactile-btn-pass {
      flex: 0.8;
      background: linear-gradient(180deg, #475569 0%, #1e293b 45%, #080c14 100%);
      border-color: #64748b;
      border-top: 2px solid #e2e8f0;
      color: #ffffff;
      box-shadow: 0 5px 0 #080c14, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-duel .player-hp-dock-bottom {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
      position: relative;
      z-index: 5;
      padding-bottom: 2px;
    }

    .battle-viewport-duel .player-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 14px rgba(16, 185, 129, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-duel .player-hp-3d span {
      font-size: 0.62rem;
      color: #6ee7b7;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
    }

    .battle-viewport-duel .ether-status-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      font-weight: 900;
      color: #f0abfc;
      text-shadow: 0 0 8px #e879f9;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .battle-viewport-duel .tactile-aiuti-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 6px;
      border-radius: 5px;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.54rem;
      font-weight: 900;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
      cursor: pointer;
      transition: all 0.2s;
    }

    .battle-viewport-duel .tactile-aiuti-btn.is-active {
      background: rgba(16, 185, 129, 0.35);
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    /* SCRITTA CINEMATICA SENZA SCATOLA */
    @keyframes duelCinematicIntro {
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

    .duel-cinematic-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 150;
      animation: duelCinematicIntro 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .duel-cinematic-sub {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 900;
      color: #facc15;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 12px #facc15, 0 0 25px rgba(250, 204, 21, 0.7);
      margin-bottom: 6px;
    }

    .duel-cinematic-main {
      font-family: 'Orbitron', sans-serif;
      font-size: 2.1rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 3px;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.1;
      text-shadow: 0 0 20px #f59e0b, 0 0 45px rgba(245, 158, 11, 0.85), 0 0 70px #fde047;
    }

    /* GUIDED TUTORIAL HAND & TOOLTIP STYLES */
    @keyframes handBounceDuel {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-7px) scale(1.15); }
    }
    @keyframes handPulseGlowDuel {
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
      animation: handBounceDuel 1.1s infinite ease-in-out;
    }
    .guided-hand-icon {
      font-size: 1.6rem;
      line-height: 1;
      animation: handPulseGlowDuel 1.4s infinite alternate;
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
      animation: guidedTargetPulseDuel 0.9s infinite alternate ease-in-out !important;
    }
    @keyframes guidedTargetPulseDuel {
      0% { outline-color: #00f2fe; }
      100% { outline-color: #facc15; }
    }
  `;
  document.head.appendChild(styleEl);
})();

// Normalizzatore simboli matematici (supporta ASCII e caratteri tipografici)
const normalizeOp = (op) => {
  if (op === '−') return '-';
  if (op === '×') return '*';
  if (op === '÷') return '/';
  return op || '+';
};

// Valutatore Poker a 5 Carte accurato con supporto Joker reale
const evaluate5CardPokerHand = (cards) => {
  if (!cards || cards.length < 5) {
    return { type: 'incomplete', name: 'Incompleta', rank: 0, damage: 0, color: '#94a3b8' };
  }
  const validCards = cards.filter(Boolean);
  if (validCards.length < 5) {
    return { type: 'incomplete', name: 'Incompleta', rank: 0, damage: 0, color: '#94a3b8' };
  }

  const jokersCount = validCards.filter(c => c.isJoker || c.suit === 'joker').length;
  const nonJokers = validCards.filter(c => !c.isJoker && c.suit !== 'joker');
  const values = nonJokers.map(c => Number(c.value) || 0).sort((a, b) => a - b);
  const suits = nonJokers.map(c => c.suit || (c.id?.startsWith('hearts') ? 'hearts' : c.id?.startsWith('diamonds') ? 'diamonds' : c.id?.startsWith('spades') ? 'spades' : c.id?.startsWith('clubs') ? 'clubs' : 'hearts'));

  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const freq = Object.values(counts).sort((a, b) => b - a);

  const suitCounts = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitCount = Math.max(0, ...Object.values(suitCounts));
  const isFlush = (maxSuitCount + jokersCount) >= 5;

  let isStraight = false;
  const uniqueVals = [...new Set(values)];
  if (uniqueVals.length + jokersCount >= 5) {
    const checkSpan = (vals) => (vals.length === 0 ? true : vals[vals.length - 1] - vals[0] <= 4);
    if (checkSpan(uniqueVals)) isStraight = true;
    const broadwayVals = uniqueVals.map(v => (v === 1 ? 14 : v)).sort((a, b) => a - b);
    if (checkSpan(broadwayVals)) isStraight = true;
  }

  const topFreq = (freq[0] || 0) + jokersCount;
  const secondFreq = freq[1] || 0;

  if (isStraight && isFlush) return { type: 'royal_flush', name: 'Scala Reale', rank: 9, damage: 20, color: '#facc15' };
  if (topFreq >= 4) return { type: 'four_of_a_kind', name: 'Poker', rank: 8, damage: 19, color: '#ec4899' };
  if (jokersCount >= 2 || (topFreq >= 3 && secondFreq >= 2)) return { type: 'full_house', name: 'Full', rank: 7, damage: 18, color: '#c084fc' };
  if (isFlush) return { type: 'flush', name: 'Colore', rank: 6, damage: 17, color: '#38bdf8' };
  if (isStraight) return { type: 'straight', name: 'Scala', rank: 5, damage: 16, color: '#a855f7' };
  if (topFreq >= 3) return { type: 'three_of_a_kind', name: 'Tris', rank: 4, damage: 14, color: '#ef4444' };
  if ((freq[0] >= 2 && freq[1] >= 2) || (jokersCount === 1 && freq[0] >= 2)) return { type: 'two_pair', name: 'Doppia Coppia', rank: 3, damage: 12, color: '#f59e0b' };
  if (topFreq >= 2) return { type: 'one_pair', name: 'Coppia', rank: 2, damage: 10, color: '#10b981' };

  return { type: 'high_card', name: 'Carta Alta', rank: 1, damage: 8, color: '#94a3b8' };
};

export default function DoubleStageBattleView({
  activeAnomaly,
  selectedPilot,
  pilotInventory,
  selectedDeck,
  aiDeckTheme,

  // Moduli, Dadi & Epici
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

  // Dati Nemico
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
  playerHp,
  maxPlayerHp,
  lives,
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
  handleCardClick,
  playerDeck,
  playerDiscard,
  playerTerrainSlots,
  handleRearmTerrainSlot,

  // Parametri Modalità Convergenza & Alias Legacy
  convergenceTurn,
  convergenceSubStep,
  convergenceBaseCard,
  convergenceTarget,
  convergencePlayerT1Val,
  convergenceAiT1Val,
  convergencePlayerTableCards,
  convergenceAiTableCards,
  convergenceOp1 = '+',
  convergenceOp2 = '+',
  setConvergenceOp1,
  setConvergenceOp2,
  playConvergenceExpression,
  convergenceBombData,
  convergenceBombCountdown,

  duelStage,
  duelSubStep,
  duelTargetFull,
  duelTargetMasked,
  duelInequality,
  duelPlayerValue,
  duelAiValue,
  duelSelectedOp,
  handleSelectDuelOp,
  playDoubleStageExpression,
  duelBombData,
  duelBombCountdown,
  isBombAllowed,
  activeScannerHints,

  // Carta Dorata
  playerGoldenCardId,
  playerGoldenTurns,

  // Azioni Plancia
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
    return localStorage.getItem('eclissi_duel_intro_banner_seen') !== 'true';
  });

  // MACCHINA A STATI DEL TUTORIAL GUIDATO
  const [guidedStep, setGuidedStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return localStorage.getItem('eclissi_duel_guided_done') === 'true' ? 0 : 1;
  });

  // Animazione iniziale della scritta cinematografica (2.1s)
  useEffect(() => {
    if (!showCinematicSplash) return;
    try { playSound('epic_item_trigger'); } catch (_) {}
    const t = setTimeout(() => {
      setShowCinematicSplash(false);
      localStorage.setItem('eclissi_duel_intro_banner_seen', 'true');
    }, 2100);
    return () => clearTimeout(t);
  }, [showCinematicSplash]);

  // Normalizzazione parametri: priorità ai valori di Convergenza nativi
  const curStage = convergenceTurn || duelStage || 1;
  const curTarget = convergenceTarget || duelTargetFull || 48;
  const curOp1 = normalizeOp(convergenceOp1 || duelSelectedOp || '+');
  const curOp2 = normalizeOp(convergenceOp2 || '+');
  const curBaseCard = convergenceBaseCard || { value: 7, displayVal: '7', suit: 'hearts', symbol: '♥' };
  const playerT1Val = convergencePlayerT1Val !== undefined ? convergencePlayerT1Val : (duelPlayerValue || 0);
  const aiT1Val = convergenceAiT1Val !== undefined ? convergenceAiT1Val : (duelAiValue || 0);
  const bombData = convergenceBombData || duelBombData;
  const bombCountdown = convergenceBombCountdown !== undefined ? convergenceBombCountdown : (duelBombCountdown ?? 3);
  const onFireAction = playConvergenceExpression || playDoubleStageExpression;

  const onSelectOp1 = (op) => {
    try { playSound('click'); } catch (_) {}
    if (typeof setConvergenceOp1 === 'function') setConvergenceOp1(op);
    else if (typeof handleSelectDuelOp === 'function') handleSelectDuelOp(op);
  };

  const onSelectOp2 = (op) => {
    try { playSound('click'); } catch (_) {}
    if (typeof setConvergenceOp2 === 'function') setConvergenceOp2(op);
  };

  // Scalatura dinamica viewport 440x840
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

  // Sincronizzazione automatica degli stati del tutorial attraverso i 2 Turni reali
  useEffect(() => {
    if (guidedStep === 0) return;

    if (curStage === 1) {
      if (guidedStep === 1 && (selectedIndices?.length || 0) === 2) {
        setGuidedStep(2);
      } else if (guidedStep === 2 && (selectedIndices?.length || 0) < 2) {
        setGuidedStep(1);
      }
    } else if (curStage === 2) {
      if (turn === 'player1') {
        if (guidedStep <= 2) {
          setGuidedStep(3);
        } else if (guidedStep === 3 && (selectedIndices?.length || 0) === 2) {
          setGuidedStep(4);
        } else if (guidedStep === 4 && (selectedIndices?.length || 0) < 2) {
          setGuidedStep(3);
        }
      }
    }
  }, [guidedStep, curStage, selectedIndices, turn]);

  // Calcolo indice della carta da puntare durante lo Step 1 o Step 3
  const guidedCardTargetIdx = useMemo(() => {
    if (isSelectingDiscard) return null;
    const hints = activeScannerHints?.cardIndices || [];
    const unselectedHint = hints.find(i => !(selectedIndices || []).includes(i));
    if (unselectedHint !== undefined) return unselectedHint;
    return (playerHand || []).findIndex((_, i) => !(selectedIndices || []).includes(i));
  }, [isSelectingDiscard, activeScannerHints, selectedIndices, playerHand]);

  // Filtro locale click carte: garantisce massimo 2 carte selezionate in Convergenza
  const handleCardInteraction = (idx) => {
    if (turn !== 'player1') return;

    if (isSelectingDiscard || isExchangeMode) {
      if (typeof handleCardClick === 'function') handleCardClick(idx);
      return;
    }

    if (!(selectedIndices || []).includes(idx) && (selectedIndices?.length || 0) >= 2) {
      try { playSound('deselect'); } catch (_) {}
      return;
    }

    if (typeof handleCardClick === 'function') {
      handleCardClick(idx);
    }
  };

  const currentGlobalSector = isAdv ? ((currentAdvPlanet - 1) * 10 + currentAdvLevel) : 100;
  const isTerrainAllowed = isPvP || !isAdv || currentGlobalSector >= 8 || (playerTerrainSlots || []).some(s => s?.card);
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

  const item1Id = equippedEpicItems?.[0] || 'epic_item_1';
  const item2Id = equippedEpicItems?.[1] || 'epic_item_5';
  const isItem1Used = Boolean(usedEpicItemsInMatch?.[item1Id]);
  const isItem2Used = Boolean(usedEpicItemsInMatch?.[item2Id]);
  const isItem1Usable = turn === 'player1' && !isItem1Used && !hasUsedEpicItemThisTurn;
  const isItem2Usable = turn === 'player1' && !isItem2Used && !hasUsedEpicItemThisTurn;

  const getCardColor = (c) => {
    if (!c) return '#0f172a';
    if (c.isJoker || c.suit === 'joker') return '#9333ea';
    const s = c.suit || (typeof c.id === 'string' && (c.id.startsWith('diamonds') ? 'diamonds' : c.id.startsWith('hearts') ? 'hearts' : ''));
    return (s === 'hearts' || s === 'diamonds') ? '#dc2626' : '#0f172a';
  };

  const topPlayerDiscard = playerDiscard && playerDiscard.length > 0 ? playerDiscard[playerDiscard.length - 1] : null;
  const topAiDiscardCard = isRealPvP ? aiDiscardTop : (aiDiscard && aiDiscard.length > 0 ? aiDiscard[aiDiscard.length - 1] : null);
  const playerTopColor = getCardColor(topPlayerDiscard);
  const aiTopColor = getCardColor(topAiDiscardCard);

  const enemyName = isPvP 
    ? (pvpMeta?.opponent?.nickname || 'AVVERSARIO')
    : (isAdv && currentAdvLevel === 10 ? `👑 BOSS ${currentPlanetNameSafe?.toUpperCase() || ''}` : `AVVERSARIO S.${currentAdvLevel}`);

  const abilityName = selectedAbility?.toUpperCase() || 'MODULO';
  const abilityLvl = Math.min(abilities?.[selectedAbility]?.level || 1, 9);

  // Le 2 carte selezionate dal giocatore per la mossa del turno
  const slotCard1 = selectedIndices?.[0] !== undefined ? playerHand?.[selectedIndices[0]] : null;
  const slotCard2 = selectedIndices?.[1] !== undefined ? playerHand?.[selectedIndices[1]] : null;

  const getCardVal = (card) => {
    if (!card) return 0;
    const base = Number(card.value) || 0;
    const suit = card.suit || (typeof card.id === 'string' && card.id.startsWith('hearts') ? 'hearts' : '');
    if (activeAnomaly?.id === 'hearts_res' && suit === 'hearts') {
      return base * 2;
    }
    return base;
  };

  // Funzione aritmetica a supporto esteso (ASCII + caratteri tipografici)
  const evalStep = (vLeft, op, vRight) => {
    const cleanOp = normalizeOp(op);
    if (cleanOp === '+') return vLeft + vRight;
    if (cleanOp === '-') return vLeft - vRight;
    if (cleanOp === '*') return vLeft * vRight;
    if (cleanOp === '/') return (vRight !== 0 && Math.abs(vRight) > 1e-7) ? (vLeft / vRight) : NaN;
    return NaN;
  };

  // Calcolo predittivo in tempo reale della traiettoria numerica
  const calculateLiveFormulaResult = () => {
    if (!slotCard1 || !slotCard2) return '---';
    const vCard1 = getCardVal(slotCard1);
    const vCard2 = getCardVal(slotCard2);

    if (curStage === 1) {
      const vBase = getCardVal(curBaseCard);
      const step1 = evalStep(vBase, curOp1, vCard1);
      if (isNaN(step1) || !isFinite(step1)) return 'NaN';
      const step2 = evalStep(step1, curOp2, vCard2);
      if (isNaN(step2) || !isFinite(step2)) return 'NaN';
      return Math.round(step2 * 100) / 100;
    } else {
      const vT1 = Number(playerT1Val) || 0;
      const step1 = evalStep(vT1, curOp1, vCard1);
      if (isNaN(step1) || !isFinite(step1)) return 'NaN';
      const step2 = evalStep(step1, curOp2, vCard2);
      if (isNaN(step2) || !isFinite(step2)) return 'NaN';
      return Math.round(step2 * 100) / 100;
    }
  };

  const liveResult = calculateLiveFormulaResult();
  const scannerOn = Boolean(isScannerActive || scannerMode === 'FREE_FULL');

  // Composizione in linea delle 5 carte del Banco per il calcolo Poker
  const pTableCards = convergencePlayerTableCards || [];
  const assembled5Cards = [
    curBaseCard,
    curStage === 1 ? slotCard1 : (pTableCards[0] || null),
    curStage === 1 ? slotCard2 : (pTableCards[1] || null),
    curStage === 2 ? (slotCard1 || pTableCards[2] || null) : null,
    curStage === 2 ? (slotCard2 || pTableCards[3] || null) : null
  ];

  const pokerPreview = evaluate5CardPokerHand(assembled5Cards.filter(Boolean));

  const isPilotResonant = checkPilotSetResonance(selectedPilot, selectedDeck, selectedAbility);
  const currentPilotLvl = pilotInventory?.[selectedPilot]?.level || 1;

  return (
    <div className="duel-screen-wrapper">
      <div className="battle-viewport-duel" style={{ transform: `scale(${scale})` }}>
        
        {/* SCRITTA CINEMATICA */}
        {showCinematicSplash && (
          <div className="duel-cinematic-overlay">
            <div className="duel-cinematic-sub">✦ NUOVA MODALITÀ ✦</div>
            <div className="duel-cinematic-main">DUELLO DI CONVERGENZA</div>
          </div>
        )}

        {/* 1. PIANO SUPERIORE (AVVERSARIO) */}
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

          {/* OGGETTI E GAUGES NEMICI */}
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

          {/* BANCO CARTE AVVERSARIO */}
          <div className="enemy-field-cards-row">
            <div 
              className="card-deck-stack-block enemy-deck-theme" 
              style={{ '--deck-thick': `${enemyDeckThickness}px` }}
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
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 900, color: '#64748b' }}>SCARTI</span>
                <span style={{ fontSize: '0.74rem', color: aiTopColor, fontWeight: 900 }}>
                  {topAiDiscardCard ? `${topAiDiscardCard.symbol} ${topAiDiscardCard.displayVal || topAiDiscardCard.value}` : '---'}
                </span>
                <span style={{ fontSize: '0.42rem', color: '#94a3b8', fontWeight: 'bold' }}>TOP CARD</span>
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

        {/* TELEMETRIA AZIONE NEMICA */}
        {turn === 'ai' && (
          <div className="enemy-action-ticker">
            <span style={{ fontSize: '0.85rem' }}>⚡</span>
            <span>{aiActionMessage || (curStage === 1 ? "L'avversario sta calcolando l'Apertura T1..." : "L'avversario sta chiudendo la traiettoria T2...")}</span>
          </div>
        )}

        {/* 2. MANO AVVERSARIA CON POZZETTI BUCO NERO */}
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
                <div className="enemy-hologram-back">
                  <TacticalVisual id={aiDeckTheme || 'planet_char_1'} type="card_back" width={38} height={52} />
                </div>
                <div className="enemy-pedestal-base"></div>
              </div>
            );
          })}
        </div>

        {/* 3. RAMPA CENTRALE: BANCO COMUNE DI CONVERGENZA 3D */}
        <div className="duel-ramp-hub">
          <div className="duel-ramp-surface"></div>

          <div className="duel-console-3d">
            
            {/* CAPSULA BERSAGLIO COMUNE CON DELTA PROSSIMITÀ */}
            <div className="duel-target-capsule">
              <span className="stage-tag">
                {curStage === 1 ? 'TURNO 1: APERTURA (2 CARTE SU BASE)' : 'TURNO 2: CHIUSURA (2 CARTE SU PARZIALE T1)'}
              </span>
              <span className="target-value-glow">
                🎯 {curTarget}
              </span>
              <span className="sub-instruction">
                {liveResult !== '---' && liveResult !== 'NaN' 
                  ? (curStage === 1 
                      ? `Parziale T1: ${liveResult} (Δ${Math.round(Math.abs(Number(liveResult) - curTarget) * 10) / 10} dal Target)`
                      : `Delta Finale Mirato: Δ${Math.round(Math.abs(Number(liveResult) - curTarget) * 10) / 10}`)
                  : (curStage === 1 ? 'Incastra 2 carte per impostare la rotta T1' : 'Chiudi la traiettoria: vince il Delta minore')}
              </span>

              {/* CHECKPOINT BOMBA 3T DEL BANCO COMUNE */}
              {isBombAllowed && bombData && (
                <div className={`duel-bomb-checkpoint ${bombCountdown === 1 ? 'critical' : ''}`}>
                  <span style={{ fontSize: '0.45rem', color: '#fca5a5', fontWeight: 900 }}>💣 {bombCountdown}T</span>
                  <span style={{ fontFamily: 'Orbitron', fontSize: '0.74rem', color: '#ffffff', fontWeight: 900 }}>{bombData.target}</span>
                  <span style={{ fontSize: '0.36rem', color: '#fde047', fontWeight: 800 }}>DISINNESCO</span>
                </div>
              )}
            </div>

            {/* TELEMETRIA COMPARAZIONE CONCORRENTI, CARTE CALATE E DELTA */}
            <div className="duel-clash-telemetry-row">
              <div className="clash-val-box">
                <span className="clash-val-title">
                  {(convergencePlayerTableCards?.length || 0) >= 4 ? 'TUO FINALE' : (curStage === 1 ? 'TUO T1' : 'BASE T1')}
                </span>
                <span className="clash-val-num" style={{ color: '#00f2fe' }}>
                  {playerT1Val !== 0 ? Math.round(playerT1Val * 10) / 10 : '---'}
                </span>
                {playerT1Val !== 0 && (
                  <span style={{ fontSize: '0.45rem', color: '#7dd3fc', fontWeight: 'bold' }}>
                    Δ{Math.round(Math.abs(playerT1Val - curTarget) * 10) / 10}
                  </span>
                )}
                {convergencePlayerTableCards && convergencePlayerTableCards.length > 0 && (
                  <div className="clash-mini-cards">
                    {convergencePlayerTableCards.map((c, i) => (
                      <span key={i} className="clash-mini-chip" style={{ color: getCardColor(c) }}>
                        {c.symbol}{c.displayVal || c.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span style={{ fontFamily: 'Orbitron', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 900 }}>VS</span>

              <div className="clash-val-box">
                <span className="clash-val-title">
                  {(convergenceAiTableCards?.length || 0) >= 4 ? 'NEMICO FINALE' : (curStage === 1 ? 'NEMICO T1' : 'BASE T1')}
                </span>
                <span className="clash-val-num" style={{ color: '#f43f5e' }}>
                  {aiT1Val !== 0 ? Math.round(aiT1Val * 10) / 10 : '---'}
                </span>
                {aiT1Val !== 0 && (
                  <span style={{ fontSize: '0.45rem', color: '#fca5a5', fontWeight: 'bold' }}>
                    Δ{Math.round(Math.abs(aiT1Val - curTarget) * 10) / 10}
                  </span>
                )}
                {convergenceAiTableCards && convergenceAiTableCards.length > 0 && (
                  <div className="clash-mini-cards">
                    {convergenceAiTableCards.map((c, i) => (
                      <span key={i} className="clash-mini-chip" style={{ color: getCardColor(c) }}>
                        {c.symbol}{c.displayVal || c.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STRISCIA POKER A 5 CARTE DEL BANCO (CARTA BASE + T1 + T2) */}
            <div className="banco-poker-strip">
              <span style={{ fontSize: '0.52rem', color: '#facc15', fontFamily: 'Orbitron', fontWeight: 900, marginRight: '4px' }}>
                POKER:
              </span>
              {assembled5Cards.map((c, i) => {
                const isBase = (i === 0);
                if (!c) {
                  return (
                    <div key={i} className="poker-mini-card is-empty">
                      {isBase ? 'BASE' : (i <= 2 ? `T1` : `T2`)}
                    </div>
                  );
                }
                const cColor = getCardColor(c);
                return (
                  <div key={i} className={`poker-mini-card ${isBase ? 'is-base' : ''}`}>
                    <span style={{ fontSize: '0.45rem', color: cColor, lineHeight: 1 }}>{c.symbol}</span>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', fontWeight: 900, color: cColor }}>
                      {c.displayVal || c.value}
                    </span>
                    <span style={{ fontSize: '0.38rem', color: isBase ? '#d97706' : '#64748b', fontWeight: 900 }}>
                      {isBase ? 'BASE' : (i <= 2 ? 'T1' : 'T2')}
                    </span>
                  </div>
                );
              })}
              <div 
                className="poker-badge-readout"
                style={{ color: pokerPreview.color }}
              >
                {pokerPreview.rank > 0 
                  ? `${pokerPreview.name.toUpperCase()} (-${pokerPreview.damage} HP)` 
                  : (curStage === 1 ? 'FIGURA PROVVISORIA' : 'IN COMPOSIZIONE')}
              </div>
            </div>

            {/* PLANCIA FORMULA UNIFICATA: ANCORA + OP1 + C1 + OP2 + C2 = RISULTATO */}
            <div className="duel-formula-mount">
              
              {/* ELEMENTO 1: ANCORA (CARTA BASE IN T1 O PARZIALE IN T2) */}
              <div className="formula-card-pod">
                {curStage === 1 ? (
                  <div className="duel-card-billboard slotted" style={{ border: '2px solid #facc15', boxShadow: '0 0 12px rgba(250, 204, 21, 0.7)' }}>
                    <span style={{ fontSize: '0.52rem', fontWeight: 900, color: getCardColor(curBaseCard), lineHeight: 1 }}>{curBaseCard.symbol}</span>
                    <span style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', fontWeight: 900, color: getCardColor(curBaseCard), margin: 'auto 0' }}>{curBaseCard.displayVal || curBaseCard.value}</span>
                    <span style={{ fontSize: '0.42rem', color: '#fde047', fontWeight: 900 }}>BASE</span>
                  </div>
                ) : (
                  <div className="duel-card-billboard base-phase1-mount">
                    <span className="base-phase1-val">{Math.round(playerT1Val * 10) / 10}</span>
                    <span className="base-phase1-tag">PARZ. T1</span>
                  </div>
                )}
                <div className="formula-pit-base"><div className="formula-pit-lens"></div></div>
              </div>

              {/* ELEMENTO 2: SELETTORE OPERATORE 1 */}
              <div className="duel-op-selector-pod">
                <div className="duel-op-buttons-grid">
                  {['+', '-', '*', '/'].map(op => {
                    const isHint = scannerOn && normalizeOp(activeScannerHints?.ops?.[0]) === op;
                    return (
                      <button
                        key={op}
                        className={`op-toggle-btn ${curOp1 === op ? 'active' : ''} ${isHint ? 'is-scanner-hint' : ''}`}
                        onClick={() => onSelectOp1(op)}
                        title={`Operatore 1: ${op}`}
                      >
                        {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ELEMENTO 3: PRIMA CARTA SELEZIONATA (C1 IN T1 O C3 IN T2) */}
              <div className="formula-card-pod">
                <div className={`duel-card-billboard ${slotCard1 ? 'slotted' : 'empty-slot'}`}>
                  {slotCard1 && (
                    <>
                      <span style={{ fontSize: '0.52rem', fontWeight: 900, color: getCardColor(slotCard1), lineHeight: 1 }}>{slotCard1.symbol}</span>
                      <span style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', fontWeight: 900, color: getCardColor(slotCard1), margin: 'auto 0' }}>{slotCard1.displayVal || slotCard1.value}</span>
                      <span style={{ fontSize: '0.45rem', color: '#64748b' }}>{curStage === 1 ? 'C1' : 'C3'}</span>
                    </>
                  )}
                </div>
                <div className="formula-pit-base"><div className="formula-pit-lens"></div></div>
              </div>

              {/* ELEMENTO 4: SELETTORE OPERATORE 2 */}
              <div className="duel-op-selector-pod">
                <div className="duel-op-buttons-grid">
                  {['+', '-', '*', '/'].map(op => {
                    const isHint = scannerOn && normalizeOp(activeScannerHints?.ops?.[1]) === op;
                    return (
                      <button
                        key={op}
                        className={`op-toggle-btn ${curOp2 === op ? 'active' : ''} ${isHint ? 'is-scanner-hint' : ''}`}
                        onClick={() => onSelectOp2(op)}
                        title={`Operatore 2: ${op}`}
                      >
                        {op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : op}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ELEMENTO 5: SECONDA CARTA SELEZIONATA (C2 IN T1 O C4 IN T2) */}
              <div className="formula-card-pod">
                <div className={`duel-card-billboard ${slotCard2 ? 'slotted' : 'empty-slot'}`}>
                  {slotCard2 && (
                    <>
                      <span style={{ fontSize: '0.52rem', fontWeight: 900, color: getCardColor(slotCard2), lineHeight: 1 }}>{slotCard2.symbol}</span>
                      <span style={{ fontFamily: 'Orbitron', fontSize: '1.05rem', fontWeight: 900, color: getCardColor(slotCard2), margin: 'auto 0' }}>{slotCard2.displayVal || slotCard2.value}</span>
                      <span style={{ fontSize: '0.45rem', color: '#64748b' }}>{curStage === 1 ? 'C2' : 'C4'}</span>
                    </>
                  )}
                </div>
                <div className="formula-pit-base"><div className="formula-pit-lens"></div></div>
              </div>

              <span className="duel-equals-glyph">=</span>

              {/* RISULTATO LIVE E VERIFICA DELTA */}
              <div className="duel-live-result-pod">
                <div className="duel-live-result-badge">
                  <span className="res-label">{curStage === 1 ? 'PARZIALE T1' : 'FINALE T2'}</span>
                  <span className="res-val">{liveResult}</span>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* 4. MANO DEL GIOCATORE CON GUIDA INTERATTIVA */}
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

              const suitKey = card.suit || 'hearts';
              const cardColor = getCardColor(card);
              const isJoker = Boolean(card.isJoker || suitKey === 'joker');
              const isGolden = Boolean(card.isGolden || (playerGoldenCardId && card.id === playerGoldenCardId));

              const suitClass = suitKey === 'diamonds' ? 'card-diamonds' :
                                suitKey === 'spades' ? 'card-spades' :
                                suitKey === 'clubs' ? 'card-clubs' : 'card-hearts';

              const suitTag = suitKey === 'diamonds' ? '+2🌟' :
                              suitKey === 'spades' ? '+3HP' :
                              suitKey === 'clubs' ? '+5s' : '+8% HP';

              const isSuggested = scannerOn && !isSelectingDiscard && (activeScannerHints?.cardIndices || []).includes(idx);

              const isGuidedCard = !showCinematicSplash && turn === 'player1' && !isSelectingDiscard && (
                ((guidedStep === 1 && curStage === 1) || (guidedStep === 3 && curStage === 2)) && idx === guidedCardTargetIdx
              );

              return (
                <div 
                  key={card.id || idx}
                  className={`card-unit-station ${suitClass} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleCardInteraction(idx)}
                >
                  {isGuidedCard && (
                    <div className="guided-hand-beacon" style={{ bottom: '105%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">
                        {curStage === 1
                          ? `1. Scegli 2 carte da legare alla Base (${selectedIndices?.length || 0}/2)`
                          : `3. Scegli 2 carte: chiudi il Delta e componi il Poker! (${selectedIndices?.length || 0}/2)`}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <div className={`tactile-card-body ${isGolden ? 'golden-card' : ''} ${isSuggested ? 'suggested' : ''} ${isSelectingDiscard ? 'discard-mode' : ''} ${isGuidedCard ? 'guided-pulse-target' : ''}`}>
                    {isGolden && (playerGoldenTurns === undefined || playerGoldenTurns > 0) && (
                      <span className="golden-turns-badge-duel">
                        {playerGoldenTurns ? `${playerGoldenTurns}T` : '2T'}
                      </span>
                    )}

                    {isJoker ? (
                      <>
                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🔮</span>
                        <span style={{ fontFamily: 'Orbitron', fontSize: '0.62rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px' }}>
                          JOLLY
                        </span>
                        <span className="card-effect-tag">ETERE</span>
                      </>
                    ) : (
                      <>
                        <span className="card-suit-label" style={{ color: cardColor }}>{card.symbol}</span>
                        <span className="card-num-3d" style={{ color: cardColor }}>{card.displayVal || card.value}</span>
                        <span className="card-effect-tag">
                          {isSelectingDiscard ? '✕ SCARTA' : suitTag}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="card-pit-base"><div className="card-pit-lens"></div></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. PIANO INFERIORE GIOCATORE */}
        <div className="player-mega-plane">
          <div className="player-plane-backdrop"></div>

          {/* BANCO CARTE GIOCATORE */}
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
                <span style={{ fontFamily: 'Orbitron', fontSize: '0.48rem', fontWeight: 900, color: '#64748b' }}>SCARTI</span>
                <span style={{ fontSize: '0.74rem', color: playerTopColor, fontWeight: 900 }}>
                  {topPlayerDiscard ? `${topPlayerDiscard.symbol} ${topPlayerDiscard.displayVal || topPlayerDiscard.value}` : '---'}
                </span>
                <span style={{ fontSize: '0.42rem', color: '#94a3b8', fontWeight: 'bold' }}>TOP CARD</span>
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

          {/* OGGETTI E GAUGES GIOCATORE */}
          <div className="equip-objects-row">
            {isMalusAllowed ? (
              <div 
                className={`malus-gauge-box ${playerMalusGauge > 0 ? 'warning-active' : ''}`} 
                style={{ borderColor: 'rgba(245, 158, 11, 0.5)', '--pulse-speed': playerPulseSpeed }}
              >
                {playerMalusGauge >= malusMaxTicks && <div className="malus-detonation-ring"></div>}
                <div className="malus-title-row" style={{ color: '#fde047' }}>
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
                  className={`equip-pedestal-station station-dice ${playerDiceStage}`}
                  onClick={() => {
                    if (playerDiceReady && typeof executeQuantumDiceRoll === 'function') {
                      executeQuantumDiceRoll();
                    }
                  }}
                  title={playerDiceReady ? "DADI QUANTICI PRONTI! Tocca per lanciare!" : `Operatori completati: ${playerDiceCount}/4`}
                >
                  <div className="equip-stationary-art">🎲</div>
                  <span className="equip-label-tag">
                    {playerDiceReady ? 'LANCIA!' : `DADI ${playerDiceCount}/4`}
                  </span>
                  <div className="equip-pit-base"><div className="equip-pit-lens"></div></div>
                </div>
              )}

              {isAbilityModuleUnlocked && (
                <div 
                  className={`equip-pedestal-station station-module ${playerModuleStage}`}
                  onClick={() => {
                    if (isAbilityReady && typeof handleManualSkillTrigger === 'function') {
                      handleManualSkillTrigger();
                    }
                  }}
                  title={isAbilityReady ? "MODULO CARICO! Tocca per attivare!" : `Carica: ${Math.round(((abilityMeter || 0) / 12) * 100)}%`}
                >
                  {isAbilityReady && <div className="module-beacon-beam"></div>}
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
                  title={isItem1Used ? "Oggetto già consumato per questa partita" : (isItem1Usable ? "Tocca per attivare l'effetto!" : "In attesa del tuo turno")}
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
                  title={isItem2Used ? "Oggetto già consumato per questa partita" : (isItem2Usable ? "Tocca per attivare l'effetto!" : "In attesa del tuo turno")}
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

                {/* PULSANTE FUOCO CON MANINA CINETICA */}
                <div style={{ flex: 2.3, position: 'relative', display: 'flex' }}>
                  {!showCinematicSplash && ((guidedStep === 2 && curStage === 1) || (guidedStep === 4 && curStage === 2)) && !isSelectingDiscard && (selectedIndices?.length || 0) === 2 && turn === 'player1' && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">
                        {curStage === 1 ? "2. Conferma Apertura T1 ➔" : "4. Chiudi Convergenza T2 ➔"}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <button 
                    className={`tactile-btn-mech tactile-fire-btn ${isSelectingDiscard ? 'discard-action' : ''} ${
                      !isSelectingDiscard && turn === 'player1' && (selectedIndices?.length || 0) === 2 && liveResult !== '---' && liveResult !== 'NaN'
                        ? 'btn-ready-attack' 
                        : ''
                    } ${!showCinematicSplash && ((guidedStep === 2 && curStage === 1) || (guidedStep === 4 && curStage === 2)) && (selectedIndices?.length || 0) === 2 ? 'guided-pulse-target' : ''}`}
                    style={{ width: '100%' }}
                    disabled={
                      isSelectingDiscard 
                        ? true 
                        : (turn !== 'player1' || (selectedIndices?.length || 0) !== 2 || liveResult === '---' || liveResult === 'NaN')
                    }
                    onClick={() => {
                      if (guidedStep === 2 && curStage === 1) {
                        setGuidedStep(3);
                      } else if (guidedStep === 4 && curStage === 2) {
                        localStorage.setItem('eclissi_duel_guided_done', 'true');
                        setGuidedStep(0);
                      }
                      if (typeof onFireAction === 'function') {
                        onFireAction();
                      }
                    }}
                  >
                    {isSelectingDiscard 
                      ? 'TOCCA 1 CARTA DA SCARTARE' 
                      : curStage === 1 
                        ? ((selectedIndices?.length || 0) === 2 ? 'CONFERMA APERTURA (T1) ➔' : 'SCEGLI 2 CARTE (TURNO 1)')
                        : ((selectedIndices?.length || 0) === 2 ? 'CONFERMA CHIUSURA (T2) ➔' : 'SCEGLI 2 CARTE (TURNO 2)')
                    }
                  </button>
                </div>

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
              <span className="tank-readout">🛢️ +{playerTimeTank || 0}s</span>
              {isEtherAllowed && <span className="ether-status-text">🔮 {battleEther}/{maxBattleEther}</span>}
              <button 
                className={`tactile-aiuti-btn ${isScannerActive ? 'is-active' : ''}`} 
                onClick={toggleScanner}
              >
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
