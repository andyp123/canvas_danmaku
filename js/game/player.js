/* MASS SPRING ****************************************************************
A mass-spring damper system that can be used to simulate
harmonic oscillations in a physics system.
  converted from Action Script code by Eddie Lee
*/
function MassSpring() {
	this.mass = 1.0; //mass of object on spring
	this.friction = 1.0; //friction of object on spring
	this.springConstant = 1.0; //controls bounciness of spring

	this.pos = new Vector2(0, 0); //position of object on spring
	this.vel = new Vector2(0, 0); //velocity of object on spring
	this.targetPos = new Vector2(0, 0); //spring is tied to this point
	this.gravity = new Vector2(0, 0); //the gravity affecting the object
}

MassSpring.prototype.update = function() {
	g_VECTORSCRATCH.use();
		//calculate new velocity (uses symplectic method for integration)
		var nextVel = g_VECTORSCRATCH.get();
		var invMass = (this.mass != 0.0) ? 1.0 / this.mass : 99999999.0;
			invMass *= g_FRAMETIME_S;
		nextVel.x = this.vel.x + invMass * (-this.friction * this.vel.x - this.springConstant * (this.pos.x - this.targetPos.x) + this.gravity.x * this.mass);
		nextVel.y = this.vel.y + invMass * (-this.friction * this.vel.y - this.springConstant * (this.pos.y - this.targetPos.y) + this.gravity.y * this.mass);
		
		//update position and velocity
		this.pos.x += nextVel.x * g_FRAMETIME_S;
		this.pos.y += nextVel.y * g_FRAMETIME_S;
		this.vel.equals(nextVel);
	g_VECTORSCRATCH.done();
}

MassSpring.prototype.setSpringParameters = function(mass, friction, springConstant) {
	this.mass = mass;
	this.friction = friction;
	this.springConstant = springConstant;
}


/* SIMPLE PHYSICS **************************************************************
*/
function SimplePhysics() {
	this.pos = new Vector2();
	this.vel = new Vector2();
	this.acc = new Vector2();
	this.friction = 1.0;
	this.maxSpeed = 0.0; //0.0 = no maximum
}

SimplePhysics.prototype.addForce = function(forceX, forceY) {
	this.acc.addXY(forceX, forceY);
}

SimplePhysics.prototype.update = function() {
	//add acceleration to velocity
	this.vel.x += this.acc.x * g_FRAMETIME_S;
	this.vel.y += this.acc.y * g_FRAMETIME_S;
	
	if (this.maxSpeed > 0.0 && this.vel.lenSq() > this.maxSpeed * this.maxSpeed) {
		this.vel.setLength(this.maxSpeed);
	}
	
	//add velocity to position
	this.pos.x += this.vel.x * g_FRAMETIME_S;
	this.pos.y += this.vel.y * g_FRAMETIME_S;
	
	this.vel.mul(this.friction); //apply friction for next frame
	this.acc.zero(); //reset acc for next frame
}


/* PLAYER OPTION *************************************************************************
Small Option device that follows the player around
*/
function PlayerOption(owner, offsetX, offsetY) {
	this.owner = owner || null; //must set this to a player
	this.offset = new Vector2(offsetX, offsetY);

	//physics
	this.massSpring = new MassSpring();
	this.massSpring.setSpringParameters(0.5, 5.0, 100.0);
	if (owner !== undefined) {
		this.massSpring.pos.x = owner.pos.x + this.offset.x;
		this.massSpring.pos.y = owner.pos.y + this.offset.y;
	}
	this.pos = this.massSpring.pos; //new Vector2(this.massSpring.pos.x, this.massSpring.pos.y);

	//gameObject
	this.gameObject = new GameObject();
	this.gameObject.sprite = new Sprite(g_ASSETMANAGER.getAsset("PLAYER_OPTION"), 1, 1);
	this.gameObject.moveToXY(this.pos.x, this.pos.y);
	this.bounds = this.gameObject.bounds;
	this.bounds.setAABB(this.pos.x, this.pos.y, 12, 12);


}

PlayerOption.prototype.update = function() {
	this.massSpring.targetPos.x = this.owner.pos.x + this.offset.x;
	this.massSpring.targetPos.y = this.owner.pos.y + this.offset.y;
	this.massSpring.update();
	this.pos.equals(this.massSpring.pos);
	this.gameObject.moveToXY(this.pos.x, this.pos.y);
}

PlayerOption.prototype.draw = function(ctx, xofs, yofs) {
	this.gameObject.draw(ctx, xofs, yofs);
}

PlayerOption.prototype.drawDebug = function(ctx, xofs, yofs) {
	this.bounds.drawDebug(ctx, xofs, yofs);
}

PlayerOption.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 0, 0, false);
}

/* PLAYER ********************************************************************************
Player class that handles basic input etc.
*/

function Player(id, name, startX, startY, keys) {
	//player info
	this.playerID = id || 0;
	this.playerName = name || "player";
	this.keys = keys || {
		LEFT: 37,	//move left
		RIGHT: 39,	//move right
		UP: 38,		//move up
		DOWN: 40,	//move down
		SHOT1: 90,	//primary shot (z)
		SHOT2: 88,	//secondary shot (x)
	};
	
	//game object (for interaction with other game objects)
	this.gameObject = new GameObject();
	this.initializeGameObject();

	//physics
	this.moveForce = 3500;

	this.physics = new SimplePhysics();
	this.physics.friction = 0.75;
	this.physics.maxSpeed = 300;
	this.pos = this.physics.pos; //reference for simplicity
	this.pos.set(startX, startY);
	this.gameObject.moveToXY(this.pos.x, this.pos.y);

	//collision
	this.bounds = this.gameObject.bounds;
	this.bounds.setAABB(this.pos.x, this.pos.y - 8, 10, 10);
	
	//options
	this.options = [];
	this.options[0] = new PlayerOption(this, -28, 0);
	this.options[1] = new PlayerOption(this, 28, 0);

	//misc
	this.nextShotTime = 0;
	this.shotDelay = 100;
}


//set up the gameObject
Player.prototype.initializeGameObject = function() {
	this.gameObject.sprite = new Sprite(g_ASSETMANAGER.getAsset("PLAYER"), 1, 1);
	this.gameObject.collisionFlags = GameObject.CF_ENEMY_SHOTS;
	
	this.gameObject.updateFunc = function() {};

	this.gameObject.collisionFunc = function(that) {
	}

	this.gameObject.activate();
}


//mostly handles input
Player.prototype.update = function() {
	var i;

	//check for collisions with enemy shots
	g_GAMEMANAGER.enemyShots.testCollisions(this.bounds);
	g_GAMEMANAGER.enemyShots.performCollisionResponse(this.gameObject);
	if (this.gameObject.health > 0) {
		//movement
		g_VECTORSCRATCH.use();
			var inputDir = g_VECTORSCRATCH.get().zero();
			if (g_KEYSTATES.isPressed(this.keys.LEFT)) inputDir.x -= 1;
			if (g_KEYSTATES.isPressed(this.keys.RIGHT)) inputDir.x += 1;
			if (g_KEYSTATES.isPressed(this.keys.UP)) inputDir.y -= 1;
			if (g_KEYSTATES.isPressed(this.keys.DOWN)) inputDir.y += 1;
			
			if (inputDir.lenSq() > 0.0) {
				inputDir.normalize();
				this.physics.addForce(inputDir.x * this.moveForce, inputDir.y * this.moveForce);
			}		
			this.physics.update();
			this.gameObject.moveToXY(this.pos.x, this.pos.y);
		g_VECTORSCRATCH.done();

		//update options
		for (i = 0; i < this.options.length; ++i) {
			this.options[i].update();
		}

		//shooting
		if (g_KEYSTATES.isPressed(this.keys.SHOT1) && g_GAMETIME_MS >= this.nextShotTime) {
			this.fire();
			this.nextShotTime = g_GAMETIME_MS + this.shotDelay;
		}
	} else {

	}
}


Player.prototype.fire = function() {

/*	//DODONPACHI style
	var x = Math.sin(0.25 * g_KEYSTATES.duration(this.keys.SHOT1)) * 32;
	var shot = g_GAMEMANAGER.playerShots.getFreeInstance();
	if (shot) {
		Shot.instance_VULCAN(shot, this.pos.x - x, this.pos.y - 16, 270 * Util.DEG_TO_RAD);
	}
	shot = g_GAMEMANAGER.playerShots.getFreeInstance();
	if (shot) {
		Shot.instance_VULCAN(shot, this.pos.x + x, this.pos.y - 16, 270 * Util.DEG_TO_RAD);
	}*/

	//mental
	var numShots = 60;
	var spreadAngle = 360;
	var startAngle = 270 - spreadAngle * 0.5;
	var intervalAngle = (numShots < 2) ? 0.0 : spreadAngle / (numShots - 1);

	for (var i = 0; i < numShots; ++ i) {
		var shot = g_GAMEMANAGER.playerShots.getFreeInstance();
		if (shot) {
			Shot.instance_VULCAN(shot, this.pos.x, this.pos.y, (startAngle + i * intervalAngle) * Util.DEG_TO_RAD);
		}
	}
}

Player.prototype.draw = function(ctx, xofs, yofs) {
	for (var i = 0; i < this.options.length; ++i) {
		this.options[i].draw(ctx, xofs, yofs);
	}

	this.gameObject.draw(ctx, xofs, yofs);
}

Player.prototype.drawDebug = function(ctx, xofs, yofs) {
	for (var i = 0; i < this.options.length; ++i) {
		this.options[i].drawDebug(ctx, xofs, yofs);
	}

	this.bounds.drawDebug(ctx, xofs, yofs);
}

Player.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 0, 999, false);
}

