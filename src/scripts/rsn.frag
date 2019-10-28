#extension GL_OES_standard_derivatives : enable
precision highp float;
precision highp int;
#define SHADER_NAME VariableTextMaterial


uniform vec3 color;

//La progression globale
uniform float variationProgress;

//Les sprites qui nous interessent (from et to)
uniform sampler2D msdfMapFrom;
uniform sampler2D msdfMapTo;

// Les uv qui nous interessent (from et to)
varying vec2 vUvFrom;
varying vec2 vUvTo;

//La progression locale
varying float vLocalProgress;

float fill(float sd) {
    float aaf = fwidth(sd);
    return smoothstep(aaf, -aaf, sd);
}

float median(vec3 rgb) {
    return max(min(rgb.r, rgb.g), min(max(rgb.r, rgb.g), rgb.b));
}

void main() {
    float msdfSampleFrom = median(texture2D(msdfMapFrom, vUvFrom).rgb); //
    float msdfSampleTo = median(texture2D(msdfMapTo, vUvTo).rgb);
    float msdfSample = mix(msdfSampleFrom, msdfSampleTo, vLocalProgress);

    float alpha = fill(0.5 - msdfSample);

    gl_FragColor = vec4(color, alpha);
}