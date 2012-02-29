<? require_once ("hope/_loader.php"); ?>
<!DOCTYPE html>
<!--
 Copyright (c) 2009-2010, Gear Six, Inc.	Subject to a BSD-style
 license whose text is available at /license.txt on this machine
-->
<html class='honeycomb'>
<head>
	<title>Gear6 Memcached</title>
<? loadStyles() ?>
<? loadScripts() ?>
<!-- load IE canvas shim library for "flot" if in IE -->
<!--[if IE]><script src="js/flot/excanvas.min.js"></script><![endif]-->
</head>
<body class='loggedOut cantCreate cantModify inCloudMode replicationOff hasNoStorage cantChangeRole'>

<div id='top'><table cellspacing=0 cellpadding=0><tr>
	<td><div id='logo'></div></td>
	<td><div id='appname'></div></td>
	<td style='width:100%'><div id='serviceSelector'></div></td>
	<td>
		<!-- REFACTOR: this doesn't go here -->
		<div class='Button tight dark MenuButton' 
			onclick='$.Menus.memcacheServerMenu.showNear(this)'>
			<span class='selectedMemcacheServer Title'></span>
			<div class='Arrow'></div>
		</div>
	</td>
	<td id='supportButtonContainer'>
		<div id='supportButton' class='Button dark tight ifCloud' message='UI.support.button'
			onclick='SP.showSupportPage()'></div>
	</td>
	<td id='roleMenuContainer'>
		<div id='roleMenuButton' class='Button dark tight MenuButton ifCanChangeRole ifCloud'
			onmousedown='$.Menus.roleMenu.show(event, this)'>
				<span class='Title' message='auth.logout.title'></span>
				<div class='Arrow'></div>
		</div>
	</td>
	<td id='logOutContainer'>
		<div id='role' class='Button dark tight ifLoggedIn ifCanChangeRole ifCloud'
			onmousedown='SP.logOut()'	message='auth.logout.title'></div>
	</td>
	</tr></table>
</div><!-- end top -->

<div id='main'><!-- 'main' contains the main UI elements -->
	<!-- serviceDisplay:	holds all of the serviceViews -->
	<div id='overview' class='ifLoggedIn'></div>
	<!-- serviceDisplay -->

	<!-- stats-and-graphs views -->
	<div id='pageContainer' class='ifLoggedIn'>
		<table cellspacing=0 cellpadding=0 id='statsDisplayTable'><tr>
			<!-- left column: holds the menu -->
			<td id='leftColumnContainer'>
				<div id='leftColumn'></div><!-- leftColumn -->
			</td>
			
			<!-- right column: holds the stats table or graph -->
			<td id='rightColumnContainer'>
				<div id='rightColumn'></div><!-- end rightColumn -->
			</td>
		</tr></table>
	</div><!-- end stats -->
</div><!-- end main -->

<!-- bottom row -->
<div id='bottom' class='ifLoggedIn'>
	<table width='100%' cellspacing=0 cellpadding=0><tr>
		<td id='refreshMenuContainer'>
			<div id='refreshMenuButton' class='Button dark tight MenuButton' 
				onmousedown='$.Menus.refreshMenu.showNear(this)'>
					<div class='Title'></div>
					<div class='Arrow'></div>
			</div>
		</td>
		<td id='refreshContainer'>
			<div id='refreshNow' class='Button dark tight' onclick='javascript:SP.refresh()' message='UI.refreshNow'><!-- Refresh Now --></div>
		</td>
		<td id='lastRefreshContainer'><span class='label' message='UI.lastRefresh'><!-- Last refresh --></span>
			<span id='time' class='value'><!-- timestamp --></span>
		</td>
		<td id='acknowledgementsContainer'>
			<a id='acknowledgements' href='acknowledgements.html' message='UI.acknowledgements'>
				<!-- Acknowledgements -->
			</a>
		</td>
		<td id='addToOverviewContainer' class='ifCanModify ifCloud'>
			<div id='addToOverviewButton' class='Button dark tight' message='UI.addToOverview.button'
				onclick='SP.onAddToOverviewClick()'></div>
		</td>
	</tr></table>
</div><!-- end bottom -->

<div class='dynamicIncludes'>
	<? loadHtmlIncludes() ?>
</div>
<script>
	$.string.getPageTemplates();
	StatsProxy.onLoad();
</script>
</body>
</html>
