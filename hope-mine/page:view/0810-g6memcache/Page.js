/*
	An operator manages a set of operations (i.e. server calls).
	
	TODO
		- clean up transactions if not in debug mode?
	
*/

var Page = Class.create({
	klass 					: "Page",			

	debugOperations 		: false,			// false, true or "extreme"

	testingOperations 		: Cookie.get("testingOperations") == "true",
	
	controller 				: undefined,		// controller we delegate dirty/messages/etc to
	
	transactions 			: undefined,		// transactions we know about
	transactionQueue		: undefined,		// transactions waiting to be executed
	
	timestampParameter 		: "r",				// parameter name for cache-bust timestamp
	transactionParameter 	: "tx",				// parameter name for transaction parameter

	ajaxTransportMethod 	: "POST",			// "POST" or "GET"

	dataIsDirty				: false,			// if true, data needs to be 'saved' to not be dirty	

	updateOperations : undefined,

	// we only auto-update if the following 'conditions' are true
	//	(and we assume they are all true initially)
	updateConditions : {
		paused : false,
		formIsVisible : false,
		contactingServer : false,
		dialogIsVisible : false
	},

	// interval between auto updates
	updateInterval : 10,	


	//
	// messages to show if things go wrong with operations
	//

	// message to show while operations are in progress
	operationMessage : null,
	
	// operation failed (and provides no specific error message)
	operationFailureMessage : "Something went wrong",

	// unknown exception raised during an operation
	operationExceptionMessage : "Something went wrong #{error.message}",
	
	// operation could not contact the server
	transportFailureMessage : "Couldn't contact the server",

	// authentication failure message
	authenticationFailureMessage : "Authentication failure",

	
	
	initialize : function(props) {
		Object.extend(this, props);
		this.transactions = [];
		this.transactionQueue = [];

		// create an autoUpdater
		this.autoUpdater = new AutoUpdater({
			conditions		: this.updateConditions,
			debugging 		: this.debugUpdate,
			updateInterval	: this.updateInterval,
			onUpdate		: this.update.bind(this),
			enabled			: true
		});
		
		// if there is a 'pause' cookie set, suspend auto-updating
		//	turn back on with page.resume();
		if (Cookie.get("pauseUpdates") == "true") {
			this.pause();
		}
		
		// initialize any updateOperations		
		if (this.updateOperation) this.setUpdateOperation(this.updateOperation);
		if (Page.updateOperations.length) this.autoUpdater.enable();

		// create a notifier so we can show messages to the user
		this.notifier = new Notifier({controller:this});
		
		// set the window.onresize event up to call us
		window.onresize = this.onResize.bind(this);
	},
	
	// page.onResize() is automatically called when the window is resized
	// override onResize in your page to pass the resize event to page elements
	onResize : function() {},
	
	// register a single operation (id, params) or a set of operations ({id:params,...})
	//
	//	Operation params can have any of the following:
	//		url 			-- (required) url to call
	//		asynchronous 	-- (optional, default is true)
	//		method			-- (optional, default is "POST")
	//		evalJS			-- (optional, default is "force") 
	//							"force" 	== always  eval results as JS
	//							false 		==  NEVER  eval results as JS
	//
	//		onSuccess		-- (optional) anonymous success callback
	//		onFailure		-- (optional) anonymous failure callback
	//						--	both called as:  onXXX(transaction, callbackParams)
	//		
	//		message			-- (optional) message to show while operation is in progress
	//		successMessage	-- (optional) message to show when operation completes successfully
	//								(from the server's perspective)
	//		failureMessage	-- (optional) message to show when operation 'fails'
	//								(from the server's perspective)
	//
	registerOperations : function(id, params) {
		return Page.registerOperations(id, params);
		// this.registerOperation(id, params);  ???WTF??? NOTREACHED
	},
	registerOperation : function(id, params) {
		return Page.registerOperation(id, params);
	},
	

	// begin an operation specified by id
	//	pass any params that you like
	beginOperation : function(operationId, params) {
        if (this.debugOperations) {
            console.info("beginOperation: ",operationId, " params:", params);
        }

		var transaction = this._createTransaction(operationId, params);

		// get the normalized/merged params
		params = transaction.params;

		var url = (this.testingOperations ? params.testUrl || params.url : params.url);

		url = url.interpolate(params);
		// add timestamp parameter for cache-busting
		url += (url.indexOf("?") > -1 ? "&" : "?") 
				+ this.timestampParameter
				+ "=" + new Date().getTime();

		// add transaction parameter
		url += "&" + this.transactionParameter + "=" + transaction.id

		transaction.url = url;

		// set up the parameters for the call
		//	NOTE: we call our own success/failure, which do debugging and
		//		  transaction cleanup, and do NOT handle "app" suceess/failure for operations
		transaction.callParams = {
			method 			: params.method || this.ajaxTransportMethod,
			asynchronous 	: params.async,
			evalJS 			: params.evalJS,
			onSuccess 		: this._onTransactionSuccess.bind(this, transaction),
			onFailure 		: this._onTransportFailure.bind(this, transaction),
			onException 	: this._onTransactionException.bind(this, transaction)
		}

		// if there are form parameters to encode, add them to the call parameters
		if (params.parameters) {
            //            console.log("beginOperation: params = ", params.parameters);  // XXX
            //            console.log("beginOperation: method = ", transaction.callParams.method);  // XXX
            switch(transaction.callParams.method.toLowerCase()) {
            case "post":
			// encode the parameters and interpolate them with the params
			//	to get any dynamic data from the params
			transaction.callParams.postBody = Ajax.encodeUriParameters(params.parameters, params);
            //                console.log("beginOperation: method = "+transaction.callParams.method
            //                            +" encoded params = ", transaction.callParams.postBody);  // XXX
                break;
            case "post-noencode":
                transaction.callParams.postBody = params.parameters;
                //                console.log("beginOperation: method = "+transaction.callParams.method
                //                            +" non-encoded params = ", transaction.callParams.postBody);  // XXX
                break;
            default:
                transaction.callParams.postBody = Ajax.encodeUriParameters(params.parameters, params);
                //                console.log("beginOperation: default method = "+transaction.callParams.method
                //                            +" encoded params = ", transaction.callParams.postBody);  // XXX
                break;
            }

			// now add the body & headers to the callParams
			transaction.callParams.requestHeaders = {
					'Content-type' : 'application/x-www-form-urlencoded',
					'Content-length' : transaction.callParams.postBody.length,
					'Connection': 'close'
				};
		} else {
            //            console.log("beginOperation: no params ");  // XXX
		}
		
		if (params.asynchronous && this.operationInProgress) {
			this.transactionQueue.push(transaction);
		} else {
			this._executeTransaction(transaction);
		}
		
		// if an asynchronous transaction, return the responseText or responseXML
		if (params.asynchronous == false) {
			return (params.format == "xml" ? transaction.responseXML : transaction.responseText);
		} else {
			return transaction;
		}
	},


	// returns transaction (trans.id == id stored under)
	_createTransaction : function(operationId, callParams) {
		var operationParams = Page.operations[operationId];
		if (!operationParams) throw ("operator._createTransaction: "	
									+ "Don't understand operation "+operationId);
		
		// merge the operationParams with the callParams
		var params = Object.extend(Object.extend({}, operationParams),callParams);
	
		var transaction = {
			id 				: this.transactions.length,
			operationId 	: operationId,
			params 			: params
		};
		
		return transaction;
	},
	
	
	// begin a transaction IMMEDIATELY
	//	(note: this does not check if another transaction is already underway)
	_executeTransaction : function(transaction) {
		// remember the current transaction for any callbacks that need tor reference it
		this.transaction = transaction;
        //        console.log("_executeTransaction: ", this.transaction);  // XXX
		// add it to the queue of executed transactions
		this.transactions.push(transaction);

		this.operationInProgress = true;

		// get ready for the transaction to begin
		// pause auto-updating
		this.setUpdateCondition("contactingServer", true);
	
		// show a message if the operation or controller specifies one
		var message = transaction.message || this.operationMessage;
		if (message) {
			message = message.interpolate(transaction);
			this.showMessage(message);
		}
		
		// make the actual request
		new Ajax.Request(transaction.url, transaction.callParams);
	},

	// called when a transaction completes successfully, 
	//	no matter whether the app thinks it 'succeeded' or not
	_onTransactionSuccess : function(transaction, request) {
		this._debugTransaction(transaction, "success", request);

		// remember the responseText and responseXML
		transaction.responseText = request.responseText.strip();
		transaction.responseXML = request.responseXML;

		var message;
		if (transaction.params.onSuccess) 
			message = transaction.params.onSuccess(transaction, request);

		message = message || transaction.successMessage;

		this._completeTransaction(transaction, message);
	},

	// Called when a transaction generates a JS exception.
	// Note that we catch certain types of Exceptions and handle them in special
	//	ways, specifically:
	//
	//		* If the exception is an instance of OperationFailure
	//			we call the transaction.params.onFailure routine with the exception
	//
	//		* If the exception is an instance of AuthenticationFailure
	//			we call the controller.onAuthenticationFailure routine
	//
	_onTransactionException : function(transaction, request, exception) {
		if (this.debugging) console.error(exception);
		transaction.exception = exception;
		
		var message;

		// handle operation failure (eg: something went wrong on the server side)
		if (exception instanceof OperationFailure) {
			this._debugTransaction(transaction, "failure", request);
			if (transaction.params.onFailure) message = transaction.params.onFailure(transaction, request);
			message = message || transaction.failureMessage || this.operationFailureMessage;

		// handle authentication failure
		} else if (exception instanceof AuthenticationFailure) {
			this._debugTransaction(transaction, "authentication", request);
			var message = this.authenticationFailureMessage;

		// some other exception
		} else {
			this._debugTransaction(transaction, "exception", request);
			if (transaction.params.onException) 
                message = transaction.params.onException(transaction, request);
			message = message || transaction.exception.message || transaction.exceptionMessage || this.operationExceptionMessage;
		}
		this._completeTransaction(transaction, message);
	},
	
	// called when a transaction 'fails' 
	//	i.e. can't find URL or server returns an error code
	//	no matter whether the app thinks it 'succeeded' or not
	_onTransportFailure : function(transaction, request) {
		this._debugTransaction(transaction, "failure", request);
		var message = transaction.transportFailureMessage || this.transportFailureMessage;
		this._completeTransaction(transaction, message);
	},

	// called when transaction completes, no matter how it finished
	// starts next transaction in the queue if one is defined
	_completeTransaction : function(transaction, message) {
		if (message) message = message.interpolate(transaction);

		if (message) 	this.flashMessage(message);
		else			this.clearMessage(message);
		
		// un-pause auto-updating
		this.setUpdateCondition("contactingServer", false);
		this.operationInProgress = false;

		// if there is another transaction to start, execute it now
		transaction = this.transactionQueue.shift();
		if (transaction) this._executeTransaction(transaction);
	},

	// status is "success" or "failure" or "exception"
	// transaction.exception is the exception that was generated
	_debugTransaction : function(transaction, status, request) {
        if (request.transport && 
            /Login<\/TITLE>/.match(request.transport.responseText)) {
            // We hit the web timeout on this request and got a login
            // screen instead of JSON data; ignore the error
            return;
        }
        if (transaction.exception) 
            console.error("transaction exception: ",transaction.exception);
		if (!this.debugOperations) return;
		
		var message = "Operation " + transaction.operationId;
		switch (status) {
			case "success" 			: 	message += ": succeeded"; 				break;
			case "failure" 			: 	message += ": failed"; 					break;
			case "authentication" 	: 	message += ": authentication failure";	break;
			case "exception"		: 	message += ": exception :" 
													+ transaction.exception.message;
		}

		var responseText = (request.transport ? request.transport.responseText : undefined);

		if (this.debugOperations == "extreme") {
			alert(message);
			alert(responseText);		
		}

		// output useful debug stuff
		console.group(message);
			console.info("transaction:", transaction);
            //			console.info("response:", response);
			console.group("responseText:");
				console.info(responseText);
			console.groupEnd();
	
			if (transaction.exception) {
				console.group("exception:");
					console.dir(transaction.exception);
				console.groupEnd();
			}

		console.groupEnd();
	},
	
	
	//
	//	auto-update stuff
	//
	registerUpdateOperation : function(operationId) {
		Page.registerUpdateOperation(operationId);
	},
	
	
	// fired when the auto-updater timer goes off or you can call it manually
	update : function() {
		if (Page.updateOperations.length) {
			Page.updateOperations.each(function(id) {
				this.beginOperation(id);
			}, this);
		}
	},
	
	
	// pause auto-update
	//  NOTE: sets a cookie so update will be paused when we come back to the page
	pause : function() {
		if (Cookie.get("pauseUpdates") != "true") Cookie.set("pauseUpdates", "true");
		this.setUpdateCondition("paused", true);
	},
	
	// resume auto-update
	//  NOTE: clears the cookie which pauses update when we enter the page
	resume : function() {
		if (Cookie.get("pauseUpdates") == "true") Cookie.clear("pauseUpdates");
		this.setUpdateCondition("paused", false);
	},
    // XXX To be called from firebug console, to enable debugging
    setDebug : function(state) {
            console.log("setDebug: setting debugOperations to "+state);
            this.debugOperations = state;
    },
	
	setUpdateCondition : function(condition, state) {
		this.autoUpdater.setCondition(condition, state);
	},
	
	//
	// 'dirty' state
	//
	setDirtyState : function(dirty) {
		this.dataIsDirty = dirty;
	}

});


//
//	static methods
//
//	NOTE: there is only one set of operations for the entire page
//
Object.extend(Page, {
	operations 				: {},		// operations we understand
	updateOperations		: [],		// list of update operations
	
	// register a single operation (id, params) or a set of operations ({id:params,...})
	//
	//	Operation params can have any of the following:
	//		url 			-- (required) url to call
	//		asynchronous 	-- (optional, default is true)
	//		method			-- (optional, default is "POST")
	//		evalJS			-- (optional, default is "force") 
	//							"force" 	== always  eval results as JS
	//							false 		==  NEVER  eval results as JS
	//
	//		onSuccess		-- (optional) anonymous success callback
	//		onFailure		-- (optional) anonymous failure callback
	//						--	both called as:  onXXX(transaction, callbackParams)
	//		
	//		message			-- (optional) message to show while operation is in progress
	//		successMessage	-- (optional) message to show when operation completes successfully
	//								(from the server's perspective)
	//		failureMessage	-- (optional) message to show when operation 'fails'
	//								(from the server's perspective)
	//
	registerOperations : function(id, params) {
		Page.registerOperation(id, params);
	},
	registerOperation : function(id, params) {
		if (typeof id != "string") {
			params = id;
			for (var op in params) {
				Page.registerOperation(op, params[op]);
			}
			return;
		}
		
		// normalize params
		if (params.asynchronous == null) 	params.asynchronous = true;
		if (params.evalJS == null) 			params.evalJS = "force";
		
		Page.operations[id] = params;
	},
	
	registerUpdateOperation : function(operationId) {
		Page.updateOperations.push(operationId);
	}
});


//
//	create delegators for pass-through notifier methods
//
Object.createDelegators(
	Page.prototype, "this.notifier", 
	{
		showMessage : "show",
		showWarning : "warn",
		showError : "error",
		flashMessage : "flash",
		clearMessage : "clear"
	}
);




// Execption to throw if operation failed on the server side for some reason.
// This will invoke the "onFailure" handler of the current operation.
//
//	Create subclasses of this for more specific exception handling.
//
window.OperationFailure = function (params) {
	Object.extend(this, params);
}

// Exception to throw if operation failed because the user was not authenticated
//	(e.g., credentials timed out, etc).
window.AuthenticationFailure = function(params) {
	Object.extend(this, params);
}
