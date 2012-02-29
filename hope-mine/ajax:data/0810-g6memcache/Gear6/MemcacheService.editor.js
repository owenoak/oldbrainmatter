Gear6.MemcacheService.editor = new PopupForm({
    
    saveOperation           : "MemcacheService.saveService",
    
    saveSucceededMessage    : "Service saved.",
    
    showDetails             : false,
    
    Gear6MemSizeTitle       : "Flash Memory Size",
    NonGear6MemSizeTitle    : "DRAM Memory Size",
    
    showMoreDetailsTitle    : "Advanced ...",
    showFewerDetailsTitle   : "Basic ...",
    
    newTitle                : "Add Memcache Service",
    editTitle               : "Edit Memcache Service",
    
    confirmSave             : "edit",
    saveConfirmationDisabledMessage : "Are you sure you want to change the following parameters?"
                                    + "<blockquote>#{_deltaDisplay}</blockquote>",
    saveConfirmationMessage : "Changing the following parameters:"
                                    + "<blockquote>#{_deltaDisplay}</blockquote>"
                                    + "will cause the service to reset and you may lose data."
                                    + "<br><br><b>Proceed?</b>",
    nothingToSaveMessage    : "No changes have been made.  <b>Save anyway?</b>",
    serviceNameEmptyMessage : "Service name cannot be empty",
    dynamicItemSize         : false,        // set to true to have itemCount affect itemSize
    
    applyDeltas : function() {
        // don't actually save the deltas
        // we will force an update instead

        //  var deltas = this.getDeltas();
        //  this.originalValue.setProperties(deltas);
    },

    // override default validation.
    validate : function() {
        var service = this.value,
            value;

	// Check that service name is not empty.
        value = service.get("id");
        if (value == undefined || value == "") {
            this.flashMessage(this.serviceNameEmptyMessage);
            return false;
        }
        return true;
    },

    // show save confirmation if required
    //  this routine should return 'true' if save can continue, 
    //  or 'false' if save is being put off, either because the user doesn't want to save right now
    //  or because some other process (like a custom dialog) needs to be shown before we can save.
    //   In the latter case, make sure you call   this.save(true)   when it's time to save.
    showSaveConfirmation : function() {
        if (this.mode == "new") return true;
        this._deltaDisplay = this.getDeltaDisplay();
        var message = "";
        if (this._deltaDisplay) {
            if (this.originalValue.get("enabled")) {
                message = this.saveConfirmationMessage;
            } else {
                message = this.saveConfirmationDisabledMessage;
            }
        } else {
            message =  this.nothingToSaveMessage;
        }
        g6Confirm("Confirm save", message.interpolate(this), "OK", "Cancel", 
                    this.save.bind(this, true));
        return false;
    },

    // get the differences between the current state and the original state
    //  in a way that we can show it to the user
    getDeltaDisplay : function() {
        if (this.mode == "new") return null;
        var deltas = this.getDeltas();
        if (!deltas) return null;
        
        var output = "";
        for (var propertyName in deltas) {
            // get the _serverFieldMap for this field
            var fieldInfo = this._serverFieldMap[propertyName];
            if (!fieldInfo || !fieldInfo.serverFields) {
                console.error("can't find fieldMap for ",propertyName);
                break;
            }

            // and set label to the "d_*" field
            var label;
            for (var serverKey in fieldInfo.serverFields) {
                if (serverKey.charAt(0) == "d") {
                    label = fieldInfo.serverFields[serverKey];
                    break;
                }
            }
            
            if (!label) {
                console.error("Can't find label for ",propertyName);
                label = "UNKNOWN";
            }
            
            var original = this.originalValue.get(propertyName);
            var newValue = deltas[propertyName];
            
            var control = this.getControl("editService_"+propertyName);
            if (control && control.toDisplayValue) {
                original = control.toDisplayValue(original);
                newValue = control.toDisplayValue(newValue);
            }
            
            output += "<li>" + label + " : " + original + " &rarr; " + newValue + "</li>";
        }
        return output;
    },

    
    onSaveSuccess : function() {
        PopupForm.prototype.onSaveSuccess.apply(this);

        // force an update
        page.update();
    },

    // override getValuesToSave to iterate through the _serverFieldMap to get all of the
    //  values that the server needs (and omit the ones it doesn't want to see)
    getValuesToSave : function() {
        var masterSet = this._serverFieldMap,
            service = this.value,
            output = {},
            fieldList = [],
            value
        ;
        for (var fieldName in masterSet) {
            var params = masterSet[fieldName];
            if (params.condition && params.condition(service) == false) continue;
            
            for (var key in params.serverFields) {
                // var value = (params.serverFields[key] == "*" ? service.get(fieldName) : params.serverFields[key]);

                if (params.serverFields[key] == "*") {
                    //XX
                    // console.log("  ** field '"+key+"' = *, so value = service.get("+fieldName+") = " + service.get(fieldName));
                    // console.log("  ** service = " , service);
                    value = service.get(fieldName);
                } else {
                    value = params.serverFields[key];
                }
                output[key] = value;
            }
            // whatever is the value of f_list_index should not be added to the list.
            // hardcoded to "name" for expediency, sigh.
            if (params.serverFieldName != "name") fieldList.push(params.serverFieldName);
        }
		// select "apply" or "add" depending on if we're in new or edit mode.
		//	if (this.mode == "new") {
		output["add"] = "add";
		output["action10"] = "config-form-list";
		//	} else {
		//	  output["save"] = "save";
		//	  output["action10"] = "config-form-config";
		//	}
        output.f_list_children = fieldList.join(",");
        return output;
    },
    
    // custom calculations
    getItemSize : function () {
        if (this.dynamicItemSize) {
            if (this.value.data.itemCountAuto != 'true') {
                this.value.data.itemSize = this.value.data.instanceMemSizeMB * Math.MB / this.getItemCount();
            }
        }
        this.value.data.itemSize = this.value.data.itemSize.max(16).min(this.maxItemSize());
        return this.value.data.itemSize;
    },
    
    maxItemSize : function() {
        return Math.min(this.value.data.instanceMemSizeMB * Math.MB, 8 * Math.MB);
    },
    
    
    controls : [
        new RestrictedField({
            id          : "editService_id",
            reference   : "id",
            label       : "Service Name",
            style       : "width:90%",
            enableIf    : function(form, formValue) {   return form.mode == "new";  },
            tabIndex    : 1,
            minLength   : 1,
            maxLength   : 64,
			// allow dash in service names
			restrictedChars : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890_-",
            // override Control messages to be more specific.
            tooLongMessage  : "Service name must be less than #{maxLength} letters long.",
            tooShortMessage : "Service name must be at least #{minLength} letter long.",
            info            : "Service name must be 1 to 64 letters, numbers and/or underscores.",
            matchingIdError : "There cannot be two services with this name",
            validate        : function(newValue) {
                // catch the super validation first, so we can ensure that our check gets run as well
                var error;
                try {
                    newValue = RestrictedField.prototype.validate.apply(this, arguments);
                } catch (e) {
                    error = e;
                    if (e.newValue) newValue = e.newValue;
                }
                var foundMatchingId;

                if (Gear6.MemcacheService.Instances == undefined) {
                    foundMatchingId = false;
                } else {
                    foundMatchingId = Gear6.MemcacheService.Instances.any(function(service) {
                        if (!service.anonymous && service.id == newValue) {
                            return true;
                        }
                    });
                }
                if (foundMatchingId) {
                    error = new ValidationError(this, this.matchingIdError, newValue);
                }
                if (error) throw error;
                return newValue;
            }
        }),
        
        new Select({
            id          : "editService_packageName",
            reference   : "packageName",
            label       : "Memcache package",
            options     : $w(window.packageList),
            tabIndex    : 2,
            info        : "Version of memcached package to use for this service."
                            +" Note that a Gear6 memcached package"
                            +" is required to take advantage of Flash memory"
                            +" in your Gear6 appliance."
        }),
    
        new Select({
            id          : "editService_ethernetInterface",
            reference   : "ethernetInterface",
            label       : "Interface",
            value       : window.primaryInterface,
            options     : $w(interfaceList),
            tabIndex    : 3,
            info        : "Network interface this service will listen on."
        }),
        
        new Select({
            id          : "editService_replicationMode",
            reference   : "replicationMode",
            label       : "Replication mode",
            options     : $w(replicationModes),
            tabIndex    : 4,
            showIf      : function(form, formValue){ return formValue.isGear6Package(); },
            info        : "Replication mode -- set to \"mirror\" to enable replication of"
                        + " memcache data on different instances of this service."
        }),
        
        new IntegerField({
            reference   : "threads",
            id          : "editService_threads",
            label       : "Threads",
            style       : "width:6em",
            minValue    : 4,
            maxValue    : 1024,
            tabIndex    : 5,
            info        : "Number of memcached threads per instance."
        }),
        
        new IntegerField({
            reference   : "tcpPort",
            id          : "editService_tcpPort",
            label       : "TCP Port",
            style       : "width:6em",
            minValue    : 1024,
            maxValue    : 65535,
            tabIndex    : 6,
            invalidMessage : "#{label} to listen on (a number between #{_minValue} and #{_maxValue})."
        }),
        
        new IntegerField({
            reference   : "udpPort",
            id          : "editService_udpPort",
            label       : "UDP Port",
            style       : "width:6em",
            minValue    : 1024,
            maxValue    : 65535,
            tabIndex    : 7,
            invalidMessage : "#{label} to listen on (a number between #{_minValue} and #{_maxValue})."
        }),
        
        new BytesField({
            reference   : "instanceMemSizeMB",
            id          : "editService_instanceMemSizeMB",
            // Truncate value so we don't send a float to the server. 
            save        : function(newValue, form, formValue) { 
                            return formValue.set("instanceMemSizeMB", Math.floor(newValue));
                          },
            label       : function(form, formValue) {   
							return (formValue.isGear6Package() && formValue.isFlashEnabled()) 
									? form.Gear6MemSizeTitle 
                                    : form.NonGear6MemSizeTitle;
                            },
                          
            invalidMessage  : "Memory to allocate per instance (between #{_minValue} and #{_maxValue})",
            style       : "width:10em;",
            scaleFactor : Math.MB,
            minValue    : 64, 
            maxValue    : window.FlashMax == 0? window.DRAMmax : window.FlashMax,
            tabIndex    : 8
        }),
        
        
        new Log2Slider({
            reference   : "instanceMemSizeMB",
            id          : "editService_instanceMemSizeSlider",
            // Truncate value so we don't send a float to the server. 
            save        : function(newValue, form, formValue) { 
                            return formValue.set("instanceMemSizeMB", Math.floor(newValue));
                          },
            ticks       : [ 
                            [            64, "64<br>MB" ], 
                            [           128, ""         ], 
                            [           256, ""         ], 
                            [           512, ""         ], 
                            [     1*Math.KB, "1<br>GB"  ], 
                            [     2*Math.KB, ""         ], 
                            [     4*Math.KB, ""         ], 
                            [     8*Math.KB, "8<br>GB"  ], 
                            [    16*Math.KB, ""         ], 
                            [    32*Math.KB, ""         ], 
                            [    64*Math.KB, ""         ], 
                            [   128*Math.KB, "128<br>GB"],
                            [   256*Math.KB, ""         ],
                            [   512*Math.KB, "512<br>GB"],
                            [   512*Math.KB, ""         ],
                            [     1*Math.MB, ""         ],
                            [     2*Math.MB, "2<br>TB"  ],
                            [     4*Math.MB, ""         ],
                            [     8*Math.MB, "8<br>TB"  ]
                          ],
            minValue    : 64, 
            maxValue    : window.FlashMax == 0? window.DRAMmax : window.FlashMax,
            trackMin    : 64,
            // Take maxValue, round up to the next higher power of 2
            // MB, and use that for traceMax.
            trackMax : Math.pow(2, Math.round((window.FlashMax == 0? window.DRAMmax : window.FlashMax).log2() + 0.5))
        }),
        
        

        
        // TODO: change class name of parent?
        new Output({
            reference   : function(form, formValue) {   return form.value.getEstimatedDRAM();},
            id          : "editService_estimatedDRAM",
            label       : "Estimated DRAM",
            info        : "Estimated DRAM needed for item buffer, management and instance overhead.",
            
            toDisplayValue : function(value) {
                return value.toBytesString(2)
                        + " <span class='Hint'>per instance</span>";
            },

            getErrorReason : function () {
                var itemBuffer =  this.controller.value.getFlashBufferSize() * Math.MB,
                    itemMgmt = this.controller.value.getEstimatedDRAM() - itemBuffer,
                    reasons = []
                    ;
                if (itemMgmt >(window.DRAMmax * Math.MB)) {
                    reasons.push("Too many items (item management DRAM exceeds physical memory)");
                }
                if (itemBuffer > (window.DRAMmax * Math.MB)) {
                    reasons.push("Item buffer too large for physical memory");
                }
                // if there's no other error, but the sum of estimated DRAM is still too large...
                if ((reasons.length == 0) && (itemBuffer + itemMgmt) > (window.DRAMmax * Math.MB)) {
                    reasons.push("Item buffer and item management together exceed physical memory"); 
                }
                return reasons.join(", ");
            },

            setElementValue : function(value) {
                Output.prototype.setElementValue.apply(this, arguments);
                if (!this.$main) return;
                var parent = $("editService_estmatedDramTr");
                if (value > (window.DRAMmax * Math.MB)) {
                    var errs = this.getErrorReason();
                    if (this.$element) 
                        this.$element.innerHTML += "<br><span class='Hint'>" +
                            errs + "</span>";
                    this.toggleParentClass("Error", true);
                } else {
                    this.toggleParentClass("Error", false);
                }
            }
        }),

        // TODO: change class name of parent?
        new Output({
            reference   : function(form, formValue) {   return window.DRAMmax; },
            id          : "editService_DRAMmax",
        
            toDisplayValue : function(value) {
                return "(" + (value * Math.MB).toBytesString(2) + " Available per module)";
            }
        }),
        
        
        new BytesField({
            reference   : function(form, formValue) {   return form.getItemSize();},
            save        : function(newValue, form, formValue) { return formValue.set("itemSize", newValue);},
            enableIf    : function(form, formValue){ return formValue.get("itemCountAuto") == 'true';},
            setElementValue : function(value) {
                if (this.controller != undefined) {
                    this.setMaxValue(this.controller.maxItemSize());
                }
                BytesField.prototype.setElementValue.call(this, value);
            },
            id          : "editService_itemSize",
            style       : "width:10em;",
            minValue    : 16,
            maxValue    : 8 * Math.MB,
            tabIndex    : 9,
            label       : "Average item size",
            info        : "Average item size, used to estimate DRAM requirements"
                        + " (a number of bytes between #{_minValue} and #{_maxValue}."
        }),
        
        
        new Log2Slider({
            reference   : function(form, formValue) {   return form.getItemSize();},
            save        : function(newValue, form, formValue) { return formValue.set("itemSize", newValue);},
            id          : "editService_itemSizeSlider",
			showIf      : function(form, formValue){ return formValue.isGear6Package() 
														&& formValue.isFlashEnabled() 
														&& form.showDetails ;
													},
            enableIf    : function(form, formValue){ return formValue.get("itemCountAuto") == 'true';},
            setElementValue : function(value) {
                if (this.controller != undefined) {
                    this.setMaxValue(this.controller.maxItemSize());
                }
                Log2Slider.prototype.setElementValue.call(this, value);
            },
            ticks       : [ 
                            [          16, "16<br>B"    ],
                            [          32, ""           ],
                            [          64, ""           ],
                            [         128, ""           ],
                            [         200, "200<br>B"   ],
                            [         512, ""           ],
                            [   1*Math.KB, "1<br>KB"    ],
                            [   2*Math.KB, ""           ],
                            [   4*Math.KB, ""           ],
                            [   8*Math.KB, "8<br>KB"    ],
                            [  16*Math.KB, ""           ],
                            [  32*Math.KB, ""           ],
                            [  64*Math.KB, "64<br>KB"   ],
                            [ 128*Math.KB, ""           ],
                            [ 256*Math.KB, ""           ],
                            [ 512*Math.KB, ""           ],
                            [   1*Math.MB, "1<br>MB"    ],
                            [   2*Math.MB, ""           ],
                            [   4*Math.MB, ""           ],
                            [   8*Math.MB, "8<br>MB"    ]
                          ],
            minValue    : 16,
            maxValue    : 8 * Math.MB,
            trackMin    : 16,
            trackMax    : 8 * Math.MB
        }),
        
        new RadioButton({
            reference   : "itemCountAuto",
            id          : "editService_itemCountAuto",
            group       : "itemCountAuto",
            trueValue   : "true",
            falseValue  : "false",
            tabIndex    : 10
        }),
        
        new RadioButton({
            reference   : "itemCountAuto",
            id          : "editService_itemCountAutoOff",
            displayOnly : true,
            group       : "itemCountAuto",
            trueValue   : "false",
            falseValue  : "true",
            tabIndex    : 11
        }),
        
        new IntegerField({
            reference   : function(form, formValue) {   return form.value.getItemCount();},
            save        : function(newValue, form, formValue) { return formValue.set("instanceItemCount", newValue);},
            id          : "editService_instanceItemCount",
            style       : "width:10em;",
            enableIf    : function(form, formValue){ return formValue.get("itemCountAuto") != 'true';},
            commaize    : true,
            minValue    : 1024,
            maxValue    : 100 * Math.b,
            tabIndex    : 12,
            label       : "Item count",
            info        : "Expected number of items that can be stored in an instance,"
                        + " used to estimate DRAM requirements"
                        + " (a number between #{_minValue} and #{_maxValue})."
        }),
        
        new Log10Slider({
            reference   : function(form, formValue) {   return form.value.getItemCount();},
            save        : function(newValue, form, formValue) { return formValue.set("instanceItemCount", newValue);},
            id          : "editService_itemCountSlider",
            enableIf    : function(form, formValue){ return formValue.get("itemCountAuto") != 'true';},
			showIf      : function(form, formValue){ return formValue.isGear6Package() 
														&& formValue.isFlashEnabled() 
														&& formValue.showDetails ;
													},
            ticks       : [ 
//                          [           0, "0"      ],
//                          [          10, "10"     ],
//                          [         100, ""       ],
                            [  1 * Math.k, "1k"     ],
                            [ 10 * Math.k, ""       ],
                            [100 * Math.k, ""       ],
                            [  1 * Math.m, "1m"     ],
                            [ 10 * Math.m, ""       ],
                            [100 * Math.m, ""       ],
                            [  1 * Math.b, "1b"     ],
                            [ 10 * Math.b, ""       ],
                            [100 * Math.b, "100b"   ]
                          ],
            minValue    : 1024,
            maxValue    : 100 * Math.b,
            trackMin    : 1000,
            trackMax    : 100 * Math.b
        }),
        
        
        
        new RadioButton({
            reference   : "flashBufferSizeAuto",
            id          : "editService_flashBufferSizeAuto",
            group       : "flashBufferSizeAuto",
            trueValue   : "true",
            falseValue  : "false",
            tabIndex    : 13
        }),
        
        new RadioButton({
            reference   : "flashBufferSizeAuto",
            id          : "editService_flashBufferSizeAutoOff",
            displayOnly : true,
            group       : "flashBufferSizeAuto",
            trueValue   : "false",
            falseValue  : "true",
            tabIndex    : 14
        }),
        
        new BytesField({
            reference   : function(form, formValue) {   return form.value.getFlashBufferSize();},
            id          : "editService_serviceDramMB",
            // Truncate value so we don't send a float to the server. 
            save        : function(newValue, form, formValue) { 
                            return formValue.set("serviceDramMB", Math.floor(newValue));
                          },
            enableIf    : function(form, formValue){ 
                    return formValue.get("flashBufferSizeAuto") != 'true';
                },
            style       : "width:10em;",
            setElementValue :function(value) {
                if (this.controller != undefined) {
                    this.setMaxValue(this.controller.value.instanceMemSizeMB);
                }
                BytesField.prototype.setElementValue.call(this, value);
            },
            scaleFactor : Math.MB,
            minValue    : 1,
            maxValue    : window.DRAMmax,
            tabIndex    : 15,
            label       : "Item buffer size",
            info        : "Size of DRAM area used to buffer Flash memory "
                        + " (a number between #{_minValue} and #{_maxValue})."
        }),
        
        
        new Log2Slider({
            reference   : function(form, formValue) {   return form.value.getFlashBufferSize();},
            id          : "editService_serviceDramSlider",
            // Truncate value so we don't send a float to the server. 
            save        : function(newValue, form, formValue) { 
                            return formValue.set("serviceDramMB", Math.floor(newValue));
                          },
            enableIf    : function(form, formValue){ return formValue.get("flashBufferSizeAuto") != 'true';},
			showIf      : function(form, formValue){ return formValue.isGear6Package() 
														&& formValue.isFlashEnabled() 
														&& form.showDetails ;
													},
            setElementValue :function(value) {
                if (this.controller != undefined) {
                    this.setMaxValue(this.controller.value.instanceMemSizeMB);
                }
                Log2Slider.prototype.setElementValue.call(this, value);
            },
            ticks       : [ 
                            [             1, "1<br>MB"  ],
                            [             2, ""         ], 
                            [             4, ""         ], 
                            [             8, "8<br>MB"  ], 
                            [            16, ""         ], 
                            [            32, ""         ], 
                            [            64, "64<br>MB" ], 
                            [           128, ""         ], 
                            [           256, ""         ], 
                            [           512, ""         ], 
                            [     1*Math.KB, "1<br>GB"  ], 
                            [     2*Math.KB, ""         ], 
                            [     4*Math.KB, ""         ], 
                            [     8*Math.KB, "8<br>GB"  ], 
                            [    16*Math.KB, ""         ], 
                            [    32*Math.KB, ""         ], 
                            [    64*Math.KB, "64<br>GB" ]
                          ],
            minValue    : 1,
            maxValue    : window.DRAMmax,
            trackMin    : 1,
            trackMax    : Math.pow(2, Math.round(window.DRAMmax.log2() + 0.5))
        }),

        new HBarGraph({
            id          : "editService_memoryAllocationGraph",
            label       : "Memory Allocation",
            info        : "Representation of relative memory allocation for Flash, Item buffer and"
                        + " Item mangement overhead.",

            toDisplayValue : function(value) {
                return value.toBytesString(2);
            },
            items       : [
                {   title : "Total Size",   isTotal   : true  },
                {   title : "Flash memory",     color     : "#86b300", 
                    reference : function(form, formValue) { return formValue.get("instanceMemSizeMB") * Math.MB; }
                },
                {   title : "Item buffer", color: "#f47836",
                    reference : function(form, formValue) { return form.value.getFlashBufferSize() * Math.MB ;}
                },
                {   title : "Item Mgmt",    color: "#bbbbbb",
                    reference : function(form, formValue) { return form.value.getEstimatedDRAM() - (form.value.getFlashBufferSize() * Math.MB) ;}
                }           
            ]
        }),
        
        new Button({
            id          : "editService_moreButton",
            reference   : function(form, formValue) {       return form.showDetails 
                                                                ? form.showFewerDetailsTitle
                                                                : form.showMoreDetailsTitle ;
                                                },
		    enableIf    : function(form, formValue) {       return formValue.isGear6Package() 
		    													&& formValue.isFlashEnabled();
		    										},
            style       : "width:10em;",
            tabIndex    : 20,
            onActivate      : function(event, element) {
                this.controller.showDetails = !this.controller.showDetails;
                this.update();
                this.controller.onControlChanged(this);
                return false;
            }
        }),

        new Button({
            id          : "editService_resetButton",
            value       : "Reset",
            style       : "width:6em;",
//          enableIf    : function(form, formValue) {   return form.getDeltas() != undefined    },
            tabIndex    : 21,
            onActivate      : function(event, element) {
                this.controller.reset();
            }
        }),

        new Button({
            id          : "editService_okButton",
            value       : "OK",
            style       : "width:6em;",
            enableIf    : function(form, formValue) {
                if (!formValue.isFlashEnabled()) return true;
                return form.value.getEstimatedDRAM() <= (window.DRAMmax * Math.MB);
            },
            tabIndex    : 22,
            onActivate      : function(event, element) {
                this.controller.save();
            }
        }),

        new Button({
            id          : "editService_cancelButton",
            value       : "Cancel",
            style       : "width:6em;",
            tabIndex    : 23,
            onActivate      : function(event, element) {
                this.controller.cancel();
            }
        })

    ],
    
    FormTemplate : new Template(
        "<div class='DynaForm EditMemcacheService'>\
            <form onsubmit='return false'>\
\
            <div class='ErrorDisplay' round='huge' style='display:none'></div>\
\
            <table round='large' class='DynaFormTable EditMemcacheServiceTable' cellspacing=0 cellpadding=0>\
                <colgroup>\
                    <col class='Label1'><col class='value1'>\
                    <col class='Label2'><col class='value2'>\
                </colgroup>\
\
<!-- service name block -->\
\
                <tr>\
                    <td class='LabelTd' round='L'>\
                        <span id='editService_id_label'></span>\
                    </td>\
                    <td class='FieldTd SectionTop SectionBottom' round='largeR' colspan=3>\
                        <span id='editService_id'></span>\
                    </td>\
                </tr>\
\
<!-- attributes block -->\
\
                <tr><td class='Separator' colspan='4'><div></div></td></tr>\
\               <tr>\
                    <td class='LabelTd SectionTop' round='largeTL'>\
                        <span id='editService_packageName_label'></span>\
                    </td>\
                    <td class='FieldTd SectionTop RightSeparator' round='largeTR'>\
                        <span id='editService_packageName'></span>\
                    </td>\
                    <td class='LabelTd SectionTop LeftSeparator' round='largeTL'>\
                        <span id='editService_threads_label'></span>\
                    </td>\
                    <td class='FieldTd SectionTop' round='largeTR'>\
                        <span id='editService_threads'></span>\
                    </td>\
                </tr>\
\
                <tr>\
                    <td class='LabelTd'>\
                        <span id='editService_ethernetInterface_label'></span>\
                    </td>\
                    <td class='FieldTd RightSeparator'>\
                        <span id='editService_ethernetInterface'></span>\
                    </td>\
                    <td class='LabelTd LeftSeparator'>\
                        <span id='editService_tcpPort_label'></span>\
                    </td>\
                    <td class='FieldTd'>\
                        <span id='editService_tcpPort'></span>\
                    </td>\
                </tr>\
\
                <tr>\
                    <td class='LabelTd'>\
                        <span id='editService_replicationMode_label'></span>\
                    </td>\
                    <td class='FieldTd RightSeparator' >\
                        <span id='editService_replicationMode'></span>\
                    </td>\
                    <td class='LabelTd LeftSeparator'>\
                        <span id='editService_udpPort_label'></span>\
                    </td>\
                    <td class='FieldTd'>\
                        <span id='editService_udpPort'></span>\
                    </td>\
                </tr>\
\
<!-- flash memory size block -->\
\
                <tr><td class='Separator' colspan='4'><div></div></td></tr>\
                <tr>\
                    <td id='editService_instanceMemSizeLabel' class='LabelTd' round='largeL'>\
                        <span id='editService_instanceMemSizeMB_label'></span><br>\
                        <span class='Hint'>(MB per instance)</span>\
                    </td>\
                    <td class='FieldTd' style='padding-left:3em;'><span id='editService_instanceMemSizeMB'></span></td>\
                    <td class='SliderTd' round='largeR' colspan='2'><span id='editService_instanceMemSizeSlider'></span></td>\
                </tr>\
\
<!-- advanced details block -->\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() && form.showDetails'>\
                    <td class='Separator' colspan='4'><div></div></td>\
                </tr>\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() && form.showDetails'>\
                    <td class='LabelTd BottomSeparator' round='largeTL'><span id='editService_itemSize_label'></span><br>\
                        <span class='Hint'>(bytes)</span>\
                    </td>\
                    <td class='FieldTd BottomSeparator' style='padding-left:3em;'><span id='editService_itemSize'></span></td>\
                    <td class='SliderTd BottomSeparator' round='largeTR' colspan='2'><span id='editService_itemSizeSlider'></span></td>\
                </tr>\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() && form.showDetails'>\
                    <td class='LabelTd BottomSeparator'><span id='editService_instanceItemCount_label'></span><br><span class='Hint'>(per instance)</td>\
                    <td class='RadioGroupTd BottomSeparator'>\
                        <table cellspacing=0 cellpadding=0>\
                            <tr>\
                                <td class='RadioTd'><span id='editService_itemCountAuto'></span></td>\
                                <td class='RadioLabelTd'>\
                                    <label class='RadioLabel' for='editService_itemCountAuto'>Automatic</label>\
                                </td>\
                            </tr>\
                            <tr>\
                                <td class='RadioTd'><span id='editService_itemCountAutoOff'></span></td>\
                                <td class='RadioLabelTd' style=''><span id='editService_instanceItemCount'></span></td>\
                            </tr>\
                        </table>\
                    </td>\
                    <td class='SliderTd BottomSeparator' colspan='2'><span id='editService_itemCountSlider'></span></td>\
                </tr>\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() && form.showDetails'>\
                    <td class='LabelTd BottomSeparator' round='largeBL'><span id='editService_serviceDramMB_label'></span><br>\
                        <span class='Hint'>(MB of DRAM per instance)</span>\
                    </td>\
                    <td class='RadioGroupTd SectionBottom'>\
                        <table cellspacing=0 cellpadding=0>\
                            <tr>\
                                <td class='RadioTd'><span id='editService_flashBufferSizeAuto'></span></td>\
                                <td class='RadioLabelTd'>\
                                    <label class='RadioLabel' for='editService_flashBufferSizeAuto'>Automatic</label>\
                                </td>\
                            </tr>\
                            <tr>\
                                <td class='RadioTd'><span id='editService_flashBufferSizeAutoOff'></span></td>\
                                <td class='RadioLabelTd' style=''><span id='editService_serviceDramMB'></span></td>\
                            </tr>\
                        </table>\
                    </td>\
                    <td class='SliderTd' round='largeBR' colspan='2'><span id='editService_serviceDramSlider'></span></td>\
                </tr>\
\
<!-- estimated DRAM block -->\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() '><td class='Separator' colspan='4'><div></div></td></tr>\
                <tr id='editService_estmatedDramTr' showif='return formValue.isGear6Package() && formValue.isFlashEnabled() '>\
                    <td class='LabelTd' round='largeL'>\
                        <span id='editService_estimatedDRAM_label'></span>\
                    </td>\
                    <td class='OutputTd SectionTop SectionBottom estimatedDramValueTd'>\
                        <span id='editService_estimatedDRAM'></span>\
                    </td>\
                    <td class='OutputTd SectionTop SectionBottom ' round='largeR' colspan='2'>\
                        <table cellspacing='0' cellpadding='0'>\
                            <tr>\
                                <td class='estimatedDramMaxTd hint'><span id='editService_DRAMmax'></span></td>\
                                <td class='estimatedDramIconTd'>&nbsp;</td>\
                            </tr>\
                        </table>\
                    </td>\
                </tr>\
\
<!-- memory allocation block -->\
\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() '><td class='Separator' colspan='4'><div></div></td></tr>\
                <tr showif='return formValue.isGear6Package() && formValue.isFlashEnabled() '>\
                    <td class='LabelTd' round='largeL'><span id='editService_memoryAllocationGraph_label'></span><br>\
                        <span class='Hint'>(per instance)</span>\
                    </td>\
                    <td class='OutputTd SectionTop SectionBottom' colspan='3' round='largeR'>\
                        <span id='editService_memoryAllocationGraph'></span></td>\
                    </td>\
                </tr>\
            </table>\
\
            </form>\
\
<!-- bottom buttons -->\
\
            <table class='BottomButtons' cellspacing=0 cellpadding=0><tr>\
                <td><span id='editService_moreButton'></span></td>\
                <td><span id='editService_resetButton'></span></td>\
                <td style='width:100%'><div></div></td>\
                <td><span id='editService_okButton'></span></td>\
                <td><span id='editService_cancelButton'></span></td>\
            </tr></table>\
        </div>\
        "
        
    ),


    
    // map of our field names to server field names 
    //  (including all the extra parameters we need to send to the server to save)
    _serverFieldMap : {
        "*" : {
            serverFields : {
                'f_list_root' : '/memcache/config/service',
                'f_list_index' : 'name'
            }
        },
        
        "id" : {
            serverFieldName : "name",
            serverFields : {
                "d_name" : "Service Name",
                "v_name" : "",
                "f_name" : "*",
                "t_name" : "string",
                "c_name" : "string",
                "e_name" : "true"
            }
        },
                
        "instanceMemSizeMB" : {
            serverFieldName : "mem_size",
            serverFields : {
                "d_mem_size" : "Memory Size",
                "f_mem_size" : "*",
                "t_mem_size" : "uint32",
                "c_mem_size" : "uint32",
                "e_mem_size" : "true"
            }
        },
                
        "threads" : {
            serverFieldName : "num_threads",
            serverFields : {
                "d_num_threads" : "Threads",
                "f_num_threads" : "*",
                "t_num_threads" : "uint16",
                "c_num_threads" : "uint16",
                "e_num_threads" : "true"
            }
        },
                
        "tcpPort" : {
            serverFieldName : "tcp_port",
            serverFields : {
                "d_tcp_port" : "TCP Port",
                "f_tcp_port" : "*",
                "t_tcp_port" : "uint16",
                "c_tcp_port" : "uint16",
                "e_tcp_port" : "true"
            }
        },
                
        "udpPort" : {
            serverFieldName : "udp_port",
            serverFields : {
                "d_udp_port" : "UDP Port",
                "f_udp_port" : "*",
                "t_udp_port" : "uint16",
                "c_udp_port" : "uint16",
                "e_udp_port" : "true"
            }
        },
                
        "ethernetInterface" : {
            serverFieldName : "interface",
            serverFields : {
                "d_interface" : "Network interface",
                "f_interface" : "*",
                "t_interface" : "string",
                "c_interface" : "string",
                "e_interface" : "false"
            }
        },
                
        "packageName" : {
            serverFieldName : "image",
            serverFields : {
                "d_image" : "Memcache package",
                "f_image" : "*",
                "t_image" : "string",
                "c_image" : "string",
                "e_image" : "false"
            }
        },

        // this group must only be sent if package has gear6 in its name
        "flashBufferSizeAuto" : {
            serverFieldName : "auto_flash_buffer_size",
            condition : function(service){return service.isGear6Package() && service.isFlashEnabled() ;},
            serverFields : {
                "d_auto_flash_buffer_size" : "Automatic item buffer size",
                "n_auto_flash_buffer_size" : "auto_flash_buffer_size",
                "f_auto_flash_buffer_size" : "*",
                "t_auto_flash_buffer_size" : "bool",
                "c_auto_flash_buffer_size" : "bool",
                "e_auto_flash_buffer_size" : "false"
            }
        },

        // this group must only be sent if package has flash
        // this group must only be sent if auto is false
        "serviceDramMB" : {
            serverFieldName : "flash_buffer_size",
            condition : function(service){ 
                    return service.isGear6Package() && service.isFlashEnabled()  && 
                        (service.data.flashBufferSizeAuto=="false"); 
                },
            serverFields : {
                "d_flash_buffer_size" : "Item buffer size",
                "n_flash_buffer_size" : "flash_buffer_size",
                "f_flash_buffer_size" : "*",
                "t_flash_buffer_size" : "uint32",
                "c_flash_buffer_size" : "uint32",
                "e_flash_buffer_size" : "false"
            }
        },
                
        // this group must only be sent if package has gear6 in its name
        "itemSize" : {
            serverFieldName : "average_item_size",
            condition : function(service){return service.isGear6Package() && service.isFlashEnabled() ;},
            serverFields : {
                "d_average_item_size" : "Average item size",
                "f_average_item_size" : "*",
                "t_average_item_size" : "uint32",
                "c_average_item_size" : "uint32",
                "e_average_item_size" : "true"
            }
        },

        // this group must only be sent if package has gear6 in its name
        "replicationMode" : {
            serverFieldName : "replication/mode",
            condition : function(service){return service.isGear6Package() && service.isFlashEnabled() ;},
            serverFields : {
                "d_replication/mode" : "Replication mode",
                "n_replication/mode" : "replication/mode",
                "f_replication/mode" : "*",
                "t_replication/mode" : "string",
                "c_replication/mode" : "string",
                "e_replication/mode" : "false"
            }
        },

        // this group must only be sent if package has gear6 in its name
        "itemCountAuto" : {
            serverFieldName : "auto_item_count",
            condition : function(service){return service.isGear6Package() && service.isFlashEnabled() ;},
            serverFields : {
                "d_auto_item_count" : "Automatic item count",
                "n_auto_item_count" : "auto_item_count",
                "f_auto_item_count" : "*",
                "t_auto_item_count" : "bool",
                "c_auto_item_count" : "bool",
                "e_auto_item_count" : "false"
            }
        },

        // this group must only be sent if package has gear6 in its name
        // this group must only be sent if itemCountAuto is false
        "instanceItemCount" : {
            serverFieldName : "item_count",
            condition : function(service){
                    return service.isGear6Package() && service.isFlashEnabled() && service.data.itemCountAuto == 'false';
                },
            serverFields : {
                "d_item_count" : "Item count",
                "n_item_count" : "item_count",
                "f_item_count" : "*",
                "t_item_count" : "uint32",
                "c_item_count" : "uint32",
                "e_item_count" : "false"
            }
        }
    }
});
