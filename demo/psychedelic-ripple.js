import { Kampos, effects, noise } from '../index.js';

const target = document.querySelector('#target');

let lastMousePos = { x: 0.5, y: 0.5 };
let mouseSpeed = 0;

// Create turbulence effect with cellular noise
const turbulence = effects.turbulence({
    noise: noise.cellular,
    frequency: { x: 0.01, y: 0.01 },
    octaves: 3,
    input: effects.turbulence.FRAGCOORD_XY_TIME,
});

// Create kaleidoscope effect
const kaleidoscope = effects.kaleidoscope({
    segments: 8,
    offset: 0.0,
});

// Create hue-saturation effect for color shifting
const hueSaturation = effects.hueSaturation({
    hue: 0.0,
    saturation: 1.5,
});

// Create blend effect for mixing
const blend = effects.blend({
    mode: effects.blend.OVERLAY,
    color: [0.2, 0.1, 0.8, 1.0],
});

// Initialize Kampos with composed effects
const instance = new Kampos({
    target,
    effects: [turbulence, kaleidoscope, hueSaturation, blend],
});

// Load image and start effect
loadImage(
    'https://static.wixstatic.com/media/cec2b6_36e46176b7e54b678e4c6d39d36452e5~mv2.jpg'
).then((img) => {
    const height = window.document.documentElement.clientHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    // Set media source
    instance.setSource({ media: img, width, height });

    // Mouse interaction
    target.addEventListener('pointermove', ({ offsetX, offsetY }) => {
        const rect = target.getBoundingClientRect();
        const x = offsetX / rect.width;
        const y = offsetY / rect.height;

        // Calculate mouse speed
        const deltaX = x - lastMousePos.x;
        const deltaY = y - lastMousePos.y;
        mouseSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 10;

        lastMousePos = { x, y };

        // Update effects based on mouse position and speed
        turbulence.frequency = {
            x: 0.005 + mouseSpeed * 0.02,
            y: 0.005 + mouseSpeed * 0.02,
        };
        kaleidoscope.segments = Math.floor(4 + mouseSpeed * 8);
        kaleidoscope.offset = x * Math.PI;
        hueSaturation.hue = x * 360;
        hueSaturation.saturation = 1.0 + mouseSpeed * 2;

        // Update blend color based on position
        blend.color = [
            0.2 + x * 0.6,
            0.1 + y * 0.7,
            0.8 - (x + y) * 0.3,
            0.7 + mouseSpeed * 0.3,
        ];
    });

    // Animation loop for continuous movement
    function animate() {
        // Gradually reduce mouse speed
        mouseSpeed *= 0.95;

        // Auto-animate when no mouse movement
        if (mouseSpeed < 0.01) {
            const time = Date.now() * 0.001;
            turbulence.frequency = {
                x: 0.008 + Math.sin(time * 0.5) * 0.005,
                y: 0.008 + Math.cos(time * 0.3) * 0.005,
            };
            kaleidoscope.offset = time * 0.2;
            hueSaturation.hue = (time * 30) % 360;
        }

        requestAnimationFrame(animate);
    }

    animate();

    // Start the effect
    instance.play();
});
