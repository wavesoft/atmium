
/**
 * Initialize an atmium GUI
 */
var AtmiumGUI = function( hostDOM ) {

	// Keep and initialize host dom
	this.host = hostDOM;
	hostDOM.classList.add("atmium-frame");

	// Properties
	this.lockdown = false;

	// Create Body dom
	this.bodyDOM = document.createElement('div');
	hostDOM.appendChild(this.bodyDOM);

	// Create progress DOM
	var domLoadingFrame = document.createElement('div'),
		domLoadingMessage = document.createElement('div'),
		domIcon = document.createElement('div'),
		domTitle = document.createElement('div'),
		domProgress = document.createElement('div'),
		domBandwidth = document.createElement('div'),
		domProgressBar = document.createElement('div'),
		domProgressBarBar = document.createElement('div');

	// Nest items
	hostDOM.appendChild( domLoadingFrame );
	domLoadingFrame.appendChild( domLoadingMessage );
	domLoadingMessage.appendChild(domIcon);
	domLoadingMessage.appendChild(domTitle);
	domLoadingMessage.appendChild(domProgress);
	domLoadingMessage.appendChild(domBandwidth);
	domLoadingMessage.appendChild(domProgressBar);
	domProgressBar.appendChild( domProgressBarBar );

	// Setup elements
	domLoadingFrame.classList.add("atmium-loading");
	domLoadingMessage.classList.add("atmium-loading-message");
	domTitle.classList.add("atmium-loading-title");
	domProgress.classList.add("atmium-loading-progress");
	domBandwidth.classList.add("atmium-loading-bandwidth");
	domIcon.classList.add("atmium-loading-logo");
	domProgressBar.classList.add("atmium-loading-progressbar");

	// Keep them aside
	this._progElm = {
		'frame': domLoadingFrame,
		'title': domTitle,
		'progress': domProgress,
		'bandwidth': domBandwidth,
		'progressbar': domProgressBarBar,
	};

	// Hide default interface
	this._progElm.frame.style['display'] = "none";

};

/**
 * Update progress
 */
AtmiumGUI.prototype.updateProgres = function( progress, speed, peers ) {
	if (this.lockdown) return;

	// Update display
	if (speed !== undefined) {
		this._progElm.bandwidth.innerHTML = "Speed: " + (speed / 1024).toFixed(2) + " Kb/s";
	}
	if (progress !== undefined) {
		this._progElm.progress.innerHTML =  (progress*100).toFixed(0) + "%";
		this._progElm.progressbar.style['width'] =  (progress*100)+"%";
	}

	// Display message according to peers connected
	if (peers !== undefined) {
		if (peers == 0) {
			this._progElm.title.innerHTML = "Connecting to peers...";
		} else {
			this._progElm.title.innerHTML = "Loading resources...";
		}
	}
}

/**
 * Show loading frame
 */
AtmiumGUI.prototype.showLoading = function() {
	if (this.lockdown) return;
	var self = this;

	// Initialize properties
	this._progElm.title.innerHTML = "Connecting to peers...";
	this._progElm.bandwidth.innerHTML = "Speed: 0.00 Kb/s";
	this._progElm.progress.innerHTML = "0%";
	this._progElm.progressbar.style['width'] = "0%";

	// Show
	this._progElm.frame.classList.remove("atmium-warning");
	this._progElm.frame.style['display'] = "flex";
	setTimeout(function() {
		self._progElm.frame.classList.add("visible");
	},10);

}

/**
 * Hide loading frame
 */
AtmiumGUI.prototype.hideLoading = function() {
	if (this.lockdown) return;
	var self = this;

	// Initialize properties
	this._progElm.progress.innerHTML = "100%";
	this._progElm.progressbar.style['width'] = "100%";

	// Hide
	this._progElm.frame.classList.remove("visible");
	setTimeout(function() {
		self._progElm.frame.style['display'] = "none";
	},600);

}

/**
 * Show a critical error and disable the UI
 */
AtmiumGUI.prototype.criticalError = function( message ) {
	if (this.lockdown) return;
	var self = this;

	// Update to warning message
	this._progElm.frame.classList.add("atmium-warning");
	this._progElm.title.innerHTML = message;
	this._progElm.bandwidth.innerHTML = "The page loading is aborted";

	// Make sure it's visible
	this._progElm.frame.style['display'] = "flex";
	setTimeout(function() {
		self._progElm.frame.classList.add("visible");
	},10);

	// Enter lockdown
	this.lockdown = true;

}

/**
 * Define the placeholder
 */
AtmiumGUI.prototype.setPlaceholder = function( url ) {
	this._progElm.frame.style['background-image'] = "url(" + url + ")";
}

/**
 * Return the body DOM
 */
AtmiumGUI.prototype.getBodyDOM = function() {
	return this.bodyDOM;
}

/**
 * Export Atmium GUI
 */
module.exports = AtmiumGUI;
