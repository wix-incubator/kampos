precision highp float;

#define PI 3.1415926538

uniform float uProgress;
uniform float uNbDivider;
uniform float uShape;
uniform float uShapeBorder;
uniform float uDirection;
uniform float uTransitionSpread;
uniform float uEffect;
uniform vec3 uColor;

// extra FX
uniform float uBrightness;
uniform float uBrightnessValue;
uniform float uOverlayColor;


uniform sampler2D tMap1;
uniform sampler2D tMap2;

varying vec2 vUv;
varying vec2 vUvMap1;
varying vec2 vUvMap2;

uniform vec2 uResolution;

const float circleBorder = 0.15;

vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

float circle(vec2 _uv, float _radius){
    vec2 l = _uv - vec2(0.5);
    float border = circleBorder;
    return 1. - smoothstep(_radius - (_radius * border),
                           _radius + (_radius * border),
                           dot(l, l) * 4.0);
}

float square(vec2 _uv, float _size) {
    vec2 l = abs(_uv - vec2(0.5));
    float border = uShapeBorder;
    return 1. - smoothstep(_size - (_size * border),
                           _size + (_size * border),
                           max(l.x, l.y) * 2.0);
}

float diamond(vec2 _uv, float _size) {
    vec2 l = abs(rotate(_uv - vec2(0.5), PI / 4.0)); // Rotate by 45 degrees (PI / 4)
    float border = uShapeBorder;
    return 1. - smoothstep(_size - (_size * border),
                           _size + (_size * border),
                           max(l.x, l.y) * 2.0);
}

void main() {
  // Grid of circles
  vec2 st = gl_FragCoord.xy / uResolution;
  vec2 aspect = uResolution / min(uResolution.x, uResolution.y); // Calculate aspect ratio
  st.x *= aspect.x / aspect.y; // Adjust x coordinate based on aspect ratio to have square
  st *= uNbDivider;      // Scale up the space by 3
  st = fract(st); // Wrap around 1.0


  // Circle progress
  float circleProgress = vUv.x + 1.; // 1 à 2
  float offset = 0.;
  if (uDirection == 2.) {
    circleProgress = vUv.y + 1.;
  } else if (uDirection == 3.) {
    circleProgress = (vUv.x + 1. + vUv.y + 1.) / 2.;
  } else if (uDirection == 4.) {
    circleProgress = (vUv.x + 1. + (1. - vUv.y)) / 2.;
    offset = 1.;
  }

  float transition = (circleProgress * 2. + offset) - uProgress * 6.;

  if (uEffect == 1.) {
    if (uDirection == 5.) {
      transition = 2.15 - uProgress * 4.6;
    }
    circleProgress = pow(abs(transition), uTransitionSpread);
  } else {
    transition = (circleProgress * 2. + offset) - uProgress * 4.;
    circleProgress = pow(transition, uTransitionSpread);

    if (uDirection == 5.) {
      // adding 0.15 extra to be sure shapes are covering the whole space (espacially for circle because of blurry border)
      circleProgress = 2.15 - uProgress * 2.3;
    }
  }

  // TODO: test sin() + noise? to have smoother transition
  vec3 color = vec3(0.,0.,0.);
  if (uShape == 1.) {
    color = vec3(circle(st, max(circleProgress, 0.)));
  } else if (uShape == 2.) {
    color = vec3(diamond(st, max(circleProgress, 0.)));
  } else if (uShape == 3.) {
    color = vec3(square(st, max(circleProgress, 0.)));
  }

  vec4 texture1 = texture2D(tMap1, vUvMap1);
  vec4 texture2 = texture2D(tMap2, vUvMap2);


  if (uEffect == 1.) {
    gl_FragColor.rgb = mix(texture2.rgb, texture1.rgb, smoothstep(0., 1., transition)) * color;
    gl_FragColor.a = color.r;
  } else {
    gl_FragColor.rgb = mix(texture2.rgb, texture1.rgb, smoothstep(0., 1., color.r));
    gl_FragColor.a = 1.;
    if (uEffect == 3.) {
      gl_FragColor.a = color.r;
    }
  }

  // Apply brightness.
  if (uBrightness == 1.) {
    float brightness = (0.5 * uBrightnessValue) * (1. - (abs(uProgress - 0.5) * 2.0));
    gl_FragColor.rgb += brightness;
  }

  // Apply color.
  if (uOverlayColor == 1.) {
    float overlayProgress = (1. - (abs(uProgress - 0.5) * 2.0));
    gl_FragColor.rgb += overlayProgress * uColor;
  }



}