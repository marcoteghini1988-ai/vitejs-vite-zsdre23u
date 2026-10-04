import React, { useEffect, useRef } from 'react';

// 1.14 SFONDI COSMICI SPECIALI (I 4 SFONDI ACQUISTABILI CON DIAMANTI)
export const SPECIAL_BACKGROUNDS = Object.freeze([
  {
    id: 'deep_space',
    name: 'Cosmo Profondo',
    desc: 'Spazio profondo solcato da polvere di stelle e nebulose cerulee.',
    cost: 0,
    palette: { bg: '#020308', neb1: 'rgba(14, 116, 144, 0.25)', neb2: 'rgba(59, 130, 246, 0.15)', star: '#00f2fe' }
  },
  {
    id: 'supernova',
    name: 'Caldera di Supernova',
    desc: 'Lampi cremisi ed emissioni termiche di una stella al collasso.',
    cost: 15,
    palette: { bg: '#0f0508', neb1: 'rgba(239, 68, 68, 0.3)', neb2: 'rgba(245, 158, 11, 0.2)', star: '#fef08a' }
  },
  {
    id: 'event_horizon',
    name: 'Orizzonte degli Eventi',
    desc: 'Vortice di accrescimento attorno a un buco nero rotante supermassiccio.',
    cost: 25,
    palette: { bg: '#05020a', neb1: 'rgba(168, 85, 247, 0.35)', neb2: 'rgba(217, 70, 239, 0.25)', star: '#f5d0fe' }
  },
  {
    id: 'quantum_matrix',
    name: 'Matrice Quantica',
    desc: 'Flussi di dati subspaziali e geometrie di calcolo vettoriale.',
    cost: 20,
    palette: { bg: '#02080a', neb1: 'rgba(6, 182, 212, 0.3)', neb2: 'rgba(16, 185, 129, 0.2)', star: '#a7f3d0' }
  }
]);

// 1.15 CONFIGURAZIONI PROCEDURALI DEI 20 PIANETI (PARAMETRI CANVAS, ATMOSFERA & COSTI)
export const PLANET_ENVIRONMENTS = Object.freeze([
  { id: 'planet_env_1', name: 'Terra (Gaia)', planetNum: 1, fx: 'earth_realistic', planetRadius: 130, sphereColors: { c1: '#38bdf8', c2: '#1d4ed8', c3: '#0f172a', glow: 'rgba(56, 189, 248, 0.65)' }, neb1: 'rgba(14, 165, 233, 0.22)', neb2: 'rgba(34, 197, 94, 0.14)', pColors: ['#38bdf8', '#86efac', '#ffffff'], hasAtmosphereGlow: true, cost: 5 },
  { id: 'planet_env_2', name: 'Marte (Tharsis)', planetNum: 2, fx: 'mars_realistic', planetRadius: 110, sphereColors: { c1: '#f87171', c2: '#b91c1c', c3: '#450a0a', glow: 'rgba(239, 68, 68, 0.6)' }, neb1: 'rgba(220, 38, 38, 0.25)', neb2: 'rgba(180, 83, 9, 0.18)', pColors: ['#fca5a5', '#fde047', '#fed7aa'], hasAtmosphereGlow: true, cost: 5 },
  { id: 'planet_env_3', name: 'Venere (Afrodite)', planetNum: 3, fx: 'venus_realistic', planetRadius: 125, sphereColors: { c1: '#fde047', c2: '#ca8a04', c3: '#713f12', glow: 'rgba(250, 204, 21, 0.55)' }, neb1: 'rgba(202, 138, 4, 0.25)', neb2: 'rgba(234, 179, 8, 0.15)', pColors: ['#fef08a', '#facc15', '#fef9c3'], hasAtmosphereGlow: true, cost: 8 },
  { id: 'planet_env_4', name: 'Mercurio (Termico)', planetNum: 4, fx: 'mercury_realistic', planetRadius: 90, sphereColors: { c1: '#fb923c', c2: '#9a3412', c3: '#292524', glow: 'rgba(249, 115, 22, 0.5)' }, neb1: 'rgba(234, 88, 12, 0.2)', neb2: 'rgba(120, 53, 15, 0.2)', pColors: ['#fdba74', '#fbbf24', '#ffffff'], hasAtmosphereGlow: false, cost: 8 },
  { id: 'planet_env_5', name: 'Giove (Grande Macchia)', planetNum: 5, fx: 'jupiter_realistic', planetRadius: 155, sphereColors: { c1: '#fdba74', c2: '#ea580c', c3: '#7c2d12', glow: 'rgba(251, 146, 60, 0.6)' }, neb1: 'rgba(194, 65, 12, 0.25)', neb2: 'rgba(249, 115, 22, 0.15)', pColors: ['#fed7aa', '#ea580c', '#ffffff'], hasAtmosphereGlow: true, cost: 10 },
  { id: 'planet_env_6', name: 'Saturno (Anelli di Crono)', planetNum: 6, fx: 'saturn_realistic', planetRadius: 135, hasRings: true, ringColor: 'rgba(253, 230, 138, 0.75)', sphereColors: { c1: '#fef08a', c2: '#d97706', c3: '#78350f', glow: 'rgba(250, 204, 21, 0.5)' }, neb1: 'rgba(217, 119, 6, 0.22)', neb2: 'rgba(180, 83, 9, 0.15)', pColors: ['#fef08a', '#fbbf24', '#fde68a'], hasAtmosphereGlow: true, cost: 10 },
  { id: 'planet_env_7', name: 'Urano (Sentinella Ionica)', planetNum: 7, fx: 'uranus_realistic', planetRadius: 120, hasRings: true, ringColor: 'rgba(165, 243, 252, 0.65)', sphereColors: { c1: '#67e8f9', c2: '#0891b2', c3: '#164e63', glow: 'rgba(6, 182, 212, 0.6)' }, neb1: 'rgba(8, 145, 178, 0.25)', neb2: 'rgba(14, 116, 144, 0.15)', pColors: ['#a5f3fc', '#22d3ee', '#ffffff'], hasAtmosphereGlow: true, cost: 12 },
  { id: 'planet_env_8', name: 'Nettuno (Leviatano)', planetNum: 8, fx: 'neptune_realistic', planetRadius: 120, sphereColors: { c1: '#38bdf8', c2: '#1d4ed8', c3: '#1e1b4b', glow: 'rgba(37, 99, 235, 0.65)' }, neb1: 'rgba(29, 78, 216, 0.28)', neb2: 'rgba(30, 58, 138, 0.2)', pColors: ['#93c5fd', '#60a5fa', '#ffffff'], hasAtmosphereGlow: true, cost: 12 },
  { id: 'planet_env_9', name: 'Plutone (Ombre Gelide)', planetNum: 9, fx: 'pluto_realistic', planetRadius: 80, sphereColors: { c1: '#e2e8f0', c2: '#64748b', c3: '#0f172a', glow: 'rgba(148, 163, 184, 0.45)' }, neb1: 'rgba(71, 85, 105, 0.22)', neb2: 'rgba(30, 41, 59, 0.18)', pColors: ['#f1f5f9', '#cbd5e1', '#ffffff'], hasAtmosphereGlow: false, cost: 14 },
  { id: 'planet_env_10', name: 'Titano (Mari di Metano)', planetNum: 10, fx: 'titan_realistic', planetRadius: 110, sphereColors: { c1: '#fbbf24', c2: '#b45309', c3: '#451a03', glow: 'rgba(245, 158, 11, 0.55)' }, neb1: 'rgba(180, 83, 9, 0.25)', neb2: 'rgba(120, 53, 15, 0.2)', pColors: ['#fde68a', '#f59e0b', '#fef08a'], hasAtmosphereGlow: true, cost: 14 },
  { id: 'planet_env_11', name: 'Europa (Idra Criogenica)', planetNum: 11, fx: 'europa_realistic', planetRadius: 95, sphereColors: { c1: '#bae6fd', c2: '#0284c7', c3: '#082f49', glow: 'rgba(56, 189, 248, 0.6)' }, neb1: 'rgba(2, 132, 199, 0.25)', neb2: 'rgba(3, 105, 161, 0.15)', pColors: ['#e0f2fe', '#7dd3fc', '#ffffff'], hasAtmosphereGlow: false, cost: 16 },
  { id: 'planet_env_12', name: 'Ganimede (Magnete d\'Acciaio)', planetNum: 12, fx: 'ganymede_realistic', planetRadius: 115, sphereColors: { c1: '#cbd5e1', c2: '#475569', c3: '#0f172a', glow: 'rgba(148, 163, 184, 0.5)' }, neb1: 'rgba(51, 65, 85, 0.22)', neb2: 'rgba(15, 23, 42, 0.2)', pColors: ['#e2e8f0', '#94a3b8', '#ffffff'], hasAtmosphereGlow: true, cost: 16 },
  { id: 'planet_env_13', name: 'Kepler-186f (Eco dei Mondi)', planetNum: 13, fx: 'kepler_realistic', planetRadius: 125, sphereColors: { c1: '#f43f5e', c2: '#9f1239', c3: '#4c0519', glow: 'rgba(244, 63, 94, 0.6)' }, neb1: 'rgba(190, 18, 60, 0.25)', neb2: 'rgba(136, 19, 55, 0.2)', pColors: ['#fecdd3', '#fb7185', '#ffffff'], hasAtmosphereGlow: true, cost: 18 },
  { id: 'planet_env_14', name: 'Proxima b (Ancoraggio del Caos)', planetNum: 14, fx: 'proxima_realistic', planetRadius: 110, sphereColors: { c1: '#fb7185', c2: '#38bdf8', c3: '#0f172a', glow: 'rgba(244, 63, 94, 0.45)' }, neb1: 'rgba(225, 29, 72, 0.2)', neb2: 'rgba(2, 132, 199, 0.2)', pColors: ['#f43f5e', '#38bdf8', '#ffffff'], hasAtmosphereGlow: true, cost: 18 },
  { id: 'planet_env_15', name: 'TRAPPIST-1e (Sette Risonanze)', planetNum: 15, fx: 'trappist_realistic', planetRadius: 115, sphereColors: { c1: '#c084fc', c2: '#7e22ce', c3: '#3b0764', glow: 'rgba(192, 132, 252, 0.65)' }, neb1: 'rgba(147, 51, 234, 0.28)', neb2: 'rgba(107, 33, 168, 0.2)', pColors: ['#f3e8ff', '#d8b4fe', '#ffffff'], hasAtmosphereGlow: true, cost: 20 },
  { id: 'planet_env_16', name: 'Gliese 581g (Lagrange)', planetNum: 16, fx: 'gliese_realistic', planetRadius: 120, sphereColors: { c1: '#34d399', c2: '#047857', c3: '#064e3b', glow: 'rgba(16, 185, 129, 0.6)' }, neb1: 'rgba(5, 150, 105, 0.25)', neb2: 'rgba(4, 120, 87, 0.15)', pColors: ['#a7f3d0', '#6ee7b7', '#ffffff'], hasAtmosphereGlow: true, cost: 20 },
  { id: 'planet_env_17', name: 'Haumea (Spirale Cinetica)', planetNum: 17, fx: 'haumea_realistic', planetRadius: 90, sphereColors: { c1: '#f1f5f9', c2: '#94a3b8', c3: '#334155', glow: 'rgba(241, 245, 249, 0.5)' }, neb1: 'rgba(100, 116, 139, 0.2)', neb2: 'rgba(51, 65, 85, 0.15)', pColors: ['#ffffff', '#cbd5e1', '#94a3b8'], hasAtmosphereGlow: false, cost: 22 },
  { id: 'planet_env_18', name: 'Eris (Vuoto della Discordia)', planetNum: 18, fx: 'eris_realistic', planetRadius: 85, sphereColors: { c1: '#e0e7ff', c2: '#6366f1', c3: '#1e1b4b', glow: 'rgba(129, 140, 248, 0.55)' }, neb1: 'rgba(79, 70, 229, 0.25)', neb2: 'rgba(49, 46, 129, 0.2)', pColors: ['#c7d2fe', '#a5b4fc', '#ffffff'], hasAtmosphereGlow: false, cost: 22 },
  { id: 'planet_env_19', name: 'Io (Caldera Magmatica)', planetNum: 19, fx: 'io_realistic', planetRadius: 100, sphereColors: { c1: '#facc15', c2: '#ef4444', c3: '#7f1d1d', glow: 'rgba(239, 68, 68, 0.7)' }, neb1: 'rgba(220, 38, 38, 0.3)', neb2: 'rgba(180, 83, 9, 0.2)', pColors: ['#fef08a', '#f87171', '#ef4444'], hasAtmosphereGlow: true, cost: 25 },
  { id: 'planet_env_20', name: 'Encelado (Sovrano del Vuoto)', planetNum: 20, fx: 'enceladus_realistic', planetRadius: 90, sphereColors: { c1: '#a5f3fc', c2: '#0284c7', c3: '#0c4a6e', glow: 'rgba(56, 189, 248, 0.75)' }, neb1: 'rgba(14, 165, 233, 0.3)', neb2: 'rgba(2, 132, 199, 0.2)', pColors: ['#cffafe', '#7dd3fc', '#ffffff'], hasAtmosphereGlow: true, cost: 25 }
]);

const drawPlanetFeatures1to10 = (ctx, pNum, cx, cy, radius, t) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // PIANETA 1: TERRA (GAIA) - Continenti definiti + Nubi dinamiche
  if (pNum === 1) {
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.3, cy - radius * 0.2, radius * 0.45, radius * 0.35, 0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + radius * 0.35, cy + radius * 0.25, radius * 0.38, radius * 0.3, -0.3, 0, Math.PI * 2);
    ctx.ellipse(cx - radius * 0.1, cy + radius * 0.45, radius * 0.25, radius * 0.2, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.25, cy - radius * 0.15, radius * 0.2, radius * 0.15, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = -2; i <= 2; i++) {
      const cloudY = cy + (i * radius * 0.32) + Math.sin(t * 0.3 + i) * 6;
      const cloudX = cx + Math.cos(t * 0.25 + i) * (radius * 0.5);
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, radius * 0.55, radius * 0.12, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // PIANETA 2: MARTE (THARSIS) - Calotta + Valles Marineris + Olympus Mons
  else if (pNum === 2) {
    ctx.fillStyle = 'rgba(254, 242, 242, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - radius * 0.85, radius * 0.35, radius * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = radius * 0.08;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.55, cy + radius * 0.1);
    ctx.bezierCurveTo(cx - radius * 0.2, cy + radius * 0.25, cx + radius * 0.2, cy + radius * 0.05, cx + radius * 0.6, cy + radius * 0.2);
    ctx.stroke();

    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.2, radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#450a0a';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.2, radius * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

  // PIANETA 3: VENERE (AFRODITE) - Bande a Y/V di acido solforico
  else if (pNum === 3) {
    ctx.fillStyle = 'rgba(202, 138, 4, 0.3)';
    for (let b = -4; b <= 4; b++) {
      const bandY = cy + (b * radius * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx - radius, bandY);
      ctx.quadraticCurveTo(cx, bandY + Math.sin(t * 0.8 + b) * 12 + 10, cx + radius, bandY);
      ctx.lineTo(cx + radius, bandY + radius * 0.12);
      ctx.quadraticCurveTo(cx, bandY + radius * 0.12 + Math.sin(t * 0.8 + b) * 12 + 10, cx - radius, bandY + radius * 0.12);
      ctx.closePath();
      ctx.fill();
    }
  }

  // PIANETA 4: MERCURIO (TERMICO) - Crateri e raggi d'impatto
  else if (pNum === 4) {
    ctx.fillStyle = '#292524';
    const craters = [
      { x: -0.3, y: -0.2, r: 0.22 },
      { x: 0.25, y: 0.3, r: 0.18 },
      { x: -0.1, y: 0.4, r: 0.14 },
      { x: 0.4, y: -0.35, r: 0.15 },
      { x: 0.1, y: -0.1, r: 0.09 }
    ];
    craters.forEach(c => {
      const crX = cx + c.x * radius;
      const crY = cy + c.y * radius;
      const crR = c.r * radius;
      ctx.beginPath();
      ctx.arc(crX, crY, crR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // PIANETA 5: GIOVE - Fasce Kelvin-Helmholtz + Grande Macchia Rossa
  else if (pNum === 5) {
    const bands = ['#c2410c', '#7c2d12', '#ea580c', '#9a3412', '#c2410c', '#7c2d12', '#ea580c', '#9a3412'];
    bands.forEach((bColor, idx) => {
      const bandY = cy - radius + (idx * radius * 0.25);
      ctx.fillStyle = bColor;
      ctx.beginPath();
      ctx.rect(cx - radius, bandY, radius * 2, radius * 0.14);
      ctx.fill();

      ctx.fillStyle = 'rgba(254, 215, 170, 0.15)';
      ctx.beginPath();
      ctx.arc(cx - radius * 0.4 + Math.sin(t + idx) * 15, bandY + radius * 0.07, radius * 0.06, 0, Math.PI * 2);
      ctx.fill();
    });

    const spotX = cx + radius * 0.3;
    const spotY = cy + radius * 0.22;
    ctx.fillStyle = '#991b1b';
    ctx.beginPath();
    ctx.ellipse(spotX, spotY, radius * 0.26, radius * 0.16, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // PIANETA 6: SATURNO - Fasce dorate tenui
  else if (pNum === 6) {
    for (let b = -5; b <= 5; b++) {
      ctx.fillStyle = (b % 2 === 0) ? 'rgba(217, 119, 6, 0.2)' : 'rgba(253, 230, 138, 0.12)';
      ctx.fillRect(cx - radius, cy + (b * radius * 0.18), radius * 2, radius * 0.14);
    }
  }

  // PIANETA 7: URANO - Metano ionico e aurore polari
  else if (pNum === 7) {
    const auraGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
    auraGrad.addColorStop(0, 'rgba(165, 243, 252, 0.3)');
    auraGrad.addColorStop(0.5, 'transparent');
    auraGrad.addColorStop(1, 'rgba(165, 243, 252, 0.3)');
    ctx.fillStyle = auraGrad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  // PIANETA 8: NETTUNO - Grande Macchia Scura + Cirri di metano
  else if (pNum === 8) {
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.25, cy - radius * 0.15, radius * 0.24, radius * 0.14, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = radius * 0.04;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.15, radius * 0.28, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();
  }

  // PIANETA 9: PLUTONE - Sputnik Planitia a cuore + Toline organiche
  else if (pNum === 9) {
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(cx - radius, cy + radius * 0.15, radius * 2, radius * 0.4);

    ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + radius * 0.1);
    ctx.bezierCurveTo(cx - radius * 0.35, cy - radius * 0.3, cx - radius * 0.45, cy + radius * 0.2, cx, cy + radius * 0.45);
    ctx.bezierCurveTo(cx + radius * 0.45, cy + radius * 0.2, cx + radius * 0.35, cy - radius * 0.3, cx, cy + radius * 0.1);
    ctx.fill();
  }

  // PIANETA 10: TITANO - Laghi di metano (Kraken Mare) + Cappa polare
  else if (pNum === 10) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 0.3);

    ctx.fillStyle = '#0c4a6e';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.2, cy - radius * 0.45, radius * 0.25, radius * 0.14, 0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + radius * 0.25, cy - radius * 0.4, radius * 0.2, radius * 0.1, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const drawPlanetFeatures11to20 = (ctx, pNum, cx, cy, radius, t) => {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // PIANETA 11: EUROPA (IDRA CRIOGENICA) - Lineae criotettoniche e fratture permafrost
  if (pNum === 11) {
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = radius * 0.035;
    const lines = [
      [[-0.6, -0.2], [0.1, 0.4], [0.7, 0.1]],
      [[-0.3, 0.6], [0.3, -0.4], [0.6, -0.6]],
      [[-0.7, 0.3], [0.4, 0.5]],
      [[-0.1, -0.7], [0.2, 0.7]],
      [[-0.5, -0.5], [0.5, 0.3]]
    ];
    lines.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(cx + pts[0][0] * radius, cy + pts[0][1] * radius);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(cx + pts[i][0] * radius, cy + pts[i][1] * radius);
      }
      ctx.stroke();
    });
  }

  // PIANETA 12: GANIMEDE (TITANO D'ACCIAIO) - Terreni scuri e solchi tettonici
  else if (pNum === 12) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.3, cy, radius * 0.4, radius * 0.6, 0.3, 0, Math.PI * 2);
    ctx.ellipse(cx + radius * 0.35, cy - radius * 0.2, radius * 0.35, radius * 0.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = radius * 0.025;
    for (let s = -3; s <= 3; s++) {
      ctx.beginPath();
      ctx.arc(cx, cy + s * radius * 0.25, radius * 0.8, 0, Math.PI * 0.6);
      ctx.stroke();
    }
  }

  // PIANETA 13: KEPLER-186F (ECO DEI MONDI) - Flora da nana rossa e oceani metallici
  else if (pNum === 13) {
    ctx.fillStyle = '#4c0519';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.25, cy - radius * 0.2, radius * 0.45, radius * 0.35, 0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + radius * 0.3, cy + radius * 0.3, radius * 0.4, radius * 0.35, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.4, cy - radius * 0.4, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // PIANETA 14: PROXIMA B (GENERATORE DEL CAOS) - Blocco mareale: Giorno/Notte a terminatore
  else if (pNum === 14) {
    ctx.fillStyle = '#082f49';
    ctx.beginPath();
    ctx.rect(cx, cy - radius, radius, radius * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = radius * 0.08;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.15, radius * 0.98, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#881337';
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.4, cy, radius * 0.35, radius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // PIANETA 15: TRAPPIST-1E (SETTE RISONANZE) - 7 pianeti in risonanza orbitale
  else if (pNum === 15) {
    ctx.fillStyle = '#3b0764';
    for (let r = 1; r <= 7; r++) {
      const angle = (r * (Math.PI / 3.5)) + t * 0.2;
      const dist = (r / 7) * radius * 0.75;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, radius * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // PIANETA 16: GLIESE 581G (CUSTODE DI LAGRANGE) - Occhio oceanico substellare e banchisa
  else if (pNum === 16) {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.2, cy - radius * 0.2, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a7f3d0';
    ctx.lineWidth = radius * 0.05;
    ctx.stroke();
  }

  // PIANETA 17: HAUMEA (SPIRALE CINETICA) - Ellissoide allungato per l'ultra-rotazione
  else if (pNum === 17) {
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(cx + radius * 0.2, cy, radius * 0.2, radius * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = radius * 0.04;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.85, radius * 0.45, -0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // PIANETA 18: ERIS (ENTITÀ DELLA DISCORDIA) - Cristalli di metano puro con albedo estremo
  else if (pNum === 18) {
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.5, cy);
    ctx.lineTo(cx, cy - radius * 0.8);
    ctx.lineTo(cx + radius * 0.5, cy);
    ctx.lineTo(cx, cy + radius * 0.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // PIANETA 19: IO (CALDERA MAGMATICA) - Caldere vulcaniche sulfuree e lava attiva
  else if (pNum === 19) {
    const calderas = [
      { x: -0.3, y: -0.3, r: 0.18 },
      { x: 0.35, y: 0.2, r: 0.22 },
      { x: 0.05, y: 0.4, r: 0.15 },
      { x: -0.2, y: 0.35, r: 0.16 },
      { x: 0.2, y: -0.4, r: 0.14 }
    ];
    calderas.forEach(cald => {
      const calX = cx + cald.x * radius;
      const calY = cy + cald.y * radius;
      const calR = cald.r * radius;
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.arc(calX, calY, calR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(calX, calY, calR * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // PIANETA 20: ENCELADO (SOVRANO DEL VUOTO) - Strisce di tigre polari e criovulcani
  else if (pNum === 20) {
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = radius * 0.05;
    ctx.lineCap = 'round';
    for (let tIdx = -2; tIdx <= 2; tIdx++) {
      if (tIdx === 0) continue;
      const offsetX = tIdx * radius * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx + offsetX - radius * 0.1, cy + radius * 0.45);
      ctx.quadraticCurveTo(cx + offsetX, cy + radius * 0.7, cx + offsetX + radius * 0.1, cy + radius * 0.9);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.35, cy - radius * 0.35, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

const drawSpecialBackgroundFX = (ctx, envId, width, height, t) => {
  // SUPERNOVA
  if (envId === 'supernova') {
    const coreX = width * 0.5;
    const coreY = height * 0.35;
    const shockRad = Math.max(10, ((t * 40) % (width * 0.6)) + 20);

    ctx.save();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(coreX, coreY, shockRad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.beginPath();
    ctx.arc(coreX, coreY, shockRad * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ORIZZONTE DEGLI EVENTI
  else if (envId === 'event_horizon') {
    const bhX = width * 0.5;
    const bhY = height * 0.36;
    const bhRad = Math.max(10, 70 * (Math.min(width, height) / 500));

    ctx.save();
    ctx.translate(bhX, bhY);
    ctx.rotate(t * 0.2);

    const accGrad = ctx.createRadialGradient(0, 0, bhRad, 0, 0, bhRad * 2.6);
    accGrad.addColorStop(0, 'rgba(217, 70, 239, 0.85)');
    accGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.5)');
    accGrad.addColorStop(0.8, 'rgba(59, 130, 246, 0.2)');
    accGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = accGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bhRad * 2.8, bhRad * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(0, 0, bhRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // MATRICE QUANTICA
  else if (envId === 'quantum_matrix') {
    ctx.save();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.lineWidth = 1;
    const gridSize = 45;
    const shiftY = (t * 20) % gridSize;

    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = shiftY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// 2.2 COMPONENTE GRAFICO COMPLETO CANVAS 3D (DEEPSPACEUNIVERSECANVAS)
function DeepSpaceUniverseCanvas({ currentEnvironmentId = 'deep_space', planetNumber = null, isPaused = false }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const stateRef = useRef({
    stars: [],
    particles: [],
    nebulae: [],
    width: 0,
    height: 0,
    time: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    stateRef.current.width = width;
    stateRef.current.height = height;

    const initScene = (force = false) => {
      if (!force && stateRef.current.stars.length > 0) return;

      const starCount = Math.floor((width * height) / 3600);
      const stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.8 + 0.3,
          alpha: Math.random() * 0.85 + 0.15,
          twinkleSpeed: Math.random() * 0.03 + 0.008,
          layer: Math.floor(Math.random() * 3) + 1
        });
      }
      stateRef.current.stars = stars;

      const nebulae = [];
      const nebCount = 4;
      for (let i = 0; i < nebCount; i++) {
        nebulae.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * (width * 0.45) + (width * 0.25),
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          pulse: Math.random() * Math.PI * 2
        });
      }
      stateRef.current.nebulae = nebulae;

      const particles = [];
      const particleCount = 48;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4 - 0.2,
          size: Math.random() * 3 + 1,
          alpha: Math.random() * 0.7 + 0.2,
          life: Math.random() * 100,
          maxLife: Math.random() * 120 + 80
        });
      }
      stateRef.current.particles = particles;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      stateRef.current.width = width;
      stateRef.current.height = height;
      initScene(true);
    };
    window.addEventListener('resize', handleResize);

    initScene(false);

    const getEnvironmentConfig = () => {
      if (planetNumber) {
        const targetNum = Number(planetNumber);
        const found = PLANET_ENVIRONMENTS.find(p => p.planetNum === targetNum);
        if (found) return { isPlanet: true, config: found, pNum: targetNum };
      }
      if (typeof currentEnvironmentId === 'string' && currentEnvironmentId.startsWith('planet_env_')) {
        const targetNum = parseInt(currentEnvironmentId.replace('planet_env_', ''), 10);
        const found = PLANET_ENVIRONMENTS.find(p => p.planetNum === targetNum);
        if (found) return { isPlanet: true, config: found, pNum: targetNum };
      }
      const special = SPECIAL_BACKGROUNDS.find(b => b.id === currentEnvironmentId) || SPECIAL_BACKGROUNDS[0];
      return { isPlanet: false, config: special, pNum: null };
    };

    const render = () => {
      if (!isPaused) {
        stateRef.current.time += 0.016;
      }
      const t = stateRef.current.time;
      const { isPlanet, config, pNum } = getEnvironmentConfig();

      // 1. Sfondo Base
      ctx.fillStyle = isPlanet ? '#030712' : (config.palette?.bg || '#020308');
      ctx.fillRect(0, 0, width, height);

      // 2. Effetti Speciali Cosmici
      if (!isPlanet && config.id) {
        drawSpecialBackgroundFX(ctx, config.id, width, height, t);
      }

      // 3. Nebulose Procedurali
      stateRef.current.nebulae.forEach((neb, idx) => {
        neb.x += neb.vx;
        neb.y += neb.vy;
        if (neb.x < -neb.radius) neb.x = width + neb.radius;
        if (neb.x > width + neb.radius) neb.x = -neb.radius;
        if (neb.y < -neb.radius) neb.y = height + neb.radius;
        if (neb.y > height + neb.radius) neb.y = -neb.radius;

        const pulseScale = 1 + Math.sin(t * 0.5 + neb.pulse) * 0.08;
        const currentRad = Math.max(10, neb.radius * pulseScale);

        const color1 = isPlanet ? config.neb1 : (config.palette?.neb1 || 'rgba(14, 116, 144, 0.2)');
        const color2 = isPlanet ? config.neb2 : (config.palette?.neb2 || 'rgba(59, 130, 246, 0.12)');
        const chosenColor = (idx % 2 === 0) ? color1 : color2;

        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, currentRad);
        grad.addColorStop(0, chosenColor);
        const fadedColor = chosenColor.includes('rgba') 
          ? chosenColor.replace(/[\d\.]+\)$/, '0.04)') 
          : 'transparent';
        grad.addColorStop(0.6, fadedColor);
        grad.addColorStop(1, 'transparent');

        ctx.save();
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(neb.x, neb.y, currentRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 4. Campo Stellare con Parallasse
      stateRef.current.stars.forEach((star) => {
        const twinkle = Math.sin(t * 2 + star.x) * 0.35;
        const currentAlpha = Math.max(0.1, Math.min(1, star.alpha + twinkle));

        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.shadowColor = isPlanet ? config.sphereColors.c1 : (config.palette?.star || '#00f2fe');
        ctx.shadowBlur = star.layer === 3 ? 5 : (star.layer === 2 ? 2 : 0);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. Sfera Planetaria 3D & Dettagli Geofisici
      if (isPlanet && config && pNum) {
        const cx = width * 0.5;
        const cy = height * 0.38;
        const radius = Math.max(10, config.planetRadius * (Math.min(width, height) / 500));

        if (config.hasAtmosphereGlow) {
          const atmoGrad = ctx.createRadialGradient(cx, cy, radius * 0.9, cx, cy, radius * 1.35);
          atmoGrad.addColorStop(0, config.sphereColors.glow);
          const glowFade = config.sphereColors.glow.includes('rgba')
            ? config.sphereColors.glow.replace(/[\d\.]+\)$/, '0.18)')
            : 'transparent';
          atmoGrad.addColorStop(0.5, glowFade);
          atmoGrad.addColorStop(1, 'transparent');

          ctx.save();
          ctx.fillStyle = atmoGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        if (config.hasRings || pNum === 17) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(config.fx === 'uranus_realistic' ? Math.PI * 0.45 : (pNum === 17 ? -Math.PI * 0.25 : -Math.PI * 0.12));

          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 2.2, radius * 0.45, 0, Math.PI, Math.PI * 2);
          ctx.strokeStyle = config.ringColor || 'rgba(253, 230, 138, 0.65)';
          ctx.lineWidth = radius * 0.28;
          ctx.stroke();
          ctx.restore();
        }

        const lightX = cx - radius * 0.35;
        const lightY = cy - radius * 0.35;
        const sphereGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.05, cx, cy, radius);
        sphereGrad.addColorStop(0, config.sphereColors.c1);
        sphereGrad.addColorStop(0.45, config.sphereColors.c2);
        sphereGrad.addColorStop(0.9, config.sphereColors.c3);
        sphereGrad.addColorStop(1, '#000000');

        ctx.save();
        ctx.fillStyle = sphereGrad;
        ctx.shadowColor = config.sphereColors.glow;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (pNum <= 10) {
          drawPlanetFeatures1to10(ctx, pNum, cx, cy, radius, t);
        } else {
          drawPlanetFeatures11to20(ctx, pNum, cx, cy, radius, t);
        }

        if (config.hasRings || pNum === 17) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(config.fx === 'uranus_realistic' ? Math.PI * 0.45 : (pNum === 17 ? -Math.PI * 0.25 : -Math.PI * 0.12));

          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 2.2, radius * 0.45, 0, 0, Math.PI);
          ctx.strokeStyle = config.ringColor || 'rgba(253, 230, 138, 0.65)';
          ctx.lineWidth = radius * 0.28;
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Particelle Ambientali Dinamiche
      const pColors = isPlanet ? config.pColors : ['#00f2fe', '#38bdf8', '#ffffff'];
      stateRef.current.particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > p.maxLife || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = isPlanet && (pNum === 19 || pNum === 20) ? height * 0.8 : Math.random() * height;
          p.life = 0;
          p.vx = (Math.random() - 0.5) * 0.5;
          p.vy = isPlanet && (pNum === 19 || pNum === 20) ? -Math.random() * 1.5 - 0.5 : (Math.random() - 0.5) * 0.4;
        }

        const pColor = pColors[idx % pColors.length];
        const progress = p.life / p.maxLife;
        const currentAlpha = p.alpha * (1 - progress);

        ctx.save();
        ctx.fillStyle = pColor;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = pColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [currentEnvironmentId, planetNumber, isPaused]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}

export { DeepSpaceUniverseCanvas };
export default DeepSpaceUniverseCanvas;
