/*
	NOTES:
		- all methods which take elements can take HTML
		
		- ElementList
			- 1-based list of elements (NOT nodes?)
			- generally has all of these methods defined on it
			- returned from find(), etc
	

*/


(function(hope) {	// Begin hidden from global scope

hope.extend(Element.prototype, {

//	create : function()

//	html : function html(newHTML)
//	clone : function clone()

	data : function(key,value)
	clearData : function(key)

//	elements : function elements(),
//	nodes : function nodes(),
	
//	parent : function parent
//	parents : function parents
//	offsetParent : function offsetParent

//	matches : function matches(selector)
//	find : function find(selector, includeSelf)
//	findAll : function findAll(selector, includeSelf)
//	findParent : function findParent(selector, includeSelf)
//	findParents : function findParents(selector, includeSelf)
//	contains : function contains(element,etc)

//	bottom : function bottom
//	left : function left
//	right : function right
//	top : function top

//	pageLeft : function pageLeft()
//	pageTop : function pageTop()
//	pageRight : function pageRight()
//	pageBottom : function pageBottom()	

	// includes border + padding, not margin
//	height : function height
//	width : function width
	
	// does not include border, padding, margin
//	innerHeight : function innerHeight
//	innerWidth : function innerWidth

//	resize : function resize(x,y)
//	moveTo : function moveTo(x,y)

	// in same z-index context only, assumes 
//	moveAbove : function moveAbove(otherElement)
//	moveBelow : function moveBelow(otherElement)
//	moveToBack : function moveToBack()
//	moveToFront : function moveToFront()

	add : function add(element,etc)
	addAt : function add(index,element,etc)
	addAfter : function addAfter(oldElement, newElement, etc)
	addBefore : function addBefore(oldElement, newElement, etc)
	append : function append(element,etc)
	prepend : function prepend(element,etc)

	replace : function replace([#/oldElement],newElement)
	isEmpty
	empty : function empty()
	remove : function remove([#/element])
	wrap : function wrap(container)

//	attribute : function attribute(key,value)
//	attributeMap : function attributeMap()
//	clearAttribute : function clearAttribute(key)

//	addClass : function addClass(className, condition)
//	hasClass : function hasClass(className)
//	toggleClass : function toggleClass(className, condition)
//	removeClass : function removeClass(className, condition)

//	borders : function borders()
//	margins : function margins()
//	padding : function padding()

	disable : function disable()
	enable : function enable(newState)
	enabled : function enabled

	hide : function hide()
	isVisible : function isVisible
	show : function show(newState)

	maxScroll : function maxScroll
	scroll : function scroll
	scrollTo : function scrollTo(x,y)
});

})(hope); // End hidden from global scope
