# kampos [![Build Status](https://travis-ci.com/wix-incubator/kampos.svg?branch=master)](https://travis-ci.com/wix-incubator/kampos)
### Tiny and fast effects compositor on WebGL

kampos lets you add filter effects and beautiful transitions to video and images (or any other media).
Just like [SVG filter effects](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Filter_effects),
only using WebGL, and hence works everywhere!

## Demo
Watch a [live demo](https://wix-incubator.github.io/kampos/demo/).

## Documentation
For API reference and examples read [the docs](https://wix-incubator.github.io/kampos/docs/).

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
import Kampos from './node_modules/kampos/src/kampos';
import duotone from './node_modules/kampos/src/effects/duotone';
import displacement from './node_modules/kampos/src/effects/displacement';
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
