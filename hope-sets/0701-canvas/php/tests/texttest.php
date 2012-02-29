<?php

header("Content-type: image/png");

$im  = imagecreatetruecolor(350, 30); /* Create a blank image */
$bgc = imagecolorallocate($im, 255, 255, 255);
$tc  = imagecolorallocate($im, 0, 128, 0);
imagefilledrectangle($im, 0, 0, 350, 30, $bgc);

imagestring($im, 3, 5, 5, "Error loading foobar", $tc);

imagepng($im);
imagedestroy($im);

?> 