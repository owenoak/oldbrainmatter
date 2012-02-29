//
//  EditOrAddService : support functions for edit and add memcache service pages
//

var MSE = window.MemcacheServiceEditor = 
    Class.create(ProtoWidget, {
    
    klass : "MemcacheServiceEditor",
    id: "",

	initialize : function($super, p1, p2, p3) {
		$super(p1, p2, p3);
		if (!this.origProperties) this.origProperties = {};
		if (!this.newProperties)  this.newProperties  = {};
	},

    setOrigProperty : function(name, value) {
console.log("Orig property "+name+" <== "+value);
        this.origProperties[name] = value;
    },

    setNewProperty : function(name, value) {
console.log("New property "+name+" <== "+value);
        this.newProperties[name] = value;
    },

    anyChanges : function() {
        var changed = false;
        for (var i in this.origProperties) {
            if (this.newProperties[i] != undefined) {
console.log("AC: "+i+ "New: "+this.newProperties[i]+" == "+this.origProperties[i]+ " ???");
                if (this.newProperties[i] != this.origProperties[i]) {
                    changed = true;
                    break;
                }
            }
        }
        return changed;
    },

    getChangesStr : function () {
        var s = "";
        var n = 0;
        var msg = ""
        console.log('GCS:');
        for (var i in this.origProperties) {
            console.log('GCS: considering '+i);
            if (this.newProperties[i] != undefined) {
                console.log("GCS:   "+i+ "New: "+this.newProperties[i]+" == "+this.origProperties[i]);
                if (this.newProperties[i] != this.origProperties[i]) {
                    n++;
                    s += "<li>" + i + ": " + 
                        this.origProperties[i] + " &rarr; " +
                        this.newProperties[i] +
                        "</li>";
                }
            }
        }
        
        
        if (n== 1) {
            msg = "Are you sure you wish to make this change:<br><ul class='validateChangeList'>";
        } else {
            msg = "Are you sure you wish to make these changes?<br><ul class='validateChangeList'>";
        }
        msg += s;
        msg += "</ul>";
            
        return msg;
    },

    validateAndConfirm : function () {
        if ((this.newProperties['TCP port'] < 1024) ||
            (this.newProperties['UDP port'] < 1024 )) {
            g6Error(	"Edit service " +this.id +":",
                        "Cannot use a privileged port for memcache; use a port > 1024",
                        "OK");
            return false;
        }
        if (this.anyChanges()) {
            g6Confirm(	"Edit service " +this.id +":",
                        this.getChangesStr(),
                        "Yes", "No",
                        this.onEditConfirm, 0, 
                        this.onCancelEdit, 0
                        );
        } else {
            alert("No changes made.");
        }
        return false;
    },

    onEditConfirm : function () {
        document.serviceForm.submit();
    },

    onCancelEdit : function () {
        document.serviceForm.reset();
        return false;
    }

});

function showGear6() {
    console.log("showGear6");
    $$(".gear6Special").invoke("show");
}

function hideGear6() {
    console.log("hideGear6");
    $$(".gear6Special").invoke("hide");
}

function selectPackage(pkg) {
    // console.log("Select Package called: pkg=%s", pkg);
    // hide/unhide g6 special fields
    // update formChildren
    editor.setNewProperty('Image', pkg);
    if (pkg == "memcached-gear6") {
        console.log("enabling gear6 special sauce");
        showGear6();
        $("formChildren").value = "mem_size,tcp_port,udp_port,num_threads,image,interface,average_item_size,replication/mode"
    } else {
        console.log("disabling gear6 special sauce");
        hideGear6();
        $("formChildren").value = "mem_size,tcp_port,udp_port,num_threads,image,interface"
    }

    return true;
}
