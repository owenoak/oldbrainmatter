<html><head>

<script src='../cache/paint.js'/></script>
<?php
/*
$scripts= <<<END
dnb/dnb.js
dnb/util.js
dnb/Animation.js
dnb/ChildCollection.js
dnb/Math.js
Canvas.js
CanvasStyle.js
LayerDocument.js
Messenger.js
Shape.js
Bitmap.js
BitmapTextBox.js
Tool.js
Command.js
InteractionCanvas.js
Toolbar.js
ColorSpectrum.js
PieMenu.js
dojo/dojo_shim.js
dojo/dojo_html.js
dojo/lang_common.js
dojo/lang_array.js
dojo/math.js
dojo/gfx_color.js
dojo/gfx_hsl.js
dojo/gfx_hsv.js
END;
require_once ('_loadScripts.php');
*/
?>

<title>dynaPaint</title>
<script>
	if (!window.console || !window.console.time) {	window.console = {log:function(){}, time:function(){}} };
	console.time("page init");
	console.time("loading libs");
</script>



<script>
	console.timeEnd("loading libs");
</script>
<link rel='stylesheet' type='text/css' href='paint/YUI-reset.css'>
<link rel='stylesheet' type='text/css' href='paint/paint styles.css'>


<style type='text/css'>

* {
	font-family:Skia,Verdana;
}

#paintOuterTable {
	table-layout:fixed;
	position:absolute;
	left:0px;
	top:0px;
	right:0px;
	height:100%;
}


#paintCanvasCol		{	width:100%;		}
#paintControlsCol	{	width:238px;	}

#paintParentCell {
	height:100%;
}

#paintHeaderTable {
	width:100%;
	z-index:-1000;
	background-color:rgb(255,234,196);
	border-bottom:1px solid rgb(201,146,0);
}

#paintTitlebar {
	white-space:nowrap;
	font-size:20px;
	font-weight:bold;
	padding:2px 10px 2px 10px;
	width:200px;
}


/* status area for tool messages, etc */
#paintStatus {
	position:relative;
	font-size:15px;
	font-weight:bold;
	color:#666666;
	padding:5px 10px 2px 30px;
	white-space:nowrap;
	overflow:hidden;
}

#paintGridCell {
	padding:5px 10px 2px 10px;
}
#paintCopyrightCell {
	text-align:right;
	color:#666666;
	font-size:8px;
	padding:3px 5px 1px 10px;
}


#paintNotifier {
	display:none;
	position:absolute;
	left:30%;
	right:30%;
	top:30%;
	text-align:center;
	z-index:100000000;
	border:5px solid white;
	-moz-border-radius:20;
	background-color:black;
	color:white;
	font-family:Skia,Verdana;
	font-size:40px;
	padding:20px;
	opacity:.6;
}


/*
	main paint canvas
*/

#paintParentScroller {
	position:relative;
	width:100%;
	height:100%;
	overflow:auto;
}

#paintLayerParent {
	position:absolute;
	left:0;
	top:0;
	right:0;
	bottom:0;
	z-index:100;
}


.paintCanvas {
	position:absolute;
}


/*
	controls
*/

#paintControlsTable {
	width:100%;
	height:100%;
	table-layout:fixed;
	border-collapse:collapse;
	background-color:rgb(255,234,196);
	border-left:1px solid rgb(201,146,0);
}
#paintControlsTable td {
	text-align:center;
}
#paintToolsCol 		{	width:84px;	}
#paintSelectorCol 	{	width:150px;	}

#paintControlsCell {
	border-right:1px solid rgb(201,146,0);
}

#paintToolsTable {}
#paintToolsTable td {
	padding:2px 4px 2px 4px;
}

#paintSelectorTable {}


td#paintColorSpectrumCell{
	padding-bottom:10px;
}
#paintColorSpectrum {}

td#paintToolbarCell {
	padding-bottom:10px;
}

#paintToolbar {}
#appPieMenu {
	display:none;
}

#shapeMenu {}

/*  GENERICS FOR ITEMS */
.dnb-ColorSpectrum {
	position:absolute;
}

.dnbCanvas {
	position:absolute;
}

</style>
</head>
<body onload="console.timeEnd('page init')">

<!-- yeah, I still use tables to do layout: so sue me! -->
<table id='paintOuterTable'>
	<colgroup><col id='paintCanvasCol'><col id='paintControlsCol'></colgroup>
	<tr><td colspan=2>
		<table id='paintHeaderTable'><tr>
			<td id='paintTitlebar'>dynaPaint</td>
			<td width=100%><div id='paintStatus'>&nbsp;</div></td>
			<td id='paintGridCell'>
				<nobr>
					<input type='checkbox' id='debug'  onchange='debug(this.checked)'>
					<label for='debug' class='button'>debug</label>
					&nbsp;&nbsp;
					<input type='checkbox' id='showGrid'  onchange='showGrid(this.checked)'>
					<label for='showGrid' class='button'>Show grid</label>
				</nobr>
			</td>
			<td id='paintCopyrightCell'>
				<nobr>
					&copy; 2007 Matthew Owen Williams<br>All rights reserved
				</nobr>
			</td>
		</tr></table>
	</td></tr>
	<tr><td id='paintParentCell'>
			<div id='paintParentScroller'>
				<div id='paintLayerParent'></div>
			</div>
		</td>
		<td>
<!--
			<table id='paintControlsTable'>
				<colgroup><col id='paintToolsCol'><col id='paintSelectorCol'></colgroup>
				<tr><td id='paintControlsCell'>
						<table id='paintToolsTable'>
							<tr><td id='paintToolbarCell'></td></tr>
							<tr><td id='paintColorSpectrumCell'></td></tr>
							<tr><td>
								<input type='checkbox' id='showGrid'  onchange='showGrid(this.checked)'>
								<label for='showGrid' class='button'>Show grid</label>
							</td></tr>
							<tr><td>
								<button onclick='ic.clear()' class='button' style='width:100%;'>Clear</button>
							</td></tr>
							<tr><td>
								<button onclick='ic.redraw();' class='button' style='width:100%;'>Redraw</button>
							</td></tr>

						</table>
					</td>
					<td>
						<table id='paintSelectorTable'>
							<tr><td></td></tr>
						</table>
					</td>
				</tr>
			</table>
-->
		</td>
	</tr>
</table>

<!-- element to show notifications -->
<div id='paintNotifier' oncontextmenu='dnb.fadeOut(this);return false'>Loading dynaPaint...</div>


<script src='paint/appPieMenu.js'></script>
<script language='javascript'>
console.time("initializing page elements");


var browserIsCompatible = navigator.userAgent.indexOf("Firefox/2") > -1;

function debug(checked) {
	dojo.io.cookie.set("debug", (checked ? "true" : "false"));
}
var debugging = dojo.io.cookie.get("debug") == "true";

function showGrid(checked) {
	dojo.io.cookie.set("showGrid", (checked ? "true" : "false"));
	controller.toggleGrid(checked);
}
var showingGrid = dojo.io.cookie.get("showGrid") == "true";

if (browserIsCompatible) {
	var controller = new dnb.LayerDocument({
		layerContainer 		: "paintLayerParent",
		layerScroller		: "paintParentScroller",
		showGrid			: dojo.io.cookie.get("showGrid") == "true",
		contextMenu			: appPieMenu,
		showGrid			: showingGrid
	});

	controller.draw();
	var canvas = controller.focusedChild(),
		context = canvas.context,
		grid = controller.gridLayer,
		interactor = controller.interactor
	;
canvas.loadUrl("images/mojo jojo.png");
//	canvas.addChild(new dnb.Bitmap({url:"images/mojo jojo.jpg"}));
//controller.magnify(2);

}





console.timeEnd("initializing page elements");

var startupNotice = browserIsCompatible 
					? "Right-click to see a menu of tools and actions."
					: "Sorry, this initial implementation only works in <a href='http://getfirefox.com'>Firefox 2<\/a>."
//controller.showNotice(startupNotice);
controller.showStatus(startupNotice);


</script>


</body>
</html>
