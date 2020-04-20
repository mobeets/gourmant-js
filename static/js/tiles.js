// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/p5.js
// require https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.5.14/addons/p5.dom.js

// images
let deck;
let road_sprites_img;
let tile_back_img;

let grid_cols = 32;
let grid_rows = 14;
let HOME_TILE_COL = 16;
let HOME_TILE_ROW = 7;

// compact
// let grid_cols = 18;
// let grid_rows = 8;
// let HOME_TILE_COL = 9;
// let HOME_TILE_ROW = 3;

let row_height = 32;
let col_width = 32;
let resourceDiameter; // size of resource icon
let goalResourceDiameter; // size on goal card
let tiles;
let playerTokens;
let goalCards;
let players;
let nCardsPerTier = 5;
let nPlayers = 2;
let nTilesVisible = 4;

// sprite tile info
let sprite_size = 32;
let sprites_per_row = 4;
let sprites_per_col = 5;
let tileCount = 10; // total number of tiles
let homeTileIndex = 18;

// tile counts
let baseTileIndices = [0, 4, 8, 10, 12]; // for rotating road tiles
let nRepeatsRoadTiles = 1; // # of reps of road tiles
let nConversionTiles = 4; // # of conversion tiles (should be same as resourceColors.length
let nRepeatsConversionTiles = 2; // # of reps of conversion tiles
let nRepeatsStraightaways = 2;
let nRepeatsRobberTiles = 2;
let nPortalTiles = 1;
let nRepeatsPortalTiles = 4;
let nRepeatsPlusOneTiles = 6;
let nRepeatsBlankTiles = 0;

// let resourceColors = ['#f72020', '#fcba03', '#18b52f', '#272adb', '#a8329d'];
let resourceColors = ['#f72020', '#fcba03', '#00adef', '#a53c96'];
// let backgroundColor = '#8cc63e';
let backgroundColor = '#a87b4f';

let controlPanelHeight = 2*row_height;
var canvas;
var canvasWidth = grid_cols*col_width;
var canvasHeight = grid_rows*row_height + controlPanelHeight;
let button_draw_tile;

function windowResized() {
  resizeCanvas(canvasWidth, canvasHeight);
}

function preload() {
    road_sprites_img = loadImage("/static/images/tiles4.png");
    tile_back_img = loadImage("/static/images/tile_back.png");
}

class Resource {
  constructor(id, color){
    this.id = id;
    this.color = color;
  }
}

class GoalCard {
  constructor(resource_ids, counts, tier, isBothBig){
    this.resource_ids = resource_ids;
    this.counts = counts;
    this.isBothBig = isBothBig; // for tier-3 only
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
    } else if (this.tier === 2) {
      this.vps = mx+1;
      this.sell = 0;
    } else {
      if (this.total_count === mx) {
        // double of same color is worth more
        if (this.isBothBig) {
          this.vps = 7;
        } else {
          this.vps = 6;
        }
      } else {
        if (this.isBothBig) {
          this.vps = 4;
        } else {
          this.vps = 3;
        }
      }
      this.sell = 0;
    }

    this.visible = false;
    this.x = -1;
    this.y = -1;
    this.player_owner = -1;
  }

  reveal(loc) {
    this.x = 0.1*loc*col_width + (loc+6.5)*col_width + col_width/2;
    this.y = (grid_rows * row_height) + row_height/2;
    this.visible = true;
  }

  click() {
    if (this.player_id === -1) {
      this.player_id = 0;
    } else {
      this.player_id++;
    }
    if (this.player_id === nPlayers+1) {
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
    let diam, diam_2;
    if (this.tier === 3) { // two
      x_offsets = [col_width/2, col_width/2];
      y_offsets = [row_height/3, 2*row_height/3];
      diam = 1.5*goalResourceDiameter;
      if (!this.isBothBig) {
        diam_2 = 1.0*goalResourceDiameter;
      } else {
        diam_2 = diam;
      }
    } else if (this.total_count === 3) { // three
      x_offsets = [col_width/2 - col_width/5, col_width/2, col_width/2 + col_width/5];
      y_offsets = [row_height/2, row_height/2, row_height/2];
      diam = 0.8*goalResourceDiameter;
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
      if (this.tier === 3 && i > 0) {
        circle(this.x + x_offsets[i], this.y + y_offsets[i], diam_2);
      } else {
        circle(this.x + x_offsets[i], this.y + y_offsets[i], diam);
      }
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
      if (this.player_id < playerTokens.length) {
        fill(playerTokens[this.player_id].color);
      } else { // grayed out
        fill(128);
      }
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
    this.portals = [-1, -1];
  }

  placePortal(portal_id) {
    // already placed this portal
    if (this.portals[portal_id] != -1) {
      return;
    }

    let ccol, crow;
    for (let col = 0; col < grid_cols; col++) {
      for (let row = 0; row < grid_rows; row++) {
        if (tiles[col][row].isLastPlaced) {
          ccol = col;
          crow = row;
        }
      }
    }

    // find token that was last placed
    // then replace instances below of 'this.token.col' and 'this.token.row'
    // with this tile's col/row

    // no portals on HOME
    if (ccol === HOME_TILE_COL && crow == HOME_TILE_ROW) {
      return;
    }

    // no portals on empty tiles
    if (tiles[ccol][crow].tile_id === -1) {
      return;
    }

    // no portals if there's already one here
    let alreadyOneHere = false;
    for (var i = 0; i < tiles[ccol][crow].portalsOnToken.length; i++) {
      if (tiles[ccol][crow].portalsOnToken[i] === this.id) {
        alreadyOneHere = true;
      }
    }
    if (alreadyOneHere) {
      return;
    }

    // place portal
    tiles[ccol][crow].portalsOnToken.push(this.id);
    this.portals[portal_id] = tiles[ccol][crow];
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
      if (col >= 0 && row >= 0) {
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
    this.tileIndices = this.constructDeck();
    this.tileIndex = 0;
    this.isEmpty = false;
  }

  render() {
    if (!this.isEmpty) {
      image(tile_back_img, this.x, this.y, col_width, row_height);
      textAlign(CENTER, CENTER);
      noStroke();
      fill(0);
      text(this.tileIndices.length-this.tileIndex, this.x + col_width/2, this.y + row_height/2);
    }
  }

  click() {
    for (var i = 0; i < drawnTiles.flop.length; i++) {
      if (drawnTiles.flop[i].hidden) {
        this.drawRandomTile(drawnTiles.flop[i]);
      }
    }
  }

  shuffle(array) {
    // source: https://gomakethings.com/how-to-shuffle-an-array-with-vanilla-js/
    var currentIndex = array.length;
    var temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  constructDeck() {
    let tileIndices = [];

    // generate all road tiles
    for (var i = 0; i < tileCount; i++) {
      for (var j = 0; j < resourceColors.length; j++) {
        let nReps;
        if (i <= tileCount-2) {
          nReps = nRepeatsRoadTiles;
        } else {
          nReps = nRepeatsStraightaways;
        }
        for (var k = 0; k < nReps; k++) { // repeats
          tileIndices.push([i,j,k,'road']);
        }
      }
    }
    let cOffset = tileCount;

    // add +1's
    for (var j = 0; j < nRepeatsPlusOneTiles; j++) {
      tileIndices.push([cOffset,-1,-1,'plus-one']);
    }
    cOffset += 2;

    // now add conversion tiles
    for (var i = 0; i < nConversionTiles; i++) {
      for (var j = 0; j < nRepeatsConversionTiles; j++) {
        tileIndices.push([cOffset+i,-1,-1,'conversion']);
      }
    }
    cOffset += nConversionTiles;

    // add robbers
    for (var j = 0; j < nRepeatsRobberTiles; j++) {
      tileIndices.push([cOffset,-1,-1,'robber']);
    }
    cOffset += 1;

    // add public and private portals
    for (var i = 0; i < nPortalTiles; i++) {
      for (var j = 0; j < nRepeatsPortalTiles; j++) {
        tileIndices.push([cOffset+i,-1,-1,'portal']);
      }
    }
    cOffset += nPortalTiles;

    // add blanks (todo: implement)
    for (var j = 0; j < nRepeatsBlankTiles; j++) {
      tileIndices.push([cOffset,-1,-1,'blank']);
    }

    // console.log(tileIndices);
    this.shuffle(tileIndices);
    return tileIndices;
  }

  getNextCard(card) {
    if (this.tileIndex >= this.tileIndices.length) {
      this.isEmpty = true;
      return;
    }
    card.tile_id = this.tileIndices[this.tileIndex][0];
    card.resource_id = this.tileIndices[this.tileIndex][1];
    card.resource_corner = this.tileIndices[this.tileIndex][2];
  }

  drawRandomTile(drawnTile) {
    // draw a random tile and display it in the control panel
    if (drawnTile.hidden) {      
      this.getNextCard(drawnTile);
      drawnTile.hidden = false;
      this.tileIndex++;
      if (this.tileIndex >= this.tileIndices.length) {
        this.isEmpty = true;
      }
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

  constructor(col, row, isOnBoard, drawnTileIndex){
    this.tile_id = -1;
    this.resource_id = -1;
    this.resource_corner = -1;
    this.col = col;
    this.row = row;
    this.isOnBoard = isOnBoard;
    this.isLastPlaced = false;
    this.playerIdsOnToken = [];
    this.portalsOnToken = [];
    this.drawnTileIndex = drawnTileIndex;
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
    this.x = (0.2 + 1.1*(this.drawnTileIndex+1))*col_width;
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
    for (let i = 0; i < baseTileIndices.length-1; i++) {
      if (this.tile_id < baseTileIndices[i+1]) {
        // rotate the road tile
        let j = this.tile_id-baseTileIndices[i];
        this.tile_id = baseTileIndices[i] + ((j+1) % (baseTileIndices[i+1]-baseTileIndices[i]));
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
    let sx = this.tile_id % sprites_per_row * sprite_size;
    let sy = floor(this.tile_id / sprites_per_row) * sprite_size;

    // draw tile
    image(road_sprites_img, x, y, col_width, row_height, sx, sy, sprite_size, sprite_size);

    // draw resource
    if (this.resource_id > -1) {
      noStroke();
      let tx = x + col_width/2;
      let ty = y + row_height/2;
      fill(resourceColors[this.resource_id]);
      if (this.resource_corner === 0) {
        circle(tx+resourceDiameter, ty+resourceDiameter, resourceDiameter);
      } else if (this.resource_corner === 1) {
        circle(tx-resourceDiameter, ty+resourceDiameter, resourceDiameter);
      } else if (this.resource_corner === 2) {
        circle(tx-resourceDiameter, ty-resourceDiameter, resourceDiameter);
      } else {
        circle(tx+resourceDiameter, ty-resourceDiameter, resourceDiameter);
      }
    }

    // draw portals
    for (var i = 0; i < this.portalsOnToken.length; i++) {
      fill(players[this.portalsOnToken[i]].token.color);
      let rad = 5;
      stroke(255);
      triangle(x+col_width/2 - rad, y+row_height/2 + rad, x+col_width/2 + rad, y+row_height/2 + rad, x+col_width/2, y+row_height/2 - rad/1.414);
    }

    // highlight tile if it was last placed or being dragged
    if (this.isLastPlaced || this.isBeingDragged) {
      noFill();
      stroke(200);
      strokeWeight(2);
      rect(x+1, y+1, col_width-2, row_height-2);
      strokeWeight(1);
    }
  }

  click() {
    if (this.isOnBoard && this.tile_id === -1) { // empty tile clicked
      if (drawnTiles.tileIsBeingDragged()) {
        // copy drawn tile, then hide drawn tile
        drawnTiles.copyDraggedTile(this);
      }
    } else if (this.isOnBoard) { // not empty, so rotate
      if (!drawnTiles.tileIsBeingDragged() && this.isLastPlaced) {
        // can only rotate when not dragging drawn tile
        this.rotate();
      }
    } else if (this.isDrawnTile) {
      if (this.hidden) {
        drawnTiles.undoPlacedTile();
      } else if (!this.hidden && !this.isBeingDragged) {
        this.isBeingDragged = true;
      } else { // clicked in white area, so reset
        this.isBeingDragged = false;
        this.resetDrawnTileLocation();
      }
    }
  }
}

class DrawnTiles {
  constructor(nTilesMax){
    this.flop = [];
    for (var i = 0; i < nTilesMax; i++) {
      this.flop[i] = new Tile(0, 0, false, i);
    }
  }

  tileIsBeingDragged() {
    for (var i = 0; i < this.flop.length; i++) {
      if (this.flop[i].isBeingDragged) {
        return true;
      }
    }
    return false;
  }

  copyDraggedTile(tile) {
    // first make sure other tiles are marked as fixed
    for (let col = 0; col < grid_cols; col++) {
      for (let row = 0; row < grid_rows; row++) {
        tiles[col][row].isLastPlaced = false;
      }
    }

    // now copy dragged tile to current tile
    for (var i = 0; i < this.flop.length; i++) {
      if (this.flop[i].isBeingDragged) {
        // copy drawn tile, then hide drawn tile
        tile.tile_id = this.flop[i].tile_id;
        tile.resource_id = this.flop[i].resource_id;
        tile.resource_corner = this.flop[i].resource_corner;

        // mark tile so we know we can still rotate it
        tile.isLastPlaced = true;

        // reset drawn tile to be invisible
        this.flop[i].resetDrawnTile();
        return tile;
      }
    }
  }

  render() {
    // check if any tiles are marked as last placed
    let writeUndo = false;
    for (let col = 0; col < grid_cols; col++) {
      for (let row = 0; row < grid_rows; row++) {
        if (tiles[col][row].isLastPlaced) {
          writeUndo = true;
        }
      }
    }

    for (var i = 0; i < this.flop.length; i++) {
      if (this.flop[i].isBeingDragged) {
        this.flop[i].x = mouseX - col_width/2;
        this.flop[i].y = mouseY - row_height/2;
      }
      if (writeUndo && this.flop[i].hidden) { // draw undo text
        let x = (0.2 + 1.1*(i+1))*col_width;
        let y = (grid_rows * row_height) + row_height/2;
        noFill();
        stroke(150);
        strokeWeight(1);
        rect(x, y, col_width, row_height);
        textAlign(CENTER, CENTER);
        text('Undo', x + col_width/2, y + row_height/2);
        writeUndo = false;
      }
      this.flop[i].render();
    }
  }

  undoPlacedTile() {
    for (var i = 0; i < this.flop.length; i++) {
      // find the last drawn tile and put it back
      if (!this.flop[i].hidden) {
        // cannot do this if a new tile has been drawn
        continue;
      }
      for (let col = 0; col < grid_cols; col++) {
        for (let row = 0; row < grid_rows; row++) {
          if (tiles[col][row].isLastPlaced) {
            this.flop[i].tile_id = tiles[col][row].tile_id;
            this.flop[i].resource_id = tiles[col][row].resource_id;
            this.flop[i].resource_corner = tiles[col][row].resource_corner;
            this.flop[i].hidden = false;
            tiles[col][row].tile_id = -1;
            tiles[col][row].resource_id = -1;
            tiles[col][row].resource_corner = -1;
            tiles[col][row].isLastPlaced = false;
            return;
          }
        }
      }
    }
  }

}

function mouseClicked() {
  // find location of mouse click, relative to tiles
  let col = floor(mouseX / col_width);
  let row = floor(mouseY / row_height);
  // console.log([mouseX, mouseY, col, row]);

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
    if (drawnTiles.tileIsBeingDragged()) {
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
  for (var i = 0; i < drawnTiles.flop.length; i++) {
    if (mouseX >= drawnTiles.flop[i].x && mouseX < drawnTiles.flop[i].x+col_width && mouseY >= drawnTiles.flop[i].y && mouseY < drawnTiles.flop[i].y+row_height) {
      drawnTiles.flop[i].click();
      return;
    }
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
      // clr = color(235, 168, 52, 150);
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
      tiles[col][row] = new Tile(col, row, true, -1);
    }
  }

  // set HOME tile
  tiles[HOME_TILE_COL][HOME_TILE_ROW].tile_id = homeTileIndex;

  // set deck
  deck = new Deck();

  // set DRAWN tile
  drawnTiles = new DrawnTiles(nTilesVisible);
}

function initializeGoalCards() {
  goalCards = [];

  // generate all goal cards,
  // and keep track of counts in each tier
  let cg = 0;

  // easy tier
  let goalCoardCounts = [0,0,0];
  for (var i = 0; i < resourceColors.length; i++) {
    goalCards[cg] = new GoalCard([i],[3],1,[]);
    cg++;
    goalCoardCounts[0]++;

    goalCards[cg] = new GoalCard([i,(i+1)%resourceColors.length],[2,1],1,[]);
    cg++;
    goalCoardCounts[0]++;
  }

  // medium tier
  for (var i = 0; i < resourceColors.length; i++) {
    goalCards[cg] = new GoalCard([i],[7],2,[]);
    cg++;
    goalCoardCounts[1]++;

    goalCards[cg] = new GoalCard([i,(i+2)%resourceColors.length],[5,2],2,[]);
    cg++;
    goalCoardCounts[1]++;

    goalCards[cg] = new GoalCard([i,(i+3)%resourceColors.length],[4,3],2,[]);
    cg++;
    goalCoardCounts[1]++;
  }

  // bonus cards
  for (var i = 0; i < resourceColors.length; i++) {

    // double of same color, both big
    goalCards[cg] = new GoalCard([i],[2],3,true);
    cg++;
    goalCoardCounts[2]++;

    // double of same color, one big one small
    goalCards[cg] = new GoalCard([i],[2],3,false);
    cg++;
    goalCoardCounts[2]++;

    // one of this color, one of another
    for (var j = 0; j < i; j++) {
      // both big
      goalCards[cg] = new GoalCard([i,j],[1,1],3,true);
      cg++;
      goalCoardCounts[2]++;

      // one big one small
      goalCards[cg] = new GoalCard([i,j],[1,1],3,false);
      cg++;
      goalCoardCounts[2]++;
    }
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
      // console.log(goalCards[gid]);
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
  // loop over each cell and render tiles
  for (let col = 0; col < grid_cols; col++) {
    for (let row = 0; row < grid_rows; row++) {
        tiles[col][row].render();
    }
  }

  // render drawn tiles
  drawnTiles.render();

  // render deck
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
  stroke(0, 0, 0, 0);
  for (let x = 0; x <= grid_cols*col_width; x += col_width) {
    line(x, 0, x, grid_rows*row_height);
  }
  for (let y = 0; y <= grid_rows*row_height; y += row_height) {
    line(0, y, grid_cols*col_width, y);
  }
}

function updateScores() {
  // updates values in player control panel
  for (var i = 0; i < players.length; i++) {

    // update resource counts
    for (var j = 0; j < players[i].resources.length; j++) {
      $('.player-' + (i+1).toString() + '.resource-' + (j+1).toString()).html(players[i].resources[j]);
    }

    // update portal count
    for (var j = 0; j < players[i].portals.length; j++) {
      if (players[i].portals[j] == -1) {
        $('.player-' + (i+1).toString() + '.portal-' + (j+1).toString()).css('color', players[i].color);
      } else {
        $('.player-' + (i+1).toString() + '.portal-' + (j+1).toString()).css('color', 'lightgray');
      }
    }

    // update VPs
    $('.player-' + (i+1).toString() + '.vp-1').html(players[i].vp);
  }
}

function draw() {
  background(backgroundColor);
  
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

  let cPortalId = -1;
  if ($(elem).siblings('.portal-2').length > 0) {
    cPortalId = 0;
  } else if ($(elem).siblings('.portal-1').length > 0) {
    cPortalId = 1;
  }

  return [cPlayerId, cResourceId, cVpId, cPortalId];
}

function incrementCounter() {
  let elems = findCounter(this);
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

function placePortal() {
  let elems = findCounter(this);
  if (elems[0] > -1 && elems[3] > -1) {
    players[elems[0]].placePortal(elems[3]);
  }
}

function addHandlers() {
  $('.counter-increment').click(incrementCounter);
  $('.counter-decrement').click(decrementCounter);
  $('.portal').click(placePortal);

  // style colors of resource counters
  for (var i = 0; i < resourceColors.length; i++) {
    $('.resource-' + (i+1).toString()).parent().parent().css('border-color', resourceColors[i]);
    $('.resource-' + (i+1).toString()).css('color', resourceColors[i]);
  }
}

$(document).ready(function() {
  addHandlers();
});
