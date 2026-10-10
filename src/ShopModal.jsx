import React, { useState, useEffect } from 'react';
import { TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PILOTS_DATABASE, PilotCard } from './pilotsSystem';
import DeepSpaceUniverseCanvas from './DeepSpaceUniverseCanvas';
import { playSound } from './audio';
import { WEAPONS_DATABASE as DEFAULT_WEAPONS_DB } from './weaponsSystem';

// ============================================================================
// MATRICE COSTI POTENZIAMENTO ARMI (3 LIVELLI TOTALI: 1 -> 2 -> 3)
// ============================================================================
const WEAPON_UPGRADE_COSTS = Object.freeze({
  2: { dust: 600, voidCrystals: 0, primordialMatter: 0, reqPilotLevel: 12 },
  3: { dust: 1800, voidCrystals: 2, primordialMatter: 0, reqPilotLevel: 35 }
});

const normalizeRarity = (r) => {
  if (!r) return 'Comune';
  const low = String(r).toLowerCase();
  if (low === 'common' || low === 'comune') return 'Comune';
  if (low === 'rare' || low === 'rara') return 'Rara';
  if (low === 'super_rare' || low === 'super rara' || low === 's.rari' || low === 's.rara' || low === 'epica' || low === 'epic') return 'Epica';
  if (low === 'legendary' || low === 'leggendaria' || low === 'legg.') return 'Leggendaria';
  return r;
};

// Matrice costi e requisiti unificata per Mazzi e Moduli (Fasce 1, 2, 3)
const UNIFIED_UPGRADE_COSTS = Object.freeze({
  2: { dust: 450, voidCrystals: 0, primordialMatter: 0 },
  3: { dust: 1100, voidCrystals: 0, primordialMatter: 0 },
  4: { dust: 2200, voidCrystals: 2, primordialMatter: 0 },
  5: { dust: 3500, voidCrystals: 4, primordialMatter: 0 },
  6: { dust: 5000, voidCrystals: 6, primordialMatter: 0 },
  7: { dust: 7500, voidCrystals: 8, primordialMatter: 2 },
  8: { dust: 10500, voidCrystals: 10, primordialMatter: 3 },
  9: { dust: 15000, voidCrystals: 12, primordialMatter: 5 }
});

const UPGRADE_PILOT_REQS = Object.freeze({
  1: 1, 2: 12, 3: 25, 4: 35, 5: 48, 6: 60, 7: 70, 8: 82, 9: 95
});

const TERRAIN_UPGRADE_COSTS = Object.freeze({
  2: { dust: 500, voidCrystals: 2, primordialMatter: 0 },
  3: { dust: 1400, voidCrystals: 4, primordialMatter: 2 }
});

const TERRAIN_PILOT_REQS = Object.freeze({
  1: 1,
  2: 31,
  3: 66
});

export default function ShopModal({
  initialTab = 'characters',
  // Piloti
  selectedPilot,
  pilotInventory = {},
  onSelectPilot,
  onUnlockPilot,
  onUpgradePilot,
  // Mazzi
  selectedDeck,
  deckInventory = {},
  allDecks = [],
  onSelectDeck,
  onUpgradeDeck,
  // Moduli
  selectedAbility,
  abilities = {},
  allAbilities = [],
  onSelectAbility,
  onUnlockAbility,
  onUpgradeAbility,
  // Arsenale Hardpoint
  equippedWeapons: propEquippedWeapons,
  weaponsLevels: propWeaponsLevels,
  weaponsDatabase = null,
  onEquipWeapon,
  onUpgradeWeapon,
  // Terreni
  unlockedTerrainCards = {},
  equippedTerrainSlots = [],
  terrainCardsDatabase = [],
  onEquipTerrainSlot,
  onUnequipTerrainSlot,
  onUpgradeTerrainCard,
  onBuyTerrainCard,
  // Sfondi
  equippedEnvironment,
  unlockedEnvironments = {},
  specialBackgrounds = [],
  planetEnvironments = [],
  onUnlockOrEquipEnvironment,
  onPreviewEnvironment,
  // Risorse & Store Packages
  stardust = 0,
  diamonds = 0,
  voidCrystals = 0,
  primordialMatter = 0,
  ether = 0,
  level = 1,
  onBuyStorePackage,
  // Navigazione
  fromLoadout = false,
  onBackToLoadout,
  onCloseToHome
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'characters');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const [localEquippedWeapons, setLocalEquippedWeapons] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_equipped_weapons');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'];
    } catch (_) {
      return ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon'];
    }
  });

  const [localWeaponsLevels, setLocalWeaponsLevels] = useState(() => {
    try {
      const saved = localStorage.getItem('eclissi_weapons_levels');
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && typeof parsed === 'object') ? parsed : { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 };
    } catch (_) {
      return { wp_gatling: 1, wp_xbow: 1, wp_thunderstrike: 1, wp_orbital_cannon: 1 };
    }
  });

  // Protezione anti-crash su array e oggetti armi
  const currentEquippedWeapons = Array.isArray(propEquippedWeapons)
    ? propEquippedWeapons
    : (Array.isArray(localEquippedWeapons) ? localEquippedWeapons : ['wp_gatling', 'wp_xbow', 'wp_thunderstrike', 'wp_orbital_cannon']);

  const currentWeaponsLevels = (propWeaponsLevels && typeof propWeaponsLevels === 'object')
    ? propWeaponsLevels
    : ((localWeaponsLevels && typeof localWeaponsLevels === 'object') ? localWeaponsLevels : {});

  const weaponsDb = (Array.isArray(weaponsDatabase) && weaponsDatabase.length > 0)
    ? weaponsDatabase
    : (Array.isArray(DEFAULT_WEAPONS_DB) ? DEFAULT_WEAPONS_DB : []);

  const handleEquipWeaponInternal = (slotIdx, weaponId) => {
    const next = [...currentEquippedWeapons];
    next[slotIdx] = weaponId;
    setLocalEquippedWeapons(next);
    localStorage.setItem('eclissi_equipped_weapons', JSON.stringify(next));
    if (typeof onEquipWeapon === 'function') {
      onEquipWeapon(slotIdx, weaponId);
    }
  };

  const handleUpgradeWeaponInternal = (weaponId, targetLvl, cost) => {
    const next = { ...currentWeaponsLevels, [weaponId]: targetLvl };
    setLocalWeaponsLevels(next);
    localStorage.setItem('eclissi_weapons_levels', JSON.stringify(next));
    if (typeof onUpgradeWeapon === 'function') {
      onUpgradeWeapon(weaponId, targetLvl, cost);
    }
  };

  // FILTRI DI RARITÀ PER CIASCUNA CATEGORIA
  const [pilotRarityFilter, setPilotRarityFilter] = useState('all');
  const [deckRarityFilter, setDeckRarityFilter] = useState('all');
  const [abilityRarityFilter, setAbilityRarityFilter] = useState('all');
  const [weaponRarityFilter, setWeaponRarityFilter] = useState('all');
  const [terrainRarityFilter, setTerrainRarityFilter] = useState('all');

  // STATI DI ISPEZIONE, CONFERMA E GRATIFICAZIONE
  const [inspectedItem, setInspectedItem] = useState(null);
  const [inspectFlipped, setInspectFlipped] = useState(false);
  const [previewingEnv, setPreviewingEnv] = useState(null);
  const [upgradeConfirm, setUpgradeConfirm] = useState(null);
  const [dopamineBurst, setDopamineBurst] = useState(null);
  const [localHint, setLocalHint] = useState(null);

  const showHint = (msg) => {
    setLocalHint(msg);
    setTimeout(() => setLocalHint(null), 2400);
  };

  const mainTabs = [
    { id: 'characters', label: 'Piloti', icon: '👤' },
    { id: 'weapons', label: 'Armi', icon: '🚀' },
    { id: 'decks', label: 'Mazzi', icon: '🃏' },
    { id: 'abilities', label: 'Moduli', icon: '⚡' },
    { id: 'terrain', label: 'Terreni', icon: '🛡️' },
    { id: 'environments', label: 'Sfondi', icon: '🪐' },
    { id: 'resources', label: 'Risorse', icon: '💎' }
  ];

  const rarityFilterBar = [
    { id: 'all', name: 'Tutti', color: '#00f2fe' },
    { id: 'Comune', name: 'Comuni', color: '#10b981' },
    { id: 'Rara', name: 'Rari', color: '#38bdf8' },
    { id: 'Epica', name: 'Epici', color: '#c084fc' },
    { id: 'Leggendaria', name: 'Legg.', color: '#facc15' }
  ];

  const renderRarityFilter = (currentFilter, setFilter) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', width: '100%', marginBottom: '0.5rem', flexShrink: 0, boxSizing: 'border-box' }}>
      {rarityFilterBar.map(cat => {
        const isSelected = currentFilter === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => {
              try { playSound('click'); } catch (_) {}
              setFilter(cat.id);
            }}
            className="cyber-btn"
            style={{
              padding: 'clamp(2px, 0.6vh, 4px) 1px',
              fontSize: 'clamp(0.55rem, 1.6vw, 0.68rem)',
              fontWeight: 900,
              width: '100%',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderRadius: '5px',
              background: isSelected ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : 'rgba(15, 23, 42, 0.85)',
              borderColor: isSelected ? cat.color : 'rgba(255, 255, 255, 0.15)',
              color: isSelected ? '#fff' : '#cbd5e1',
              boxShadow: isSelected ? `0 0 8px ${cat.color}88` : 'none'
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );

  const triggerDopamineCelebration = (title, subtitle) => {
    try { playSound('epic_item_trigger'); } catch (_) {}
    try { setTimeout(() => playSound('win'), 250); } catch (_) {}
    setDopamineBurst({ title, subtitle });
    setTimeout(() => setDopamineBurst(null), 2200);
  };

  const executeConfirmedUpgrade = () => {
    if (!upgradeConfirm) return;
    const { type, id, nextLvl, cost, title } = upgradeConfirm;

    if (type === 'pilot') {
      if (typeof onUpgradePilot === 'function') onUpgradePilot(id, nextLvl, cost);
      triggerDopamineCelebration(title, `POTENZIATO AL GRADO ${nextLvl}!`);
    } else if (type === 'deck') {
      if (typeof onUpgradeDeck === 'function') onUpgradeDeck(id);
      triggerDopamineCelebration(title, `INVIATO AL CANTIERE (LIV. ${nextLvl})!`);
    } else if (type === 'ability') {
      if (typeof onUpgradeAbility === 'function') onUpgradeAbility(id);
      triggerDopamineCelebration(title, `INVIATO AL CANTIERE (LIV. ${nextLvl})!`);
    } else if (type === 'terrain') {
      if (typeof onUpgradeTerrainCard === 'function') onUpgradeTerrainCard(id, nextLvl, cost);
      triggerDopamineCelebration(title, `INVIATA AL CANTIERE (LIV. ${nextLvl})!`);
    } else if (type === 'weapon') {
      handleUpgradeWeaponInternal(id, nextLvl, cost);
      triggerDopamineCelebration(title, `POTENZIATA AL LIVELLO ${nextLvl}!`);
    }
    setUpgradeConfirm(null);
  };

  const pilotsList = Array.isArray(PILOTS_DATABASE)
    ? PILOTS_DATABASE
    : (PILOTS_DATABASE && typeof PILOTS_DATABASE === 'object' ? Object.values(PILOTS_DATABASE) : []);

  // Risoluzione sicura per background senza rischio di errore "is not iterable"
  const safeBackgroundsList = [
    ...(Array.isArray(specialBackgrounds) ? specialBackgrounds : Object.values(specialBackgrounds || {})),
    ...(Array.isArray(planetEnvironments) ? planetEnvironments : Object.values(planetEnvironments || {}))
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 35000, padding: 'clamp(4px, 1vh, 8px)', boxSizing: 'border-box' }}>
      <div className="cyber-panel" style={{ padding: 'clamp(6px, 1.2vh, 10px)', maxWidth: '900px', width: '100%', height: '98dvh', maxHeight: '98dvh', display: 'flex', flexDirection: 'column', border: '2px solid #00f2fe', boxShadow: '0 0 40px rgba(0, 242, 254, 0.55)', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
        
        {/* TOAST HINT FLUTTUANTE */}
        {localHint && (
          <div className="cyber-panel" style={{ position: 'absolute', top: '38px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(2, 6, 23, 0.96)', border: '1.5px solid #00f2fe', padding: '4px 14px', borderRadius: '6px', zIndex: 70000, fontSize: 'clamp(0.65rem, 1.8vw, 0.78rem)', color: '#fff', fontWeight: 900, whiteSpace: 'nowrap', boxShadow: '0 0 16px rgba(0, 242, 254, 0.6)' }}>
            {localHint}
          </div>
        )}

        {/* BARRA SUPERIORE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.14)', paddingBottom: '3px', marginBottom: '4px', flexShrink: 0, zIndex: 12, position: 'relative', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {fromLoadout && (
              <button onClick={onBackToLoadout} className="cyber-btn cyber-btn-primary" style={{ padding: '2px 5px', fontSize: '0.62rem', fontWeight: 900 }}>
                ← Area
              </button>
            )}
            <h3 style={{ margin: 0, color: '#00f2fe', fontSize: 'clamp(0.85rem, 2.4vw, 1.15rem)', fontWeight: 900, textShadow: '0 0 10px rgba(0, 242, 254, 0.6)' }}>
              Bazar Galattico
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ display: 'flex', gap: '4px', fontSize: 'clamp(0.55rem, 1.5vw, 0.65rem)', background: 'rgba(2, 6, 23, 0.85)', padding: '2px 5px', borderRadius: '5px', border: '1px solid rgba(0, 242, 254, 0.35)', fontWeight: 'bold' }}>
              <span style={{ color: '#facc15' }}>🌟{stardust}</span>
              <span style={{ color: '#f5d0fe' }}>💎{diamonds}</span>
              <span style={{ color: '#e879f9' }}>🔮{ether}</span>
              <span style={{ color: '#38bdf8' }}>💠{voidCrystals}</span>
              <span style={{ color: '#d946ef' }}>🟣{primordialMatter}</span>
            </div>
            <button onClick={onCloseToHome} className="cyber-btn" style={{ padding: '2px 6px', fontSize: '0.65rem', background: '#ef4444', borderColor: '#f87171', fontWeight: 900 }}>
              🏠
            </button>
          </div>
        </div>

        {/* I 7 TAB PRINCIPALI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', width: '100%', marginBottom: '4px', flexShrink: 0, zIndex: 11, position: 'relative', boxSizing: 'border-box' }}>
          {mainTabs.map(t => {
            const isTabActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { try { playSound('click'); } catch (_) {} setActiveTab(t.id); }}
                className="cyber-btn"
                style={{
                  padding: 'clamp(3px, 0.8vh, 6px) 1px',
                  width: '100%',
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  background: isTabActive ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : 'rgba(15, 23, 42, 0.85)',
                  borderColor: isTabActive ? '#00f2fe' : 'rgba(255,255,255,0.18)',
                  color: isTabActive ? '#fff' : '#cbd5e1',
                  boxShadow: isTabActive ? '0 0 10px rgba(0, 242, 254, 0.5)' : 'none'
                }}
              >
                <span style={{ fontSize: 'clamp(0.7rem, 2vw, 0.95rem)', lineHeight: 1 }}>{t.icon}</span>
                <span style={{ fontSize: 'clamp(0.52rem, 1.4vw, 0.68rem)', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', marginTop: '1px' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* CONTENUTO SCHEDE */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '2px', position: 'relative', zIndex: 5 }}>
          
          {/* TAB 1: PILOTI */}
          {activeTab === 'characters' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderRarityFilter(pilotRarityFilter, setPilotRarityFilter)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                {pilotsList.filter(p => p && !p.isNpcOnly).filter(p => pilotRarityFilter === 'all' || normalizeRarity(p.rarity) === pilotRarityFilter).map(pilot => {
                  const inv = pilotInventory?.[pilot.id];
                  const isUnlocked = Boolean(inv?.unlocked);
                  const curLvl = inv?.level || 1;
                  const isEquipped = selectedPilot === pilot.id;
                  const nextUpgrade = pilot.upgradeTable?.[curLvl + 1] || null;

                  return (
                    <div 
                      key={pilot.id} 
                      className="cyber-panel" 
                      style={{ 
                        padding: '0.65rem', 
                        border: isEquipped ? '2px solid #00f2fe' : (isUnlocked ? `1.5px solid ${pilot.rarityColor || pilot.color}` : '1px dashed rgba(255,255,255,0.2)'), 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between',
                        background: isUnlocked ? 'rgba(15, 23, 42, 0.9)' : 'rgba(2, 6, 23, 0.8)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.55rem', background: pilot.rarityColor || pilot.color, color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {pilot.rarity}
                          </span>
                          {isUnlocked && (
                            <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900, background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '3px', border: '1px solid #10b981' }}>
                              GRADO {curLvl}/5
                            </span>
                          )}
                        </div>

                        <div 
                          onClick={() => setInspectedItem({ type: 'pilot', data: pilot, curLvl, isUnlocked, isEquipped })}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: '3px 0' }}
                          title="Tocca per ingrandire"
                        >
                          <PilotCard pilot={pilot} compact={true} />
                          <span style={{ fontSize: '0.52rem', color: '#38bdf8', marginTop: '2px', textDecoration: 'underline' }}>
                            🔍 Ingrandisci
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: pilot.rarityColor || pilot.color, textAlign: 'center', margin: '2px 0' }}>
                          {pilot.name}
                        </div>
                        <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.4rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', margin: '3px 0', fontSize: '0.62rem', lineHeight: 1.3 }}>
                          <div style={{ color: '#00f2fe', fontWeight: 900, marginBottom: '2px' }}>CARATTERISTICA:</div>
                          <div style={{ color: '#cbd5e1' }}>{pilot.desc || pilot.trait}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {isUnlocked ? (
                          <>
                            <button
                              onClick={() => {
                                try { playSound('click'); } catch (_) {}
                                if (typeof onSelectPilot === 'function') onSelectPilot(pilot.id);
                                showHint(`✓ Pilota ${pilot.name} assegnato alla plancia!`);
                              }}
                              className={`cyber-btn ${isEquipped ? '' : 'cyber-btn-primary'}`}
                              style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                            >
                              {isEquipped ? '✓ IN PLANCIA' : 'EQUIPAGGIA'}
                            </button>

                            {curLvl < 5 && nextUpgrade && (
                              <button
                                onClick={() => {
                                  try { playSound('click'); } catch (_) {}
                                  setUpgradeConfirm({
                                    type: 'pilot',
                                    id: pilot.id,
                                    title: pilot.name,
                                    curLvl,
                                    nextLvl: curLvl + 1,
                                    reqLevel: nextUpgrade.reqLevel || nextUpgrade.reqXP || 1,
                                    cost: {
                                      dust: nextUpgrade.dust || 0,
                                      diamonds: nextUpgrade.dia || nextUpgrade.diamonds || 0,
                                      voidCrystals: nextUpgrade.voidC || nextUpgrade.voidCrystals || 0,
                                      primordialMatter: nextUpgrade.prim || nextUpgrade.primordialMatter || 0
                                    },
                                    currentBonus: `Grado ${curLvl}`,
                                    nextBonus: `Grado ${curLvl + 1}`
                                  });
                                }}
                                className="cyber-btn cyber-btn-warning"
                                style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                              >
                                ⚡ MIGLIORA A GRADO {curLvl + 1} ➔
                              </button>
                            )}
                          </>
                        ) : pilot.isBossReward ? (
                          <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #facc15', borderRadius: '4px', padding: '4px 6px', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.6rem', color: '#fde047', fontWeight: 900 }}>
                              🔒 SBLOCCO DA SETTORE 10 (BOSS P{pilot.unlockBossPlanet})
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              try { playSound('click'); } catch (_) {}
                              if (typeof onUnlockPilot === 'function') onUnlockPilot(pilot.id, pilot.unlockCost || { dust: 200, diamonds: 0 });
                            }}
                            className="cyber-btn cyber-btn-primary"
                            style={{ padding: '0.45rem', fontSize: '0.68rem', fontWeight: 900 }}
                          >
                            Sblocca ({pilot.unlockCost?.diamonds > 0 ? `${pilot.unlockCost.diamonds} 💎` : `${pilot.unlockCost?.dust || 200} 🌟`})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ARMI HARDPOINT (3 LIVELLI TOTALI & IMMAGINI /public/) */}
          {activeTab === 'weapons' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderRarityFilter(weaponRarityFilter, setWeaponRarityFilter)}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                {weaponsDb.filter(w => w && (weaponRarityFilter === 'all' || normalizeRarity(w.rarity) === weaponRarityFilter)).map(wp => {
                  const isPoker = wp.type === 'poker';
                  const curLvl = Math.min(3, Math.max(1, currentWeaponsLevels[wp.id] || 1));
                  const stats = wp.levels?.[curLvl] || wp.levels?.[1] || { damage: 15 };
                  const currentImgSrc = stats.image || wp.levels?.[1]?.image || wp.image;
                  const nextCost = WEAPON_UPGRADE_COSTS[curLvl + 1] || null;
                  const eqSlotIndex = currentEquippedWeapons.indexOf(wp.id);

                  return (
                    <div
                      key={wp.id}
                      className="cyber-panel"
                      style={{
                        padding: '0.65rem',
                        border: eqSlotIndex !== -1 ? '2px solid #00f2fe' : `1.5px solid ${wp.rarityColor || wp.color || '#38bdf8'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        background: 'rgba(15, 23, 42, 0.9)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.55rem', background: wp.rarityColor || wp.color || '#38bdf8', color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {normalizeRarity(wp.rarity)}
                          </span>
                          <span style={{ fontSize: '0.58rem', color: isPoker ? '#facc15' : '#38bdf8', fontWeight: 900 }}>
                            {isPoker ? 'POKER (SLOT 1-2)' : 'CALCOLO (SLOT 3-4)'}
                          </span>
                          <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900 }}>
                            Liv. {curLvl}/3
                          </span>
                        </div>

                        <div
                          onClick={() => setInspectedItem({ type: 'weapon', data: wp, curLvl, eqSlotIndex })}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: '4px 0' }}
                          title="Tocca per ingrandire"
                        >
                          <div style={{ width: '64px', height: '48px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                              src={currentImgSrc}
                              alt={wp.name}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerText = wp.icon || (isPoker ? '🃏' : '⚡');
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <span style={{ fontSize: '0.52rem', color: '#38bdf8', marginTop: '3px', textDecoration: 'underline' }}>
                            🔍 Ingrandisci
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: wp.rarityColor || wp.color || '#fff', textAlign: 'center' }}>
                          {wp.name}
                        </div>

                        <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.4rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', margin: '3px 0', fontSize: '0.62rem', lineHeight: 1.3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', fontWeight: 900 }}>
                            <span>{wp.suitSymbol || ''} {wp.reqDescription}</span>
                            <span style={{ color: '#f87171' }}>⚔ -{stats.damage} HP</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8', marginTop: '2px', fontSize: '0.58rem' }}>
                            <span>📦 Tank: {wp.maxCapacity || 10}</span>
                            <span>❄️ Stop: {wp.maxShots || 2} colpi ({wp.cooldownDuration || 1}T)</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {isPoker ? (
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <button
                              onClick={() => {
                                try { playSound('click'); } catch (_) {}
                                handleEquipWeaponInternal(0, wp.id);
                                showHint(`✓ ${wp.name} equipaggiata nello Slot 1!`);
                              }}
                              className={`cyber-btn ${currentEquippedWeapons[0] === wp.id ? 'cyber-btn-primary' : ''}`}
                              style={{ flex: 1, padding: '0.35rem 2px', fontSize: '0.62rem', fontWeight: 900 }}
                            >
                              {currentEquippedWeapons[0] === wp.id ? '✓ SLOT 1' : 'IN SLOT 1'}
                            </button>
                            <button
                              onClick={() => {
                                try { playSound('click'); } catch (_) {}
                                handleEquipWeaponInternal(1, wp.id);
                                showHint(`✓ ${wp.name} equipaggiata nello Slot 2!`);
                              }}
                              className={`cyber-btn ${currentEquippedWeapons[1] === wp.id ? 'cyber-btn-primary' : ''}`}
                              style={{ flex: 1, padding: '0.35rem 2px', fontSize: '0.62rem', fontWeight: 900 }}
                            >
                              {currentEquippedWeapons[1] === wp.id ? '✓ SLOT 2' : 'IN SLOT 2'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <button
                              onClick={() => {
                                try { playSound('click'); } catch (_) {}
                                handleEquipWeaponInternal(2, wp.id);
                                showHint(`✓ ${wp.name} equipaggiata nello Slot 3!`);
                              }}
                              className={`cyber-btn ${currentEquippedWeapons[2] === wp.id ? 'cyber-btn-primary' : ''}`}
                              style={{ flex: 1, padding: '0.35rem 2px', fontSize: '0.62rem', fontWeight: 900 }}
                            >
                              {currentEquippedWeapons[2] === wp.id ? '✓ SLOT 3' : 'IN SLOT 3'}
                            </button>
                            <button
                              onClick={() => {
                                try { playSound('click'); } catch (_) {}
                                handleEquipWeaponInternal(3, wp.id);
                                showHint(`✓ ${wp.name} equipaggiata nello Slot 4!`);
                              }}
                              className={`cyber-btn ${currentEquippedWeapons[3] === wp.id ? 'cyber-btn-primary' : ''}`}
                              style={{ flex: 1, padding: '0.35rem 2px', fontSize: '0.62rem', fontWeight: 900 }}
                            >
                              {currentEquippedWeapons[3] === wp.id ? '✓ SLOT 4' : 'IN SLOT 4'}
                            </button>
                          </div>
                        )}

                        {curLvl < 3 && nextCost && (
                          <button
                            onClick={() => {
                              try { playSound('click'); } catch (_) {}
                              const nextStats = wp.levels?.[curLvl + 1] || { damage: stats.damage + 4 };
                              setUpgradeConfirm({
                                type: 'weapon',
                                id: wp.id,
                                title: wp.name,
                                curLvl,
                                nextLvl: curLvl + 1,
                                reqLevel: nextCost.reqPilotLevel,
                                cost: nextCost,
                                currentBonus: `Danno per colpo: -${stats.damage} HP`,
                                nextBonus: `Danno per colpo potenziato: -${nextStats.damage} HP`
                              });
                            }}
                            className="cyber-btn cyber-btn-warning"
                            style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                          >
                            ⚡ MIGLIORA A LIV. {curLvl + 1} ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MAZZI */}
          {activeTab === 'decks' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderRarityFilter(deckRarityFilter, setDeckRarityFilter)}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
                {(Array.isArray(allDecks) ? allDecks : []).filter(d => d && (deckRarityFilter === 'all' || normalizeRarity(d.rarity) === deckRarityFilter)).map(deck => {
                  const isStarter = deck.id === 'neutral_starter';
                  const deckData = deckInventory?.[deck.id] || { level: 1, unlocked: isStarter };
                  const isOwned = Boolean(deckData.unlocked);
                  const curLvl = deckData.level || 1;
                  const isEquipped = selectedDeck === deck.id;
                  const maxLvl = deck.maxLevel || 3;
                  const nextCostConfig = UNIFIED_UPGRADE_COSTS[curLvl + 1] || null;
                  const reqPilotLvl = UPGRADE_PILOT_REQS[curLvl + 1] || 1;

                  return (
                    <div key={deck.id} className="cyber-panel" style={{ padding: '0.65rem', border: isEquipped ? '2px solid #00f2fe' : (isOwned ? `1.5px solid ${deck.color}` : '1px dashed rgba(255,255,255,0.2)'), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.55rem', background: deck.color || '#94a3b8', color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {deck.rarity || 'Comune'}
                          </span>
                          {isOwned && <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900 }}>Liv. {curLvl}/{maxLvl}</span>}
                        </div>

                        <div 
                          onClick={() => setInspectedItem({ type: 'deck', data: deck, curLvl, isUnlocked: isOwned, isEquipped })}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: '3px 0' }}
                          title="Tocca per ingrandire"
                        >
                          <TacticalVisual id={deck.id} type="card_back" color={deck.color} width={50} height={75} />
                          <span style={{ fontSize: '0.52rem', color: '#38bdf8', marginTop: '2px', textDecoration: 'underline' }}>
                            🔍 Ingrandisci
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: deck.color, textAlign: 'center' }}>{deck.name}</div>
                        <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.4rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', margin: '3px 0', fontSize: '0.62rem', lineHeight: 1.3 }}>
                          <div style={{ color: '#facc15', fontWeight: 900 }}>PASSIVA:</div>
                          <div style={{ color: '#6ee7b7' }}>{deck.levels?.[curLvl]?.desc || deck.desc}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <button 
                          onClick={() => {
                            if (typeof onSelectDeck === 'function') onSelectDeck(deck.id);
                            if (isOwned) showHint(`✓ Mazzo ${deck.name} equipaggiato!`);
                          }} 
                          className={`cyber-btn ${isEquipped ? '' : (isOwned ? 'cyber-btn-primary' : 'cyber-btn-warning')}`} 
                          style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                        >
                          {isEquipped ? '✓ IN USO' : isOwned ? 'EQUIPAGGIA' : `Sblocca (${deck.unlockCostDiamonds || 10} 💎)`}
                        </button>

                        {isOwned && !isStarter && curLvl < maxLvl && nextCostConfig && (
                          <button 
                            onClick={() => {
                              try { playSound('click'); } catch (_) {}
                              setUpgradeConfirm({
                                type: 'deck',
                                id: deck.id,
                                title: deck.name,
                                curLvl,
                                nextLvl: curLvl + 1,
                                reqLevel: reqPilotLvl,
                                cost: {
                                  dust: nextCostConfig.dust,
                                  diamonds: 0,
                                  voidCrystals: nextCostConfig.voidCrystals || 0,
                                  primordialMatter: nextCostConfig.primordialMatter || 0
                                },
                                currentBonus: deck.levels?.[curLvl]?.desc || 'Passiva base',
                                nextBonus: deck.levels?.[curLvl + 1]?.desc || 'Nuova abilità passiva'
                              });
                            }} 
                            className="cyber-btn cyber-btn-warning" 
                            style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                          >
                            ⚡ MIGLIORA A LIV. {curLvl + 1} ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MODULI */}
          {activeTab === 'abilities' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderRarityFilter(abilityRarityFilter, setAbilityRarityFilter)}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
                {(Array.isArray(allAbilities) ? allAbilities : []).filter(a => a && a.id !== 'neutral_starter').filter(a => abilityRarityFilter === 'all' || normalizeRarity(a.rarity) === abilityRarityFilter).map(ab => {
                  const abData = abilities?.[ab.id] || { level: 1, unlocked: false };
                  const isEquipped = selectedAbility === ab.id;
                  const isOwned = Boolean(abData.unlocked);
                  const curLvl = abData.level || 1;
                  const maxLvl = ab.maxLevel || 3;
                  const nextCostConfig = UNIFIED_UPGRADE_COSTS[curLvl + 1] || null;
                  const reqPilotLvl = UPGRADE_PILOT_REQS[curLvl + 1] || 1;

                  return (
                    <div key={ab.id} className="cyber-panel" style={{ padding: '0.65rem', border: isEquipped ? '2px solid #00f2fe' : (isOwned ? `1.5px solid ${ab.color}` : '1px dashed rgba(255,255,255,0.2)'), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.55rem', background: ab.color, color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {ab.rarity || 'Comune'}
                          </span>
                          {isOwned && <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900 }}>Liv. {curLvl}/{maxLvl}</span>}
                        </div>

                        <div 
                          onClick={() => setInspectedItem({ type: 'ability', data: ab, curLvl, isUnlocked: isOwned, isEquipped })}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: '3px 0' }}
                          title="Tocca per ingrandire"
                        >
                          <ModuleIcon id={ab.id} size={38} color={ab.color} />
                          <span style={{ fontSize: '0.52rem', color: '#38bdf8', marginTop: '2px', textDecoration: 'underline' }}>
                            🔍 Ingrandisci
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: ab.color, textAlign: 'center' }}>{ab.name}</div>
                        <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.4rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', margin: '3px 0', fontSize: '0.62rem', lineHeight: 1.3 }}>
                          <div style={{ color: '#c084fc', fontWeight: 900 }}>POTERE ATTIVO:</div>
                          <div style={{ color: '#cbd5e1' }}>{ab.levels?.[curLvl]?.activeDesc || ab.desc}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {isOwned ? (
                          <>
                            <button 
                              onClick={() => {
                                if (typeof onSelectAbility === 'function') onSelectAbility(ab.id);
                                showHint(`✓ Modulo ${ab.name} equipaggiato!`);
                              }} 
                              className={`cyber-btn ${isEquipped ? '' : 'cyber-btn-primary'}`} 
                              style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                            >
                              {isEquipped ? '✓ IN USO' : 'EQUIPAGGIA'}
                            </button>
                            {curLvl < maxLvl && nextCostConfig && (
                              <button 
                                onClick={() => {
                                  try { playSound('click'); } catch (_) {}
                                  setUpgradeConfirm({
                                    type: 'ability',
                                    id: ab.id,
                                    title: ab.name,
                                    curLvl,
                                    nextLvl: curLvl + 1,
                                    reqLevel: reqPilotLvl,
                                    cost: {
                                      dust: nextCostConfig.dust,
                                      diamonds: 0,
                                      voidCrystals: nextCostConfig.voidCrystals || 0,
                                      primordialMatter: nextCostConfig.primordialMatter || 0
                                    },
                                    currentBonus: ab.levels?.[curLvl]?.activeDesc || 'Potere corrente',
                                    nextBonus: ab.levels?.[curLvl + 1]?.activeDesc || 'Potere amplificato'
                                  });
                                }} 
                                className="cyber-btn cyber-btn-warning" 
                                style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                              >
                                ⚡ MIGLIORA A LIV. {curLvl + 1} ➔
                              </button>
                            )}
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              if (typeof onUnlockAbility === 'function') onUnlockAbility(ab.id);
                            }} 
                            className="cyber-btn cyber-btn-primary" 
                            style={{ padding: '0.4rem', fontSize: '0.68rem', fontWeight: 900 }}
                          >
                            Sblocca ({ab.unlockCostDust || 150} 🌟)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: TERRENI */}
          {activeTab === 'terrain' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderRarityFilter(terrainRarityFilter, setTerrainRarityFilter)}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
                {(Array.isArray(terrainCardsDatabase) ? terrainCardsDatabase : []).filter(c => c && (terrainRarityFilter === 'all' || normalizeRarity(c.rarity) === terrainRarityFilter)).map(card => {
                  const cardData = unlockedTerrainCards?.[card.id];
                  const isOwned = Boolean(cardData?.unlocked);
                  const curLvl = cardData?.level || 1;
                  const activeSlots = (Array.isArray(equippedTerrainSlots) ? equippedTerrainSlots : []).slice(0, 4);
                  const isEquipped = activeSlots.includes(card.id);
                  const nextCost = TERRAIN_UPGRADE_COSTS[curLvl + 1] || null;
                  const nextReqPilot = TERRAIN_PILOT_REQS[curLvl + 1] || 1;

                  return (
                    <div key={card.id} className="cyber-panel" style={{ padding: '0.65rem', border: isEquipped ? '2px solid #00f2fe' : (isOwned ? `1.5px solid ${card.color}` : '1px dashed rgba(255,255,255,0.2)'), display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                          <span style={{ fontSize: '0.55rem', background: card.color, color: '#020617', padding: '1px 5px', borderRadius: '3px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {card.rarity}
                          </span>
                          {isOwned && <span style={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 900 }}>Liv. {curLvl}/3</span>}
                        </div>

                        <div 
                          onClick={() => {
                            setInspectFlipped(false);
                            setInspectedItem({ type: 'terrain', data: card, curLvl, isUnlocked: isOwned, isEquipped });
                          }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', margin: '4px 0' }}
                          title="Tocca per ingrandire e girare"
                        >
                          <TerrainVisual cardId={card.id} color={card.color} width={50} height={75} isBack={false} />
                          <span style={{ fontSize: '0.52rem', color: '#38bdf8', marginTop: '3px', textDecoration: 'underline' }}>
                            🔍 Ingrandisci
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: card.color, textAlign: 'center' }}>{card.name}</div>
                        <div style={{ background: 'rgba(2, 6, 23, 0.75)', padding: '0.4rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.08)', margin: '3px 0', fontSize: '0.62rem', lineHeight: 1.3 }}>
                          <div style={{ color: '#10b981', fontWeight: 900 }}>EFFETTO TRAPPOLA:</div>
                          <div style={{ color: '#cbd5e1' }}>{card.levels?.[curLvl]?.desc || card.desc}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {isOwned ? (
                          <>
                            <button
                              onClick={() => {
                                if (isEquipped) {
                                  try { playSound('click'); } catch (_) {}
                                  const idx = activeSlots.indexOf(card.id);
                                  if (idx !== -1 && typeof onUnequipTerrainSlot === 'function') {
                                    onUnequipTerrainSlot(idx);
                                    showHint(`✕ ${card.name} rimossa dalla plancia.`);
                                  }
                                } else {
                                  let emptyIdx = activeSlots.findIndex(s => s === null);
                                  if (emptyIdx === -1 && activeSlots.length < 4) {
                                    emptyIdx = activeSlots.length;
                                  }
                                  if (emptyIdx !== -1 && emptyIdx < 4 && typeof onEquipTerrainSlot === 'function') {
                                    try { playSound('click'); } catch (_) {}
                                    onEquipTerrainSlot(emptyIdx, card.id);
                                    showHint(`✓ ${card.name} equipaggiata nello Slot ${emptyIdx + 1}!`);
                                  } else {
                                    try { playSound('deselect'); } catch (_) {}
                                    showHint("Tutti i 4 Slot Terreno sono occupati! Rimuovine uno prima.");
                                  }
                                }
                              }}
                              className={`cyber-btn ${isEquipped ? '' : 'cyber-btn-primary'}`}
                              style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                            >
                              {isEquipped ? 'RIMUOVI DA PLANCIA' : 'EQUIPAGGIA IN SLOT'}
                            </button>

                            {curLvl < 3 && nextCost && (
                              <button 
                                onClick={() => {
                                  try { playSound('click'); } catch (_) {}
                                  setUpgradeConfirm({
                                    type: 'terrain',
                                    id: card.id,
                                    title: card.name,
                                    curLvl,
                                    nextLvl: curLvl + 1,
                                    reqLevel: nextReqPilot,
                                    cost: nextCost,
                                    currentBonus: card.levels?.[curLvl]?.desc || 'Effetto base',
                                    nextBonus: card.levels?.[curLvl + 1]?.desc || 'Effetto potenziato con riarmo Etere'
                                  });
                                }} 
                                className="cyber-btn cyber-btn-warning" 
                                style={{ padding: '0.35rem', fontSize: '0.65rem', fontWeight: 900 }}
                              >
                                ⚡ MIGLIORA A LIV. {curLvl + 1} ➔
                              </button>
                            )}
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              if (typeof onBuyTerrainCard === 'function') onBuyTerrainCard(card.id, card.cost);
                            }} 
                            className="cyber-btn cyber-btn-primary" 
                            style={{ padding: '0.4rem', fontSize: '0.68rem', fontWeight: 900 }}
                          >
                            Acquista ({card.cost?.diamonds > 0 ? `${card.cost.diamonds} 💎` : `${card.cost?.dust || 200} 🌟`})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: SFONDI */}
          {activeTab === 'environments' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
              {safeBackgroundsList.map(env => {
                if (!env) return null;
                const isOwned = Boolean(unlockedEnvironments?.[env.id]);
                const isEquipped = equippedEnvironment === env.id;

                return (
                  <div key={env.id} className="cyber-panel" style={{ padding: '0.65rem', border: isEquipped ? '2px solid #00f2fe' : '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#00f2fe' }}>{env.name}</div>
                      <div style={{ fontSize: '0.62rem', color: '#cbd5e1', margin: '3px 0' }}>{env.desc}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                      <button 
                        onClick={() => {
                          try { playSound('click'); } catch (_) {}
                          setPreviewingEnv(env);
                        }} 
                        className="cyber-btn" 
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', fontWeight: 900 }}
                      >
                        🔍 Ingrandisci 3D
                      </button>
                      <button
                        onClick={() => {
                          if (typeof onUnlockOrEquipEnvironment === 'function') {
                            onUnlockOrEquipEnvironment(env.id, env.cost, Boolean(env.planetNum), env.planetNum);
                          }
                          if (isOwned) showHint(`✓ Sfondo ${env.name} equipaggiato!`);
                        }}
                        className={`cyber-btn ${isEquipped ? '' : (isOwned ? 'cyber-btn-primary' : 'cyber-btn-warning')}`}
                        style={{ flex: 1, padding: '0.3rem', fontSize: '0.65rem', fontWeight: 900 }}
                      >
                        {isEquipped ? '✓ IN USO' : isOwned ? 'EQUIPAGGIA' : `Sblocca (${env.cost} 💎)`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 7: RISORSE */}
          {activeTab === 'resources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#00f2fe', fontWeight: 900, marginBottom: '3px' }}>⚡ CREDITI ENERGETICI</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {[
                    { name: '50 ⚡', amount: 50, cost: 3, type: 'credits' },
                    { name: '120 ⚡', amount: 120, cost: 6, type: 'credits' },
                    { name: '300 ⚡', amount: 300, cost: 12, type: 'credits' }
                  ].map((p, i) => (
                    <button key={i} onClick={() => { if (typeof onBuyStorePackage === 'function') onBuyStorePackage(p); }} className="cyber-btn cyber-btn-primary" style={{ padding: '0.45rem 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{p.name}</span>
                      <strong style={{ color: '#fde047' }}>{p.cost} 💎</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 900, marginBottom: '3px' }}>💔 VITE & RIANIMAZIONI</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {[
                    { name: '+1 Vita 💔', amount: 1, cost: 3, type: 'lives' },
                    { name: 'Ricarica Max', amount: 3, cost: 8, type: 'lives' }
                  ].map((p, i) => (
                    <button key={i} onClick={() => { if (typeof onBuyStorePackage === 'function') onBuyStorePackage(p); }} className="cyber-btn" style={{ padding: '0.45rem 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderColor: '#f87171' }}>
                      <span>{p.name}</span>
                      <strong style={{ color: '#fde047' }}>{p.cost} 💎</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#facc15', fontWeight: 900, marginBottom: '3px' }}>🌟 POLVERE STELLARE</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                  {[
                    { name: '+300 🌟', amount: 300, cost: 5, type: 'stardust' },
                    { name: '+800 🌟', amount: 800, cost: 10, type: 'stardust' },
                    { name: '+2.000 🌟', amount: 2000, cost: 20, type: 'stardust' }
                  ].map((p, i) => (
                    <button key={i} onClick={() => { if (typeof onBuyStorePackage === 'function') onBuyStorePackage(p); }} className="cyber-btn cyber-btn-warning" style={{ padding: '0.45rem 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{p.name}</span>
                      <strong style={{ color: '#fff' }}>{p.cost} 💎</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#e879f9', fontWeight: 900, marginBottom: '3px' }}>🔮 ETERE COSMICO</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {[
                    { name: '+3 Etere 🔮', amount: 3, cost: 6, type: 'ether' },
                    { name: '+8 Etere 🔮', amount: 8, cost: 14, type: 'ether' }
                  ].map((p, i) => (
                    <button key={i} onClick={() => { if (typeof onBuyStorePackage === 'function') onBuyStorePackage(p); }} className="cyber-btn cyber-btn-ether" style={{ padding: '0.45rem 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>{p.name}</span>
                      <strong style={{ color: '#fde047' }}>{p.cost} 💎</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 900, marginBottom: '3px' }}>💠 MINERALI SUBSPAZIALI</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                  {[
                    { name: '+2 Cristalli 💠', amount: 2, cost: 10, type: 'void_crystals' },
                    { name: '+1 Materia 🟣', amount: 1, cost: 15, type: 'primordial_matter' }
                  ].map((p, i) => (
                    <button key={i} onClick={() => { if (typeof onBuyStorePackage === 'function') onBuyStorePackage(p); }} className="cyber-btn" style={{ padding: '0.45rem 2px', fontSize: '0.68rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderColor: '#00f2fe' }}>
                      <span style={{ color: '#38bdf8' }}>{p.name}</span>
                      <strong style={{ color: '#fde047' }}>{p.cost} 💎</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ANTEPRIMA SFONDO 3D A SCHERMO INTERO */}
      {previewingEnv && (() => {
        const env = previewingEnv;
        const isPlanet = Boolean(env.planetNum);
        const pNum = env.planetNum || null;
        const isOwned = Boolean(unlockedEnvironments?.[env.id]);
        const isEquipped = equippedEnvironment === env.id;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60000, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(10px, 2vh, 20px)' }}>
            <DeepSpaceUniverseCanvas currentEnvironmentId={env.id} planetNumber={pNum} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
              <div className="cyber-panel" style={{ padding: '0.4rem 0.8rem', background: 'rgba(2, 6, 23, 0.85)', border: '1.5px solid #00f2fe' }}>
                <span style={{ fontSize: '0.75rem', color: '#facc15', fontWeight: 900 }}>ANTEPRIMA SPAZIALE 3D</span>
              </div>
              <button
                onClick={() => setPreviewingEnv(null)}
                className="cyber-btn"
                style={{ background: '#ef4444', borderColor: '#f87171', padding: '0.4rem 0.85rem', fontWeight: 900, zIndex: 10 }}
              >
                ✕ Chiudi
              </button>
            </div>

            <div className="cyber-panel" style={{ padding: '1rem', background: 'rgba(2, 6, 23, 0.92)', border: '1.5px solid #00f2fe', zIndex: 10, maxWidth: '480px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
              <h3 style={{ color: '#00f2fe', margin: '0 0 4px 0', fontWeight: 900, fontSize: '1.2rem' }}>
                {env.name}
              </h3>
              <p style={{ color: '#cbd5e1', fontSize: '0.75rem', margin: '0 0 12px 0' }}>
                {env.desc}
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    if (typeof onUnlockOrEquipEnvironment === 'function') {
                      onUnlockOrEquipEnvironment(env.id, env.cost || 0, isPlanet, pNum);
                    }
                    setPreviewingEnv(null);
                  }}
                  className={`cyber-btn ${isEquipped ? '' : (isOwned ? 'cyber-btn-primary' : 'cyber-btn-warning')}`}
                  style={{ flex: 1.5, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 900 }}
                >
                  {isEquipped ? '✓ GIÀ IN USO' : isOwned ? 'EQUIPAGGIA ORA' : `SBLOCCA (${env.cost || 0} 💎)`}
                </button>
                <button
                  onClick={() => setPreviewingEnv(null)}
                  className="cyber-btn"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Indietro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* OVERLAY ISPEZIONE A SCHERMO INTERO */}
      {inspectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(1, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40000, padding: '1rem' }}>
          <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto', border: '2px solid #00f2fe', boxShadow: '0 0 60px rgba(0, 242, 254, 0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button 
              onClick={() => {
                setInspectedItem(null);
                setInspectFlipped(false);
              }} 
              className="cyber-btn" 
              style={{ position: 'absolute', top: 12, right: 12, background: '#ef4444', borderColor: '#f87171', padding: '0.3rem 0.7rem', fontWeight: 900 }}
            >
              ✕ Chiudi
            </button>

            {/* ISPEZIONE PILOTA */}
            {inspectedItem.type === 'pilot' && (
              <>
                <div style={{ fontSize: '0.7rem', color: inspectedItem.data?.rarityColor || inspectedItem.data?.color, fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
                  SCHEDA PILOTA • {inspectedItem.data?.rarity}
                </div>
                <h2 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                  {inspectedItem.data?.name}
                </h2>
                <div style={{ margin: '8px 0 16px 0' }}>
                  <PilotCard pilot={inspectedItem.data} compact={false} isEquipped={inspectedItem.isEquipped} />
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 900 }}>CARATTERISTICA TATTICA:</div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>{inspectedItem.data?.desc || inspectedItem.data?.trait}</div>
                  {inspectedItem.data?.role && (
                    <div style={{ fontSize: '0.72rem', color: '#facc15', lineHeight: 1.4, borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '6px' }}>
                      <strong>RUOLO:</strong> {inspectedItem.data.role}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ISPEZIONE ARMA */}
            {inspectedItem.type === 'weapon' && (() => {
              const wp = inspectedItem.data;
              if (!wp) return null;
              const isPoker = wp.type === 'poker';
              const curLvl = inspectedItem.curLvl || 1;
              const currentImgSrc = wp.levels?.[curLvl]?.image || wp.levels?.[1]?.image || wp.image;

              return (
                <>
                  <div style={{ fontSize: '0.7rem', color: wp.rarityColor || wp.color || '#38bdf8', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
                    ARMA HARDPOINT • {normalizeRarity(wp.rarity)} • {isPoker ? 'SLOT 1 & 2 (POKER)' : 'SLOT 3 & 4 (CALCOLO)'}
                  </div>
                  <h2 style={{ color: wp.rarityColor || wp.color || '#fff', margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                    {wp.name}
                  </h2>

                  <div style={{ width: '100px', height: '70px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0 12px 0' }}>
                    <img
                      src={currentImgSrc}
                      alt={wp.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerText = wp.icon || (isPoker ? '🃏' : '⚡');
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fde047', fontWeight: 900 }}>
                      <span>{wp.suitSymbol || ''} REQUISITO: {wp.reqDescription}</span>
                      <span style={{ color: '#f87171' }}>LIVELLO ATTUALE: {curLvl}/3</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', background: 'rgba(2, 6, 23, 0.75)', padding: '6px', borderRadius: '6px' }}>
                      <div style={{ color: '#38bdf8', fontSize: '0.7rem' }}>
                        📦 <strong>Serbatoio:</strong> Capienza {wp.maxCapacity || 10} (Salva: {wp.maxSalvo || 4})
                      </div>
                      <div style={{ color: '#38bdf8', fontSize: '0.7rem' }}>
                        ❄️ <strong>Raffreddamento:</strong> {wp.maxShots || 2} colpi prima dello stop ({wp.cooldownDuration || 1}T di fermo)
                      </div>
                    </div>

                    <div style={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                      {isPoker 
                        ? `Figura valida: ${(wp.allowedPatterns || []).join(', ')}. Spara una salva proporzionale alle munizioni del serbatoio.`
                        : `Operazione associata: [${wp.mathOp || '+'}]. Risolvi un bersaglio matematico conforme per fare fuoco.`}
                    </div>

                    <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '6px' }}>
                      <div style={{ fontSize: '0.7rem', color: '#00f2fe', fontWeight: 900, marginBottom: '4px' }}>PROGRESSIONE DEI 3 LIVELLI:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                        {[1, 2, 3].map(lvlIdx => {
                          const lvlStats = wp.levels?.[lvlIdx] || {};
                          const isCurrent = curLvl === lvlIdx;
                          return (
                            <div 
                              key={lvlIdx}
                              style={{ 
                                background: isCurrent ? 'rgba(0, 242, 254, 0.2)' : 'rgba(2, 6, 23, 0.8)',
                                border: isCurrent ? '1.5px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '4px',
                                padding: '4px'
                              }}
                            >
                              <div style={{ fontSize: '0.62rem', fontWeight: 900, color: isCurrent ? '#fde047' : '#94a3b8' }}>
                                L.{lvlIdx} {isCurrent ? '★' : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#f87171' }}>
                                -{lvlStats.damage || 15} HP / colpo
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* ISPEZIONE MAZZO */}
            {inspectedItem.type === 'deck' && (
              <>
                <div style={{ fontSize: '0.7rem', color: inspectedItem.data?.color, fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
                  MAZZO TATTICO • {inspectedItem.data?.rarity || 'COMUNE'}
                </div>
                <h2 style={{ color: inspectedItem.data?.color, margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                  {inspectedItem.data?.name}
                </h2>
                <div style={{ margin: '8px 0 16px 0' }}>
                  <TacticalVisual id={inspectedItem.data?.id} type="card_back" color={inspectedItem.data?.color} width={100} height={150} />
                </div>
                <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.85)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  <div style={{ color: '#facc15', fontWeight: 900, marginBottom: '4px' }}>EFFETTO PASSIVO:</div>
                  {inspectedItem.data?.levels?.[inspectedItem.curLvl]?.desc || inspectedItem.data?.desc}
                </div>
              </>
            )}

            {/* ISPEZIONE MODULO */}
            {inspectedItem.type === 'ability' && (
              <>
                <div style={{ fontSize: '0.7rem', color: inspectedItem.data?.color, fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
                  MODULO ABILITÀ IBRIDO
                </div>
                <h2 style={{ color: inspectedItem.data?.color, margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                  {inspectedItem.data?.name}
                </h2>
                <div style={{ margin: '12px 0 16px 0' }}>
                  <ModuleIcon id={inspectedItem.data?.id} size={90} color={inspectedItem.data?.color} />
                </div>
                <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.85)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  <div style={{ color: '#00f2fe', fontWeight: 900, marginBottom: '4px' }}>POTERE ATTIVO AL 100% DI CARICA:</div>
                  {inspectedItem.data?.levels?.[inspectedItem.curLvl]?.activeDesc || inspectedItem.data?.desc}
                </div>
              </>
            )}

            {/* ISPEZIONE TERRENO */}
            {inspectedItem.type === 'terrain' && (
              <>
                <div style={{ fontSize: '0.7rem', color: inspectedItem.data?.color, fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}>
                  TRAPPOLA BANCO TERRENO • {inspectedItem.data?.rarity}
                </div>
                <h2 style={{ color: inspectedItem.data?.color, margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 900 }}>
                  {inspectedItem.data?.name}
                </h2>

                <div 
                  onClick={() => setInspectFlipped(!inspectFlipped)}
                  style={{ margin: '10px 0 12px 0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  title="Tocca per girare la carta"
                >
                  <TerrainVisual 
                    cardId={inspectedItem.data?.id} 
                    color={inspectedItem.data?.color} 
                    width={100} 
                    height={150} 
                    isBack={inspectFlipped} 
                  />
                  <span style={{ fontSize: '0.62rem', color: '#38bdf8', marginTop: '6px', fontWeight: 900, background: 'rgba(2, 6, 23, 0.8)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 242, 254, 0.4)' }}>
                    🔄 Tocca per vedere il {inspectFlipped ? 'FRONTE' : 'DORSO'}
                  </span>
                </div>

                <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.85)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                  <div style={{ color: '#10b981', fontWeight: 900, marginBottom: '4px' }}>INNESCO AUTOMATICO COPERTO:</div>
                  {inspectedItem.data?.levels?.[inspectedItem.curLvl]?.desc || inspectedItem.data?.desc}
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* MODALE DI CONFERMA MIGLIORAMENTO */}
      {upgradeConfirm && (() => {
        const canAffordDust = stardust >= (upgradeConfirm.cost?.dust || 0);
        const canAffordDiamonds = diamonds >= (upgradeConfirm.cost?.diamonds || 0);
        const canAffordVoid = voidCrystals >= (upgradeConfirm.cost?.voidCrystals || 0);
        const canAffordPrimordial = primordialMatter >= (upgradeConfirm.cost?.primordialMatter || 0);
        const canAffordLevel = !upgradeConfirm.reqLevel || level >= upgradeConfirm.reqLevel;
        const canAffordAll = canAffordDust && canAffordDiamonds && canAffordVoid && canAffordPrimordial && canAffordLevel;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 4, 12, 0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 45000, padding: '1rem' }}>
            <div className="cyber-panel" style={{ padding: '1.25rem', maxWidth: '440px', width: '100%', textAlign: 'center', border: '2px solid #facc15', boxShadow: '0 0 45px rgba(250, 204, 21, 0.55)' }}>
              <div style={{ fontSize: '0.65rem', color: '#facc15', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                CONFERMA POTENZIAMENTO TATTICO
              </div>
              <h3 style={{ color: '#fff', margin: '4px 0 10px 0', fontSize: '1.2rem', fontWeight: 900 }}>
                {upgradeConfirm.title}
              </h3>

              <div style={{ background: 'linear-gradient(135deg, rgba(8, 145, 178, 0.25), rgba(15, 23, 42, 0.9))', border: '1.5px solid #00f2fe', borderRadius: '8px', padding: '8px', marginBottom: '10px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Passaggio di Grado:</span>
                  <strong style={{ fontSize: '0.82rem', color: '#facc15' }}>Liv. {upgradeConfirm.curLvl} ➔ Liv. {upgradeConfirm.nextLvl}</strong>
                </div>

                <div style={{ fontSize: '0.65rem', color: '#cbd5e1', marginBottom: '3px' }}>
                  <span style={{ color: '#94a3b8' }}>Attuale:</span> {upgradeConfirm.currentBonus}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 900 }}>
                  <span>Nuovo:</span> {upgradeConfirm.nextBonus}
                </div>
              </div>

              <div style={{ background: 'rgba(2, 6, 23, 0.85)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px', textAlign: 'left', fontSize: '0.68rem' }}>
                <div style={{ color: '#facc15', fontWeight: 900, marginBottom: '4px' }}>RISORSE RICHIESTE:</div>
                {upgradeConfirm.cost?.dust > 0 && (
                  <div style={{ color: canAffordDust ? '#6ee7b7' : '#f87171', marginBottom: '2px' }}>
                    • Polvere Stellare: <strong>{upgradeConfirm.cost.dust} 🌟</strong> (Disponibile: {stardust})
                  </div>
                )}
                {upgradeConfirm.cost?.diamonds > 0 && (
                  <div style={{ color: canAffordDiamonds ? '#6ee7b7' : '#f87171', marginBottom: '2px' }}>
                    • Diamanti: <strong>{upgradeConfirm.cost.diamonds} 💎</strong> (Disponibili: {diamonds})
                  </div>
                )}
                {upgradeConfirm.cost?.voidCrystals > 0 && (
                  <div style={{ color: canAffordVoid ? '#6ee7b7' : '#f87171', marginBottom: '2px' }}>
                    • Cristalli di Vuoto: <strong>{upgradeConfirm.cost.voidCrystals} 💠</strong> (Disponibili: {voidCrystals})
                  </div>
                )}
                {upgradeConfirm.cost?.primordialMatter > 0 && (
                  <div style={{ color: canAffordPrimordial ? '#6ee7b7' : '#f87171', marginBottom: '2px' }}>
                    • Materia Primordiale: <strong>{upgradeConfirm.cost.primordialMatter} 🟣</strong> (Disponibile: {primordialMatter})
                  </div>
                )}
                {upgradeConfirm.reqLevel > 1 && (
                  <div style={{ color: canAffordLevel ? '#6ee7b7' : '#f87171', marginTop: '2px' }}>
                    • Requisito Pilota: <strong>Livello {upgradeConfirm.reqLevel}</strong> (Tuo Livello: {level})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => setUpgradeConfirm(null)} 
                  className="cyber-btn" 
                  style={{ flex: 1, padding: '0.55rem' }}
                >
                  Annulla
                </button>
                <button
                  disabled={!canAffordAll}
                  onClick={executeConfirmedUpgrade}
                  className="cyber-btn cyber-btn-warning"
                  style={{ flex: 1.6, padding: '0.55rem', fontWeight: 900, fontSize: '0.8rem' }}
                >
                  {canAffordAll ? 'CONFERMA MIGLIORA ➔' : 'RISORSE INSUFFICIENTI'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* OVERLAY GRATIFICAZIONE VISIVA */}
      {dopamineBurst && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50000, pointerEvents: 'none' }}>
          <div className="cyber-panel" style={{ padding: '1.5rem', textAlign: 'center', border: '3px solid #facc15', background: 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, rgba(15, 23, 42, 0.98) 75%)', boxShadow: '0 0 60px rgba(250, 204, 21, 0.85), 0 0 30px #fff', animation: 'spotlightPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 20px #facc15)' }}>⚡</div>
            <div style={{ fontSize: '0.8rem', color: '#fde047', fontWeight: 900, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              OPERAZIONE AVVIATA CON SUCCESSO!
            </div>
            <h1 style={{ color: '#fff', margin: '4px 0', fontSize: '1.5rem', fontWeight: 900, textShadow: '0 0 15px #00f2fe' }}>
              {dopamineBurst.title}
            </h1>
            <div style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: 900, letterSpacing: '1px' }}>
              {dopamineBurst.subtitle}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
