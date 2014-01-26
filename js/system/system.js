/* SYSTEM CLASSES **************************************************************
Screen, mouse, keyboard etc. go here.

Note that mouse actions, keyup, keydown and window.onblur and onfocus are all 
assigned in this file. They can be rebound, but the functionality of these
classes may no longer work as intended.

TODO:
+disable certain browser behaviour that causes problems for games
+timer, pause/unpause game support
 -g_GAMETIME_MS etc should become the game timer (pauseable
 -sys_TIME_MS should be the system timer used for menus (not pauseable)
 -alternatively a timer class should be made
+loading bar during data load
+add double buffering support to screen
+look into RequestAnimationFrame support for screen
*/

//objects in global namespace
var g_KEYSTATES = new KeyStates();
var g_MOUSE = new Mouse();
var g_SCREEN = new Screen(true);
var g_RENDERLIST = new RenderList();
var g_ASSETMANAGER = new AssetManager();
var g_SOUNDMANAGER = new SoundManager();

//global variables
var g_FRAMERATE = 60;
var g_FRAMETIME_MS = Math.ceil(1000.0 / g_FRAMERATE);
var g_FRAMETIME_S = 1.0 / g_FRAMERATE;
var g_GAMETIME_MS = Math.ceil(1000.0 / g_FRAMERATE);
var g_GAMETIME_FRAMES = 0;

var g_INIT_SUB = null; //user init func
var g_MAIN_SUB = null;

var sys_UPDATE_INTERVAL_ID = -1;


/* SYS_STARTUP *****************************************************************
Takes a user init and main function along with the desired framerate
(update interval) and starts the game running, temporarily passing
control to user code during both main and init before taking it back.
This allows the system to update various system variables without the
user having to do any extra work.
<body onload='sys_startup(myInit, myMain, 60'><!--STUFF--></body>
*/
function sys_startup(initFunc, mainFunc, framerate) {
	//set framerate
	g_FRAMERATE = framerate;
	g_FRAMETIME_MS = Math.ceil(1000 / g_FRAMERATE);
	g_FRAMETIME_S = 1.0 / g_FRAMERATE;
	
	g_INIT_SUB = initFunc;
	g_MAIN_SUB = mainFunc;
	
	g_ASSETMANAGER.loadAssets(sys_init);
}

function sys_init() {
	//alert if there was an error (note that this must be improved to use asset manager output)
	if (g_ASSETMANAGER.loadError()) {
		alert("ERROR: some textures could not be loaded. See log for details");
		g_ASSETMANAGER.purge();
	}
	//call users init func
	g_INIT_SUB();
	
	//start main function running (uses anonymous function to avoid immediate execution)
	sys_UPDATE_INTERVAL_ID = setInterval(function() { sys_main(); }, g_FRAMETIME_MS);
}

function sys_main() {
	//do system stuff
	g_GAMETIME_MS += g_FRAMETIME_MS;
	g_GAMETIME_FRAMES++;
	g_MOUSE.dx = g_MOUSE.dx - g_MOUSE.x;
	g_MOUSE.dy = g_MOUSE.dy - g_MOUSE.y;
	
	//call users main function
	g_MAIN_SUB();
	
	//more system stuff
	g_MOUSE.dx = g_MOUSE.x;
	g_MOUSE.dy = g_MOUSE.y;
	g_KEYSTATES.anyKeyJustPressed = false;
	g_KEYSTATES.anyKeyJustReleased = false;
}

/* SCREEN **********************************************************************
A simple container for basic screen related functions
*/
function Screen(useTouch) {
	this.canvas = null;
	this.context = null;
	this.width = 0;
	this.height = 0;
	this.posX = 0; //used, but this is a hack!
	this.posY = 0;
	this.clearColor = "rgb(64,64,64)";
	this.clearAlpha = 1.0; //unused
	this.useTouch = useTouch || false;
}

Screen.prototype.init = function(id, width, height) {
	this.canvas = document.getElementById(id);
	if (this.canvas != null) {
		this.context = this.canvas.getContext('2d');
		this.setSize(width, height);
		this.posX = this.canvas.offsetLeft;
		this.posY = this.canvas.offsetTop;
		
		if (this.useTouch) this.addTouchEventListeners();

		return true;
	}
	alert("canvas with id \'" + id + "\' could not be found");
	return false;
}

//hacked in single touch support to emulate mouse
Screen.prototype.addTouchEventListeners = function() {
	var mouse = g_MOUSE;
	mouse.touchID = -1;

	this.canvas.addEventListener('touchstart', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.targetTouches;
		if (touches.length > 0 && mouse.touchID == -1) {
			mouse.x = touches[0].pageX - g_SCREEN.posX;
			mouse.y = touches[0].pageY - g_SCREEN.posY;
			mouse.left.press();
			mouse.touchID = touches[0].identifier;
		}
	}, false);

	this.canvas.addEventListener('touchend', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			if (touches[i].identifier == mouse.touchID) {
				mouse.left.release();
				mouse.touchID = -1;
				return;
			}
		}
	}, false);

	this.canvas.addEventListener('touchmove', function(event) {
		event.preventDefault();

		var mouse = g_MOUSE;
		var touches = event.changedTouches;
		for (var i = 0; i < touches.length; ++i) {
			if (touches[i].identifier == mouse.touchID) {
				mouse.x = touches[i].pageX - g_SCREEN.posX;
				mouse.y = touches[i].pageY - g_SCREEN.posY;
				return;
			}
		}
	}, false);

	// disable accidental right click menu activation (hopefully)
	this.canvas.addEventListener('onContextMenu', function(event) {
		event.preventDefault();
	}, false);

	this.canvas.addEventListener('onblur', function(event) {
		var mouse = g_MOUSE;
		mouse.touchID = -1;
	});	
}

Screen.prototype.clear = function() {
	if (this.context != null) {
		//this.context.clearRect(0, 0, this.width, this.height);
		this.context.fillStyle = this.clearColor;
		this.context.fillRect(0, 0, this.width, this.height);
	}
}

Screen.prototype.setSize = function(width, height) {
		if(width) {
			this.canvas.width = width;
			this.width = width;
		}
		if (height) {
			this.canvas.height = height;
			this.height = height;
		}
}


/* KEYBOARD STATES *************************************************************
a place to store the state of all keys and the time they were pressed or released

javascript character codes
13 - ENTER
27 - ESCAPE
32 - SPACE (ascii)
37-40 - LEFT,UP,RIGHT,DOWN
48-57 - 0-9 (ascii)
65-90 - A-Z (ascii)
*/
function ButtonState() {
	this.state = false;	//true/false = pressed/released
	this.time = 0;		//time of the last state change
	this.lastHoldDuration = 0; //duration button was last held before being released
}

ButtonState.prototype.press = function() {
	if (this.state == false) { //only set state if it has changed
		this.state = true;
		this.time = g_GAMETIME_MS;
	}
}

ButtonState.prototype.release = function() {
	if (this.state == true) {
		this.state = false;
		this.lastHoldDuration = g_GAMETIME_MS - this.time;
		this.time = g_GAMETIME_MS;
	}
}

ButtonState.prototype.isPressed = function() {
	return this.state;
}

ButtonState.prototype.justPressed = function() {
	return (this.state && g_GAMETIME_MS - this.time == g_FRAMETIME_MS);
}

ButtonState.prototype.justReleased = function() {
	return (!this.state && g_GAMETIME_MS - this.time == g_FRAMETIME_MS);
}

ButtonState.prototype.justReleasedAfterHeldFor = function(time) {
	return (this.justReleased() && this.lastHoldDuration >= time);
}

ButtonState.prototype.duration = function() {
	return g_GAMETIME_MS - this.time;
}


function KeyStates() {
	this.states = new Array(256);
	this.anyKeyJustPressed = false;
	this.anyKeyJustReleased = false;
	var i;
	for (i = 0; i < 256; i++) {
		this.states[i] = new ButtonState();
	}
}

//to make sure keys are not held down when the canvas element loses focus
KeyStates.prototype.releaseAll = function() {
	for (var i = 0; i < 256; i++) {
		this.states[i].release();
		this.states[i].lastHoldDuration = 0;
	}
	this.anyKeyJustPressed = false;
	this.anyKeyJustReleased = false;
}

KeyStates.prototype.getState = function(keyCode) {
	if (keyCode < 0 || keyCode > 255) {
		return this.keyStates[0];
	} else {
		return this.states[keyCode];
	}
}

KeyStates.prototype.isPressed = function(keyCode) {
	return this.states[keyCode].state;
}

KeyStates.prototype.justPressed = function(keyCode) {
	return (this.states[keyCode].state == true && g_GAMETIME_MS - this.states[keyCode].time == g_FRAMETIME_MS);
}

KeyStates.prototype.justReleased = function(keyCode) {
	return (this.states[keyCode].state == false && g_GAMETIME_MS - this.states[keyCode].time == g_FRAMETIME_MS);
}

KeyStates.prototype.justReleasedAfterHeldFor = function(keyCode, time) {
	return this.states[keyCode].justReleasedAfterHeldFor(time);
}

KeyStates.prototype.duration = function(keyCode) {
	return g_GAMETIME_MS - this.states[keyCode].time;
}

KeyStates.prototype.toString = function() {
	var rv = "<b>Key States</b><br>";
	var i;
	for (i = 0; i < 256; i++) {
		if (this.states[i].state == true) {
			rv += i + " : " + (g_GAMETIME_MS - this.states[i].time) + " : " + this.states[i].lastHoldDuration + "<br>";
		}
	}
	return rv;
}


/* MOUSE ***********************************************************************
simple container for mouse input
*/
function Mouse() {
	this.x = 0;
	this.y = 0;
	this.dx = 0;
	this.dy = 0;
	this.left = new ButtonState();
	this.right = new ButtonState();
	this.outsideScreen = true;
	this.ignoreOutsideClicks = true;
}

//releases the buttons (doesn't touch x or y)
Mouse.prototype.releaseAll = function() {
	this.left.release();
	this.right.release();
	this.left.lastHoldDuration = 0;
	this.right.lastHoldDuration = 0;
}

Mouse.prototype.toString = function() {
	var rv = new String("<b>Mouse State</b><br> ");
	rv += this.x + ", " + this.y + " (";
	rv += this.dx + ", " + this.dy + ")";
	if (this.outsideScreen) rv += " [OUT]";
	else rv += "[IN]";
	if (this.left.state) rv += ", LMB = " + this.left.duration();
	if (this.right.state) rv += ", RMB = " + this.right.duration();
	if (this.touchID !== undefined) rv += ", touchID = " + this.touchID;
	else rv += ", [TOUCH DISABLED]";
	return rv;
}


/* EVENT BINDINGS **************************************************************
Change these only if neccessary
TODO:
+use addEventListener to move these into the relevant classes if possible
*/
document.onkeydown = function(e) {
	g_KEYSTATES.anyKeyJustPressed = true;
    g_KEYSTATES.states[e.keyCode].press();
}

document.onkeyup = function(e) {
	g_KEYSTATES.anyKeyJustReleased = true;
	g_KEYSTATES.states[e.keyCode].release();
}

document.onmousedown = function(e) {
	if (!(g_MOUSE.ignoreOutsideClicks && g_MOUSE.outsideScreen)) {
		if (e.button == 0) g_MOUSE.left.press();
		else if (e.button == 2) g_MOUSE.right.press();
	}
}

document.onmouseup = function(e) {
	if (e.button == 0) g_MOUSE.left.release();
	else if (e.button == 2) g_MOUSE.right.release();
}

document.onmousemove = function(e) {
	e = e || window.event;

	if (e.pageX || e.pageY) {
		g_MOUSE.x = e.pageX;
		g_MOUSE.y = e.pageY;
	}
	else {
		g_MOUSE.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		g_MOUSE.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
	}
	
	g_MOUSE.x -= g_SCREEN.posX;
	g_MOUSE.y -= g_SCREEN.posY;
	
	if (g_MOUSE.x < 0 || g_MOUSE.x > g_SCREEN.width || g_MOUSE.y < 0 || g_MOUSE.y > g_SCREEN.height) {
		g_MOUSE.outsideScreen = true;
	} else {
		g_MOUSE.outsideScreen = false;
	}
}

//clear event states when the window loses focus
window.onblur = function() {
	g_KEYSTATES.releaseAll();
	g_MOUSE.releaseAll();
}

window.onfocus = function() {
	g_KEYSTATES.releaseAll();
	g_MOUSE.releaseAll();
}

//prevent text being selected and breaking shit (only supported in some browsers)
document.onselectstart = function() {
    return false;
};


/* KEY NAME > CODE MAPPING *
http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
This *may* not be correct for all browsers / OS configurations!
*/

var KEYS = {
	BACKSPACE : 8,
	TAB : 9,
	ENTER : 13,
	SHIFT : 16,
	CTRL : 17,
	ALT : 18,
	PAUSE : 19,
	CAPSLOCK : 20,
	ESCAPE : 27,
	SPACE : 32,
	PAGEUP : 33,
	PAGEDOWN : 34,
	END : 35,
	HOME : 36,
	LEFT : 37,
	UP : 38,
	RIGHT : 39,
	DOWN : 40,
	INSERT : 45,
	DELETE : 46,
	_0 : 48,
	_1 : 49,
	_2 : 50,
	_3 : 51,
	_4 : 52,
	_5 : 53,
	_6 : 54,
	_7 : 55,
	_8 : 56,
	_9 : 57,
	A : 65,
	B : 66,
	C : 67,
	D : 68,
	E : 69,
	F : 70,
	G : 71,
	H : 72,
	I : 73,
	J : 74,
	K : 75,
	L : 76,
	M : 77,
	N : 78,
	O : 79,
	P : 80,
	Q : 81,
	R : 82,
	S : 83,
	T : 84,
	U : 85,
	V : 86,
	W : 87,
	X : 88,
	Y : 89,
	Z : 90,
	LEFTOS : 91,
	RIGHTOS : 92,
	SELECT : 93,
	NP_0 : 96,
	NP_1 : 97,
	NP_2 : 98,
	NP_3 : 99,
	NP_4 : 100,
	NP_5 : 101,
	NP_6 : 102,
	NP_7 : 103,
	NP_8 : 104,
	NP_9 : 105,
	MULTIPLY : 106,
	ADD : 107,
	SUBTRACT : 109,
	DECIMALPOINT : 110,
	DIVIDE : 111,
	F1 : 112,
	F2 : 113,
	F3 : 114,
	F4 : 115,
	F5 : 116,
	F6 : 117,
	F7 : 118,
	F8 : 119,
	F9 : 120,
	F10 : 121,
	F11 : 122,
	F12 : 123,
	NUMLOCK : 144,
	SCROLLLOCK : 145,
	SEMICOLON : 186,
	EQUALS : 187,
	COMMA : 188,
	DASH : 189,
	PERIOD : 190,
	FORWARDSLASH : 191,
	GRAVEACCENT : 192,
	OPENBRACKET : 219,
	BACKSLASH : 220,
	CLOSEBRACKET : 221,
	SINGLEQUOTE : 222
};