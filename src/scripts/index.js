import TweenMax from "gsap/TweenMax";
import '../styles/index.scss'
import { Renderer, Camera, Transform, Geometry, Texture, Program, Mesh, Vec2 } from './ogl/Core.js';
import { Text, Raycast } from './ogl/Extras.js';

let typos = [
    // "4UltraBlack",
    "3Black",
    "3Bold",
    // "3Semibold",
    "3Medium",
    // "2Regular",
    "3Light",
    // "3ExtraLight"
    // "0Thin",
]

// RETREIVE NUMBER OF VARIATIONS DURING TRANSITION;
let typosLength = typos.length;

// DEFINES ALL COMPUTED VAR FILLDE FOR SHADER CONSTRUCTION
let imports = '';
let vUvs = ''
let vUvsIn = ''
let toTarget = '';
let indexTarget = '';
let vUvFrom = '';
let vUvTo = '';
let positionFrom = '';
let positionTo = '';

// WEBGL-JS VAR
let texturesArr = [];
let fontData = [];
let texts = [];
let images = [];
let program;
let progressTacker = 0;
let mainMesh;
let dataLoaded = 0;

// ANIMATION VAR
let time = { val: 0 };


// INIT THE RENDER
const renderer = new Renderer({
    dpr: window.devicePixelRatio,
    webgl: 1
});


const shaderIn = renderer.isWebgl2 && false ? 'in' : 'attribute';
const shaderOut = renderer.isWebgl2 && false ? 'out' : 'varying';

// PRECOMPUTE OUR SHADER VALUE
for (let index = 0; index < typosLength; index++) {
    imports += `${shaderIn} vec2 uv${index};
        `;
    imports += `${shaderIn} vec3 position${index};
        `;
    imports += `${shaderOut} vec2 vUv${index};
        `;
    vUvs += `vUv${index} = uv${index};
        `;
    vUvsIn += `${shaderIn} vec2 vUv${index};
        `;
    indexTarget += `float indexTarget${index} = when_and( when_ge(progress, ${index}.), when_lt(progress, ${index+1}.) );
        `;
    vUvFrom += `uv${index} * indexTarget${index} + 
    `;

    if (index < typosLength - 1) {
        vUvTo += `uv${index+1} * indexTarget${index} + 
        `;
    }

    positionFrom += `position${index} * indexTarget${index} + 
        `;

    if( index < typosLength-1 ){
        positionTo += `position${index+1} * indexTarget${index} + 
        `;
    }
}


// PREVENT LINE CODE OF SHADER FINISHING WITH a "+", so add nothing.
vUvFrom += `vec2(0.);`;
vUvTo += `vec2(0.);`;

positionFrom += `vec3(0.);`;
positionTo += `vec3(0.);`;



// WEBGL2 SHADER
var vertex300; 
var fragment300;
var fragment100;
var vertex100;

{

    vertex300 = 
       `#version 300 es
        precision highp float;
        precision highp int;
    
        uniform float progress;
    
        out vec2 vUvFrom;
        out vec2 vUvTo;
    
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        
        ${imports}
    
        float when_and(float a, float b) { return a * b; }
        float when_lt(float x, float y) { return max(sign(y - x), 0.0); }
        float when_ge(float x, float y) { return 1.0 - when_lt(x, y); }
    
        void main() {
    
            ${vUvs}
            ${indexTarget}
            ${toTarget}
            
            vUvFrom =
            ${vUvFrom}
    
            vUvTo =
            ${vUvTo}
    
            vec3 positionFrom =
            ${positionFrom}
    
            vec3 positionTo=
            ${positionTo}
    
            vec3 endPostion = mix(positionFrom, positionTo, mod(progress, 1.) );
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(endPostion.xy, 0, 1);
        }
    `;

    fragment300 =
       `#version 300 es
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif

        precision highp float;
        precision highp int;

        uniform float progress;
        out vec4 color;
        
        in vec2 vUvFrom;
        in vec2 vUvTo;

        uniform sampler2D tMapFrom;
        uniform sampler2D tMapTo;
        ${vUvsIn}

        float fill(float sd) {
            float aaf = fwidth(sd);
            return smoothstep(aaf, -aaf, sd);
        }

        float median(vec3 rgb) {
            return max(min(rgb.r, rgb.g), min(max(rgb.r, rgb.g), rgb.b));
        }

        float aastep(float value) {
            #ifdef GL_OES_standard_derivatives
                float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
            #else
                float afwidth = (1.0 / 500.0) * (1.4142135623730951 / (2.0 * gl_FragCoord.w));
            #endif
            afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
            return smoothstep(0.5 - afwidth, 0.5 + afwidth, value);
        }

        void main() {

            //MSDF
            float msdfSampleFrom = median(texture(tMapFrom, vUvFrom).rgb); //
            float msdfSampleTo = median(texture(tMapTo, vUvTo).rgb);
            float msdfSample = mix(msdfSampleFrom, msdfSampleTo, mod( progress, 1. ) );
            float alpha = fill(0.5 - msdfSample);

            //SDF
            // vec3 texFrom = texture(tMapFrom, vUvFrom).rgb;
            // vec3 texTo = texture(tMapTo, vUvTo).rgb;
            // float alpha = aastep(mix( texFrom.r, texTo.r, mod( progress, 1. ) ));
            
            color = vec4(vec3(1.),  alpha);
        }
    `;
    
    fragment100 =
    `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        precision highp int;
    
        uniform float progress;
        ${shaderOut} vec4 color;
        
        varying vec2 vUvFrom;
        varying vec2 vUvTo;
    
        uniform sampler2D tMapFrom;
        uniform sampler2D tMapTo;

    
        float median(vec3 rgb) {
            return max(min(rgb.r, rgb.g), min(max(rgb.r, rgb.g), rgb.b)) - 0.5;
        }
    
    
        void main() {
    
            float msdfSampleFrom = median(texture2D(tMapFrom, vUvFrom).rgb); //
            float msdfSampleTo = median(texture2D(tMapTo, vUvTo).rgb);

            float msdfSample = mix(msdfSampleFrom, msdfSampleTo, mod( progress, 1. ) );

            float d = fwidth(msdfSample);
            float alpha = smoothstep(-d, d, msdfSample);
            
            gl_FragColor.rgb = vec3(1.);
            gl_FragColor.a = alpha;
        }
    `;
    
    
    vertex100 =
    `
        precision highp float;
        precision highp int;
    
        uniform float progress;
    
        ${shaderOut} vec2 vUvFrom;
        ${shaderOut} vec2 vUvTo;
    
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        
        ${imports}
    
        float when_and(float a, float b) { return a * b; }
        float when_lt(float x, float y) { return max(sign(y - x), 0.0); }
        float when_ge(float x, float y) { return 1.0 - when_lt(x, y); }
    
        void main() {
    
            ${vUvs}
            ${indexTarget}
            ${toTarget}
            
            vUvFrom =
            ${vUvFrom}
    
            vUvTo =
            ${vUvTo}
    
            vec3 positionFrom =
            ${positionFrom}
    
            vec3 positionTo=
            ${positionTo}
    
            vec3 endPostion = mix(positionFrom, positionTo, mod(progress, 1.) );
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(endPostion.xy, 0, 1);
        }
    `;
}

//ON RESIZE FUNCTION
function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.orthographic({
        near: 0.1,
        far: 1000,
        left: -window.innerWidth / 2,
        right: window.innerWidth / 2,
        bottom: -window.innerHeight / 2,
        top: window.innerHeight / 2,
    });
}

async function loadImages(cb) {
    let numLoading = typosLength;

    const omImageLoaded = () => {
        --numLoading === 0 && cb();
    }
    
    for (let i = 0; i < typosLength; i++) {
        const img = new Image();
        images.push(img)
        img.src = `public/msdf2/${typos[i]}.png`;
        img.onload = omImageLoaded;
    }
}

function generateShader() {

    for (let i = 0; i < images.length; i++) {
        texturesArr[i] = new Texture(gl, {
            generateMipmaps: false,
        });
        texturesArr[i].image = images[i];
    }
        

    program = new Program(gl, {
        // Get fallback shader for WebGL1 - needed for OES_standard_derivatives ext
        vertex: renderer.isWebgl2 ? vertex300 : vertex100,
        fragment: renderer.isWebgl2 ? fragment300 : fragment100,
        
        uniforms: {
            tMapFrom: { value: texturesArr[0] },
            tMapTo: { value: texturesArr[1] },
            progress: { value: 0 }
        },
        transparent: true,
        cullFace: null,
        depthWrite: false,
    });
}

async function loadText() {
    await Promise.all(typos.map(async (textAttr,i )=> {
        let datatest = await (await fetch(`public/msdf2/${textAttr}.json`)).json();
        fontData[i] = datatest ;
    }));
}

function createMesh(){
    for (let index = 0; index < fontData.length; index++) {
        texts[index] = new Text({
            font: fontData[index],
            text: `DIRECTORS
            ABOUT
            NEWS`,
            width: 1,
            align: 'left',
            letterSpacing: 0,
            size: 50,
            lineHeight: 1,
        });
    }

    let geomJson = {};
    for (let index = 0; index < fontData.length; index++) {
        geomJson[`position${index}`] = { size: 3, data: texts[index].buffers.position },
        geomJson[`uv${index}`] = { size: 2, data: texts[index].buffers.uv }
    }
    geomJson['id'] = { size: 1, data: texts[0].buffers.id };
    geomJson['index'] = { data: texts[0].buffers.index };


    const geometry = new Geometry(gl, geomJson);


    // Pass the generated buffers into a geometry
    mainMesh = new Mesh(gl, { geometry, program });

    // Use the height value to position text vertically. Here it is centered.
    // mainMesh.position.set(window.innerWidth / 2 - 100, window.innerHeight / -2 + 100,0);
    mainMesh.position.set(188.93, 0, 0);
    mainMesh.scale.set(0.5,1,1)
    // mesh.setParent(scene);

    mainMesh.setParent(scene);
}

function startApp(){
    setEvents();
    
    TweenMax.to(time, 1, { val: 1, repeat: -1, repeatDelay: 0, yoyo: true });

    requestAnimationFrame(update);
}

function setEvents(){
    //Detect main view resize
    window.addEventListener('resize', resize, false);
    //Detect mouse move, transmit them to the shader
    window.addEventListener("mousemove", function (event) {
        progressTacker = (event.clientX / window.innerWidth) * (typosLength - 1);
    }, false)
}

function update(t) {


    // let timeSin = (Math.cos( time.val ) + 1 )/ 2;
    let timeSin = time.val * (typosLength - 1);
    

    requestAnimationFrame(update);
    
    //Use main mesh
    mainMesh.program.uniforms.progress.value = timeSin;
    mainMesh.program.uniforms.tMapFrom.value = texturesArr[ Math.floor(timeSin)];
    mainMesh.program.uniforms.tMapTo.value = texturesArr[ Math.floor(timeSin) + 1 ];

    renderer.render({ scene, camera });
}


const gl = renderer.gl;
// APPEND THE CANVAS
document.body.appendChild(gl.canvas);
gl.clearColor(0, 0, 0, 1);

const camera = new Camera(gl, {
    left: -window.innerWidth / 2,
    right: window.innerWidth / 2,
    bottom: -window.innerHeight / 2,
    top: window.innerHeight / 2,
});

camera.position.z = 10; 

resize();


// CREATE NEW SCENE
const scene = new Transform();

//LOAD OUR IMAGE
loadImages(checkIfDataLoaded);
loadText().then(checkIfDataLoaded);


function checkIfDataLoaded() {
    dataLoaded++;
    if (dataLoaded == 2) {
        generateShader();
        createMesh();
        startApp();
        initRaycast();
    }
}

function initRaycast() {
    const mouse = new Vec2();
    const raycast = new Raycast(gl);
    const meshes = [mainMesh];
    
    document.addEventListener('mousemove', move, false);
    document.addEventListener('touchmove', move, false);
    
    function move(e) {

        mouse.set(
            e.x - ( window.innerWidth/2),
            -e.y + (window.innerHeight / 2),
        );

        // Update the ray's origin and direction using the camera and mouse
        raycast.castMouse(camera, mouse);
    
        // Just for the feedback in this example - reset each mesh's hit to false
        meshes.forEach(mesh => mesh.isHit = false);
        // raycast.intersectBounds will test against the bounds of each mesh, and 
        // return an array of intersected meshes in order of closest to farthest
        const hits = raycast.intersectBounds(meshes);
        // Update our feedback using this array
        hits.forEach(mesh => mesh.isHit = true);
        if( mainMesh.isHit ){
            console.log('hit test true');
        }
    }
}

