(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     0. CONFIG — where the personalization actually lives now.
        Nobody has to edit this file anymore: the /#editor screen
        (see section 0b below) builds this object from real form
        input and packs it into the URL as #cfg=<base64 JSON>, so
        the whole gift travels inside the link. ?name=Priya still
        works as a quick override on top of a default/base link.
  ---------------------------------------------------------- */
  function toBase64Url(str){
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromBase64Url(b64){
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return decodeURIComponent(escape(atob(b64)));
  }
  function encodeConfig(cfg){
    try { return toBase64Url(JSON.stringify(cfg)); } catch(e){ return ""; }
  }
  function decodeConfig(str){
    try { return JSON.parse(fromBase64Url(str)); } catch(e){ return null; }
  }

  const DEFAULT_CONFIG = {
    name: "You",
    letter: [
      "Dear {name},",
      "Another year, and somehow you've made every part of it better just by being in it.",
      "This page isn't much — a candle, a few photos, a little noise. But I wanted you to have something that was only yours today.",
      "Happy birthday. I hope this year is loud in the ways you love and quiet in the ways you need."
    ],
    signature: "— with love",
    // Data-URL strings (or "") for up to 4 memory photos, plus captions.
    photos: ["", "", "", ""],
    captions: ["", "", "", ""]
  };

  const hashMatch = /^#cfg=(.+)$/.exec(location.hash);
  const decodedFromLink = hashMatch ? decodeConfig(hashMatch[1]) : null;
  let CONFIG = decodedFromLink
    ? Object.assign({}, DEFAULT_CONFIG, decodedFromLink)
    : Object.assign({}, DEFAULT_CONFIG);

  const nameOverride = new URLSearchParams(location.search).get("name");
  if (nameOverride && !decodedFromLink) CONFIG.name = nameOverride;

  function renderLetter(){
    document.getElementById("curtainName").textContent = CONFIG.name;
    const inner = document.getElementById("letterInner");
    inner.innerHTML = "";
    CONFIG.letter.forEach(line => {
      const p = document.createElement("p");
      p.className = "letter-line";
      p.textContent = line.replace(/\{name\}/g, CONFIG.name);
      inner.appendChild(p);
    });
    const sign = document.createElement("p");
    sign.className = "letter-sign";
    sign.textContent = CONFIG.signature;
    inner.appendChild(sign);
  }

  function applyPhotos(){
    document.querySelectorAll(".mem-photo").forEach((el, i) => {
      const src = CONFIG.photos && CONFIG.photos[i];
      el.style.backgroundImage = src ? `url("${src}")` : "";
    });
    document.querySelectorAll(".mem-caption").forEach(el => {
      const i = Number(el.dataset.i);
      const caption = CONFIG.captions && CONFIG.captions[i];
      el.textContent = caption || (CONFIG.photos[i] ? "" : "replace with a photo");
    });
  }

  function applyConfig(){
    renderLetter();
    applyPhotos();
  }
  applyConfig();

  /* ----------------------------------------------------------
     0b. Editor screen — lets the sender write the letter, add
         real photos, and generate a shareable link, all in the
         browser. Shown first unless the URL already carries a
         #cfg= link (i.e. someone opening a link they were sent).
  ---------------------------------------------------------- */
  const editorScreen = document.getElementById("editor");
  const curtainScreen = document.getElementById("curtain");
  const edName = document.getElementById("edName");
  const edLetter = document.getElementById("edLetter");
  const edSignature = document.getElementById("edSignature");
  const generateBtn = document.getElementById("generateBtn");
  const linkPanel = document.getElementById("linkPanel");
  const linkOutput = document.getElementById("linkOutput");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const previewBtn = document.getElementById("previewBtn");
  const editAgainBtn = document.getElementById("editAgainBtn");
  const photoSizeNote = document.getElementById("photoSizeNote");

  let photoState = CONFIG.photos.slice();

  function populateEditor(){
    edName.value = CONFIG.name === "You" ? "" : CONFIG.name;
    edLetter.value = CONFIG.letter.join("\n");
    edSignature.value = CONFIG.signature === DEFAULT_CONFIG.signature ? "" : CONFIG.signature;
    photoState = CONFIG.photos.slice();
    document.querySelectorAll(".photo-slot").forEach((slot, i) => {
      const img = slot.querySelector(".photo-preview");
      const removeBtn = slot.querySelector(".photo-remove");

    // Labels wrapping a hidden file input aren't reachable by Tab on
    // their own — make the slot itself a real keyboard target.
    slot.setAttribute("tabindex", "0");
    slot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); input.click(); }
    });
      if (photoState[i]) {
        img.src = photoState[i]; img.hidden = false; removeBtn.hidden = false;
        slot.querySelector(".photo-plus").hidden = true;
      } else {
        img.hidden = true; removeBtn.hidden = true; img.removeAttribute("src");
        slot.querySelector(".photo-plus").hidden = false;
      }
    });
    linkPanel.hidden = true;
  }

  function showEditor(){
    populateEditor();
    editorScreen.hidden = false;
    curtainScreen.hidden = true;
  }
  function showCurtain(){
    applyConfig();
    editorScreen.hidden = true;
    curtainScreen.hidden = false;
  }

  // Shrink an uploaded photo client-side so the shareable link
  // (which carries every photo as base64) stays a reasonable size.
  function compressPhoto(file){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        img.onerror = reject;
        img.onload = () => {
          const maxSide = 640;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  document.querySelectorAll(".photo-slot").forEach((slot, i) => {
    const input = slot.querySelector('input[type="file"]');
    const img = slot.querySelector(".photo-preview");
    const plus = slot.querySelector(".photo-plus");
    const removeBtn = slot.querySelector(".photo-remove");

    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      plus.textContent = "…";
      try {
        const dataUrl = await compressPhoto(file);
        photoState[i] = dataUrl;
        img.src = dataUrl; img.hidden = false; removeBtn.hidden = false; plus.hidden = true;
      } catch(e){
        photoSizeNote.textContent = "Couldn't read that image — try a different one.";
      } finally {
        plus.textContent = "+";
        updateSizeNote();
      }
    });

    removeBtn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      photoState[i] = "";
      img.hidden = true; removeBtn.hidden = true; plus.hidden = false; input.value = "";
      updateSizeNote();
    });
  });

  function updateSizeNote(){
    const bytes = photoState.reduce((sum, p) => sum + (p ? p.length * 0.75 : 0), 0);
    if (bytes > 900 * 1024) {
      photoSizeNote.textContent = "That's a big link — consider removing a photo if it doesn't open smoothly for them.";
    } else if (bytes > 0) {
      photoSizeNote.textContent = `Link size so far: about ${Math.round(bytes / 1024)}KB.`;
    } else {
      photoSizeNote.textContent = "";
    }
  }

  function buildConfigFromEditor(){
    const letterLines = edLetter.value.split("\n").map(s => s.trim()).filter(Boolean);
    return {
      name: edName.value.trim() || "You",
      letter: letterLines.length ? letterLines : DEFAULT_CONFIG.letter,
      signature: edSignature.value.trim() || DEFAULT_CONFIG.signature,
      photos: photoState.slice(),
      captions: DEFAULT_CONFIG.captions.slice()
    };
  }

  generateBtn.addEventListener("click", () => {
    CONFIG = buildConfigFromEditor();
    const encoded = encodeConfig(CONFIG);
    const url = location.origin + location.pathname + "#cfg=" + encoded;
    history.replaceState(null, "", url);
    linkOutput.value = url;
    linkPanel.hidden = false;
    linkPanel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  });

  copyLinkBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(linkOutput.value);
    } catch(e){
      linkOutput.select();
      document.execCommand("copy");
    }
    const original = copyLinkBtn.textContent;
    copyLinkBtn.textContent = "copied ✓";
    setTimeout(() => { copyLinkBtn.textContent = original; }, 1600);
  });

  previewBtn.addEventListener("click", showCurtain);
  editAgainBtn.addEventListener("click", showEditor);

  if (decodedFromLink) {
    showCurtain();
    editAgainBtn.hidden = true;
  } else {
    showEditor();
  }

  /* ----------------------------------------------------------
     1. Ambient starfield (canvas, behind everything)
  ---------------------------------------------------------- */
  const sky = document.getElementById("sky");
  const skyCtx = sky.getContext("2d");
  let stars = [];

  function sizeCanvas(canvas){
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  function makeStars(){
    const count = Math.floor((window.innerWidth * window.innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005
    }));
  }

  function drawSky(t){
    skyCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    skyCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const s of stars){
      const twinkle = reduceMotion ? 0.7 : 0.55 + Math.sin(t * s.speed + s.phase) * 0.45;
      skyCtx.globalAlpha = Math.max(0, twinkle);
      skyCtx.fillStyle = "#F4EDE0";
      skyCtx.beginPath();
      skyCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      skyCtx.fill();
    }
    skyCtx.globalAlpha = 1;
    if (!reduceMotion) requestAnimationFrame(drawSky);
  }

  sizeCanvas(sky);
  makeStars();
  requestAnimationFrame(drawSky);
  if (reduceMotion) drawSky(0);

  window.addEventListener("resize", () => {
    sizeCanvas(sky);
    makeStars();
    sizeCanvas(fx);
  });

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (canHover && !reduceMotion){
    window.addEventListener("pointermove", (e) => {
      const px = (e.clientX / window.innerWidth - 0.5) * 14;
      const py = (e.clientY / window.innerHeight - 0.5) * 14;
      sky.style.setProperty("--px", px.toFixed(2));
      sky.style.setProperty("--py", py.toFixed(2));
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     2. FX canvas: confetti + sparks, shared by candle/seal/balloons
  ---------------------------------------------------------- */
  const fx = document.getElementById("fx");
  const fxCtx = fx.getContext("2d");
  sizeCanvas(fx);
  let particles = [];
  let fxRunning = false;

  const COLORS = ["#F2A340", "#E8583A", "#D8B463", "#FBF6EC", "#9A9DC4"];

  function burst(x, y, opts = {}){
    const n = opts.count || 60;
    for (let i = 0; i < n; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = (opts.speed || 6) * (0.4 + Math.random() * 0.9);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (opts.upBias || 2),
        g: opts.gravity ?? 0.18,
        drag: 0.988,
        life: 0,
        maxLife: 70 + Math.random() * 50,
        size: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: Math.random() < 0.35 ? "circle" : "rect",
        spin: Math.random() * 0.3 - 0.15,
        rot: Math.random() * Math.PI
      });
    }
    if (!fxRunning) runFx();
  }

  function runFx(){
    fxRunning = true;
    fxCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(p => {
      p.life++;
      p.vy += p.g;
      p.vx *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.spin;
      const fadeStart = p.maxLife * 0.7;
      const alpha = p.life < fadeStart ? 1 : Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart));
      fxCtx.save();
      fxCtx.globalAlpha = alpha;
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillStyle = p.color;
      if (p.shape === "circle"){
        fxCtx.beginPath();
        fxCtx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
        fxCtx.fill();
      } else {
        fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      }
      fxCtx.restore();
    });
    particles = particles.filter(p => p.life < p.maxLife && p.y < window.innerHeight + 40);
    if (particles.length){
      requestAnimationFrame(runFx);
    } else {
      fxRunning = false;
      fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  /* ----------------------------------------------------------
     3. Slide controller — this is the piece that was missing
        before: it's what actually connects each button to
        "move on to the next part of the story."
  ---------------------------------------------------------- */
  const SLIDES = ["hero", "letterScene", "memories", "balloons", "closing"];
  const slideEls = SLIDES.map(id => document.getElementById(id));
  const nextBtn = document.getElementById("nextBtn");
  const slideDots = document.getElementById("slideDots");
  let idx = -1;
  let autoTimer = null;

  SLIDES.forEach(() => {
    const d = document.createElement("span");
    d.className = "dot";
    slideDots.appendChild(d);
  });
  const dotEls = Array.from(slideDots.children);

  function armAuto(ms){
    clearTimeout(autoTimer);
    autoTimer = setTimeout(nextSlide, ms);
  }
  function disarmAuto(){ clearTimeout(autoTimer); }
  function setReady(){ nextBtn.classList.add("ready"); }

  function showSlide(i){
    disarmAuto();
    const leaving = SLIDES[idx];
    if (leaving === "hero") stopMic();
    i = Math.max(0, Math.min(SLIDES.length - 1, i));
    idx = i;
    slideEls.forEach((el, n) => {
      el.classList.toggle("active", n === i);
      el.classList.toggle("prev", n < i);
    });
    dotEls.forEach((d, n) => d.classList.toggle("active", n === i));
    nextBtn.classList.remove("ready");
    nextBtn.hidden = SLIDES[i] === "closing";
    const enter = onEnter[SLIDES[i]];
    if (enter) enter();
  }
  function nextSlide(){ if (idx < SLIDES.length - 1) showSlide(idx + 1); }
  nextBtn.addEventListener("click", nextSlide);

  /* ----------------------------------------------------------
     4. Hero slide: the candle. Blown out by holding/tapping the
        button, or by an opt-in microphone check (no surprise
        permission prompt — the person has to press the mic
        button first).
  ---------------------------------------------------------- */
  const heroSection = document.getElementById("hero");
  const blowBtn = document.getElementById("blowBtn");
  const blowLabel = document.getElementById("blowLabel");
  const micBtn = document.getElementById("micBtn");
  const micHint = document.getElementById("micHint");
  const cakeSvg = document.getElementById("cakeSvg");
  let blown = false;
  let holdTimer = null;
  let holdProgress = 0;

  function extinguish(){
    if (blown) return;
    blown = true;
    heroSection.classList.add("blown");
    blowLabel.textContent = "made a wish ✓";
    blowBtn.disabled = true;
    micBtn.hidden = true;
    const rect = cakeSvg.getBoundingClientRect();
    burst(rect.left + rect.width * 0.5, rect.top + rect.height * 0.29, { count: 90, speed: 8, upBias: 6 });
    stopMic();
    setReady();
    armAuto(1600);
  }

  function startHold(){
    if (blown) return;
    holdProgress = 0;
    clearInterval(holdTimer);
    holdTimer = setInterval(() => {
      holdProgress += 1;
      if (holdProgress > 6) { extinguish(); clearInterval(holdTimer); }
    }, 60);
  }
  function cancelHold(){ clearInterval(holdTimer); }

  blowBtn.addEventListener("pointerdown", startHold);
  blowBtn.addEventListener("pointerup", cancelHold);
  blowBtn.addEventListener("pointerleave", cancelHold);
  blowBtn.addEventListener("click", () => { if (holdProgress <= 6) extinguish(); });

  // Microphone-based blow detection — opt-in only, triggered by micBtn.
  let audioCtx, analyser, micStream, micRAF, micActive = false;
  async function initMic(){
    if (!navigator.mediaDevices?.getUserMedia) {
      micHint.hidden = false;
      micHint.textContent = "mic isn't available on this browser — hold the button instead";
      resetMicBtn();
      return;
    }
    try{
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      micHint.hidden = false;
      micHint.textContent = "listening... go on, blow";
      let loudFrames = 0;
      const check = () => {
        if (blown) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        // require a short sustained gust, not a single spike, to avoid false triggers
        loudFrames = avg > 40 ? loudFrames + 1 : 0;
        if (loudFrames >= 3) extinguish();
        micRAF = requestAnimationFrame(check);
      };
      check();
    } catch(e){
      micHint.hidden = false;
      micHint.textContent = "mic unavailable — hold the button instead";
      resetMicBtn();
    }
  }
  function resetMicBtn(){
    micActive = false;
    micBtn.disabled = false;
    micBtn.textContent = "🎤 blow into your mic instead";
  }
  function stopMic(){
    cancelAnimationFrame(micRAF);
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  }
  micBtn.addEventListener("click", () => {
    if (micActive || blown) return;
    micActive = true;
    micBtn.disabled = true;
    micBtn.textContent = "listening…";
    initMic();
  });

  function resetHero(){
    blown = false;
    heroSection.classList.remove("blown");
    blowLabel.textContent = "hold to blow · or tap";
    blowBtn.disabled = false;
    micBtn.hidden = false;
    micHint.hidden = true;
    stopMic();
    resetMicBtn();
  }

  /* ----------------------------------------------------------
     5. Letter slide: wax seal → letter
  ---------------------------------------------------------- */
  const seal = document.getElementById("seal");
  const sealHint = document.querySelector(".seal-hint");
  const letter = document.getElementById("letter");
  function openLetter(){
    if (seal.classList.contains("opened")) return;
    seal.classList.add("opened");
    if (sealHint) sealHint.classList.add("hidden");
    letter.classList.add("open");
    const rect = seal.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 26, speed: 4, upBias: 1 });
    setReady();
    armAuto(3200);
  }
  seal.addEventListener("click", openLetter);
  seal.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openLetter(); } });

  function resetLetter(){
    seal.classList.remove("opened");
    if (sealHint) sealHint.classList.remove("hidden");
    letter.classList.remove("open");
  }

  /* ----------------------------------------------------------
     6. Balloons slide: spawn + pop
  ---------------------------------------------------------- */
  const balloonField = document.getElementById("balloonField");
  const balloonColors = ["#E8583A", "#F2A340", "#D8B463", "#9A9DC4", "#FBF6EC"];
  let balloonsSpawned = false;
  let balloonSpawnInterval = null;
  let poppedOnce = false;

  function spawnBalloon(delay){
    const el = document.createElement("div");
    el.className = "balloon";
    const color = balloonColors[Math.floor(Math.random() * balloonColors.length)];
    el.style.background = `radial-gradient(circle at 32% 28%, ${color}, ${color}cc)`;
    el.style.left = Math.random() * 86 + "%";
    el.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
    el.style.animationDuration = (7 + Math.random() * 4) + "s";
    el.style.animationDelay = delay + "s";
    el.addEventListener("click", () => popBalloon(el), { once: true });
    el.addEventListener("animationend", () => el.remove());
    balloonField.appendChild(el);
  }

  function popBalloon(el){
    const rect = el.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 34, speed: 5, upBias: 1 });
    el.classList.add("popped");
    setTimeout(() => el.remove(), 300);
    if (!poppedOnce){
      poppedOnce = true;
      setReady();
      armAuto(3400);
    }
  }

  function spawnField(){
    if (balloonsSpawned) return;
    balloonsSpawned = true;
    for (let i = 0; i < 10; i++) spawnBalloon(i * 0.5);
    balloonSpawnInterval = setInterval(() => {
      if (balloonField.childElementCount < 6) spawnBalloon(0);
    }, 2200);
  }

  function resetBalloons(){
    clearInterval(balloonSpawnInterval);
    balloonField.innerHTML = "";
    balloonsSpawned = false;
    poppedOnce = false;
  }

  /* ----------------------------------------------------------
     7. Closing slide: wish input + restart
  ---------------------------------------------------------- */
  const wishInput = document.getElementById("wishInput");
  const wishBtn = document.getElementById("wishBtn");
  const restartBtn = document.getElementById("restartBtn");

  function sendWish(){
    if (!wishInput.value.trim()) return;
    const rect = wishBtn.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, { count: 50, speed: 7, upBias: 8 });
    wishInput.value = "";
    wishInput.placeholder = "sent ✦ type another";
  }
  wishBtn.addEventListener("click", sendWish);
  wishInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendWish(); });

  restartBtn.addEventListener("click", () => {
    resetHero();
    resetLetter();
    resetBalloons();
    showSlide(0);
  });

  /* ----------------------------------------------------------
     8. Per-slide "on enter" hooks — what happens the moment a
        slide becomes active.
  ---------------------------------------------------------- */
  const onEnter = {
    hero(){
      if (!micAttempted && !blown){
        micAttempted = true;
        micHint.hidden = false;
        micHint.textContent = "asking for mic access…";
        initMic();
      }
    },
    letterScene(){ /* waits on the seal */ },
    memories(){ setReady(); armAuto(4200); },
    balloons(){ spawnField(); },
    closing(){ /* no auto-advance — this is the end */ }
  };

  /* ----------------------------------------------------------
     9. Curtain → first slide
  ---------------------------------------------------------- */
  const curtain = document.getElementById("curtain");
  const stage = document.getElementById("stage");
  const enterBtn = document.getElementById("enterBtn");

  enterBtn.addEventListener("click", () => {
    curtain.classList.add("leaving");
    stage.hidden = false;
    setTimeout(() => { curtain.hidden = true; }, reduceMotion ? 0 : 950);
    showSlide(0);
  });
})();