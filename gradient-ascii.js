/*
 * Standalone port of React Bits' GradientASCII.
 * No modules, dependencies, JSX, network requests, or build step required.
 *
 * Usage:
 *   const stop = window.startGradientASCII(document.querySelector('#ascii-root'), {
 *     colors: ['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8'],
 *     shape: 'horizon',
 *     clickEffect: 'burst'
 *   });
 *   // Later: stop();
 */
(function gradientASCIIStandalone(window, document) {
  'use strict';

  var MAX_COLORS = 8;
  var MAX_CLICKS = 4;
  var MAX_TRAIL = 24;
  var CLICK_LIFE = 1.2;
  var TRAIL_LIFE = 0.7;
  var TRAIL_STEP = 0.015;
  var INTRO_SECONDS = 2.4;
  var ATLAS_CELL_W = 60;
  var ATLAS_CELL_H = 100;
  var ATLAS_COLUMNS = 16;
  var FONT_SCALE = 0.78;
  var DEFAULT_COLORS = ['#1e3fd8', '#f6f8ff', '#a5d8ff', '#38bdf8'];
  var DEFAULT_CHARACTERS = ' =+xX0S8#@';
  var DEFAULT_FONT = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  var SHAPES = { horizon: 0, pinch: 1, rise: 2, eclipse: 3 };
  var CLICK_EFFECTS = { none: 0, wave: 1, burst: 2 };
  var activeInstances = new WeakMap();

  var VERTEX = '#version 300 es\n' +
    'out vec2 vUv;\n' +
    'void main() {\n' +
    '  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));\n' +
    '  vUv = p;\n' +
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);\n' +
    '}';

  var COMMON = '\n' +
    'float hash12(vec2 p) {\n' +
    '  vec3 q = fract(vec3(p.xyx) * 0.1031);\n' +
    '  q += dot(q, q.yzx + 33.33);\n' +
    '  return fract((q.x + q.y) * q.z);\n' +
    '}\n';

  var FIELD = '#version 300 es\n' +
    'precision highp float;\n' +
    'precision highp int;\n' +
    'uniform float uAspect;\n' +
    'uniform float uTime;\n' +
    'uniform int uShape;\n' +
    'uniform vec3 uRamp[8];\n' +
    'uniform int uCount;\n' +
    'uniform float uScale;\n' +
    'uniform float uSoftness;\n' +
    'uniform float uFlow;\n' +
    'uniform vec2 uSeed;\n' +
    'uniform vec4 uTrail[24];\n' +
    'uniform float uRadius;\n' +
    'uniform vec4 uClicks[4];\n' +
    'uniform int uClickEffect;\n' +
    'uniform float uIntro;\n' +
    'uniform float uFrame;\n' +
    'in vec2 vUv;\n' +
    'layout(location = 0) out vec4 outColor;\n' +
    'layout(location = 1) out vec4 outAux;\n' +
    COMMON +
    'vec2 hash22(vec2 p) {\n' +
    '  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));\n' +
    '  q += dot(q, q.yzx + 33.33);\n' +
    '  return fract((q.xx + q.yz) * q.zy) * 2.0 - 1.0;\n' +
    '}\n' +
    'float noise(vec2 p) {\n' +
    '  vec2 i = floor(p);\n' +
    '  vec2 f = fract(p);\n' +
    '  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);\n' +
    '  float a = dot(hash22(i), f);\n' +
    '  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));\n' +
    '  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));\n' +
    '  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));\n' +
    '  return 0.5 + 0.5 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);\n' +
    '}\n' +
    'vec3 labToRgb(vec3 lab) {\n' +
    '  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;\n' +
    '  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;\n' +
    '  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;\n' +
    '  l = l * l * l;\n' +
    '  m = m * m * m;\n' +
    '  s = s * s * s;\n' +
    '  return vec3(\n' +
    '    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,\n' +
    '    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,\n' +
    '    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s\n' +
    '  );\n' +
    '}\n' +
    'vec3 encode(vec3 c) {\n' +
    '  c = clamp(c, 0.0, 1.0);\n' +
    '  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));\n' +
    '}\n' +
    'vec3 horizon(vec2 p, float time, out float order) {\n' +
    '  float span = 0.5 * max(uAspect, 1.0);\n' +
    '  float x = p.x / span;\n' +
    '  float arch = -0.17 - 0.2 * x * x + 0.02 * sin(time * 0.6);\n' +
    '  float soft = mix(0.05, 0.22, uSoftness);\n' +
    '  float edge = p.y - arch;\n' +
    '  float rim = 0.38 * smoothstep(-soft, 0.42, edge);\n' +
    '  vec2 sun = vec2(0.08 * sin(time * 0.31) * span, 0.58);\n' +
    '  float spread = length((p - sun) / vec2(0.95 * span, 0.75));\n' +
    '  float sky = mix(0.55, 1.0, smoothstep(0.2, 0.95, spread));\n' +
    '  order = clamp(edge * 1.3, 0.0, 1.0);\n' +
    '  return vec3(rim, sky, smoothstep(0.18, 0.62, edge));\n' +
    '}\n' +
    'vec3 pinch(vec2 p, float time, out float order) {\n' +
    '  float span = 0.5 * max(uAspect, 0.75);\n' +
    '  float x = p.x / span;\n' +
    '  float sway = 0.02 * sin(x * 1.7 + time * 0.55);\n' +
    '  float breathe = 1.0 + 0.06 * sin(time * 0.8);\n' +
    '  float width = (0.13 + 0.22 * x * x) * breathe * mix(0.85, 1.2, uSoftness);\n' +
    '  float y = abs(p.y - sway) / width;\n' +
    '  float t = exp(-pow(y, 2.2)) * (0.42 + 0.58 * exp(-x * x * 1.8));\n' +
    '  order = clamp(abs(p.y - sway) * 2.4 + abs(x) * 0.3, 0.0, 1.0);\n' +
    '  return vec3(t, t, 0.0);\n' +
    '}\n' +
    'vec3 rise(vec2 p, float time, out float order) {\n' +
    '  float wide = max(uAspect, 0.9);\n' +
    '  vec2 center = vec2(0.05 * sin(time * 0.45) * wide, -0.7);\n' +
    '  vec2 radius = vec2(0.82 * wide, 0.64 * (1.0 + 0.04 * sin(time * 0.8)));\n' +
    '  float d = length((p - center) / radius);\n' +
    '  float soft = mix(0.6, 1.15, uSoftness);\n' +
    '  float t = clamp(pow(clamp(1.0 - d, 0.0, 1.0), soft) * 1.35, 0.0, 1.0);\n' +
    '  order = clamp((d - 0.2) * 1.3, 0.0, 1.0);\n' +
    '  return vec3(t, t, 0.0);\n' +
    '}\n' +
    'vec3 eclipse(vec2 p, float time, out float order) {\n' +
    '  float fit = min(1.0, uAspect * 1.25);\n' +
    '  float r = 0.23 * fit * (1.0 + 0.015 * sin(time * 0.9));\n' +
    '  float angle = atan(p.y, p.x);\n' +
    '  float rays = noise(vec2(cos(angle), sin(angle)) * 2.2 + time * 0.08) * 0.8 + 0.6;\n' +
    '  float d = length(p) - r;\n' +
    '  float reach = mix(0.07, 0.15, uSoftness) * rays * fit;\n' +
    '  float t = smoothstep(-0.006, 0.006 + 0.02 * uSoftness, d) * exp(-max(d, 0.0) / reach);\n' +
    '  order = clamp(d * 2.0, 0.0, 1.0);\n' +
    '  return vec3(t, t, 0.0);\n' +
    '}\n' +
    'vec4 tone(float t) {\n' +
    '  float x = smoothstep(0.3, 1.0, t) * float(uCount - 1);\n' +
    '  int index = int(floor(x));\n' +
    '  return vec4(mix(uRamp[index], uRamp[min(index + 1, uCount - 1)], fract(x)), smoothstep(0.0, 0.38, t));\n' +
    '}\n' +
    'void main() {\n' +
    '  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);\n' +
    '  float time = uTime;\n' +
    '  vec2 q = p / uScale;\n' +
    '  vec2 warp = vec2(\n' +
    '    noise(q * 1.6 + uSeed + vec2(0.0, time * 0.3)),\n' +
    '    noise(q * 1.6 + uSeed.yx + vec2(4.3, -time * 0.24))\n' +
    '  ) - 0.5;\n' +
    '  q += warp * uFlow * (uShape == 3 ? 0.04 : 0.18);\n' +
    '  float order = 0.0;\n' +
    '  vec3 shape;\n' +
    '  if (uShape == 0) shape = horizon(q, time, order);\n' +
    '  else if (uShape == 1) shape = pinch(q, time, order);\n' +
    '  else if (uShape == 2) shape = rise(q, time, order);\n' +
    '  else shape = eclipse(q, time, order);\n' +
    '  float reveal = clamp((uIntro * 1.45 - order) / 0.45, 0.0, 1.0);\n' +
    '  reveal = reveal * reveal * (3.0 - 2.0 * reveal);\n' +
    '  float scramble = 0.0;\n' +
    '  for (int i = 0; i < 24; i++) {\n' +
    '    vec4 point = uTrail[i];\n' +
    '    if (point.z <= 0.0) continue;\n' +
    '    vec2 d = p - point.xy;\n' +
    '    scramble = max(scramble, point.z * exp(-dot(d, d) / (uRadius * uRadius)));\n' +
    '  }\n' +
    '  for (int i = 0; i < 4; i++) {\n' +
    '    vec4 c = uClicks[i];\n' +
    '    if (c.w <= 0.0) continue;\n' +
    '    float d = length(p - c.xy);\n' +
    '    if (uClickEffect == 1) {\n' +
    '      scramble = max(scramble, exp(-pow((d - c.z * 0.75) / 0.06, 2.0)) * c.w);\n' +
    '    } else if (uClickEffect == 2) {\n' +
    '      float size = 0.08 + 0.22 * (1.0 - exp(-c.z * 5.0));\n' +
    '      scramble = max(scramble, (1.0 - smoothstep(size * 0.6, size, d)) * c.w);\n' +
    '    }\n' +
    '  }\n' +
    '  vec2 t = clamp(shape.xy * mix(0.7, 1.0, reveal), 0.0, 1.0);\n' +
    '  vec4 mixed = mix(tone(t.x), tone(t.y), shape.z);\n' +
    '  vec3 color = encode(labToRgb(mixed.rgb));\n' +
    '  float alpha = mixed.a * reveal;\n' +
    '  float dither = (hash12(gl_FragCoord.xy + uFrame * 13.7) - 0.5) / 255.0;\n' +
    '  outColor = clamp(vec4(color * alpha + dither, alpha + dither), 0.0, 1.0);\n' +
    '  outAux = vec4(reveal, scramble, 0.0, 1.0);\n' +
    '}';

  var GLYPHS = '\n' +
    'uniform sampler2D uField;\n' +
    'uniform sampler2D uAux;\n' +
    'uniform sampler2D uAtlas;\n' +
    'uniform vec2 uResolution;\n' +
    'uniform vec2 uCell;\n' +
    'uniform vec2 uOffset;\n' +
    'uniform vec2 uAtlasGrid;\n' +
    'uniform float uCount;\n' +
    'uniform float uDensity;\n' +
    'uniform float uOpacity;\n' +
    'uniform float uFlicker;\n' +
    'uniform float uDepth;\n' +
    'uniform float uGlyphTime;\n' +
    'uniform float uSeedValue;\n' +
    'uniform float uLight;\n' +
    COMMON +
    'float sampleGlyph(float index, vec2 local, vec2 coord, float soft) {\n' +
    '  float column = mod(index, uAtlasGrid.x);\n' +
    '  float row = floor(index / uAtlasGrid.x);\n' +
    '  vec2 atlasUv = vec2((column + local.x) / uAtlasGrid.x, (row + 1.0 - local.y) / uAtlasGrid.y);\n' +
    '  vec2 continuous = coord / uAtlasGrid;\n' +
    '  float scale = exp2(soft);\n' +
    '  return textureGrad(uAtlas, atlasUv, dFdx(continuous) * scale, dFdy(continuous) * scale).a;\n' +
    '}\n' +
    'vec4 glyphAt(vec2 px) {\n' +
    '  vec2 coord = (px - uOffset) / uCell;\n' +
    '  vec2 cell = floor(coord);\n' +
    '  vec2 local = coord - cell;\n' +
    '  vec2 uv = clamp(((cell + 0.5) * uCell + uOffset) / uResolution, vec2(0.0), vec2(1.0));\n' +
    '  vec4 field = texture(uField, uv);\n' +
    '  vec4 aux = texture(uAux, uv);\n' +
    '  vec3 visible = uLight > 0.5 ? field.rgb + (1.0 - field.a) : field.rgb;\n' +
    '  float luma = dot(visible, vec3(0.2126, 0.7152, 0.0722));\n' +
    '  float value = uLight > 0.5 ? clamp((1.0 - luma) * 1.5, 0.0, 1.0) : luma;\n' +
    '  float pick = hash12(cell + uSeedValue * 7.31);\n' +
    '  float level = hash12(cell * 1.73 + 4.1 + uSeedValue);\n' +
    '  float tick = floor(uGlyphTime * 9.0 + level * 9.0);\n' +
    '  float wobble = (hash12(cell * 2.31 + tick * 17.7) - 0.5) * uFlicker * 0.4 + (level - 0.5) * 0.1;\n' +
    '  float tone = clamp(pow(value, 0.75) + wobble, 0.0, 1.0);\n' +
    '  float index = floor(tone * (uCount - 1.0) + 0.5);\n' +
    '  float decode = max(aux.g, 1.0 - aux.r);\n' +
    '  if (decode > 0.02) {\n' +
    '    float frame = floor(uGlyphTime * 20.0);\n' +
    '    if (hash12(cell * 3.7 + frame * 5.3) < decode * 1.25) index = 1.0 + floor(hash12(cell + frame * 1.37) * (uCount - 1.0));\n' +
    '  }\n' +
    '  float present = step(pick, uDensity * mix(1.0, 0.3 + tone * 1.1, 0.55));\n' +
    '  float cutoff = smoothstep(0.03, 0.1, value);\n' +
    '  float focus = step(hash12(cell * 0.71 + 9.2 + uSeedValue), uDepth);\n' +
    '  float coverage = sampleGlyph(index, local, coord, focus * 1.2);\n' +
    '  float alpha = uOpacity * present * cutoff * coverage * mix(1.0, 0.35 + 0.65 * level, 0.55) * (1.0 - focus * 0.5);\n' +
    '  if (uLight < 0.5) {\n' +
    '    vec3 light = field.rgb * 0.55 + vec3(0.03) * field.a;\n' +
    '    return vec4(light * alpha, 0.6 * field.a * alpha);\n' +
    '  }\n' +
    '  vec3 ink = visible * 0.8;\n' +
    '  return vec4(ink * alpha, alpha);\n' +
    '}\n';

  var HALO = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform float uDownscale;\n' +
    'in vec2 vUv;\n' +
    'out vec4 outColor;\n' +
    GLYPHS +
    'void main() {\n' +
    '  outColor = glyphAt(gl_FragCoord.xy * uDownscale);\n' +
    '}';

  var BLUR = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uSource;\n' +
    'uniform vec2 uStep;\n' +
    'in vec2 vUv;\n' +
    'out vec4 outColor;\n' +
    'void main() {\n' +
    '  vec4 sum = texture(uSource, vUv) * 0.2270270270;\n' +
    '  sum += texture(uSource, vUv + uStep * 1.3846153846) * 0.3162162162;\n' +
    '  sum += texture(uSource, vUv - uStep * 1.3846153846) * 0.3162162162;\n' +
    '  sum += texture(uSource, vUv + uStep * 3.2307692308) * 0.0702702703;\n' +
    '  sum += texture(uSource, vUv - uStep * 3.2307692308) * 0.0702702703;\n' +
    '  outColor = sum;\n' +
    '}';

  var COMPOSITE = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uHalo;\n' +
    'uniform float uGlow;\n' +
    'uniform float uGradient;\n' +
    'uniform float uGrain;\n' +
    'uniform float uFrame;\n' +
    'in vec2 vUv;\n' +
    'out vec4 outColor;\n' +
    GLYPHS +
    'void main() {\n' +
    '  vec4 base = texture(uField, vUv) * uGradient;\n' +
    '  vec4 glyph = glyphAt(gl_FragCoord.xy);\n' +
    '  vec4 halo = texture(uHalo, vUv) * uGlow;\n' +
    '  vec4 color;\n' +
    '  if (uLight < 0.5) {\n' +
    '    color = base + glyph + halo;\n' +
    '  } else {\n' +
    '    color = glyph + base * (1.0 - glyph.a);\n' +
    '    color += halo * 0.6 * (1.0 - color.a);\n' +
    '  }\n' +
    '  float grain = (hash12(gl_FragCoord.xy + uFrame * vec2(17.0, 59.0)) + hash12(gl_FragCoord.xy * 1.31 + uFrame * 7.0) - 1.0) * uGrain;\n' +
    '  float body = clamp(color.a, 0.0, 1.0);\n' +
    '  color.rgb += grain * (0.25 + body) * 0.5;\n' +
    '  color.a = clamp(color.a, 0.0, 1.0);\n' +
    '  color.rgb = clamp(color.rgb, 0.0, color.a);\n' +
    '  outColor = color;\n' +
    '}';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function finite(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function toLinear(value) {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function toLab(rgb) {
    var lr = toLinear(rgb[0]);
    var lg = toLinear(rgb[1]);
    var lb = toLinear(rgb[2]);
    var l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    var m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    var s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    ];
  }

  function compile(gl, type, source, label) {
    var shader = gl.createShader(type);
    if (!shader) {
      console.warn('[GradientASCII] Unable to create the ' + label + ' shader.');
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.warn('[GradientASCII] ' + label + ' shader compilation failed:', gl.getShaderInfoLog(shader) || 'unknown shader error');
    gl.deleteShader(shader);
    return null;
  }

  function link(gl, fragmentSource, label) {
    var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX, label + ' vertex');
    var fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource, label + ' fragment');
    var program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return null;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[GradientASCII] ' + label + ' program link failed:', gl.getProgramInfoLog(program) || 'unknown program error');
      gl.deleteProgram(program);
      return null;
    }
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i += 1) {
      var info = gl.getActiveUniform(program, i);
      if (!info) continue;
      // WebGL reports uniform-array roots as "uRamp[0]"; the root is required below.
      var name = info.name.replace(/\[0\]$/, '');
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    return { program: program, uniforms: uniforms };
  }

  function createTarget(gl, count) {
    var textures = [];
    for (var i = 0; i < count; i += 1) {
      var texture = gl.createTexture();
      if (!texture) return null;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      textures.push(texture);
    }
    var framebuffer = gl.createFramebuffer();
    if (!framebuffer) {
      textures.forEach(function (texture) { gl.deleteTexture(texture); });
      return null;
    }
    return { textures: textures, framebuffer: framebuffer, width: 0, height: 0 };
  }

  function sizeTarget(gl, target, width, height) {
    if (!target || (target.width === width && target.height === height)) return true;
    target.width = width;
    target.height = height;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    target.textures.forEach(function (texture, index) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0);
    });
    var complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!complete) console.warn('[GradientASCII] Offscreen framebuffer is incomplete; showing the static fallback.');
    return complete;
  }

  function buildAtlas(gl, characters, fontFamily) {
    var seen = new Set();
    var list = [];
    Array.from(characters).forEach(function (character) {
      if (character !== '\n' && character !== '\r' && !seen.has(character)) {
        seen.add(character);
        list.push(character);
      }
    });
    if (!list.length) list.push(' ');
    var columns = Math.min(ATLAS_COLUMNS, list.length);
    var rows = Math.ceil(list.length / columns);
    var canvas = document.createElement('canvas');
    canvas.width = ATLAS_CELL_W * columns;
    canvas.height = ATLAS_CELL_H * rows;
    var context = canvas.getContext('2d');
    if (!context) {
      console.warn('[GradientASCII] Canvas 2D is unavailable; glyph atlas could not be created.');
      return null;
    }
    context.font = '300 ' + Math.round(ATLAS_CELL_H * FONT_SCALE) + 'px ' + fontFamily;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#fff';
    list.forEach(function (character, index) {
      var column = index % columns;
      var row = Math.floor(index / columns);
      context.fillText(character, column * ATLAS_CELL_W + ATLAS_CELL_W / 2, row * ATLAS_CELL_H + ATLAS_CELL_H / 2 + 3);
    });

    var texture = gl.createTexture();
    if (!texture) return null;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { texture: texture, count: list.length, grid: [columns, rows] };
  }

  function normaliseOptions(options) {
    options = options && typeof options === 'object' ? options : {};
    var palette = Array.isArray(options.colors) && options.colors.length ? options.colors.slice(0, MAX_COLORS) : DEFAULT_COLORS.slice();
    palette = palette.map(String).filter(Boolean);
    if (!palette.length) palette = DEFAULT_COLORS.slice();
    if (palette.length === 1) palette.push(palette[0]);
    var shape = typeof options.shape === 'string' && Object.prototype.hasOwnProperty.call(SHAPES, options.shape) ? SHAPES[options.shape] : SHAPES.horizon;
    var effect = typeof options.clickEffect === 'string' && Object.prototype.hasOwnProperty.call(CLICK_EFFECTS, options.clickEffect) ? CLICK_EFFECTS[options.clickEffect] : CLICK_EFFECTS.wave;
    var maxDpr = clamp(finite(options.maxDpr, 1.5), 0.5, 3);
    var fpsOption = options.maxFps != null ? options.maxFps : options.fps;
    return {
      colors: palette,
      shape: shape,
      characters: String(options.characters || DEFAULT_CHARACTERS),
      cellSize: clamp(finite(options.cellSize, 18), 6, 64),
      density: clamp(finite(options.density, 0.8), 0, 1),
      glyphOpacity: clamp(finite(options.glyphOpacity, 0.85), 0, 1),
      gradientOpacity: clamp(finite(options.gradientOpacity, 0.9), 0, 1),
      glow: clamp(finite(options.glow, 0.2), 0, 2),
      depthOfField: clamp(finite(options.depthOfField, 0), 0, 1),
      flicker: clamp(finite(options.flicker, 0.2), 0, 1),
      softness: clamp(finite(options.softness, 0.5), 0, 1),
      scale: clamp(finite(options.scale, 1), 0.4, 2.5),
      flow: clamp(finite(options.flow, 0.5), 0, 2),
      speed: Math.max(0, finite(options.speed, 1)),
      grain: clamp(finite(options.grain, 0.08), 0, 0.4),
      variation: Math.max(0, finite(options.variation, 0)),
      mouseInteraction: options.mouseInteraction !== false,
      scrambleRadius: clamp(finite(options.scrambleRadius, 0.1), 0.02, 0.4),
      clickEffect: effect,
      intro: options.intro !== false,
      lightMode: options.lightMode === true,
      fontFamily: String(options.fontFamily || DEFAULT_FONT),
      dpr: options.dpr == null ? null : clamp(finite(options.dpr, maxDpr), 0.5, maxDpr),
      maxDpr: maxDpr,
      maxFps: clamp(finite(fpsOption, 30), 1, 60)
    };
  }

  function makeFallbackBackground(colors) {
    var edge = colors[0] || '#1e3fd8';
    var bright = colors[Math.min(1, colors.length - 1)] || edge;
    var middle = colors[Math.min(2, colors.length - 1)] || edge;
    return 'radial-gradient(ellipse 95% 70% at 54% 30%, ' + bright + ' 0%, ' + middle + ' 24%, ' + edge + ' 52%, #070b17 100%)';
  }

  function startGradientASCII(container, options) {
    if (!container || container.nodeType !== 1) {
      console.warn('[GradientASCII] startGradientASCII(container, options) requires an element container.');
      return function () {};
    }

    var prior = activeInstances.get(container);
    if (prior) prior();

    var settings = normaliseOptions(options);
    var abortController = new AbortController();
    var signal = abortController.signal;
    var disposed = false;
    var contextLost = false;
    var visible = true;
    var reducedMotionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduce = !!(reducedMotionQuery && reducedMotionQuery.matches);
    var previousPosition = container.style.position;
    var adjustedPosition = false;
    var computedPosition = window.getComputedStyle ? window.getComputedStyle(container).position : '';
    if (computedPosition === 'static') {
      container.style.position = 'relative';
      adjustedPosition = true;
    }

    var fallback = document.createElement('div');
    fallback.className = 'gradient-ascii-fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:' + makeFallbackBackground(settings.colors) + ';opacity:0;transition:opacity 160ms linear;';

    var canvas = document.createElement('canvas');
    canvas.className = 'gradient-ascii-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;transition:opacity 160ms linear;';
    container.appendChild(fallback);
    container.appendChild(canvas);

    var glOptions = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
    var gl = canvas.getContext('webgl2', glOptions);
    var resources = null;
    var atlas = null;
    var atlasKey = '';
    var paletteKey = '';
    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    var colorCache = new Map();
    var ramp = new Float32Array(MAX_COLORS * 3);
    var clickData = new Float32Array(MAX_CLICKS * 4);
    var trailData = new Float32Array(MAX_TRAIL * 4);
    var clicks = [];
    var trail = [];
    var view = { width: 1, height: 1, ratio: 1 };
    var time = 0;
    var glyphTime = 0;
    var introClock = settings.intro && !reduce ? 0 : 1;
    var frameSeed = 0;
    var grainClock = 0;
    var raf = 0;
    var last = 0;
    var lastDraw = 0;
    var warnedRuntimeFailure = false;

    function showFallback(reason) {
      canvas.style.opacity = '0';
      fallback.style.opacity = '1';
      if (reason) console.warn('[GradientASCII] ' + reason + ' Using the static CSS fallback.');
    }

    function hideFallback() {
      canvas.style.opacity = '1';
      fallback.style.opacity = '0';
    }

    function removeResources() {
      if (!gl || !resources || contextLost) {
        resources = null;
        atlas = null;
        return;
      }
      [resources.fieldTarget, resources.haloA, resources.haloB].forEach(function (target) {
        if (!target) return;
        target.textures.forEach(function (texture) { gl.deleteTexture(texture); });
        gl.deleteFramebuffer(target.framebuffer);
      });
      if (atlas) gl.deleteTexture(atlas.texture);
      if (resources.vao) gl.deleteVertexArray(resources.vao);
      [resources.field, resources.halo, resources.blur, resources.composite].forEach(function (item) {
        if (item) gl.deleteProgram(item.program);
      });
      resources = null;
      atlas = null;
      atlasKey = '';
    }

    function initialiseGL() {
      if (!gl || contextLost || disposed) return false;
      removeResources();
      var field = link(gl, FIELD, 'field');
      var halo = link(gl, HALO, 'halo');
      var blur = link(gl, BLUR, 'blur');
      var composite = link(gl, COMPOSITE, 'composite');
      var vao = gl.createVertexArray();
      var fieldTarget = createTarget(gl, 2);
      var haloA = createTarget(gl, 1);
      var haloB = createTarget(gl, 1);
      if (!field || !halo || !blur || !composite || !vao || !fieldTarget || !haloA || !haloB) {
        [field, halo, blur, composite].forEach(function (item) { if (item) gl.deleteProgram(item.program); });
        if (vao) gl.deleteVertexArray(vao);
        [fieldTarget, haloA, haloB].forEach(function (target) {
          if (!target) return;
          target.textures.forEach(function (texture) { gl.deleteTexture(texture); });
          gl.deleteFramebuffer(target.framebuffer);
        });
        console.warn('[GradientASCII] WebGL2 setup could not be completed.');
        return false;
      }
      resources = { field: field, halo: halo, blur: blur, composite: composite, vao: vao, fieldTarget: fieldTarget, haloA: haloA, haloB: haloB };
      return true;
    }

    function parseColor(value) {
      var key = String(value);
      if (colorCache.has(key)) return colorCache.get(key);
      var rgb = [0, 0, 0];
      if (probe) {
        probe.clearRect(0, 0, 1, 1);
        probe.fillStyle = '#000000';
        probe.fillStyle = key;
        probe.fillRect(0, 0, 1, 1);
        var data = probe.getImageData(0, 0, 1, 1).data;
        rgb = [data[0] / 255, data[1] / 255, data[2] / 255];
      }
      colorCache.set(key, rgb);
      return rgb;
    }

    function syncPalette() {
      var key = settings.colors.join(',');
      if (key === paletteKey) return;
      paletteKey = key;
      ramp.fill(0);
      settings.colors.forEach(function (color, index) {
        ramp.set(toLab(parseColor(color)), index * 3);
      });
    }

    function syncAtlas() {
      if (!gl || !resources) return false;
      // The template interpolation is deliberate: font and glyph changes require a new atlas.
      var key = settings.fontFamily + '|' + settings.characters;
      if (key === atlasKey && atlas) return true;
      atlasKey = key;
      if (atlas) gl.deleteTexture(atlas.texture);
      atlas = buildAtlas(gl, settings.characters, settings.fontFamily);
      if (!atlas) {
        console.warn('[GradientASCII] Glyph atlas creation failed.');
        return false;
      }
      return true;
    }

    function bindGlyphs(program, width, height) {
      if (!atlas || !resources) return false;
      var uniforms = program.uniforms;
      var cellH = settings.cellSize * view.ratio;
      var cellW = cellH * (ATLAS_CELL_W / ATLAS_CELL_H);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, resources.fieldTarget.textures[0]);
      gl.uniform1i(uniforms.uField, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, resources.fieldTarget.textures[1]);
      gl.uniform1i(uniforms.uAux, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, atlas.texture);
      gl.uniform1i(uniforms.uAtlas, 2);
      gl.uniform2f(uniforms.uResolution, width, height);
      gl.uniform2f(uniforms.uCell, cellW, cellH);
      gl.uniform2f(uniforms.uOffset, (width - Math.ceil(width / cellW) * cellW) / 2, (height - Math.ceil(height / cellH) * cellH) / 2);
      gl.uniform2f(uniforms.uAtlasGrid, atlas.grid[0], atlas.grid[1]);
      gl.uniform1f(uniforms.uCount, atlas.count);
      gl.uniform1f(uniforms.uDensity, settings.density);
      gl.uniform1f(uniforms.uOpacity, settings.glyphOpacity);
      gl.uniform1f(uniforms.uFlicker, reduce ? 0 : settings.flicker);
      gl.uniform1f(uniforms.uDepth, settings.depthOfField);
      gl.uniform1f(uniforms.uGlyphTime, glyphTime);
      gl.uniform1f(uniforms.uSeedValue, settings.variation);
      gl.uniform1f(uniforms.uLight, settings.lightMode ? 1 : 0);
      return true;
    }

    function draw() {
      if (disposed || contextLost || !gl || !resources || !syncAtlas()) return false;
      var fieldTarget = resources.fieldTarget;
      var haloA = resources.haloA;
      var haloB = resources.haloB;
      var aspect = view.width / view.height;
      syncPalette();
      try {
        gl.bindVertexArray(resources.vao);
        gl.disable(gl.BLEND);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fieldTarget.framebuffer);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
        gl.viewport(0, 0, fieldTarget.width, fieldTarget.height);
        gl.useProgram(resources.field.program);
        var fieldUniforms = resources.field.uniforms;
        gl.uniform1f(fieldUniforms.uAspect, aspect);
        gl.uniform1f(fieldUniforms.uTime, time);
        gl.uniform1i(fieldUniforms.uShape, settings.shape);
        gl.uniform3fv(fieldUniforms.uRamp, ramp);
        gl.uniform1i(fieldUniforms.uCount, settings.colors.length);
        gl.uniform1f(fieldUniforms.uScale, settings.scale);
        gl.uniform1f(fieldUniforms.uSoftness, settings.softness);
        gl.uniform1f(fieldUniforms.uFlow, settings.flow);
        gl.uniform2f(fieldUniforms.uSeed, settings.variation * 3.17, settings.variation * 1.91);
        gl.uniform4fv(fieldUniforms.uTrail, trailData);
        gl.uniform1f(fieldUniforms.uRadius, settings.scrambleRadius);
        gl.uniform4fv(fieldUniforms.uClicks, clickData);
        gl.uniform1i(fieldUniforms.uClickEffect, settings.clickEffect);
        gl.uniform1f(fieldUniforms.uIntro, introClock);
        gl.uniform1f(fieldUniforms.uFrame, frameSeed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        var glowing = settings.glow > 0.001;
        if (glowing) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
          gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
          gl.viewport(0, 0, haloA.width, haloA.height);
          gl.useProgram(resources.halo.program);
          bindGlyphs(resources.halo, canvas.width, canvas.height);
          gl.uniform1f(resources.halo.uniforms.uDownscale, canvas.width / haloA.width);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          gl.useProgram(resources.blur.program);
          gl.activeTexture(gl.TEXTURE0);
          gl.uniform1i(resources.blur.uniforms.uSource, 0);
          gl.bindFramebuffer(gl.FRAMEBUFFER, haloB.framebuffer);
          gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
          gl.uniform2f(resources.blur.uniforms.uStep, 1 / haloA.width, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          gl.bindFramebuffer(gl.FRAMEBUFFER, haloA.framebuffer);
          gl.bindTexture(gl.TEXTURE_2D, haloB.textures[0]);
          gl.uniform2f(resources.blur.uniforms.uStep, 0, 1 / haloA.height);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(resources.composite.program);
        bindGlyphs(resources.composite, canvas.width, canvas.height);
        var compositeUniforms = resources.composite.uniforms;
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, haloA.textures[0]);
        gl.uniform1i(compositeUniforms.uHalo, 3);
        gl.uniform1f(compositeUniforms.uGlow, glowing ? settings.glow : 0);
        gl.uniform1f(compositeUniforms.uGradient, settings.gradientOpacity);
        gl.uniform1f(compositeUniforms.uGrain, settings.grain);
        gl.uniform1f(compositeUniforms.uFrame, frameSeed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        hideFallback();
        return true;
      } catch (error) {
        if (!warnedRuntimeFailure) {
          warnedRuntimeFailure = true;
          console.warn('[GradientASCII] WebGL rendering failed:', error);
        }
        showFallback();
        return false;
      }
    }

    function resize() {
      if (disposed || contextLost || !gl || !resources) return;
      view.width = Math.max(1, container.clientWidth || container.getBoundingClientRect().width || 1);
      view.height = Math.max(1, container.clientHeight || container.getBoundingClientRect().height || 1);
      var requestedRatio = settings.dpr == null ? (window.devicePixelRatio || 1) : settings.dpr;
      view.ratio = Math.min(Math.max(0.5, requestedRatio), settings.maxDpr);
      canvas.width = Math.max(1, Math.round(view.width * view.ratio));
      canvas.height = Math.max(1, Math.round(view.height * view.ratio));
      var targetsReady = sizeTarget(gl, resources.fieldTarget, Math.max(1, Math.round(canvas.width / 2)), Math.max(1, Math.round(canvas.height / 2))) &&
        sizeTarget(gl, resources.haloA, Math.max(1, Math.round(canvas.width / 4)), Math.max(1, Math.round(canvas.height / 4))) &&
        sizeTarget(gl, resources.haloB, Math.max(1, Math.round(canvas.width / 4)), Math.max(1, Math.round(canvas.height / 4)));
      if (!targetsReady) {
        showFallback();
        return;
      }
      draw();
      wake();
    }

    function updateInput(dt) {
      trail.forEach(function (point) { point.age += dt; });
      while (trail.length && trail[trail.length - 1].age > TRAIL_LIFE) trail.pop();
      for (var i = 0; i < MAX_TRAIL; i += 1) {
        var point = trail[i];
        if (!point) {
          trailData[i * 4 + 2] = 0;
          continue;
        }
        var trailOpacity = 1 - point.age / TRAIL_LIFE;
        trailData.set([point.x, point.y, trailOpacity * trailOpacity, 0], i * 4);
      }
      clicks.forEach(function (click) { click.age += dt; });
      while (clicks.length && clicks[clicks.length - 1].age > CLICK_LIFE) clicks.pop();
      for (var j = 0; j < MAX_CLICKS; j += 1) {
        var click = clicks[j];
        if (!click) {
          clickData[j * 4 + 3] = 0;
          continue;
        }
        var clickProgress = click.age / CLICK_LIFE;
        var envelope = Math.min(1, click.age / 0.08) * (1 - clickProgress) * (1 - clickProgress);
        clickData.set([click.x, click.y, click.age, envelope], j * 4);
      }
    }

    function frame(now) {
      raf = 0;
      if (disposed || contextLost || !visible || document.hidden) return;
      var interval = 1000 / settings.maxFps;
      if (lastDraw && now - lastDraw < interval) {
        raf = window.requestAnimationFrame(frame);
        return;
      }
      var dt = last ? clamp((now - last) / 1000, 0.001, 0.05) : 1 / settings.maxFps;
      last = now;
      lastDraw = now;
      if (!reduce) {
        time += dt * settings.speed * 0.5;
        glyphTime += dt * Math.max(settings.speed, 0.15);
      }
      if (introClock < 1) introClock = Math.min(1, introClock + dt / INTRO_SECONDS);
      grainClock += dt;
      if (!reduce && grainClock > 1 / 24) {
        grainClock = 0;
        frameSeed = (frameSeed + 1) % 97;
      }
      updateInput(dt);
      draw();
      var busy = (!reduce && (settings.speed > 0 || settings.grain > 0 || settings.flicker > 0)) || introClock < 1 || clicks.length > 0 || trail.length > 0;
      if (busy) raf = window.requestAnimationFrame(frame);
      else {
        last = 0;
        lastDraw = 0;
      }
    }

    function wake() {
      if (!raf && !disposed && !contextLost && visible && !document.hidden && resources) raf = window.requestAnimationFrame(frame);
    }

    function locate(event) {
      var rect = container.getBoundingClientRect();
      var x = (event.clientX - rect.left) / Math.max(1, rect.width);
      var y = 1 - (event.clientY - rect.top) / Math.max(1, rect.height);
      var aspect = rect.width / Math.max(1, rect.height);
      return { inside: x >= 0 && x <= 1 && y >= 0 && y <= 1, x: (x - 0.5) * aspect, y: y - 0.5 };
    }

    function onPointerMove(event) {
      var pointer = locate(event);
      if (!pointer.inside || !settings.mouseInteraction || reduce) return;
      var head = trail[0];
      var gap = head ? Math.hypot(pointer.x - head.x, pointer.y - head.y) : Infinity;
      if (gap < TRAIL_STEP) return;
      if (head && head.age < 0.1) {
        var steps = Math.min(6, Math.floor(gap / (TRAIL_STEP * 2)));
        for (var i = 1; i <= steps; i += 1) {
          var amount = i / (steps + 1);
          trail.unshift({ x: head.x + (pointer.x - head.x) * amount, y: head.y + (pointer.y - head.y) * amount, age: 0 });
        }
      }
      trail.unshift({ x: pointer.x, y: pointer.y, age: 0 });
      trail.length = Math.min(trail.length, MAX_TRAIL);
      wake();
    }

    function onPointerDown(event) {
      var pointer = locate(event);
      if (!pointer.inside || !settings.clickEffect || reduce) return;
      clicks.unshift({ x: pointer.x, y: pointer.y, age: 0 });
      if (clicks.length > MAX_CLICKS) clicks.pop();
      wake();
    }

    function onVisibilityChange() {
      last = 0;
      lastDraw = 0;
      if (document.hidden && raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      } else {
        wake();
      }
    }

    function onMotionChange(event) {
      reduce = !!event.matches;
      if (reduce) introClock = 1;
      last = 0;
      lastDraw = 0;
      wake();
    }

    function onContextLost(event) {
      event.preventDefault();
      contextLost = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      resources = null;
      atlas = null;
      showFallback('WebGL context was lost.');
    }

    function onContextRestored() {
      if (disposed) return;
      contextLost = false;
      gl = canvas.getContext('webgl2', glOptions);
      if (!gl || !initialiseGL()) {
        showFallback('WebGL context could not be restored.');
        return;
      }
      warnedRuntimeFailure = false;
      resize();
      wake();
    }

    canvas.addEventListener('webglcontextlost', onContextLost, { signal: signal });
    canvas.addEventListener('webglcontextrestored', onContextRestored, { signal: signal });

    if (!gl || !initialiseGL()) {
      showFallback('WebGL2 is unavailable or the shaders could not be initialised.');
    } else {
      var resizeObserver = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(resize) : null;
      var intersectionObserver = typeof window.IntersectionObserver === 'function' ? new window.IntersectionObserver(function (entries) {
        visible = entries.some(function (entry) { return entry.isIntersecting; });
        if (visible) {
          last = 0;
          lastDraw = 0;
          wake();
        } else if (raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
      }) : null;
      if (resizeObserver) resizeObserver.observe(container);
      if (intersectionObserver) intersectionObserver.observe(container);
      window.addEventListener('pointermove', onPointerMove, { passive: true, signal: signal });
      window.addEventListener('pointerdown', onPointerDown, { passive: true, signal: signal });
      document.addEventListener('visibilitychange', onVisibilityChange, { signal: signal });
      if (reducedMotionQuery) {
        if (typeof reducedMotionQuery.addEventListener === 'function') reducedMotionQuery.addEventListener('change', onMotionChange, { signal: signal });
        else if (typeof reducedMotionQuery.addListener === 'function') reducedMotionQuery.addListener(onMotionChange);
      }
      resize();

      signal.addEventListener('abort', function () {
        if (resizeObserver) resizeObserver.disconnect();
        if (intersectionObserver) intersectionObserver.disconnect();
        if (reducedMotionQuery && typeof reducedMotionQuery.removeListener === 'function') reducedMotionQuery.removeListener(onMotionChange);
      }, { once: true });
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      abortController.abort();
      removeResources();
      if (canvas.parentNode === container) container.removeChild(canvas);
      if (fallback.parentNode === container) container.removeChild(fallback);
      if (adjustedPosition) container.style.position = previousPosition;
      if (activeInstances.get(container) === cleanup) activeInstances.delete(container);
    }

    activeInstances.set(container, cleanup);
    return cleanup;
  }

  window.startGradientASCII = startGradientASCII;
}(window, document));
