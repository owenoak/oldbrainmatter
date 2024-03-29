/* 
	Copyright (c) 2005 Metablocks, Inc, Metablocks, Ltd. and their affiliates. 
	Not to be reused without permission. All Rights Reserved.
*/


_grabObj = null;               


function EventCtrl(div){
  this.div   = div;
  this.type  = ''; this.mask  = 0;
  this.pageX = 0;  this.pageY = 0;
}


EventCtrl.prototype.linkCtrl = function(obj){
  if(obj && !obj.eventCtrl) obj.eventCtrl=this;
  return this;
}

EventCtrl.prototype.setThreshold = function(threshold){
  this.threshold = threshold;
  return this;
}


function getCtrlFromElementIE(el,tagName){
  for(;el;el=el.parentElement)
    if((tagName==null || el.tagName==tagName) && el.eventCtrl)
      return el.eventCtrl;
  return null;
}


function getCtrlFromEventIE(e,tagName){     // IE�p
  var ctrl=_grabObj;
  var event=window.event;
  var fromCtrl, toCtrl;
  if (ctrl==null){
    var mask=0, type=event.type;
    switch(type){
    case 'mouseover':
      fromCtrl = getCtrlFromElementIE(event.fromElement,tagName);
      toCtrl   = getCtrlFromElementIE(event.toElement,  tagName);
      if(fromCtrl!=toCtrl) ctrl=toCtrl;
      if(!ctrl || (ctrl.mask&1)==0) ctrl=null;
      break;
    case 'mouseout':
      fromCtrl = getCtrlFromElementIE(event.fromElement,tagName);
      toCtrl   = getCtrlFromElementIE(event.toElement,  tagName);
      if(fromCtrl!=toCtrl) ctrl=fromCtrl;
      if(!ctrl || (ctrl.mask&1)==0) ctrl=null;
      break;
    case 'mousedown': 
    case 'mousemove': 
    case 'mouseup':
      ctrl = getCtrlFromElementIE(event.srcElement,tagName);
      if(ctrl && (ctrl.mask&2)!=0) break;
    default: ctrl=null; break;
    }
  }
  if(ctrl){
    ctrl.pageX = document.body.scrollLeft+event.clientX;
    ctrl.pageY = document.body.scrollTop +event.clientY;
    ctrl.type  = event.type;
  }
  return ctrl;
}
function getCtrlFromEventNN4(e,tagName){    // NN4�p
  var ctrl=_grabObj;
  if(ctrl==null) ctrl=e.target.eventCtrl;
  if(ctrl){
    var mask=0;
    switch(e.type){
    case 'mouseover': case 'mouseout':
      mask|=1; break;
    case 'mousedown': case 'mousemove': case 'mouseup':
      mask|=2; break;
    }
    if((ctrl.mask&mask)!=0){
      ctrl.pageX = e.pageX; ctrl.pageY = e.pageY;
      ctrl.type  = e.type;
    } else ctrl=null;
  }
  return ctrl;
}
function getCtrlFromEventMz(e,tagName){     // Mozilla�p
  var ctrl=_grabObj;
  if(ctrl==null){
    for(var t=e.target; t!=null; t=t.parentNode){
      if((  tagName==null
         ||(t.nodeType==Node.ELEMENT_NODE && t.tagName==tagName))
         && ('undefined' != typeof(t.eventCtrl)) ){
        ctrl=t.eventCtrl;
        break;
      }
    }
  }
  if(ctrl){
    ctrl.pageX = e.clientX+window.scrollX;
    ctrl.pageY = e.clientY+window.scrollY;
    ctrl.type  = e.type;
  }
  return ctrl;
}
function getCtrlFromEventNop(e,tagName){ return null; } // Dummy
getCtrlFromEvent=(_dom==1||_dom==2)?getCtrlFromEventIE:
                   (_dom==3?getCtrlFromEventNN4:
                    (_dom==4?getCtrlFromEventMz:
                     getCtrlFromEventNop));

// mouseover
function ech_mouseover(e){
  var ctrl = getCtrlFromEvent(e,null);
  if(ctrl && ctrl.mouseover && !ctrl.mouseoverState){
    ctrl.mouseoverState = true;
    if(ctrl.mouseover) ctrl.mouseover(ctrl,ctrl.mouseoverClient);
  }
}

// mouseout 
function ech_mouseout(e){
  var ctrl = getCtrlFromEvent(e,null);
  if(ctrl && ctrl.mouseover && ctrl.mouseoverState){
    ctrl.mouseoverState = false;
    if(ctrl.mouseout) ctrl.mouseout(ctrl,ctrl.mouseoutClient);
  }
}

// mousedown
function ech_mousedown(e){
  var ctrl = getCtrlFromEvent(e,null);
  if(ctrl && !ctrl.dragging){
    _grabObj = ctrl; ctrl.dragging=true; ctrl.dragged = false;
    ctrl.startX = ctrl.curX = ctrl.pageX;
    ctrl.startY = ctrl.curY = ctrl.pageY;
    if(ctrl.mousedown) ctrl.mousedown(ctrl,ctrl.mousedownClient);
    return false;
  }
  return true;
}

// mousemove
function ech_mousemove(e){
  var ctrl = getCtrlFromEvent(e,null);
  if(ctrl && ctrl.dragging){
    if(ctrl.curX!=ctrl.pageX || ctrl.curY!=ctrl.pageY){
      if(Math.abs(ctrl.pageX-ctrl.startX)>ctrl.threshold || Math.abs(ctrl.pageY-ctrl.startY)>ctrl.threshold)
        ctrl.dragged = true;
      if(ctrl.mousemove) ctrl.mousemove(ctrl,ctrl.mousemoveClient);
      ctrl.curX = ctrl.pageX; ctrl.curY = ctrl.pageY;
    }
    return false;
  }
  return true;
}

// mouseup
function ech_mouseup(e){
  var ctrl = getCtrlFromEvent(e,null);
  if(ctrl && ctrl.dragging){
    _grabObj = null; ctrl.dragging = false;
    if(ctrl.mouseup) ctrl.mouseup(ctrl,ctrl.mouseupClient);
    if(!ctrl.dragged && ctrl.mouseclick)
      ctrl.mouseclick(ctrl,ctrl.mouseclickClient);
    ctrl.curX = ctrl.pageX; ctrl.curY = ctrl.pageY;
    return false;
  }
  return true;
}

function ech_attachMouseOverOut(div,ovrf,ovrc,outf,outc){
  if(!div.eventCtrl) div.eventCtrl = new EventCtrl(div);
  var ctrl = div.eventCtrl;
  ctrl.mouseoverState = false;
  ctrl.mouseover  = ovrf; ctrl.mouseoverClient = ovrc;
  ctrl.mouseout   = outf; ctrl.mouseoutClient  = outc;
  div.onmouseover = ech_mouseover;
  div.onmouseout  = ech_mouseout;
  ctrl.mask|=1;
  return ctrl;
}

// mouseover/mouseout
function ech_detachMouseOverOut(div){
  var ctrl = div.eventCtrl;
  if(ctrl){
    ctrl.div.onmouseover = null;
    ctrl.div.onmouseout  = null;
    ctrl.mask=~1;
  }
}

/**
* Set the drag object and the methods to call on the events 
*  - onmousedown
*  - onmousemove
*  - onmouseup
*  - onmouseclick
* The method you pass should expect to get 2 params 
*  a) A ctrl-object holding all event info
*  b) A pass-through parameter that *you* may set.
*  
* @param div   is the object you intend to move (a div-object)
* @param dwnf  function to call on the onmousedown event 
* @param dwnc  pass-through parameter that you *may* set
* @param movf  function to call on the onmousemove event
* @param movc  pass-through parameter that you *may* set
* @param upf   function to call on the onmouseup event
* @param upc   pass-through parameter that you *may* set
* @param clkf  function to call on the mouseclick event
* @param clkc  pass-through parameter that you *may* set
*/
function ech_attachMouseDrag(div,dwnf,dwnc,movf,movc,upf,upc,clkf,clkc){
  var doc;
  
  if(_dom==1||_dom==2){
    doc = div;
    doc.onmousedown      = ech_mousedown;
    document.onmousemove = ech_mousemove;
    document.onmouseup   = ech_mouseup;
  } else if(_dom==3){
    doc = div.document;
    doc.onmousedown = ech_mousedown;
    doc.onmousemove = ech_mousemove;
    doc.onmouseup   = ech_mouseup;
    doc.captureEvents(Event.MOUSEDOWN|Event.MOUSEMOVE|Event.MOUSEUP);
  } else if(_dom==4){
    doc = div;
    div.onmousedown           = ech_mousedown;
    document.body.onmousemove = ech_mousemove;
    document.body.onmouseup   = ech_mouseup;
  } else return null;
  if(!doc.eventCtrl) doc.eventCtrl = new EventCtrl(div);
  var ctrl=doc.eventCtrl;
  ctrl.dragging  = false; ctrl.dragged   = false;
  ctrl.startX    = 0;     ctrl.startY    = 0;
  ctrl.curX      = 0;     ctrl.curY      = 0;
  ctrl.mousedown = dwnf; ctrl.mousedownClient = dwnc;
  ctrl.mousemove = movf; ctrl.mousemoveClient = movc;
  ctrl.mouseup   = upf;  ctrl.mouseupClient   = upc;
  ctrl.mouseclick= clkf; ctrl.mouseclickClient= clkc;
  ctrl.threshold = 5;
  ctrl.mask|=2;
  return ctrl;
}

function ech_detachMouseDrag(div){
  var ctrl = null;
  if(_dom==1||_dom==2){
    ctrl=div.eventCtrl;
    if(ctrl) ctrl.div.onmousedown=null;
  } else if(_dom==3){
    ctrl = div.document.eventCtrl;
    if(ctrl){
      var doc = ctrl.div.document;
      doc.releaseEvents(Event.MOUSEDOWN|Event.MOUSEMOVE|Event.MOUSEUP);
      doc.onmousedown = null;
      doc.onmousemove = null;
      doc.onmouseup   = null;
    }
  } else if(_dom==4){
    ctrl = div.eventCtrl;
    if(ctrl) ctrl.div.onmousedown=null;
  }
  if(ctrl) ctrl.mask&=~2;
}
