#! /usr/bin/php
<?php

//MOW: prefix for curl URLs
$requestUrlPrefix = "http://localhost/";
//MOW: try to get the server name from the HTTP_REFERER header
$referrer = $_SERVER['HTTP_REFERER'];
if ($referrer) {
	$requestUrlPrefix = preg_filter("/^(http:\/\/[^\/]*\/)(.*)/", "$1", $referrer);
}

//MOW: debugging flag -- turns comments off if false
$showComments = true;

$g6_home = is_string(getenv("GEAR6_HOME")) ? getenv("GEAR6_HOME") : "/opt/gear6";
set_include_path(get_include_path() . PATH_SEPARATOR . $g6_home . "/lib/php");
require_once('Common.php');

g6Logger::useSyslog(true);
g6Logger::setLogLevel(LOG_DEBUG);

class result {
    public $code = "";
    public $data = "";
}

// insert an XML comment for debugging
function comment($s) {
	global $showComments;
    // uncomment for debugging inserted into returned xml
    if ($showComments) echo "\n<!-- $s -->\n";
}

// issue an error response
function errorResponse($reason) {
    echo "<response>\n"
    	."  <result>ERROR</result>\n"
    	."  <data>\n"
    	."    <error>\n"
    	."      <message>$reason</message>\n"
    	."    </error>\n"
    	."  </data>\n"
    	."</response>\n";
}

// trim "useless" stuff off a single response to make it ready to be 
// inserted into a stacked response

function snipXML($s) {
    $patterns = array (
        "/\s*<\?xml.*\?>\s*/",
        "/\s*<response>\s*/",           // we want to add our own <response> with index attr
        "/\s*<\/response>\s*/");
    $repl = array( "", "", "");
    return preg_replace($patterns, $repl, $s);
}

// Deal with the post body.  Read it in, convert to an XML object,
// extract the order and onerror attributes, and process the requests
// in serial or parallel depending on $order.  Error if neither
// parallel or serial.

function handlePost() {
    echo "content-type: application/xml\n\n";
    echo "<?xml version='1.0' encoding='utf-8'?>";

    if (preg_match("/^Apache/", $_SERVER["SERVER_SOFTWARE"])) {
        comment ("Apache!");
        $requestStr = file_get_contents('php://stdin');
    } else {
        comment ("NOT apache");
        $requestStr = file_get_contents('php://input');
    }
    comment( "requestStr = \n$requestStr\n");
    $requests = @simplexml_load_string($requestStr);
    if ($requests) {
        // var_dump($requests);
        $reqAttrs = $requests->attributes();
        $order   = $reqAttrs['order'];
        $onerror = $reqAttrs['onerror'];
        comment("  order   = $order");
        comment("  onerror = $onerror");
        switch ($order) {
        case 'serial':
            handleSerialRequests($requests, $onerror);
            break;
        case 'parallel':
            handleParallelRequests($requests, $onerror);
            break;
        default:
            errorResponse("Bad Execution Order ($order)");
            return;
        }
    } else {
        errorResponse("Invalid XML request");
    }
}

// Deal with parallel requests.
function handleParallelRequests($requests, $onerror) {
    $remops = new RemoteOps();
    $n = 0;
    // add each request to the remoteOps object
    foreach ($requests->request as $r) {
        $u->uri = $requestUrlPrefix . $r->url;
        comment("added $u->uri");
        $u->postData = "";
        $u->data = $r->data;
        $remops->addRequest($u);
        $n++;
    }
    comment("executing $n ops in parallel");
    // execute!  execute! execute!
    $remops->execute(5);
    // var_dump($remops);
    // process the results
    echo "<responses>\n";
    foreach ($remops->getResults() as $res) {
        echo "  <response>\n";
        // comment($res->response);
        $OK = false;
        if (preg_match("/^<!DOCTYPE html/", $res->response)) $OK = false;
        if (preg_match("/.*<result>OK<\/result>.*/", $res->response)) $OK = true;
        if ($OK) {
            echo snipXML($res->response);
        } else {
            echo ("  <result>ERROR</result>\n"
                  ."  <data>\n"
                  ."    <error>\n"
                  ."      <message>error-not-handled</message>\n"
                  ."    </error>\n"
                  ."  </data>");
        }
        echo "  </response>\n";
    }
    echo "</responses>\n";
    // send back the reply
}

// Deal with a single request.
function doOneRequest($url, $data) {
    global $requestUrlPrefix;
    
    $res = new result;
    $ch = curl_init();

    $fullUrl = "$requestUrlPrefix$url";
    comment("Processing request: curling to:  $fullUrl");
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
    curl_setopt($ch, CURLOPT_HEADER, 0);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    $mc_str = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    comment("CODE =  $code");
    curl_close($ch);
    $isHTML = preg_match("/^<!DOCTYPE html/", $mc_str);
    $isXML = preg_match("/<\?xml/", $mc_str);
    if ($isHTML) comment("is HTML");
    if ($isXML)  comment("is XML");
    if ($code == 200) {
        $res->code = "OK";
        if ($isXML) {
            $res->data = $mc_str;
        } else if ($isHTML) {
            //NOTE:  we should perhaps CDATA the HTML as well?
            $res->data = $mc_str;
        } else {
            $res->data = "<data><![CDATA[\n$mc_str\n]]></data>";
        }
        return $res;
    } else {
        $res->code = "ERROR";
        $res->data = "<result>ERROR</result>\n  <data></data>";
    }
    return $res;
}

// Deal with serial requests.  Step through each request, process it,
// and assemble the responses into an XML response.
// TODO handle onerror
function handleSerialRequests($requests, $onerror) {
    $n = 0;
    $errored = false;

    // API SPEC: For serial stacked requests:
    //    * The server MUST return a single <response> element for every
    //      <request> element in the request.
    //    * The server MUST return the <response> elements in the same
    //      order as in the original <requests>.
    //    * If the #{onerror} value is "stop", the server MUST NOT
    //      process <request> elements after the failed <request>.
    //      However, it MUST still return a <response> element for 
    //      each <request>.
    //    * If the #{onerror} value is "continue", the server MUST
    //      continue to process <request> elements after the failed
    //      <request> as normal.

    echo "\n<responses>\n";
    foreach ($requests->request as $r) {
        comment("request $n, errored = $errored, onerror = $onerror");
        $attrCnt = count($r->attributes()) ;
        $attrs = $r->attributes();
        $index = $attrs['index'];
        echo "  <response index='$index'>\n";
        echo "  <url><![CDATA[$r->url]]></url>\n";
        // DO IT! if we haven't had an error yet
        if ($errored && $onerror != "continue") {
            // we've had an error and onerror is not "continue";
            //  skip the rest but send not-handled responses
            echo "  <result>ERROR</result>\n";
            echo "  <data>\n"
                ."    <error>\n"
                ."      <message>error-not-handled</message>\n"
                ."    </error>\n"
                ."  </data>\n";
        } else {
            $result = doOneRequest($r->url, $r->data);
            $s = snipXML($result->data);
            echo "  $s\n";
        }
        echo "  </response>\n";
        if ($result->code != "OK") {
            comment("errored set to true");
            $errored = true;
            if ($onerror == "stop") {
                // stop means do not continue.  Derrr.
                break;
            }
        }
        $n = $n + 1;
    }
    echo "</responses>\n";
}

switch($_SERVER['REQUEST_METHOD']) {
 case 'POST':
     handlePOST();
     break;
 default:
     header("HTTP/1.0 400 Bad Request");
}
?>
