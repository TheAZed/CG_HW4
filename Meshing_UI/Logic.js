let imageFile;
let gl;
let mouseDownInCanvas = false;
let selectedPointIndex = -1;
let currentMesh;
let points = [];

const selectRadius = 5;

function main() {
    let canvas = document.getElementById("webgl");
    gl = getWebGLContext(canvas, true);
    canvas.addEventListener('mousemove', 
        function (ev) {
            if(!mouseDownInCanvas)
                return;
            let rect = canvas.getBoundingClientRect();
            let X = ev.clientX - rect.left;
            let Y = ev.clientY - rect.top;
            currentMesh.points[selectedPointIndex] = [X, Y];
            redraw();
        });
    canvas.addEventListener('mousedown',
        function (ev) {
            mouseDownInCanvas = true;
            let rect = canvas.getBoundingClientRect();
            let X = ev.clientX - rect.left;
            let Y = ev.clientY - rect.top;

        });
    canvas.addEventListener("mouseup",
        function (ev) {
            mouseDownInCanvas = false;

        })
}

function findSelectedIndex(x, y){
    let previousPoint = null;
    let selectedPoints = [];
    if(selectedPointIndex >= 0){
        previousPoint = points[selectedPointIndex];
    }
    for(const point in points){
        if(Math.abs(point.x - x) <= selectRadius && Math.abs(point.y - y) <= selectRadius)
            selectedPoints.push(point);
    }
    if(selectedPoints.length <= 0){
        selectedPointIndex = -1;
        return;
    }
    let index = selectedPoints.indexOf(previousPoint);
    if(index >= 0){
        if(index === selectedPoints.length - 1)
            selectedPointIndex = points.indexOf(selectedPoints[0]);
        else
            selectedPointIndex = points.indexOf(selectedPoints[index + 1]);
    }else{
        selectedPointIndex = points.indexOf(selectedPoints[0]);
    }
}

function redraw(){

}

function loadImage() {

}

class Mesh{
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.points = [];
        this.triangleIndexes = [];
    }
}

class Point2D{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}