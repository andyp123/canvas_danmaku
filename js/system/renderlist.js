
/* RENDER LIST *****************************************************************
A list to which objects are added each frame and then drawn.
The benefit of this system is that it supports sorting of objects
so that they can be assigned to layers and have priority within
that layer and thus be drawn in the correct order automatically.

Functions that are expected of objects added to the RenderList:
draw(ctx, xofs, yofs) //standard draw function. REQUIRED
drawDebug(ctx, xofs, yofs) //debug draw function. not required unless RenderList.drawDebug is called
addDrawCall() //function that adds object to RenderList. not required, but it is recommended
	
Usage:
*add each object to the renderlist
*in the main draw function, call in this order
RENDERLIST.sort(); 
RENDERLIST.draw(ctx, cam);
RENDERLIST.drawDebug(ctx, cam, 0); //optional, 0 is the layer to draw debug for.
RENDERLIST.clear();

TODO:
+fix parallax
 -make it possible to set up layers that do not use parallax at all (see next item)
 -make it possible to manually set parallax amount per layer
+layer modifiers
 -function that affects the position of the objects in a layer based on the layer
 -can be as simple as parallax or screenshake, but it is possible to bind any function
 
*IDEA*
+store hash table of layer modifiers (a function)
 -the hash starts empty
+when drawing an object, check to see if the layer has a modifier associated with it
 -if no function is registered, use the default transform (draw relative to camera)
 -if a function is registered, transform the x,y of the object when drawing using that function
   -could be parallax
   -could be a special interface screen relative type things
*/

/* RENDER LIST NODE *
Objects added to the RenderList are stored in a node along with a couple of
bits of useful information to aid sorting and drawing.
*/
function RenderListNode() {
	this.object = null;
	this.layer = 0;
	this.priority = 0;
	this.screenRelative = false; //if screenRelative, do not offset using cam position or parallax
}

RenderListNode.prototype.set = function(object, layer, priority, screenRelative) {
	this.object = object;
	this.layer = layer || 0;
	this.priority = priority || 0;
	this.screenRelative = screenRelative || false;
}

RenderListNode.prototype.toString = function() {
	var rv;
	if (this.object) rv = this.object.toString();
	else rv = new String("NULL");
	rv += " | " + this.layer;
	rv += " | " + this.priority;
	return rv;
}

//sort objects a and b
RenderListNode.sort = function(a, b) {
	if (a.object != null && b.object != null) {
		if (a.layer != b.layer) return (a.layer - b.layer);
		else return (a.priority - b.priority);
	} else if (a.object == null && b.object == null) {
		return 0;
	}
	if (a.object == null) return 1; //sort null to back of array!
	else return -1;
}

/* RENDER LIST *
*/
function RenderList() {
	this.objects = new Array(RenderList.MAX_OBJECTS);
	this.numObjects = 0;
	
	for (var i = 0; i < RenderList.MAX_OBJECTS; i++) {
		this.objects[i] = new RenderListNode();
	}
}

RenderList.MAX_OBJECTS = 128; //should be set to whatever is required. 64 is VERY conservative

//add an object to be rendered
RenderList.prototype.addObject = function(object, layer, priority, screenRelative) {
	if (this.numObjects < RenderList.MAX_OBJECTS) {
		this.objects[this.numObjects].set(object, layer, priority, screenRelative);
		this.numObjects++;
	} else {
		var msg = new String("RenderList.addObject: MAX_OBJECTS (");
		msg += this.numObjects + "/" + RenderList.MAX_OBJECTS + ") reached. Object not added";
		alert(msg);
	}
}

//sort all objects
RenderList.prototype.sort = function() {
	this.objects.sort(RenderListNode.sort);
}

//draw all objects (assumes list is sorted)
RenderList.prototype.draw = function(ctx, cameraX, cameraY) {
	var xofs, yofs;
	for (var i = 0; i < this.numObjects; i++) {
		if (this.objects[i].screenRelative) {
			xofs = 0;
			yofs = 0;
		} else {
			//xofs = (this.objects[i].layer * 0.05 * cameraX) - cameraX;
			//yofs = (this.objects[i].layer * 0.05 * cameraY) - cameraY;
			xofs = -cameraX;
			yofs = -cameraY;
		}
		this.objects[i].object.draw(ctx, xofs, yofs);
	}
}

//draw debug for a particular layer (assumes list is sorted)
RenderList.prototype.drawDebug = function(ctx, cameraX, cameraY, layer) {
	var xofs, yofs;
	var i = 0;
	while (this.objects[i].layer != layer && i < this.numObjects) i++;
	while (this.objects[i].layer == layer && i < this.numObjects) {
		if (this.objects[i].screenRelative) {
			xofs = 0;
			yofs = 0;
		} else { //parallax disabled for now
			//xofs = (this.objects[i].layer * 0.05 * cameraX) - cameraX;
			//yofs = (this.objects[i].layer * 0.05 * cameraY) - cameraY;
			xofs = -cameraX;
			yofs = -cameraY;
		}
		this.objects[i].object.drawDebug(ctx, xofs, yofs);
		i++;
	}
}

//clear objects array for next frame
RenderList.prototype.clear = function() {
	while (this.numObjects > 0) {
		this.objects[--this.numObjects].set(null);
	}
}

RenderList.prototype.toString = function() {
	var rv = new String("<b>RenderList.objects (");
	rv += this.numObjects + "/" + RenderList.MAX_OBJECTS + ")</b><br><i>object type</i> | <i>layer</i> | <i>priority</i><br>";
	for (var i = 0; i < this.numObjects; i++) {
		rv += this.objects[i].toString() + "<br>";
	}
	return rv;
}

