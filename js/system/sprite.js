/* SPRITE AND ANIMATION ********************************************************
Simple sprite class that can display a single frame image or an indicated
frame from a multi-frame image (assumed frame order TL->BR)

TODO:
+add rotation to sprite draw method
*/


/* ANIM STRING TO ANIM ARRAY ***************************************************
This function takes a string in the form "0-7:3,6-1", "1,2,3,5,8,13" etc.
and returns an array of parameters to be interpreted by the animation system.
The returned array takes the following form:
{start, end, time, start, end, time ...}
<start>-<end> is a range
:<time> sets the number of game frames to display each animation frame for

4 becomes { 4, 4, -1 }
4:30 becomes { 4, 4, 30 }
0-7 becomes { 0, 7, -1 }
0-7:3 becomes { 0, 7, 3 }
-1 indicates that the default time value should be used.
*/
function parseAnim(astr) {
	var str = new String(astr);
	var cmdStrArr = str.split(','); //array of commands as strings
	var cmdArr = new Array(); //array that will be returned
	var start, end, time; //parameters to be written to cmdArr
	
	var temp;
	for (var i = 0; i < cmdStrArr.length; i++) {
		temp = cmdStrArr[i].split(':');
		if (temp.length == 2) { //time parameter contained!
			time = parseInt(temp[1], 10);
		} else {
			time = SpriteAnimState.DEFAULT_FRAME_DURATION;
		}
		
		temp = temp[0].split('-');
		if (temp.length == 2) { //range, not single frame
			start = parseInt(temp[0], 10);
			end = parseInt(temp[1], 10);
		} else {
			start = parseInt(temp[0], 10);
			end = start;
		}
		
		cmdArr[cmdArr.length] = start;
		cmdArr[cmdArr.length] = end;
		cmdArr[cmdArr.length] = time;
	}
	return cmdArr;
}

//debug method that tests validity of an array
function validateAnimArray(arr) {
	if (arr.length == 0) return false;
	for (var i = 0; i < arr.length; i++)
	{
		if (isNaN(arr[i])) {
			return false;
		}
	}
	return true;
}


/* SPRITE **********************************************************************
very simple sprite class that supports animation
*/
function Sprite(img, framesX, framesY, numFrames, alignment) {
	this.img = img;
	this.framesX = framesX || 1;
	this.framesY = framesY || 1;
	this.numFrames = numFrames || (this.framesX * this.framesY);
	this.frameWidth = Math.floor(this.img.width / this.framesX);
	this.frameHeight = Math.floor(this.img.height / this.framesY);
	this.offsetX = 0;
	this.offsetY = 0;
	if (alignment === undefined) alignment = Sprite.ALIGN_CENTER;
	this.setOffset(alignment); //default to center alignment
}

//alignment constants
Sprite.ALIGN_CENTER = 0; //default for sprite
Sprite.ALIGN_TOP_LEFT = 1; //default for canvas (0, 0 is image top left corner)
Sprite.ALIGN_TOP = 2;
Sprite.ALIGN_TOP_RIGHT = 3;
Sprite.ALIGN_RIGHT = 4;
Sprite.ALIGN_BOTTOM_RIGHT = 5;
Sprite.ALIGN_BOTTOM = 6;
Sprite.ALIGN_BOTTOM_LEFT = 7;
Sprite.ALIGN_LEFT = 8;

//long but simple function to set offsetX and offsetY.
//resulting offset is preset + xofs, yofs
Sprite.prototype.setOffset = function(preset, xofs, yofs) {
	switch (preset) {
		case Sprite.ALIGN_CENTER:
			this.offsetX = -this.frameWidth * 0.5;
			this.offsetY = -this.frameHeight * 0.5;
			break;
		case Sprite.ALIGN_TOP_LEFT:
			this.offsetX = 0;
			this.offsetY = 0;
			break;
		case Sprite.ALIGN_TOP:
			this.offsetX = -this.frameWidth * 0.5;
			this.offsetY = 0;
			break;
		case Sprite.ALIGN_TOP_RIGHT:
			this.offsetX = -this.frameWidth;
			this.offsetY = 0;
			break;
		case Sprite.ALIGN_RIGHT:
			this.offsetX = -this.frameWidth;
			this.offsetY = -this.frameHeight * 0.5;
			break;
		case Sprite.ALIGN_BOTTOM_RIGHT:
			this.offsetX = -this.frameWidth;
			this.offsetY = -this.frameHeight;
			break;
		case Sprite.ALIGN_BOTTOM:
			this.offsetX = -this.frameWidth * 0.5;
			this.offsetY = -this.frameHeight;
			break;
		case Sprite.ALIGN_BOTTOM_LEFT:
			this.offsetX = 0;
			this.offsetY = -this.frameHeight;
			break;
		case Sprite.ALIGN_LEFT:
			this.offsetX = 0;
			this.offsetY = -this.frameHeight * 0.5;
			break;
		default: //leave offset alone
			break;
	}
	
	if (xofs !== undefined && yofs !== undefined) {
		this.offsetX += xofs;
		this.offsetY += yofs;
	}
}

Sprite.prototype.draw = function(ctx, x, y, frame)
{
	frame = frame || 0;
	x = Math.floor(x + this.offsetX);
	y = Math.floor(y + this.offsetY);
	
	if (this.numFrames > 1) { 
		var xofs, yofs;
		if (frame < 0 || frame >= this.numFrames) return;
		if (this.framesY > 1) { //need to figure out frame as x,y index
			xofs = frame % this.framesX;
			yofs = Math.floor((frame - xofs) / this.framesX);
			xofs *= this.frameWidth;
			yofs *= this.frameHeight;
			ctx.drawImage(this.img, xofs, yofs, this.frameWidth, this.frameHeight, x, y, this.frameWidth, this.frameHeight);
		} else { //slightly quicker calculation as no y coord needed
			xofs = frame * this.frameWidth;
			ctx.drawImage(this.img, xofs, 0, this.frameWidth, this.frameHeight, x, y, this.frameWidth, this.frameHeight);
		}
	} else {
		ctx.drawImage(this.img, x, y);
	}
}

//draw the outline of the sprite
Sprite.prototype.drawDebug = function(ctx, x, y) {
	x = Math.floor(x + this.offsetX);
	y = Math.floor(y + this.offsetY);
	ctx.strokeRect(Math.floor(x) - 0.5, Math.floor(y) - 0.5, this.frameWidth, this.frameHeight);
}

Sprite.prototype.toString = function() {
	var src = this.img.src;
	return "SPRITE: " + src;
}

/* SPRITE ANIMATION STATE ******************************************************
Handles the animation parameters generated by the parseAnim function
by storing all the current parameters and updating as requested.
playbackState =
  0 - Don't animate
  n - Play n times
  -1 - Loop forever
anim - an animation array reference
animIndex - index into the anim array (first param in 3 param group)
currentFrame - current frame
firstFrame - first frame of current anim command
lastFrame - last frame of curent anim command
nextFrameIn - next frame in number of frames remaining

Animations should be stored in the class the animation belongs to as
static variables defined as thus:
function Enemy() {
	this.animState = new SpriteAnimState();
}

Enemy.sprite = new Sprite(enemyImage, 16, 4, 4);

Enemy.ANIM_WALK = parseAnim("0-7,6-1");
Enemy.ANIM_JUMP = parseAnim("8-9,10:6,9-8");

Whilst the sprite should be stored statically somewhere, the animation
state should be created anew for each instance of an animated object unless
everything being in sync is desired. The anim variable containing the list
of frames for an animation should, however, be stored statically.
*/
function SpriteAnimState(anim, playbackState) {
	this.anim = anim || null;
	this.animIndex = 0;
	this.currentFrame = (this.anim) ? this.anim[0] : 0;
	this.firstFrame = (this.anim) ? this.anim[0] : 0;
	this.lastFrame = (this.anim) ? this.anim[1] : 0;
	this.nextFrameIn = (this.anim) ? this.anim[2] : 0;
	this.playbackState = playbackState || 0;
	this.playbackCount = 0; //increment each time anim played as a way to store a useful state for triggering other events
}

//can change this depending on game framerate. This is for 10fps animation at 60fps
SpriteAnimState.DEFAULT_FRAME_DURATION = 6;

SpriteAnimState.prototype.equals = function(o) {
	this.anim = o.anim;
	this.animIndex = o.animIndex;
	this.currentFrame = o.currentFrame;
	this.firstFrame = o.firstFrame;
	this.lastFrame = o.lastFrame;
	this.nextFrameIn = o.nextFrameIn;
	this.playbackState = o.playbackState;
	this.playbackCount = o.playbackCount;
}

SpriteAnimState.prototype.reset = function() {
	this.animIndex = 0;
	this.currentFrame = this.anim[0];
	this.firstFrame = this.anim[0];
	this.lastFrame = this.anim[1];
	this.nextFrameIn = this.anim[2];
	this.playbackState = 0;
	this.playbackCount = 0;
}

SpriteAnimState.prototype.setAnim = function(anim, playbackState) {
	this.anim = anim;
	this.reset();
	this.playbackState = playbackState || 0;
}

SpriteAnimState.prototype.update = function() {
	if (!this.anim || !this.playbackState) return; //quit if not ready
	
	if (this.nextFrameIn > 0) {
		this.nextFrameIn--;
	} else { //update frame
		if (this.currentFrame == this.lastFrame) { //update parameters
			this.animIndex += 3;
			if (this.animIndex >= this.anim.length) { //loop
				this.animIndex = 0;
				if (this.playbackState > 0) {
					this.playbackState--;
					this.playbackCount++;
				}
			}
			
			this.firstFrame = this.anim[this.animIndex];
			this.lastFrame = this.anim[this.animIndex + 1];
			this.nextFrameIn = this.anim[this.animIndex + 2];
			this.currentFrame = this.firstFrame;
			
		} else { //simple frame update
			if (this.firstFrame < this.lastFrame) this.currentFrame++;
			else this.currentFrame--;
			this.nextFrameIn = this.anim[this.animIndex + 2];
		}
	}
}

SpriteAnimState.prototype.toString = function() {
	var rv = new String("index:");
	rv += this.animIndex + ", cf:";
	rv += this.currentFrame + ", ff:";
	rv += this.firstFrame + ", lf:";
	rv += this.lastFrame + ", nft:";
	rv += this.nextFrameIn + ", pbs:";
	rv += this.playbackState + ", pbc:";
	rv += this.playbackCount;
	return rv;
}

