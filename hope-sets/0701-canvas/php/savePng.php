<?php
	$dataurl 	= str_replace(" ", "+", $_POST["data"]);
	$fileName 	= $_POST["file"] ? str_replace(" ", "+", $_POST["file"]) : "image.png";

	$data = substr($dataurl, strpos($dataurl, ","));
	$file = fopen($fileName, "w");

	fwrite($file, base64_decode($data));
	fclose($file);	
echo "$fileName saved.";
?>