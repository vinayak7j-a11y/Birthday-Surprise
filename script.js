(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     0. Personalization. DEFAULTS is what you get with a plain
        link. A real, personalized version arrives via a link
        made on create.html, which packs everything into a
        ?data= param — no server, no database needed.
        {name} inside a letter line gets swapped for the name.
  ---------------------------------------------------------- */
  const DEFAULTS = {
    name: "You",
    heroEyebrow: "one candle, one wish",
    heroTitle: "Blow it out<br>when you're ready.",
    blowHint: "tip: allow your mic and actually blow — it works",
    sealHint: "press the seal",
    letter: [
      "Dear {name},",
      "Another year, and somehow you've made every part of it better just by being in it.",
      "This page isn't much — a candle, a few photos, a little noise. But I wanted you to have something that was only yours today.",
      "Happy birthday. I hope this year is loud in the ways you love and quiet in the ways you need."
    ],
    signature: "— with love",
    memoriesEyebrow: "a few we kept",
    memoriesTitle: "Some of my favorites",
    photos: ["", "", "", ""],
    memoryCaptions: ["", "", "", ""],
    balloonsEyebrow: "for good measure",
    balloonsTitle: "Pop them all",
    balloonMessage: ["you", "are", "so", "loved", "today", "✦"],
    closingEyebrow: "last thing",
    closingTitle: "Make a wish.<br>I already made mine — it's you, again.",
    wishPlaceholder: "type a wish, watch it fly",
    footerNote: "made with care, one candle at a time"
  };

  function decodeShareData(raw){
    try{
      const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch(e){
      console.warn("This link's data looked corrupted, showing the default version instead.", e);
      return {};
    }
  }

  function loadConfig(){
    const params = new URLSearchParams(location.search);
    const raw = params.get("data");
    const shared = raw ? decodeShareData(raw) : {};
    const cfg = Object.assign({}, DEFAULTS, shared);
    const nameParam = params.get("name");
    if (nameParam) cfg.name = nameParam; // quick override, still supported
    return cfg;
  }
  const CONFIG = loadConfig();

  document.getElementById("curtainName").textContent = CONFIG.name;
  document.getElementById("heroEyebrow").textContent = CONFIG.heroEyebrow;
  document.getElementById("heroTitle").innerHTML = CONFIG.heroTitle;
  document.getElementById("micHint").textContent = CONFIG.blowHint;
  document.getElementById("sealHintText").textContent = CONFIG.sealHint;
  document.getElementById("memoriesEyebrow").textContent = CONFIG.memoriesEyebrow;
  document.getElementById("memoriesTitle").textContent = CONFIG.memoriesTitle;
  document.getElementById("balloonsEyebrow").textContent = CONFIG.balloonsEyebrow;
  document.getElementById("balloonsTitle").textContent = CONFIG.balloonsTitle;
  document.getElementById("closingEyebrow").textContent = CONFIG.closingEyebrow;
  document.getElementById("closingTitle").innerHTML = CONFIG.closingTitle;
  document.getElementById("wishInput").placeholder = CONFIG.wishPlaceholder;
  document.getElementById("footerNote").textContent = CONFIG.footerNote;

  function renderLetter(){
    const inner = document.getElementById("letterInner");
    inner.innerHTML = "";
    CONFIG.letter.forEach(line => {
      const p = document.createElement("p");
      p.className = "letter-line";
      p.textContent = line.replace("{name}", CONFIG.name);
      inner.appendChild(p);
    });
    const sign = document.createElement("p");
    sign.className = "letter-sign";
    sign.textContent = CONFIG.signature;
    inner.appendChild(sign);
  }
  renderLetter();

  document.querySelectorAll(".mem-photo").forEach(el => {
    const i = Number(el.dataset.i);
    if (CONFIG.photos[i]) el.style.backgroundImage = `url("${CONFIG.photos[i]}")`;
  });
  document.querySelectorAll(".mem-caption").forEach(el => {
    const i = Number(el.dataset.i);
    if (CONFIG.memoryCaptions[i]) el.textContent = CONFIG.memoryCaptions[i];
  });

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
     4. Curtain → first slide
  ---------------------------------------------------------- */
  const curtain = document.getElementById("curtain");
  const stage = document.getElementById("stage");
  document.getElementById("enterBtn").addEventListener("click", () => {
    curtain.classList.add("leaving");
    stage.hidden = false;
    setTimeout(() => { curtain.style.display = "none"; }, reduceMotion ? 0 : 950);
    showSlide(0);
  }, { once: true });

  /* ----------------------------------------------------------
     5. Candle: hold-to-blow (pointer) + microphone blow detection
  ---------------------------------------------------------- */
  const heroSection = document.getElementById("hero");
  const blowBtn = document.getElementById("blowBtn");
  const blowLabel = document.getElementById("blowLabel");
  const micHint = document.getElementById("micHint");
  const cakeSvg = document.getElementById("cakeSvg");
  let blown = false;
  let micStarted = false;
  let holdTimer = null;
  let holdProgress = 0;

  function extinguish(){
    if (blown) return;
    blown = true;
    heroSection.classList.add("blown");
    blowLabel.textContent = "made a wish ✓";
    blowBtn.disabled = true;
    const rect = cakeSvg.getBoundingClientRect();
    burst(rect.left + rect.width * 0.5, rect.top + rect.height * 0.29, { count: 90, speed: 8, upBias: 6 });
    stopMic();
    setReady();
    armAuto(1500);
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
  function cancelHold(){ clearInterval(holdTimer); holdTimer = null; }

  blowBtn.addEventListener("pointerdown", startHold);
  blowBtn.addEventListener("pointerup", cancelHold);
  blowBtn.addEventListener("pointerleave", cancelHold);
  blowBtn.addEventListener("click", () => { if (holdProgress <= 6) extinguish(); });

  let audioCtx, analyser, micStream, micRAF;
  async function initMic(){
    if (micStarted || !navigator.mediaDevices?.getUserMedia) return;
    micStarted = true;
    try{
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      micHint.textContent = "listening... go on, blow";
      let loudFrames = 0;
      const check = () => {
        if (blown) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        loudFrames = avg > 40 ? loudFrames + 1 : 0;
        if (loudFrames >= 3) extinguish();
        micRAF = requestAnimationFrame(check);
      };
      check();
    } catch(e){
      micHint.textContent = "mic unavailable — hold the button instead";
    }
  }
  function stopMic(){
    cancelAnimationFrame(micRAF);
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    if (audioCtx) audioCtx.close();
  }

  /* ----------------------------------------------------------
     6. Wax seal → letter
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
    // give them time to actually read it before auto-advancing
    armAuto(1400 + CONFIG.letter.length * 1500);
  }
  seal.addEventListener("click", openLetter);
  seal.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openLetter(); } });

  /* ----------------------------------------------------------
     7. Balloons: pop them to reveal a hidden message, with a
        live "n/total popped" counter — same mechanic as the
        reference site's balloon screen.
  ---------------------------------------------------------- */
  const balloonField = document.getElementById("balloonField");
  const balloonCounter = document.getElementById("balloonCounter");
  const balloonWords = document.getElementById("balloonWords");
  const balloonColors = ["#E8583A", "#F2A340", "#D8B463", "#9A9DC4", "#FBF6EC"];
  const balloonTotal = CONFIG.balloonMessage.length || 1;
  let balloonsSpawned = false;
  let poppedCount = 0;

  function spawnBalloon(i, delay){
    const el = document.createElement("div");
    el.className = "balloon";
    el.dataset.i = i;
    const color = balloonColors[i % balloonColors.length];
    el.style.background = `radial-gradient(circle at 32% 28%, ${color}, ${color}cc)`;
    el.style.left = (8 + (i * (78 / Math.max(1, balloonTotal - 1))) + (Math.random() * 6 - 3)) + "%";
    el.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
    el.style.animationDuration = (7 + Math.random() * 4) + "s";
    el.style.animationDelay = delay + "s";
    el.addEventListener("click", () => popBalloon(el, i), { once: true });
    el.addEventListener("animationend", () => {
      if (!el.classList.contains("popped")){
        el.remove();
        spawnBalloon(i, 0); // missed it — send another one up
      }
    });
    balloonField.appendChild(el);
  }

  function popBalloon(el, i){
    const rect = el.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 34, speed: 5, upBias: 1 });
    el.classList.add("popped");
    setTimeout(() => el.remove(), 300);

    const word = CONFIG.balloonMessage[i];
    if (word && balloonWords && !balloonWords.querySelector(`[data-w="${i}"]`)){
      const span = document.createElement("span");
      span.className = "balloon-word";
      span.dataset.w = i;
      span.textContent = word;
      balloonWords.appendChild(span);
      poppedCount += 1;
      if (balloonCounter) balloonCounter.textContent = `${poppedCount}/${balloonTotal} popped`;
      if (poppedCount >= balloonTotal) setReady();
    }
  }

  function spawnField(){
    if (balloonsSpawned) return;
    balloonsSpawned = true;
    if (balloonCounter) balloonCounter.textContent = `0/${balloonTotal} popped`;
    for (let i = 0; i < balloonTotal; i++) spawnBalloon(i, i * 0.45);
  }

  /* ----------------------------------------------------------
     8. Wish input: send it up as a little firework
  ---------------------------------------------------------- */
  const wishInput = document.getElementById("wishInput");
  const wishBtn = document.getElementById("wishBtn");
  function sendWish(){
    if (!wishInput.value.trim()) return;
    const rect = wishBtn.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, { count: 50, speed: 7, upBias: 8 });
    wishInput.value = "";
    wishInput.placeholder = "sent ✦ type another";
  }
  wishBtn.addEventListener("click", sendWish);
  wishInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendWish(); });

  document.getElementById("restartBtn").addEventListener("click", () => {
    location.href = location.pathname + location.search;
  });

  /* ----------------------------------------------------------
     9. What happens when each slide becomes active
  ---------------------------------------------------------- */
  const onEnter = {
    hero(){ initMic(); },
    letterScene(){},
    memories(){ setReady(); armAuto(4500); },
    balloons(){ spawnField(); armAuto(12000); },
    closing(){}
  };
})();
