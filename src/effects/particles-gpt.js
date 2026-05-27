const EASING_MODES = ['smooth', 'linear', 'outQuad', 'inOutSine', 'inOutCubic'];
const particleIdCache = new Map();

function getParticleIds(maxParticles) {
    if (!particleIdCache.has(maxParticles)) {
        const particleIds = new Float32Array(maxParticles);
        for (let i = 0; i < maxParticles; i++) {
            particleIds[i] = i;
        }
        particleIdCache.set(maxParticles, particleIds);
    }

    return particleIdCache.get(maxParticles);
}

function createSourceCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Particle image assembly effect rendered as point sprites.
 *
 * Requires vertex texture fetch support.
 *
 * @function particlesGpt
 * @param {Object} [params]
 * @param {number} [params.width=192] active source width / particle columns
 * @param {number} [params.height=108] active source height / particle rows
 * @param {number} [params.maxWidth=1024] max source width used to size the particle id buffer
 * @param {number} [params.maxHeight=576] max source height used to size the particle id buffer
 * @param {number} [params.duration=6.0] animation duration in seconds
 * @param {number} [params.hold=1.8] hold duration in seconds
 * @param {number} [params.pointScale=1.12] point size multiplier
 * @param {number} [params.spread=1.0] starting spread multiplier
 * @param {number} [params.wind=1.0] wind multiplier
 * @param {number} [params.stagger=1.15] random start delay window in seconds
 * @param {string} [params.easing='smooth'] easing mode
 * @param {HTMLCanvasElement|ImageBitmap|HTMLImageElement} [params.source] source texture
 * @returns {particlesGptEffect}
 */
export default function particlesGpt({
    width = 192,
    height = 108,
    maxWidth = 1024,
    maxHeight = 576,
    duration = 6.0,
    hold = 1.8,
    pointScale = 1.12,
    spread = 1.0,
    wind = 1.0,
    stagger = 1.15,
    easing = EASING_MODES[0],
    source = createSourceCanvas(width, height),
} = {}) {
    const maxParticles = maxWidth * maxHeight;

    if (width * height > maxParticles) {
        throw new Error('particles-gpt :: width * height exceeds max particle capacity');
    }

    const draw = {
        mode: 'POINTS',
        count: width * height,
    };

    let holdDuration = Math.max(0, hold);

    const effect = {
        draw,
        vertex: {
            uniform: {
                u_particlesGptMap: 'sampler2D',
                u_particlesGptImageSize: 'vec2',
                u_particlesGptCanvasSize: 'vec2',
                u_particlesGptTime: 'float',
                u_particlesGptPhase: 'float',
                u_particlesGptDuration: 'float',
                u_particlesGptDelayWindow: 'float',
                u_particlesGptPointScale: 'float',
                u_particlesGptSpread: 'float',
                u_particlesGptWindStrength: 'float',
                u_particlesGptSeed: 'float',
                u_particlesGptEaseMode: 'int',
            },
            attribute: {
                a_particlesGptId: 'float',
            },
            constant: `
const float particlesGptTau = 6.283185307179586;

float particlesGptHash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

vec2 particlesGptHash21(float p) {
    vec3 q = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.xx + q.yz) * q.zy);
}

float particlesGptSmoother(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float particlesGptEase(float t) {
    if (u_particlesGptEaseMode == 1) {
        return t;
    }

    if (u_particlesGptEaseMode == 2) {
        return 1.0 - pow(1.0 - t, 2.0);
    }

    if (u_particlesGptEaseMode == 3) {
        return 0.5 - 0.5 * cos(t * PI);
    }

    if (u_particlesGptEaseMode == 4) {
        return t < 0.5
            ? 4.0 * t * t * t
            : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
    }

    return particlesGptSmoother(t);
}

vec2 particlesGptScreenToClip(vec2 pixelPosition) {
    vec2 clip = pixelPosition / u_particlesGptCanvasSize * 2.0 - 1.0;
    clip.y *= -1.0;
    return clip;
}`,
            main: `
    float particlesGptX = mod(a_particlesGptId, u_particlesGptImageSize.x);
    float particlesGptY = floor(a_particlesGptId / u_particlesGptImageSize.x);
    vec2 particlesGptUv = (
        vec2(particlesGptX, particlesGptY) + 0.5
    ) / u_particlesGptImageSize;
    v_particlesGptColor = texture2D(u_particlesGptMap, particlesGptUv);

    vec2 particlesGptImageFit = u_particlesGptCanvasSize * 0.58;
    float particlesGptCell = min(
        particlesGptImageFit.x / u_particlesGptImageSize.x,
        particlesGptImageFit.y / u_particlesGptImageSize.y
    );
    vec2 particlesGptTargetPosition =
        (vec2(particlesGptX + 0.5, particlesGptY + 0.5) - u_particlesGptImageSize * 0.5) *
        particlesGptCell +
        u_particlesGptCanvasSize * 0.5;

    vec2 particlesGptRandomBox =
        (particlesGptHash21(a_particlesGptId + 19.7 + u_particlesGptSeed) - 0.5) *
        u_particlesGptCanvasSize *
        (1.9 * u_particlesGptSpread);
    float particlesGptOrbitAngle =
        particlesGptHash11(a_particlesGptId * 0.173 + 4.1 + u_particlesGptSeed) *
        particlesGptTau;
    float particlesGptOrbitRadius = mix(
        0.24,
        1.12,
        pow(particlesGptHash11(a_particlesGptId * 0.537 + 7.0 + u_particlesGptSeed), 0.65)
    );
    vec2 particlesGptRing =
        vec2(cos(particlesGptOrbitAngle), sin(particlesGptOrbitAngle)) *
        particlesGptOrbitRadius *
        length(u_particlesGptCanvasSize) *
        0.48 *
        u_particlesGptSpread;
    vec2 particlesGptStartPosition =
        u_particlesGptCanvasSize * 0.5 +
        mix(particlesGptRandomBox, particlesGptRing, 0.62);

    float particlesGptDelay =
        particlesGptHash11(a_particlesGptId * 0.071 + u_particlesGptSeed) *
        u_particlesGptDelayWindow;
    float particlesGptT = clamp(
        (u_particlesGptPhase - particlesGptDelay) /
            max(u_particlesGptDuration - particlesGptDelay, 0.001),
        0.0,
        1.0
    );
    float particlesGptProgress = particlesGptEase(particlesGptT);

    vec2 particlesGptDelta = particlesGptTargetPosition - particlesGptStartPosition;
    float particlesGptDistanceToTarget = max(length(particlesGptDelta), 0.0001);
    vec2 particlesGptForward = particlesGptDelta / particlesGptDistanceToTarget;
    vec2 particlesGptSide = vec2(-particlesGptForward.y, particlesGptForward.x);

    float particlesGptFlowPhase =
        particlesGptHash11(a_particlesGptId * 1.91 + 13.0 + u_particlesGptSeed) *
        particlesGptTau;
    float particlesGptField =
        sin(u_particlesGptTime * 1.25 + particlesGptFlowPhase + particlesGptTargetPosition.y * 0.015) +
        0.5 * sin(u_particlesGptTime * 2.1 - particlesGptFlowPhase * 1.3 + particlesGptTargetPosition.x * 0.01);
    vec2 particlesGptGust = vec2(
        sin(u_particlesGptTime * 0.92 + particlesGptFlowPhase + particlesGptTargetPosition.y * 0.018),
        cos(u_particlesGptTime * 1.08 - particlesGptFlowPhase + particlesGptTargetPosition.x * 0.014)
    );

    float particlesGptEnvelope = (1.0 - particlesGptProgress);
    particlesGptEnvelope *= particlesGptEnvelope;
    particlesGptEnvelope *= smoothstep(0.0, 0.08, particlesGptT);

    float particlesGptBend =
        min(particlesGptDistanceToTarget * 0.16, 56.0) * u_particlesGptWindStrength;
    vec2 particlesGptWindOffset =
        particlesGptSide * particlesGptField * particlesGptBend * particlesGptEnvelope;
    particlesGptWindOffset +=
        particlesGptGust * (10.0 * u_particlesGptWindStrength) * particlesGptEnvelope;
    particlesGptWindOffset +=
        particlesGptForward *
        sin(u_particlesGptTime * 1.7 + particlesGptFlowPhase * 1.7) *
        (6.0 * u_particlesGptWindStrength) *
        particlesGptEnvelope;

    vec2 particlesGptPosition =
        mix(particlesGptStartPosition, particlesGptTargetPosition, particlesGptProgress) +
        particlesGptWindOffset;
    vec2 particlesGptClipPosition = particlesGptScreenToClip(particlesGptPosition);

    gl_PointSize = max(1.0, particlesGptCell * u_particlesGptPointScale);`,
            position: 'vec4(particlesGptClipPosition, 0.0, 1.0)',
        },
        fragment: {
            main: `
    vec2 particlesGptCentered = abs(gl_PointCoord - 0.5);
    float particlesGptEdge = max(particlesGptCentered.x, particlesGptCentered.y);
    float particlesGptAlpha = 1.0 - smoothstep(0.47, 0.5, particlesGptEdge);

    color = v_particlesGptColor.rgb;
    alpha = v_particlesGptColor.a * particlesGptAlpha;`,
        },
        varying: {
            v_particlesGptColor: 'vec4',
        },
        uniforms: [
            {
                name: 'u_particlesGptMap',
                type: 'i',
                data: [0],
            },
            {
                name: 'u_particlesGptImageSize',
                type: 'f',
                data: [width, height],
            },
            {
                name: 'u_particlesGptCanvasSize',
                type: 'f',
                data: [1, 1],
            },
            {
                name: 'u_particlesGptTime',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_particlesGptPhase',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_particlesGptDuration',
                type: 'f',
                data: [Math.max(0.001, duration)],
            },
            {
                name: 'u_particlesGptDelayWindow',
                type: 'f',
                data: [Math.max(0, stagger)],
            },
            {
                name: 'u_particlesGptPointScale',
                type: 'f',
                data: [Math.max(0.1, pointScale)],
            },
            {
                name: 'u_particlesGptSpread',
                type: 'f',
                data: [Math.max(0.01, spread)],
            },
            {
                name: 'u_particlesGptWindStrength',
                type: 'f',
                data: [Math.max(0, wind)],
            },
            {
                name: 'u_particlesGptSeed',
                type: 'f',
                data: [0],
            },
            {
                name: 'u_particlesGptEaseMode',
                type: 'i',
                data: [Math.max(0, EASING_MODES.indexOf(easing))],
            },
        ],
        attributes: [
            {
                name: 'a_particlesGptId',
                size: 1,
                type: 'FLOAT',
                data: getParticleIds(maxParticles),
            },
        ],
        textures: [
            {
                format: 'RGBA',
                data: source,
                update: true,
            },
        ],
        get source() {
            return this.textures[0].data;
        },
        set source(media) {
            this.textures[0].data = media;
            this.textures[0].update = true;
        },
        get sourceSize() {
            const [currentWidth, currentHeight] = this.uniforms[1].data;
            return { width: currentWidth, height: currentHeight };
        },
        set sourceSize({ width: nextWidth, height: nextHeight }) {
            const widthValue = typeof nextWidth === 'number' ? Math.max(1, Math.floor(nextWidth)) : this.uniforms[1].data[0];
            const heightValue = typeof nextHeight === 'number' ? Math.max(1, Math.floor(nextHeight)) : this.uniforms[1].data[1];

            if (widthValue * heightValue > maxParticles) {
                throw new Error('particles-gpt :: sourceSize exceeds max particle capacity');
            }

            this.uniforms[1].data[0] = widthValue;
            this.uniforms[1].data[1] = heightValue;
            this.draw.count = widthValue * heightValue;
        },
        get canvasSize() {
            const [widthValue, heightValue] = this.uniforms[2].data;
            return { width: widthValue, height: heightValue };
        },
        set canvasSize({ width: nextWidth, height: nextHeight }) {
            if (typeof nextWidth === 'number') this.uniforms[2].data[0] = nextWidth;
            if (typeof nextHeight === 'number') this.uniforms[2].data[1] = nextHeight;
        },
        get time() {
            return this.uniforms[3].data[0];
        },
        set time(value) {
            this.uniforms[3].data[0] = Number(value) || 0;
        },
        get phase() {
            return this.uniforms[4].data[0];
        },
        set phase(value) {
            this.uniforms[4].data[0] = Number(value) || 0;
        },
        get duration() {
            return this.uniforms[5].data[0];
        },
        set duration(value) {
            this.uniforms[5].data[0] = Math.max(0.001, Number(value) || 0.001);
        },
        get stagger() {
            return this.uniforms[6].data[0];
        },
        set stagger(value) {
            this.uniforms[6].data[0] = Math.max(0, Number(value) || 0);
        },
        get pointScale() {
            return this.uniforms[7].data[0];
        },
        set pointScale(value) {
            this.uniforms[7].data[0] = Math.max(0.1, Number(value) || 0.1);
        },
        get spread() {
            return this.uniforms[8].data[0];
        },
        set spread(value) {
            this.uniforms[8].data[0] = Math.max(0.01, Number(value) || 0.01);
        },
        get wind() {
            return this.uniforms[9].data[0];
        },
        set wind(value) {
            this.uniforms[9].data[0] = Math.max(0, Number(value) || 0);
        },
        get seed() {
            return this.uniforms[10].data[0];
        },
        set seed(value) {
            this.uniforms[10].data[0] = Number(value) || 0;
        },
        get easing() {
            return EASING_MODES[this.uniforms[11].data[0]] || EASING_MODES[0];
        },
        set easing(value) {
            const easingIndex = EASING_MODES.indexOf(value);
            this.uniforms[11].data[0] = easingIndex === -1 ? 0 : easingIndex;
        },
        get hold() {
            return holdDuration;
        },
        set hold(value) {
            holdDuration = Math.max(0, Number(value) || 0);
        },
        get cycleDuration() {
            return this.duration + this.hold;
        },
        get maxParticleCount() {
            return maxParticles;
        },
    };

    return effect;
}
