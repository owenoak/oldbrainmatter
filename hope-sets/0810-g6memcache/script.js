var agent 	= navigator.userAgent.toLowerCase();
var isIE 	= (agent.indexOf('msie') != -1);
var isIE5 	= (agent.indexOf('msie 5') != -1);
var isIE6 	= (agent.indexOf('msie 6') != -1);
var isIE7 	= (agent.indexOf('msie 7') != -1);
var isIE8 	= (agent.indexOf('msie 8') != -1);
var isMoz 	= (agent.indexOf('gecko') != -1);

// MOW: NEW:  Add a CSS class for the user agent so we can do CSS hacking easily
function setClassNames() {
	var element = document.getElementsByTagName("HTML")[0];
	if (element) {
		var classNames = [];
		if (isIE) classNames.push("IE");
		if (isIE5) classNames.push("IE5");
		if (isIE6) classNames.push("IE6");
		if (isIE7) classNames.push("IE7");
		if (isIE8) classNames.push("IE8");
		if (isMoz) classNames.push("MOZ");
		element.className = classNames.join(" ");
	}
}
setClassNames();
// do it on a timer for IE6
setTimeout(setClassNames, 0);

// Add "trim()" method to string object so we can trim
// leading and trailing whitespace easily
String.prototype.trim=function(){
    return this.replace(/^\s*|\s*$/g,'');
}

// dummy log function so if we leave Firebug log stmts in IE doesn't
// spazz out.
// ## if (!window.console) {
// ## 	window.console = { log: function(s) {} }
// ## }

/* All Pages */

function showHelp() {
	show('help_show');
	hide('help_hide');
}
function hideHelp(iid) {
	hide('help_show');
	show('help_hide');
}

function isFunction(a) {
    return typeof a == 'function';
}

function updateAll ()
{
	if (document.mainForm.chkCheckAll.checked==true)
        {
            checkAll(document.mainForm.checkItem);
        } else {
            uncheckAll(document.mainForm.checkItem);
        }	
}

function checkAll(field)
{
    for (i = 0; i < field.length; i++)
        field[i].checked = true ;
}

function uncheckAll(field)
{
    for (i = 0; i < field.length; i++)
        field[i].checked = false ;
}


function addNewItem()
{
	var obj = document.getElementById("newItem");
	obj.style.display='block';

}

function hideNewItem()
{
	var obj = document.getElementById("newItem");
	obj.style.display='none';

}


function callURL (url)
{
	(new Image()).src=url;
}

function timestamp()
{
    var today=new Date();
    var h=today.getHours();
    var m=today.getMinutes();
    var s=today.getSeconds();
    // add a zero in front of single digit numbers
    m=checkTime(m);
    s=checkTime(s);
    return h+':'+m+':'+s;
}

function checkTime(i)
{
    if (10>i) {
        i='0' + i;
    }
    return i;
}

function log(s) {
    return; // comment out this line to turn on JS debugging.
    obj = document.getElementById('debug');
    if(obj != null) {
        obj.innerHTML += timestamp() + ': ' + s + '<br>';
    }
    return;
}

function clearDebug() {
    obj = document.getElementById('debug');
    if(obj != null) {
        obj.innerHTML = '';
    }
    return;
}

function getAjaxRequest () {
    var xmlhttp = false;

    // look for one of the many IE versions of XMLHTTP
    try { xmlhttp = new ActiveXObject("Msxml2.XMLHTTP.5.0");
    } catch (e) {
        try { xmlhttp = new ActiveXObject("Msxml2.XMLHTTP.4.0");
        } catch (e) {
            try { xmlhttp = new ActiveXObject("MSXML2.XMLHTTP.3.0");
            } catch (e) {
                try { xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
                } catch (e) {
                    try { xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
                    } catch (E) { 
                        xmlhttp = false;
                    }
                }
            }
        }
    }
    
    if ( !xmlhttp && typeof XMLHttpRequest != 'undefined' )
		{   
            // Try for REAL browser version
			xmlhttp = new XMLHttpRequest();
		}
    return xmlhttp;
}

var stopAjax = false;

function getAjaxText (url, target, hack)
{
    var xmlhttp = false;
    var ret = '';

    // Append a random param to the url just to defeat IE browser caching of
    // repeated loads.
	url = url + '&r=' + new Date().getTime();
	if (stopAjax===false)
        {
            // log('preparing to get '+url);
            xmlhttp = getAjaxRequest();
            xmlhttp.open( "GET", url, true );

            xmlhttp.onreadystatechange=function() 
                {
                    var obj = document.getElementById(target);

                    if (xmlhttp.readyState==4 && xmlhttp.status == 200) 
                        {
                            ret = xmlhttp.responseText;
                            if(ret.search(/Login/) < 0) {
                                // log ('&nbsp;&nbsp;' + url + ' state 4; target '+ target+'; obj='+obj+'; did not find login'); 
                                // failure to find "Login" means we're OK
                                if (obj.tagName == "INPUT") {
                                    // trim whitespace if it's going into a form
                                    obj.value=ret.trim();
                                } else {
                                    obj.innerHTML=ret;
                                }
                                // hack hack
                                if((target != 'messageArea') && (target.search(/graphStaging/) >= 0)) {
                                    if(isFunction(hack)) {
                                        setTimeout(hack, 6000);
                                    }
                                }
                                if(target.match('state_*')) { 
                                    // log(target + ' <- ' + ret); 
                                }
                            } else {
                                // we've timed out our login and can't get the text
                                // log ('&nbsp;&nbsp;' + url + ' state 4; did find login; stopping'); 
                                stopAjax = true;
                                // obj.innerHTML='';  there won't BE a target div on the login page
                            }
                            // log('&nbsp;&nbsp; '+target+' onchange = '+obj.onchange);
                            if(obj.onchange !== undefined) {
                                // log('&nbsp;&nbsp; '+target+' type is '+typeof(obj.onchange) + ' calling onchange');
                                if(typeof(obj.onchange) == 'string') {
                                    // log('&nbsp;&nbsp; '+target+' evaling string');
                                    eval(obj.onchange);
                                } else {
                                    // log('&nbsp;&nbsp; '+target+' calling direct');
                                    obj.onchange();
                                }
                            }
                        }
                }
            xmlhttp.send(null);
        } else {
        // log('getAjaxRequest: doing nothing because stopAjax is true.  url=' + url);
        document.location = '/admin/launch?script=rh&template=logout&action=logout&auto=t';
    }
}

var req;

function getAjaxData (url, handler)
{
    req = false;

    // Append a random param to the url just to defeat IE browser caching of
    // repeated loads.
	url = url + '&r=' + new Date().getTime();
	if (stopAjax===false)
        {
            req = getAjaxRequest();
            req.open("GET", url, true );
            req.onreadystatechange=handler; 		
            req.send("");
        }
}

function getAjaxDataSync (url)
{
	var xmlhttp = false;
	var ret = '';

    // Append a random param to the url just to defeat IE browser caching of
    // repeated loads.
	url = url + '&r=' + new Date().getTime();

    xmlhttp = getAjaxRequest();
	xmlhttp.open( "GET", url, false );
	xmlhttp.send(null);
    return xmlhttp.responseText;
}

//
// These two functions, hideSelect and showSelect, are used by the ToolTip
// code to work around the bug in IE where <SELECT> elements do not honor the 
// z-index style; we just hide them when the tooltip is active.

function hideSelect() {
    var select_list = document.getElementsByTagName('select');
    for (var i=0; i < select_list.length; i++) {
        select_list[i].className += " hide";
    }
}

function showSelect() {
    var select_list = document.getElementsByTagName('select');
    for (var i=0; i < select_list.length; i++) {
        select_list[i].className = select_list[i].className.replace(" hide", "");
    }
}

// Gear6 custom confirm popup.
//
// Arguments:
//     titleStr: string representing the title of the popup.
//     msgStr:   string representing the message to the user.  Since it's
//               used as the innerHtml of a div, it can be arbitrary HTML
//     yesCallback: Javascript function to perform action if user clicks OK.
//
// Behavior:
//    This function creates a semi-transparent div that covers the entire 
// window, and puts up a box with the title at the top, the message in the 
// middle, and "OK" and "CANCEL" at the bottom.  If the user clicks "OK", 
// the yesCallback is invoked and the semi-transparent div is removed; if the 
// user clicks on "CANCEL", then nothing happens and the div is removed.

function g6Confirm(titleStr, msgStr, okStr, cancelStr, yesCallback, yesCallbackArg, noCallback, noCallbackArg) { 
	g6Dialog.setDialogParts('confirm', titleStr, msgStr, okStr, cancelStr, yesCallback, yesCallbackArg, noCallback, noCallbackArg);
	g6Dialog.showDialog();
}

function g6Error(titleStr, msgStr, okStr, cancelStr, yesCallback, yesCallbackArg, noCallback, noCallbackArg) { 
	g6Dialog.setDialogParts('error', titleStr, msgStr, okStr, cancelStr, yesCallback, yesCallbackArg, noCallback, noCallbackArg);
	g6Dialog.showDialog();
}

var g6Dialog = {
		// generic dialog bits:
		//	- set various parts of the dialog to the strings passed in
		setDialogParts : function (dialogType, titleStr, msgStr, okStr, cancelStr, yesCallback, yesCallbackArg, noCallback, noCallbackArg) {
			// set the outer class of the dialog to reflect the dialog type
			//	(known types are 'confirm' and 'cancel'
			byId('dialog').className = "dialog " + dialogType+"Dialog";
			
			// set the html according to the strings passed in
			byId('dialog_title').innerHTML = titleStr || 'Title';
			byId('dialog_message').innerHTML = msgStr || 'Message';
			byId('dialog_ok_title').innerHTML = okStr || 'OK';
			byId('dialog_cancel_title').innerHTML = cancelStr || 'Cancel';
			
			// show the ok button only if a valid title was passed in
			byId('dialog_ok').style.display = (okStr ? "" : "none");
			
			// set up the callbacks
			g6Dialog.yesCallback = yesCallback;
			g6Dialog.yesCallbackArg = yesCallbackArg;
			g6Dialog.noCallback = noCallback;
			g6Dialog.noCallbackArg = noCallbackArg;
		},
		
		//	- show the dialog
		showDialog : function () {
			// tell the page that we're showing a dialog
			//	to temporarily turn off auto-update
			if (window.page && page.setUpdateCondition)
				page.setUpdateCondition("dialogIsVisible", true);
				

			var dialog = byId('dialog'),
				mask = byId('dialog_mask')
			;
			// make sure the click mask is covering the entire page
			maximizeElement(mask);
            mask = $(mask);
			mask.bringToFront();
			show(mask);
			
			// move dialog off screen and show so we can accurately get the size
			dialog.style.left = "-10000px";
			$(dialog).bringToFront();
			show(dialog);
			
			// then center the dialog in the visible area
			centerElement(dialog);
		},
		
		hide : function () {
			hide('dialog');
			hide('dialog_mask');

			// tell the page that we're no longer showing a dialog
			//	to re-enable auto-update
			if (window.page && page.setUpdateCondition)
				page.setUpdateCondition("dialogIsVisible", false);			
		},
		
		//	- handle the 'ok' button of the dialog
		okPressed : function () {
			g6Dialog.hide();
			
			var method = g6Dialog.yesCallback;
			if (method) {
				if (typeof method == 'string') {
					method = new Function("arg", method);
				}
				method(g6Dialog.yesCallbackArg);
			}
			
			return false;
		},
		
		//	- handle the 'cancel' button of the dialog
		cancelPressed : function () {
			var method = g6Dialog.noCallback;
			if (method) {
				if (typeof method == "string") {
					method = new Function("arg", method);
				}
				method(g6Dialog.noCallbackArg);
			}
			g6Dialog.hide();
			return false;
		}
	};

/*
  get/set cookie 'borrowed' from http://www.webreference.com/js/column8/functions.html
   name - name of the cookie
   value - value of the cookie
   [expires] - expiration date of the cookie
     (defaults to end of current session)
   [path] - path for which the cookie is valid
     (defaults to path of calling document)
   [domain] - domain for which the cookie is valid
     (defaults to domain of calling document)
   [secure] - Boolean value indicating if the cookie transmission requires
     a secure transmission
   * an argument defaults when it is assigned null as a placeholder
   * a null placeholder is not required for trailing omitted arguments
*/

function setCookie(name, value, expires, path, domain, secure) {
  var curCookie = name + "=" + escape(value) +
      ((expires) ? "; expires=" + expires.toGMTString() : "") +
      ((path) ? "; path=" + path : "") +
      ((domain) ? "; domain=" + domain : "") +
      ((secure) ? "; secure" : "");
  document.cookie = curCookie;
}


/*
  name - name of the desired cookie
  return string containing value of specified cookie or null
  if cookie does not exist
*/

function getCookie(name) {
  var dc = document.cookie;
  var prefix = name + "=";
  var begin = dc.indexOf("; " + prefix);
  if (begin == -1) {
    begin = dc.indexOf(prefix);
    if (begin != 0) return null;
  } else
    begin += 2;
  var end = document.cookie.indexOf(";", begin);
  if (end == -1)
    end = dc.length;
  return unescape(dc.substring(begin + prefix.length, end));
}

/*
   name - name of the cookie
   [path] - path of the cookie (must be same as path used to create cookie)
   [domain] - domain of the cookie (must be same as domain used to
     create cookie)
   path and domain default if assigned null or omitted if no explicit
     argument proceeds
*/

function deleteCookie(name, path, domain) {
  if (getCookie(name)) {
    document.cookie = name + "=" +
    ((path) ? "; path=" + path : "") +
    ((domain) ? "; domain=" + domain : "") +
    "; expires=Thu, 01-Jan-70 00:00:01 GMT";
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
		  if(att == name) {
			   arr[iarr] = elem[i];
			   iarr++;
		  }
	 }
	 return arr;
}

// MOW: "alias" for "getElementById()" [for speed of typing]
function byId(id) {
	if (typeof id == 'string') return document.getElementById(id);
	return id;
}

// generic show/hide logic
function show(id) {
	var it = byId(id);
	if (it) {
 		if (isMoz && it.tagName == 'TR') {
 			it.style.display = 'table-row';
 		} else if (isMoz && it.tagName == 'TD') {
 			it.style.display = 'table-cell';
 		} else {
 			it.style.display = 'block';
 		}
 	}
}

function hide(id) {
	var it = byId(id);
	if (it) it.style.display = 'none';
}

function setVisible(id, showIt) {
	if (showIt) show(id);
	else 		hide(id);
}

// generic logic to get window geometry in a x-platform way
function getWindowGeometry() {
	var body = (document.documentElement || document.body),
		geo = {
			// inner width of the window
			windowInnerWidth 	: window.innerWidth
							|| document.documentElement.clientWidth
							|| document.body.clientWidth,
			
			// scroll width of window
			scrollWidth		: body.scrollWidth,

			// scroll left of window
			scrollLeft 	: window.pageXOffset 
							|| document.documentElement.scrollLeft
							|| document.body.scrollLeft 
							|| 0,
	
			// scrollbar width -- HACK: no way to figure this out dynamically. (???)
			scrollbarWidth	: 16,

			
			// inner height of window
			windowInnerHeight 	: window.innerHeight
							|| document.documentElement.clientHeight
							|| document.body.clientHeight,

			// scroll height of window
			scrollHeight		: body.scrollHeight,
			
			// scroll top of window
			scrollTop 	: window.pageYOffset 
							|| document.documentElement.scrollTop
							|| document.body.scrollTop 
							|| 0,

			// scrollbar height -- HACK: no way to figure this out dynamically. (???)
			scrollbarHeight	: 16

		}
	;
	// maximum width and height for all content (useful for click mask)
	geo.maximumWidth = Math.max(geo.scrollWidth,  geo.windowInnerWidth -geo.scrollbarWidth);
	geo.maximumHeight = Math.max(geo.scrollHeight, geo.windowInnerHeight-geo.scrollbarHeight);

	// center of visible region (useful for centering something)
	geo.visibleCenterX = geo.scrollLeft + (geo.windowInnerWidth/2);
	geo.visibleCenterY = geo.scrollTop + (geo.windowInnerHeight/2);

	return geo;
}

// center an element on the visible portion of the screen
// NOTE:  the element MUST NOT be display:none when we calculate, or the below will be off
function centerElement(id) {
	var element = byId(id);
	if (!element) return;
	
	var geo = getWindowGeometry();

	element.style.left = Math.max(0, geo.visibleCenterX - (element.offsetWidth  / 2)) + "px";
	element.style.top =  Math.max(0, geo.visibleCenterY - (element.offsetHeight / 2)) + "px";
}

// maximize an element so that it takes up the entire content size (e.g. a click mask)
function maximizeElement(id) {
	var element = byId(id);
	if (!element) return;
	
	var geo = getWindowGeometry();
	element.style.left = element.style.top = "0px";
	element.style.width = geo.maximumWidth + "px";
	element.style.height = geo.maximumHeight + "px";
}

//DEBUG
function dir(it) {
	if (window.console && window.console.dir) {
		window.console.dir(it);
	} else {
		var output = [];
		for (var prop in it) {
			output.push(prop + ":" + it[prop]);
		}
		alert(output.join("\n"));
	}
}

