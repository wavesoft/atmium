var render = require('render-media')

/**
 * Fileset object
 */
var Fileset = function() {

	// Prefix to strip from file names
	this.prefix = 0;

	// Load callbacks
	this._torrent = null;
	this._cache = null;
	this._loaded = false;
	this._loadCallbacks = [];
	this._cachedFiles = { };
	this._fileCallbacks = {};

};

/**
 * Create a fileset object from cache
 */
Fileset.fromCache = function( cache ) {

}

/**
 * Create a fileset object from torrent
 */
Fileset.fromTorrent = function( torrent, cache ) {

	// Get files in torrent
	var torrentFiles = torrent.files;
	var fileset = new Fileset();

	// Update properties
	fileset._torrent = torrent;

	// Check if all torrent files have a common prefix
	var firstPath = torrentFiles[0].path;
	if (firstPath.indexOf("/") > 0) {

		// Make sure this prefix exists in every file
		var prefix = firstPath.split("/")[0]+"/", hasPrefix = true;
		for (var i=0; i<torrentFiles.length; i++) {
			if (torrentFiles[i].path.substr(0,prefix.length) != prefix) {
				hasPrefix = false;
				break;
			}
		}

		// Update torrent config prefix length
		if (hasPrefix)
			fileset.prefix = prefix;

	}

	// Cache all files when done
	torrent.on('done', (function() {

		// Call callbacks
		fileset._loaded = true;
		for (var i=0; i<fileset._loadCallbacks; i++)
			fileset._loadCallbacks[i]();

	}).bind(this));

	// Return fileset
	return fileset;

}

/**
 * Return the contents of the specified file as buffer
 */
Fileset.prototype.getFileBuffer = function( filename, callback ) {

	// Multiple calls on the same file are queued if the request is not complete
	if (this._fileCallbacks[filename] !== undefined) {
		this._fileCallbacks[filename].push(callback);
		return;
	}

	// Prepare for multiple calls on pending operations
	this._fileCallbacks[filename] = [];
	var completeCallback = (function(err, result) {

		// Trigger callback
		callback( err, result );

		// Trigger pending callbacks
		if (this._fileCallbacks[filename] !== undefined)
			for (var i=0; i<this._fileCallbacks[filename].length; i++)
				this._fileCallbacks[filename][i](err, result);
		delete this._fileCallbacks[filename];

	}).bind(this);

	// Check if we can consult the cache
	var fname = this.prefix + filename;
	if (this._cache) {
		this._cache.getItem(fname, completeCallback);
	} 
	// Check if we can consult the torrent
	else if (this._torrent) {
		this._torrent.getBuffer(fname, (function(err, buffer) {

			// Check for errors
			if (err) {
				completeCallback(err, null);
				return;
			}

			// Update cache if requested
			if (this._cache) {

				// Mark file as cached & update
				this._cache.setItem(fname, buffer, function(err, result) {
					this._cachedFiles[fname] = true;
					completeCallback( null, buffer );
				});

			} else {
				completeCallback( null, buffer );
			}

		}).bind(this));
	}
	// No appropriate source found
	else {
		completeCallback("Fileset not initialized!", null);
	}

}

/**
 * Return a blob url for he specified filename
 */
Fileset.prototype.getFileURL = function( filename, callback ) {
	var mime = render.mime[path.extname(filename).toLowerCase()]

}

module.exports = Fileset;
