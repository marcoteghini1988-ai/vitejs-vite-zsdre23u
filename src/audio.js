// 2.0 MOTORE AUDIO SINTETICO PROCEDURALE AVANZATO (WEB AUDIO API & SYNTHWAVE)
let audioCtx = null;
let masterLimiterNode = null;
let bgmGainNode = null;
let sfxGainNode = null;
let delayBusNode = null;

let currentBgmTrack = null;
let bgmSchedulerTimer = null;
let bgmStep = 0;
let bgmNextStepTime = 0;

let isMutedBGM = typeof window !== 'undefined' ? localStorage.getItem('eclissi_muted_bgm') === 'true' : false;
let isMutedSFX = typeof window !== 'undefined' ? localStorage.getItem('eclissi_muted_sfx') === 'true' : false;

const initAudio = () => {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();

      // Master Limiter a protezione contro saturazione (Zero-Clipping Headroom)
      masterLimiterNode = audioCtx.createDynamicsCompressor();
      masterLimiterNode.threshold.setValueAtTime(-12, audioCtx.currentTime);
      masterLimiterNode.knee.setValueAtTime(10, audioCtx.currentTime);
      masterLimiterNode.ratio.setValueAtTime(8, audioCtx.currentTime);
      masterLimiterNode.attack.setValueAtTime(0.003, audioCtx.currentTime);
      masterLimiterNode.release.setValueAtTime(0.12, audioCtx.currentTime);

      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.setValueAtTime(isMutedBGM ? 0.0001 : 0.45, audioCtx.currentTime);

      sfxGainNode = audioCtx.createGain();
      sfxGainNode.gain.setValueAtTime(isMutedSFX ? 0.0001 : 0.65, audioCtx.currentTime);

      // Delay Bus Spaziale
      delayBusNode = audioCtx.createDelay();
      delayBusNode.delayTime.setValueAtTime(0.28, audioCtx.currentTime);

      const delayFeedback = audioCtx.createGain();
      delayFeedback.gain.setValueAtTime(0.35, audioCtx.currentTime);

      const delayFilter = audioCtx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(2400, audioCtx.currentTime);

      delayBusNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayBusNode);
      delayBusNode.connect(masterLimiterNode);

      bgmGainNode.connect(masterLimiterNode);
      sfxGainNode.connect(masterLimiterNode);
      masterLimiterNode.connect(audioCtx.destination);
    }
  }

  // Risveglio immediato se sospeso dalle policy browser
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
};

// Listener globale: risveglia l'audio al primo tocco/click in qualunque punto della schermata
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'running') {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

const setMuteBGM = (muted) => {
  isMutedBGM = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('eclissi_muted_bgm', muted.toString());
  }
  if (bgmGainNode && audioCtx) {
    bgmGainNode.gain.setValueAtTime(muted ? 0.0001 : 0.45, audioCtx.currentTime);
  }
  if (muted) {
    stopBGM();
  }
};

const setMuteSFX = (muted) => {
  isMutedSFX = muted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('eclissi_muted_sfx', muted.toString());
  }
  if (sfxGainNode && audioCtx) {
    sfxGainNode.gain.setValueAtTime(muted ? 0.0001 : 0.65, audioCtx.currentTime);
  }
};

const toggleMuteBGM = () => {
  const next = !isMutedBGM;
  setMuteBGM(next);
  return next;
};

const toggleMuteSFX = () => {
  const next = !isMutedSFX;
  setMuteSFX(next);
  return next;
};

// --- SINTETIZZATORI BGM DEDICATI & NOTE FREQUENZE (SYNTHWAVE ADRENALINICO) ---
const BGM_NOTES = {
  C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, Ab2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50,
  _: 0
};

const bgmPlayWarmPad = (freqs, time, dur) => {
  if (!audioCtx || !bgmGainNode) return;
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, time);
    osc.detune.setValueAtTime(i % 2 === 0 ? 4 : -4, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.035, time + (dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGainNode);
    if (delayBusNode) gain.connect(delayBusNode);

    osc.start(time);
    osc.stop(time + dur);
  });
};

const bgmPlayCyberBass = (freq, time, dur) => {
  if (!audioCtx || !bgmGainNode || !freq) return;
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, time);
  filter.frequency.exponentialRampToValueAtTime(180, time + dur);

  gain.gain.setValueAtTime(0.24, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGainNode);

  osc.start(time);
  osc.stop(time + dur);
};

const bgmPlayArpLead = (freq, time, dur) => {
  if (!audioCtx || !bgmGainNode || !freq) return;
  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.09, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGainNode);
  if (delayBusNode) gain.connect(delayBusNode);

  osc.start(time);
  osc.stop(time + dur);
};

const bgmPlayKick = (time) => {
  if (!audioCtx || !bgmGainNode) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.frequency.setValueAtTime(140, time);
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.1);

  gain.gain.setValueAtTime(0.55, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

  osc.connect(gain);
  gain.connect(bgmGainNode);
  osc.start(time);
  osc.stop(time + 0.18);
};

const bgmPlaySnare = (time) => {
  if (!audioCtx || !bgmGainNode) return;
  const bufferSize = audioCtx.sampleRate * 0.14;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, time);
  filter.Q.setValueAtTime(2.0, time);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.24, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGainNode);
  noise.start(time);
  noise.stop(time + 0.14);
};

const bgmPlayHiHat = (time) => {
  if (!audioCtx || !bgmGainNode) return;
  const bufferSize = audioCtx.sampleRate * 0.04;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(7000, time);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(bgmGainNode);
  noise.start(time);
  noise.stop(time + 0.04);
};

// --- LE 4 TRACCE BGM PROCEDURALI ADRENALINICHE A 32 STEP ---
const BGM_TRACKS = {
  // 1. MENU & MAPPA: Stardust Odyssey (92 BPM)
  menu: {
    stepTime: 0.163,
    length: 32,
    chords: [
      { step: 0, freqs: [BGM_NOTES.F3, BGM_NOTES.A3, BGM_NOTES.C4, BGM_NOTES.E4], dur: 2.5 },
      { step: 8, freqs: [BGM_NOTES.G3, BGM_NOTES.B3, BGM_NOTES.D4, BGM_NOTES.G4], dur: 2.5 },
      { step: 16, freqs: [BGM_NOTES.E3, BGM_NOTES.G3, BGM_NOTES.B3, BGM_NOTES.D4], dur: 2.5 },
      { step: 24, freqs: [BGM_NOTES.A3, BGM_NOTES.C4, BGM_NOTES.E4, BGM_NOTES.G4], dur: 2.5 }
    ],
    bass: [
      BGM_NOTES.F2, BGM_NOTES._, BGM_NOTES._, BGM_NOTES._, BGM_NOTES.F2, BGM_NOTES._, BGM_NOTES.C3, BGM_NOTES._,
      BGM_NOTES.G2, BGM_NOTES._, BGM_NOTES._, BGM_NOTES._, BGM_NOTES.G2, BGM_NOTES._, BGM_NOTES.D3, BGM_NOTES._,
      BGM_NOTES.E2, BGM_NOTES._, BGM_NOTES._, BGM_NOTES._, BGM_NOTES.E2, BGM_NOTES._, BGM_NOTES.B2, BGM_NOTES._,
      BGM_NOTES.A2, BGM_NOTES._, BGM_NOTES._, BGM_NOTES._, BGM_NOTES.A2, BGM_NOTES._, BGM_NOTES.E3, BGM_NOTES._
    ],
    arp: [
      BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.G5, BGM_NOTES.E5, BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.G5, BGM_NOTES.E5,
      BGM_NOTES.B4, BGM_NOTES.D5, BGM_NOTES.G5, BGM_NOTES.D5, BGM_NOTES.B4, BGM_NOTES.D5, BGM_NOTES.G5, BGM_NOTES.D5,
      BGM_NOTES.B4, BGM_NOTES.E5, BGM_NOTES.G5, BGM_NOTES.E5, BGM_NOTES.B4, BGM_NOTES.E5, BGM_NOTES.G5, BGM_NOTES.E5,
      BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.A5, BGM_NOTES.E5, BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.A5, BGM_NOTES.E5
    ],
    kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]
  },

  // 2. BATTAGLIA: Cyber Strike (124 BPM)
  battle: {
    stepTime: 0.121,
    length: 32,
    chords: [],
    bass: [
      BGM_NOTES.A2, BGM_NOTES.A2, BGM_NOTES.C3, BGM_NOTES.A2, BGM_NOTES.E3, BGM_NOTES.A2, BGM_NOTES.C3, BGM_NOTES.A2,
      BGM_NOTES.F2, BGM_NOTES.F2, BGM_NOTES.A2, BGM_NOTES.F2, BGM_NOTES.C3, BGM_NOTES.F2, BGM_NOTES.A2, BGM_NOTES.F2,
      BGM_NOTES.C2, BGM_NOTES.C2, BGM_NOTES.E2, BGM_NOTES.C2, BGM_NOTES.G2, BGM_NOTES.C2, BGM_NOTES.E2, BGM_NOTES.C2,
      BGM_NOTES.G2, BGM_NOTES.G2, BGM_NOTES.B2, BGM_NOTES.G2, BGM_NOTES.D3, BGM_NOTES.G2, BGM_NOTES.B2, BGM_NOTES.G2
    ],
    arp: [
      BGM_NOTES.E4, BGM_NOTES.A4, BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.C5, BGM_NOTES.A4, BGM_NOTES.E4, BGM_NOTES.A4,
      BGM_NOTES.C5, BGM_NOTES.E5, BGM_NOTES.A5, BGM_NOTES.E5, BGM_NOTES.C5, BGM_NOTES.A4, BGM_NOTES.C5, BGM_NOTES.E5,
      BGM_NOTES.F4, BGM_NOTES.A4, BGM_NOTES.C5, BGM_NOTES.F5, BGM_NOTES.C5, BGM_NOTES.A4, BGM_NOTES.F4, BGM_NOTES.A4,
      BGM_NOTES.C5, BGM_NOTES.F5, BGM_NOTES.A5, BGM_NOTES.F5, BGM_NOTES.C5, BGM_NOTES.A4, BGM_NOTES.C5, BGM_NOTES.F5
    ],
    kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
  },

  // 3. DUELLO PvP: Hyperdrive Duel (134 BPM)
  pvp: {
    stepTime: 0.112,
    length: 32,
    chords: [],
    bass: [
      BGM_NOTES.D2, BGM_NOTES.D2, BGM_NOTES.F2, BGM_NOTES.D2, BGM_NOTES.A2, BGM_NOTES.D2, BGM_NOTES.F2, BGM_NOTES.D2,
      BGM_NOTES.Bb1, BGM_NOTES.Bb1, BGM_NOTES.D2, BGM_NOTES.Bb1, BGM_NOTES.F2, BGM_NOTES.Bb1, BGM_NOTES.D2, BGM_NOTES.Bb1,
      BGM_NOTES.F1, BGM_NOTES.F1, BGM_NOTES.A1, BGM_NOTES.F1, BGM_NOTES.C2, BGM_NOTES.F1, BGM_NOTES.A1, BGM_NOTES.F1,
      BGM_NOTES.C2, BGM_NOTES.C2, BGM_NOTES.E2, BGM_NOTES.C2, BGM_NOTES.G2, BGM_NOTES.C2, BGM_NOTES.E2, BGM_NOTES.C2
    ],
    arp: [
      BGM_NOTES.F4, BGM_NOTES.A4, BGM_NOTES.D5, BGM_NOTES.F5, BGM_NOTES.D5, BGM_NOTES.A4, BGM_NOTES.F4, BGM_NOTES.A4,
      BGM_NOTES.D5, BGM_NOTES.F5, BGM_NOTES.A5, BGM_NOTES.F5, BGM_NOTES.D5, BGM_NOTES.A4, BGM_NOTES.D5, BGM_NOTES.F5,
      BGM_NOTES.D4, BGM_NOTES.F4, BGM_NOTES.Bb4, BGM_NOTES.D5, BGM_NOTES.Bb4, BGM_NOTES.F4, BGM_NOTES.D4, BGM_NOTES.F4,
      BGM_NOTES.Bb4, BGM_NOTES.D5, BGM_NOTES.F5, BGM_NOTES.D5, BGM_NOTES.Bb4, BGM_NOTES.F4, BGM_NOTES.Bb4, BGM_NOTES.D5
    ],
    kick: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
  },

  // 4. BOSS FINALE: Singolarità Suprema (116 BPM)
  boss: {
    stepTime: 0.129,
    length: 32,
    chords: [],
    bass: [
      BGM_NOTES.C2, BGM_NOTES.C2, BGM_NOTES.Eb2, BGM_NOTES.C2, BGM_NOTES.G2, BGM_NOTES.C2, BGM_NOTES.Eb2, BGM_NOTES.C2,
      BGM_NOTES.Ab1, BGM_NOTES.Ab1, BGM_NOTES.C2, BGM_NOTES.Ab1, BGM_NOTES.Eb2, BGM_NOTES.Ab1, BGM_NOTES.C2, BGM_NOTES.Ab1,
      BGM_NOTES.F1, BGM_NOTES.F1, BGM_NOTES.Ab1, BGM_NOTES.F1, BGM_NOTES.C2, BGM_NOTES.F1, BGM_NOTES.Ab1, BGM_NOTES.F1,
      BGM_NOTES.G1, BGM_NOTES.G1, BGM_NOTES.B1, BGM_NOTES.G1, BGM_NOTES.D2, BGM_NOTES.G1, BGM_NOTES.B1, BGM_NOTES.G1
    ],
    arp: [
      BGM_NOTES.Eb4, BGM_NOTES.G4, BGM_NOTES.C5, BGM_NOTES.Eb5, BGM_NOTES.C5, BGM_NOTES.G4, BGM_NOTES.Eb4, BGM_NOTES.G4,
      BGM_NOTES.C5, BGM_NOTES.Eb5, BGM_NOTES.G5, BGM_NOTES.Eb5, BGM_NOTES.C5, BGM_NOTES.G4, BGM_NOTES.C5, BGM_NOTES.Eb5,
      BGM_NOTES.C4, BGM_NOTES.Eb4, BGM_NOTES.Ab4, BGM_NOTES.C5, BGM_NOTES.Ab4, BGM_NOTES.Eb4, BGM_NOTES.C4, BGM_NOTES.Eb4,
      BGM_NOTES.Ab4, BGM_NOTES.C5, BGM_NOTES.Eb5, BGM_NOTES.C5, BGM_NOTES.Ab4, BGM_NOTES.Eb4, BGM_NOTES.Ab4, BGM_NOTES.C5
    ],
    kick: [1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0, 1,0,1,0, 1,1,1,1],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hihat: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
  }
};

const scheduleBgmStep = () => {
  if (!audioCtx || isMutedBGM || !currentBgmTrack) return;
  const track = BGM_TRACKS[currentBgmTrack];
  if (!track) return;

  const currentStep = bgmStep % track.length;
  const t = bgmNextStepTime;

  if (track.chords && track.chords.length > 0) {
    const chord = track.chords.find(c => c.step === currentStep);
    if (chord) bgmPlayWarmPad(chord.freqs, t, chord.dur);
  }

  if (track.bass && track.bass[currentStep]) {
    bgmPlayCyberBass(track.bass[currentStep], t, track.stepTime * 1.5);
  }

  if (track.arp && track.arp[currentStep]) {
    bgmPlayArpLead(track.arp[currentStep], t, track.stepTime * 1.8);
  }

  if (track.kick && track.kick[currentStep]) bgmPlayKick(t);
  if (track.snare && track.snare[currentStep]) bgmPlaySnare(t);
  if (track.hihat && track.hihat[currentStep]) bgmPlayHiHat(t);

  bgmNextStepTime += track.stepTime;
  bgmStep++;
};

const bgmSchedulerLoop = () => {
  if (!audioCtx || isMutedBGM || !currentBgmTrack) return;

  // Se il clock è rimasto indietro (es. cambio scheda o minimizzazione), riallinea il tempo
  if (bgmNextStepTime < audioCtx.currentTime) {
    bgmNextStepTime = audioCtx.currentTime + 0.05;
  }

  while (bgmNextStepTime < audioCtx.currentTime + 0.1) {
    scheduleBgmStep();
  }
  bgmSchedulerTimer = requestAnimationFrame(bgmSchedulerLoop);
};

const playBGM = (theme = 'menu') => {
  if (isMutedBGM || typeof window === 'undefined') return;
  initAudio();
  if (!audioCtx) return;

  let validName = 'menu';
  if (theme === 'battle' || theme === 'pvp' || theme === 'tris') validName = theme === 'tris' ? 'battle' : theme;
  else if (theme === 'boss') validName = 'boss';
  else if (theme === 'adventure' || theme === 'rifts') validName = 'menu';

  if (currentBgmTrack === validName && bgmSchedulerTimer) return;

  stopBGM();
  currentBgmTrack = validName;
  bgmStep = 0;
  bgmNextStepTime = audioCtx.currentTime + 0.05;
  bgmSchedulerLoop();
};

const stopBGM = () => {
  if (bgmSchedulerTimer) {
    cancelAnimationFrame(bgmSchedulerTimer);
    bgmSchedulerTimer = null;
  }
  currentBgmTrack = null;
};

// 2.1 RIPRODUZIONE EFFETTI SONORI SFX CON SUPPORTO PITCH SHIFT A SEMITONI
const playSound = (type, pitchSemitones = 0) => {
  if (isMutedSFX || typeof window === 'undefined') return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const pitchFactor = Math.pow(2, (Number(pitchSemitones) || 0) / 12);
    const applyPitch = (freq) => freq * pitchFactor;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(sfxGainNode || audioCtx.destination);

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(applyPitch(1200), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(300), now + 0.04);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
        break;

      case 'turn_player':
        [440, 660, 880].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.18, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.2);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.2);
        });
        break;

      case 'turn_opponent':
        [400, 300, 200].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.14, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.25);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.25);
        });
        break;

      case 'timer_warning':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;

      case 'timer_critical':
        [1100, 880].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now + idx * 0.04);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.2, now + idx * 0.04);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.07);
          o.start(now + idx * 0.04);
          o.stop(now + idx * 0.04 + 0.07);
        });
        break;

      case 'card':
      case 'card_slide': {
        const bufferSize = audioCtx.sampleRate * 0.08;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(applyPitch(800), now);
        filter.Q.setValueAtTime(3, now);
        noise.connect(filter);
        filter.connect(gain);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        noise.start(now);
        noise.stop(now + 0.08);
        break;
      }

      case 'select':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(applyPitch(440), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(880), now + 0.07);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
        break;

      case 'deselect':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;

      case 'tick':
        osc.type = 'square';
        osc.frequency.setValueAtTime(applyPitch(950), now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.025);
        osc.start(now);
        osc.stop(now + 0.025);
        break;

      case 'sovraccarico_tick':
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.04);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.2, now + idx * 0.04);
          g.gain.linearRampToValueAtTime(0.001, now + idx * 0.04 + 0.15);
          o.start(now + idx * 0.04);
          o.stop(now + idx * 0.04 + 0.15);
        });
        break;

      // ======================================================================
      // I 4 GRADI DI RISOLUZIONE SCI-FI ASTRONOMICI
      // ======================================================================

      // 1. CONVERGENZA: Calcolo standard corretto (2 carte) - 2 Toni Puri (#00f2fe)
      case 'convergenza':
        [523.25, 659.25].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.07);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.22, now + idx * 0.07);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.28);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.28);
        });
        break;

      // 2. SINCRONIA QUANTICA: Calcolo rapido (<= 12s) o al 1° colpo - Arpeggio 4 frequenze con filtro risonante (#10b981)
      case 'sincronia_quantica':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const f = audioCtx.createBiquadFilter();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);

          f.type = 'bandpass';
          f.frequency.setValueAtTime(applyPitch(freq * 1.5), now + idx * 0.05);
          f.Q.setValueAtTime(4.0, now + idx * 0.05);

          o.connect(f);
          f.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.24, now + idx * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.32);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.32);
        });
        break;

      // 3. RISONANZA STELLARE: Formule 3+ carte o con [* /] - Accordo a 4 oscillatori risonanti (#facc15)
      case 'risonanza_stellare':
        [440.00, 554.37, 659.25, 880.00].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now);
          o.detune.setValueAtTime(idx * 3 - 4.5, now);

          const f = audioCtx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(applyPitch(2800), now);
          f.frequency.exponentialRampToValueAtTime(applyPitch(600), now + 0.45);

          o.connect(f);
          f.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.25, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          o.start(now);
          o.stop(now + 0.45);
        });
        break;

      // 4. ECLISSI TOTALE!: Combo 4 Semi o Tris Galattico - Sub-Bass 40 Hz + Cascata Armonica Brillante (#d946ef)
      case 'eclissi_totale': {
        // A. Oscillatore Sub-Bass sinusoidale puro a 40 Hz
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(40, now);
        subGain.gain.setValueAtTime(0.45, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        subOsc.connect(subGain);
        subGain.connect(sfxGainNode || audioCtx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.55);

        // B. Cascata armonica brillante
        [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.045);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.25, now + idx * 0.045);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.45);
          o.start(now + idx * 0.045);
          o.stop(now + idx * 0.045 + 0.45);
        });
        break;
      }

      case 'damage':
      case 'plasma_damage':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;

      case 'heal':
      case 'biotherapy':
      case 'suit_hearts':
        [330, 440, 550, 660].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.07);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.2, now + idx * 0.07);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.35);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.35);
        });
        break;

      case 'crit_4suits':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.25, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.3);
        });
        break;

      case 'suit_diamonds':
      case 'dust_extract':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(applyPitch(800), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(1600), now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case 'suit_spades':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(applyPitch(300), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(600), now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case 'suit_clubs':
        osc.type = 'square';
        osc.frequency.setValueAtTime(applyPitch(350), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(500), now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case 'malus_backfire':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.4);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'dice':
      case 'dice_roll':
        [280, 420, 350, 560, 700].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.04);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.12, now + idx * 0.04);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.04 + 0.08);
          o.start(now + idx * 0.04);
          o.stop(now + idx * 0.04 + 0.08);
        });
        break;

      case 'ether':
      case 'ether_warp':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(applyPitch(400), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(1400), now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'joker':
      case 'joker_activate':
        [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.22, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.35);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.35);
        });
        break;

      case 'epic_item_trigger':
      case 'epic_activate':
        [329.63, 493.88, 659.25, 987.77, 1318.51].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.25, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.4);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.4);
        });
        break;

      case 'rift_collapse':
      case 'rift_open':
        [150, 220, 440, 880, 1760].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.08);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.28, now + idx * 0.08);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.5);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.5);
        });
        break;

      case 'relic_claim':
        [523.25, 783.99, 1046.50, 1567.98].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.07);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.24, now + idx * 0.07);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.4);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.4);
        });
        break;

      case 'dopamine_tick':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(applyPitch(900 + Math.random() * 400), now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
        break;

              // SFX BANCO TERRENO (INNESCO TRAPPOLA, SCOPERTA & RIARMO)
      case 'terrain_trigger':
        [350, 520, 880, 1040].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.24, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.25);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.25);
        });
        break;

      case 'terrain_flip':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(applyPitch(600), now);
        osc.frequency.exponentialRampToValueAtTime(applyPitch(1400), now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'terrain_rearm':
        [440, 660, 990].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.18, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.2);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.2);
        });
        break;


      // SFX COMBINAZIONI TRIS STELLARE
      case 'tris_combo_pair':
        [440, 554.37].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.08);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.2, now + idx * 0.08);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.25);
          o.start(now + idx * 0.08);
          o.stop(now + idx * 0.08 + 0.25);
        });
        break;

      case 'tris_combo_flush':
        [392.00, 523.25, 659.25].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.07);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.22, now + idx * 0.07);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.07 + 0.3);
          o.start(now + idx * 0.07);
          o.stop(now + idx * 0.07 + 0.3);
        });
        break;

      case 'tris_combo_straight':
        [349.23, 440.00, 523.25, 698.46].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.24, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.35);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.35);
        });
        break;

      case 'tris_combo_three':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.26, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.4);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.4);
        });
        break;

      case 'tris_combo_galactic':
        [440.00, 554.37, 659.25, 880.00, 1108.73, 1318.51].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.05);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.28, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.5);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.5);
        });
        break;

      // SFX TRANSIZIONE FASE BOSS
      case 'boss_phase_transition':
        [200, 150, 300, 450, 600, 900].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.09);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.3, now + idx * 0.09);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.09 + 0.45);
          o.start(now + idx * 0.09);
          o.stop(now + idx * 0.09 + 0.45);
        });
        break;

      // SFX CARICA ABILITÀ AL 100%
      case 'ability_charged_100':
        [587.33, 880.00, 1174.66].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.06);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.25, now + idx * 0.06);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.06 + 0.35);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.35);
        });
        break;

      case 'win':
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(applyPitch(freq), now + idx * 0.1);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.22, now + idx * 0.1);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.4);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.4);
        });
        break;

      case 'lose':
        [280, 240, 200, 150].forEach((freq, idx) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now + idx * 0.15);
          o.connect(g);
          g.connect(sfxGainNode || audioCtx.destination);
          g.gain.setValueAtTime(0.2, now + idx * 0.15);
          g.gain.linearRampToValueAtTime(0.01, now + idx * 0.15 + 0.3);
          o.start(now + idx * 0.15);
          o.stop(now + idx * 0.15 + 0.3);
        });
        break;

      default:
        break;
    }
  } catch (_) {}
};

const playAbilitySFX = (abilityId) => {
  if (isMutedSFX || typeof window === 'undefined') return;
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(sfxGainNode || audioCtx.destination);

    if (abilityId === 'taurus' || abilityId === 'planet_char_1') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    } else if (abilityId === 'aries' || abilityId === 'planet_char_9' || abilityId === 'planet_char_19') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.25);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    } else if (abilityId === 'virgo' || abilityId === 'planet_char_7' || abilityId === 'planet_char_12') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(300, now + 0.1);
      osc.frequency.setValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    }
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (_) {}
};
export { initAudio, playBGM, stopBGM, playSound, playAbilitySFX, toggleMuteBGM, toggleMuteSFX, setMuteBGM, setMuteSFX };