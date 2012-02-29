var tagMap = {
	requestdata : "Request Data:",
	onsuccess	: "Success Reply:",
	onerror		: "Error Reply:",
	example		: "eg:"
}

// convert all instances of a tag to pre-d text, converting < and >, spacing, etc.
function preify(tagName) {
	var tags = $(tagName);
	tags.each(function(index, tag) {
		// skip tags that don't want to be munged
		if (tag.getAttribute("munge") == "false") return;
		
		var html = tag.value,
			type = tag.className
		;
		if (!html || (/^[\s\r\n]*$/g).test(html)) {
			html = "<div class='empty'>(empty)<\/div>";
			
		} else {
		
			// normalize the initial indentation to two tabs
			var lines = html.split(/[\r\n]/);
			while (/^\s*$/.test(lines[0])) {
				lines.splice(0,1);
				if (lines.length == 0) return;
			}
			
			// comments
			html = html.replace(/<!--([^>]*)-->/g,"%%span class='comment'>&lt;--$1-->%%/span>");

			// tags
			html = html.replace(/<([^>]*)>/g, "%%span class='tag'>&lt;$1&gt;%%/span>");

			// variables
			html = html.replace(/#{([^}]*)}/g,"%%span class='variable'>#{$1}%%/span>");

			// links within the doc set
			html = html.replace(/\/api\/docs\/([^\s]*)/g, "%%a href='$1'>/api/docs/$1%%/a>");

			// expand tabs
			html = html.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
			
			// expand newlines
			html = html.replace(/\n/g, "<br>");

			// replace bullets with "<" 
			html = html.replace(/%%/g, "<");
		}
		$(tag).replaceWith("<label>"+tagMap[type]+"</label><div class='xml'>"+html+"</div>");
	});
}

// change textareas to nicely formatted XML
function parseTags() {
	preify("textarea");
	$(".action").show();
}		

$(window).load(parseTags);



