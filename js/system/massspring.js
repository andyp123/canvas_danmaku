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
	//calculate new velocity (uses symplectic method for integration)
	var invMass = (this.mass != 0.0) ? 1.0 / this.mass : 99999999.0;
		invMass *= g_FRAMETIME_S;
	var nextVelX = this.vel.x + invMass * (-this.friction * this.vel.x - this.springConstant * (this.pos.x - this.targetPos.x) + this.gravity.x * this.mass);
	var nextVelY = this.vel.y + invMass * (-this.friction * this.vel.y - this.springConstant * (this.pos.y - this.targetPos.y) + this.gravity.y * this.mass);

	//update position and velocity
	this.pos.x += nextVelX * g_FRAMETIME_S;
	this.pos.y += nextVelY * g_FRAMETIME_S;
	this.vel.set(nextVelX, nextVelY);
}

MassSpring.prototype.setSpringParameters = function(mass, friction, springConstant) {
	this.mass = mass;
	this.friction = friction;
	this.springConstant = springConstant;
}


/* MASS SPRING TIE *
ties two objects (e.g. player and camera) together via a mass spring
*/
function MassSpringTie() {
	this.massSpring = new MassSpring();
	this.obj_leader = null;
	this.obj_follow = null;
	this.offset = new Vector2();
	this.integerMovement = true;
}

MassSpringTie.prototype.update = function() {
	this.massSpring.targetPos.equals(this.obj_leader.pos);
	this.massSpring.update();
	if (this.integerMovement) {
		this.obj_follow.pos.set(Math.round(this.massSpring.pos.x + this.offset.x), Math.round(this.massSpring.pos.y + this.offset.y));
	} else {
		this.obj_follow.pos.set(this.massSpring.pos.x + this.offset.x, this.massSpring.pos.y + this.offset.y);
	}
}

MassSpringTie.prototype.setSpringParameters = function(mass, friction, springConstant) {
	this.massSpring.mass = mass;
	this.massSpring.friction = friction;
	this.massSpring.springConstant = springConstant;
}

MassSpringTie.prototype.setPos = function() {
	var pos = this.obj_leader.pos;
	this.massSpring.pos.equals(pos);
	this.massSpring.targetPos.equals(pos);
	this.obj_follow.pos.equals(pos);

}