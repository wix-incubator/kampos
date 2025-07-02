# Broken Glass Effect

A WebGL shader effect that simulates viewing media through broken or shattered glass. This effect creates realistic glass fracture patterns with refraction, chromatic aberration, and dynamic lighting effects.

## Features

-   **Multiple Fracture Patterns**: Choose from Voronoi, Radial, or Grid-based glass breaking patterns
-   **Realistic Refraction**: Light bending effects at glass edges
-   **Chromatic Aberration**: Color separation for authentic glass distortion
-   **Dynamic Lighting**: Subtle reflection highlights that can be animated
-   **Customizable Parameters**: Full control over intensity, scale, and visual properties

## Usage

```javascript
import { Kampos, effects } from 'kampos';

// Basic usage with default settings
const brokenGlass = effects.brokenGlass();

// Advanced configuration
const brokenGlass = effects.brokenGlass({
    pattern: effects.brokenGlass.VORONOI,
    intensity: 0.5,
    refraction: 0.2,
    chromaticAberration: 0.03,
    scale: { x: 10.0, y: 10.0 },
    shardCount: 15,
    impactPoint: { x: 0.3, y: 0.7 },
});

const kampos = new Kampos({
    target: canvas,
    effects: [brokenGlass],
});
```

## Parameters

### `pattern` (string)

The fracture pattern to use:

-   `effects.brokenGlass.VORONOI` - Organic, cell-based glass shards (default)
-   `effects.brokenGlass.RADIAL` - Radial cracks emanating from an impact point
-   `effects.brokenGlass.GRID` - Regular grid-based fractures

### `intensity` (number)

Controls the overall strength of the glass distortion effect.

-   Range: `0.0` to `1.0`
-   Default: `0.3`

### `refraction` (number)

Strength of light refraction at glass edges.

-   Range: `0.0` to `0.5`
-   Default: `0.15`

### `chromaticAberration` (number)

Amount of chromatic aberration (color separation).

-   Range: `0.0` to `0.1`
-   Default: `0.02`

### `scale` (object)

Scale of the fracture pattern.

-   Format: `{ x: number, y: number }`
-   Default: `{ x: 8.0, y: 8.0 }`

### `time` (number)

Time value for animated effects (subtle movement and lighting).

-   Default: `0.0`

### `impactPoint` (object) - Radial pattern only

Center point for radial fractures (normalized coordinates).

-   Format: `{ x: number, y: number }`
-   Range: `0.0` to `1.0` for both x and y
-   Default: `{ x: 0.5, y: 0.5 }`

### `shardCount` (number) - Voronoi pattern only

Number of glass shards in the Voronoi pattern.

-   Range: `3` to `30`
-   Default: `12`

## Runtime Control

All parameters can be modified at runtime:

```javascript
// Change intensity
brokenGlass.intensity = 0.8;

// Update scale
brokenGlass.scale = { x: 15.0, y: 12.0 };

// Move impact point for radial pattern
brokenGlass.impactPoint = { x: 0.2, y: 0.8 };

// Animate the effect
function animate() {
    brokenGlass.time += 0.016;
    kampos.draw();
    requestAnimationFrame(animate);
}
```

## Demo

Run the included demo to see the effect in action:

```bash
npx http-server -p 8080
```

Then open `demo-broken-glass.html` in your browser.

## Technical Details

The broken glass effect uses several advanced shader techniques:

1. **Voronoi Diagrams**: For organic glass shard patterns
2. **Procedural Noise**: For realistic edge distortion
3. **Multi-channel Sampling**: For chromatic aberration
4. **Distance Fields**: For edge detection and highlighting
5. **Hash Functions**: For pseudo-random shard positioning

The effect is optimized for real-time performance while maintaining visual quality.

## Browser Compatibility

-   Requires WebGL support
-   Tested on modern browsers (Chrome, Firefox, Safari, Edge)
-   Mobile devices with WebGL support
