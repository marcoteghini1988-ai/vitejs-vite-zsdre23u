import React, { useState, useEffect, useRef } from 'react';
import { SciFiIcon, TacticalVisual, ModuleIcon, TerrainVisual } from './visualAssets';
import { PILOTS_DATABASE } from './pilotsSystem';
import { playSound } from './audio';

const SUITS = Object.freeze([
  { id: 'hearts', name: 'Cuori', symbol: '', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.85)', sound: 'biotherapy', synergy: '+8% HP Max Cura (+12% Toro)' },
  { id: 'diamonds', name: 'Quadri', symbol: '', color: '#00f2fe', glow: 'rgba(0, 242, 254, 0.85)', sound: 'dust_extract', synergy: '+2 Polvere ' },
  { id: 'spades', name: 'Picche', symbol: '', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.85)', sound: 'suit_spades', synergy: '+3 HP Danno Diretto' },
  { id: 'clubs', name: 'Fiori', symbol: '', color: '#10b981', glow: 'rgba(16, 185, 129, 0.85)', sound: 'suit_clubs', synergy: '+5s Serbatoio Tempo' }
]);

function CornerAceFan({ suitId, selectedDeck, currentDeckObj, corner = 'nw', onClick }) {
  const suitInfo = SUITS.find(s => s.id === suitId) || SUITS[0];
  const isLeft = corner.includes('w');
  const isTop = corner.includes('n');

  const underTransform = `translate(${isLeft ? '-9px' : '9px'}, ${isTop ? '-2px' : '2px'}) rotate(${isLeft ? '-24deg' : '24deg'})`;
  const topTransform = `translate(${isLeft ? '4px' : '-4px'}, ${isTop ? '2px' : '-2px'}) rotate(${isLeft ? '8deg' : '-8deg'})`;

  return (
    <div
      onClick={onClick}
      className={`corner-ace-fan-container fan-${corner}`}
      style={{
        position: 'relative',
        width: '54px',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        pointerEvents: 'auto'
      }}
      title={`Asso di ${suitInfo.name}: ${suitInfo.synergy}`}
    >
      <div 
        className="corner-card-under"
        style={{
          position: 'absolute',
          transform: underTransform,
          zIndex: 1,
          filter: 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.95))',
          pointerEvents: 'none',
          transition: 'transform 0.25s ease'
        }}
      >
        <TacticalVisual
          id={selectedDeck}
          type="card_back"
          color={currentDeckObj?.color || '#38bdf8'}
          glowColor={currentDeckObj?.glow || 'rgba(56, 189, 248, 0.65)'}
          width={30}
          height={44}
        />
      </div>

      <div
        className="corner-card-top fan-ace-card"
        style={{
          position: 'absolute',
          transform: topTransform,
          zIndex: 2,
          width: '28px',
          height: '42px',
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(2, 6, 23, 1) 100%)',
          borderRadius: '5px',
          border: `1.5px solid ${suitInfo.color}`,
          boxShadow: `0 0 12px ${suitInfo.glow}, inset 0 0 6px ${suitInfo.color}44`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1px 3px',
          userSelect: 'none',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.48rem', lineHeight: 1 }}>
          <span style={{ color: '#ffffff', fontWeight: 900 }}>A</span>
          <span style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', lineHeight: 1 }}>
          <span style={{ color: suitInfo.color, textShadow: `0 0 8px ${suitInfo.color}` }}>
            {suitInfo.symbol}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.48rem', lineHeight: 1, transform: 'rotate(180deg)' }}>
          <span style={{ color: '#ffffff', fontWeight: 900 }}>A</span>
          <span style={{ color: suitInfo.color }}>{suitInfo.symbol}</span>
        </div>
      </div>
    </div>
  );
}

export default function HomeScreen({
  nickname = 'Pilota',
  level = 1,
  maxPlayerHp = 100,
  selectedDeck = 'neutral_starter',
  currentDeckObj = {},
  selectedPilot = 'pilot_com_1',
  selectedAbility = '',
  isAbilityModuleUnlocked = false,
  equippedEpicItems = [],
  epicItemsDatabase = [],
  equippedTerrainSlots = [],
  terrainCardsDatabase = [],
  maxUnlockedPlanet = 1,
  currentPlanetLevel = 1,
  currentPlanetName = 'Terra',
  hasCompletedSector1 = false,
  handleQuickResumeRadar = () => {},
  currentGlobalAdventureSector = 1,
  dailyData = null,
  dailyCountdown = '',
  onOpenDailyModal = () => {},
  onOpenLoadout = () => {},
  onOpenShop = () => {},
  onOpenLeaderboard = () => {},
  onOpenBounties = () => {},
  onOpenRules = () => {},
  onOpenSettings = () => {},
  onOpenAdventure = () => {},
  onOpenBetting = () => {},
  onOpenPvP = () => {},
  trophies = 0,
  dailyBountiesState = null,
  triggerPopup = null,
  onOpenDebug = () => {}
}) {
  const [carouselSlide, setCarouselSlide] = useState(0);
  const [subEpicIdx, setSubEpicIdx] = useState(0);
  const [subTerrainIdx, setSubTerrainIdx] = useState(0);
  const [localHint, setLocalHint] = useState(null);

  // Gesture Swipe Carosello
  const touchStartXRef = useRef(null);
  const touchEndXRef = useRef(null);
  const isSwipingRef = useRef(false);

  // Barra inferiore a scorrimento orizzontale
  const bottomScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkBottomScroll = () => {
    if (!bottomScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = bottomScrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkBottomScroll();
    const el = bottomScrollRef.current;
    if (el) el.addEventListener('scroll', checkBottomScroll, { passive: true });
    window.addEventListener('resize', checkBottomScroll);
    return () => {
      if (el) el.removeEventListener('scroll', checkBottomScroll);
      window.removeEventListener('resize', checkBottomScroll);
    };
  }, []);

  const handleSuitClick = (suitId) => {
    const s = SUITS.find(item => item.id === suitId);
    if (!s) return;
    try { playSound(s.sound); } catch (_) {}
    const msg = `${s.symbol} ${s.name}: ${s.synergy}`;
    if (typeof triggerPopup === 'function') {
      triggerPopup(msg);
    } else {
      setLocalHint(msg);
      setTimeout(() => setLocalHint(null), 2500);
    }
  };

  useEffect(() => {
    if (carouselSlide === 3) {
      const timer = setInterval(() => setSubEpicIdx(prev => (prev === 0 ? 1 : 0)), 3000);
      return () => clearInterval(timer);
    } else if (carouselSlide === 4) {
      const timer = setInterval(() => setSubTerrainIdx(prev => (prev + 1) % 4), 3000);
      return () => clearInterval(timer);
    }
  }, [carouselSlide]);

  const claimableBounties = (dailyBountiesState?.bounties || []).filter(b => b && b.completed && !b.claimed).length;

  const handleTouchStart = (e) => {
    touchEndXRef.current = null;
    touchStartXRef.current = e.targetTouches[0].clientX;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
    if (touchStartXRef.current !== null && Math.abs(touchStartXRef.current - touchEndXRef.current) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 35;

    if (distance > minSwipeDistance) {
      try { playSound('card_slide'); } catch (_) {}
      setCarouselSlide(prev => (prev === 4 ? 0 : prev + 1));
    } else if (distance < -minSwipeDistance) {
      try { playSound('card_slide'); } catch (_) {}
      setCarouselSlide(prev => (prev === 0 ? 4 : prev - 1));
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
    setTimeout(() => { isSwipingRef.current = false; }, 50);
  };

  const safePlanetName = (currentPlanetName || 'TERRA').toUpperCase();
  const pilotsList = Array.isArray(PILOTS_DATABASE) ? PILOTS_DATABASE : Object.values(PILOTS_DATABASE || {});
  const curPilot = pilotsList.find(p => p.id === selectedPilot) || pilotsList[0] || { name: 'Pilota Alpha', color: '#10b981' };
  const pilotColor = curPilot.rarityColor || curPilot.color || '#10b981';

  return (
    <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, gap: 'clamp(4px, 1vmin, 10px)', position: 'relative', zIndex: 5, width: '100%', boxSizing: 'border-box' }}>
      
      {localHint && (
        <div className="cyber-panel" style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(2, 6, 23, 0.95)', border: '1.5px solid #00f2fe', padding: '4px 12px', borderRadius: '6px', zIndex: 40, fontSize: 'clamp(0.65rem, 1.6vmin, 0.78rem)', color: '#fff', fontWeight: 900, whiteSpace: 'nowrap', boxShadow: '0 0 16px rgba(0, 242, 254, 0.5)' }}>
          {localHint}
        </div>
      )}

      {/* VANO CENTRALE SENZA SCATOLA */}
      <div 
        id="tour-target-center"
        style={{ 
          flex: '1 1 auto',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          padding: 'clamp(2px, 0.8vmin, 6px)', 
          background: 'transparent', 
          border: 'none', 
          boxShadow: 'none',
          overflow: 'visible', 
          position: 'relative',
          width: '100%',
          minHeight: 0
        }}
      >
        {/* I 4 VENTAGLI D'ANGOLO */}
        <div style={{ position: 'absolute', top: '-4px', left: '-4px', zIndex: 30 }}>
          <CornerAceFan suitId="hearts" corner="nw" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} onClick={() => handleSuitClick('hearts')} />
        </div>
        <div style={{ position: 'absolute', top: '-4px', right: '-4px', zIndex: 30 }}>
          <CornerAceFan suitId="diamonds" corner="ne" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} onClick={() => handleSuitClick('diamonds')} />
        </div>
        <div style={{ position: 'absolute', bottom: '12px', left: '-4px', zIndex: 30 }}>
          <CornerAceFan suitId="spades" corner="sw" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} onClick={() => handleSuitClick('spades')} />
        </div>
        <div style={{ position: 'absolute', bottom: '12px', right: '-4px', zIndex: 30 }}>
          <CornerAceFan suitId="clubs" corner="se" selectedDeck={selectedDeck} currentDeckObj={currentDeckObj} onClick={() => handleSuitClick('clubs')} />
        </div>

        {/* WAYPOINT OLOGRAFICO FLUTTUANTE */}
        <div style={{ margin: '0 auto', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            onClick={hasCompletedSector1 ? handleQuickResumeRadar : onOpenAdventure}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'clamp(5px, 1.2vmin, 8px)',
              padding: '3px 10px',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              userSelect: 'none'
            }}
            title="Tocca per entrare nel settore attivo"
          >
            <span style={{ color: '#00f2fe', fontWeight: 300, fontSize: 'clamp(0.8rem, 2vmin, 1rem)', opacity: 0.7 }}> </span>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#00f2fe',
              boxShadow: '0 0 8px #00f2fe',
              animation: 'coreStellarPulse 2s infinite alternate ease-in-out'
            }} />
            <span style={{
              fontSize: 'clamp(0.68rem, 1.7vmin, 0.82rem)',
              fontWeight: 900,
              color: '#fde047',
              letterSpacing: '0.8px',
              textShadow: '0 0 10px rgba(250, 204, 21, 0.8)'
            }}>
              {hasCompletedSector1 ? `P${maxUnlockedPlanet || 1}   S${Math.min(10, currentPlanetLevel)}` : 'CAMPAGNA'}
            </span>
            <span style={{
              fontSize: 'clamp(0.55rem, 1.4vmin, 0.68rem)',
              color: '#94a3b8',
              fontWeight: 800,
              letterSpacing: '0.5px'
            }}>
              {hasCompletedSector1 ? safePlanetName : 'SETTORE 1'}
            </span>
            <span style={{
              fontSize: 'clamp(0.62rem, 1.5vmin, 0.75rem)',
              color: '#00f2fe',
              fontWeight: 900,
              textShadow: '0 0 8px #00f2fe'
            }}>
              
            </span>
            <span style={{ color: '#00f2fe', fontWeight: 300, fontSize: 'clamp(0.8rem, 2vmin, 1rem)', opacity: 0.7 }}> </span>
          </div>
        </div>

        {/* SFIDA DEL GIORNO */}
        {currentGlobalAdventureSector >= 61 && (
          <div
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenDailyModal(); }}
            className="cyber-panel"
            style={{
              width: 'clamp(140px, 56%, 220px)',
              margin: '2px auto 0 auto',
              padding: '2px 8px',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1.5px solid #facc15',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem' }}></span>
              <div style={{ textAlign: 'left', lineHeight: 1 }}>
                <div style={{ fontSize: 'clamp(0.5rem, 1.3vmin, 0.6rem)', fontWeight: 900, color: '#fde047' }}>SFIDA DEL GIORNO</div>
                <div style={{ fontSize: 'clamp(0.45rem, 1.1vmin, 0.52rem)', color: '#cbd5e1' }}>
                  {dailyData?.hasAttemptedToday ? (dailyData.todayResult?.victory ? ' COMPLETATA' : ' CONSUMATO') : `SCADE: ${dailyCountdown}`}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 'clamp(0.55rem, 1.3vmin, 0.65rem)', fontWeight: 900, color: '#f97316' }}> {dailyData?.streak || 0}</div>
          </div>
        )}

        {/* CAROSELLO CENTRALE A TUTTO CAMPO */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%', 
            margin: 'auto 0', 
            zIndex: 12,
            touchAction: 'pan-y'
          }}
        >
          <div 
            className="trophy-pedestal-container" 
            onClick={() => {
              if (isSwipingRef.current) return;
              try { playSound('click'); } catch (_) {}
              onOpenLoadout();
            }}
            title="Scorri per cambiare carta, tocca per aprire l'Assetto Nave"
            style={{ cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="trophy-beam" />
            
            {/* ALLOGGIAMENTO CARTA STRUTTURALE 78x116 PX */}
            <div className="hero-card-anim" style={{ zIndex: 2, width: 78, height: 116, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* 1. Mazzo Tattico */}
              {carouselSlide === 0 && (
                <TacticalVisual
                  id={selectedDeck}
                  type="card_back"
                  color={currentDeckObj?.color || '#38bdf8'}
                  glowColor={currentDeckObj?.glow || 'rgba(56, 189, 248, 0.6)'}
                  width={78}
                  height={116}
                />
              )}

              {/* 2. Pilota */}
              {carouselSlide === 1 && (
                <div
                  style={{
                    width: 78,
                    height: 116,
                    borderRadius: 6,
                    border: `1.5px solid ${pilotColor}`,
                    boxShadow: `0 0 14px ${pilotColor}77`,
                    background: `linear-gradient(180deg, ${pilotColor}25 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4px 3px',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.48rem', fontWeight: 900, color: pilotColor, lineHeight: 1 }}>
                    <span>PILOTA</span>
                    <span>L.{level}</span>
                  </div>

                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${pilotColor}33 0%, transparent 70%)` }} />
                    <span style={{ fontSize: '2.4rem', filter: `drop-shadow(0 0 10px ${pilotColor})`, lineHeight: 1 }}>
                      {curPilot.avatar || curPilot.icon || curPilot.emoji || ''}
                    </span>
                  </div>

                  <div style={{ width: '100%', background: 'rgba(2, 6, 23, 0.9)', borderTop: `1px solid ${pilotColor}55`, borderRadius: '0 0 4px 4px', padding: '2px 0', textAlign: 'center', lineHeight: 1 }}>
                    <div style={{ fontSize: '0.56rem', fontWeight: 900, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {curPilot.name}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Modulo Abilit  */}
              {carouselSlide === 2 && (() => {
                const abColor = isAbilityModuleUnlocked ? '#00f2fe' : '#ef4444';
                return (
                  <div
                    style={{
                      width: 78,
                      height: 116,
                      background: isAbilityModuleUnlocked
                        ? 'linear-gradient(180deg, rgba(8, 145, 178, 0.35) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)'
                        : 'linear-gradient(180deg, rgba(127, 29, 29, 0.35) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)',
                      border: isAbilityModuleUnlocked ? '1.5px solid #00f2fe' : '1.5px dashed #ef4444',
                      borderRadius: 6,
                      boxShadow: isAbilityModuleUnlocked ? '0 0 14px rgba(0, 242, 254, 0.5)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 3px',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.48rem', fontWeight: 900, color: abColor, lineHeight: 1 }}>
                      <span>MODULO</span>
                      <span>{isAbilityModuleUnlocked ? 'ATTIVO' : 'BLOCCATO'}</span>
                    </div>

                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${abColor}33 0%, transparent 70%)` }} />
                      {isAbilityModuleUnlocked ? (
                        <ModuleIcon id={selectedAbility || 'taurus'} size={52} color="#00f2fe" />
                      ) : (
                        <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 8px #ef4444)' }}></span>
                      )}
                    </div>

                    <div style={{ width: '100%', background: 'rgba(2, 6, 23, 0.9)', borderTop: `1px solid ${abColor}55`, borderRadius: '0 0 4px 4px', padding: '2px 0', textAlign: 'center', lineHeight: 1 }}>
                      <div style={{ fontSize: '0.56rem', fontWeight: 900, color: isAbilityModuleUnlocked ? '#ffffff' : '#f87171', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isAbilityModuleUnlocked ? (selectedAbility ? selectedAbility.toUpperCase() : 'Libero') : 'Settore 9'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 4. Manufatto Epico */}
              {carouselSlide === 3 && (() => {
                const itemId = equippedEpicItems[subEpicIdx];
                const itemObj = itemId ? epicItemsDatabase.find(e => e.id === itemId) : null;
                const epicColor = itemObj ? itemObj.color : '#facc15';
                return (
                  <div
                    style={{
                      width: 78,
                      height: 116,
                      background: itemObj
                        ? `linear-gradient(180deg, ${epicColor}30 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)`
                        : 'linear-gradient(180deg, rgba(234, 179, 8, 0.15) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)',
                      border: itemObj ? `1.5px solid ${epicColor}` : '1.5px dashed #facc15',
                      borderRadius: 6,
                      boxShadow: itemObj ? `0 0 14px ${epicColor}66` : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 3px',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.48rem', fontWeight: 900, color: epicColor, lineHeight: 1 }}>
                      <span>MANUFATTO</span>
                      <span>{subEpicIdx + 1}/2</span>
                    </div>

                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${epicColor}33 0%, transparent 70%)` }} />
                      {itemObj ? (
                        <TacticalVisual id={itemObj.id} type="epic_item" color={itemObj.color} width={58} height={58} />
                      ) : (
                        <SciFiIcon name="epic_item" size={44} color="#facc15" />
                      )}
                    </div>

                    <div style={{ width: '100%', background: 'rgba(2, 6, 23, 0.9)', borderTop: `1px solid ${epicColor}55`, borderRadius: '0 0 4px 4px', padding: '2px 0', textAlign: 'center', lineHeight: 1 }}>
                      <div style={{ fontSize: '0.56rem', fontWeight: 900, color: itemObj ? '#ffffff' : '#fde047', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {itemObj ? (itemObj.name || '').split(' ')[0] : 'Slot Libero'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. Trappola Terreno */}
              {carouselSlide === 4 && (() => {
                const tId = equippedTerrainSlots[subTerrainIdx];
                const card = tId ? terrainCardsDatabase.find(c => c.id === tId) : null;
                if (card) {
                  return <TerrainVisual cardId={card.id} color={card.color} width={78} height={116} />;
                }
                return (
                  <div
                    style={{
                      width: 78,
                      height: 116,
                      background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(2, 6, 23, 1) 100%)',
                      border: '1.5px dashed #10b981',
                      borderRadius: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 3px',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.48rem', fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                      <span>TRAPPOLA</span>
                      <span>{subTerrainIdx + 1}/4</span>
                    </div>

                    <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.8rem', color: '#64748b' }}></span>
                    </div>

                    <div style={{ width: '100%', background: 'rgba(2, 6, 23, 0.9)', borderTop: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '0 0 4px 4px', padding: '2px 0', textAlign: 'center', lineHeight: 1 }}>
                      <div style={{ fontSize: '0.56rem', fontWeight: 900, color: '#6ee7b7' }}>Slot Libero</div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* VORTICE A 3 STRATI */}
            <div className="trophy-base-platform">
              <div className="trophy-base-ring">
                <div className="trophy-base-core" />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 3, zIndex: 2 }}>
              <div style={{ fontSize: 'clamp(0.6rem, 1.5vmin, 0.72rem)', fontWeight: 900, color: '#facc15' }}>
                {carouselSlide === 0 && ` Mazzo: ${currentDeckObj?.name || 'Cadetto'}`}
                {carouselSlide === 1 && ` Pilota: ${curPilot.name || 'Pilota'}`}
                {carouselSlide === 2 && ` Modulo: ${isAbilityModuleUnlocked ? (selectedAbility?.toUpperCase() || 'Nessuno') : 'Bloccato'}`}
                {carouselSlide === 3 && ` Manufatto [${subEpicIdx + 1}/2]: ${equippedEpicItems[subEpicIdx] ? (epicItemsDatabase.find(e => e.id === equippedEpicItems[subEpicIdx])?.name?.split(' ')[0] || 'Epico') : 'Vuoto'}`}
                {carouselSlide === 4 && ` Trappola [${subTerrainIdx + 1}/4]: ${equippedTerrainSlots[subTerrainIdx] ? (terrainCardsDatabase.find(c => c.id === equippedTerrainSlots[subTerrainIdx])?.name?.split(' ')[0] || 'Armata') : 'Libera'}`}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* BARRA INFERIORE: DOCK CON 7 COMANDI A SCORRIMENTO TOUCH CON FRECCE DINAMICHE */}
      <div id="tour-target-bottom" style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
        
        {/* Freccia sinistra */}
        {canScrollLeft && (
          <div 
            onClick={() => {
              if (bottomScrollRef.current) bottomScrollRef.current.scrollBy({ left: -140, behavior: 'smooth' });
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '24px',
              background: 'linear-gradient(to right, rgba(2, 6, 23, 0.95), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: '2px',
              zIndex: 20,
              color: '#00f2fe',
              fontSize: '1rem',
              fontWeight: 900,
              cursor: 'pointer',
              textShadow: '0 0 8px #00f2fe'
            }}
          >
             
          </div>
        )}

        {/* Freccia destra */}
        {canScrollRight && (
          <div 
            onClick={() => {
              if (bottomScrollRef.current) bottomScrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
            }}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '24px',
              background: 'linear-gradient(to left, rgba(2, 6, 23, 0.95), transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '2px',
              zIndex: 20,
              color: '#00f2fe',
              fontSize: '1rem',
              fontWeight: 900,
              cursor: 'pointer',
              textShadow: '0 0 8px #00f2fe'
            }}
          >
             
          </div>
        )}

        {/* Traccia di Scorrimento Touch */}
        <div 
          ref={bottomScrollRef}
          style={{
            display: 'flex',
            gap: 'clamp(4px, 1vmin, 8px)',
            overflowX: 'auto',
            padding: '2px 4px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* 1. Campagna */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenAdventure(); }}
            className="cyber-btn cyber-btn-primary"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <SciFiIcon name="campaign" size={13} color="#fff" /> Campagna
            </span>
            <span style={{ fontSize: '0.5rem', color: '#bae6fd', fontWeight: 'normal' }}>200 Settori</span>
          </button>

          {/* 2. Scommesse */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenBetting(); }}
            className="cyber-btn cyber-btn-warning"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <SciFiIcon name="hazard" size={13} color="#fff" /> Scommesse
            </span>
            <span style={{ fontSize: '0.5rem', color: '#fde68a', fontWeight: 'normal' }}>Banco PvE</span>
          </button>

          {/* 3. Duello 1v1 */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenPvP(); }}
            className="cyber-btn cyber-btn-ether"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <SciFiIcon name="hazard" size={13} color="#fff" /> Duello 1v1
            </span>
            <span style={{ fontSize: '0.5rem', color: '#f5d0fe', fontWeight: 'normal' }}>Online</span>
          </button>

          {/* 4. Assetto Nave */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenLoadout(); }}
            className="cyber-btn"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', borderColor: '#00f2fe' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#00f2fe' }}>
              <span style={{ fontSize: '0.82rem', lineHeight: 1 }}></span> Assetto
            </span>
            <span style={{ fontSize: '0.5rem', color: '#cbd5e1', fontWeight: 'normal' }}>Armamenti</span>
          </button>

          {/* 5. Shop */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenShop(); }}
            className="cyber-btn"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', borderColor: '#38bdf8' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#38bdf8' }}>
              <SciFiIcon name="shop_cart" size={13} color="#38bdf8" /> Shop
            </span>
            <span style={{ fontSize: '0.5rem', color: '#cbd5e1', fontWeight: 'normal' }}>Bazar</span>
          </button>

          {/* 6. Missioni */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenBounties(); }}
            className="cyber-btn"
            style={{ flexShrink: 0, minWidth: '95px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', borderColor: claimableBounties > 0 ? '#10b981' : 'rgba(255,255,255,0.2)', position: 'relative' }}
          >
            {claimableBounties > 0 && (
              <div style={{ position: 'absolute', top: '2px', right: '4px', background: '#10b981', color: '#fff', fontSize: '0.45rem', fontWeight: 900, borderRadius: '50%', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {claimableBounties}
              </div>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: claimableBounties > 0 ? '#34d399' : '#fff' }}>
              <SciFiIcon name="database" size={13} color={claimableBounties > 0 ? '#34d399' : '#fff'} /> Missioni
            </span>
            <span style={{ fontSize: '0.5rem', color: '#cbd5e1', fontWeight: 'normal' }}>Contratti</span>
          </button>

          {/* 7. TEST (Debug) */}
          <button
            onClick={() => { try { playSound('click'); } catch (_) {} onOpenDebug(); }}
            className="cyber-btn"
            style={{ flexShrink: 0, minWidth: '75px', padding: 'clamp(6px, 1.4vmin, 10px) 4px', fontSize: 'clamp(0.65rem, 1.5vmin, 0.78rem)', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', borderColor: '#ef4444', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
               TEST
            </span>
            <span style={{ fontSize: '0.5rem', color: '#f87171', fontWeight: 'normal' }}>Debug</span>
          </button>

        </div>
      </div>

    </div>
  );
}
