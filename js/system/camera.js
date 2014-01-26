/* CAMERA *********************************************************************
Very simple camera class
*/
function Camera(x, y) {
	this.pos = new Vector2(x, y);
}

Camera.prototype.toString = function() {
	var rv = new String("Camera: ");
	rv += this.pos;
	return rv;
}