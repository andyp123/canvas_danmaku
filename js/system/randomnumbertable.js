
/* RANDOM NUMBER TABLE *********************************************************
Allows use of Math.random() to be easily limited to a set number of calls per
frame. Stores numbers generated in an array and allows either a specific index
to be retrieved (for sequence critical calculations, which can't be truely
random) or the last index used + 1 (for cases where sequence doesn't matter,
such as particle effects.)

Whilst this can be used with the standard Math.random(), it was intended to be
used with seedrandom.js, written by David Bau, since it allows for seeded random
numbers, which are useful for procedurally generating things the same each time.

seedrandom.js comments note that Math.random() takes around 0.002 ms per call,
so a large array of 128 of these costs around 0.256 ms per frame. Much smaller
arrays are perfectly fine, however. Setting the array size to a prime number
will probably make things seem more random if the get() function is used.

The comments also note that using seedrandom instead of native Math.random is
3-10x slower, so if performance and not seeding are important, then it might be
better to use regular Math.random. In any case, using RandomNumberTable will
allow random use to be more easily budgeted.
*/
function RandomNumberTable(tableSize) {
	if (tableSize < RandomNumberTable.MIN_SIZE) tableSize = RandomNumberTable.MIN_SIZE;
	else if (tableSize > RandomNumberTable.MAX_SIZE) tableSize = RandomNumberTable.MAX_SIZE;
	
	this.table = new Array(tableSize);
	this.index = 0;
	this.generateNumbers();
}

RandomNumberTable.MIN_SIZE = 1;
RandomNumberTable.MAX_SIZE = 128;	
	
//generate new random numbers for the entire table
RandomNumberTable.prototype.generateNumbers = function() {
	for (var i = 0; i < this.table.length; i++) {
		this.table[i] = Math.random();
	}
}

//gets a random number and increments the index
RandomNumberTable.prototype.get = function() {
	if (this.index > this.table.length - 1) this.index = 0;
	return this.table[this.index++];
}

//gets the random number at a specific index (ensures sequence-critical numbers are ok)
RandomNumberTable.prototype.getAt = function(pos) {
	if (pos < 0) pos = 0;
	else if (pos > this.table.length - 1) pos = this.table.length - 1;
	
	return this.table[pos];
}

