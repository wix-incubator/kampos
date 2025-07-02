const easeOutCirc = (t) => {
    return Math.sqrt(1 - Math.pow(t - 1, 2));
};

const easeInOutQuad = (t) => {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

class BubbleTexture {
    constructor({
        width,
        height,
        bubbleRadius,
        intensity,
        maxAge,
        fadeSpeed,
        bubbleCount,
        ctx,
    }) {
        this.width = width;
        this.height = height;
        this.bubbleRadius = bubbleRadius || 60;
        this.intensity = intensity || 1.0;
        this.maxAge = maxAge || 120;
        this.fadeSpeed = fadeSpeed || 0.01;
        this.bubbleCount = bubbleCount || 8;
        this.ctx = ctx;
        this.bubbles = [];
        this.lastMousePos = null;
    }

    clear() {
        // Clear to neutral displacement (gray = 0.5, 0.5, 0.5)
        this.ctx.fillStyle = 'rgb(127, 127, 127)';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    addBubble(e) {
        const x = e.offsetX / this.width;
        const y = e.offsetY / this.height;

        const bubble = {
            x,
            y,
            age: 0,
            speed: e.speed || 0.5,
            vx: 0,
            vy: 0,
            radius: this.bubbleRadius * (0.7 + e.speed * 0.3),
            intensity: this.intensity * e.speed,
            life: this.maxAge,
        };

        // Calculate velocity based on mouse movement
        if (this.lastMousePos) {
            const relativeX = bubble.x - this.lastMousePos.x;
            const relativeY = bubble.y - this.lastMousePos.y;
            const distance = Math.sqrt(
                relativeX * relativeX + relativeY * relativeY
            );

            if (distance > 0) {
                bubble.vx = (relativeX / distance) * bubble.speed * 0.015;
                bubble.vy = (relativeY / distance) * bubble.speed * 0.015;
            }
        }

        this.lastMousePos = { x: bubble.x, y: bubble.y };
        this.bubbles.push(bubble);

        // Limit number of bubbles
        if (this.bubbles.length > this.bubbleCount) {
            this.bubbles.shift();
        }
    }

    update() {
        this.clear();

        this.bubbles.forEach((bubble, i) => {
            // Update bubble physics
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            bubble.age += 1;

            // Apply drag
            bubble.vx *= 0.99;
            bubble.vy *= 0.99;

            // Add slight upward drift for bubbles
            bubble.vy -= 0.0003;

            // Remove old bubbles
            if (bubble.age > bubble.life) {
                this.bubbles.splice(i, 1);
                if (this.bubbles.length === 0) {
                    this.lastMousePos = null;
                }
            } else {
                this.drawBubble(bubble);
            }
        });
    }

    drawBubble(bubble) {
        const position = {
            x: bubble.x * this.width,
            y: bubble.y * this.height,
        };

        // Calculate life-based intensity
        let lifeIntensity = 1;
        const lifeRatio = bubble.age / bubble.life;

        if (lifeRatio < 0.3) {
            // Fade in
            lifeIntensity = easeOutCirc(lifeRatio / 0.3);
        } else if (lifeRatio > 0.6) {
            // Fade out
            lifeIntensity = easeInOutQuad(1 - (lifeRatio - 0.6) / 0.4);
        }

        const finalIntensity = bubble.intensity * lifeIntensity;

        // Create radial gradient for bubble effect
        const gradient = this.ctx.createRadialGradient(
            position.x,
            position.y,
            0,
            position.x,
            position.y,
            bubble.radius
        );

        // Bubble center - strong displacement
        const centerR = Math.max(
            0,
            Math.min(255, 127 + bubble.vx * 200 * finalIntensity)
        );
        const centerG = Math.max(
            0,
            Math.min(255, 127 + bubble.vy * 200 * finalIntensity)
        );
        const centerB = Math.max(0, Math.min(255, 255 * finalIntensity)); // Blue channel for intensity

        // Bubble edge - weaker displacement
        const edgeR = Math.max(
            0,
            Math.min(255, 127 + bubble.vx * 100 * finalIntensity)
        );
        const edgeG = Math.max(
            0,
            Math.min(255, 127 + bubble.vy * 100 * finalIntensity)
        );
        const edgeB = Math.max(0, Math.min(255, 128 * finalIntensity));

        gradient.addColorStop(
            0,
            `rgb(${Math.round(centerR)}, ${Math.round(centerG)}, ${Math.round(
                centerB
            )})`
        );
        gradient.addColorStop(
            0.7,
            `rgb(${Math.round(edgeR)}, ${Math.round(edgeG)}, ${Math.round(
                edgeB
            )})`
        );
        gradient.addColorStop(1, 'rgb(127, 127, 0)');

        // Draw bubble
        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(position.x, position.y, bubble.radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.restore();
    }
}

function play() {
    function render(time) {
        bubbleTexture.update();
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

let bubbleTexture;

onmessage = (evt) => {
    if (evt.data.type === 'init') {
        const {
            width,
            height,
            canvas,
            bubbleRadius,
            intensity,
            maxAge,
            fadeSpeed,
            bubbleCount,
        } = evt.data;

        const ctx = canvas.getContext('2d');

        bubbleTexture = new BubbleTexture({
            width,
            height,
            ctx,
            bubbleRadius,
            intensity,
            maxAge,
            fadeSpeed,
            bubbleCount,
        });

        play();
    } else if (evt.data.type === 'addBubble') {
        bubbleTexture.addBubble(evt.data.event);
    }
};
