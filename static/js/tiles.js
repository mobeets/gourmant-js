// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/p5.js
// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/addons/p5.dom.js

let grid_cols = 12;
let grid_rows = 8;
let row_height = 32;
let col_width = 32;
let resourceDiameter; // size of resource icon
let road_sprites;
let tiles;

// sprite tile info
let sprite_size = 32;
let sprites_per_dim = 4; // assumes same in rows and cols
let tileCount = 11; // total number of tiles
let baseTileIndices = [0, 4, 8];
let baseTileCounts = [4, 4, 2]; // number of each type

let resourceCount = 4;
let resourceColors = ['#f0340e', '#fcba03', '#272adb', '#a8329d', '#18b52f'];

var canvas;
var canvasWidth = grid_cols*col_width;
var canvasHeight = grid_rows*row_height + 100;

let button_draw_tile;
let drawn_tile;

function windowResized() {
  resizeCanvas(canvasWidth, canvasHeight);
}

function preload() {
    road_sprites = loadImage("/static/images/tiles.png");
}

class Tile {

  constructor(col, row, isOnBoard){
    this.tile_id = -1;
    this.resource_id = -1;
    this.resource_corner = -1;
    this.col = col;
    this.row = row;
    this.isOnBoard = isOnBoard;
    if (isOnBoard) {
      this.hidden = false;
    } else {
      this.hidden = true;
    }
  }

  rotate() {
    for (let i = 0; i < baseTileIndices.length; i++) {
      if (i === baseTileIndices.length-1 || this.tile_id < baseTileIndices[i+1]) {
        // rotate the road tile
        let j = this.tile_id-baseTileIndices[i];
        this.tile_id = baseTileIndices[i] + ((j+1) % baseTileCounts[i]);
        // rotate the corner the resource is in
        this.resource_corner = (this.resource_corner+1) % 4;
        return;
      }
    }
  }

  // draws a single tile from the atlas at the given grid col + row
  render() {
    // tile is empty
    if (this.tile_id === -1) {
      return;
    }

    // find location to draw
    let x, y;
    if (this.isOnBoard) {
      x = this.col * col_width;
      y = this.row * row_height;
    } else if (!this.hidden) {
      // display in control panel
      x = 1 * col_width;
      y = (grid_rows+1) * row_height;
    }

    // the tiles are packed into a single 4 x 4 atlas
    // we need calculate what part of the image to draw
    let sx = this.tile_id % sprites_per_dim * sprite_size;
    let sy = floor(this.tile_id / sprites_per_dim) * sprite_size;

    // draw it
    image(road_sprites, x, y, col_width, row_height, sx, sy, sprite_size, sprite_size);
    if (this.resource_id > -1) {
      // textAlign(LEFT, TOP);
      // text(res,x,y);
      fill(resourceColors[this.resource_id]);
      if (this.resource_corner === 0) {
        circle(x+resourceDiameter, y+resourceDiameter, resourceDiameter);
      } else if (this.resource_corner === 1) {
        circle(x+col_width-resourceDiameter, y+resourceDiameter, resourceDiameter);
      } else if (this.resource_corner === 2) {
        circle(x+col_width-resourceDiameter, y+row_height-resourceDiameter, resourceDiameter);
      } else {
        circle(x+resourceDiameter, y+row_height-resourceDiameter, resourceDiameter);
      }
    }
  }

  click() {
    if (this.tile_id === -1) { // empty, so fill it randomly      
      this.randomize();
    } else { // not empty, so rotate
      this.rotate();
    }
  }

  randomize() {
    // choose random tile (but not HOME) and resource
    let roadIndex = round(random(-0.49, tileCount-2+0.49));
    let roadResource = round(random(-0.49, resourceCount-1+0.49));
    let resourceCorner = random([0,1,2,3]);
    // let roadResource = random([0,1,2,3]);
    this.tile_id = roadIndex;
    this.resource_id = roadResource;
    this.resource_corner = resourceCorner;
  }
}

function initializeTiles() {
  // initialize all tiles
  tiles = [];
  for (let col = 0; col < grid_cols; col++){
    tiles[col] = [];
    for (let row = 0; row < grid_rows; row++){
      tiles[col][row] = new Tile(col, row, true);
    }
  }

  // set HOME tile
  tiles[3][3].tile_id = tileCount-1;

  // set DRAWN tile
  drawn_tile = new Tile(0, 0, false);
}

function drawRandomTile() {
  // draw a random tile and display it in the control panel
  drawn_tile.randomize();
  drawn_tile.hidden = false;
}

function setup() {
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('sketch-holder');
  resourceDiameter = ceil(col_width/6);
  initializeTiles();
}

function draw() {
  background('#8cc63e');
  
  // draw control panel
  fill(255);
  rect(0, grid_rows*row_height, grid_cols*col_width, 100);

  renderTiles();
  drawGridLines();
}

function mouseClicked() {
  // check if a tile was clicked
  let col = floor(mouseX / col_width);
  let row = floor(mouseY / row_height);
  if (col > 0 && row > 0 && col < tiles.length && row < tiles[col].length) {
    tiles[col][row].click();
  }

}

function renderTiles() {
  // loop over each cell
  for (let col = 0; col < grid_cols; col++) {
    for (let row = 0; row < grid_rows; row++) {
        tiles[col][row].render();
    }
  }
  drawn_tile.render();
}

function drawGridLines() {
  // draw grid lines
  stroke(100, 100, 100, 50);
  for (let x = 0; x <= grid_cols*col_width; x += col_width) {
    line(x, 0, x, grid_rows*row_height);
  }
  for (let y = 0; y <= grid_rows*row_height; y += row_height) {
    line(0, y, grid_cols*col_width, y);
  }
}


function addHandlers() {
  $("#draw-tile").click(drawRandomTile);
}

$(document).ready(function() {
  addHandlers();
});
