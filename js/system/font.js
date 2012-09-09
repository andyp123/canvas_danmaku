/* FONT ************************************************************************
Canvas does not natively support font rendering and using web page elements
have their own problems. The goal of this font class is to provide a fast
font renderer that can render lots of bitmap text to a canvas.

Since it seems like a simple, efficient way to make a variable width font, I've
decided to use the same font format as Dominic Szablewski's ImpactJS font, which
also have the added advantage of the very nice little font generator he has
made, available here: http://impactjs.com/font-tool/

If this code is ever used for anything commercial, it might be best to make a
donation to Dominic for his font tool, or buy an ImpactJS license ($99)
*/

function FontCharacter() {
	this.u = 0; //u coord of the top left corner of this char
	this.w = 0; //width
}

function Font(img) {
	this.img = null;
	this.height = 0;
	this.chars = [];

	var i = 96;
	while (i--) {
		this.chars[i] = new FontCharacter();
	}

	this.init(img);
}

Font.ALIGN_LEFT = 0;
Font.ALIGN_CENTER = 1;
Font.ALIGN_RIGHT = 2;

//initialise the font (needs to read the bottom line of pixels to get widths)
//http://stackoverflow.com/questions/934012/get-image-data-in-javascript
Font.prototype.init = function(img) {
	if (!img || img === this.img) return;
	//set the general parameters of the font
	this.img = img;
	this.height = img.height - 1;
	
	//create a new img.width x 1 pixel canvas for drawing to
	var canvas = document.createElement("canvas"); //this is not actually added to the document!
	canvas.width = img.width;
	canvas.height = 1;
	//draw img into the canvas
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, img.height - 1, img.width, 1, 0, 0, img.width, 1);
	//now it's possible to get the pixel data (SO FUCKING INSANE! WHY CAN'T I GET IT DIRECT FROM THE FUCKING IMAGE!?)
	var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data; //get the data array of the image data object directly
	var firstPixelAlpha = data[3]; //the loop will compare alpha values to this. the first pixel is under a character. differing alpha values indicate a gap
	var pixel, alpha, uStart, charId;
	charId = 0; //character index
	uStart = 0; //u value of first char
	//each pixel consists of 4 values in the array (rgba), this checks the alpha value of the bottom row
	for (pixel = 0, alpha = 3; pixel < img.width; pixel++, alpha += 4) {
		if (data[alpha] != firstPixelAlpha) { //if the alpha is different, the character has ended
			this.chars[charId].u = uStart;
			this.chars[charId].w = pixel - uStart;
			uStart = pixel + 1; //next pixel must be start of new char since we are at blank now
			charId++;
		}
	}
	if (charId < 95) { //there was probably some error reading the font data, so reset and alert the user
		this.img = null;
		this.height = 0;
		alert(("ERROR: There was a problem loading the font with source [" + img.src + "]"));
	}
}

//draws a string (handles standard chars, linebreak (\n) and space
Font.prototype.drawString = function(ctx, x, y, str, charSpacing, align) {
	if (!this.img) return;

	var xofs, yofs, end, i, ch;
	end = str.indexOf("\n", 0); 
	if (end < 0) end = str.length;
	//set offset based on alignment (uses max width of string, accomodating multi-line strings)
	switch (align) { //Please forgive me, programming style god!
		case Font.ALIGN_CENTER: xofs = -this.getStringLength(str, charSpacing, 0, end) * 0.5; break;
		case Font.ALIGN_RIGHT:  xofs = -this.getStringLength(str, charSpacing, 0, end); 	  break;
		default: xofs = 0; break;
	}	
	for (var i = 0, yofs = 0; i < str.length; i++) { //need to handle string starting with multiple "\n"... so this should be at the start
		if (i == end) { //set start, end and offsets
			end = str.indexOf("\n", i+1);
			if (end < 0) end = str.length;
			yofs += this.height;
			switch (align) { //I swear I won't do it again after this loop exits! Have mercy on me!
				case Font.ALIGN_CENTER: xofs = -this.getStringLength(str, charSpacing, 0, end) * 0.5; break;
				case Font.ALIGN_RIGHT:  xofs = -this.getStringLength(str, charSpacing, 0, end); 	  break;
				default: xofs = 0; break;
			}
			continue;
		}
		ch = str.charCodeAt(i); //now handle the char
		if (ch == 32) { //handle space char
			xofs += this.chars[0].w + charSpacing;
			continue;
		} else if (ch < 32 || ch > 127) continue; //ignore chars with no glyph entry in this.chars
		ch = this.chars[ch - 32]; //now we are good to go
		ctx.drawImage(this.img, ch.u, 0, ch.w, this.height, Math.floor(x + xofs), Math.floor(y + yofs), ch.w, this.height);
		xofs += ch.w + charSpacing;
	}
}

//calculates the length of the given string
//if the string contains /n it will return the max line length
Font.prototype.getStringLength = function(str, charSpacing, start, end) {
	if (!this.img) return;
	if (!start) start = 0;
	if (!end) end = str.length;

	var len = 0;
	var maxLen = -999999;
	var ch;
	for (var i = start; i < end; i++) {
		ch = str.charCodeAt(i);
		if (ch == 10) { //line break!
			if (len > maxLen) maxLen = len;
			len = 0;
			continue;
		}
		if (ch < 32 || ch > 127) continue;
		len += this.chars[ch - 32].w + charSpacing;
	}
	if (len > maxLen) maxLen = len;
	return maxLen - charSpacing; //final iteration per line adds one unwanted charSpacing
} 

//output all the chars (u, w)
Font.prototype.toString = function() {
	var rv = "";
	
	for (var i = 0; i < this.chars.length; i++) {
		rv += String.fromCharCode(i + 32) + "(" + i + "): u = " + this.chars[i].u + ", w = " + this.chars[i].w + "<br>";
	}
	
	return rv;
}


/* FONT MANAGER ****************************************************************
A quick and simple font manager class with messaging bits added on (draw message
to screen and leave it there for n ms etc.)
*/
function FM_Message() {
	this.text = null;
	this.font = null;
	this.x = 0;
	this.y = 0;
	this.charSpacing = 0;
	this.align = 0;
	this.removeTime = 0;
}

function FontManager() {
	this.fonts = {};
	this.messages = {};
}

FontManager.prototype.getFont = function(name) {
	if (this.fonts[name] !== undefined) {
		return this.fonts[name];
	} else {
		alert(("ERROR: Font with name [" + name + "] does not exist."));
	}
	return null;
}

FontManager.prototype.addFont = function(name, img) {
	if (this.fonts[name] === undefined) {
		var font = new Font(img);
		if (font.img != null) {
			this.fonts[name] = font;
			return font;
		}
	} else {
		alert(("ERROR: Font with name [" + name + "] already exists."));
	}
	return null;
}

FontManager.prototype.addMessage = function(msgID, text, font, x, y, align, duration) {
	font = this.getFont(font);
	if (font && text) {
		var message;
		if (this.messages[msgID] === undefined) {
			this.messages[msgID] = new FM_Message();
		}
		message = this.messages[msgID];
		message.text = text;
		message.font = font;
		message.x = x;
		message.y = y;
		message.align = align;
		message.removeTime = (duration) ? g_GAMETIME_MS + duration : 0;
	}
}

FontManager.prototype.clearMessage = function(msgID, clearDelay) {
	if (this.messages[msgID] != undefined) {
		if (clearDelay > 0) {
			this.messages[msgID].removeTime = g_GAMETIME_MS + clearDelay;
		} else {
			delete this.messages[msgID];
		}
	}
}

FontManager.prototype.update = function() {
	//remove expired messages
	for (var id in this.messages) {
		if (g_GAMETIME_MS >= this.messages[id].removeTime) {
			delete this.messages[id];
		}
	}
}

FontManager.prototype.draw = function(ctx, xofs, yofs) {
	var msg;
	for (var id in this.messages) {
		msg = this.messages[id];
		msg.font.drawString(ctx, msg.x + xofs, msg.y + yofs, msg.text, msg.charSpacing, msg.align);
	}
}

FontManager.prototype.addDrawCall = function() {
	g_RENDERLIST.addObject(this, 5, 0, true); //draw on layer 5, screen relative
}
