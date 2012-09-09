/* PARTICLE SYSTEM *************************************************************
*/
function Particle() {
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(0, 0);
	this.startTime = 0;
	this.frame = 0;
	this.frameWait = 3;
	this.ACTIVE = false
}

function ParticleSystem(MAX_PARTICLES, spawnFunc, updateFunc, drawFunc, sprite) {
	this.particles = [];
	this.numParticles = MAX_PARTICLES;
	this.numActiveParticles = 0;
	this.spawnFunc = spawnFunc || null;
	this.updateFunc = updateFunc || null;
	this.drawFunc = drawFunc || null;
	this.sprite = sprite || null;
	this.pos = new Vector2(0, 0);
	this.vel = new Vector2(1, 0);
	this.gravity = new Vector2(0, 0);
	this.startTime = 0;
	this.systemDuration = 1000;
	this.particleDuration = 1000;
	
	//spawn control parameters
	this.spawnDuration = 1; //spawn particles unless this is 0. < 0 means spawn forever
	this.spawnCount = 1; //number of particles to spawn when spawning
	this.spawnDelay = 1; //frames to delay before next spawning
	this.nextSpawn = 0; //time (in frames) to next spawn at
	this.spawnForce = 100; //force/speed applied to spawned particles
	this.spawnRadius = 64; //for radius based spawn functions such as the trails

	this.layer = 0;
	this.priority = 0;
	this.ACTIVE = false;
	
	var i = MAX_PARTICLES;
	while (i--) {
		this.particles[i] = new Particle();
	}
}

ParticleSystem.colour_default = "rgb(255,255,255)";
ParticleSystem.colour_debug = "rgb(0,255,0)";

ParticleSystem.prototype.getMaxParticles = function() {
	return this.particles.length;
}

ParticleSystem.prototype.setNumParticles = function(numParticles) {
	if (numParticles < 0) {
		this.numParticles = 0;
	} else if (numParticles > this.particles.length) {
		this.numParticles = this.particles.length;
	} else {
		this.numParticles = numParticles;
	}	
}

//resets states and activates
ParticleSystem.prototype.activate = function() {
	var i = this.particles.length;
	while (i--) {
		this.particles[i].ACTIVE = false;
	}
	this.numActiveParticles = 0;
	this.nextSpawn = 0;
	this.startTime = g_GAMETIME_MS;
	this.ACTIVE = true;
}

ParticleSystem.prototype.spawn = function() {
	if (this.spawnFunc) {
		if (this.spawnDuration != 0 && g_GAMETIME_FRAMES >= this.nextSpawn) {
			this.spawnFunc.call(this);
		}
	}
}

ParticleSystem.prototype.update = function() {
	if (this.spawnDuration < 0 || g_GAMETIME_MS < this.startTime + this.spawnDuration) {
		this.spawn();
	}
	if (this.systemDuration < 0 || g_GAMETIME_MS < this.startTime + this.systemDuration) {
		if (this.updateFunc) {
			this.updateFunc.call(this);
		}
	} else {
		var i = this.numParticles;
		while (i--) {
			this.particles[i].ACTIVE = false;
		}
		this.numActiveParticles = 0;
		this.ACTIVE = false;
	}
}

ParticleSystem.prototype.draw = function(ctx, xofs, yofs) {
	if (this.drawFunc) {
		this.drawFunc.call(this, ctx, xofs, yofs);
	} else {
		this.drawDebug(ctx, xofs, yofs);
	}
}

ParticleSystem.prototype.drawDebug = function(ctx, xofs, yofs) {
	var x, y;
	var i = this.numParticles;
	while (i--) {
		x = Math.floor(this.particles[i].pos.x + xofs) - 1; //-1 to draw from centre
		y = Math.floor(this.particles[i].pos.y + yofs) - 1;
		ctx.fillRect(x, y, 2, 2);
	}
}

ParticleSystem.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, this.layer, this.priority, false);
}

ParticleSystem.prototype.toString = function() {
	return "ParticleSystem";
}

ParticleSystem.prototype.toString_verbose = function() {
	var rv = new String("ParticleSystem: ");
	rv += (this.ACTIVE) ? "[1] ap: " : "[0] ap: "; 
	rv += this.numActiveParticles + " src: ";
	if (this.sprite) rv += this.sprite.img.src;
	return rv;
}

/* PARTICLE SYSTEM FUNCTIONS *
SF - Spawn Function
UF - Update Function
DF - Draw Function
*/
//DEFAULT FUNCTIONS
//spawns all particles in 1 frame in circular pattern
ParticleSystem.SF_default = function() {
	var i = this.numParticles;
	var angle = 2 * Math.PI / i;
	while (i--) {
		this.particles[i].vel.setAngle(angle * i);
		this.particles[i].vel.mul(this.spawnForce * g_FRAMETIME_S);
		this.particles[i].pos.equals(this.pos);
		this.particles[i].startTime = g_GAMETIME_MS;
		this.particles[i].ACTIVE = true;
		this.particles[i].frame = 0;
	}
	this.numActiveParticles = this.numParticles; //all spawned at once
}

//moves particles linearly by summing pos and vel
ParticleSystem.UF_default = function() {
	var i = this.numParticles;
	while (i--) {
		if (this.particles[i].ACTIVE) {
			if (g_GAMETIME_MS > this.particles[i].startTime + this.particleDuration) {
				this.particles[i].ACTIVE = false;
				this.numActiveParticles--;
			} else {
				this.particles[i].pos.add(this.particles[i].vel);
			}
		}
	}
}

//draw particles as white dots
ParticleSystem.DF_default = function(ctx, xofs, yofs) {
	var x, y;
	var i = this.numParticles;
	ctx.fillStyle = ParticleSystem.colour_default;
	while (i--) {
		if (this.particles[i].ACTIVE) {
			x = Math.floor(this.particles[i].pos.x + xofs) - 2; //-1 to draw from centre
			y = Math.floor(this.particles[i].pos.y + yofs) - 2;
			ctx.fillRect(x, y, 4, 4);
		}
	}
}

//draw particles as sprites
ParticleSystem.DF_genericSprite = function(ctx, xofs, yofs) {
	if (this.sprite) {
		var i = this.numParticles;
		while (i--) {
			if (this.particles[i].ACTIVE) {
				this.sprite.draw(ctx, this.particles[i].pos.x + xofs,
									  this.particles[i].pos.y + yofs,
									  this.particles[i].frame);
			}
		}
	}
}

//used for testing
ParticleSystem.init_default = function(ps, sprite, numParticles) {
	if (sprite) ps.sprite = sprite;
	ps.spawnFunc = ParticleSystem.SF_default;
	ps.updateFunc = ParticleSystem.UF_default;
	ps.drawFunc = ParticleSystem.DF_default;
	ps.numParticles = numParticles;
	ps.systemDuration = 500;
	ps.particleDuration = 500;
	ps.spawnDuration = 1;
	ps.spawnForce = 200;
	ps.activate();
}


/* PARTICLE SYSTEM MANAGER *
Manages a list of particle systems and handles updates if required so that simple
effects such as explosions can be fire and forget from external code. However, if
required, a system can be reserved and managed externally. This will stop the
manager allowing a reference to the system being passed to any other object.
When not reserved, a particle system can only be used when not already active.
*/
function ParticleSystemManager(MAX_SYSTEMS, MAX_PARTICLES) {
	this.systems = [];
	
	var i = MAX_SYSTEMS;
	while (i--) {
		this.systems[i] = new ParticleSystem(MAX_PARTICLES);
		this.systems[i].MANAGER_RESERVED = false; //specifies whether or not external code manages this system
	}
}

ParticleSystemManager.prototype.reserve = function() {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && !this.systems[i].ACTIVE) {
			this.systems[i].MANAGER_RESERVED = true;
			return this.systems[i];
		}
	}
	return null;
}

ParticleSystemManager.prototype.release = function(particleSystem, fade) {
	particleSystem.MANAGER_RESERVED = false;
	if (fade) {
		particleSystem.spawnDuration = 0; //stop spawning new particles
		particleSystem.systemDuration = g_GAMETIME_MS - particleSystem.startTime + 1000; //default to fade over 1000ms
	} else {
		particleSystem.ACTIVE = false;
	}
}

ParticleSystemManager.prototype.update = function() {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && this.systems[i].ACTIVE) {
			this.systems[i].update();
		}
	}
}

ParticleSystemManager.prototype.addDrawCall = function() {
	var i = this.systems.length;
	while (i--) {
		if (this.systems[i].ACTIVE) {
			this.systems[i].addDrawCall();
		}
	}
}

ParticleSystemManager.prototype.spawnEffect = function(initFunc, sprite, numParticles, x, y, layer, priority) {
	var i = this.systems.length;
	while (i--) {
		if (!this.systems[i].MANAGER_RESERVED && !this.systems[i].ACTIVE) {
			if (numParticles < 0) numParticles = 0; //0 is kind of pointless... but whatever
			else if (numParticles > this.systems[i].getMaxParticles()) numParticles = this.systems[i].getMaxParticles();
			
			initFunc.call(this, this.systems[i], sprite, numParticles);
			this.systems[i].pos.set(x, y);
			this.systems[i].layer = layer || 0;
			this.systems[i].priority = priority || 0;
			break;
		}
	}
}

ParticleSystemManager.prototype.toString = function() {
	var rv = new String("<b>ParticleSystemManager</b><br>");
	var i = this.systems.length;
	var used = 0;
	while (i--) {
		if (this.systems[i].ACTIVE || this.systems[i].MANAGER_RESERVED) {
			rv += i + ": " + this.systems[i];
			if (this.systems[i].MANAGER_RESERVED) rv += "[RES]<br>";
			else rv += "<br>";
			used++;
		}
	}
	rv += "<b>used: " + used + "/" + this.systems.length + "</b><br>";
	return rv;
}