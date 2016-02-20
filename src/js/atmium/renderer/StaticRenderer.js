
var Renderer = require("../Renderer");

/**
 * Static router 
 */

/**
 * Static Renderer just replaces the hostDOM contents
 */
var StaticRenderer = function( hostDOM, resources, bundle, appConfig ) {
	Renderer.call(this, hostDOM, resources, bundle, appConfig);

	var self = this;

	// Listen for hash changes
	window.addEventListener('hashchange', function(e) {
		self.route( window.location.hash );
	});

	// Apply first route
	self.route( window.location.hash );

}

StaticRenderer.prototype = Object.create( Renderer.prototype );

module.exports = StaticRenderer;
