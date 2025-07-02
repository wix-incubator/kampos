/**
 * @function brokenGlass
 * @property {string} VORONOI use Voronoi-based fracture pattern for glass shards.
 * @property {string} RADIAL use radial fracture pattern emanating from impact points.
 * @property {string} GRID use grid-based fracture pattern for uniform glass breaking.
 * @param {Object} [params]
 * @param {string} [params.pattern] fracture pattern to use. Defaults to `brokenGlass.VORONOI`.
 * @param {{x: number, y: number}} [params.scale] scale of the fracture pattern. Defaults to `{x: 8.0, y: 8.0}`.
 * @param {number} [params.intensity] intensity of the glass distortion effect. Defaults to `0.3`.
 * @param {number} [params.refraction] refraction strength at glass edges. Defaults to `0.15`.
 * @param {number} [params.chromaticAberration] chromatic aberration strength. Defaults to `0.02`.
 * @param {number} [params.time] time value for animated effects. Defaults to `0.0`.
 * @param {{x: number, y: number}} [params.impactPoint] center point of radial fractures (0-1 range). Defaults to `{x: 0.5, y: 0.5}`.
 * @param {number} [params.shardCount] number of glass shards for Voronoi pattern. Defaults to `12`.
 * @returns {brokenGlassEffect}
 *
 * @example brokenGlass({pattern: brokenGlass.VORONOI, intensity: 0.5, refraction: 0.2})
 */
function brokenGlass({
    pattern = FRACTURE_PATTERNS.VORONOI,
    scale,
    intensity = 0.3,
    refraction = 0.15,
    chromaticAberration = 0.02,
    time = 0.0,
    impactPoint,
    shardCount = 12,
} = {}) {
    const { x: sx, y: sy } = scale || { x: 8.0, y: 8.0 };
    const { x: ix, y: iy } = impactPoint || { x: 0.5, y: 0.5 };

    /**
     * @typedef {Object} brokenGlassEffect
     * @property {{x: number?, y: number?}} scale
     * @property {number} intensity
     * @property {number} refraction
     * @property {number} chromaticAberration
     * @property {number} time
     * @property {{x: number?, y: number?}} impactPoint
     * @property {number} shardCount
     * @property {boolean} disabled
     *
     * @example
     * effect.intensity = 0.8;
     * effect.scale = {x: 12.0, y: 12.0};
     * effect.impactPoint = {x: 0.3, y: 0.7};
     */
    return {
        fragment: {
            uniform: {
                u_brokenGlassEnabled: 'bool',
                u_glassScale: 'vec2',
                u_glassIntensity: 'float',
                u_glassRefraction: 'float',
                u_glassChromaticAberration: 'float',
                u_glassTime: 'float',
                u_glassImpactPoint: 'vec2',
                u_glassShardCount: 'float',
            },
            constant: `
// Hash function for pseudo-random values
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D noise function
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(hash(i + vec2(0.0, 0.0)), 
                   hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), 
                   hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Voronoi cell function for glass shard pattern
vec2 voronoi(vec2 p, float shardCount) {
    vec2 n = floor(p * shardCount);
    vec2 f = fract(p * shardCount);
    
    float minDist = 1.0;
    vec2 minPoint = vec2(0.0);
    
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 neighbor = vec2(float(i), float(j));
            vec2 point = 0.5 + 0.5 * vec2(
                sin(u_glassTime * 0.01 + 6.2831 * hash(n + neighbor)),
                sin(u_glassTime * 0.01 + 6.2831 * hash(n + neighbor + vec2(1.0, 0.0)))
            );
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            
            if (dist < minDist) {
                minDist = dist;
                minPoint = diff;
            }
        }

    }
    
    return vec2(minDist, hash(n + minPoint));
}

// Generate fracture pattern based on selected method
vec3 generateFracturePattern(vec2 coord) {
    ${pattern}
}

// Calculate glass distortion
vec2 calculateGlassDistortion(vec2 coord, vec3 fractureData) {
    float fractureIntensity = fractureData.x;
    float edgeDistance = fractureData.y;
    float shardId = fractureData.z;
    
    // Create distortion based on fracture edges
    vec2 distortion = vec2(0.0);
    
    // Edge-based refraction
    float edgeEffect = smoothstep(0.0, 0.1, edgeDistance) * (1.0 - smoothstep(0.1, 0.3, edgeDistance));
    distortion += vec2(noise(coord * 50.0 + u_glassTime * 0.1) - 0.5) * edgeEffect * u_glassRefraction;
    
    // Shard-based displacement
    vec2 shardCenter = vec2(hash(vec2(shardId, shardId + 1.0)), hash(vec2(shardId + 2.0, shardId + 3.0)));
    vec2 toCenter = coord - shardCenter;
    float shardEffect = fractureIntensity * u_glassIntensity;
    distortion += normalize(toCenter) * shardEffect * 0.1;
    
    // Add some random jitter per shard
    distortion += (vec2(hash(vec2(shardId, shardId + 10.0)), hash(vec2(shardId + 20.0, shardId + 30.0))) - 0.5) * shardEffect * 0.05;
    
    return distortion;
}`,
            source: `
    if (u_brokenGlassEnabled) {
        vec2 glassCoord = v_texCoord;
        
        // Generate fracture pattern
        vec3 fractureData = generateFracturePattern(glassCoord);
        
        // Calculate base distortion
        vec2 distortion = calculateGlassDistortion(glassCoord, fractureData);
        
        // Modify source coordinate for basic distortion
        sourceCoord = clamp(glassCoord + distortion, 0.0, 1.0);
    }`,
            main: `
    if (u_brokenGlassEnabled) {
        vec2 glassCoord = v_texCoord;
        
        // Generate fracture pattern
        vec3 fractureData = generateFracturePattern(glassCoord);
        
        // Calculate base distortion
        vec2 distortion = calculateGlassDistortion(glassCoord, fractureData);
        
        // Apply chromatic aberration
        float aberration = u_glassChromaticAberration * fractureData.x;
        
        // Sample RGB channels with slight offsets for chromatic aberration
        vec2 redCoord = clamp(glassCoord + distortion + vec2(aberration, 0.0), 0.0, 1.0);
        vec2 greenCoord = clamp(glassCoord + distortion, 0.0, 1.0);
        vec2 blueCoord = clamp(glassCoord + distortion - vec2(aberration, 0.0), 0.0, 1.0);
        
        float red = texture2D(u_source, redCoord).r;
        float green = texture2D(u_source, greenCoord).g;
        float blue = texture2D(u_source, blueCoord).b;
        
        // Override the color
        color = vec3(red, green, blue);
        
        // Add subtle glass reflection highlights
        float highlight = fractureData.y * 0.3 * (1.0 + 0.5 * sin(u_glassTime * 0.05));
        color += vec3(highlight * 0.2, highlight * 0.3, highlight * 0.4);
        
        // Darken fracture lines
        float fractureLine = smoothstep(0.0, 0.02, fractureData.y);
        color *= mix(0.3, 1.0, fractureLine);
    }`,
        },
        get disabled() {
            return !this.uniforms[0].data[0];
        },
        set disabled(b) {
            this.uniforms[0].data[0] = +!b;
        },
        get scale() {
            const [x, y] = this.uniforms[1].data;
            return { x, y };
        },
        set scale({ x, y }) {
            if (typeof x !== 'undefined') this.uniforms[1].data[0] = x;
            if (typeof y !== 'undefined') this.uniforms[1].data[1] = y;
        },
        get intensity() {
            return this.uniforms[2].data[0];
        },
        set intensity(value) {
            this.uniforms[2].data[0] = Math.max(0, parseFloat(value));
        },
        get refraction() {
            return this.uniforms[3].data[0];
        },
        set refraction(value) {
            this.uniforms[3].data[0] = Math.max(0, parseFloat(value));
        },
        get chromaticAberration() {
            return this.uniforms[4].data[0];
        },
        set chromaticAberration(value) {
            this.uniforms[4].data[0] = Math.max(0, parseFloat(value));
        },
        get time() {
            return this.uniforms[5].data[0];
        },
        set time(value) {
            this.uniforms[5].data[0] = parseFloat(value);
        },
        get impactPoint() {
            const [x, y] = this.uniforms[6].data;
            return { x, y };
        },
        set impactPoint({ x, y }) {
            if (typeof x !== 'undefined')
                this.uniforms[6].data[0] = Math.max(0, Math.min(1, x));
            if (typeof y !== 'undefined')
                this.uniforms[6].data[1] = Math.max(0, Math.min(1, y));
        },
        get shardCount() {
            return this.uniforms[7].data[0];
        },
        set shardCount(value) {
            this.uniforms[7].data[0] = Math.max(1, parseInt(value));
        },
        uniforms: [
            {
                name: 'u_brokenGlassEnabled',
                type: 'i',
                data: [1],
            },
            {
                name: 'u_glassScale',
                type: 'f',
                data: [sx, sy],
            },
            {
                name: 'u_glassIntensity',
                type: 'f',
                data: [intensity],
            },
            {
                name: 'u_glassRefraction',
                type: 'f',
                data: [refraction],
            },
            {
                name: 'u_glassChromaticAberration',
                type: 'f',
                data: [chromaticAberration],
            },
            {
                name: 'u_glassTime',
                type: 'f',
                data: [time],
            },
            {
                name: 'u_glassImpactPoint',
                type: 'f',
                data: [ix, iy],
            },
            {
                name: 'u_glassShardCount',
                type: 'f',
                data: [shardCount],
            },
        ],
    };
}

const FRACTURE_PATTERNS = {
    VORONOI: `
        vec2 voronoiResult = voronoi(coord, u_glassShardCount);
        float cellDistance = voronoiResult.x;
        float cellId = voronoiResult.y;
        
        // Create fracture intensity based on cell edges
        float fractureIntensity = 1.0 - smoothstep(0.0, 0.1, cellDistance);
        float edgeDistance = cellDistance;
        
        return vec3(fractureIntensity, edgeDistance, cellId);`,

    RADIAL: `
        vec2 toImpact = coord - u_glassImpactPoint;
        float distanceToImpact = length(toImpact);
        float angle = atan(toImpact.y, toImpact.x);
        
        // Create radial fracture lines
        float radialLines = sin(angle * 8.0 + distanceToImpact * 20.0);
        float concentricRings = sin(distanceToImpact * 15.0);
        
        float fractureIntensity = max(
            smoothstep(0.8, 1.0, abs(radialLines)),
            smoothstep(0.9, 1.0, abs(concentricRings))
        );
        
        float edgeDistance = min(abs(radialLines), abs(concentricRings));
        float cellId = floor(angle * 4.0 / 6.28318) + floor(distanceToImpact * 10.0);
        
        return vec3(fractureIntensity, edgeDistance, cellId);`,

    GRID: `
        vec2 gridCoord = coord * u_glassScale;
        vec2 gridCell = floor(gridCoord);
        vec2 gridFract = fract(gridCoord);
        
        // Create grid-based fractures with some randomness
        float cellNoise = hash(gridCell);
        vec2 cellOffset = vec2(hash(gridCell + vec2(1.0, 0.0)), hash(gridCell + vec2(0.0, 1.0))) * 0.3;
        
        vec2 distToEdge = min(gridFract + cellOffset, 1.0 - gridFract + cellOffset);
        float edgeDistance = min(distToEdge.x, distToEdge.y);
        
        float fractureIntensity = 1.0 - smoothstep(0.0, 0.05, edgeDistance);
        float cellId = hash(gridCell);
        
        return vec3(fractureIntensity, edgeDistance, cellId);`,
};

brokenGlass.VORONOI = FRACTURE_PATTERNS.VORONOI;
brokenGlass.RADIAL = FRACTURE_PATTERNS.RADIAL;
brokenGlass.GRID = FRACTURE_PATTERNS.GRID;

export default brokenGlass;
