/* ENEMY TYPES *****************************************************************
*/

var Enemy = {};

Enemy.instance_DRONE = function(obj, x, y, angle) {
	if (Enemy.DRONE === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Enemy.DRONE";
		o.sprite = null;
		o.health = 20;
		o.angle = 90 * Util.DEG_TO_RAD; //facing down screen at player
		o.bounds.setAABB(0, 0, 48, 32);
		o.collisionFlags = GameObject.CF_PLAYER_SHOTS;
		o.nextActionDelay = 250;
		o.CULLING = GameObject.CULL_AUTO;

		o.updateFunc = function() {
			//check for collisions with player shots
			g_GAMEMANAGER.playerShots.testCollisions(this.bounds);
			g_GAMEMANAGER.playerShots.performCollisionResponse(this);

			//test movement
//			this.moveToXY(g_SCREEN.width * 0.5 + Math.sin(g_GAMETIME_FRAMES * 0.0125) * 64, 64 + Math.cos(g_GAMETIME_FRAMES * 0.0125) * 32);

			this.offsetXY(0, 50 * g_FRAMETIME_S);
			if (this.pos.y > g_SCREEN.height) {
				this.deactivate();
			}

			//shoot
			if (g_GAMETIME_MS >= this.nextActionTime) {
				var shot = g_GAMEMANAGER.enemyShots.getFreeInstance();
				if (shot) {
					Shot.instance_BALL(shot, this.pos.x, this.pos.y, this.angle);
					shot.owner = this;
				}
				this.nextActionTime = g_GAMETIME_MS + this.nextActionDelay;
			}
		}

		o.drawFunc = function(ctx, xofs, yofs) {
			this.bounds.draw(ctx, xofs, yofs);
		}

		o.collisionFunc = function(that) {
			if (this.health <= 0) {
				this.deactivate();
				//console.log(g_GAMETIME_FRAMES + ": " + this.TYPENAME + " was killed by " + that.TYPENAME);
			}
		}

		Enemy.DRONE = o;
	}
	obj.equals(Enemy.DRONE);
	obj.offsetXY(x, y);
	obj.activate();
}