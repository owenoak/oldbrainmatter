/** Service View widget */
// Copyright (c) 2009-2010, Gear Six, Inc.  Subject to a BSD-style
// license whose text is available at /license.txt on this machine

jQuery.extend({
    serviceView : {

        /* Given a view or a child of some view, return the view element associated with it. */
        getView : function(viewOrChildElement) {
            if (viewOrChildElement.jquery) return viewOrChildElement;
            return serviceWindow = $(viewOrChildElement).parents(".ServiceView");
        },
        
        /* Given a view or a child of a view, return the service associated with it. */
        getService : function(view) {
            view = this.getView(view);
            return SP.serviceMap[view.attr("service")];
        },
        
        /* Given a child element of an instance row, return the instance associated with it. */
        getInstanceView : function(element) {
            return $(element).parents(".MemcacheInstance");
        },

        /* Given a child element of an instance row, return the instance associated with it. */
        getInstance : function(element, service) {
            if (!service) service = this.getService(element);
            var instanceName = $(element).parents(".MemcacheInstance").attr("instance");
            return service.instanceMap[instanceName];
        },

        
        //
        //  updating the view display (assumes data has already been massaged)
        //


        /* Update the service views for a service. */
        update : function(service) {
            //
            // massage service display data
            //
    
            // get HTML for each instance
            service._instancesHTML = "";
            service._rehashing = false;
            service._showPublicIps = false;
            service._instanceIps = [];
    
            if (service.instances) {
                $.each(service.instances, function(index, instance) {
                	service._instanceIps.push(instance.ip);

                    // should we show the publicIP field for the instance?
                    instance._showPublicIp = (instance.publicIp != null && instance.publicIp != instance.ip);

                    // should we show the entire column?
                	service._showPublicIps = service._showPublicIps || instance._showPublicIp;
                
                    // get the instance memory graph data
                    instance.graph = SP.formatMemoryData(
                                            instance.memory, 
                                            instance.free, 
                                            instance.used, 
                                            $.message("instance.memoryGraph.label"), 
                                            $.message("instance.memoryGraph.hint")
                                        );
                    instance._memcacheStateTitle = 
                        $.message("instance.memcacheState."+instance.memcacheState) || instance.memcacheState;
                    instance._statusTitle =
                        $.message("instance.status."+instance.status) || instance.status;
                    
                    if (!instance.reporterStatus) instance.reporter = "off";
                    else                           instance.reporter = instance.reporterStatus;
                    instance._reporterTitle = $.serviceView.getReporterTitle(instance);
    
                    // get the 'info' for the instance
                    //  we show this as a hover over the 'info' button
                    var infoItems = [
                        // start with identifier
                        {   name : $.message("instance.info.identifier.title"),     
                            value : instance.identifier || (instance.hostname + " (" + instance.ip + ":" + instance.port + ")")
                        }
                    ];
                    if (instance.imageId) {
                        infoItems.push(
                            {   name : $.message("instance.info.imageId.title"),
                                value : instance.imageId
                            }
                        );
                    }
                    if (instance.vendorType) {
                        infoItems.push(
                            {   name : $.message("instance.info.vendorType.title"),
                                value : instance.vendorType
                            }
                        );
                    }
                    // and add an entry for each instance config item
                    if (instance.config) {
                        for (var i = 0, config; config = instance.config[i++];) {
                            var name = $.message("instance.info."+config.name+".title") 
                                        || config.name;
                            infoItems.push({name:name, value : config.value});
                        }
                    }
                    
                    // format the 'info' for display
                    // Note that we will eventually show this as a hover,
                    //  for now just formatting to go in a 'title' attribute, which is not as pretty.
                    var output = [];
                    for (var i = 0, item; item = infoItems[i++];) {
                        output.push("["+item.name + "|" + item.value + "]");
                    }
                    instance._info = "["+output.join("")+"]";
                    
                    if (instance.rehashState == "enabled") service._rehashing = true;
                    instance._selected = (instance.name == SP.selectedInstance ? "Selected" : "");
                    
                    // get the HTML for the instance
                    instance.html = $.string.interpolate($.templates.InstanceTemplate, instance);
                    service._instancesHTML += instance.html;
                });
            }
    
    		service._instanceIps = service._instanceIps.join(",");
    
            service._instanceCountMessage = $.message("service.instanceCount"
                                                + (service._instanceCount == 1 ? "1" : "N"), service);
    
            service._instancesHTML = $.string.interpolate($.templates.InstancesTemplate, service);
    
            // set up the values for the 'messageType' selector
            if (SP.machineTypeMap) {
                var machineTypes = SP.machineTypeMap[service.arch];
                service._machineTypeOptions = "";
                $.each(machineTypes, function(index, type) {
                        service._machineTypeOptions += "<option value='"+type.vendorType+"'>"
                            + type._title
                            + "</option>\n";
                    });
            }
    
            // set up the service graph
            service.graph = SP.formatMemoryData(
                                    service.memory, 
                                    service.free, 
                                    service.used, 
                                    $.message("service.memoryGraph.label"), 
                                    $.message("service.memoryGraph.hint")
                                );
    
            // set the tab.type to 'Pool' or 'Service'
            if (service.tab) {
                service.tab.html(service.name);
                service.tab.attr("service", service.name);
                service.tab.attr("wd", service._type);
            }
            
            // update the service view
            if (service.view) {
                this.updateElements(service, service.view);
            }
        },
    
        getReporterTitle : function(instance) {
            var on = instance.reporterEnabled == "true" || instance.reporterEnabled == true;
            return $.message("instance.actions.reporter.title."+on);
        },
    
        updateElements : function(service, view) {
            if (view == null) return console.warn("$.serviceView.updateElements: no view");
            
            view.attr("service", service.name);
            view.attr("wd", service._type);
            view.attr("status", service.status);
            view.attr("instances", service._instanceCount);
            view.attr("rehashing", service._rehashing);
        	view.attr("showPublicIps", service._showPublicIps);
        	
            // update ALL of the html of ALL of the instances at once
            var windowBody = view.find(".WindowBody");
            windowBody.html(service._instancesHTML);

            // make sure the service._collapsed state is honored
            if (service._collapsed == null) service._collapsed = false;
            view.attr("collapsed", service._collapsed);
            windowBody.toggle(!service._collapsed);
    
            view.find(".machineType").html(service._machineTypeOptions);
    
    		// add the clippy element
    		if (service._lastInstanceIps != service._instanceIps) {
    			// LAME -- have to hard-code color of window here...
    			var color = (service._type == "Pool" ?  "#6b8e00" : "#888888"),
    				clippyHTML = $.clippy.getHTML(service._instanceIps, color)
    			;
	    		view.find(".clippyContainer").html(clippyHTML);
	    		service._lastInstanceIps = service._instanceIps
	    	}
    
            // update the dynamic parts of the service view
            $.string.updateParts(view.find("[part]"), service);
        },


        forms : {
            //
            //  manage the "add servers" form
            //
            addServers : {
                drawerName : "addServers",
                
                init : function(view) {
                    view = $.serviceView.getView(view);
                    var service = $.serviceView.getService(view), focusField;
                    if (service._unnamed) {
                        // put the identifier name in the "name" field
                        var elements = this.getElements(view);
                        elements.name[0].value = $.form.validate.identifier(service.name);
                        // and focus in the name field
                        focusField = "name";
                    }
                    this.updateElements(view, null, null, focusField);
                },
                
                toggle : function(view) {
                    return $.serviceView.toggleDrawer(view, this.drawerName);
                },
                
                show : function(view) {
                    return $.serviceView.openDrawer(view, this.drawerName);
                },
                
                hide : function() {
                    return $.serviceView.closeDrawer();
                },
                
                getElements : function(view) {
                    return {
                        form : view.find(".addServers"),
                        error : view.find(".addServers .errorMessage"),
                        create : view.find("[type=radio][value=create]"),
                        count : view.find(".serverCount"),
                        machineType : view.find(".machineType"),
                        attach : view.find("[type=radio][value=attach]"),
                        ips : view.find(".ips"),
                        name : view.find(".name")
                    }
                },
                
                updateElements : function(view, mode, error, focusField) {
                    view = $.serviceView.getView(view);
                    var elements = this.getElements(view),
                        service = $.serviceView.getService(view)
                    ;
        
                    if (mode == null) {
                        if (SP.config.role != "super") {
                            mode = "attach";
                        } else {
                            mode = elements.form.attr("mode") || "attach";
                        }
                    }
        
                    var attaching = (mode == "attach");
        
                    // set the mode on the form
                    elements.form.attr("mode", mode);
                    
                    // handle the error if supplied
                    if (error) {
                        elements.error.html(error).show();
                        elements.form.attr("error", true);
                    } else {
                        elements.form.attr("error", false);
                        elements.error.hide();
                    }
                    
                    // set the radio buttons and field enabled based on the createMode
                    if (attaching) {
                        elements.attach[0].checked = true;
                    } else {
                        elements.create[0].checked = true;
                    }
                    elements.count[0].disabled = attaching;
                    elements.machineType[0].disabled = attaching;
                    elements.ips[0].disabled = !attaching;
                    
                    // focus in the correct field
                    //  do this on a timer to account for drawer open/close lag
                    if (focusField == null) focusField = (mode == "attach" ? "ips" : "count");
                    setTimeout(function() {elements[focusField][0].select();}, 250);
                },
                
                onBlurName : function(element) {
                    var value = element.value;
                    element.value = $.form.validate.identifier(value);
                    return false;
                },
                
                onRadioClick : function(element) {
                    var view = $.serviceView.getView(element);
                    var mode = element.getAttribute("value");
                    this.updateElements(view, mode);
                    return true;
                },
                
                save : function(view) {
                    view = $.serviceView.getView(view);
                    service = $.serviceView.getService(view);
                    
                    var elements = this.getElements(view),
                        mode = elements.form.attr("mode"),
                        count = parseInt(elements.count[0].value),
                        ips = $.trim(elements.ips[0].value),
                        errors = [],
                        focusField,
                        mustRename = service._unnamed
                    ;

                    // do simple field validation
                    if (mode == "create") {
                        try {
                            count = $.form.validate.positiveInteger(count);
                        } catch (e) {
                            errors.push($.message("api.createServers.error-invalid-count"));
                            focusField = "count";
                        }
                    } else {
                        try {
                            ips = $.form.validate.ipAddresses(ips);
                        } catch (e) {
                            errors.push($.message("api.createServers.error-invalid-ips"));
                            focusField = "ips";
                        }
                    }
                    
                    // if we're renaming, make sure that they specified an identifier
                    // NOTE: the validate.identifier call may transform the value
                    //          but it will never error
                    if (mustRename) {
                        var newName = elements.name[0].value;
                        newName = elements.name[0].value = $.form.validate.identifier(newName);
                    }

                    var errorMessage = errors.join("<br>");
                    // if there was an error message, show it and exit.
                    this.updateElements(view, null, errorMessage);
                    if (errorMessage) return false;
        
                    // set up the data for the call
                    var data = {
                        service : (mustRename ? newName : service.name)
                    };
                    
                    // call the appropriate server operation based on the mode
                    if (mode == "create") {
                        data.count = count;
                        var typeSelector = elements.machineType[0]
                        data.vendorType = typeSelector.options[typeSelector.selectedIndex].value;
                        data.imageId = service.instances[0].imageId;
                        $.api.createServers(service, view, data);
                        
                    } else {
                        // if the mustRename flag is on, 
                        //  add the IP of the first (only) instance of the service
                        //  to the list of ips.  A bit wacky, I know.
                        if (mustRename) {
                            var instanceIp = service.instances[0].ip;
                            ips = instanceIp + "," + ips;
                        }
                        data.ips = ips;
                        $.api.attachIps(service, view, data);
                    }
                    return false;
                },
                
                onSaveSuccess : function(view) {
                    this.hide(view);
                },
                
                onSaveError : function(errorMessage, view) {
                    this.updateElements(view, null, errorMessage);
                }
            }, // forms.addService



            //
            //  manage the "rename" form
            //
            renameService : {
                drawerName : "renameService",
                
                init : function(view) {
                    view = $.serviceView.getView(view);
                    var service = $.serviceView.getService(view),
                        elements = this.getElements(view)
                    ;
                    elements.name[0].value = $.form.validate.identifier(service.name);
                    this.updateElements(view);
                },

                toggle : function(view) {
                    return $.serviceView.toggleDrawer(view, this.drawerName);
                },
                
                show : function(view) {
                    return $.serviceView.openDrawer(view, this.drawerName);
                },
                
                hide : function() {
                    return $.serviceView.closeDrawer();
                },
                
                getElements : function(view) {
                    return {
                        form : view.find(".renameService"),
                        error : view.find(".renameService .errorMessage"),
                        name : view.find(".serviceName")
                    }
                },

                updateElements : function(view, error) {
                    view = $.serviceView.getView(view);
                    var elements = this.getElements(view);
                    
                    // handle the error if supplied
                    if (error) {
                        elements.error.html(error).show();
                        elements.form.attr("error", true);
                    } else {
                        elements.error.hide().html("");
                        elements.form.attr("error", false);
                    }

                    // select the appropriate field based on the createMode
                    setTimeout(function() {
                            elements.name[0].select();
                        }, 250
                    );
                },
        
                save : function(view) {
                    view = $.serviceView.getView(view);
                    var service = $.serviceView.getService(view),
                        elements = this.getElements(view)
                    ;
                    
                    var newName = elements.name[0].value 
                                = $.form.validate.identifier(elements.name[0].value);

                    // if they didn't provide a name, show an error
                    if (!newName) {
                        this.updateElements(view, null, errorMessage);
                        return false;
                    }
                    
                    var data = {oldName : service.name, newName : newName};
                    $.api.renameService(service, view, data);
                    return false;
                },

                onBlurName : function(element) {
                    var value = element.value;
                    element.value = $.form.validate.identifier(value);
                    return false;
                },

                onSaveSuccess : function(view) {
                    this.hide(view);
                },
                
                onSaveError : function(errorMessage, view) {
                    this.updateElements(view, errorMessage);
                }

            } // forms.rename
            
        }, // forms


        /** Show the serviceView for a particular service. 
            Note: doesn't worry about any other services!
        */
        show : function(service) {
            $(".ServiceView[service=" + service.name + "]").show();
        },


        //
        //  stop an instance
        //
        onStopInstance : function(element) {
            var instance = this.getInstance(element);
            $.api.stopInstances([instance]);
        },


        //
        //  detach an instance
        //
        onDetachInstance : function(element) {
            var view = $.serviceView.getView(element),
                service = $.serviceView.getService(view),
                instance = this.getInstance(element)
            ;
            var data = {
                service : service.name,
                ips : instance.ip
            }
            $.api.detachIps([instance], view, data);
        },


        //
        //  toggle reporting on/off for an instance
        //
        onToggleReporter : function(element) {
            var instance = this.getInstance(element),
                instanceView = this.getInstanceView(element),
                operation = (instance.reporterEnabled ? "stop" : "start")
            ;
            $.api.toggleReporter(operation, instance, instanceView);
        },
        
        
        /**  Toggle reporting succeeded. */
        onToggleReporterSucceeded : function(instance, instanceView, data) {
            // switch the text of the toggle anchor.
            instanceView.find(".reporterMessage").html(this.getReporterTitle(instance));
            instanceView.find(".reporterLink").html(this.getReporterTitle(instance));
        },


        /** Select a particular instance (from click on the instance anchor). */
        onSelectInstance : function(element) {
            var instance = this.getInstance(element);
            SP.selectInstance(instance.name);
        },
        


        //
        //  Expand/collapse the service
        //

        /* Expand/collapse a service view. */
        toggleCollapse : function(view) {
            view = this.getView(view);
            var service = this.getService(view);
            service._collapsed = !service._collapsed;
            view.attr("collapsed", service._collapsed);
            
            if (service._collapsed) {
                view.find(".WindowBody").slideUp("fast");
            } else {
                view.find(".WindowBody").slideDown("fast");
            }
            
            $.cookies.set("statsproxy-expanded-"+service.name, service._collapsed ? "true" : "false");
        },


        //
        //  open/close the bottom drawer for a service
        //

        /** Open the drawer for a specific service. */
        openDrawer : function(view, drawer) {
            view = this.getView(view);
            var currentDrawer = view.attr("drawer");
            if (currentDrawer == "closed") currentDrawer = null;
            
            // if a drawer of another service is already open, close it
            if (SP.openServiceView && view[0] != SP.openServiceView[0] ) this.closeDrawer();

            // initialize the form associated with the drawer
            this.forms[drawer].init(view);
            
            // move the window above other things on the page
            view.moveToTop();
            
            // if a different drawer is already open,
            //  slide the drawers past each other
            if (currentDrawer) {
                view.find("."+drawer).slideDown("fast");
                view.find("."+currentDrawer).moveToTop().show().slideUp("fast");
            
            } else {
                view.find("."+drawer).show();
                view.find(".WindowDrawer").slideDown("fast");
            }

            // set the top-level 'drawer' flag which may show or hide some elements
            view.attr("drawer", drawer);
            
            // select the correct bottom tab (deslecting all of the others first)
            view.find(".WindowBottomTab").removeClass("Selected").addClass("Deselected");
            view.find("."+drawer+"Tab").addClass("Selected").removeClass("Deselected");
    
            // set up a keypress handler to close the drawer on escape
            $("body").bind("keypress", $.serviceView.windowKeyPress);
    
            // remember that this service is open
            SP.openServiceView = view;
            
            // and stop polling so we don't get updates while the drawer is open
            SP.stopRefreshTimer();
            
            return false;
        },

        /** Close the drawer for the openService */
        closeDrawer : function() {
            // stop the keypress handler looking for the escape key
            $("body").unbind("keypress", $.serviceView.windowKeyPress);

            var view = SP.openServiceView;
            if (view == null) return;
            
            // deselect all of the bottom tabs
            view.find(".WindowBottomTab").removeClass("Selected").removeClass("Deselected");
    
            // hide the current form
            var currentDrawer = view.attr("drawer");
            if (currentDrawer != "closed") view.find("."+currentDrawer).hide();

            // close the drawer
            view.attr("drawer", "closed");
            view.find(".WindowDrawer").slideUp("fast");
            
            // re-start polling
            SP.startRefreshTimer();
            
            delete SP.openServiceView;
            return false;
        },
        
        windowKeyPress : function(event) {
            if (event.keyCode == 27) $.serviceView.closeDrawer();
        },
        
        
        /* toggle a service view's drawer open/closed */
        toggleDrawer : function (view, drawerName) {
            view = this.getView(view);
            var openDrawer = view.attr("drawer");
            view.find("."+openDrawer).hide();
            
            // if we were already open and they clicked on the same drawer, close it
            if (SP.openServiceView && view[0] == SP.openServiceView[0] && openDrawer == drawerName) {
                this.closeDrawer();
            } else {
                this.openDrawer(view, drawerName);
            }
            return false;
        }

    
    }
});
