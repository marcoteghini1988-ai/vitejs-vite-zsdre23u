// ============================================================================
// WEAPONS DATABASE & ALGEBRAIC/POKER SOLVER ENGINE
// ============================================================================

export const CLASSIC_POKER_PATTERNS = Object.freeze([
  { id: 'one_pair', name: 'COPPIA', cardsCount: 2, damage: 14, desc: '2 carte dello stesso valore' },
  { id: 'two_pair', name: 'DOPPIA COPPIA', cardsCount: 4, damage: 18, desc: '2 coppie distinte' },
  { id: 'three_of_a_kind', name: 'TRIS', cardsCount: 3, damage: 22, desc: '3 carte dello stesso valore' },
  { id: 'straight', name: 'SCALA', cardsCount: 5, damage: 26, desc: '5 carte in sequenza' },
  { id: 'flush', name: 'COLORE', cardsCount: 3, damage: 28, desc: '3 o più carte dello stesso seme' },
  { id: 'full_house', name: 'FULL', cardsCount: 5, damage: 32, desc: '1 Tris + 1 Coppia' },
  { id: 'four_of_a_kind', name: 'POKER', cardsCount: 4, damage: 38, desc: '4 carte identiche' },
  { id: 'royal_flush', name: 'SCALA REALE', cardsCount: 5, damage: 45, desc: 'Scala a Colore' }
]);

export const RARITY_CONFIG = Object.freeze({
  common: { name: 'Comune', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.65)' },
  rare: { name: 'Rara', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.75)' },
  super_rare: { name: 'Super Rara', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.8)' },
  legendary: { name: 'Leggendaria', color: '#facc15', glow: 'rgba(250, 204, 21, 0.95)' }
});

export const WEAPONS_DATABASE = Object.freeze([
  // --------------------------------------------------------------------------
  // HARDPOINT 1: POKER RAPIDO (Slot 0)
  // --------------------------------------------------------------------------
  {
    id: 'wp_gatling',
    name: 'Gatling Cinetica',
    category: 'POKER RAPIDO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['one_pair', 'two_pair'],
    reqDescription: 'COPPIA',
    fxType: 'gatling',
    imgUrl: '/assets/weapons/gatling_cinetica.png',
    levels: {
      1: { damage: 14, shots: 4, desc: 'Raffica rapida da 4 dardi traccianti' },
      2: { damage: 20, shots: 8, desc: 'Raffica potenziata da 8 dardi' },
      3: { damage: 28, shots: 12, desc: 'Scarica a nastro da 12 dardi cinetici' },
      4: { damage: 38, shots: 16, perk: 'Perfora 5 HP di scudo nemico', desc: 'Saturazione a 16 dardi perforanti' }
    }
  },
  {
    id: 'wp_fuse_bolts',
    name: 'Balestra Dardi Fusi',
    category: 'POKER RAPIDO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['one_pair'],
    reqDescription: 'COPPIA (♦ o ♠)',
    fxType: 'fuse_bolts',
    imgUrl: '/assets/weapons/balestra_dardi_fusi.png',
    levels: {
      1: { damage: 16, shots: 2, desc: '2 arpioni fusi incandescenti' },
      2: { damage: 22, shots: 2, desc: '2 arpioni con scia termica' },
      3: { damage: 30, shots: 3, desc: '3 arpioni a ventaglio termico' },
      4: { damage: 42, shots: 4, perk: 'Ustione: 4 HP per 2 turni', desc: '4 arpioni pesanti perforanti' }
    }
  },
  {
    id: 'wp_disc_blades',
    name: 'Lame Rotanti',
    category: 'POKER RAPIDO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'common',
    color: '#38bdf8',
    allowedPatterns: ['two_pair'],
    reqDescription: 'DOPPIA COPPIA',
    fxType: 'disc_blades',
    imgUrl: '/assets/weapons/lame_rotanti.png',
    levels: {
      1: { damage: 18, shots: 2, desc: '2 carte rotanti a disco' },
      2: { damage: 25, shots: 4, desc: '4 dischi di luce tagliente' },
      3: { damage: 34, shots: 6, desc: '6 dischi con taglio orizzontale' },
      4: { damage: 46, shots: 8, perk: 'Taglia 4s dal timer del nemico', desc: '8 dischi sismici rotanti' }
    }
  },

  // --------------------------------------------------------------------------
  // HARDPOINT 2: POKER AVANZATO (Slot 1)
  // --------------------------------------------------------------------------
  {
    id: 'wp_xbow',
    name: 'Arco-X Balistico',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['three_of_a_kind', 'straight', 'flush'],
    reqDescription: 'TRIS / COLORE',
    fxType: 'arrow_barrage',
    imgUrl: '/assets/weapons/arco_x_balistico.png',
    levels: {
      1: { damage: 24, shots: 8, desc: 'Pioggia continua di 8 frecce balistiche' },
      2: { damage: 34, shots: 12, desc: 'Pioggia rapida di 12 frecce balistiche' },
      3: { damage: 46, shots: 16, desc: 'Tempesta di 16 frecce al plasma ciano' },
      4: { damage: 62, shots: 20, perk: 'Micro-scuotimento e ritardo barra avversaria', desc: 'Tempesta titanica di 20 frecce a mitragliatrice' }
    }
  },
  {
    id: 'wp_siege_cannon',
    name: 'Cannone d\'Assedio',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['three_of_a_kind'],
    reqDescription: 'TRIS',
    fxType: 'heavy_cannon',
    imgUrl: '/assets/weapons/cannone_assedio.png',
    levels: {
      1: { damage: 22, shots: 1, desc: 'Colpo pesante ad alta inerzia dal basso' },
      2: { damage: 32, shots: 1, desc: 'Colpo sferico con onda d\'urto conica' },
      3: { damage: 44, shots: 1, desc: 'Colpo incendiario con scuotimento arena' },
      4: { damage: 58, shots: 1, perk: 'Crepa visiva e -10% difesa permanente nemico', desc: 'Maglio sismico ad alto impatto' }
    }
  },
  {
    id: 'wp_blood_siphon',
    name: 'Sifone di Sangue',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'rare',
    color: '#a855f7',
    allowedPatterns: ['flush'],
    reqDescription: '3+ CUORI ♥',
    fxType: 'blood_siphon',
    imgUrl: '/assets/weapons/sifone_sangue.png',
    levels: {
      1: { damage: 18, heal: 10, shots: 3, desc: 'Dardi cremisi in salita e cura +10 HP' },
      2: { damage: 26, heal: 16, shots: 3, desc: 'Dardi con scia vitale e cura +16 HP' },
      3: { damage: 36, heal: 22, shots: 4, desc: 'Assorbimento denso e cura +22 HP' },
      4: { damage: 48, heal: 30, perk: 'La cura in eccesso diventa scudo temporaneo', desc: 'Sifone vitale supremo (+30 HP cura)' }
    }
  },
  {
    id: 'wp_flak_cannon',
    name: 'Flak a Grappolo',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'super_rare',
    color: '#f59e0b',
    allowedPatterns: ['full_house'],
    reqDescription: 'FULL',
    fxType: 'flak_burst',
    imgUrl: '/assets/weapons/flak_grappolo.png',
    levels: {
      1: { damage: 28, shots: 6, desc: 'Testata che si apre a mezz\'aria in 6 ogive' },
      2: { damage: 40, shots: 8, desc: 'Frammentazione in 8 ogive a ventaglio' },
      3: { damage: 54, shots: 10, desc: 'Frammentazione a 10 ogive con scintille' },
      4: { damage: 70, shots: 14, perk: 'Detonazione ad area che investe tutta la barra', desc: 'Saturazione aerea a 14 ogive' }
    }
  },
  {
    id: 'wp_kinetic_drill',
    name: 'Trivella a Torsione',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'super_rare',
    color: '#f59e0b',
    allowedPatterns: ['straight'],
    reqDescription: 'SCALA (5 CARTE)',
    fxType: 'kinetic_drill',
    imgUrl: '/assets/weapons/trivella_torsione.png',
    levels: {
      1: { damage: 26, ticks: 4, desc: 'Fuso conico che trapana la barra per 1s' },
      2: { damage: 38, ticks: 6, desc: 'Trivella ad alta velocità con vortice' },
      3: { damage: 52, ticks: 8, desc: 'Perforatore rotante al plasma continuo' },
      4: { damage: 68, ticks: 10, perk: 'Blocca le cure nemiche per il turno successivo', desc: 'Trapanamento quantico continuo' }
    }
  },
  {
    id: 'wp_micro_missiles',
    name: 'Sciame Microrazzi',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'legendary',
    color: '#facc15',
    allowedPatterns: ['four_of_a_kind'],
    reqDescription: 'POKER',
    fxType: 'micro_missiles',
    imgUrl: '/assets/weapons/sciame_microrazzi.png',
    levels: {
      1: { damage: 35, shots: 4, desc: '4 missili a traiettoria curva sui lati' },
      2: { damage: 50, shots: 6, desc: '6 missili con convergenza a sciame' },
      3: { damage: 68, shots: 8, desc: '8 missili guidati con scia densa' },
      4: { damage: 88, shots: 10, perk: 'Distrugge 1 carta dalla mano avversaria', desc: 'Saturazione a 10 testate balistiche' }
    }
  },
  {
    id: 'wp_apocalypse_torpedo',
    name: 'Siluro Apocalisse',
    category: 'POKER AVANZATO',
    slotAllowed: [0, 1],
    type: 'poker',
    rarity: 'legendary',
    color: '#facc15',
    allowedPatterns: ['royal_flush'],
    reqDescription: 'SCALA REALE',
    fxType: 'apocalypse_torpedo',
    imgUrl: '/assets/weapons/siluro_apocalisse.png',
    levels: {
      1: { damage: 45, shots: 1, desc: 'Testata colossale e flash bianco sullo schermo' },
      2: { damage: 65, shots: 1, desc: 'Detonazione nucleare a onde d\'urto' },
      3: { damage: 85, shots: 1, desc: 'Esplosione accecante con terremoto totale' },
      4: { damage: 110, shots: 1, perk: 'Azzera totalmente la barra malus alleata', desc: 'Annientamento planetario a schermo intero' }
    }
  },

  // --------------------------------------------------------------------------
  // HARDPOINT 3: CALCOLO TATTICO LINEARE (Slot 2)
  // --------------------------------------------------------------------------
  {
    id: 'wp_thunderstrike',
    name: 'Fulmine a Ciel Sereno',
    category: 'CALCOLO TATTICO',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '+',
    rarity: 'common',
    color: '#00f2fe',
    reqDescription: 'SOMMA [A + B] = TARGET',
    fxType: 'lightning_strike',
    imgUrl: '/assets/weapons/fulmine_ciel_sereno.png',
    levels: {
      1: { damage: 18, bolts: 1, desc: '1 fulmine secco verticale dal cielo' },
      2: { damage: 26, bolts: 2, desc: '2 fulmini ramificati simultanei' },
      3: { damage: 36, bolts: 3, desc: '3 fulmini con scarica continua sulla barra' },
      4: { damage: 50, bolts: 5, perk: 'Manda in stallo l\'arma nemica per 1T', desc: 'Tempesta di 5 fulmini a cascata' }
    }
  },
  {
    id: 'wp_railgun',
    name: 'Railgun Ionico',
    category: 'CALCOLO TATTICO',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '-',
    rarity: 'common',
    color: '#00f2fe',
    reqDescription: 'DIFFERENZA [A - B] = TARGET',
    fxType: 'railgun_beam',
    imgUrl: '/assets/weapons/railgun_ionico.png',
    levels: {
      1: { damage: 20, desc: 'Fascio istantaneo ciano che taglia la barra' },
      2: { damage: 28, desc: 'Raggio potenziato con anelli magnetici' },
      3: { damage: 38, desc: 'Fascio ultra-denso con scintille cadenti' },
      4: { damage: 52, perk: 'Ignora il 100% degli scudi e delle barriere', desc: 'Doppio fascio ionico incrociato' }
    }
  },
  {
    id: 'wp_seismic_wave',
    name: 'Lama Sismica',
    category: 'CALCOLO TATTICO',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '-',
    isTriple: true,
    rarity: 'common',
    color: '#00f2fe',
    reqDescription: 'DIFFERENZA 3 CARTE [A - B - C]',
    fxType: 'seismic_wave',
    imgUrl: '/assets/weapons/lama_sismica.png',
    levels: {
      1: { damage: 22, desc: 'Mezzaluna di luce che sale dal basso' },
      2: { damage: 30, desc: 'Doppia onda sismica orizzontale concentrica' },
      3: { damage: 42, desc: 'Lama spessa con distorsione lenti' },
      4: { damage: 56, perk: 'Azzera le anomalie o blocchi attivi sulla plancia', desc: 'Tsunami energetico a tutta larghezza' }
    }
  },
  {
    id: 'wp_tesla_arc',
    name: 'Torre Tesla',
    category: 'CALCOLO TATTICO',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '+',
    requireEven: true,
    rarity: 'rare',
    color: '#a855f7',
    reqDescription: 'SOMMA PARI [A + B] (PARI)',
    fxType: 'tesla_arc',
    imgUrl: '/assets/weapons/torre_tesla.png',
    levels: {
      1: { damage: 22, desc: 'Scariche ramificate che friggono la barra' },
      2: { damage: 32, desc: 'Arco voltaico continuo per 700ms' },
      3: { damage: 44, desc: 'Tempesta di scariche orizzontali sulla barra' },
      4: { damage: 60, perk: 'Ricarica istantaneamente il Modulo Abilità del +25%', desc: 'Sovraccarico voltaico a 100.000V' }
    }
  },
  {
    id: 'wp_cross_laser',
    name: 'Taglio Frazionato',
    category: 'CALCOLO TATTICO',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '/',
    rarity: 'rare',
    color: '#a855f7',
    reqDescription: 'DIVISIONE ESATTA [A / B] = TARGET',
    fxType: 'cross_laser',
    imgUrl: '/assets/weapons/taglio_frazionato.png',
    levels: {
      1: { damage: 24, desc: '2 lame laser dagli angoli inferiori a X' },
      2: { damage: 34, desc: 'Taglio a X con riverbero energetico' },
      3: { damage: 48, desc: 'Triplo taglio geometrico sincronizzato' },
      4: { damage: 64, perk: 'Conferisce +8 secondi extra nel Time Tank', desc: 'Reticolo laser continuo a 6 tagli' }
    }
  },

  // --------------------------------------------------------------------------
  // HARDPOINT 4: CALCOLO PESANTE / ASSEDIO (Slot 3)
  // --------------------------------------------------------------------------
  {
    id: 'wp_orbital_cannon',
    name: 'Raggio Orbitale',
    category: 'CALCOLO PESANTE',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '*',
    rarity: 'rare',
    color: '#a855f7',
    reqDescription: 'MOLTIPLICAZIONE [A * B] = TARGET',
    fxType: 'orbital_pillar',
    imgUrl: '/assets/weapons/raggio_orbitale.png',
    levels: {
      1: { damage: 26, ticks: 3, desc: 'Colonna di luce continua dal cielo' },
      2: { damage: 38, ticks: 5, desc: 'Colonna larga con scansione orizzontale' },
      3: { damage: 52, ticks: 7, desc: 'Fascio ionico largo metà schermo' },
      4: { damage: 72, ticks: 10, perk: 'Brucia 12s dal serbatoio tempo nemico', desc: 'Cannoneggiamento orbitale titanico' }
    }
  },
  {
    id: 'wp_meteor_strike',
    name: 'Meteora a 45°',
    category: 'CALCOLO PESANTE',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '+',
    isTriple: true,
    rarity: 'super_rare',
    color: '#f59e0b',
    reqDescription: 'SOMMA A 3 CARTE [A + B + C] = TARGET',
    fxType: 'meteor_drop',
    imgUrl: '/assets/weapons/meteora_45.png',
    levels: {
      1: { damage: 26, desc: 'Masso infuocato dall\'alto a destra con fumo' },
      2: { damage: 38, desc: 'Meteora pesante con impatto a onda d\'urto' },
      3: { damage: 54, desc: 'Asteroide vulcanico con schegge rimbalzanti' },
      4: { damage: 74, perk: 'Scuotimento sismico che fa cadere 1 scarto nemico', desc: 'Pioggia di 3 meteoriti consecutive' }
    }
  },
  {
    id: 'wp_cryo_fracture',
    name: 'Frattura Criogenica',
    category: 'CALCOLO PESANTE',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '/',
    rarity: 'super_rare',
    color: '#f59e0b',
    reqDescription: 'DIVISIONE CON RESTO [A / B + C] = TARGET',
    fxType: 'cryo_fracture',
    imgUrl: '/assets/weapons/frattura_criogenica.png',
    levels: {
      1: { damage: 28, desc: 'La barra nemica si congela e si frantuma' },
      2: { damage: 40, desc: 'Gelo profondo con stalattiti di ghiaccio' },
      3: { damage: 56, desc: 'Frattura criogenica a schegge vitree' },
      4: { damage: 76, perk: 'Congela il timer del prossimo turno nemico di 12s', desc: 'Zero Assoluto: impatto criomagnetico' }
    }
  },
  {
    id: 'wp_singularity_blackhole',
    name: 'Micro Buco Nero',
    category: 'CALCOLO PESANTE',
    slotAllowed: [2, 3],
    type: 'math',
    mathOp: '*',
    isTriple: true,
    rarity: 'legendary',
    color: '#facc15',
    reqDescription: 'COMPOSITA [A * B - C] = TARGET',
    fxType: 'black_hole',
    imgUrl: '/assets/weapons/micro_buco_nero.png',
    levels: {
      1: { damage: 32, desc: 'Sfera gravitazionale viola che risucchia gli HP' },
      2: { damage: 48, desc: 'Singolarità con disco di accrescimento rotante' },
      3: { damage: 68, desc: 'Buco nero ultra-denso con distorsione lenti' },
      4: { damage: 92, perk: 'Risucchia il 15% della salute residua attuale del boss', desc: 'Collasso dimensionale a singolarità' }
    }
  },
  {
    id: 'wp_reactor_bomb',
    name: 'Nucleo Instabile (Bomba)',
    category: 'CALCOLO PESANTE',
    slotAllowed: [2, 3],
    type: 'math',
    isBomb: true,
    rarity: 'legendary',
    color: '#facc15',
    reqDescription: 'DISINNESCO TARGET ENTRO 3 TURNI',
    fxType: 'reactor_bomb',
    imgUrl: '/assets/weapons/nucleo_instabile.png',
    levels: {
      1: { damage: 35, turns: 3, desc: 'Testata a reattore che detona sulla barra' },
      2: { damage: 52, turns: 3, desc: 'Bomba termonucleare con fungo al plasma' },
      3: { damage: 72, turns: 3, desc: 'Detonazione a reazione di fusione' },
      4: { damage: 100, turns: 3, perk: 'Innesca subito il massimo contraccolpo Malus nemico', desc: 'Fusione totale di reattore' }
    }
  }
]);

// ============================================================================
// HELPER MATEMATICI & SOLUTORE BERSAGLI DINAMICI
// ============================================================================

export const getCardSuit = (card) => {
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

export const getCardEffectiveValue = (card, activeAnomaly = null) => {
  if (!card) return 0;
  const baseVal = Number(card.value) || 0;
  const suit = getCardSuit(card);
  if (activeAnomaly?.id === 'hearts_res' && suit === 'hearts') {
    return baseVal * 2;
  }
  return baseVal;
};

export const calculateExpressionResult = (cards, op, activeAnomaly = null) => {
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

export const validatePokerPattern = (cards, patternId) => {
  if (!cards || cards.length === 0) return false;
  const vals = cards.map(c => Number(c?.value) || 0).sort((a, b) => a - b);
  const suits = cards.map(getCardSuit);

  const freq = {};
  vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  const counts = Object.values(freq).sort((a, b) => b - a);

  switch (patternId) {
    case 'one_pair':
      return counts[0] >= 2;
    case 'two_pair':
      return counts[0] >= 2 && counts[1] >= 2;
    case 'three_of_a_kind':
      return counts[0] >= 3;
    case 'flush':
      return new Set(suits).size === 1 && cards.length >= 3;
    case 'straight': {
      if (cards.length < 3) return false;
      const uniq = [...new Set(vals)];
      for (let i = 0; i < uniq.length - 1; i++) {
        if (uniq[i + 1] !== uniq[i] + 1) return false;
      }
      return uniq.length >= 3;
    }
    case 'full_house':
      return counts[0] >= 3 && counts[1] >= 2;
    case 'four_of_a_kind':
      return counts[0] >= 4;
    case 'royal_flush':
      return new Set(suits).size === 1 && vals.join(',') === '1,10,11,12,13';
    default:
      return false;
  }
};

export const generateSolvableMathTarget = (weapon, handCards = [], activeAnomaly = null) => {
  const vals = (handCards || [])
    .filter(c => c && !c.isJoker)
    .map(c => getCardEffectiveValue(c, activeAnomaly))
    .filter(v => v > 0);

  if (vals.length < 2) return 12;

  const op = weapon.mathOp || '+';

  // Formule a 3 carte
  if (weapon.isTriple && vals.length >= 3) {
    if (op === '+') return vals[0] + vals[1] + vals[2];
    if (op === '-') return Math.max(1, vals[0] - vals[1] - (vals[2] || 1));
    if (op === '*') return Math.max(1, (vals[0] * vals[1]) - (vals[2] || 0));
  }

  // Formule a 2 carte: trova una combinazione reale
  for (let i = 0; i < vals.length; i++) {
    for (let j = 0; j < vals.length; j++) {
      if (i === j) continue;
      const a = vals[i];
      const b = vals[j];

      if (op === '+') {
        const sum = a + b;
        if (weapon.requireEven ? sum % 2 === 0 : true) return sum;
      } else if (op === '-' && a > b) {
        return a - b;
      } else if (op === '*' && a * b <= 60) {
        return a * b;
      } else if (op === '/' && b !== 0 && a % b === 0) {
        return a / b;
      }
    }
  }

  return op === '*' ? 24 : op === '/' ? 2 : 14;
};