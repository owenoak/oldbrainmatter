/*
	Abstract Class:  $.Request

	Create subclasses of $.Request to encapsulate each client/server REST API call, eg:
	
	new $.Request.subclass({
		reference		: "$.MyRequest",
		url 			: "path/to/your/server/call?param1=#{value1}&param2=#{value2}",
		dataType		: "request/response",
		onSucceess		: function (jsData) {
			// jsData is the <response><data> XML translated into simple JavaScript objects.
		},
		onError			: function(errorMessageArray) {
			// do something with the error messages
			// or check this.exception for the javascript exception of the error
		}
	
	});
	
	// call the request as:
	var someData = {value1: "a", value2: "b"};
	var request = new $.MyRequest({inputs:someData}).execute();
	
	// or to override the onSuccess handler for a specific call
	var request2 = new $.MyRequest({	inputs:someData, 
										onSuccess:function(jsData) { console.dir(jsData); } 
									}).execute();

*/

new $.Class({
	reference : "$.Request",
	prototype : {

		// setting up the request:
		url 			: undefined,			// (required) request URL, will be interpolated with request.inputs
		inputTemplate	: "",					// string to interpolate to get data string to send with request
		cache			: false,				// if false, request URL will be made unique to bypass browser cache
		method			: "POST",				// "GET" or "POST"
		dataType		: "request/response",	// data type of response:  "text", "xml", "html" or "request/response"
		inputTemplate	: undefined,			// template for the <data>...</data> of the request

		loadingMessage	: undefined,			// name of message dictionary entry to show to user during request
		messageType		: "flash",				// how to show loadingMessage:  "flash" (non-modally) or "show" (modal)
		
		// pass to individual Request instances:
		inputs			: undefined,			// javascript object of "input data" for the request

		// available after the request completes:
		data			: undefined,			// results of the call, according to the 
		status			: undefined,			// text status of the request
		exception		: undefined,			// exception generated during request or after


		// Get the URL for the request, interpolated with this.inputs
		getUrl : function() {
			return $.string.interpolate(this.url, this.inputs||this);
		},

		// Get the input data string for the request, interpolated with this.inputs
		getInputData : function() {
			if (!this.inputTemplate) return "";
			return "\n"+$.trim($.string.interpolate(this.inputTemplate, this.inputs||this))+"\n";
		},

		// Return the loading message to show to the user during the request
		getLoadingMessage : function() {
			var msg = this.loadingMessage || "api."+this.Class.reference+".loading";
			return $.message(msg, this.inputs);
		},
		
		// Execute the request.
		// If inputs object is passed in, this overrides the request.inputs.
		execute : function(inputs) {
			if (inputs) this.inputs = inputs;

			var message = this.getLoadingMessage();
			if (message) {
				this.loadingMessage = message;
				if ($.Notifier) {
					$.Notifier[this.messageType](message);
				} else {
					console.info(message);
				}
			}

			// interpolate the url with the inputs object
			this.url = this.getUrl();

			// get the input data
			var inputData = this.getInputData(); 
			if (inputData && ! (this instanceof $.StackedRequest)) {
				inputData = "<request>\n"+inputData+"\n</request>";
			}

			// jQuery-style ajax options
			var ajaxOptions = {
				url 		: this.url,
				type		: this.method,
				cache		: this.cache,
				dataType 	: (this.dataType === "request/response" ? "xml" : this.dataType),
				data		: inputData,
				success		: $.bind(this._processSuccessfulRequest, this),
				error		: $.bind(this._processFailedRequest, this),
			}
		
			this.xhr = $.ajax(ajaxOptions);

			// debug
			window._lastRequest = this;

			return this;
		},
		
		// Internal handler to decode the XHR request on success.
		// You should override  onSuccess() instead.
		_processSuccessfulRequest : function(data, status) {
			this.status = status;
			var data = this.processData(data);

			// BEFORE we signal the response, take down the loadingMessage if we were showing one
			if (this.loadingMessage && this.messageType === "show") {
				this.notifier.hide();
			}
			
			if (this.dataType === "request/response") {
				this.processResponse(data.response || data.responses);
			} else {
				this.data = data;
				this.onSuccess(data);
			}
		},
		
		// Internal handler to decode the XHR request on error.
		// You should override  onError() instead.
		_processFailedRequest : function(request, status, exception) {
			switch (status) {
				case "timeout" 		:	this.addError("error-timedout"); break;
				case "parsererror" 	:	this.addError("error-parsing-results"); break;
				default				: 	this.addError("error-call-failed"); break;
			}

			this.exception = exception;
			this.onError(this.getErrors());
		},
		
		// Massage rawData into a form we can more easily work with.
		processData : function(rawData) {
			try {
				if (this.dataType === "request/response") return $.xml.toObject(rawData);
				return rawData;
			} catch (e) {
				this.exception = e;
				this.addError("error-processing-data");
				this.onError(this.getErrors());
			}
		},
		
		// process a request/response pair
		// returns true if the request completed and onSuccess() finished without erroring
		processResponse : function(response) {
			if (!response) throw TypeError(this+".processResponse(): expected a <response> object");
			if (response.result === "OK") {
				try {
					this.data = response.data;
					this.onSuccess(this.data);
					return true;
				} catch (e) {
					this.exception = e;
					this.addError("error-executing-callback");
					this.onError(this.getErrors());
					return false;
				}
			} else {
				this.data = response.data;

				// set the list of errorMessages
				var errors = response.data.error;
				if (! (errors instanceof Array)) errors = [errors];
				$.forEach(errors, function(error) {
					this.addError(error.message, error.data);
				}, this);
				this.onError(this.getErrors());
				return false;
			}
		},
		
		// Add an error message to request.errorMessages and translate it via the message dictionary
		addError : function(error, data) {
			var message;
			
			// first look up as "api.<Class.name>.<error>"
			message = $.message("api."+this.Class.reference+"."+error);
			// if no luck, try just "api.<error>"
			if (!message) message = $.message("api."+error);
			// if still no luck, just do generic error
			if (!message) message = $.message((data ? "api.error-unknown-with-data" : "api.error-unknown-no-data"));
			
			if (!message) message = error;
			
			// if data was passed in, interpolate with the data
			if (data) message = $.string.interpolate(message, data);

			if (!this.errorMessages) this.errorMessages = [];
			this.errorMessages.push(message);
		},
		
		// Callback called after completion of a successful request.
		//	- data is the response data in the requested format.
		onSuccess : function(data) {},
		
		// Callback called after completion of a request that fails,
		//	either because of a transport failure or exception during processing.
		//	- this.data is error data from a request/response pair (if present)
		//	- this.exception is an exception object which was thrown, if any.
		//	- this.errorMessages is an array of string error messages
		//	- this.getErrors() returns all error messages as a string
		onError : function(errors) {
			console.group("Error loading '"+this.url+"'");
			console.debug(this.getErrors());
			console.groupEnd();
		},
		
		// debug
		toString : function() {
			return "[Request "+this.url+"]";
		}
	},	// end prototype
	
	Class : {}	// no Class methods
});

