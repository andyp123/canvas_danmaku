/* CANVAS TENNIS ***************************************************************

*/

/* GLOBAL VARIABLES AND DATA QUEUEING ******************************************
*/
//queue all the texture data in the system
function game_queueData() {
		//g_ASSETMANAGER.queueAsset("FONT_CONSOLE", "gfx/font_profont_12.png"); 
		var data = [
			"gfx/player.png",
			"gfx/player_option.png",
			"gfx/player_shot.png",
			"gfx/shottest.png",
		];
		g_ASSETMANAGER.queueAssets(data);
		data = [
		];
		g_SOUNDMANAGER.loadSounds(data); //sound manager doesn't work in the same way as asset manager, since it does not need to preload sounds - just call .play when the sound is played
}
game_queueData();

//objects
g_VECTORSCRATCH = null; //pool of vectors for temporary use
g_FONTMANAGER = null;
g_CAMERA = null;
g_PLAYAREA = null;
g_GAMESTATE = null;
g_GAMEMANAGER = null;
g_WAVEMANAGER = null;
g_SLOTMANAGER = null;
g_BACKGROUND = null;
g_PARTICLEMANAGER = null;
g_USERINTERFACE = null;
g_ANIMTABLE = null; //table of named animation data

//variables
g_DEBUG = false;

//FIXME: TEMPORARY ONLY, DELETE SOON!
g_PLAYER = null;

/* GAME CLASSES ****************************************************************
*/
/* CAMERA *
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

/* MAIN FUNCTIONS **************************************************************
*/
function game_update() {
	g_PLAYER.update();
	g_GAMEMANAGER.update();
}

function game_draw(ctx, xofs, yofs) {
	g_SCREEN.clear();
	//g_SCREEN.context.strokeStyle = "rgb(255,255,255)";
	//g_SCREEN.context.fillStyle = "rgb(192,192,192)";
	//add stuff to the renderlist
	g_PLAYER.addDrawCall();
	g_GAMEMANAGER.addDrawCall();
	
	//sort and draw everything
	g_RENDERLIST.sort();
	g_RENDERLIST.draw(ctx, g_CAMERA.pos.x, g_CAMERA.pos.y);
	//do any debug drawing etc.
	if (g_DEBUG) {
		g_SCREEN.context.strokeStyle = "rgb(0,255,0)";
		g_SCREEN.context.fillStyle = "rgba(0,255,0,0.5)";
		g_RENDERLIST.drawDebug(ctx, g_CAMERA.pos.x, g_CAMERA.pos.y, 0);
	}
	
	//make sure the renderlist is clear for the next frame
	g_RENDERLIST.clear();
}

//FIXME: DELETE
var TEST_nextEnemyTime = 0;

function game_main() {
	document.getElementById('keystates').innerHTML = g_MOUSE.toString() + "<br>" + g_KEYSTATES.toString() + "<br><b>Camera</b><br>" + g_CAMERA.toString();
	
	if (g_KEYSTATES.justPressed(68)) { //d for debug
		g_DEBUG = !g_DEBUG;
	}
	if (g_DEBUG) {
		if (g_KEYSTATES.isPressed(17) && g_MOUSE.left.isPressed()) { //ctrl + lmb
			g_CAMERA.pos.addXY(g_MOUSE.dx, g_MOUSE.dy);
		}
		if (g_KEYSTATES.justPressed(67)) { //c for camera reset
			g_CAMERA.pos.zero();
		}
	}


	//FIXME: REMOVE THIS!
	if (g_GAMETIME_MS > TEST_nextEnemyTime) {
		//add an enemy
		var obj = g_GAMEMANAGER.enemies.getFreeInstance();
		if (obj) {
			Enemy.instance_DRONE(obj, 32 + Math.random() * (g_SCREEN.width - 64), 0);
			TEST_nextEnemyTime = g_GAMETIME_MS + 1000;
		}
	}

	game_update();
	game_draw(g_SCREEN.context, 0, 0);
}


function game_init_ui() {

}

function game_init() {
	if(g_SCREEN.init('screen', 384, 512)) {	
		g_VECTORSCRATCH = new ScratchPool(function() { return new Vector2(0, 0); }, 16);
		g_ANIMTABLE = {};
		
		//initialise all game objects
		//g_FONTMANAGER = new FontManager(); //init font manager and add fonts
		//g_FONTMANAGER.addFont("FONT_CONSOLE", g_ASSETMANAGER.getAsset("FONT_CONSOLE"));
		//g_PARTICLEMANAGER = new ParticleSystemManager(32, 64); //max 2048 particles total. *Much* less in practice
		
		g_CAMERA = new Camera(0, 0);
		
		//g_UI = new UI();
		//game_init_ui();

		g_GAMEMANAGER = new GameManager();
		


		g_PLAYER = new Player(0, "Player", g_SCREEN.width * 0.5, g_SCREEN.height * 0.75);
	}
}


