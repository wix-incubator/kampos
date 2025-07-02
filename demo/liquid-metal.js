import { Kampos, effects } from '../index.js';

const target = document.querySelector('#target');

// Create dynamic displacement canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 512;
canvas.height = 512;

// Liquid metal simulation variables
let drops = [];
let time = 0;

// Create displacement effect
const displacement = effects.displacement({
    scale: { x: 0.15, y: 0.15 },
    enableBlueChannel: true,
});

// Create channel split for chromatic aberration
const channelSplit = effects.channelSplit({
    redOffset: { x: 0.002, y: 0.0 },
    greenOffset: { x: 0.0, y: 0.0 },
    blueOffset: { x: -0.002, y: 0.0 },
});

// Create brightness-contrast for metallic look
const brightnessContrast = effects.brightnessContrast({
    brightness: 0.1,
    contrast: 1.8,
});

// Create blend for metallic sheen
const blend = effects.blend({
    mode: effects.blend.SCREEN,
    color: [0.8, 0.9, 1.0, 0.3],
});

// Initialize Kampos
const instance = new Kampos({
    target,
    effects: [displacement, channelSplit, brightnessContrast, blend],
});

// Drop class for liquid simulation
class Drop {
    constructor(x, y, intensity) {
        this.x = x;
        this.y = y;
        this.intensity = intensity;
        this.radius = 0;
        this.maxRadius = 80 + Math.random() * 40;
        this.speed = 2 + Math.random() * 3;
        this.life = 1.0;
        this.decay = 0.008 + Math.random() * 0.012;
    }

    update() {
        this.radius += this.speed;
        this.life -= this.decay;
        this.speed *= 0.98;
        return this.life > 0 && this.radius < this.maxRadius;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        const alpha = this.life;
        const gradient = ctx.createRadialGradient(
            this.x,
            this.y,
            0,
            this.x,
            this.y,
            this.radius
        );

        // Create metallic displacement pattern
        const centerIntensity = Math.floor(127 + this.intensity * alpha * 100);
        const edgeIntensity = 127;

        gradient.addColorStop(
            0,
            `rgba(${centerIntensity}, ${centerIntensity}, ${Math.floor(
                255 * alpha
            )}, 1)`
        );
        gradient.addColorStop(
            0.7,
            `rgba(${Math.floor(127 + 30 * alpha)}, ${Math.floor(
                127 + 30 * alpha
            )}, ${Math.floor(200 * alpha)}, 1)`
        );
        gradient.addColorStop(1, `rgba(127, 127, 127, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Generate displacement texture
function updateDisplacementTexture() {
    // Clear with neutral gray
    ctx.fillStyle = 'rgb(127, 127, 127)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw drops
    drops = drops.filter((drop) => {
        drop.update();
        drop.draw(ctx);
        return drop.life > 0;
    });

    // Add flowing liquid effect
    time += 0.02;
    for (let i = 0; i < 3; i++) {
        const x = (Math.sin(time + i * 2) * 0.3 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.7 + i * 1.5) * 0.3 + 0.5) * canvas.height;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 60);
        gradient.addColorStop(0, 'rgba(150, 150, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(127, 127, 127, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 60, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Load image and start effect
loadImage(
    'https://static.wixstatic.com/media/cec2b6_36e46176b7e54b678e4c6d39d36452e5~mv2.jpg'
).then((img) => {
    const height = window.document.documentElement.clientHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    // Set media source
    instance.setSource({ media: img, width, height });

    // Set displacement map
    displacement.map = canvas;
    displacement.textures[0].update = true;

    // Mouse interaction
    target.addEventListener('pointermove', ({ offsetX, offsetY }) => {
        const rect = target.getBoundingClientRect();
        const x = (offsetX / rect.width) * canvas.width;
        const y = (offsetY / rect.height) * canvas.height;

        // Add new drop
        if (Math.random() < 0.3) {
            drops.push(new Drop(x, y, 0.5 + Math.random() * 0.5));
        }

        // Update channel split based on mouse position
        const intensity = 0.005;
        channelSplit.redOffset = {
            x: (offsetX / rect.width - 0.5) * intensity,
            y: 0,
        };
        channelSplit.blueOffset = {
            x: -(offsetX / rect.width - 0.5) * intensity,
            y: 0,
        };

        // Update brightness based on mouse movement
        brightnessContrast.brightness = -0.1 + (offsetY / rect.height) * 0.4;
    });

    // Auto-generate drops
    setInterval(() => {
        if (drops.length < 5) {
            drops.push(
                new Drop(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    0.3 + Math.random() * 0.4
                )
            );
        }
    }, 1000);

    // Animation loop
    function animate() {
        updateDisplacementTexture();
        requestAnimationFrame(animate);
    }

    animate();

    // Start the effect
    instance.play();
});
