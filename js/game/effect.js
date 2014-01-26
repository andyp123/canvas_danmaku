/* EFFECT TYPES ***************************************************************
*/
var Effect = {};

Effect.instance_EXPLOSION = function(obj, x, y, angle) {
	if (Effect.EXPLOSION === undefined) {
		var o = new GameObject();
		o.TYPENAME = "Effect.EXPLOSION";
		o.sprite = new Sprite(g_ASSETMANAGER.getAsset("EXPLOSION"), 4, 1);

		o.updateFunc = function() {
			var frame = Math.floor((g_GAMETIME_MS - this.activateTime) / (g_FRAMETIME_MS * 2));
			if (frame > 4) this.deactivate();
			else this.animState.currentFrame = frame;
		}

		Effect.EXPLOSION = o;
	}
	obj.equals(Effect.EXPLOSION);
	obj.offsetXY(x, y);
	obj.activate();
}
