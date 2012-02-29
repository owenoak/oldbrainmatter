<?php

/* Load a bunch of scripts, css files or inlined HTML snippets,
	defined in the $mainfest file.

If runnning in debug mode, output individual files to ease debugging.
	Otherwise, jam 'em all together for speed, and caches to minimize server work.
	
	Turn debugging on by having a URL param "debug=true" or set a cookie "debug" to "true".
	The current debug state will be remembered in a cookie for the next load.
	Setting URL param "debug=false" will always turn debugging OFF.

	TODO: 
		* smarter comment stripper ?
		* convert to ES5 manifest format and do the right thing based on the file extension?

*/

// where cache files live
$cacheDir = "_cache";

// where does the manifest file live?
$manifest = "_manifest.php";

// cache files
$scriptCacheFile = "$cacheDir/scripts.js";
$styleCacheFile = "$cacheDir/styles.css";


// debug either as a query parameter or a cookie
$debug = $_GET["debug"] == "true" || ($_GET["debug"] != "false" && $_COOKIE["debug"] == "true");

// HACK
$debug = true;



// Load the manifest.
require_once($manifest);


// write the debug state out in a cookie for next time if it has changed
if ($debug != $_COOKIE["debug"]) {
	if ($debug) {
		setcookie("debug","true");
	} else {
		setcookie("debug","false");
	}
}

// load scripts
function loadScripts() {
	global $scriptFiles, $scriptCacheFile;
	loadAsLinks($scriptFiles, 
				$scriptCacheFile, 
				"<script type='text/javascript' src='%s'></script>\n", 
				"\n\n/* loaded from: %s */\n\n", 
				1);
}

// load css files
function loadStyles() {
	global $styleFiles, $styleCacheFile;
	loadAsLinks($styleFiles, 
				$styleCacheFile, 
				"<link type='text/css' rel='stylesheet' href='%s'>", 
				"\n\n/* loaded from: %s */\n\n", 
				false);
}

// load html includes
function loadHtmlIncludes() {
	global $htmlIncludes;
	loadInline($htmlIncludes, "\n\n<!-- loaded from: %s -->\n\n", 1);
}


// Load a list of files by linking to them.
//	if $debug is true, we write a separate link tag for each file
//	if $debug is false, we jam all of the files together and cache it, 
//		then linked to the cached file.
function loadAsLinks($files, $cacheFile, $tagTemplate, $delimiterTemplate, $strip) {
	global $debug;
	
	$files = cleanArray(explode("\n",$files));

	if ($debug) {
		foreach ($files as $file) {
			echo (sprintf($tagTemplate, $file));
		}
	} else {
		$cacheStat = stat($cacheFile);
		$needToCreate = ($cacheStat == null);
		if (!$needToCreate) {
			$cacheStat = $cacheStat['mtime'];
			foreach ($files as $file) {
				$fileStat = stat($file);
				if ($fileStat && $fileStat['mtime'] > $cacheStat) {
					//echo "\n<!-- '$file' is newer than cache -->";
					$needToCreate = 1;
					break;
				}
			}
		}
	
		if ($needToCreate == 1) {
//			echo("\n<!-- updating cache file... -->");
			$cacheFile = fopen($cacheFile, "w");
			foreach ($files as $file) {
				fwrite($cacheFile, sprintf($delimiterTemplate, $file));
				$contents = file_get_contents($file) 
					or die("<p style='color:red'>Error: file '$file' not found.</p>");
				if ($strip) {
					$contents = preg_replace("/\/\/.*$/m", "\n", $contents);
					$contents = preg_replace("/(\s*\n+)+/", "\n", $contents);
				}
				fwrite($cacheFile, $contents);
			}
			fclose($cacheFile);
		}
	
		echo sprintf($tagTemplate, $file);
	}
}


// Load a list of files by inlining in the page.
//	Doesn't do any caching.
function loadInline($files, $delimiterTemplate) {
	$files = cleanArray(explode("\n",$files));

	foreach ($files as $file) {
		$contents = file_get_contents($file) 
			or die("<p style='color:red'>Error: file '$file' not found.</p>");
		echo(sprintf($delimiterTemplate, $file));
		echo($contents);
	}
}



function cleanArray($array) {
	// remove comments and blankLines
	for ($i = count($array); $i >= 0 ; $i--) {
		$line = trim($array[$i]);
		if ($line == "" || substr($line, 0, 2) == "//") {
			array_splice($array, $i, 1);
		} else {
			$array[$i] = $line;
		}
	}
	return $array;
}

?>
