/**
	Class:  $.StackedRequest
	
	Method for "stacking" many $.Requests into a single HTTP request via a server proxy.
	
	Create an instance of $.StackedRequest and add many $.Request instances to it,
	then execute the StackedRequest to send all the requests at once.  eg:
	
	var queue = new $.StackedRequest({order:"parallel"});
	queue.addRequest(new $.MyRequest(someData));
	queue.addRequest(new $.SomeOtherRequest(otherData));
	queue.execute();
	
**/

new $.Request.subclass({
	reference : "$.StackedRequest",
	prototype : {

		url 		: "/api/RequestProxy/latest",	// url for the stacked request proxy.
		order  		: "parallel",					// "serial" or "parallel" execution of requests
		stopOnError	: "continue",					// "stop" or "continue" when an error has been encountered
	
	
		// initialize the list of requests on construction
		initialize : function() {
			this.requests = [];
		},
		
		
		// set the requests to an array $.Request instances
		setRequests : function(requests) {
			this.requests.push.apply(this.requests, requests);
		},
		
		// add a single $.Request instance
		addRequest : function(request, serial, stopOnError) {
			this.requests.push(request);
			if (serial) 		this.order = "serial";
			if (stopOnError)	this.stopOnError = "stop";
		},
		
		// Package all of the request inputs together in the "request/response" style.
		getInputData : function() {
			// get an array of data for each request
			this.requestData = $.forEach(this.requests, function(request, index) {
				request.url = request.getUrl();
				this.request = request;
				this.requestNumber = index;
				return $.string.interpolate(this.requestTemplate, this);
			}, this).join("\n");
			delete this.request;
			delete this.requestNumber;
			
			// now get the master data string
			var inputData = $.string.interpolate(this.inputTemplate, this);
			return inputData;
		},
		
		// input data template for the stacked request outer context
		inputTemplate 		: "<requests order='#{order}' onerror='#{stopOnError}'>\n"
							+	 "#{requestData}"
							+ "</requests>",
							 
		// input data wrapper for each individual sub-request
		requestTemplate  	: "	<request index='#{requestNumber}'>\n"
							+ "		<url><![CDATA[#{request.url}]]></url>\n"
							+ 		"#{request.getInputData()}"
							+ "	</request>\n",
							 

		// process a series of request/response pairs
		processResponse : function(responses) {
			var responses = responses.response;
			if (! (responses instanceof Array)) responses = [responses];
			
			// keep track of responses so we can handle missing responses
			var anyFailed = false,
				missingRequests = [].concat(this.requests),
				failedRequests = []
			;

			// sort the responses by index so they're in the request order
			$.list.sortBy(responses, "index");

			// tell each request to process its own response
			$.forEach(responses, function(response, reponseNum) {
				// assume they're in order if no index was specified
				var index   = response.index || reponseNum,
					request = this.requests[index]
				;
				if (!request) throw TypeError("Couldn't find request for response "+index);
				$.list.remove(missingRequests, request);
	
				if (request.dataType === "request/response") {
					var succeeded = request.processResponse(response);
				} else {
					try {
						succeeded = true;
						request.onSuccess(response.data);
					} catch (e) {
						succeeded = false;
					}
				}
				
				if (!succeeded) {
					failedRequests.push(request);
				}
			}, this);
			
			// if there are any requests that didn't come back, tell them they failed
			$.forEach(missingRequests, function(request) {
				failedRequests.push(request);
				request.addError("error-call-failed");
				request.onError();
			});
			
			// if everything succeeded, call our onSuccess handlers
			if (failedRequests.length === 0) {
				try {
					this.onSuccess();
					return true;
				} catch (e) {
					this.exception = e;
					this.addError("error-executing-callback");
					this.onError();
					return false;
				}
			} 
			// something went wrong, call our onError handler
			else {
				this.failedRequests = failedRequests;
				//TODO: stick error messages from items in here?
				this.addError("error-stacked-request-failed");
				this.onError();
				return false;
			}
		},
		
		// Callback called after ALL requests have completed successfully.
		onSuccess : function() {},
		
		// Callback called once after ANY request has failed (AFTER all requests have been finished).
		onError : function() {
			console.group("Error executing RequestStack ",this);
			console.info("error(s): ",this.getErrors());
			if (this.exception) console.error(this.exception);
			if (this.failedRequests) console.info("failedRequests: ", this.failedRequests);
			console.groupEnd();
		},

		// debug
		toString : function() {
			return "[a StackedRequest]";
		}		
	},	// end prototype
	
	Class : {}	// no Class methods
});
