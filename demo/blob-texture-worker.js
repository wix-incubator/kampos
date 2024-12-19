const easeOutSine = (t) => {
    return Math.sin(t * Math.PI / 2);
};

const easeOutQuad = (t) => {
    return -1 * t * (t - 2) ;
};

class PointerTexture {
    constructor ({ target, width, height, radius, intensity, maxAge, ctx, forceDecay = 0.01 }){
        this.width = width;
        this.height = height;
        this.radius = radius || 100;
        this.intensity = intensity;
        this.maxAge = maxAge;
        this.decayFactor = forceDecay;
        this.last = null;
        this.points = [];
        this.ctx = ctx;
    }

    clear() {
        this.ctx.fillStyle = 'rgba(127, 127, 0, 1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    addPoint (e){
        const x = e.offsetX / this.width;
        const y = e.offsetY / this.height;
        const point = {
            x,
            y,
            age: 0,
            speed: 0,
            vx: 0,
            vy: 0,
        };

        if (this.last) {
            const relativeX = point.x - this.last.x;
            const relativeY = point.y - this.last.y;

            const speedSquared = relativeX ** 2 + relativeY ** 2;
            const speed = Math.sqrt(speedSquared);

            point.vx = relativeX / (speed + 1e-5);
            point.vy = relativeY / (speed + 1e-5);

            point.speed = Math.min(speedSquared * 1e3, 1);
        }

        this.last = point;

        this.points.push(point);
    }

    update () {
        this.clear();
        this.points.forEach((point, i) => {
            const decay = 1 - (point.age / this.maxAge);
            const force = point.speed * decay ** 2 * this.decayFactor;
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

function play () {
    function render(time) {
        pointerTexture.update();
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

let pointerTexture;

onmessage = (evt) => {
    if (evt.data.type === 'init') {
        const {
            width,
            height,
            canvas,
            radius,
            intensity,
            maxAge,
            forceDecay,
        } = evt.data;
        const ctx = canvas.getContext('2d');

        pointerTexture = new PointerTexture({
            width,
            height,
            ctx,
            radius,
            intensity,
            maxAge,
            forceDecay,
        });

        play();
    }
    else if (evt.data.type === 'addpoint') {
        pointerTexture.addPoint(evt.data.event);
    }
};
