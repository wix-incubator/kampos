if (u_transitionEnabled) {
  vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
  color = mix(color, targetPixel.rgb, u_transitionProgress);
  alpha = mix(alpha, targetPixel.a, u_transitionProgress);
}