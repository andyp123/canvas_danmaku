
/* SCRATCH POOL ***************************************************************
Pool of objects (e.g. Vector2) that can be used at any time in order to do
calculations without allocating and freeing new objects every frame (which is
likely to lead to frequent garbage collection pauses).

Usage:
The constructor takes the constructor of the type of object that should be
pooled and the number of objects to create in the pool. Note that the constructor
should be enclosed in an anonymous function as shown in the example below.
var VECTORPOOL = new ScratchPool(function() { return new Vector2(0, 0); }, 16);
VECTORPOOL.use(); //store current pointer
	var temp1 = VECTORPOOL.get().zero(); //get a vector2 for use
	var temp2 = VECTORPOOL.get().zero(); //get another
VECTORPOOL.done(); //reset pointer to state before use() was called

NOTE: Objects returned by the pool will be in the state they were in when last used,
	so be careful to reset them before use!
*/
function ScratchPool(OBJECT_CONSTRUCTOR, POOL_SIZE) {
	this.objects = [];
	this.index = POOL_SIZE;
	this.lastIndex = []; //stack of values of index at last call to get()
	
	while (this.index) {
		this.index -= 1;
		this.objects[this.index] = OBJECT_CONSTRUCTOR();
	}
}

ScratchPool.prototype.use = function() {
	this.lastIndex.push(this.index);
}

ScratchPool.prototype.get = function() {
	if (this.index < this.objects.length) {
		return this.objects[this.index++];
	} else {
		alert(("ERROR: Max pool size (" + this.objects.length + ") reached. Call ScratchPool.done() to reset pointer"));
	}
}

ScratchPool.prototype.done = function() {
	if (this.lastIndex.length) {
		this.index = this.lastIndex.pop();
	}
}

ScratchPool.prototype.reset = function() {
	this.lastIndex = [];
	this.index = 0;
}

