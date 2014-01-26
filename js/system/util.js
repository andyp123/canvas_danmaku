/* MATH AND BLENDING FUNCTIONS *************************************************
*/

var Util = {};

Util.DEG_TO_RAD = Math.PI / 180.0;
Util.RAD_TO_DEG = 180.0 / Math.PI;

//clamp value to range
Util.clamp = function(x, min, max) {
	if (x < min) return min;
	if (x > max) return max;
	return x;
}

//scale and clamp value
Util.clampScaled = function(x, min, max) {
	if (x < min) return 0.0;
	if (x > max) return 1.0;
	return (x - min) / (max - min);
}

//get smoothed value of x
Util.smoothStep = function(x) {
	return x * x * (3 - 2 * x); //3x^2 - 2x^3 
}

//returns smoothed x where x=1 > 0, x=0.5 > 1, x=1 > 0
Util.bellCurve = function(x) {
	return (Math.sin(2 * Math.PI * x - 0.5 * Math.PI) + 1) * 0.5;
}

/* HANDY FUNCTIONS *************************************************************
*/

/* NEAREST NEIGHBOUR IMAGE SCALING *
based on the following code: http://tech-algorithm.com/articles/nearest-neighbor-image-scaling/
*/
Util.nearestNeighbour = function(pix1, pix2, w1, h1, w2, h2) {
	var xRatio, yRatio, x, y, i1, i2;
	xRatio = w1 / w2;
	yRatio = h1 / h2;
	
	for (x = 0; x < w2; ++x) {
		for (y = 0; y < h2; ++y) {
			i1 = 4 * (Math.floor(y * yRatio) * w1 + Math.floor(x * xRatio));
			i2 = 4 * (y * w2 + x);
		
			pix2[i2]	 = pix1[i1];
			pix2[i2 + 1] = pix1[i1 + 1];
			pix2[i2 + 2] = pix1[i1 + 2];
			//pix2[i2 + 3] = 255;
			//scanline hack
			if (y % 2) pix2[i2 + 3] = 200;
			else pix2[i2 + 3] = 255;
		}
	}
}

Util.copyCanvasScaled = function(canvas1, canvas2) {
	var ctx1, ctx2, src, dst;
	ctx1 = canvas1.getContext('2d');
	ctx2 = canvas2.getContext('2d');

	src = ctx1.getImageData(0, 0, canvas1.width, canvas1.height);
	dst = ctx2.createImageData(canvas2.width, canvas2.height);

	//only bother to scale if the canvas sizes are not the same
	if (canvas1.width != canvas2.width || canvas1.height != canvas2.height) {
		Util.nearestNeighbour(src.data, dst.data, canvas1.width, canvas1.height, canvas2.width, canvas2.height);
		ctx2.putImageData(dst, 0, 0);
	} else {
		ctx2.putImageData(src, 0, 0);
	}
}


//breaks a string up and tries to get a valid function pointer. If no function is found, returns null
//"Dog.bark" > window["Dog"]["bark"] > pointer to Dog.bark
//http://stackoverflow.com/questions/359788/how-to-execute-a-javascript-function-when-i-have-its-name-as-a-string (from Jason Bunting's answer)
Util.stringToFunctionPointer = function(functionName, context) {
	if (!context) context = window; //if no context specified, set global
	var namespaces = functionName.split("."); //"Animal.Dog.bark" > "Animal", "Dog", "bark"
	for (var i = 0; i < namespaces.length; i++) {
		if (context[namespaces[i]] !== undefined) {
			context = context[namespaces[i]]; //gradually builds a pointer to the function
		} else {
			return null;
		}
	}
	return context;
}

//sort an array by specified property
Util.sortByProperty = function(arrayToSort, numericalProperty, descending) {
	var sortFunc = (descending) ? function(a, b) { return b[numericalProperty] - a[numericalProperty]; }
								: function(a, b) { return a[numericalProperty] - b[numericalProperty]; }
	arrayToSort.sort(sortFunc);
}

//get the frame of a sprite containing different frames for different angles
Util.getFrameFromAngle = function(angle, numFrames, startFrameIndex, startFrameAngle, arcAngle){
	//get angle into valid range
	if (angle < 0) angle = Math.abs(arcAngle + angle) % arcAngle;
	else angle = angle % arcAngle ;
	//calculate the frame and return it
	var frame = Math.round(((angle - startFrameAngle) * numFrames) / arcAngle);
	return (frame < numFrames) ? startFrameIndex + frame : startFrameIndex;
}

//check if a specific object is an array
Util.objectInArray = function(obj, arr) {
	for (var i = 0; i < arr.length; ++i) {
		if (arr[i] === obj) {
			return true;
		}
	}
	return false;
}



/* DEBUG DRAWING FUNCTIONS *****************************************************
*/

//draw x, y as a point, making sure it isn't anti-aliased
Util.drawPoint = function(ctx, x, y) {
	ctx.strokeRect(Math.floor(x - 1) - 0.5, Math.floor(y - 1) - 0.5, 1, 1);
}

//draw a rectangle, making sure it isn't anti-aliased
Util.drawRectangle = function(ctx, x, y, width, height) {
	ctx.strokeRect(Math.floor(x) - 0.5, Math.floor(y) - 0.5, width, height);
}

Util.drawRectangleCentered = function(ctx, x, y, width, height) {
	ctx.strokeRect(Math.floor(x - width * 0.5) - 0.5, Math.floor(y - height * 0.5) - 0.5, width, height);
}

//draw line between two points
Util.drawLine = function(ctx, x1, y1, x2, y2) {
	ctx.beginPath();  
	ctx.moveTo(x1, y1);  
	ctx.lineTo(x2, y2);
	ctx.closePath();
	ctx.stroke(); 
}

Util.drawCircle = function(ctx, x, y, r) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI, false);
	ctx.stroke();
}

Util.drawAngleVector = function(ctx, vec, size, x, y) {
	ctx.beginPath();
	ctx.moveTo(x + size, y);
	ctx.lineTo(x, y);
	ctx.lineTo(x + vec.x * size, y + vec.y * size);
	ctx.stroke();
	
	ctx.beginPath();
	ctx.arc(x, y, size * 0.8, 0, vec.getAngle(), false);
	ctx.stroke();
}

//lightweight bitmap number function (right-aligned)
Util.drawNumber = function(ctx, x, y, num, img, framesX) {
	x = Math.floor(x);
	y = Math.floor(y);
	var str = "" + num; //num to string
	var chWidth = img.width / framesX;
	var chHeight = img.height;
	var i, ch;
	for (i = str.length - 1; i >= 0; --i) {
		ch = str.charCodeAt(i) - 48; //charCode('0') == 48;
		if (ch >= framesX || ch < 0) continue;
		ctx.drawImage(img, ch * chWidth, 0, chWidth, chHeight, x - (str.length * chWidth) + i * chWidth, y, chWidth, chHeight);
	}
}

/* DEBUGGING CONVENIENCE FUNCTIONS *********************************************
*/
Util.objToString = function(o) {
	var pv;
	var rv = "";
	for (p in o) {
		rv += "" + p + ": ";
		pv = new String(o[p]);
		if (pv.search("function") == 0) {
			rv += "[FUNCTION], ";
		} else {
			rv += pv + ", ";
		}	
	}
	return rv;
}

Util.objToString_HTML = function(o) {
	var pv;
	var rv = "";
	for (p in o) {
		rv += "<b>" + p + "</b>: ";
		pv = new String(o[p]);
		if (pv.search("function") == 0) {
			rv += "[FUNCTION]<br>";
		} else {
			rv += pv + "<br>";
		}	
	}
	return rv;
}