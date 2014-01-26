/* OBJECT GRID *****************************************************************
An object manager with a simple spatial partitioning algorithm to reduce the
number of collision checks colliding objects must perform. To avoid the need to
regenerate or allocate large amounts of data dynamically, the data structure is
a grid that has a fixed number of object references for every square in it. This
means that collisions will be missed if a "bin" is full. If the maximum number
of references per bin is high enough, this will not happen.
*/

//container of references at each grid position
function ObjectGridBin(MAX_REFS_PER_BIN) {
	this.objectRefs = new Array(MAX_REFS_PER_BIN);
	this.numObjects = 0; //use this instead of objectRefs.length

	for (var i = 0; i < MAX_REFS_PER_BIN; ++i) {
		this.objectRefs[i] = null;
	}
}

ObjectGridBin.prototype.toString = function() {
	return "ObjectGridBin (numObjects: " + this.numObjects + ")";
}

//add an object reference
ObjectGridBin.prototype.addRef = function(object) {
	if (this.objectRefs[this.numObjects] !== undefined) {
		this.objectRefs[this.numObjects] = object;
		this.numObjects++;
	}
}

//the main manager class
function ObjectGrid() {
	this.objects = []; //where the objects are allocated and stored
	this.lastFreeIndex = 0;

	//the structure used for spatial partitioning
	this.grid = [];
	this.gridPos = new Vector2(0,0);
	this.gridWidth = 0;
	this.gridHeight = 0;
	this.gridSizeX = 0;
	this.gridSizeY = 0;
	this.binSizeX = 0;
	this.binSizeY = 0;
	this.invBinSizeX = 0;
	this.invBinSizeY = 0;

	//the lists where collision candidates and actual collisions are stored
	this.candidateList = [];
	this.collisionList = [];
	this.numCandidates = 0;
	this.numCollisions = 0;

	//use this to override default drawing behaviour, for example, if you want
	//to group many objects together in one unsorted layer for extra speed
	this.drawFunc = null;
	this.drawDebugFunc = null;
	this.layer = 0;
	this.priority = 0;
}

ObjectManager.prototype.toString = function() {
	return "ObjectGrid";
}

ObjectGrid.DEFAULT_MAX_REFS_PER_BIN = 16; //references stored in a bin
ObjectGrid.DEFAULT_BIN_SIZE = 32; //32x32 box
ObjectGrid.DEFAULT_LIST_SIZE = 64; //max 64 candidates/collisions

ObjectGrid.prototype.initialize = function(OBJECT_CONSTRUCTOR, MAX_OBJECTS, GRID_SETTINGS) {
	this.objects = new Array(MAX_OBJECTS);
	
	var i;
	//initialize objects
	for (i = 0; i < MAX_OBJECTS; ++i) {
		var object = OBJECT_CONSTRUCTOR();
		object["ObjectManager_FREE"] = true;
		object["ObjectManager_FREE_AT_FRAME"] = -1;
		this.objects[i] = object;
	}
	//initialize grid
	if (GRID_SETTINGS === undefined) {
		GRID_SETTINGS = {
			MAX_REFS_PER_BIN: ObjectGrid.DEFAULT_MAX_REFS_PER_BIN,
			px: 0,
			py: 0,
			width: g_SCREEN.width,
			height: g_SCREEN.height,
			sizeX: Math.floor(g_SCREEN.width / ObjectGrid.DEFAULT_BIN_SIZE),
			sizeY: Math.floor(g_SCREEN.height / ObjectGrid.DEFAULT_BIN_SIZE)
		};
	}
	this.initializeGrid(GRID_SETTINGS);
	//initialize candidate and collision lists
	this.collisionList = new Array(ObjectGrid.DEFAULT_LIST_SIZE);
	this.candidateList = new Array(ObjectGrid.DEFAULT_LIST_SIZE);
	for (i = 0; i < ObjectGrid.DEFAULT_LIST_SIZE; ++i) {
		this.candidateList[i] = null;
		this.collisionList[i] = null;
	}

}

ObjectGrid.prototype.initializeGrid = function(GRID_SETTINGS) {
	gridSize = GRID_SETTINGS.sizeX * GRID_SETTINGS.sizeY;
	this.grid = new Array(gridSize);
	this.gridPos.set(GRID_SETTINGS.px, GRID_SETTINGS.py);
	this.gridWidth = GRID_SETTINGS.width;
	this.gridHeight = GRID_SETTINGS.height;
	this.gridSizeX = GRID_SETTINGS.sizeX;
	this.gridSizeY = GRID_SETTINGS.sizeY;
	this.binSizeX = this.gridWidth / this.gridSizeX;
	this.binSizeY = this.gridHeight / this.gridSizeY;
	//invBinSizeX and invBinSizeY are used to reduce the need for divisions
	this.invBinSizeX = (this.binSizeX  != 0) ? 1.0 / this.binSizeX : 0;
	this.invBinSizeY = (this.binSizeY != 0) ? 1.0 / this.binSizeY : 0;

	for (var i = 0; i < gridSize; ++i) { 
		this.grid[i] = new ObjectGridBin(GRID_SETTINGS.MAX_REFS_PER_BIN);
	}
}

ObjectGrid.prototype.getFreeInstance = function() {
	var i;
	for (i = this.lastFreeIndex + 1; i < this.objects.length; ++i) {
		if (this.objects[i].ObjectManager_FREE) {
			this.objects[i].ObjectManager_FREE = false;
			this.lastFreeIndex = i;
			return this.objects[i];
		}
	}
	for (i = 0; i < this.lastFreeIndex; ++i) {
		if (this.objects[i].ObjectManager_FREE) {
			this.objects[i].ObjectManager_FREE = false;
			this.lastFreeIndex = i;
			return this.objects[i];
		}
	}

	alert("ObjectGrid.getFreeInstance: No free objects available");

	return null;
}


//make all objects immediately available for use
ObjectGrid.prototype.freeAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		this.objects[i].ACTIVE = false;
		this.objects[i].ObjectManager_FREE_AT_FRAME = -1;
		this.objects[i].ObjectManager_FREE = false;
	}
}

//deactivate all objects
ObjectGrid.prototype.deactiveAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		this.objects[i].ACTIVE = false;
	}
}

//remove variables used by ObjectManager
ObjectGrid.prototype.cleanAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		delete this.objects[i]["ObjectManager_FREE"];
		delete this.objects[i]["ObjectManager_FREE_AT_FRAME"];
	}
}

//update all active objects and check for inactive objects to free
ObjectGrid.prototype.update = function() {
	var i;
	//empty all bins
	for (i = 0; i < this.grid.length; ++i) {
		this.grid[i].numObjects = 0;
	}
	//update all objects
	for (i = 0; i < this.objects.length; ++i) {
		var object = this.objects[i];
		if (object.ACTIVE) {
			object.update();

			//put object into buckets
			var gx = Math.floor((object.pos.x - this.gridPos.x) * this.invBinSizeX);
			var gy = Math.floor((object.pos.y - this.gridPos.y) * this.invBinSizeY);
			
			if (gx < 0 || gx >= this.gridSizeX || gy < 0 || gy >= this.gridSizeY) {
				//cull object if automatic culling enabled
				if (object.CULLING == GameObject.CULL_AUTO) {
					object.deactivate();
				}
			} else {
				var gi = gy * this.gridSizeX + gx;
				this.grid[gi].addRef(object);
			}

		} else if (!object.ObjectManager_FREE) {
			if (object.ObjectManager_FREE_AT_FRAME == -1) {
				object.ObjectManager_FREE_AT_FRAME = g_GAMETIME_FRAMES + ObjectManager.FRAME_DELAY_BEFORE_FREE;
			} else if (g_GAMETIME_FRAMES >= object.ObjectManager_FREE_AT_FRAME) {
				object.ObjectManager_FREE_AT_FRAME = -1;
				object.ObjectManager_FREE = true;
			}
		}
	}
}

//call addDrawCall method of active objects
ObjectGrid.prototype.addDrawCall = function() {
	if (this.drawFunc || this.drawDebugFunc) {
		g_RENDERLIST.addObject(this, this.layer, this.priority, false);
	} else {
		console.log("ObjectGrid: Adding all objects to render list")
		for (var i = 0; i < this.objects.length; ++i) {
			if (this.objects[i].ACTIVE) {
				this.objects[i].addDrawCall();
			}
		}
	}
}

//if the ObjectManager is added to g_RENDERLIST, it will need this
ObjectGrid.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	}
}

//this function is also required by g_RENDERLIST
ObjectGrid.prototype.drawDebug = function(ctx, xofs, yofs) {
	if (this.drawDebugFunc) {
		this.drawDebugFunc.call(this, ctx, xofs, yofs);
	}
}


//check an AABB against the grid and get a list of objects occupying those grid cells
ObjectGrid.prototype.getCandidates_AABB = function(px, py, hw, hh) {
	var minX = Math.floor((px - hw - this.gridPos.x) * this.invBinSizeX);
	var maxX = Math.floor((px + hw - this.gridPos.x) * this.invBinSizeX);
	var minY = Math.floor((py - hh - this.gridPos.y) * this.invBinSizeY);
	var maxY = Math.floor((py + hh - this.gridPos.y) * this.invBinSizeY);
	//check object is on the grid
	if (maxX < 0 || maxY < 0 || minX >= this.gridSizeX || minY >= this.gridSizeY) {
		return;
	}
	//clamp indices to grid if still on grid
	if (minX < 0) minX = 0;
	if (minY < 0) minY = 0;
	if (maxX >= this.gridSizeX) maxX = this.gridSizeX - 1;
	if (maxY >= this.gridSizeY) maxY = this.gridSizeY - 1;

	//console.log("min: " + minX + "," + minY + " max: " + maxX + "," + maxY);

	var x, y, i, bin;
	this.numCandidates = 0;
	for (y = minY; y <= maxY; ++y) {
		for (x = minX; x <= maxX; ++x) {
			i = y * this.gridSizeX + x;
			bin = this.grid[y * this.gridSizeX + x];
			//add all possible collisions to the candidates list
			for (i = 0; i < bin.numObjects; ++i) {
				if (this.numCandidates < ObjectGrid.DEFAULT_LIST_SIZE) {
					this.candidateList[this.numCandidates] = bin.objectRefs[i];
					this.numCandidates++;
				} else {
					return;
				}
			}
		}
	}
}

//remove any duplicate object references from the candidate list
//no duplicates if testing against points (no area, so always occupy a single bin)
ObjectGrid.prototype.removeDuplicateCandidates = function() {
	var emptyIndex = 0;
	var nonDuplicateCandidates = this.numCandidates;
	var i, j, k;
	//nullify duplicates
	for (i = 0; i < this.numCandidates; ++i) {
		for (j = i + 1; j < this.numCandidates; ++j) {
			if (this.candidateList[j] === this.candidateList[i]) {
				this.candidateList[j] = null;
				nonDuplicateCandidates--;
				if (!emptyIndex) {
					emptyIndex = j;
				}
			} else if (emptyIndex) {
				//if there is an empty index, put the current object in it
				this.candidateList[emptyIndex] = this.candidateList[j];
				for (k = emptyIndex + 1; k < j; ++k) {
					if (this.candidateList[k] == null) {
						emptyIndex = k;
						break;
					}
				}
				emptyIndex = 0;
			}
		}
	}
	//set the real number of candidates
	this.numCandidates = nonDuplicateCandidates;
}

//check for collisions with the objects referenced in candidateList and store a
//reference in collisionList (test input AABB vs XY of objects in grid)
ObjectGrid.prototype.getCollisions_AABB_XY = function(px, py, hw, hh) {
	this.numCollisions = 0;
	var candidate;
	var i = this.numCandidates;
	while (i--) {
		c = this.candidateList[i];
		if (Collision2d.test_AABB_XY(px, py, hw, hh, c.pos.x, c.pos.y)) {
			this.collisionList[this.numCollisions] = c;
			this.numCollisions++;
		}
	}
}

//main collision testing function
ObjectGrid.prototype.testCollisions = function(bounds) {
	this.getCandidates_AABB(bounds.pos.x, bounds.pos.y, bounds.hw, bounds.hh);
	//no need for duplicate removal if the ObjectGrid contains only objects
	//using points for collision
	//if (this.contentType != ObjectGrid.CT_POINT) {
	//	this.removeDuplicateCandidates();
	//}
	this.getCollisions_AABB_XY(bounds.pos.x, bounds.pos.y, bounds.hw, bounds.hh);
}

//perform response (object being collided handled second)
ObjectGrid.prototype.performCollisionResponse = function(gameObject) {
	for (var i = 0; i < this.numCollisions; ++i) {
		this.collisionList[i].collide(gameObject);
		gameObject.collide(this.collisionList[i]);
	}
}


ObjectGrid.drawGrid = function(ctx, xofs, yofs) {
	var x, y, i;
	var xPos, yPos;
	var currentFill = ctx.fillStyle;
	//fill bins with color depending how many objects are inside them
	for (y = 0; y < this.gridSizeY; ++y) {
		for (x = 0; x < this.gridSizeX; ++x) {
			i = y * this.gridSizeX + x;
			if (this.grid[i].numObjects > 0) {
				
				xPos = Math.floor(xofs + this.gridPos.x + x * this.binSizeX);
				yPos = Math.floor(yofs + this.gridPos.y + y * this.binSizeY);
				var alpha =  (this.grid[i].numObjects / this.grid[i].objectRefs.length);
				//var alpha = 1;
				ctx.fillStyle = "rgba(255,0,0," + alpha + ")";
				ctx.fillRect(xPos, yPos, Math.floor(this.binSizeX), Math.floor(this.binSizeY));
			}
		}
	}
	ctx.fillStyle = currentFill;

	//draw outline
	Util.drawRectangle(ctx, this.gridPos.x + xofs, this.gridPos.y + yofs, this.gridWidth, this.gridHeight);
	//horizontal lines
	var c1, c2;
	c1 = Math.floor(xofs) + this.gridPos.x - 0.5;
	c2 = Math.floor(xofs + this.gridWidth) + this.gridPos.x - 0.5;
	for (y = 0; y < this.gridSizeY; ++y) {
		yPos = Math.floor(yofs + this.gridPos.y + y * this.binSizeY) - 0.5;
		Util.drawLine(ctx, c1, yPos, c2, yPos);
	}
	//vertical lines
	c1 = Math.floor(yofs) + this.gridPos.y - 0.5;
	c2 = Math.floor(yofs + this.gridHeight) + this.gridPos.y - 0.5;
	for (x = 0; x < this.gridSizeX; ++x) {
		xPos = Math.floor(xofs + this.gridPos.x + x * this.binSizeX) - 0.5;
		Util.drawLine(ctx, xPos, c1, xPos, c2);
	}
}

ObjectGrid.prototype.getNearestObject = function(pos) {
	return null;
}