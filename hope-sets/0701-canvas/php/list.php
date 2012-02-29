<table>
<?php
	$dir	= "../images/" . ($_POST["dir"] ? str_replace(" ", "+", $_POST["dir"]) :
								($_GET["dir"] ? str_replace(" ", "+", $_GET["dir"]) : ""));
	//echo $dir;
/* TODO: restrict this to reasonable directories */

	$files 	= scandir($dir);
	foreach ($files as $file) {
		echo "<tr><td>$file</td><td><img src='$dir/$file'></td></tr>";	
	}
?>

</table>