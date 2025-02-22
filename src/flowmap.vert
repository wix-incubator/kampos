attribute vec2 position;
varying vec2 vUv;

void main() {
    vUv = position * 0.5 + 0.5; // Convert to [0, 1] range
    gl_Position = vec4(position, 0, 1);
}
