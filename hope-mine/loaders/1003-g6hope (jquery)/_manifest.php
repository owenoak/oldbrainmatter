<?php
$scriptFiles = <<<END
// jQuery
../js/jquery.js

// leave these out until we're ready for them
//../js/flot/jquery.flot.js
//../js/flot/jquery.flot.stack-mod.js
//../js/flot/jquery.flot.crosshair.js
//../js/jquery.base64-mod.js
//../js/jquery.ba-bbq.js
//../js/md5.js


// jquery extensions
hope/jquery.hope.js
hope/jquery.hope-browser.js
hope/jquery.hope-cookie.js
hope/jquery.hope-date.js
hope/jquery.hope-element.js
hope/jquery.hope-number.js
hope/jquery.hope-string.js
hope/jquery.hope-types.js
hope/jquery.hope-xml.js

// base libraries
hope/Observable.js
hope/ListManager.js
hope/Selective.js
hope/Collectable.js
hope/Collection.js
hope/Class.js
hope/Controller.js
hope/Request.js
hope/MessageDictionary.js
hope/Timer.js
hope/Notifier.js
hope/Drawable.js
hope/Page.js


hope/widgets/GTip.js
hope/widgets/ClickMask.js
hope/widgets/ListViewer.js
hope/widgets/Menu.js
hope/widgets/HScroller.js
hope/widgets/Button.js
hope/widgets/TabBar.js
hope/widgets/Window.js
hope/widgets/Form.js
hope/widgets/DataTable.js
hope/widgets/Clippy.js
hope/widgets/Chart.js
hope/widgets/RangeSlider.js


// general gear6
statsproxy.js

// ServiceController module (required)
ServiceController/Service.js
ServiceController/ServiceController.js
ServiceController/ServiceController.api.js
ServiceController/serviceSelector.js
ServiceController/overview.js
ServiceController/AddServersForm.js
ServiceController/RenameServiceForm.js

// gear6 MemcacheServer module (optional)
Memcache/MemcacheServer.js
Memcache/MemcacheService.js
Memcache/MemcacheController.js
Memcache/Memcache.api.js

Memcache/MemcacheServiceView.js
Memcache/MemcachePage.js
Memcache/StatsPage.js
Memcache/TrafficPage.js
Memcache/serverMenu.js
Memcache/pageSelector.js
Memcache/statsPages.js
Memcache/trafficPages.js


test.js

END;

// list of .css files
$styleFiles = <<<END
statsproxy.css
//statsproxy-refactor.css
hope/hope.css
hope/Notifier.css
hope/widgets/GTip.css
hope/widgets/Button.css
hope/widgets/ListViewer.css
hope/widgets/Menu.css
hope/widgets/HScroller.css
hope/widgets/Window.css
hope/widgets/Form.css
hope/widgets/UsageGraph.css
hope/widgets/DataTable.css

ServiceController/ServiceController.css
Memcache/Memcache.css
END;


// list of template files (will be inlined into the page)
$htmlIncludes = <<<END
//includes/noscript.html
//includes/templates.html
//hope/widgets/RangeSlider.html
ServiceController/templates.html
Memcache/templates.html
END;

