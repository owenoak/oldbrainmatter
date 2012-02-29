
//
//	GTip (short for "ghetto tooltip")
//
//		Automatically show a super-simple tooltip for any element which has a 'tooltip' attribute.
//		Allows you to do ghetto formatting of the tip:
//			"a\nb" 		 	== a<br>b	(where "\n" == two characters: "\" + "n")
//			"{foo}"			== <b>foo</b>
//			"{_foo_}"			== <i>foo</i>
//			"[[a|b][a|b]]"	== <table><tr><td class='col1'>a</td><td class='col2'>b</td></tr>...
//
//	To style, edit css for the "#GTip".
//	Enabled automatically by call to "jQuery.GTip.startWatchingBody()" below.
//
jQuery.extend({
	GTip : {
		checkDelay : 400,
		
		startWatchingBody : function() {
			var body = $("body");
			body.bind("mouseover", $.GTip.watchHandler);
			body.bind("mouseout", $.GTip.hide);
		},
		
		stopWatchingBody : function() {
			var body = $("body");
			body.unbind("mouseover", $.GTip.watchHandler);
			body.unbind("mouseout", $.GTip.hide);
		},
		
		// handler for the watch-for-tip event
		// "this" is the body element
		watchHandler : function(event) {
			var target = $(event.target), tip;
			if (! (tip = target.attr("tooltip"))) {
				target = target.parents("[tooltip]");
				tip = target.attr("tooltip");
			}
			if (!tip) return true;
			return $.GTip.check(event, target, tip);
		},
		
		check : function(event, target, tip) {
			$.GTip.stopCheck();
			$.GTip._checkTimer = setTimeout(function() {
				$.GTip.show(target, tip, event.pageX);
			}, $.GTip.checkDelay);
		},
		
		stopCheck : function() {
			clearTimeout($.GTip._checkTimer);
			delete $.GTip._checkTimer;
		},
		
		// show the tip near the target element, centered under the mouse
		show : function(target, tip, mouseX) {
			this.stopCheck();

			// apply formatting to the tip
			var formatted = this.format(tip);
			if (!this._element) this.draw();

			// set the css class of the outer tip element to the 'tipclass' of the display element
			// TODO: get the css class of the target and set a 'targetclass' attribute on the element
			//			and do styling from that, so we can style automatically?
			var tipClass = target.attr("tipclass");
			if (tipClass) 	this._element.attr("class", tipClass);
			else			this._element.removeAttr("class");
			
			var targetClass = target.attr("class");
			this._element.attr("targetclass", targetClass);


			this._body.html(formatted);
			this._element.positionNear(target, mouseX).moveToTop().show();
		},
		
		// do out ghetto formatting of the tooltip contents
		format : function(tip) {
			tip = tip.replace(/\\n/g,"<br/>");
			var tableMatch = tip.match(/\[(.*)\]/);
			if (tableMatch) {
				var fullTableExpression = tableMatch[0],
					rows = tableMatch[1].split("]["),
					table = "<table>"
				;
				for (var i = 0, row; i < rows.length; i++) {
					row = rows[i];
					if (!row) continue;
					if (row.charAt(0) == "[") row = row.substr(1);
					if (row.charAt(row.length-1) == "]") row = row.substr(0, row.length-1);
					table += "<tr>";
					row = row.split("|");
					for (var j = 0, col; j < row.length; j++) {
						table += "<td class='col"+(j+1)+"'>"+row[j]+"</td>";
					}
					table += "</tr>";
				}
				table += "</table>";
				tip = tip.split(fullTableExpression).join(table);
			}
			tip = tip.replace(/\{_([^}]+)_\}/g,"<i>$1</i>");
			tip = tip.replace(/\{([^}]+)\}/g,"<b>$1</b>");
			return tip;
		},
		
		// draw the GTip element
		draw : function() {
			// try to find an existing "id=GTip" element in the body
			var element = $("#GTip");
			// if we can't find one, install one
			if (element.length == 0) {			
				element = $($.GTip.template);
				$("body").append(element);
			}
			this._element = element;
			this._body = element.find(".GTipBody");
			if (this._body.length == 0) this._body = this._element;
			return this;
		},
		
		// hide the tooltip -- may be called anonymously
		hide : function() {
			$.GTip.stopCheck();
			if ($.GTip._element) $.GTip._element.hide();
		},
		
		// html template for the GTip
		template : "<div id='GTip'>"
					+ "<div class='GTipBorder'></div>"
					+ "<div class='GTipBody'></div>"
				 + "</div>",
				 

		toString : function() {
			return "$.GTip";
		}
	}

});

// start watching the body element for tooltip messages on widnow load
$(window).load(jQuery.GTip.startWatchingBody);

