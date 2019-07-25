# kampos
### Tiny and fast effects compositor on WebGL

kampos lets you filter effects and beautiful transitions to your site's media,
be that images, video, etc.
Just like [SVG filter effects](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Filter_effects),
only using WebGL, and hence works everywhere!

## Features
* Filter effects for images and videos that you can mix and compose.
* As tiny as **~4KB** (minified and gzipped).
* Core engine for creating and running effects.
* Plugins for effects and transitions - available for import.
* Custom plugins? Extremely easy by using the effects/transitions descriptors DSL.

## Usage

Here's a simple example for using kampos:
```
import {Kampos, effects} from 'kampos';

const target = document.querySelector('canvas');
const media = document.querySelector('video');

const hueSaturation = effects.hueSaturation();
hueSaturation.hue = 90;

const kampos = new Kampos({target, effects: [hueSaturation]});

kampos.setSource(media);
kampos.play();
```

## Demo
Watch a [live demo]().

## Documentation
For API reference and examples read [the docs]().

## Getting started
Grab the source from here, or install via package manager.

### npm example:
```
npm install kampos
```

Import the default build:
```
import {Kampos, Ticker, effects, transitions} from 'kampos';
```

Or just what you need:
```
import {Kampos} from 'node_modules/kampos/src/
```

## Building locally
```
npm install
npm run build
```

## Running tests
```
npm run test
```

## Contributing
Contributions are welcome! (:

## License
kampos is distributed under the MIT license.
