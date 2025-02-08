attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;

uniform vec2 uvRepeat1;
uniform vec2 uvOffset1;

uniform vec2 uvRepeat2;
uniform vec2 uvOffset2;

varying vec2 vUvMap1;
varying vec2 vUvMap2;

void main() {
  vUv = uv;

  vUvMap1 = uv;
  // Apply ratio + offset to UVs to crop and center the image
  vUvMap1 *= uvRepeat1;
  vUvMap1 += uvOffset1;

  vUvMap2 = uv;
  // Apply ratio + offset to UVs to crop and center the image
  vUvMap2 *= uvRepeat2;
  vUvMap2 += uvOffset2;

  gl_Position = vec4(position, 0, 1);
}
