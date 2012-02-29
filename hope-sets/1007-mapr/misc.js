/*	Misc, small, useful widgets.
	Copyright (c) 2010, MapR Technology.  All rights reserved.
 */

(function(){	// begin hidden from global scope

Ext.ns("mapr.widgets");



/*** 
 *
 * Ext.ComponentMgr overrides
 *
 ***/

// Ext.CM -- compact reference to Ext.ComponentMgr
var CM = Ext.ComponentMgr;

var oldRegister = CM.register,
	oldUnregister = CM.unregister
;
Ext.apply(CM, {
	// component.gid -- 
	//	setting component.gid automatically sets a global reference to the component
	//	 when it is instantiated.  
	//
	//	 Pass either a global object 'path' or [context,'componentName']
	//
	// UPGRADE: could cause problems with upgrading Ext
	register : function(it) {
		oldRegister(it);
		if (it.gid) {
			// string is a global name
			if (typeof it.gid == "string") {
				util.path.set(window, it.gid, it);
			}
			// array is [context, "name"]
			else {
				util.path.set(it.gid[0], it.gid[1], it);
			}
		}
	},
	
	// UPGRADE: could cause problems with upgrading Ext
	unregister : function(it) {
		oldUnregister(it);
		if (it.gid) {
			// string is a global name
			if (typeof it.gid == "string") {
				util.path.clear(window, it.gid, it);
			}
			// array is [context, "name"]
			else {
				util.path.clear(it.gid[0], it.gid[1], it);
			}
			delete it.gid;
		}
	},
	
	
	// override create to be friendlier if something goes wrong
	// UPGRADE: could cause problems with upgrading Ext
	create : function(config, defaultType){
		if (!config) {
			console.warn("Ext.ComponentMgr.create(",config,"): config not specified");
			return;
		}
		if (config.render) return config;
		var type = config.xtype || defaultType;
		if (!type) {
			console.warn("Ext.ComponentMgr.create(",config,"): type not  specified");
			return;
		}
		return new CM.types[type](config);
	}	
});



/*** 
 *
 * Ext.Component/container overrides
 *
 ***/


//
//	Component methods
//
Ext.apply(Ext.Component.prototype, {
	//
	//	toggleShow() on a component to show/hide based on an input parameter.
	//
	toggleShow : function(toShow) {
		if (toShow != false) 	this.show();
		else					this.hide();
	},

	//
	//	toggleExpand() on a component to expand/collapse based on an input parameter.
	//
	toggleExpand : function(toShow) {
		if (toShow != false) 	this.expand();
		else					this.collapse();
	},


	// component.getProto() -- return the superclass prototype of this component instance
	// UPGRADE: could cause problems with upgrading Ext
	getProto : function() {
		return this.constructor.prototype;
	}
	
});




//
//	Container methods
//
Ext.apply(Ext.Container.prototype, {
	// Call this to recalculate our layout *in a little bit*.
	//	Set up so it will only fire once if a bunch of things call it
	//	in a row before it actually fires once.
	dirtyLayout : function() {
		if (!this._layoutTask) this._layoutTask = new Ext.util.DelayedTask(this.doLayout, this);
		this._layoutTask.delay(0);
	}
});





// IconButton:  button which just shows as an icon, w/ no text and no frills.
mapr.widgets.IconButton = Ext.extend(Ext.Button, {
	
	// css class for the button icon
	iconCls : undefined,
	
	// outer css class for the button
	cls : "",
	
	// special template
	template : new Ext.Template(
		"<span><button class='mapr-icon-button'><div></div></button></span>"
	),
	
	setIconClass : function(cls){
		this.iconCls = cls;
		if(this.el){
			this.btnEl.dom.className = "mapr-icon-button "+this.cls;
			this.btnEl.dom.childNodes[0].className = "mapr-icon " + this.iconCls;
		}
		return this;
	},
	
	// ignore the following
	setIcon : function(){return this;},
	setText : function(){return this;},
	setButtonClass : function(){return this;}
});
Ext.reg("iconbutton", mapr.widgets.IconButton);



// CloseButton:  (x) close button icon
//	set it's 'closer' to call closer.onClose() automatically
mapr.widgets.CloseButton = Ext.extend(mapr.widgets.IconButton, {
	iconCls : "icon-close"
});
Ext.reg("closebutton", mapr.widgets.CloseButton);



/*** 
 *
 * Ext.ToolTip overrides
 *
 ***/
Ext.apply(Ext.ToolTip.prototype, {
	setHTML : function(html) {
		this.html = html;
		if (this.body) this.body.dom.innerHTML = html;
	}
});


})();			// end hidden from global scope
