/* GAME OBJECT *****************************************************************
Generic game object that serves as a base for all objects in the game (with the
exception of some special cases such as particles where this much data is a
massive overkill.)

*Slightly* simplified from the canvas blitz GameObject to be a little more
lightweight. However, may still be a bit much for things like bullets. Also,
for fast collision detection, the more convenient methods should be ignored
if the types are already known. For example, if all bullets are represented
by a point and all enemies by a box, then run through the list of potential
collisions and perform only box vs point collisions directly to avoid
uneccessary type checking and branches.

To avoid more branching, the update and draw functions should be directly
overriden instead of using drawFunc and updateFunc, which are called from
within draw and update.
*/
function GameObject() {
	this.TYPENAME = GameObject.GENERIC_TYPENAME; //the object typeName (e.g. PlayerShot.HOMING)
	
	this.sprite = null;
	this.animState = new SpriteAnimState();
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.angle = 0;
	this.speed = 0;
	this.health = 1;

	this.state = 0; //useful for deciding what to do
	this.stateStartTime = 0; //when did the object start this state?
	this.stateEndTime = 0; //when will the state end (gametime + constant)
	this.startTime = 0;
	this.nextActionTime = 0; //used for timing when next to shoot, generate money etc.
	this.nextActionDelay = 1; //the delay between each action

	this.collisionFlags = 0;
	this.bounds = new CollisionBounds(CollisionBounds.TYPE_NONE, 0, 0, 0, 0);
	this.damage = 0; //damage inflicted during collisions

	this.owner = null; //reference to creator object
	this.target = null; //reference to object being tracked etc.

	this.layer = 0;
	this.priority = 0;

	// overrideable functions
	this.updateFunc = null;
	this.drawFunc = null;
	this.collisionFunc = null;

	this.activateTime = 0;
	this.deactivateTime = 0;
	this.timeout = 0;
	
	this.CULLING = GameObject.CULL_MANUAL;
	this.ACTIVE = false; //used by managers to decide whether or not to update, draw, etc.
}

GameObject.GENERIC_TYPENAME = "GameObject.<type undefined>";

//how to cull the object
GameObject.CULL_MANUAL = 0;
GameObject.CULL_AUTO = 1;
GameObject.CULL_TIMEOUT = 2;

//what to check for collisions against
GameObject.CF_NOCOLLISION = 0;
GameObject.CF_ENEMY_SHOTS = 1;
GameObject.CF_PLAYER_SHOTS = 2;
GameObject.CF_ENEMY = 4;
GameObject.CF_PLAYERS = 8;
GameObject.CF_ITEMS = 16;

//types for checking against screen boundaries etc.
GameObject.BC_SPRITE = 0;
GameObject.BC_BOUNDS = 1;
GameObject.BC_POS = 2;


//copy function that should be used similarly to "=", since obj1 = obj2 will just make obj1 point to obj2 normally.
GameObject.prototype.equals = function(that) {
	this.TYPENAME = that.TYPENAME;

	this.sprite = that.sprite;
	this.animState.equals(that.animState);
	this.pos.equals(that.pos);
	this.vel.equals(that.vel);
	this.angle = that.angle;
	this.speed = that.speed;
	this.health = that.health;

	this.state = that.state;
	this.stateStartTime = that.stateStartTime;
	this.stateEndTime = that.stateEndTime;
	this.nextActionTime = that.nextActionTime;
	this.nextActionDelay = that.nextActionDelay;


	this.collisionFlags = that.collisionFlags;
	this.bounds.equals(that.bounds);
	this.damage = that.damage;	

	this.owner = that.owner;
	this.target = that.target;

	this.layer = that.layer;
	this.priority = that.layer;

	this.updateFunc = that.updateFunc;
	this.drawFunc = that.drawFunc;
	this.collisionFunc = that.collisionFunc;

	this.activateTime = that.activateTime;
	this.deactivateTime = that.deactivateTime;
	this.timeout = that.timeout;

	this.CULLING = that.CULLING;
	this.ACTIVE = that.ACTIVE;
}

//used to check the type of one object is the same as another
//enemy1.isSameType(Enemy.DRONE)
//enemy1.isSameType(enemy2)
//the TYPENAME string of the template object is assigned (not copied) on creation, so the string reference should be === and not need actual strcmp
GameObject.prototype.isSameType = function(that) {
	return this.TYPENAME === that.TYPENAME
}

//handles moving all componenets of the object by an offset
GameObject.prototype.offsetXY = function(x, y) {
	this.pos.addXY(x, y);
	this.bounds.pos.addXY(x, y);
}

//moves the object to x, y by calculating an offset and using the above function
GameObject.prototype.moveToXY = function(x, y) {
	x -= this.pos.x;
	y -= this.pos.y;
	this.pos.addXY(x, y);
	this.bounds.pos.addXY(x, y);
}

//returns the object type
GameObject.prototype.toString = function() {
	return this.TYPENAME;
}

//clean activation and deactivation function
GameObject.prototype.activate = function() {
	this.activateTime = g_GAMETIME_MS;
	this.ACTIVE = true;
}

GameObject.prototype.deactivate = function() {
	this.deactivateTime = g_GAMETIME_MS;
	this.ACTIVE = false;
}

//compare layer and priority
GameObject.prototype.inFrontOf = function(that) {
	if (this.layer - that.layer > 0) {
		return true;
	}
	if (this.priority - that.priority > 0) {
		return true;
	}
	return false;
}

//set timeout based on time it takes to cross the screen diagonal
GameObject.prototype.setTimeoutFromScreenSize = function() {
	this.timeout = Math.sqrt(g_SCREEN.width * g_SCREEN.width + g_SCREEN.height * g_SCREEN.height);
	this.timeout = (this.speed != 0) ? Math.abs(this.timeout / this.speed) * 1000: 0;
}

//simple state change function
GameObject.prototype.setState = function(state, stateDuration) {
	this.state = state;
	this.stateStartTime = g_GAMETIME_MS;
	this.stateEndTime = (stateDuration) ? this.stateStartTime + stateDuration : 0;
}

GameObject.prototype.getStateT = function() {
	if (!this.stateEndTime) {
		return 0;
	} else {
		return Util.clampScaled(g_GAMETIME_MS, this.stateStartTime, this.stateEndTime);
	}
}

//simple damage function
//take damage and return the amount of damage taken
//if (takeDamage(50) && enemy.health == 0) it's dead
GameObject.prototype.takeDamage = function(amount) {
	var oldHealth = this.health;
	this.health -= amount;
	if (this.health <= 0) {
		this.health = 0;
	}
	return oldHealth - this.health;
}

//collision function that does nothing without collisionFunc
GameObject.prototype.collide = function(that) {
	if (this.collisionFunc) {
		this.collisionFunc.call(this, that);
	}
}

//generic update function that calls the update of the object
GameObject.prototype.update = function() {
	if (this.updateFunc) {
		this.updateFunc.call(this);
	}

	//perform culling
	switch (this.CULLING) {
		case GameObject.CULL_MANUAL: break;
		case GameObject.CULL_AUTO:
			//do stuff
			break;
		case GameObject.CULL_TIMEOUT:
			if (g_GAMETIME_MS > this.activateTime + this.timeout) {
				this.deactivate();
			}
			break;
	}
}

GameObject.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	} else if (this.sprite) {
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + yofs, this.animState.currentFrame);
	}
}

GameObject.prototype.drawDebug = function(ctx, xofs, yofs) {
	this.bounds.draw(ctx, xofs, yofs);
	if (this.sprite) {
		this.sprite.drawDebug(ctx, this.pos.x + xofs, this.pos.y + yofs);
	} else {
		Util.drawPoint(ctx, this.pos.x + xofs, this.pos.y + yofs);
	}
}

GameObject.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}