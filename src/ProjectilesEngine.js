// ============================================================================
// PROJECTILES ENGINE: MOTORE GRAFICO CINEMATICO DEI 4 HARDPOINT
// ============================================================================

export const triggerDockHitReaction = (dockElement, intensity = 'normal') => {
  if (!dockElement) return;
  dockElement.classList.remove('bar-hit-flash', 'bar-shiver', 'bar-heavy-recoil');
  void dockElement.offsetWidth; // Forzatura reflow

  dockElement.classList.add('bar-hit-flash');
  dockElement.classList.add(intensity === 'heavy' ? 'bar-heavy-recoil' : 'bar-shiver');

  setTimeout(() => {
    dockElement.classList.remove('bar-hit-flash', 'bar-shiver', 'bar-heavy-recoil');
  }, intensity === 'heavy' ? 320 : 180);
};

export const fireHardpointProjectiles = ({
  weapon,
  level = 1,
  targetDockId = 'classicEnemyHpDock',
  layerId = 'hardpoint-projectiles-layer',
  playSoundFn = () => {}
}) => {
  if (typeof document === 'undefined') return;

  const layer = document.getElementById(layerId);
  const hpDock = document.getElementById(targetDockId);
  if (!layer || !hpDock) return;

  const stats = weapon.levels?.[level] || weapon.levels?.[1] || {};
  const hpRect = hpDock.getBoundingClientRect();
  const targetY = hpRect.top + hpRect.height / 2;
  const targetCenterX = hpRect.left + hpRect.width / 2;
  const weaponColor = weapon.color || '#00f2fe';

  // --------------------------------------------------------------------------
  // 1. FULMINI DAL CIELO / RAGGI ORBITALI (Dall'alto verso la barra)
  // --------------------------------------------------------------------------
  if (weapon.fxType === 'lightning_strike' || weapon.fxType === 'orbital_pillar') {
    const isPillar = weapon.fxType === 'orbital_pillar';
    const count = isPillar ? 1 : (stats.bolts || 2);

    for (let b = 0; b < count; b++) {
      setTimeout(() => {
        try { playSoundFn('cannon_hit'); } catch (_) {}

        const targetX = isPillar ? targetCenterX : (hpRect.left + Math.random() * (hpRect.width - 24) + 12);
        const bolt = document.createElement('div');
        bolt.style.position = 'absolute';
        bolt.style.top = '0';
        bolt.style.left = `${targetX - (isPillar ? 25 : 3)}px`;
        bolt.style.width = isPillar ? '50px' : '6px';
        bolt.style.height = `${targetY}px`;
        bolt.style.background = isPillar
          ? `linear-gradient(180deg, #fff 0%, ${weaponColor} 60%, transparent 100%)`
          : 'linear-gradient(180deg, #fff 0%, #00f2fe 70%, transparent 100%)';
        bolt.style.boxShadow = `0 0 25px ${weaponColor}, 0 0 50px #fff`;
        bolt.style.pointerEvents = 'none';
        bolt.style.zIndex = '999999';
        layer.appendChild(bolt);

        setTimeout(() => {
          bolt.remove();
          triggerDockHitReaction(hpDock, isPillar ? 'heavy' : 'normal');
        }, isPillar ? 650 : 130);
      }, b * 110);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 2. LASER A ROTAIA / TAGLIO ISTANTANEO (Railgun / Taglio a X)
  // --------------------------------------------------------------------------
  if (weapon.fxType === 'railgun_beam' || weapon.fxType === 'cross_laser') {
    try { playSoundFn('arrow_launch'); } catch (_) {}

    const beam = document.createElement('div');
    beam.style.position = 'absolute';
    beam.style.left = `${targetCenterX - 4}px`;
    beam.style.top = `${targetY}px`;
    beam.style.width = '8px';
    beam.style.height = `${window.innerHeight - targetY}px`;
    beam.style.background = `linear-gradient(0deg, transparent 0%, ${weaponColor} 30%, #fff 100%)`;
    beam.style.boxShadow = `0 0 24px ${weaponColor}, 0 0 40px #fff`;
    beam.style.pointerEvents = 'none';
    beam.style.zIndex = '999999';
    layer.appendChild(beam);

    triggerDockHitReaction(hpDock, 'heavy');

    setTimeout(() => {
      beam.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).onfinish = () => beam.remove();
    }, 150);
    return;
  }

  // --------------------------------------------------------------------------
  // 3. SIFONE DI SANGUE (Due fasi: cremisi su, smeraldo giù)
  // --------------------------------------------------------------------------
  if (weapon.fxType === 'blood_siphon') {
    const dards = stats.shots || 3;
    for (let i = 0; i < dards; i++) {
      setTimeout(() => {
        try { playSoundFn('card_slide'); } catch (_) {}
        const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
        const startY = window.innerHeight + 20;
        const targetX = hpRect.left + (Math.random() * (hpRect.width - 20) + 10);

        const orb = document.createElement('div');
        orb.style.position = 'absolute';
        orb.style.width = '14px';
        orb.style.height = '14px';
        orb.style.borderRadius = '50%';
        orb.style.background = 'radial-gradient(circle, #ff4d6d 0%, #c9184a 100%)';
        orb.style.boxShadow = '0 0 16px #ff4d6d';
        layer.appendChild(orb);

        orb.animate([
          { transform: `translate(${startX}px, ${startY}px) scale(1)`, opacity: 1 },
          { transform: `translate(${targetX}px, ${targetY}px) scale(0.6)`, opacity: 1 }
        ], { duration: 280, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
          orb.remove();
          triggerDockHitReaction(hpDock, 'normal');

          // Fase 2: Sfera verde che scende a curare il giocatore
          const healOrb = document.createElement('div');
          healOrb.style.position = 'absolute';
          healOrb.style.width = '12px';
          healOrb.style.height = '12px';
          healOrb.style.borderRadius = '50%';
          healOrb.style.background = 'radial-gradient(circle, #a7f3d0 0%, #10b981 100%)';
          healOrb.style.boxShadow = '0 0 16px #10b981';
          layer.appendChild(healOrb);

          healOrb.animate([
            { transform: `translate(${targetX}px, ${targetY}px)`, opacity: 1 },
            { transform: `translate(${window.innerWidth / 2}px, ${window.innerHeight + 10}px)`, opacity: 0 }
          ], { duration: 320, easing: 'ease-out', fill: 'forwards' }).onfinish = () => healOrb.remove();
        };
      }, i * 60);
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 4. COLPO SINGOLO PESANTE / METEORA / APOCALISSE
  // --------------------------------------------------------------------------
  if (['heavy_cannon', 'meteor_drop', 'apocalypse_torpedo', 'black_hole', 'reactor_bomb'].includes(weapon.fxType)) {
    try { playSoundFn('cannon_hit'); } catch (_) {}

    const isMeteor = weapon.fxType === 'meteor_drop';
    const startX = isMeteor ? window.innerWidth + 30 : window.innerWidth / 2;
    const startY = isMeteor ? -30 : window.innerHeight + 40;
    const targetX = targetCenterX;

    const heavyBall = document.createElement('div');
    heavyBall.style.position = 'absolute';
    heavyBall.style.width = '28px';
    heavyBall.style.height = '28px';
    heavyBall.style.borderRadius = '50%';
    heavyBall.style.background = `radial-gradient(circle at 35% 35%, #ffffff 0%, ${weaponColor} 60%, #000 100%)`;
    heavyBall.style.boxShadow = `0 0 25px ${weaponColor}, 0 0 45px #fff`;
    heavyBall.style.pointerEvents = 'none';
    heavyBall.style.zIndex = '999999';
    layer.appendChild(heavyBall);

    heavyBall.animate([
      { transform: `translate(${startX}px, ${startY}px) scale(1.6)`, opacity: 1 },
      { transform: `translate(${targetX}px, ${targetY}px) scale(0.65)`, opacity: 1 }
    ], {
      duration: 340,
      easing: 'cubic-bezier(0.16, 0.75, 0.35, 1)',
      fill: 'forwards'
    }).onfinish = () => {
      heavyBall.remove();
      triggerDockHitReaction(hpDock, 'heavy');

      // Spark esplosione ad anello
      const shock = document.createElement('div');
      shock.style.position = 'absolute';
      shock.style.left = `${targetX - 25}px`;
      shock.style.top = `${targetY - 25}px`;
      shock.style.width = '50px';
      shock.style.height = '50px';
      shock.style.borderRadius = '50%';
      shock.style.border = `3px solid ${weaponColor}`;
      shock.style.pointerEvents = 'none';
      layer.appendChild(shock);

      shock.animate([
        { transform: 'scale(0.3)', opacity: 1 },
        { transform: 'scale(2.5)', opacity: 0 }
      ], { duration: 250 }).onfinish = () => shock.remove();
    };
    return;
  }

  // --------------------------------------------------------------------------
  // 5. RAFFICA CONTINUA DAL BASSO (Arco-X / Gatling / Dardi Fusi / Microrazzi)
  // --------------------------------------------------------------------------
  const shotsCount = stats.shots || 8;
  const intervalMs = weapon.fxType === 'gatling' ? 22 : 35;
  const flightTimeMs = 280;

  for (let i = 0; i < shotsCount; i++) {
    setTimeout(() => {
      try { playSoundFn('arrow_launch'); } catch (_) {}

      const startX = window.innerWidth / 2 + (Math.random() - 0.5) * 140;
      const startY = window.innerHeight + 35;
      const targetX = hpRect.left + (Math.random() * (hpRect.width - 24) + 12);

      const dx = targetX - startX;
      const dy = targetY - startY;
      const angleRad = Math.atan2(dy, dx) + Math.PI / 2;

      const p = document.createElement('div');
      p.style.position = 'absolute';
      p.style.top = '0';
      p.style.left = '0';
      p.style.width = '5px';
      p.style.height = '34px';
      p.style.marginLeft = '-2.5px';
      p.style.marginTop = '-17px';
      p.style.background = `linear-gradient(180deg, #ffffff 0%, ${weaponColor} 65%, #0284c7 100%)`;
      p.style.boxShadow = `0 0 14px ${weaponColor}, 0 0 6px #fff`;
      p.style.borderRadius = '2px';
      p.style.pointerEvents = 'none';
      p.style.transformOrigin = 'center center';
      p.style.zIndex = '999999';
      layer.appendChild(p);

      p.animate([
        { transform: `translate(${startX}px, ${startY}px) rotate(${angleRad}rad) scale(1.3)`, opacity: 0.95 },
        { transform: `translate(${targetX}px, ${targetY}px) rotate(${angleRad}rad) scale(0.65)`, opacity: 1 }
      ], {
        duration: flightTimeMs,
        easing: 'linear',
        fill: 'forwards'
      }).onfinish = () => {
        p.remove();
        triggerDockHitReaction(hpDock, 'normal');
      };
    }, i * intervalMs);
  }
};