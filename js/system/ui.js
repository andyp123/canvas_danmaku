/* USER INTERFACE **************************************************************
UI setup:
+objects do not create UI_Items themselves
 -call g_UI.add(NAME, [parent]), which returns the item for customisation
 -call g_UI.remove(FULLNAME), deletes a node and all child nodes
 -call g_UI.get(FULLNAME), returns the node
*/
function UIItem(name) {
	this.name = name;
	this.pos = new Vector2(0, 0);
	this.bounds = new CollisionBounds(CollisionBounds.TYPE_AABB, 0, 0, 16, 16);
	this.padding = 0; //padding used with autoResize
	
	this.color_default = UIItem.COLOR_DEFAULT;
	this.color_hot = UIItem.COLOR_HOT;
	this.color_active = UIItem.COLOR_ACTIVE;
	this.color_disabled = UIItem.COLOR_DISABLED;
	this.color = this.color_default;
	this.styleFlags = 2;
	
	this.sprite = null;
	this.frame_default = 0;
	this.frame_hot = 0;
	this.frame_active = 0;
	this.frame_disabled = 0;
	this.frame = 0;
	
	this.label = null;
	this.labelFont = null;
	this.labelOffsetY = 0;
	this.labelCharSpacing = 0;
	this.labelAlign = Font.ALIGN_CENTER;
	
	this.hot = false;
	this.active = false;
	this.enabled = true;
	this.visible = true;
	this.fallThrough = false; //never becomes hot or active. hover and clicks fall through to whatever is below.
	this.autoSize = false; //call autoResize when an element is added, removed or hidden
	
	this.clickFunc = null; //called when the item is clicked on
	this.clickFuncArgs = []; //argument list for clickFunc
	this.parent = null;
	this.children = [];
	
	this.layer = 1;
	this.priority = 0;
}

//default colours
UIItem.COLOR_DEFAULT = "rgb(0,255,0)";
UIItem.COLOR_HOT = "rgb(255,0,0)";
UIItem.COLOR_ACTIVE = "rgb(255,0,255)";
UIItem.COLOR_DISABLED = "rgb(96,96,96)";

//style flags
UIItem.STYLE_NONE = 0; //do not draw anything
UIItem.STYLE_FILL = 1; //draw fill
UIItem.STYLE_OUTLINE = 2; //draw outline
UIItem.STYLE_ICON = 4; //draw icon if available
UIItem.STYLE_LABEL = 8; //draw label if set and font available

//called on mouseover
UIItem.prototype.setHot = function() {
	this.color = (this.active) ? this.color_active : this.color_hot;
	this.frame = (this.active) ? this.frame_active : this.frame_hot;
	this.hot = true;
}

//call on mouseout
UIItem.prototype.clearHot = function() {
	if (this.enabled) {
		this.color = (this.active) ? this.color_active : this.color_default;
		this.frame = (this.active) ? this.frame_active : this.frame_default;
	}
	this.hot = false;
}

//called on click
UIItem.prototype.setActive = function() {
	this.color = this.color_active;
	this.frame = this.frame_active;
	this.active = true;
	
	if (this.clickFunc) {
		this.clickFunc.apply(this, this.clickFuncArgs);
	}
}

//called on lose focus
UIItem.prototype.clearActive = function() {
	if (this.enabled) {
		this.color = (this.hot) ? this.color_hot : this.color_default;
		this.frame = (this.hot) ? this.frame_hot : this.frame_default;
	}
	this.active = false;
}

//resize and move children based on their size... ugh... assumes a single row of items for simplicity. For now.
UIItem.prototype.autoResize = function() {
	var width = 0;
	var height = this.bounds.hh - this.padding; //use current height - padding to start with
	var i = this.children.length;
	while (i--) {
		if (this.children[i].visible) {
			width += this.children[i].bounds.hw + this.padding * 0.5; //padding needs to be in here to support resize that ignores hidden nodes
			if (this.children[i].bounds.hh >  height) height = this.children[i].bounds.hh;
		}
	}
	width = width * 2 + this.padding;
	height = height * 2 + this.padding * 2;
	this.bounds.hw = width * 0.5;
	this.bounds.hh = height * 0.5;
	
	//since everything is aligned from the centre (hmmm...) need to get the initial x and y
	var x = this.pos.x + width * 0.5; //start on right!
	var y = this.pos.y;
	var childNode = null;
	i = this.children.length;
	while (i--) {
		childNode = this.children[i];
		if (childNode.visible) {
			x = x - this.padding - childNode.bounds.hw;
			this.children[i].moveToXY(x, y); //set position
			x -= childNode.bounds.hw;
		}
	}
	
	if (this.parent) {
		this.parent.autoResize()
	}
}

//set up the sprite, frames and optionally the size from the sprite
UIItem.prototype.setSprite = function(sprite, frames, useSpriteSize) {
	this.sprite = sprite;
	this.frame_default = frames[0];
	this.frame_hot = frames[1];
	this.frame_active = frames[2];
	this.frame_disabled = frames[3];
	this.frame = this.frame_default;
	if (useSpriteSize) {
		this.bounds.hw = sprite.frameWidth * 0.5;
		this.bounds.hh = sprite.frameHeight * 0.5;
	}
}

//set text label (set text to null to not draw... "" will call the Font.drawString, but won't actually render anything
UIItem.prototype.setLabel = function(text, offsetY, align, charSpacing, font, useLabelSize) {
	this.label = text;
	this.labelOffsetY = offsetY;
	this.labelAlign = align;
	this.labelCharSpacing = charSpacing || 0; //optional
	this.labelFont = font || this.labelFont; //font is optional, since it might already have been set
	if (useLabelSize) {
		this.bounds.hw = this.labelFont.getStringLength(this.label, this.labelCharSpacing) * 0.5 + 4;
		this.bounds.hh = this.labelFont.height * 0.5;
		this.labelOffsetY = -this.bounds.hh;
		this.labelAlign = Font.ALIGN_CENTER;
	} else {
		this.labelOffsetY = offsetY;
		this.labelAlign = align;	
	}
}

UIItem.prototype.setSize = function(width, height) {
	this.bounds.hw = width * 0.5;
	this.bounds.hh = height * 0.5;
}

UIItem.prototype.hide = function() { this.setVisibility(false); }
UIItem.prototype.show = function() { this.setVisibility(true); }
UIItem.prototype.setVisibility = function(visibility) {
	if (visibility != this.visible) {
		if (!visibility) {
			this.clearHot();
			this.clearActive();
		}
		this.visible = visibility;
		if (this.parent && this.parent.autoSize) {
			this.parent.autoResize();
		}
	}
}

UIItem.prototype.disable = function() { this.setEnabledness(false); }
UIItem.prototype.enable = function() { this.setEnabledness(true); }
UIItem.prototype.setEnabledness = function(enabledness) { //no, it isn't a real word
	if (enabledness) {
		this.enabled = true;
		this.color = this.color_default;
		this.frame = this.frame_default;
	} else {
		this.enabled = false;
		this.color = this.color_disabled;
		this.frame = this.frame_disabled;
		this.clearActive();
	}
	var i = this.children.length;
	while (i--) {
		this.children[i].setEnabledness(enabledness);
	}
}

//copy the style of the parent node
UIItem.prototype.inheritParentStyle = function() {
	if (this.parent) {
		this.styleFlags = this.parent.styleFlags;
		this.color_default = this.parent.color_default;
		this.color_active = this.parent.color_active;
		this.color_hot = this.parent.color_hot;
		this.color_disabled = this.parent.color_disabled;
		this.color = this.color_default; //should only be called on creation so will not be active or hot
	}
}

//add child node
UIItem.prototype.addChild = function(child) {
	this.children[this.children.length] = child;
	child.parent = this;
	child.inheritParentStyle();
	if (this.autoSize) {
		this.autoResize();
	}
}

//use this to move UI_Items...
UIItem.prototype.offsetXY = function(x, y) {
	this.pos.addXY(x, y);
	this.bounds.pos.addXY(x, y);
	var i = this.children.length;
	while (i--) {
		this.children[i].offsetXY(x, y);
	}	
}

//use this to move UI_Items to a specific position
UIItem.prototype.moveToXY = function(x, y) {
	x -= this.pos.x;
	y -= this.pos.y;
	this.offsetXY(x, y);
}

//find the lowest level node that is under the cursor by recursive collision checks
UIItem.prototype.getHotNode = function(bounds) {
	var currentNode;
	var hotNode = null;
	
	if (this.bounds.testCollision(bounds)) {
		var i = this.children.length;
		while (i--) {
			currentNode = this.children[i];
			if (currentNode.visible && currentNode.enabled) {
				hotNode = currentNode.getHotNode(bounds);
				if (hotNode) break; //stop when a node is found since this doesn't deal with overlap and sorting
			}
		}
		if (!hotNode && !this.fallThrough) hotNode = this;
	}
	
	return hotNode;
}

//go through and remove all children whilst building a list of names
UIItem.prototype.removeChildren = function(nodeNames) {
	var i = this.children.length;
	while (i--) {
		this.children[i].removeChildren(nodeNames); //will add all relative node names to the list
		nodeNames[nodeNames.length] = this.children[i].name; //add the child name
	}
	this.children = [];
	if (this.autoSize) this.autoResize();
	return nodeNames; //now we have a list of the nodes removed, they can be removed from the UI (manager)
}

//remove a specific child node and all its children
UIItem.prototype.removeChild = function(childNode, nodeNames) {
	var i = this.children.length;
	while (i--) { //find the node
		if (this.children[i] === childNode) {
			this.children[i].removeChildren(nodeNames);
			nodeNames[nodeNames.length] = this.children[i].name; //add its name to the list
			this.children.splice(i, 1); //remove the child
			if (this.autoSize) this.autoResize();
			break; //removed it so break
		}
	}
	return nodeNames;
}

UIItem.prototype.draw = function(ctx, xofs, yofs) {
	if (this.styleFlags & UIItem.STYLE_FILL && this.color) {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.pos.x - this.bounds.hw + xofs, this.pos.y - this.bounds.hh + yofs, this.bounds.hw * 2, this.bounds.hh * 2);
	}
	if (this.styleFlags & UIItem.STYLE_OUTLINE && this.color) {
		ctx.strokeStyle = this.color;
		ctx.strokeRect(Math.floor(this.pos.x - this.bounds.hw + xofs) + 0.5, Math.floor(this.pos.y - this.bounds.hh + yofs) + 0.5, this.bounds.hw * 2, this.bounds.hh * 2);
	}
	if (this.styleFlags & UIItem.STYLE_ICON && this.sprite) {
		this.sprite.draw(ctx, this.pos.x + xofs, this.pos.y + yofs, this.frame);
	}
	if (this.styleFlags & UIItem.STYLE_LABEL && this.label && this.labelFont) {
		this.labelFont.drawString(ctx, this.pos.x + xofs, this.pos.y + this.labelOffsetY + yofs, this.label, this.labelCharSpacing, this.labelAlign);
	}
	var i = this.children.length;
	while (i--) {
		if (this.children[i].visible) {
			this.children[i].draw(ctx, xofs, yofs);
		}
	}
}

UIItem.prototype.drawDebug = function(ctx, xofs, yofs) {
	//draw this node
	this.bounds.drawDebug(ctx, xofs, yofs);
	//draw children on top
	var i = this.children.length;
	while (i--) {
		if (this.children[i].visible) {
			this.children[i].draw(ctx, xofs, yofs);
		}
	}
}


UIItem.prototype.addDrawCall = function() {
	if (!this.parent && this.visible) { //draw is recursive so limit to only top level nodes
		g_RENDERLIST.addObject(this, this.layer, this.priority, false);
	}
}

UIItem.prototype.toString = function() {
	return ("UIItem [" + this.name + "]");
}



/* USER INTERFACE **************************************************************
*/
function UI() {
	this.nodes = {}; //a single UIItem
	this.topNodes = {}; //the top level nodes that have no parent node
	
	this.hotNode = null; //mouse is inside this node
	this.activeNode = null; //has focus
	this.modalNode = null; //if this is not null, only check for input on this menu (set on show/hide)
	
	this.hotSound = null; //sounds to play on hover and click
	this.activeSound = null;
}

//set hot and active nodes and call clickFunc (via setActive)
UI.prototype.setHotNode = function(bounds, setActive) {
	var hotNode = null;
	var prevHotNode = this.hotNode; //store previous hotNode;
	
	//try to find a hot node
	var node, nodeName;	
	if (this.modalNode == null) { //if no modalNode, check all nodes
		for (nodeName in this.topNodes) {
			node = this.topNodes[nodeName];
			if (node.enabled && node.visible) {
				hotNode = node.getHotNode(bounds);
				if (hotNode) {
					hotNode.hot = true;
					break; //if we hit a node, we're done
				}
			}
		}
	} else { //only check the modalNode
		hotNode = this.modalNode.getHotNode(bounds);
		if (hotNode) {
			hotNode.hot = true;
		}
	}
	
	//set hot / active parameters
	if (hotNode !== prevHotNode) { //set hot node
		if (prevHotNode) {
			prevHotNode.clearHot();
		}
		if (hotNode) {
			hotNode.setHot();
			if (this.hotSound) {
				g_SOUNDMANAGER.playSound(this.hotSound);
			}
		}
		this.hotNode = hotNode;
	}
	if (setActive) { //set active node
		if (this.activeNode && this.activeNode !== this.hotNode) {
			this.activeNode.clearActive();
			if (this.modalNode) { //hide the modal node if the user clicks off it
				this.hide(this.modalNode.name);
			}
		}
		this.activeNode = this.hotNode;
		if (this.activeNode) {
			this.activeNode.setActive();
			if (this.activeSound) {
				g_SOUNDMANAGER.playSound(this.activeSound);
			}
		}
	}
	
	if (this.hotNode) return true; //this tells the caller that the mouse is on the menu
	else return false; //or not
}

//check a node exists
UI.prototype.exists = function(name) {
	if (this.nodes[name] !== undefined) {
		return true;
	}
	return false;
}

//get a specific node (requires full name!)
UI.prototype.get = function(name) {
	if (this.nodes[name] !== undefined) {
		return this.nodes[name];
	} else {
		alert(("ERROR: Node [" + name + "] does not exist"));
		return null;
	}
}

//add a new node to the UI
UI.prototype.add = function(name, parentName) {
	var fullName;
	if (parentName) fullName = parentName + "|" + name;
	else fullName = name;

	var node, parent;
	node = null;
	if (this.nodes[fullName] === undefined) {
		if (!parentName) { //create a top level node
			node = new UIItem(fullName);
			this.nodes[name] = node;
			this.topNodes[name] = node;
		} else { //parent node to another
			if (this.nodes[parentName] !== undefined) { //but only if it exists
				node = new UIItem(fullName);
				parent = this.nodes[parentName];
				parent.addChild(node);
				this.nodes[fullName] = node;
			} else {
				alert(("ERROR: The parent node [" + parentName + "] does not exist"));
			}
		}
	}
	return node;
}

//remove a node and all its children from the UI
UI.prototype.remove = function(name) {
	var node, nodeNames;
	if (this.nodes[name] !== undefined) {
		node = this.nodes[name];
		nodeNames = [];
		if (node.parent) { //remove the node from its parent
			nodeNames = node.parent.removeChild(node, nodeNames);
		} else { //is a top level node
			nodeNames = node.removeChildren(nodeNames);
			nodeNames[nodeNames.length] = name; //in this case we must manually delete the node after its children
			delete this.topNodes[name];
		}
		
		//remove all nodes from the nodes list
		var i = nodeNames.length
		while (i--) {
			delete this.nodes[nodeNames[i]];
		}
	}
}

//helper functions
UI.prototype.show = function(name) {
	var node = this.get(name);
	if (node) {
		node.setVisibility(true);
		if (node === this.modalNode) { //showing as a regular menu so disable modal status
			this.modalNode = null;
		}
	}
}

//show a menu item and set it to be the only thing that can receive input
UI.prototype.showAsModal = function(name) {
	var node = this.get(name);
	if (node) {
		node.setVisibility(true);
		this.modalNode = node;
	}
}

UI.prototype.hide = function(name) {
	var node = this.get(name);
	if (node) {
		node.setVisibility(false);
		if (node === this.modalNode) {
			this.modalNode = null;
		}
	}
}

UI.prototype.enable = function(name) {
	var node = this.get(name);
	if (node) {
		node.setEnabledness(true);
	}
}

UI.prototype.disable = function(name) {
	var node = this.get(name);
	if (node) {
		node.setEnabledness(false);
	}
}

//adds all top level nodes to render list separately so they can be put on different layers if required
UI.prototype.addDrawCall = function() {
	for (var nodeName in this.topNodes) {
		this.topNodes[nodeName].addDrawCall();
	}
}

//list all nodes
UI.prototype.toString = function() {
	var rv = "";
	for (var nodeName in this.nodes) {
		rv += nodeName + "<br>";
	}
	return rv;
}