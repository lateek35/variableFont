import TweenMax, { Power0 } from "gsap/TweenMax";
import '../styles/index.scss'
import { Renderer, Camera, Transform, Geometry, Texture, Program, Mesh, Vec2 } from './ogl/Core.js';
import { Text, Raycast } from './ogl/Extras.js';
import { TimelineLite, TimelineMax } from 'gsap';

var Clone = require('clone');


// let typos = [
//     "3UltraBlack",
//     "3Black",
//     "3Bold",
//     // "3Semibold",
//     "3Medium",
//     // "3Regular",
//     "3Light",
//     "3ExtraLight",
//     "3Thin"
// ]


let typos = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
]

let baseSource = 'public/gotik4/';
let fontSize = 150;
let lineHeight = 1;
let lineHeightPos = fontSize * 1;
let webGL2 = true;

// RETREIVE NUMBER OF VARIATIONS DURING TRANSITION;
let typosLength = typos.length; 

// DEFINES ALL COMPUTED VAR FILLDE FOR SHADER CONSTRUCTION
let imports = '';
let toTarget = '';
let indexTarget = '';
let vUvFrom = '';
let vUvTo = '';
let positionFrom = '';
let positionTo = '';
let repeat = false;

// WEBGL-JS VAR
let texturesArr = [];
let fontData = [];
let texts = [];
let images = [];
let program;
let dataLoaded = 0;
let meshArray;

// ANIMATION VAR
let time = { val: 0 };


// INIT THE RENDER
const renderer = new Renderer({
    dpr: window.devicePixelRatio,
    webgl: webGL2 ? 2 : 1
});




const shaderIn = webGL2 ? 'in' : 'attribute';
const shaderOut = webGL2 ? 'out' : 'varying';

// PRECOMPUTE OUR SHADER VALUE
for (let index = 0; index < typosLength; index++) {
    // imports += `${shaderIn} vec2 uv${index};
    //     `;
    // imports += `${shaderIn} vec3 position${index};
    //     `;
    // imports += `${shaderOut} vec2 vUv${index};
    //     `;
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

        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
    
        uniform float progress;

        in vec2 uvFrom;
        in vec2 uvTo;
        in vec3 positionFrom;
        in vec3 positionTo;


        out vec2 vUvFrom;
        out vec2 vUvTo;


        void main() {

            vUvFrom = uvFrom;
            vUvTo = uvTo;
                
            vec3 endPostion = mix(positionFrom, positionTo, mod(progress, 1.) );
                
            gl_Position = projectionMatrix * modelViewMatrix * vec4(endPostion.xy, 0., 1.);
        }
    `;

    fragment300 =
       `#version 300 es
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        #endif

        precision highp float;
        precision highp int;

        in vec2 vUvFrom;
        in vec2 vUvTo;

        uniform float progress;
        uniform sampler2D tMapFrom;
        uniform sampler2D tMapTo;

        out vec4 FragColor;

        float fill(float sd) {
            float aaf = fwidth(sd);
            return smoothstep(aaf, -aaf, sd);
        }

        float median(vec3 rgb) {
            return max(min(rgb.r, rgb.g), min(max(rgb.r, rgb.g), rgb.b));
        }

        float aastep(float value) {
            // #ifdef GL_OES_standard_derivatives
                float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
            // #else
            //     float afwidth = (1.0 / 500.0) * (1.4142135623730951 / (2.0 * gl_FragCoord.w));
            // #endif
            afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
            return smoothstep(0.5 - afwidth, 0.5 + afwidth, value);
        }

        float fill2(float sd) {
            float aaf = fwidth(sd);
            return smoothstep(aaf, -aaf, sd);
        }

        float median2(vec3 rgb) {
            return max(min(rgb.r, rgb.g), min(max(rgb.r, rgb.g), rgb.b));
        }

        void main() {

            // MSDF
            float msdfSampleFrom = median(texture(tMapFrom, vUvFrom).rgb); //
            float msdfSampleTo = median(texture(tMapTo, vUvTo).rgb);
            float msdfSample = mix(msdfSampleFrom, msdfSampleTo, mod(progress, 1.) );
            float alpha = aastep(msdfSample);
            // float alpha = fill(0.5 - msdfSample);

            // SDF
            // vec3 texFrom = texture(tMapFrom, vUvFrom).rgb;
            // vec3 texTo = texture(tMapTo, vUvTo).rgb;
            // float alpha = aastep(mix( texFrom.r, texTo.r, mod(progress, 1.) ));
            
            FragColor = vec4(vec3(1., alpha, alpha),  alpha);
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
        left: 0,
        right: window.innerWidth,
        bottom: -window.innerHeight,
        top: 0,
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
        img.src = `${baseSource}${typos[i]}.png`;
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
    

    return new Program(gl, {
        // Get fallback shader for WebGL1 - needed for OES_standard_derivatives ext
        vertex: webGL2 ? vertex300 : vertex100,
        fragment: webGL2 ? fragment300 : fragment100,
        
        uniforms: {
            tMapFrom: { value: texturesArr[0] },
            tMapTo: { value: texturesArr[1] },
            progress: { value: 0.001 }
        },
        transparent: false,
        cullFace: null,
        depthWrite: false,
    });
}

async function loadText() {
    await Promise.all(typos.map(async (textAttr,i )=> {
        let datatest = await (await fetch(`${baseSource}${textAttr}.json`)).json();
        fontData[i] = datatest ;
    }));
}

function createMesh(text){
    for (let index = 0; index < fontData.length; index++) {
        texts[index] = new Text({
            font: fontData[index],
            text: text,
            width: 10,
            align: 'left',
            letterSpacing: 0,
            size: fontSize,
            lineHeight: lineHeight
        });
    }

    let geomJson = {};
    for (let index = 0; index < fontData.length; index++) {
        geomJson[`positionFrom`] = { size: 3, data: texts[0].buffers.position },
        geomJson[`positionTo`] = { size: 3, data: texts[1].buffers.position },
        geomJson[`uvFrom`] = { size: 2, data: texts[0].buffers.uv }
        geomJson[`uvTo`] = { size: 2, data: texts[1].buffers.uv }
    }
    geomJson['id'] = { size: 1, data: texts[0].buffers.id };
    geomJson['index'] = { data: texts[0].buffers.index };


    const geometry = new Geometry(gl, geomJson);

    let mesh = new Mesh(gl, { geometry, program });

    mesh.setParent(scene);
    mesh.progress = 0.001;

    return mesh;
}

function startApp(){
    setEvents();

    let timeline = new TimelineMax({yoyo: true, repeat: -1, 
        onUpdate: function(){
            // console.log(time.val);
        },
        onRepeat: function(){
            repeat = !repeat;
        },
        onReverseComplete: function () {
            console.log("reverse complete")
        },
    });

    for (let index = 0; index < fontData.length - 1; index++) {
        // if ( (index + 2) < (fontData.length-1) ){
            timeline.fromTo(time, 0.3, {val: index }, { val: (index + 1) , onComplete: function () { updateFont(index + 1) }, onReverseComplete: function () { updateFont(index + 1) }, ease: Power0.easeNone });
        // }
    }

    requestAnimationFrame(update);
}

function updateFont(nbr){
    
    if ((nbr+1) >= fontData.length) return;

    meshArray[0].program.uniforms.tMapFrom.value = texturesArr[nbr];
    meshArray[0].program.uniforms.tMapTo.value = texturesArr[(nbr + 1)];

    meshArray[0].geometry.attributes.positionFrom.data = texts[nbr].buffers.position;
    meshArray[0].geometry.attributes.positionTo.data = texts[(nbr+1)].buffers.position;
    
    meshArray[0].geometry.attributes.uvFrom.data = texts[nbr].buffers.uv;
    meshArray[0].geometry.attributes.uvTo.data = texts[(nbr + 1)].buffers.uv;

    meshArray[0].geometry.attributes.positionFrom.needsUpdate = true;
    meshArray[0].geometry.attributes.positionTo.needsUpdate = true;
    meshArray[0].geometry.attributes.uvFrom.needsUpdate = true;
    meshArray[0].geometry.attributes.uvTo.needsUpdate = true;
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

    for (let index = 0; index < meshArray.length; index++) {
        const element = meshArray[index];
        
        // let timeSin = (Math.cos( time.val ) + 1 )/ 2;
        // let timeSin = element.progress * (typosLength - 1);
        
        //Use main mesh
        element.program.uniforms.progress.value = time.val;
        // element.program.uniforms.tMapFrom.value = texturesArr[ Math.floor(time.val)];
        // element.program.uniforms.tMapTo.value = texturesArr[ Math.floor(time.val) + 1 ];
    }


    renderer.render({ scene, camera });
    requestAnimationFrame(update);
}


const gl = renderer.gl;
// APPEND THE CANVAS
document.body.appendChild(gl.canvas);
gl.clearColor(0, 0, 0, 1);

const camera = new Camera(gl, {
    left: 0,
    right: window.innerWidth,
    bottom: -window.innerHeight,
    top: 0,
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
        program = generateShader();
        meshArray = [createMesh(`DANIEL`), 
        // createMesh(`BEN
        // BRIAND`)
        ]; 

        for (let index = 0; index < meshArray.length; index++) {
            const element = meshArray[index];
            element.position.set(600, 1500 -window.innerHeight - (2*lineHeightPos*(index+1) ), 0 );
        }
        startApp();
        initRaycast();
    }
}

function initRaycast() {
    const mouse = new Vec2();
    const raycast = new Raycast(gl);
    
    // document.addEventListener('mousemove', move, false);
    // document.addEventListener('touchmove', move, false);


    // for (let index = 0; index < meshArray.length; index++) {
    // TweenMax.to(meshArray[meshArray.length - 1], typosLength / 5 * 1, { progress: 0.999, yoyo: true, repeat: -1, repeatDelay: 0.1, ease: Power2.easeInOut });
    // }
    
    // function move(e) {

    //     mouse.set(
    //         e.x,
    //         -e.y,
    //     );

    //     // Update the ray's origin and direction using the camera and mouse
    //     raycast.castMouse(camera, mouse);
    
    //     // Just for the feedback in this example - reset each mesh's hit to false
    //     meshArray.forEach(mesh => mesh.isHit = false);
    //     // raycast.intersectBounds will test against the bounds of each mesh, and 
    //     // return an array of intersected meshes in order of closest to farthest
    //     const hits = raycast.intersectBounds(meshArray);
    //     // Update our feedback using this array
    //     hits.forEach(mesh => mesh.isHit = true);
        
    //     for (let index = 0; index < meshArray.length; index++) {
    //         if( meshArray[index].isHit ){
    //             TweenMax.to(meshArray[index], typosLength/3, { progress: 1 });
    //         }else{
    //             TweenMax.to(meshArray[index], typosLength/3, { progress: 0 });
    //         }
    //     }

    // }
}

