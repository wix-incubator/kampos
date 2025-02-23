/**
 * @function gridMouseDisplacement
 * @returns {gridMouseDisplacementEffect}
 * @example gridMouseDisplacement()
 */
export default function () {
  /**
   * @typedef {Object} gridMouseDisplacementEffect
   * @property {ArrayBufferView|ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|ImageBitmap} to media source to transition into
   * @property {number} progress number between 0.0 and 1.0
   * @property {boolean} disabled
   *
   * @example
   * effect.to = document.querySelector('#video-to');
   * effect.progress = 0.5;
   */
  return {
      vertex: {
          attribute: {
              a_transitionToTexCoord: 'vec2',
          },
          main: `
  v_transitionToTexCoord = a_transitionToTexCoord;`,
      },
      fragment: {
          uniform: {
              u_transitionEnabled: 'bool',
              u_transitionProgress: 'float',
              u_transitionTo: 'sampler2D',
              uFlowMap: 'sampler2D',
              uContainerResolution: 'vec2'
          },
          main: `
  if (u_transitionEnabled) {
      vec4 targetPixel = texture2D(u_transitionTo, v_transitionToTexCoord);
      color = mix(color, targetPixel.rgb, u_transitionProgress);
      vec4 displacement = texture2D(uFlowMap, v_transitionToTexCoord);
      displacement.a = 1.;
      color.rgb = displacement.rgb;
      alpha = mix(alpha, targetPixel.a, u_transitionProgress);
  }`,
      },
      get disabled() {
          return !this.uniforms[0].data[0];
      },
      set disabled(b) {
          this.uniforms[0].data[0] = +!b;
      },
      get progress() {
          return this.uniforms[2].data[0];
      },
      set progress(p) {
          this.uniforms[2].data[0] = p;
      },
      get to() {
          return this.textures[0].data;
      },
      set to(media) {
          this.textures[0].data = media;
      },
      varying: {
          v_transitionToTexCoord: 'vec2',
      },
      uniforms: [
          {
              name: 'u_transitionEnabled',
              type: 'i',
              data: [1],
          },
          {
              name: 'u_transitionTo',
              type: 'i',
              data: [1],
          },
          {
              name: 'u_transitionProgress',
              type: 'f',
              data: [0],
          },
      ],
      attributes: [
          {
              name: 'a_transitionToTexCoord',
              extends: 'a_texCoord',
          },
      ],
      textures: [
          {
              format: 'RGBA',
              update: true,
          },
      ],
  };
}
