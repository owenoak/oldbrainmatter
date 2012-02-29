<?php
/*
header("Content-type: image/png");
$string = $_GET['text'];
$im	 = imagecreatefrompng("test.png");

$orange = imagecolorallocate($im, 220, 210, 60);
$px	 = (imagesx($im) - 7.5 * strlen($string)) / 2;
imagestring($im, 3, $px, 9, $string, $orange);

imagepng($im);
imagedestroy($im);
*/

	header("Content-type: image/png");

	$size = getimagesize("test.png");
	$im = imagecreatefrompng("test.png");

	// Convert the Image to PNG-24
	$im_tc = imagecreatetruecolor($size[0],$size[1]);
	imagecopy($im_tc,$im,0,0,0,0,$size[0],$size[1]);
/*
	imagedestroy($im);
  
	//Now do what ever you want, all alpha-operation do work
	$color = imagecolorallocatealpha ($im_tc,255,255,255,75);
	imagefilledellipse ($im_tc,10,10,6,4,$color);

	//And now convert it back to PNG-8
	$im_result = imagecreate($size[0],$size[1]);
	imagecopy($im_result,$im_tc,0,0,0,0,$size[0],$size[1]);
	imagedestroy($im_tc);

	imagepng($im_tc,"test2.png");	 
*/  
	//And save it
	imagepng($im_tc);	 
?> 