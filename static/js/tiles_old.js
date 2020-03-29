// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/p5.js
// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/addons/p5.dom.js

let grid_cols = 12;
let grid_rows = 8;
let row_height = 32;
let col_width = 32;
let sprite_size = 32;
let sprites_per_dim = 4; // assumes same in rows and cols
let tileCount = 11;
let resourceDiameter; // size of resource icon
let road_ids;
let road_resources;
let road_resource_corners;
let road_set;

let resourceCount = 4;
let resourceColors = ['#f0340e', '#fcba03', '#272adb', '#a8329d', '#18b52f'];

var canvas;
var canvasWidth = grid_cols*col_width;
var canvasHeight = grid_rows*row_height;

function windowResized() {
  resizeCanvas(canvasWidth, canvasHeight);
}

function preload() {
    road_set = loadImage("/static/images/tiles.png");
}

function setup() {
    canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-holder');

    resourceDiameter = ceil(col_width/6);

    // generate a 2D array to hold the state of each grid cell
    road_ids = create2DArray(grid_cols, grid_rows, -1);
    road_resources = create2DArray(grid_cols, grid_rows, -1);
    road_resource_corners = create2DArray(grid_cols, grid_rows, -1);

    road_ids[3][3] = tileCount-1; // init HOME
}

function create2DArray(cols, rows, value) {
// init an array cols x rows large to store cell state
    let a = [];
    for (let col = 0; col < cols; col++) {
        a[col] = [];
        for (let row = 0; row < rows; row++) {
            a[col][row] = value;
        }
    }
    return a;
}

function draw() {
    background('#8cc63e');
    drawMap();
    drawGridLines();
    noLoop(); // we wait for mouse click to update
}

function mouseClicked() {
    // find the grid location of the click
    let grid_x = floor(mouseX / col_width);
    let grid_y = floor(mouseY / col_width);
    chooseRandomTile(grid_x, grid_y);
    redraw(); // calls draw()
}

function chooseRandomTile(grid_x, grid_y) {
    // choose random tile (but not HOME) and resource
    let roadIndex = round(random(-0.49, tileCount-2+0.49));
    let roadResource = round(random(-0.49, resourceCount-1+0.49));
    let resourceCorner = random([0,1,2,3]);
    // let roadResource = random([0,1,2,3]);    
    road_ids[grid_x][grid_y] = roadIndex;
    road_resources[grid_x][grid_y] = roadResource;
    road_resource_corners[grid_x][grid_y] = resourceCorner;
}

function drawMap() {
    // loop over each cell
    for (let col = 0; col < grid_cols; col++) {
        for (let row = 0; row < grid_rows; row++) {

            // check the state of the cell
            let roadIndex = road_ids[col][row];
            if (roadIndex > -1) {
                // draw the road
                let roadResource = road_resources[col][row];
                let resourceCorner = road_resources[col][row];
                drawRoadTile(roadIndex, col, row, roadResource, resourceCorner);
            }
        }
    }
}

// draw grid lines
function drawGridLines() {
    stroke(100, 100, 100, 50);
    for (let x = 0; x < width; x += col_width) {
        line(x, 0, x, height);
    }
    for (let y = 0; y < height; y += row_height) {
        line(0, y, width, y);
    }
}

// draws a single tile from the atlas at the given grid col + row
function drawRoadTile(value, col, row, res, corner) {
    // find location to draw
    let x = col * col_width;
    let y = row * row_height;

    // the tiles are packed into a single 4 x 4 atlas
    // we need calculate what part of the image to draw
    let sx = value % sprites_per_dim * sprite_size;
    let sy = floor(value / sprites_per_dim) * sprite_size;

    // draw it
    image(road_set, x, y, col_width, row_height, sx, sy, sprite_size, sprite_size);
    if (res > -1) {
        // textAlign(LEFT, TOP);
        // text(res,x,y);
        fill(resourceColors[res]);
        if (corner === 0) {
            circle(x+resourceDiameter, y+resourceDiameter, resourceDiameter);
        } else if (corner === 1) {
            circle(x+col_width-resourceDiameter, y+resourceDiameter, resourceDiameter);
        } else if (corner === 2) {
            circle(x+resourceDiameter, y+row_height-resourceDiameter, resourceDiameter);
        } else {
            circle(x+col_width-resourceDiameter, y+row_height-resourceDiameter, resourceDiameter);
        }
    }
}
