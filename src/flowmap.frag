precision mediump float;
varying vec2 vUv;
uniform sampler2D u_flowMap;
uniform vec2 uMouse;
uniform vec2 uDeltaMouse;
uniform float uMovement;
uniform float uRelaxation;
uniform float uRadius;
uniform vec2 uResolution;
uniform vec2 uContainerResolution;
uniform float uAspectRatio;

float getDistance(vec2 uv, vec2 mouse, vec2 containerRes, float aspectRatio) {
    // adjust mouse ratio based on the grid aspectRatio wanted
    vec2 newMouse = mouse;
    newMouse -= 0.5;
    if (containerRes.x < containerRes.y) {
        newMouse.x *= (containerRes.x / containerRes.y) / aspectRatio;
    } else {
        newMouse.y *= (containerRes.y / containerRes.x) * aspectRatio;
    }
    newMouse += 0.5;

    // adjust circle based on the grid aspectRatio wanted
    vec2 diff = uv - newMouse;
    diff.y /= aspectRatio;
    return length(diff);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;

    vec4 color = texture2D(u_flowMap, uv);

    // Adjust values for square / rectangle ratio
    float dist = getDistance(uv, uMouse, uContainerResolution, uAspectRatio);
    dist = 1.0 - (smoothstep(0.0, uRadius / 1000., dist));

    vec2 delta = uDeltaMouse;

    color.rg += delta * dist;
    color.rg *= min(uRelaxation, uMovement);

    gl_FragColor = color;
    gl_FragColor.a = 1.0;
}
