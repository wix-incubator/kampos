precision mediump float;
varying vec2 vUv;
varying vec2 vUvFlip;
uniform vec2 uResolution;
uniform float uImageRatio;
uniform sampler2D u_flowMap;
uniform sampler2D uImage;
uniform float uDisplacementForce;
uniform float uRGBShift;
uniform float uAspectRatio;

const float uDisplacement = 1.;

vec2 coverUvs(float aspectRatio, vec2 containerRes) {

    float containerAspectX = containerRes.x/containerRes.y;
    float containerAspectY = containerRes.y/containerRes.x;

    vec2 ratio = vec2(
        min(containerAspectX / aspectRatio, 1.0),
        min(containerAspectY * aspectRatio, 1.0)
    );

    vec2 newUvs = vec2(
        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );

    return newUvs;
}

void main() {
  vec2 newUvs = coverUvs(uImageRatio, uResolution);
  vec2 griUvs = coverUvs(uAspectRatio, uResolution);

  vec4 displacement = texture2D(u_flowMap, griUvs);
  displacement.a = 1.;

  // Flip the Y component of the red and green channels of the displacement
  vec2 finalUvs = newUvs - displacement.rg * uDisplacementForce * 1.5;
  finalUvs = clamp(finalUvs, vec2(0.0), vec2(1.0));

  vec4 finalImage = texture2D(uImage, finalUvs);
  finalImage.a = 1.;

  //rgb shift
  if (uRGBShift == 1.) {
    vec2 redUvs = finalUvs;
    vec2 blueUvs = finalUvs;
    vec2 greenUvs = finalUvs;

    vec2 shift = displacement.rg * 0.001;

    float displacementStrengh = length(displacement.rg);
    displacementStrengh = clamp(displacementStrengh, 0., 2.);

    float redStrengh = 1. + displacementStrengh * 0.25;
    redUvs += shift * redStrengh;

    float blueStrengh = 1. + displacementStrengh * 1.5;
    blueUvs += shift * blueStrengh;

    float greenStrengh = 1. + displacementStrengh * 2.;
    greenUvs += shift * greenStrengh;

    float red = texture2D(uImage, redUvs).r;
    float blue = texture2D(uImage, blueUvs).b;
    float green = texture2D(uImage, greenUvs).g;

    finalImage.r = red;
    finalImage.g = green;
    finalImage.b = blue;
  }

  // vec4 visualDisplacement = displacement;
  // visualDisplacement *= 0.5;
  // visualDisplacement += 0.5;

  // vec4 final = step(0.5, uDisplacement) * visualDisplacement + (1. - step(0.5, uDisplacement)) * finalImage;

  // gl_FragColor = final;
  gl_FragColor = finalImage;
}