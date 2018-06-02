let texVert = 'attribute vec4 a_Position;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'varying vec2 v_TexCoord;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_Position = a_Position;\n' +
    '    v_TexCoord = a_TexCoord;\n' +
    '}\n';
let texFrag = 'precision mediump float;\n' +
    'uniform sampler2D u_sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_FragColor = texture2D(u_sampler, v_TexCoord);\n' +
    '}\n';
let meshVert = 'precision mediump float;\n' +
    'attribute vec4 a_Position;\n' +
    'attribute float a_PointSize;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_Position = a_Position;\n' +
    '    gl_PointSize = a_PointSize;\n' +
    '}\n';
let meshFrag = 'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    '\n' +
    'void main() {\n' +
    '    gl_FragColor = u_FragColor;\n' +
    '}\n';

let gl;
let mouseDownInCanvas = false;
let selectedPointIndex = -1;
let currentMesh;
let addingPoints = true;
let inputImage;
let imageReady = false;
let texProgram, meshProgram;

const selectRadius = 5;
const texPointCount = 4;
const backgroundImageVertices = new Float32Array([
    -1.0, 1.0, 0.0, 1.0,
    -1.0, -1.0, 0.0, 0.0,
    1.0, 1.0, 1.0, 1.0,
    1.0, -1.0, 1.0, 0.0
]);

function main() {
    let canvas = document.getElementById("webgl");
    document.getElementById("add-button").checked = true;
    currentMesh = new Mesh(canvas.width, canvas.height);
    currentMesh.points.push(new Point2D(0, 0));
    currentMesh.points.push(new Point2D(canvas.width, 0));
    currentMesh.points.push(new Point2D(0, canvas.height));
    currentMesh.points.push(new Point2D(canvas.width, canvas.height));
    gl = getWebGLContext(canvas, true);
    loadShaders();
    canvas.addEventListener('mousemove',
        function (ev) {
            if(addingPoints)
                return;
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
            if (!addingPoints) {
                mouseDownInCanvas = true;
                findSelectedIndex(X, Y);
            }else{
                currentMesh.points.push(new Point2D(X, Y));
                selectedPointIndex = currentMesh.points.length - 1;
            }
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
    document.getElementById("image-input").addEventListener("change", loadImage);
}

function loadImage(e) {
    inputImage = new Image();
    inputImage.onload = new function () {
        imageReady = true;
        URL.revokeObjectURL(inputImage.src);
    };
    inputImage.src = URL.createObjectURL(e.target.files[0]);
    currentMesh.imageURL = "../resources/sky.jpg";
    redraw();
}

function setOperationToAdd() {
    addingPoints = true;
}

function setOperationToMove() {
    addingPoints = false;
}

function drawTriangles() {
    let floatArr = [];
    for (let i = 0; i < currentMesh.points.length; i++) {
        let point = currentMesh.points[i];
        floatArr.push([point.x, point.y]);
    }
    let triangles = Delaunator.from(floatArr);
    // console.log(triangles.triangles);
    currentMesh.triangleIndexes = [];
    currentMesh.triangleIndexesLength = triangles.triangles.length;
    let verticesLArr = [];
    for(let i = 0; i < triangles.triangles.length; i++){
        let index = triangles.triangles[i];
        currentMesh.triangleIndexes.push(index);
        verticesLArr.push((floatArr[index][0]- currentMesh.width / 2) / currentMesh.width * 2,
            -(floatArr[index][1] - currentMesh.height / 2) / currentMesh.height * 2);
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

    gl.vertexAttrib1f(a_PointSize, 3);
    gl.uniform4f(u_FragColor, 1, 1, 0, 1);
    for(let i = 0; i < verticesArr.length / 6; i++) {
        gl.drawArrays(gl.LINE_LOOP, i * 3, 3);
    }
    gl.disableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(vertexBuffer);
}

function loadShaders() {
    texProgram = createProgram(gl, texVert, texFrag);
    meshProgram = createProgram(gl, meshVert, meshFrag);
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
            console.log("Found sth!");
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

function redraw() {
    gl.clearColor(0.3, 0.3, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(imageReady) {

        let texVerticesBuffer = gl.createBuffer();
        let FSIZE = backgroundImageVertices.BYTES_PER_ELEMENT;

        gl.bindBuffer(gl.ARRAY_BUFFER, texVerticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, backgroundImageVertices, gl.STATIC_DRAW);

        let a_Position = gl.getAttribLocation(texProgram, 'a_Position');
        gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * 4, 0);
        gl.enableVertexAttribArray(a_Position);

        let a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
        gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
        gl.enableVertexAttribArray(a_TexCoord);

        let texTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
            new Uint8Array([255, 0, 0, 255])); // red

        let texSampler = gl.getUniformLocation(texProgram, "u_Sampler");

        gl.useProgram(texProgram);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // console.log(inputImage);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, inputImage);
        gl.uniform1i(texSampler, 0);


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, texPointCount);
        gl.disableVertexAttribArray(a_Position);
        gl.disableVertexAttribArray(a_TexCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(texVerticesBuffer);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteTexture(texTexture);

    }
    drawTriangles();
    if(currentMesh.points.length > 0)
        drawPoints(currentMesh.points, false);
    if(currentMesh.points[selectedPointIndex])
        drawPoints([currentMesh.points[selectedPointIndex]], true);
}

function drawPoints(points, special) {
    if (!points || points.length <= 0)
        return;
    // console.log(currentMesh);
    // console.log(points);
    let floatArr = [];
    for (const point of points) {
        floatArr.push((point.x - currentMesh.width / 2) / currentMesh.width * 2,
            -(point.y - currentMesh.height / 2) / currentMesh.height * 2);
    }

    gl.useProgram(meshProgram);
    // console.log(floatArr);
    let vertices = new Float32Array(floatArr);
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

    if (special) {
        gl.vertexAttrib1f(a_PointSize, 5);
        gl.uniform4f(u_FragColor, 1, 0, 0, 1);
    } else {
        gl.vertexAttrib1f(a_PointSize, 3);
        gl.uniform4f(u_FragColor, 1, 1, 0, 1);
    }

    gl.drawArrays(gl.POINTS, 0, points.length);
    gl.disableVertexAttribArray(a_Position);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.deleteBuffer(vertexBuffer);
}

function saveMesh() {
    let name = document.getElementById("file-name").value;
    saveObject(currentMesh, name+".mesh");
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