
// Details Pattern:  Call this statically ONCE to give a model a set of routines that
//		manage a set of 'details' named whatever you want.
//	The names of the actual routines are set according to how you call this pattern.
//
//	<klass>					name of the MasterWidget klass
//	<detailKey>				name for a single details, 	eg:  			"detail" 		"child"
//	<detailsKey>			name for the collection of detail, eg:		"details"		"children"
//	<masterKey>				name for the child reference to this, eg:	"master"		"parent"
//	<detailConstructor>		name of the klass to construct children:	"DetailWidget"	"ChildWidget"
//	<instanceIdIsUnique>	boolean: if true, we will assume the id passed in to createDetail()
//									is unique within the page, if false, we do not assume this
//
//	You will generally call this when creating a class, to generate your superclass that has 
//		these methods, eg:
//	
//	var DetailClass = Class.create(
//		DataWidget.createMasterWidget("Master", "detail", "details", "master", "DetailWidget", true),
//		{
//			... your instance properties here ...
//		});
//	or
//
//	var myClass = Class.create(
//		DataWidget.createMasterWidget("Parent", "child", "children", "parent", "ChildWidget", true),
//		{
//			... your instance properties here ...
//		});
//
//	For the two examples above, this will set up the following INSTANCE properties and methods:
//	
//	 example:	"detail"				"child"					Description
//
//				.details				.children				array of details
//				.detailConstructor		.childConstructor		name of your detail constructor
//				.initDetails()			.initChildren()			initialize the details (called automatically)
//				.createDetail()			.createChild()			create an 
//				.getDetails()			.getChildren()			return the array of details
//				.getDetail()			.getChild()				return a single detail by id
//				.setDetailData()		.setChildData()			set data on the detail
//				.addDetail()			.addChild()				add an detail to our list of details
//				.removeDetail()			.removeChild()			remove a detail from our list of details
//				.dirtyDetails()			.dirtyChild()			note that the list of details has changed
//				.getDetailsHTML()		.getChildrenHTML()		return HTML for your children
//					.updateAndHilightDifferences()				(same name for both)
//					.getHTML()									(same name for both)
//					onAfterDraw()								(same name name for both)
DataWidget.createMasterWidget = function(klass, detailKey, detailsKey, masterKey, 
										 detailConstructor, instanceIdIsUnique) {
	var Detail = detailKey.initialCap(),
		Details = detailsKey.initialCap(),
		
		// names of all of the functions
		constructorKey = detailKey+"Constructor",
		initDetails = "init"+Details,
		addDetail = "add"+Detail,
		removeDetail = "remove"+Detail,
		createDetail = "create"+Detail,
		getDetails = "get"+Details,
		getDetail = "get"+Detail,
		setDetail = "set"+Detail,
		setDetailData = "set"+Detail+"Data",

		dirtyDetails = "dirty"+Details,
		detailsDirty = detailsKey+"Dirty",
		getDetailsHTML = "get"+Details+"HTML",
		detailsHTML = detailsKey+"HTML",
		detailItemHTML = detailsKey+"ItemHTML",
		detailsOutput = detailsKey+"Output"
	;

	//
	//	routines which use the variables above for lookup
	//
	var methods = {
		klass : klass,
		bodyClassName : "SectionBody",
		drawDetails : true
	};
	methods[constructorKey] = detailConstructor;

	methods.initializeProperties = function() {
		this[initDetails]();
		this.cookieId = (window.page ? window.page.id + "-" : "-") + this.klass + "-" + this.id;
		ExpanderMixin.initializeProperties.apply(this, arguments);
	}
	
	methods[initDetails] = function() {
		var constructor = this[constructorKey];
		if (typeof constructor == "string") 
			constructor = (this[constructorKey] = eval(constructor));
		var details = this[getDetails]();
		if (!details.length) return;
		
		this[detailsKey] = [];
		for (var i = 0, len = details.length; i < len; i++) {
			var detail = details[i], 
				id = detail.id || i
			;
			if (detail.constructor == constructor) {
				this[addDetail](id, detail);
			} else {
				this[createDetail](id, detail)
			}
		}
	}
		
	methods[getDetails] = function() {
		return this[detailsKey] || (this[detailsKey] = []);
	}
	
	methods[getDetail] = function(id, autoCreate) {
		var detail = this[getDetails]()[id];
		if (detail) return detail;
		if (autoCreate) return this[createDetail](id);
	}
	
	
	if (instanceIdIsUnique) {
		methods[createDetail] = function(id, data) {
			// this[addDetail]() should be called for this automatically 
            // when the detail is constructed
			var properties = {id:id, data: data};
			properties[masterKey] = this;
			var detail = new this[constructorKey](properties);
			this[addDetail](id, detail);
		}
	} else {
		methods[createDetail] = function(id, data) {
			// this[addDetail]() should be called for this automatically
            //  when the detail is constructed
			var properties = {data: data};
			properties[masterKey] = this;
			var detail = new this[constructorKey](properties);
			this[addDetail](id, detail);
		}
	}
		
	methods[setDetailData] = function(id, data) {
		var detail = this[getDetail](id);
		// this will call this[addDetail]() eventually
		if (!detail) return this[createDetail](id, data);
		detail.setData(data);
//		this[dirtyDetails]();
		return this;
	}
	// alias
	methods[setDetail] = methods[setDetailData];

	methods[addDetail] = function(id, detail) {
		detail[masterKey] = this;
		
		var details = this[getDetails]();
		
		// add it by id if id is not a number
		if (id && typeof id != "number") details[""+id] = detail;
		
		// set its index property
		detail.index = details.length;
		//add it by numeric index to the end of the list
		details[detail.index] = detail;

		this[dirtyDetails]();				
		return detail;
	}
	
	methods[removeDetail] = function(detail) {
		if (typeof detail != "object") detail = this[getDetail](detail);
		if (!detail) return;
		
		var details = this[getDetails]();
		details.remove(detail);
		delete details[""+detail.id];
		
		delete detail[masterKey];

		this[dirtyDetails]();				
		return detail;
	}
	
	//
	//	drawing routines
	//
	
	// there was a major change to the instances (like one was added or something)
	//	tell the views about it
	methods[dirtyDetails] = function() {
		this.majorChange = true;
		this.scheduleRedraw();
	}

	// get the HTML for all of the details as a list and as a concatenated value
	methods[getDetailsHTML] = function() {
		if (!this.drawDetails) return;
		var html = this.snapshot[detailItemHTML] = [];
		this[getDetails]().forEach(function(detail, item) {
			detail.prepareToDraw();
			html[item] = detail.getHTML();
		}, this);
		return html.join("\n");
	}
	
	
	methods.updateAndHighlightDifferences = function($super) {
		$super();
		this[getDetails]().forEach(function(detail) {
			detail.redraw();
		});
	}
	
	methods.getHTML = function($super) {
		this.snapshot[detailsHTML] = this[getDetailsHTML]();
		return $super();
	}

	methods.onAfterDraw = function($super, parent) {
		$super();
		ExpanderMixin.onAfterDraw.apply(this, arguments);
		if (this.drawDetails) {
			var details = this[getDetails]();
			for (var i = 0; i < details.length; i++) {
				var detail = details[i];
				detail.getMainElement(this.$main);
				detail._drawn = true;		// detail won't ever redraw if this is not set
			}
		}
	},
	
	methods.onAfterRedraw = function($super, parent) {
		$super();
		ExpanderMixin.onAfterRedraw.apply(this, arguments);
		if (this.drawDetails) {
			var details = this[getDetails]();
			for (var i = 0; i < details.length; i++) {
				var detail = details[i];
				detail.getMainElement(this.$main);
				detail._drawn = true;		// detail won't ever redraw if this is not set
			}
		}
	}
	
	return (window.DC = Class.create(DataWidget, ExpanderMixin, methods));
}

