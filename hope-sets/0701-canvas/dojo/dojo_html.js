//////////////////////////////
//
//	FILE:  dojo/dom.js
//
//////////////////////////////

dojo.dom = {
	ELEMENT_NODE                  :  1,
	ATTRIBUTE_NODE                :  2,
	TEXT_NODE                     :  3,
	CDATA_SECTION_NODE            :  4,
	ENTITY_REFERENCE_NODE         :  5,
	ENTITY_NODE                   :  6,
	PROCESSING_INSTRUCTION_NODE   :  7,
	COMMENT_NODE                  :  8,
	DOCUMENT_NODE                 :  9,
	DOCUMENT_TYPE_NODE            :  10,
	DOCUMENT_FRAGMENT_NODE        :  11,
	NOTATION_NODE                 :  12,

	dojoml : "http:/"+"/www.dojotoolkit.org/2004/dojoml",
	
	isNode : function(/* object */wh){
		//	summary:
		//		checks to see if wh is actually a node.
		if(typeof Element == "function") {
			try {
				return wh instanceof Element;	//	boolean
			} catch(e) {}
		} else {
			// best-guess
			return wh && !isNaN(wh.nodeType);	//	boolean
		}
	},
	
	getUniqueId : function(){
		//	summary:
		//		returns a unique string for use with any DOM element
		var _document = dojo.doc();
		do {
			var id = "dj_unique_" + (++arguments.callee._idIncrement);
		}while(_document.getElementById(id));
		return id;	//	string
	},
	
	firstElement : function(/* Element */parentNode, /* string? */tagName){
		//	summary:
		//		returns the first child element matching tagName
		var node = parentNode.firstChild;
		while(node && node.nodeType != dojo.dom.ELEMENT_NODE){
			node = node.nextSibling;
		}
		if(tagName && node && node.tagName && node.tagName.toLowerCase() != tagName.toLowerCase()) {
			node = dojo.dom.nextElement(node, tagName);
		}
		return node;	//	Element
	},
	
	lastElement : function(/* Element */parentNode, /* string? */tagName){
		//	summary:
		//		returns the last child element matching tagName
		var node = parentNode.lastChild;
		while(node && node.nodeType != dojo.dom.ELEMENT_NODE) {
			node = node.previousSibling;
		}
		if(tagName && node && node.tagName && node.tagName.toLowerCase() != tagName.toLowerCase()) {
			node = dojo.dom.prevElement(node, tagName);
		}
		return node;	//	Element
	},
	
	nextElement : function(/* Node */node, /* string? */tagName){
		//	summary:
		//		returns the next sibling element matching tagName
		if(!node) { return null; }
		do {
			node = node.nextSibling;
		} while(node && node.nodeType != dojo.dom.ELEMENT_NODE);
	
		if(node && tagName && tagName.toLowerCase() != node.tagName.toLowerCase()) {
			return dojo.dom.nextElement(node, tagName);
		}
		return node;	//	Element
	},
	
	prevElement : function(/* Node */node, /* string? */tagName){
		//	summary:
		//		returns the previous sibling element matching tagName
		if(!node) { return null; }
		if(tagName) { tagName = tagName.toLowerCase(); }
		do {
			node = node.previousSibling;
		} while(node && node.nodeType != dojo.dom.ELEMENT_NODE);
	
		if(node && tagName && tagName.toLowerCase() != node.tagName.toLowerCase()) {
			return dojo.dom.prevElement(node, tagName);
		}
		return node;	//	Element
	},
	
	
	moveChildren : function(/*Element*/srcNode, /*Element*/destNode, /*boolean?*/trim){
		//	summary:
		//		Moves children from srcNode to destNode and returns the count of
		//		children moved; will trim off text nodes if trim == true
		var count = 0;
		if(trim) {
			while(srcNode.hasChildNodes() &&
				srcNode.firstChild.nodeType == dojo.dom.TEXT_NODE) {
				srcNode.removeChild(srcNode.firstChild);
			}
			while(srcNode.hasChildNodes() &&
				srcNode.lastChild.nodeType == dojo.dom.TEXT_NODE) {
				srcNode.removeChild(srcNode.lastChild);
			}
		}
		while(srcNode.hasChildNodes()){
			destNode.appendChild(srcNode.firstChild);
			count++;
		}
		return count;	//	number
	},
	
	copyChildren : function(/*Element*/srcNode, /*Element*/destNode, /*boolean?*/trim){
		//	summary:
		//		Copies children from srcNde to destNode and returns the count of
		//		children copied; will trim off text nodes if trim == true
		var clonedNode = srcNode.cloneNode(true);
		return this.moveChildren(clonedNode, destNode, trim);	//	number
	},
	
	replaceChildren : function(/*Element*/node, /*Node*/newChild){
		//	summary:
		//		Removes all children of node and appends newChild. All the existing
		//		children will be destroyed.
		// FIXME: what if newChild is an array-like object?
		var nodes = [];
		if(dojo.render.html.ie){
			for(var i=0;i<node.childNodes.length;i++){
				nodes.push(node.childNodes[i]);
			}
		}
		dojo.dom.removeChildren(node);
		node.appendChild(newChild);
		for(var i=0;i<nodes.length;i++){
			dojo.dom.destroyNode(nodes[i]);
		}
	},
	
	removeChildren : function(/*Element*/node){
		//	summary:
		//		removes all children from node and returns the count of children removed.
		//		The children nodes are not destroyed. Be sure to call destroyNode on them
		//		after they are not used anymore.
		var count = node.childNodes.length;
		while(node.hasChildNodes()){ dojo.dom.removeNode(node.firstChild); }
		return count; // int
	},
	
	replaceNode : function(/*Element*/node, /*Element*/newNode){
		//	summary:
		//		replaces node with newNode and returns a reference to the removed node.
		//		To prevent IE memory leak, call destroyNode on the returned node when
		//		is not used anymore.
		return node.parentNode.replaceChild(newNode, node); // Node
	},
	
	destroyNode : function(/*Node*/node){
		// summary:
		//		destroy a node (it can not be used any more). For IE, this is the
		//		right function to call to prevent memory leaks. While for other
		//		browsers, this is identical to dojo.dom.removeNode
		if(node.parentNode){
			node = dojo.dom.removeNode(node);
		}
		if(node.nodeType != 3){ // ignore TEXT_NODE
			if(dojo.exists("dojo.event.browser.clean")){
				dojo.event.browser.clean(node);
			}
			if(dojo.render.html.ie){
				node.outerHTML=''; //prevent ugly IE mem leak associated with Node.removeChild (ticket #1727)
			}
		}
	},
	
	removeNode : function(/*Node*/node){
		// summary:
		//		if node has a parent, removes node from parent and returns a
		//		reference to the removed child.
		//		To prevent IE memory leak, call destroyNode on the returned node when
		//		is not used anymore.
		//	node:
		//		the node to remove from its parent.
	
		if(node && node.parentNode){
			// return a ref to the removed child
			return node.parentNode.removeChild(node); //Node
		}
	},
	
	getAncestors : function(/*Node*/node, /*function?*/filterFunction, /*boolean?*/returnFirstHit){
		//	summary:
		//		returns all ancestors matching optional filterFunction; will return
		//		only the first if returnFirstHit
		var ancestors = [];
		var isFunction = (filterFunction && (filterFunction instanceof Function || typeof filterFunction == "function"));
		while(node){
			if(!isFunction || filterFunction(node)){
				ancestors.push(node);
			}
			if(returnFirstHit && ancestors.length > 0){ 
				return ancestors[0]; 	//	Node
			}
			
			node = node.parentNode;
		}
		if(returnFirstHit){ return null; }
		return ancestors;	//	array
	},
	
	getAncestorsByTag : function(/*Node*/node, /*String*/tag, /*boolean?*/returnFirstHit){
		//	summary:
		//		returns all ancestors matching tag (as tagName), will only return
		//		first one if returnFirstHit
		tag = tag.toLowerCase();
		return dojo.dom.getAncestors(node, function(el){
			return ((el.tagName)&&(el.tagName.toLowerCase() == tag));
		}, returnFirstHit);	//	Node || array
	},
	
	getFirstAncestorByTag : function(/*Node*/node, /*string*/tag){
		//	summary:
		//		Returns first ancestor of node with tag tagName
		return dojo.dom.getAncestorsByTag(node, tag, true);	//	Node
	},
	
	isDescendantOf : function(/* Node */node, /* Node */ancestor, /* boolean? */guaranteeDescendant){
		//	summary
		//	Returns boolean if node is a descendant of ancestor
		// guaranteeDescendant allows us to be a "true" isDescendantOf function
		if(guaranteeDescendant && node) { node = node.parentNode; }
		while(node) {
			if(node == ancestor){ 
				return true; 	//	boolean
			}
			node = node.parentNode;
		}
		return false;	//	boolean
	},
	
	innerXML : function(/*Node*/node){
		//	summary:
		//		Implementation of MS's innerXML function.
		if(node.innerXML){
			return node.innerXML;	//	string
		}else if (node.xml){
			return node.xml;		//	string
		}else if(typeof XMLSerializer != "undefined"){
			return (new XMLSerializer()).serializeToString(node);	//	string
		}
	},
	
	createDocument : function(){
		//	summary:
		//		cross-browser implementation of creating an XML document object.
		var doc = null;
		var _document = dojo.doc();
	
		if(!dj_undef("ActiveXObject")){
			var prefixes = [ "MSXML2", "Microsoft", "MSXML", "MSXML3" ];
			for(var i = 0; i<prefixes.length; i++){
				try{
					doc = new ActiveXObject(prefixes[i]+".XMLDOM");
				}catch(e){ /* squelch */ };
	
				if(doc){ break; }
			}
		}else if((_document.implementation)&&
			(_document.implementation.createDocument)){
			doc = _document.implementation.createDocument("", "", null);
		}
		
		return doc;	//	DOMDocument
	},
	
	createDocumentFromText : function(/*string*/str, /*string?*/mimetype){
		//	summary:
		//		attempts to create a Document object based on optional mime-type,
		//		using str as the contents of the document
		if(!mimetype){ mimetype = "text/xml"; }
		if(!dj_undef("DOMParser")){
			var parser = new DOMParser();
			return parser.parseFromString(str, mimetype);	//	DOMDocument
		}else if(!dj_undef("ActiveXObject")){
			var domDoc = dojo.dom.createDocument();
			if(domDoc){
				domDoc.async = false;
				domDoc.loadXML(str);
				return domDoc;	//	DOMDocument
			}else{
				dojo.debug("toXml didn't work?");
			}
		/*
		}else if((dojo.render.html.capable)&&(dojo.render.html.safari)){
			// FIXME: this doesn't appear to work!
			// from: http://web-graphics.com/mtarchive/001606.php
			// var xml = '<?xml version="1.0"?>'+str;
			var mtype = "text/xml";
			var xml = '<?xml version="1.0"?>'+str;
			var url = "data:"+mtype+";charset=utf-8,"+encodeURIComponent(xml);
			var req = new XMLHttpRequest();
			req.open("GET", url, false);
			req.overrideMimeType(mtype);
			req.send(null);
			return req.responseXML;
		*/
		}else{
			var _document = dojo.doc();
			if(_document.createElement){
				// FIXME: this may change all tags to uppercase!
				var tmp = _document.createElement("xml");
				tmp.innerHTML = str;
				if(_document.implementation && _document.implementation.createDocument){
					var xmlDoc = _document.implementation.createDocument("foo", "", null);
					for(var i = 0; i < tmp.childNodes.length; i++) {
						xmlDoc.importNode(tmp.childNodes.item(i), true);
					}
					return xmlDoc;	//	DOMDocument
				}
				// FIXME: probably not a good idea to have to return an HTML fragment
				// FIXME: the tmp.doc.firstChild is as tested from IE, so it may not
				// work that way across the board
				return ((tmp.document)&&
					(tmp.document.firstChild ?  tmp.document.firstChild : tmp));	//	DOMDocument
			}
		}
		return null;
	},
	
	prependChild : function(/*Element*/node, /*Element*/parent){
		//	summary:
		//		prepends node to parent's children nodes
		if(parent.firstChild) {
			parent.insertBefore(node, parent.firstChild);
		} else {
			parent.appendChild(node);
		}
		return true;	//	boolean
	},
	
	insertBefore : function(/*Node*/node, /*Node*/ref, /*boolean?*/force){
		//	summary:
		//		Try to insert node before ref
		if(	(force != true)&&
			(node === ref || node.nextSibling === ref)){ return false; }
		var parent = ref.parentNode;
		parent.insertBefore(node, ref);
		return true;	//	boolean
	},
	
	insertAfter : function(/*Node*/node, /*Node*/ref, /*boolean?*/force){
		//	summary:
		//		Try to insert node after ref
		var pn = ref.parentNode;
		if(ref == pn.lastChild){
			if((force != true)&&(node === ref)){
				return false;	//	boolean
			}
			pn.appendChild(node);
		}else{
			return this.insertBefore(node, ref.nextSibling, force);	//	boolean
		}
		return true;	//	boolean
	},
	
	insertAtPosition : function(/*Node*/node, /*Node*/ref, /*string*/position){
		//	summary:
		//		attempt to insert node in relation to ref based on position
		if((!node)||(!ref)||(!position)){ 
			return false;	//	boolean 
		}
		switch(position.toLowerCase()){
			case "before":
				return dojo.dom.insertBefore(node, ref);	//	boolean
			case "after":
				return dojo.dom.insertAfter(node, ref);		//	boolean
			case "first":
				if(ref.firstChild){
					return dojo.dom.insertBefore(node, ref.firstChild);	//	boolean
				}else{
					ref.appendChild(node);
					return true;	//	boolean
				}
				break;
			default: // aka: last
				ref.appendChild(node);
				return true;	//	boolean
		}
	},
	
	insertAtIndex : function(/*Node*/node, /*Element*/containingNode, /*number*/insertionIndex){
		//	summary:
		//		insert node into child nodes nodelist of containingNode at
		//		insertionIndex. insertionIndex should be between 0 and 
		//		the number of the childNodes in containingNode. insertionIndex
		//		specifys after how many childNodes in containingNode the node
		//		shall be inserted. If 0 is given, node will be appended to 
		//		containingNode.
		var siblingNodes = containingNode.childNodes;
	
		// if there aren't any kids yet, just add it to the beginning
	
		if (!siblingNodes.length || siblingNodes.length == insertionIndex){
			containingNode.appendChild(node);
			return true;	//	boolean
		}
	
		if(insertionIndex == 0){
			return dojo.dom.prependChild(node, containingNode);	//	boolean
		}
		// otherwise we need to walk the childNodes
		// and find our spot
	
		return dojo.dom.insertAfter(node, siblingNodes[insertionIndex-1]);	//	boolean
	},
		
	textContent : function(/*Node*/node, /*string*/text){
		//	summary:
		//		implementation of the DOM Level 3 attribute; scan node for text
		if (arguments.length>1) {
			var _document = dojo.doc();
			dojo.dom.replaceChildren(node, _document.createTextNode(text));
			return text;	//	string
		} else {
			if(node.textContent != undefined){ //FF 1.5
				return node.textContent;	//	string
			}
			var _result = "";
			if (node == null) { return _result; }
			for (var i = 0; i < node.childNodes.length; i++) {
				switch (node.childNodes[i].nodeType) {
					case 1: // ELEMENT_NODE
					case 5: // ENTITY_REFERENCE_NODE
						_result += dojo.dom.textContent(node.childNodes[i]);
						break;
					case 3: // TEXT_NODE
					case 2: // ATTRIBUTE_NODE
					case 4: // CDATA_SECTION_NODE
						_result += node.childNodes[i].nodeValue;
						break;
					default:
						break;
				}
			}
			return _result;	//	string
		}
	},
	
	hasParent : function(/*Node*/node){
		//	summary:
		//		returns whether or not node is a child of another node.
		return Boolean(node && node.parentNode && dojo.dom.isNode(node.parentNode));	//	boolean
	},
	
	/**
	 * Examples:
	 *
	 * myFooNode = <foo />
	 * isTag(myFooNode, "foo"); // returns "foo"
	 * isTag(myFooNode, "bar"); // returns ""
	 * isTag(myFooNode, "FOO"); // returns ""
	 * isTag(myFooNode, "hey", "foo", "bar"); // returns "foo"
	**/
	isTag : function(/* Node */node /* ... */){
		//	summary:
		//		determines if node has any of the provided tag names and returns
		//		the tag name that matches, empty string otherwise.
		if(node && node.tagName) {
			for(var i=1; i<arguments.length; i++){
				if(node.tagName==String(arguments[i])){
					return String(arguments[i]);	//	string
				}
			}
		}
		return "";	//	string
	},
	
	setAttributeNS : function(	/*Element*/elem, /*string*/namespaceURI, 
										/*string*/attrName, /*string*/attrValue){
		//	summary:
		//		implementation of DOM2 setAttributeNS that works cross browser.
		if(elem == null || ((elem == undefined)&&(typeof elem == "undefined"))){
			dojo.raise("No element given to dojo.dom.setAttributeNS");
		}
		
		if(!((elem.setAttributeNS == undefined)&&(typeof elem.setAttributeNS == "undefined"))){ // w3c
			elem.setAttributeNS(namespaceURI, attrName, attrValue);
		}else{ // IE
			// get a root XML document
			var ownerDoc = elem.ownerDocument;
			var attribute = ownerDoc.createNode(
				2, // node type
				attrName,
				namespaceURI
			);
			
			// set value
			attribute.nodeValue = attrValue;
			
			// attach to element
			elem.setAttributeNode(attribute);
		}
	}

}
dojo.dom.getUniqueId._idIncrement = 0;

dojo.dom.getFirstChildElement = dojo.dom.firstElement;
dojo.dom.getLastChildElement = dojo.dom.lastElement;
dojo.dom.getNextSiblingElement = dojo.dom.nextElement;
dojo.dom.getPreviousSiblingElement = dojo.dom.prevElement;


//////////////////////////////
//
//	FILE:  dojo/html/common.js
//
//////////////////////////////

dojo.html = {};
dojo.lang.mixin(dojo.html, dojo.dom);

dojo.lang.mixin(dojo.html, {
	getEventTarget : function(/* DOMEvent */evt){
		//	summary
		//	Returns the target of an event
		if(!evt) { evt = dojo.global().event || {} };
		var t = (evt.srcElement ? evt.srcElement : (evt.target ? evt.target : null));
		while((t)&&(t.nodeType!=1)){ t = t.parentNode; }
		return t;	//	HTMLElement
	},
	
	getViewport : function(){
		//	summary
		//	Returns the dimensions of the viewable area of a browser window
		var _window = dojo.global();
		var _document = dojo.doc();
		var w = 0;
		var h = 0;
	
		if(dojo.render.html.mozilla){
			// mozilla
			w = _document.documentElement.clientWidth;
			h = _window.innerHeight;
		}else if(!dojo.render.html.opera && _window.innerWidth){
			//in opera9, dojo.body().clientWidth should be used, instead
			//of window.innerWidth/document.documentElement.clientWidth
			//so we have to check whether it is opera
			w = _window.innerWidth;
			h = _window.innerHeight;
		}else if (!dojo.render.html.opera && dojo.exists("documentElement.clientWidth", _document)){
			// IE6 Strict
			var w2 = _document.documentElement.clientWidth;
			// this lets us account for scrollbars
			if(!w || w2 && w2 < w) {
				w = w2;
			}
			h = _document.documentElement.clientHeight;
		}else if (dojo.body().clientWidth){
			// IE, Opera
			w = dojo.body().clientWidth;
			h = dojo.body().clientHeight;
		}
		return { width: w, height: h };	//	object
	},
	
	getScroll : function(){
		//	summary
		//	Returns the scroll position of the document
		var _window = dojo.global();
		var _document = dojo.doc();
		var top = _window.pageYOffset || _document.documentElement.scrollTop || dojo.body().scrollTop || 0;
		var left = _window.pageXOffset || _document.documentElement.scrollLeft || dojo.body().scrollLeft || 0;
		return { 
			top: top, 
			left: left, 
			offset:{ x: left, y: top }	//	note the change, NOT an Array with added properties. 
		};	//	object
	},
	
	getParentByType : function(/* HTMLElement */node, /* string */type) {
		//	summary
		//	Returns the first ancestor of node with tagName type.
		var _document = dojo.doc();
		var parent = dojo.byId(node);
		type = type.toLowerCase();
		while((parent)&&(parent.nodeName.toLowerCase()!=type)){
			if(parent==(_document["body"]||_document["documentElement"])){
				return null;
			}
			parent = parent.parentNode;
		}
		return parent;	//	HTMLElement
	},
	
	getAttribute : function(/* HTMLElement */node, /* string */attr){
		//	summary
		//	Returns the value of attribute attr from node.
		node = dojo.byId(node);
		// FIXME: need to add support for attr-specific accessors
		if((!node)||(!node.getAttribute)){
			// if(attr !== 'nwType'){
			//	alert("getAttr of '" + attr + "' with bad node"); 
			// }
			return null;
		}
		var ta = typeof attr == 'string' ? attr : new String(attr);
	
		// first try the approach most likely to succeed
		var v = node.getAttribute(ta.toUpperCase());
		if((v)&&(typeof v == 'string')&&(v!="")){ 
			return v;	//	string 
		}
	
		// try returning the attributes value, if we couldn't get it as a string
		if(v && v.value){ 
			return v.value;	//	string 
		}
	
		// this should work on Opera 7, but it's a little on the crashy side
		if((node.getAttributeNode)&&(node.getAttributeNode(ta))){
			return (node.getAttributeNode(ta)).value;	//	string
		}else if(node.getAttribute(ta)){
			return node.getAttribute(ta);	//	string
		}else if(node.getAttribute(ta.toLowerCase())){
			return node.getAttribute(ta.toLowerCase());	//	string
		}
		return null;	//	string
	},
		
	hasAttribute : function(/* HTMLElement */node, /* string */attr){
		//	summary
		//	Determines whether or not the specified node carries a value for the attribute in question.
		return dojo.html.getAttribute(dojo.byId(node), attr) ? true : false;	//	boolean
	},
		
	getCursorPosition : function(/* DOMEvent */e){
		//	summary
		//	Returns the mouse position relative to the document (not the viewport).
		//	For example, if you have a document that is 10000px tall,
		//	but your browser window is only 100px tall,
		//	if you scroll to the bottom of the document and call this function it
		//	will return {x: 0, y: 10000}
		//	NOTE: for events delivered via dojo.event.connect() and/or dojoAttachEvent (for widgets),
		//	you can just access evt.pageX and evt.pageY, rather than calling this function.
		e = e || dojo.global().event;
		var cursor = {x:0, y:0};
		if(e.pageX || e.pageY){
			cursor.x = e.pageX;
			cursor.y = e.pageY;
		}else{
			var de = dojo.doc().documentElement;
			var db = dojo.body();
			cursor.x = e.clientX + ((de||db)["scrollLeft"]) - ((de||db)["clientLeft"]);
			cursor.y = e.clientY + ((de||db)["scrollTop"]) - ((de||db)["clientTop"]);
		}
		return cursor;	//	object
	},
	
	isTag : function(/* HTMLElement */node) {
		//	summary
		//	Like dojo.dom.isTag, except case-insensitive
		node = dojo.byId(node);
		if(node && node.tagName) {
			for (var i=1; i<arguments.length; i++){
				if (node.tagName.toLowerCase()==String(arguments[i]).toLowerCase()){
					return String(arguments[i]).toLowerCase();	//	string
				}
			}
		}
		return "";	//	string
	}
});


	
	//define dojo.html.createExternalElement for IE to workaround the annoying activation "feature" in new IE
	//details: http://msdn.microsoft.com/library/default.asp?url=/workshop/author/dhtml/overview/activating_activex.asp
	if(dojo.render.html.ie && !dojo.render.html.ie70){
		//only define createExternalElement for IE in none https to avoid "mixed content" warning dialog
		if(window.location.href.substr(0,6).toLowerCase() != "https:"){
			(function(){
				// FIXME: this seems not to work correctly on IE 7!!
	
				//The trick is to define a function in a script.src property:
				// < script src="javascript:'function createExternalElement(){...}'"><\/script>,
				//which will be treated as an external javascript file in IE
				var xscript = dojo.doc().createElement('script');
				xscript.src = "javascript:'dojo.html.createExternalElement=function(doc, tag){ return doc.createElement(tag); }'";
				dojo.doc().getElementsByTagName("head")[0].appendChild(xscript);
			})();
		}
	}else{
		//for other browsers, simply use document.createElement
		//is enough
		dojo.html.createExternalElement = function(/* HTMLDocument */doc, /* string */tag){
			//	summary
			//	Creates an element in the HTML document, here for ActiveX activation workaround.
			return doc.createElement(tag);	//	HTMLElement
		}
	}


//////////////////////////////
//
//	FILE: dojo/html/style.js
//
//////////////////////////////


dojo.lang.mixin(dojo.html, {
	getClass : function(/* HTMLElement */node){
		//	summary
		//	Returns the string value of the list of CSS classes currently assigned directly 
		//	to the node in question. Returns an empty string if no class attribute is found;
		node = dojo.byId(node);
		if(!node){ return ""; }
		var cs = "";
		if(node.className){
			cs = node.className;
		}else if(dojo.html.hasAttribute(node, "class")){
			cs = dojo.html.getAttribute(node, "class");
		}
		return cs.replace(/^\s+|\s+$/g, "");	//	string
	},
	
	getClasses : function(/* HTMLElement */node) {
		//	summary
		//	Returns an array of CSS classes currently assigned directly to the node in question. 
		//	Returns an empty array if no classes are found;
		var c = dojo.html.getClass(node);
		return (c == "") ? [] : c.split(/\s+/g);	//	array
	},
	
	hasClass : function(/* HTMLElement */node, /* string */classname){
		//	summary
		//	Returns whether or not the specified classname is a portion of the
		//	class list currently applied to the node. Does not cover cascaded
		//	styles, only classes directly applied to the node.
		return (new RegExp('(^|\\s+)'+classname+'(\\s+|$)')).test(dojo.html.getClass(node))	//	boolean
	},
	
	prependClass : function(/* HTMLElement */node, /* string */classStr){
		//	summary
		//	Adds the specified class to the beginning of the class list on the
		//	passed node. This gives the specified class the highest precidence
		//	when style cascading is calculated for the node. Returns true or
		//	false; indicating success or failure of the operation, respectively.
		classStr += " " + dojo.html.getClass(node);
		return dojo.html.setClass(node, classStr);	//	boolean
	},
	
	addClass : function(/* HTMLElement */node, /* string */classStr){
		//	summary
		//	Adds the specified class to the end of the class list on the
		//	passed &node;. Returns &true; or &false; indicating success or failure.
		if (dojo.html.hasClass(node, classStr)) {
		  return false;
		}
		classStr = (dojo.html.getClass(node) + " " + classStr).replace(/^\s+|\s+$/g,"");
		return dojo.html.setClass(node, classStr);	//	boolean
	},
	
	setClass : function(/* HTMLElement */node, /* string */classStr){
		//	summary
		//	Clobbers the existing list of classes for the node, replacing it with
		//	the list given in the 2nd argument. Returns true or false
		//	indicating success or failure.
		node = dojo.byId(node);
		var cs = new String(classStr);
		try{
			if(typeof node.className == "string"){
				node.className = cs;
			}else if(node.setAttribute){
				node.setAttribute("class", classStr);
				node.className = cs;
			}else{
				return false;
			}
		}catch(e){
			dojo.debug("dojo.html.setClass() failed", e);
		}
		return true;
	},
	
	removeClass : function(/* HTMLElement */node, /* string */classStr, /* boolean? */allowPartialMatches){
		//	summary
		//	Removes the className from the node;. Returns true or false indicating success or failure.
		try{
			if (!allowPartialMatches) {
				var newcs = dojo.html.getClass(node).replace(new RegExp('(^|\\s+)'+classStr+'(\\s+|$)'), "$1$2");
			} else {
				var newcs = dojo.html.getClass(node).replace(classStr,'');
			}
			dojo.html.setClass(node, newcs);
		}catch(e){
			dojo.debug("dojo.html.removeClass() failed", e);
		}
		return true;	//	boolean
	},
	
	replaceClass : function(/* HTMLElement */node, /* string */newClass, /* string */oldClass) {
		//	summary
		//	Replaces 'oldClass' and adds 'newClass' to node
		dojo.html.removeClass(node, oldClass);
		dojo.html.addClass(node, newClass);
	},
	
	// Enum type for getElementsByClass classMatchType arg:
	classMatchType : {
		ContainsAll : 0, // all of the classes are part of the node's class (default)
		ContainsAny : 1, // any of the classes are part of the node's class
		IsOnly : 2 // only all of the classes are part of the node's class
	},
	
	
	getElementsByClass : function(
		/* string */classStr, 
		/* HTMLElement? */parent, 
		/* string? */nodeType, 
		/* integer? */classMatchType, 
		/* boolean? */useNonXpath
	){
		//	summary
		//	Returns an array of nodes for the given classStr, children of a
		//	parent, and optionally of a certain nodeType
		// FIXME: temporarily set to false because of several dojo tickets related
		// to the xpath version not working consistently in firefox.
		useNonXpath = false;
		var _document = dojo.doc();
		parent = dojo.byId(parent) || _document;
		var classes = classStr.split(/\s+/g);
		var nodes = [];
		if( classMatchType != 1 && classMatchType != 2 ) classMatchType = 0; // make it enum
		var reClass = new RegExp("(\\s|^)((" + classes.join(")|(") + "))(\\s|$)");
		var srtLength = classes.join(" ").length;
		var candidateNodes = [];
		
		if(!useNonXpath && _document.evaluate) { // supports dom 3 xpath
			var xpath = "./"+"/" + (nodeType || "*") + "[contains(";
			if(classMatchType != dojo.html.classMatchType.ContainsAny){
				xpath += "concat(' ',@class,' '), ' " +
				classes.join(" ') and contains(concat(' ',@class,' '), ' ") +
				" ')";
				if (classMatchType == 2) {
					xpath += " and string-length(@class)="+srtLength+"]";
				}else{
					xpath += "]";
				}
			}else{
				xpath += "concat(' ',@class,' '), ' " +
				classes.join(" ') or contains(concat(' ',@class,' '), ' ") +
				" ')]";
			}
			var xpathResult = _document.evaluate(xpath, parent, null, XPathResult.ANY_TYPE, null);
			var result = xpathResult.iterateNext();
			while(result){
				try{
					candidateNodes.push(result);
					result = xpathResult.iterateNext();
				}catch(e){ break; }
			}
			return candidateNodes;	//	NodeList
		}else{
			if(!nodeType){
				nodeType = "*";
			}
			candidateNodes = parent.getElementsByTagName(nodeType);
	
			var node, i = 0;
			outer:
			while(node = candidateNodes[i++]){
				var nodeClasses = dojo.html.getClasses(node);
				if(nodeClasses.length == 0){ continue outer; }
				var matches = 0;
		
				for(var j = 0; j < nodeClasses.length; j++){
					if(reClass.test(nodeClasses[j])){
						if(classMatchType == dojo.html.classMatchType.ContainsAny){
							nodes.push(node);
							continue outer;
						}else{
							matches++;
						}
					}else{
						if(classMatchType == dojo.html.classMatchType.IsOnly){
							continue outer;
						}
					}
				}
		
				if(matches == classes.length){
					if(	(classMatchType == dojo.html.classMatchType.IsOnly)&&
						(matches == nodeClasses.length)){
						nodes.push(node);
					}else if(classMatchType == dojo.html.classMatchType.ContainsAll){
						nodes.push(node);
					}
				}
			}
			return nodes;	//	NodeList
		}
	},
	
	toCamelCase : function(/* string */selector){
		//	summary
		//	Translates a CSS selector string to a camel-cased one.
		var arr = selector.split('-'), cc = arr[0];
		for(var i = 1; i < arr.length; i++) {
			cc += arr[i].charAt(0).toUpperCase() + arr[i].substring(1);
		}
		return cc;	//	string
	},
	
	toSelectorCase : function(/* string */selector){
		//	summary
		//	Translates a camel cased string to a selector cased one.
		return selector.replace(/([A-Z])/g, "-$1" ).toLowerCase();	//	string
	},
	
	getComputedStyle : function(/* HTMLElement */node, /* string */cssSelector, /* integer? */inValue){
		//	summary
		//	Returns the computed style of cssSelector on node.
		node = dojo.byId(node);
		// cssSelector may actually be in camel case, so force selector version
		var cssSelector = dojo.html.toSelectorCase(cssSelector);
		var property = dojo.html.toCamelCase(cssSelector);
		if(!node || !node.style){
			return inValue;			
		} else if (document.defaultView && dojo.html.isDescendantOf(node, node.ownerDocument)){ // W3, gecko, KHTML
			try{
				// mozilla segfaults when margin-* and node is removed from doc
				// FIXME: need to figure out a if there is quicker workaround
				var cs = document.defaultView.getComputedStyle(node, "");
				if(cs){
					return cs.getPropertyValue(cssSelector);	//	integer
				} 
			}catch(e){ // reports are that Safari can throw an exception above
				if(node.style.getPropertyValue){ // W3
					return node.style.getPropertyValue(cssSelector);	//	integer
				} else {
					return inValue;	//	integer
				}
			}
		} else if(node.currentStyle){ // IE
			return node.currentStyle[property];	//	integer
		}
		
		if(node.style.getPropertyValue){ // W3
			return node.style.getPropertyValue(cssSelector);	//	integer
		}else{
			return inValue;	//	integer
		}
	},
	
	getStyleProperty : function(/* HTMLElement */node, /* string */cssSelector){
		//	summary
		//	Returns the value of the passed style
		node = dojo.byId(node);
		return (node && node.style ? node.style[dojo.html.toCamelCase(cssSelector)] : undefined);	//	string
	},
	
	getStyle : function(/* HTMLElement */node, /* string */cssSelector){
		//	summary
		//	Returns the computed value of the passed style
		var value = dojo.html.getStyleProperty(node, cssSelector);
		return (value ? value : dojo.html.getComputedStyle(node, cssSelector));	//	string || integer
	},
	
	setStyle : function(/* HTMLElement */node, /* string */cssSelector, /* string */value){
		//	summary
		//	Set the value of passed style on node
		node = dojo.byId(node);
		if(node && node.style){
			var camelCased = dojo.html.toCamelCase(cssSelector);
			node.style[camelCased] = value;
		}
	},
	
	setStyleText : function (/* HTMLElement */target, /* string */text) {
		//	summary
		//	Try to set the entire cssText property of the passed target; equiv of setting style attribute.
		try {
			target.style.cssText = text;
		} catch (e) {
			target.setAttribute("style", text);
		}
	},
	
	copyStyle : function(/* HTMLElement */target, /* HTMLElement */source){
		//	summary
		// work around for opera which doesn't have cssText, and for IE which fails on setAttribute 
		if(!source.style.cssText){ 
			target.setAttribute("style", source.getAttribute("style")); 
		}else{
			target.style.cssText = source.style.cssText; 
		}
		dojo.html.addClass(target, dojo.html.getClass(source));
	},
	
	getUnitValue : function(/* HTMLElement */node, /* string */cssSelector, /* boolean? */autoIsZero){
		//	summary
		//	Get the value of passed selector, with the specific units used
		var s = dojo.html.getComputedStyle(node, cssSelector);
		if((!s)||((s == 'auto')&&(autoIsZero))){ 
			return { value: 0, units: 'px' };	//	object 
		}
		// FIXME: is regex inefficient vs. parseInt or some manual test? 
		var match = s.match(/(\-?[\d.]+)([a-z%]*)/i);
		if (!match){return dojo.html.getUnitValue.bad;}
		return { value: Number(match[1]), units: match[2].toLowerCase() };	//	object
	},

	getPixelValue : function(/* HTMLElement */node, /* string */cssSelector, /* boolean? */autoIsZero){
		//	summary
		//	Get the value of passed selector in pixels.
		var result = dojo.html.getUnitValue(node, cssSelector, autoIsZero);
		// FIXME: there is serious debate as to whether or not this is the right solution
		if(isNaN(result.value)){ 
			return 0; //	integer 
		}	
		// FIXME: code exists for converting other units to px (see Dean Edward's IE7) 
		// but there are cross-browser complexities
		if((result.value)&&(result.units != 'px')){ 
			return NaN;	//	integer 
		}
		return result.value;	//	integer
	},
	
	setPositivePixelValue : function(/* HTMLElement */node, /* string */selector, /* integer */value){
		//	summary
		//	Attempt to set the value of selector on node as a positive pixel value.
		if(isNaN(value)){return false;}
		node.style[selector] = Math.max(0, value) + 'px'; 
		return true;	//	boolean
	},
	
	styleSheet : null,
	
	// FIXME: this is a really basic stub for adding and removing cssRules, but
	// it assumes that you know the index of the cssRule that you want to add 
	// or remove, making it less than useful.  So we need something that can 
	// search for the selector that you you want to remove.
	insertCssRule : function(/* string */selector, /* string */declaration, /* integer? */index) {
		//	summary
		//	Attempt to insert declaration as selector on the internal stylesheet; if index try to set it there.
		if (!dojo.html.styleSheet) {
			if (document.createStyleSheet) { // IE
				dojo.html.styleSheet = document.createStyleSheet();
			} else if (document.styleSheets[0]) { // rest
				// FIXME: should create a new style sheet here
				// fall back on an exsiting style sheet
				dojo.html.styleSheet = document.styleSheets[0];
			} else { 
				return null;	//	integer 
			} // fail
		}
	
		if (arguments.length < 3) { // index may == 0
			if (dojo.html.styleSheet.cssRules) { // W3
				index = dojo.html.styleSheet.cssRules.length;
			} else if (dojo.html.styleSheet.rules) { // IE
				index = dojo.html.styleSheet.rules.length;
			} else { 
				return null;	//	integer 
			} // fail
		}
	
		if (dojo.html.styleSheet.insertRule) { // W3
			var rule = selector + " { " + declaration + " }";
			return dojo.html.styleSheet.insertRule(rule, index);	//	integer
		} else if (dojo.html.styleSheet.addRule) { // IE
			return dojo.html.styleSheet.addRule(selector, declaration, index);	//	integer
		} else { 
			return null; // integer
		} // fail
	},
	
	removeCssRule : function(/* integer? */index){
		//	summary
		//	Attempt to remove the rule at index.
		if(!dojo.html.styleSheet){
			dojo.debug("no stylesheet defined for removing rules");
			return false;
		}
		if(dojo.render.html.ie){
			if(!index){
				index = dojo.html.styleSheet.rules.length;
				dojo.html.styleSheet.removeRule(index);
			}
		}else if(document.styleSheets[0]){
			if(!index){
				index = dojo.html.styleSheet.cssRules.length;
			}
			dojo.html.styleSheet.deleteRule(index);
		}
		return true;	//	boolean
	},
	
	_insertedCssFiles : [], // cache container needed because IE reformats cssText when added to DOM
	insertCssFile : function(/* string */URI, /* HTMLDocument? */doc, /* boolean? */checkDuplicates, /* boolean */fail_ok){
		//	summary
		// calls css by XmlHTTP and inserts it into DOM as <style [widgetType="widgetType"]> *downloaded cssText*</style>
		if(!URI){ return; }
		if(!doc){ doc = document; }
		var cssStr = dojo.hostenv.getText(URI, false, fail_ok);
		if(cssStr===null){ return; }
		cssStr = dojo.html.fixPathsInCssText(cssStr, URI);
	
		if(checkDuplicates){
			var idx = -1, node, ent = dojo.html._insertedCssFiles;
			for(var i = 0; i < ent.length; i++){
				if((ent[i].doc == doc) && (ent[i].cssText == cssStr)){
					idx = i; node = ent[i].nodeRef;
					break;
				}
			}
			// make sure we havent deleted our node
			if(node){
				var styles = doc.getElementsByTagName("style");
				for(var i = 0; i < styles.length; i++){
					if(styles[i] == node){
						return;
					}
				}
				// delete this entry
				dojo.html._insertedCssFiles.shift(idx, 1);
			}
		}
	
		var style = dojo.html.insertCssText(cssStr, doc);
		dojo.html._insertedCssFiles.push({'doc': doc, 'cssText': cssStr, 'nodeRef': style});
	
		// insert custom attribute ex dbgHref="../foo.css" usefull when debugging in DOM inspectors, no?
		if(style && djConfig.isDebug){
			style.setAttribute("dbgHref", URI);
		}
		return style;	//	HTMLStyleElement
	},
	
	insertCssText : function(/* string */cssStr, /* HTMLDocument? */doc, /* string? */URI){
		//	summary
		//	Attempt to insert CSS rules into the document through inserting a style element
		// DomNode Style  = insertCssText(String ".dojoMenu {color: green;}"[, DomDoc document, dojo.uri.Uri Url ])
		if(!cssStr){ 
			return; //	HTMLStyleElement
		}
		if(!doc){ doc = document; }
		if(URI){// fix paths in cssStr
			cssStr = dojo.html.fixPathsInCssText(cssStr, URI);
		}
		var style = doc.createElement("style");
		style.setAttribute("type", "text/css");
		// IE is b0rken enough to require that we add the element to the doc
		// before changing it's properties
		var head = doc.getElementsByTagName("head")[0];
		if(!head){ // must have a head tag 
			dojo.debug("No head tag in document, aborting styles");
			return;	//	HTMLStyleElement
		}else{
			head.appendChild(style);
		}
		if(style.styleSheet){// IE
			var setFunc = function(){ 
				try{
					style.styleSheet.cssText = cssStr;
				}catch(e){ dojo.debug(e); }
			};
			if(style.styleSheet.disabled){
				setTimeout(setFunc, 10);
			}else{
				setFunc();
			}
		}else{ // w3c
			var cssText = doc.createTextNode(cssStr);
			style.appendChild(cssText);
		}
		return style;	//	HTMLStyleElement
	},
	
	fixPathsInCssText : function(/* string */cssStr, /* string */URI){
		//	summary
		// usage: cssText comes from dojoroot/src/widget/templates/Foobar.css
		// 	it has .dojoFoo { background-image: url(images/bar.png);} then uri should point to dojoroot/src/widget/templates/
		if(!cssStr || !URI){ return; }
		var match, str = "", url = "", urlChrs = "[\\t\\s\\w\\(\\)\\/\\.\\\\'\"-:#=&?~]+";
		var regex = new RegExp('url\\(\\s*('+urlChrs+')\\s*\\)');
//		var regexProtocol = /(file|https?|ftps?):\/\//;
		regexTrim = new RegExp("^[\\s]*(['\"]?)("+urlChrs+")\\1[\\s]*?$");
		if(dojo.render.html.ie55 || dojo.render.html.ie60){
			var regexIe = new RegExp("AlphaImageLoader\\((.*)src\=['\"]("+urlChrs+")['\"]");
			// TODO: need to decide how to handle relative paths and AlphaImageLoader see #1441
			// current implementation breaks on build with intern_strings
			while(match = regexIe.exec(cssStr)){
				url = match[2].replace(regexTrim, "$2");
				if(!regexProtocol.exec(url)){
					url = (new dojo.uri.Uri(URI, url).toString());
				}
				str += cssStr.substring(0, match.index) + "AlphaImageLoader(" + match[1] + "src='" + url + "'";
				cssStr = cssStr.substr(match.index + match[0].length);
			}
			cssStr = str + cssStr;
			str = "";
		}
	
		while(match = regex.exec(cssStr)){
			url = match[1].replace(regexTrim, "$2");
			if(!regexProtocol.exec(url)){
				url = (new dojo.uri.Uri(URI, url).toString());
			}
			str += cssStr.substring(0, match.index) + "url(" + url + ")";
			cssStr = cssStr.substr(match.index + match[0].length);
		}
		return str + cssStr;	//	string
	},
	
	setActiveStyleSheet : function(/* string */title){
		//	summary
		//	Activate style sheet with specified title.
		var i = 0, a, els = dojo.doc().getElementsByTagName("link");
		while (a = els[i++]) {
			if(a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")){
				a.disabled = true;
				if (a.getAttribute("title") == title) { a.disabled = false; }
			}
		}
	},
	
	getActiveStyleSheet : function(){
		//	summary
		//	return the title of the currently active stylesheet
		var i = 0, a, els = dojo.doc().getElementsByTagName("link");
		while (a = els[i++]) {
			if (a.getAttribute("rel").indexOf("style") != -1 
				&& a.getAttribute("title") 
				&& !a.disabled
			){
				return a.getAttribute("title");	//	string 
			}
		}
		return null;	//	string
	},
	
	getPreferredStyleSheet : function(){
		//	summary
		//	Return the preferred stylesheet title (i.e. link without alt attribute)
		var i = 0, a, els = dojo.doc().getElementsByTagName("link");
		while (a = els[i++]) {
			if(a.getAttribute("rel").indexOf("style") != -1
				&& a.getAttribute("rel").indexOf("alt") == -1
				&& a.getAttribute("title")
			){ 
				return a.getAttribute("title"); 	//	string
			}
		}
		return null;	//	string
	},
	
	applyBrowserClass : function(/* HTMLElement */node){
		//	summary
		//	Applies pre-set class names based on browser & version to the passed node.
		//	Modified version of Morris' CSS hack.
		var drh=dojo.render.html;
		var classes = {
			dj_ie: drh.ie,
			dj_ie55: drh.ie55,
			dj_ie6: drh.ie60,
			dj_ie7: drh.ie70,
			dj_iequirks: drh.ie && drh.quirks,
			dj_opera: drh.opera,
			dj_opera8: drh.opera && (Math.floor(dojo.render.version)==8),
			dj_opera9: drh.opera && (Math.floor(dojo.render.version)==9),
			dj_khtml: drh.khtml,
			dj_safari: drh.safari,
			dj_gecko: drh.mozilla
		}; // no dojo unsupported browsers
		for(var p in classes){
			if(classes[p]){
				dojo.html.addClass(node, p);
			}
		}
	}
});
dojo.html.getElementsByClassName = dojo.html.getElementsByClass;
dojo.html.getUnitValue.bad = { value: NaN, units: '' };









//////////////////////////////
//
//	FILE: dojo/html/display.js
//
//////////////////////////////


dojo.lang.mixin(dojo.html, {
	_toggle : function(node, tester, setter){
		node = dojo.byId(node);
		setter(node, !tester(node));
		return tester(node);
	},
	
	show : function(/* HTMLElement */node){
		//	summary
		//	Show the passed element by reverting display property set by dojo.html.hide
		node = dojo.byId(node);
		if(dojo.html.getStyleProperty(node, 'display')=='none'){
			var djDisplayCache = dojo.html.getAttribute('djDisplayCache');
			dojo.html.setStyle(node, 'display', (djDisplayCache||''));
			node.removeAttribute('djDisplayCache');
		}
	},
	
	hide : function(/* HTMLElement */node){
		//	summary
		//	Hide the passed element by setting display:none
		node = dojo.byId(node);
		var djDisplayCache = dojo.html.getAttribute('djDisplayCache');
		if(djDisplayCache == null){ // it could == '', so we cannot say !djDisplayCache
			var d = dojo.html.getStyleProperty(node, 'display')
			if(d!='none'){
				node.setAttribute('djDisplayCache', d);
			}
		}
		dojo.html.setStyle(node, 'display', 'none');
	},
	
	setShowing : function(/* HTMLElement */node, /* boolean? */showing){
		//	summary
		// Calls show() if showing is true, hide() otherwise
		dojo.html[(showing ? 'show' : 'hide')](node);
	},
	
	isShowing : function(/* HTMLElement */node){
		//	summary
		//	Returns whether the element is displayed or not.
		// FIXME: returns true if node is bad, isHidden would be easier to make correct
		return (dojo.html.getStyleProperty(node, 'display') != 'none');	//	boolean
	},
	
	toggleShowing : function(/* HTMLElement */node){
		//	summary
		// Call setShowing() on node with the complement of isShowing(), then return the new value of isShowing()
		return dojo.html._toggle(node, dojo.html.isShowing, dojo.html.setShowing);	//	boolean
	},
	
	// Simple mapping of tag names to display values
	// FIXME: simplistic 
	displayMap : { tr: '', td: '', th: '', img: 'inline', span: 'inline', input: 'inline', button: 'inline' },
	
	suggestDisplayByTagName : function(/* HTMLElement */node){
		//	summary
		// Suggest a value for the display property that will show 'node' based on it's tag
		node = dojo.byId(node);
		if(node && node.tagName){
			var tag = node.tagName.toLowerCase();
			return (tag in dojo.html.displayMap ? dojo.html.displayMap[tag] : 'block');	//	string
		}
	},
	
	setDisplay : function(/* HTMLElement */node, /* string */display){
		//	summary
		// 	Sets the value of style.display to value of 'display' parameter if it is a string.
		// 	Otherwise, if 'display' is false, set style.display to 'none'.
		// 	Finally, set 'display' to a suggested display value based on the node's tag
		dojo.html.setStyle(node, 'display', ((display instanceof String || typeof display == "string") ? display : (display ? dojo.html.suggestDisplayByTagName(node) : 'none')));
	},
	
	isDisplayed : function(/* HTMLElement */node){
		//	summary
		// 	Is true if the the computed display style for node is not 'none'
		// 	FIXME: returns true if node is bad, isNotDisplayed would be easier to make correct
		return (dojo.html.getComputedStyle(node, 'display') != 'none');	//	boolean
	},
	
	toggleDisplay : function(/* HTMLElement */node){
		//	summary
		// 	Call setDisplay() on node with the complement of isDisplayed(), then
		// 	return the new value of isDisplayed()
		return dojo.html._toggle(node, dojo.html.isDisplayed, dojo.html.setDisplay);	//	boolean
	},
	
	setVisibility : function(/* HTMLElement */node, /* string */visibility){
		//	summary
		// 	Sets the value of style.visibility to value of 'visibility' parameter if it is a string.
		// 	Otherwise, if 'visibility' is false, set style.visibility to 'hidden'. Finally, set style.visibility to 'visible'.
		dojo.html.setStyle(node, 'visibility', ((visibility instanceof String || typeof visibility == "string") ? visibility : (visibility ? 'visible' : 'hidden')));
	},
	
	isVisible : function(/* HTMLElement */node){
		//	summary
		// 	Returns true if the the computed visibility style for node is not 'hidden'
		// 	FIXME: returns true if node is bad, isInvisible would be easier to make correct
		return (dojo.html.getComputedStyle(node, 'visibility') != 'hidden');	//	boolean
	},
	
	toggleVisibility : function(node){
		//	summary
		// Call setVisibility() on node with the complement of isVisible(), then return the new value of isVisible()
		return dojo.html._toggle(node, dojo.html.isVisible, dojo.html.setVisibility);	//	boolean
	},
	
	setOpacity : function(/* HTMLElement */node, /* float */opacity, /* boolean? */dontFixOpacity){
		//	summary
		//	Sets the opacity of node in a cross-browser way.
		//	float between 0.0 (transparent) and 1.0 (opaque)
		node = dojo.byId(node);
		var h = dojo.render.html;
		if(!dontFixOpacity){
			if( opacity >= 1.0){
				if(h.ie){
					dojo.html.clearOpacity(node);
					return;
				}else{
					opacity = 0.999999;
				}
			}else if( opacity < 0.0){ opacity = 0; }
		}
		if(h.ie){
			if(node.nodeName.toLowerCase() == "tr"){
				// FIXME: is this too naive? will we get more than we want?
				var tds = node.getElementsByTagName("td");
				for(var x=0; x<tds.length; x++){
					tds[x].style.filter = "Alpha(Opacity="+opacity*100+")";
				}
			}
			node.style.filter = "Alpha(Opacity="+opacity*100+")";
		}else if(h.moz){
			node.style.opacity = opacity; // ffox 1.0 directly supports "opacity"
			node.style.MozOpacity = opacity;
		}else if(h.safari){
			node.style.opacity = opacity; // 1.3 directly supports "opacity"
			node.style.KhtmlOpacity = opacity;
		}else{
			node.style.opacity = opacity;
		}
	},
	
	clearOpacity : function(/* HTMLElement */node){
		//	summary
		//	Clears any opacity setting on the passed element.
		node = dojo.byId(node);
		var ns = node.style;
		var h = dojo.render.html;
		if(h.ie){
			try {
				if( node.filters && node.filters.alpha ){
					ns.filter = ""; // FIXME: may get rid of other filter effects
				}
			} catch(e) {
				/*
				 * IE7 gives error if node.filters not set;
				 * don't know why or how to workaround (other than this)
				 */
			}
		}else if(h.moz){
			ns.opacity = 1;
			ns.MozOpacity = 1;
		}else if(h.safari){
			ns.opacity = 1;
			ns.KhtmlOpacity = 1;
		}else{
			ns.opacity = 1;
		}
	},
	
	getOpacity : function(/* HTMLElement */node){
		//	summary
		//	Returns the opacity of the passed element
		node = dojo.byId(node);
		var h = dojo.render.html;
		if(h.ie){
			var opac = (node.filters && node.filters.alpha &&
				typeof node.filters.alpha.opacity == "number"
				? node.filters.alpha.opacity : 100) / 100;
		}else{
			var opac = node.style.opacity || node.style.MozOpacity ||
				node.style.KhtmlOpacity || 1;
		}
		return opac >= 0.999999 ? 1.0 : Number(opac);	//	float
	}
});


//////////////////////////////
//
//	FILE: dojo/html/layout.js
//
//////////////////////////////

dojo.lang.mixin(dojo.html, {	
	sumAncestorProperties : function(/* HTMLElement */node, /* string */prop){
		//	summary
		//	Returns the sum of the passed property on all ancestors of node.
		node = dojo.byId(node);
		if(!node){ return 0; } // FIXME: throw an error?
		
		var retVal = 0;
		while(node){
			if(dojo.html.getComputedStyle(node, 'position') == 'fixed'){
				return 0;
			}
			var val = node[prop];
			if(val){
				retVal += val - 0;
				if(node==dojo.body()){ break; }// opera and khtml #body & #html has the same values, we only need one value
			}
			node = node.parentNode;
		}
		return retVal;	//	integer
	},
	
	setStyleAttributes : function(/* HTMLElement */node, /* string */attributes) { 
		//	summary
		//	allows a dev to pass a string similar to what you'd pass in style="", and apply it to a node.
		node = dojo.byId(node);
		var splittedAttribs=attributes.replace(/(;)?\s*$/, "").split(";"); 
		for(var i=0; i<splittedAttribs.length; i++){ 
			var nameValue=splittedAttribs[i].split(":"); 
			var name=nameValue[0].replace(/\s*$/, "").replace(/^\s*/, "").toLowerCase();
			var value=nameValue[1].replace(/\s*$/, "").replace(/^\s*/, "");
			switch(name){
				case "opacity":
					dojo.html.setOpacity(node, value); 
					break; 
				case "content-height":
					dojo.html.setContentBox(node, {height: value}); 
					break; 
				case "content-width":
					dojo.html.setContentBox(node, {width: value}); 
					break; 
				case "outer-height":
					dojo.html.setMarginBox(node, {height: value}); 
					break; 
				case "outer-width":
					dojo.html.setMarginBox(node, {width: value}); 
					break; 
				default:
					node.style[dojo.html.toCamelCase(name)]=value; 
			}
		} 
	},
	
	boxSizing : {
		MARGIN_BOX: "margin-box",
		BORDER_BOX: "border-box",
		PADDING_BOX: "padding-box",
		CONTENT_BOX: "content-box"
	},
	
	getAbsolutePosition : function(/* HTMLElement */node, /* boolean? */includeScroll, /* string? */boxType){
		//	summary
		//		Gets the absolute position of the passed element based on the document itself.
		//	see also: dojo.html.getAbsolutePositionExt
		node = dojo.byId(node);
		var ownerDocument = dojo.doc();
		var ret = {
			x: 0,
			y: 0
		};
	
		var bs = dojo.html.boxSizing;
		if(!boxType) { boxType = bs.CONTENT_BOX; }
		var nativeBoxType = 2; //BORDER box
		var targetBoxType;
		switch(boxType){
			case bs.MARGIN_BOX:
				targetBoxType = 3;
				break;
			case bs.BORDER_BOX:
				targetBoxType = 2;
				break;
			case bs.PADDING_BOX:
			default:
				targetBoxType = 1;
				break;
			case bs.CONTENT_BOX:
				targetBoxType = 0;
				break;
		}
	
		var h = dojo.render.html;
		var db = ownerDocument["body"]||ownerDocument["documentElement"];
	
		if(h.ie){
			with(node.getBoundingClientRect()){
				ret.x = left-2;
				ret.y = top-2;
			}
		}else if(ownerDocument['getBoxObjectFor']){
			// mozilla
			nativeBoxType = 1; //getBoxObjectFor return padding box coordinate
			try{
				var bo = ownerDocument.getBoxObjectFor(node);
				ret.x = bo.x - dojo.html.sumAncestorProperties(node, "scrollLeft");
				ret.y = bo.y - dojo.html.sumAncestorProperties(node, "scrollTop");
			}catch(e){
				// squelch
			}
		}else{
			if(node["offsetParent"]){
				var endNode;
				// in Safari, if the node is an absolutely positioned child of
				// the body and the body has a margin the offset of the child
				// and the body contain the body's margins, so we need to end
				// at the body
				if(	(h.safari)&&
					(node.style.getPropertyValue("position") == "absolute")&&
					(node.parentNode == db)){
					endNode = db;
				}else{
					endNode = db.parentNode;
				}
	
				//TODO: set correct nativeBoxType for safari/konqueror
	
				if(node.parentNode != db){
					var nd = node;
					if(dojo.render.html.opera){ nd = db; }
					ret.x -= dojo.html.sumAncestorProperties(nd, "scrollLeft");
					ret.y -= dojo.html.sumAncestorProperties(nd, "scrollTop");
				}
				var curnode = node;
				do{
					var n = curnode["offsetLeft"];
					//FIXME: ugly hack to workaround the submenu in 
					//popupmenu2 does not shown up correctly in opera. 
					//Someone have a better workaround?
					if(!h.opera || n>0){
						ret.x += isNaN(n) ? 0 : n;
					}
					var m = curnode["offsetTop"];
					ret.y += isNaN(m) ? 0 : m;
					curnode = curnode.offsetParent;
				}while((curnode != endNode)&&(curnode != null));
			}else if(node["x"]&&node["y"]){
				ret.x += isNaN(node.x) ? 0 : node.x;
				ret.y += isNaN(node.y) ? 0 : node.y;
			}
		}
	
		// account for document scrolling!
		if(includeScroll){
			var scroll = dojo.html.getScroll();
			ret.y += scroll.top;
			ret.x += scroll.left;
		}
	
		var extentFuncArray=[dojo.html.getPaddingExtent, dojo.html.getBorderExtent, dojo.html.getMarginExtent];
		if(nativeBoxType > targetBoxType){
			for(var i=targetBoxType;i<nativeBoxType;++i){
				ret.y += extentFuncArray[i](node, 'top');
				ret.x += extentFuncArray[i](node, 'left');
			}
		}else if(nativeBoxType < targetBoxType){
			for(var i=targetBoxType;i>nativeBoxType;--i){
				ret.y -= extentFuncArray[i-1](node, 'top');
				ret.x -= extentFuncArray[i-1](node, 'left');
			}
		}
		ret.top = ret.y;
		ret.left = ret.x;
		return ret;	//	object
	},
	
	isPositionAbsolute : function(/* HTMLElement */node){
		//	summary
		//	Returns true if the element is absolutely positioned.
		return (dojo.html.getComputedStyle(node, 'position') == 'absolute');	//	boolean
	},
	
	//_sumPixelValues : function(/* HTMLElement */node, selectors, autoIsZero){
	//	var total = 0;
	//	for(var x=0; x<selectors.length; x++){
	//		total += dojo.html.getPixelValue(node, selectors[x], autoIsZero);
	//	}
	//	return total;
	//}
	
	_getComponentPixelValues : function(/* HTMLElement */node, /* String */componentPrefix,
													/* Function */getPixels, /* Boolean */autoIsZero){
		var sides = ["top", "bottom", "left", "right"];
		var obj = {};
		for (var i in sides){
			side = sides[i];
			obj[side] = getPixels(node, componentPrefix+side, autoIsZero);
		}
		obj.width = obj.left + obj.right;
		obj.height = obj.top + obj.bottom;
		return obj;
	},
	
	getMargin : function(/* HTMLElement */node){
		//      summary
		//      Returns the width and height of the passed node's margin in pixels
		//              and the top, bottom, left, and right component margin sizes in pixels
		return dojo.html._getComponentPixelValues(node, "margin-", dojo.html.getPixelValue, dojo.html.isPositionAbsolute(node));
	},
	
	getBorder : function(/* HTMLElement */node){
		//      summary
		//      Returns the width and height of the passed node's border in pixels
		//              and the top, bottom, left, and right component border sizes in pixels
		return dojo.html._getComponentPixelValues(node, "", dojo.html.getBorderExtent);
	},
	
	getBorderExtent : function(/* HTMLElement */node, /* string */side){
		//	summary
		//	returns the width of the requested border
		return (dojo.html.getStyle(node, 'border-' + side + '-style') == 'none' ? 0 : dojo.html.getPixelValue(node, 'border-' + side + '-width'));	// integer
	},
	
	getMarginExtent : function(/* HTMLElement */node, /* string */side){
		//	summary
		//	returns the width of the requested margin
		return dojo.html.getPixelValue(node, "margin-" + side, dojo.html.isPositionAbsolute(node));	//	integer
	},
	
	getPaddingExtent : function(/* HTMLElement */node, /* string */side){
		//	summary
		//	Returns the width of the requested padding 
		return dojo.html.getPixelValue(node, "padding-" + side, true);	//	integer
	},
	
	getPadding : function(/* HTMLElement */node){
		//      summary
		//      Returns the width and height of the passed node's padding in pixels
		//              and the top, bottom, left, and right component padding sizes in pixels
		return dojo.html._getComponentPixelValues(node, "padding-", dojo.html.getPixelValue, true);
	},
	
	getPadBorder : function(/* HTMLElement */node){
		//	summary
		//	Returns the width and height of the passed node's padding and border
		var pad = dojo.html.getPadding(node);
		var border = dojo.html.getBorder(node);
		return { width: pad.width + border.width, height: pad.height + border.height };	//	object
	},
	
	getBoxSizing : function(/* HTMLElement */node){
		//	summary
		//	Returns which box model the passed element is working with
		var h = dojo.render.html;
		var bs = dojo.html.boxSizing;
		if(((h.ie)||(h.opera)) && node.nodeName!="IMG"){ 
			var cm = document["compatMode"];
			if((cm == "BackCompat")||(cm == "QuirksMode")){
				return bs.BORDER_BOX; 	//	string
			}else{
				return bs.CONTENT_BOX; 	//	string
			}
		}else{
			if(arguments.length == 0){ node = document.documentElement; }
			var sizing = dojo.html.getStyle(node, "-moz-box-sizing");
			if(!sizing){ sizing = dojo.html.getStyle(node, "box-sizing"); }
			return (sizing ? sizing : bs.CONTENT_BOX);	//	string
		}
	},
	
	isBorderBox : function(/* HTMLElement */node){
		//	summary
		//	returns whether the passed element is using border box sizing or not.
		return (dojo.html.getBoxSizing(node) == dojo.html.boxSizing.BORDER_BOX);	//	boolean
	},
	
	getBorderBox : function(/* HTMLElement */node){
		//	summary
		//	Returns the dimensions of the passed element based on border-box sizing.
		// BOX WITH PADDING AND BORDER
		node = dojo.byId(node);
		return { width: node.offsetWidth, height: node.offsetHeight };	//	object
	},
	
	getPaddingBox : function(/* HTMLElement */node){
		//	summary
		//	Returns the dimensions of the padding box (see http://www.w3.org/TR/CSS21/box.html)
		// BOX WITH JUST PADDING
		var box = dojo.html.getBorderBox(node);
		var border = dojo.html.getBorder(node);
		return {
			width: box.width - border.width,
			height:box.height - border.height
		};	//	object
	},
	
	getContentBox : function(/* HTMLElement */node){
		//	summary
		//	Returns the dimensions of the content box (see http://www.w3.org/TR/CSS21/box.html)
		// INNER BOX
		node = dojo.byId(node);
		var padborder = dojo.html.getPadBorder(node);
		return {
			width: node.offsetWidth - padborder.width,
			height: node.offsetHeight - padborder.height
		};	//	object
	},
	
	setContentBox : function(/* HTMLElement */node, /* object */args){
		//	summary
		//	Sets the dimensions of the passed node according to content sizing.
		node = dojo.byId(node);
		var width = 0; var height = 0;
		var isbb = dojo.html.isBorderBox(node);
		var padborder = (isbb ? dojo.html.getPadBorder(node) : { width: 0, height: 0});
		var ret = {};
		if(typeof args.width != "undefined"){
			width = args.width + padborder.width;
			ret.width = dojo.html.setPositivePixelValue(node, "width", width);
		}
		if(typeof args.height != "undefined"){
			height = args.height + padborder.height;
			ret.height = dojo.html.setPositivePixelValue(node, "height", height);
		}
		return ret;	//	object
	},
	
	getMarginBox : function(/* HTMLElement */node){
		//	summary
		//	returns the dimensions of the passed node including any margins.
		var borderbox = dojo.html.getBorderBox(node);
		var margin = dojo.html.getMargin(node);
		return { width: borderbox.width + margin.width, height: borderbox.height + margin.height };	//	object
	},
	
	setMarginBox : function(/* HTMLElement */node, /* object */args){
		//	summary
		//	Sets the dimensions of the passed node using margin box calcs.
		node = dojo.byId(node);
		var width = 0; var height = 0;
		var isbb = dojo.html.isBorderBox(node);
		var padborder = (!isbb ? dojo.html.getPadBorder(node) : { width: 0, height: 0 });
		var margin = dojo.html.getMargin(node);
		var ret = {};
		if(typeof args.width != "undefined"){
			width = args.width - padborder.width;
			width -= margin.width;
			ret.width = dojo.html.setPositivePixelValue(node, "width", width);
		}
		if(typeof args.height != "undefined"){
			height = args.height - padborder.height;
			height -= margin.height;
			ret.height = dojo.html.setPositivePixelValue(node, "height", height);
		}
		return ret;	//	object
	},
	
	getElementBox : function(/* HTMLElement */node, /* string */type){
		//	summary
		//	return dimesions of a node based on the passed box model type.
		var bs = dojo.html.boxSizing;
		switch(type){
			case bs.MARGIN_BOX:
				return dojo.html.getMarginBox(node);	//	object
			case bs.BORDER_BOX:
				return dojo.html.getBorderBox(node);	//	object
			case bs.PADDING_BOX:
				return dojo.html.getPaddingBox(node);	//	object
			case bs.CONTENT_BOX:
			default:
				return dojo.html.getContentBox(node);	//	object
		}
	},
	// in: coordinate array [x,y,w,h] or dom node
	// return: coordinate object
	toCoordinateObject : function(/* array */coords, /* boolean? */includeScroll, /* string? */boxtype) {
		//	summary
		//	Converts an object of coordinates into an object of named arguments.
		if(!coords.nodeType && !(coords instanceof String || typeof coords == "string") &&
				 ('width' in coords || 'height' in coords || 'left' in coords ||
				  'x' in coords || 'top' in coords || 'y' in coords)){
			// coords is a coordinate object or at least part of one
			var ret = {
				left: coords.left||coords.x||0,
				top: coords.top||coords.y||0,
				width: coords.width||0,
				height: coords.height||0
			};
		}else{
			// coords is an dom object (or dom object id); return it's coordinates
			var node = dojo.byId(coords);
			var pos = dojo.html.abs(node, includeScroll, boxtype);
			var marginbox = dojo.html.getMarginBox(node);
			var ret = {
				left: pos.left,
				top: pos.top,
				width: marginbox.width,
				height: marginbox.height
			};
		}
		ret.x = ret.left;
		ret.y = ret.top;
		return ret;	//	object
	}
});