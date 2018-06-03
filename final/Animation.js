// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'varying vec2 v_TexCoord;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  v_TexCoord = a_TexCoord;\n' +
    '}\n';

// Fragment shader program
const FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    'void main() {\n' +
    '  gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
    '}\n';

let canvasWidth, canvasHeight;

let imageURL = "../resources/Face.png";
let FirstNormalFrame, LookLeftFrame, LookRightFrame, SecondNormalFrame, HappyFrame, SadFrame;
let middleFrame, leftFrame, rightFrame;
let midExtreme = false, leftExtreme = false, rightExtreme = false;
let onRightSide = false;
let multiplicand = 0.0;
let animationStage = 0;
let leftVisitedOnStage0 = false, rightVisitedOnStage0 = false;

let gl;
let inputImage;
let imageReady;
let textureProgram;

function main() {
    let canvas = document.getElementById("webgl");
    gl = getWebGLContext(canvas, true);
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    console.log(canvasHeight);
    FirstNormalFrame = JSON.parse(readFileAsText("../Keyframes/NormalFace.kf"));
    LookLeftFrame = JSON.parse(readFileAsText("../Keyframes/LookingLeft.kf"));
    LookRightFrame= JSON.parse(readFileAsText("../Keyframes/LookingRight.kf"));
    SecondNormalFrame= JSON.parse(readFileAsText("../Keyframes/SecondNormal.kf"));
    SadFrame= JSON.parse(readFileAsText("../Keyframes/Sad.kf"));
    HappyFrame= JSON.parse(readFileAsText("../Keyframes/Happy.kf"));

    middleFrame = FirstNormalFrame;
    leftFrame = LookLeftFrame;
    rightFrame = LookRightFrame;

    loadImage(imageURL);
    textureProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);

    window.addEventListener("mousemove", function (ev) {
        // console.log(window.innerWidth);
        let x = (ev.clientX - window.innerWidth / 2) / window.innerWidth * 2;
        let y = (ev.clientY - window.innerHeight / 2) / window.innerHeight * 2;
        // console.log(x);
        if(x < -0.9) {
            leftExtreme = true;
            midExtreme = false;
            rightExtreme = false;
        }
        else if(x > -0.1 && x < 0.1) {
            midExtreme = true;
            leftExtreme = false;
            rightExtreme = false;
        }
        else if(x > 0.9) {
            rightExtreme = true;
            midExtreme = false;
            leftExtreme = false;
        }else{
            midExtreme = false;
            leftExtreme = false;
            rightExtreme = false;
        }
        if(x >= 0.0) {
            onRightSide = true;
            if (midExtreme)
                multiplicand = 0.0;
            else if (rightExtreme)
                multiplicand = 1.0;
            else {
                multiplicand = (x - 0.1) / 0.8;
            }
        }else{
            onRightSide = false;
            if(midExtreme)
                multiplicand = 0.0;
            else if (leftExtreme)
                multiplicand = 1.0;
            else
                multiplicand = (x + 0.1) / -0.8;

        }
        // console.log(multiplicand);
        switch (animationStage){
            case 0:
                if(leftExtreme)
                    leftVisitedOnStage0 = true;
                if(rightExtreme)
                    rightVisitedOnStage0 = true;
                if(leftVisitedOnStage0 && rightVisitedOnStage0){
                    middleFrame = SecondNormalFrame;
                    animationStage = 1;
                }
                break;
            case 1:
                if(midExtreme){
                    leftFrame = SadFrame;
                    rightFrame = HappyFrame;
                    animationStage = 2;
                }
                break;
            default:
                break;
        }
        requestAnimationFrame(redraw);
    });
}

function loadImage(link) {
    inputImage = new Image();
    inputImage.onload = new function () {
        imageReady = true;
        console.log("Done");
    };
    inputImage.src = link;
    console.log("Loading Image");
}


function redraw() {
    if(!imageReady)
        return;
    let Vertices = [], TextureMap = [];
    for(let i = 0; i < middleFrame.triangleIndexesLength; i++){
        let index = middleFrame.triangleIndexes[i];
        TextureMap.push(middleFrame.referencePoints[index].x / canvasWidth,
            1.0-(middleFrame.referencePoints[index].y) / canvasHeight);
        if(onRightSide)
            Vertices.push(((1.0 - multiplicand) * middleFrame.movedPoints[index].x + multiplicand * rightFrame.movedPoints[index].x - canvasWidth / 2) / canvasWidth * 2,
            -(((1.0 - multiplicand) * middleFrame.movedPoints[index].y + multiplicand * rightFrame.movedPoints[index].y - canvasHeight / 2) / canvasHeight * 2));
        else
            Vertices.push(((1.0 - multiplicand) * middleFrame.movedPoints[index].x + multiplicand * leftFrame.movedPoints[index].x - canvasWidth / 2) / canvasWidth * 2,
                -(((1.0 - multiplicand) * middleFrame.movedPoints[index].y + multiplicand * leftFrame.movedPoints[index].y - canvasHeight / 2) / canvasHeight * 2));
    }
    console.log(multiplicand);
    // Retrieve <canvas> element
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    gl.useProgram(textureProgram);
    // Specify the color for clearing <canvas>
    gl.clearColor(0.8, 0.8, 0.8, 1.0);
    // Set the vertex information
    gl.clear(gl.COLOR_BUFFER_BIT);
    drawTexture(Vertices, TextureMap);
}


function drawTexture(Vertices, TextureMap) {
    var data = new Float32Array(Vertices.length + TextureMap.length ) ;
    var FSIZE = data.BYTES_PER_ELEMENT ;
    var bytePerVertex = 4 ;
    for(var i = 0 ; i < Vertices.length/2 ; i++)
    {
        data[bytePerVertex*i] = Vertices[2*i] ;
        data[bytePerVertex*i+1] = Vertices[2*i+1] ;
        data[bytePerVertex*i+2] = TextureMap[2*i] ;
        data[bytePerVertex*i+3] = TextureMap[2*i+1] ;


    }
    var n = Vertices.length/2;
    // Create the buffer object
    var vertexTexCoordBuffer = gl.createBuffer();
    if (!vertexTexCoordBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexTexCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(textureProgram, 'a_Position');
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
    gl.enableVertexAttribArray(a_Position);

    let a_TexCoord = gl.getAttribLocation(textureProgram, 'a_TexCoord');
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
    gl.enableVertexAttribArray(a_TexCoord);

    let texTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 0, 0, 255])); // red

    let texSampler = gl.getUniformLocation(textureProgram, "u_Sampler");

    gl.useProgram(textureProgram);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // console.log(inputImage);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, inputImage);
    gl.uniform1i(texSampler, 0);


    for(let i = 0; i < Vertices.length / 6; i++) {
        gl.drawArrays(gl.TRIANGLES, i * 3, 3);
    }
    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_TexCoord);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(vertexTexCoordBuffer);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(texTexture);

}



class Mesh {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.points = [];
        this.triangleIndexes = [];
        this.triangleIndexesLength = 0;
        this.imageURL = "";
    }
}


class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Keyframe{
    constructor(referencePoints, movedPoints, triangleIndexes, triangleIndexesLength, imageURL){
        this.referencePoints = referencePoints;
        this.movedPoints = movedPoints;
        this.triangleIndexes = triangleIndexes;
        this.triangleIndexesLength = triangleIndexesLength;
        this.imageURL = imageURL;
    }
}