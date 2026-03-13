// Sound Rain

const SAMPLE_PATHS = [
  "assets/sounds/1.wav", "assets/sounds/2.wav", "assets/sounds/3.wav",
  "assets/sounds/4.wav", "assets/sounds/5.wav", "assets/sounds/6.wav",
  "assets/sounds/bird.wav", "assets/sounds/carnoise.wav", "assets/sounds/doorbell.wav",
  "assets/sounds/electronoise.wav", "assets/sounds/hitground.wav", "assets/sounds/machinenoise.wav",
  "assets/sounds/metal1.wav", "assets/sounds/metal2.wav", "assets/sounds/metal3.wav",
  "assets/sounds/metal4.wav", "assets/sounds/noise.wav", "assets/sounds/rain.wav",
  "assets/sounds/waternoise.wav"
];

let samples = [];
let audioReady = false;

let notes = [];
let lines = [];

let buildings = [];
let cityParticles = [];
let cityWindows = [];

let cityAge = 0;          // slowly increases with impacts, gives a "living city" feel
let masterGain, globalReverb;

let resetButton;

// tweakables
const BASE_REVERB_WET = 0.12;

function preload() {
  samples = SAMPLE_PATHS.map(p => loadSound(p));
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noiseSeed(floor(random(1e6)));

  // global audio bus
  masterGain = new p5.Gain();
  masterGain.amp(0.85);
  masterGain.connect();

  globalReverb = new p5.Reverb();
  globalReverb.drywet(BASE_REVERB_WET);
  globalReverb.connect(masterGain);

  rebuildCity();
  frameRate(60);

  // -------- Reset button --------
  resetButton = createButton("Reset");
  styleResetButton(resetButton);
  positionResetButton();
  resetButton.mousePressed(resetAll);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildCity();
  positionResetButton();
}

function mousePressed() {
  // browser audio unlock
  if (!audioReady) {
    userStartAudio();
    audioReady = true;
  }

  // ignore clicks on the button itself
  if (resetButton && resetButton.elt) {
    const r = resetButton.elt.getBoundingClientRect();
    if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) return;
  }

  spawnNote(mouseX, mouseY);
}

function draw() {
  // cheap motion blur / trails
  background(10, 10, 12, 60);

  drawGrain();

  // windows first (so particles feel like they're "in front")
  for (let w of cityWindows) {
    w.update();
    w.render();
  }

  // city body particles
  for (let p of cityParticles) {
    p.update();
    p.render();
  }

  // tail lines (web over time)
  for (let i = lines.length - 1; i >= 0; i--) {
    lines[i].update();
    lines[i].render();
    if (lines[i].dead) lines.splice(i, 1);
  }

  // falling notes
  for (let i = notes.length - 1; i >= 0; i--) {
    notes[i].update();
    notes[i].render();
    if (notes[i].dead) notes.splice(i, 1);
  }

  // city "age" cools down slowly
  cityAge *= 0.997;
}

// ------------------------ UI helpers ------------------------

function styleResetButton(btn) {
  btn.style("background", "transparent");
  btn.style("color", "rgba(255,255,255,0.7)");
  btn.style("border", "1px solid rgba(255,255,255,0.3)");
  btn.style("padding", "4px 10px");
  btn.style("font-size", "11px");
  btn.style("cursor", "pointer");
  btn.style("border-radius", "10px");
}

function positionResetButton() {
  if (!resetButton) return;
  resetButton.position(14, height - 36);
}

// Reset everything to initial state (but keeps audio unlocked)
function resetAll() {
  // stop all sample playback (so nothing keeps ringing)
  for (let s of samples) {
    if (s && s.isPlaying && s.isPlaying()) s.stop();
  }

  // clear runtime objects
  notes = [];
  lines = [];

  buildings = [];
  cityParticles = [];
  cityWindows = [];

  // reset "time" / city mood
  cityAge = 0;
  if (globalReverb) globalReverb.drywet(BASE_REVERB_WET);

  // rebuild city fresh
  rebuildCity();
}

// ------------------------ utilities ------------------------

function drawGrain() {
  stroke(255, 12);
  for (let i = 0; i < 80; i++) point(random(width), random(height));
}

function rebuildCity() {
  generateBuildingData();
  buildCityParticles();
}

function groundYAt(x) {
  return height - getCityHeight(x);
}

function getCityHeight(x) {
  // find tallest building at this x
  let maxH = 0;

  for (let b of buildings) {
    if (x >= b.x && x <= b.x + b.w) {
      let h = b.h;

      if (b.type === "sloped") {
        // kinda like a roof angle, simple and good enough
        h -= (x - b.x) * 0.2;
      }

      if (b.type === "stepped") {
        // blocky steps for more "building-ish" feel
        const seg = 4;
        const u = constrain((x - b.x) / max(1, b.w), 0, 1);
        const stepId = floor(u * seg);
        h -= stepId * (b.h * 0.08);
      }

      if (h > maxH) maxH = h;
    }
  }

  return maxH || height * 0.12;
}

// impact intensity: mostly based on building height + a bit of noise
function impactIntensityAt(x, yHit) {
  const h = getCityHeight(x);
  const heightFactor = constrain(h / (height * 0.65), 0, 1);
  const micro = noise(12000 + x * 0.006, 30000 + yHit * 0.006);

  let v = 0.72 * heightFactor + 0.28 * micro;
  v = pow(constrain(v, 0, 1), 0.9);

  // keep a minimum so small hits still do something
  return constrain(0.18 + v * 0.82, 0, 1);
}

// ------------------------ city generation ------------------------

function generateBuildingData() {
  buildings = [];
  cityWindows = [];

  let currentX = 0;

  while (currentX < width) {
    const bW = random(width * 0.05, width * 0.12);
    let bH = random(height * 0.22, height * 0.62);

    // taller around center, lower on the sides (simple "district" trick)
    const dist = abs(currentX + bW / 2 - width / 2) / (width / 2);
    bH *= map(dist, 0, 1, 1.2, 0.5);

    const building = {
      x: currentX,
      w: bW,
      h: bH,
      type: random(["flat", "sloped", "stepped"])
    };
    buildings.push(building);

    // sprinkle windows inside the building
    for (let wx = currentX + 6; wx < currentX + bW - 6; wx += 14) {
      for (let wy = height - bH + 18; wy < height - 12; wy += 18) {
        if (random() > 0.82) {
          cityWindows.push(new CityWindow(wx, wy));
        }
      }
    }

    currentX += bW * random(0.82, 1.18);
  }
}

function buildCityParticles() {
  cityParticles = [];

  // smaller step = denser city (but heavier)
  const step = 6;

  for (let x = 0; x < width; x += step) {
    const startY = height - getCityHeight(x);

    for (let y = startY; y < height; y += step) {
      // leave holes so it doesn't become a solid rectangle
      if (random() > 0.30) {
        cityParticles.push(new CityParticle(x, y));
      }
    }
  }
}

// ------------------------ interaction ------------------------

function spawnNote(x, y) {
  const n = new NoteDrop(x, y);
  notes.push(n);

  // if user clicks inside the city, trigger immediately (feels responsive)
  const yHit = groundYAt(x);
  if (y >= yHit) n.hit(yHit);
}

// ------------------------ city energy ------------------------

function shockCityParticles(x, y, intensity01) {
  // quick burst, like the city absorbs energy
  const r = lerp(55, 120, intensity01);
  const e = lerp(120, 260, intensity01);

  for (let p of cityParticles) {
    const d = dist(x, y, p.baseX, p.baseY);
    if (d < r) p.energy = max(p.energy, (r - d) * (e / r));
  }
}

function depositEnergyToCity(x, y, collapse01, intensity01) {
  const r = lerp(60, 170, collapse01) * lerp(0.95, 1.45, intensity01);
  const e = lerp(10, 2.0, collapse01) * lerp(0.9, 2.0, intensity01);

  for (let p of cityParticles) {
    const dx = p.baseX - x;
    const dy = p.baseY - y;
    const d2 = dx * dx + dy * dy;

    if (d2 < r * r) {
      const f = 1 - sqrt(d2) / r;
      p.energy = min(220, p.energy + e * f * 2.2);
    }
  }
}

// ------------------------ classes ------------------------

class CityWindow {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.baseAlpha = random(35, 120);
    this.alpha = this.baseAlpha;

    this.seed = random(1000);
    this.personality = random(0.6, 1.5); // some windows are more "alive"
  }

  update() {
    // smooth flicker (noise is basically free vibes)
    const n = noise(this.seed + frameCount * 0.02);

    // slow gate so some windows blink off sometimes
    const gate = noise(9000 + this.seed, frameCount * 0.004) > 0.45 ? 1 : 0.55;

    this.alpha = this.baseAlpha * n * 1.6 * this.personality * gate * (0.75 + cityAge * 0.4);
  }

  render() {
    noStroke();
    fill(235, 235, 215, constrain(this.alpha, 0, 220));
    rect(this.x, this.y, 3, 4);
  }
}

class CityParticle {
  constructor(x, y) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;

    this.energy = 0;
    this.offset = random(1000);
    this.alpha = random(18, 65);
  }

  update() {
    const t = frameCount * 0.01;

    // more energy = more wobble (simple but effective)
    const moveLimit = map(this.energy, 0, 120, 0.8, 5.2);
    const drift = 0.8 + cityAge * 0.8;

    this.x = this.baseX + (noise(this.offset, t) - 0.5) * moveLimit * drift;
    this.y = this.baseY + (noise(this.offset + 500, t) - 0.5) * moveLimit * drift;

    this.energy *= 0.96;
  }

  render() {
    const a = constrain(this.alpha + this.energy + cityAge * 45, 0, 235);
    stroke(220, a);
    strokeWeight(1.5);
    point(this.x, this.y);
  }
}

class TailLine {
  constructor(x, y) {
    this.x0 = x; this.y0 = y;
    this.x1 = x; this.y1 = y;

    this.birth = millis();
    this.fadeDelay = 60000;
    this.fadeDuration = 20000;

    this.alpha = 70;
    this.dead = false;
    this.frozen = false;
  }

  freeze() { this.frozen = true; }

  update() {
    const t = millis() - this.birth;

    if (t < this.fadeDelay) {
      this.alpha = 70;
    } else {
      const u = constrain((t - this.fadeDelay) / this.fadeDuration, 0, 1);
      this.alpha = lerp(70, 0, u);
      if (u >= 1) this.dead = true;
    }
  }

  render() {
    stroke(200, constrain(this.alpha, 0, 70));
    strokeWeight(0.4);
    line(this.x0, this.y0, this.x1, this.y1);
  }
}

class NoteDrop {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    // fast + angled (your original vibe)
    this.vx = random(-2.2, 2.2);
    this.vy = random(1.6, 3.8);

    // tiny wind so it doesn't look too "straight down"
    this.windSeed = random(1000);

    this.collided = false;
    this.collapseT = 0;
    this.dead = false;

    this.fragments = [];

    this.line = new TailLine(x, y);
    lines.push(this.line);

    this.impactIntensity = 0.5;
    this.impactY = null;

    this.pitchIndex = floor(random(0, 12));
    this.voice = null;
  }

  update() {
    if (this.dead) return;

    if (!this.collided) {
      const t = frameCount * 0.01;

      // wind drift, subtle but it helps "weaving"
      const w = (noise(this.windSeed + t, this.x * 0.002) - 0.5);
      this.vx = constrain(this.vx + w * 0.12, -3.0, 3.0);

      this.x += this.vx;
      this.y += this.vy;

      // gravity makes it speed up a bit
      this.vy += 0.02;

      if (!this.line.frozen) {
        this.line.x1 = this.x;
        this.line.y1 = this.y;
      }

      const yHit = groundYAt(this.x);
      if (this.y >= yHit) this.hit(yHit);
    } else {
      // collapse particles into the city
      this.collapseT = min(1, this.collapseT + 0.015);

      for (let f of this.fragments) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.04;
        f.vx *= 0.99;

        // don't let fragments float above the skyline forever
        const gy = groundYAt(f.x);
        if (f.y < gy) f.y = lerp(f.y, gy, 0.03);
      }

      depositEnergyToCity(this.x, this.impactY ?? this.y, this.collapseT, this.impactIntensity);

      if (this.collapseT >= 1) this.dead = true;
    }
  }

  render() {
    if (this.dead) return;

    if (!this.collided) {
      stroke(255, 180);
      noFill();
      ellipse(this.x, this.y, 5, 5);
    } else {
      stroke(255, (1 - this.collapseT) * 150);
      for (let f of this.fragments) point(f.x, f.y);
    }
  }

  hit(yHit) {
    if (this.collided) return;

    this.collided = true;
    this.impactY = yHit;
    this.y = yHit;

    // freeze the silk line where it hits
    this.line.x1 = this.x;
    this.line.y1 = this.y;
    this.line.freeze();

    this.impactIntensity = impactIntensityAt(this.x, yHit);

    // fragments (scaled by intensity)
    const fragN = floor(16 + this.impactIntensity * 34);
    for (let i = 0; i < fragN; i++) {
      this.fragments.push({
        x: this.x,
        y: this.y,
        vx: random(-2.2, 2.2) * (0.85 + this.impactIntensity * 0.8),
        vy: random(-2.4, 0.2) * (0.85 + this.impactIntensity * 0.8)
      });
    }

    shockCityParticles(this.x, this.y, this.impactIntensity);

    // audio voice (timeline collapse)
    this.voice = new Voice(this.pitchIndex, this.impactIntensity);
    this.voice.trigger();

    // age up the city a bit (more reverb, more life)
    cityAge = constrain(cityAge + 0.010 + this.impactIntensity * 0.018, 0, 1);
    globalReverb.drywet(constrain(BASE_REVERB_WET + cityAge * 0.30, BASE_REVERB_WET, 0.48));
  }
}

// ------------------------ audio voice ------------------------

class Voice {
  constructor(pitchIndex, intensity01) {
    this.pitchIndex = pitchIndex;
    this.intensity = constrain(intensity01, 0, 1);

    this.gain = new p5.Gain();
    this.gain.amp(0);

    this.lpf = new p5.LowPass();
    this.lpf.freq(12000);
    this.lpf.res(1);

    this.dist = new p5.Distortion(0.06);

    this.rev = new p5.Reverb();
    this.rev.drywet(0.04);

    // gain -> lpf -> distortion -> reverb -> global reverb -> master
    this.gain.connect(this.lpf);
    this.lpf.connect(this.dist);
    this.dist.connect(this.rev);
    this.rev.connect(globalReverb);

    this.src = null;
    this.isOsc = false;
  }

  trigger() {
    if (!audioReady) return;

    // pitch via playback rate (random-ish but musical enough)
    const semitone = (this.pitchIndex - 6) + random(-0.25, 0.25);
    const rate = pow(2, semitone / 12);

    if (samples.length > 0) {
      const s = random(samples);
      s.disconnect();
      s.connect(this.gain);
      s.rate(rate);

      // pick a random slice if the sample is long
      const dur = s.duration();
      const wantLen = 35;
      const offset = (dur > 10.0) ? random(0, max(0, dur - wantLen - 1)) : 0;
      const playLen = min(wantLen, max(0.5, dur - offset));

      s.play(0, 1, 1.0, offset, playLen);
      this.src = s;
    } else {
      // just in case no samples loaded
      const o = new p5.Oscillator();
      o.setType(random(["sine", "triangle"]));
      o.freq(110 * pow(2, this.pitchIndex / 12));
      o.amp(0);
      o.disconnect();
      o.connect(this.gain);
      o.start();
      this.src = o;
      this.isOsc = true;
    }

    this.startTimelineCollapse();
  }

  startTimelineCollapse() {
    const t0 = millis();

    const tDistStart = 5000;   // after 5s, start "going bad"
    const tFadeStart = 15000;  // after 15s, start fading

    const maxDist = lerp(0.55, 0.96, this.intensity);
    const maxWet  = lerp(0.55, 0.93, this.intensity);
    const minLPF  = lerp(1200, 420, this.intensity);

    const fadeDuration = lerp(6500, 14500, this.intensity);
    const stableAmp = lerp(0.85, 0.60, this.intensity);

    // init
    this.dist.set(0.06);
    this.rev.drywet(0.04);
    this.lpf.freq(12000);
    this.gain.amp(stableAmp, 0.02);

    const tick = () => {
      const elapsed = millis() - t0;

      // phase A: 0–5s stable
      if (elapsed < tDistStart) {
        this.dist.set(0.06);
        this.rev.drywet(0.04);
        this.lpf.freq(12000);
        this.gain.amp(stableAmp, 0.08);
      }

      // phase B: 5–15s collapse ramps in
      if (elapsed >= tDistStart && elapsed < tFadeStart) {
        const u = constrain((elapsed - tDistStart) / (tFadeStart - tDistStart), 0, 1);

        this.dist.set(lerp(0.06, maxDist, u));
        this.rev.drywet(lerp(0.04, maxWet, u));
        this.lpf.freq(lerp(12000, minLPF, u));
        this.gain.amp(lerp(stableAmp, stableAmp * 0.82, u), 0.08);
      }

      // phase C: 15s+ fade out
      if (elapsed >= tFadeStart) {
        const v = constrain((elapsed - tFadeStart) / fadeDuration, 0, 1);

        this.dist.set(lerp(maxDist, min(0.99, maxDist + 0.06), v));
        this.rev.drywet(lerp(maxWet, min(0.98, maxWet + 0.06), v));
        this.lpf.freq(lerp(minLPF, max(240, minLPF * 0.75), v));

        this.gain.amp(lerp(stableAmp * 0.82, 0.0, v), 0.12);

        if (v >= 1) {
          this.stop();
          return;
        }
      }

      setTimeout(tick, 60);
    };

    tick();
  }

  stop() {
    if (this.isOsc && this.src) this.src.stop(0.05);
    if (this.src && this.src.isPlaying && this.src.isPlaying()) this.src.stop(0.02);
  }
}
