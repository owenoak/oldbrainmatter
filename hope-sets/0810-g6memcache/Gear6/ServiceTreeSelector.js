/*
	Special class to show a services/instances tree in the memcache-stats page
	TOOD: generalize this somehow?


	- open/close services
	- only one service open @ a time
	- 

*/

var ServiceTreeSelector = Class.create(Control, {
	klass			: "ServiceTreeSelector",
	className		: "ServiceTree",
	
	APPLIANCE_ID	: "Appliance",				// internal name of the appliance row
	APPLIANCE_TITLE	: "Appliance",				// visible name of the appliance row

	value			: "",						// format for value: list of
												//		"service name" or
												//		"service name:instance ip"
												//	separated by semicolons, so:
												//		"php|php:1.2.3.4|php:3.4.5.6"
	
	services		: undefined,				// list of services:
												//		[
												//			{ 	id : "service name",
												//				instances : [
												//					{	id : "instance id"	},
												//					{	id : "instance id"	},
												//				]
												//			},
												//			...
												//		]
												//
												
	openService		: undefined,				// id of the service which is currently 'opened'

	valueSeparator  : "|",

	// manipulating the "services" parameter
	getServiceInstances : function(serviceId) {
		var selected = [];
		this.services.forEach(function(service) {
			if (service.id != serviceId) return;
			selected.push(serviceId);
			if (service.instances) {
				service.instances.forEach(function(instance) {
					selected.push(serviceId + ":" + instance.id);
				}, this);
			}
		}, this);
		return selected.join(this.valueSeparator);
	},

	getServiceObject : function(serviceId) {
        var obj = undefined, i;
        for (i = 0; i < this.services.length; i++) {
            if (this.services[i].id == serviceId) {
                obj = this.services[i];
                break;
            }
		}
		return obj;
	},

	itemSelected : function(serviceId, instanceId) {
		var index = this.getValueIndex(serviceId, instanceId);
		return index > -1;
	},
	
	selectItem : function(serviceId, instanceId) {
		var index = this.getValueIndex(serviceId, instanceId);
		if (index == -1 && this.value) {
			if (instanceId != null) this.value.push(serviceId + ":" + instanceId);
			else					this.value.push(serviceId);
		}
		// call setValue to notify anyone who is waiting on the value to change, etc
		this.setValue(this.value, false);
		this.onChange();
	},
	
	deselectItem : function(serviceId, instanceId) {
		var index = this.getValueIndex(serviceId, instanceId);
		if (index > -1 && this.value) {
			this.value.splice(index, 1);
		}
		// call setValue to notify anyone who is waiting on the value to change, etc
		this.setValue(this.value, false);
		this.onChange();
	},

	getValueIndex : function(serviceId, instanceId) {
		if (!this.value) return -1;
		
		if (instanceId != null) return this.value.indexOf(serviceId + ":" + instanceId);
		return this.value.indexOf(serviceId);
	},


	//
	//	value
	//

	setValue : function(value, updateElement) {
		if (typeof value == "string") value = value.split(this.valueSeparator);
		this.value = value.sort(); // we want instances graphed in predictable order

		// make sure that the selected service is 'open'
		this.value.forEach(function(item) {
			if (item.indexOf(":") == -1) this.openService = item;
		}, this);
		
		if (updateElement != false) this.setElementValue(value);
	},
	
	// something like so:		"php|php:1.2.3.4|php:3.4.5.6"
	setElementValue : function(value) {
		if (!this.$element) return;
		
		this.$checkboxes.forEach(function(checkbox) {
			var ref = checkbox.getAttribute("ref"),
				checked = (this.value ? this.value.indexOf(ref) > -1: false)
			;
			checkbox.checked = checked;
		}, this);
		
		this.$radios.forEach(function(radio) {
			var ref = radio.getAttribute("ref"),
				checked = (this.openService == ref)
			;
			radio.checked = checked;
		}, this);
		
		return; // TODO
	},

	getElementValue : function(element) {
		return (this.value || []).join(this.valueSeparator);
	},


	//
	//	event handling
	//
	
	// they clicked on the name of a service
	//	NOTE: you can also call this directly (on the control) to select a service & its instances
	onSelectService : function(serviceId) {
        var svc = this.getServiceObject(serviceId);
        if (svc && svc.image && svc.image.match(/gear6/)) {
            $$(".gear6OnlyOption").each(function(element){
                element.style.display = "block";
            });
        } else {
            $$(".gear6OnlyOption").each(function(element){
                element.style.display = "none";
            });
        }
		if (svc.id == "Appliance") {
			$$(".serviceOnlyOption").each(function(element){
				element.style.display = "none";
			});
		} else {
			$$(".serviceOnlyOption").each(function(element){
				element.style.display = "block";
			});
		}
		this.openService = serviceId;
		this.setValue(this.getServiceInstances(serviceId), false);
		this.onChange();
		this.redraw();
		this.setElementValue();
	},
	
	// they clicked on a service checkbox
	onCheckService : function(serviceId, checked) {
		if (this.itemSelected(serviceId)) {
			this.deselectItem(serviceId);
		} else {
			this.selectItem(serviceId);
		}
		this.setElementValue();
	},
		
	onSelectInstance : function(serviceId, instanceId) {
		// toggle the instance checkbox
		if (this.itemSelected(serviceId, instanceId)) {
			this.deselectItem(serviceId, instanceId);
		} else {
			this.selectItem(serviceId, instanceId);
		}
		this.setElementValue();
	},
	
	onCheckInstance : function(serviceId, instanceId, checked) {
		if (checked) 	this.selectItem(serviceId, instanceId);
		else			this.deselectItem(serviceId, instanceId);

		// don't need to setElementValue 'cause the checkbox has already changed
		//		this.setElementValue();
	},


	//
	//	drawing
	//

	prepareToDraw : function($super) {
		$super();
		
		var html = [];
		
		this.services.forEach(function(service) {
			// make sure each service has a 'title' parameter
		    if(service.id == page.detailsTabId) return;
		    if (!service.title) service.title = service.id;

			this._service = service;
			this._serviceIsSelected = (this.openService == service.id);
			this._serviceChecked = this._serviceIsSelected ? "CHECKED" : "";
			if (service.enable == "false") {
			  this._service.message = "(disabled)";
			}
			if (service.id == this.APPLIANCE_ID) {
				html.push(this.ApplianceTemplate.evaluate(this));	
			} else if (this._serviceIsSelected) {
				html.push(this.SelectedServiceTemplate.evaluate(this));

				service.instances.forEach(function(instance) {
					this._instance = instance;
					html.push(this.InstanceTemplate.evaluate(this));
				}, this);
			} else {
				html.push(this.NormalServiceTemplate.evaluate(this));
			
			}
		}, this);
		
		this._itemsHTML = html.join("\n");
	},

	onAfterDraw : function() {
		this.$element = this.$main;
		this.$treeElements = this.$main.select(".TreeItem");
		this.$services = this.$main.select(".Service");
		this.$instances = this.$main.select(".Instance");
		this.$checkboxes = this.$main.select("INPUT[type='checkbox']");
		this.$radios = this.$main.select("INPUT[type='radio']");
	},

	onRedraw : function() {
		this.prepareToDraw();
		this.onDraw();
		this.onAfterDraw();
	},
	
	OuterTemplate : new Template("\
		<div id='#{id}' class='ServiceTreeSelector'>\
			<table width='100%' cellspacing=0 cellpadding=0 border=0>\
				#{_itemsHTML}\
			</table>\
		</div>\
	"),
	
	ApplianceTemplate : new Template("\
		<tr class='ServiceRow'>\
			<td class='TreeRadio'>\
				<input type='radio' family='detailsService' ref='#{APPLIANCE_ID}'\
					onclick='#{globalRef}.onSelectService(\"#{APPLIANCE_ID}\")'\
				>\
			<td class='TreeItem Service'\
					onmousedown='#{globalRef}.onSelectService(\"#{APPLIANCE_ID}\")'>\
				<div class='TreeItemContainer'>\
					<span class='name'>#{APPLIANCE_TITLE}</span>\
				</div>\
			</td>\
			<td class='TreeItemCheckbox'></td>\
		</tr>\
	"),
	
	SelectedServiceTemplate : new Template("\
		<tr class='ServiceRow'>\
			<td class='TreeRadio'>\
				<input type='radio' family='detailsService' ref='#{_service.id}'\
					onclick='#{globalRef}.onSelectService(\"#{_service.id}\")'\
				>\
			<td class='TreeItem Service'\
					onmousedown='#{globalRef}.onSelectService(\"#{_service.id}\")'>\
				<div class='TreeItemContainer'>\
					Service: <span class='name'>#{_service.id}</span> <span class='message'>#{_service.message}</span>\
				</div>\
			</td>\
			<td class='TreeItemCheckbox'>\
			</td>\
		</tr>\
	"),
	
	NormalServiceTemplate : new Template("\
		<tr class='ServiceRow'>\
			<td class='TreeRadio'>\
				<input type='radio' family='detailsService' ref='#{_service.id}'\
					onclick='#{globalRef}.onSelectService(\"#{_service.id}\")'\
				>\
			<td class='TreeItem Service' colspan='2'\
					onmousedown='#{globalRef}.onSelectService(\"#{_service.id}\")'>\
				<div class='TreeItemContainer'>\
					Service: <span class='name'>#{_service.id}</span> <span class='message'>#{_service.message}</span>\
				</div>\
			</td>\
		</tr>\
	"),	
	InstanceTemplate : new Template("\
		<tr class='InstanceRow'>\
			<td></td>\
			<td class='TreeItem Instance'\
					onmousedown='#{globalRef}.onSelectInstance(\"#{_service.id}\", \"#{_instance.id}\")'>\
					<span class='name'>#{_instance.id}</span>\
			</td>\
			<td class='TreeItemCheckbox'>\
				<input type='checkbox' ref='#{_service.id}:#{_instance.id}'\
					onclick='#{globalRef}.onCheckInstance(\"#{_service.id}\", \"#{_instance.id}\", this.checked)'\
				>\
			</td>\
		</tr>\
	")

});
