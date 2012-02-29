<?php

//  Filename:  $Source: /cvshome/crd/xlr8/src/bin/cloud_common/Common.php,v $
//  Revision:  $Revision: 1.20 $
//  Date:      $Date: 2010-03-24 17:16:59 $
//  Author:    $Author: martin $

/*
Software License Agreement (BSD License)

Copyright (c) 2009, Gear Six, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

* Redistributions of source code must retain the above copyright
  notice, this list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the following disclaimer
  in the documentation and/or other materials provided with the
  distribution.

* Neither the name of Gear Six, Inc. nor the names of its
  contributors may be used to endorse or promote products derived from
  this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// common code and definitions

function __autoload($class_name) {
    require_once $class_name . '.php';
}

// Defined event provider types for http push
define('SERVICECONTROLLER_ID', 1);


define ('HEARTBEAT_INTERVAL', 30);

// Management/User Interface actions available on api/ServiceController/latest
//
// See api documentation for more information.
//
define('MACHINE_TYPES', 'machine-types');
define('ADD_NODE',      'attach');
define('DEL_NODE',      'detach');
define('RENAME',        'rename');
define('CLUSTER_JOIN',  'join');
define('CLUSTER_LEAVE', 'leave');
define('AUTHORIZE',     'authorize');
define('CONFIG',        'config');

// Machine identification strings
define('NODE_SELF',     'self');

// Protocol error codes for the API calls
define('OK_RESULT',    'OK');
define('ERROR_RESULT', 'ERROR');

// Error strings

// Could not find a cloud provider on this system
define('ERROR_NO_CLOUD', 'error-no-cloud');
// Database error
define('ERROR_DB', 'error-no-db');
// Local system refused join response
define('ERROR_REJECT_JOIN_RESPONSE', 'error-local-reject-join');
// Local system refused leave response
define('ERROR_REJECT_LEAVE_RESPONSE', 'error-local-reject-leave');
// Invalid IP address
define('ERROR_INVALID_IP', 'error-invalid-ip');
// Invalid IP address for request
define('ERROR_INVALID_IP_REQUEST', 'error-invalid-ip-request');
// This system is already in a service
define('ERROR_IN_SERVICE_ALREADY', 'error-already-in-service');
// Invalid credentials
define('ERROR_BAD_CREDS', 'error-bad-credentials');
// Wrong password
define('ERROR_BAD_PASSWORD', 'error-bad-password');
// Couldn't connect to server
define ('ERROR_NO_CONNECT', 'error-no-connect');
// Operation timed out
define ('ERROR_TIMEDOUT', 'error-timedout');
// No route to host
define ('ERROR_NO_ROUTE', 'error-no-route');
// Protocol/communications error
define ('ERROR_CALL_FAILED', 'error-call-failed');
// Permissions error
define ('ERROR_PERMISSIONS', 'error-not-allowed');
// Required data is missing
define ('ERROR_REQUIRED', 'error-required');

// Static config file name
define ('MC_CONFIG_FILE_NAME', '/var/opt/gear6/output/memcache01-autoconf.cfg');

// turn a curl error into a message catalog response
// 
function curlToError($curlMsg) {
    if (strpos($curlMsg, "Operation timed out after") !== false) {
        return ERROR_TIMEDOUT;
    }
    if (strpos($curlMsg, "Failed connect to") !== false) {
        return ERROR_NO_CONNECT;
    }
    switch ($curlMsg) {
    case "No route to host":
        return ERROR_NO_ROUTE;
    case "couldn't connect to host":
    case "couldn't connect to server":
        return ERROR_NO_CONNECT;
    default:
        return $curlMsg;
    }
}

// multi-url operation class
//
// Perform multiple HTTP ops in parallel
//
// To use this class:
//
// Call addRequest() with a object containing
//      uri         - the uri to fetch
//      postData    - if a POST operation is required
//
// Call execute($maxWait) to perform the ops in parallel
//
// Call getResults() to collect the results which will include
//
//
class RemoteOps {

    private $reqs           = array();

    // Inbound parameters:
    //
    // req->uri         = request uri
    // req->postData    = (optional) - do a POST instead of a GET, use this data
    //
    function addRequest($req) {

        $r->uri = $req->uri;
        $r->machineId = $req->machineId;
        $r->privateIP = $req->privateIP;
     
        if (isset($req->postData)) {
            $r->postData = $req->postData;
        }
        if (isset($req->cookie)) {
            $r->cookie = $req->cookie;
        }
        
        // if there's data attached, save it for later; it may help the caller decode the results. 
        if (isset($req->data)) {
            $r->data = $req->data;
        }
        $this->reqs[] = $r;
    }

    function getResults() {

        return $this->reqs;
    }

    function clearRequests() {

        $this->reqs = null;
        $this->reqs = array();
    }

    // handle talking to multiple hosts simultaneously
    //
    function execute($maxWait = 60) {

        if (count($this->reqs) == 0) {
            return true;
        }

        $mh = curl_multi_init();
        foreach ($this->reqs as $req) {
            $ch = curl_init();
            $req->ch = $ch;
            $req->response = null;
            $req->result = 0;
            curl_setopt($ch, CURLOPT_URL, $req->uri);
            curl_setopt($ch, CURLOPT_HEADER, 0);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $maxWait);
            curl_setopt($ch, CURLOPT_TIMEOUT, $maxWait);
            if (isset($req->postData)) {
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $req->postData);
                curl_setopt($ch, CURLOPT_HTTPHEADER, Array('Expect: ', 'Content-type: text/xml'));
            }
            if (isset($req->cookie)) {
                curl_setopt($ch, CURLOPT_COOKIE, $req->cookie);
            }
            $rc = curl_multi_add_handle($mh, $ch);
            if ($rc != CURLM_OK) {
                g6Logger::log(LOG_ERR, "curl_multi_add_handle returned $rc");
            }
        }

        do { 
            do {
                $rc = curl_multi_exec($mh, $active);
                if ($rc > CURLM_OK) {
                    g6Logger::log(LOG_ERR, "curl_multi_exec returned $rc, active $active");
                    //return false;
                }
            } while ($rc == CURLM_CALL_MULTI_PERFORM);

            $remaining = 0;
            while ($msg = curl_multi_info_read($mh, $remaining)) {
                
                $req = $this->findRequest($msg['handle']);
                $req->result = $msg['result'];
                $req->httpCode = curl_getinfo($msg['handle'], CURLINFO_HTTP_CODE);
                switch ($msg['result']) {
                case CURLE_OK:
                    $req->response = curl_multi_getcontent($msg['handle']);
                    curl_multi_remove_handle($mh, $msg['handle']);
                    break;
                default:
                    curl_multi_remove_handle($mh, $msg['handle']);
                    break;
                }
            }
            if ($active > 0) {
                $ready = curl_multi_select($mh, $maxWait);
            }
        } while ($active > 0);

        foreach ($this->reqs as $req) {
            g6Logger::log(LOG_DEBUG, "$req->uri: " . curl_error($req->ch));
            $req->resultStr = curlToError(curl_error($req->ch));
            curl_multi_remove_handle($mh, $req->ch);
            curl_close($req->ch);
        }
        curl_multi_close($mh);
        return true;
    }

    private function findRequest($ch) {

        foreach ($this->reqs as $req) {
            if ($req->ch == $ch) {
                return $req;
            }
        }
        return null;
    }
}

// helper function for building error responses to xml requests
function appendError(&$err, $ip, $str) {
    if ($err == null) {
        $err = array();
    }
    if ($ip != null) {
        $e->ip = (string) $ip;
    }
    $e->message = (string) $str;
    $err[] = $e;
    return $err;
}

// helper function to pretty print raw xml
function sendXML($xml) {
    header ("content-type: text/xml");
    echo niceXML($xml);
}

// helper function to pretty print raw xml
function niceXML($xml) {
    $dom = new DOMdocument();
    $dom->preserveWhiteSpace = false;
    $dom->formatOutput = true;
    $dom->loadXML($xml);
    return $dom->saveXML();
}


function generatePOST($url, $postData, &$message) {

    $maxWait = 5;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $maxWait);
    curl_setopt($ch, CURLOPT_TIMEOUT, $maxWait);
    curl_setopt($ch, CURLOPT_HTTPHEADER, Array('Expect: ', 'Content-type: text/xml'));
    $response = curl_exec($ch);
    if ($response == null) {
        $message = curlToError(curl_error($ch));
    }
    curl_close($ch);
    return $response;
}

function makeActionURL($ip, $action) {
    return "http://$ip/api/ServiceController/latest/$action";
}

function makeStateURL($ip) {
    return "http://$ip/api/ServiceController/latest/state";
}

function makeEventURL($ip) {
    return "http://$ip/api/ServiceController/latest/event";
}

function makePublishURL($channel) {
    return "http://127.0.0.1/publish?id=$channel";
}

function getMachineSignature($m) {

    $sigparts = $m->machineId . $m->imageId . $m->arch . $m->vendorType .
        $m->publicIP . $m->privateIP . $m->state . $m->bootTime .
        $m->tag . $m->apiType . $m->zone;
    return md5($sigparts);
}

function getConfigSignature($services) {

    $sigparts = "";
    foreach ($services as $service) {
        $sigparts .= getMachineSignature($service);
    }
    return md5($sigparts);
}

function makeStateResponse($cloud, $changed) {

    $nodeDbFile = "/var/opt/gear6/cache/node.db";

    $localMachine = $cloud->getMachine();
    $services = $cloud->getActiveMachines();
    
    $stateResponse->value = (int) $changed;
    $stateResponse->lastChecked = time();
    $stateResponse->lastCheckedString = date("r");
    $stateResponse->signature = getConfigSignature($services);
    $stateResponse->thisMachineId = $localMachine->machineId;
    $stateResponse->services = $services;
    return $stateResponse;
}

function backtrace($provideObject=false)
{
    foreach(debug_backtrace($provideObject) as $row) {
        $level =  basename($row['file']) . ":" . $row['line'] .
            " " . $row['class'] . "::" . $row['function'] . 
            "(";
        //  foreach($row['args'] as $a) {
        //          $level .= $a . ", ";
        //      }
        $level .= ")";
        //        foreach ($row as $name => $value) {
        //            $level .= "$name => $value   ";
        //        }
        g6Logger::log(LOG_DEBUG, $level);
    }    
}
?>
