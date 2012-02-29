var UpdatingWidgetMixin = {
	autoUpdate				: true,					// we will only auto-update if this flag is true

	updateUrl				: undefined,			// url to fetch to update this widget
	updateMethod			: "GET",				// "POST" or "GET"
	updateInterval 			: 10,					// if > 0, number of seconds between automatic call of update()
													// if == 0, we won't redraw automatically
	updateOnDraw 			: false,				// if true, we update immediately after drawing
	retryOnUpdateFailure	: true,				// if true, we will try to update again even if an update() fails for some reason
	_updating				: false,				// if true, we're in the middle of updating
	


	// return the url to call to update this element
	//	note: a timestamp will automatically be appended in update()
	getUpdateUrl : function() {
		return this.updateUrl;
	},

	// called after the update, override to do something with the data in request
	onUpdateSucceeded : function(request, skipAnimation) {},

	// called when update fails, override to do something else
	onUpdateFailed : function(request, error) {},




	initializeProperties : function() {
		// check the cookie to see if we should initially be enabled or disabled
		if (this.hasCookie("disabled")) this.enabled = false;
		if (this.hasCookie("enabled")) this.enabled = true;
	},

	onAfterDraw : function(parent) {
		if (this.updateOnDraw) {
			this.update(this.SKIP_ANIMATION);
		} else {
			this.startUpdateTimer();
		}
		return this;
	},

	//
	//	enable/disable
	//
	enable : function() {
		this.enabled = true;
		this.toggleCookies(["+enabled","-disabled"]);
		this.update();
		return this;
	},
	
	disable : function() {
		this.enabled = false;
		this.clearDelay("update");
		this.toggleCookies(["-enabled","+disabled"]);
		return this;
	},

	//
	//	update
	//
	update : function(skipAnimation) {
		this.clearDelay("update");
		if (!this._drawn || !this.enabled) return;
		if (this._updating) return this.warn("already updating!");

		if (this._updateFailureCallback == null) {
			// pre-bind handlers
			this._updateFailureCallback = this.updateFailureCallback.bind(this);
			this._updateSuccessCallback = this.updateSuccessCallback.bind(this, undefined);
			this._updateSuccessCallbackSkipAnimation = this.updateSuccessCallback.bind(this, this.SKIP_ANIMATION);
		}

		try {
			var url = this.getUpdateUrl();
			url += (url.indexOf("?") == -1 ? "?r=" : "&r=") + new Date().getTime();
			
			var successHandler = (skipAnimation ? this._updateSuccessCallbackSkipAnimation
												: this._updateSuccessCallback);
			
			this._updateRequest = new Ajax.Request(url, 
				{
					method 		: this.updateMethod,
					onSuccess 	: successHandler,
					onFailure 	: this._updateFailureCallback,
					onException : this._updateFailureCallback
				}			
			);
		} catch (e) {
			this.warn("update(): failure creating request:", e);
		}
		return this;
	},



	// PRIVATE: update succeeded, call the user method "updateSuceeded" and clean up the request
	//	don't override this, use updateSuceeded() instead!
	updateSuccessCallback : function(skipAnimation, request) {
		try {
			this.onUpdateSucceeded(request, skipAnimation);
			delete this._updateRequest;
			if (this.parent && this.parent.onChildUpdated) this.parent.onChildUpdated();
			this.startUpdateTimer();
			this._updating = false;
		} catch (e) {
			return this.updateFailureCallback(request, e);
		}
	},
	// PRIVATE: update failed, call the user method "updateFailed" and clean up the request
	//	don't override this, use updateFailed() instead!
	updateFailureCallback : function(request, error) {
		this.warn("update() failed: ", error);
		try {
			this.onUpdateFailed(request, error);
			delete this._updateRequest;
			if (this.retryOnUpdateFailure) this.startUpdateTimer();
		} catch (e) {}
		this._updating = false;
	},
	
	

	//
	//	update on a timer
	//
	startUpdateTimer : function() {
		if (!this.autoUpdate) return;
		if (this._updateOnTimer == null) {
			this._updateOnTimer = 
				(
					function(){	if (this.enabled) this.update()	}
				).bind(this);
		}
		if (this.updateInterval != null) this.delay(this._updateOnTimer, this.updateInterval, "update");
	}	
};

Object.extend(UpdatingWidgetMixin, CookieMixin);

