
var Renderer = require("../renderer");

/**
 * Static Renderer just replaces the hostDOM contents
 */
var StaticRenderer = function( hostDOM, resources, bundle, appConfig ) {
	Renderer.call(this, hostDOM, resources, bundle, appConfig);
}

StaticRenderer.prototype = Object.create( Renderer.prototype );

module.exports = StaticRenderer;
