function Background() {
	this.sprite = new Sprite(g_ASSETMANAGER.getAsset("BACKGROUND"), 1, 1);
	this.sprite.setOffset(Sprite.ALIGN_TOP_LEFT);
}

Background.prototype.draw = function( ctx, xofs, yofs ) {
	this.sprite.draw(ctx, xofs, yofs, 0);
}

Background.prototype.update = function() {
}

Background.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, -10, -10, false);
}





/* GAME MANAGER ****************************************************************
The object that contains lists of all the enemies, buildings, bullets etc. in
the scene. All objects must have a boolean flag named ACTIVE in order to denote
whether or not it should be updated or drawn.
*/

//an object in which to store collision response data
function CollisionData() {
	this.object = null;
	this.distanceSq = 0; //distance between the objects in the collision squared (NOT SET BY ALL COLLISION FUNCTIONS)
}

//simple sort function to allow sorting of collisionList by proximity so that the nearest object is at the front of the list
CollisionData.sort = function(a, b) {
	if (a.object && b.object) return a.distanceSq - b.distanceSq;
	if (a.object) return 1; //b is null
	if (b.object) return -1; //a is null
	return 0;
}

function GameManager() {
//	this.players = new ObjectManager();
	this.enemies = new ObjectManager();
	this.playerShots = new ObjectGrid();
	this.enemyShots = new ObjectGrid();

	this.enemies.initialize(function() { return new GameObject(); }, 32);
	this.playerShots.initialize(function() { return new GameObject(); }, 1024);
	this.enemyShots.initialize(function() { return new GameObject(); }, 2048);

	//use a custom draw function for these managers
	this.playerShots.drawFunc = ObjectManager.drawActiveObjects;
	this.playerShots.drawDebugFunc = ObjectGrid.drawGrid;
	this.enemyShots.drawFunc = ObjectManager.drawActiveObjects;
	this.enemyShots.drawDebugFunc = ObjectGrid.drawGrid;

	//This list is used for storing collisions between objects
	//When an object checks for collisions, all the colliding objects are added
	//to this list, which can then be passed to the object in order for
	//collision response to be performed.
	this.collisionList = [];
	var i = GameManager.MAX_COLLISIONS;
	while (i--) {
		this.collisionList[i] = new CollisionData();
	}

	this.background = new Background();
}

GameManager.MAX_COLLISIONS = 16; //may need more for large explosions etc.

//functions for sorting the collision list
GameManager.SORT_NONE = 0; //perform no sorting of the collision list
GameManager.SORT_FULL = 1; //fully sort the collision list
GameManager.SORT_NEARESTFIRSTSWAP = 2; //find only the nearest object and place it at 0


//clears all objects from the gamemanager by deactivating them
GameManager.prototype.deactivateAll = function() {
	this.playerShots.deactivateAll();
	this.enemyShots.deactivateAll();
	this.enemies.deactivateAll();
}

GameManager.prototype.update = function() {
	this.playerShots.update();
	this.enemyShots.update();
	this.enemies.update();
}

GameManager.prototype.addDrawCall = function() {
	this.playerShots.addDrawCall();
	this.enemyShots.addDrawCall();
	this.enemies.addDrawCall();

	this.background.addDrawCall();
}

