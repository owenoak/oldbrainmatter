<?php
	$dir	= "../../users/erte/" . ($_POST["dir"] ? str_replace(" ", "+", $_POST["dir"]) :
									($_GET["dir"] ? str_replace(" ", "+", $_GET["dir"]) : 
									"20s/"));
	//echo $dir;
/* TODO: restrict this to reasonable directories */




	$files 	= scandir($dir);
	foreach ($files as $file) {
		echo "<img src='$dir/$file'>\n";	
	}
?>
