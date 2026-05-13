const pageBody = document.body;
const splashScreen = document.querySelector("#splashScreen");
const splashLogo = document.querySelector("#splashLogo");
const startNowBtn = document.querySelector("#startNowBtn");
const EXIT_DURATION_MS = 520;

const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
const audioCtx = AudioContextCtor ? new AudioContextCtor() : null;
let logoBuffer = null;
let cardBuffer = null;

async function loadAudioBuffer(url) {
  if (!audioCtx) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn("Audio fetch failed:", url, response.status);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn("Audio load error:", url, err);
    return null;
  }
}

const audioReady = Promise.all([
  loadAudioBuffer("./Pop-Logo.mp3").then((b) => (logoBuffer = b)),
  loadAudioBuffer("./Pop-Card.mp3").then((b) => (cardBuffer = b)),
]);

function playSfx(buffer, volume = 0.75) {
  if (!buffer || !audioCtx) return;
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    source.connect(gain).connect(audioCtx.destination);
    source.start(0);
  } catch (err) {
    console.warn("SFX play error:", err);
  }
}

function unlockAudio() {
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}
document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("touchstart", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

function navigateWithTransition(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLAnchorElement)) return;

  const destination = target.getAttribute("href");
  if (!destination) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion) {
    window.location.href = destination;
    return;
  }

  event.preventDefault();
  pageBody.classList.add("page-exit");
  window.setTimeout(() => {
    window.location.href = destination;
  }, EXIT_DURATION_MS);
}

async function runIntroSequence() {
  if (!pageBody || !splashScreen || !splashLogo || !startNowBtn) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    pageBody.classList.remove("intro-preload");
    pageBody.classList.add("intro-ready");
    splashScreen.remove();
    return;
  }

  startNowBtn.addEventListener("click", navigateWithTransition);

  await Promise.race([
    audioReady,
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]);

  requestAnimationFrame(() => {
    splashScreen.classList.add("play");
    playSfx(logoBuffer, 0.7);
  });

  setTimeout(() => {
    pageBody.classList.remove("intro-preload");
    pageBody.classList.add("intro-ready");
    startNowBtn.classList.add("spotlight");
    playSfx(cardBuffer, 0.8);
  }, 2200);

  setTimeout(() => splashScreen.remove(), 3200);
}

window.addEventListener("DOMContentLoaded", runIntroSequence);
