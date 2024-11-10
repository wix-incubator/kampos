import { Kampos, effects } from '../index.js';

/*!
 * Adapted from Daniel Velasquez's "Creating a Water-like Distortion with Three.js"
 * https://tympanus.net/codrops/2019/10/08/creating-a-water-like-distortion-effect-with-three-js/
 */

const DEBUG = false;

const target = document.querySelector('#target');
const mapTarget = document.createElement('canvas');

const easeOutSine = (t) => {
    return Math.sin(t * Math.PI / 2);
};

const easeOutQuad = (t) => {
    return -1 * t * (t - 2) ;
};

class PointerTexture {
    constructor ({ target, width, height, radius, intensity, maxAge, canvas, forceDecay }){
        this.width = width;
        this.height = height;
        this.radius = radius || 100;
        this.intensity = intensity;
        this.maxAge = maxAge;
        this.decayFactor = forceDecay || 0.01;
        this.last = null;
        this.points = [];
        this.ctx = canvas.getContext('2d');

        target.addEventListener('pointermove', this.addPoint.bind(this));
    }

    clear() {
        this.ctx.fillStyle = 'rgba(127, 127, 0, 1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    addPoint (e){
        const point = {
            x: e.offsetX / this.width,
            y: e.offsetY / this.height,
            age: 0,
        };

        if (this.last) {
            const relatveX = point.x - this.last.x;
            const relatveY = point.y - this.last.y;

            const speedSquared = relatveX ** 2 + relatveY ** 2;
            const speed = Math.sqrt(speedSquared);

            point.vx = relatveX / (speed + 1e-5);
            point.vy = relatveY / (speed + 1e-5);

            point.speed = Math.min(speedSquared * 1e4, 1);
        }

        this.last = point;

        this.points.push(point);
    }

    update () {
        this.clear();
        this.points.forEach((point, i) => {
            const decay = 1 - (point.age / this.maxAge);
            const force = point.speed * decay * this.decayFactor;
            point.x += point.vx * force;
            point.y += point.vy * force;
            point.age += 1;

            if (point.age > this.maxAge) {
                this.points.splice(i, 1);

                if (this.points.length === 0) {
                    this.last = null;
                }
            } else {
                this.drawPoint(point);
            }
        });
    }

    drawPoint (point) {
        const position = {
            x: point.x * this.width,
            y: point.y * this.height
        };
        let intensity = 1;
        if (point.age < this.maxAge * 0.3) {
            intensity = easeOutSine(point.age / (this.maxAge * 0.3));
        } else {
            intensity = easeOutQuad(1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7));
        }
        intensity *= point.speed;

        const red = (1 - point.vx) / 2 * 255;
        const green = (1 + point.vy) / 2 * 255;
        const blue = intensity * 255;

        const offset = this.width * 5;
        this.ctx.shadowOffsetX = offset;
        this.ctx.shadowOffsetY = offset;
        this.ctx.shadowBlur = this.radius;
        this.ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${this.intensity * intensity})`;

        this.ctx.beginPath();
        this.ctx.fillStyle = 'rgba(255, 0 , 0, 0, 1)';
        this.ctx.arc(position.x - offset, position.y - offset, this.radius, 0, 2 * Math.PI);
        this.ctx.fill();
    }
}

const MAP_WIDTH = 1396;
const MAP_HEIGHT = 992;

loadImage(
    `https://picsum.photos/${MAP_WIDTH}/${MAP_HEIGHT}?random=1`,
).then((img) => {
    const height = window.innerHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    target.width = width;
    target.height = height;

    mapTarget.width = width;
    mapTarget.height = height;

    // const render = new Kampos({ target: mapTarget, effects: [pointer], noSource: true });
    const pointerTexture = new PointerTexture({
        target,
        width,
        height,
        canvas: DEBUG ? target : mapTarget,
        radius: 130,
        intensity: 0.6,
        maxAge: 180,
        forceDecay: 0.01,
    });

    // create the main instance that renders the displaced image
    const displacement = effects.displacement();
    displacement.map = mapTarget;
    displacement.scale = { x: 0, y: 0 };
    displacement.textures[0].update = true; // to update

    if (DEBUG) {
        function tick () {
            requestAnimationFrame(tick);

            pointerTexture.update();
        }

        requestAnimationFrame(tick);
    } else {
        const instance = new Kampos({target, effects: [displacement]});

        // // set media source
        instance.setSource({media: img, width, height});

        instance.play(() => {
            pointerTexture.update();
        });
    }
});
