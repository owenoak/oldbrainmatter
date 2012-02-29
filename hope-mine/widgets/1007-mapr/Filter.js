/*	Filter classes.

	.filter.Form			= FormPanel for managing a filter
	.filter.Expression		= CompositeField for each "expression" of the filter
	

	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets.filter");


// given a bunch of Records, create a filter which matches all of them
//TODO: rename?
mapr.widgets.filter.encode = function(records, filterKey, property) {
	if (!records || records.length == 0) return "";
	
	var list = [], i = -1, record;
	while (record = records[++i]) {
		list[i] = "["+filterKey+"=="+record.get(property)+"]";
	}
	return list.join("or");
}


// filter.Form == FormPanel
mapr.widgets.filter.Form = Ext.extend(Ext.Panel, {
	// if false, we hide the filter body
	//	toggled by our "activeCheckbox"
	active : false,

	// operator between expressions -- "and" vs "or"
	expressionOp : "and",

	// REQUIRED: pointer to the record.fields we filter with this form
	fields : undefined,
	
	// array of names of fields for priority in creating new filter expressions
	// if you don't specify this, it will be derived from filter.fields
	commonFields : undefined,
	
	// The STRING value of the filter, in the form:
	//	[<field><op><value>]<expressionOp>[<field><op><value>]
	filter : "",

	// the OBJECT version of the current filter
	//	this will be kept in sync with the STRING version in .filter
	_expressions : undefined,

	// pointer to the map of massaged record.fields
	//	(set up in ._initFields())
	_fieldMap : undefined,
	
	// Store of fields, used by FieldSelector to choose the field to operate on
	//	(set up in ._initFields())
	_fieldStore : undefined,
	
	
	expressionDescriptionMsg : $tx("({{field}} {{op}} {{value}}){{expressionOp}}"),
	
	operatorTitles : {
		"=="	: $tx("is"),
		"!="	: $tx("is not"),
		">"		: $tx("is greater than"),
		"<"		: $tx("is less than")
	},
	
	expressionOperatorTitles : {
		"and" 	: $tx(" and "),
		"or"	: $tx(" or ")
	},


	// standard panel props
	border: false,
	cls : "filter-panel",
	ctCls : "filter-container",
	bodyCssClass : "filter-body",

	split : false,
	header: false,

	// items we start the display with
	parts : {

		// the actual formPanel for the filter
		form : {
			xtype : "form",
			frame : false,
			border : false,
			cls : "filter"
		},
	
		clearButton : {
			xtype : "button",
			text : "Clear Filter",
			iconCls : "icon-close",
			anchor : "-1",
			handler : function() {
				this.owner.deactivate();
			}
		},

		addButton : {
			xtype : "iconbutton",
			cls : "add",
			iconCls : "icon-add",
			handler : function() {
				this.owner.addExpression();	
			}
		},
		
		// "show filter" checkbox -- hides the filter when unchecked
		activeCheckbox : [
			{
				xtype : "checkbox",
				boxLabel : "Filter",
				listeners : {
					check : function(me, checked) {
						this.owner.setActive(checked);
					}
				}
			},
			{
				xtype : "spacer", width:10
			}
		],
		
		sp5 : { xtype : "spacer", width: 5 },
		sp10 : { xtype : "spacer", width: 10 },
		
		// expressionOp ("and" vs "or") selector w/labels to either side of it
		expressionOpSelectorDefaults : function() {
			return { defaults : {filter : this, value:this.expressionOp } };
		},
		expressionOpSelector : {
			xtype : "compositefield",
			ctCls : "filter-type-selector",
			eatLabel : false,
			width : 500,
			hideLabel : true,
			items : [
				{
					xtype : "label",
					text : "Show items where"
				},
				{
					xtype : "select",
					width : 50,
					name : "expressionOp",
					options : {
						"or" : "any",
						"and" : "all"
					},
					listeners : {
						"select" : function() {
							this.filter.expressionOpChanged(this.getValue());
						}
					}
				},
				{
					xtype : "label",
					text : "of the following are true:"
				}
			]
		}
	},
	
	// set up field and filter structures on initComponent
	initComponent : function() {
		this._initializing = true;
		
		// if we have a tbar, see if any of its items are the names of our parts
		//	and if they are, instantiate them
		if (this.tbar) {
			var i = -1, item;
			while (item = this.tbar[++i]) {
				if (typeof item === "string" && this.parts[item]) {
					this.tbar[i] = this.getPart(item);
				}
			}
		}
		
		// initialize our formpanel
		this.items = [
			this.getPart("form")
		];
		
		mapr.widgets.filter.Form.superclass.initComponent.call(this);
		if (!this.fields) throw "mapr.widget.filter.Form must be initialized with .fields";
		this._initFields(this.fields);

		// set up our filter and type fields
		this.setFilter();

		// setActiveState will show/hide filter fields based on active parameter
		// also calls onFilterChanged
		this.setActive(this.active);
	
		delete this._initializing;
	},
	
	activate : function() {
		this.setActive(true);
	},

	deactivate : function() {
		this.setActive(false);
	},

	setActive : function(state) {
		this.active = (state == true);

		if (this.activeCheckbox) this.activeCheckbox[0].setValue(this.active);
		if (this.expressionOpSelector) this.expressionOpSelector.toggleShow(this.active);
		if (this.clearButton) this.clearButton.toggleShow(this.active);

		this.onFilterChanged();
	},

	// 	Call this when the filter actually changes.
	//	This broadcasts the "filterChanged" event ONLY if the filter value has actually changed.
	onFilterChanged : function() {
		if (!this._changedTask) {
			function _changed() {
				var filter = this.getFilter();
				// skip the call if the filter value is EXACTLY the same as it was before
//console.warn(this,"._changed was:", this.filter, "  IS: ",filter, this.active);

				if (filter === this.filter) return;
				this.filter = filter;
				
				var expressions = (this.active ? this._expressions : []);
				this.fireEvent("filterChanged", this, filter, expressions);
			}
			this._changedTask = new Ext.util.DelayedTask(_changed, this);
		}

		this.dirtyLayout();
		this._changedTask.delay(0);
	},

		
	// set the filter string value
	setFilter : function(filter) {
		if (filter != null) {
			this.filter = filter;
			this.onFilterChanged();
		}

		// split the filter string into expression objects
		this._expressions = this.splitFilter(this.filter);
		if (!this._expressions.length) this._expressions.push(this.getDefaultExpression());
		
		// set the expression operator
		this.setExpressionOp(this._expressions.expressionOp);

		this.updateFilterView();
	},
	
	// get the current value of the filter
	//	note: if filter.active == false, will be {}
	getFilter : function() {
		if (this.active) {
			return this.joinFilter();
		} else {
			return "";
		}
	},
	
	
	// return a human-readable description of the current filter
	getFilterDescription : function(filterStr) {
		var expressions = (filterStr ? this.splitFilter(filterStr) : this._expressions);
		if (!expressions || !expressions.length) return "";
		
		var output = [], i = 0, expression;
		while (expression = expressions[i++]) {
			var fieldData = this._fieldMap[expression.field],
				data = {
					field 	: fieldData.title,
					op 		: this.operatorTitles[expression.operator]
				},
				value = expression.value
			;

// BLAH: doesn't deal with dates or other exotic types...

			// dereference any fields with 'options' to the value's label
			if (fieldData.options) value = fieldData.options[value];
			
			// see if value is a number, if not, put it in quotes
			var numValue = parseFloat(value);
			if (!isNaN(numValue) && ""+numValue === value) {
				data.value = numValue;
			} else {
				data.value = '"' + value + '"';
			}
			
			
			// add expression operator if we're no the last one
			if (i < expressions.length) {
				expOp = expression.expressionOp || this.expressionOp;
				data.expressionOp = this.expressionOperatorTitles[expOp];
			}
			output.push($msg.expand(this.expressionDescriptionMsg, data));
		}
		var expressionOp = this.expressionOperatorTitles[this.expressionOp];
		return output.join("");
	},
	
	// given a filterField, operator and comma- or return-separated list of values
	//	return the filter string for a filter that will match any of the items
	getFilterString : function(filterField, operator, values, skipQuotes) {
		var items =  Ext.clean(values.split(/\s*[,\n]\s*/));
		var filter = [], volume;
		var quote = (skipQuotes ? "" : '"');
		while(volume = items.pop()) {
			filter.push("["+filterField + operator + quote + volume + quote + "]");
		}
		return filter.join("or");
	},
	

	// update the view of the filter, creating filter.Expression objects as necessary
	updateFilterView : function() {
		// create as many expressions as we need
		if (!this.expressions) this.expressions = [];
		for (var i = 0, last = this._expressions.length - 1; i <= last; i++) {
			var expression = this._expressions[i];
			if (!this.expressions[i]) {
				this.expressions[i] = this.form.add({
					xtype : "filter.expression",
					value : expression,
					filter : this,
					index : i,
					cls : (i === 0 ? "first-item" : ""),
				});
			} else {
				this.expressions[i].setValue(expression);
			}
		}
		
		this._toggleExpressions();
		
		// focus in the focusField of the last expression, if defined
		if (this.active) this.expressions[last].doFocus();
	},
	
	// convert a filter string to an array of expression objects
	filterSplitter : /(\[\w+?[=><!]+.*?\]|and|or)/g,
	expressionSplitter : /\[(\w+?)([=<>!]+)(.*)\]/,
	splitFilter : function(filter) {
		var i = -1, expression, results = [];
		results.expressionOp = this.expressionOp;

		if (!filter) filter = "";
		filter = filter.match(this.filterSplitter);

		if (!filter || (filter.length == 0 && filter[0] === "")) return results;
		if (filter.length > 1) results.expressionOp = filter[1];

		while (expression = filter[++i]) {
			expression = this.splitExpression(expression);
			expressionOp = filter[++i];

			if (expression) {
				expression.expressionOp = expressionOp || "";
				results.push(expression);
			}
		}
		return results;
	},
	
	splitExpression : function(expression) {
		expression = expression.match(this.expressionSplitter);
		if (expression) {
			var value = expression[3].replace(/"/g,"");
			// see if value is a number
			var numValue = parseFloat(value);
			if (!isNaN(numValue) && ""+numValue === value) value = numValue;
			return {
				field : expression[1],
				operator : expression[2],
				value : value
			};
		}
	},

	// convert an array of expression objects into a filter string
	joinFilter : function(filter) {
		if (!filter) filter = this._expressions;
		if (!filter) return;
		var i = -1, expression, results = [];
		while (expression = filter[++i]) {
			if (expression.value !== 0 && 
				(expression.value == null || expression.value == "")) continue;
			results.push("["+expression.field + expression.operator + expression.value + "]");
		}
		return results.join(this.expressionOp);
	},

	doLayout : function() {
		mapr.widgets.filter.Form.superclass.doLayout.apply(this);
		// show/hide the body and size the form according to our active property
		this.form.toggleShow(this.active);
		if (this.active) this.el.addClass("filter-active");
		else			 this.el.removeClass("filter-active");
		
		if (this.el && this.body) {
			var filterHeight = (this.active ? this.form.getHeight() : 0);
			var height = this.getFrameHeight() + filterHeight;
			this.body.setSize(this.body.getWidth(), filterHeight);
			this.setSize(this.getWidth(), height);
		}
	},
	
	// show/hide all the expressions that should be shown 
	//	according to our current _expressions AND the .active property
	//
	// also sets "last-item" on the last expression to actually be shown
	//
	// NOTE: does NOT doLayout()!
	_toggleExpressions : function() {
		if (!this.expressions) return;
		
		// show the same number of expressions as our current filter...
		var i = -1, 
			lastToShow = (this._expressions ? this._expressions.length - 1 : -1), 
			expression
		;

		while (++i <= lastToShow) {
			var expression = this.expressions[i];
			expression.show();
			if (i == lastToShow) 	expression.addClass("last-item");
			else					expression.removeClass("last-item");
		}
		
		// hide all other expressions
// HMM, this is not actually removing the entire thing
//		while (expression = this.expressions[i++]) {
//			expression.container.hide();
//		}

// destroy them instead
		while (i++ < this.expressions.length) {
			this.expressions.pop().destroy();
		}

	},
	

	// update an expression, passed as a string or an object
	//	if we're not active, sets the filter to just that expression
	//	otherwise updates expression if one with same field is found
	//	otherwise adds expression
	updateExpression : function(expression) {
		if (typeof expression == "string") expression = this.splitExpression(expression);
		if (!expression) throw "expression not understood";
		
		if (!this.active) return this.addExpression(expression);
		
		// try to find an existing expression with the same fieldname
		var i = -1, existing;
		while (existing = this._expressions[++i]) {
			if (existing.field === expression.field) {
				this._expressions[i] = expression;
				this.updateFilterView();
				this.onFilterChanged();
				return;
			}
		}
		// not found, just add it to the end
		this.addExpression(expression);
	},
	
	// add an expression, either a string or an exp. object, and activate the filter
	//	if we were NOT active before, this will be the only expression
	//	if we were active, it'll get added to the end.
	addExpression : function(expression) {
		// if we're not active, clear the expressions
		if (!this.active) this._expressions = [];
		
		if (!expression) expression = this.getDefaultExpression();
		if (typeof expression == "string") expression = this.splitExpression(expression);

		this._expressions.push(expression);
		if (!this.active) this.activate();
		
		this.updateFilterView();
		this.onFilterChanged();		
	},

	// remove all expressions related to a particular field
	removeExpressionForField : function(field) {
		var i = this._expressions.length, existing, found = false;
		while (existing = this._expressions[--i]) {
			if (existing.field !== field) continue;
			found = true;
			this.removeExpressionAtIndex(i);
		}
		if (!found) return;

		this.updateFilterView();
		this.onFilterChanged();
	},


	// remove an expression, either as an _expression object or index
	removeExpressionAtIndex : function(index) {
		// if the last expression, deactivate the filter
		if (this._expressions.length == 1) {
			this.deactivate(false);
		} else {
			if (this._expressions[index]) this._expressions.splice(index, 1);
			this.updateFilterView();
			this.onFilterChanged();
		}
	},

	// get a default filter expression
	//	finds the next field in filter.commonFields which is not used yet
	getDefaultExpression : function() {
		// figure out the first commonField that's not in use yet
		var clone = [].concat(this._commonFields), i = -1, expression;
		while (expression = this._expressions[++i]) {
			clone.remove(expression.field);
		}
		return {field:clone[0], operator : "==", value : ""};
	},
	

	// called when the expressionOp changes, calls onFilterChanged
	expressionOpChanged : function(newType) {
		if (newType === this.expressionOp) return;
		this.expressionOp = newType;
		this.onFilterChanged();
	},
	

	//
	//	expressionOp -- "+" (and) or "-" (or)
	//
	
	setExpressionOp : function(op) {
		if (op) {
			if (op === this.expressionOp) return;
			this.expressionOp = op;
		}

		// update the field
		if (!this.expressionOpSelector || !this.el) return;

		// if we can't find the field, defer for a little bit
		var field = this.form.getForm().findField("expressionOpSelector");
		if (field) {
			field.setValue(this.expressionOp);
//			field.filter = this;	//HACKISH -- should be some other way to do this
		} else {
			this.setExpressionOp.defer(10, this);
		}
	},
	
	// given a set of record.fields, convert them to filter fields:
	// for each field in fields
	//		if field.filter is falsy, we don't filter on this field
	//		if field.filter is a string, that's the filter type
	//		if field.filter is 'true', filter.type will be set to field.type
	//		if field.filter is an object, that's filter-specific values
	_initFields : function(fields) {
		// TODO: if this.store is already set, change its data (somehow)
		if (this._fieldMap) throw "mapr.widgets.filter.Form._initFields():"
								+ " don't know how to change .fields";
										
		this.fields = fields;
		var filterFields = [],
			map = this._fieldMap = {},
			commonFields
		;
		
		// list of the commonFields will be created if necessary
		if (!this._commonFields) {
			commonFields = this._commonFields = [];
		}

		var i = -1, field, filter;
		while (field = fields[++i]) {
			filter = field.filter;
			// if no filter property, skip this field
			if (!filter) continue;
			
			// handle string (type) or other types of values (simple object)
			if (typeof filter === "string") 		filter = { type : filter };
			else if (typeof filter !== "object")	filter = {};
			
			// make sure that filter.type is set by defaulting to field.type
			if (!filter.type)  filter.type = field.type;
			// if no type, skip this field
			if (!filter.type) continue;	//DEBUG
			
			// figure out the field we're referring to
			if (!filter.field) filter.field = field.mapping || field.name;
			
			// title of the filter menu item
			if (!filter.title) filter.title = field.title;
			if (!filter.title) continue;	//DEBUG
		
			map[filter.field] = filter;
			filterFields.push(filter)

			// add to the list of commonFields if we're deriving it
			if (commonFields) commonFields.push(filter.field);
		}

		// create the fieldStore used by the FieldSelector fields
		window.fs = this._fieldStore = new Ext.data.JsonStore({
			fields : ["field", "title"],
			data : filterFields
		});
		
		this._filterFields = filterFields;
	}

});
Ext.reg("filter.form", mapr.widgets.filter.Form);



// filter.Expression == set of <field><op><value> fields
mapr.widgets.filter.Expression = Ext.extend(Ext.form.CompositeField, {
	hideLabel : true,
	hideParent : true,
	hideMoe : "display",
	itemCls : "filter-expression",
	cls : "filter-expression2",
	
	
	// pointer to our filter Form
	filter : undefined,
	
	// pointer to our fieldSelector
	fieldSelector : undefined,

	// create our FieldSelector on initComponent (should do later, but when?)
	initComponent : function() {
		// start out with just the fieldSelector (cause we have to have at least one)
		this.items = [
			this.getPart("addButton"), 
			this.getPart("removeButton"), 
			this.getPart("fieldSelector")
		];

		// HACK:  skip CompositeField's initComponent, go right to Field
		Ext.form.CompositeField.prototype.initComponent.apply(this, arguments);
	},
	
	// set the expression value -- the filter sub-expression for the expression
	//	value is an object of: 	{ field, operator, value }
	setValue : function(value) {
		this.value = value
		this.updateFields();
	},

	// update the fields to match the current value.field
	updateFields : function() {
		var field = this.value.field,
			fieldSelector = this.getPart("fieldSelector")
		;
		fieldSelector.setValue(field);
		

		var filterField = this.filter._fieldMap[field];
		if (!filterField) return console.warn(this,".updateFields(): field "+field+" not found");

		var	type = filterField.type,
			alreadyShown = this[type+"Selectors"] != null,
			selectors = this.getSelectors(type)
		;

		// if type has actually changed, update the fields we're showing
		if (type != this._type) {
			// if we've already run before
			if (this._selectors) {
				// hide the current set of fields
				this.hideItems(this._selectors);
			}
	
			if (!selectors) throw this+".updateFields(): selector type '"+type+"' not found";
	
			if (this.innerCt) {
				if (alreadyShown) {
					this.showItems(selectors);		
				} else {
					this.addItems(selectors);
				}

				this.innerCt.doLayout();
			} else {
				if (!alreadyShown) this.items.push.apply(this.items, selectors);
			}
		}

		this._type = type;
		this._selectors = selectors;

		// if there's a special updater for this type, call it
		delete this._focusField;
		var updater = this.selectorUpdaters[type];
		if (updater) updater.call(this, selectors, filterField);
	},
	
	// one or more of our values has changed
	// update the filter if our value is complete...
	onChange : function() {
		this.filter.onFilterChanged();
	},
	
	onFieldChanged : function(newValue) {
		if (newValue == this.value.field) return;
		this.value.field = newValue;

		// clear the "value" field since it's almost certainly not right
		this.value.value = "";

		this.updateFields();
		this.onChange();
		this.doFocus();
	},
	
	onOperatorChanged : function(newValue) {
		this.value.operator = newValue;
		this.onChange();
		this.doFocus();
	},

	onValueChanged : function(newValue) {
		this.value.value = newValue;
		this.onChange();
	},

	doFocus : function() {
return;
		if (this._focusField) this._focusField.focus.defer(10, this._focusField);
	},

	_type : undefined,
	_selectors : undefined,
	
	
	// set the operator selector to the specified opValue
	//	NOTE: if opValue is not a legal value for the selector
	//			defaults to the first item in the selector
	setOperator : function(opSelector, opValue) {
		opSelector.setValue(this._getLegalValue(opSelector, opValue));
	},
	
	// look for value in the selector's store
	//	if it can be found, return value
	//	if not, return the value of the first item in the store
	_getLegalValue : function(selector, value) {
		var index = selector.store.find("value", value);
		if (index > -1) return value;
		return selector.store.getAt(0).get("value");
	},
	
	
	// updaters functions for various field types
	//	will be called with "this" as the filter.Expression
	selectorUpdaters : {
		"string" : function(selectors, filterField) {
			this.setOperator(selectors[0], this.value.operator);
			selectors[1].setValue(this.value.value);
			this._focusField = selectors[1];
		},

		"int" : function(selectors, filterField) {
			this.setOperator(selectors[0], this.value.operator);
			selectors[1].setValue(this.value.value);
			this._focusField = selectors[1];
		},
		
		"enum" : function(selectors, filterField) {
			this.setOperator(selectors[0], this.value.operator);
			selectors[1].setOptions(filterField.options);
			
			// make sure the value.value is a legal enumerated value
			//	if it is not, we default to the first enumerated value
			this.value.value = this._getLegalValue(selectors[1], this.value.value);
			selectors[1].setValue(this.value.value);
			this._focusField = selectors[1];
		}
	},
	
	// return the selector fields for a given field type
	//	stored as expression[type+"Selectors"]
	getSelectors : function(type) {
		return this.getParts(type+"Selectors");
	},
	
	// config objects for different parts of the ui
	parts : {
		defaults : function() {
			return { expression : this, filter : this.filter };
		},
	
		removeButton : {
			xtype : "iconbutton",
			cls : "remove",
			iconCls : "icon-close",
			handler : function() {
				var index = this.owner.index;
				this.filter.removeExpressionAtIndex(index);	
			}
		},

		addButton : {
			xtype : "iconbutton",
			cls : "add",
			iconCls : "icon-add",
			handler : function() {
				this.filter.addExpression();	
			}
		},

		fieldSelector : {
			xtype : "select",
			hideLabel : true,
			valueField : "field",
			margins : "0 5 0 0",
			listeners : {
				select : function() {
					var value = this.getValue();
					this.expression.onFieldChanged(value);
				}
			}
		},
		fieldSelectorDefaults : function() {
			return {store:this.filter._fieldStore, expression : this, filter : this.filter};
		},
		
		stringSelectors : [
			{
				xtype : "select",
				name : "operator",
				margins : "0 5 0 0",
				width: 90,
				options : {
							"==":"is",
							"!=":"is not"
						  },
				listeners : {
					select : function() {
						this.expression.onOperatorChanged(this.getValue());
					}
				}
			},
			{
				xtype : "textfield",
				name : "value",
				margins : "0 5 0 0",
				plugins : ["changeonkeypress"],
				listeners : {
					//TODO: we actually want to do this on keypress...
					change : function(me, newValue, oldValue) {
						this.expression.onValueChanged(newValue);
					}
				}
			}
		],
		
		intSelectors : [
			{
				xtype : "select",
				name : "operator",
				margins : "0 5 0 0",
				width: 90,
				options : {
							"==":"is",
							"!=":"is not",
							">":"is greater than",
							"<":"is less than"
						   },
				listeners : {
					select : function() {
						this.expression.onOperatorChanged(this.getValue());
					}
				}
			},
			{
				xtype : "textfield",
				plugins : ["changeonkeypress"],
				name : "value",
				margins : "0 5 0 0",
				listeners : {
					//TODO: we actually want to do this on keypress...
					change : function(me, newValue, oldValue) {
						this.expression.onValueChanged(newValue);
					}
				}
			}
		],

		enumSelectors : [
			{
				xtype : "select",
				name : "operator",
				margins : "0 5 0 0",
				width: 90,
				options : {
							"==":"is",
							"!=":"is not"//,
//							",=":"is one of"
						   },
				listeners : {
					select : function() {
						this.expression.onOperatorChanged(this.getValue());
					}
				}
			},
			{
				xtype : "select",
				name : "value",
				margins : "0 5 0 0",
				listeners : {
					select : function() {
						this.expression.onValueChanged(this.getValue());
					}
				}
			}
		]
	},
	
	
	//
	//	Manipulate the composite.items (add/remove/hide/etc).
	// 	NOTE: you need to call 		this.innerCt.doLayout();   after doing the below
	//
	// the following is generic, and could be added to CompositeField in general
	hideItems : function(items) {
		var i = -1, item;
		while (item = items[++i]) {
			item.hide();
		}
	},

	showItems : function(items) {
		var i = -1, item;
		while (item = items[++i]) {
			item.show();
		}
	},

	removeItems : function(items) {
		var i = -1, item;
		while (item = items[++i]) {
			this.innerCt.remove(item, false);
			this.items.remove(item);
			item.hide();
		}
		this.innerCt.doLayout();
	},
	
	addItems : function(items) {
		var i = -1, item;
		while (item = items[++i]) {
			item.show();
			this.innerCt.add(item);
			this.items.add(item);
		}
	},
	
	clearItems : function() {
		// add the form items to our innerContainer
		this.innerCt.removeAll(false);
		this.innerCt.add(items);
	}
});
Ext.reg("filter.expression", mapr.widgets.filter.Expression);







})();			// end hidden from global scope
