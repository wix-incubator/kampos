### 0.14.8 (2024-12-24)

_Fixed:_

-   Fixed direction of `u_mouse` offsets in `turbulence` effect.

### 0.14.7 (2024-12-19)

_New:_

-   Added `offsetInput` property to `slitScan` effect for allowing exposing an offset variable.

### 0.14.6 (2024-12-18)

_Fixed:_

-   Fixed `mouse` utility to invert `y` coordinate internally.

### 0.14.5 (2024-12-18)

_Fixed:_

-   Fixed mirroring of source coordinates in `kaleidoscope` and `slitScan` effects.

### 0.14.4 (2024-12-17)

_New:_

-   Added `direction` property to `slitScan` effect for choosing `x` or `y`.

### 0.14.3 (2024-12-16)

_New:_

-   Added ability to use `u_mouse` as input to `turbulence` effect.

### 0.14.2 (2024-12-15)

_Fixed:_

-   Replaced `main` of `turbulence` effect with `source` to allow reusing the `turbulenceValue` variable for `source` parts as well.


### 0.14.0 (2024-12-14)

_Breaking:_

-   Changed  `TEXTURE_MIN_FILTER`/`TEXTURE_MAG_FILTER` from `NEAREST` to `LINEAR`.

### 0.13.1 (2024-12-09)

_New:_

-   Added `rotation` property to `kaleidoscope` effect.

_Breaking:_

-   Kaleidoscope effect now does mirrored-repeat instead of simple repeat.
-   Changed `Kaleidoscope.offset` from a `number` to an object of `{ x: number, y: number }`.

### 0.12.0 (2024-12-04)

_New:_

-   Added `shouldUpdate` flag to `kamposSource` to force/depress source resampling.
-   Calling `kampos#setSource()` without dimensions will attempt to read dimensions from `HTMLImageElement` or `HTMLVideoElement`.

### 0.11.7 (2024-12-02)

_Fixed:_

-   Fixed `slitScan` effect, added missing setter for the `time` uniform.

### 0.11.6 (2024-12-02)

_New:_

-   Added `slitScan` effect.

### 0.11.5 (2024-12-01)

_New:_

-   Added `simplex-2d` noise.
-   Added `circle` utility for creating a circle mask.

### 0.11.4 (2024-11-25)

_Fixed:_

-   Blue channel in `displacement` effect should not be offset by -0.5.

### 0.11.3 (2024-11-17)

_New:_

-   Added `deformation` effect.
-   Added `channelSplit` effect.
-   Extended `displacement` effect to support blue channel for intensity.
-   Added `multi-pointer` demo.
-   Added `white` noise.
-   Added `mouse` utility for adding the `u_mouse` uniform to the shader.
-   Added `resolution` utility for adding the `u_resolution` uniform to the shader.

### 0.10.2 (2024-08-25)

_Fixed:_

-   Types issue in previous patch.

### 0.10.0 (2024-08-20)

_New:_

-   Added a `dist/index.cjs` distribution.
-   Replaced `index.js` with `src/index.js`.

_Fixed:_

-   Fixed `extends` property of type `Attribute`.

_Breaking:_

-   `main` field in `package.json` now points to `dist/index.cjs`.

### 0.9.2 (2024-08-20)

_New:_

-   Added a `types.d.ts` module.

### 0.9.1 (2024-08-13)

_New:_

-   Added `kaleidoscope` effect.

### 0.9.0 (2024-08-13)

_New:_

-   Added `afterDraw` callback to kampos config. Used to pass a function that will be called after each draw call.
-   Added optional function argument `afterDraw` to `kampos#play()` method to be dynamically set to `kampos.config.afterDraw`.
-   Added optional boolean argument `skipTextureCreation` to `kampos#setSource()` method to skip texture creation for the source
    media. useful for cases where using an OffscreenCanvas as a source for multiple programs and need to switch between them.

### 0.8.0 (2023-04-01)

_Breaking:_

-   `index.js` now uses ES modules. For a UMD distribution please use `index.umd.js`

_Fixed:_

-   Fixed URLs of docs & demos.
-   Rewrote Floss tests to run with Ava.

### 0.7.1 (2023-02-13)

_Fixed:_

-   Ignore test files from NPM that contain invalid characters on Windows systems.

### 0.7.0 (2021-10-16)

_New:_

-   `transitions.dissolve` now has support for transitioning into a color by disabling the target media with `extureEnabled: false`. `color` argument is used to control the color and defaults to transparent black: `[0, 0, 0, 0]`.

### 0.6.1 (2021-10-14)

_Fixed:_

-   Fixed dissolve transition to take alpha channel progress from the luminance of the map.

### 0.6.0 (2021-06-29)

_New:_

-   Added support for simple plane geometry using new `plane: {segments: number | {x: number, y: number}}`config.
-   Added `extends: string` property to attribute config which takes a name of an attribute to extend its properties for simplifying coords attribute creation.

_Fixed:_

-   Fixed shader error reporting to correctly report vertex shader errors.

### 0.5.2 (2021-05-07)

_Fixed:_

-   Fixed error when called `desotry()` more than once.

### 0.5.1 (2021-03-26)

_New:_

-   Added usage of the `OES_vertex_array_object` extension for improved drawing performance.

### 0.5.0 (2021-03-04)

_New:_

-   `beforeDraw` callback now takes an argument `time` that will get the timestamp param of rAF injected into it.
-   All effects and transitions now take `params` argument, an `Object` that contains initial values to set.
-   `turbulence` effect now takes a new argument `params.output` which results in a code injected to the fragment shader for controlling the output of the effect. You can use the static properties of the effect:
    -   `turbulence.COLOR`: render the result value as a grayscale vector into `color`.
    -   `turbulence.ALPHA`: render the result value into `alpha`.

_Breaking:_

-   `blend` effect now takes `noise` as a property of `params` object.
-   `displacement` effect now takes `wrap` as a property of `params` object, which are now static properties of the effect:
    -   `displacement.CLAMP`
    -   `displacement.DISCARD`
    -   `displacement.WRAP`
-   `tubulence` effect now takes the noise string argument as a property of `params`, as in: `params.noise`.

### 0.4.0 (2021-02-08)

_New:_

-   Dissolve transition.

### 0.3.7 (2021-02-07)

_New:_

-   Added cellular noise.
-   `brightnessContrast` and `hueSaturation` effects now have initial default values in factory.

### 0.3.6 (2021-01-13)

_New:_

-   Initial work on `blend` effect.

_Fixed:_

-   Fixed Travis build.

### 0.3.5 (2019-11-09)

_Fixed:_

-   Fixed noise rendering on mobile with changing `percision` to `highp`.

### 0.3.4 (2019-10-22)

_New:_

-   Added wrapping methods for `displacement` effect: `CLAMP`, `DISCARD`, `WRAP`.

_Fixed:_

-   Fixed usage of `sourceCoords` in `displacement` transition.

### 0.3.3 (2019-10-20)

_New:_

-   Added simplex 3D noise.

### 0.3.2 (2019-09-28)

_Fixed:_

-   Fixed handling `noSource` and multiple textures in draw loop.

### 0.3.1 (2019-09-25)

_Fixed:_

-   Updated docs & README.

### 0.3.0 (2019-09-24)

_New:_

-   Added suport for `noSource` argument for rendering without a media source.
-   Implemented `turbulence` effect.
-   `alphaMask` effect now supports luminance mode via `isLuminance` getter/setter.
-   Added `beforeDraw` callback to kampos config.
-   Added perlin 3D noise.

_Fixed:_

-   CI build fixes.

### 0.2.3 (2019-08-22)

_Fixed:_

-   Docs fixes.
-   Integrate with Travis CI.

### 0.2.2 (2019-08-07)

_Fixed:_

-   Added missing `progress` getter/setter for `fade` transition.

### 0.2.1 (2019-08-07)

_Fixed:_

-   kampos is not dependent on `Ticker`.

_New:_

-   Published transpiled source.

### 0.2.0 (2019-07-25)

_New:_

-   Initial public release.
