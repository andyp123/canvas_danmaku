/* GLOBAL VARIABLES AND DATA QUEUEING ******************************************
*/
//queue all the texture data in the system
function game_queueData() { 
		var data = [
			"gfx/player.png",
			"gfx/player_option.png",
			"gfx/player_shot.png",
			"gfx/enemy_01.png",
			"gfx/enemy_shot.png",
			"gfx/explosion.png",
			"gfx/background.png",
		];
		g_ASSETMANAGER.queueAssets(data);
		data = [
			"sfx/enemy_explosion.wav",
			"sfx/enemy_shot.wav",
			"sfx/enemy_shot_burst.wav",
			"sfx/player_hit.wav"
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


/* MAIN FUNCTIONS **************************************************************
*/
function game_update() {
	g_PLAYER.update();
	g_GAMEMANAGER.update();
}

function game_draw(ctx, xofs, yofs) {
	g_SCREEN.clear();

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
	if (g_DEBUG) {
		document.getElementById('keystates').innerHTML = g_MOUSE.toString() + "<br>" + g_KEYSTATES.toString() + "<br><b>Camera</b><br>" + g_CAMERA.toString();
	} else {
		document.getElementById('keystates').innerHTML = "";
	}

	if (g_KEYSTATES.isPressed(KEYS.SHIFT)) {
		if (g_KEYSTATES.justPressed(KEYS.S)) g_SOUNDMANAGER.toggleSound();
		if (g_KEYSTATES.justPressed(KEYS.D)) g_DEBUG = !g_DEBUG;
	}
	if (g_DEBUG) {
		if (g_KEYSTATES.isPressed(KEYS.CTRL) && g_MOUSE.left.isPressed()) {
			g_CAMERA.pos.addXY(g_MOUSE.dx, g_MOUSE.dy);
		}
		if (g_KEYSTATES.justPressed(KEYS.C)) {
			g_CAMERA.pos.zero();
		}
	}

	//FIXME: REMOVE THIS!
	if (g_GAMETIME_MS > TEST_nextEnemyTime) {
		//add an enemy
		var obj = g_GAMEMANAGER.enemies.getFreeInstance();
		if (obj) {
			Enemy.instance_DRONE(obj, 32 + Math.random() * (g_SCREEN.width - 64), -32);
			TEST_nextEnemyTime = g_GAMETIME_MS + 1000;
		}
	}

	game_update();
	game_draw(g_SCREEN.context, 0, 0);
}

function game_init() {
	if(g_SCREEN.init('screen', 384, 512)) {	
		g_VECTORSCRATCH = new ScratchPool(function() { return new Vector2(0, 0); }, 16);
		g_ANIMTABLE = {};
		
		//initialise all game objects
		g_CAMERA = new Camera(0, 0);
		g_GAMEMANAGER = new GameManager();
		g_PLAYER = new Player(0, "Player", g_SCREEN.width * 0.5, g_SCREEN.height * 0.75);

		//init debug buttons
		document.getElementById('debug').innerHTML = "<button onclick='(function() { g_DEBUG = !g_DEBUG; })()'>TOGGLE DEBUG</button>";
	}
}


