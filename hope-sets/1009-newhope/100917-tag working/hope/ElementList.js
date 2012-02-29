/*** List of ElementList (like malleable cross between NodeList and Array ***/

//TODO: pick up all standard Element properties and methods so they have the same api???

Script.require("{{hope}}Element.js,{{hope}}List.js", function(){

	new List.Subclass("ElementList");

	// give ElementList the same api as Element
	List.makeAppliers(ElementList, "addClass,removeClass,toggleClass,on");
	List.makeAppliers(ElementList, "select,selectAll,hasClass,matches",true);
	List.makeAccessors(ElementList, "innerHTML,classList,className,style,bg,radius", true);
	
	// give the native NodeList array-like-thing all of the ElementList functionality
	hope.extendIf(NodeList.prototype, ElementList.prototype);

Script.loaded("{{hope}}ElementList.js");
});// end Script.reqiure
