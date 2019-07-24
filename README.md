# kampos
Tiny and fast effects compositor on WebGL

## A WAT?
* Filter effects for media (video, images, anything).
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

