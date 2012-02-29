
/* Copy-to-clipboard widget */
jQuery.extend({
	Clippy : {
		getHTML : function(textToCopy, bgColor) {
			if (!$.browser.hasFlash) return "";
			var template = ($.browser.msie ? $.Clippy.MSIE_TEMPLATE : $.Clippy.TEMPLATE);
			return $.string.interpolate(template, {text:textToCopy, bgColor:bgColor});
		},
		
		
		MSIE_TEMPLATE : 
			"<object classid='clsid:d27cdb6e-ae6d-11cf-96b8-444553540000' style='vertical-align:bottom' width='14' height='14'>\
				<param name='movie' value='Clippy.swf'/>\
				<param name='allowScriptAccess' value='always' />\
				<param name='quality' value='high' />\
				<param name='scale' value='noscale' />\
				<param name='FlashVars' value='text=#{text}'/>\
				<param name='bgcolor' value='#{bgColor}'/>\
				<param name='wmode' value='transparent'/>\
			</object>",
		
		TEMPLATE : 
				"<embed src='Clippy.swf'\
					style='vertical-align:bottom'\
					width='14'\
					height='14'\
					scale='noscale'\
					allowScriptAccess='always'\
					type='application/x-shockwave-flash'\
					pluginspage='http://www.macromedia.com/go/getflashplayer'\
					FlashVars='text=#{text}'\
					wmode='transparent'\
					bgcolor='#{bgColor}'\
				/>"
	}
});

