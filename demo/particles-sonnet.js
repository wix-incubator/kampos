import { Kampos, Ticker, effects } from '../index.js';

// ── Source image dimensions ────────────────────────────────────────────────────
const IMG_W = 256;
const IMG_H = 256;

// ── HSL [0,1] → [R,G,B] [0,255] ──────────────────────────────────────────────
function hsl(h, s, l) {
    const c  = (1 - Math.abs(2 * l - 1)) * s;
    const x  = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m  = l - c / 2;
    const h6 = h * 6;
    let r, g, b;
    if      (h6 < 1) { r = c; g = x; b = 0; }
    else if (h6 < 2) { r = x; g = c; b = 0; }
    else if (h6 < 3) { r = 0; g = c; b = x; }
    else if (h6 < 4) { r = 0; g = x; b = c; }
    else if (h6 < 5) { r = x; g = 0; b = c; }
    else             { r = c; g = 0; b = x; }
    return [(r + m) * 255 | 0, (g + m) * 255 | 0, (b + m) * 255 | 0];
}

// ── Plasma mandala + text overlay ─────────────────────────────────────────────
function buildPlasmaSource() {
    const cv  = document.createElement('canvas');
    cv.width  = IMG_W;
    cv.height = IMG_H;
    const ctx = cv.getContext('2d');
    const id  = ctx.createImageData(IMG_W, IMG_H);
    const d   = id.data;

    for (let y = 0; y < IMG_H; y++) {
        for (let x = 0; x < IMG_W; x++) {
            const nx = x / IMG_W * 2 - 1;
            const ny = y / IMG_H * 2 - 1;
            const r  = Math.sqrt(nx * nx + ny * ny);
            const a  = Math.atan2(ny, nx);
            const v  = 0.45 * Math.sin(r * 9.5)
                     + 0.30 * Math.sin(a * 5 + r * 7)
                     + 0.25 * Math.sin(nx * 9 + ny * 6);
            const hue = ((v + 1) * 0.5 + a / (Math.PI * 2) * 0.4 + 0.5) % 1;
            const lit = 0.48 + 0.12 * Math.sin(r * 5 + a * 2);
            const [R, G, B] = hsl(hue, 0.88, Math.max(0.2, Math.min(0.75, lit)));
            const i = (y * IMG_W + x) * 4;
            d[i] = R;  d[i + 1] = G;  d[i + 2] = B;  d[i + 3] = 255;
        }
    }
    ctx.putImageData(id, 0, 0);

    ctx.globalCompositeOperation = 'screen';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'rgba(255,255,255,0.78)';
    ctx.font         = 'bold 54px monospace';
    ctx.fillText('KAM', IMG_W / 2, IMG_H / 2 - 29);
    ctx.fillText('POS', IMG_W / 2, IMG_H / 2 + 29);

    return cv;
}

// ── Text on transparent background ────────────────────────────────────────────
function buildTextSource(text = 'KAMPOS', color = '#ffffff') {
    const cv  = document.createElement('canvas');
    cv.width  = IMG_W;
    cv.height = IMG_H;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, IMG_W, IMG_H);

    const rawLines = text.split('\n').filter(l => l.trim().length > 0);
    if (!rawLines.length) return cv;

    const face = s => `bold ${s}px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    let size = 120;
    while (size > 8) {
        ctx.font = face(size);
        const fits = rawLines.every(l => ctx.measureText(l).width <= IMG_W * 0.90);
        if (fits && rawLines.length * size * 1.2 <= IMG_H * 0.90) break;
        size -= 2;
    }

    ctx.font         = face(size);
    ctx.fillStyle    = color;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const lineH  = size * 1.2;
    const startY = (IMG_H - rawLines.length * lineH) / 2 + lineH / 2;
    rawLines.forEach((line, i) => ctx.fillText(line, IMG_W / 2, startY + i * lineH));

    return cv;
}

// ── JS-side easing functions ───────────────────────────────────────────────────
// The shader receives the already-eased value, so any curve is supported,
// including elastic overshoot (values slightly outside [0, 1]).
const EASINGS = {
    'smooth':      t => t * t * (3 - 2 * t),
    'linear':      t => t,
    'ease-in':     t => t * t * t,
    'ease-out':    t => 1 - Math.pow(1 - t, 3),
    'ease-in-out': t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,
    'sine':        t => -(Math.cos(Math.PI * t) - 1) / 2,
    'elastic': t => {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        const c5 = (2 * Math.PI) / 4.5;
        return t < 0.5
            ? -(Math.pow(2,  20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            :  (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    },
    'bounce': t => {
        const n = 7.5625, d = 2.75;
        if (t < 1 / d)   { return n * t * t; }
        if (t < 2 / d)   { t -= 1.5 / d;   return n * t * t + 0.75; }
        if (t < 2.5 / d) { t -= 2.25 / d;  return n * t * t + 0.9375; }
        t -= 2.625 / d;  return n * t * t + 0.984375;
    },
};

// ── Animation state ────────────────────────────────────────────────────────────
let ANIM     = 4.5;      // seconds for one-way trip
let HOLD     = 2.0;      // seconds to hold each extreme
let rawT     = 0;        // linear progress [0, 1]
let windT    = 0;        // wind time (continuously advancing)
let phase    = 0;        // 0 assembling | 1 assembled | 2 dispersing | 3 dispersed
let phElap   = 0;        // elapsed time in current phase
let lastTime = null;

let curEasing    = 'smooth';
let sourceMode   = 'plasma';
let textDebounce = null;
let currentSize  = 256;   // active grid size

// ── Particle presets ────────────────────────────────────────────────────────────
const GRID_PRESETS = [64, 128, 192, 256, 384, 512, 768, 1024];

// ── DOM ────────────────────────────────────────────────────────────────────────
const canvas = document.querySelector('#target');

// ── Source canvas ─────────────────────────────────────────────────────────────
let sourceCanvas = buildPlasmaSource();

// ── Effect & Kampos ───────────────────────────────────────────────────────────
const ticker = new Ticker();

const MAX_GRID_SIZE = GRID_PRESETS[GRID_PRESETS.length - 1];  // 1024

const effect = effects.particlesSonnet({
    gridSize:    currentSize,
    maxGridSize: MAX_GRID_SIZE,
    source:      sourceCanvas,
    spread:      1.8,
    windStr:     0.30,
});

const kampos = new Kampos({
    target:   canvas,
    effects:  [effect],
    noSource: true,
    ticker,
    beforeDraw: (timeMs) => {
        const now = timeMs * 0.001;

        // First-frame guard
        if (lastTime === null) { lastTime = now; }
        const dt = Math.min(now - lastTime, 0.1);
        lastTime = now;

        // Resize canvas to fill its CSS layout
        const w = canvas.clientWidth  | 0;
        const h = canvas.clientHeight | 0;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width  = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
        }

        // Advance animation phase
        windT  += dt;
        phElap += dt;

        if (phase === 0) {
            rawT = Math.min(phElap / ANIM, 1);
            if (rawT >= 1) { phase = 1; phElap = 0; }
        } else if (phase === 1) {
            rawT = 1;
            if (phElap >= HOLD) { phase = 2; phElap = 0; }
        } else if (phase === 2) {
            rawT = Math.max(0, 1 - phElap / ANIM);
            if (rawT <= 0) { phase = 3; phElap = 0; }
        } else {
            rawT = 0;
            if (phElap >= HOLD) { phase = 0; phElap = 0; }
        }

        // Push uniforms
        effect.t          = EASINGS[curEasing](rawT);
        effect.time       = windT;
        effect.canvasSize = { width: canvas.width, height: canvas.height };
        effect.pointSize  = Math.max(1.0, canvas.width / currentSize);

        gl.clearColor(0.036, 0.036, 0.07, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    },
    afterDraw: () => {
        // Prevent re-uploading the source texture on every frame
        effect.textures[1].update = false;
    },
});

const { gl } = kampos;

// Verify vertex texture fetch capability (needed for the float data texture)
if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
    kampos.destroy();
    document.body.innerHTML = '<p style="color:#f88;font:20px sans-serif;padding:2rem">'
        + 'particles-sonnet requires vertex texture fetch support.</p>';
    throw new Error('particles-sonnet: MAX_VERTEX_TEXTURE_IMAGE_UNITS < 1');
}

gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// ── Replay helper ─────────────────────────────────────────────────────────────
function replay() {
    rawT = 0; windT = 0; phase = 0; phElap = 0; lastTime = null;
}

// ── Source update helpers ─────────────────────────────────────────────────────
function applySource(cv) {
    sourceCanvas = cv;
    effect.source = cv;  // setter marks textures[1].update = true
}

function rebuildSource() {
    if (sourceMode === 'text') {
        applySource(buildTextSource(
            (document.getElementById('psn-text-input').value || 'KAMPOS').trim(),
            document.getElementById('psn-color-input').value,
        ));
    } else {
        applySource(buildPlasmaSource());
    }
    replay();
}

// ── Grid size change ──────────────────────────────────────────────────────────
function applyGridSize(newSize) {
    currentSize = newSize;
    effect.rebuild(gl, newSize);
    effect.pointSize = Math.max(1.0, canvas.width / newSize);
    replay();
}

// ── Overlay UI ────────────────────────────────────────────────────────────────
const overlay = document.createElement('div');
Object.assign(overlay.style, {
    position:    'fixed',
    inset:       '14px 14px auto auto',
    display:     'flex',
    flexDirection: 'column',
    gap:         '8px',
    zIndex:      '10',
    fontFamily:  'system-ui, sans-serif',
    fontSize:    '12px',
    color:       '#d8e0f0',
});
document.body.appendChild(overlay);

// source preview canvas
const preview = document.createElement('canvas');
preview.width  = 96;
preview.height = 96;
Object.assign(preview.style, {
    width:        '96px',
    height:       '96px',
    border:       '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    imageRendering: 'pixelated',
    alignSelf:    'flex-end',
});
overlay.appendChild(preview);

function updatePreview() {
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, 96, 96);
    ctx.drawImage(sourceCanvas, 0, 0, 96, 96);
}
updatePreview();

function makeRow(label, ...children) {
    const row = document.createElement('div');
    Object.assign(row.style, {
        display:      'flex',
        alignItems:   'center',
        gap:          '6px',
        background:   'rgba(6,10,22,0.76)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px',
        padding:      '6px 10px',
        backdropFilter: 'blur(6px)',
    });
    if (label) {
        const lbl = document.createElement('span');
        lbl.textContent = label;
        Object.assign(lbl.style, { opacity: '0.5', minWidth: '58px' });
        row.appendChild(lbl);
    }
    children.forEach(c => row.appendChild(c));
    return row;
}

function makeSegBtn(text, active = false) {
    const b = document.createElement('button');
    b.textContent = text;
    Object.assign(b.style, {
        padding:      '3px 9px',
        border:       '1px solid rgba(255,255,255,0.13)',
        borderRadius: '5px',
        background:   active ? 'rgba(120,160,255,0.22)' : 'transparent',
        color:        active ? '#c8d8ff' : '#8898bb',
        cursor:       'pointer',
        fontSize:     '11px',
    });
    return b;
}

function makeRange(min, max, step, value) {
    const r = document.createElement('input');
    r.type  = 'range';
    Object.assign(r, { min, max, step, value });
    r.style.width = '90px';
    return r;
}

function makeValSpan(text) {
    const s = document.createElement('span');
    s.textContent = text;
    Object.assign(s.style, { opacity: '0.45', minWidth: '34px', fontVariantNumeric: 'tabular-nums' });
    return s;
}

function makeSelect(options, value) {
    const s = document.createElement('select');
    Object.assign(s.style, {
        background: 'rgba(14,20,38,0.9)',
        border:     '1px solid rgba(255,255,255,0.12)',
        color:      '#c8d8ff',
        borderRadius: '5px',
        padding:    '2px 4px',
        fontSize:   '11px',
    });
    options.forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value   = val;
        opt.text    = label;
        opt.selected = val === value;
        s.appendChild(opt);
    });
    return s;
}

// ── Source row ────────────────────────────────────────────────────────────────
const plasmaBtn = makeSegBtn('Plasma', true);
const textBtn   = makeSegBtn('Text');
const textInput = document.createElement('input');
Object.assign(textInput, { id: 'psn-text-input', type: 'text', value: 'KAMPOS', maxLength: 24 });
Object.assign(textInput.style, {
    display:     'none', width: '80px', padding: '2px 6px',
    background:  'rgba(14,20,38,0.9)', border: '1px solid rgba(255,255,255,0.12)',
    color:       '#c8d8ff', borderRadius: '5px', fontSize: '11px',
});
const colorInput = document.createElement('input');
Object.assign(colorInput, { id: 'psn-color-input', type: 'color', value: '#ffffff' });
Object.assign(colorInput.style, { display: 'none', width: '32px', height: '24px', padding: '1px', cursor: 'pointer', border: 'none', borderRadius: '4px', background: 'transparent' });

overlay.appendChild(makeRow('source', plasmaBtn, textBtn, textInput, colorInput));

[plasmaBtn, textBtn].forEach(btn => btn.addEventListener('click', () => {
    sourceMode = btn === plasmaBtn ? 'plasma' : 'text';
    [plasmaBtn, textBtn].forEach(b => {
        b.style.background = b === btn ? 'rgba(120,160,255,0.22)' : 'transparent';
        b.style.color      = b === btn ? '#c8d8ff' : '#8898bb';
    });
    textInput.style.display  = sourceMode === 'text' ? '' : 'none';
    colorInput.style.display = sourceMode === 'text' ? '' : 'none';
    rebuildSource();
    updatePreview();
}));

textInput.addEventListener('input', () => {
    clearTimeout(textDebounce);
    textDebounce = setTimeout(() => { rebuildSource(); updatePreview(); }, 600);
});
textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { clearTimeout(textDebounce); rebuildSource(); updatePreview(); }
});
colorInput.addEventListener('input', () => { rebuildSource(); updatePreview(); });

// ── Particles row ─────────────────────────────────────────────────────────────
const particleSel = makeSelect(
    GRID_PRESETS.map(s => {
        const n = s * s;
        const label = n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(0)} M  (${s}×${s})`
            : n >= 1_000
                ? `${(n / 1_000).toFixed(0)} K  (${s}×${s})`
                : `${n}  (${s}×${s})`;
        return [String(s), label];
    }),
    String(currentSize),
);
overlay.appendChild(makeRow('particles', particleSel));
particleSel.addEventListener('change', () => applyGridSize(+particleSel.value));

// ── Duration / hold ────────────────────────────────────────────────────────────
const durSlider  = makeRange(0.5, 12, 0.5, ANIM);
const durVal     = makeValSpan(`${ANIM.toFixed(1)} s`);
const holdSlider = makeRange(0, 5, 0.5, HOLD);
const holdVal    = makeValSpan(`${HOLD.toFixed(1)} s`);

overlay.appendChild(makeRow('duration', durSlider, durVal));
overlay.appendChild(makeRow('hold', holdSlider, holdVal));

durSlider.addEventListener('input', () => {
    ANIM = parseFloat(durSlider.value);
    durVal.textContent = `${ANIM.toFixed(1)} s`;
});
holdSlider.addEventListener('input', () => {
    HOLD = parseFloat(holdSlider.value);
    holdVal.textContent = `${HOLD.toFixed(1)} s`;
});

// ── Easing row ────────────────────────────────────────────────────────────────
const easingSel = makeSelect([
    ['smooth',      'Smooth (default)'],
    ['linear',      'Linear'],
    ['ease-in',     'Ease in (cubic)'],
    ['ease-out',    'Ease out (cubic)'],
    ['ease-in-out', 'Ease in-out (cubic)'],
    ['sine',        'Sine in-out'],
    ['elastic',     'Elastic ✦'],
    ['bounce',      'Bounce out ✦'],
], curEasing);
overlay.appendChild(makeRow('easing', easingSel));
easingSel.addEventListener('change', () => { curEasing = easingSel.value; });

// ── Wind strength row ─────────────────────────────────────────────────────────
const windSlider = makeRange(0, 1.5, 0.05, effect.windStr);
const windVal    = makeValSpan(effect.windStr.toFixed(2));
overlay.appendChild(makeRow('wind', windSlider, windVal));
windSlider.addEventListener('input', () => {
    effect.windStr = parseFloat(windSlider.value);
    windVal.textContent = effect.windStr.toFixed(2);
});

// ── Spread row ────────────────────────────────────────────────────────────────
const spreadSlider = makeRange(0.5, 3.5, 0.1, effect.spread);
const spreadVal    = makeValSpan(effect.spread.toFixed(1) + '×');
overlay.appendChild(makeRow('spread', spreadSlider, spreadVal));
spreadSlider.addEventListener('input', () => {
    effect.spread = parseFloat(spreadSlider.value);
    spreadVal.textContent = effect.spread.toFixed(1) + '×';
});

// ── Replay button ─────────────────────────────────────────────────────────────
const replayBtn = document.createElement('button');
replayBtn.textContent = 'Replay';
Object.assign(replayBtn.style, {
    marginTop:    '4px',
    padding:      '8px 18px',
    border:       '1px solid rgba(255,255,255,0.14)',
    borderRadius: '999px',
    background:   'rgba(10,16,34,0.82)',
    color:        '#d8e0f0',
    cursor:       'pointer',
    fontSize:     '12px',
    alignSelf:    'flex-end',
});
overlay.appendChild(replayBtn);
replayBtn.addEventListener('click', replay);
window.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); replay(); } });

// ── Start ─────────────────────────────────────────────────────────────────────
ticker.start();
