/* OBJECT MANAGER **************************************************************
A simple object manager that pools objects and allows them to be reused when not
active. ObjectManager REQUIRES that objects contained within it have the
following members:
ACTIVE : a boolean variable set to true when the object is in use
update() : an update function
addDrawCall() : adds the object to g_RENDERLIST

ObjectManager is designed to contain GameObjects, and these should be used in
order to exploit its full functionality.

The initialize method takes a function that generates a new object of the type
to be managed. Example usage:
om_enemies.initialize(function() { return new GameObject(); }, 32);
*/

function ObjectManager() {
	this.objects = [];
	this.lastFreeIndex = 0; //store last index a free object was found at

	//use this to override default drawing behaviour, for example, if you want
	//to group many objects together in one unsorted layer for extra speed
	this.drawFunc = null;
	this.drawDebugFunc = null;
	this.layer = 0;
	this.priority = 0;
}

ObjectManager.prototype.toString = function() {
	return "ObjectManager";
}

//this enables a game to keep objects from being reused until a later frame
//so that any objects referencing them have time to realise they are no longer
//active.
//0 : free objects during update next frame
//1 : guarantee 1 frame where the object will be unavailable to getFreeInstance
//setting to higher values increases the frame delay but shouldn't be neccessary
ObjectManager.FRAME_DELAY_BEFORE_FREE = 1;

//initialize the manager with new objects
//two variables are added to each object after construction:
//ObjectManager_FREE : is the object available to getFreeInstance
//ObjectManager_FREE_AT_FRAME : if not, make it free at this frame 
ObjectManager.prototype.initialize = function(OBJECT_CONSTRUCTOR, MAX_OBJECTS) {
	this.objects = new Array(MAX_OBJECTS);

	for (var i = 0; i < MAX_OBJECTS; ++i) {
		var object = OBJECT_CONSTRUCTOR();
		object["ObjectManager_FREE"] = true;
		object["ObjectManager_FREE_AT_FRAME"] = -1;
		this.objects[i] = object;
	}
}

//get a free instance
ObjectManager.prototype.getFreeInstance = function() {
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

	alert("ObjectManager.getFreeInstance: No free objects available");

	return null;
}

//make all objects immediately available for use
ObjectManager.prototype.freeAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		this.objects[i].ACTIVE = false;
		this.objects[i].ObjectManager_FREE_AT_FRAME = -1;
		this.objects[i].ObjectManager_FREE = false;
	}
}

//deactivate all objects
ObjectManager.prototype.deactiveAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		this.objects[i].ACTIVE = false;
	}
}

//remove variables used by ObjectManager
ObjectManager.prototype.cleanAll = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		delete this.objects[i]["ObjectManager_FREE"];
		delete this.objects[i]["ObjectManager_FREE_AT_FRAME"];
	}
}

//update all active objects and check for inactive objects to free
ObjectManager.prototype.update = function() {
	for (var i = 0; i < this.objects.length; ++i) {
		if (this.objects[i].ACTIVE) {
			this.objects[i].update();
		} else if (!this.objects[i].ObjectManager_FREE) {
			if (this.objects[i].ObjectManager_FREE_AT_FRAME == -1) {
				this.objects[i].ObjectManager_FREE_AT_FRAME = g_GAMETIME_FRAMES + ObjectManager.FRAME_DELAY_BEFORE_FREE;
			} else if (g_GAMETIME_FRAMES >= this.objects[i].ObjectManager_FREE_AT_FRAME) {
				this.objects[i].ObjectManager_FREE_AT_FRAME = -1;
				this.objects[i].ObjectManager_FREE = true;
			}
		}
	}
}

//call addDrawCall method of active objects
ObjectManager.prototype.addDrawCall = function() {
	if (this.drawFunc) {
		g_RENDERLIST.addObject(this, this.layer, this.priority, false);
	} else {
		for (var i = 0; i < this.objects.length; ++i) {
			if (this.objects[i].ACTIVE) {
				this.objects[i].addDrawCall();
			}
		}
	}
}

//if the ObjectManager is added to g_RENDERLIST, it will need this
ObjectManager.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	}
}

//this function is also required by g_RENDERLIST
ObjectManager.prototype.drawDebug = function(ctx, xofs, yofs) {
	if (this.drawDebugFunc) {
		this.drawDebugFunc.call(this, ctx, xofs, yofs);
	}
}

//STATIC DRAW FUNCTIONS
//draw all objects in an ObjectManager in one go on a single layer
ObjectManager.drawActiveObjects = function(ctx, xofs, yofs) {
	for (var i = 0; i < this.objects.length; ++i) {
		if (this.objects[i].ACTIVE) {
			this.objects[i].draw(ctx, xofs, yofs);
		}
	}	
}

//draws only inactive objects as points in red
ObjectManager.drawInactiveObjectsPos = function(ctx, xofs, yofs) {
	var currentColor = ctx.strokeStyle;
	ctx.strokeStyle = "rgb(255,0,0)";

	for (var i = 0; i < this.objects.length; ++i) {
		if (!this.objects[i].ACTIVE) {
			Util.drawPoint(ctx, this.objects[i].pos.x + xofs, this.objects[i].pos.y + yofs);
		}
	}

	ctx.strokeStyle = currentColor;
}


//brute force algorithm that checks all objects distance squared and returns the nearest
//not to be used when there are a lot of objects!
ObjectManager.prototype.getNearestObject = function(pos) {
	var nearestObject = null;
	var nearestObjectDistanceSqr = 99999999;
	var currentObjectDistanceSqr;
	for (var i = 0; i < this.objects.length; ++i) {
		currentObjectDistanceSqr = pos.distSq(this.objects[i].pos);
		if (currentObjectDistanceSqr < nearestObjectDistanceSqr) {
			nearestObjectDistanceSqr = currentObjectDistanceSqr;
			nearestObject = this.objects[i];
		}
	}
	return nearestObject;
}