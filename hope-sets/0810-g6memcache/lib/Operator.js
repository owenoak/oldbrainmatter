/*
	An operator manages a set of operations (i.e. server calls).
	
	


	TODO
		- clean up transactions if not in debug mode?
	
*/

var Operator = Class.create({
	klass 					: "Operator",			

	debugOperations 		: false,			// false, true or "extreme"
	
	controller 				: undefined,		// controller we delegate dirty/messages/etc to
	
	operations 				: undefined,		// operations we understand
	transactions 			: undefined,		// transactions we know about
	transactionQueue		: undefined,		// transactions waiting to be executed
	
	timestampParameter 		: "r",				// parameter name for cache-bust timestamp
	transactionParameter 	: "tx",				// parameter name for transaction parameter

	ajaxTransportMethod 	: "POST",			// "POST" or "GET"
	

	initialize : function(props) {
		Object.extend(this, props);
		this.operations = {};
		this.transactions = [];
		this.transactionQueue = [];
	},
	
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
	register : function(id, params) {
		if (typeof id != "string") {
			params = id;
			for (var id in params) {
				this.register(id, params[id]);
			}
			return;
		}
		
		// normalize params
		if (params.asynchronous == null) 	params.asynchronous = true;
		if (params.evalJS == null) 			params.evalJS = "force";
		
		this.operations[id] = params;
	},
	

	// Change urls for registered operations.
	//	NOTE: this is mostly for debugging, so a static test page can change to test urls
	setOperationUrls : function(urls) {
		for (var id in urls) {
			var operation = this.operations[id];
			if (!operation) throw ("operator.setOperationUrls: operation "+id+" not understood");
			operation.url = urls[id];
		}
	},

	// begin an operation specified by id
	//	pass any params that you like
	beginOperation : function(operationId, params) {
        if (this.debugOperations) {
            this.info("beginOperation: ",operationId, " params:", params,
            			" success:",success," dirty:",dirty, " message:",message);
        }

		var transaction = this._createTransaction(operationId, params);

		// get the normalized/merged params
		params = transaction.params;

		var url = params.url.interpolate(params);
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
			transaction.callParams.postBody = Ajax.encodeUriParameters(params.parameters);
			transaction.callParams.requestHeaders = {
					'Content-type' : 'application/x-www-form-urlencoded',
					'Content-length' : paramString.length,
					'Connection': 'close'
				};
		}

		if (this.operationInProgress) {
			this.transactionQueue.push(transaction);
		} else {
			this._beginTransaction(transaction);
		}

		return transaction;
	},

	// returns transaction (trans.id == id stored under)
	_createTransaction : function(operationId, callParams) {
		var operationParams = this.operations[operationId];
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
	
	
	// begin a transaction 
	//	(note: this does not check if another transaction is already underway)
	_beginTransaction : function(transaction) {
		// remember the current transaction for any callbacks that need tor reference it
		this.transaction = transaction;

		// add it to the queue of executed transactions
		this.transactions.push(transaction);

		this.operationInProgress = true;

		// tell the controller we're about to start
		this.controller.onBeginOperation(transaction);
		
		// make the actual request
		new Ajax.Request(transaction.url, transaction.callParams);
	},

	// called when a transaction completes successfully, 
	//	no matter whether the app thinks it 'succeeded' or not
	_onTransactionSuccess : function(transaction, request) {
		this._debugTransaction(transaction, "success", request);
		this.controller.onOperationSuccess(transaction, request);
		this._finishTransaction();
	},

	// Called when a transaction generates a JS exception.
	// Note that we catch certain types of Exceptions and handle them in special
	//	ways, specifically:
	//
	//		* If the exception is an instance of OperationFailure
	//			we call the transaction.onFailure routine with the exception
	//
	//		* If the exception is an instance of AuthenticationFailure
	//			we call the controller.onAuthenticationFailure routine
	//
	_onTransactionException : function(transaction, request, exception) {
		if (this.debugging) console.error(exception);
		transaction.exception = exception;
		
		// handle operation failure (eg: something went wrong on the server side)
		if (exception instanceof OperationFailure) {
			this._debugTransaction(transaction, "failure", request);
			this.controller.onOperationFailure(transaction, request);

		// handle authentication failure
		} else if (exception instanceof AuthenticationFailure) {
			this._debugTransaction(transaction, "authentication", request);
			this.controller.onAuthenticationFailure(transaction, request);

		// some other exception
		} else {
			this._debugTransaction(transaction, "exception", request);
			this.controller.onOperationException(transaction, request);
		}
		this._finishTransaction();
	},
	
		
	// called when a transaction 'fails' 
	//	i.e. can't find URL or server returns an error code
	//	no matter whether the app thinks it 'succeeded' or not
	_onTransportFailure : function(transaction, request) {
		this._debugTransaction(transaction, "failure", request);
		this.controller.onTransportFailure(transaction, request);
		this._finishTransaction();
	},

	// called when transaction completes, no matter how it finished
	// starts next transaction in the queue if one is defined
	_finishTransaction : function() {
		this.operationInProgress = false;
		var transaction = this.transactionQueue.shift();
		if (transaction) this._beginTransaction(transaction);
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
		if (transaction.exception) console.error(transaction.exception);
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
			console.info("response:", response);
			console.group("responseText:");
				console.info(responseText);
			console.groupEnd();
	
			if (exception) {
				console.group("exception:");
					console.dir(exception);
				console.groupEnd();
			}

		console.groupEnd();
	}
});



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
