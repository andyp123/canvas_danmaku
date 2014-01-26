/* 2D COLLISION FUNCTIONS ******************************************************
Very simple collision library that allows for a few collision types between
points, circles and boxes (AABB only at the moment).
*/

/* CORE FUNCTIONS **************************************************************
*/
var Collision2d = {}; //namespace

Collision2d.test_AABB_XY = function(x1, y1, hw1, hh1, x2, y2) {
	if (Math.abs(x1 - x2) > hw1) return false;
	if (Math.abs(y1 - y2) > hh1) return false;
	return true;	
}

Collision2d.test_AABB_AABB = function(x1, y1, hw1, hh1, x2, y2, hw2, hh2) {
	if (Math.abs(x1 - x2) > hw1 + hw2) return false; //separated by y axis
	if (Math.abs(y1 - y2) > hh1 + hh2) return false; //separated by x axis
	return true;	
}

//get the region a point exists in relative to an AABB
//(see test_AABB_CIRCLE comments below for more information)
Collision2d.AABB_XY_GetRegion = function(x1, y1, hw1, hh1, x2, y2) {
	var xt, yt;
	xt = x2 < (x1 - hw1) ? 0 :
			   (x2 > (x1 + hw1) ? 2 : 1);
	yt = y2 < (y1 - hh1) ? 0 :
			   (y2 > (y1 + hh1) ? 2 : 1);
	return xt + 3 * yt;
}

Collision2d.test_AABB_CIRCLE = function(x1, y1, hw1, hh1, x2, y2, r2) {
	//http://hq.scene.ro/blog/read/circle-box-intersection-revised/
	//zones around aabb as follows:
	// center zone  : 4
	// side zones   : 1, 3, 5, 7
	// corner zones : 0, 2, 6, 8
	var xt, yt, zone; //xt and yt are temporary variables for multiple uses
	xt = x2 < (x1 - hw1) ? 0 :
			   (x2 > (x1 + hw1) ? 2 : 1);
	yt = y2 < (y1 - hh1) ? 0 :
			   (y2 > (y1 + hh1) ? 2 : 1);
	zone = xt + 3 * yt;
	
	switch (zone) {
		case 1: //top and bottom side zones
		case 7:
			xt = Math.abs(y2 - y1);
			if (xt <= (r2 + hh1)) return true;
			break;
		case 3: //left and right zones
		case 5:
			yt = Math.abs(x2 - x1);
			if (yt <= (r2 + hw1)) return true;
			break;
		case 4: //inside zone
			return true;
		default: //inside corner zone
			xt = (zone == 0 || zone == 6) ? x1 - hw1 : x1 + hw1;
			yt = (zone == 0 || zone == 2) ? y1 - hh1 : y1 + hh1;
			return Collision2d.test_CIRCLE_XY(x2, y2, r2, xt, yt);
	}
	return false;
}

Collision2d.test_CIRCLE_XY = function(x1, y1, r1, x2, y2) {
	if ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) > r1 * r1) return false;
	return true;
}

Collision2d.test_CIRCLE_CIRCLE = function(x1, y1, r1, x2, y2, r2) {
	if ((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) > (r1 + r2) * (r1 + r2)) return false;
	return true;
}

Collision2d.test_LINE_LINE = function(x1, y1, x2, y2, x3, y3, x4, y4, rv) {
	//Taken from code by Paul Bourke (theory) and Olaf Rabbachin (c#)
	//http://paulbourke.net/geometry/lineline2d/
	//x1,y1 -> x2,y2 define line 1
	//x3,y3 -> x4,y4 define line 2
	var denom  = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
	var numera = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
	var numerb = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
	var ua, ub;
	
	//are the lines coincident or parallel?
	//if  numera and numerb were both zero, the lines would be on top of
	//each other (coincident). As there is no intersection point in this
	//case, it is not neccessary to check (would be inside the denom == 0.0)
	if (denom == 0.0) {
		return false;
	}

	//the fraction of either line that the point lies at
	//this will be between 0.0 and 1.0 for both points only if there
	//is an intersection between the lines
	ua = numera / denom;
	ub = numerb / denom;

	if(ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0)
	{
		if (rv !== undefined) {
			rv.x = x1 + ua * (x2 - x1);
			rv.y = y1 + ua * (y2 - y1);
		}
		return true;
	}

	return false;
}

Collision2d.test_CIRCLE_LINE = function(cx, cx, cr, lsx, lsy, lex, ley, rv) {
	//get closest point on line segment to circle centre
	//if point is inside circle return true
}

Collision2d.test_AABB_LINE = function(bx, by, bhw, bhh, lsx, lsy, lex, ley, rvStart, rvEnd) {
	//Liang-Barsky implementation
	//http://www.cs.helsinki.fi/group/goa/viewing/leikkaus/intro.html
	//http://www.skytopia.com/project/articles/compsci/clipping.html
	var tmin = 0.0;
	var tmax = 1.0;
	var ldx = lex - lsx; //line end - start = line delta
	var ldy = ley - lsy;
	var p = 0;
	var q = 0;
	var r = 0;
	
	for(var i = 0; i < 4; ++i) //left, right, bottom, top
	{
		if(i == 0) { p = -ldx; q = -(bx - bhw - lsx); }
		if(i == 1) { p = ldx;  q = bx + bhw - lsx; }
		if(i == 2) { p = -ldy; q = -(by - bhh - lsy); }
		if(i == 3) { p = ldy;  q = by + bhh - lsy; }
		if(p == 0 && q < 0) return false; //line parallel to edge
		r = q / p;
		if(p < 0)
		{
			if(r > tmax) return false;
			else if(r > tmin) tmin = r;
		}
		else if(p > 0)
		{
			if(r < tmin) return false;
			else if(r < tmax) tmax = r;
		}
	}
	
	//optionally set intersection start and end and return true
	if (rvStart !== undefined) {
		rvStart.x = lsx + ldx * tmin;
		rvStart.y = lsy + ldy * tmin;
	}
	if (rvEnd !== undefined) {
		rvEnd.x = lsx + ldx * tmax;
		rvEnd.y = lsy + ldy * tmax;
	}
	return true; 
}

//for convenience only
Collision2d.test_AABB_Sprite = function(aabb, sprite, spx, spy) {
	return Collision2d.test_AABB_AABB(aabb.pos.x, aabb.pos.y, aabb.hw, aabb.hh, spx, spy, sprite.frameWidth * 0.5, sprite.frameHeight * 0.5);
}

//returns true only if circle circle2 is completely inside circle1
Collision2d.test_CIRCLE_INSIDE_CIRCLE = function(x1, y1, r1, x2, y2, r2) {
	var dx = x2 - x1;
	var dy = y2 - y1;
	var dr = r1 - r2;
	return dx * dx + dy * dy < dr * dr;
}

/* GENERIC COLLISION OBJECT ****************************************************
Hopefully this should *simplify* things :)
*/
function CollisionBounds(type, px, py, hw, hh) {
	this.type = type || CollisionBounds.TYPE_NONE; //see CollisionBounds.TYPE... below
	this.pos = new Vector2(px, py); //all types use this
	this.hw = hw || 0; //doubles up as radius when type == CollisionBounds.CIRCLE
	this.hh = hh || 0;
}

CollisionBounds.TYPE_NONE = 0; //so it can be enabled/disabled
CollisionBounds.TYPE_POINT = 1;
CollisionBounds.TYPE_CIRCLE = 2;
CollisionBounds.TYPE_AABB = 4;

CollisionBounds.prototype.equals = function(that) {
	this.type = that.type;
	this.pos.equals(that.pos);
	this.hw = that.hw;
	this.hh = that.hh;
}

CollisionBounds.prototype.set = function(type, px, py, hw, hh) {
	this.type = type;
	this.pos.x = px;
	this.pos.y = py;
	this.hw = hw;
	this.hh = hh;	
}

CollisionBounds.prototype.setPOINT = function(px, py) {
	this.type = CollisionBounds.TYPE_POINT;
	this.pos.x = px;
	this.pos.y = py;
	this.hw = 0;
	this.hh = 0;
}

CollisionBounds.prototype.setCIRCLE = function(px, py, radius) {
	this.type = CollisionBounds.TYPE_CIRCLE;
	this.pos.x = px;
	this.pos.y = py;
	this.hw = radius;
	this.hh = 0;
}

CollisionBounds.prototype.setAABB = function(px, py, width, height) {
	this.type = CollisionBounds.TYPE_AABB;
	this.pos.x = px;
	this.pos.y = py;
	this.hw = width * 0.5;
	this.hh = height * 0.5;
}

//generic collision checking function... not sure this is really very efficient, but it is convenient
CollisionBounds.prototype.testCollision = function(that) {
	if (!this.type || !that.type) return false; //either/or TYPE_NONE
	//easy tests
	if (this.type == that.type) {
		switch (this.type) {
			case CollisionBounds.TYPE_POINT: return this.pos.isEqualTo(that.pos);
			case CollisionBounds.TYPE_CIRCLE: return Collision2d.test_CIRCLE_CIRCLE(this.pos.x, this.pos.y, this.hw, that.pos.x, that.pos.y, that.hw);
			case CollisionBounds.TYPE_AABB: return Collision2d.test_AABB_AABB(this.pos.x, this.pos.y, this.hw, this.hh, that.pos.x, that.pos.y, that.hw, that.hh);
		}
	}
	//slightly more annoying tests
	switch (this.type) {
		case CollisionBounds.TYPE_POINT:
			if (that.type == CollisionBounds.TYPE_CIRCLE) return Collision2d.test_CIRCLE_XY(that.pos.x, that.pos.y, that.hw, this.pos.x, this.pos.y);
			if (that.type == CollisionBounds.TYPE_AABB) return Collision2d.test_AABB_XY(that.pos.x, that.pos.y, that.hw, that.hh, this.pos.x, this.pos.y);
			break;
		case CollisionBounds.TYPE_CIRCLE:
			if (that.type == CollisionBounds.TYPE_POINT) return Collision2d.test_CIRCLE_XY(this.pos.x, this.pos.y, this.hw, that.pos.x, that.pos.y);
			if (that.type == CollisionBounds.TYPE_AABB) return Collision2d.test_AABB_CIRCLE(that.pos.x, that.pos.y, that.hw, that.hh, this.pos.x, this.pos.y, this.hw);
			break;
		case CollisionBounds.TYPE_AABB:
			if (that.type == CollisionBounds.TYPE_POINT) return Collision2d.test_AABB_XY(this.pos.x, this.pos.y, this.hw, this.hh, that.pos.x, that.pos.y);
			if (that.type == CollisionBounds.TYPE_CIRCLE) return Collision2d.test_AABB_CIRCLE(this.pos.x, this.pos.y, this.hw, this.hh, that.pos.x, that.pos.y, that.hw);
			break;
		default:
			return false;
	}
}

CollisionBounds.prototype.testCollision_XY = function(x, y) {
	switch (this.type) {
		case CollisionBounds.TYPE_CIRCLE: return Collision2d.test_CIRCLE_XY(this.pos.x, this.pos.y, this.hw, x, y);
		case CollisionBounds.TYPE_AABB: return Collision2d.test_AABB_XY(this.pos.x, this.pos.y, this.hw, this.hh, x, y);
		case CollisionBounds.TYPE_POINT: return this.pos.isEqualToXY(x, y);
		default: return false;
	}
}

CollisionBounds.prototype.draw = function(ctx, xofs, yofs) {
	this.drawDebug(ctx, xofs, yofs);
}

CollisionBounds.prototype.drawDebug = function(ctx, xofs, yofs) {
	switch (this.type) {
		case CollisionBounds.TYPE_POINT:
			ctx.strokeRect(Math.floor(this.pos.x - 1 + xofs) - 0.5, Math.floor(this.pos.y - 1 + yofs) - 0.5, 2, 2);
			break;
		case CollisionBounds.TYPE_AABB:
			ctx.strokeRect(Math.floor(this.pos.x - this.hw + xofs) - 0.5,
						   Math.floor(this.pos.y - this.hh + yofs) - 0.5,
						   Math.floor(this.hw * 2),
						   Math.floor(this.hh * 2));
			break;
		case CollisionBounds.TYPE_CIRCLE:
			ctx.beginPath();
			ctx.arc(this.pos.x + xofs, this.pos.y + yofs, this.hw, 0, 2 * Math.PI, false);
			ctx.closePath();
			ctx.stroke();
			break;
		default:
			break;
	}
}

CollisionBounds.getTypeString = function() {
	switch (this.type) {
		case CollisionBounds.TYPE_NONE: return "NONE";
		case CollisionBounds.TYPE_POINT: return "POINT";
		case CollisionBounds.TYPE_CIRCLE: return "CIRCLE";
		case CollisionBounds.TYPE_AABB: return "AABB";
		default: return "UNKNOWN";
	}
}

CollisionBounds.prototype.toString = function() {
	var rv = "";
	switch (this.type) {
		case CollisionBounds.TYPE_NONE:
			rv += "DISABLED";
			break;
		case CollisionBounds.TYPE_POINT:
			rv += "POINT: " + this.pos.toString();
			break;
		case CollisionBounds.TYPE_CIRCLE:
			rv += "CIRCLE: " + this.pos.toString() + ", r = " + this.hw;
			break;
		case CollisionBounds.TYPE_AABB:
			rv += "AABB: " + this.pos.toString() + ", hw = " + this.hw + ", hh = " + this.hh; 
			break;
		default:
			rv += "UNKNOWN";
	}
	return rv;
}