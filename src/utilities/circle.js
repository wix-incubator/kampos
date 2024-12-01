/**
 * Exposes the `circle` function to be used by effects.
 * This function takes a point, radius, and spread, and returns a value between 0 and 1.
 *
 * @function circle
 * @returns {circleUtility}
 *
 * @example circle()
 */
function circle() {
    /**
     * @typedef {Object} circleUtility
     *
     * @example
     * float aspectRatio = u_resolution.x / u_resolution.y;
     * vec2 st_ = gl_FragCoord.xy / u_resolution;
     * float circle_ = circle(
     *      vec2(st_.x * aspectRatio, st_.y),
     *      vec2(u_mouse.x * aspectRatio, u_mouse.y),
     *      0.35,
     *      0.1
     * );
     */
    return {
        fragment: {
            constant: `
    float circle(vec2 _point1, vec2 _point2, float _radius, float _spread){
        vec2 dist = _point1 - _point2;
        return 1.0 - smoothstep(_radius - _spread, _radius + _spread, sqrt(dot(dist, dist)) / _radius);
    }`
        },
    };
}

export default circle;
