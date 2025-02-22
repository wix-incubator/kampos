import GUI from 'lil-gui'
import flowmapVS from '@/js/glsl/gridwebgl/flowmap.vert'
import flowmapFS from '@/js/glsl/gridwebgl/flowmap.frag'
import drawVS from '@/js/glsl/gridwebgl/draw.vert'
import drawFS from '@/js/glsl/gridwebgl/draw.frag'

const loadTexture = async (gl, url) => {
  const image = new Image()
  image.src = url
  await new Promise((resolve) => {
    image.onload = resolve
  })

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  return { texture, image }
}

const lerp = (start, end, amt) => (1 - amt) * start + amt * end

class Scene {
  #program
  #guiObj = {
    radius: 130,
    gridSize: 1000,
    relaxation: 0.93,
    resetForce: 0.3,
    displacementForce: 0.01,
    rgbShift: true,
    ratio: 'rectangle',
  }
  mouse = {
    x: 0,
    y: 0,
  }
  mousePos = [0, 0]
  deltaMouse = [0, 0]
  movement = 1
  rgbShiftUniform = 1
  imageResolutionUniform = [0, 0]
  ratioUniform = 0
  containerResolution = [0, 0]
  constructor() {
    this.setScene()
    this.setGUI()
  }

  async setScene() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector('.scene')
    const gl = canvas.getContext('webgl')
    if (!gl) {
      return
    }
    // check we can use floating point textures
    const ext1 = gl.getExtension('OES_texture_float')
    if (!ext1) {
      alert('Need OES_texture_float')
      return
    }
    // check we can render to floating point textures
    const ext2 = gl.getExtension('WEBGL_color_buffer_float')
    if (!ext2) {
      alert('Need WEBGL_color_buffer_float')
      return
    }
    // check we can use textures in a vertex shader
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) {
      alert('Can not use textures in vertex shaders')
      return
    }

    this.size = Math.ceil(Math.sqrt(this.#guiObj.gridSize))

    const { texture, image } = await loadTexture(gl, '../img/test-1.jpg')
    this.imageTexture = texture
    this.drawProgram = webglUtils.createProgramFromSources(gl, [drawVS, drawFS])

    this.imageResolutionUniform = [image.width, image.height]

    this.drawBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.drawBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    // Enable the attribute and set up the pointer
    const positionLocation = gl.getAttribLocation(this.drawProgram, 'position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    this.flowmapProgram = webglUtils.createProgramFromSources(gl, [flowmapVS, flowmapFS])

    this.flowmapPrgLocs = {
      uFlowMap: gl.getUniformLocation(this.flowmapProgram, 'uFlowMap'),
      uMouse: gl.getUniformLocation(this.flowmapProgram, 'uMouse'),
      uResolution: gl.getUniformLocation(this.flowmapProgram, 'uResolution'),
      uTime: gl.getUniformLocation(this.flowmapProgram, 'uTime'),
      uDeltaMouse: gl.getUniformLocation(this.flowmapProgram, 'uDeltaMouse'),
      uMovement: gl.getUniformLocation(this.flowmapProgram, 'uMovement'),
      uRelaxation: gl.getUniformLocation(this.flowmapProgram, 'uRelaxation'),
      uRadius: gl.getUniformLocation(this.flowmapProgram, 'uRadius'),
      uContainerResolution: gl.getUniformLocation(this.flowmapProgram, 'uContainerResolution'),
      uAspectRatio: gl.getUniformLocation(this.flowmapProgram, 'uAspectRatio'),
    }

    this.flowmapBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.flowmapBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

    this.flowmapTex1 = this.createTexture(gl, null, this.size, this.size)
    this.flowmapTex2 = this.createTexture(gl, null, this.size, this.size)

    this.flowmapFBO1 = this.createFramebuffer(gl, this.flowmapTex1)
    this.flowmapFBO2 = this.createFramebuffer(gl, this.flowmapTex2)

    this.oldFlowmapInfo = {
      fb: this.flowmapFBO1,
      tex: this.flowmapTex1,
    }
    this.newFlowmapInfo = {
      fb: this.flowmapFBO2,
      tex: this.flowmapTex2,
    }

    this.then = 0

    this.gl = gl
    this.events(true)
    this.handleResize()
  }

  createTexture(gl, data, width, height) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0, // mip level
      gl.RGBA, // internal format
      width,
      height,
      0, // border
      gl.RGBA, // format
      gl.FLOAT, // type
      data
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  createFramebuffer(gl, tex) {
    const fb = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    return fb
  }

  events() {
    window.addEventListener('resize', this.handleResize, false)
    window.addEventListener('mousemove', this.handleMouseMove, false)
    requestAnimationFrame(this.handleRAF)
  }

  handleMouseMove = (event) => {
    this.mouse.x = event.clientX / window.innerWidth
    this.mouse.y = (1 - event.clientY / window.innerHeight)

    this.deltaMouse = [(this.mouse.x - this.mousePos[0]) * 80, (this.mouse.y - this.mousePos[1]) * 80]
    this.mousePos = [this.mouse.x, this.mouse.y]

    this.movement = 1
    // console.log(this.mouse.x, this.mouse.y)
  }

  handleResize = () => {
    const gl = this.gl
    webglUtils.resizeCanvasToDisplaySize(gl.canvas)

    this.size = Math.ceil(Math.sqrt(this.#guiObj.gridSize))
    this.containerResolution =[gl.canvas.width, gl.canvas.height]

    // Update flowmap textures and framebuffers
    this.flowmapTex1 = this.createTexture(gl, null, this.size, this.size)
    this.flowmapTex2 = this.createTexture(gl, null, this.size, this.size)
    this.flowmapFBO1 = this.createFramebuffer(gl, this.flowmapTex1)
    this.flowmapFBO2 = this.createFramebuffer(gl, this.flowmapTex2)

    this.oldFlowmapInfo = {
      fb: this.flowmapFBO1,
      tex: this.flowmapTex1,
    }
    this.newFlowmapInfo = {
      fb: this.flowmapFBO2,
      tex: this.flowmapTex2,
    }

    // Update viewport
    gl.viewport(0, 0, this.size, this.size)
  }

  handleRAF = (time) => {
    // convert to seconds
    time *= 0.001
    // Subtract the previous time from the current time
    const deltaTime = (time - this.then) * 1000
    // Remember the current time for the next frame.
    this.then = time
    const gl = this.gl

    // FBO :: Update flowmap
    gl.useProgram(this.flowmapProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.newFlowmapInfo.fb)
    gl.viewport(0, 0, this.size, this.size)
    // gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindBuffer(gl.ARRAY_BUFFER, this.flowmapBuffer)
    const positionLocation = gl.getAttribLocation(this.flowmapProgram, 'position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    // gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.oldFlowmapInfo.tex)
    // resize
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.uniform1i(this.flowmapPrgLocs.uFlowMap, 0)
    gl.uniform2f(this.flowmapPrgLocs.uResolution, this.size, this.size)
    gl.uniform2fv(this.flowmapPrgLocs.uMouse, this.mousePos)
    gl.uniform2fv(this.flowmapPrgLocs.uContainerResolution, this.containerResolution)
    gl.uniform2fv(this.flowmapPrgLocs.uDeltaMouse, this.deltaMouse)
    gl.uniform1f(this.flowmapPrgLocs.uMovement, this.movement)
    gl.uniform1f(this.flowmapPrgLocs.uRelaxation, this.#guiObj.relaxation)
    gl.uniform1f(this.flowmapPrgLocs.uRadius, this.#guiObj.radius)
    gl.uniform1f(this.flowmapPrgLocs.uAspectRatio, this.ratioUniform === 1 ? 1.0 : 16.0 / 9.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    // Swap flowmap textures
    {
      const temp = this.oldFlowmapInfo
      this.oldFlowmapInfo = this.newFlowmapInfo
      this.newFlowmapInfo = temp
    }

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.oldFlowmapInfo.tex)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)



    // Draw scene
    // gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.drawProgram)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.drawBuffer)
    const drawPositionLocation = gl.getAttribLocation(this.drawProgram, 'position')
    gl.enableVertexAttribArray(drawPositionLocation)
    gl.vertexAttribPointer(drawPositionLocation, 2, gl.FLOAT, false, 0, 0)

    // Bind the image texture
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture)
    gl.uniform1i(gl.getUniformLocation(this.drawProgram, 'uImage'), 1)

    // Draw
    gl.uniform1i(gl.getUniformLocation(this.drawProgram, 'uFlowMap'), 0)
    gl.uniform2f(gl.getUniformLocation(this.drawProgram, 'uResolution'), gl.canvas.width, gl.canvas.height)
    gl.uniform1f(
      gl.getUniformLocation(this.drawProgram, 'uImageRatio'),
      this.imageResolutionUniform[0] /
      this.imageResolutionUniform[1]
    )
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'uDisplacementForce'), this.#guiObj.displacementForce)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'uRGBShift'), this.rgbShiftUniform)
    gl.uniform1f(gl.getUniformLocation(this.drawProgram, 'uAspectRatio'), this.ratioUniform === 1 ? 1.0 : 16.0 / 9.0)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    requestAnimationFrame(this.handleRAF)

    // TO do: use delta time
    this.movement -= (this.#guiObj.resetForce * 0.01 * deltaTime) / 8
    this.movement = Math.max(0, this.movement)
    // this.deltaMouse = [lerp(this.deltaMouse[0], 0, this.#guiObj.relaxation), lerp(this.deltaMouse[1], 0, this.#guiObj.relaxation)];
  }

  setGUI() {
    const gui = new GUI()

    gui.add(this.#guiObj, 'ratio', ['rectangle', 'square']).onChange((value) => {
      this.ratioUniform = value === 'square' ? 1 : 0
      this.handleResize()
    })
    gui.add(this.#guiObj, 'rgbShift').onChange((value) => {
      this.rgbShiftUniform = value ? 1 : 0
    })
    gui.add(this.#guiObj, 'radius', 1, 300)
    gui.add(this.#guiObj, 'gridSize', 100, 8000).onChange((value) => {
      this.size = Math.ceil(Math.sqrt(value))
      this.handleResize()
    })
    gui.add(this.#guiObj, 'displacementForce', 0, 0.1)
    gui.add(this.#guiObj, 'resetForce', 0.08, 1)
    gui.add(this.#guiObj, 'relaxation', 0.8, 0.99)
  }
}

export default Scene
