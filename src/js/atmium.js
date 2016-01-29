var WebTorrent = require('webtorrent/webtorrent.min')
var AtmiumGUI = require('./atmium/gui');

// Collect atmium instances, used for populating
// the first instance by the URL specified.
var _atmiumInstances = [];

/**
 * Atmium Constructor
 */
var Atmium = function( hostDOM ) {

	// Prepare instance
	var self = this;
	_atmiumInstances.push( this );

	// Create atmium GUI
	this.gui = new AtmiumGUI( hostDOM );

	// Create a WebTorrent client
	this.client = new WebTorrent();

};

/**
 * Deploy webapp
 */
Atmium.prototype.load = function( torrentId ) {
	var self = this;

	// Start loading
	this.gui.showLoading();

	// Download torrent specified
	this.client.add(torrentId, function (torrent) {

		// Bind on progress evets
		torrent.on('download', function(chunkSize) {
			self.gui.updateProgres( this.progress, torrent.downloadSpeed, torrent.swarm.wires.length );
		});
		torrent.on('done', function() {
			// Hide loading
			self.gui.hideLoading();
		});	

		// Deploy
		self._processTorrent( torrent );

	});

}

/**
 * Deploy webapp
 */
Atmium.prototype._processTorrent = function( torrent ) {
	var self = this,
		files = torrent.files;

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
		torrent.pause();
		return;
	}

	// Read manifest
	manifest.getBuffer(function(err, buffer) {

		// Trigger error if something goes wrong
		if (err) {
			self.gui.criticalError("Unable to download Atmium manifest! "+err);
			torrent.pause();
			return;
		}

		// Parse manifest
		var manifest = JSON.parse(buffer.toString())
		console.log(manifest);


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
