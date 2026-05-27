/**
 * Build a Float32Array encoding (startX, startY, endU, endV) for each particle.
 *
 * startX/Y  – uniformly random in [-1, 1]; the vertex shader scales these by
 *             the spread factor and canvas aspect ratio to produce NDC start positions.
 * endU/V    – pixel-centre UV within the image grid [0, 1]; the vertex shader
 *             converts these to canvas-size-aware NDC end positions at draw time.
 *
 * @private
 * @param {number} size
 * @returns {Float32Array}
 */
function buildPData(size) {
    const count = size * size;
    const data = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
        const col = i % size;
        const row = Math.floor(i / size);
        data[i * 4 + 0] = Math.random() * 2.0 - 1.0;  // startX  ∈ [-1, 1]
        data[i * 4 + 1] = Math.random() * 2.0 - 1.0;  // startY  ∈ [-1, 1]
        data[i * 4 + 2] = (col + 0.5) / size;           // endU    ∈ [0, 1]
        data[i * 4 + 3] = (row + 0.5) / size;           // endV    ∈ [0, 1]
    }

    return data;
}

/**
 * Build a Float32Array of sequential particle IDs [0, 1, …, count-1].
 *
 * @private
 * @param {number} count
 * @returns {Float32Array}
 */
function buildParticleIds(count) {
    const ids = new Float32Array(count);
    for (let i = 0; i < count; i++) ids[i] = i;
    return ids;
}

/**
 * Particle image-assembly effect using a pre-computed RGBA FLOAT data texture.
 *
 * Structural differences from {@link particlesGpt}:
 *
 *  1. **Data texture** – start positions are baked on the CPU into an
 *     `OES_texture_float` texture at construction time, giving each particle a
 *     truly independent random scatter position without vertex-shader hash bias.
 *
 *  2. **JS-side easing** – the caller passes an already-eased `t` value via
 *     `effect.t`.  This decouples easing from the shader and enables physically-
 *     inspired curves (elastic overshoot, bounce) that are impractical as integer
 *     mode switches.
 *
 *  3. **Proportional wind arc** – lateral wind is scaled by each particle's
 *     individual travel distance so long-path particles arc expressively while
 *     short-path ones settle without unnecessary oscillation.
 *
 * Requires `OES_texture_float` and at least one vertex texture image unit.
 *
 * @function particlesSonnet
 * @param {Object}  [params]
 * @param {number}  [params.gridSize=256]     initial particle grid dimension N (N × N particles)
 * @param {number}  [params.maxGridSize=512]  maximum grid size — sets the attribute buffer size;
 *                                            `rebuild()` cannot exceed this value
 * @param {number}  [params.spread=1.8]       scatter radius multiplier (NDC, aspect-corrected)
 * @param {number}  [params.windStr=0.30]     wind displacement strength
 * @param {HTMLCanvasElement|ImageData|HTMLImageElement|ImageBitmap} [params.source]
 * @returns {particlesSonnetEffect}
 *
 * @example
 * const effect = particlesSonnet({ gridSize: 192, maxGridSize: 512, source: myCanvas });
 * const kampos = new Kampos({ target, effects: [effect], noSource: true });
 * // in animation loop:
 * effect.t      = easingFn(rawT);   // already-eased progress [0, 1]
 * effect.time   = windTime;
 * effect.canvasSize = { width: canvas.width, height: canvas.height };
 */
export default function particlesSonnet({
    gridSize = 256,
    maxGridSize = 512,
    spread = 1.8,
    windStr = 0.30,
    source = null,
} = {}) {
    if (gridSize > maxGridSize) {
        throw new Error('particles-sonnet :: gridSize exceeds maxGridSize');
    }

    const maxCount = maxGridSize * maxGridSize;
    const count    = gridSize * gridSize;

    const draw = {
        mode: 'POINTS',
        count,
    };

    /**
     * @typedef {Object} particlesSonnetEffect
     * @property {number}  t          already-eased animation progress (set by caller)
     * @property {number}  time       wind time (continuously advancing)
     * @property {{width:number,height:number}} canvasSize  canvas pixel dimensions
     * @property {number}  spread     scatter radius multiplier
     * @property {number}  windStr    wind displacement strength
     * @property {number}  pointSize  point diameter in pixels
     * @property {*}       source     source image (canvas / element)
     */
    const effect = {
        draw,

        // ── Vertex shader ──────────────────────────────────────────────────────
        vertex: {
            uniform: {
                u_psnData:       'sampler2D', // RGBA FLOAT data texture (unit 0)
                u_psnGridW:      'float',     // grid width  (= gridSize)
                u_psnGridH:      'float',     // grid height (= gridSize)
                u_psnCanvasSize: 'vec2',      // canvas pixel dimensions
                u_psnT:          'float',     // already-eased animation progress
                u_psnWt:         'float',     // wind time (continuous)
                u_psnSpread:     'float',     // scatter radius multiplier
                u_psnWindStr:    'float',     // wind strength multiplier
                u_psnPtSz:       'float',     // point size in pixels
            },
            attribute: {
                a_psnId: 'float',  // sequential particle index
            },
            main: `
    // ── Fetch this particle's data from the RGBA FLOAT position texture ──────
    float psnId     = a_psnId;
    float psnTxC    = mod(psnId, u_psnGridW);
    float psnTxR    = floor(psnId / u_psnGridW);
    vec2  psnDataTc = (vec2(psnTxC, psnTxR) + 0.5) / u_psnGridW;
    vec4  psnPd     = texture2D(u_psnData, psnDataTc);
    // psnPd.xy = pre-baked random start position ∈ [-1, 1]
    // psnPd.zw = grid-end UV ∈ [0, 1]  (u = col/W, v = row/H, top-left origin)

    // ── End position: fit image grid to 58 % of canvas, centered ─────────────
    vec2  psnImgFit = u_psnCanvasSize * 0.58;
    float psnCell   = min(psnImgFit.x / u_psnGridW, psnImgFit.y / u_psnGridH);
    // Negate H so row-0 (v = 0) maps to the TOP of the screen (positive NDC y).
    vec2  psnEpPx   = (psnPd.zw - 0.5) * vec2(u_psnGridW, -u_psnGridH) * psnCell
                    + u_psnCanvasSize * 0.5;
    vec2  psnEp     = psnEpPx / u_psnCanvasSize * 2.0 - 1.0;

    // ── Start position: scale random [-1,1] by spread and aspect ratio ────────
    float psnAspect = u_psnCanvasSize.x / u_psnCanvasSize.y;
    vec2  psnSp     = psnPd.xy * u_psnSpread * vec2(psnAspect, 1.0);

    // ── u_psnT is already eased by JS; elastic overshoot (t > 1) is supported ─
    float psnT    = u_psnT;
    vec2  psnBase = mix(psnSp, psnEp, psnT);

    // ── Wind: per-particle phase from pre-baked startX (truly random) ─────────
    float psnPhase = psnPd.x * PI;
    float psnField = sin(u_psnWt * 1.24 + psnPhase + psnEp.y * 2.1)
                   + 0.5 * sin(u_psnWt * 2.07 - psnPhase * 1.3 + psnEp.x * 1.8);
    vec2  psnGust  = vec2(
        sin(u_psnWt * 0.91 + psnPhase + psnEp.y * 1.9),
        cos(u_psnWt * 1.11 - psnPhase + psnEp.x * 1.5)
    );

    // Bell envelope: 0 at both endpoints, peak at t = 0.5.
    // Clamp before sin so elastic overshoot (t > 1) still produces zero wind.
    float psnEnv  = sin(PI * clamp(psnT, 0.0, 1.0));
    float psnDist = length(psnEp - psnSp);
    vec2  psnFwd  = psnDist > 0.001 ? (psnEp - psnSp) / psnDist : vec2(1.0, 0.0);
    vec2  psnSide = vec2(-psnFwd.y, psnFwd.x);

    // Lateral arc proportional to travel distance; gust adds perpendicular noise.
    float psnBend    = min(psnDist * 0.28, 0.40) * u_psnWindStr;
    vec2  psnWindOff = psnSide * psnField * psnBend * psnEnv;
    psnWindOff      += psnGust * (0.07 * u_psnWindStr) * psnEnv;

    vec2  psnPos  = psnBase + psnWindOff;
    gl_PointSize  = max(1.0, u_psnPtSz);

    // Pass end UV to fragment shader for colour sampling.
    // No V-flip: the source canvas is stored without UNPACK_FLIP_Y_WEBGL,
    // so v = 0 already maps to the top of the canvas in GL texture space.
    v_psnUv = psnPd.zw;`,
            position: 'vec4(psnPos, 0.0, 1.0)',
        },

        // ── Fragment shader ────────────────────────────────────────────────────
        fragment: {
            uniform: {
                u_psnImg: 'sampler2D',  // source image (unit 1)
            },
            main: `
    // Circular point-sprite clip
    vec2 psnPc = gl_PointCoord - 0.5;
    if (dot(psnPc, psnPc) > 0.25) discard;

    vec4 psnCol = texture2D(u_psnImg, v_psnUv);
    if (psnCol.a < 0.04) discard;  // cull transparent-background pixels (text mode)

    color = psnCol.rgb;
    alpha = psnCol.a;`,
        },

        varying: {
            v_psnUv: 'vec2',
        },

        // ── Uniforms ───────────────────────────────────────────────────────────
        uniforms: [
            { name: 'u_psnData',       type: 'i', data: [0] },              // 0  TEXTURE0
            { name: 'u_psnGridW',      type: 'f', data: [gridSize] },       // 1
            { name: 'u_psnGridH',      type: 'f', data: [gridSize] },       // 2
            { name: 'u_psnCanvasSize', type: 'f', data: [1, 1] },           // 3
            { name: 'u_psnT',          type: 'f', data: [0] },              // 4
            { name: 'u_psnWt',         type: 'f', data: [0] },              // 5
            { name: 'u_psnSpread',     type: 'f', data: [spread] },         // 6
            { name: 'u_psnWindStr',    type: 'f', data: [windStr] },        // 7
            { name: 'u_psnPtSz',       type: 'f', data: [1] },              // 8
            { name: 'u_psnImg',        type: 'i', data: [1] },              // 9  TEXTURE1
        ],

        // ── Attributes ─────────────────────────────────────────────────────────
        // Pre-allocate maxCount IDs so rebuild() can grow up to maxGridSize without
        // overflowing the buffer.  drawArrays only reads the first draw.count entries.
        attributes: [
            {
                name: 'a_psnId',
                size: 1,
                type: 'FLOAT',
                data: buildParticleIds(maxCount),
            },
        ],

        // ── Textures ───────────────────────────────────────────────────────────
        // TEXTURE0: RGBA FLOAT data texture — particle (startX, startY, endU, endV)
        // TEXTURE1: RGBA UNSIGNED_BYTE source image
        textures: [
            {
                format:      'RGBA',
                textureType: 'FLOAT',
                filter:      'NEAREST',
                wrap:        'stretch',
                width:       gridSize,
                height:      gridSize,
                data:        buildPData(gridSize),
                update:      false,   // baked once; rebuilt only via effect.rebuild()
            },
            {
                format: 'RGBA',
                data:   source,
                update: source !== null,
            },
        ],

        // ── Property accessors ─────────────────────────────────────────────────
        /** Already-eased animation progress.  Set this to `easingFn(rawT)` each frame. */
        get t() { return this.uniforms[4].data[0]; },
        set t(v) { this.uniforms[4].data[0] = Number(v) || 0; },

        /** Continuously advancing wind time. */
        get time() { return this.uniforms[5].data[0]; },
        set time(v) { this.uniforms[5].data[0] = Number(v) || 0; },

        get canvasSize() {
            const [w, h] = this.uniforms[3].data;
            return { width: w, height: h };
        },
        set canvasSize({ width: w, height: h }) {
            if (typeof w === 'number') this.uniforms[3].data[0] = w;
            if (typeof h === 'number') this.uniforms[3].data[1] = h;
        },

        get spread() { return this.uniforms[6].data[0]; },
        set spread(v) { this.uniforms[6].data[0] = Math.max(0.01, Number(v) || 0.01); },

        get windStr() { return this.uniforms[7].data[0]; },
        set windStr(v) { this.uniforms[7].data[0] = Math.max(0, Number(v) || 0); },

        get pointSize() { return this.uniforms[8].data[0]; },
        set pointSize(v) { this.uniforms[8].data[0] = Math.max(1, Number(v) || 1); },

        get source() { return this.textures[1].data; },
        set source(media) {
            this.textures[1].data = media;
            this.textures[1].update = true;
        },

        /** Current particle count. */
        get particleCount() { return this.draw.count; },

        /** Maximum grid size that `rebuild()` will accept. */
        get maxGridSize() { return maxGridSize; },

        /**
         * Rebuild the float data texture for a new grid size.
         * Call this whenever the particle count needs to change dynamically.
         * The caller is responsible for updating `effect.pointSize` afterward.
         *
         * @param {WebGLRenderingContext} gl  from `kampos.gl`
         * @param {number} newSize            new N for an N × N grid (must be ≤ maxGridSize)
         */
        rebuild(gl, newSize) {
            if (newSize * newSize > maxCount) {
                throw new Error(`particles-sonnet :: rebuild size ${newSize} exceeds maxGridSize ${maxGridSize}`);
            }

            // Delete the old float texture that Kampos created
            if (this.textures[0].texture) {
                gl.deleteTexture(this.textures[0].texture);
            }

            const pData = buildPData(newSize);

            // OES_texture_float was already acquired during _createTextures
            const newTex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, newTex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, newSize, newSize, 0, gl.RGBA, gl.FLOAT, pData);

            // Swap in the new texture so the next draw call uses it
            this.textures[0].texture = newTex;
            this.uniforms[1].data[0] = newSize;   // u_psnGridW
            this.uniforms[2].data[0] = newSize;   // u_psnGridH
            this.draw.count          = newSize * newSize;
        },
    };

    return effect;
}
