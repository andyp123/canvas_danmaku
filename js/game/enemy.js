/* ENEMY TYPES ****************************************************************
*/
var Enemy = {};

Enemy.instance_DRONE = function(obj, x, y, angle) {
	if (Enemy.DRONE === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Enemy.DRONE";
		o.sprite = new Sprite(g_ASSETMANAGER.getAsset("ENEMY_01"), 1, 1);
		o.health = 20;
		o.angle = 90 * Util.DEG_TO_RAD; //facing down screen at player
		o.bounds.setAABB(0, 0, 32, 24);
		o.collisionFlags = GameObject.CF_PLAYER_SHOTS;
		o.nextActionDelay = 10000;
		o.CULLING = GameObject.CULL_AUTO;

		o.updateFunc = function() {
			//create sin variable based on time
			var sinTime = Math.sin((g_GAMETIME_FRAMES - this.activateTime) * 0.005);

			//check for collisions with player shots
			g_GAMEMANAGER.playerShots.testCollisions(this.bounds);
			g_GAMEMANAGER.playerShots.performCollisionResponse(this);

			//test movement
			//this.offsetXY(sinTime * 30 * g_FRAMETIME_S, 50 * g_FRAMETIME_S);
			this.offsetXY(0, 50 * g_FRAMETIME_S);
			if (this.pos.y > g_SCREEN.height + this.sprite.frameHeight) {
				this.deactivate();
			}

			//shoot
			if (g_GAMETIME_MS >= this.nextActionTime) {
				var shot = g_GAMEMANAGER.enemyShots.getFreeInstance();
				if (shot) {
					Shot.instance_BALL(shot, this.pos.x, this.pos.y, this.angle);
					shot.owner = this;
					//g_SOUNDMANAGER.playSound("ENEMY_SHOT");
				}
				this.nextActionTime = g_GAMETIME_MS + this.nextActionDelay;
			}
		}

		o.collisionFunc = function(that) {
			if (this.health <= 0) {
				var effect = g_GAMEMANAGER.effects.getFreeInstance();
				if (effect) {
					Effect.instance_EXPLOSION(effect, this.pos.x, this.pos.y, this.angle);
					g_SOUNDMANAGER.playSound("ENEMY_EXPLOSION");
				}
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