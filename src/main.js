// Add a verified long-lived contact URL here when the community entry is ready.
const contact = { url: "", label: "加入云谷404" };
const channels = ["home", "works", "events", "about"];
const labels = ["主频道", "作品放映", "活动现场", "关于我们"];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const screen = document.querySelector("#screen");
let current = "home";
let powered = true;
let audioContext;
let master;
let sounding = false;

function setPower(on) {
  powered = on;
  screen.classList.toggle("is-off", !on);
  document.querySelector("#standby").hidden = on;
  document.querySelector("#power").setAttribute("aria-pressed", String(on));
  document
    .querySelector("#power")
    .setAttribute("aria-label", on ? "关闭电视" : "打开电视");
  document.querySelector(".power-led").classList.toggle("off", !on);
  document.querySelectorAll(".channel-panel").forEach((panel) => {
    panel.hidden = !on || panel.id !== `panel-${current}`;
  });
  if (master)
    master.gain.setTargetAtTime(
      sounding && on ? 0.035 : 0,
      audioContext.currentTime,
      0.2,
    );
}

function selectChannel(channel, updateUrl = true) {
  if (!channels.includes(channel)) channel = "home";
  current = channel;
  setPower(true);
  const index = channels.indexOf(channel);
  tabs.forEach((tab) => {
    const selected = tab.dataset.channel === channel;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  document.querySelector("#channel-label").textContent =
    `CH.0${index + 1} / ${labels[index]}`;
  document
    .querySelector("#next-channel")
    .style.setProperty("--knob-angle", `${index * 90 - 35}deg`);
  document.querySelector("#channel-announcement").textContent =
    `正在放映：${labels[index]}`;
  screen.dataset.channel = channel;
  screen.classList.remove("tuning");
  void screen.offsetWidth;
  screen.classList.add("tuning");
  if (updateUrl && location.hash !== `#${channel}`) location.hash = channel;
}

document
  .querySelectorAll("[data-channel]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      selectChannel(button.dataset.channel),
    ),
  );
document
  .querySelector("#next-channel")
  .addEventListener("click", () =>
    selectChannel(channels[(channels.indexOf(current) + 1) % channels.length]),
  );
document
  .querySelector("#power")
  .addEventListener("click", () => setPower(!powered));
document.querySelector("#power-on").addEventListener("click", () => {
  setPower(true);
  document.querySelector("#power").focus();
});
window.addEventListener("hashchange", () =>
  selectChannel(location.hash.slice(1), false),
);
document.addEventListener("keydown", (event) => {
  if (
    dialog.open ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
    event.target.isContentEditable
  )
    return;
  const onTab = event.target.getAttribute("role") === "tab";
  if (
    !["ArrowLeft", "ArrowRight"].includes(event.key) &&
    !(onTab && ["Home", "End"].includes(event.key))
  )
    return;
  event.preventDefault();
  let index =
    (channels.indexOf(current) +
      (event.key === "ArrowLeft" ? -1 : 1) +
      channels.length) %
    channels.length;
  if (event.key === "Home") index = 0;
  if (event.key === "End") index = channels.length - 1;
  selectChannel(channels[index]);
  if (onTab) tabs[index].focus();
});

const dialog = document.querySelector("#join-dialog");
document
  .querySelectorAll("[data-join]")
  .forEach((button) =>
    button.addEventListener("click", () => dialog.showModal()),
  );
document
  .querySelector(".dialog-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
if (contact.url && /^https:\/\//.test(contact.url)) {
  const link = document.createElement("a");
  link.className = "screen-cta";
  link.href = contact.url;
  link.textContent = `${contact.label} ↗`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.querySelector("#contact-slot").replaceChildren(link);
}

document.querySelector("#sound").addEventListener("click", async () => {
  const button = document.querySelector("#sound");
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
      master = audioContext.createGain();
      master.gain.value = 0;
      master.connect(audioContext.destination);
      [130.81, 196, 261.63].forEach((frequency) => {
        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(master);
        oscillator.start();
      });
    }
    await audioContext.resume();
    sounding = !sounding;
    master.gain.setTargetAtTime(
      sounding && powered ? 0.035 : 0,
      audioContext.currentTime,
      0.3,
    );
    button.setAttribute("aria-pressed", String(sounding));
    button.setAttribute("aria-label", sounding ? "关闭氛围声" : "开启氛围声");
  } catch {
    document.querySelector("#channel-announcement").textContent =
      "当前浏览器暂不支持氛围声。";
  }
});
document.addEventListener("visibilitychange", () => {
  if (master)
    master.gain.setTargetAtTime(
      !document.hidden && sounding && powered ? 0.035 : 0,
      audioContext.currentTime,
      0.2,
    );
});
document.querySelector("#year").textContent = new Date().getFullYear();
selectChannel(location.hash.slice(1), false);
