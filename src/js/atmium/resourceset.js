
var ProgressBase = require("./progress");
var AtmiumBundle = require("./bundle");

/**
 * Constructor of a resource set that takes care of
 * collecting and managing multiple resources.
 */
var ResourceSet = function( client ) {

	// Exclude us from progress
	ProgressBase.apply(this);
	this.progress = null;

	// Keep torrent client
	this.client = client;

};

// Subclass from progress base
ResourceSet.prototype = Object.create( ProgressBase.prototype );

/**
 * Get a torrent bundle
 */
ResourceSet.prototype.getBundle = function( hashID, callback ) {

	// Create a new atmium bundle instance
	var bundle = new AtmiumBundle( this.client, hashID );
	this.adoptProgress(bundle);

	// Initialize and trigger callback
	bundle.initialize(callback);

};

// Export resource set
module.exports = ResourceSet;
