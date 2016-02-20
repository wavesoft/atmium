var WebTorrent = require('webtorrent')
var magnetURI = require('magnet-uri')

var AtmiumGUI = require('./atmium/gui')
var AtmiumResourceSet = require("./atmium/resourceset")

var AtmiumStaticRenderer = require("./atmium/renderer/static");

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

	// Setup properties
	this.hostDOM = hostDOM;
	this.lockdown = false;
	this.files = [];

	// Create atmium GUI
	this.gui = new AtmiumGUI( hostDOM );

	// Valdiate and start
	if (!WebTorrent.WEBRTC_SUPPORT) {
		this.gui.criticalError("Your browser lacks <strong>WebRTC</strong> support. Please update!");
		this.lockdown = true;
	} else {
		try {
			
			// Create a WebTorrent client
			this.client = new WebTorrent();

			// Create resourceset
			this.resources = new AtmiumResourceSet(this.client);

			// Bind to progress callback
			this.resources.onstart = function() {
				self.gui.showLoading();
			}
			this.resources.onprogress = function(progress, meta) {
				self.gui.updateProgres( progress, meta['speed'], meta['peers'] );
			}
			this.resources.onstop = function() {
				self.gui.hideLoading();
			}

		} catch (e) {
			this.gui.criticalError("Unable to initialize the WebTorrent component!");
			this.lockdown = true;
			throw e;
		}
	}

};


/**
 * Deploy webapp
 */
Atmium.prototype.load = function( torrentId ) {
	var self = this;
	if (this.lockdown) return;

	// Get a unique ID of this torrent
	var infoHash = null;
	if (torrentId.substr(0,7).toLowerCase() == "magnet:") {
		var uri = magnetURI.decode(torrentId);
		infoHash = uri.infoHash;
	} else {
		infoHash = torrentId;
	}

	// Open and get bundle
	this.resources.getBundle( infoHash, (function(err, bundle) {
		if (err) {
			// Handle errors
		} else {		
			this._deploy( bundle );
		}
	}).bind(this));

}

/**
 * Deploy webapp
 */
Atmium.prototype._deploy = function( bundle ) {
	var self = this;
	window.bundle = bundle;

	// Get manifest
	bundle.getFileContents( "Atmium.json", function(err, buffer) {

		// Handle errors
		if (err) {
			self.gui.criticalError("Unable to process atmium manifest! "+err);
			bundle.abort();
			return;
		}
		if (!buffer) {
			self.gui.criticalError("Missing atmium manifest file!");
			bundle.abort();
			return;
		}

		// Parse manifest
		var manifest = JSON.parse(buffer);
		var appConfig = manifest['app'] || {};

		// Apply app config
		if (appConfig['title']) window.title = appConfig['title'];
		if (appConfig['placeholder']) {
			bundle.getFileURL( appConfig['placeholder'], function(err, url) {
				if (err) {
					console.log("Could not load placeholder!",err);
				} else {
					self.gui.setPlaceholder( url );
				}
			});
		}

		// Pick the appropriate renerer for this application
		var renderer = appConfig['renderer'] || 'default',
			renderOptions = {
				'default': AtmiumStaticRenderer,
				'static': AtmiumStaticRenderer
			};
		if (!renderOptions[renderer]) {
			self.gui.criticalError("Invalid renderer specified in the application!");
			bundle.abort();
			return;
		}

		// Create new application renderer
		var appRenderer = new renderOptions[renderer]( self.gui.getBodyDOM(), this.resources, bundle, appConfig );
		appRenderer.initialize(function() {
			self.gui.hideLoading();
		});

	});

}

/**
 * Check for direct atmium runtime request
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
