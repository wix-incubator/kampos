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
