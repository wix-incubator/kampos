import GUI from 'lil-gui'
import { Renderer, Program, Color, Mesh, Triangle, Vec2 } from 'ogl'
import vertex from '@/js/glsl/circlesTransition.vert'
import fragment from '@/js/glsl/circlesTransition.frag'
import LoaderManager from '../managers/LoaderManager'
import gsap from 'gsap'
// import LoaderManager from '@/js/managers/LoaderManager'

const gsapEasings = [
  'power0.in',
  'power0.out',
  'power0.inOut',
  'power1.in',
  'power1.out',
  'power1.inOut',
  'power2.in',
  'power2.out',
  'power2.inOut',
  'power3.in',
  'power3.out',
  'power3.inOut',
  'power4.in',
  'power4.out',
  'power4.inOut',
  'circ.in',
  'circ.out',
  'circ.inOut',
  'expo.in',
  'expo.out',
  'expo.inOut',
  'sine.in',
  'sine.out',
  'sine.inOut',
  'quad.in',
  'quad.out',
  'quad.inOut',
  'cubic.in',
  'cubic.out',
  'cubic.inOut',
  'quart.in',
  'quart.out',
  'quart.inOut',
  'quint.in',
  'quint.out',
  'quint.inOut',
]

class Scene {
  #renderer
  #mesh
  #program
  #guiObj = {
    progress: 0,
    nbDivider: 50,
    shape: 'circle',
    shapeBorder: 0.15,
    effect: 'transition',
    direction: 'xy',
    transitionSpread: 1.1,
    speed: 3.2,
    easing: 'quart.out',
    bkgColor: '#121212',
    brightness: false,
    brightnessValue: 1,
    overlayColor: false,
  }
  constructor() {
    this.setGUI()
    this.setScene()
    this.elButton = document.querySelector('.button')
    this.elButton.addEventListener('click', this.startTransition)
  }

  setGUI() {
    const gui = new GUI()

    const handleChange = (value) => {
      this.#program.uniforms.uProgress.value = value
    }

    gui.add(this.#guiObj, 'progress', 0, 1).onChange(handleChange)
    gui
      .add(this.#guiObj, 'nbDivider', 1, 100)
      .step(1)
      .onChange((value) => {
        this.#program.uniforms.uNbDivider.value = value
      })
    gui
      .add(this.#guiObj, 'shapeBorder', 0, 1)
      .step(0.01)
      .onChange((value) => {
        this.#program.uniforms.uShapeBorder.value = value
      })
    gui.add(this.#guiObj, 'shape', ['circle', 'diamond', 'square']).onChange((value) => {
      switch (value) {
        case 'circle':
          this.#program.uniforms.uShape.value = 1
          break
        case 'diamond':
          this.#program.uniforms.uShape.value = 2
          break
        case 'square':
          this.#program.uniforms.uShape.value = 3
          break
      }
    })

    gui.add(this.#guiObj, 'direction', ['x', 'y', 'xy', 'yx', 'inside']).onChange((value) => {
      switch (value) {
        case 'x':
          this.#program.uniforms.uDirection.value = 1
          break
        case 'y':
          this.#program.uniforms.uDirection.value = 2
          break
        case 'xy':
          this.#program.uniforms.uDirection.value = 3
          break
        case 'yx':
          this.#program.uniforms.uDirection.value = 4
          break
        case 'inside':
          this.#program.uniforms.uDirection.value = 5
          break
      }
    })

    gui.add(this.#guiObj, 'effect', ['transition', 'transitionAlpha', 'appearAlpha']).onChange((value) => {
      switch (value) {
        case 'transition':
          this.#program.uniforms.uEffect.value = 1
          break
        case 'transitionAlpha':
          this.#program.uniforms.uEffect.value = 2
          break
        case 'appearAlpha':
          this.#program.uniforms.uEffect.value = 3
          break
      }
    })

    gui
      .add(this.#guiObj, 'transitionSpread', 1, 4)
      .step(0.1)
      .onChange((value) => {
        this.#program.uniforms.uTransitionSpread.value = value
      })
    gui.add(this.#guiObj, 'speed', 0.5, 4).step(0.1)
    gui.add(this.#guiObj, 'easing', gsapEasings)
    gui.addColor(this.#guiObj, 'bkgColor').onChange((value) => {
      document.body.style.backgroundColor = value
      this.#program.uniforms.uColor.value = new Color(value)
    })

    const extras = gui.addFolder('Extras FX')

    extras
      .add(this.#guiObj, 'brightness')
      .name('Brightness')
      .onChange((value) => {
        this.#program.uniforms.uBrightness.value = value ? 1 : 0
      })
    extras
      .add(this.#guiObj, 'brightnessValue', 0, 1)
      .step(0.01)
      .name('Brightness strength')
      .onChange((value) => {
        this.#program.uniforms.uBrightnessValue.value = value
      })

    extras
      .add(this.#guiObj, 'overlayColor')
      .name('Overlay Color')
      .onChange((value) => {
        this.#program.uniforms.uOverlayColor.value = value ? 1 : 0
      })

    document.body.style.backgroundColor = this.#guiObj.bkgColor
  }

  async setScene() {
    const canvasEl = document.querySelector('.scene')
    this.#renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), canvas: canvasEl, alpha: true })
    const gl = this.#renderer.gl
    gl.clearColor(1, 1, 1, 1)

    this.handleResize()

    // Rather than using a plane (two triangles) to cover the viewport here is a
    // triangle that includes -1 to 1 range for 'position', and 0 to 1 range for 'uv'.
    // Excess will be out of the viewport.

    //         position                uv
    //      (-1, 3)                  (0, 2)
    //         |\                      |\
    //         |__\(1, 1)              |__\(1, 1)
    //         |__|_\                  |__|_\
    //   (-1, -1)   (3, -1)        (0, 0)   (2, 0)

    const geometry = new Triangle(gl)

    // To load files like textures, do :²
    // load Textures
    await LoaderManager.load(
      [
        { name: `img1`, texture: '../img/test-1.jpg' },
        { name: 'img2', texture: '../img/test-2.jpg' },
      ],
      gl
    )

    // get ratio and offset values needed to crop + center our images in the scene
    const uvCover1 = this.getCoverUV(gl, LoaderManager.get('img1').image)
    const uvCover2 = this.getCoverUV(gl, LoaderManager.get('img2').image)

    this.#program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        tMap1: { value: LoaderManager.get('img1') },
        uvRepeat1: { value: uvCover1.repeat },
        uvOffset1: { value: uvCover1.offset },
        tMap2: { value: LoaderManager.get('img2') },
        uvRepeat2: { value: uvCover2.repeat },
        uvOffset2: { value: uvCover2.offset },
        uResolution: { value: [gl.canvas.width, gl.canvas.height] },
        // modifiable
        uProgress: { value: this.#guiObj.progress },
        uNbDivider: { value: this.#guiObj.nbDivider },
        uShape: { value: 1 },
        uShapeBorder: { value: this.#guiObj.shapeBorder },
        uDirection: { value: 3 },
        uEffect: { value: 1 },
        uTransitionSpread: { value: this.#guiObj.transitionSpread },
        uColor: { value: new Color(this.#guiObj.bkgColor) },
        uBrightness: { value: 0 },
        uBrightnessValue: { value: 1 },
        uOverlayColor: { value: 0 },
      },
    })

    this.#mesh = new Mesh(gl, { geometry, program: this.#program, transparent: true })

    this.events()

    switch (this.#guiObj.direction) {
      case 'x':
        this.#program.uniforms.uDirection.value = 1
        break
      case 'y':
        this.#program.uniforms.uDirection.value = 2
        break
      case 'xy':
        this.#program.uniforms.uDirection.value = 3
        break
      case 'yx':
        this.#program.uniforms.uDirection.value = 4
        break
      case 'inside':
        this.#program.uniforms.uDirection.value = 5
        break
    }
  }

  events() {
    window.addEventListener('resize', this.handleResize, false)
    requestAnimationFrame(this.handleRAF)
  }

  handleResize = () => {
    this.#renderer.setSize(window.innerWidth, window.innerHeight)

    // set up size for our renderer
    const { gl } = this.#renderer
    if (this.#program) {
      // recalculate our ratio and offset values to crop + center our images based on the scene ratio
      const uvCover1 = this.getCoverUV(gl, LoaderManager.get('img1').image)

      this.#program.uniforms.uvRepeat1.value = uvCover1.repeat
      this.#program.uniforms.uvOffset1.value = uvCover1.offset

      const uvCover2 = this.getCoverUV(gl, LoaderManager.get('img2').image)

      this.#program.uniforms.uvRepeat2.value = uvCover2.repeat
      this.#program.uniforms.uvOffset2.value = uvCover2.offset
    }
  }

  handleRAF = (t) => {
    requestAnimationFrame(this.handleRAF)

    // this.#program.uniforms.uTime.value = t * 0.001

    // Don't need a camera if camera uniforms aren't required
    this.#renderer.render({ scene: this.#mesh })
  }

  startTransition = () => {
    gsap.to(this.#guiObj, {
      duration: this.#guiObj.speed,
      progress: this.#guiObj.progress < 0.5 ? 1 : 0,
      ease: this.#guiObj.easing,
      onUpdate: () => {
        this.#program.uniforms.uProgress.value = this.#guiObj.progress
      },
    })
  }

  getCoverUV(gl, image) {
    // crop image like a "background: cover"
    const aspectOfScene = gl.canvas.offsetWidth / gl.canvas.offsetHeight
    const aspectOfImage1 = image.width / image.height

    const repeat = new Vec2()
    const offset = new Vec2()

    if (aspectOfScene / aspectOfImage1 > 1) {
      repeat.set([1.0, aspectOfImage1 / aspectOfScene])
    } else {
      repeat.set([aspectOfScene / aspectOfImage1, 1.0])
    }

    offset.set([(1 - repeat[0]) / 2, (1 - repeat[1]) / 2])

    return { offset, repeat }
  }
}

export default Scene
