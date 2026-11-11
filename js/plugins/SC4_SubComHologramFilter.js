//=============================================================================
// SC4_SubComHologramFilter.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc [SC4 v1.0.0] Filtre WebGL/PixiJS d'hologramme CRT pour portraits SubCom (SubComHologramFilter).
 * @author SimCraft
 * @help
 * ============================================================================
 * SC4_SubComHologramFilter.js
 * ============================================================================
 * Effet shader PixiJS v5 appliqué au portrait (Sprite_PaperdollFace) lorsque
 * le dialogue est en mode SubCom :
 *  - Compatible facesets Hero (144x144 composite) ET Vanilla (setFrame 576x288).
 *  - Scanlines CRT, grésillement aléatoire, micro-jitter horizontal et balayage.
 *  - Presets de teinte configurables ("green" par défaut, "cyan", "amber").
 * ============================================================================
 */

(() => {
    "use strict";

    const BaseFilter = (typeof PIXI !== "undefined" && typeof PIXI.Filter === "function")
        ? PIXI.Filter
        : class MockPixiFilter {
            constructor(vertexSrc, fragmentSrc, uniforms) {
                this.vertexSrc = vertexSrc || null;
                this.fragmentSrc = fragmentSrc || "";
                this.uniforms = uniforms || {};
                this.padding = 0;
                this.enabled = true;
            }
        };

    const FRAGMENT_SRC = `
        #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
        uniform highp vec4 inputSize;
        uniform highp vec4 outputFrame;
        #else
        precision mediump float;
        uniform vec4 inputSize;
        uniform vec4 outputFrame;
        #endif

        varying vec2 vTextureCoord;

        uniform sampler2D uSampler;
        uniform vec4 inputClamp;

        uniform float uTime;
        uniform vec3 uTintColor;
        uniform float uScanlineIntensity;
        uniform float uNoiseIntensity;
        uniform float uChromaOffset;
        uniform float uGlowStrength;
        uniform float uFlickerStrength;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main(void) {
            vec2 safeFrame = max(outputFrame.zw, vec2(1.0));
            vec2 uvLocal = vTextureCoord * inputSize.xy / safeFrame;

            float lineId = floor(uvLocal.y * 64.0);
            float glitchGate = step(0.955, hash(vec2(floor(uTime * 8.0), floor(lineId * 0.25))));
            float glitchSeed = hash(vec2(floor(uTime * 10.0), lineId));
            float jitterNorm = (glitchSeed - 0.5) * 0.045 * glitchGate;
            float frameToTexScale = outputFrame.z * inputSize.z;
            float jitterTex = jitterNorm * frameToTexScale;

            vec2 sampleCoord = clamp(
                vec2(vTextureCoord.x + jitterTex, vTextureCoord.y),
                inputClamp.xy,
                inputClamp.zw
            );

            vec4 centerSample = texture2D(uSampler, sampleCoord);
            float alpha = centerSample.a;
            if (alpha <= 0.001) {
                gl_FragColor = vec4(0.0);
                return;
            }

            vec3 rgbRaw = centerSample.rgb / alpha;

            float chromaTex = uChromaOffset * frameToTexScale;
            vec4 redSample = texture2D(
                uSampler,
                clamp(sampleCoord + vec2(chromaTex, 0.0), inputClamp.xy, inputClamp.zw)
            );
            vec4 blueSample = texture2D(
                uSampler,
                clamp(sampleCoord - vec2(chromaTex, 0.0), inputClamp.xy, inputClamp.zw)
            );

            float redCh = mix(rgbRaw.r, redSample.r / max(redSample.a, 0.001), step(0.05, redSample.a));
            float blueCh = mix(rgbRaw.b, blueSample.b / max(blueSample.a, 0.001), step(0.05, blueSample.a));
            vec3 rgb = vec3(redCh, rgbRaw.g, blueCh);

            float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
            vec3 tinted = mix(rgb * uTintColor, uTintColor * (0.22 + luma * 0.95), 0.72);

            float scanline = 0.5 + 0.5 * sin(uvLocal.y * 190.0 + uTime * 8.0);
            tinted *= 1.0 - (uScanlineIntensity * (1.0 - scanline));

            float sweepPos = fract(uTime * 0.35);
            float sweepDelta = (uvLocal.y - sweepPos) * 14.0;
            float sweepBand = exp(-(sweepDelta * sweepDelta));
            tinted += uTintColor * (sweepBand * uGlowStrength);

            float grain = (hash(uvLocal * 128.0 + vec2(uTime * 37.0, uTime * 19.0)) - 0.5) * uNoiseIntensity;
            tinted += uTintColor * grain;

            float flicker = 1.0 - uFlickerStrength * (0.5 + 0.5 * sin(uTime * 31.0));
            tinted = clamp(tinted * flicker, 0.0, 1.0);

            gl_FragColor = vec4(tinted * alpha, alpha);
        }
    `;

    class SubComHologramFilter extends BaseFilter {
        static get FRAGMENT_SRC() {
            return FRAGMENT_SRC;
        }

        static get TINT_PRESETS() {
            return {
                green: [0.18, 0.96, 0.45],
                cyan: [0.16, 0.88, 1.0],
                amber: [1.0, 0.72, 0.16]
            };
        }

        static resolveTint(presetOrRgb) {
            if (Array.isArray(presetOrRgb) && presetOrRgb.length >= 3) {
                return [
                    Number(presetOrRgb[0]) || 0,
                    Number(presetOrRgb[1]) || 0,
                    Number(presetOrRgb[2]) || 0
                ];
            }
            const key = String(presetOrRgb || "green").toLowerCase().trim();
            const preset = this.TINT_PRESETS[key];
            if (!preset) {
                if (typeof DEBUGTOOL !== "undefined" && DEBUGTOOL.warn) {
                    DEBUGTOOL.warn("SubComHologramFilter", `Preset de teinte inconnu (${key}), repli sur green.`);
                }
                return this.TINT_PRESETS.green.slice();
            }
            return preset.slice();
        }

        constructor(presetOrRgb = "green", intensity = 1.0) {
            const safeIntensity = Number.isFinite(Number(intensity)) ? Math.max(0, Number(intensity)) : 1.0;
            const tint = SubComHologramFilter.resolveTint(presetOrRgb);
            const uniforms = {
                uTime: 0.0,
                uTintColor: new Float32Array(tint),
                uScanlineIntensity: 0.24 * safeIntensity,
                uNoiseIntensity: 0.10 * safeIntensity,
                uChromaOffset: 0.008 * safeIntensity,
                uGlowStrength: 0.18 * safeIntensity,
                uFlickerStrength: 0.08 * safeIntensity
            };
            super(undefined, FRAGMENT_SRC, uniforms);
            this.padding = 0;
            this._presetName = (typeof presetOrRgb === "string") ? presetOrRgb.toLowerCase().trim() : "custom";
        }

        get preset() {
            return this._presetName;
        }

        setPreset(presetOrRgb) {
            const tint = SubComHologramFilter.resolveTint(presetOrRgb);
            if (!this.uniforms.uTintColor) {
                this.uniforms.uTintColor = new Float32Array(tint);
            } else {
                this.uniforms.uTintColor[0] = tint[0];
                this.uniforms.uTintColor[1] = tint[1];
                this.uniforms.uTintColor[2] = tint[2];
            }
            this._presetName = (typeof presetOrRgb === "string") ? presetOrRgb.toLowerCase().trim() : "custom";
        }

        update(deltaSeconds = 1 / 60) {
            const dt = Number(deltaSeconds) > 0 ? Number(deltaSeconds) : (1 / 60);
            this.uniforms.uTime = ((this.uniforms.uTime || 0) + dt) % 1000.0;
        }
    }

    window.SubComHologramFilter = SubComHologramFilter;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = SubComHologramFilter;
    }
})();

