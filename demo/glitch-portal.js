import { Kampos, effects, noise, utilities } from '../index.js';
import './utils.js'; // Import loadImage utility

const target = document.querySelector('#target');

// Create dynamic mask canvas
const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
maskCanvas.width = 512;
maskCanvas.height = 512;

// Glitch portal variables
let portalCenter = { x: 0.5, y: 0.5 };
let portalRadius = 0.3;
let glitchIntensity = 0;
let time = 0;

// Create slit-scan effect for time distortion
const slitScan = effects.slitScan({
    noise: noise.simplex2d, // Use simplex2d which accepts vec2 parameters
    time: 0,
    intensity: 0.1,
    frequency: 2.0,
});

// Create displacement effect for portal warping using the mask canvas
const displacement = effects.displacement({
    scale: { x: 0.2, y: 0.2 },
    enableBlueChannel: true,
});

// Create duotone effect for otherworldly colors
const duotone = effects.duotone({
    light: [0.9, 0.2, 0.9, 1.0],
    dark: [0.1, 0.8, 0.9, 1.0],
});

// Create alpha mask for portal shape
const alphaMask = effects.alphaMask({
    isLuminance: true,
});

// Create utilities for deformation effect
const mouse = utilities.mouse();
const resolution = utilities.resolution();

// Initialize Kampos with simplified effects
const instance = new Kampos({
    target,
    effects: [resolution, mouse, slitScan, displacement, duotone, alphaMask],
});

// Generate portal mask and deformation map
function updatePortalMask() {
    // Clear canvas
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    const centerX = portalCenter.x * maskCanvas.width;
    const centerY = portalCenter.y * maskCanvas.height;
    const radius = portalRadius * Math.min(maskCanvas.width, maskCanvas.height);

    // Create portal mask with glitch effect
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        const glitchOffset =
            Math.sin(angle * 8 + time * 5) * glitchIntensity * 20;
        const currentRadius = radius + glitchOffset;

        const gradient = maskCtx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            currentRadius
        );

        // Create swirling portal pattern
        const swirl = Math.sin(angle * 3 + time * 2) * 0.3 + 0.7;
        gradient.addColorStop(0, `rgba(255, 255, 255, ${swirl})`);
        gradient.addColorStop(0.6, `rgba(128, 128, 128, ${swirl * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        maskCtx.fillStyle = gradient;
        maskCtx.beginPath();
        maskCtx.arc(centerX, centerY, currentRadius, angle, angle + 0.15);
        maskCtx.lineTo(centerX, centerY);
        maskCtx.fill();
    }

    // Add glitch lines
    if (glitchIntensity > 0.1) {
        maskCtx.fillStyle = `rgba(255, 255, 255, ${glitchIntensity})`;
        for (let i = 0; i < 10; i++) {
            const y = Math.random() * maskCanvas.height;
            const width = Math.random() * maskCanvas.width * glitchIntensity;
            maskCtx.fillRect(0, y, width, 2);
        }
    }

    // Add spiral deformation pattern
    const imageData = maskCtx.getImageData(
        0,
        0,
        maskCanvas.width,
        maskCanvas.height
    );
    const data = imageData.data;

    for (let y = 0; y < maskCanvas.height; y++) {
        for (let x = 0; x < maskCanvas.width; x++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            if (distance < radius) {
                const spiral =
                    Math.sin(distance * 0.1 + angle * 4 + time * 3) *
                    glitchIntensity;
                const index = (y * maskCanvas.width + x) * 4;

                // Red channel: X deformation
                data[index] = Math.floor(127 + spiral * 50);
                // Green channel: Y deformation
                data[index + 1] = Math.floor(
                    127 + Math.cos(angle + time) * spiral * 30
                );
                // Blue channel: intensity
                data[index + 2] = Math.floor(255 * (1 - distance / radius));
            }
        }
    }

    maskCtx.putImageData(imageData, 0, 0);
}

// Load image and start effect
loadImage(
    'https://static.wixstatic.com/media/cec2b6_36e46176b7e54b678e4c6d39d36452e5~mv2.jpg'
).then((img) => {
    const height = window.document.documentElement.clientHeight;
    const width = (height * img.naturalWidth) / img.naturalHeight;

    // Set resolution for utilities
    resolution.width = width;
    resolution.height = height;

    // Set media source
    instance.setSource({ media: img, width, height });

    // Set displacement map and alpha mask
    displacement.map = maskCanvas;
    displacement.textures[0].update = true;
    alphaMask.mask = maskCanvas;
    alphaMask.textures[0].update = true;

    // Mouse interaction
    target.addEventListener('pointermove', ({ offsetX, offsetY }) => {
        const rect = target.getBoundingClientRect();
        portalCenter.x = offsetX / rect.width;
        portalCenter.y = offsetY / rect.height;

        // Update mouse position for deformation effect
        mouse.position = {
            x: portalCenter.x,
            y: 1.0 - portalCenter.y, // Flip Y coordinate
        };

        // Calculate distance from center for glitch intensity
        const centerDist = Math.sqrt(
            Math.pow(portalCenter.x - 0.5, 2) +
                Math.pow(portalCenter.y - 0.5, 2)
        );
        glitchIntensity = Math.min(centerDist * 2, 1.0);

        // Update portal radius based on mouse position
        portalRadius = 0.2 + centerDist * 0.4;
    });

    // Click to trigger intense glitch
    target.addEventListener('click', () => {
        glitchIntensity = 1.0;

        // Trigger slit-scan time jump
        slitScan.time = Math.random() * 100;

        // Animate glitch decay
        const decay = () => {
            glitchIntensity *= 0.9;
            if (glitchIntensity > 0.05) {
                requestAnimationFrame(decay);
            }
        };
        decay();
    });

    // Animation loop
    function animate() {
        time += 0.02;

        // Auto-animate slit-scan
        slitScan.time += 0.5;

        // Auto-animate portal when no interaction
        if (glitchIntensity < 0.1) {
            portalRadius = 0.25 + Math.sin(time * 0.8) * 0.1;
            glitchIntensity = Math.abs(Math.sin(time * 2)) * 0.3;
        }

        updatePortalMask();
        requestAnimationFrame(animate);
    }

    animate();

    // Start the effect
    instance.play();
});
