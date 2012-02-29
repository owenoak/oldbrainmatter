//  Memcache services page helpers.
//
//  Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/page/memcache-services.js,v $
//  Revision:  $Revision: 1.6 $
//  Date:      $Date: 2009-11-10 02:00:26 $
//  Author:    $Author: berry $
// 
//  (C) Copyright 2009 Gear6, Inc.  
//  All rights reserved.
//
    var svc_enab = new Array();
    var svc_nsrv = new Array();

// BEGIN GENERIC
	function focusHintField(field) {
		var className = field.className;
		if (className.indexOf("hint") > -1) {
			if (!field.hint) field.hint = field.value;
			field.value = "";
			field.className = "";
		}
	}
	function blurHintField(field, id) {
		if (field.value == "") {
			field.value = field.hint;
			field.className = "hint";
		} 
	}
	
	// workaround for non-functioning of getElementsByName() under IE
	// Thanks to http://www.dreamincode.net/code/snippet293.htm
    // MOW: rename to the simpler alias "byName()"  [for speed of typing 
    // and symmetry with "byId()"]

	function byName(tag, name) {
		 var elem = document.getElementsByTagName(tag);
		 var arr = new Array();
		 for(i = 0,iarr = 0; i < elem.length; i++) {
			  att = elem[i].getAttribute("name");
			  if (att == name) {
				   arr[iarr] = elem[i];
				   iarr++;
			  }
		 }
		 return arr;
	}
	
	// END GENERIC

function showNewInstanceForm(service) {
	// show the 'new row' form
	show(service + "_newInstanceRow");
	// hide the 'new instance' button
	// use 'visibility:hidden' instead of display:none so things don't jump around
	byId(service + "_addButton").style.visibility = 'hidden';
    clearErr(service);
}

function cancelNewInstanceForm(service) {
	// show the 'new instance' button
	byId(service + "_addButton").style.visibility = '';
	// hide the 'new row' form
	hide(service + "_newInstanceRow");
	// hide the error row in case it was displayed
	clearErr(service);
}

function toggleRows(service) {
	// get the list of rows for that service
	var rows = byName("tr", service+"_instance_rows");
    console.log("togglerows for service "+service+": "+rows.length+" rows");
	if (rows.length > 0) {
        // should we display or not?
        var shouldDisplayRows = rows[0].style.display != '';
        
        // show/hide the rows
        for (var i = 0; i < rows.length; i++) {
            rows[i].style.display = (shouldDisplayRows ? '' : 'none');
        }
        
        // set the className of the title for the service, which changes the icon
        var title = byId(service+'_listing_title');
        title.className = "listing_title listing_title_" + (shouldDisplayRows ? "expanded" : "collapsed");
        
        // and remember the value in a cookie
        setCookie("memcache_"+service, (shouldDisplayRows ? "show" : "hide"));
    } else {
        // probably a stale cookie.
        deleteCookie("memcache_"+service);
    }
	
	return false;
}


function addEvent(obj, evType, fn, useCapture){
  // Thank you Scott Andrew
  //  http://www.scottandrew.com/weblog/articles/cbs-events
  if (obj.addEventListener){
    obj.addEventListener(evType, fn, useCapture);
    return true;
  } else if (obj.attachEvent){
    var r = obj.attachEvent("on"+evType, fn);
    return r;
  } else {
    alert("Handler could not be attached");
  }
} 

function log(s) {
    return;
    obj = document.getElementById('debug');
    if (obj != null) {
        obj.innerHTML += timestamp() + ': ' + s + '<br>';
    }
    return;
}

var service_id;

// Workaround for the setAttribute bugs in IE
function setElementAttr(node, name, value) {
    var i;
    for (i = 0; i < node.attributes.length; i++) {
        if (node.attributes[i].name == name || node.attributes.NAME == name)
        {
            node.attributes[i].value = value;
        }
    }
} 

function doCancelAdd() {
    document.location = '/admin/launch?script=rh&template=memcache';
}

// NEW INSTANCE validation :
// 
// We have three pieces of information when the user hits the "ADD"
// button:
// 
// 1) DNS name of VIP
// 2) IP address of VIP
// 3) Netmask of VIP
// 
// The service is known by implication of which part of the GUI the form
// is in.
// 
// Two pieces are needed to submit the form: 
// 
// 1) IP address
// 2) netmask
// 
// When the user hits ADD, this will happen (DNS, IP, and MASK will refer
// to the 3 pieces of info above.  "Reject with message" means decline to
// submit form with appropriate warning message):
// 
// 1) If BOTH DNS and IP are blank, reject with message
// 
// 2) If BOTH DNS and IP have values, then
// 2a) Resolve DNS name.  If fail or result != IP then reject with
//      message. 
// 2b) rDNS IP.  If fail or result != DNS then reject with message.
// 2c) if mask empty, reject with message.
// 2d) If resolved DSN == IP AND rDNS'd IP match, submit with "Are You
//     Sure" (AYS).
// 
// 3) If IP is blank, and DNS has value, then
// 3a) resolve DNS.  If fail, reject with message.
// 3b) if mask empty, reject with message.
// 3c) iDNS success and mask not empty, submit with AYS and  IP/DNS name in message
// 
// 
// 4) If IP has value and DNS is blank, then
// 4a) if mask empty, reject with message
// 4b) rDNS IP.  If success, submit with AYS and IP/DNS name in message.
//     If not, submit with AYS and just IP in message.

function validateServerParams(svc) {
//    console.log("Validating params to add a server to service "+svc);

    // find the form
    var form = byId(svc+"_newServerForm");
    //XXX should bail if form == null

    // console.log("form id = "+form.id);
    // console.log('  validate: dnsname = '+form.elements[0].value);
    // console.log('  validate: address = '+form.elements[1].value);
    // console.log('  validate: masklen = '+form.elements[2].value);

    // get the values, correcting for hints
    var dnsname = form.elements[0].value;
    if (form.elements[0].className.indexOf("hint") > -1) {
        // this content was a hint, does not count
        // console.log('    was hint, value = null');
        dnsname = '';
	}
    var address = form.elements[1].value;
    if (form.elements[1].className.indexOf("hint") > -1) {
        // this content was a hint, does not count
        // console.log('    was hint, value = null');
        address = '';
	}
    var masklen = form.elements[2].value;


    // CASE 1: no input at all?
    if ((dnsname == "") && (address == "")) {
        showError(svc, "No values!  Must specify AT LEAST ONE of name or address.");
        return false;
    }

    // Get resolved DNS name, and rDNS of IP, if appropriate
    var strURL = "/admin/launch?script=rh&template=get-dns&";
    var ip_of_dnsname = "";
    var name_of_address = "";
    if (dnsname != "") {
        ip_of_dnsname = getAjaxDataSync( strURL + "var_name=" + dnsname).trim();
        // console.log("Got IP "+ip_of_dnsname+" for name "+dnsname);
        if (ip_of_dnsname == "") {
            showError(svc, "Cannot determine IP address of name \""+dnsname+"\"");
            return false;
        }
    }
    if (address != "") {
        if (!isIPAddr(address)) {
            showError(svc, 'IP address '+address+' is not a valid IPv4 dotted-decimal address.');
            return false;
         }

        name_of_address = getAjaxDataSync( strURL + "var_addr=" + address).trim();
        // console.log("Got name "+name_of_address+" for IP "+address);
        if (name_of_address == "") {
            showWarning(svc, "Cannot determine name for IP address \""+address+"\"");
            // this is technically OK
        }
    }
        

    // CASE 2: DNS *and* IP
    if ((dnsname != "") && (address != "")) {
        // console.log("in case 2: dns="+dnsname+" addr="+address);
        if (dnsname != name_of_address) {
            showError(svc, "Name given ("+dnsname+") does not match rDNS of IP ("+name_of_address+"),  Correct and try again.");
            return false;
        }
        if (address != ip_of_dnsname) {
            showError(svc, "Address given ("+address+") does not match IP of "+dnsname+
                        " ("+ip_of_dnsname+"),  Correct and try again.");
            return false;
        }        
        // We're OK
    }

    // CASE 3: IP blank, DNS has value
    if ((dnsname != "") && (address == "")) {
        // console.log("in case 3: dns="+dnsname+" addr="+address+" resolved IP="+ip_of_dnsname);
        // hard work done, just take our resolved IP and make it be
        // the address we submit.  We already rejected lookup failure above.
        address = ip_of_dnsname;
    }

    // CASE 4: IP has value, DNS blank
    if ((dnsname == "") && (address != "")) {
        // console.log("in case 4: dns="+dnsname+" addr="+address+ " rDNS="+name_of_address);
        // nothing much to do, we'll just use the IP.  Save the resolved
        // name, if any, for later messages
        dnsname = name_of_address;
    }
    // console.log("OK so far");

    // address is now either the valid IP the user typed in, or the rDNS from 
    // their DNS name.  Check if it's a "badvip".
    //    console.log("badvips; ", badvips);
    if (badvips.match(' ' + address + ' ') != null) {
        showError(svc, 'The Memcache Instance address ' 
                    + address + ' is not acceptable; it cannot be the address of '
                    +'another cluster member or a known instance, or a '
                    +'broadcast or loopback address.');
        return false;
    }
    // console.log("not a badvip");

    if (masklen == 0 || masklen > 31) {
        showError(svc, "Invalid netmask length (must be 1-31)");
        return false;
    }
    // console.log("masklen OK");

    if (!StableNetworks.isOk(address, masklen, snapshot.ethernetInterface)) {
	this.showInstanceError("The Memcache Instance address "
			       + address + " is not on any connected network on interface "
			       + snapshot.ethernetInterface + ", which is not a recommended "
			       + "configuration.");
	this.clearMessage();
	return false;
    }
    // console.log("address on stable net");

    // all clear! stuff the possibly changed address into the form and 
    // let doAddServer() work its magic
    form.elements[1].value = address;
    form.elements[1].className = "";

    // console.log("clearing error");
    clearErr(svc);
    // console.log("returning true");
    return true;
}

function showError(svc, str) {
    console.log("ERROR: "+str);
    byId("alert_"+svc).innerHTML = ("ERROR: " +str);
    show("alert_"+svc+"_row");
}

function showWarning(svc, str) {
    console.log("Warning: "+str);
    byId("alert_"+svc).innerHTML = ("Warning: " +str);
    show("alert_"+svc+"_row");
}

function showMessage(svc, str) {
    console.log("service "+svc+" Message: "+str);
    byId("alert_"+svc).innerHTML = (str);
    show("alert_"+svc+"_row");
}

function clearErr(svc) {
    byId("alert_"+svc).innerHTML = "";
    hide("alert_"+svc+"_row");
}
    
function doAddServer(service) {
    if (validateServerParams(service)) {
        // console.log("validateServerParams = true");
        // if there is one or more instances
        // AND the service is enabled
        if (svc_nsrv[service] > 0 && svc_enab[service] == "true") {
            // THEN do "are you sure..."
            g6Confirm("Add instance", 
              "Are you sure you want to add an instance address? This will " +
                  " cause a reconfiguration which may lose some cached data.",
              "Yes", "No",
              reallyAddServer, service);
        } else {
            // just do it
            reallyAddServer(service);
        }
    } else {
        // console.log("validateServerParams = false");
    }
    return;
}
var service_being_added_to;

function reallyAddServer(service_id) {
    clearErr(service_id);
    showMessage(service_id, "Working...");
    service_being_added_to = service_id;
    var id = service_id;
    //    var form = document.forms.newServerForm;
    var form;
    var i;
    if (form == undefined) {
        // curse you, IE
        for (i=0; i< document.forms.length; i++) {
            if (document.forms[i].name == id+'_newServerForm') {
                form= document.forms[i];
                break;
            }
        }
    }
    // console.log('reallyAddServer: using form '+form.name);

    var args = 'action10=' + encodeURI('config-form-list') + '&';
    args += 'f_list_root=' + encodeURI('/memcache/config/service/' + id + '/address') + '&';
    args += 'f_list_index=' + encodeURI('address') + '&';
    args += 'f_list_children=' + encodeURI('mask_len') + '&';

    args += 'd_address=' + encodeURI('Address') + '&';
    args += 't_address=' + encodeURI('ipv4addr') + '&';
    args += 'c_address=' + encodeURI('ipv4addr') + '&';
    args += 'e_address=' + encodeURI('true') + '&';
    args += 'f_address=' + encodeURI(form.elements[1].value) + '&';
    // console.log('reallyAddServer: address = '+form.elements[1].value);

    args += 'd_mask_len=' + encodeURI('Mask Len') + '&';
    args += 't_mask_len=' + encodeURI('uint8') + '&';
    args += 'c_mask_len=' + encodeURI('uint8') + '&';
    args += 'e_mask_len=' + encodeURI('true') + '&';
    args += 'f_mask_len=' + encodeURI(form.elements[2].value) + '&';

    args += 'add=' + encodeURI('Add Memcache Server');

    var req = getAjaxRequest();

    setHandleAddServerCallback(req);
    req.open('POST', '/admin/launch?script=rh&template=memcache', true);
    req.setRequestHeader('Content-type',
                         'application/x-www-form-urlencoded');
    req.setRequestHeader('Content-length', args.length);
    req.setRequestHeader('Connection', 'close');
    req.send(args);
    
    return true;
}

function setHandleAddServerCallback(req) {
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status==200) {
                console.log("Got response", req)
                console.log("resp header: ", req.getAllResponseHeaders());
                var success_msg = req.responseText.match("<span class=\"success\">[^<]*</span>", "i");
                if (null == success_msg) {
                    msg = "Success";
                }
                var err_msg = req.responseText.match("<span class=\"error\">[^<]*</span>", "i");
                if (null == err_msg) {
                    err_msg = "";
                }
                if (err_msg.length > 0) {
                    msg = err_msg;
                }
                showMessage(service_being_added_to, msg);

               
                Cookie.set("memcacheMsg", service_being_added_to + "|" + msg + "|" + document.viewport.getScrollOffsets()[1]);
                document.location = '/admin/launch?script=rh&template=memcache';
            } 
        }
    }
}


// If an XHR request results in a mgmtd message, it saves it in a cookie so we 
// can display it.  This function deals with the cookie.
function handleMsgCookie() {
    console.log("Looking for message cookie");
    var cookie = Cookie.get("memcacheMsg");
    console.log("Got ", cookie);
    if (cookie != undefined) {
        var a =  cookie.split("|");
        showMessage(a[0], a[1]);
        Cookie.clear("memcacheMsg");
        window.scrollTo(0, a[2]);
    }
}

function setHandleDeleteServerCallback(req, id) {
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status==200) {
                // instead of refreshing the whole page, just delete this service's rows.
                // $$(".service_"+id).invoke("remove");
                // No, we have to refresh to get the "unsaved changes" at the top.  *sigh*
                document.location = '/admin/launch?script=rh&template=memcache';
            } 
        }
    }
}

function deleteService(id) {

    var args = 'action10=' + encodeURI('config-form-list') + '&';
    args += 'd_row_sdfsd=' + encodeURI('row_' + id) + '&';
    args += 'v_row_sdfsd=' + encodeURI('/memcache/config/service/' + id) + '&';
    args += 'c_row_sdfsd=' + encodeURI('-') + '&';
    args += 'e_row_sdfsd=' + encodeURI('false') + '&';
    args += 'f_row_sdfsd=' + encodeURI('on') + '&';
    args += 'remove=' + encodeURI('DELETE+SERVICES') + '&';

    var req = getAjaxRequest();

    setHandleDeleteServerCallback(req, id);
    req.open('POST', '/admin/launch?script=rh&template=memcache',
             true);
    
    req.setRequestHeader('Content-type',
                         'application/x-www-form-urlencoded');
    req.setRequestHeader('Content-length', args.length);
    req.setRequestHeader('Connection', 'close');
    req.send(args);
    
    return true;
}

function setChecked(id, submit) {
    var o = document.getElementById(id);
    o.checked = true;

    o = document.getElementById(submit);
    o.click();

    return true;
}

function changeService(op, id) {
    var cb = function () {
        document.location = '/admin/launch?script=rh&template=memcache&var_change='+op+'&var_id='+id;
    }
    switch(op) {
        // don't confirm on enable
        case 'enable':
            cb();
            break;
        // but DO confirm on disable
        case 'disable':
            g6Confirm('Disable Service', 
              'Are you sure you want to disable service <strong>'+id+'</strong>? Caching will be terminated and all content lost.',
              'Yes', 'No',  cb );
            break;
    }
    return;
}

function removeInstance(service, addr) {
    var cb = function () {
        setChecked('row_'+service+'_'+addr, 'submit_remove_'+service+'_'+addr);
    };
    g6Confirm('Delete Instance', 
              'Are you sure you want to delete instance '+addr+' from service '+service+'?', 
              'Yes', 'No',  cb );
}
