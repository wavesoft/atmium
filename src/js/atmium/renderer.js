
/**
 * Base class for Atmium Renderers
 */
var Renderer = function( hostDOM, resources, bundle, appConfig ) {

	// Keep references
	this.config = appConfig;
	this.resources = resources;
	this.bundle = bundle;
	this.hostDOM = hostDOM;

};

/**
 * Prepare for rendering and trigger callback when ready to render
 */
Renderer.prototype.initialize = function( callback ) {
	
}

module.exports = Renderer;
