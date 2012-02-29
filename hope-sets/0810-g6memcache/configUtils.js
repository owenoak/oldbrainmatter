//
// Utility functions used on the configuration page.
//
// Filename:  $Source: /cvshome/crd/xlr8/src/bin/web/content/js/configUtils.js,v $
// Revision:  $Revision: 1.8 $
// Date:      $Date: 2008-02-02 02:49:43 $
// Author:    $Author: ahh $
//
// (C) Copyright 2006 Gear6
// All rights reserved.
//

var acregmax_slider;
var chunksiz_slider;

// ENABLE/DISABLE FUNCTIONS
// these functions enable and disable various parts of the cache control
// GUI according to the policies implemented below.

function enableAcregmaxSliders() {
    log('enableAcregmaxSliders');

    // enable global timeout slider
    acregmax_slider.setDisabled(false);
    obj = document.getElementById('acregmaxLabel');
    obj.style.color = '#000000';
    obj = document.getElementById('acregmaxValue');
    obj.style.color = '#000000';
    obj = document.getElementById('slider_acregmax');
    obj.style.color = '#000000';
    obj.disabled = false;
    obj = document.getElementById('acregmaxMinMaxLabels');
    obj.style.color = '#000000';
    obj = document.getElementById('addTimeout');
    obj.style.color = '#000000';
    obj.disabled = false;

    // enable the rest of the timeout sliders
    for (j = 0; j < acregmax_slider_enable_array.length; j++) {
        acregmax_slider_enable_array[j]();
        obj = document.getElementById('acregmax_' + j + 'Label');
        obj.style.color = '#000000';
        obj = document.getElementById('acregmax_' + j + 'Value');
        obj.style.color = '#000000';
        obj = document.getElementById('slider_acregmax_' + j);
        obj.style.color = '#000000';
        obj.disabled = false;
        obj = document.getElementById('acregmax_' + j + 'MinMaxLabels');
        obj.style.color = '#000000';
    }

    return;
}

function disableAcregmaxSliders() {
    log('disableAcregmaxSliders');

    // disable global timeout slider
    acregmax_slider.setDisabled(true);
    obj = document.getElementById('acregmaxLabel');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('acregmaxValue');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('slider_acregmax');
    obj.style.color = '#BBBBBB';
    obj.disabled = true;
    obj = document.getElementById('acregmaxMinMaxLabels');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('addTimeout');
    obj.style.color = '#BBBBBB';
    obj.disabled = true;

    // disable the rest of the timeout sliders
    for (j = 0; j < acregmax_slider_disable_array.length; j++) {
        acregmax_slider_disable_array[j]();
        obj = document.getElementById('acregmax_' + j + 'Label');
        obj.style.color = '#BBBBBB';
        obj = document.getElementById('acregmax_' + j + 'Value');
        obj.style.color = '#BBBBBB';
        obj = document.getElementById('slider_acregmax_' + j);
        obj.style.color = '#BBBBBB';
        obj.disabled = true;
        obj = document.getElementById('acregmax_' + j + 'MinMaxLabels');
        obj.style.color = '#BBBBBB';
    }

    return;
}
 
function enableChunksizSlider() {
    log('enableChunksizSlider');
    // enable timeout slider
    chunksiz_slider.setDisabled(false);
    obj = document.getElementById('chunksizLabel');
    obj.style.color = '#000000';
    obj = document.getElementById('chunksizValue');
    obj.style.color = '#000000';
    obj = document.getElementById('slider_chunksiz');
    obj.style.color = '#000000';
    obj.disabled = false;
    obj = document.getElementById('chunksizMinMaxLabels');
    obj.style.color = '#000000';
    return;
}

function disableChunksizSlider() {
    log('disableChunksizSlider');
    // disable timeout slider
    chunksiz_slider.setDisabled(true);
    obj = document.getElementById('chunksizLabel');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('chunksizValue');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('slider_chunksiz');
    obj.style.color = '#BBBBBB';
    obj.disabled = true;
    obj = document.getElementById('chunksizMinMaxLabels');
    obj.style.color = '#BBBBBB';
    return;
}

function setChunksizSlider(n) {
    log('setChunksizSlider('+n+')');
    chunksiz_slider.setValue(n);
    objs = document.getElementsByName('f_chunksiz');
    objs[0].value = n;
}

function enableDistType() {
    log('enableDistType');
    // enable distribution type
    obj = document.getElementById('distType');
    obj.style.color = '#000000';
    obj = document.getElementById('dtStripe');
    obj.disabled = false;
    obj = document.getElementById('dtStripeText');
    obj.style.color = '#000000';
    obj = document.getElementById('dtNoStripe');
    obj.disabled = false;
    obj = document.getElementById('dtNoStripeText');
    obj.style.color = '#000000';
    return;
}

function disableDistType() {
    log('disableDistType');
    // disable distribution type
    obj = document.getElementById('distType');
    obj.style.color = '#BBBBBB';

    obj = document.getElementById('dtStripe');
    obj.disabled = true;
    obj = document.getElementById('dtStripeText');
    obj.style.color = '#BBBBBB';

    obj = document.getElementById('dtNoStripe');
    obj.checked = true;         // default when disabled.
    obj.disabled = true;
    obj = document.getElementById('dtNoStripeText');
    obj.style.color = '#BBBBBB';
    return;
}

function enableBypassType() {
    log('enableBypassType');
    // enable bypass type
    obj = document.getElementById('bypassType');
    obj.style.color = '#000000';
    obj = document.getElementById('btBypass');
    obj.disabled = false;
    obj = document.getElementById('btBypassText');
    obj.style.color = '#000000';
    obj = document.getElementById('btNoBypass');
    obj.disabled = false;
    obj = document.getElementById('btNoBypassText');
    obj.style.color = '#000000';
    return;
}

function disableBypassType() {
    log('disableBypassType');
    // disable bypass type
    obj = document.getElementById('bypassType');
    obj.style.color = '#BBBBBB';

    obj = document.getElementById('btBypass');
    obj.disabled = true;
    obj = document.getElementById('btBypassText');
    obj.style.color = '#BBBBBB';

    obj = document.getElementById('btNoBypass');
    obj.disabled = true;
    obj = document.getElementById('btNoBypassText');
    obj.style.color = '#BBBBBB';
    return;
}

// Set the file-attribute-sync control value.
function setFileAttr(arg) {
    log('setFileAttr');
    obj = document.getElementById('sel_fileattr_sync');
    obj.value = arg;
    return;
}

// Set the placement control value.
function setPlacement(arg) {
    log('setPlacement');
    obj = document.getElementById('sel_cluster_placement');
    obj.value = arg;
    return;
}

// CACHE CONTROL POLICIES
// depending on the various settings, cause the right parts of the GUI
// to be enabled.

function enableDistribution() {
    log('enableDistribution, placement = ' + placement + ', stripesize = ' + stripesize + ', attrsync = ' + attrsync);

    // Enable distribution controls.
    obj = document.getElementById('cacheDist');
    obj.style.color = '#000000';
    obj = document.getElementById('cdLocal');
    obj.disabled = false;
    obj = document.getElementById('cdLocalText');
    obj.style.color = '#000000';
    obj = document.getElementById('cdDist');
    obj.disabled = false;
    obj = document.getElementById('cdDistText');
    obj.style.color = '#000000';

    // Enable/disable the rest as appropriate.
    if (placement == 'LOCAL') {
        disableDistType();
        disableBypassType();
        enableAcregmaxSliders();
        setChunksizSlider(0);
        disableChunksizSlider();
    } else {
        enableDistType();
        if (attrsync == 'TIMEOUT') {
            enableAcregmaxSliders();
        } else {
            disableAcregmaxSliders();
        }
        if (stripesize != 0) {
            disableBypassType();
            enableChunksizSlider();
        } else {
            enableBypassType();
            disableChunksizSlider();
        }
    }

    return;
}

function disableDistribution() {
    log('disableDistribution');

    // enable distribution controls
    obj = document.getElementById('cacheDist');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('cdLocal');
    obj.disabled = true;
    obj = document.getElementById('cdLocalText');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('cdDist');
    obj.disabled = true;
    obj = document.getElementById('cdDistText');
    obj.style.color = '#BBBBBB';

    // Disable the rest.
    disableDistType();
    disableBypassType();
    disableAcregmaxSliders();
    disableChunksizSlider();

    return;
}

// User has clicked on "Enabled" radio button.
function setCacheEnable() {
    log('setCacheEnable');

    // Set the hidden checkbox on.
    obj = document.getElementById('cacheEnable');
    obj.checked = true;

    enableCacheContent();

    // Enable the Distribution widgets (and the rest that make sense).
    enableDistribution();

    return;
}

// User has clicked on "Disabled" radio button.
function setCacheDisable() {
    log('setCacheDisable');

    // Set the hidden checkbox off.
    obj = document.getElementById('cacheEnable');
    obj.checked = false;

    disableCacheContent();

    // Disable the Distribution widgets (and everything else).
    disableDistribution();

    return;
}

function enableCacheContent() {
    log('enableCacheContent');

    // Enable content controls.
    obj = document.getElementById('cacheContentLabel');
    obj.style.color = '#000000';
    obj = document.getElementById('ccEnable');
    obj.disabled = false;
    obj = document.getElementById('ccEnableText');
    obj.style.color = '#000000';
    obj = document.getElementById('ccDisable');
    obj.disabled = false;
    obj = document.getElementById('ccDisableText');
    obj.style.color = '#000000';

    return;
}

function disableCacheContent() {
    log('disableCacheContent');

    // Disable content controls.
    obj = document.getElementById('cacheContentLabel');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('ccEnable');
    obj.disabled = true;
    obj = document.getElementById('ccEnableText');
    obj.style.color = '#BBBBBB';
    obj = document.getElementById('ccDisable');
    obj.disabled = true;
    obj = document.getElementById('ccDisableText');
    obj.style.color = '#BBBBBB';

    return;
}

// User has clicked on "Enabled" radio button.
function setCacheContentEnable() {
    log('setCacheContentEnable');
    obj = document.getElementById('cacheContent');
    obj.checked = true;

    return;
}

// User has clicked on "Disabled" radio button.
function setCacheContentDisable() {
    log('setCacheContentDisable');
    obj = document.getElementById('cacheContent');
    obj.checked = false;

    return;
}

// User has clicked on "Local" radio button.
function setLocal() {
    log('setLocal');
    enableAcregmaxSliders(); 
    setChunksizSlider(0);
    disableChunksizSlider();
    disableDistType();
    setBypassType('yes');
    disableBypassType();
    setFileAttr('TIMEOUT');
    setPlacement('LOCAL');
    return;
}

// User has clicked on "Distributed" radio button.
function setDist() {
    log('setDist: stripesize = '+stripesize);

    disableAcregmaxSliders();
    enableDistType();
    if (stripesize != 0) {
        enableChunksizSlider(); 
        setStriped();
    } else {
        setChunksizSlider(0);
        disableChunksizSlider();
        setNotStriped();
    }
    return;
}

// User has clicked on "Striped" radio button.
function setStriped() {
    log('setStriped');
    setBypassType('no');
    disableBypassType();
    disableAcregmaxSliders();
    enableChunksizSlider();
    setFileAttr('OPTIMISTIC');
    setPlacement('PRAND');
    return;
}

// User has clicked on "Not Striped" radio button.
function setNotStriped() {
    log('setNotStriped: attrsync = ' +attrsync);
    enableBypassType();
    enableAcregmaxSliders();
    setChunksizSlider(0);
    disableChunksizSlider();
    if (attrsync == 'TIMEOUT') {
        setBypass();
    } else {
        setNoBypass();
    }
    return;    
}

function setBypassType(yesorno) {
    log('setBypassType: '+yesorno);  
    if (yesorno == 'yes') {
        obj = document.getElementById('btBypass');
    } else {
        obj = document.getElementById('btNoBypass');
    }
    obj.checked = true;
}


// User has clicked on "Bypass" radio button.
function setBypass() {
    log('setBypass');  
    obj = document.getElementById('btBypass');
    obj.checked = true;
    enableAcregmaxSliders();
    setFileAttr('TIMEOUT');
    setPlacement('PRAND');
    return;
}

// User has clicked on "No Bypass" radio button.
function setNoBypass() {
    log('setNoBypass');  
    obj = document.getElementById('btNoBypass');
    obj.checked = true;
    disableAcregmaxSliders();
    setFileAttr('OPTIMISTIC');
    setPlacement('PRAND');
    return;
}

function initializeWidgets() {
    log('initializeWidgets, enabled = ' + enabled + ', placement = ' + placement + ', stripesize = ' + stripesize + ', attrsync = ' + attrsync);
    if (enabled == 'true') {
        setCacheEnable();
    } else {
        setCacheDisable();
    }
    return;
}
