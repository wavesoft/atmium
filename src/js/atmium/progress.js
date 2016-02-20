
/**
 * Progres Callbacks
 */
var ProgressBase = function() {
	this.progress = 0;
	this.forks = [];
	this.parent = null;
	this.active = false;

	this.onstart = null;
	this.onprogress = null;
	this.onstop = null;

};

/**
 * Start progress
 */
ProgressBase.prototype.startProgress = function() {
	this.progress = 0.0;
	this._callStart();
	this._sendUpdate();
}

/**
 * Send progress updates
 */
ProgressBase.prototype.updateProgress = function( progress, meta ) {
	this.progress = progress;
	this._sendUpdate( meta );
}

/**
 * Send complete event
 */
ProgressBase.prototype.completeProgress = function() {
	this.progress = 1.0;
	this._sendUpdate();
}

/**
 * Engulf child object
 */
ProgressBase.prototype.adoptProgress = function(cp) {

	// Adopt child
	this.forks.push(cp);
	cp.parent = this;

	// Send update
	if (this.active) this._sendUpdate();

}

/**
 * Get progress value
 */
ProgressBase.prototype._getProgress = function() {
	// Calculate progress sum
	var progressSum = 0;
	for (var i=0; i<this.forks.length; i++) {
		progressSum += this.forks[i]._getProgress();
	}

	// If not null, include my progres
	if (this.progress != null) {
		progressSum += this.progress;
		return progressSum / (this.forks.length + 1);
	} else {
		// Return average
		if (this.forks.length == 0) return 0;
		return progressSum / this.forks.length;
	}
}

/**
 * Call this and parent start callbacks
 */
ProgressBase.prototype._callStart = function() {
	if (this.parent) this.parent._callStart();
	if (this.active) return;
	if (this.onstart) this.onstart();
	this.active = true;
}

/**
 * Call this and parent start callbacks
 */
ProgressBase.prototype._callStop = function() {
	if (this.parent) this.parent._callStop();
	if (!this.active) return;
	if (this.onstop) this.onstop();
	this.active = false;
}

/**
 * Send progress update
 */
ProgressBase.prototype._sendUpdate = function( meta ) {
	// Activate if not active
	var progress = this._getProgress();

	// Update
	if (!meta) meta={};
	if (this.onprogress) this.onprogress(progress, meta);
	if (this.parent) this.parent._sendUpdate( meta );

	// Deactivate
	if (progress == 1.0) this._callStop();

}

module.exports = ProgressBase;
