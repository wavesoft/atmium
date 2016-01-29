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

	// Torrent files
	this.files = [];

};

/**
 * Find and return a file from the list of files
 */
Atmium.prototype.getFile = function( filename ) {

	// Look for manifest file
	for (var i=0; i<this.files.length; i++) {
		if (this.files[i].path == filename) {
			return this.files[i];
		}
	}

	// Return file
	return null;

}

/**
 * Find and callback when a file is ready to be used
 */
Atmium.prototype.getFileBuffer = function( filename, callback ) {
	var file = this.getFile(filename);
	if (!file) return;
	// Get buffer
	file.getBuffer( callback );
}

/**
 * Find and callback when a file is ready to be used
 */
Atmium.prototype.getFileURL = function( filename, callback ) {
	var file = this.getFile(filename);
	if (!file) return;
	// Get blob URL
	file.getBlobURL( callback );
}

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
	var self = this;

	// Keep file details
	this.files = torrent.files;

	// Check for prefix strip
	var firstPath = this.files[0].path;
	if (firstPath.indexOf("/") > 0) {

		// Make sure this prefix exists in every file
		var prefix = firstPath.split("/")[0]+"/", stripPrefix = true;
		for (var i=0; i<this.files.length; i++) {
			if (this.files[i].path.substr(0,prefix.length) != prefix) {
				stripPrefix = false;
				break;
			}
		}

		// Strip prefix
		if (stripPrefix) {
			for (var i=0; i<this.files.length; i++) 
				this.files[i].path = this.files[i].path.substr(prefix.length);
		}

	}

	// Validate manifest
	var manifest = this.getFile("Atmium.json");
	if (!manifest) {
		this.gui.criticalError("Missing atmium manifest file. Unable to continue!");
		torrent.destroy();
		return;
	}

	// Read manifest
	manifest.getBuffer(function(err, buffer) {

		// Trigger error if something goes wrong
		if (err) {
			self.gui.criticalError("Unable to download Atmium manifest! "+err);
			torrent.destroy();
			return;
		}

		// Parse manifest
		var manifest = JSON.parse(buffer.toString());
		var appConfig = manifest['app'] || {};

		// Apply app config
		if (appConfig['title']) window.title = appConfig['title'];
		if (appConfig['placeholder']) {
			self.getFileURL( appConfig['placeholder'], function(err, url) {
				if (err) {
					console.log("Could not load placeholder!",err);
				} else {
					self.gui.setPlaceholder( url );
				}
			});
		}

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
