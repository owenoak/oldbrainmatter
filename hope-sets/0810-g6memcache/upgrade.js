
// Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/upgrade.js,v $
// Revision:  $Revision: 1.4 $
// Date:      $Date: 2008-02-05 00:22:01 $
// Author:    $Author: ahh $
//
// (C) Copyright 2006 Gear6 Inc.
// All rights reserved.


var debug = false;
var upgradeClosure;
var upgradeStatus = new Object();

function log(s) {
    // return; // comment out this line to turn on JS debugging.
    obj = document.getElementById('debug');
    if(debug && obj != null) {
        obj.innerHTML += timestamp() + ': ' + s + '<br>';
    }
    return;
}

//
// set the status div to have a certain value.
//
function updateStatus(s) {
    log("Status update: "+s);
    obj = document.getElementById('status');
    if(obj != null) {
        obj.innerHTML = '<strong>Upgrade Status:</strong><br> '+timestamp() + ': ' + s + '<br>';
    }
    return obj;  //Work around Safari bug
}

//
// Update images for module 'id'.  If oldcell is non-null, make it complete 
//   (i.e. checked) and if newcell is non-null, set it a-spinnin'.
//
function imgUpdate(oldcell, newcell, id) {
    var o;
    if(oldcell != '') {
        o = document.getElementById(oldcell+id);
        o.innerHTML = '<img src=\"/images/progress/check.gif\" width=\"25\" height=\"25\" alt=\"done\">';
    }
    if(newcell != '') {
        o = document.getElementById(newcell+id);
        o.innerHTML = '<img src=\"/images/progress/gray.gif\" width=\"25\" height=\"25\" alt=\"running\">';
    }
}

// clear all images for modules
function imgClear() {
    var o;
    var id;
    for(i=0; nodes.length > i; i++) {
        id = nodes[i];
        log(i+': Clearing images for id '+id);
        o = document.getElementById('dist_'+id);
        o.innerHTML = '<img src=\"/images/progress/blank.gif\">';
        o = document.getElementById('install_'+id);
        o.innerHTML = '<img src=\"/images/progress/blank.gif\">';
        o = document.getElementById('set_'+id);
        o.innerHTML = '<img src=\"/images/progress/blank.gif\">';
        o = document.getElementById('reboot_'+id);
        o.innerHTML = '<img src=\"/images/progress/blank.gif\">';
    }
}

// Process the return value from the xmlHTTP (AJAX) request to see how far the 
// upgrade has gotten.  Runs in the context of the callback closure.

function process(str) {
    n++;
    log('&nbsp;&nbsp; Processing: step '+n);  
    log('&nbsp;&nbsp; str = '+str);  
    
    if(!debug) {
        var obj = document.getElementById('debug');
        obj.innerHTML = '<hr><p>Updated at '+timestamp() + ':<br> ' + str + '<br>';
    }

    if(str == null) {
        // no output yet, keep going
        return true;
    }
    if(str.match(/ERROR/)) {
        // error
        log('Matched ERROR');
        upgradeStatus.status_text = 'Error in upgrade script!';
        buttonTweakStopped();
        return false;      
    }

    // no error, continue figuring stuff out
    if(str.match(/Upgrade halted/)) {
        log('Matched Upgrade Halted');
        upgradeStatus.status_text = 'Upgrade halted';
        buttonTweakStopped();
        return false;
    }

    // check for individual module's progress.
    var i;
    var lines = str.split('\n'); // extra backslash needed to survive TMS templatization
    for(i=0; lines.length > i; i++) {
        log('&nbsp;&nbsp;&nbsp; line '+i+': '+lines[i]);

        if(lines[i].match(/Distributing image:/)) {
            // master doesn't need distribution
            imgUpdate('dist_', '', master);
            upgradeStatus.status_text = 'Distributing image to all modules.'
        }
 
        if(lines[i].match(/Distributing image to Cache Module (\d+)/)) {  // extra ditto to ditto
            log('&nbsp;&nbsp;&nbsp; -- Found dist, node '+RegExp.$1);
            imgUpdate('', 'dist_', RegExp.$1);
            upgradeStatus.status_text = 'Distributing image to all modules.'
        } 

        if(lines[i].match(/Installing on Cache Module (\d+)/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found install, node '+RegExp.$1);
            imgUpdate('dist_', 'install_', RegExp.$1);
            upgradeStatus.status_text = 'Installing image in alternate partition.'
        } 

        if(lines[i].match(/Installing on myself now/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found install, master');
            imgUpdate('dist_', 'install_', master);
            upgradeStatus.status_text = 'Installing image in alternate partition.'
        }
        
        if(lines[i].match(/Setting on Cache Module (\d+)/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found set boot, node '+RegExp.$1);
            upgradeStatus.status_text = 'Setting boot partition.'
            imgUpdate('install_', 'set_', RegExp.$1);
        }
        if(lines[i].match(/Checking install on Cache Module (\d+)/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found check install, node '+RegExp.$1);
            upgradeStatus.status_text = 'Checking installation.'
            imgUpdate('set_', '', RegExp.$1);
        }
        if(lines[i].match(/OK: Cache Module (\d+) nextboot (\d+)/)) {
            log('&nbsp;&nbsp;&nbsp; -- node '+RegExp.$1+' nextboot '+RegExp.$2);
            var obj = document.getElementById('next_'+RegExp.$1);
            obj.innerHTML = RegExp.$2;
        }
        if(lines[i].match(/Rebooting Cache Module (\d+)/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found rebootING, node '+RegExp.$1);
            upgradeStatus.status_text = 'Rebooting module' + RegExp.$1 +'.';
            imgUpdate('', 'reboot_', RegExp.$1);
        }
        if(lines[i].match(/Cache Module (\d+) \(.+\) has rebooted and rejoined/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found rebootED, node '+RegExp.$1);
            imgUpdate('reboot_', '', RegExp.$1);
        }
        if(lines[i].match(/rebooting myself/)) {
            log('&nbsp;&nbsp;&nbsp; -- Found rebootED, master');
            document.location = '/admin/launch?script=rh&template=upgrade_complete';

        }

    }

    // ... 
    return true;                // keep going
}

function buttonTweakRunning() {
    // disable upgrade button so we don't get two running at once
    button = document.getElementById('upgradeButton');
    button.disabled = true;

    // enable the stop button
    button = document.getElementById('stopButton');
    button.disabled = false;
}

function buttonTweakStopped() {
    // enable upgrade button so we can restart
    button = document.getElementById('upgradeButton');
    button.disabled = false;

    // disable the stop button
    button = document.getElementById('stopButton');
    button.disabled = true;
}

//
// Do the whole upgrade enchilada.  The process is:
//   * check that there's a real value in the form.
//   * initialize the status object
//   * create the xmlHTTP (AJAX) object
//   * create the callback closure that implements the 
//     upgrade state machine
//   * fire off the first AJAX request.
//   Then the user has but to sit back and enjoy the show.
//
function doUpgrade(mode, unsaved_changes) {
    log('Starting Upgrade');

    if (debug) {
        var obj = document.getElementById('clearDebug');
        obj.innerHTML = "<input class=\"formBarButton\" type=\"button\" value=\"Clear Debug\" onClick=\"clearDebug();\">";
    }


    if (myID != master) {
        alert('Cannot do upgrade from a slave node.  Please log in to the master and try again.');
        return;
    }
    if (expected > 0 && expected != nodes.length) {
        alert('Cannot do upgrade when only '+nodes.length+' nodes of '+expected+' are present.');
        return;
    }
    upgradeStatus.imageurl = document.forms[1].url.value;  
    if(upgradeStatus.imageurl.length == 0) {
        alert('Please enter URL of new image and click UPGRADE');
        return;
    }

    // prompt the user to save changes if necessary.
    if (unsaved_changes) {
        save_config = confirm('Configuration has been modified; save first?');
        if (save_config) {
            document.save_config_form.save.click();
        }
    }

    buttonTweakRunning();

    // set up the status object so we can keep track of our state during the upgrade.
    upgradeStatus.master = master;
    upgradeStatus.target = 'status';
    upgradeStatus.div = document.getElementById(upgradeStatus.target);
    upgradeStatus.n   = 0;
    upgradeStatus.run = true;
    upgradeStatus.op  = mode;     // we might want to restart for an UG in progress
    upgradeStatus.nodes = nodes;
    upgradeStatus.error_text = '';
    upgradeStatus.halted = false;
    upgradeStatus.timer = null;
    upgradeStatus.status_text = 'Not yet started.';
    // check for sequential or immediate reboot
    var obj = document.getElementById('immediate');
    if(obj.checked == true) {
        if (mode == 'start') {
            cnf = confirm('Are you sure you wish to reboot all Cache Modules after upgrade? This will result in a service interruption of several minutes and loss of all cached content.');
            if(cnf != true) {
                updateStatus('Upgrade Cancelled.');
                buttonTweakStopped();
                return;
            }
        }
        upgradeStatus.reboot = 'immediate';
    } else {
        if (mode == 'start') {
            cnf = confirm('Are you sure you wish to reboot the Cache Modules sequentially after upgrade? This will result in loss of all cached content.');
            if(cnf != true) {
                updateStatus('Upgrade Cancelled.');
                buttonTweakStopped();
                return;
            }
        }
        upgradeStatus.reboot = 'sequential';
    }   

    log('* image url = '+upgradeStatus.imageurl);

    var path = upgradeStatus.imageurl.split('/');
    upgradeStatus.imageName = path[path.length-1];
    log ('*    image: name is '+upgradeStatus.imageName);

    upgradeStatus.checkurl = '/admin/launch?script=rh&template=upgrade_step';
    upgradeStatus.checkurl += '&var_op='+upgradeStatus.op+'&var_n='+n+'&var_arg='+upgradeStatus.imageurl;
    upgradeStatus.checkurl += '&var_reboot='+upgradeStatus.reboot;


    upgradeStatus.xmlhttp = getAjaxRequest();
    // Append a random param to the url just to defeat IE 
    // browser caching of  repeated loads.
    url = upgradeStatus.checkurl + '&r=' + new Date().getTime();
    upgradeStatus.xmlhttp.open( 'GET', url, true );
    log('* created Ajax object, url='+ url);

    // add status object to scope chain and create the closure we'll use as the 
    // Ajax callback.

    with (upgradeStatus) {
        // This is the beginning of the anonymous closure that is called
        // repeatedly by the AJAX updates to execute the upgrade process.
        // It stores all its state on the upgradeStatus object.
        //
        // Note that since the upgradeStatus object is placed at the head of 
        // the scope chain for this closure, we don't need to explicitly
        // code, for example, 'upgradeStatus.op', but instead, when trying to find
        // a binding for 'op', the JavaScript engine starts at the head of the scope 
        // chain and will find the values on our upgradeStatus object first.

        upgradeClosure = function () {
            var obj = div;
            n++;
            // for some reason when I took this out of the template
            // and into it's own file, it started throwing errors that
            // xmlhttp.status didn't exist when readyState was not 4;
            // I thought JavaScript did c-style short-circuit
            // evaluation of conditionals but apparently I was wrong,
            // or at least only part right.
			if (xmlhttp.readyState==4) {
                if (xmlhttp.status == 200) {
                    log ('Upgrade Closure: op = ' +op+': '+ imageurl + ' target '+ target+ '; obj='+obj + '; timer='+timer + '; halted='+halted + '; run='+run); 
                    ret = xmlhttp.responseText;
                    if(0 > ret.search(/Login/)) {
                        // failure to find 'Login' means we're OK
                        // obj.innerHTML='n = '+n+' op = '+ op +'<BR>'+ret
                        obj.innerHTML='n = '+n+' op = '+ op;
                    
                        // Here is the upgrade state machine (op is the state variable):

                        switch(op) {
                        case 'start': 
                            log('### start: result = '+ret);
                            status_text = 'Starting upgrade.';
                            op = 'check';
                            checkurl = '/admin/launch?script=rh&template=upgrade_step';
                            checkurl += '&var_op='+op+'&var_n='+n+'&var_arg='+imageurl;
                            log('### start: run = '+run);
                            break;

                        case 'halt':
                            log('### HALT');
                            status_text = 'Upgrade cancelled.';
                            if(halted == true) { 
                                // we've been through here once
                                run = false;
                            } else {
                                // first time, need one more query to process the halt.
                                run = true;
                                halted = true;
                            }
                            imgClear();
                            checkurl = '/admin/launch?script=rh&template=upgrade_step';
                            checkurl += '&var_op='+op+'&var_n='+n+'&var_arg='+imageurl;
                            break;

                        case 'check':
                            // obj.innerHTML += ret;
                            log('### check: ');
                            run = process(ret);
                            log('   run='+run);
                            break;

                        default:
                            obj.innerHTML='ERROR: unknown state '+op;
                            log('Upgrade Closure: unknown state '+op+' stopping');
                            run = false;
                            buttonTweakStopped();
                            break;
                        } // end of switch(op)
                        log(' -- end of switch, run = '+run);
                        updateStatus(status_text);
                    } else {
                        // we've timed out our login and can't get the text
                        log ('Upgrade Closure: ' + url + ' state 4; did find login; stopping'); 
                        run = false;
                        obj.innerHTML='';
                    }
                    log(' -- end of login if, run = '+run);
                    if(run) {
                        log(' -- run = '+run+', creating step function');
                        // create the function that will do the next call
                        var step = function () {
                            // Append a random param to the url just to defeat IE 
                            // browser caching of  repeated loads.
                            url = upgradeStatus.checkurl + '&r=' + new Date().getTime();
                            log('$$ step: trying to refire the object '+xmlhttp+' with url '+ url);
                            xmlhttp.open( 'GET', url, true ); 
                            xmlhttp.onreadystatechange=upgradeClosure;
                            xmlhttp.send(null);
                        }
                        log('## run = true, calling again.');
                        timer = setTimeout(step, 2000);
                    } else {
                        log('## run = false, stopping.');
                        buttonTweakStopped();
                    }
                }
            } // end of if(readystate...)
            else {
                log('readystate = '+xmlhttp.readyState);
            }
        } // end of closure function
    } // end of with() clause

    log('* created closure');
    upgradeStatus.xmlhttp.onreadystatechange=upgradeClosure;
    upgradeStatus.xmlhttp.send(null);

    log('fired off request');
    log('that is all so far');
    return false; // IE6: prevent enter in textbox from actually submitting
}

function doStopUpgrade() {
    log('stop button pressed');
    cur_op = 'halt';
    upgradeStatus.op = 'halt';
    updateStatus('Cancelling Upgrade...');
    
}

function doFetch() {
    if(url.length == 0) {
        alert('Please enter URL of new image and click UPGRADE');
        return;
    }
    updateStatus('Fetching image from '+url);
    cur_op = 'fetch';
    cur_arg = url;
    doStep();
    cur_op = 'fetch_check';
}

var n = 0;
function doStep() {
    log('## doStep: op='+cur_op+' arg='+cur_arg);
    var checkurl = '/admin/launch?script=rh&template=upgrade_step';
    n++;
    checkurl += '&var_op='+cur_op+'&var_n='+n+'&var_arg='+cur_arg;
    getAjaxText (checkurl, 'status');
}

function selectImage(obj) {
  document.forms[1].url.value = obj.value;
}
