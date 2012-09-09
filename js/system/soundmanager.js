/* SOUND MANAGER ***************************************************************
Load sound effects and play them when they are done. Note that the sound manager
does not load the sounds until they are actually played and I don't know a way
around this. I would have liked to integrate sounds with the asset manager, but
the audio element does not appear to work in the same way as the image element,
so the program waits forever at startup for audio elements to load that will
never load. Anyway, since it's best to have a simple interface to play sounds
a dedicated sound manager seems like a sensible plan.

playsound(id, [channel]) //play the specified sound
playmusic(id) //play any sound on the looping music channel
*/


//AUDIO CHANNEL
function AudioChannel() {
	this.audio = new Audio();
}

//play a sound on this channel (optionally play the sound that's already set)
AudioChannel.prototype.play = function (audio) {
	this.audio.pause();
	this.audio = audio.cloneNode(false); //this gets around a chrome problem, but since it's only a shallow copy the data needing GC should be minimal
	this.audio.play();
}

//SOUND MANAGER
function SoundManager() {
	this.channels = []; //array of audio elements that represent the channels of an audio system

	this.sounds = {}; //hash of audio elements to store audio that has been loaded
	var i = SoundManager.MAX_CHANNELS;
	while (i--) {
		this.channels[i] = new AudioChannel();
	}
}

SoundManager.LOW_PRIORITY_CHANNEL = 0; //sounds playing in this channel might be stopped by other sounds playing over the top
SoundManager.MAX_CHANNELS = 8;
//SoundManager.AUDIO_FORMAT = "audio/ogg";

//get a channel that a sound is not currently playing on
SoundManager.prototype.getFreeChannel = function () {
	var i = this.channels.length;
	var channel;
	while (i--) {
		audio = this.channels[i].audio;
		if (!audio || (audio && (audio.ended || audio.paused))) {
			return i;
		}
	}
	//if there was no free channel, return the low priority channel so a sound can be played instantly
	return SoundManager.LOW_PRIORITY_CHANNEL;

}

SoundManager.prototype.playSound = function (name, channel) {
	var sound = this.sounds[name];
	if (sound !== undefined) {
		if (channel === undefined) {
			channel = this.getFreeChannel(); //get a free channel
		}
		//alert("src: " + sound.src + ", channel:" + channel);
		this.channels[channel].play(sound); //play the sound via the free channel
	} else {
		alert("ERROR: Audio with id [" + name + "] does not exist!");
	}
}

//similar to the asset managers queue asset function, although this sets the src of the audio file straight away
SoundManager.prototype.loadSound = function (name, path) {
	if (this.sounds[name] !== undefined) {
		alert(("ERROR: Cannot queue asset. Id [" + name + "] is already in use"));
	} else {
		var sound = new Audio(path);
		//sound.type = SoundManager.AUDIO_FORMAT;
		sound.preload = "auto";
		sound.load();
		this.sounds[name] = sound;
	}
}

//load a list of sounds and add an optional prefix
SoundManager.prototype.loadSounds = function (paths, prefix) {
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
		this.loadSound(name, path);
	}
}