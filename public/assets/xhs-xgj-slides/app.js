const slides = [...document.querySelectorAll(".slide")];
const currentLabel = document.querySelector("#current-slide");
const totalLabel = document.querySelector("#total-slides");
const progressBar = document.querySelector("#progress-bar");
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const fullscreenButton = document.querySelector("#fullscreen");

if (new URLSearchParams(window.location.search).get("capture") === "1") {
  document.body.classList.add("capture-mode");
}

let currentIndex = 0;
let touchStartX = null;

const pad = (value) => String(value).padStart(2, "0");

function showSlide(index) {
  currentIndex = Math.max(0, Math.min(slides.length - 1, index));

  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === currentIndex;
    slide.classList.toggle("is-active", isActive);
    slide.setAttribute("aria-hidden", String(!isActive));
  });

  currentLabel.textContent = pad(currentIndex + 1);
  totalLabel.textContent = pad(slides.length);
  progressBar.style.width = `${((currentIndex + 1) / slides.length) * 100}%`;
  previousButton.disabled = currentIndex === 0;
  nextButton.disabled = currentIndex === slides.length - 1;
  document.title = `云谷404 迷你黑客松 · ${pad(currentIndex + 1)}/${pad(slides.length)}`;
}

function nextSlide() {
  showSlide(currentIndex + 1);
}

function previousSlide() {
  showSlide(currentIndex - 1);
}

async function toggleFullscreen() {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
}

previousButton.addEventListener("click", previousSlide);
nextButton.addEventListener("click", nextSlide);
fullscreenButton.addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (event) => {
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    nextSlide();
  }

  if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
    event.preventDefault();
    previousSlide();
  }

  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    toggleFullscreen();
  }

  if (event.key === "Home") showSlide(0);
  if (event.key === "End") showSlide(slides.length - 1);
});

document.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  (event) => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].screenX - touchStartX;
    if (Math.abs(distance) > 45) distance < 0 ? nextSlide() : previousSlide();
    touchStartX = null;
  },
  { passive: true },
);

showSlide(0);
