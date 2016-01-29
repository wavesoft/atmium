var WebTorrent = require('webtorrent/webtorrent.min')
var AtmiumGUI = require('./atmium/gui');

// Collect atmium instances, used for populating
// the first instance by the URL specified.
var _atmiumInstances = [];

/**
 * Atmium Constructor
 */
var Atmium = function( hostDOM ) {
	var self = this;

	// Create atmium GUI
	this.gui = new AtmiumGUI( hostDOM );

	// Create a WebTorrent client
	this.client = new WebTorrent();

	// Keep on instances array
	_atmiumInstances.push( this );

};

/**
 * Deploy webapp
 */
Atmium.prototype.load = function( torrentId ) {

	// Download torrent specified
	client.add(torrentId, function (torrent) {

		// Deploy
		self._processTorrent( torrent.files );

	});

}

/**
 * Deploy webapp
 */
Atmium.prototype._processTorrent = function( files ) {
	var self = this;

	// Look for manifest file
	var manifest = null;
	for (var i=0; i<files.length; i++) {
		if (files[i].path == 'Atmium.json') {
			manifest = files[i];
			break;
		}
	}

	// Validate
	if (!manifest) {
		this.gui.criticalError("The specified website does not contain a valid Atmium project.");
		return;
	}

	// Handle buffer
	manifest.getBuffer(function(err, buffer) {

		console.log(err,buffer);
		console.buf = buffer;

	});

}

/**
 * Check for atmium runtime request
 */
var hash = String(window.location.hash);
if (hash.length > 1) {

	// Check the torrent specified by URL
	var torrent = hash.substr(1, hash.length-1);

	// Wait until the website is loaded
	window.addEventListener('load', function() {

		// Make sure we have at least 1 instance
		if (_atmiumInstances.length == 0)
			new Atmium( document.body );

		// Load torrent on the first instance
		_atmiumInstances[0].load( torrent );

	});

}

// Expose atmium
module.exports = Atmium;

// var client = new WebTorrent()
// var torrentId = '005224466942a232f89a22e3975615629d9b2607'

// client.add(torrentId, function (torrent) {
// 	// Torrents can contain many files. Let's use the first.
// 	var file = torrent.files[0]

// 	// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
// 	file.appendTo('body')
// })

