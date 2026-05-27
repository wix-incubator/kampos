import { Kampos, Ticker, effects } from '../index.js';

const target = document.querySelector('#target');
const ticker = new Ticker();

const MAX_CANVASES = 6;
const DEFAULT_PRESET_INDEX = 3;
const EASING_OPTIONS = [
    { value: 'smooth', label: 'Smoothstep' },
    { value: 'linear', label: 'Linear' },
    { value: 'outQuad', label: 'Ease Out' },
    { value: 'inOutSine', label: 'Sine In-Out' },
    { value: 'inOutCubic', label: 'Cubic In-Out' },
];
const DEFAULT_SETTINGS = {
    duration: 6.0,
    hold: 1.8,
    easing: EASING_OPTIONS[0].value,
    pointScale: 1.12,
    spread: 1.0,
    wind: 1.0,
    stagger: 1.15,
};
const SOURCE_MODES = [
    { value: 'card', label: 'Gradient card' },
    { value: 'text', label: 'Transparent text' },
];
const DEFAULT_SOURCE_MODE = SOURCE_MODES[0].value;
const PARTICLE_PRESETS = [
    { width: 48, height: 27 },
    { width: 96, height: 54 },
    { width: 128, height: 72 },
    { width: 192, height: 108 },
    { width: 256, height: 144 },
    { width: 384, height: 216 },
    { width: 512, height: 288 },
    { width: 768, height: 432 },
    { width: 1024, height: 576 },
];
const DEFAULT_PRESET = PARTICLE_PRESETS[DEFAULT_PRESET_INDEX];
const MAX_PRESET = PARTICLE_PRESETS[PARTICLE_PRESETS.length - 1];

const urlParams = new URLSearchParams(window.location.search);
const initialPhase = Number(urlParams.get('phase'));
const settings = {
    duration: resolveNumberSetting(urlParams.get('duration'), DEFAULT_SETTINGS.duration, 1.0, 12.0),
    hold: resolveNumberSetting(urlParams.get('hold'), DEFAULT_SETTINGS.hold, 0.0, 4.0),
    easing: resolveEasing(urlParams.get('easing')),
    pointScale: resolveNumberSetting(urlParams.get('size'), DEFAULT_SETTINGS.pointScale, 0.6, 2.4),
    spread: resolveNumberSetting(urlParams.get('spread'), DEFAULT_SETTINGS.spread, 0.25, 1.8),
    wind: resolveNumberSetting(urlParams.get('wind'), DEFAULT_SETTINGS.wind, 0.0, 2.5),
    stagger: resolveNumberSetting(urlParams.get('stagger'), DEFAULT_SETTINGS.stagger, 0.0, 2.5),
};

let currentPreset = resolveParticlePreset(urlParams.get('particles'));
let currentParticleCount = currentPreset.width * currentPreset.height;
let currentCanvasCount = resolveCanvasCount(urlParams.get('canvases'));
let currentSourceMode = resolveSourceMode(urlParams.get('source'));
let cycleStart = performance.now() * 0.001 - (Number.isFinite(initialPhase) ? initialPhase : 0.0);
let globalSeed = Math.random() * 1000;

const screenGrid = document.createElement('div');
applyStyles(screenGrid, {
    position: 'fixed',
    inset: '0',
    display: 'grid',
    gap: '12px',
    padding: '12px',
    background: '#02040a',
    zIndex: '0',
    pointerEvents: 'none',
});
document.body.appendChild(screenGrid);

const overlay = document.createElement('div');
applyStyles(overlay, {
    position: 'fixed',
    inset: '16px 16px auto auto',
    display: 'grid',
    gap: '10px',
    justifyItems: 'end',
    maxHeight: 'calc(100vh - 32px)',
    overflow: 'auto',
    zIndex: '5',
    pointerEvents: 'auto',
});
document.body.appendChild(overlay);

const sourceCanvas = document.createElement('canvas');
applyStyles(sourceCanvas, {
    width: '192px',
    height: '108px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
    imageRendering: 'pixelated',
});
overlay.appendChild(sourceCanvas);

const info = document.createElement('div');
applyStyles(info, {
    padding: '8px 12px',
    borderRadius: '999px',
    background: 'rgba(6, 12, 28, 0.72)',
    color: '#eef3ff',
    font: '500 13px/1.2 system-ui, sans-serif',
    letterSpacing: '0.02em',
});
overlay.appendChild(info);

const sourceSelect = createSelectControl('Media source', SOURCE_MODES);
overlay.appendChild(sourceSelect.wrapper);

const particleSelect = createSelectControl('Stress test', PARTICLE_PRESETS.map((preset) => ({
    value: getPresetValue(preset),
    label: formatPresetLabel(preset),
})));
overlay.appendChild(particleSelect.wrapper);

const canvasSelect = createSelectControl('Canvases', Array.from({ length: MAX_CANVASES }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1} ${index === 0 ? 'canvas' : 'canvases'}`,
})));
overlay.appendChild(canvasSelect.wrapper);

const animationPanel = createControlPanel('Animation');
overlay.appendChild(animationPanel.wrapper);

const easingControl = createPanelSelectControl('Easing', EASING_OPTIONS);
animationPanel.content.appendChild(easingControl.wrapper);

const durationControl = createRangeControl('Duration', {
    min: 1.0,
    max: 12.0,
    step: 0.1,
    value: settings.duration,
    format: (value) => `${value.toFixed(1)}s`,
});
animationPanel.content.appendChild(durationControl.wrapper);

const holdControl = createRangeControl('Hold', {
    min: 0.0,
    max: 4.0,
    step: 0.1,
    value: settings.hold,
    format: (value) => `${value.toFixed(1)}s`,
});
animationPanel.content.appendChild(holdControl.wrapper);

const staggerControl = createRangeControl('Stagger', {
    min: 0.0,
    max: 2.5,
    step: 0.01,
    value: settings.stagger,
    format: formatFactor,
});
animationPanel.content.appendChild(staggerControl.wrapper);

const windControl = createRangeControl('Wind', {
    min: 0.0,
    max: 2.5,
    step: 0.01,
    value: settings.wind,
    format: formatFactor,
});
animationPanel.content.appendChild(windControl.wrapper);

const spreadControl = createRangeControl('Spread', {
    min: 0.25,
    max: 1.8,
    step: 0.01,
    value: settings.spread,
    format: formatFactor,
});
animationPanel.content.appendChild(spreadControl.wrapper);

const pointSizeControl = createRangeControl('Point size', {
    min: 0.6,
    max: 2.4,
    step: 0.01,
    value: settings.pointScale,
    format: formatFactor,
});
animationPanel.content.appendChild(pointSizeControl.wrapper);

const replayButton = document.createElement('button');
replayButton.textContent = 'Replay';
applyStyles(replayButton, {
    position: 'fixed',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    padding: '12px 18px',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '999px',
    background: 'rgba(6, 12, 28, 0.76)',
    color: '#eef3ff',
    font: '600 14px/1 system-ui, sans-serif',
    cursor: 'pointer',
    zIndex: '5',
});
document.body.appendChild(replayButton);

const instances = [];

renderSourceCanvas(sourceCanvas, currentPreset.width, currentPreset.height, currentSourceMode);
updateSourceCanvasPreview();
applyCanvasCount(currentCanvasCount, { restartAnimation: false, syncUrl: false });
applySourceMode(currentSourceMode, { restartAnimation: false, syncUrl: false });
applyParticlePreset(currentPreset, { restartAnimation: false, syncUrl: false });
applyAnimationSettings({}, { restartAnimation: false, syncUrl: false });

ticker.start();

replayButton.addEventListener('click', replay);
sourceSelect.select.addEventListener('change', () => {
    applySourceMode(resolveSourceMode(sourceSelect.select.value));
});
particleSelect.select.addEventListener('change', () => {
    applyParticlePreset(resolveParticlePreset(particleSelect.select.value));
});
canvasSelect.select.addEventListener('change', () => {
    applyCanvasCount(resolveCanvasCount(canvasSelect.select.value));
});
easingControl.select.addEventListener('change', () => {
    applyAnimationSettings({ easing: easingControl.select.value });
});
bindRangeSettingControl(durationControl, 'duration');
bindRangeSettingControl(holdControl, 'hold');
bindRangeSettingControl(staggerControl, 'stagger');
bindRangeSettingControl(windControl, 'wind');
bindRangeSettingControl(spreadControl, 'spread');
bindRangeSettingControl(pointSizeControl, 'pointScale');
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        replay();
    }
});

function replay() {
    cycleStart = performance.now() * 0.001;
    globalSeed = Math.random() * 1000;
}

function applyParticlePreset(preset, { restartAnimation = true, syncUrl = true } = {}) {
    currentPreset = preset;
    currentParticleCount = preset.width * preset.height;

    renderSourceCanvas(sourceCanvas, preset.width, preset.height, currentSourceMode);
    syncInstancesSource();

    particleSelect.select.value = getPresetValue(preset);
    updateInfo();

    if (syncUrl) {
        syncUrlState();
    }

    if (restartAnimation) {
        replay();
    }
}

function applySourceMode(mode, { restartAnimation = true, syncUrl = true } = {}) {
    currentSourceMode = mode;

    renderSourceCanvas(sourceCanvas, currentPreset.width, currentPreset.height, currentSourceMode);
    updateSourceCanvasPreview();
    syncInstancesSource();

    sourceSelect.select.value = currentSourceMode;

    if (syncUrl) {
        syncUrlState();
    }

    if (restartAnimation) {
        replay();
    }
}

function applyAnimationSettings(nextSettings = {}, { restartAnimation = true, syncUrl = true } = {}) {
    if (typeof nextSettings.duration !== 'undefined') {
        settings.duration = clamp(nextSettings.duration, 1.0, 12.0);
    }

    if (typeof nextSettings.hold !== 'undefined') {
        settings.hold = clamp(nextSettings.hold, 0.0, 4.0);
    }

    if (typeof nextSettings.easing !== 'undefined') {
        settings.easing = resolveEasing(nextSettings.easing);
    }

    if (typeof nextSettings.pointScale !== 'undefined') {
        settings.pointScale = clamp(nextSettings.pointScale, 0.6, 2.4);
    }

    if (typeof nextSettings.spread !== 'undefined') {
        settings.spread = clamp(nextSettings.spread, 0.25, 1.8);
    }

    if (typeof nextSettings.wind !== 'undefined') {
        settings.wind = clamp(nextSettings.wind, 0.0, 2.5);
    }

    if (typeof nextSettings.stagger !== 'undefined') {
        settings.stagger = clamp(nextSettings.stagger, 0.0, 2.5);
    }

    syncAnimationControls();
    syncInstanceSettings();

    if (syncUrl) {
        syncUrlState();
    }

    if (restartAnimation) {
        replay();
    }
}

function applyCanvasCount(count, { restartAnimation = true, syncUrl = true } = {}) {
    currentCanvasCount = count;

    ensureInstanceCount(count);
    updateGridLayout();
    syncInstancesSource();
    syncInstanceSettings();

    canvasSelect.select.value = String(count);
    updateInfo();

    if (syncUrl) {
        syncUrlState();
    }

    if (restartAnimation) {
        replay();
    }
}

function ensureInstanceCount(count) {
    while (instances.length < count) {
        instances.push(createDemoInstance(instances.length === 0 ? target : null));
    }

    while (instances.length > count) {
        destroyDemoInstance(instances.pop());
    }
}

function createDemoInstance(existingCanvas) {
    const canvas = existingCanvas || document.createElement('canvas');
    applyStyles(canvas, {
        display: 'block',
        width: '100%',
        height: '100%',
    });

    const cell = document.createElement('div');
    applyStyles(cell, {
        position: 'relative',
        minWidth: '0',
        minHeight: '0',
        overflow: 'hidden',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: '0 14px 40px rgba(0, 0, 0, 0.35)',
        background: 'radial-gradient(circle at 50% 50%, rgba(15, 22, 46, 0.95), rgba(3, 5, 11, 1))',
    });
    cell.appendChild(canvas);
    screenGrid.appendChild(cell);

    const effect = effects.particlesGpt({
        width: currentPreset.width,
        height: currentPreset.height,
        maxWidth: MAX_PRESET.width,
        maxHeight: MAX_PRESET.height,
        duration: settings.duration,
        hold: settings.hold,
        easing: settings.easing,
        pointScale: settings.pointScale,
        spread: settings.spread,
        wind: settings.wind,
        stagger: settings.stagger,
        source: sourceCanvas,
    });

    const instanceState = {
        cell,
        canvas,
        effect,
        seedOffset: Math.random() * 4000,
        kampos: null,
    };

    const kampos = new Kampos({
        target: canvas,
        effects: [effect],
        noSource: true,
        ticker,
        beforeDraw: (time) => renderInstance(instanceState, time),
        afterDraw: () => {
            effect.textures[0].update = false;
        },
    });

    const { gl } = kampos;
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
        kampos.destroy();
        cell.remove();
        throw new Error('This demo requires vertex texture fetch support.');
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    instanceState.kampos = kampos;

    return instanceState;
}

function renderInstance(instance, nowMs) {
    if (!resizeInstance(instance)) {
        return false;
    }

    const now = nowMs * 0.001;
    const phase = getCyclePhase(now);
    const { effect, kampos } = instance;
    const { gl } = kampos;

    gl.clearColor(0.02, 0.03, 0.06, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    effect.canvasSize = {
        width: instance.canvas.width,
        height: instance.canvas.height,
    };
    effect.time = now;
    effect.phase = phase;
    effect.seed = globalSeed + instance.seedOffset;

    return true;
}

function destroyDemoInstance(instance) {
    if (!instance) {
        return;
    }

    instance.kampos.destroy();
    instance.cell.remove();
}

function syncInstancesSource() {
    instances.forEach(({ effect }) => {
        effect.sourceSize = currentPreset;
        effect.source = sourceCanvas;
    });
}

function resizeInstance(instance) {
    const rect = instance.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (instance.canvas.width !== width || instance.canvas.height !== height) {
        instance.canvas.width = width;
        instance.canvas.height = height;
        instance.kampos.gl.viewport(0, 0, width, height);
    }

    return true;
}

function updateGridLayout() {
    const [columns, rows] = getGridLayout(currentCanvasCount);

    screenGrid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    screenGrid.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
}

function getGridLayout(count) {
    if (count <= 1) {
        return [1, 1];
    }

    if (count === 2) {
        return [2, 1];
    }

    if (count === 3) {
        return [3, 1];
    }

    if (count === 4) {
        return [2, 2];
    }

    return [3, 2];
}

function updateInfo() {
    const totalParticles = currentParticleCount * currentCanvasCount;
    info.textContent = `${currentParticleCount.toLocaleString()} each · ${currentCanvasCount} canvas${currentCanvasCount === 1 ? '' : 'es'} · ${totalParticles.toLocaleString()} total`;
}

function getCycleDuration() {
    return settings.duration + settings.hold;
}

function getCyclePhase(now) {
    const duration = getCycleDuration();
    if (!duration) {
        return 0.0;
    }

    return ((now - cycleStart) % duration + duration) % duration;
}

function syncAnimationControls() {
    easingControl.select.value = settings.easing;
    durationControl.setValue(settings.duration);
    holdControl.setValue(settings.hold);
    staggerControl.setValue(settings.stagger);
    windControl.setValue(settings.wind);
    spreadControl.setValue(settings.spread);
    pointSizeControl.setValue(settings.pointScale);
}

function syncInstanceSettings() {
    instances.forEach(({ effect }) => {
        effect.duration = settings.duration;
        effect.hold = settings.hold;
        effect.easing = settings.easing;
        effect.pointScale = settings.pointScale;
        effect.spread = settings.spread;
        effect.wind = settings.wind;
        effect.stagger = settings.stagger;
    });
}

function bindRangeSettingControl(control, key) {
    control.input.addEventListener('input', () => {
        applyAnimationSettings({ [key]: Number(control.input.value) }, {
            restartAnimation: false,
        });
    });

    control.input.addEventListener('change', () => {
        replay();
    });
}

function createSelectControl(title, options) {
    const wrapper = document.createElement('label');
    applyStyles(wrapper, {
        display: 'grid',
        gap: '6px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'rgba(6, 12, 28, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
    });

    const label = document.createElement('span');
    label.textContent = title;
    applyStyles(label, {
        color: '#eef3ff',
        font: '600 11px/1 system-ui, sans-serif',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    });
    wrapper.appendChild(label);

    const select = document.createElement('select');
    applyStyles(select, {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        background: 'rgba(16, 23, 48, 0.94)',
        color: '#eef3ff',
        font: '500 13px/1.2 system-ui, sans-serif',
        cursor: 'pointer',
    });

    options.forEach(({ value, label: text }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    });

    wrapper.appendChild(select);

    return { wrapper, select };
}

function createControlPanel(title) {
    const wrapper = document.createElement('section');
    applyStyles(wrapper, {
        display: 'grid',
        gap: '10px',
        minWidth: '240px',
        padding: '10px 12px 12px',
        borderRadius: '12px',
        background: 'rgba(6, 12, 28, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
    });

    const label = document.createElement('span');
    label.textContent = title;
    applyStyles(label, {
        color: '#eef3ff',
        font: '600 11px/1 system-ui, sans-serif',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    });
    wrapper.appendChild(label);

    const content = document.createElement('div');
    applyStyles(content, {
        display: 'grid',
        gap: '10px',
    });
    wrapper.appendChild(content);

    return { wrapper, content };
}

function createPanelSelectControl(title, options) {
    const wrapper = document.createElement('label');
    applyStyles(wrapper, {
        display: 'grid',
        gap: '6px',
    });

    const label = document.createElement('span');
    label.textContent = title;
    applyStyles(label, {
        color: '#c8d3ef',
        font: '500 11px/1 system-ui, sans-serif',
        letterSpacing: '0.04em',
    });
    wrapper.appendChild(label);

    const select = document.createElement('select');
    applyStyles(select, {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        background: 'rgba(16, 23, 48, 0.94)',
        color: '#eef3ff',
        font: '500 13px/1.2 system-ui, sans-serif',
        cursor: 'pointer',
    });

    options.forEach(({ value, label: text }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    });

    wrapper.appendChild(select);

    return { wrapper, select };
}

function createRangeControl(title, { min, max, step, value, format }) {
    const wrapper = document.createElement('label');
    applyStyles(wrapper, {
        display: 'grid',
        gap: '6px',
    });

    const header = document.createElement('div');
    applyStyles(header, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
    });

    const label = document.createElement('span');
    label.textContent = title;
    applyStyles(label, {
        color: '#c8d3ef',
        font: '500 11px/1 system-ui, sans-serif',
        letterSpacing: '0.04em',
    });
    header.appendChild(label);

    const valueEl = document.createElement('span');
    applyStyles(valueEl, {
        color: '#eef3ff',
        font: '600 11px/1 system-ui, sans-serif',
        letterSpacing: '0.04em',
    });
    header.appendChild(valueEl);
    wrapper.appendChild(header);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    applyStyles(input, {
        width: '100%',
        margin: '0',
        accentColor: '#84e8f7',
        cursor: 'pointer',
    });
    wrapper.appendChild(input);

    function setValue(nextValue) {
        const numericValue = Number(nextValue);
        input.value = String(numericValue);
        valueEl.textContent = format(numericValue);
    }

    input.addEventListener('input', () => {
        valueEl.textContent = format(Number(input.value));
    });

    setValue(value);

    return { wrapper, input, setValue };
}

function renderSourceCanvas(canvas, width, height, sourceMode) {
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (sourceMode === 'text') {
        renderTransparentTextSource(ctx, width, height);
        return;
    }

    renderCardSource(ctx, width, height);
}

function renderCardSource(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);

    const cardX = width * 0.12;
    const cardY = height * 0.16;
    const cardWidth = width * 0.76;
    const cardHeight = height * 0.68;
    const cardRadius = 18;

    const glow = ctx.createRadialGradient(width * 0.32, height * 0.34, Math.max(2, width * 0.03), width * 0.32, height * 0.34, width * 0.3);
    glow.addColorStop(0.0, 'rgba(255, 224, 188, 0.95)');
    glow.addColorStop(0.42, 'rgba(255, 131, 147, 0.42)');
    glow.addColorStop(1.0, 'rgba(255, 131, 147, 0.0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.shadowColor = 'rgba(47, 21, 118, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    const gradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
    gradient.addColorStop(0.0, '#20104f');
    gradient.addColorStop(0.38, '#4f2fd0');
    gradient.addColorStop(0.72, '#1b9ec6');
    gradient.addColorStop(1.0, '#89f3e0');
    ctx.fillStyle = gradient;
    roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = Math.max(1, width / 128);
    for (let i = -height; i < width + height; i += Math.max(6, Math.round(width / 16))) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - height, height);
        ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#f6f7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(height * 0.5)}px system-ui, sans-serif`;
    ctx.fillText('GLSL', width * 0.5, height * 0.48);

    ctx.fillStyle = '#9de3ff';
    ctx.font = `600 ${Math.round(height * 0.185)}px monospace`;
    ctx.fillText('particles', width * 0.5, height * 0.76);
}

function renderTransparentTextSource(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(63, 34, 160, 0.55)';
    ctx.shadowBlur = Math.max(3, Math.round(height * 0.09));
    ctx.shadowOffsetY = Math.max(1, Math.round(height * 0.02));

    ctx.fillStyle = '#f6f7ff';
    ctx.font = `bold ${Math.round(height * 0.52)}px system-ui, sans-serif`;
    ctx.fillText('GLSL', width * 0.5, height * 0.44);

    ctx.fillStyle = '#9de3ff';
    ctx.font = `600 ${Math.round(height * 0.19)}px monospace`;
    ctx.fillText('particles', width * 0.5, height * 0.74);
    ctx.restore();
}

function updateSourceCanvasPreview() {
    if (currentSourceMode === 'text') {
        applyStyles(sourceCanvas, {
            backgroundColor: 'rgba(8, 14, 28, 0.88)',
            backgroundImage: `
                linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
                linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.06) 75%)
            `,
            backgroundPosition: '0 0, 8px 8px',
            backgroundSize: '16px 16px',
        });
        return;
    }

    applyStyles(sourceCanvas, {
        backgroundColor: 'rgba(8, 14, 28, 0.88)',
        backgroundImage: 'none',
        backgroundPosition: '',
        backgroundSize: '',
    });
}

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width * 0.5, height * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function applyStyles(element, styles) {
    Object.assign(element.style, styles);
}

function formatFactor(value) {
    return trimNumber(value, 2);
}

function formatPresetLabel(preset) {
    return `${(preset.width * preset.height).toLocaleString()} · ${preset.width}×${preset.height}`;
}

function getPresetValue(preset) {
    return `${preset.width}x${preset.height}`;
}

function resolveParticlePreset(value) {
    if (!value) {
        return DEFAULT_PRESET;
    }

    if (/^\d+x\d+$/i.test(value)) {
        const [width, height] = value.toLowerCase().split('x').map(Number);
        return PARTICLE_PRESETS.find((preset) => preset.width === width && preset.height === height) || DEFAULT_PRESET;
    }

    if (/^\d+$/.test(value)) {
        const count = Number(value);
        return PARTICLE_PRESETS.find((preset) => preset.width * preset.height === count) || DEFAULT_PRESET;
    }

    return DEFAULT_PRESET;
}

function resolveCanvasCount(value) {
    const count = Number(value);
    if (!Number.isFinite(count)) {
        return 1;
    }

    return Math.min(MAX_CANVASES, Math.max(1, Math.round(count)));
}

function resolveSourceMode(value) {
    return SOURCE_MODES.some((mode) => mode.value === value)
        ? value
        : DEFAULT_SOURCE_MODE;
}

function resolveEasing(value) {
    return EASING_OPTIONS.some((option) => option.value === value)
        ? value
        : DEFAULT_SETTINGS.easing;
}

function resolveNumberSetting(value, fallback, min, max) {
    if (value === null || value === '') {
        return fallback;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return clamp(numericValue, min, max);
}

function trimNumber(value, precision = 2) {
    return Number(value.toFixed(precision)).toString();
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function syncUrlState() {
    const url = new URL(window.location.href);

    url.searchParams.delete('phase');

    if (getPresetValue(currentPreset) === getPresetValue(DEFAULT_PRESET)) {
        url.searchParams.delete('particles');
    }
    else {
        url.searchParams.set('particles', getPresetValue(currentPreset));
    }

    if (currentCanvasCount === 1) {
        url.searchParams.delete('canvases');
    }
    else {
        url.searchParams.set('canvases', String(currentCanvasCount));
    }

    if (currentSourceMode === DEFAULT_SOURCE_MODE) {
        url.searchParams.delete('source');
    }
    else {
        url.searchParams.set('source', currentSourceMode);
    }

    syncNumberParam(url, 'duration', settings.duration, DEFAULT_SETTINGS.duration, 1);
    syncNumberParam(url, 'hold', settings.hold, DEFAULT_SETTINGS.hold, 1);
    syncStringParam(url, 'easing', settings.easing, DEFAULT_SETTINGS.easing);
    syncNumberParam(url, 'size', settings.pointScale, DEFAULT_SETTINGS.pointScale);
    syncNumberParam(url, 'spread', settings.spread, DEFAULT_SETTINGS.spread);
    syncNumberParam(url, 'wind', settings.wind, DEFAULT_SETTINGS.wind);
    syncNumberParam(url, 'stagger', settings.stagger, DEFAULT_SETTINGS.stagger);

    window.history.replaceState({}, '', url);
}

function syncNumberParam(url, key, value, defaultValue, precision = 2) {
    if (Math.abs(value - defaultValue) < 0.0001) {
        url.searchParams.delete(key);
        return;
    }

    url.searchParams.set(key, trimNumber(value, precision));
}

function syncStringParam(url, key, value, defaultValue) {
    if (value === defaultValue) {
        url.searchParams.delete(key);
        return;
    }

    url.searchParams.set(key, value);
}
