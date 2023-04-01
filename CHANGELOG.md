### 0.8.0 (2023-04-01)

*Breaking:*

 - `index.js` now uses ES modules. For a UMD distribution please use `index.umd.js`

*Fixed:*

- Fixed URLs of docs & demos.
- Rewrote Floss tests to run with Ava.

### 0.7.1 (2023-02-13)

*Fixed:*

- Ignore test files from NPM that contain invalid characters on Windows systems.

### 0.7.0 (2021-10-16)

*New:*

- `transitions.dissolve` now has support for transitioning into a color by disabling the target media with `extureEnabled: false`. `color` argument is used to control the color and defaults to transparent black: `[0, 0, 0, 0]`.

### 0.6.1 (2021-10-14)

*Fixed:*

- Fixed dissolve transition to take alpha channel progress from the luminance of the map.

### 0.6.0 (2021-06-29)

*New:*

- Added support for simple plane geometry using new `plane: {segments: number | {x: number, y: number}}`config.
- Added `extends: string` property to attribute config which takes a name of an attribute to extend its properties for simplifying coords attribute creation.

*Fixed:*

- Fixed shader error reporting to correctly report vertex shader errors.

### 0.5.2 (2021-05-07)

*Fixed:*

- Fixed error when called `desotry()` more than once.

### 0.5.1 (2021-03-26)

*New:*

- Added usage of the `OES_vertex_array_object` extension for improved drawing performance.

### 0.5.0 (2021-03-04)

*New:*

- `beforeDraw` callback now takes an argument `time` that will get the timestamp param of rAF injected into it.
- All effects and transitions now take `params` argument, an `Object` that contains initial values to set.
- `turbulence` effect now takes a new argument `params.output` which results in a code injected to the fragment shader for controlling the output of the effect. You can use the static properties of the effect:
  - `turbulence.COLOR`: render the result value as a grayscale vector into `color`.
  - `turbulence.ALPHA`: render the result value into `alpha`.

*Breaking:*

- `blend` effect now takes `noise`  as a property of `params` object.
- `displacement` effect now takes `wrap`  as a property of `params` object, which are now static properties of the effect:
  - `displacement.CLAMP`
  - `displacement.DISCARD`
  - `displacement.WRAP`
- `tubulence` effect now takes the noise string argument as a property of `params`, as in: `params.noise`.

### 0.4.0 (2021-02-08)

*New:*

- Dissolve transition.

### 0.3.7 (2021-02-07)

*New:*

- Added cellular noise.
- `brightnessContrast` and `hueSaturation` effects now have initial default values in factory.

### 0.3.6 (2021-01-13)

*New:*

- Initial work on `blend` effect.

*Fixed:*

- Fixed Travis build.

### 0.3.5 (2019-11-09)

*Fixed:*

- Fixed noise rendering on mobile with changing `percision` to `highp`.

### 0.3.4 (2019-10-22)

*New:*

- Added wrapping methods for `displacement` effect: `CLAMP`, `DISCARD`, `WRAP`.

*Fixed:*

- Fixed usage of `sourceCoords` in `displacement` transition.

### 0.3.3 (2019-10-20)

*New:*

- Added simplex 3D noise.

### 0.3.2 (2019-09-28)

*Fixed:*

- Fixed handling `noSource` and multiple textures in draw loop.

### 0.3.1 (2019-09-25)

*Fixed:*

- Updated docs & README.

### 0.3.0 (2019-09-24)

*New:*

- Added suport for `noSource` argument for rendering without a media source.
- Implemented `turbulence` effect.
- `alphaMask` effect now supports luminance mode via `isLuminance` getter/setter.
- Added `beforeDraw` callback to kampos config.
- Added perlin 3D noise.

*Fixed:*

- CI build fixes.

### 0.2.3 (2019-08-22)

*Fixed:*

- Docs fixes.
- Integrate with Travis CI.

### 0.2.2 (2019-08-07)

*Fixed:*

- Added missing `progress` getter/setter for `fade` transition.

### 0.2.1 (2019-08-07)

*Fixed:*

- kampos is not dependent on `Ticker`.

*New:*

- Published transpiled source.

### 0.2.0 (2019-07-25)

*New:*

- Initial public release.
