"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header, Footer, Backdrop } from "./site-shell";
import { usePreferences } from "./preferences";
import { COLORS, TIERS, MAX_STICKERS, MAX_CUSTOM_LOGOS, MAX_IMAGE_LENGTH, SHARE_ID, emptyBoard, normalizeBoard, moveSticker } from "../lib/tier-board";
import { tierCopy } from "../lib/tier-copy";
import { availableLogoStickers, getAiSticker } from "../lib/ai-stickers";

const DRAFT_KEY = "cv404-tier-draft-v1";
const MAX_LOGO_FILE_BYTES = 500 * 1024;

async function logoImage(file) {
  if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("imageError");
  if (file.size > MAX_LOGO_FILE_BYTES) throw new Error("imageSize");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("imageError");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.82);
    if (data.length > MAX_IMAGE_LENGTH) throw new Error("imageError");
    return data;
  } finally { URL.revokeObjectURL(url); }
}

function stickerLabel(sticker, brand) {
  return sticker.type === "ai" && sticker.presetId === "yungu404-v1" ? brand : sticker.text;
}

function StickerFace({ sticker }) {
  const { t } = usePreferences();
  const preset = sticker.type === "ai" ? getAiSticker(sticker.presetId) : null;
  const logo = preset?.logoSrc || (preset?.logo ? `/assets/ai-logos/${preset.logo}.svg` : null);
  return <>{logo && <span className="tier-ai-logo"><img src={logo} width="32" height="32" alt="" draggable="false" /></span>}{sticker.type === "image" && <img src={sticker.image} alt="" draggable="false" />}<span>{stickerLabel(sticker, t.brand)}</span></>;
}

export default function TierList() {
  const params = useSearchParams();
  return <TierWorkspace key={params.get("share") ?? "draft"} />;
}

function TierWorkspace() {
  const { locale, t: siteCopy } = usePreferences();
  const t = tierCopy[locale];
  const [board, setBoard] = useState(emptyBoard);
  const boardRef = useRef(board);
  const [mode, setMode] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("logo");
  const [text, setText] = useState("");
  const [logoName, setLogoName] = useState("");
  const [color, setColor] = useState("yellow");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [notice, setNotice] = useState("");
  const [saveState, setSaveState] = useState("saved");
  const [sharing, setSharing] = useState(false);
  const [share, setShare] = useState(null);
  const [copyState, setCopyState] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [history, setHistory] = useState([]);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const pointer = useRef(null);
  const dragFrame = useRef(null);
  const suppressClick = useRef(false);
  const uploadInput = useRef(null);
  const uploadDialog = useRef(null);
  const busyUpload = useRef(false);
  const busyShare = useRef(false);
  const editable = mode === "edit";
  const chosen = board.stickers.find((s) => s.id === selected);
  const ranked = board.stickers.filter((s) => s.zone !== "tray");
  const customLogoCount = board.stickers.filter((s) => s.type === "image").length;
  const customLogoLimitReached = customLogoCount >= MAX_CUSTOM_LOGOS;
  const availableLogos = availableLogoStickers(board.stickers);
  const customStickers = board.stickers.filter((s) => s.zone === "tray" && s.type !== "ai");
  const sharedContent = JSON.stringify({ ...board, stickers: ranked });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const id = new URLSearchParams(window.location.search).get("share");
    if (id !== null) {
      if (!SHARE_ID.test(id)) { setLoadError("missing"); setMode("error"); return; }
      fetch(`/api/tier-boards/${id}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(response.status === 404 ? "missing" : "loadError");
          return normalizeBoard(await response.json());
        })
        .then((data) => { if (!cancelled) { boardRef.current = data; setBoard(data); setMode("view"); } })
        .catch((error) => { if (!cancelled) { setLoadError(error.message === "missing" ? "missing" : "loadError"); setMode("error"); } });
    } else {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) { const data = normalizeBoard(JSON.parse(raw)); boardRef.current = data; setBoard(data); }
      } catch { setNotice("restoredError"); }
      setMode("edit");
    }
    return () => { cancelled = true; controller.abort(); };
  }, []);

  useEffect(() => {
    if (!editable) return;
    setSaveState("saving");
    const timer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(board)); setSaveState("saved"); }
      catch { setSaveState("storageError"); }
    }, 300);
    const flush = () => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(boardRef.current)); } catch {} };
    window.addEventListener("pagehide", flush);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", flush); flush(); };
  }, [board, editable]);

  function change(next) {
    const previous = boardRef.current;
    if (next === previous) return;
    setHistory((items) => [...items.slice(-19), previous]);
    boardRef.current = next;
    setBoard(next);
    setNotice("");
    setConfirmClear(false);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    boardRef.current = previous; setBoard(previous);
    setHistory((items) => items.slice(0, -1)); setSelected(null); setNotice("");
  }
  function placeNewSticker(sticker, zone = "tray", before) {
    const current = boardRef.current;
    if (current.stickers.length >= MAX_STICKERS) { setNotice("limit"); return false; }
    if (sticker.type === "image" && current.stickers.filter((s) => s.type === "image").length >= MAX_CUSTOM_LOGOS) { setNotice("customLogoLimit"); return false; }
    if (sticker.type === "ai" && current.stickers.some((s) => s.type === "ai" && s.presetId === sticker.presetId)) return false;
    const next = moveSticker({ ...current, stickers: [...current.stickers, sticker] }, sticker.id, zone, before);
    try { normalizeBoard(next); }
    catch { setNotice("tooLarge"); return false; }
    change(next);
    setSelected(sticker.id);
    setNotice(zone === "tray" ? (sticker.type === "ai" ? "chooseTier" : "made") : `${t.moved} ${t.tiers[TIERS.indexOf(zone)]}`);
    return true;
  }
  function makeSticker(label, image, preset) {
    return { id: crypto.randomUUID(), type: preset ? "ai" : image ? "image" : "text", text: label.trim().slice(0, 30), color: preset ? preset.color : color, zone: "tray", ...(image ? { image } : {}), ...(preset ? { presetId: preset.id } : {}) };
  }
  function addSticker(label, image, preset) {
    return placeNewSticker(makeSticker(label, image, preset));
  }
  function move(id, zone, before) {
    change(moveSticker(boardRef.current, id, zone, before));
    setNotice(`${t.moved} ${zone === "tray" ? t.tray : t.tiers[TIERS.indexOf(zone)]}`);
  }
  function returnSticker(id) {
    const sticker = boardRef.current.stickers.find((item) => item.id === id);
    if (!sticker || sticker.zone === "tray") return;
    move(id, "tray");
    setSelected(null);
    if (sticker.type === "ai") setTab("logo");
    setNotice(sticker.type === "ai" ? "returnedLogo" : "returnedCustom");
  }
  function removeSticker(id) {
    const current = boardRef.current;
    if (!current.stickers.some((sticker) => sticker.id === id)) return;
    change({ ...current, stickers: current.stickers.filter((sticker) => sticker.id !== id) });
    setSelected(null);
    setNotice("deleted");
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busyUpload.current) return;
    busyUpload.current = true; setUploading(true); setUploadError("");
    try {
      if (boardRef.current.stickers.filter((s) => s.type === "image").length >= MAX_CUSTOM_LOGOS) throw new Error("customLogoLimit");
      const image = await logoImage(file);
      const added = addSticker(logoName.trim() || file.name.replace(/\.[^.]+$/, "").trim() || "Logo", image);
      if (added) { uploadDialog.current?.close(); setLogoName(""); }
      else setUploadError(boardRef.current.stickers.filter((s) => s.type === "image").length >= MAX_CUSTOM_LOGOS ? "customLogoLimit" : boardRef.current.stickers.length >= MAX_STICKERS ? "limit" : "tooLarge");
    }
    catch (error) { setUploadError(["imageSize", "imageError", "customLogoLimit"].includes(error.message) ? error.message : "imageError"); }
    finally { busyUpload.current = false; setUploading(false); }
  }
  async function publish() {
    if (busyShare.current) return;
    if (!ranked.length) { setNotice("emptyShare"); return; }
    busyShare.current = true; setSharing(true); setNotice(""); setCopyState("");
    try {
      const payload = normalizeBoard({ ...board, stickers: ranked });
      const response = await fetch("/api/tier-boards", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(response.status === 429 ? "rateLimited" : response.status === 413 ? "tooLarge" : "shareError");
      const data = await response.json();
      if (!SHARE_ID.test(data.id)) throw new Error("shareError");
      setShare({ url: `${window.location.origin}/tier?share=${data.id}`, content: sharedContent });
    } catch (error) { setNotice(error.message === "too_large" ? "tooLarge" : ["rateLimited", "tooLarge"].includes(error.message) ? error.message : "shareError"); }
    finally { busyShare.current = false; setSharing(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(share.url); setCopyState("copied"); }
    catch { setCopyState("copyManual"); }
  }

  function pointerDown(event, sticker, isNew = false) {
    if (!editable || event.button !== 0 || pointer.current) return;
    suppressClick.current = false;
    pointer.current = { id: sticker.id, sticker, isNew, pointerId: event.pointerId, x: event.clientX, y: event.clientY, clientX: event.clientX, clientY: event.clientY, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function templatePointerDown(event, label, preset) {
    const existing = preset && boardRef.current.stickers.find((s) => s.type === "ai" && s.presetId === preset.id);
    if (!existing && boardRef.current.stickers.length >= MAX_STICKERS) return;
    pointerDown(event, existing || makeSticker(label, undefined, preset), !existing);
  }
  function templateClick(event, label, preset) {
    if (suppressClick.current && event.detail !== 0) { suppressClick.current = false; return; }
    suppressClick.current = false;
    const existing = preset && boardRef.current.stickers.find((s) => s.type === "ai" && s.presetId === preset.id);
    if (existing) { setSelected(existing.id); setNotice("chooseTier"); return; }
    addSticker(label, undefined, preset);
  }
  function scrollDuringDrag() {
    const p = pointer.current;
    if (!p?.active) return;
    const edge = 72;
    const distance = p.clientY < edge ? p.clientY - edge : p.clientY > window.innerHeight - edge ? p.clientY - window.innerHeight + edge : 0;
    if (distance) window.scrollBy(0, Math.max(-18, Math.min(18, distance / 4)));
    const target = document.elementFromPoint(p.clientX, p.clientY)?.closest("[data-zone]");
    setOver(target?.dataset.zone || null);
    dragFrame.current = requestAnimationFrame(scrollDuringDrag);
  }
  function cancelDrag() {
    if (pointer.current?.active) suppressClick.current = true;
    pointer.current = null; setDrag(null); setOver(null);
    cancelAnimationFrame(dragFrame.current);
  }
  useEffect(() => {
    const escape = (event) => { if (event.key === "Escape") cancelDrag(); };
    window.addEventListener("keydown", escape);
    return () => { window.removeEventListener("keydown", escape); cancelAnimationFrame(dragFrame.current); };
  }, []);
  function pointerMove(event) {
    const p = pointer.current;
    if (!p || p.pointerId !== event.pointerId) return;
    if (!p.active && Math.hypot(event.clientX - p.x, event.clientY - p.y) < 7) return;
    p.clientX = event.clientX; p.clientY = event.clientY;
    if (!p.active) dragFrame.current = requestAnimationFrame(scrollDuringDrag);
    p.active = true;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-zone]");
    setOver(target?.dataset.zone || null);
    setDrag({ id: p.id, sticker: p.sticker, isNew: p.isNew, x: event.clientX, y: event.clientY });
  }
  function pointerEnd(event) {
    const p = pointer.current;
    if (!p || p.pointerId !== event.pointerId) return;
    if (p?.active) {
      suppressClick.current = true;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const zone = hit?.closest("[data-zone]")?.dataset.zone;
      if (zone === "return" || zone === "library" || (zone === "tray" && p.sticker.type === "ai")) {
        if (!p.isNew && p.sticker.zone !== "tray") returnSticker(p.id);
      } else if (zone) {
        const before = hit?.closest("[data-sticker]")?.dataset.sticker;
        if (p.isNew) placeNewSticker(p.sticker, zone, before);
        else if (zone === "tray" && p.sticker.zone !== "tray") returnSticker(p.id);
        else { move(p.id, zone, before); setSelected(p.id); }
      }
    }
    cancelDrag();
  }
  function reorder(direction) {
    const siblings = board.stickers.filter((s) => s.zone === chosen.zone);
    const index = siblings.findIndex((s) => s.id === chosen.id);
    if (index + direction < 0 || index + direction >= siblings.length) return;
    move(chosen.id, chosen.zone, direction === -1 ? siblings[index - 1].id : siblings[index + 2]?.id);
  }
  function renderSticker(sticker) {
    const props = { className: `tier-sticker sticker-${sticker.color} ${sticker.type === "image" ? "sticker-logo" : ""} ${sticker.type === "ai" ? "sticker-ai" : ""} ${selected === sticker.id ? "is-selected" : ""} ${drag?.id === sticker.id ? "is-dragging" : ""}`, "data-sticker": sticker.id };
    return editable ? <button key={sticker.id} type="button" {...props}
      aria-pressed={selected === sticker.id} aria-label={stickerLabel(sticker, siteCopy.brand)}
      onPointerDown={(event) => pointerDown(event, sticker)} onPointerMove={pointerMove} onPointerUp={pointerEnd}
      onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
      onClick={(event) => { if (event.detail === 0 || !suppressClick.current) setSelected(selected === sticker.id ? null : sticker.id); suppressClick.current = false; }}
      onKeyDown={(event) => { if (event.key === "Escape") setSelected(null); }}>
      <StickerFace sticker={sticker} />
    </button> : <div key={sticker.id} {...props}><StickerFace sticker={sticker} /></div>;
  }
  const dragged = drag?.sticker;
  const canReturnDrag = !!drag && !drag.isNew && dragged.zone !== "tray";

  return <div className="tier-page">
    <Backdrop /><Header guide tool />
    <main className="tier-main" id="main-content">
      <section className="tier-intro">
        <div><p className="tier-eyebrow">{t.eyebrow}</p><h1>{t.title}<span className="tier-title-dot">.</span></h1><p className="tier-tagline">{t.tagline} <span>{mode === "view" ? t.sharedIntro : t.intro}</span></p></div>
        <div className="tier-intro-action">{editable ? <><button className="tier-primary" onClick={publish} disabled={sharing || uploading || !ranked.length}>{sharing ? t.sharing : t.share}</button><small>{t.shareNote}</small></> : mode === "view" ? <><a className="tier-primary" href="/tier">{t.create}</a><small>{t.shared}</small></> : null}</div>
      </section>

      {mode === "loading" && <div className="tier-loading" role="status">{t.loading}</div>}
      {mode === "error" && <div className="tier-loading" role="alert"><p>{t[loadError]}</p><button className="tier-primary" onClick={() => window.location.reload()}>{t.retry}</button><a href="/tier">{t.create}</a></div>}

      {share && <section className="tier-share-panel" aria-label={t.linkReady}>
        <div><strong>{t.linkReady}</strong><button className="tier-quiet" onClick={() => setShare(null)}>{t.close} ×</button></div>
        <p>{share.content !== sharedContent ? t.updated : t.shareHelp}</p>
        <div className="tier-share-link"><input aria-label={t.linkLabel} value={share.url} readOnly onFocus={(event) => event.target.select()} /><button className="tier-primary" onClick={copyLink}>{copyState === "copied" ? t.copied : t.copy}</button><a href={share.url} target="_blank" rel="noopener noreferrer">{t.openShare}</a></div>
        {copyState === "copyManual" && <p role="status">{t.copyManual}</p>}
      </section>}

      {(editable || mode === "view") && <div className={`tier-workspace ${!editable ? "tier-view-only" : ""}`}>
        <section className="tier-board-area" aria-label={t.boardLabel}>
          <div className="tier-board-heading"><div className="tier-board-name"><span className="tier-board-index">MY TIER LIST</span>{editable ? <input aria-label={t.titleLabel} maxLength={80} placeholder={t.titlePlaceholder} value={board.title} onChange={(event) => change({ ...board, title: event.target.value })} /> : <h2>{board.title || t.defaultTitle}</h2>}</div>{editable && <div className={`tier-board-tools ${canReturnDrag ? "has-return-target" : ""}`}><button className="tier-quiet" onClick={undo} disabled={!history.length}>↶ {t.undo}</button><button className="tier-quiet" onClick={() => setConfirmClear(!confirmClear)} disabled={!board.stickers.length && !board.title}>{t.clear}</button>            {canReturnDrag && <div className={`tier-return-target ${over === "return" ? "is-return-over" : ""}`} data-zone="return" role="status" aria-live="polite">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>
              <strong>{over === "return" ? t.releaseReturn : t.dragReturn}</strong><span>{dragged.type === "ai" ? t.returnLogoHint : t.returnCustomHint}</span>
            </div>}</div>}</div>
          {confirmClear && <div className="tier-confirm"><span>{t.clearConfirm}</span><button onClick={() => { change(emptyBoard()); setSelected(null); }}>{t.yesClear}</button><button onClick={() => setConfirmClear(false)}>{t.cancel}</button></div>}
          <div className="tier-board">
            {TIERS.map((zone, index) => <div className={`tier-row tier-row-${zone} ${over === zone ? "is-over" : ""}`} data-zone={zone} key={zone}>
              {editable ? <button className="tier-rank" onClick={() => selected && move(selected, zone)} aria-label={`${t.place} ${t.tiers[index]}`} disabled={!selected}><strong>{t.tiers[index]}</strong><small>{t.tierNotes[index]}</small></button> : <div className="tier-rank"><strong>{t.tiers[index]}</strong><small>{t.tierNotes[index]}</small></div>}
              <div className="tier-row-content">{board.stickers.filter((s) => s.zone === zone).map(renderSticker)}{!board.stickers.some((s) => s.zone === zone) && (editable ? <button className="tier-empty" onClick={() => selected && move(selected, zone)} disabled={!selected}>{selected ? `${t.place} ${t.tiers[index]} ＋` : t.empty}</button> : <span className="tier-empty">—</span>)}</div>
            </div>)}
          </div>
          <div className="tier-board-foot"><span>{editable ? t[saveState] : t.shared}</span><span>{ranked.length} {t.count} <i /> CV404.TV</span></div>
          {editable && <div className="tier-board-actions">
            <div className="tier-selection" aria-label={t.selected}>
              {["deleted", "returnedLogo", "returnedCustom"].includes(notice) && history.length && !chosen ? <div className="tier-action-feedback" role="status"><span>{t[notice]}</span><button className="tier-quiet" onClick={undo}>{notice === "deleted" ? t.undoDelete : t.undoReturn}</button></div> : chosen ? <><strong>{chosen.text}</strong><label>{t.move}<select value={chosen.zone} onChange={(event) => event.target.value === "tray" ? returnSticker(chosen.id) : move(chosen.id, event.target.value)}><option value="tray">{chosen.type === "ai" ? t.logoLibrary : t.tray}</option>{TIERS.map((zone, i) => <option key={zone} value={zone}>{t.tiers[i]}</option>)}</select></label><button className="tier-quiet" aria-label={t.earlier} onClick={() => reorder(-1)}>←</button><button className="tier-quiet" aria-label={t.later} onClick={() => reorder(1)}>→</button>{(chosen.zone !== "tray" || chosen.type !== "ai") && <button className="tier-quiet" onClick={() => chosen.zone === "tray" ? removeSticker(selected) : returnSticker(selected)}>{chosen.zone === "tray" ? t.remove : t.returnToTray}</button>}<button className="tier-quiet" aria-label={t.deselect} onClick={() => setSelected(null)}>×</button></> : <span>{t.trayNote}</span>}
            </div>

          </div>}
        </section>

        {editable && <aside className="tier-studio">
          <div className="tier-studio-heading"><span className="tier-studio-icon" aria-hidden="true">✳</span><div><h2>{t.studio}</h2><p>{t.studioNote}</p></div></div>
          <div className="tier-tabs" role="group" aria-label={t.studio}><button aria-pressed={tab === "logo"} onClick={() => setTab("logo")}>{t.imageTab}</button><button aria-pressed={tab === "text"} onClick={() => setTab("text")}>{t.textTab}</button></div>
          {tab === "logo" ? <div className="tier-ai-library">
            <button className="tier-custom-logo" aria-haspopup="dialog" disabled={board.stickers.length >= MAX_STICKERS || customLogoLimitReached} onClick={() => { setUploadError(""); setLogoName(""); uploadDialog.current.showModal(); }}>
              <span className="tier-custom-logo-icon" aria-hidden="true">＋</span><span><strong>{t.customLogo}</strong><small>{t.customLogoNote} · {customLogoCount}/{MAX_CUSTOM_LOGOS}</small></span><span aria-hidden="true">↗</span>
            </button>
            <p><strong>{t.logoLibrary}</strong><span>{availableLogos.length}</span></p>
            <p>{t.logoNote}</p>
            <div className={`tier-ai-grid ${over === "library" ? "is-over" : ""}`} data-zone="library" role="group" aria-label={t.logoLibrary}>
              {availableLogos.map((preset) => {
                const existing = board.stickers.find((s) => s.type === "ai" && s.presetId === preset.id);
                return <button key={preset.id} className={`tier-ai-preset sticker-${preset.color}`} disabled={!existing && board.stickers.length >= MAX_STICKERS} aria-pressed={!!existing && selected === existing.id} aria-label={`${t.logoSelect} ${stickerLabel({ ...preset, type: "ai", presetId: preset.id }, siteCopy.brand)}`}
                  onPointerDown={(event) => templatePointerDown(event, preset.text, preset)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
                  onClick={(event) => templateClick(event, preset.text, preset)}><StickerFace sticker={{ ...preset, type: "ai", presetId: preset.id }} /><small aria-hidden="true">⠿</small></button>;
              })}
              {!availableLogos.length && <p className="tier-library-empty">{t.allRanked}</p>}
            </div>
          </div> : <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) { addSticker(text); setText(""); } }}>
            <label className="sr-only" htmlFor="sticker-text">{t.stickerText}</label><input id="sticker-text" value={text} maxLength={30} placeholder={t.textPlaceholder} onChange={(event) => setText(event.target.value)} />
            <div className="tier-preview" aria-label={t.preview}><div className={`tier-sticker sticker-${color}`}><span>{text.trim() || t.previewText}</span></div><span className="tier-preview-star" aria-hidden="true">✧</span></div>
            <div className="tier-colors" role="group" aria-label={t.colorLabel}>{COLORS.map((value, i) => <button key={value} type="button" className={`sticker-${value}`} aria-label={t.colors[i]} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value ? "✓" : ""}</button>)}</div>
            <button className="tier-add" disabled={!text.trim() || board.stickers.length >= MAX_STICKERS}>{t.add}</button>
          </form>}
          <div className={`tier-tray ${over === "tray" ? "is-over" : ""}`} data-zone="tray"><div className="tier-tray-heading"><h3>{t.tray}</h3><span>{customStickers.length.toString().padStart(2, "0")}</span></div><div className="tier-tray-stickers" role="group" aria-label={t.tray}>{customStickers.map(renderSticker)}{!customStickers.length && <p>{t.trayEmpty}</p>}</div></div>
          {tab === "text" && <div className="tier-presets"><p>{t.try}</p><div>{t.presets.map((label) => <button key={label} disabled={board.stickers.length >= MAX_STICKERS}
            onPointerDown={(event) => templatePointerDown(event, label)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
            onClick={(event) => templateClick(event, label)}>{label} <span>⠿</span></button>)}</div></div>}
          <p className="tier-capacity">{board.stickers.length} / {MAX_STICKERS} {t.count}</p>
        </aside>}
      </div>}
      <p className="tier-notice" role="status" aria-live="polite">{notice && !["deleted", "returnedLogo", "returnedCustom"].includes(notice) ? t[notice] || notice : ""}</p>
      <p className="tier-signoff">{t.credit} <span>✳</span></p>
    </main>
    <Footer />
    {editable && <dialog ref={uploadDialog} className="tier-logo-dialog" aria-labelledby="logo-dialog-title" aria-describedby="logo-dialog-note" onCancel={(event) => { if (busyUpload.current) event.preventDefault(); }}>
      <div className="tier-dialog-heading"><h2 id="logo-dialog-title">{t.customLogo}</h2><button className="tier-quiet" aria-label={t.closeDialog} disabled={uploading} onClick={() => uploadDialog.current.close()}>×</button></div>
      <p id="logo-dialog-note">{t.customLogoHelp}</p>
      <div className="tier-upload" aria-busy={uploading}>
        <label htmlFor="logo-name">{t.imageLabel} <span>{t.optional}</span></label>
        <input id="logo-name" autoFocus maxLength={30} value={logoName} placeholder={t.imagePlaceholder} disabled={uploading} onChange={(event) => setLogoName(event.target.value)} />
        <input ref={uploadInput} type="file" hidden accept="image/png,image/jpeg,image/webp" aria-label={t.upload} onChange={upload} />
        <button className="tier-upload-target" onClick={() => uploadInput.current?.click()} disabled={uploading || board.stickers.length >= MAX_STICKERS || customLogoLimitReached}><span aria-hidden="true">↥</span><strong>{uploading ? t.processing : t.upload}</strong><small>{t.uploadNote}</small></button>
      </div>
      <p className="tier-upload-status" role="status" aria-live="polite">{uploading ? t.processing : uploadError ? t[uploadError] : ""}</p>
      <div className="tier-dialog-actions"><button className="tier-quiet" disabled={uploading} onClick={() => uploadDialog.current.close()}>{t.cancel}</button></div>
    </dialog>}
    {dragged && <div className={`tier-drag-ghost tier-sticker sticker-${dragged.color} ${dragged.type === "image" ? "sticker-logo" : ""} ${dragged.type === "ai" ? "sticker-ai" : ""}`} style={{ left: drag.x, top: drag.y }} aria-hidden="true"><StickerFace sticker={dragged} /></div>}
  </div>;
}
