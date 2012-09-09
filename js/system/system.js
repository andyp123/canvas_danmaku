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

//objects in global namespacemo
var g_KEYSTATES = new KeyStates();
var g_MOUSE = new Mouse();
var g_SCREEN = new Screen();
var g_RENDERLIST = new RenderList();
var g_ASSETMANAGER = new AssetManager();
var g_SOUNDMANAGER = new SoundManager();

//global variables
var g_FRAMERATE = 60;
var g_FRAMETIME_MS = Math.ceil(1000.0 / g_FRAMERATE);
var g_FRAMETIME_S = 1.0 / g_FRAMERATE;
var g_GAMETIME_MS = Math.ceil(1000 / g_FRAMERATE);
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
function Screen() {
	this.canvas = null;
	this.context = null;
	this.width = 0;
	this.height = 0;
	this.posX = 0;
	this.posY = 0;
	this.clearColor = "128, 128, 128"; //unused
	this.clearAlpha = 1.0; //unused
}

Screen.prototype.init = function(id, width, height) {
	this.canvas = document.getElementById(id);
	if (this.canvas != null) {
		this.context = this.canvas.getContext('2d');
		this.setSize(width, height);
		this.posX = this.canvas.offsetLeft;
		this.posY = this.canvas.offsetTop;
		return true;
	}
	alert("canvas with id \'" + id + "\' could not be found");
	return false;
}

Screen.prototype.clear = function() {
	if (this.context != null) {
		this.context.clearRect(0, 0, this.width, this.height);
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
