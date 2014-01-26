/* PROJECTILE TYPES *********************************************************************
*/

var Shot = {}; //namespace

Shot.setAngle = function(obj, angle, setFrame) {
	obj.angle = angle || 270 * Util.DEG_TO_RAD;
	obj.vel.setAngle(angle);
	obj.vel.mul(obj.speed);
	if (setFrame) {
		obj.animState.currentFrame = Util.getFrameFromAngle(angle * Util.RAD_TO_DEG, 16, 0, 0, 360);
	}
}

Shot.instance_VULCAN = function(obj, x, y, angle) {
	if (Shot.VULCAN === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Shot.VULCAN";
		o.sprite = new Sprite(g_ASSETMANAGER.getAsset("PLAYER_SHOT"), 1, 1);
		o.speed = 300;
		o.damage = 2;
		o.collisionFlags = GameObject.CF_ENEMY;
		o.CULLING = GameObject.CULL_AUTO;

		o.updateFunc = function() {
			this.pos.x += this.vel.x * g_FRAMETIME_S;
			this.pos.y += this.vel.y * g_FRAMETIME_S;
		}

		o.collisionFunc = function(that) {
			that.takeDamage(this.damage);
			this.deactivate();
		}

		Shot.VULCAN = o;
	}
	obj.equals(Shot.VULCAN);
	obj.offsetXY(x, y);
	Shot.setAngle(obj, angle, false);
	obj.activate();
}

Shot.instance_BALL = function(obj, x, y, angle) {
	if (Shot.BALL === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Shot.BALL";
		o.sprite = new Sprite(g_ASSETMANAGER.getAsset("ENEMY_SHOT"), 1, 1);
		o.speed = 100;
		o.damage = 1;
		o.collisionFlags = GameObject.CF_PLAYER;
		o.CULLING = GameObject.CULL_AUTO;

		o.updateFunc = function() {
			this.pos.x += this.vel.x * g_FRAMETIME_S;
			this.pos.y += this.vel.y * g_FRAMETIME_S;

			//auto timeout (in addition to regular culling)
			if (g_GAMETIME_MS > this.timeout) {
				this.deactivate();

				//create new shots!
				var offsetAngle = Math.random() * 360;
				var numShots = 40;
				for (var i = 0; i < numShots; ++i) {
					var shot = g_GAMEMANAGER.enemyShots.getFreeInstance();
					if (shot) {
						Shot.instance_BALL(shot, this.pos.x, this.pos.y, this.angle + (offsetAngle + 360 / numShots * i) * Util.DEG_TO_RAD);
						shot.owner = this.owner;
						shot.speed = this.speed * 2.0;
						shot.timeout = g_GAMETIME_MS + 10000;
					}
				}
				g_SOUNDMANAGER.playSound("ENEMY_SHOT_BURST");
			}
		}

		o.collisionFunc = function(that) {
			//that.takeDamage(this.damage);
			this.deactivate();
		}

		Shot.BALL = o;
	}
	obj.equals(Shot.BALL);
	obj.offsetXY(x, y);
	Shot.setAngle(obj, angle, false);
	obj.activate();
	obj.timeout = g_GAMETIME_MS + 1500;
}

Shot.instance_HOMING = function(obj, x, y, angle) {
	if (Shot.HOMING === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Shot.HOMING";
		o.sprite = null;
		o.speed = 200;
		o.damage = 10;
		o.collisionFlags = GameObject.CF_ENEMY;

		o.updateFunc = function() {
			//if nextActionTime ready
			//search for player in range
			//if player, make target
			//track towards player with angle limiting per second
			//accelerate gradually
		}

		Shot.HOMING = o;
	}
	obj.equals(Shot.HOMING);
	obj.offsetXY(x, y);
	Shot.setAngle(obj, angle, false);
	obj.activate();
}