
/**
 * Create new router
 */
var Router = function() {

};

/**
 * Add route in the router
 */
Router.prototype.add = function( hash ) {

}

/**
 * Start router
 */
Router.prototype.start = function() {
	var self = this;

	// Listen for hash changes
	window.addEventListener('hashchange', functino(e) {
		self.route( window.location.hash );
	});

	// Apply first route
	self.route( window.location.hash );
}

/**
 * Resolve route
 */
Router.prototype.route = function( hash ) {

};

module.exports = Router;
