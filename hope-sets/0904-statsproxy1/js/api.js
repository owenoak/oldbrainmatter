/*
 *	Encapsulate a geneic client/server api.
 */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

$.api = {
	
	/** Map of {operation name -> params}.  Fill in by calling $.api.register(). */
	operations : {},
	
	/** Stack of calls to execute sequentially. */
	callStack : [],
	
	defaults : {
		/** Default options for ajax calls */
		ajaxOptions : {
			cache 		: false,
			async 		: true,
			type 		: "GET",
			dataType	: "xml"
		},
		
		/** Default onError routine to fire if none was specified in the operation. */
		onError : function(errorMessage, params) {
			console.debug("Error loading '"+params.options.url+"'");
			console.debug(errorMessage, params);
		},
		
		/** Error signal for a call that return a non-200 result. */
		callFailedData : {
			error : {
				message : "error-call-failed"
			}
		}
	},
	
	
	/** Register an operation that can be called later.*/
	register : function(operation, callParams) {
		if ($.api[operation]) {
			throw new TypeError("$.api."+operation+" is already defined -- choose a new operation name");
		}

		// add $.api.defaults.ajaxOptions to the callParams.options
		callParams.ajaxOptions = $.extend({}, $.api.defaults.ajaxOptions, callParams.ajaxOptions);
		// set up other defaults
		callParams.operation = operation;
		if (!callParams.onError) callParams.onError = $.api.defaults.onError;
		
		// register the operation
		$.api.operations[operation] = callParams;
		
		// define a 'callAs' function with a nicer syntax
		var callAs = callParams.callAs ||
					 function(callOptions) {
					 	$.api.call(operation, callOptions);
					 };
		$.api[operation] = callAs;
	},
	
	
	/** Call an operation as specified in callParams. */
	call : function(operation, callParams) {
		// add the default operation params to the callParams
		callParams = $.extend({}, $.api.operations[operation], callParams);

		// see if there's a message we should display
		var msg = callParams.loadingMessage || "api."+operation+".loading";
		msg = $.message(msg, callParams.substitutions);
		if (msg) {
			if (callParams.notifierType == "flash") {
				$.notifier.flash(msg);
			} else {
				$.notifier.show(msg);
			}
		}
		
		// if they passed in a substitutions object, 
		//	run callParams.url and callParams.data through that.
		if (callParams.substitutions) {
			callParams.url = $.string.interpolate(callParams.url, callParams.substitutions);
			
			if (callParams.data) {
				callParams.data = $.string.interpolate(callParams.data, callParams.substitutions);
			}
		}
		
		if (!callParams.callbackArgs) callParams.callbackArgs = [];

		// set up the ajaxOptions
		// make a clean set of the ajaxOptions that we can munge
		var ajaxOptions = callParams.ajaxOptions = $.extend({}, callParams.ajaxOptions);

		ajaxOptions.url = callParams.url;
		ajaxOptions.data = callParams.data;
		
		// set up the success and error calls
		ajaxOptions.success = function (data, httpStatus) { 
			callParams.status = httpStatus;
			
			// call the onSuccess handler
			$.api._onAjaxSuccess(callParams, data);
		};

		ajaxOptions.error = function (request, httpStatus, exception) { 
			callParams.status = httpStatus;
			callParams.exception = exception;
			
			// call the onError handler with the 'error-call-failed' error message
			$.api._onAjaxError(callParams, $.api.defaults.callFailedData);
		};
		
		// push the call onto the callStack
		$.api.callStack.push(callParams);
		
		// and execute the call now (this will defer if another operation is already in process)
		$.api._executeNextCall();
	},


	/** Execute the first item on the callStack (as set up by $.api.call) */
	_executeNextCall : function() {
		// if there is a call outstanding, bail.  We will be called again when that call completes.
		if ($.api._currentCall) return;
		
		// if there are no calls on the stack, bail.
		if ($.api.callStack.length == 0) return $.api._allCallsCompleted();
		
		// grab (and remember) the next call on the stack and do the ajax thang
		var callParams = $.api._currentCall = $.api.callStack.shift();
		callParams.request = $.ajax(callParams.ajaxOptions);
	},

	/** A call completed -- go on to the next one. */
	_callCompleted : function() {
		// if there is a call outstanding
		if ($.api._currentCall) {
			// call its onComplete handler if one was specified
			if ($.api._currentCall.onComplete) $.api._currentCall.onComplete();
			delete $.api._currentCall;
		}

		// and call the next one
		$.api._executeNextCall();
	},
	
	/** All outstanding calls have been completed.  
		Override this in your app to, eg, start a timer which will reload periodically.
	 */
	_allCallsCompleted : function() {},
	

	/** Server ajax call suceeded. */
	_onAjaxSuccess : function(callParams, replyData) {
		var resultCode;
		try {
			// if we're dealing with XML data
			if (callParams.ajaxOptions.dataType == "xml") {
				if (replyData) {
					// convert the XML data to a JS object
					replyData = $.xml.toObject(replyData);
		
						// 0 == success, anything else means failures
					var	resultCode = replyData.response.result,
						// acual data of the reply
						replyData = replyData.response.data
					;
				}
				
				// if we got an error result...
				if (resultCode != "OK") {
					// ... process in _onAjaxError() instead
					return $.api._onAjaxError(callParams, replyData);
				}
			}
	
			// no error, so call the onSuccess handler
			
			// push the reply data on the beginning of the stack
			callParams.callbackArgs.unshift(replyData);
			// and call the onSuccess handler
			callParams.onSuccess.apply(null, callParams.callbackArgs);
		} catch (e) {
			if (SP.config.testing == "UI") {
				console.error("Error processing results of ajax call:",e);
			}
			// error processing results -- call onError
			return $.api._onAjaxError(callParams, null);
		}

		// signal that the call has completed (which will call the next one on the stack)
		$.api._callCompleted();
	},
	
	/** Server ajax call failed -- call callParams.onError with a generic error message. */
	_onAjaxError : function(callParams, errorData) {
		if (errorData) {
			callParams.errorData = errorData;
	
			// parse the <error>s out of the errorData
			var errors = errorData.error;
			// make sure we've got an array
			if (! (errors instanceof Array)) errors = [errors];
	
			var errorMessages = [];
			$.each(errors, function(index, error) {
				errorMessages.push($.api._getErrorMessage(callParams.operation, error.message, error));
			});
			callParams.errorMessages = errorMessages;
		}
		// if no errorData (because of malformed response)
		else {
			errorMessages = [$.api._getErrorMessage(callParams.operation)];
		}

		// push the callParams + error messages (as a string) on the front of the callbackArgs
		//	(if you want error messages as an array, use  callParams.errorMessages)
		var args = callParams.callbackArgs;
		args.unshift(errorMessages.join("<br>"));
		args.unshift(callParams);

		// call the onError callback
		callParams.onError.apply(null, args);
		
		// signal that the call has completed (which will call the next one on the stack)
		$.api._callCompleted();
	},
	

	/** Return an ajax error message from the message dictionary. */
	_getErrorMessage : function(operation, error, data) {
		if (error == null) error = "error";
		
		// look up first as  "<operation>-<error>"
		var msg = $.message("api." + operation + "." + error);
		
		// if we can't find that, just look up as "<error>"
		if (!msg) msg = $.message("api."+error);
		
		// if still no joy, return the generic "<error>"
		if (!msg) msg = $.message((data ? "api.error-unknown-with-data" : "api.error-unknown-no-data"));
		
		// if they passed in a data object, substitute with that
		if (data) msg = $.string.interpolate(msg, data);
		
		return msg;
	}
}
