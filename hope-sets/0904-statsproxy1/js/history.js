/*----------------------------------------------------------------------------\
|                             Hash Listener 1.0                               |
|-----------------------------------------------------------------------------|
|                         Created by Erik Arvidsson                           |
|                  (http://webfx.eae.net/contact.html#erik)                   |
|                      For WebFX (http://webfx.eae.net/)                      |
|-----------------------------------------------------------------------------|
|   Basic object to allow updating the hash part of the document location.    |
|-----------------------------------------------------------------------------|
|                  Copyright (c) 1998 - 2005 Erik Arvidsson                   |
|-----------------------------------------------------------------------------|
| Basic object to allow updating the hash part of the document location.      |
| Mozilla always adds an entry to the history but for IE we add an optional   |
| flag whether to add an entry to the history and if this is set an iframe is |
| used to support this behavior (this is on by default).                      |
|                                                                             |
| When the hash value changes onHashChanged is called. Override this to do    |
| your own callbacks.                                                         |
|                                                                             |
| Usage: Include script                                                       |
|        Override onHashChanged: hashListener.onHashChanged = fn              |
|                                                                             |
| Known issues: Known to not work with Opera                                  |
|               Not tested with KHTML/Safari                                  |
|               Might interfere with other iframe based loading               |
|- ---------------------------------------------------------------------------|
| This software is provided "as is", without warranty of any kind, express or |
| implied, including  but not limited  to the warranties of  merchantability, |
| fitness for a particular purpose and noninfringement. In no event shall the |
| authors or  copyright  holders be  liable for any claim,  damages or  other |
| liability, whether  in an  action of  contract, tort  or otherwise, arising |
| from,  out of  or in  connection with  the software or  the  use  or  other |
| dealings in the software.                                                   |
| - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - |
| ... removed standard license part of header for now...                      |
|-----------------------------------------------------------------------------|
| 2005-05-15 | First version                                                  |
|-----------------------------------------------------------------------------|
| Created 2005-05-15 | All changes are in the log above. | Updated 2005-05-15 |
\----------------------------------------------------------------------------*/

var hashListener = {
	ie:		/MSIE/.test(navigator.userAgent),
	ieSupportBack:	true,
	hash:	document.location.hash,
	check:	function () {
		var h = document.location.hash;
		if (h != this.hash) {
			this.hash = h;
			this.onHashChanged();
		}
	},
	init:	function () {

		// for IE we need the iframe state trick
		if (this.ie && this.ieSupportBack) {
			var frame = document.createElement("iframe");
			frame.id = "state-frame";
			frame.style.display = "none";
			document.body.appendChild(frame);
			this.writeFrame("");
		}

		var self = this;

		// IE
		if ("onpropertychange" in document && "attachEvent" in document) {
			document.attachEvent("onpropertychange", function () {
				if (event.propertyName == "location") {
					self.check();
				}
			});
		}
		// poll for changes of the hash
		window.setInterval(function () { self.check() }, 50);
	},
	setHash: function (s) {
		// Mozilla always adds an entry to the history
		if (this.ie && this.ieSupportBack) {
			this.writeFrame(s);
		}
		document.location.hash = s;
	},
	getHash: function () {
		return document.location.hash;
	},
	writeFrame:	function (s) {
		var f = document.getElementById("state-frame");
		var d = f.contentDocument || f.contentWindow.document;
		d.open();
		d.write("<script>window._hash = '" + s + "'; window.onload = parent.hashListener.syncHash;<\/script>");
		d.close();
	},
	syncHash:	function () {
		var s = this._hash;
		if (s != document.location.hash) {
			document.location.hash = s;
		}
	},
	onHashChanged:	function () {}
};
