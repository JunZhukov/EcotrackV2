const pageBody = document.body;
const splashScreen = document.querySelector("#splashScreen");
const splashLogo = document.querySelector("#splashLogo");
const startNowBtn = document.querySelector("#startNowBtn");
const EXIT_DURATION_MS = 520;

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

function runIntroSequence() {
  if (!pageBody || !splashScreen || !splashLogo || !startNowBtn) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    pageBody.classList.remove("intro-preload");
    pageBody.classList.add("intro-ready");
    splashScreen.remove();
    return;
  }

  requestAnimationFrame(() => splashScreen.classList.add("play"));

  setTimeout(() => {
    pageBody.classList.remove("intro-preload");
    pageBody.classList.add("intro-ready");
    startNowBtn.classList.add("spotlight");
  }, 2200);

  setTimeout(() => splashScreen.remove(), 3200);

  startNowBtn.addEventListener("click", navigateWithTransition);
}

window.addEventListener("DOMContentLoaded", runIntroSequence);
