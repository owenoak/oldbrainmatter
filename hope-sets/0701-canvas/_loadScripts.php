<?php

/* Load a bunch of scripts, defined in a $scripts variable, return-delimited, eg:
	$scripts= <<<END
	dnb/dnb.js
	dnb/util.js
	...
	END;

If runnning in debug mode, output individual script files to ease debugging.
	Otherwise, jam 'em all together for speed, and cache that (with a stat on each file) to minimize server work.
	
	Turn debugging on by having a URL param "debug=true" or set a cookie "debug" to "true".
	The current debug state will be remembered in a cookie for the next load.
	Setting URL param "debug=false" will always turn debugging OFF.


	TODO: 
		* smarter comment stripper
		* cache headers for above?
	

*/

$scriptFiles = explode("\n",$scripts);
$count = count($scriptFiles);


/* 
*/

$uri = "paint.js";

$debug = $_GET["debug"] == "true" || ($_GET["debug"] != "false" && $_COOKIE["debug"] == "true");

if ($debug) {
	setcookie("debug","true");
	for ($i = 0; $i < $count; $i++) {
		echo "<script src='$scriptFiles[$i]'></script>\n";
	}
} else {
	setcookie("debug","false");


	$cacheFileName = "../cache/$uri";
	$cacheStat = stat($cacheFileName);
	$needToCreate = ($cacheStat == null);
	if (!$needToCreate) {
		$cacheStat = $cacheStat['mtime'];
		foreach ($scriptFiles as $file) {
			$fileStat = stat($file);
			if ($fileStat && $fileStat['mtime'] > $cacheStat) {
				echo "\n<!-- '$file' is newer than cache -->";
				$needToCreate = 1;
				break;
			}
		}
	}

	if ($needToCreate == 1) {
		echo("\n<!-- updating cache file... -->");
		$cacheFile = fopen($cacheFileName, "w");
		foreach ($scriptFiles as $file) {
			fwrite($cacheFile, "\n\n\n/*******\n *******\n *******   FILE: $file\n *******\n *******/\n");
			$contents = file_get_contents($file) or die("</script><br><b><font color=red>Error loading scripts:</font> file '$file' not found.</b>");
			$contents = preg_replace("/\/\/.*$/m", "\n", $contents);
			$contents = preg_replace("/(\s*\n+)+/", "\n", $contents);
			fwrite($cacheFile, $contents);
	//		echo $contents;
	//		@readfile($file) or die("</script><br><b><font color=red>Error loading scripts:</font> file '$file' not found.</b>");
		}
		fclose($cacheFile);
	}

	echo "<script language='javascript' src='$cacheFileName'></script>";
}

?>
