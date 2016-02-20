
// var mime = require("mime")
var magnetURI = require('magnet-uri')
var localForage = require('localforage')
var Buffer = require('buffer').Buffer;
var ProgressBase = require("./progress");

/**
 * A small mime table
 */
var smime = { 
	'js'	: 'application/javascript',
	'css'	: 'text/css',
	'json'	: 'application/json',
	'gz'	: 'application/octet-stream',
	'bz2'	: 'application/x-bzip2',
	'mov'	: 'video/quicktime',
	'mpg'	: 'video/mpeg',
	'mp4'	: 'video/mp4',
	'ogg'	: 'audio/ogg',
	'ogv'	: 'video/ogg',
	'mebm'	: 'application/octet-stream',
	'gif'	: 'image/gif',
	'png'	: 'image/png',
	'bmp'	: 'image/bmp',
	'jpg'	: 'image/jpeg',
	'jpeg'	: 'image/jpeg',
};

function smimeOf(filename) {
	var filebase = filename.split("?")[0];
		filebase = filebase.split("#")[0];
	var extparts = filebase.split(".");
	return smime[extparts[extparts.length-1]];
}

// var mime = require("mime")
// var mimes = ['js','css','json','gz','bz2','mov','mpg','mp4','ogg','ogv','mebm','gif','png','bmp','jpg','jpeg'];
// var smime = {};
// for (var i=0; i<mimes.length; i++) {
// 	smime[mimes[i]] = mime.lookup('.'+mimes[i]);
// }

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
 * Bundle object
 */
var Bundle = function( client, infoHash ) {
	ProgressBase.apply(this);

	// Load callbacks
	this._torrent = null;
	this._loaded = false;
	this._cache = null;
	this._loadCallbacks = [];
	this._fileCallbacks = {};
	this._meta = {};

	// Keep references
	this._client = client;
	this.infoHash = infoHash;

};

Bundle.prototype = Object.create( ProgressBase.prototype );

/**
 * Abort possible loading of the bundle
 */
Bundle.prototype.abort = function() {

	// Destroy torrent
	if (this._torrent) {
		this._torrent.destroy();
	}

}

/**
 * Trigger the specified callback when ready
 */
Bundle.prototype.onReady = function( callback ) {
	if (!callback) return;

	// If already loaded, call directly
	if (this._loaded) {
		callback();
		return;
	}

	// Otherwise call when ready
	this._loadCallbacks.push(callback);

}

/**
 * Initialize bundle
 */
Bundle.prototype.initialize = function( callback ) {
	var self = this;

	// Create a cache instance
	this._cache = localForage.createInstance({
		name: "atmium." + self.infoHash
	});

	// Check if we have cached metadata for this bundle
	this._cache.getItem('META', function(err, data) {

		// Check for errors
		if (err) {
			if (callback) callback( "Unable to get cached information!", null );
			return;
		}

		// Check cache state
		if (data) {

			// Initialize with cache
			self._meta = data;

			// Trigger callback
			if (callback) callback( null, self );

			// Call loaded callbacks
			self._loaded = true;
			for (var i=0; i<self._loadCallbacks; i++)
				self._loadCallbacks[i]();

			// Compile and seed
			self.compileAndSeed(function(err, torrent) {
				if (err) console.error("Error seeding: "+err);
			});

		} else {
			
			// Start progress
			self.startProgress();

			// Initialize with torrent
			self._client.add( self.infoHash, function (torrent) {

				// Update properties
				self._torrent = torrent;
				self._meta = {
					'magnet': torrent.magnetURI,
					'name': torrent.name,
					'prefix': '',
				};

				// Check if all torrent files have a common prefix
				var torrentFiles = torrent.files,
					firstPath = torrentFiles[0].path;
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
						self._meta.prefix = prefix;
				}

				// Cache all files when done
				torrent.on('download', function(chunkSize) {
					// console.log('chunk size: ' + chunkSize);
					// console.log('total downloaded: ' + torrent.downloaded);
					// console.log('download speed: ' + torrent.downloadSpeed);
					// console.log('progress: ' + torrent.progress);

					self.updateProgress( torrent.progress, {
						'speed': torrent.downloadSpeed,
						'peers': torrent.swarm.wires.length,
						'timeleft': torrent.timeRemaining,
					});

				});
				torrent.on('done', function() {

					// Call callbacks
					self._loaded = true;
					for (var i=0; i<self._loadCallbacks; i++)
						self._loadCallbacks[i]();

					// Save self metadata
					self.completeProgress();

					// Cache all remaining items in local storage
					self.cacheRemainingFiles( torrent, function(err, result) {

						// Unable to cache remaining files
						if (err) {
							console.log("Unable to cache torrent files: "+err);
							return;
						}

						// Finally, add torrent metadata
						self._cache.setItem( 'META', self._meta );
						console.info("Seeding torrent " + torrent.infoHash);

					});

				});

				// Trigger callback
				if (callback) callback( null, self );

			});

		}

	});


}

/**
 * Return the contents of the specified file as buffer
 */
Bundle.prototype.getFileBuffer = function( filename, callback ) {

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
	var fname = this._meta.prefix + filename;
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
					if (err) {
						completeCallback( 'Cache error:' + err, null );
					} else {
						completeCallback( null, buffer );
					}
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
Bundle.prototype.getFileContents = function( filename, callback ) {
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
Bundle.prototype.getFileURL = function( filename, callback ) {
	var mimeType = smimeOf( filename );
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
 * Cache all torrent files that are not part of cache
 */
Bundle.prototype.cacheRemainingFiles = function( torrent, callback ) {
	var self = this;

	// Validate
	if (!this._cache) {
		callback("No cache store to store torrent information to", null);
		return;
	}

	// Iterate over cache files and build files array
	this._cache.keys(function(err, keys) {
		var error = null,
			cachedFiles = [];

		// Forward errors
		if (err) {
			callback(err, null);
			return;
		}

		// Check files that are in torrent but not in cache
		for (var i=0; i<torrent.files.length; i++) {
			var file = torrent.files[i];

			// Populate missing items
			if (keys.indexOf(file.path) == -1) {

				// Get file buffer (should already be cached)
				(function(file) {
					file.getBuffer(function(err, buffer) {

						// Log errors
						if (err) {
							console.error( error = "Cannot get buffer of '"+file.path+": "+err );
							return;
						}

						// Update cache item
						self._cache.setItem(file.path, buffer, function(err, result) {
							if (err) {
								console.error( error = "Cannot update cache of '"+file.path+": "+err );
							}
						});

					});
				})(file);

				// Keep new files on response array
				cachedFiles.push(file);

			}

		}

		// Trigger callback
		callback( error, cachedFiles );

	});

}

/**
 * Compile resources required to seed a torrent
 */
Bundle.prototype.compileTorrent = function( callback ) {

	// Validate
	if (!this._cache) {
		callback("No cache store to compile torrent information from", null);
		return;
	}

	// Collect metadata
	var magnet = magnetURI.decode( this._meta.magnet ),
		opt = {
			'name': this._meta.magnet,
			'announceList': magnet.announce
		};

	// Iterate over cache files and build files array
	var files = [];
	this._cache.iterate(function(value, key, iterationNumber) {

		// Skip metadata
		if (key == 'META') return;

		// Create file list
		var buf = new Buffer(value);
		buf.fullPath = key;
		files.push( buf );

	}, function(err) {
		if (err) {
			// An error occured
			callback(err, null);
		} else {
			// Iteration completed
			callback(null, { 'files': files, 'opt': opt, 'infoHash': magnet.infoHash  })

		}
	});

}


/**
 * Compile resource buffers and start seeding the torrent
 */
Bundle.prototype.compileAndSeed = function( callback ) {
	var self = this;

	// Compile the torrent to seed
	self.compileTorrent(function( err, result ) {

		// Check for errors
		if (err) {
			callback( "Unable to compile torrent from cache!", null );
			return;
		}

		// Start seeding torrent
		self._client.seed( result.files, result.opts, function(torrent) {

			// We should serve the same hashID as the one in the database, 
			// otherwise something went really wrong
			if ( torrent.infoHash != self.infoHash ) {
				callback( "Mismatched infoHash, cache corrupted!", null );
			} else {
				console.info("Seeding torrent " + torrent.infoHash);
				callback( null, torrent );
			}

		});

	});

}

// Export bundle
module.exports = Bundle;
