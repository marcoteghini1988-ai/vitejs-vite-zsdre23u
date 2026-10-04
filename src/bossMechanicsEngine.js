// ============================================================================
// MOTORE MECCANICHE SPECIALI BOSS DELLA CAMPAGNA (SETTORE 10: P1 - P20)
// FILE: bossMechanicsEngine.js
// ============================================================================

// Helper interno per la lettura sicura del seme
export const getCardSuit = (card) => {
  if (!card) return null;
  if (card.isJoker || card.suit === 'joker') return 'joker';
  if (typeof card.id === 'string' && card.id.startsWith('joker')) return 'joker';
  if (card.suit) return card.suit;
  if (typeof card.id === 'string') {
    if (card.id.startsWith('hearts') || card.id === 'hearts') return 'hearts';
    if (card.id.startsWith('diamonds') || card.id === 'diamonds') return 'diamonds';
    if (card.id.startsWith('spades') || card.id === 'spades') return 'spades';
    if (card.id.startsWith('clubs') || card.id === 'clubs') return 'clubs';
  }
  return 'hearts';
};

// Verifica se le Carte Terreno sono disabilitate (P16 Custode di Lagrange)
export const isTerrainDisabledForBoss = (planet, level, temporaryTerrainUnlocked = false) => {
  if (level === 10 && planet === 16 && !temporaryTerrainUnlocked) {
    return true;
  }
  return false;
};

/**
 * 1. INTERCETTAZIONE ATTACCO DEL BOSS VERSO IL GIOCATORE
 */
export function onBossAttack({
  planet,
  level,
  rawDamage = 10,
  aiCards = [],
  playerHand = [],
  playerNotches = {},
  currentAiHp = 100,
  playerHp = 50,
  bombReactorCharge = 0,
  bombDamagePool = 0,
  aiDecidesDischarge = true,
  totalAttacksCount = 0,
  centrifugalCharge = 0,
  playerDiscardPile = [],
  aiDiscardPile = [],
  bossPhase = 1,
  ioCycleTurn = 1,
  ioMagmaPool = 0
}) {
  let finalDamage = rawDamage;
  let bossSelfDamage = 0;
  let bossSelfHeal = 0;
  let updatedHand = [...playerHand];
  let updatedBombReactorCharge = bombReactorCharge;
  let updatedBombDamagePool = bombDamagePool;
  let updatedCentrifugalCharge = centrifugalCharge;
  let updatedIoMagmaPool = ioMagmaPool;
  let clearedPlayerDiscards = false;
  let clearedAiDiscards = false;
  let timeDrainSeconds = 0;
  let hpDrainAmount = 0;
  let activatePlayerBurn = false;
  let burnDamagePerSecond = 0;
  let extraBossModuleCharge = 0;
  const floatingTexts = [];
  let popupMessage = null;

  const isCampaignBoss = level === 10;
  if (!isCampaignBoss) {
    return {
      finalDamage,
      bossSelfDamage,
      bossSelfHeal,
      updatedPlayerHand: updatedHand,
      updatedBombReactorCharge,
      updatedBombDamagePool,
      updatedCentrifugalCharge,
      updatedIoMagmaPool,
      clearedPlayerDiscards,
      clearedAiDiscards,
      timeDrainSeconds,
      hpDrainAmount,
      activatePlayerBurn,
      burnDamagePerSecond,
      extraBossModuleCharge,
      floatingTexts,
      popupMessage
    };
  }

  // --- P5: GIOVE (Occhio del Vortice - Convergenza) ---
  if (planet === 5) {
    const spadeCards = aiCards.filter(c => getCardSuit(c) === 'spades');
    if (spadeCards.length > 0) {
      const spadeBonus = spadeCards.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
      finalDamage += spadeBonus;
      floatingTexts.push({ text: `SOVRATENSIONE +${spadeBonus} HP!`, color: '#00f2fe', position: 'top-right' });

      let toElectrify = spadeCards.length;
      updatedHand = updatedHand.map(card => {
        if (toElectrify > 0 && getCardSuit(card) === 'spades' && !card.isElectrified) {
          toElectrify--;
          return {
            ...card,
            isElectrified: true,
            isNewElectrified: true,
            glow: 'rgba(0, 242, 254, 0.95)',
            symbol: '⚡'
          };
        }
        return card;
      });

      popupMessage = `⚡ GIOVE P5 - SOVRATENSIONE!\nLe Picche del Boss infliggono +${spadeBonus} HP extra ed elettrizzano le tue carte Picche!`;
    }
  }

  // --- P7: URANO (Sentinella Ionica - Tris Stellare) ---
  if (planet === 7) {
    const activeNotchesCount = Object.values(playerNotches).filter(Boolean).length;
    if (activeNotchesCount > 0) {
      const parasiteDmg = activeNotchesCount * 3;
      finalDamage += parasiteDmg;
      floatingTexts.push({ text: `PARASSITISMO DADI +${parasiteDmg} HP!`, color: '#06b6d4', position: 'top-right' });
      popupMessage = `🌀 PARASSITISMO QUANTICO!\nUrano assorbe energia dalle tue ${activeNotchesCount} tacche dadi: +${parasiteDmg} HP al colpo!`;
    }
  }

  // --- P9: PLUTONE (Signore delle Ombre - Convergenza) ---
  if (planet === 9 && aiCards.length > 0) {
    const redCardsCount = aiCards.filter(c => {
      const s = getCardSuit(c);
      return s === 'hearts' || s === 'diamonds' || c?.isRed;
    }).length;

    if (redCardsCount >= 2 && currentAiHp > 2) {
      const doubledDamage = rawDamage * 2;
      const isLethal = doubledDamage >= playerHp;
      const isDesperate = currentAiHp <= 50;

      if (isLethal || (isDesperate && Math.random() < 0.85) || Math.random() < 0.45) {
        bossSelfDamage = Math.floor(currentAiHp / 2);
        finalDamage = doubledDamage;

        floatingTexts.push(
          { text: `🩸 PATTO DI SANGUE! DANNO x2 (${doubledDamage} HP)`, color: '#ef4444', position: 'top-right' },
          { text: `-${bossSelfDamage} HP SACRIFICIO`, color: '#64748b', position: 'top-right' }
        );

        popupMessage = `🩸 PATTO DI SANGUE DI PLUTONE!\nPlutone evoca 2 carte rosse e sacrifica ${bossSelfDamage} HP (metà vita):\nil suo attacco raddoppia a -${doubledDamage} HP di Danno Puro!`;
      }
    }
  }

  // --- P12: GANIMEDE (Danno dimezzato sotto il 20% HP) ---
  if (planet === 12 && currentAiHp <= 51) {
    finalDamage = Math.max(1, Math.floor(finalDamage * 0.5));
    floatingTexts.push({ text: 'MAGNETI ALLA DIFESA: DANNO DIMEZZATO (-50%)', color: '#94a3b8', position: 'top-right' });
  }

  // --- P14: PROXIMA B (Reattore a Sovraccarico / Rilascio Contraccolpo - Fase 2 Convergenza) ---
  if (planet === 14 && updatedBombReactorCharge > 0 && updatedBombDamagePool > 0) {
    const shouldDischarge = aiDecidesDischarge || updatedBombReactorCharge >= 99;
    if (shouldDischarge) {
      const recoilExtra = Math.floor((updatedBombDamagePool * updatedBombReactorCharge) / 100);
      finalDamage += recoilExtra;
      floatingTexts.push({ text: `💥 CONTRACCOLPO ENTROPICO +${recoilExtra} HP!`, color: '#6366f1', position: 'top-right' });
      popupMessage = `💥 PROXIMA B - SCARICA DEL REATTORE!\nProxima b rilascia il contraccolpo (${updatedBombReactorCharge}% di ${updatedBombDamagePool} HP): subisci +${recoilExtra} HP extra di Danno Puro!`;
      updatedBombReactorCharge = 0;
      updatedBombDamagePool = 0;
    }
  }

  // --- P15: TRAPPIST-1e (7° Colpo del Match - Assorbimento 20% HP) ---
  if (planet === 15 && totalAttacksCount === 7) {
    hpDrainAmount = Math.max(1, Math.floor(playerHp * 0.20));
    finalDamage += hpDrainAmount;
    floatingTexts.push({ text: `👑 ARMONIA CELESTE: DRENA ${hpDrainAmount} HP (20%)`, color: '#d946ef', position: 'top-right' });
    popupMessage = `👑 7° ATTACCO DEL MATCH - ARMONIA CELESTE!\nL'Arconte dei Sette canalizza il 7° colpo assorbendo il 20% dei tuoi HP attuali (-${hpDrainAmount} HP)!`;
  }

  // --- P16: GLIESE 581g (Sbilanciamento Orbitale: Divario HP > 40) ---
  if (planet === 16) {
    const deltaHp = Math.abs(currentAiHp - playerHp);
    if (deltaHp > 40) {
      finalDamage += 8;
      timeDrainSeconds = 5;
      floatingTexts.push(
        { text: '⚖️ SBILANCIAMENTO GRADIENTE +8 HP!', color: '#0ea5e9', position: 'top-right' },
        { text: '-5s TIMER SERBATOIO', color: '#38bdf8', position: 'bottom-left' }
      );
      popupMessage = `⚖️ GLIESE 581g - ROTTURA DEL PUNTO DI LAGRANGE!\nDivario HP superiore a 40 (|ΔHP| = ${deltaHp}):\nil Custode infligge +8 HP di Danno Puro e prosciuga 5 secondi dal tuo Time Tank!`;
    }
  }

  // --- P17: HAUMEA (Forza Centrifuga al 100% - Scarica delle Pile di Scarto) ---
  if (planet === 17 && updatedCentrifugalCharge >= 100) {
    const getPileSum = (cards = []) => cards.reduce((acc, c) => acc + (Number(c?.value) || 0), 0);
    const sumDiscards = getPileSum(playerDiscardPile) + getPileSum(aiDiscardPile);

    if (sumDiscards > 0) {
      finalDamage += sumDiscards;
      clearedPlayerDiscards = true;
      clearedAiDiscards = true;
      floatingTexts.push({ text: `🌀 COLLASSO DEI DETRITI +${sumDiscards} HP PURO!`, color: '#84cc16', position: 'top-right' });
      popupMessage = `🌀 HAUMEA P17 - FORZA CENTRIFUGA AL 100%!\nLa rotazione estrema fa collassare le pile di scarto:\ntutti i cimiteri combinati vengono proiettati su di te infliggendo -${sumDiscards} HP di Danno Puro!`;
    }
    updatedCentrifugalCharge = 0;
  }

  // --- P18: ERIS (Brace della Discordia / Incendio Residuo) ---
  if (planet === 18) {
    activatePlayerBurn = true;
    burnDamagePerSecond = 2;
    floatingTexts.push({ text: '🔥 BRACE ATTIVA: 2 HP/s AL PROSSIMO TURNO!', color: '#f97316', position: 'top-right' });
    popupMessage = `🔥 ERIS P18 - BRACE DELLA DISCORDIA!\nL'attacco a segno ti avvolge nel fuoco: nel tuo prossimo turno ogni secondo impiegato a pensare ti infliggerà 2 HP di Danno Puro!`;
  }

  // --- P19: IO (Ciclo Magmatico Trifase: T1 / T2 / T3) ---
  if (planet === 19) {
    const cycleStep = ((ioCycleTurn - 1) % 3) + 1;

    if (cycleStep === 1) {
      const stored = Math.round(finalDamage * 0.5);
      updatedIoMagmaPool += stored;
      floatingTexts.push({ text: `🔥 SURRISCALDAMENTO T1: +${stored} HP ACCUMULATI!`, color: '#f97316', position: 'top-right' });
      popupMessage = `🔥 IO P19 - INNESCO TERMICO T1!\nIo sferra il colpo e immagazzina il 50% del danno inflitto (${stored} HP) nel Nucleo Magmatico!`;
    } else if (cycleStep === 2) {
      finalDamage += updatedIoMagmaPool;
      floatingTexts.push({ text: `💥 ERUZIONE MAGMATICA +${updatedIoMagmaPool} HP PURO!`, color: '#ef4444', position: 'top-right' });
      popupMessage = `💥 IO P19 - ERUZIONE TOTALE T2!\nIo scatena il colpo base unito all'intero accumulo magmatico (+${updatedIoMagmaPool} HP di Danno Puro)!`;
      updatedIoMagmaPool = 0;
    } else if (cycleStep === 3) {
      const storedForNext = rawDamage;
      finalDamage = 0;
      updatedIoMagmaPool += storedForNext;
      floatingTexts.push({ text: `❄️ FASE DI GELO T3: 0 DANNI (+${storedForNext} HP AL NUCLEO)`, color: '#38bdf8', position: 'top-right' });
      popupMessage = `❄️ IO P19 - STASI DI GELO T3!\nIo è congelato e non ti infligge danni (0 HP), ma incanala ${storedForNext} HP nel nucleo per il prossimo ciclo!`;
    }
  }

  // --- P20: ENCELADO (Sovrano del Vuoto - Controllo dei 4 Semi per Fase) ---
  if (planet === 20) {
    // Fase 1: Picche (Danno Raddoppiato - Classica)
    if (bossPhase === 1) {
      const hasSpades = aiCards.some(c => getCardSuit(c) === 'spades');
      if (hasSpades) {
        finalDamage = rawDamage * 2;
        floatingTexts.push({ text: `⚔️ DOMINIO DI PICCHE: DANNO x2 (${finalDamage} HP)!`, color: '#00f2fe', position: 'top-right' });
        popupMessage = `⚔️ ENCELADO FASE 1 - GELO ASSOLUTO!\nEncelado colpisce con Picche: il danno dell'attacco raddoppia a -${finalDamage} HP!`;
      }
    }
    // Fase 2: Cuori (Cure Raddoppiate - Vettore)
    else if (bossPhase === 2) {
      const heartCards = aiCards.filter(c => getCardSuit(c) === 'hearts');
      if (heartCards.length > 0) {
        bossSelfHeal = Math.round(30 * heartCards.length * 2);
        floatingTexts.push({ text: `💖 DOMINIO DI CUORI: +${bossSelfHeal} HP CURA (x2)!`, color: '#f43f5e', position: 'top-right' });
        popupMessage = `💖 ENCELADO FASE 2 - SINTESI VITALE!\nEncelado usa Cuori: assorbe calore e rigenera +${bossSelfHeal} HP raddoppiati!`;
      }
    }
    // Fase 3: Fiori (Taglio Secondi del Turno Avversario - Convergenza)
    else if (bossPhase === 3) {
      const clubCards = aiCards.filter(c => getCardSuit(c) === 'clubs');
      if (clubCards.length > 0) {
        const clubsSum = clubCards.reduce((acc, c) => acc + (Number(c?.value) || 0), 0);
        timeDrainSeconds = clubsSum;
        floatingTexts.push({ text: `⏱️ DOMINIO DI FIORI: -${timeDrainSeconds}s AL TUO TIMER!`, color: '#10b981', position: 'bottom-left' });
        popupMessage = `⏱️ ENCELADO FASE 3 - TEMPO CRISTALLIZZATO!\nLe carte Fiori di Encelado prosciugano ${timeDrainSeconds} secondi dal tuo prossimo turno!`;
      }
    }
    // Fase 4: Quadri (Ricarica Modulo Raddoppiata - Tris Stellare)
    else if (bossPhase === 4) {
      const diamondCards = aiCards.filter(c => getCardSuit(c) === 'diamonds');
      if (diamondCards.length > 0) {
        extraBossModuleCharge = diamondCards.length * 4;
        floatingTexts.push({ text: `💎 DOMINIO DI QUADRI: DOPPIA RICARICA MODULO (+${extraBossModuleCharge})!`, color: '#facc15', position: 'top-right' });
        popupMessage = `💎 ENCELADO APOTEOSI - SOVRACCARICO MATERIA!\nLe carte Quadri ricaricano al doppio la barra Modulo di Encelado!`;
      }
    }
  }

  return {
    finalDamage,
    bossSelfDamage,
    bossSelfHeal,
    updatedPlayerHand: updatedHand,
    updatedBombReactorCharge,
    updatedBombDamagePool,
    updatedCentrifugalCharge,
    updatedIoMagmaPool,
    clearedPlayerDiscards,
    clearedAiDiscards,
    timeDrainSeconds,
    hpDrainAmount,
    activatePlayerBurn,
    burnDamagePerSecond,
    extraBossModuleCharge,
    floatingTexts,
    popupMessage
  };
}

/**
 * 2. INTERCETTAZIONE ATTACCO DEL GIOCATORE VERSO IL BOSS
 */
export function onPlayerAttack({
  planet,
  level,
  baseDamage = 10,
  usedCards = [],
  usedOperators = [],
  turnNumber = 1,
  turnSeconds = 10,
  currentIonShield = 0,
  currentTitanArmor = 40,
  currentAiHp = 255,
  currentMagneticShield = 0,
  playerSpadesAccumulated = 0,
  hasTriggeredMagneticShield = false,
  bossAbilityMeter = 0,
  currentHarmonicBarrier = 0,
  activeTargets = [],
  resolvedTarget = null,
  totalAttacksCount = 0,
  playerHp = 100,
  centrifugalCharge = 0,
  bossPhase = 1,
  ioCycleTurn = 1,
  ioMagmaPool = 0,
  isBossImploding = false
}) {
  let finalDamage = baseDamage;
  let reflectedToBoss = 0;
  let newIonShield = currentIonShield;
  let newTitanArmor = currentTitanArmor;
  let newMagneticShield = currentMagneticShield;
  let newHarmonicBarrier = currentHarmonicBarrier;
  let magneticShieldTriggered = hasTriggeredMagneticShield;
  let recoilDamage = 0;
  let playerHeal = 0;
  let bonusTimeSeconds = 0;
  let etherSynthesized = 0;
  let unlockTerrainNextTurn = false;
  let updatedBossAbilityMeter = bossAbilityMeter;
  let updatedCentrifugalCharge = centrifugalCharge;
  let updatedIoMagmaPool = ioMagmaPool;
  let canDoubleAttack = false;
  let extinguishTimeBurn = false;
  let isPureDamage = false;
  let rechargePlayerModule = false;
  const floatingTexts = [];
  let popupMessage = null;

  const isCampaignBoss = level === 10;
  if (!isCampaignBoss) {
    return {
      finalDamage,
      reflectedToBoss,
      newIonShield,
      newTitanArmor,
      newMagneticShield,
      newHarmonicBarrier,
      magneticShieldTriggered,
      recoilDamage,
      playerHeal,
      bonusTimeSeconds,
      etherSynthesized,
      unlockTerrainNextTurn,
      updatedBossAbilityMeter,
      updatedCentrifugalCharge,
      updatedIoMagmaPool,
      canDoubleAttack,
      extinguishTimeBurn,
      isPureDamage,
      rechargePlayerModule,
      floatingTexts,
      popupMessage
    };
  }

  // --- P5: GIOVE (Contromisura Picche Elettrica - Convergenza) ---
  if (planet === 5) {
    usedCards.forEach(c => {
      if (c && c.isElectrified) {
        const reflected = (Number(c.value) || 7) * 2;
        reflectedToBoss += reflected;
        floatingTexts.push({ text: `FULMINE RIFLESSO -${reflected} HP!`, color: '#00f2fe', position: 'top-right' });
        popupMessage = `⚡ RITORNO DI FULMINE!\nHai scaricato la Picche elettrizzata: -${reflected} HP di Danno Puro a Giove!`;
      }
    });
  }

  // --- P7: URANO (Ciclo dei Poli Giorno/Notte & Assorbimento Scudo Ionico - Tris Stellare) ---
  if (planet === 7 && baseDamage > 0) {
    const isDay = (turnNumber % 2 !== 0);
    const redCount = usedCards.filter(c => {
      const s = getCardSuit(c);
      return s === 'hearts' || s === 'diamonds' || c?.isRed;
    }).length;
    const blackCount = usedCards.filter(c => {
      const s = getCardSuit(c);
      return s === 'spades' || s === 'clubs' || c?.isBlack;
    }).length;

    const isAllRed = redCount > 0 && blackCount === 0;
    const isAllBlack = blackCount > 0 && redCount === 0;
    const isMixed = redCount > 0 && blackCount > 0;

    if (isDay) {
      if (isAllRed) {
        finalDamage += 8;
        floatingTexts.push({ text: 'POLO GIORNO: ROSSE PIENE (+8 HP)!', color: '#f43f5e', position: 'top-right' });
      } else if (isMixed) {
        finalDamage = Math.max(5, Math.round(finalDamage * 0.5));
        floatingTexts.push({ text: 'POLO GIORNO: MISTO DIMEZZATO (-50%)', color: '#f59e0b', position: 'top-right' });
      } else {
        finalDamage = 5;
        floatingTexts.push({ text: 'POLO GIORNO: NERE DISPERSE (5 HP FISSI)', color: '#94a3b8', position: 'top-right' });
      }
    } else {
      if (isAllBlack) {
        finalDamage += 8;
        floatingTexts.push({ text: 'POLO NOTTE: NERE PIENE (+8 HP)!', color: '#38bdf8', position: 'top-right' });
      } else if (isMixed) {
        finalDamage = Math.max(5, Math.round(finalDamage * 0.5));
        floatingTexts.push({ text: 'POLO NOTTE: MISTO DIMEZZATO (-50%)', color: '#f59e0b', position: 'top-right' });
      } else {
        finalDamage = 5;
        floatingTexts.push({ text: 'POLO NOTTE: ROSSE DISPERSE (5 HP FISSI)', color: '#94a3b8', position: 'top-right' });
      }
    }

    if (newIonShield > 0) {
      if (finalDamage <= newIonShield) {
        newIonShield -= finalDamage;
        floatingTexts.push({ text: `SCUDO IONICO ASSORBE ${finalDamage} HP`, color: '#06b6d4', position: 'top-right' });
        finalDamage = 0;
      } else {
        finalDamage -= newIonShield;
        floatingTexts.push({ text: `SCUDO IONICO INFRANTO (-${newIonShield} HP)`, color: '#06b6d4', position: 'top-right' });
        newIonShield = 0;
      }
    }
  }

  // --- P10: TITANO (Colosso di Metano - Convergenza) ---
  if (planet === 10) {
    let spadeDamageToArmor = 0;
    usedCards.forEach(c => {
      if (getCardSuit(c) === 'spades') {
        spadeDamageToArmor += (Number(c.value) || 0);
      }
    });

    if (newTitanArmor > 0) {
      if (spadeDamageToArmor > 0) {
        newTitanArmor = Math.max(0, newTitanArmor - spadeDamageToArmor);
        floatingTexts.push({ text: `CORAZZA -${spadeDamageToArmor} HP!`, color: '#facc15', position: 'top-right' });
        if (newTitanArmor === 0) {
          floatingTexts.push({ text: 'CORAZZA DI METANO INFRANTA!', color: '#10b981', position: 'top-right' });
          popupMessage = '🛡️ CORAZZA FRANTUMATA!\nLe Picche hanno distrutto la corazza di Titano: contraccolpo da spine disattivato per sempre!';
        }
      }

      recoilDamage = 5;
      floatingTexts.push({ text: '-5 HP SPINE DI METANO', color: '#ef4444', position: 'bottom-left' });
    }
  }

  // --- P11: IDRA CRIOGENICA (Penetrazione Divisione) ---
  if (planet === 11) {
    if (Array.isArray(usedOperators) && usedOperators.includes('/')) {
      finalDamage += 6;
      isPureDamage = true;
      floatingTexts.push({ text: 'PERFORAZIONE DIVISIONE [/]: +6 HP PURO!', color: '#38bdf8', position: 'top-right' });
    }
  }

  // --- P12: GANIMEDE (Gabbia Ferromagnetica sotto il 20% HP) ---
  if (planet === 12) {
    if (!magneticShieldTriggered && (currentAiHp - finalDamage <= 51)) {
      magneticShieldTriggered = true;
      newMagneticShield = Math.max(15, playerSpadesAccumulated);
      floatingTexts.push({ text: `🧲 SCUDO MAGNETICO +${newMagneticShield} HP!`, color: '#ef4444', position: 'top-right' });
      popupMessage = `🧲 GABBIA FERROMAGNETICA ATTIVATA!\nGanimede scende sotto il 20% HP ed evoca il metallo delle tue Picche:\ngenera uno Scudo da ${newMagneticShield} HP! I suoi attacchi futuri sono dimezzati.`;
    }

    if (newMagneticShield > 0) {
      if (finalDamage <= newMagneticShield) {
        newMagneticShield -= finalDamage;
        floatingTexts.push({ text: `SCUDO MAGNETICO ASSORBE ${finalDamage} HP`, color: '#f87171', position: 'top-right' });
        finalDamage = 0;
      } else {
        finalDamage -= newMagneticShield;
        floatingTexts.push({ text: `SCUDO MAGNETICO INFRANTO (-${newMagneticShield} HP)`, color: '#ef4444', position: 'top-right' });
        newMagneticShield = 0;
      }
    }
  }

  // --- P13: KEPLER-186F (Riflesso d'Onda - Carica Modulo Boss da Danno Inflitto) ---
  if (planet === 13) {
    const gainedMeter = Math.max(1, Math.round(finalDamage * 0.3));
    updatedBossAbilityMeter = Math.min(12, updatedBossAbilityMeter + gainedMeter);
    floatingTexts.push({ text: `RIFLESSO D'ONDA: MODULO BOSS +${gainedMeter}`, color: '#10b981', position: 'top-right' });
  }

  // --- P15: TRAPPIST-1E (Risonanza dei Sette) ---
  if (planet === 15) {
    let sevensCount = 0;

    usedCards.forEach(c => {
      const val = Number(c?.value) || 0;
      const suit = getCardSuit(c);
      const isRed = suit === 'hearts' || suit === 'diamonds' || c?.isRed;
      const isBlack = suit === 'spades' || suit === 'clubs' || c?.isBlack;

      if (val === 7) {
        sevensCount++;
        if (isRed) {
          playerHeal += 7;
          floatingTexts.push({ text: '✨ 7 ROSSO: +7 HP CURA', color: '#10b981', position: 'bottom-left' });
        }
        if (isBlack) {
          finalDamage += 7;
          isPureDamage = true;
          floatingTexts.push({ text: '⚔️ 7 NERO: +7 HP PERFORANTE PURO', color: '#d946ef', position: 'top-right' });
        }
      }
    });

    const rawTarget = resolvedTarget?.target ?? resolvedTarget?.value;
    const targetVal = (rawTarget !== undefined && !isNaN(Number(rawTarget))) ? Number(rawTarget) : null;

    if (targetVal !== null && targetVal % 10 === 7) {
      sevensCount++;
      finalDamage += 7;
      bonusTimeSeconds += 7;
      isPureDamage = true;
      floatingTexts.push({ text: '👑 FREQUENZA 7: +7 HP PURO & +7s TEMPO!', color: '#d946ef', position: 'top-right' });
    }

    const ignoredSevenTarget = (activeTargets || []).some(t => {
      if (t?.type === 'pattern') return false;
      const v = t?.target ?? t?.value;
      if (v === undefined || isNaN(Number(v))) return false;
      const val = Number(v);
      return val % 10 === 7 && val !== targetVal;
    });

    if (ignoredSevenTarget) {
      newHarmonicBarrier += 14;
      floatingTexts.push({ text: '🛡️ BARRIERA ARMONICA BOSS +14 HP', color: '#a855f7', position: 'top-right' });
    }

    if (newHarmonicBarrier > 0) {
      if (finalDamage <= newHarmonicBarrier) {
        newHarmonicBarrier -= finalDamage;
        floatingTexts.push({ text: `BARRIERA ARMONICA ASSORBE ${finalDamage} HP`, color: '#a855f7', position: 'top-right' });
        finalDamage = 0;
      } else {
        finalDamage -= newHarmonicBarrier;
        floatingTexts.push({ text: `BARRIERA ARMONICA INFRANTA (-${newHarmonicBarrier} HP)`, color: '#a855f7', position: 'top-right' });
        newHarmonicBarrier = 0;
      }
    }

    if (turnNumber === 7) {
      if (sevensCount >= 2) {
        reflectedToBoss += 21;
        floatingTexts.push({ text: '⚖️ GIUDIZIO DELL\'ARCONTE: -21 HP PURO AL BOSS!', color: '#10b981', position: 'top-right' });
      } else {
        recoilDamage += 21;
        floatingTexts.push({ text: '⚠️ DISSONANZA TURNO 7: -21 HP SUBITI!', color: '#ef4444', position: 'bottom-left' });
      }
    }

    if (totalAttacksCount === 7) {
      rechargePlayerModule = true;
      finalDamage = Math.round(finalDamage * 1.5);
      floatingTexts.push({ text: '👑 7° COLPO: CRITICO x1.5 & MODULO AL MASSIMO!', color: '#facc15', position: 'top-right' });
    }
  }

  // --- P16: GLIESE 581g (Punto Neutro di Lagrange: Pari + Dispari) ---
  if (planet === 16) {
    const hasEven = usedCards.some(c => (Number(c?.value) || 0) % 2 === 0);
    const hasOdd = usedCards.some(c => (Number(c?.value) || 0) % 2 !== 0);

    if (hasEven && hasOdd) {
      isPureDamage = true;
      etherSynthesized = 2;
      unlockTerrainNextTurn = true;
      floatingTexts.push(
        { text: '⚖️ SPINTA DI LAGRANGE: DANNO PURO!', color: '#0ea5e9', position: 'top-right' },
        { text: '+2 ETERE COSMICO (🔮) & BANCO SBLOCCATO 1T', color: '#38bdf8', position: 'top-right' }
      );
    }
  }

  // --- P17: HAUMEA (Monitoraggio Inerzia sul Timer: Soglia 20 Secondi) ---
  if (planet === 17) {
    if (turnSeconds > 20) {
      const extraSeconds = turnSeconds - 20;
      const chargeGain = extraSeconds * 5;
      updatedCentrifugalCharge = Math.min(100, updatedCentrifugalCharge + chargeGain);
      floatingTexts.push({ text: `🌀 RITARDO TURNO: CENTRIFUGA +${chargeGain}% (${updatedCentrifugalCharge}%)`, color: '#84cc16', position: 'top-right' });
    }
  }

  // --- P18: ERIS (Estinzione Brace / Rigetto dell'Implosione) ---
  if (planet === 18) {
    extinguishTimeBurn = true;
    if (isBossImploding) {
      floatingTexts.push({ text: '💥 IMPLOSIONE DISCORDIA ESTINTA DALL\'ATTACCO', color: '#f97316', position: 'top-right' });
    }
  }

  // --- P19: IO (Ciclo Magmatico Trifase: T2 Assorbimento 50% / T3 Stasi Gelo & Doppio Attacco Dispari) ---
  if (planet === 19) {
    const cycleStep = ((ioCycleTurn - 1) % 3) + 1;

    if (cycleStep === 2) {
      const halfDamage = Math.round(finalDamage * 0.5);
      const stored = finalDamage - halfDamage;
      finalDamage = halfDamage;
      updatedIoMagmaPool += stored;
      floatingTexts.push({ text: `🔥 CORAZZA ROVENTE (-50%): +${stored} HP AL NUCLEO!`, color: '#f97316', position: 'top-right' });
      popupMessage = `🔥 IO P19 - ASSORBIMENTO T2!\nLa corazza rovente di Io dimezza il tuo attacco: il 50% assorbito (${stored} HP) alimenta il suo Nucleo Magmatico!`;
    } else if (cycleStep === 3) {
      const isPattern = resolvedTarget?.type === 'pattern';
      let isOdd = false;
      let displayTarget = '';

      if (isPattern) {
        isOdd = ((resolvedTarget.cardsCount || 0) % 2 !== 0);
        displayTarget = `${resolvedTarget.name} (${resolvedTarget.cardsCount}C)`;
      } else {
        const rawTgt = resolvedTarget?.target ?? resolvedTarget?.value;
        const numTgt = rawTgt !== undefined ? Number(rawTgt) : 0;
        isOdd = !isNaN(numTgt) && numTgt % 2 !== 0;
        displayTarget = String(numTgt);
      }

      if (isOdd) {
        canDoubleAttack = true;
        floatingTexts.push({ text: `❄️ STASI DI GELO: 2° ATTACCO SBLOCCATO!`, color: '#38bdf8', position: 'bottom-left' });
        popupMessage = `❄️ IO P19 - STASI CRIOCLASTICA T3!\nHai risolto un bersaglio Dispari [${displayTarget}]: la plancia rimane aperta per un 2° attacco consecutivo!`;
      }
    }
  }

  return {
    finalDamage,
    reflectedToBoss,
    newIonShield,
    newTitanArmor,
    newMagneticShield,
    newHarmonicBarrier,
    magneticShieldTriggered,
    recoilDamage,
    playerHeal,
    bonusTimeSeconds,
    etherSynthesized,
    unlockTerrainNextTurn,
    updatedBossAbilityMeter,
    updatedCentrifugalCharge,
    updatedIoMagmaPool,
    canDoubleAttack,
    extinguishTimeBurn,
    isPureDamage,
    rechargePlayerModule,
    floatingTexts,
    popupMessage
  };
}

/**
 * 3. INTERCETTAZIONE STALLO / PASSA TURNO DEL BOSS (P18 ERIS & P19 IO)
 */
export function onBossStallOrPass({
  planet,
  level,
  ioCycleTurn = 1,
  ioMagmaPool = 0
}) {
  let bossSelfDamage = 0;
  let activateBossImplosion = false;
  let implosionDamagePerSecond = 0;
  let updatedIoMagmaPool = ioMagmaPool;
  const floatingTexts = [];
  let popupMessage = null;

  if (level !== 10) {
    return {
      bossSelfDamage,
      activateBossImplosion,
      implosionDamagePerSecond,
      updatedIoMagmaPool,
      floatingTexts,
      popupMessage
    };
  }

  // --- P18: ERIS (Implosione da Stallo -> Danno per ogni secondo del giocatore) ---
  if (planet === 18) {
    activateBossImplosion = true;
    implosionDamagePerSecond = 2;
    floatingTexts.push({ text: '💥 ERIS IMPLODE: 2 HP/s AL BOSS NEL PROSSIMO TURNO!', color: '#f97316', position: 'top-right' });
    popupMessage = `💥 ERIS P18 - IMPLOSIONE TERMICA!\nEris non ha trovato combinazioni ed è implosa:\nnel tuo prossimo turno, ogni secondo che impiegherai a pensare le infliggerà 2 HP di Danno Puro!`;
  }

  // --- P19: IO (Rigetto Magmatico al T2 se il Boss va a vuoto) ---
  if (planet === 19) {
    const cycleStep = ((ioCycleTurn - 1) % 3) + 1;
    if (cycleStep === 2 && updatedIoMagmaPool > 0) {
      bossSelfDamage = updatedIoMagmaPool;
      floatingTexts.push({ text: `🌋 RIGETTO MAGMATICO: -${bossSelfDamage} HP A IO!`, color: '#ef4444', position: 'top-right' });
      popupMessage = `🌋 IO P19 - ESPLOSIONE INTERNA!\nIo non ha trovato combinazioni e il magma accumulato (${bossSelfDamage} HP) gli implode contro!`;
      updatedIoMagmaPool = 0;
    }
  }

  return {
    bossSelfDamage,
    activateBossImplosion,
    implosionDamagePerSecond,
    updatedIoMagmaPool,
    floatingTexts,
    popupMessage
  };
}

/**
 * 4. INTERCETTAZIONE DETONAZIONE BERSAGLIO BOMBA (P14 PROXIMA B)
 */
export function onBombDetonation({
  planet,
  level,
  bombDamage = 25,
  currentBombReactorCharge = 0,
  currentBombDamagePool = 0
}) {
  let newBombReactorCharge = currentBombReactorCharge;
  let newBombDamagePool = currentBombDamagePool;
  const floatingTexts = [];
  let popupMessage = null;

  if (level === 10 && planet === 14) {
    newBombReactorCharge = Math.min(100, newBombReactorCharge + 33);
    newBombDamagePool += bombDamage;

    floatingTexts.push({ text: `⚡ REATTORE PROXIMA B +33% (${newBombReactorCharge}%)`, color: '#6366f1', position: 'top-right' });
    popupMessage = `⚡ NUCLEO INSTABILE DETONATO!\nHai inflitto ${bombDamage} HP a Proxima b, ma il suo Reattore assorbe l'onda d'urto:\nCarica Contraccolpo salita a ${newBombReactorCharge}% (Pool Danni: ${newBombDamagePool} HP)!`;
  }

  return {
    newBombReactorCharge,
    newBombDamagePool,
    floatingTexts,
    popupMessage
  };
}

/**
 * 5. INTERCETTAZIONE SCARTO / PASSA TURNO (P11 IDRA CRIOGENICA & P17 HAUMEA)
 */
export function onPlayerDiscardOrPass({
  planet,
  level,
  discardedCard = null,
  currentAiHp = 130,
  maxPhaseHp = 130,
  centrifugalCharge = 0
}) {
  let healedAmount = 0;
  let newAiHp = currentAiHp;
  let updatedCentrifugalCharge = centrifugalCharge;
  const floatingTexts = [];
  let popupMessage = null;

  if (level === 10 && planet === 11 && discardedCard) {
    const cardVal = Number(discardedCard.value) || 0;
    if (cardVal > 0) {
      healedAmount = cardVal;
      newAiHp = Math.min(maxPhaseHp, currentAiHp + healedAmount);
      floatingTexts.push({ text: `+${healedAmount} HP RIGENERAZIONE IDRA`, color: '#10b981', position: 'top-right' });
      popupMessage = `💧 RIGENERAZIONE DELL'IDRA!\nHai sacrificato [${discardedCard.displayVal || cardVal}]: l'Idra assorbe il valore della carta e recupera +${healedAmount} HP!`;
    }
  }

  if (level === 10 && planet === 17) {
    updatedCentrifugalCharge = Math.min(100, updatedCentrifugalCharge + 35);
    floatingTexts.push({ text: `🌀 TURNO PASSATO: CENTRIFUGA +35% (${updatedCentrifugalCharge}%)`, color: '#84cc16', position: 'top-right' });
    popupMessage = `🌀 ESITAZIONE CINETICA!\nPassare il turno accelera la rotazione di Haumea:\nForza Centrifuga aumentata di +35% (Attuale: ${updatedCentrifugalCharge}%)!`;
  }

  return { healedAmount, newAiHp, updatedCentrifugalCharge, floatingTexts, popupMessage };
}

/**
 * 6. INTERCETTAZIONE LANCIO DADI QUANTICI (P7 URANO & P13 KEPLER-186F)
 */
export function onQuantumDiceRoll({
  planet,
  level,
  currentIonShield = 0,
  bossAbilityMeter = 0,
  operatorsRolledCount = 1
}) {
  let newIonShield = currentIonShield;
  let updatedBossAbilityMeter = bossAbilityMeter;
  const floatingTexts = [];
  let popupMessage = null;

  if (level === 10 && planet === 7) {
    newIonShield += 15;
    floatingTexts.push({ text: 'URANO: SCUDO IONICO +15 HP!', color: '#06b6d4', position: 'top-right' });
    popupMessage = "🛡️ URANO P7 - ASSORBIMENTO QUANTICO!\nIl Boss intercetta l'onda d'urto del tuo dado e genera uno Scudo Ionico da 15 HP!";
  }

  if (level === 10 && planet === 13) {
    updatedBossAbilityMeter = Math.min(12, updatedBossAbilityMeter + operatorsRolledCount);
    floatingTexts.push({ text: `RIFLESSO QUANTICO: MODULO BOSS +${operatorsRolledCount}`, color: '#10b981', position: 'top-right' });
  }

  return { newIonShield, updatedBossAbilityMeter, floatingTexts, popupMessage };
}

/**
 * 7. GESTIONE FINE ROUND / FINE TURNO (P5 GIOVE - DISPERSIONE STATICA CALIBRATA)
 */
export function onRoundOrTurnEnd({ planet, level, playerHand = [] }) {
  let selfDamage = 0;
  let updatedHand = [...playerHand];
  const floatingTexts = [];
  let popupMessage = null;

  if (level === 10 && planet === 5) {
    // Si scarica solo se la carta elettrizzata è stata trattenuta per un intero round senza essere giocata
    const retainedElectrified = updatedHand.some(c => c && c.isElectrified && !c.isNewElectrified);
    if (retainedElectrified) {
      selfDamage = 4;
      floatingTexts.push({ text: '-4 HP DISPERSIONE STATICA', color: '#ef4444', position: 'bottom-left' });
      popupMessage = '⚡ DISPERSIONE STATICA (-4 HP)!\nNon hai scaricato la Picche elettrizzata prima della fine del round.';
    }

    // Se è stata appena elettrizzata in questo round, rimuove il flag 'new' conservando l'elettricità per il turno del giocatore
    updatedHand = updatedHand.map(c => {
      if (c && c.isElectrified) {
        if (c.isNewElectrified) {
          return { ...c, isNewElectrified: false };
        }
        return { ...c, isElectrified: false, symbol: '♠', glow: 'rgba(192, 132, 252, 0.85)' };
      }
      return c;
    });
  }

  return { selfDamage, updatedPlayerHand: updatedHand, floatingTexts, popupMessage };
}
