float variatonsAmount = 6.0;

//Variation de la souris
uniform float variationProgress;

// Les uv qui nous interessent (from et to) qui sont déterminées ici
varying vec2 vUvFrom;
varying vec2 vUvTo;

//La progression locale
varying float vLocalProgress;

//La mosition des meshs
attribute vec3 positionTarget1;
attribute vec3 positionTarget2;


//TOUT LES UV SONT STOCKé ICI
attribute vec2 uvTarget1;
attribute vec2 uvTarget2;
// attribute vec2 uvTarget3;

float map(float value, float inMin, float inMax, float outMin, float outMax, bool clamped) {
    if (clamped) value = min(inMax, max(inMin, value));
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

void main() {
    float variationProgressMapped = map(variationProgress, 0.0, 1.0, 0.0, 0.83, true);
    float localProgress = 1.0 - fract(variationProgressMapped * variatonsAmount);

    float fromTarget1 = 0.0;
    float fromTarget2 = 1.0;


    float toTarget1 = 1.0;
    float toTarget2 = 0.0;

    vec3 from =
        positionTarget1 * fromTarget1 +
        positionTarget2 * fromTarget2;

    vec3 to =
        positionTarget1 * toTarget1 +
        positionTarget2 * toTarget2;

    vec3 endPostion = mix(from, to, localProgress);

    vec4 mvPosition = modelViewMatrix * vec4(endPostion, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    //Transférer au shader -->
    vUvFrom =
        uvTarget1 * fromTarget1 +
        uvTarget2 * fromTarget2;

    vUvTo =
        uvTarget1 * toTarget1 +
        uvTarget2 * toTarget2;

    vLocalProgress = localProgress;
}
