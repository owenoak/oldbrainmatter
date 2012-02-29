<?php
	// TODO: make sure these names dont' have ".." in them which allows screwy access...
	
	$userName 		= ($_POST["userName"] ? $_POST["userName"] : "testuser");
echo "userName: '$userName'\n";
	$pathToUserDir	= "../";
	$userDir		= "../users/$userName/";
echo "dir: '$userDir'\n";
	$fileName 		= $_POST["file"] ? str_replace(" ", "+", $_POST["file"]) : "image";
echo "fileName: '$fileName'\n";

	$data = $_POST["data"];
	// HACK: php on browsertricks encodes all " and ' as \" and \'
	$data = str_replace("\\", "", $data);

	// replace userDir and fileName in the data
	$data = str_replace("{userDir}", $userDir, $data);
	$data = str_replace("{fileName}", $fileName, $data);

	$dataFilePath = "$pathToUserDir$userDir$fileName.js";
	$dataFile = fopen($dataFilePath, "w");
	fwrite($dataFile, $data);
	fclose($dataFile);


	$contents = $_POST["contents"];
	$contents = str_replace("*", "+", $contents);
	$contents = str_replace("-", "/", $contents);
	// file name for contents is encoded in the contents up to the ":"
	$contentsFileName = substr($contents, 0, strpos($contents, ":"));
echo "contentsFileName: '$contentsFileName'\n";
	// eat the base 64 header
	$contents = substr($contents, strpos($contents, ","));
	$contentsPath = "$pathToUserDir$userDir$fileName.$contentsFileName.png";
echo "contentsPath: '$contentsPath'\n";
	$contentsFile = fopen($contentsPath, "w");
	fwrite($contentsFile, base64_decode($contents));
	fclose($contentsFile);

//	$chmodResults = chmod($dataFile, 0666);
//	echo "chmod: $chmodResults"

//echo $data;
	echo "$fileName saved.";
?>