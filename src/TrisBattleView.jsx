import React, { useState, useEffect, useMemo } from 'react';
import { playSound } from './audio';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PilotPortraitVisual, checkPilotSetResonance } from './pilotsSystem';

// Iniezione isolata degli stili 3D per Tris Stellare
(function injectTris3DStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-stellare-tris-3d-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    :root {
      --vortex-spiral: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='sGrad' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='1'/%3E%3Cstop offset='22%25' stop-color='%23fde047' stop-opacity='0.95'/%3E%3Cstop offset='45%25' stop-color='%23f59e0b' stop-opacity='0.8'/%3E%3Cstop offset='75%25' stop-color='%23b45309' stop-opacity='0.35'/%3E%3Cstop offset='100%25' stop-color='%23000000' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cg fill='none' stroke='url(%23sGrad)' stroke-linecap='round'%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(72 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(144 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(216 50 50)'/%3E%3Cpath d='M50 50 C53 45 57 38 48 30 C38 20 20 28 18 45 C16 65 35 82 55 82 C78 82 92 60 88 38' stroke-width='5.2' transform='rotate(288 50 50)'/%3E%3C/g%3E%3C/svg%3E");
    }

    .tris-screen-wrapper {
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

    .battle-viewport-tris {
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

    .battle-viewport-tris .enemy-mega-plane {
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

    .battle-viewport-tris .enemy-plane-backdrop {
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

    .battle-viewport-tris .hud-enemy-telemetry {
      position: relative;
      z-index: 5;
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
    }

    .battle-viewport-tris .boss-name-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.82rem;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 16px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-tris .boss-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 1px 0 #fff, 0 2px 0 #be123c, 0 0 14px rgba(244, 63, 94, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-tris .boss-hp-3d span {
      font-size: 0.62rem;
      color: #fda4af;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
    }

    .battle-viewport-tris .hp-prismatic-dock {
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

    .battle-viewport-tris .hp-segmented-grid {
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(90deg, transparent 0, transparent 18px, rgba(0, 0, 0, 0.55) 18px, rgba(0, 0, 0, 0.55) 20px);
      pointer-events: none;
      z-index: 3;
    }

    .battle-viewport-tris .enemy-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #991b1b 0%, #dc2626 35%, #f43f5e 75%, #ff758f 100%);
      box-shadow: 0 0 14px #f43f5e, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-tris .player-hp-fill-3d {
      height: 100%;
      background: linear-gradient(90deg, #064e3b 0%, #059669 35%, #10b981 75%, #6ee7b7 100%);
      box-shadow: 0 0 14px #10b981, inset 0 2px 4px rgba(255, 255, 255, 0.55);
      transition: width 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-tris .vital-telemetry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .battle-viewport-tris .timer-readout {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 900;
      color: #facc15;
      white-space: nowrap;
    }

    .battle-viewport-tris .tank-readout {
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

    .battle-viewport-tris .tank-readout.enemy-tank {
      color: #facc15;
      background: rgba(250, 204, 21, 0.15);
      border-color: rgba(250, 204, 21, 0.4);
    }

    .battle-viewport-tris .tactile-status-badge {
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

    .battle-viewport-tris .enemy-phase-tag {
      background: rgba(244, 63, 94, 0.2);
      border: 1px solid #f43f5e;
      color: #fda4af;
      box-shadow: 0 0 6px rgba(244, 63, 94, 0.35);
    }

    .battle-viewport-tris .equip-objects-row {
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

    .battle-viewport-tris .malus-gauge-box {
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

    .battle-viewport-tris .malus-gauge-box.warning-active {
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

    .battle-viewport-tris .malus-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      color: #fca5a5;
      letter-spacing: 0.5px;
    }

    .battle-viewport-tris .malus-pip-array {
      display: flex;
      gap: 3px;
      width: 100%;
    }

    .battle-viewport-tris .malus-pip-cell {
      flex: 1;
      height: 6px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 2px #000;
      transition: all 0.2s;
    }

    .battle-viewport-tris .malus-pip-cell.filled {
      background: #f43f5e;
      box-shadow: 0 0 6px #f43f5e;
    }

    .battle-viewport-tris .malus-detonation-ring {
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

    .battle-viewport-tris .right-equip-cluster {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      transform-style: preserve-3d;
      margin-left: auto;
    }

    .battle-viewport-tris .equip-pedestal-station {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    .battle-viewport-tris .equip-stationary-art {
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

    .battle-viewport-tris .equip-label-tag {
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

    .battle-viewport-tris .equip-pit-base {
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

    .battle-viewport-tris .equip-pit-base::before {
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

    .battle-viewport-tris .equip-pit-lens {
      position: relative;
      z-index: 3;
      width: 16px;
      height: 5px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 6px #facc15, inset 0 0 3px #000000;
    }

    .battle-viewport-tris .station-dice { color: #00f2fe; }
    .battle-viewport-tris .station-dice .equip-label-tag { color: #38bdf8; }
    .battle-viewport-tris .station-dice.dice-is-ready {
      color: #facc15;
      filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-tris .station-module { color: #10b981; }
    .battle-viewport-tris .station-module .equip-label-tag { color: #34d399; }
    .battle-viewport-tris .station-module.is-overcharged {
      color: #00f2fe;
      filter: drop-shadow(0 0 12px rgba(0, 242, 254, 0.85));
      cursor: pointer !important;
    }

    .battle-viewport-tris .module-beacon-beam {
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

    .battle-viewport-tris .station-enemy-dice { color: #f43f5e; }
    .battle-viewport-tris .station-enemy-dice .equip-label-tag { color: #fca5a5; }

    .battle-viewport-tris .station-enemy-module { color: #00f2fe; }
    .battle-viewport-tris .station-enemy-module .equip-label-tag { color: #7dd3fc; }

    .battle-viewport-tris .station-mobius { color: #facc15; }
    .battle-viewport-tris .station-mobius .equip-label-tag { color: #fde047; }

    .battle-viewport-tris .station-piston { color: #ef4444; }
    .battle-viewport-tris .station-piston .equip-label-tag { color: #f87171; }

    .battle-viewport-tris .equip-pedestal-station.item-usable {
      cursor: pointer !important;
      filter: drop-shadow(0 0 10px currentColor);
    }

    .battle-viewport-tris .equip-pedestal-station.item-exhausted {
      opacity: 0.35;
      filter: grayscale(0.9);
      cursor: not-allowed !important;
    }

    .battle-viewport-tris .enemy-field-cards-row,
    .battle-viewport-tris .player-field-cards-row {
      display: flex;
      align-items: center;
      width: 100%;
      position: relative;
      z-index: 5;
    }
    .battle-viewport-tris .enemy-field-cards-row { margin-bottom: 6px; }

    .battle-viewport-tris .card-deck-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
      transform-style: preserve-3d;
      margin-right: 6px;
      --deck-thick: 14px;
    }

    .battle-viewport-tris .deck-ground-shadow {
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

    .battle-viewport-tris .deck-cards-stack-body {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: calc(80px + var(--deck-thick));
      border-radius: 7px;
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #f1f5f9 0px, #f1f5f9 1.2px, #091024 1.2px, #091024 2.6px);
      border: 1.2px solid rgba(0, 242, 254, 0.5);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.95), inset 0 0 6px rgba(0, 0, 0, 0.9);
      z-index: 2;
    }

    .battle-viewport-tris .enemy-deck-theme .deck-cards-stack-body {
      background: linear-gradient(90deg, rgba(0, 0, 0, 0.6) 0%, rgba(255, 255, 255, 0.15) 15%, transparent 50%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(180deg, #fecaca 0px, #fecaca 1.2px, #1c050d 1.2px, #1c050d 2.6px);
      border-color: rgba(244, 63, 94, 0.5);
    }

    .battle-viewport-tris .card-deck-top {
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

    .battle-viewport-tris .deck-count-badge {
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
      box-shadow: 0 0 8px rgba(0, 242, 254, 0.6);
    }

    .battle-viewport-tris .card-discard-stack-block {
      width: 56px;
      height: 80px;
      position: relative;
      cursor: pointer;
      flex-shrink: 0;
    }

    .battle-viewport-tris .card-discard-top {
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

    .battle-viewport-tris .terrains-horizontal-bank {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      margin-left: auto;
      flex: 0 0 auto;
      position: relative;
      z-index: 5;
    }

    .battle-viewport-tris .terrain-horizontal-card {
      width: 48px;
      height: 68px;
      flex: 0 0 48px;
      perspective: 600px;
      position: relative;
    }

    .battle-viewport-tris .terrain-card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      border-radius: 7px;
    }
    .battle-viewport-tris .terrain-horizontal-card.is-revealed .terrain-card-inner { transform: rotateY(180deg); }

    .battle-viewport-tris .terrain-card-face {
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

    .battle-viewport-tris .terrain-face-back {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.45);
      z-index: 2;
      transform: rotateY(0deg);
    }
    .battle-viewport-tris .terrain-face-back.enemy-border { border-color: rgba(244, 63, 94, 0.45); }

    .battle-viewport-tris .terrain-face-front {
      background: linear-gradient(165deg, rgba(14, 22, 48, 0.98) 0%, rgba(4, 8, 20, 0.99) 100%);
      border: 1.5px solid #00f2fe;
      transform: rotateY(180deg);
      z-index: 1;
    }

    .battle-viewport-tris .terrain-empty-slot {
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

    .battle-viewport-tris .terrain-rearm-tag {
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

    .battle-viewport-tris .enemy-action-ticker {
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
      animation: tickerPulse 1s infinite alternate ease-in-out;
      z-index: 35;
    }

    @keyframes tickerPulse {
      0% { box-shadow: 0 0 6px rgba(244, 63, 94, 0.3); transform: scale(0.99); }
      100% { box-shadow: 0 0 16px rgba(244, 63, 94, 0.7); transform: scale(1.01); }
    }

    .battle-viewport-tris .wall-hand-rack {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 3px;
      width: 100%;
      padding: 0 0.55rem;
      position: relative;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .wall-hand-rack.enemy-side {
      transform: translateZ(38px);
      z-index: 30;
      margin-top: 4px;
      margin-bottom: -2px;
      pointer-events: none;
    }

    .battle-viewport-tris .enemy-card-pod {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      position: relative;
      transform-style: preserve-3d;
      cursor: default;
    }

    .battle-viewport-tris .enemy-hologram-back {
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
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease, border-color 0.2s ease;
      transform-style: preserve-3d;
      overflow: hidden;
      padding: 0;
    }

    .battle-viewport-tris .enemy-pedestal-base {
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
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease;
    }

    .battle-viewport-tris .enemy-pedestal-base::before {
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

    .battle-viewport-tris .enemy-pedestal-base::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 5px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 5px #facc15, inset 0 0 3px #000000;
      z-index: 3;
    }

    .battle-viewport-tris .enemy-card-pod.is-selected .enemy-hologram-back {
      transform: translateY(-16px) translateZ(20px) scale(1.12);
      box-shadow: 0 0 24px rgba(244, 63, 94, 0.95), 0 0 10px #ffffff;
    }
    .battle-viewport-tris .enemy-card-pod.is-selected .enemy-pedestal-base {
      transform: scaleX(1.35) scaleY(1.3);
      border-color: #ffffff;
      box-shadow: 0 0 16px #f43f5e;
    }

    .battle-viewport-tris .enemy-card-pod.is-attacking .enemy-hologram-back {
      transform: translateY(22px) translateZ(35px) scale(1.22);
      box-shadow: 0 0 30px #ef4444, 0 0 50px #ff0055;
      animation: enemyLungeTris 0.35s ease-in-out;
    }

    @keyframes enemyLungeTris {
      0% { transform: translateY(-12px) scale(1.05); }
      50% { transform: translateY(26px) scale(1.3); }
      100% { transform: translateY(20px) scale(1.22); }
    }

    .battle-viewport-tris .enemy-card-pod.is-discarding .enemy-hologram-back {
      transform: translateY(-24px) scale(0.65);
      opacity: 0.25;
      transition: all 0.4s ease-out;
    }

    .battle-viewport-tris .trapezoid-ramp-hub {
      position: relative;
      width: 100%;
      perspective: 750px;
      transform-style: preserve-3d;
      padding: 34px 0.55rem 4px 0.55rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 15;
      margin-top: -8px;
    }

    .battle-viewport-tris .trapezoid-ramp-surface {
      position: absolute;
      inset: -78px -82px -54px -82px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.8) 35%, rgba(2, 6, 23, 0.98) 100%);
      border: 1.5px solid rgba(var(--target-glow-rgb, 0, 242, 254), 0.45);
      border-bottom: 2px solid rgba(var(--target-glow-rgb, 0, 242, 254), 0.85);
      clip-path: polygon(0% 0%, 100% 0%, 94.5% 100%, 5.5% 100%);
      transform: rotateX(34deg);
      transform-origin: 50% 100%;
      box-shadow: inset 0 0 32px rgba(var(--target-glow-rgb, 0, 242, 254), 0.22), 0 14px 28px rgba(0, 0, 0, 0.95);
      pointer-events: none;
    }

    .battle-viewport-tris .trapezoid-grid-lines {
      position: absolute;
      inset: 0;
      background: 
        linear-gradient(180deg, transparent 0%, rgba(var(--target-glow-rgb, 0, 242, 254), 0.08) 50%, transparent 100%),
        linear-gradient(to bottom right, transparent 48%, rgba(var(--target-glow-rgb, 0, 242, 254), 0.16) 50%, transparent 52%),
        linear-gradient(to bottom left, transparent 48%, rgba(var(--target-glow-rgb, 0, 242, 254), 0.16) 50%, transparent 52%);
      pointer-events: none;
    }

    .battle-viewport-tris .tris-triangle-layout {
      position: relative;
      z-index: 5;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      transform-style: preserve-3d;
      transform: translateY(-4px) scale(1.15);
      transform-origin: center center;
    }

    .battle-viewport-tris .tris-top-twins {
      display: flex;
      justify-content: center;
      gap: 14px;
      width: 100%;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .tris-bottom-center {
      display: flex;
      justify-content: center;
      width: 100%;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .tris-formula-path {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      background: transparent;
      border: none;
      outline: none;
      cursor: pointer;
      opacity: 1;
      transform: scale(0.94);
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), filter 0.2s;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris #path-gold {
      position: relative;
      left: 0px;
    }

    .battle-viewport-tris .path-cyan.is-selected { filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.8)); }
    .battle-viewport-tris .path-gold.is-selected { filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.8)); }
    .battle-viewport-tris .path-bomb.is-selected { filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.85)); }

    .battle-viewport-tris .tris-formula-path.is-recommended {
      position: relative;
    }
    .battle-viewport-tris .tris-formula-path.is-recommended .target-mount-node {
      position: relative;
    }

    .battle-viewport-tris .target-green-backlight-halo {
      position: absolute;
      top: 35%;
      left: 50%;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.85) 0%, rgba(16, 185, 129, 0.3) 50%, transparent 75%);
      filter: blur(8px);
      pointer-events: none;
      z-index: 1;
      animation: ledGreenAuraPulseTris 1s infinite alternate ease-in-out;
    }

    @keyframes ledGreenAuraPulseTris {
      0% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.85); }
      100% { opacity: 0.95; transform: translate(-50%, -50%) scale(1.2); }
    }

    .battle-viewport-tris .tris-formula-path.is-recommended .pit-socket-mini {
      border-color: #10b981 !important;
      box-shadow: 0 0 14px #10b981, inset 0 0 6px #10b981 !important;
    }

    .battle-viewport-tris .tris-formula-path.is-recommended .pit-core-lens {
      background: #10b981 !important;
      border-color: #6ee7b7 !important;
      box-shadow: 0 0 12px #10b981 !important;
    }

    .battle-viewport-tris .tris-formula-path.is-selected {
      transform: scale(1.02);
      z-index: 20;
    }

    .battle-viewport-tris .target-val-num {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: -4px;
      z-index: 5;
      transition: transform 0.2s ease;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .path-cyan .target-val-num,
    .battle-viewport-tris .path-gold .target-val-num {
      color: #ffffff !important;
      -webkit-text-stroke: 1.4px #000000;
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 3px 6px rgba(0, 0, 0, 0.9);
    }

    .battle-viewport-tris .target-parity-val {
      color: #fde047 !important;
      -webkit-text-stroke: 1px #000000;
      text-shadow: 0 0 10px rgba(250, 204, 21, 0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
      white-space: nowrap;
    }

    .battle-viewport-tris .path-bomb .target-val-num { 
      color: #ef4444 !important; 
      -webkit-text-stroke: 1.4px #000000;
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 14px rgba(239, 68, 68, 0.85);
      transition: all 0.25s;
    }

    .battle-viewport-tris .path-bomb.bomb-stage-3 .target-val-num {
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 10px rgba(245, 158, 11, 0.6);
    }

    .battle-viewport-tris .path-bomb.bomb-stage-2 .target-val-num {
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 16px rgba(239, 68, 68, 0.9);
    }

    .battle-viewport-tris .path-bomb.bomb-stage-1 .target-val-num {
      text-shadow: -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 24px #ff0000;
      animation: bombCriticalJitter 0.12s infinite alternate;
    }

    .battle-viewport-tris .tris-formula-path.is-selected .target-val-num {
      transform: translateY(-12px) translateZ(16px) scale(1.15);
      transition: transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      animation: targetNumberFloat 2s infinite ease-in-out alternate;
    }

    @keyframes targetNumberFloat {
      0% { transform: translateY(-12px) translateZ(16px) scale(1.15); }
      100% { transform: translateY(-17px) translateZ(22px) scale(1.22); }
    }

    .battle-viewport-tris .card-mount-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      position: relative;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .mini-card-billboard {
      width: 30px;
      height: 44px;
      background: #ffffff !important;
      border: 1.2px solid #0f172a !important;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2px 2px 3px 2px;
      z-index: 5;
      margin-bottom: 0px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
      transition: transform 0.2s ease;
      transform-style: preserve-3d;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }

    .battle-viewport-tris .mini-card-billboard.table-fixed {
      border: 1.5px solid #0f172a !important;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    }

    .battle-viewport-tris .mini-card-billboard.slotted {
      border: 1.5px solid #0284c7 !important;
      box-shadow: 0 0 10px rgba(0, 242, 254, 0.8);
      animation: cardSlotSnap 0.28s cubic-bezier(0.18, 0.89, 0.32, 1.35) forwards;
    }

    @keyframes cardSlotSnap {
      0% { transform: scale(0.65) translateY(14px) translateZ(30px); opacity: 0.4; }
      70% { transform: scale(1.15) translateY(-4px) translateZ(10px); }
      100% { transform: scale(1) translateY(0) translateZ(0); opacity: 1; }
    }

    .battle-viewport-tris .mini-card-billboard.empty-slot {
      border: 1.2px dashed rgba(255, 255, 255, 0.3) !important;
      background: rgba(2, 6, 23, 0.55) !important;
      justify-content: center;
      align-items: center;
      box-shadow: none;
      transition: all 0.2s;
    }
    .battle-viewport-tris .mini-card-billboard.empty-slot::after {
      content: '+';
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      color: rgba(255, 255, 255, 0.35);
      font-weight: 900;
    }

    .battle-viewport-tris .mini-card-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      line-height: 1;
      padding: 0 1px;
      margin-bottom: 2px;
    }

    .battle-viewport-tris .mini-corner-val {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.52rem;
      font-weight: 900;
      line-height: 1;
    }

    .battle-viewport-tris .mini-corner-suit {
      font-size: 0.48rem;
      line-height: 1;
      font-weight: 900;
    }

    .battle-viewport-tris .mini-center-val {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 900;
      line-height: 1;
      margin: auto 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }

    .battle-viewport-tris .pit-socket-mini {
      position: relative;
      width: 32px;
      height: 11px;
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
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      transform-origin: 50% 50%;
    }

    .battle-viewport-tris .pit-socket-mini::before {
      content: '';
      position: absolute;
      width: 32px;
      height: 32px;
      top: calc(50% - 16px);
      left: calc(50% - 16px);
      border-radius: 50%;
      background: var(--vortex-spiral) center/cover no-repeat;
      animation: blackHoleVortexSpin 3.8s linear infinite;
      pointer-events: none;
      z-index: 1;
    }

    .battle-viewport-tris .pit-socket-mini .pit-core-lens {
      position: relative;
      z-index: 3;
      width: 11px;
      height: 4px;
      border-radius: 50%;
      background: #000000;
      border: 1px solid #ffffff;
      box-shadow: 0 0 4px #facc15, inset 0 0 2px #000000;
    }

    .battle-viewport-tris .tris-op-glyph {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.15rem;
      font-weight: 900;
      color: #ffffff;
      align-self: flex-end;
      margin-bottom: 15px;
      padding: 0 2px;
      user-select: none;
      line-height: 1;
    }

    .battle-viewport-tris .tris-op-glyph.op-plus {
      -webkit-text-stroke: 1.2px #10b981;
      text-shadow: 0 0 8px #10b981, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }

    .battle-viewport-tris .tris-op-glyph.op-minus {
      -webkit-text-stroke: 1.2px #ef4444;
      text-shadow: 0 0 8px #ef4444, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }

    .battle-viewport-tris .tris-op-glyph.op-mult {
      -webkit-text-stroke: 1.2px #facc15;
      text-shadow: 0 0 8px #facc15, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }

    .battle-viewport-tris .tris-op-glyph.op-div {
      -webkit-text-stroke: 1.2px #00f2fe;
      text-shadow: 0 0 8px #00f2fe, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
    }

    .battle-viewport-tris .tris-equals-glyph {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.1rem;
      font-weight: 900;
      color: #ffffff;
      -webkit-text-stroke: 1.2px #000000;
      text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 6px rgba(255, 255, 255, 0.6);
      align-self: flex-end;
      margin-bottom: 15px;
      padding: 0 1px;
      user-select: none;
      line-height: 1;
    }

    .battle-viewport-tris .target-mount-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      margin-left: 2px;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .bomb-countdown-track-mini {
      display: flex;
      gap: 3px;
      margin-bottom: 2px;
      z-index: 5;
    }

    .battle-viewport-tris .bomb-step-mini {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      transition: all 0.2s;
    }

    .battle-viewport-tris .path-bomb.bomb-stage-3 .bomb-step-mini.active-stage {
      color: #ffffff; background: #d97706; border-color: #fde047; box-shadow: 0 0 6px #facc15;
    }

    .battle-viewport-tris .path-bomb.bomb-stage-2 .bomb-step-mini.active-stage {
      color: #ffffff; background: #ff007f; border-color: #ff66b2; box-shadow: 0 0 8px #ff007f;
    }

    .battle-viewport-tris .path-bomb.bomb-stage-1 .bomb-step-mini.active-stage {
      color: #ffffff; background: #dc2626; border-color: #fca5a5; box-shadow: 0 0 10px #ff0000;
      animation: bombStepBlink 0.3s infinite alternate;
    }

    @keyframes bombCriticalJitter {
      0% { transform: translate(0, 0); }
      50% { transform: translate(-1.5px, 1px); }
      100% { transform: translate(1.5px, -1px); }
    }

    @keyframes bombStepBlink {
      0% { filter: brightness(1); }
      100% { filter: brightness(1.8); }
    }

    .battle-viewport-tris .player-cards-section {
      position: relative;
      z-index: 40;
      transform: translateZ(40px);
      transform-style: preserve-3d;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }

    .battle-viewport-tris .discard-alert-banner {
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
      animation: discardPulseBannerTris 0.9s infinite alternate;
      z-index: 50;
    }

    @keyframes discardPulseBannerTris {
      0% { transform: scale(0.98); box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
      100% { transform: scale(1.02); box-shadow: 0 0 22px rgba(239, 68, 68, 1); }
    }

    .battle-viewport-tris .wall-hand-rack.player-side {
      transform: translateZ(45px);
      z-index: 45;
      margin-top: -14px;
      margin-bottom: 22px;
    }

    .battle-viewport-tris .card-unit-station {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      position: relative;
      gap: 2px;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .tactile-card-body {
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
      transition: transform 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28), box-shadow 0.2s ease, border-color 0.2s ease;
      transform-style: preserve-3d;
    }

    .battle-viewport-tris .tactile-card-body.golden-card {
      background: linear-gradient(150deg, #fef08a 0%, #facc15 50%, #eab308 100%) !important;
      border: 2px solid #facc15 !important;
      box-shadow: 0 0 18px rgba(250, 204, 21, 0.9), inset 0 0 8px rgba(250, 204, 21, 0.5) !important;
      animation: goldenCardPulseTris 1.2s infinite alternate ease-in-out;
    }

    @keyframes goldenCardPulseTris {
      0% { transform: translateY(0); box-shadow: 0 0 10px rgba(250, 204, 21, 0.6); }
      100% { transform: translateY(-4px); box-shadow: 0 0 24px rgba(250, 204, 21, 1), 0 0 10px #ffffff; }
    }

    .battle-viewport-tris .golden-turns-badge-tris {
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

    .battle-viewport-tris .tactile-card-body.suggested {
      border: 2px solid #10b981 !important;
      box-shadow: 0 0 22px rgba(16, 185, 129, 0.95), inset 0 0 10px rgba(52, 211, 153, 0.6) !important;
      animation: cardSuggestPulseTris 0.9s infinite alternate ease-in-out;
    }

    @keyframes cardSuggestPulseTris {
      0% { transform: translateY(0); box-shadow: 0 0 10px #10b981; }
      100% { transform: translateY(-6px); box-shadow: 0 0 24px #10b981, 0 0 35px #34d399; }
    }

    .battle-viewport-tris .tactile-card-body.discard-mode {
      border: 2px dashed #ef4444 !important;
      animation: cardDiscardShakeTris 0.85s infinite alternate ease-in-out;
    }

    @keyframes cardDiscardShakeTris {
      0% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-3px) rotate(-1deg); }
      100% { transform: translateY(0) rotate(1deg); }
    }

    .battle-viewport-tris .card-pit-base {
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

    .battle-viewport-tris .card-pit-base::before {
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

    .battle-viewport-tris .card-pit-lens {
      position: relative;
      z-index: 3;
      width: 20px;
      height: 6px;
      border-radius: 50%;
      background: #000000;
      border: 1.2px solid #ffffff;
      box-shadow: 0 0 6px #facc15, 0 0 10px rgba(250, 204, 21, 0.6), inset 0 0 4px #000000;
    }

    .battle-viewport-tris .card-num-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.3rem;
      font-weight: 900;
      line-height: 1;
    }

    .battle-viewport-tris .card-suit-label {
      font-size: 0.72rem;
      line-height: 1;
      font-weight: 900;
    }

    .battle-viewport-tris .card-effect-tag {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.48rem;
      font-weight: 900;
      color: #334155;
    }

    .battle-viewport-tris .card-hearts .card-suit-label,
    .battle-viewport-tris .card-hearts .card-num-3d,
    .battle-viewport-tris .card-diamonds .card-suit-label,
    .battle-viewport-tris .card-diamonds .card-num-3d {
      color: #dc2626 !important;
      text-shadow: none !important;
    }

    .battle-viewport-tris .card-spades .card-suit-label,
    .battle-viewport-tris .card-spades .card-num-3d,
    .battle-viewport-tris .card-clubs .card-suit-label,
    .battle-viewport-tris .card-clubs .card-num-3d {
      color: #0f172a !important;
      text-shadow: none !important;
    }

    .battle-viewport-tris .card-unit-station.is-selected .tactile-card-body {
      transform: translateY(-20px) translateZ(16px) scale(1.08);
      border: 2px solid #0284c7 !important;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(2, 132, 199, 0.6) !important;
    }

    .battle-viewport-tris .player-mega-plane {
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

    .battle-viewport-tris .player-plane-backdrop {
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

    .battle-viewport-tris .actions-cluster {
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

    .battle-viewport-tris .tactile-btn-mech {
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

    .battle-viewport-tris .tactile-btn-mech:active {
      transform: translateY(5px);
    }

    .battle-viewport-tris .tactile-btn-abandon {
      flex: 1;
      background: linear-gradient(180deg, #b91c1c 0%, #5f0d18 45%, #220508 100%);
      border-color: #ef4444;
      border-top: 2px solid #fecaca;
      color: #ffffff;
      box-shadow: 0 5px 0 #180306, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-tris .tactile-btn-deck {
      flex: 0.9;
      background: linear-gradient(180deg, #7e22ce 0%, #3b0764 45%, #140224 100%);
      border-color: #a855f7;
      border-top: 2px solid #f3e8ff;
      color: #ffffff;
      box-shadow: 0 5px 0 #120321, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-tris .tactile-fire-btn {
      flex: 2.3;
      background: linear-gradient(180deg, #38bdf8 0%, #0284c7 35%, #034870 75%, #011b2b 100%);
      border: 1.8px solid #bae6fd;
      border-top: 2.5px solid #ffffff;
      border-bottom: 2.5px solid #000;
      border-radius: 9px;
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 900;
      letter-spacing: 0.6px;
      cursor: pointer;
      box-shadow: 0 6px 0 #011827, 0 8px 0 #000, 0 14px 20px rgba(0, 0, 0, 0.95), 0 0 16px rgba(0, 242, 254, 0.4);
      text-shadow: 0 0 10px #ffffff, 0 2px 4px #000;
    }
    .battle-viewport-tris .tactile-fire-btn:active {
      transform: translateY(6px);
      box-shadow: 0 1px 0 #011827, 0 2px 0 #000, 0 4px 8px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 242, 254, 0.8);
    }

    .battle-viewport-tris .tactile-fire-btn.discard-action {
      background: linear-gradient(180deg, #dc2626 0%, #991b1b 45%, #450a0a 100%) !important;
      border-color: #fca5a5 !important;
      color: #fef08a !important;
      box-shadow: 0 6px 0 #220306, 0 0 18px rgba(239, 68, 68, 0.9) !important;
      animation: discardPulseBannerTris 0.9s infinite alternate;
    }

    .battle-viewport-tris .tactile-btn-change {
      flex: 0.9;
      background: linear-gradient(180deg, #ca8a04 0%, #713f12 45%, #231203 100%);
      border-color: #eab308;
      border-top: 2px solid #fef08a;
      color: #ffffff;
      box-shadow: 0 5px 0 #1c1102, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-tris .tactile-btn-pass {
      flex: 0.8;
      background: linear-gradient(180deg, #475569 0%, #1e293b 45%, #080c14 100%);
      border-color: #64748b;
      border-top: 2px solid #e2e8f0;
      color: #ffffff;
      box-shadow: 0 5px 0 #080c14, 0 6px 0 #000, 0 12px 16px rgba(0, 0, 0, 0.95);
    }

    .battle-viewport-tris .player-hp-dock-bottom {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
      position: relative;
      z-index: 5;
      padding-bottom: 2px;
    }

    .battle-viewport-tris .player-hp-3d {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.84rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 14px rgba(16, 185, 129, 0.8);
      white-space: nowrap;
    }

    .battle-viewport-tris .player-hp-3d span {
      font-size: 0.62rem;
      color: #6ee7b7;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
    }

    .battle-viewport-tris .ether-status-text {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.68rem;
      font-weight: 900;
      color: #f0abfc;
      text-shadow: 0 0 8px #e879f9;
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .battle-viewport-tris .tactile-aiuti-btn {
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

    .battle-viewport-tris .tactile-aiuti-btn.is-active {
      background: rgba(16, 185, 129, 0.35);
      border-color: #10b981;
      color: #ffffff;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }

    /* SCRITTA CINEMATICA SENZA SCATOLA */
    @keyframes trisCinematicIntro {
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

    .tris-cinematic-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 150;
      animation: trisCinematicIntro 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .tris-cinematic-sub {
      font-family: 'Orbitron', sans-serif;
      font-size: 0.85rem;
      font-weight: 900;
      color: #facc15;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 12px #facc15, 0 0 25px rgba(250, 204, 21, 0.7);
      margin-bottom: 6px;
    }

    .tris-cinematic-main {
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
    @keyframes handBounceTris {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-7px) scale(1.15); }
    }
    @keyframes handPulseGlowTris {
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
      animation: handBounceTris 1.1s infinite ease-in-out;
    }
    .guided-hand-icon {
      font-size: 1.6rem;
      line-height: 1;
      animation: handPulseGlowTris 1.4s infinite alternate;
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
      animation: guidedTargetPulse 0.9s infinite alternate ease-in-out !important;
    }
    @keyframes guidedTargetPulse {
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

export default function TrisBattleView({
  activeAnomaly,
  selectedPilot,
  pilotInventory,
  selectedDeck,
  aiDeckTheme,

  // Modulo & Dadi & Epici
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
  selectedTrisHandIndices,
  handleCardClick,
  playerDeck,
  playerDiscard,
  playerTerrainSlots,
  handleRearmTerrainSlot,

  // Carta Dorata
  playerGoldenCardId,
  playerGoldenTurns,

  // Tris Stellare
  trisObjectives,
  selectedObjectiveIndex,
  handleSelectObjective,
  trisSelectedOp1,
  trisSelectedOp2,
  handleSelectTrisOp1,
  handleSelectTrisOp2,
  playTrisStellareExpression,
  bombState,
  activeScannerHints,

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
    return localStorage.getItem('eclissi_tris_intro_banner_seen') !== 'true';
  });

  // MACCHINA A STATI RIGIDA DEL TUTORIAL GUIDATO (0 = Finito / 1 = Operatore / 2 = 4 Carte / 3 = Attacca / 4 = Scarica Seme)
  const [guidedStep, setGuidedStep] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return localStorage.getItem('eclissi_tris_guided_done') === 'true' ? 0 : 1;
  });

  // Animazione iniziale della scritta: dura 2.1s, poi si dissolve e sblocca la visualizzazione della manina
  useEffect(() => {
    if (!showCinematicSplash) return;
    try { playSound('epic_item_trigger'); } catch (_) {}
    const t = setTimeout(() => {
      setShowCinematicSplash(false);
      localStorage.setItem('eclissi_tris_intro_banner_seen', 'true');
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

  const scannerOn = Boolean(isScannerActive || scannerMode === 'FREE_FULL');

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

  const targets = trisObjectives?.targets || [
    { target: trisObjectives?.target || 24, isParity: false, isBomb: false },
    { target: null, isParity: true, parityType: 'PARI', isBomb: false },
    { target: 18, isParity: false, isBomb: true, turnsRemaining: 3 }
  ];

  const target1 = targets[0]?.target || 24;
  const target2 = targets[1]?.target || 30;
  const target3 = targets[2]?.target || 18;
  const isTarget3Bomb = Boolean(targets[2]?.isBomb);
  const bombTurns = targets[2]?.turnsRemaining ?? bombState?.turnsRemaining ?? 3;

  const formatOp = (op) => {
    if (!op) return '+';
    if (op === '*' || op === 'x' || op === 'X') return '×';
    if (op === '/') return '÷';
    return op;
  };

  const getOpClass = (op) => {
    if (op === '+') return 'op-plus';
    if (op === '-' || op === '−') return 'op-minus';
    if (op === '×' || op === '*' || op === 'x' || op === 'X') return 'op-mult';
    if (op === '÷' || op === '/') return 'op-div';
    return '';
  };

  const getFormulaOp = (targetIdx, opNum) => {
    const t = targets?.[targetIdx];
    if (opNum === 1) {
      const raw = (selectedObjectiveIndex === targetIdx ? trisSelectedOp1 : null) || t?.op1 || t?.operator1 || t?.operators?.[0] || t?.ops?.[0] || '+';
      return formatOp(raw);
    } else {
      return '+';
    }
  };

  // Funzione che cicla l'operatore Op1 al tocco diretto con sincronizzazione dell'indice bersaglio
  const cycleOp1 = (e, targetIdx = selectedObjectiveIndex) => {
    if (e) e.stopPropagation();
    const ops = ['+', '-', '*', '/'];
    const cur = (selectedObjectiveIndex === targetIdx ? trisSelectedOp1 : targets?.[targetIdx]?.op1) || '+';
    const nextOp = ops[(ops.indexOf(cur) + 1) % ops.length];
    if (typeof handleSelectTrisOp1 === 'function') {
      handleSelectTrisOp1(nextOp);
    }
    try { playSound('click'); } catch (_) {}
    if (guidedStep === 1) {
      setGuidedStep(2);
    }
  };

  // Sincronizzazione automatica degli stati del tutorial guidato in base alle carte scelte
  useEffect(() => {
    if (guidedStep === 2 && (selectedTrisHandIndices?.length || 0) === 4) {
      setGuidedStep(3);
    } else if (guidedStep === 3 && (selectedTrisHandIndices?.length || 0) < 4) {
      setGuidedStep(2);
    }
  }, [guidedStep, selectedTrisHandIndices]);

  // Calcolo indice della carta da puntare durante lo Step 2
  const guidedCardTargetIdx = useMemo(() => {
    if (guidedStep !== 2 || isSelectingDiscard) return null;
    const hints = activeScannerHints?.cardIndices || [];
    const hintUnselected = hints.find(i => !selectedTrisHandIndices.includes(i));
    if (hintUnselected !== undefined) return hintUnselected;
    return (playerHand || []).findIndex((_, i) => !selectedTrisHandIndices.includes(i));
  }, [guidedStep, isSelectingDiscard, activeScannerHints, selectedTrisHandIndices, playerHand]);

  const getCardColor = (c) => (c?.suit === 'hearts' || c?.suit === 'diamonds') ? '#dc2626' : '#0f172a';

  const slotCard1 = selectedTrisHandIndices?.[0] !== undefined ? playerHand[selectedTrisHandIndices[0]] : null;
  const slotCard2 = selectedTrisHandIndices?.[1] !== undefined ? playerHand[selectedTrisHandIndices[1]] : null;
  const tableCard = trisObjectives?.tableCard || { value: 7, displayVal: '7', suit: 'hearts', symbol: '♥', color: '#dc2626' };
  const tableColor = getCardColor(tableCard);

  const isFormula0Active = selectedObjectiveIndex === 0;
  const f0Card1 = isFormula0Active ? slotCard1 : null;
  const f0Card2 = isFormula0Active ? slotCard2 : null;

  const isFormula1Active = selectedObjectiveIndex === 1;
  const f1Card1 = isFormula1Active ? slotCard1 : null;
  const f1Card2 = isFormula1Active ? slotCard2 : null;

  const isFormula2Active = selectedObjectiveIndex === 2;
  const f2Card1 = isFormula2Active ? slotCard1 : null;
  const f2Card2 = isFormula2Active ? slotCard2 : null;

  const topPlayerDiscard = playerDiscard && playerDiscard.length > 0 ? playerDiscard[playerDiscard.length - 1] : null;
  const topAiDiscardCard = isRealPvP ? aiDiscardTop : (aiDiscard && aiDiscard.length > 0 ? aiDiscard[aiDiscard.length - 1] : null);

  const playerTopColor = getCardColor(topPlayerDiscard);
  const aiTopColor = getCardColor(topAiDiscardCard);

  const enemyName = isPvP 
    ? (pvpMeta?.opponent?.nickname || 'AVVERSARIO')
    : (isAdv && currentAdvLevel === 10 ? `👑 BOSS ${currentPlanetNameSafe?.toUpperCase() || ''}` : `AVVERSARIO S.${currentAdvLevel}`);

  const abilityName = selectedAbility?.toUpperCase() || 'MODULO';
  const abilityLvl = Math.min(abilities?.[selectedAbility]?.level || 1, 9);

  const recTargetIdx = scannerOn ? activeScannerHints?.targetIndex : null;

  // Rilevamento stato e livello del Pilota Tattico
  const isPilotResonant = checkPilotSetResonance(selectedPilot, selectedDeck, selectedAbility);
  const currentPilotLvl = pilotInventory?.[selectedPilot]?.level || 1;

  // Helper per renderizzare graficamente qualsiasi tipo di bersaglio (numerico, parità o bomba)
  const renderTargetDisplay = (targetObj, fallbackVal, isBomb, bombTurnsCount, recIdx, targetIdx) => {
    const isParity = Boolean(targetObj?.isParity);
    const parityType = targetObj?.parityType || 'PARI';
    const val = isParity ? parityType : (targetObj?.target ?? fallbackVal);

    return (
      <div className="target-mount-node">
        {recIdx === targetIdx && <div className="target-green-backlight-halo"></div>}
        {isBomb && (
          <div className="bomb-countdown-track-mini">
            {[3, 2, 1].map(stg => (
              <div key={stg} className={`bomb-step-mini ${bombTurnsCount === stg ? 'active-stage' : ''}`}>
                {stg}
              </div>
            ))}
          </div>
        )}
        <span 
          className={`target-val-num ${isParity ? 'target-parity-val' : ''}`}
          style={isParity ? { fontSize: parityType === 'DISPARI' ? '0.72rem' : '0.86rem', letterSpacing: '0.5px' } : undefined}
        >
          {val}
        </span>
        <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
      </div>
    );
  };

  return (
    <div className="tris-screen-wrapper">
      <div className="battle-viewport-tris" style={{ transform: `scale(${scale})` }}>
        
        {/* SCRITTA CINEMATICA PURA: NESSUNA SCATOLA, APPARE, SI INGRANDISCE E SVANISCE */}
        {showCinematicSplash && (
          <div className="tris-cinematic-overlay">
            <div className="tris-cinematic-sub">✦ NUOVA MODALITÀ ✦</div>
            <div className="tris-cinematic-main">TRIS STELLARE</div>
          </div>
        )}

        {/* 1. PIANO SUPERIORE (AVVERSARIO) */}
        <div className="enemy-mega-plane">
          <div className="enemy-plane-backdrop">
            <div className="tactical-grid-overlay"></div>
          </div>

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
                          <TerrainVisual isBack={true} color={slot.card.color || '#f43f5e'} width={48} height={68} />
                        </div>
                        <div 
                          className="terrain-card-face terrain-face-front" 
                          style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card.color || '#f43f5e'}` }}
                        >
                          <TerrainVisual cardId={slot.card.id || slot.cardId} color={slot.card.color || '#f43f5e'} width={48} height={68} isBack={false} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TELEMETRIA & AZIONI AVVERSARIO */}
        {turn === 'ai' && (
          <div className="enemy-action-ticker">
            <span style={{ fontSize: '0.85rem' }}>⚡</span>
            <span>{aiActionMessage || "L'avversario sta scegliendo le carte..."}</span>
          </div>
        )}

        {/* 2. MANO AVVERSARIA */}
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

        {/* 3. RAMPA CENTRALE: TRIS STELLARE CON I 3 BERSAGLI */}
        <div className="trapezoid-ramp-hub">
          <div className="trapezoid-ramp-surface">
            <div className="trapezoid-grid-lines"></div>
          </div>

          <div className="tris-triangle-layout">
            <div className="tris-top-twins">
              
              {/* FORMULA 1: CIANO (BERSAGLIO 0) */}
              <div 
                className={`tris-formula-path path-cyan ${selectedObjectiveIndex === 0 ? 'is-selected' : ''} ${recTargetIdx === 0 ? 'is-recommended' : ''}`}
                onClick={() => handleSelectObjective(0)}
              >
                <div className="card-mount-node">
                  <div className="mini-card-billboard table-fixed">
                    <div className="mini-card-header">
                      <span className="mini-corner-val" style={{ color: tableColor }}>{tableCard.displayVal || tableCard.value}</span>
                      <span className="mini-corner-suit" style={{ color: tableColor }}>{tableCard.symbol}</span>
                    </div>
                    <span className="mini-center-val" style={{ color: tableColor }}>
                      {tableCard.displayVal || tableCard.value}
                    </span>
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                {/* OPERATORE 1 CON GUIDA INTERATTIVA E TOCCO DIRETTO */}
                <span 
                  className={`tris-op-glyph ${getOpClass(getFormulaOp(0, 1))} ${!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 0 && turn === 'player1' ? 'guided-pulse-target' : ''}`}
                  onClick={(e) => {
                    if (selectedObjectiveIndex !== 0) handleSelectObjective(0);
                    cycleOp1(e, 0);
                  }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Tocca per cambiare operatore (+, −, ×, ÷)"
                >
                  {!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 0 && turn === 'player1' && (
                    <div className="guided-hand-beacon" style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">1. Tocca per cambiare (+, −, ×, ÷)</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  {getFormulaOp(0, 1)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f0Card1 ? 'slotted' : 'empty-slot'}`}>
                    {f0Card1 && (
                      <>
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f0Card1) }}>{f0Card1.displayVal || f0Card1.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f0Card1) }}>{f0Card1.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f0Card1) }}>
                          {f0Card1.displayVal || f0Card1.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className={`tris-op-glyph ${getOpClass(getFormulaOp(0, 2))}`}>
                  {getFormulaOp(0, 2)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f0Card2 ? 'slotted' : 'empty-slot'}`}>
                    {f0Card2 && (
                      <>
                        {selectedTrisHandIndices?.length > 2 && isFormula0Active && (
                          <span 
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              background: '#0284c7',
                              color: '#ffffff',
                              fontSize: '0.45rem',
                              fontWeight: 900,
                              fontFamily: 'Orbitron, sans-serif',
                              padding: '1px 3px',
                              borderRadius: '3px',
                              border: '1px solid #38bdf8',
                              boxShadow: '0 0 4px #00f2fe',
                              zIndex: 10,
                              lineHeight: 1
                            }}
                          >
                            +{selectedTrisHandIndices.length - 2}
                          </span>
                        )}
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f0Card2) }}>{f0Card2.displayVal || f0Card2.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f0Card2) }}>{f0Card2.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f0Card2) }}>
                          {f0Card2.displayVal || f0Card2.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className="tris-equals-glyph">=</span>

                {renderTargetDisplay(targets[0], target1, false, 0, recTargetIdx, 0)}
              </div>

              {/* FORMULA 2: ORO (BERSAGLIO 1 - PARITÀ / NUMERO) */}
              <div 
                className={`tris-formula-path path-gold ${selectedObjectiveIndex === 1 ? 'is-selected' : ''} ${recTargetIdx === 1 ? 'is-recommended' : ''}`}
                id="path-gold"
                onClick={() => handleSelectObjective(1)}
              >
                <div className="card-mount-node">
                  <div className="mini-card-billboard table-fixed">
                    <div className="mini-card-header">
                      <span className="mini-corner-val" style={{ color: tableColor }}>{tableCard.displayVal || tableCard.value}</span>
                      <span className="mini-corner-suit" style={{ color: tableColor }}>{tableCard.symbol}</span>
                    </div>
                    <span className="mini-center-val" style={{ color: tableColor }}>
                      {tableCard.displayVal || tableCard.value}
                    </span>
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span 
                  className={`tris-op-glyph ${getOpClass(getFormulaOp(1, 1))} ${!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 1 && turn === 'player1' ? 'guided-pulse-target' : ''}`}
                  onClick={(e) => {
                    if (selectedObjectiveIndex !== 1) handleSelectObjective(1);
                    cycleOp1(e, 1);
                  }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Tocca per cambiare operatore (+, −, ×, ÷)"
                >
                  {!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 1 && turn === 'player1' && (
                    <div className="guided-hand-beacon" style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">1. Tocca per cambiare (+, −, ×, ÷)</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  {getFormulaOp(1, 1)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f1Card1 ? 'slotted' : 'empty-slot'}`}>
                    {f1Card1 && (
                      <>
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f1Card1) }}>{f1Card1.displayVal || f1Card1.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f1Card1) }}>{f1Card1.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f1Card1) }}>
                          {f1Card1.displayVal || f1Card1.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className={`tris-op-glyph ${getOpClass(getFormulaOp(1, 2))}`}>
                  {getFormulaOp(1, 2)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f1Card2 ? 'slotted' : 'empty-slot'}`}>
                    {f1Card2 && (
                      <>
                        {selectedTrisHandIndices?.length > 2 && isFormula1Active && (
                          <span 
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              background: '#0284c7',
                              color: '#ffffff',
                              fontSize: '0.45rem',
                              fontWeight: 900,
                              fontFamily: 'Orbitron, sans-serif',
                              padding: '1px 3px',
                              borderRadius: '3px',
                              border: '1px solid #38bdf8',
                              boxShadow: '0 0 4px #00f2fe',
                              zIndex: 10,
                              lineHeight: 1
                            }}
                          >
                            +{selectedTrisHandIndices.length - 2}
                          </span>
                        )}
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f1Card2) }}>{f1Card2.displayVal || f1Card2.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f1Card2) }}>{f1Card2.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f1Card2) }}>
                          {f1Card2.displayVal || f1Card2.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className="tris-equals-glyph">=</span>

                {renderTargetDisplay(targets[1], target2, false, 0, recTargetIdx, 1)}
              </div>
            </div>

            {/* FORMULA 3: BOMBA / CENTRO (BERSAGLIO 2) */}
            <div className="tris-bottom-center">
              <div 
                className={`tris-formula-path path-bomb ${isTarget3Bomb ? `bomb-stage-${bombTurns}` : ''} ${selectedObjectiveIndex === 2 ? 'is-selected' : ''} ${recTargetIdx === 2 ? 'is-recommended' : ''}`}
                onClick={() => handleSelectObjective(2)}
              >
                <div className="card-mount-node">
                  <div className="mini-card-billboard table-fixed">
                    <div className="mini-card-header">
                      <span className="mini-corner-val" style={{ color: tableColor }}>{tableCard.displayVal || tableCard.value}</span>
                      <span className="mini-corner-suit" style={{ color: tableColor }}>{tableCard.symbol}</span>
                    </div>
                    <span className="mini-center-val" style={{ color: tableColor }}>
                      {tableCard.displayVal || tableCard.value}
                    </span>
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span 
                  className={`tris-op-glyph ${getOpClass(getFormulaOp(2, 1))} ${!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 2 && turn === 'player1' ? 'guided-pulse-target' : ''}`}
                  onClick={(e) => {
                    if (selectedObjectiveIndex !== 2) handleSelectObjective(2);
                    cycleOp1(e, 2);
                  }}
                  style={{ cursor: 'pointer', position: 'relative' }}
                  title="Tocca per cambiare operatore (+, −, ×, ÷)"
                >
                  {!showCinematicSplash && guidedStep === 1 && selectedObjectiveIndex === 2 && turn === 'player1' && (
                    <div className="guided-hand-beacon" style={{ bottom: '110%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">1. Tocca per cambiare (+, −, ×, ÷)</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}
                  {getFormulaOp(2, 1)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f2Card1 ? 'slotted' : 'empty-slot'}`}>
                    {f2Card1 && (
                      <>
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f2Card1) }}>{f2Card1.displayVal || f2Card1.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f2Card1) }}>{f2Card1.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f2Card1) }}>
                          {f2Card1.displayVal || f2Card1.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className={`tris-op-glyph ${getOpClass(getFormulaOp(2, 2))}`}>
                  {getFormulaOp(2, 2)}
                </span>

                <div className="card-mount-node">
                  <div className={`mini-card-billboard ${f2Card2 ? 'slotted' : 'empty-slot'}`}>
                    {f2Card2 && (
                      <>
                        {selectedTrisHandIndices?.length > 2 && isFormula2Active && (
                          <span 
                            style={{
                              position: 'absolute',
                              top: '-3px',
                              right: '-3px',
                              background: '#0284c7',
                              color: '#ffffff',
                              fontSize: '0.45rem',
                              fontWeight: 900,
                              fontFamily: 'Orbitron, sans-serif',
                              padding: '1px 3px',
                              borderRadius: '3px',
                              border: '1px solid #38bdf8',
                              boxShadow: '0 0 4px #00f2fe',
                              zIndex: 10,
                              lineHeight: 1
                            }}
                          >
                            +{selectedTrisHandIndices.length - 2}
                          </span>
                        )}
                        <div className="mini-card-header">
                          <span className="mini-corner-val" style={{ color: getCardColor(f2Card2) }}>{f2Card2.displayVal || f2Card2.value}</span>
                          <span className="mini-corner-suit" style={{ color: getCardColor(f2Card2) }}>{f2Card2.symbol}</span>
                        </div>
                        <span className="mini-center-val" style={{ color: getCardColor(f2Card2) }}>
                          {f2Card2.displayVal || f2Card2.value}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="pit-socket-mini"><div className="pit-core-lens"></div></div>
                </div>

                <span className="tris-equals-glyph">=</span>

                {renderTargetDisplay(targets[2], target3, isTarget3Bomb, bombTurns, recTargetIdx, 2)}
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
                : selectedTrisHandIndices?.includes(idx);

              const suitKey = card.suit || 'hearts';
              const cardColor = getCardColor(card);
              const isJoker = Boolean(card.isJoker || suitKey === 'joker');
              
              const isGolden = (playerGoldenCardId && card.id === playerGoldenCardId) || Boolean(card.isGolden);

              const suitClass = suitKey === 'diamonds' ? 'card-diamonds' :
                                suitKey === 'spades' ? 'card-spades' :
                                suitKey === 'clubs' ? 'card-clubs' : 'card-hearts';

              const suitTag = suitKey === 'diamonds' ? '+2🌟' :
                              suitKey === 'spades' ? '+3HP' :
                              suitKey === 'clubs' ? '+5s' : '+8% HP';

              const isSuggested = scannerOn && !isSelectingDiscard && (activeScannerHints?.cardIndices || []).includes(idx);

              // Indicatore mirato della carta per lo Step 2 (scelta 4 carte) e Step 4 (scarica finale)
              const isGuidedCard = !showCinematicSplash && turn === 'player1' && (
                (guidedStep === 2 && !isSelectingDiscard && idx === guidedCardTargetIdx) ||
                (guidedStep === 4 && isSelectingDiscard && idx === 0)
              );

              return (
                <div 
                  key={card.id || idx}
                  className={`card-unit-station ${suitClass} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (guidedStep === 4 && isSelectingDiscard) {
                      localStorage.setItem('eclissi_tris_guided_done', 'true');
                      setGuidedStep(0);
                    }
                    handleCardClick(idx);
                  }}
                >
                  {isGuidedCard && (
                    <div className="guided-hand-beacon" style={{ bottom: '105%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">
                        {guidedStep === 2 
                          ? `2. Scegli 4 carte (${selectedTrisHandIndices?.length || 0}/4)`
                          : `4. Sacrifica 1 carta per il seme!`}
                      </div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <div className={`tactile-card-body ${isGolden ? 'golden-card' : ''} ${isSuggested ? 'suggested' : ''} ${isSelectingDiscard ? 'discard-mode' : ''} ${isGuidedCard ? 'guided-pulse-target' : ''}`}>
                    {isGolden && (
                      <span className="golden-turns-badge-tris">
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
                          <TerrainVisual isBack={true} color={slot.card?.color || '#38bdf8'} width={48} height={68} />
                        </div>
                        <div 
                          className="terrain-card-face terrain-face-front" 
                          style={{ padding: 0, overflow: 'hidden', border: `1.5px solid ${slot.card?.color || '#38bdf8'}` }}
                        >
                          <TerrainVisual cardId={slot.card?.id || slot.cardId} color={slot.card?.color || '#38bdf8'} width={48} height={68} isBack={false} />
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
              <div 
                className={`malus-gauge-box ${playerMalusGauge > 0 ? 'warning-active' : ''}`} 
                style={{ borderColor: 'rgba(0,242,254,0.4)', '--pulse-speed': playerPulseSpeed }}
              >
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
                    if (isAbilityReady) {
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

                {/* PULSANTE FUOCO CON MANINA CINETICA PER STEP 3 */}
                <div style={{ flex: 2.3, position: 'relative', display: 'flex' }}>
                  {!showCinematicSplash && guidedStep === 3 && !isSelectingDiscard && (selectedTrisHandIndices?.length || 0) === 4 && turn === 'player1' && (
                    <div className="guided-hand-beacon" style={{ bottom: '115%', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="guided-tooltip-bubble">3. Attacca! Doppia Esplosione</div>
                      <div className="guided-hand-icon">👇</div>
                    </div>
                  )}

                  <button 
                    className={`tactile-btn-mech tactile-fire-btn ${isSelectingDiscard ? 'discard-action' : ''} ${
                      !isSelectingDiscard && turn === 'player1' && (selectedTrisHandIndices?.length || 0) === 4 ? 'btn-attack-ready' : ''
                    } ${!showCinematicSplash && guidedStep === 3 && (selectedTrisHandIndices?.length || 0) === 4 ? 'guided-pulse-target' : ''}`}
                    style={{ width: '100%' }}
                    disabled={isSelectingDiscard ? true : (turn !== 'player1' || (selectedTrisHandIndices?.length || 0) !== 4)}
                    onClick={() => {
                      if (guidedStep === 3) setGuidedStep(4);
                      playTrisStellareExpression();
                    }}
                  >
                    {isSelectingDiscard 
                      ? 'TOCCA 1 CARTA DA SCARTARE' 
                      : ((selectedTrisHandIndices?.length || 0) === 4 ? 'INCASTRA TRIS ➔' : `SCEGLI 4 CARTE (${selectedTrisHandIndices?.length || 0}/4)`)}
                  </button>
                </div>

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
