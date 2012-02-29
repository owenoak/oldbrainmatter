/*! Hope application framework, v 0.1					See: http://hopejs.com
 *	Dual licensed under the MIT and GPL licenses:		See: http://hopejs.com/license
 *	Copyright (c) 2006-2009, Matthew Owen Williams.
 */

(function($, hope) {
// 
//		Begin hidden from global scope:
//


/** Section:  has header, body, footer.  Expandable. */

// TODO:		- showHeader/footer (auto when adding items?)
//				- show title?
//				- expand/collapse

new $.Thing({
	name : "Section",
	Super : "Container",
	collection : "Sections",
	prototype : {
		template : "Section",
	
		// defaults for our SectionHeader, SectionBody and SectionFooter elements
		headerDefaults : null,
		bodyDefaults : null,
		footerDefaults : null,
	
		attributes : "showHeader,showBody,showFooter",
	
	// TODO: have setters for this so it's dynamic
		/** Show the header? */
		showHeader : false,
		
		/** Show the body? */
		showBody : false,

		/** Show the footer? */
		showFooter : false,
	
	
		// create our header/body/footer and add any items that we've previously set for them
		initialize : function(properties) {
			// make sure our header, body and items are created
			this.setHeader();
			this.setFooter();
			this.setBody();
		},
		
		
		setHeader : function(items) {
			if (!this.header) {
				this.header = new $.SectionHeader(this.headerDefaults, {items:items})
				this.add(this.header);
			} else if (items) {
				this.header.empty();
				// TODO: what if items is a single element?
				this.header.add.apply(this.header, items);
			}
			return this.header;
		},
		setFooter : function(items) {
			if (!this.footer) {
				this.footer = new $.SectionFooter(this.footerDefaults, {items:items})
				this.add(this.footer);
			} else if (items) {
				this.footer.empty();
				// TODO: what if items is a single element?
				this.footer.add.apply(this.footer, items);
			}
			return this.footer;
		},

		setBody : function(items) {
			if (!this.body) {
				this.body = new $.SectionBody(this.bodyDefaults, {items:items});
				this.add(this.body);
			} else if (items) {
				this.body.empty();
				// TODO: what if items is a single element?
				this.body.add.apply(this.body, items);
			}
			return this.body;
		},
		
		setItems : function(items) {
			this.setBody(items);
		}
	}
});

new $.Thing({
	name : "SectionHeader",
	Super : "Group",
	prototype : {
		template : "SectionHeader",
		elementSelector : "[part=SectionHeader]"
	}
});

new $.Thing({
	name : "SectionBody",
	Super : "Group",
	prototype : {
		template : "SectionBody",
		elementSelector : "[part=SectionBody]"
	}
});

new $.Thing({
	name : "SectionFooter",
	Super : "Group",
	prototype : {
		template : "SectionFooter",
		elementSelector : "[part=SectionFooter]"
	}
});
	
	
	
//
//		End hidden from global scope: 
//
})(jQuery, jQuery.hope);
