import React from 'react';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PILOTS_DATABASE, PilotCard } from './pilotsSystem';
import { WEAPONS_DATABASE as DEFAULT_WEAPONS } from './HardpointBattleView';

export default function PersonalLoadoutModal({
  nickname = 'Pilota',
  level = 1,
  xp = 0,
  xpThreshold = 100,
  maxPlayerHp = 50,
  // Le 8 Risorse
  credits = 0,
  lives = 3,
  maxLives = 3,
  stardust = 0,
  walletCap = 1500,
  diamonds = 0,
  ether = 0,
  voidCrystals = 0,
  primordialMatter = 0,
  tankConfig = { maxVoid: 4, maxPrimordial: 2 },
  scannerSeconds = 0,
  // Estrattore di Etere
  isEtherUnlocked = false,
  extractorLevel = 1,
  extractorStored = 0,
  extractorConfig,
  nextExtractorConfig,
  onHarvestEther,
  onUpgradeExtractor,
  // Assetto Operativo Pilota, Mazzo & Modulo
  selectedPilot = 'pilot_com_1',
  pilotInventory = {},
  selectedDeck = 'neutral_starter',
  currentDeckObj,
  deckInventory = {},
  selectedAbility = null,
  abilities = {},
  isAbilityModuleUnlocked = false,
  // Arsenale 4 Hardpoint (2 Poker + 2 Calcolo)
  equippedWeapons = ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'],
  weaponsLevels = { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 },
  weaponsDatabase = null,
  // Manufatti Epici & Terreni
  equippedEpicItems = [],
  epicItemsDatabase = [],
  equippedTerrainSlots = [],
  terrainCardsDatabase = [],
  // Navigazione Shop & Chiusura
  onOpenShopTab,
  onClose
}) {
  const pilotsList = Array.isArray(PILOTS_DATABASE) ? PILOTS_DATABASE : Object.values(PILOTS_DATABASE || {});
  const currentPilotObj = pilotsList.find(p => p.id === selectedPilot) || pilotsList[0] || {};
  const pilotLvl = pilotInventory?.[selectedPilot]?.level || 1;
  const deckLvl = deckInventory?.[selectedDeck]?.level || 1;
  const abilityLvl = abilities?.[selectedAbility]?.level || 1;
  const weaponsDb = weaponsDatabase || DEFAULT_WEAPONS || [];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 31000, padding: 'clamp(4px, 1.5vmin, 12px)' }}>
      <div className="cyber-panel" style={{ padding: '0.85rem 1rem', maxWidth: '580px', width: '100%', maxHeight: '94dvh', display: 'flex', flexDirection: 'column', border: '2px solid #00f2fe', boxShadow: '0 0 50px rgba(0, 242, 254, 0.55)', boxSizing: 'border-box' }}>
        
        {/* Intestazione */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 242, 254, 0.3)', paddingBottom: '0.35rem', marginBottom: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.58rem', color: '#facc15', fontWeight: 900, textTransform: 'uppercase' }}>
              CENTRO DI COMANDO • SCHEDA & ASSETTO
            </div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 900 }}>
              {nickname} <span style={{ color: '#00f2fe', fontSize: '0.8rem' }}>(Liv. {level})</span>
            </h3>
          </div>
          <button className="cyber-btn" onClick={onClose} style={{ padding: '0.2rem 0.55rem', background: '#ef4444', borderColor: '#f87171', fontWeight: 900 }}>✕</button>
        </div>

        {/* 1. CRUSCOTTO DELLE 8 RISORSE */}
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '0.4rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '0.55rem' }}>
          <div style={{ fontSize: '0.52rem', color: '#facc15', fontWeight: 900, marginBottom: '2px', textTransform: 'uppercase' }}>
            STATO RISORSE GLOBALI
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '0.62rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              <span style={{ color: '#00f2fe' }}>⚡ Crediti:</span> <strong>{credits}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              <span style={{ color: '#fca5a5' }}>💔 Vite:</span> <strong>{lives}/{maxLives}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(250, 204, 21, 0.3)' }}>
              <span style={{ color: '#fef08a' }}>🌟 Polvere:</span> <strong>{stardust}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(192, 132, 252, 0.3)' }}>
              <span style={{ color: '#f5d0fe' }}>💎 Diamanti:</span> <strong>{diamonds}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(232, 121, 249, 0.3)' }}>
              <span style={{ color: '#e879f9' }}>🔮 Etere:</span> <strong>{ether}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
              <span style={{ color: '#38bdf8' }}>💠 Vuoto:</span> <strong>{voidCrystals}/{tankConfig?.maxVoid || 4}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(217, 70, 239, 0.3)' }}>
              <span style={{ color: '#d946ef' }}>🟣 Materia:</span> <strong>{primordialMatter}/{tankConfig?.maxPrimordial || 2}</strong>
            </div>
            <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '2px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <span style={{ color: '#7dd3fc' }}>⏱️ Scanner:</span> <strong>{scannerSeconds}s</strong>
            </div>
          </div>
        </div>

        {/* CONTENUTO SCORREVOLE */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingRight: '0.2rem' }}>
          
          {/* 2. SCHEDA PILOTA & STATUS */}
          <div style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.25), rgba(15, 23, 42, 0.85))', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #00f2fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#fff' }}>Grado Pilota: Livello {level}</div>
              <div style={{ fontSize: '0.6rem', color: '#cbd5e1', marginTop: '2px' }}>
                XP: <strong>{xp} / {xpThreshold}</strong> | Fascia {level >= 66 ? '3' : level >= 31 ? '2' : '1'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#10b981' }}>{maxPlayerHp} HP</div>
              <div style={{ fontSize: '0.52rem', color: '#94a3b8' }}>Curva Vitale</div>
            </div>
          </div>

          {/* 3. REATTORE ESTRATTORE ETERE */}
          {isEtherUnlocked && (
            <div className="cyber-panel" style={{ padding: '0.5rem 0.75rem', border: '1.5px solid #e879f9', background: 'rgba(88, 28, 135, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.58rem', color: '#f0abfc', fontWeight: 900 }}>🔮 {extractorConfig?.name || 'Estrattore d\'Etere'} (Liv.{extractorLevel}/4)</div>
                <div style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 'bold' }}>
                  Accumulo: <span style={{ color: '#e879f9' }}>{extractorStored} / {extractorConfig?.maxStore || 4} 🔮</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  disabled={extractorStored <= 0}
                  onClick={onHarvestEther}
                  className="cyber-btn cyber-btn-ether"
                  style={{ padding: '0.3rem 0.55rem', fontSize: '0.62rem', fontWeight: 900 }}
                >
                  Raccogli ({extractorStored} 🔮)
                </button>
                {nextExtractorConfig && (
                  <button
                    onClick={onUpgradeExtractor}
                    className="cyber-btn"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.6rem', borderColor: '#e879f9' }}
                  >
                    Migliora ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. ASSETTO OPERATIVO PLANCIA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.55rem', color: '#facc15', fontWeight: 900, textTransform: 'uppercase' }}>
              ASSETTO OPERATIVO PLANCIA
            </div>

            {/* Pilota */}
            <div className="cyber-panel" style={{ padding: '0.45rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${currentPilotObj.color || '#00f2fe'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PilotCard pilot={currentPilotObj || selectedPilot} compact={true} isEquipped={true} />
                <div>
                  <div style={{ fontSize: '0.52rem', color: '#facc15', fontWeight: 800 }}>PILOTA IN PLANCIA</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: currentPilotObj.color || '#00f2fe' }}>{currentPilotObj.name || 'Pilota Assegnato'}</div>
                  <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Grado {pilotLvl}/5 • {currentPilotObj.archetype || currentPilotObj.role || 'Operativo'}</div>
                </div>
              </div>
              <button onClick={() => onOpenShopTab('characters')} className="cyber-btn cyber-btn-primary" style={{ padding: '0.3rem 0.55rem', fontSize: '0.62rem', fontWeight: 900 }}>
                GESTISCI ➔
              </button>
            </div>

            {/* Mazzo Tattico */}
            <div className="cyber-panel" style={{ padding: '0.45rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${currentDeckObj?.color || '#38bdf8'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TacticalVisual id={selectedDeck} type="card_back" color={currentDeckObj?.color || '#38bdf8'} width={28} height={42} />
                <div>
                  <div style={{ fontSize: '0.52rem', color: '#facc15', fontWeight: 800 }}>MAZZO TATTICO</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: currentDeckObj?.color || '#fff' }}>{currentDeckObj?.name || 'Mazzo Base'}</div>
                  <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>Livello {deckLvl} / {currentDeckObj?.maxLevel || 3}</div>
                </div>
              </div>
              <button onClick={() => onOpenShopTab('decks')} className="cyber-btn cyber-btn-warning" style={{ padding: '0.3rem 0.55rem', fontSize: '0.62rem', fontWeight: 900 }}>
                GESTISCI ➔
              </button>
            </div>

            {/* Modulo Abilità */}
            <div className="cyber-panel" style={{ padding: '0.45rem 0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #c084fc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ModuleIcon id={selectedAbility || 'taurus'} size={24} color="#c084fc" />
                <div>
                  <div style={{ fontSize: '0.52rem', color: '#c084fc', fontWeight: 800 }}>MODULO ABILITÀ IBRIDO</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#fff' }}>
                    {isAbilityModuleUnlocked ? (selectedAbility ? `${selectedAbility.toUpperCase()} (L.${abilityLvl})` : 'Nessuno') : '🔒 Sblocco Settore 9'}
                  </div>
                </div>
              </div>
              <button onClick={() => onOpenShopTab('abilities')} className="cyber-btn cyber-btn-ether" style={{ padding: '0.3rem 0.55rem', fontSize: '0.62rem', fontWeight: 900 }}>
                GESTISCI ➔
              </button>
            </div>

            {/* Arsenale Hardpoint (4 Armi: 2 Poker + 2 Calcolo) */}
            <div className="cyber-panel" style={{ padding: '0.5rem', border: '1.5px solid #00f2fe' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.55rem', color: '#00f2fe', fontWeight: 900, textTransform: 'uppercase' }}>
                    ARSENALE HARDPOINT (4 SLOT)
                  </span>
                  <span style={{ fontSize: '0.48rem', color: '#94a3b8' }}>
                    2 Poker + 2 Calcolo
                  </span>
                </div>
                <button 
                  onClick={() => onOpenShopTab('weapons')} 
                  className="cyber-btn" 
                  style={{ padding: '2px 6px', fontSize: '0.52rem', fontWeight: 900, borderColor: '#00f2fe', color: '#00f2fe' }}
                >
                  MODIFICA ➔
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {[0, 1, 2, 3].map(slotIdx => {
                  const wpId = equippedWeapons[slotIdx];
                  const wpObj = weaponsDb.find(w => w.id === wpId);
                  const wpLvl = weaponsLevels?.[wpId] || 1;
                  const stats = wpObj?.levels?.[wpLvl] || wpObj?.levels?.[1] || { damage: 15 };
                  const isPoker = slotIdx < 2;

                  return (
                    <div
                      key={slotIdx}
                      style={{
                        background: 'rgba(2, 6, 23, 0.75)',
                        border: wpObj ? `1px solid ${wpObj.color || (isPoker ? '#facc15' : '#00f2fe')}` : '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        padding: '4px 3px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: '82px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.46rem', color: '#94a3b8' }}>
                        <span>H{slotIdx + 1}</span>
                        <span style={{ color: isPoker ? '#fde047' : '#38bdf8' }}>{isPoker ? 'POKER' : 'MATH'}</span>
                      </div>

                      {wpObj ? (
                        <>
                          <div style={{ width: '100%', height: '34px', borderRadius: '4px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', margin: '2px 0' }}>
                            <img
                              src={wpObj.imgUrl}
                              alt={wpObj.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerText = isPoker ? '🃏' : '⚡';
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div style={{ fontSize: '0.52rem', color: wpObj.color || '#fff', fontWeight: 900, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {wpObj.name.split(' ')[0]}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.48rem', marginTop: '2px' }}>
                            <span style={{ color: '#f87171', fontWeight: 900 }}>⚔️️ -{stats.damage}</span>
                            <span style={{ color: '#fde047', fontWeight: 900 }}>L.{wpLvl}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.52rem', color: '#475569', fontWeight: 900, margin: 'auto 0' }}>Libero</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manufatti Epici (2 Slot) */}
            <div className="cyber-panel" style={{ padding: '0.5rem', border: '1px solid #facc15' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.55rem', color: '#facc15', fontWeight: 900 }}>MANUFATTI EPICI (2 SLOT)</span>
                <span style={{ fontSize: '0.52rem', color: '#cbd5e1' }}>*Cripta in Campagna</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                {[0, 1].map(idx => {
                  const itemId = (equippedEpicItems || [])[idx];
                  const itemObj = itemId ? (epicItemsDatabase || []).find(e => e.id === itemId) : null;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(2, 6, 23, 0.75)', 
                        border: itemObj ? `1px solid ${itemObj.color || '#facc15'}` : '1px dashed rgba(255,255,255,0.15)', 
                        borderRadius: '6px', 
                        padding: '4px 6px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}
                    >
                      {itemObj ? (
                        <>
                          <TacticalVisual id={itemObj.id} type="epic_item" color={itemObj.color || '#facc15'} width={24} height={24} />
                          <div style={{ textAlign: 'left', minWidth: 0, lineHeight: 1.1 }}>
                            <div style={{ fontSize: '0.46rem', color: '#94a3b8' }}>Slot {idx + 1}</div>
                            <div style={{ fontSize: '0.65rem', color: itemObj.color || '#facc15', fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(itemObj.name || '').split(' ')[0]}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.58rem', color: '#64748b' }}>
                          Slot {idx + 1}: Vuoto
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Banco Terreno (4 Slot) */}
            <div className="cyber-panel" style={{ padding: '0.5rem', border: '1px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.55rem', color: '#10b981', fontWeight: 900 }}>BANCO TERRENO (4 SLOT COPERTI)</span>
                <button onClick={() => onOpenShopTab('terrain')} className="cyber-btn" style={{ padding: '2px 6px', fontSize: '0.52rem', fontWeight: 900 }}>
                  MODIFICA ➔
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {[0, 1, 2, 3].map(idx => {
                  const tId = (equippedTerrainSlots || [])[idx];
                  const card = tId ? (terrainCardsDatabase || []).find(c => c.id === tId) : null;
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: 'rgba(2, 6, 23, 0.75)', 
                        border: card ? `1px solid ${card.color || '#10b981'}` : '1px dashed rgba(255,255,255,0.15)', 
                        borderRadius: '6px', 
                        padding: '4px 2px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        minHeight: '68px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ fontSize: '0.46rem', color: '#94a3b8', marginBottom: '2px' }}>Slot {idx + 1}</div>
                      {card ? (
                        <>
                          <TerrainVisual cardId={card.id} color={card.color || '#10b981'} width={28} height={42} isBack={false} />
                          <div style={{ fontSize: '0.52rem', color: card.color || '#10b981', fontWeight: 900, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                            {(card.name || '').split(' ')[0]}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 900, margin: 'auto 0' }}>Libero</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* 5. ACCESSO RAPIDO SHOP & RIFORNIMENTI */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '0.2rem' }}>
            <button
              onClick={() => onOpenShopTab('weapons')}
              className="cyber-btn cyber-btn-primary"
              style={{ flex: 1.5, padding: '0.6rem', fontSize: '0.78rem', fontWeight: 900 }}
            >
              🚀 ARMERIA & BAZAR ➔
            </button>
            <button
              onClick={() => onOpenShopTab('resources')}
              className="cyber-btn cyber-btn-warning"
              style={{ flex: 1, padding: '0.6rem', fontSize: '0.72rem', fontWeight: 900 }}
            >
              🛒 Rifornimenti
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
