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
const meshVert = 'precision mediump float;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute float a_PointSize;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_Position = a_Position;\n' +
    '    gl_PointSize = a_PointSize;\n' +
    '}\n';
const meshFrag = 'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_FragColor = u_FragColor;\n' +
    '}\n';

const selectRadius = 5;

let gl;
let referenceMesh, currentMesh;
let textureProgram, meshProgram;
let imageReady = false;
let canvasWidth, canvasHeight;
let mouseDownInCanvas = false;
let selectedPointIndex = -1;
let inputImage;

function main() {
    let canvas = document.getElementById("webgl");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    gl = getWebGLContext(canvas, true);
    loadShaders();
    canvas.addEventListener('mousemove',
        function (ev) {
            if (!mouseDownInCanvas || selectedPointIndex < 0)
                return;
            let rect = canvas.getBoundingClientRect();
            let X = ev.clientX - rect.left;
            let Y = ev.clientY - rect.top;
            currentMesh.points[selectedPointIndex].x = X;
            currentMesh.points[selectedPointIndex].y = Y;
            requestAnimationFrame(redraw);
        });
    canvas.addEventListener('mousedown',
        function (ev) {
            let rect = canvas.getBoundingClientRect();
            let X = ev.clientX - rect.left;
            let Y = ev.clientY - rect.top;
            mouseDownInCanvas = true;
            findSelectedIndex(X, Y);
            requestAnimationFrame(redraw);
        });
    canvas.addEventListener("mouseup",
        function (ev) {
            mouseDownInCanvas = false;
            // requestAnimationFrame(redraw);

        });
    canvas.addEventListener("mouseout",
        function (ev) {
            mouseDownInCanvas = false;
            // requestAnimationFrame(redraw);

        });
    document.getElementById("mesh-input").addEventListener("change", loadMesh);
}


function findSelectedIndex(x, y) {
    let previousPoint = null;
    let selectedPoints = [];
    if (selectedPointIndex >= 0) {
        previousPoint = currentMesh.points[selectedPointIndex];
    }
    // console.log(x + " " + y);
    // console.log(points);
    for (let i = 0; i < currentMesh.points.length; i++) {
        let point = currentMesh.points[i];
        // console.log(Math.abs(point.x - x) + " " + point.x)
        if (Math.abs(point.x - x) <= selectRadius && Math.abs(point.y - y) <= selectRadius) {
            selectedPoints.push(point);
            // console.log("Found sth!");
        }
    }
    if (selectedPoints.length <= 0) {
        selectedPointIndex = -1;
        return;
    }
    let index = selectedPoints.indexOf(previousPoint);
    if (index >= 0) {
        if (index === selectedPoints.length - 1)
            selectedPointIndex = currentMesh.points.indexOf(selectedPoints[0]);
        else
            selectedPointIndex = currentMesh.points.indexOf(selectedPoints[index + 1]);
    } else {
        selectedPointIndex = currentMesh.points.indexOf(selectedPoints[0]);
    }
}


function loadShaders() {
    textureProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    meshProgram = createProgram(gl, meshVert, meshFrag);
}

function loadMesh(e) {
    referenceMesh = JSON.parse(readFileAsText(URL.createObjectURL(e.target.files[0])));
    loadImage(referenceMesh.imageURL);
    currentMesh = new Mesh(referenceMesh.width, referenceMesh.height);
    for(let i = 0; i < referenceMesh.points.length; i++){
        currentMesh.points.push(new Point2D(referenceMesh.points[i].x, referenceMesh.points[i].y));
    }
    let indexes = [];
    for(let i = 0; i < referenceMesh.triangleIndexesLength; i++){
        indexes.push(referenceMesh.triangleIndexes[i]);
    }
    currentMesh.triangleIndexes = indexes;
    currentMesh.imageURL = referenceMesh.imageURL;
    currentMesh.triangleIndexesLength = referenceMesh.triangleIndexesLength;
    redraw();
}

function loadImage(link) {
    inputImage = new Image();
    inputImage.onload = new function () {
        imageReady = true;
    };
    inputImage.src = link;
}

function redraw() {
    let Vertices = [], TextureMap = [];

    for(let i = 0; i < currentMesh.triangleIndexesLength; i++){
        let index = currentMesh.triangleIndexes[i];
        Vertices.push((currentMesh.points[index].x - currentMesh.width / 2) / currentMesh.width * 2,
            -(currentMesh.points[index].y - currentMesh.height / 2) / currentMesh.height * 2);
        TextureMap.push(referenceMesh.points[index].x / referenceMesh.width,
            1.0-referenceMesh.points[index].y / referenceMesh.height) ;
    }

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
    if(imageReady) {
        var n = drawTexture(Vertices, TextureMap);
        if (n < 0) {
            console.log('Failed to set the vertex information');
            return;
        }

        drawTriangles();
    }
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

function drawTriangles() {
    let verticesLArr = [];
    for(let i = 0; i < currentMesh.triangleIndexesLength; i++){
        let index = currentMesh.triangleIndexes[i];
        verticesLArr.push((currentMesh.points[index].x - currentMesh.width / 2) / currentMesh.width * 2,
            -(currentMesh.points[index].y - currentMesh.height / 2) / currentMesh.height * 2);
    }

    gl.useProgram(meshProgram);
    // console.log(floatArr);
    let verticesArr = new Float32Array(verticesLArr);
    let vertices = new Float32Array(verticesArr);
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    // console.log(gl.getParameter(gl.ARRAY_BUFFER_BINDING));
    let a_Position = gl.getAttribLocation(meshProgram, 'a_Position');
    if (a_Position < 0) {
        alert("Failed to get a_Position");
        return;
    }
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    let a_PointSize = gl.getAttribLocation(meshProgram, 'a_PointSize');

    let u_FragColor = gl.getUniformLocation(meshProgram, 'u_FragColor');

    gl.vertexAttrib1f(a_PointSize, 1);
    gl.uniform4f(u_FragColor, 1, 1, 0, 1);
    for(let i = 0; i < verticesArr.length / 6; i++) {
        gl.drawArrays(gl.LINE_LOOP, i * 3, 3);
    }
    gl.disableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(vertexBuffer);
}

function saveKeyframe() {
    let name = document.getElementById("file-name").value;
    let keyframe = new Keyframe(referenceMesh.points, currentMesh.points, referenceMesh.triangleIndexes,
        referenceMesh.triangleIndexesLength, referenceMesh.imageURL);
    saveObject(keyframe, name+".kf");
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