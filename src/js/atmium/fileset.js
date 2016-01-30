
var mime = require("mime")
var magnetURI = require('magnet-uri')
var Buffer = require('buffer').Buffer;

/**
 * Find the fine in the specified list
 */
function fileFromList( filename, list ) {
	for (var i=0; i<list.length; i++) {
		if (list[i].path == filename) {
			return list[i];
		}
	}
	return null;
}

/**
 * Fileset object
 */
var Fileset = function() {

	// Load callbacks
	this._torrent = null;
	this._cache = null;
	this._loaded = false;
	this._loadCallbacks = [];
	this._fileCallbacks = {};
	this._meta = {};

};

/**
 * Create a fileset object from cache
 */
Fileset.fromCache = function( cache, torrentMeta ) {

	// Create a fileset
	var fileset = new Fileset();

	// Update properties
	fileset._cache = cache;
	fileset._meta = torrentMeta;

	// Return fileset
	return fileset;

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
	fileset._cache = cache;
	fileset._meta = {
		'm': torrent.magnetURI,
		'n': torrent.name,
		'p': '',
	};

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
			fileset._meta.p = prefix;

	}

	// Cache all files when done
	torrent.on('done', (function() {

		// Call callbacks
		this._loaded = true;
		for (var i=0; i<this._loadCallbacks; i++)
			this._loadCallbacks[i]();

		// Save fileset metadata
		cache.setItem( 'META', this._meta );

	}).bind(fileset));

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

	// Check various sources for the file
	var fname = this._meta.p + filename;
	if (this._torrent) {

		// Get file from torrent
		var file = fileFromList( fname, this._torrent.files );
		if (!file) {
			completeCallback("The specified file ("+fname+") does not exists in the torrent!", null);
			return;
		}

		// Get buffer
		file.getBuffer((function(err, buffer) {

			// Check for errors
			if (err) {
				completeCallback(err, null);
				return;
			}

			// Update cache if requested
			if (this._cache) {

				// Mark file as cached & update
				this._cache.setItem(fname, buffer, (function(err, result) {
					completeCallback( null, buffer );
				}).bind(this));

			} else {
				completeCallback( null, buffer );
			}

		}).bind(this));
	}
	// Otherwise check cache
	else if (this._cache) {
		this._cache.getItem(fname, completeCallback);
	} 
	// No appropriate source found
	else {
		completeCallback("Could not locate the file specified!", null);
	}

}

/**
 * Return a file contents as string
 */
Fileset.prototype.getFileContents = function( filename, callback ) {
	this.getFileBuffer(filename, function(err, buf) {
		if (err) {
			// Forward error on errors
			callback(err, null);
		} else {
			// Create blob URL
		    callback(null, (new Buffer(buf)).toString() );
		}
	});
}

/**
 * Return a blob url for he specified filename
 */
Fileset.prototype.getFileURL = function( filename, callback ) {
	var mimeType = mime.lookup( filename );
	this.getFileBuffer(filename, function(err, buf) {
		if (err) {
			// Forward error on errors
			callback(err, null);
		} else {
			// Create blob URL
			var blob = mimeType ? new Blob([ buf ], { type: mimeType }) : new Blob([ buf ])
		    var url = URL.createObjectURL(blob);
		    callback(null, url);
		}
	});
}

/**
 * Compile resources required to seed a torrent
 */
Fileset.prototype.compileTorrent = function( callback ) {

	// Validate
	if (!this._cache) {
		callback("No cache store to compile torrent information from", null);
		return;
	}

	// Collect metadata
	var meta = magnetURI.decode( this._meta.m );

}

// Export fileset
module.exports = Fileset;
