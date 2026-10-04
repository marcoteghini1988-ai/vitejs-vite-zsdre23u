import React, { useState, useEffect } from 'react';

// ============================================================================
// 2.5b COMPONENTE TERRAINVISUAL (IMMAGINE PNG REALE CON FALLBACK VETTORIALE)
// ============================================================================
function TerrainVisual({ 
  cardId, 
  color = '#00f2fe', 
  width = 64, 
  height = 96, 
  className = '', 
  isBack = false 
}) {
  const [imgError, setImgError] = useState(false);
  const w = width;
  const h = height;

  const imageSrc = isBack
    ? '/assets/terrain/terrain_back.png'
    : (cardId ? `/assets/terrain/${cardId}.png` : null);

  // Reset dello stato di errore quando cambia la sorgente (es. girando la carta tra fronte e retro)
  useEffect(() => {
    setImgError(false);
  }, [imageSrc]);

  // 1. Tenta di caricare l'immagine PNG reale (Fronte o Dorso)
  if (!imgError && imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={isBack ? 'terrain_back' : (cardId || 'terrain_card')}
        onError={() => setImgError(true)}
        className={className}
        style={{
          width: typeof w === 'number' ? `${w}px` : w,
          height: typeof h === 'number' ? `${h}px` : h,
          objectFit: 'cover',
          borderRadius: '6px',
          display: 'block',
          boxShadow: `0 4px 14px ${color}55`,
          flexShrink: 0
        }}
      />
    );
  }

  // 2. Disegni vettoriali SVG per il fallback
  const renderTerrainArtwork = (id, c) => {
    switch (id) {
      // ----------------------------------------------------------------------
      // 1. CRIO & STASI
      // ----------------------------------------------------------------------
      case 'cryo_stasis': // Criostasi di Emergenza (Comune)
        return (
          <g>
            <rect x="30" y="32" width="40" height="86" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke={c} strokeWidth="2" />
            <line x1="38" y1="32" x2="38" y2="118" stroke={c} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
            <line x1="62" y1="32" x2="62" y2="118" stroke={c} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
            <ellipse cx="50" cy="75" rx="12" ry="26" fill={`${c}25`} stroke="#fff" strokeWidth="1.5" />
            <line x1="20" y1="50" x2="80" y2="50" stroke={c} strokeWidth="1.5" />
            <line x1="20" y1="100" x2="80" y2="100" stroke={c} strokeWidth="1.5" />
            <polygon points="50,45 54,75 50,105 46,75" fill="#fff" opacity="0.85" />
            <circle cx="50" cy="75" r="4" fill={c} />
          </g>
        );

      case 'sub_zero_seal': // Sigillo Sub-Zero (Rara)
        return (
          <g>
            <polygon points="50,30 84,50 84,100 50,120 16,100 16,50" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <polygon points="50,42 74,56 74,94 50,108 26,94 26,56" stroke="#fff" strokeWidth="1.2" strokeDasharray="4 2" />
            <line x1="50" y1="30" x2="50" y2="120" stroke={c} strokeWidth="1.5" />
            <line x1="16" y1="75" x2="84" y2="75" stroke={c} strokeWidth="1.5" />
            <circle cx="50" cy="75" r="14" fill="rgba(2, 6, 23, 0.9)" stroke="#fff" strokeWidth="1.5" />
            <polygon points="50,65 53,75 63,75 55,81 58,91 50,85 42,91 45,81 37,75 47,75" fill={c} />
          </g>
        );

      case 'cryo_absorber': // Assorbitore Criogenico (Super Rara)
        return (
          <g>
            <circle cx="50" cy="75" r="38" stroke={c} strokeWidth="2" strokeDasharray="6 3" opacity="0.5" />
            <circle cx="50" cy="75" r="26" stroke="#fff" strokeWidth="1.5" fill={`${c}20`} />
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <g key={i} transform={`rotate(${deg} 50 75)`}>
                <line x1="50" y1="49" x2="50" y2="35" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
                <polygon points="46,35 54,35 50,28" fill="#fff" />
              </g>
            ))}
            <circle cx="50" cy="75" r="10" fill="#020617" stroke={c} strokeWidth="2" />
            <circle cx="50" cy="75" r="4" fill="#fff" />
          </g>
        );

      case 'frost_bite': // Morsa del Gelo (Leggendaria)
        return (
          <g>
            <path d="M22 40 C35 55 35 95 22 110" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M78 40 C65 55 65 95 78 110" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <polygon points="28,55 38,60 28,65" fill="#fff" />
            <polygon points="28,85 38,90 28,95" fill="#fff" />
            <polygon points="72,55 62,60 72,65" fill="#fff" />
            <polygon points="72,85 62,90 72,95" fill="#fff" />
            <circle cx="50" cy="75" r="16" fill="rgba(8, 145, 178, 0.4)" stroke="#fff" strokeWidth="1.5" />
            <line x1="42" y1="67" x2="58" y2="83" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="58" y1="67" x2="42" y2="83" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );

      // ----------------------------------------------------------------------
      // 2. GRAVITÀ & CONDENSAZIONE
      // ----------------------------------------------------------------------
      case 'magnetic_valve': // Valvola di Sfogo Magnetico (Comune)
        return (
          <g>
            <ellipse cx="50" cy="75" rx="36" ry="16" stroke={c} strokeWidth="2" fill="none" />
            <ellipse cx="50" cy="75" rx="26" ry="11" stroke="#fff" strokeWidth="1.5" strokeDasharray="4 2" />
            <path d="M50 25 V55 M50 95 V125" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <polygon points="45,35 50,23 55,35" fill="#fff" />
            <polygon points="45,115 50,127 55,115" fill="#fff" />
            <circle cx="50" cy="75" r="8" fill={c} />
            <circle cx="50" cy="75" r="3" fill="#fff" />
          </g>
        );

      case 'charge_splitter': // Ripartitore di Carica (Rara)
        return (
          <g>
            <line x1="50" y1="28" x2="50" y2="60" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="62" r="6" fill={c} />
            <path d="M50 68 L28 112 M50 68 L72 112" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <circle cx="28" cy="114" r="5" fill="#fff" />
            <circle cx="72" cy="114" r="5" fill="#fff" />
            <line x1="28" y1="114" x2="72" y2="114" stroke={c} strokeWidth="1" strokeDasharray="3 3" />
            <path d="M42 82 Q50 74 58 82" stroke="#fff" strokeWidth="2" fill="none" />
          </g>
        );

      case 'gravimetric_anchor': // Ancora Gravimetrica (Super Rara)
        return (
          <g>
            <circle cx="50" cy="40" r="10" stroke={c} strokeWidth="3" fill="none" />
            <line x1="50" y1="50" x2="50" y2="114" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="32" y1="64" x2="68" y2="64" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <path d="M22 88 C26 118 74 118 78 88" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <polygon points="18,88 26,88 22,80" fill="#fff" />
            <polygon points="74,88 82,88 78,80" fill="#fff" />
            <circle cx="50" cy="92" r="5" fill={c} />
          </g>
        );

      case 'rebound_condenser': // Condensatore di Rimbalzo (Leggendaria)
        return (
          <g>
            <path d="M25 45 Q50 65 75 45" stroke={c} strokeWidth="3.5" fill="none" />
            <path d="M25 105 Q50 85 75 105" stroke={c} strokeWidth="3.5" fill="none" />
            <circle cx="50" cy="75" r="18" fill={`${c}25`} stroke="#fff" strokeWidth="2" />
            <path d="M42 75 L58 75 M52 69 L58 75 L52 81" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M58 75 L42 75 M48 81 L42 75 L48 69" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      // ----------------------------------------------------------------------
      // 3. ETERE & SPAZIO-TEMPO
      // ----------------------------------------------------------------------
      case 'frequency_reserve': // Riserva di Frequenza (Comune)
        return (
          <g>
            <rect x="22" y="34" width="56" height="82" rx="6" stroke={c} strokeWidth="2" fill="rgba(15, 23, 42, 0.75)" />
            <path d="M24 75 Q37 55 50 75 T76 75" stroke="#fff" strokeWidth="2" fill="none" />
            <path d="M24 75 Q37 95 50 75 T76 75" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
            <line x1="50" y1="36" x2="50" y2="114" stroke={c} strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
            <circle cx="50" cy="75" r="4" fill="#fff" />
          </g>
        );

      case 'tachyon_siphon': // Sifone Tachionico (Rara)
        return (
          <g>
            <polygon points="20,35 80,35 56,80 56,115 44,115 44,80" stroke={c} strokeWidth="2.5" fill={`${c}20`} />
            <ellipse cx="50" cy="35" rx="30" ry="8" stroke="#fff" strokeWidth="1.5" />
            <line x1="50" y1="35" x2="50" y2="115" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="50" cy="115" r="4" fill={c} />
            <circle cx="50" cy="80" r="3" fill="#fff" />
          </g>
        );

      case 'temporal_singularity': // Singolarità Temporale (Super Rara)
        return (
          <g>
            <circle cx="50" cy="75" r="32" stroke={c} strokeWidth="1.5" strokeDasharray="4 3" />
            <ellipse cx="50" cy="75" rx="32" ry="12" transform="rotate(-30 50 75)" stroke="#fff" strokeWidth="1.5" />
            <ellipse cx="50" cy="75" rx="32" ry="12" transform="rotate(60 50 75)" stroke={c} strokeWidth="1.5" />
            <circle cx="50" cy="75" r="12" fill="#020617" stroke="#fff" strokeWidth="2" />
            <line x1="50" y1="75" x2="50" y2="67" stroke={c} strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="75" x2="56" y2="75" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        );

      case 'entropic_filter': // Filtro Entropico (Leggendaria)
        return (
          <g>
            <rect x="24" y="38" width="52" height="74" rx="4" stroke={c} strokeWidth="2" fill="rgba(15, 23, 42, 0.85)" />
            {[48, 58, 68, 78, 88, 98].map((y, idx) => (
              <line key={idx} x1="26" y1={y} x2="74" y2={y} stroke={idx % 2 === 0 ? '#fff' : c} strokeWidth="1.2" strokeDasharray="4 2" />
            ))}
            <polygon points="50,26 62,38 38,38" fill={c} />
            <polygon points="50,124 62,112 38,112" fill={c} />
            <circle cx="50" cy="75" r="6" fill="#fff" />
          </g>
        );

      // ----------------------------------------------------------------------
      // 4. MATRICE OTTICA
      // ----------------------------------------------------------------------
      case 'resonance_lock': // Fissatore di Risonanza (Comune)
        return (
          <g>
            <polygon points="50,42 78,98 22,98" stroke={c} strokeWidth="2.5" fill={`${c}20`} />
            <line x1="12" y1="75" x2="88" y2="75" stroke="#fff" strokeWidth="2" />
            <circle cx="50" cy="79" r="6" fill="#facc15" stroke="#fff" strokeWidth="1.5" />
            <line x1="50" y1="30" x2="50" y2="42" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <line x1="22" y1="108" x2="28" y2="98" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <line x1="78" y1="108" x2="72" y2="98" stroke={c} strokeWidth="3" strokeLinecap="round" />
          </g>
        );

      case 'suit_catalyst': // Catalizzatore di Semi (Rara)
        return (
          <g>
            <circle cx="50" cy="75" r="30" stroke={c} strokeWidth="2" strokeDasharray="5 3" />
            <line x1="50" y1="35" x2="50" y2="115" stroke="#fff" strokeWidth="1.5" />
            <line x1="15" y1="75" x2="85" y2="75" stroke="#fff" strokeWidth="1.5" />
            <circle cx="50" cy="45" r="4" fill="#f43f5e" />
            <circle cx="75" cy="75" r="4" fill="#00f2fe" />
            <circle cx="50" cy="105" r="4" fill="#10b981" />
            <circle cx="25" cy="75" r="4" fill="#c084fc" />
            <circle cx="50" cy="75" r="8" fill="#facc15" stroke="#fff" strokeWidth="1.5" />
          </g>
        );

      case 'holographic_prism': // Prisma Olografico (Super Rara)
        return (
          <g>
            <polygon points="50,30 80,50 80,95 50,115 20,95 20,50" stroke={c} strokeWidth="2.5" fill="none" />
            <polygon points="50,45 70,60 70,85 50,100 30,85 30,60" stroke="#fff" strokeWidth="1.5" fill={`${c}30`} />
            <line x1="50" y1="30" x2="50" y2="45" stroke={c} strokeWidth="1.5" />
            <line x1="80" y1="50" x2="70" y2="60" stroke={c} strokeWidth="1.5" />
            <line x1="80" y1="95" x2="70" y2="85" stroke={c} strokeWidth="1.5" />
            <line x1="50" y1="115" x2="50" y2="100" stroke={c} strokeWidth="1.5" />
            <line x1="20" y1="95" x2="30" y2="85" stroke={c} strokeWidth="1.5" />
            <line x1="20" y1="50" x2="30" y2="60" stroke={c} strokeWidth="1.5" />
            <circle cx="50" cy="72" r="5" fill="#fff" />
          </g>
        );

      case 'spectral_multiplier': // Moltiplicatore Spettrale (Leggendaria)
        return (
          <g>
            <line x1="50" y1="28" x2="50" y2="58" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <polygon points="34,60 66,60 50,78" fill={`${c}40`} stroke={c} strokeWidth="2" />
            <line x1="50" y1="78" x2="26" y2="120" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="78" x2="42" y2="122" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="78" x2="58" y2="122" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="78" x2="74" y2="120" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="78" r="4" fill="#fff" />
          </g>
        );

      // ----------------------------------------------------------------------
      // 5. PRISMA & OPERATORI
      // ----------------------------------------------------------------------
      case 'sign_inverter': // Invertitore di Segno (Comune)
        return (
          <g>
            <circle cx="50" cy="75" r="34" stroke={c} strokeWidth="2" fill="rgba(15, 23, 42, 0.75)" />
            <rect x="34" y="71" width="32" height="8" rx="2" fill="#fff" />
            <rect x="46" y="59" width="8" height="32" rx="2" fill="#fff" />
            <path d="M22 45 L32 35 M78 45 L68 35 M22 105 L32 115 M78 105 L68 115" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="75" r="2" fill={c} />
          </g>
        );

      case 'quantum_polarizer': // Polarizzatore Quantico (Rara)
        return (
          <g>
            <rect x="25" y="35" width="50" height="80" rx="6" stroke={c} strokeWidth="2" fill="none" />
            <line x1="37" y1="38" x2="37" y2="112" stroke="#fff" strokeWidth="2" />
            <line x1="50" y1="38" x2="50" y2="112" stroke={c} strokeWidth="2.5" />
            <line x1="63" y1="38" x2="63" y2="112" stroke="#fff" strokeWidth="2" />
            <ellipse cx="50" cy="75" rx="36" ry="14" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 2" />
            <circle cx="50" cy="75" r="4" fill="#fff" />
          </g>
        );

      case 'algebraic_refraction': // Rifrazione Algebrica (Super Rara)
        return (
          <g>
            <path d="M26 35 C42 55 42 95 26 115 L74 115 C58 95 58 55 74 35 Z" stroke={c} strokeWidth="2" fill={`${c}20`} />
            <line x1="16" y1="50" x2="84" y2="50" stroke="#fff" strokeWidth="1.2" strokeDasharray="3 3" />
            <line x1="16" y1="75" x2="84" y2="75" stroke="#fff" strokeWidth="1.5" />
            <line x1="16" y1="100" x2="84" y2="100" stroke="#fff" strokeWidth="1.2" strokeDasharray="3 3" />
            <circle cx="50" cy="75" r="6" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
          </g>
        );

      case 'entropic_refraction': // Scudo a Rifrazione Entropica (Capsula 90)
        return (
          <g>
            <circle cx="50" cy="75" r="34" stroke={c} strokeWidth="2.5" strokeDasharray="6 3" />
            <polygon points="50,42 76,60 76,90 50,108 24,90 24,60" stroke="#fff" strokeWidth="2" fill={`${c}30`} />
            <path d="M36 68 L50 82 L64 68" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="50" cy="75" r="5" fill="#ffffff" />
          </g>
        );

      case 'harmonic_matrix': // Matrice Armonica (Leggendaria)
      default:
        return (
          <g>
            <polygon points="50,32 78,48 78,82 50,98 22,82 22,48" stroke={c} strokeWidth="2.5" fill="none" />
            <polygon points="50,44 68,56 68,76 50,86 32,76 32,56" stroke="#fff" strokeWidth="1.5" fill={`${c}25`} />
            <circle cx="50" cy="58" r="3" fill="#fff" />
            <line x1="38" y1="68" x2="62" y2="68" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="78" r="3" fill="#fff" />
          </g>
        );
    }
  };

  // 3. Render Fallback completo SVG (con grafica differenziata per Dorso e Fronte)
  return (
    <div
      className={className}
      style={{
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 14px ${color}55, inset 0 0 10px rgba(0,0,0,0.85)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 150"
        fill="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          <linearGradient id={`bgGrad_terrain_${cardId}_${isBack ? 'back' : 'front'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#020617" />
            <stop offset="100%" stopColor={`${color}33`} />
          </linearGradient>
          <radialGradient id={`coreGlow_terrain_${cardId}_${isBack ? 'back' : 'front'}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={`${color}35`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="150" rx="6" fill={`url(#bgGrad_terrain_${cardId}_${isBack ? 'back' : 'front'})`} />
        <rect x="0" y="0" width="100" height="150" rx="6" fill={`url(#coreGlow_terrain_${cardId}_${isBack ? 'back' : 'front'})`} />

        <rect x="4" y="4" width="92" height="142" rx="4" stroke={color} strokeWidth="1.5" opacity="0.85" />
        <rect x="7" y="7" width="86" height="136" rx="2" stroke={`${color}44`} strokeWidth="0.8" strokeDasharray="3 2" />

        <polygon points="4,12 12,4 4,4" fill={color} />
        <polygon points="96,12 88,4 96,4" fill={color} />
        <polygon points="4,138 12,146 4,146" fill={color} />
        <polygon points="96,138 88,146 96,146" fill={color} />

        <text x="50" y="20" textAnchor="middle" fill={color} fontSize="6.5" fontWeight="900" letterSpacing="1" opacity="0.9">
          {isBack ? 'TERRAIN BACK' : 'TERRAIN PROTOCOL'}
        </text>

        {isBack ? (
          <g>
            <circle cx="50" cy="75" r="28" stroke={color} strokeWidth="2" strokeDasharray="4 2" fill="none" />
            <path d="M50 48 L66 57 V78 C66 90 50 100 50 100 C50 100 34 90 34 78 V57 Z" fill={`${color}25`} stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="50" cy="72" r="5" fill="#ffffff" />
            <line x1="50" y1="58" x2="50" y2="86" stroke={color} strokeWidth="1.5" />
            <line x1="42" y1="72" x2="58" y2="72" stroke={color} strokeWidth="1.5" />
          </g>
        ) : (
          renderTerrainArtwork(cardId, color)
        )}

        <text x="50" y="138" textAnchor="middle" fill="#ffffff" fontSize="6.2" fontWeight="800" letterSpacing="0.8" opacity="0.85">
          {isBack ? 'DEFENSE CARD' : 'DEFENSE MATRIX'}
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// 2.3 COMPONENTE ICONE VETTORIALI SCI-FI BESPOKE (SCIFIICON)
// ============================================================================
function SciFiIcon({ name, size = 18, color = 'currentColor', className = '' }) {
  const s = size;

  switch (name) {
    // 1. CREDITI ENERGETICI ⚡
    case 'credit':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill={`${color}33`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 5L7 13H12L11.5 18L17 11H12.5L13 5Z" fill={color} opacity="0.85" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );

    // 2. VITE BIO-MECCANICHE 💔
    case 'life':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill={`${color}25`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 7V17 M7 12H17" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
          <circle cx="12" cy="12" r="2.2" fill={color} />
        </svg>
      );

    // 3. POLVERE STELLARE 🌟
    case 'stardust':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,2 14.8,8.5 22,9.2 16.8,14.3 18.2,21.5 12,17.8 5.8,21.5 7.2,14.3 2,9.2 9.2,8.5" fill={`${color}30`} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
          <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.75" />
        </svg>
      );

    // 4. DIAMANTE POLIGONALE 💎
    case 'diamond':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="6,3 18,3 22,9 12,22 2,9" fill={`${color}25`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <polyline points="2,9 12,22 22,9" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
          <polyline points="6,3 12,9 18,3" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
          <line x1="12" y1="9" x2="12" y2="22" stroke="#ffffff" strokeWidth="1.2" opacity="0.85" />
          <line x1="2" y1="9" x2="22" y2="9" stroke={color} strokeWidth="1" />
        </svg>
      );

    // 5. ETERE COSMICO 🔮
    case 'ether':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={`${color}20`} />
          <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-30 12 12)" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" />
          <polygon points="12,5 17,12 12,19 7,12" fill={color} opacity="0.7" />
          <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
        </svg>
      );

    // 6. DADI QUANTICI 2D 🎲
    case 'dice':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="2" fill="rgba(2,6,23,0.75)" />
          <rect x="5" y="5" width="14" height="14" rx="2" stroke={`${color}55`} strokeWidth="0.8" strokeDasharray="2 2" />
          <circle cx="8" cy="8" r="1.5" fill={color} />
          <circle cx="16" cy="8" r="1.5" fill={color} />
          <circle cx="12" cy="12" r="1.8" fill="#ffffff" />
          <circle cx="8" cy="16" r="1.5" fill={color} />
          <circle cx="16" cy="16" r="1.5" fill={color} />
        </svg>
      );

    // 7. TROFEO / CLASSIFICA 🏆
    case 'trophy':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M6 8V4H18V8C18 11.31 15.31 14 12 14C8.69 14 6 11.31 6 8Z" fill={`${color}25`} stroke={color} strokeWidth="1.8" />
          <path d="M6 6H3C3 8.21 4.79 10 7 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 6H21C21 8.21 19.21 10 17 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="14" x2="12" y2="19" stroke={color} strokeWidth="2" />
          <line x1="7" y1="19" x2="17" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="12" cy="8.5" r="2" fill="#ffffff" />
        </svg>
      );

    // 8. CAMPAGNA STELLARE 🪐
    case 'campaign':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" fill={`${color}15`} />
          <ellipse cx="12" cy="12" rx="11" ry="3.8" transform="rotate(-28 12 12)" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="3.2" fill={color} />
          <circle cx="12" cy="12" r="1.2" fill="#ffffff" />
        </svg>
      );

    // 9. HAZARD / ALLERTA ⚠️
    case 'hazard':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M10.29 3.86L1.82 18C1.4 18.73 1.93 19.64 2.77 19.64H21.23C22.07 19.64 22.6 18.73 22.18 18L13.71 3.86C13.29 3.13 12.23 3.13 11.81 3.86L10.29 3.86Z" fill={`${color}25`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="12" y1="9" x2="12" y2="13.5" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.2" fill="#ffffff" />
        </svg>
      );

    // 10. SCUDO DIFENSIVO 🛡️
    case 'shield':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11.5V5.5L12 2Z" fill={`${color}20`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 11.5L11 13.5L15 9.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // 11. MODULO TATTICO / SLOT 🎛️
    case 'tactical_slot':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="4" stroke={color} strokeWidth="1.8" fill={`${color}15`} />
          <line x1="12" y1="7" x2="12" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="7" y1="12" x2="17" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );

    // 12. MAZZO DI CARTE 🃏
    case 'deck_stack':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <rect x="8" y="3" width="12" height="16" rx="2" stroke={`${color}66`} strokeWidth="1.4" fill="rgba(15,23,42,0.6)" />
          <rect x="4" y="6" width="12" height="16" rx="2" stroke={color} strokeWidth="1.8" fill={`${color}25`} />
          <line x1="7" y1="11" x2="13" y2="11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="7" y1="15" x2="13" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // 13. MANUFATTO EPICO ⭐
    case 'epic_item':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,2 15,8.5 22,12 15,15.5 12,22 9,15.5 2,12 9,8.5" fill={`${color}30`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="3.2" fill="#ffffff" />
          <circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="0.8" strokeDasharray="2 2" />
        </svg>
      );

    // 14. VOLTA CELESTE / SFONDI 🌌
    case 'environments':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" fill={`${color}15`} />
          <ellipse cx="12" cy="12" rx="4.5" ry="9" stroke={color} strokeWidth="1.4" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" />
        </svg>
      );

    // 15. ESTRATTORE D'ETERE 🛢️
    case 'extractor':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M7 3H17V7H7V3Z" fill={`${color}35`} stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 7V16L12 21L16 16V7" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="rgba(2,6,23,0.6)" />
          <line x1="10" y1="11" x2="14" y2="11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="15" r="2" fill={color} />
        </svg>
      );

    // 16. NEGOZIO GALATTICO 🛒
    case 'shop_cart':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M2 3H5L7.5 15H18L21 6H6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill={`${color}15`} />
          <circle cx="9" cy="19.5" r="1.8" fill={color} />
          <circle cx="16.5" cy="19.5" r="1.8" fill={color} />
          <line x1="10" y1="10.5" x2="15" y2="10.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    // 17. REGOLE / DATABASE 📜
    case 'database':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <ellipse cx="12" cy="5" rx="8" ry="3" fill={`${color}30`} stroke={color} strokeWidth="1.6" />
          <path d="M20 5V12C20 13.66 16.42 15 12 15C7.58 15 4 13.66 4 12V5" stroke={color} strokeWidth="1.6" />
          <path d="M20 12V19C20 20.66 16.42 22 12 22C7.58 22 4 20.66 4 19V12" stroke={color} strokeWidth="1.6" />
          <line x1="12" y1="8" x2="12" y2="19" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" opacity="0.75" />
        </svg>
      );

    // 18. IMPOSTAZIONI ⚙️
    case 'settings':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth="2" fill="rgba(2,6,23,0.8)" />
          <path d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 1 1 10.08 21V20.91A1.65 1.65 0 0 0 9.08 19.4A1.65 1.65 0 0 0 7.26 19.73L7.2 19.79A2 2 0 1 1 4.37 16.96L4.43 16.9A1.65 1.65 0 0 0 4.76 15.08A1.65 1.65 0 0 0 3.25 14.08H3.16A2 2 0 1 1 3.16 10.08H3.25A1.65 1.65 0 0 0 4.76 9.08A1.65 1.65 0 0 0 4.43 7.26L4.37 7.2A2 2 0 1 1 7.2 4.37L7.26 4.43A1.65 1.65 0 0 0 9.08 4.76A1.65 1.65 0 0 0 10.08 3.25V3.16A2 2 0 1 1 14.08 3.16V3.25A1.65 1.65 0 0 0 15.08 4.76A1.65 1.65 0 0 0 16.9 4.43L16.96 4.37A2 2 0 1 1 19.79 7.2L19.73 7.26A1.65 1.65 0 0 0 19.4 9.08A1.65 1.65 0 0 0 20.91 10.08H21A2 2 0 1 1 21 14.08H20.91A1.65 1.65 0 0 0 19.4 15Z" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );

    // 19. RITIRATA / USCITA 🚪
    case 'exit':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M9 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="16,17 21,12 16,7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // 20. CATEGORIE BANCO TERRENO (5 CATEGORIE)
    case 'terrain_cryo':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 2V22M2 12H22M4.93 4.93L19.07 19.07M4.93 19.07L19.07 4.93" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill={color} opacity="0.4" />
        </svg>
      );

    case 'terrain_gravity':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 8V12C5 15.86 8.13 19 12 19C15.87 19 19 15.86 19 12V8" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M3 8H7M17 8H21" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
        </svg>
      );

    case 'terrain_tachyon':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <polyline points="12,6 12,12 16,14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'terrain_optical':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,2 15,9 22,12 15,15 12,22 9,15 2,12 9,9" fill={`${color}33`} stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" />
        </svg>
      );

    case 'terrain_prism':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,3 22,20 2,20" stroke={color} strokeWidth="2" fill={`${color}25`} strokeLinejoin="round" />
          <line x1="12" y1="3" x2="12" y2="20" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" />
        </svg>
      );

    default:
      return null;
  }
}

// ============================================================================
// 1.17 COMPONENTE VETTORIALE PER TUTTI I MODULI TATTICI (MODULEICON)
// ============================================================================
function ModuleIcon({ id, size = 18, color = '#00f2fe', className = '' }) {
  const s = size;

  switch (id) {
    // --- MODULI ZODIACO ---
    case 'aries':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 21V10C12 7 8 6 6 8.5C4.5 10.5 5.5 13 7.5 12.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 21V10C12 7 16 6 18 8.5C19.5 10.5 18.5 13 16.5 12.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <polygon points="12,3 10,7 14,7" fill={color} />
        </svg>
      );
    case 'taurus':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="14" r="5" stroke={color} strokeWidth="2" fill="rgba(16,185,129,0.2)" />
          <path d="M6 7C8 11 16 11 18 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="14" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'gemini':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 6C10 4 14 4 19 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M5 18C10 20 14 20 19 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="5.5" x2="9" y2="18.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1="5.5" x2="15" y2="18.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'cancer':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="8" cy="10" r="3" stroke={color} strokeWidth="1.5" fill="rgba(6,182,212,0.2)" />
          <path d="M11 10C15 8 18 10 18 13C18 15 16 16 14 15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="16" cy="14" r="3" stroke={color} strokeWidth="1.5" fill="rgba(6,182,212,0.2)" />
          <path d="M13 14C9 16 6 14 6 11C6 9 8 8 10 8.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'leo':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="7" cy="15" r="2.5" stroke={color} strokeWidth="1.8" fill="rgba(245,158,11,0.2)" />
          <path d="M9 13C10 9 12 5 15 5C18 5 19 8 17 12C15 15 16 19 19 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="19" cy="19" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'virgo':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M26 50 V95 M40 50 V95 M54 50 V95 C54 95 62 106 72 96 C80 88 64 72 64 72 L78 106" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="6" y1="8" x2="10" y2="8" stroke={color} strokeWidth="1.5" />
          <line x1="10" y1="8" x2="14" y2="8" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'libra':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <line x1="4" y1="19" x2="20" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 14H8C8 10 16 10 16 14H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="9" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'scorpio':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 7V17 M10 7V17 M15 7V17C15 17 18 19 20 17L21 18" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="5" y1="8" x2="10" y2="8" stroke={color} strokeWidth="1.5" />
          <line x1="10" y1="8" x2="15" y2="8" stroke={color} strokeWidth="1.5" />
          <polygon points="21,15 22,19 18,18" fill={color} />
        </svg>
      );
    case 'sagittarius':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <line x1="5" y1="19" x2="19" y2="5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M12 5H19V12" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <line x1="7" y1="12" x2="12" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'capricorn':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M5 8L8 16L12 8V16C12 19 16 20 18 17C19 15 17 13 15 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="15" cy="14" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'aquarius':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M4 9L7 6L10 9L13 6L16 9L19 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 15L7 12L10 15L13 12L16 15L19 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'pisces':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M7 5C4 10 4 14 7 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M17 5C20 10 20 14 17 19" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // --- MODULI PLANETARI (P1 - P20) ---
    case 'planet_char_1': // Terra
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8" fill="rgba(56,189,248,0.2)" />
          <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-25 12 12)" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" />
        </svg>
      );
    case 'planet_char_2': // Marte
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="10.5" cy="13.5" r="6" stroke={color} strokeWidth="1.8" fill="rgba(244,63,94,0.2)" />
          <line x1="14.5" y1="9.5" x2="19.5" y2="4.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M15.5 4.5H19.5V8.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'planet_char_3': // Venere
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="9" r="5.5" stroke={color} strokeWidth="1.8" fill="rgba(139,92,246,0.2)" />
          <line x1="12" y1="14.5" x2="12" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="8.5" y1="18" x2="15.5" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'planet_char_4': // Mercurio
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M8 4C10 6 14 6 16 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="10" r="4.5" stroke={color} strokeWidth="1.8" />
          <line x1="12" y1="14.5" x2="12" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="9" y1="17.5" x2="15" y2="17.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'planet_char_5': // Giove
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.8" fill="rgba(16,185,129,0.2)" />
          <ellipse cx="14" cy="14" rx="2.5" ry="1.5" fill="#ef4444" />
          <line x1="4" y1="10" x2="20" y2="10" stroke={color} strokeWidth="1" opacity="0.6" />
        </svg>
      );
    case 'planet_char_6': // Saturno
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="5" fill="rgba(245,158,11,0.25)" stroke={color} strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-20 12 12)" stroke={color} strokeWidth="1.8" />
        </svg>
      );
    case 'planet_char_7': // Urano
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" fill="rgba(6,182,212,0.2)" />
          <ellipse cx="12" cy="12" rx="2.5" ry="9.5" stroke={color} strokeWidth="1.8" />
        </svg>
      );
    case 'planet_char_8': // Nettuno
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.5" fill="rgba(132,204,22,0.2)" />
          <path d="M12 4V20 M7 8L12 4L17 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'planet_char_9': // Plutone
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="10" cy="11" r="5" stroke={color} strokeWidth="1.5" fill="rgba(56,189,248,0.2)" />
          <circle cx="17" cy="16" r="2.5" stroke="#ffffff" strokeWidth="1.2" />
        </svg>
      );
    case 'planet_char_10': // Titano
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1.8" fill="rgba(250,204,21,0.2)" />
          <path d="M6 12Q10 9 14 13Q18 17 20 12" stroke="#ffffff" strokeWidth="1.2" fill="none" />
        </svg>
      );
    case 'planet_char_11': // Europa
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.8" />
          <line x1="7" y1="9" x2="17" y2="15" stroke="#ffffff" strokeWidth="1.2" />
          <line x1="6" y1="14" x2="16" y2="10" stroke="#ffffff" strokeWidth="1.2" />
        </svg>
      );
    case 'planet_char_12': // Ganimede
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="rgba(239,68,68,0.2)" />
          <polygon points="12,6 17,12 12,18 7,12" stroke="#ffffff" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'planet_char_13': // Kepler-186f
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="8" cy="9" r="4" stroke="#ef4444" strokeWidth="1.5" />
          <circle cx="15" cy="15" r="5" stroke={color} strokeWidth="1.8" />
          <line x1="8" y1="9" x2="15" y2="15" stroke={color} strokeWidth="1" strokeDasharray="2 1" />
        </svg>
      );
    case 'planet_char_14': // Proxima b
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.8" />
          <path d="M12 5C16 5 16 19 12 19Z" fill={color} opacity="0.4" />
          <line x1="12" y1="4" x2="12" y2="20" stroke="#ffffff" strokeWidth="1.2" />
        </svg>
      );
    case 'planet_char_15': // TRAPPIST-1e
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="3" fill="#ffffff" />
          <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1" opacity="0.6" strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1" opacity="0.4" />
          <circle cx="18" cy="9" r="1.5" fill={color} />
        </svg>
      );
    case 'planet_char_16': // Gliese 581g
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke={color} strokeWidth="1.5" />
          <polygon points="12,5 19,17 5,17" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" fill="none" />
          <circle cx="12" cy="5" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'planet_char_17': // Haumea
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <ellipse cx="12" cy="12" rx="9" ry="4.5" transform="rotate(-30 12 12)" stroke={color} strokeWidth="2" fill="rgba(132,204,22,0.2)" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );
    case 'planet_char_18': // Eris
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(50 12 12)" stroke={color} strokeWidth="1.5" />
        </svg>
      );
    case 'planet_char_19': // Io
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.25)" />
          <circle cx="9" cy="10" r="1.5" fill="#facc15" />
          <circle cx="15" cy="14" r="1.8" fill="#facc15" />
        </svg>
      );
    case 'planet_char_20': // Encelado
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="2" fill="rgba(6,182,212,0.2)" />
          <path d="M8 16Q12 10 16 16" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="12" cy="8" r="1.5" fill="#ffffff" />
        </svg>
      );

    // --- MODULI ESCLUSIVI ROTTA DELLE CAPSULE ---
    case 'singularity_core': // Modulo Singolarità (Buco Nero - Capsula 210 ⭐)
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="4" fill="#000000" stroke="#facc15" strokeWidth="1.8" />
          <ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(-30 12 12)" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );

    case 'ophiuchus': // Il Serpentario (Capsula 390 ⭐)
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 3V21 M8 7C14 7 14 11 10 13C6 15 6 19 12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="4" r="1.5" fill="#facc15" />
        </svg>
      );

    case 'supreme_eclipse': // Eclissi Suprema (Capsula Finale 600 ⭐)
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" fill="#020617" stroke="#facc15" strokeWidth="2" />
          <circle cx="14" cy="10" r="5.5" fill="#facc15" opacity="0.35" />
          <line x1="12" y1="2" x2="12" y2="4" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="20" x2="12" y2="22" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="2" y1="12" x2="4" y2="12" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="12" x2="22" y2="12" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill="#ffffff" />
        </svg>
      );

    // Default / Starter
    case 'neutral_starter':
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className}>
          <polygon points="12,3 21,12 12,21 3,12" stroke={color} strokeWidth="1.8" fill="rgba(148,163,184,0.2)" />
          <circle cx="12" cy="12" r="2.5" fill="#ffffff" />
        </svg>
      );
  }
}

// ============================================================================
// 2.5 COMPONENTE TACTICALVISUAL (ARTE VETTORIALE PER 33 MAZZI & 10 OGGETTI EPICI)
// ============================================================================
function TacticalVisual({ 
  id, 
  type = 'card_back', 
  color = '#00f2fe', 
  glowColor = 'rgba(0, 242, 254, 0.65)', 
  width = 64, 
  height = 96 
}) {
  const w = width, h = height;

  // 1. RENDERING VETTORIALE DEI 10 OGGETTI EPICI
  if (type === 'epic_item') {
    switch (id) {
      case 'epic_item_1': // Anello Bifasico di Möbius
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="mobiusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id="glowMobius">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <path
              d="M30 35 C15 35 15 65 30 65 C45 65 55 35 70 35 C85 35 85 65 70 65 C55 65 45 35 30 35 Z"
              stroke="url(#mobiusGrad)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
              filter="url(#glowMobius)"
            />
            <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
          </svg>
        );

      case 'epic_item_2': // Forcella a Risoluzione Neutonica
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <defs>
              <linearGradient id="forkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <path d="M50 90 V55 M32 20 V50 C32 62 68 62 68 50 V20" stroke="url(#forkGrad)" strokeWidth="6" strokeLinecap="round" />
            <path d="M35 32 L48 38 L42 45 L65 35" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="32" cy="20" r="4.5" fill="#facc15" />
            <circle cx="68" cy="20" r="4.5" fill="#facc15" />
          </svg>
        );

      case 'epic_item_3': // Astrolabio a Coordinate Libere
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="38" stroke="#10b981" strokeWidth="4" />
            <ellipse cx="50" cy="50" rx="36" ry="18" transform="rotate(-30 50 50)" stroke="#34d399" strokeWidth="3" strokeDasharray="6 3" />
            <ellipse cx="50" cy="50" rx="36" ry="18" transform="rotate(45 50 50)" stroke="#6ee7b7" strokeWidth="3" />
            <path d="M50 10 V90 M10 50 H90" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="3 3" />
            <circle cx="50" cy="50" r="5" fill="#facc15" />
          </svg>
        );

      case 'epic_item_4': // Stele d'Ombra Assoluta
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <path d="M36 88 L42 16 L58 16 L64 88 Z" fill="rgba(15, 23, 42, 0.95)" stroke="#38bdf8" strokeWidth="4" strokeLinejoin="round" />
            <path d="M50 20 V84 M44 35 H56 M43 55 H57 M45 72 H55" stroke="#00f2fe" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="20" r="3" fill="#ffffff" />
          </svg>
        );

      case 'epic_item_5': // Pistone a Impulso Gravimetrico
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <rect x="34" y="44" width="32" height="46" rx="4" fill="rgba(69, 10, 10, 0.85)" stroke="#ef4444" strokeWidth="4" />
            <rect x="44" y="12" width="12" height="32" fill="#fca5a5" stroke="#b91c1c" strokeWidth="2.5" />
            <path d="M38 52 H62 M38 64 H62 M38 76 H62" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="12" r="5" fill="#facc15" />
          </svg>
        );

      case 'epic_item_6': // Pendolo a Inversione d'Entropia
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="16" r="6" fill="#c084fc" />
            <path d="M50 22 L38 68" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
            <circle cx="34" cy="74" r="16" fill="rgba(147, 51, 234, 0.6)" stroke="#f5d0fe" strokeWidth="3.5" />
            <circle cx="34" cy="74" r="7" fill="#ffffff" />
          </svg>
        );

      case 'epic_item_7': // Monolite a Specchi Dielettrici
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <polygon points="50,15 85,82 15,82" fill="rgba(20, 184, 166, 0.3)" stroke="#14b8a6" strokeWidth="4" strokeLinejoin="round" />
            <path d="M10 50 L50 48 L90 25 M50 48 L90 65" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="48" r="4" fill="#ffffff" />
          </svg>
        );

      case 'epic_item_8': // Calice di Drenaggio a Vortice
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <path d="M30 18 H70 C70 45 58 60 50 62 C42 60 30 45 30 18 Z" fill="rgba(217, 70, 239, 0.3)" stroke="#d946ef" strokeWidth="4" />
            <path d="M50 62 V84 M35 88 H65" stroke="#f0abfc" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="50" cy="34" rx="14" ry="7" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="4 2" />
          </svg>
        );

      case 'epic_item_9': // Matrice Poliedrica di Probabilità
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <polygon points="50,12 86,34 86,72 50,92 14,72 14,34" fill="rgba(132, 204, 22, 0.25)" stroke="#84cc16" strokeWidth="3.5" />
            <polygon points="50,32 74,68 26,68" stroke="#bef264" strokeWidth="2.5" />
            <path d="M50 12 L50 32 M86 34 L74 68 M86 72 L74 68 M50 92 L50 68 M14 72 L26 68 M14 34 L26 68 M50 32 L86 34 M50 32 L14 34" stroke="#84cc16" strokeWidth="1.8" />
            <circle cx="50" cy="32" r="3" fill="#ffffff" />
            <circle cx="74" cy="68" r="3" fill="#ffffff" />
            <circle cx="26" cy="68" r="3" fill="#ffffff" />
          </svg>
        );

      case 'epic_item_10': // Nucleo a Singolarità Compressa
      default:
        return (
          <svg width={w} height={h} viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="22" fill="#02040a" stroke="#facc15" strokeWidth="4" />
            <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-25 50 50)" stroke="#fde047" strokeWidth="3" strokeDasharray="8 4" />
            <circle cx="50" cy="50" r="10" fill="#ffffff" filter="drop-shadow(0 0 8px #facc15)" />
          </svg>
        );
    }
  }

  // 2. RENDERING VETTORIALE A TUTTO DORSO PER I 33 MAZZI
  const renderDeckBackArt = (deckId, c) => {
    switch (deckId) {
      case 'neutral_starter':
        return (
          <g>
            <rect x="20" y="35" width="60" height="80" rx="6" stroke="#00f2fe" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75" />
            <polygon points="50,38 82,75 50,112 18,75" stroke="#38bdf8" strokeWidth="2.5" fill="rgba(0, 242, 254, 0.12)" />
            <circle cx="50" cy="75" r="14" stroke="#00f2fe" strokeWidth="1.8" fill="rgba(15, 23, 42, 0.85)" />
            <line x1="25" y1="75" x2="75" y2="75" stroke="#38bdf8" strokeWidth="1.2" opacity="0.6" />
            <line x1="50" y1="50" x2="50" y2="100" stroke="#38bdf8" strokeWidth="1.2" opacity="0.6" />
            <polygon points="50,67 52,73 58,75 52,77 50,83 48,77 42,75 48,73" fill="#fde047" />
            <circle cx="50" cy="75" r="2.5" fill="#ffffff" />
          </g>
        );

      case 'aries': // Ariete
        return (
          <g>
            <circle cx="50" cy="75" r="34" stroke={c} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <path d="M50 112 V62 C50 48 32 44 26 58 C22 68 28 80 38 78" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M50 112 V62 C50 48 68 44 74 58 C78 68 72 80 62 78" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <polygon points="50,38 44,52 56,52" fill="#ffffff" />
            <circle cx="50" cy="75" r="4" fill={c} />
          </g>
        );

      case 'taurus': // Toro
        return (
          <g>
            <circle cx="50" cy="85" r="20" stroke={c} strokeWidth="4" fill={`${c}15`} />
            <path d="M25 45 C32 65 68 65 75 45" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="85" r="6" fill="#ffffff" />
            <line x1="50" y1="30" x2="50" y2="45" stroke={c} strokeWidth="2" strokeDasharray="2 2" />
            <circle cx="50" cy="75" r="38" stroke={c} strokeWidth="1" opacity="0.35" />
          </g>
        );

      case 'gemini': // Gemelli
        return (
          <g>
            <path d="M22 45 C40 38 60 38 78 45" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M22 105 C40 112 60 112 78 105" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <line x1="38" y1="44" x2="38" y2="106" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="62" y1="44" x2="62" y2="106" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
            <ellipse cx="50" cy="75" rx="28" ry="12" stroke={c} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <circle cx="50" cy="75" r="3" fill="#ffffff" />
          </g>
        );

      case 'cancer': // Cancro
        return (
          <g>
            <circle cx="36" cy="62" r="10" stroke={c} strokeWidth="3.5" fill={`${c}20`} />
            <path d="M46 62 C58 52 76 60 76 74 C76 84 66 90 56 88" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="64" cy="88" r="10" stroke={c} strokeWidth="3.5" fill={`${c}20`} />
            <path d="M54 88 C42 98 24 90 24 76 C24 66 34 60 44 62" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1" strokeDasharray="5 3" opacity="0.4" />
          </g>
        );

      case 'leo': // Leone
        return (
          <g>
            <circle cx="34" cy="84" r="9" stroke={c} strokeWidth="3.5" fill={`${c}20`} />
            <path d="M41 78 C42 62 48 42 64 42 C76 42 80 54 74 68 C68 82 72 96 82 98" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="82" cy="98" r="4" fill="#ffffff" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
            <polygon points="50,26 53,34 50,42 47,34" fill={c} />
          </g>
        );

      case 'virgo': // Vergine
        return (
          <g>
            <path d="M26 50 V95 M40 50 V95 M54 50 V95 C54 95 62 106 72 96 C80 88 64 72 64 72 L78 106" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="26" y1="52" x2="40" y2="52" stroke={c} strokeWidth="3" />
            <line x1="40" y1="52" x2="54" y2="52" stroke={c} strokeWidth="3" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1" opacity="0.4" />
            <polygon points="50,30 52,36 50,42 48,36" fill="#ffffff" />
          </g>
        );

      case 'libra': // Bilancia
        return (
          <g>
            <line x1="20" y1="98" x2="80" y2="98" stroke={c} strokeWidth="4" strokeLinecap="round" />
            <path d="M20 74 H36 C36 62 64 62 64 74 H80" stroke={c} strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="54" r="14" stroke={c} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <circle cx="50" cy="54" r="3" fill="#ffffff" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1" opacity="0.35" />
          </g>
        );

      case 'scorpio': // Scorpione
        return (
          <g>
            <path d="M22 52 V94 M38 52 V94 M54 52 V94 C54 94 66 104 74 94 L82 98" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <line x1="22" y1="54" x2="38" y2="54" stroke={c} strokeWidth="3" />
            <line x1="38" y1="54" x2="54" y2="54" stroke={c} strokeWidth="3" />
            <polygon points="84,94 88,104 78,102" fill={c} />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          </g>
        );

      case 'sagittarius': // Sagittario
        return (
          <g>
            <line x1="26" y1="112" x2="76" y2="38" stroke={c} strokeWidth="4.5" strokeLinecap="round" />
            <path d="M52 36 H78 V62" stroke={c} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="32" y1="84" x2="56" y2="108" stroke={c} strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
            <circle cx="76" cy="38" r="3" fill="#ffffff" />
          </g>
        );

      case 'capricorn': // Capricorno
        return (
          <g>
            <path d="M26 50 L38 90 L52 50 V94 C52 108 68 114 74 100 C78 90 68 80 58 84" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="58" cy="84" r="5" stroke={c} strokeWidth="2.5" fill="#ffffff" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1" opacity="0.4" />
          </g>
        );

      case 'aquarius': // Acquario
        return (
          <g>
            <path d="M20 64 L30 54 L40 64 L50 54 L60 64 L70 54 L80 64" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M20 86 L30 76 L40 86 L50 76 L60 86 L70 76 L80 86" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <ellipse cx="50" cy="70" rx="36" ry="32" stroke={c} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            <circle cx="50" cy="70" r="3" fill="#ffffff" />
          </g>
        );

      case 'pisces': // Pesci
        return (
          <g>
            <path d="M34 40 C22 62 22 88 34 110" stroke={c} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M66 40 C78 62 78 88 66 110" stroke={c} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <line x1="20" y1="75" x2="80" y2="75" stroke={c} strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="75" r="36" stroke={c} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
            <circle cx="50" cy="75" r="4" fill="#ffffff" />
          </g>
        );

      // --- I 20 PIANETI DELLA CAMPAGNA ---
      case 'planet_char_1': // P1 Terra (Gaia)
        return (
          <g>
            <circle cx="50" cy="75" r="24" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <ellipse cx="50" cy="75" rx="36" ry="12" transform="rotate(-25 50 75)" stroke={c} strokeWidth="1.5" strokeDasharray="4 2" />
            <path d="M42 64 Q50 68 54 62 Q62 66 58 78 Q48 86 40 80 Z" fill={c} opacity="0.4" />
            <circle cx="50" cy="75" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_2': // P2 Marte (Tharsis)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <circle cx="50" cy="75" r="7" stroke="#ffffff" strokeWidth="1.5" />
            <line x1="64" y1="61" x2="84" y2="41" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M72 41 H84 V53" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="28" cy="92" r="3" fill={c} />
            <circle cx="78" cy="98" r="2" fill={c} />
          </g>
        );

      case 'planet_char_3': // P3 Venere (Afrodite)
        return (
          <g>
            <circle cx="50" cy="62" r="20" stroke={c} strokeWidth="3.5" fill={`${c}15`} />
            <line x1="50" y1="82" x2="50" y2="110" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
            <line x1="36" y1="96" x2="64" y2="96" stroke={c} strokeWidth="3.5" strokeLinecap="round" />
            <ellipse cx="50" cy="62" rx="14" ry="7" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" />
          </g>
        );

      case 'planet_char_4': // P4 Mercurio (Termico)
        return (
          <g>
            <path d="M34 38 C42 46 58 46 66 38" stroke={c} strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="64" r="18" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <line x1="50" y1="82" x2="50" y2="108" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <line x1="38" y1="96" x2="62" y2="96" stroke={c} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="64" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_5': // P5 Giove (Occhio del Vortice)
        return (
          <g>
            <circle cx="50" cy="75" r="28" stroke={c} strokeWidth="3" fill={`${c}15`} />
            <line x1="24" y1="67" x2="76" y2="67" stroke={c} strokeWidth="1.5" />
            <line x1="22" y1="83" x2="78" y2="83" stroke={c} strokeWidth="1.5" />
            <ellipse cx="60" cy="80" rx="9" ry="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            <circle cx="50" cy="75" r="38" stroke={c} strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
          </g>
        );

      case 'planet_char_6': // P6 Saturno (Anelli di Crono)
        return (
          <g>
            <circle cx="50" cy="75" r="18" fill={`${c}25`} stroke={c} strokeWidth="2.5" />
            <ellipse cx="50" cy="75" rx="42" ry="10" transform="rotate(-20 50 75)" stroke={c} strokeWidth="3.5" />
            <ellipse cx="50" cy="75" rx="34" ry="6" transform="rotate(-20 50 75)" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
            <polygon points="50,68 54,72 50,76 46,72" fill="#ffffff" />
          </g>
        );

      case 'planet_char_7': // P7 Urano (Sentinella Ionica)
        return (
          <g>
            <circle cx="50" cy="75" r="20" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <ellipse cx="50" cy="75" rx="8" ry="38" stroke={c} strokeWidth="3" />
            <ellipse cx="50" cy="75" rx="4" ry="30" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx="50" cy="75" r="5" fill="#ffffff" />
          </g>
        );

      case 'planet_char_8': // P8 Nettuno (Leviatano)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="2.5" fill={`${c}20`} />
            <path d="M50 42 V108 M32 58 L50 42 L68 58" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="36" y1="84" x2="64" y2="84" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="50" cy="75" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_9': // P9 Plutone (Signore delle Ombre)
        return (
          <g>
            <circle cx="44" cy="72" r="16" stroke={c} strokeWidth="2.5" fill={`${c}30`} />
            <circle cx="68" cy="84" r="8" stroke={c} strokeWidth="1.8" fill="#ffffff" />
            <ellipse cx="52" cy="76" rx="34" ry="20" transform="rotate(15 52 76)" stroke={c} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <path d="M38 70 C38 64 50 64 50 72 C50 78 44 84 38 78 Z" fill="#ffffff" opacity="0.4" />
          </g>
        );

      case 'planet_char_10': // P10 Titano (Colosso di Metano)
        return (
          <g>
            <circle cx="50" cy="75" r="24" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <path d="M32 75 Q42 66 52 78 Q62 90 70 75" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="40" r="8" stroke={c} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
            <circle cx="50" cy="75" r="4" fill={c} />
          </g>
        );

      case 'planet_char_11': // P11 Europa (Idra Criogenica)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <line x1="32" y1="62" x2="68" y2="88" stroke="#ffffff" strokeWidth="1.8" />
            <line x1="30" y1="82" x2="66" y2="66" stroke="#ffffff" strokeWidth="1.8" />
            <line x1="44" y1="54" x2="56" y2="96" stroke={c} strokeWidth="1.5" />
            <circle cx="50" cy="75" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_12': // P12 Ganimede (Titano d'Acciaio)
        return (
          <g>
            <circle cx="50" cy="75" r="24" stroke={c} strokeWidth="2.5" fill={`${c}20`} />
            <ellipse cx="50" cy="75" rx="36" ry="18" stroke={c} strokeWidth="1.5" strokeDasharray="4 3" />
            <polygon points="50,56 64,75 50,94 36,75" stroke="#ffffff" strokeWidth="2" fill="none" />
            <circle cx="50" cy="75" r="3" fill="#ffffff" />
          </g>
        );

      case 'planet_char_13': // P13 Kepler-186f (Eco dei Mondi)
        return (
          <g>
            <circle cx="34" cy="62" r="14" stroke="#ef4444" strokeWidth="2" fill="rgba(239,68,68,0.2)" />
            <circle cx="64" cy="85" r="18" stroke={c} strokeWidth="2.5" fill={`${c}20`} />
            <line x1="34" y1="62" x2="64" y2="85" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="64" cy="85" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_14': // P14 Proxima b (Generatore del Caos)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <path d="M50 53 C62 53 62 97 50 97 Z" fill={c} opacity="0.4" />
            <line x1="50" y1="45" x2="50" y2="105" stroke="#ffffff" strokeWidth="2" />
            <circle cx="50" cy="75" r="3" fill="#ffffff" />
          </g>
        );

      case 'planet_char_15': // P15 TRAPPIST-1e (Arconte dei Sette)
        return (
          <g>
            <circle cx="50" cy="75" r="8" fill="#ffffff" />
            {[16, 22, 28, 34].map((rad, idx) => (
              <circle key={idx} cx="50" cy="75" r={rad} stroke={c} strokeWidth="1" opacity={0.3 + idx * 0.2} strokeDasharray="3 3" />
            ))}
            <circle cx="68" cy="63" r="3" fill={c} />
            <circle cx="30" cy="82" r="2.5" fill={c} />
          </g>
        );

      case 'planet_char_16': // P16 Gliese 581g (Custode di Lagrange)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <polygon points="50,45 76,90 24,90" stroke={c} strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            <circle cx="50" cy="45" r="3" fill="#ffffff" />
            <circle cx="76" cy="90" r="3" fill="#ffffff" />
            <circle cx="24" cy="90" r="3" fill="#ffffff" />
            <circle cx="50" cy="75" r="5" fill={c} />
          </g>
        );

      case 'planet_char_17': // P17 Haumea (Spirale Cinetica)
        return (
          <g>
            <ellipse cx="50" cy="75" rx="32" ry="15" transform="rotate(-30 50 75)" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <ellipse cx="50" cy="75" rx="42" ry="6" transform="rotate(15 50 75)" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="50" cy="75" r="4" fill="#ffffff" />
          </g>
        );

      case 'planet_char_18': // P18 Eris (Entità della Discordia)
        return (
          <g>
            <circle cx="50" cy="75" r="20" stroke={c} strokeWidth="2.5" fill={`${c}15`} />
            <ellipse cx="50" cy="75" rx="38" ry="12" transform="rotate(55 50 75)" stroke={c} strokeWidth="1.5" />
            <polygon points="50,60 54,70 65,75 54,80 50,90 46,80 35,75 46,70" fill="#ffffff" />
          </g>
        );

      case 'planet_char_19': // P19 Io (Nucleo Magmatico)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="3" fill="rgba(239, 68, 68, 0.25)" />
            <path d="M50 53 Q56 40 62 44 Q56 50 50 53" fill="#facc15" />
            <path d="M42 80 Q30 88 36 94 Q44 88 42 80" fill="#facc15" />
            <circle cx="50" cy="75" r="6" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
          </g>
        );

      case 'planet_char_20': // P20 Encelado (Sovrano del Vuoto)
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <path d="M36 86 Q50 68 64 86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M40 92 Q50 78 60 92" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="62" r="5" fill="#ffffff" filter="drop-shadow(0 0 6px #00f2fe)" />
          </g>
        );

      case 'ophiuchus': // Il Serpentario (Capsula 390 ⭐)
        return (
          <g>
            <circle cx="50" cy="75" r="32" stroke={c} strokeWidth="1.8" strokeDasharray="4 2" fill={`${c}15`} />
            <path d="M50 35 V115 M32 50 C55 50 55 68 40 76 C28 82 30 102 50 102" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="38" r="4" fill="#ffffff" />
          </g>
        );

      case 'supreme_eclipse': // Eclissi Suprema (Capsula Finale 600 ⭐)
        return (
          <g>
            <circle cx="50" cy="75" r="26" fill="#020617" stroke="#facc15" strokeWidth="3.5" />
            <circle cx="54" cy="71" r="20" fill="#facc15" opacity="0.35" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, idx) => (
              <line key={idx} x1="50" y1="40" x2="50" y2="32" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${deg} 50 75)`} />
            ))}
            <circle cx="50" cy="75" r="6" fill="#ffffff" filter="drop-shadow(0 0 10px #facc15)" />
          </g>
        );

      default:
        return (
          <g>
            <circle cx="50" cy="75" r="22" stroke={c} strokeWidth="3" fill={`${c}20`} />
            <path d="M36 86 Q50 68 64 86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M40 92 Q50 78 60 92" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="50" cy="62" r="5" fill="#ffffff" filter="drop-shadow(0 0 6px #00f2fe)" />
          </g>
        );
    }
  };

  const isStarter = id === 'neutral_starter' || !id;
  const isPlanet = typeof id === 'string' && id.startsWith('planet_char_');
  const planetNum = isPlanet ? id.replace('planet_char_', '') : '';
  const deckColor = color;
  const deckLabel = isStarter ? 'STANDARD' : (isPlanet ? `P${planetNum}` : id.toUpperCase());

  return (
    <div
      style={{
        width: `${w}px`,
        height: `${h}px`,
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 4px 14px ${glowColor}, inset 0 0 10px rgba(0,0,0,0.8)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg width={w} height={h} viewBox="0 0 100 150" fill="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id={`bgGrad_${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#020617" />
            <stop offset="100%" stopColor={`${deckColor}33`} />
          </linearGradient>
          <radialGradient id={`coreGlow_${id}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`${deckColor}44`} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* 1. Fondo Tessera */}
        <rect x="0" y="0" width="100" height="150" rx="6" fill={`url(#bgGrad_${id})`} />
        <rect x="0" y="0" width="100" height="150" rx="6" fill={`url(#coreGlow_${id})`} />
        
        {/* 2. Cornice & Angolari Tecnologici */}
        <rect x="4" y="4" width="92" height="142" rx="4" stroke={deckColor} strokeWidth="1.5" opacity="0.85" />
        <rect x="7" y="7" width="86" height="136" rx="2" stroke={`${deckColor}44`} strokeWidth="0.8" strokeDasharray="3 2" />
        
        <polygon points="4,12 12,4 4,4" fill={deckColor} />
        <polygon points="96,12 88,4 96,4" fill={deckColor} />
        <polygon points="4,138 12,146 4,146" fill={deckColor} />
        <polygon points="96,138 88,146 96,146" fill={deckColor} />

        {/* 3. Badge Superiore Identificativo */}
        <text x="50" y="20" textAnchor="middle" fill={deckColor} fontSize="7" fontWeight="900" letterSpacing="1" opacity="0.9">
          {isStarter ? 'CADET' : (isPlanet ? `PLANET ${planetNum}` : 'ZODIAC')}
        </text>

        {/* 4. Opera Vettoriale a Tutto Dorso Dedicata */}
        {renderDeckBackArt(id, deckColor)}

        {/* 5. Footer con Grado / Codename */}
        <text x="50" y="136" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="800" letterSpacing="0.8" opacity="0.85">
          {deckLabel}
        </text>
      </svg>
    </div>
  );
}

// ============================================================================
// COMPONENTE VETTORIALE DEDICATO PER LE 20 RELIQUIE (RELICVISUAL)
// ============================================================================
const RELIC_COLORS = {
  1: '#38bdf8', 2: '#f43f5e', 3: '#ca8a04', 4: '#fb923c', 5: '#ea580c',
  6: '#facc15', 7: '#06b6d4', 8: '#1d4ed8', 9: '#64748b', 10: '#b45309',
  11: '#0284c7', 12: '#475569', 13: '#14b8a6', 14: '#6366f1', 15: '#d946ef',
  16: '#0ea5e9', 17: '#84cc16', 18: '#f97316', 19: '#ef4444', 20: '#00f2fe'
};

function RelicVisual({ relicId, size = 32, color, className = '' }) {
  const s = size;
  const pNum = typeof relicId === 'number' ? relicId : parseInt(String(relicId).replace('relic_p', ''), 10) || 1;
  const c = color || RELIC_COLORS[pNum] || '#00f2fe';

  switch (pNum) {
    case 1: // Tellurica (Gaia)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,3 28,10 28,22 16,29 4,22 4,10" stroke={c} strokeWidth="2" fill={`${c}22`} />
          <path d="M4 10 L16 17 L28 10 M16 17 V29" stroke={c} strokeWidth="1.5" />
          <circle cx="16" cy="17" r="3" fill="#ffffff" />
        </svg>
      );
    case 2: // Magmatica (Marte)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="12" stroke={c} strokeWidth="2" fill="rgba(244,63,94,0.25)" />
          <path d="M10 18 Q14 12 16 16 Q18 20 22 14" stroke="#facc15" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="16" r="3.5" fill="#facc15" />
        </svg>
      );
    case 3: // Acida (Venere)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <path d="M16 4 L24 18 C24 23 20 27 16 27 C12 27 8 23 8 18 Z" stroke={c} strokeWidth="2" fill={`${c}25`} />
          <path d="M12 20 Q16 16 20 20" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="12" r="2" fill="#ffffff" />
        </svg>
      );
    case 4: // Termica (Mercurio)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,4 26,10 26,22 16,28 6,22 6,10" stroke={c} strokeWidth="2" fill={`${c}20`} />
          <polygon points="16,9 21,12 21,20 16,23 11,20 11,12" stroke="#ffffff" strokeWidth="1.2" fill={c} />
          <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        </svg>
      );
    case 5: // Tempeste (Giove)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <ellipse cx="16" cy="16" rx="13" ry="8" stroke={c} strokeWidth="2" fill={`${c}20`} />
          <ellipse cx="16" cy="16" rx="8" ry="4" stroke="#fca5a5" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="3" fill="#ef4444" />
        </svg>
      );
    case 6: // Anulare (Saturno)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="7" stroke={c} strokeWidth="2" fill={`${c}30`} />
          <ellipse cx="16" cy="16" rx="14" ry="4.5" transform="rotate(-20 16 16)" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );
    case 7: // Ghiacci (Urano)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,3 22,12 22,26 16,29 10,26 10,12" stroke={c} strokeWidth="2" fill={`${c}25`} />
          <line x1="16" y1="3" x2="16" y2="29" stroke="#ffffff" strokeWidth="1.5" />
        </svg>
      );
    case 8: // Abissale (Nettuno)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <path d="M16 4 C24 10 26 22 16 28 C6 22 8 10 16 4 Z" stroke={c} strokeWidth="2" fill={`${c}30`} />
          <path d="M16 9 V23 M11 16 H21" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 9: // Antimateria (Plutone)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,4 28,24 4,24" stroke={c} strokeWidth="2" fill={`${c}20`} />
          <polygon points="16,24 22,14 10,14" stroke="#ffffff" strokeWidth="1.5" fill="none" />
          <circle cx="16" cy="17" r="2.5" fill="#ffffff" />
        </svg>
      );
    case 10: // Metano (Titano)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="11" stroke={c} strokeWidth="2" fill={`${c}25`} />
          <ellipse cx="16" cy="20" rx="7" ry="3" stroke="#fde68a" strokeWidth="1.5" fill="none" />
          <circle cx="16" cy="11" r="2" fill="#ffffff" />
        </svg>
      );
    case 11: // Oceanica (Europa)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,3 20,12 29,16 20,20 16,29 12,20 3,16 12,12" stroke={c} strokeWidth="1.8" fill={`${c}25`} />
          <circle cx="16" cy="16" r="4" fill="#ffffff" />
        </svg>
      );
    case 12: // Magnetica (Ganimede)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="12" stroke={c} strokeWidth="1.5" />
          <ellipse cx="16" cy="16" rx="12" ry="4" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" />
          <ellipse cx="16" cy="16" rx="4" ry="12" stroke={c} strokeWidth="1.5" />
          <circle cx="16" cy="16" r="3" fill="#ffffff" />
        </svg>
      );
    case 13: // Esoplanetaria (Kepler-186f)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <rect x="7" y="7" width="18" height="18" rx="3" stroke={c} strokeWidth="2" fill={`${c}20`} />
          <rect x="11" y="11" width="10" height="10" rx="1.5" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" fill="#ffffff" />
        </svg>
      );
    case 14: // Primordiale (Proxima b)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="9" r="5" stroke={c} strokeWidth="2" fill={`${c}30`} />
          <circle cx="16" cy="23" r="5" stroke={c} strokeWidth="2" fill={`${c}30`} />
          <line x1="16" y1="14" x2="16" y2="18" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );
    case 15: // Armonica (TRAPPIST-1e)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="4" fill="#ffffff" />
          <circle cx="16" cy="16" r="8" stroke={c} strokeWidth="1.2" opacity="0.8" />
          <circle cx="16" cy="16" r="12" stroke={c} strokeWidth="1.2" opacity="0.5" strokeDasharray="2 2" />
        </svg>
      );
    case 16: // Neutrale (Gliese 581g)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,5 27,24 5,24" stroke={c} strokeWidth="2" fill="none" />
          <circle cx="16" cy="5" r="2.5" fill="#ffffff" />
          <circle cx="27" cy="24" r="2.5" fill="#ffffff" />
          <circle cx="5" cy="24" r="2.5" fill="#ffffff" />
          <circle cx="16" cy="18" r="3" fill={c} />
        </svg>
      );
    case 17: // Cinetica (Haumea)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-30 16 16)" stroke={c} strokeWidth="2" fill={`${c}25`} />
          <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
        </svg>
      );
    case 18: // Discordia (Eris)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,3 21,11 30,13 23,20 25,29 16,24 7,29 9,20 2,13 11,11" stroke={c} strokeWidth="1.8" fill={`${c}25`} />
          <circle cx="16" cy="16" r="2" fill="#ffffff" />
        </svg>
      );
    case 19: // Vulcanica (Io)
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <polygon points="16,5 26,27 6,27" stroke={c} strokeWidth="2" fill="rgba(239,68,68,0.3)" />
          <path d="M12 20 Q16 14 20 20" stroke="#facc15" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="16" cy="11" r="2.5" fill="#facc15" />
        </svg>
      );
    case 20: // Vuoto (Encelado)
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none" className={className}>
          <circle cx="16" cy="16" r="11" stroke={c} strokeWidth="2" fill={`${c}20`} />
          <path d="M10 20 Q16 12 22 20" stroke="#ffffff" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="10" r="2" fill="#ffffff" />
        </svg>
      );
  }
}

export { TerrainVisual, SciFiIcon, ModuleIcon, TacticalVisual, RelicVisual };
export default TacticalVisual;
