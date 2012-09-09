/*
Asset Manager for canvas games
Based on HTML5 Rocks Tutorial: http://www.html5rocks.com/en/tutorials/games/assetmanager/

Note that this currently only manages images, not other types of asset.

Usage:
var ASSETMANAGER = new AssetManager(); //create a new asset manager
ASSETMANAGER.isLoadComplete(); //returns whether or not files have finished loading (if there are no more queued assets)
ASSETMANAGER.getPercentComplete(); //returns the ratio of assets loaded + failed to total number of assets
ASSETMANAGER.queueAsset("EGG", "img/egg.png"); //add img/egg.png to the manager with the alias EGG
ASSETMANAGER.queueAssets(paths, "IMG_"); //queue all assets in paths array, autogenerating names with the prefix "IMG_" added
ASSETMANAGER.loadAssets(callback); //load all assets that are queued and call the callback function when they have finished
ASSETMANAGER.getAsset("EGG"); //get the data associated with the alias EGG
ASSETMANAGER.purge(); //clear all unloaded assets
ASSETMANAGER.getErrorString(); //returns a string containing a list of assets that failed to load (does not include those still queued)

Automatically generated alias follow the following simple convention:
img/bacon.png -> BACON
images/fruit/banana.jpg -> BANANA
The alias is simply the filename in uppercase, with extension and path stripped.
If a prefix of "IMAGE_" is set, these become IMAGE_BACON and IMAGE_BANANA respectively.

TODO:
+add support for update callbacks (to enable loading progress bars etc.)
+support for default assets (e.g. pink checkerboard texture when textures can't be loaded, or blank sounds etc.)
+support for sound files
*/

//small class to hold assets and related data conveniently
function Asset() {
	this.status = 0;
	this.path = "";
	this.data = null;
	this.type = Asset.TYPE_IMG; //unused
}

Asset.TYPE_IMG = "IMG";
Asset.TYPE_SFX = "SFX";

Asset.EMPTY = 0; //empty object
Asset.QUEUED = 1; //path set
Asset.LOADED = 2; //data loaded
Asset.ERROR = 3; //onerror

Asset.prototype.toString = function() {
	var rv = new String(this.path);
	rv += " | ";// + this.type + " | ";
	switch (this.status) {
		case Asset.LOADED:
			rv += "LOADED";
			break;
		case Asset.QUEUED:
			rv += "QUEUED";
			break;
		case Asset.ERROR:
			rv += "ERROR";
			break;
		case Asset.EMPTY:
			rv += "EMPTY";
			break;
		default:
			rv += this.status;
	}
	return rv;
}

function AssetManager() {
	this.assets = {};
	this.numAssets = 0;
	this.numLoaded = 0;
	this.numFailed = 0;
}

AssetManager.prototype.loadError = function() {
	if (this.numFailed) {
		return true;
	}
	return false;
}

AssetManager.prototype.isLoadComplete = function() {
	return (this.numAssets == this.numLoaded + this.numFailed);
}

AssetManager.prototype.getPercentComplete = function() {
	return (this.numLoaded + this.numFailed) / this.numAssets;
}

//start loading all queued assets and call the callback when done
AssetManager.prototype.loadAssets = function(callback) {
	var data = null;
	var asset = null;
	var that = this;
	var name;
	
	if (this.numAssets == 0) {
		callback();
	} else {	
		for (name in this.assets) {
			asset = this.assets[name];
			if (asset.status == Asset.QUEUED) {
				data = new Image();
				data["AssetManager_ASSET"] = asset; //store a link to the asset in the image
				data.addEventListener("load", function() {
					that.numLoaded += 1;
					this["AssetManager_ASSET"].status = Asset.LOADED;
					delete this["AssetManager_ASSET"]; //delete the link
					if (that.isLoadComplete()) {
						callback();
					}
				} , false);
				data.addEventListener("error", function() {
					that.numFailed += 1;
					this["AssetManager_ASSET"].status = Asset.ERROR;
					delete this["AssetManager_ASSET"];
					if (that.isLoadComplete()) {
						callback();
					}
				} , false);
				data.src = asset.path;
				asset.data = data;
			}
		}
	}
}

//add an asset to the cache
AssetManager.prototype.queueAsset = function(name, path, type) {
	if (this.assets[name] !== undefined) {
		alert(("ERROR: Cannot queue asset. Id [" + name + "] is already in use"));
	} else {
		var asset = new Asset();
		asset.path = path;
		asset.status = Asset.QUEUED;
		asset.type = type || Asset.TYPE_IMG;
		this.assets[name] = asset;
		this.numAssets += 1;
	}
}

//add an array of assets to the cache, generating asset names from the path automatically (with optional prefix)
AssetManager.prototype.queueAssets = function(paths, prefix, type) {
	var name, path;
	var start, end;
	if (prefix === undefined) prefix = "";
	for (var i = 0; i < paths.length; i++) {
		//generate name from path and prefix
		path = paths[i];
		start = path.lastIndexOf("/") + 1; //in the case that there is no "/", the +1 makes the returned -1 a 0. Thanks, +1!
		end = path.lastIndexOf(".");
		if (end < 0) {
			end = path.length;
		}
		name = (prefix + path.substr(start, end - start)).toUpperCase();
		//now queue the asset
		this.queueAsset(name, path, type);
	}
}

//get an asset from the cache
AssetManager.prototype.getAsset = function(name) {
	var asset = this.assets[name];
	if (asset !== undefined) {
		if (asset.status == Asset.LOADED && asset.data != null) {
			return asset.data;
		} else {
			alert(("ERROR: The asset [" + name + "] is not loaded"));
			return null;
		}
	} else {
		alert(("ERROR: There is no asset using id " + name));
		return null;
	}
}

//delete any redundant nodes
AssetManager.prototype.purge = function() {
	var asset, name;
	for (name in this.assets) {
		asset = this.assets[name];
		if (asset.status != Asset.LOADED) {
			if (asset.status == Asset.ERROR) {
				this.numAssets -= 1;
				this.numFailed -= 1;
			} else if (asset.status == Asset.QUEUED) {
				this.numAssets -= 1;
			}
			delete this.assets[name];
		}
	}
}

//get a list of all the data that failed to load
AssetManager.prototype.getErrorString = function() {
	if (this.numFailed == 0) {
		return "";
	}
	var asset, name;
	var rv = new String(("The following " + this.numFailed + " file(s) could not be loaded:"));
	for (name in this.assets) {
		asset = this.assets[name];
		if (asset.status == Asset.ERROR) {
			rv += "<br>[" + name + "] " + asset.path;
		}
	}
	return rv;
}

//return a string of the asset managers contents
AssetManager.prototype.toString = function() {
	var rv = new String("<b>AssetManager</b>:");
	var name;
	for (name in this.assets) {
		rv += "<br>[" + name + "] " + this.assets[name].toString();
	}
	return rv;
}
