import {defaultExclude} from "vitest/config";

declare type KamposConfig = {
    target: HTMLCanvasElement;
    effects: EffectConfig[];
    plane: planeConfig;
    ticker?: Ticker;
    noSource?: boolean;
    beforeDraw?: (time: number) => boolean;
    afterDraw?: (time: number) => void;
    onContextLost?: (config: KamposConfig) => void;
    onContextRestored?: (config: KamposConfig) => void;
    onContextCreationError?: (config: KamposConfig) => void;
};

declare type KamposSource = {
    media:
        | ArrayBufferView
        | ImageData
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement
        | ImageBitmap;
    width: number;
    height: number;
};

declare type VaryingType =
    | 'float'
    | 'vec2'
    | 'vec3'
    | 'vec4'
    | 'mat2'
    | 'mat3'
    | 'mat4';

declare type EffectConfig = {
    vertex: ShaderConfig;
    fragment: ShaderConfig;
    attributes: Attribute[];
    uniforms: Uniform[];
    varying: Record<string, VaryingType>;
    textures: TextureConfig[];
};

declare type planeConfig = {
    segments: number | { x: number; y: number };
};

declare type UniformType =
    | 'bool'
    | 'int'
    | 'float'
    | 'vec2'
    | 'vec3'
    | 'vec4'
    | 'mat2'
    | 'mat3'
    | 'mat4'
    | 'sampler2D'
    | 'samplerCube';

declare type ShaderAttributeType = 'float' | 'vec2' | 'vec3' | 'vec4';

declare type ShaderConfig = {
    main?: string;
    source?: string;
    constant?: string;
    uniform?: Record<string, UniformType>;
    attribute?: Record<string, ShaderAttributeType>;
};

declare type TextureConfig = {
    format: 'RGBA' | 'RGB' | 'ALPHA' | 'LUMINANCE' | 'LUMINANCE_ALPHA';
    data?:
        | ArrayBufferView
        | ImageData
        | HTMLImageElement
        | HTMLCanvasElement
        | HTMLVideoElement
        | ImageBitmap;
    update?: boolean;
    wrap?: 'stretch' | 'repeat' | 'mirror' | { x: string; y: string };
};

declare type AttributeType =
    | 'BYTE'
    | 'SHORT'
    | 'UNSIGNED_BYTE'
    | 'UNSIGNED_SHORT'
    | 'FLOAT';

declare type Attribute = {
    extends?: string;
    name: string;
    size: number;
    type: AttributeType;
    data: ArrayBufferView;
};

declare type Uniform = {
    name: string;
    size?: 1 | 2 | 3 | 4;
    type: 'i' | 'f';
    data: number | number[] | Float32Array;
};

declare type Drawable = {
    draw: (time: number) => void;
};

declare type Ticker = {
    start: () => void;
    stop: () => void;
    draw: (time: number) => void;
    add: (instance: Drawable) => void;
    remove: (instance: Drawable) => void;
};

declare type IKampos = {
    constructor: (config: KamposConfig) => IKampos;
    init: (config?: KamposConfig) => void;
    draw: (time?: number) => void;
    destroy: (keepState?: boolean) => void;
    play: (beforeDraw?: (time?: number) => void, afterDraw?: (time?: number) => void) => void;
    stop: () => void;
    setSource: (source: KamposSource | KamposSource['media'], skipTextureCreation?: boolean) => void;
    restoreContext: () => void;
}

declare module 'kampos';
