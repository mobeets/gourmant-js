// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/p5.js
// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/addons/p5.dom.js

// images
let deck;
let road_sprites_img;
let tile_back_img;

let grid_cols = 18;
let grid_rows = 8;
let row_height = 32;
let col_width = 32;
let resourceDiameter; // size of resource icon
let goalResourceDiameter; // size on goal card
let tiles;
let playerTokens;
let goalCards;
let players;
let nCardsPerTier = 4;
let nPlayers = 2;
let HOME_TILE_COL = 9;
let HOME_TILE_ROW = 3;

// sprite tile info
let sprite_size = 32;
let sprites_per_dim = 4; // assumes same in rows and cols
let tileCount = 11; // total number of tiles
let baseTileIndices = [0, 4, 8];
let baseTileCounts = [4, 4, 2]; // number of each type

let resourceCount = 4;
let resourceColors = ['#f0340e', '#fcba03', '#272adb', '#a8329d', '#18b52f'];

let controlPanelHeight = 2*row_height;
var canvas;
var canvasWidth = grid_cols*col_width;
var canvasHeight = grid_rows*row_height + controlPanelHeight;

let button_draw_tile;
let drawnTile;

function windowResized() {
  resizeCanvas(canvasWidth, canvasHeight);
}

function preload() {
    road_sprites_img = loadImage("/static/images/tiles.png");
    tile_back_img = loadImage("/static/images/tile_back.png");
}

class Resource {
  constructor(id, color){
    this.id = id;
    this.color = color;
  }
}

class GoalCard {
  constructor(resource_ids, counts, tier){
    this.resource_ids = resource_ids;
    this.counts = counts;
    this.tier = tier;
    this.total_count = 0;
    this.player_id = -1;
    let mx = 0;
    this.primary_resource_id = 0;
    for (var i = 0; i < counts.length; i++) {
      this.total_count += counts[i];
      if (counts[i] > mx) {
        mx = counts[i];
        this.primary_resource_id = resource_ids[i];
      }
    }
    if (this.tier === 1) {
      this.vps = mx-1;
      this.sell = mx+1;
    } else if (this.tier == 2) {
      this.vps = mx+1;
      this.sell = 0;
    } else {
      this.vps = 15;
      this.sell = 0;
    }

    this.visible = false;
    this.x = -1;
    this.y = -1;
    this.player_owner = -1;
  }

  reveal(loc) {
    this.x = 0.1*loc*col_width + (loc+2.5)*col_width + col_width/2;
    this.y = (grid_rows * row_height) + row_height/2;
    this.visible = true;
  }

  click() {
    if (this.player_id === -1) {
      this.player_id = 0;
    } else {
      this.player_id++;
    }
    if (this.player_id === nPlayers) {
      this.player_id = -1;
    }
  }

  render() {
    if (!this.visible) { return; }

    // draw card boundary
    stroke(0);
    fill(255);
    rect(this.x, this.y, col_width, row_height);

    // draw resource tokens
    noStroke();
    // different positions depending on total count
    let x_offsets = [];
    let y_offsets = [];
    let diam;
    if (this.tier === 3) { // two
      x_offsets = [col_width/2, col_width/2];
      y_offsets = [row_height/3, 2*row_height/3];
      diam = 1.5*goalResourceDiameter;
    } else if (this.total_count === 3) { // three
      x_offsets = [col_width/2 - col_width/5, col_width/2, col_width/2 + col_width/5];
      y_offsets = [row_height/2, row_height/2, row_height/2];
      diam = goalResourceDiameter;
    } else if (this.total_count === 7) { // seven
      x_offsets = [col_width/2 - col_width/5, col_width/2, col_width/2 + col_width/5, col_width/5, 2*col_width/5, 3*col_width/5, 4*col_width/5];
      y_offsets = [2*row_height/5, 2*row_height/5, 2*row_height/5, 3*row_height/5, 3*row_height/5, 3*row_height/5, 3*row_height/5];
      diam = goalResourceDiameter;
    }
    let cid = 0; let cc = 0;
    for (var i = 0; i < x_offsets.length; i++) {
      cc++;
      if (cc > this.counts[cid]) { cc = 0; cid++; }
      fill(resourceColors[this.resource_ids[cid]]);
      circle(this.x + x_offsets[i], this.y + y_offsets[i], diam);
    }

    // mark sell value
    if (this.sell > 0) {
      textAlign(RIGHT, BOTTOM);
      textSize(10);
      noStroke();
      fill(resourceColors[this.primary_resource_id]);
      text(this.sell, this.x + col_width - 1, this.y + row_height);
    }

    // mark VPs
    textAlign(RIGHT, TOP);
    textSize(10);
    noStroke();
    fill(0);
    text(this.vps, this.x + col_width - 1, this.y);

    // mark with player token
    if (this.player_id > -1) {
      noStroke();
      fill(playerTokens[this.player_id].color);
      rect(this.x, this.y, col_width, row_height);
    }
  }
}

class Player {
  constructor(id, token){
    this.id = id;
    this.token = token;
    this.resources = [];
    for (var i = 0; i < resourceColors.length; i++) {
      this.resources[i] = 0;
    }
    this.vp = 0;
  }
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
    noStroke();
    fill(this.color);
    // rect(x-col_width/20, y-row_height/20, col_width+2*col_width/20, row_height+2*row_height/20);
    circle(x+col_width/2, y+row_height/2, col_width);
  }

  click(col, row) {
    if (this.isBeingDragged) {
      if (col > 0 && row > 0) {
        // can only place on non-empty tile
        if (tiles[col][row].tile_id > -1) {
          tiles[this.col][this.row].rmPlayerFromToken(this.id);
          this.col = col;
          this.row = row;
          tiles[col][row].addPlayerToToken(this.id);
          tiles[col][row].isLastPlaced = false;
        }
      }
      this.isBeingDragged = false;
    } else {
      this.isBeingDragged = true;
    }
  }
}

class Deck {
  constructor(){
    this.x = 0.2*col_width;
    this.y = (grid_rows * row_height) + row_height/2;
  }

  render() {
    image(tile_back_img, this.x, this.y, col_width, row_height);
  }

  click() {
    if (drawnTile.hidden) {
      this.drawRandomTile();
    }
  }

  randomize(card) {
    // choose random tile (but not HOME) and resource
    let roadIndex = round(random(-0.49, tileCount-2+0.49));
    let roadResource = round(random(-0.49, resourceCount-1+0.49));
    let resourceCorner = random([0,1,2,3]);

    card.tile_id = roadIndex;
    card.resource_id = roadResource;
    card.resource_corner = resourceCorner;
  }

  drawRandomTile() {
    // draw a random tile and display it in the control panel
    if (drawnTile.hidden) {
      this.randomize(drawnTile);
      drawnTile.hidden = false;
    }
    // make sure other tiles are marked as fixed
    for (let col = 0; col < grid_cols; col++) {
      for (let row = 0; row < grid_rows; row++) {
          tiles[col][row].isLastPlaced = false;
      }
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
    this.playerIdsOnToken = [];
    if (isOnBoard) {
      this.hidden = false;
      this.isDrawnTile = false;
    } else {
      this.resetDrawnTile();
    }
  }

  resetDrawnTile() {
    this.tile_id = -1;
    this.isDrawnTile = true;
    this.hidden = true;
    this.isBeingDragged = false;
    this.resetDrawnTileLocation();
  }
  
  resetDrawnTileLocation() {
    this.x = 1.3*col_width;
    this.y = (grid_rows * row_height) + row_height/2;
  }

  playerIdIsOnToken(i) {
    for (var i = 0; i < this.playerIdsOnToken.length; i++) {
      if (this.playerIdsOnToken[i] === j) {
        return true;
      }
    }
    return false;
  }

  isEmpty() {
    return this.playerIdsOnToken.length === 0;
  }

  addPlayerToToken(i) {
    this.playerIdsOnToken.push(i);
  }

  rmPlayerFromToken(j) {
    let tmp = [];
    for (var i = 0; i < this.playerIdsOnToken.length; i++) {
      if (this.playerIdsOnToken[i] != j) {
        tmp.push(this.playerIdsOnToken[i]);
      }
    }
    this.playerIdsOnToken = tmp;
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
      if (!this.isOnBoard && this.hidden) {
        noFill();
        strokeWeight(1);
        rect(this.x, this.y, col_width, row_height);
        textAlign(CENTER, CENTER);
        text('Undo', this.x + col_width/2, this.y + row_height/2);
      }
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
    image(road_sprites_img, x, y, col_width, row_height, sx, sy, sprite_size, sprite_size);
    if (this.resource_id > -1) {
      // textAlign(LEFT, TOP);
      // text(res,x,y);
      noStroke();
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
    if (this.isOnBoard && this.tile_id === -1) { // empty tile clicked
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
      if (this.hidden) {
        undoPlacedTile();
      } else if (!this.hidden && !this.isBeingDragged) {
        this.isBeingDragged = true;
      } else { // clicked in white area, so reset
        this.isBeingDragged = false;
        this.resetDrawnTileLocation();
      }
    }
  }
}

function undoPlacedTile() {
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

  // check if a goal card was clicked
  for (let i = 0; i < goalCards.length; i++) {
    if (goalCards[i].visible && mouseX >= goalCards[i].x && mouseX <= goalCards[i].x+col_width && mouseY >= goalCards[i].y && mouseY <= goalCards[i].y+row_height) {
      goalCards[i].click();
      return;
    }
  }

  // check if a tile was clicked
  if (col >= 0 && row >= 0 && col < tiles.length && row < tiles[col].length) {
    if (drawnTile.isBeingDragged) {
      tiles[col][row].click();
    } else if (!tiles[col][row].isEmpty()) {
      playerTokens[tiles[col][row].playerIdsOnToken[0]].click();
    } else {
      tiles[col][row].click();
    }
    return;
  }

  // check if deck was clicked
  if (mouseX >= deck.x && mouseX < deck.x+col_width && mouseY >= deck.y && mouseY < deck.y+row_height) {
    deck.click();
    return;
  }

  // check if drawn tile was clicked
  if (mouseX >= drawnTile.x && mouseX < drawnTile.x+col_width && mouseY >= drawnTile.y && mouseY < drawnTile.y+row_height) {
    drawnTile.click();
    return;
  }
}


function initializeTokens() {
  playerTokens = [];
  players = [];
  for (let i = 0; i < nPlayers; i++){
    let clr;
    if (i === 0) {
      clr = color(255, 0, 0, 100);
    } else if (i === 1) {
      clr = color(0, 0, 255, 100);
    } else {
      clr = color(180, 180, 180, 100);
    }
    playerTokens[i] = new Token(i, HOME_TILE_COL, HOME_TILE_ROW, clr);
    players[i] = new Player(i, playerTokens[i]);
    tiles[HOME_TILE_COL][HOME_TILE_ROW].addPlayerToToken(i);
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

  // set deck
  deck = new Deck();

  // set DRAWN tile
  drawnTile = new Tile(0, 0, false);

}

function initializeGoalCards() {
  goalCards = [];

  // generate all goal cards,
  // and keep track of counts in each tier
  let cg = 0;
  let goalCoardCounts = [0,0,0];
  for (var i = 0; i < resourceColors.length; i++) {
    goalCards[cg] = new GoalCard([i],[3],1);
    cg++;
    goalCoardCounts[0]++;

    goalCards[cg] = new GoalCard([i,(i+1)%resourceColors.length],[2,1],1);
    cg++;
    goalCoardCounts[0]++;
  }
  for (var i = 0; i < resourceColors.length; i++) {
    goalCards[cg] = new GoalCard([i],[7],2);
    cg++;
    goalCoardCounts[1]++;

    goalCards[cg] = new GoalCard([i,(i+2)%resourceColors.length],[5,2],2);
    cg++;
    goalCoardCounts[1]++;

    goalCards[cg] = new GoalCard([i,(i+3)%resourceColors.length],[4,3],2);
    cg++;
    goalCoardCounts[1]++;
  }
  for (var i = 0; i < resourceColors.length; i++) {
    goalCards[cg] = new GoalCard([i],[2],3);
    cg++;
    goalCoardCounts[2]++;

    goalCards[cg] = new GoalCard([i,(i+1)%resourceColors.length],[1,1],3);
    cg++;
    goalCoardCounts[2]++;

    goalCards[cg] = new GoalCard([i,(i+2)%resourceColors.length],[1,1],3);
    cg++;
    goalCoardCounts[2]++;

    goalCards[cg] = new GoalCard([i,(i+3)%resourceColors.length],[1,1],3);
    cg++;
    goalCoardCounts[2]++;
  }

  // choose random nCardsPerTier for each tier
  // and display evenly spaced out in groups
  let offset = 0;
  let xoffset = 0;
  for (var tier = 0; tier < 3; tier++) {
    for (var i = 0; i < nCardsPerTier; i++) {
      let gid = round(random(offset+-0.499, offset+(goalCoardCounts[tier]-1)+0.499));
      while (goalCards[gid].visible) {
        gid = round(random(offset+-0.499, offset+(goalCoardCounts[tier]-1)+0.499));
      }
      goalCards[gid].reveal(xoffset+i);
    }
    offset += goalCoardCounts[tier];
    xoffset += nCardsPerTier + 0.5;
  }
}

function setup() {
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent('sketch-holder');
  resourceDiameter = ceil(col_width/6);
  goalResourceDiameter = ceil(col_width/6);
  initializeGoalCards();
  initializeTiles();
  initializeTokens();  
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

  deck.render();
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

function renderGoalCards() {
  for (var i = 0; i < goalCards.length; i++) {
    goalCards[i].render();
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

function updateScores() {
  for (var i = 0; i < players.length; i++) {
    for (var j = 0; j < players[i].resources.length; j++) {
      $('.player-' + (i+1).toString() + '.resource-' + (j+1).toString()).html(players[i].resources[j]);
    }
    $('.player-' + (i+1).toString() + '.vp-1').html(players[i].vp);
  }
}

function draw() {
  background('#8cc63e');
  
  // draw control panel
  fill(255);
  rect(0, grid_rows*row_height, grid_cols*col_width, controlPanelHeight);

  renderGoalCards();
  renderTiles();
  renderTokens();
  drawGridLines();
  updateScores();
}

function findCounter(elem) {
  let cPlayerId = -1;
  for (var i = 0; i < players.length; i++) {
    if ($(elem).siblings('.player-' + (i+1).toString()).length > 0) {
      cPlayerId = i;
    }
  }

  let cResourceId = -1;
  for (var i = 0; i < resourceColors.length; i++) {
    if ($(elem).siblings('.resource-' + (i+1).toString()).length > 0) {
      cResourceId = i;
    }
  }

  let cVpId = -1;
  if ($(elem).siblings('.vp-1').length > 0) {
    cVpId = 1;
  }
  return [cPlayerId, cResourceId, cVpId];
}

function incrementCounter() {
  let elems = findCounter(this);
  console.log(elems);
  if (elems[0] > -1 && elems[1] > -1) {
    players[elems[0]].resources[elems[1]]++;
  } else if (elems[0] > -1 && elems[2] > -1) {
    players[elems[0]].vp++;
  }
}

function decrementCounter() {
  let elems = findCounter(this);
  if (elems[0] > -1 && elems[1] > -1) {
    if (players[elems[0]].resources[elems[1]] > 0) {
      players[elems[0]].resources[elems[1]]--;
    }
  } else if (elems[0] > -1 && elems[2] > -1) {
    if (players[elems[0]].vp > 0) {
      players[elems[0]].vp--;
    }
  }
}

function addHandlers() {
  $('.counter-increment').click(incrementCounter);
  $('.counter-decrement').click(decrementCounter);

  // style colors of resource counters
  for (var i = 0; i < resourceColors.length; i++) {
    $('.resource-' + i.toString()).parent().parent().css('border-color', resourceColors[i]);
    $('.resource-' + i.toString()).css('color', resourceColors[i]);
  }
}

$(document).ready(function() {
  addHandlers();
});
