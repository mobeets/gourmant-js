// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/p5.js
// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/addons/p5.dom.js

let grid_cols = 12;
let grid_rows = 8;
let row_height = 32;
let col_width = 32;
let resourceDiameter; // size of resource icon
let road_sprites;
let tiles;
let playerTokens;
let nPlayers = 1;
let HOME_TILE_COL = 3;
let HOME_TILE_ROW = 3;

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
let drawnTile;

function windowResized() {
  resizeCanvas(canvasWidth, canvasHeight);
}

function preload() {
    road_sprites = loadImage("/static/images/tiles.png");
}

class Token {
  constructor(id, col, row, color){
    this.id = id;
    this.col = col;
    this.row = row;
    this.color = color;
    // this.selected = false;
    this.isBeingDragged = false;
  }

  render() {
    let x, y;
    if (this.isBeingDragged) {
      x = this.x;
      y = this.y;
    } else {
      x = this.col * col_width;
      y = this.row * row_height;
    }
    fill(this.color);
    rect(x-col_width/20, y-row_height/20, col_width+2*col_width/20, row_height+2*row_height/20);
  }

  click(col, row) {
    if (this.isBeingDragged) {
      if (col > 0 && row > 0) {
        // can only place on non-empty tile
        if (tiles[col][row].tile_id > -1) {
          tiles[this.col][this.row].playerTokenId = -1;
          this.col = col;
          this.row = row;
          tiles[col][row].playerTokenId = this.id;
          tiles[col][row].isLastPlaced = false;
        }
      }
      this.isBeingDragged = false;
    } else {
      this.isBeingDragged = true;
    }
  }
}

class Tile {

  constructor(col, row, isOnBoard){
    this.tile_id = -1;
    this.resource_id = -1;
    this.resource_corner = -1;
    this.col = col;
    this.row = row;
    this.isOnBoard = isOnBoard;
    this.isLastPlaced = false;
    this.playerTokenId = -1;
    if (isOnBoard) {
      this.hidden = false;
      this.isDrawnTile = false;
    } else {
      this.resetDrawnTile();
    }
  }

  resetDrawnTile() {
    this.isDrawnTile = true;
    this.hidden = true;
    this.isBeingDragged = false;
    this.resetDrawnTileLocation();
  }
  
  resetDrawnTileLocation() {
    this.x = 1 * col_width;
    this.y = (grid_rows+1) * row_height;
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
      // the drawn tile
      x = this.x;
      y = this.y;
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

    // highlight tile if it was last placed or being dragged
    if (this.isLastPlaced || this.isBeingDragged) {
      noFill();
      stroke('#5b8226');
      strokeWeight(2);
      rect(x, y, col_width, row_height);
      strokeWeight(1);
    }
  }

  click() {
    if (this.tile_id === -1) { // empty, so fill it with drawn tile
      if (drawnTile.isBeingDragged) {
        // copy drawn tile, then hide drawn tile
        this.tile_id = drawnTile.tile_id;
        this.resource_id = drawnTile.resource_id;
        this.resource_corner = drawnTile.resource_corner;

        // mark tile so we know we can still rotate it
        this.isLastPlaced = true;

        // reset drawn tile to be invisible
        drawnTile.resetDrawnTile();
      }
    } else if (this.isOnBoard) { // not empty, so rotate
      if (!drawnTile.isBeingDragged && this.isLastPlaced) {
        // can only rotate when not dragging drawn tile
        this.rotate();
      }
    } else if (this.isDrawnTile) {
      if (!this.hidden && !this.isBeingDragged) {
        this.isBeingDragged = true;
      } else { // clicked in white area, so reset
        this.isBeingDragged = false;
        this.resetDrawnTileLocation();
      }
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

function initializeTokens() {
  playerTokens = [];
  for (let i = 0; i < nPlayers; i++){
    let clr = color(random(0,255),random(0,255),random(0,255),100);
    playerTokens[i] = new Token(i, HOME_TILE_COL, HOME_TILE_ROW, clr);
    tiles[HOME_TILE_COL][HOME_TILE_ROW].playerTokenId = i;
    // warning: this only allows one token per tile
    // need to allow home token to have multiple
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
  tiles[HOME_TILE_COL][HOME_TILE_ROW].tile_id = tileCount-1;

  // set DRAWN tile
  drawnTile = new Tile(0, 0, false);
}

function drawRandomTile() {
  // draw a random tile and display it in the control panel
  if (drawnTile.hidden) {
    drawnTile.randomize();
    drawnTile.hidden = false;
  }
  for (let col = 0; col < grid_cols; col++) {
    for (let row = 0; row < grid_rows; row++) {
        tiles[col][row].isLastPlaced = false;
    }
  }
}

function resetDrawnTile() {
  // find the last drawn tile and put it back
  if (!drawnTile.hidden) {
    // cannot do this if a new tile has been drawn
    return;
  }
  for (let col = 0; col < grid_cols; col++) {
    for (let row = 0; row < grid_rows; row++) {
        if (tiles[col][row].isLastPlaced) {
          drawnTile.tile_id = tiles[col][row].tile_id;
          drawnTile.resource_id = tiles[col][row].resource_id;
          drawnTile.resource_corner = tiles[col][row].resource_corner;
          drawnTile.hidden = false;
          tiles[col][row].tile_id = -1;
          tiles[col][row].resource_id = -1;
          tiles[col][row].resource_corner = -1;
          tiles[col][row].isLastPlaced = false;
          return;
        }
    }
  }
}

function setup() {
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('sketch-holder');
  resourceDiameter = ceil(col_width/6);
  initializeTiles();
  initializeTokens();
}

function draw() {
  background('#8cc63e');
  
  // draw control panel
  fill(255);
  rect(0, grid_rows*row_height, grid_cols*col_width, 100);

  renderTiles();
  renderTokens();
  drawGridLines();
}

function mouseClicked() {
  // find location of mouse click, relative to tiles
  let col = floor(mouseX / col_width);
  let row = floor(mouseY / row_height);

  // check if player token is currently being moved
  for (let i = 0; i < playerTokens.length; i++) {
    if (playerTokens[i].isBeingDragged) {
      if (col >= 0 && row >= 0 && col < tiles.length && row < tiles[col].length) {
        playerTokens[i].click(col, row);
      } else {
        playerTokens[i].click();
      }
      return;
    }
  }
  
  // check if a tile was clicked
  if (col >= 0 && row >= 0 && col < tiles.length && row < tiles[col].length) {
    if (drawnTile.isBeingDragged) {
      tiles[col][row].click();
    } else if (tiles[col][row].playerTokenId > -1) {
      playerTokens[tiles[col][row].playerTokenId].click();
    } else {
      tiles[col][row].click();
    }
    return;
  }

  // check if drawn tile was clicked
  if (mouseX >= drawnTile.x && mouseX < drawnTile.x+col_width && mouseY >= drawnTile.y && mouseY < drawnTile.y+row_height) {
    drawnTile.click();
    return;
  }
}

function renderTiles() {
  // loop over each cell
  for (let col = 0; col < grid_cols; col++) {
    for (let row = 0; row < grid_rows; row++) {
        tiles[col][row].render();
    }
  }
  // if drawn tile is being dragged, draw it (centered) under cursor
  if (drawnTile.isBeingDragged) {
    drawnTile.x = mouseX - col_width/2;
    drawnTile.y = mouseY - row_height/2;
  }
  drawnTile.render();
}

function renderTokens() {
  for (let i = 0; i < playerTokens.length; i++) {
    if (playerTokens[i].isBeingDragged) {
      playerTokens[i].x = mouseX - col_width/2;
      playerTokens[i].y = mouseY - row_height/2;
    }
    playerTokens[i].render();
  }
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
  $("#reset-tile").click(resetDrawnTile);
}

$(document).ready(function() {
  addHandlers();
});
