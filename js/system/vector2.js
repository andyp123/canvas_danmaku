/* VECTOR2 *********************************************************************
Simple 2d Vector class.
Note that this class deliberately avoids to creation of new objects during
arithmetic operations etc. in order to prevent unneccessary garbage collection
occuring. This can be inconvenient, but if a pool of vectors or scratch pad is
used it is not such a big problem.

Some functions have an XY postfixed clone that take x, y parameters instead of
another vector as it is more convenient in many cases.
*/
function Vector2(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vector2.prototype.equals = function(v) {
	this.x = v.x;
	this.y = v.y;
	return this;
}

Vector2.prototype.toString = function() {
	return "(" + this.x.toFixed(2) + ", " + this.y.toFixed(2) + ")";
}

Vector2.prototype.isEqualTo = function(v) {
	return (this.x == v.x && this.y == v.y);
}

Vector2.prototype.isEqualToXY = function(x, y) {
	return (this.x == x && this.y == y);
}

//NON-STATIC, NON-CONST FUNCTIONS **********************************************
Vector2.prototype.zero = function() {
	this.x = 0;
	this.y = 0;
	return this;
}

Vector2.prototype.set = function(x, y) {
	this.x = x;
	this.y = y;
	return this;
}

Vector2.prototype.add = function(v) {
	this.x += v.x;
	this.y += v.y;
}

Vector2.prototype.sub = function(v) {
	this.x -= v.x;
	this.y -= v.y;
}

Vector2.prototype.mul = function(s) {
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.div = function(s) {
	s = 1.0 / s;
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.neg = function() {
	this.x = -this.x;
	this.y = -this.y;
}

Vector2.prototype.normalize = function() {
	var s = this.x * this.x + this.y * this.y;
	if (s) s = 1.0 / Math.sqrt(s); //avoid divide by zero
	this.x *= s;
	this.y *= s;
}

Vector2.prototype.setLength = function(length) {
	var s = this.x * this.x + this.y * this.y;
	if (!s) return; //can't set length of zero vector
	s = 1.0 / Math.sqrt(s) * length;
	this.x *= s;
	this.y *= s;
}

//x,y input
Vector2.prototype.addXY = function(x, y) {
	this.x += x;
	this.y += y;
}

Vector2.prototype.subXY = function(x, y) {
	this.x -= x;
	this.y -= y;
}

//angle functions assume 1,0 is 0 degrees
//does not keep the original vector magnitude!
Vector2.prototype.setAngle = function(a)
{
	this.x = Math.cos(a);
	this.y = Math.sin(a);
}

//rotate about a pivot point
Vector2.prototype.rotate = function(pivot, angle) {
	var sina = Math.sin(angle);
	var cosa = Math.cos(angle);
	var x = this.x - pivot.x;
	var y = this.y - pivot.y;
	this.x = x * cosa - y * sina + pivot.x;
	this.y = x * sina + y * cosa + pivot.y;
}

//same as above but with precalculated input for sina and cosa for use with groups of points
Vector2.prototype.rotatePrecalculatedSinCos = function(pivot, sina, cosa) {
	var x = this.x - pivot.x;
	var y = this.y - pivot.y;
	this.x = x * cosa - y * sina + pivot.x;
	this.y = x * sina + y * cosa + pivot.y;	
}

//CONST FUNCTIONS **************************************************************
Vector2.prototype.len = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vector2.prototype.lenSq = function() {
	return (this.x * this.x + this.y * this.y);
}

Vector2.prototype.dist = function(v) {
	var dx = v.x - this.x;
	var dy = v.y - this.y;
	return Math.sqrt(dx * dx + dy * dy);
}

Vector2.prototype.distSq = function(v) {
	var dx = v.x - this.x;
	var dy = v.y - this.y;
	return dx * dx + dy * dy;
}

Vector2.prototype.distXY = function(x, y) {
	var dx = x - this.x;
	var dy = y - this.y;
	return Math.sqrt(dx * dx + dy * dy);
}

Vector2.prototype.distSqXY = function(x, y) {
	var dx = x - this.x;
	var dy = y - this.y;
	return dx * dx + dy * dy;
}

Vector2.prototype.getAngle = function() {
	return Math.atan2(this.y, this.x);
}

//STATIC FUNCTIONS *************************************************************
Vector2.s_add = function(a, b, r) {
	r.x = a.x + b.x;
	r.y = a.y + b.y;
}

Vector2.s_sub = function(a, b, r) {
	r.x = a.x - b.x;
	r.y = a.y - b.y;
}

Vector2.s_mul = function(v, s, r) {
	r.x = a.x * s;
	r.y = a.y * s;
}

Vector2.s_div = function(v, s, r) {
	s = 1.0 / s;
	r.x = a.x * s;
	r.y = a.y * s;
}

Vector2.unitVector = function(v, r) {
	var s = 1.0 / Math.sqrt(this.x * this.x + this.y * this.y);
	r.x = v.x * s;
	r.y = v.y * s;
}

Vector2.dot = function(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y;
}
