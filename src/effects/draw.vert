attribute vec2 position;
varying vec2 vUv;
varying vec2 vUvFlip;

void main() {
    vUv = position * 0.5 + 0.5; // Convert to [0, 1] range
    vUvFlip = vUv;
    vUvFlip.y = 1. - vUv.y;
    gl_Position = vec4(position, 0, 1);
}