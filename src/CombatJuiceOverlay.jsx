import React from 'react';

// ============================================================================
// SPEC-01-JUICE: SINTETIZZATORE AUDIO WEB AUDIO API (SENZA FILE ESTERNI)
// ============================================================================
export function playSynthesizedOperatorSound(rawOp) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('eclissi_muted_sfx') === 'true') {
      return;
    }
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const op = (rawOp === '−') ? '-' : (rawOp === '×') ? '*' : (rawOp === '÷') ? '/' : rawOp;

    if (op === '+') {
      // [+] Accordo Maggiore Triade Aperta (C5: 523Hz -> E5: 659Hz -> G5: 784Hz)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        gain.gain.setValueAtTime(0, now + idx * 0.035);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.035 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.35);
      });
    } else if (op === '-') {
      // [-] Salita Sawtooth rapida (A4: 440Hz -> E5: 659Hz -> A5: 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, now);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.30);
    } else if (op === '*') {
      // [*] Accordo Pieno Quadrato + Sub-armonica (D3 -> D4 -> F#4 -> A4 -> D5)
      const freqs = [146.83, 293.66, 369.99, 440.00, 587.33];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        osc.type = idx === 0 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.02);
        gain.gain.setValueAtTime(0, now + idx * 0.02);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.30 : 0.09, now + idx * 0.02 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.02 + 0.42);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.02);
        osc.stop(now + idx * 0.02 + 0.45);
      });
    } else if (op === '/') {
      // [/] Campana Cristallina Pura sinusoidale (E5: 659Hz -> B5: 988Hz -> E6: 1319Hz)
      const freqs = [659.25, 987.77, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);
        gain.gain.setValueAtTime(0, now + idx * 0.045);
        gain.gain.linearRampToValueAtTime(0.24, now + idx * 0.045 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.52);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.55);
      });
    } else if (op === 'convergenza' || op === 'convergence') {
      // [Convergenza] Doppia Risonanza Armonica (D4: 293Hz -> A4: 440Hz -> D5: 587Hz -> F#5: 740Hz)
      const freqs = [293.66, 440.00, 587.33, 739.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        osc.type = (idx % 2 === 0) ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        gain.gain.setValueAtTime(0, now + idx * 0.03);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.03 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.03 + 0.45);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.03);
        osc.stop(now + idx * 0.03 + 0.48);
      });
    } else if (op === 'pattern' || op === '★') {
      // [★] Arpeggio Ascendente Brillante (C5: 523Hz -> E5: 659Hz -> G5: 784Hz -> B5: 988Hz -> C6: 1046Hz)
      const freqs = [523.25, 659.25, 783.99, 987.77, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.26, now + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.40);
      });
    }
  } catch (err) {
    console.warn("Audio synthesis error:", err);
  }
}

// ============================================================================
// HELPER CLASSI MICRO-SHAKE
// ============================================================================
export function getOperatorMicroShakeClass(rawOp) {
  const op = (rawOp === '−') ? '-' : (rawOp === '×') ? '*' : (rawOp === '÷') ? '/' : rawOp;
  if (op === '-') return 'anim-micro-shake-minus';
  if (op === '*') return 'anim-micro-shake-mul';
  if (op === '/') return 'anim-micro-shake-div';
  if (op === 'convergenza' || op === 'convergence') return 'anim-micro-shake-mul';
  if (op === 'pattern' || op === '★') return 'anim-micro-shake-pattern';
  return 'anim-micro-shake-plus';
}

// ============================================================================
// AUTO-INIEZIONE STILI CSS SPECIFICI DEL MODULO JUICE
// ============================================================================
(function injectJuiceStyles() {
  if (typeof document === 'undefined') return;
  const styleId = 'eclissi-combat-juice-styles';
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.innerHTML = `
    .combat-juice-overlay {
      position: fixed;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 24000;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: juicePopIn 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      user-select: none;
    }

    @keyframes juicePopIn {
      0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
      18% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
      75% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      100% { transform: translate(-50%, calc(-50% - 28px)) scale(0.92); opacity: 0; }
    }

    .juice-damage-pop {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(2rem, 5.5vw, 3rem);
      font-weight: 900;
      color: #ffffff;
      -webkit-text-stroke: 2px #000000;
      text-shadow: 0 0 18px currentColor, 0 4px 10px rgba(0, 0, 0, 0.9);
      animation: damageFloatUp 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      line-height: 1;
      margin-top: 4px;
    }

    @keyframes damageFloatUp {
      0% { transform: scale(0.6) translateY(0); opacity: 0; }
      22% { transform: scale(1.28) translateY(-14px); opacity: 1; }
      70% { transform: scale(1.05) translateY(-38px); opacity: 1; }
      100% { transform: scale(0.9) translateY(-60px); opacity: 0; }
    }

    /* Micro-Shake 120ms */
    @keyframes microShake2 {
      0% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 1px); }
      50% { transform: translate(2px, -1px); }
      75% { transform: translate(-1px, 2px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes microShake4 {
      0% { transform: translate(0, 0); }
      20% { transform: translate(-3px, 2px); }
      40% { transform: translate(4px, -3px); }
      60% { transform: translate(-4px, 1px); }
      80% { transform: translate(2px, -2px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes microShake6 {
      0% { transform: translate(0, 0); }
      20% { transform: translate(-5px, 3px); }
      40% { transform: translate(6px, -4px); }
      60% { transform: translate(-4px, 5px); }
      80% { transform: translate(3px, -3px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes microShake8 {
      0% { transform: translate(0, 0); }
      20% { transform: translate(-7px, 5px); }
      40% { transform: translate(8px, -6px); }
      60% { transform: translate(-6px, 7px); }
      80% { transform: translate(5px, -4px); }
      100% { transform: translate(0, 0); }
    }

    .anim-micro-shake-plus { animation: microShake2 120ms ease-in-out; }
    .anim-micro-shake-minus { animation: microShake4 120ms ease-in-out; }
    .anim-micro-shake-mul { animation: microShake8 120ms ease-in-out; }
    .anim-micro-shake-div { animation: microShake6 120ms ease-in-out; }
    .anim-micro-shake-pattern { animation: microShake6 120ms ease-in-out; }
  `;
  document.head.appendChild(styleEl);
})();

// ============================================================================
// COMPONENTE VISIVO OVERLAY DI CELEBRAZIONE CALCOLO
// ============================================================================
export default function CombatJuiceOverlay({ data, onAnimationEnd }) {
  if (!data) return null;

  const { 
    operator = '+', 
    patternName = null,
    cards = [], 
    timeRemaining = 30, 
    didDeselect = false, 
    streak = 1, 
    damageDealt = 10 
  } = data;

  // 1. Configurazione feedback per Operatore, Pattern Poker o Convergenza
  const opConfig = {
    '+': {
      title: "INTUITO PURO!",
      subtitle: "Connessione fulminea stabilita",
      color: "#00f2fe",
      glow: "rgba(0, 242, 254, 0.65)"
    },
    '-': {
      title: "PRECISIONE ASSOLUTA!",
      subtitle: "Fendente chirurgico a segno",
      color: "#f97316",
      glow: "rgba(249, 115, 22, 0.65)"
    },
    '−': {
      title: "PRECISIONE ASSOLUTA!",
      subtitle: "Fendente chirurgico a segno",
      color: "#f97316",
      glow: "rgba(249, 115, 22, 0.65)"
    },
    '*': {
      title: "GENIO TATTICO!",
      subtitle: "Sovraccarico di potenza sbloccato",
      color: "#facc15",
      glow: "rgba(250, 204, 21, 0.75)"
    },
    '×': {
      title: "GENIO TATTICO!",
      subtitle: "Sovraccarico di potenza sbloccato",
      color: "#facc15",
      glow: "rgba(250, 204, 21, 0.75)"
    },
    '/': {
      title: "QI SUPREMO!",
      subtitle: "Scomposizione armonica perfetta",
      color: "#d946ef",
      glow: "rgba(217, 70, 239, 0.75)"
    },
    '÷': {
      title: "QI SUPREMO!",
      subtitle: "Scomposizione armonica perfetta",
      color: "#d946ef",
      glow: "rgba(217, 70, 239, 0.75)"
    },
    'convergenza': {
      title: patternName ? `${patternName.toUpperCase()} A SEGNO!` : "CONVERGENZA PERFETTA!",
      subtitle: "Traiettoria centrata & dominanza Poker",
      color: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.85)"
    },
    'convergence': {
      title: patternName ? `${patternName.toUpperCase()} A SEGNO!` : "CONVERGENZA PERFETTA!",
      subtitle: "Traiettoria centrata & dominanza Poker",
      color: "#f59e0b",
      glow: "rgba(245, 158, 11, 0.85)"
    },
    'pattern': {
      title: patternName ? `${patternName.toUpperCase()} A SEGNO!` : "COMBINAZIONE MAESTRA!",
      subtitle: "Allineamento strategico perfetto",
      color: "#facc15",
      glow: "rgba(250, 204, 21, 0.85)"
    },
    '★': {
      title: patternName ? `${patternName.toUpperCase()} A SEGNO!` : "COMBINAZIONE MAESTRA!",
      subtitle: "Allineamento strategico perfetto",
      color: "#facc15",
      glow: "rgba(250, 204, 21, 0.85)"
    }
  };

  const currentOp = opConfig[operator] || opConfig['+'];

  // 2. Calcolo Badge Eroici
  const isClutch = Number(timeRemaining) <= 5;
  const showCold = !didDeselect;
  const showAdaptation = Boolean(didDeselect);
  const showCombo = Number(streak) > 1;

  // 3. Calcolo Risonanza dei Semi Monocolore con supporto a tutte le convenzioni
  let monoSuitResonance = null;
  if (Array.isArray(cards)) {
    const validCards = cards.filter(Boolean);
    if (validCards.length >= 2) {
      const getSuit = (c) => {
        const s = c?.suit;
        if (s === 'H' || s === 'hearts' || s === '♥') return 'hearts';
        if (s === 'D' || s === 'diamonds' || s === '♦') return 'diamonds';
        if (s === 'S' || s === 'spades' || s === '♠') return 'spades';
        if (s === 'C' || s === 'clubs' || s === '♣') return 'clubs';
        if (typeof c?.id === 'string') {
          if (c.id.startsWith('hearts')) return 'hearts';
          if (c.id.startsWith('diamonds')) return 'diamonds';
          if (c.id.startsWith('spades')) return 'spades';
          if (c.id.startsWith('clubs')) return 'clubs';
        }
        return null;
      };

      const firstSuit = getSuit(validCards[0]);

      if (firstSuit && firstSuit !== 'joker') {
        const allSame = validCards.every(c => getSuit(c) === firstSuit);
        if (allSame) {
          if (firstSuit === 'hearts') monoSuitResonance = { label: "ARMONIA VITALE! (+HP)", color: "#ef4444" };
          else if (firstSuit === 'spades') monoSuitResonance = { label: "FRANTUMAZIONE SCUDO!", color: "#a855f7" };
          else if (firstSuit === 'clubs') monoSuitResonance = { label: "DISTORSIONE TEMPO!", color: "#06b6d4" };
          else if (firstSuit === 'diamonds') monoSuitResonance = { label: "JACKPOT STELLARE!", color: "#eab308" };
        }
      }
    }
  }

  return (
    <div 
      className="combat-juice-overlay" 
      onAnimationEnd={(e) => {
        // Previene che l'animazione di un elemento figlio chiuda anzitempo il popup principale
        if (e.target !== e.currentTarget) return;
        if (typeof onAnimationEnd === 'function') onAnimationEnd();
      }}
    >
      <div
        className="cyber-panel"
        style={{
          padding: '0.75rem 1.6rem',
          borderRadius: '14px',
          textAlign: 'center',
          border: `2px solid ${currentOp.color}`,
          boxShadow: `0 0 40px ${currentOp.glow}, inset 0 0 15px ${currentOp.glow}`,
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
          minWidth: '270px',
          maxWidth: '360px'
        }}
      >
        {/* BADGES EROICI */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '4px' }}>
          {isClutch && (
            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#0284c7', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #38bdf8' }}>
              NERVI D'ACCIAIO!
            </span>
          )}
          {showCold ? (
            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#d97706', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #fbbf24' }}>
              ★ COLPO DA MAESTRO
            </span>
          ) : showAdaptation ? (
            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#059669', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #34d399' }}>
              ADATTAMENTO PERFETTO
            </span>
          ) : null}
          {showCombo && (
            <span style={{ fontSize: '0.6rem', fontWeight: 900, background: '#be123c', color: '#ffffff', padding: '1px 6px', borderRadius: '4px', border: '1px solid #e11d48' }}>
              COMBO x{streak}
            </span>
          )}
        </div>

        {/* TITOLO CELEBRATIVO */}
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', textShadow: `0 0 14px ${currentOp.color}, 0 0 24px ${currentOp.color}`, letterSpacing: '0.5px', lineHeight: 1.15 }}>
          {currentOp.title}
        </div>

        {/* SOTTOTITOLO */}
        <div style={{ fontSize: '0.65rem', color: '#cbd5e1', fontWeight: 700, marginTop: '2px', opacity: 0.95 }}>
          {currentOp.subtitle}
        </div>

        {/* BOX RISONANZA SEMI */}
        {monoSuitResonance && (
          <div style={{ marginTop: '5px', background: `${monoSuitResonance.color}22`, border: `1px solid ${monoSuitResonance.color}`, padding: '2px 8px', borderRadius: '6px', fontSize: '0.62rem', fontWeight: 900, color: monoSuitResonance.color }}>
            {monoSuitResonance.label}
          </div>
        )}
      </div>

      {/* DANNO PROIETTATO CUBITALE */}
      <div className="juice-damage-pop" style={{ color: currentOp.color }}>
        -{damageDealt}!
      </div>
    </div>
  );
}

export { CombatJuiceOverlay };
