/**
	Egg JavaScript Library
	@author Isaac Nygaard - Nyrix
	@website http://eggjs.com/
	@license MIT & GPL
	@version 0.6b
	
	Uncompressed = 89.1kb 
	Compressed = 30.7kb (34.5%)
	
	If setContext returns a false context, use:
		1. var cx = !context ? [window] : context;
		2. if (context == false) return _p;
		
**/
	
(function(window){

//GLOBAL VARIABLES AND SETTINGS
var globalS = '$';
var globalM = '$$';
//METHOD SETTINGS
var settings = {
	animate:{
		//DEFAULTS
		animate_tick: 50,
		//Direction specific css values (first is for standard, second is for radius)
		dirCSS: [['Top','Right','Bottom','Left'],['Topleft','Topright','Bottomleft','Bottomright']],
		//Standard shorthand CSS
		//syntax: a|b|c|d OR a|bd|c OR ac|bd
		sShortCSS: ['borderWidth','padding','margin'], //CURRENTLY NOT BEING USED
		//Radius shorthand CSS
		//syntax: a|b|c|d OR a|bc|d OR ad|bc
		rShortCSS: ['borderRadius','outlineRadius'],
		//Special css that requires on-the-fly value parsing
		specialCSS: ['borderColor','borderColors','backgroundPosition','boxShadow','textShadow'],
		
		//OTHER
		animations: {},
		animate_timer: null,
		bounceEasing: {}
	},
	bind:{
		//DEFAULTS
		globals:'load click',
		parseEvents: true,
		def: true,
		bub: true,
		//Parsing methods
		eventIE:function(e){
			e.currentTarget = this;
			e.which = e.keyCode;
			e.type = e.type.replace('on','');
			e.target = e.srcElement;
			if (egg.isset(e.fromElement))
				e.relatedTarget = e.fromElement;
			if (egg.isset(e.toElement))
				e.relatedTarget = e.toElement;
			//bubbling and preventing default
			e.stopPropagation = function(){this.original.cancelBubble = true;};
			e.preventDefault = function(){this.original.returnValue = false;};
			//Make custom IE pageXY and clientXY
			e.mScroll = [document.body.scrollLeft,document.body.scrollTop]; //mouse scroll
			var b = window[globalS](document.body);
			//IE fails to compensate for body border/scrolling
			var leftBorder = parseFloat(b.getStyle('borderLeftWidth',true));
			var topBorder = parseFloat(b.getStyle('borderTopWidth',true));
			e.clientX = e.clientX-leftBorder;
			e.clientY = e.clientY-topBorder;
			e.pageX = e.clientX+e.mScroll[0];
			e.pageY = e.clientY+e.mScroll[1];
			e.mScreen = [e.screenX,e.screenY];
			e.mClient = [e.clientX,e.clientY];
			e.mPage = [e.pageX,e.pageY];
			var op = window[globalS](e.currentTarget).objPos();
			e.mObj = [e.mPage[0]-op[0],e.mPage[1]-op[1]];
			return e;
		},
		eventOTHER:function(e){
			e.currentTarget = this;
			e.mScroll = [window.scrollX,window.scrollY];
			e.mScreen = [e.screenX,e.screenY];
			e.mClient = [e.clientX,e.clientY];
			e.mPage = [e.pageX,e.pageY];
			e.objPos = window[globalS](e.currentTarget).objPos();
			e.mObj = [e.mPage[0]-e.objPos[0],e.mPage[1]-e.objPos[1]];
			return e;
		}
	},
	history:{
		useHistory: true,
		//Private vars
		isIE: false, //Do we need to track history using an iframe?
		iframeDoc: null, //iframe reference
		oldHash: null //The previous hash value (used to check if history has changed yet)
	},
	ajax:{
		//DEFAULTS
		html: false, //set responseText as innerHTML
		type: 'get', //a 'get' or 'post' ajax request
		//OTHER
		requests: []
	},
	event:{
		//Custom events
		preloadEvents:'window.load document.ready ajax.start ajax.loading ajax.finish ajax.historychange animate.start animate.step animate.stop animate.remove toggle.change toggle.enable toggle.disable toggle.toggle sso.login sso.logout',
		customEvents:{}
	},
	selector:{
		supportsGetClass: document.getElementsByClassName,
		//Attribute comparison
		typeRegs: /[#.:[\]]/,
		types: {
			//Type
			'':function(val){
				//It should never by * because that would mean resetRunner() isn't working
				return this.tagName.toLowerCase() == val.toLowerCase();
			},
			//ID; optimized to only get one element
			'#':'id',
			//Class
			'.':function(val){
				return egg.find(this.className.split(" "),val) != -1;
			},
			//Pseudo
			':':['(',')',function(a,v){
				if (egg.isset(v)){
					if (a == 'nth-child') return this.parentNode.children[v] == this;
					if (a == 'nth-last-child') return this.parentNode.children[this.parentNode.children.length-v] == this;
					if (a == 'lang') return this.lang == v;
				}
				else{
					if (a == 'first-child') return this.parentNode.firstElementChild == this;
					if (a == 'last-child') return this.parentNode.lastElementChild == this;
					if (a == 'enabled') return this.disabled == false;
					if (a == 'disabled') return this.disabled == true;
					if (a == 'checked') return this.checked == true;
					if (a == 'empty') return this.childNodes.length == 0;
				}
			}],
			//Attribute - a:attribute, o:operator, v:value
			'[]':[/\|=|=|\^=|\*=|\$=|!=/,function(a, o, v){
				//check whether the attribute exists
				if (!egg.isset(this[a])) return false;
				if (!egg.isset(o)) return true;
				//Evaluate the v
				if (egg.isNum(eval(v)) || egg.isBool(eval(v)) || egg.isStr(eval(v))) v = eval(v);
				//Check the individual operators
				if (o == "=") return egg.isStr(v) ? egg.contains(this[a], v) : this[a] == v;
				if (o == "!=") return egg.isStr(v) ? !egg.contains(this[a], v) : this[a] != v;
				if (o == "^=") return this[a].substring(0,v.length) == v;
				if (o == "$=") return this[a].substring(this[a].length-v.length) == v;
				if (o == "*=") return this[a].indexOf(v) != -1;
				if (o == "|=") return this[a].split(" ")[0] == v;
			}]
		},
		//DOM comparison
		layerRegs: /[><+~ ]/,
		layers: {
			'>':'children',
			'<':'parentNode',
			'+':'nextSibling',
			'~':'previousSibling',
			' ':function(){
				//get all the descendents
				return this.getElementsByTagName("*");
			}
		},
		//Splitter regular expressions
		splitter: /[#.:[\]><+~ "',]/
	}
};
//Initialize settings
var initSettings = function(e){
	//Settings that require DOM readiness
	egg.extend(settings.event, {
		//How the custom triggers should be parsed; returns boolean, whether the event was valid or not
		customParser: function(e, trigger, cued){
			var valid_evt = false, eMe=window[globalS](this), dat = this.epDat.evts[trigger];
			//Check if this is the active trigger in our cue
			var cueCheck = cued[dat.$cue.cue];
			var oldTrigs = eMe.getValue(cueCheck.trigger, trigger).split(' ');
			if (eMe.contains(oldTrigs, e.type)){
				//Was this fired event a valid event for the cue?
				var vCheck = eMe.getValue(cueCheck.valid,[e,trigger,dat.$cue.dat]);
				var oldReg = dat.$cue.cue;
				if (vCheck && eMe.isset(cueCheck.event))
					dat.$cue.evt = cueCheck.event.apply(this,[dat.$cue.evt,e]);
				//If it was the last cued link, vCheck will fire the customTrigger
				if (oldReg == cued.length-1)
					valid_evt = vCheck;
				//Otherwise, start listening for the next cued event
				else if (vCheck){
					dat.$cue.cue++;
					curTrig = cued[dat.$cue.cue];
					var custC = eMe.getValue(curTrig.target, trigger) || this;
					window[globalS](custC).bindSimple(eMe.getValue(curTrig.trigger, trigger), dat.mbParse);
				}
				if (vCheck){
					//Remove the old trigger, if it was a fireOnce only trigger or the cueEnd trigger
					var f1 = eMe.getValue(cueCheck.fireOnce, trigger) == true;
					if (f1 || oldReg == cued.length-1 && eMe.getValue(cueCheck.cued, trigger) == true){
						if (!f1) dat.$cue.cue = 0;
						custC = eMe.getValue(cueCheck.target, trigger) || this;
						window[globalS](custC).unbindSimple(oldTrigs, dat.mbParse);
					}
				}
			}
			return valid_evt;
		},
		customOverride: true, //whether to override built in events by default
		/* Custom triggers
		Basic Syntax
			- override: boolean
			- link: object or array of objects
				- trigger: must return a string
				- target: must return a DOM object
				- valid: must return a boolean
				- def: deprecated, use W3C methods inside valid, instead
				- bub: deprecated, use W3C methods inside valid, instead
				- fireOnce: must return a boolean
				- cued: must return boolean
				- event: must return the new event variable
		*/
		customTriggers:{
			'mouseenter mouseleave':{
				link: {
					trigger: function(reg){return reg == 'mouseenter' ? 'mouseover' : 'mouseout';},
					valid: function(e){
						var valid_evt = false;
						if (egg.isset(e.relatedTarget))
							valid_evt = (e.relatedTarget != e.currentTarget && !window[globalS](e.currentTarget).contains(e.relatedTarget) && (e.target == e.currentTarget || window[globalS](e.currentTarget).contains(e.target)));
						return valid_evt;
					}
				}
			},
			'drag dragstart dragend dragenter dragleave':{
				link: [
					{trigger:'mousedown',valid:function(e,trig,dat){
						e.preventDefault();
						return true;
					},event:function(e,curE){
						e.mDrag = curE.mObj;
						e.dragX = e.mDrag[0];
						e.dragY = e.mDrag[1];
						return e;
					}},
					//Drag enter/leave needs target:document.body for mousedown
					{trigger:'mousemove',target:document,valid:true,fireOnce:function(trig){return trig=='dragstart';}},
					/* For drag enter/leave
						var ret = false; var o = $(this); var op = o.objPos();
						//Enter
						if (e.pageX >= op[0] && e.pageX <= op[0]+this.clientWidth && e.pageY >= op[1] && e.pageY <= op[1]+this.clientHeight){
							if (trig == 'dragenter' && this.epDat.evts[trig].dEntLeave == 0) ret = true;
							this.epDat.evts[trig].dEntLeave = 1;
						}
						//Leave
						else{
							if (trig == 'dragleave' && this.epDat.evts[trig].dEntLeave == 1) ret = true;
							this.epDat.evts[trig].dEntLeave = 0;
						}
						return ret;
					*/
					{trigger:'mouseup',cued:function(trig){return trig == 'dragend';},target:document,valid:true}
				]
			},
			'hotkey':{
				link:{
					trigger:'keydown keyup',
					valid:function(e,trig,d){
						if (!egg.isset(d.hotkey)) d.hotkey = 0;
						var hotkeyMap = {'backspace':8,'tab':9,'enter':13,'shift':16,'ctrl':17,'alt':18,'pause':19,'capslock':20,'esc':27,'pageup':33,'space':32,'pagedown':34,'end':35,'home':36,'left':37,'up':38,'right':39,'down':40,'prtsc':44,'insert':45,'del':46,'0':48,'1':49,'2':50,'3':51,'4':52,'5':53,'6':54,'7':55,'8':56,'9':57,'a':65,'b':66,'c':67,'d':68,'e':69,'f':70,'g':71,'h':72,'i':73,'j':74,'k':75,'l':76,'m':77,'n':78,'o':79,'p':80,'q':81,'r':82,'s':83,'t':84,'u':85,'v':86,'w':87,'x':88,'y':89,'z':90,'lwindow':91,'rwindow':92,'select':93,'num0':96,'num1':97,'num2':98,'num3':99,'num4':100,'num5':101,'num6':102,'num7':103,'num8':104,'num9':105,'num*':106,'num+':107,'num-':109,'num.':110,'num/':111,'f1':112,'f2':113,'f3':114,'f4':115,'f5':116,'f6':117,'f7':118,'f8':119,'f9':120,'f10':121,'f11':122,'f12':123,'numlock':144,'scrolllock':145,';':186,'=':187,',':188,'-':189,'.':190,'/':191,'[':219,'backslash':220,']':221,'quote':222};
						var trigs = trig.split(":")[1].split("+");
						if (e.type == 'keydown'){
							if (e.which == hotkeyMap[trigs[d.hotkey]])
								d.hotkey++;
							if (d.hotkey == trigs.length){
								e.preventDefault();
								return true;
							}
						}
						else{
							var loc = egg.find(trigs, egg.find(hotkeyMap, e.which));
							if (loc != -1) d.hotkey = loc;
						}
						return false;
					}
				}
			}
		}
	});
	
	//BROWSER TWEAKS (subject to deprecation, in the future)
	//IE says border is `medium` when its actually `thin`
	if (!window.addEventListener){
		//fix IE top border
		var o1 = document.body.clientHeight;
		document.body.style.borderTopWidth = '0px';
		document.body.style.borderTopWidth = parseFloat(document.body.clientHeight)-parseFloat(o1)+"px";
		//fix IE bottom border
		var o2 = document.body.clientWidth;
		document.body.style.borderLeftWidth = '0px';
		document.body.style.borderLeftWidth = parseFloat(document.body.clientWidth)-parseFloat(o2)+"px";
	}
	//forward compatibility for new CSS properties
	egg.parseUnsupportedCSS();
}

//GLOBAL ACCESSORS
var createS = function(cont, active, superEnabled){
	var newLib = new lib();
	return newLib.init(cont, active, superEnabled);
};
var createM = function(cont, active){
	return createS(cont, active, true);
};

//LIBRARY METHODS
var lib = function(){
	/** LIBRARY **/
	//Current library version
	this.version = '0.6b';
	//Context to perform methods on; active context pointer; and a reference to the active element
	var context = [], pointer = 0, _c = null, _p = this, _super = false;
	//If _super is enabled, it will perform actions on all context elements
	this.setSuper = function(set){_super = _p.isBool(set) ? set : !_super;}
	//Sets the current context
	this.setContext = function(newContext, active){
		//return now, if the context is blank
		if (!newContext.length || !_p.isset(newContext) || newContext == ''){
			context = false;
			_c = window;
			_p.setSuper(false);
			pointer = 0;
			return _p;
		}
		//The active element
		active = active || 0;
		//An array of nodes
		if (_p.isArr(newContext)){
			context = newContext;
			_p.select(active);
		}
		//A single element
		else{
			context = [newContext];
			_c = newContext;
			pointer = 0;
		}
		//Set the epDat, if it doesn't exist
		for (var c in context){
			if (!_p.isset(context[c].epDat)){
				context[c].epDat = {};
				if (!_p.isset(context[c].epDat))
					alert('This is a bug, Azmisov: '+context[c]);
				context[c].epDat.fxID = uni_id++;
			}
		}
		return _p;
	}
	//Gets the current context
	this.getContext = function(){return context;}
	//Gets the active element
	this.active = function(){return context == false ? false : context[pointer];}
	//Sets the active element
	this.select = function(newPoint){
		if (!_p.isset(newPoint) || newPoint > context.length-1)
			return _p;
		pointer = newPoint;
		_c = _p.active();
	}
	//Initialize context
	this.init = function(sel, active, superEnabled){
		_p.setSuper(superEnabled);
		if (_p.isset(sel)){
			var nodes = [];
			//convert to an array, to parse string vs node syntax
			if (!_p.isArr(s)) sel = [sel];
			for (var s in sel){
				//if its a plain DOM node, no lookup is required
				if ((_p.isDOMNode(sel[s]) || sel[s] == window) && _p.find(nodes, sel[s]) == -1)
					nodes.push(sel[s]);
				//otherwise, its a CSS query
				else if (_p.isStr(sel[s])){
					var newNodes = _p.lookup(sel[s]);
					for(var n in newNodes){
						if (_p.find(nodes, newNodes[n]) == -1)
							nodes.push(newNodes[n]);
					}
				}
			}
			//Intialize the context variables
			_p.setContext(nodes, active);
		}
		return _p;
	};
	//Adding library plugins
	this.extend = function(obj, opt){
		//If obj is a string, it is the name of our object to add
		if (_p.isStr(obj)){
			if (egg.isset(lib.prototype)) lib.prototype[obj] = opt;
			else lib[obj] = opt;
		}
		else{
			//If the opt is set, obj is actually our target
			var target = opt ? obj : lib;
			obj = opt || obj;
			//Add new methods
			for (var i in obj){
				if (!_p.isset(_p[i])){
					if (egg.isset(target.prototype)) target.prototype[i] = obj[i];
					else target[i] = obj[i];
				}
			}
		}
		return _p;
	};
	
	/** DOM TRAVERSAL & SELECTORS ENGINE **/
	//Refines the current context, based on a CSS selector
	this.refine = function(sel){
		if (context == false) return _p;
		//The old active node
		var oldActive = _p.active();
		//Set the new context
		var newContext = _p.lookup(sel, context);
		_p.setContext(newContext);
		//Find if the old active node is in the new array
		var loc = _p.find(context,oldActive);
		if (loc > 0) _p.select(loc);
		//return the new library
		return _p;
	}
	//Tests if a selector matches an element
	this.matches = function(sel){
		if (context == false) return false;
		return _p.length(_p.lookup(sel,context[pointer])) > 0;
	}
	//Finds elements, based on a CSS selector
	this.lookup = function(sel, cust_context){
		//Variables to hold found items
		var oelList = [], nelList = [], finalList = [];
		var addEls = function(els){
			//convert NodeList to an array
			for (var i in els)
				if (els[i] && els[i].tagName)
					nelList.push(els[i]);
		}
		//If browser natively supports selectors
		if (document.querySelectorAll){
			try {
				var parent = cust_context || document;
				addEls(parent.querySelectorAll(sel));
				return nelList;
			} catch(error){};
		}
		//Otherwise, provide a fallback method
		//PARSE THE INPUT STRING
		/* Storage varables
			runner		=	the split args to be sent to the checker function
			strings		= 	storing any strings for later concatenation
			curSyn		=	the character starter; if false, it designates the previous syntax was a layer
			selectors	=	Parsed selection syntax [[0:type,1:layer],selector,args]
			mSplits		=	Checks for middle splitters like != or ( or ) [splitter-placeholder, first-location, key-of-splitter]
			sSplits		=	Checks for regular splitters, not being mSplits: [first-location, character, type-of-selector]
		*/
		var runner = [], strings = '', curSyn = '', selectors = [], mSplits = false, sSplits = false;
		//Starts a new selector sequence (selectors are separated by commas)
		var newSelector = function(){
			selectors.push([]);
			//Trim starting commas/whitespace and ending whitespace
			//Trim *'s from start and end
			sel = sel.replace(/^[,\s]+|\s+$/g,"").replace(/^\*+|\*+$/g,"");
			curSyn = '';
		}
		//Various methods
		var resetRunner = function(loc){
			runner.push(strings+sel.substring(0,loc))
			//If its blank, or if it is *, don't add it
			//Otherwise, add to selectors array
			if (!(curSyn === false && runner[0] == "*") && !(runner[0] == "" && curSyn == ""))
				selectors[selectors.length-1].push([0,(curSyn === false ? '' : curSyn),runner]);
			//Reset the runner
			runner = [];
			strings = '';
			mSplits = false;
		}
		var has = function(obj,c){
			for(var n in obj)
				if (n.length > 0 && n.charAt(0) == c)
					return n;
		}
		//Before we start, trim starting/ending commas and whitespace, since they don't mean anything
		sel = sel.replace(/[,\s]+$/g,"");
		newSelector();
		//Begin parsing of selectors
		while (sel.length > 0){
			//find the first index of the next selector
			var found = false;
			while (!found){
				//Check for mSplitters, and store them for later use, if needed
				if (mSplits){
					//If we are done with all the splitters, discard the array
					if (mSplits[0] == settings.selector.types[curSyn].length-1) mSplits = false;
					//Otherwise, find the next key
					else{
						var mSearch = settings.selector.types[curSyn][mSplits[0]];
						//If this is a regexp, we'll need to store the key
						if (mSearch.constructor == RegExp){
							mSplits[2] = mSearch.exec(sel);
							//if no matches were found, remove the array
							if (mSplits[2] == null) mSplits[1] = -1;
							else{
								mSplits[2] = mSplits[2][0];
								mSplits[1] = sel.indexOf(mSplits[2]);
							}
						}
						//Otherwise, just do a simple check
						else mSplits[1] = sel.indexOf(mSearch);
						//If none were found, remove the mSplits array
						if (mSplits[1] == -1) mSplits = false;
					}
				}
				//Find the next splitter
				if (!_p.isset(sSplits) || !sSplits){
					//No match was found
					var sloc = sel.search(settings.selector.splitter);
					if (sloc == -1) break;
					//Otherwise
					sSplits = [sloc, sel.charAt(sloc)];
				}
				/* Remove bad whitespace. Bad if:
					- if the next character, or previous character was a layer character
					- if the next character is a selector separator (comma)
				*/
				if (sSplits[1] == " " && sSplits[0]+1 != sel.length && _p.isset(sel[sSplits[0]+1]) && ((sel[sSplits[0]+1].match(settings.selector.layerRegs) != null || curSyn === false) || sel[sSplits[0]+1] == ",")){
					sel = sel.replace(/ /,"");
					sSplits = false;
				}
				//Take out any strings
				else if (/["\']/.test(sSplits[1]) && sel.charAt(sSplits[0]-1) != "\\" && (!mSplits || mSplits[1] > sSplits[0])){
					var next_quote = sel.substring(sSplits[0]+1).indexOf(sSplits[1]);
					strings += sel.substring(0,sSplits[0]+next_quote+2);
					sel = sel.substring(sSplits[0]+next_quote+2);
					sSplits = false;
				}
				//Parse selector separators (commas)
				else if (sSplits[1] == ","){
					resetRunner(sSplits[0]);
					//remove starting stuff
					sel = sel.substring(sSplits[0]+1);
					newSelector();
					sSplits = false;
				}
				//assuming we have found the next selector, what type is it?
				else{
					sSplits[2] = settings.selector.typeRegs.test(sSplits[1]) ? 0 : 1;
					found = true;
				}
			}
			//If no sSplits or mSplits could be found, we're done
			if (!found && !mSplits) break;
			//Check for mSplits
			if (mSplits && (mSplits[1] < sSplits[0] || sSplits[0] == -1)){
				//Increment the cue
				mSplits[0]++;
				//Add up until the mSplitter
				runner.push(sel.substring(0,mSplits[1]));
				//Add key to the runner
				var dis = mSplits[1]+1;
				if (mSplits[2] != null){
					runner.push(mSplits[2])
					dis += mSplits[2].length - 1;
				}
				sel = sel.substring(dis);
				//Fix sSplitter key to match the removed frontal stuff
				if (sSplits) sSplits[0] -= dis;
			}
			//Check the sSplits
			else{
				//Add the previous syntax, if it wasn't a layer
				if (sSplits[0] !== 0 || curSyn !== false)
					resetRunner(sSplits[0]);
				//Remove the starting character
				sel = sel.substring(sSplits[0]+1);
				//Check if this is the ending character
				if (curSyn.length > 1 && sSplits[1] == curSyn.charAt(1))
					curSyn = false;
				//If it is the start of an attribute selector
				else if (!sSplits[2]){
					curSyn = _p.isset(settings.selector.types[sSplits[1]]) ? sSplits[1] : has(settings.selector.types, sSplits[1]);
					if (_p.isArr(settings.selector.types[curSyn])) mSplits = [0];
				}
				//If it is the start of a layer selector
				else{
					//add a layer
					selectors[selectors.length-1].push([1,sSplits[1]]);
					//reset the syntax type
					curSyn = false;
				}
				//Reset the sSplits, so we can fetch another
				sSplits = false;
			}
		}
		//Any cleanup at the end
		if (sel.length > 0) resetRunner(sel.length);
		
		//FIND THE ELEMENTS using parsed 'selectors'
		for (var cur=0; cur<selectors.length; cur++){
			var selector = selectors[cur];
			//Optimization: find initial context
			if (!cust_context){
				var iContext = false;
				//Find valid types for refining
				for (var i = 0; i<selector.length; i++){
					if (selector[i][0] == 1) break;
					//getElementById (best choice)
					else if (selector[i][1] == "#"){
						nelList = document.getElementById(selector[i][2]);
						if (_p.isset(nelList)) nelList = [nelList];
						selector.splice(i,1);
						//Yes, we found a context
						iContext = true;
						break;
					}
					//getElementsByTagName (next best choice)
					else if (selector[i][1] == "")
						iContext = [1,i];
					//getElementsByClassName (last resort)
					else if (!iContext && settings.selector.supportsGetClass && selector[i][1] == ".")
						iContext = [2,i];
				}
				//There is nothing we can do to refine the context
				if (iContext == false) addEls(document.getElementsByTagName("*"));
				//Find TAG's or CLASS's
				else if (_p.isArr(iContext)){
					if (iContext[0] == 1) addEls(document.getElementsByTagName(selector[iContext[1]][2]));
					else addEls(document.getElementsByClassName(selector[iContext[1]][2]));
					selector.splice(iContext[1],1);
				}
			}
			//Otherwise, use the user defined context
			else addEls(cust_context);
			
			//Trace the selector
			for (var s in selector){
				//Reset element lists
				if (nelList.length == 0) break;
				//Selector: [type, index, [args]]
				var check = selector[s];
				//Optimization: if its an ID, get it now
				if (check[1] == "#"){
					var idLoc = _p.find(nelList, document.getElementById(check[2][0]));
					if (idLoc == -1){
						nelList = [];
						break;
					}
					nelList = [nelList[idLoc]];
				}
				else{
					//Refine selection
					var comp = (check[0] ? settings.selector.layers : settings.selector.types)[check[1]];
					if (_p.isArr(comp)) comp = comp[comp.length-1];
					//Look through types
					if (!check[0]){
						try{
							nelList = nelList.filter(function(el){
								return b = _p.isFn(comp) ? comp.apply(el,check[2]) : el[comp] == check[2][0];
							});
						}catch(e){
							oelList = nelList;
							nelList = [];
							for (var x in oelList)
								if (_p.isFn(comp) ? comp.apply(oelList[x],check[2]) : oelList[x][comp] == check[2][0])
									nelList.push(oelList[x]);
						}
					}
					//Look through layers
					else{
						//Make a new array to use
						oelList = nelList;
						nelList = [];
						//Optimization: parse oelList for the SPACE selector, so it only searches parent elements
						if (check[1] == " "){
							var fixed = [oelList.pop()];
							for (var i in oelList){
								for (var j in fixed){
									if (_p.contains(oelList[i], fixed[j])){
										fixed[j] = oelList[i];
										break;
									}
								}
								//we've found a match, now get on to the next one
								if (j != fixed.length-1) break;
							}
							oelList = fixed;
						}				
						for (var i=0; i<oelList.length; i++){
							var nEls = _p.isFn(comp) ? comp.call(oelList[i]) : oelList[i][comp];
							//simply replace the old one
							if (nEls.tagName) oelList[i] = els;
							//otherwise, remove the old one and get the news
							else{
								oelList.splice(i,1);
								addEls(nEls);
							}
						}
						//combine the old and new arrays
						nelList = nelList.concat(oelList);
					}
				}
			}
			
			//Add found elements to the finalList array
			finalList = finalList.concat(nelList);
			nelList = [];
		}
		//Remove duplicate matches
		//seems to be faster if we do it after all the matches are found, instead of on the fly
		oelList = [finalList.pop()];
		var loc = null;
		for (var x in finalList)
			if ((loc = _p.find(oelList,finalList[x])) == -1)
				oelList.push(finalList[x]);
		//otherwise just return the finalized array
		return oelList;
	}
	/* traverse DOM
		bfn [req]: a method to execute before child nodes are traversed
			- return values will be sent to:
				child nodes bfn
				original node's afn
		afn [opt]: a method to execute after child nodes are traversed	
		no_incl [opt]: don't fire methods for the original node
		args [opt]: an array of arguments to be sent to the original node's bfn
	*/
	this.traverseDOM = function(bfn,afn,no_incl,args){
		if (context == false) return _p;
		//Initialize arguments
		args = args || [];
		if (!_p.isArr(args)) args = [args];
		var childs = _c.childNodes;
		//Call before-method
		if (!no_incl){
			args = bfn.apply(_c, args);
			//make sure the new args is an array
			if (!_p.isArr(args)) args = [args];
		}
		//Traverse children DOM nodes
		for (var i in childs)
			if (_p.isset(childs[i].tagName) && _p.length(childs[i].childNodes) > 0)
				window[globalS](childs[i]).traverseDOM(bfn,afn,false,args);
		//Call after-method
		if (!no_incl && _p.isset(afn))
			afn.apply(_c, args);
	};
	/* DOM lookup
			~ is a starting/ending wildcard
			use # or . for id vs class
		ex: .~42 or #menuthing~ or li or div
		TODO: placing wildcards anywhere...
	*/
	this.closest = function(s){
		if (context == false) return _p;
		var o = _c;
		//What CSS thing to look for
		var ct = s.substring(0,1) == '.' ? 'className' : s.substring(0,1) == '#' ? 'id' : false;
		if (ct){
			s = s.substring(1);
			//If it has an ending wildcard
			var ends = s.substring(1,2) == '~';
			if (ends) s = s.substring(1);
			//If it has a starting wildcard
			var starts = s.substring(s.length-1) == '~';
			if (starts) s = s.substring(0,s.length-1);
		}
		//Reverse DOM traversal
		while(o.parentNode){
			if ((ct && (!starts && !ends && o[ct] == s)
				|| (starts && ends && o[ct].indexOf(s) > -1)
				|| (starts && !ends && o[ct].indexOf(s) == 0)
				|| (!starts && ends && o[ct].indexOf(s) == o[ct].length-s.length))
				|| (!ct && o.tagName == s.toUpperCase()))
				return o
			o = o.parentNode;
		}
		return false;
	};
	
	/** UTILITIES **/
	this.getValue = function(v,args){
		if (_p.isFn(v)){
			if (!_p.isArr(args)) args = [args];
			v = v.apply(_c, args);
		}
		if (_p.isFn(v) || !_p.isset(v)) return null;
		return v;
	}
	//Gets the length of an object {}, or array []
	this.length = function(obj){
		var aCount = 0;
		for(var i in obj)
			aCount++
		return aCount;
	}
	//Tells the location of a key in an array or the key in a hash (arr/obj | key/val)
	this.find = function(a1, a2){
		for (var i in a1)
			if (a1[i] == a2)
				return _p.isArr(a1) ? parseInt(i) : i;
		return -1;
	}
	//Container to search | key
	this.contains = function(a1,a2, useOld){
		//a1 contains a2; or context contains a1
		if (_p.isDOMNode(a1)){
			//If the context isn't set, it can't be true
			if (context == false) return false;
			cont = a2 ? a1 : _c;
			if (a2) a1 = a2;
			//Handle if node is a child of another node
			if (window.Node && Node.prototype && !Node.prototype.contains)
				return !!(cont.compareDocumentPosition(a1) & 16);
			return cont.contains(a1);
		}
		//Does a wildcard lookup on a string; use % for wildcards
		/* A regex approach is half as small, but is .09ms slower; Use this if you prefer speed:
			var query = a2.split("%");
			for (var i in query){
				if (query[i] != ""){
					var loc = a1.indexOf(query[i]);
					if (loc > -1) a1 = a1.substring(loc+query[i].length)
					//the last element MUST equal the rest of %actVal
					if (loc == -1 || (i == query.length-1 && a1 != ""))
						return false;
				}
			}
			return true;
		*/
		else if (_p.isStr(a1))
			return (new RegExp("^"+a2.replace(/([.+$^|*?{\}\\[\](\)])/g, "$1\\").replace(/%/g,".*?")+"$", "g")).test(a1);
		else{
			//Handle generic objects (attributes) or arrays (items)
			var arr = _p.isArr(a1);
			for(var n in a1)
				if ((arr && a1[n] == a2) || n == a2)
					return true;
			return false;
		}
	};
	this.clone = function(o,deep){
		//if o is a DOM node, clone the node
		if (_p.isDOMNode(o)) return o.cloneNode(deep == true);
		//If no object is set, return the cloned context
		if (!_p.isset(o) || _p.isBool(o)){
			if (context == false) return false;
			return _c.cloneNode(o == true);
		}
		//If object is empty, do nothing
		if (_p.length(o) == 0) return {};
		//Otherwise, make a new object to hold our cloned object
		var temp = _p.isArr(o) ? [] : {};
		for (var i in o){
			//Deep cloning
			if (deep && _p.isObj(o[i])) temp[i] = _p.clone(o[i]);
			else temp[i] = o[i];
		}
		return temp;
	};
	this.isArr = function (a){return _p.isset(a) && a.constructor === Array;};
	this.isNum = function (n){return typeof n === "number";};
	this.isFn = function (f){return typeof f === "function";};
	this.isStr = function (s){return typeof s === "string";};
	this.isDOMNode = function (e){return _p.isset(e) && e.nodeType;};
	this.isBool = function (o){return typeof o === "boolean";};
	this.isObj = function (o){return typeof o === "object";};
	//Is the variable null or undefined?
	this.isset = function (v){return v != null && v != undefined;}
	//Random generators
	this.ranString = function (len,useUpper){
		var chars = '1234567890abcdefghijklmnopqrstuvwxyz', s = '';
		//default length is eight characters
		len = len || 8;
		for (var i=0;i<len;i++){
			var ran = _p.ranNum(36), c = chars[ran];
			if (useUpper && /\D/.test(c) && _p.ranNum(2))
				c = c.toUpperCase();
			s += c;
		}
		return s;
	};
	this.ranNum = function (limit){
		return Math.floor(Math.random()*limit);
	};
		
	/** STYLES **/
	this.text = function(t,add){
		if (context == false) return _p;
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			if (add) context[i].innerHTML += t;
			else context[i].innerHTML = t;
		}
		return _p;
	}
	this.objPos = function(){
		if (context == false) return false;
		var pos = [0,0];
		while (_c.offsetParent){
			pos[0] += _c.offsetLeft;
			pos[1] += _c.offsetTop;
			_c = _c.offsetParent;
		}
		//FF uses the body offset property
		pos[0] += Math.abs(document.body.offsetLeft);
		pos[1] += Math.abs(document.body.offsetTop);
		return pos;
	};
	//Style sanitizing
	this.jscriptStyle = function(css){
		//hypen separated words eg. font-Size
		if (_p.isStr(css))
			css = css.replace(/([A-Z])/g, "-$1").toLowerCase();
		return css;
	};
	this.camelStyle = function(css){
		if (_p.isStr(css))
			css = css.replace(/\-(\w)/g, function(str, letter){return letter.toUpperCase();});
		return css;
	};
	this.styleSupported = function(s){
		s = _p.camelStyle(s);
		if (_p.isset(document.body.style[s])) return s;
		var browsers = 'Moz Webkit Ms O Khtml'.split(' ');
		//remove vendor prefixes to start
			//TODO, right here
		for(var i in browsers){
			var newS = _p.camelStyle(browsers[i]+"-"+s);
			if (_p.isset(document.body.style[newS]))
				return newS;
		}
		return false;
	};
	/* Get element style
		If parsePx is set, will parse the return value with the toPixels method
		Thanks to Christian C. Salvadó for the original script
	*/
	this.getStyle = function(css, parsePx){
		if (context == false) return null;
		var value = null;
		//If getComputedStyle is supported
		if (document.defaultView){
			css = _p.jscriptStyle(css);
			value = document.defaultView.getComputedStyle(_c, null).getPropertyValue(css);
		}
		//Otherwise, use mircosoft syntax
		else if (_c.currentStyle){
			// sanitize property name to camelCase
			css = _p.camelStyle(css);
			value = _c.currentStyle[css];
			// convert other units to pixels on IE
			if (/^\d+(%|cm|em|ex|in|mm|pc|pt)?$/i.test(value)){
				value = (function(value){
					var oldLeft = _c.style.left, oldRsLeft = _c.runtimeStyle.left;
					_c.runtimeStyle.left = _c.currentStyle.left;
					_c.style.left = value || 0;
					value = _c.style.pixelLeft + "px";
					_c.style.left = oldLeft;
					_c.runtimeStyle.left = oldRsLeft;
					return value;
				})(value);
			}
		}
		//Get style attribute (if caps to - parsing failed)
		if (!_p.isset(value) || value == 'auto' || value == ''){
			var n_value = _c.style[css];
			if (_p.isset(n_value) && n_value != '')
				value = n_value;
		}
		//If it isn't a number or has multiple inputs
		if (isNaN(parseFloat(value)) || value.split(" ").length > 1){
			if (parsePx == true) return _p.toPixels(value);
			else if (!_p.isset(value) || value == 'auto' || value == '') return 0;
			return value;
		}
		return parseFloat(value);
	};
	//Get pixel value
	//Thanks to Stephen Stchur
	this.toPixels = function(str,deep){
		//If it already has pixel values, we don't need to parse
		if (/px$/.test(str) || _p.isNum(str)) return  parseFloat(str);
		//Parse various units
		if (/^\d+(%|cm|em|ex|in|mm|pc|pt)?$/i.test(str)){
			var px = (function(value){
				var oldLeft = _c.style.left, oldRsLeft = _c.runtimeStyle.left;
				_c.runtimeStyle.left = _c.currentStyle.left;
				_c.style.left = value || 0;
				value = _c.style.pixelLeft + "px";
				_c.style.left = oldLeft;
				_c.runtimeStyle.left = oldRsLeft;
				return value;
			})(str);
		}
		//Otherwise, testing border width will do
		else{
			//Create an element to calculate the px value
			var tmp = document.createElement('div');
			tmp.style.visbility = 'hidden';
			tmp.style.position = 'absolute';
			tmp.style.lineHeight = '0';
			tmp.style.borderStyle = 'solid';
			tmp.style.borderBottomWidth = '0';
			tmp.style.borderTopWidth = str;
			var par = !context || _c == window ? document.body : _c;
			par.appendChild(tmp);
			var px = tmp.offsetHeight;
			par.removeChild(tmp);
		}
		return parseFloat(px);
	};
	this.parseUnsupportedCSS = function(){
		//Compile an array with the actual file's style sheet
		var getRules = function(file, browserRules){
			//Parse the CSS file into a usable JavaScript object
			var isStarted = false;
			var rules = [];
			//temporary storage of style items: 0=style, 1=value
			var placeHolder = 0;
			var tempFile = ["",""];
			//loop through every character in the file
			for (var loc = 0; loc < file.length; loc++){
				var c = file.charAt(loc);
				//If looking at a style rule
				if (isStarted){
					//check if it is the start of a string
					if (/["']/.test(c)){
						//find the end of the string
						var end = loc+1+file.substring(loc+1).indexOf(c);
						//there is no end to the string
						if (end < loc+1){
							tempFile[placeHolder] += file.substring(loc);
							break;
						}
						//skip to the end of the string
						else{
							tempFile[placeHolder] += file.substring(loc,end+1);
							loc = end;
						}
					}
					//check if it is the start of a commment
					else if (c == "/" && file.charAt(loc+1) == "*"){
						//comment started, skip to the end of the comment
						var end = loc+2+file.substring(loc+2).indexOf("*");
						//there is no end to the comment
						if (end < loc+2) break;
						//skip to the end of the comment
						else loc = end+1;
					}
					//check if the rule is ending
					else if (c == "}") isStarted = false;
					//check if its the beginning of a style declaration
					else if (c == ":") placeHolder = 1;
					//check if its the end of a style declaration
					else if (c == ";"){
						//End the current style
						placeHolder = 0;
						//Add it to the rules object, trimmed
						rules[rules.length-1][_p.camelStyle(tempFile[0].replace(/^\s+|\s+$/g,""))] = 
							tempFile[1].replace(/^\s+|\s+$/g,"");
						tempFile = ["",""];
					}
					//add the character to the temp string
					else tempFile[placeHolder] += c;
				}
				//Otherwise, check if the style rule is starting
				else if (c == "{"){
					isStarted = true;
					//add an item to the rules
					rules.push({});
				}
			}
									
			//We now have a browserRules and rules array
			//Let's compare them and add stuff in
			for (var r in rules){
				for (var style in rules[r]){
					var supS = _p.styleSupported(style);
					//Update the browser's supported style
					//TODO: longhand CSS conversion
					if (supS && supS != style)
						browserRules[r].style[supS] = rules[r][style];
				}
			}
		};
				
		//Fetches the style sheets via AJAX, then checks for unsupported styles
		for (var sheet in document.styleSheets){
			var curSheet = document.styleSheets[sheet];
			if (_p.isset(curSheet.type)){
				//Compile an array with the browser's style sheet
				var sheetRules = curSheet[curSheet.cssRules ? 'cssRules' : 'rules'];
				var browserRules = [];
				for (var r in sheetRules)
					if (_p.isset(sheetRules[r].style))
						browserRules.push(sheetRules[r]);
				//Make sure this closure function has the right rules
				(function(_p,_c,browserRules){
					var closure = function(file){
						getRules.apply(_c, [file, browserRules]);
					}
					//If its a node, we just need to give the innerHTML
					var parentSyntax = curSheet.ownerNode ? 'ownerNode' : 'owningElement';
					if (curSheet[parentSyntax].tagName.toLowerCase() == 'style')
						closure(curSheet[parentSyntax].innerHTML);
					//Otherwise, we need to fetch it via AJAX
					else if (_p.isset(document.styleSheets[sheet].href))
						_p.ajax(document.styleSheets[sheet].href,{type:'get',html:false,oncomplete:closure});
				})(_p,_c,browserRules);
			}
		}
	}

	/** EVENTS
		Making your own events:
			- using custom triggers (triggers linked to browser-supported events)
			- making custom events with the addEvent and removeEvent functions
		Listening for events:
			- bind() to add a listener
			- unbind() to remove a listener
	**/
	//A global accessor method for bind('document.ready')
	this.ready = function(fns){
		//register methods to the document
		var cx = window[globalS](document);
		if (!isReady) cx.bind('document.ready',fns);
		else cx.fire(fns);
		return _p;
	}
	//fires an event with THIS set to the active context
	this.fire = function(fns, args){
		var args = _p.isset(args) ? _p.isArr(args) ? args : [args] : [];
		var cx = !context ? [window] : context;
		if (!_p.isArr(fns)) fns = [fns];
		for (var i = _super ? 0 : pointer; i<(_super ? cx.length : pointer+1); i++)
			for (var f in fns)
				fns[f].apply(cx[i], args);
		return _p;
	}
	//this will override existing custom events, but not preloadEvents
	this.addEvent = function(ids,fns){
		var pres = settings.event.preloadEvents.split(" ");
		//make fns an array, regardless
		fns = fns || [];
		if (_p.isFn(fns)) fns = [fns];
		//split ids into an array, regardless
		if (_p.isStr(ids)) ids = ids.split(" ");
		var arr = _p.isArr(ids);
		for (var i in ids){
			var id = arr ? ids[i] : i;
			if (!_p.contains(pres, id)){
				if (!arr) fns = !_p.isArr(ids[i]) ? [ids[i]] : ids[i];
				settings.event.customEvents[id] = fns;
			}
		}
		return _p;
	};
	this.removeEvent = function(id){
		//removing all the custom events
		if (id == '*') settings.event.customEvents = {};
		//removing all the custom events from a space separate string of id's
		else{
			id = id.split(" ");
			for (var i=0; i<id.length; i++)
				delete(settings.event.customEvents[i])
		}
		return _p;
	};
	//trigger a custom event (id=reference, args=an array of arguments to send)
	this.trigger = function(ids,args){
		if (_p.isStr(ids)) ids = ids.split(" ");
		var obj = !_p.isArr(ids);
		//IE quirk, args must be defined
		//If we aren't using object syntax, set it
		if (!obj) args = args || [];
		//create arguments array
		if (!obj && _p.isset(args) && !_p.isArr(args)) args = [args];
		//loop through triggering
		for (var i in ids){
			var id = obj ? i : ids[i];
			var evs = settings.event.customEvents[id];
			//do nothing, if the trigger couldn't be fired
			if (_p.isset(evs)){
				//validate args syntax, if using objects
				if (obj){
					args = ids[i];
					if (!_p.isArr(args)) args = [args];
				}
				//fire the events
				for(var i=0; i<evs.length; i++)
					evs[i].apply(_c,args);
			}
		}
		return _p;
	};
	//Checks whether the event trigger is supported by the browser
	this.eventSupported = function(trig){
		var tagTriggers = {'select':'input','change':'input','submit':'form','reset':'form','error':'img','load':'img','abort':'img'};
		var el = document.createElement(tagTriggers[trig] || 'div');
		var evName = 'on'+trig;
		var isSupported = (evName in el);
		//Set attribute fall back
		if (!isSupported){
			try{
				el.setAttribute(evName, 'return;');
				isSupported = _p.isFn(el[evName]);
			}catch(error){}
		}
		el = null;
		return isSupported;
	};
	this.customSupported = function(at){
		var customT = false;
		for (var cevts in settings.event.customTriggers){
			if (_p.contains(cevts.split(" "),at)){
				customT = cevts;
				break;
			}
		}
		if (customT){
			//if we need to override existing
			var needOverride = _p.isset(settings.event.customTriggers[cevts].override) ? settings.event.customTriggers[cevts].override : settings.event.customOverride;
			//Disable custom use, if override is false and the trigger is supported
			if (!needOverride && _p.eventSupported(at)) customT = false;
		}
		return customT;
	}
	//Clones the event variable so its properties can be parsed to valid W3C
	this.cloneEvent = function(e){
		//Make a new object to hold it
		var tempE = {};
		tempE.original = e;
		tempE.clonedEvent = true;
		for (var i in e){
			//Deep cloning: CURRENTLY NOT AVAILABLE, gives wierd errors
				//if (this.isObj(e[i])) tempE[i] = this.clone(e[i]);
			if (_p.isFn(e[i])) tempE[i] = (function(id, e){
				return function(){e.original[id]()};
			})(i, tempE);
			else tempE[i] = e[i];
		}
		return tempE;
	}
	//Adds a listener to a particular event (be it: browser triggered, custom triggered, or custom events)
	this.bindSimple = function(trig,fn){
		if (context == false) return _p;
		//bindSimple can handle multiple trigs and fns
		if (!_p.isArr(fn)) fn = [fn];
		trig = trig.split(" ");
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			for (var f in fn){
				for (var t in trig){
					if (window.addEventListener) context[i].addEventListener(trig[t],fn[f],false);
					else context[i].attachEvent('on'+trig[t],fn[f]);
				}
			}
		}
		return _p;
	}
	/* PARAMS options
		x simple: without any parsing
		x data: sending of data through e.data
		x args: sending of data through the return methods' arguments
		- bub: bubbling (UNTESTED)
		x def: preventing default action
		- prop: using propogation instead of bubbling (TODO)
		x id: a string to identify the registered events
		x event: parse the event's event variable
		x eventIE: event parsing specific to Microsoft model
		x eventOTHER: event parsing specific to W3C model
		x parseOverride: whether the event parsing should override default parsing
	*/
	this.bind = function (evts,params,optparams){
		/* Register events to the epDat.evts variable
			evts: the list of method handlers
			params: parameters we set for this particular event
			trigger: the registered trigger (click, hotkey:data, drag, etc)
		*/
		var makeEvent = function(evts,params,trigger){
			//This method does a recursive add, since events can be embedded
			//See the egg.js API for details: [fn, [fn, params], params]
			if (!_p.isset(params)) params = {};
			//evts will always be an array of actions
			//the last item will either be a params (for event specific params) or fn
			if (!_p.isFn(evts[evts.length-1])){
				//get the params object
				var nP = evts[evts.length-1];
				//merge the original params with the new one
				for (var i in nP)
					params[i] = nP[i];
			}
			for (var f in evts){
				if (_p.isFn(evts[f])){
					//make the event name
					var n = null, evtID = _p.ranString(5);
					if (_p.isset(params.id)) n = params.id;
					//Loop through all the elements, and add the event
					for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
						//store event data: [method, evt_parser, evt_id]
						context[i].epDat.evts[trigger][evtID] = [evts[f],(function(fn,params,me){
							//Make the new parsed function:
							var ie = !window.addEventListener, nfn = "";
							//bubbling/default
							if (params.bub == false) nfn += "e.stopPropagation();";
							if (params.def == false) nfn += "e.preventDefault();";
							//Parsing event data
							if (params.parseOverride == true) nfn += "e = _p.cloneEvent(e.original);";
							if (_p.isset(params.data)) nfn += "e.data = params.data;";
							if (_p.isset(params.event)) nfn += "e = params.event.call(me, e);";
							if (ie && _p.isset(params.eventIE)) nfn += "e = params.eventIE.call(me, e);";
							if (!ie && _p.isset(params.eventOTHER)) nfn += "e = params.eventOTHER.call(me, e);";
							//Sending event arguments
							nfn += "fn.apply(me, "+(_p.isset(params.args) ? "[e].concat(params.args));" : "[e]);");
							return function(e){eval(nfn);}
						})(evts[f],params,context[i]),n];
					}
				}
				//Otherwise, create the new binding sequence, since we're looping through a bunch of binds...
				//Make sure we are sending a params clone, not a reference, or there will be funky errors
				else if (_p.isArr(evts[f]))
					makeEvent(evts[f],_p.clone(params),trigger);
			}
		};
		/* Create the parser for this specific trigger
			trigger: the registered trigger + data (hotkey:data)
			actTrigger: the registered trigger - data
			ie: browser doesn't support addEventListener
			customT: this is a custom-built trigger (see egg.js API: custom triggers)
		*/
		var makeParser = function(trigger, ie, customT){
			//Setup the cue of triggers for custom triggers
			if (customT){
				//a list of cued browser-supported trigger links
				//needs to be a clone, since we're removing the cueStart/cueEnd later
				var cued = _p.clone(settings.event.customTriggers[customT].link);
				var isCued = _p.isArr(cued);
				//the cueEnd event tells when to stop firing the custom trigger; it isn't required
				//cuedEnd tells whether cueEnd should be cued or if it should just always be listening
				var cueEnd = false, cuedEnd = false;
				if (isCued && cued.length > 1){
					//if we need to cue the cue-end variable, don't remove from the cued array
					var pcueEnd = cued[cued.length-1];
					if (_p.isset(pcueEnd.cued) && _p.getValue(pcueEnd.cued,trigger)){
						cuedEnd = true;
						cueEnd = pcueEnd;
					}
					if (!cuedEnd) cueEnd = cued.pop();
				}
				//The cued triggers that will need to be removed when cueEnd fires
				if (cueEnd != false){
					var remCue = _p.clone(cued);
					//cueEnd shouldn't be removed if it isn't cued
					if (cuedEnd) remCue.pop();
					//cueStart should never be removed
					remCue.shift();
				}
				//cueStart is required
				var cueStart = isCued ? cued[0] : cued;
			}
			//Loop throuh all the elements and add the parser function
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				//If this context doesn't already have an mbParse
				if (!_p.isset(context[i].epDat.evts[trigger])){
					//A reference to this global accessor
					var eMe = window[globalS](context[i]);
					//Initialize epDat variables
					var dat = context[i].epDat.evts[trigger] = {};
					if (customT){
						dat.$cue = {
							cue: 0, //we need a way to remember where we are in the cue
							dat: {}, //holds generic data, depends on the trigger implementation
							evt: {} //holds custom trigger event data (such as e.dragX)
						}
					}
					var mfn = dat.mbParse = (function(dat,me,trigger,customT,cued,isCued,cueStart){
						pfn = "";
						//Parse custom events
						if (settings.bind.parseEvents == true){
							if (ie) pfn += "e = settings.bind.eventIE.call(me,egg.cloneEvent(window.event));";
							else pfn += "e = settings.bind.eventOTHER.call(me,egg.cloneEvent(e));";
							if (customT != false){
								//If custom event, check whether event is valid
								pfn += "var valid_evt = !isCued ? window[globalS](me).getValue(cueStart.valid,[e,trigger,dat.$cue.dat]) : settings.event.customParser.apply(me,[e,trigger,cued]);";
								//Set the type of our event to be the custom type
								//The custom event variable we've been compiling will now be merged with the actual one
								pfn += "if (valid_evt){e.type = trigger; for (var x in dat.$cue.evt) e[x] = dat.$cue.evt[x]; for (var d in dat) if (/^(?!mbParse|\\$cue)+/i.test(d)) dat[d][1](e);}";
							}
						}
						//Fire all the listening events
						if (customT == false) pfn += "for (var d in dat) if (/^(?!mbParse|\\$cue)+/i.test(d)) dat[d][1](e);";
						eval("var hey = function(e){"+pfn+"}");
						return hey;
					})(dat,context[i],trigger,customT,cued,isCued,cueStart);
					//add the listeners
					if (customT){
						//Register the cue-start
						var custC = eMe.getValue(cueStart.target, trigger) || context[i];
						window[globalS](custC).bindSimple(eMe.getValue(cueStart.trigger, trigger), mfn);
						//Register the cue-end
						if (cueEnd != false){
							//The method that removes all the old cued triggers
							dat.$cue.uncue = (function(dat, remCue, me, eMe, mfn, def, bub){
								return function(e){
									if (dat.cue > 0){
										if (def) e.preventDefault();
										if (bub) e.stopPropagation();
										//If the end-cue is cued, don't reset the cue just yet - the parser will do it for us
										var limit = remCue.length;
										if (dat.cue != remCue.length+1){
											limit = dat.cue;
											dat.cue = 0
										}
										//Remove the cued triggers (besides start or end)
										for (var i=0; i<limit; i++)
											window[globalS](remCue[i].target || me).unbindSimple(eMe.getValue(remCue[i].trigger, trigger), mfn);
									}
								}
							})(dat.$cue, remCue, context[i], eMe, mfn, eMe.getValue(cueEnd.def, trigger) != false, eMe.getValue(cueEnd.bub, trigger) != false);
							custC = eMe.getValue(cueEnd.target,trigger) || context[i];
							window[globalS](custC).bindSimple(eMe.getValue(cueEnd.trigger,trigger), dat.$cue.uncue);
						}
					}
					//Add non-custom listeners
					else window[globalS](context[i]).bindSimple(trigger,mfn);
				}
			}
		}
		
		//BIND METHOD
		//parse simple syntax into advanced
		if (_p.isStr(evts)){
			var nevts = {};
			nevts[evts] = params;
			evts = nevts;
			params = optparams;
		}
		if (!_p.isset(params)) params = {};
		//set element's event data variable
		//each hash in the object denotes an event trigger
		if (context != false){
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++)
				if (!_p.isset(context[i].epDat.evts))
					context[i].epDat.evts = {};
		}
		//loop through events
		for(var evt in evts){
			//make sure the fns/params for each trigger is an array
			if (!_p.isArr(evts[evt])) evts[evt] = [evts[evt]];
			//loop through triggers for each event
			var triggers = evt.split(" ");
			for(var t in triggers){
				//The current trigger
				var trigger = triggers[t];
				//Remove data specificity (hotkey:data)
				var actTrigger = trigger.split(/:/)[0];
				/* Event registration priority:
					1) custom triggers (override browser triggers)
					2) browser triggers
					3) custom triggers (not supported by browser)
					4) preload events
					5) custom events
				*/
				//Is this event supported as a custom trigger?
				var customT = _p.customSupported(actTrigger), customE = false;
				//Is this event natively supported by the browser?
				if (!customT) var support = _p.eventSupported(actTrigger);
				//If not a custom trigger, and it isn't a built-in browser event, check the custom events
				if (!customT && !support){
					//remove id specificity, will be added back in later (animate.start#ID)
					var no_id = trigger.split("#")[0];
					//check preload_events and custom_events
					if (_p.contains(settings.event.preloadEvents.split(" "), no_id) || _p.contains(settings.event.customEvents, no_id)){
						customE = true;
						//if it was a preload event and hasn't been created yet, create the event
						if (!_p.isset(settings.event.customEvents[trigger])) settings.event.customEvents[trigger] = evts[evt];
						//otherwise, it should already exist
						else settings.event.customEvents[trigger] = settings.event.customEvents[trigger].concat(evts[evt]);
					}
				}
				//If we need to add parsing methods (it isn't a custom event)
				//This requires a context, so if none is set, just skip this trigger
				if (!customE && context != false){
					//If its a simple event, just add the listeners
					//this will apply to all contexts, by default
					if (params.simple == true && !customT && support)
						for (var f in evts[evt])
							_p.bindSimple(actTrigger, evts[evt][f]);
					else{
						/* If a parser hasn't been made yet, make one
							The parser will parse events to the W3C model
						*/
						makeParser(customT ? trigger : actTrigger, !window.addEventListener,customT);
						/* Each event is specific to the event handler; it is fired by the parser
							it will handle prop, bub, data, args, etc parameters
							make sure params is a clone, or their will be reference errors
						*/
						makeEvent(evts[evt],_p.clone(params), customT ? trigger : actTrigger);
					}
				}
			}
		}
		return _p;
	};
	//Removes a bind event
	this.unbindSimple = function(trig, fn){
		if (context == false) return _p;
		//bindSimple can handle multiple trigs and fns
		if (!_p.isArr(fn)) fn = [fn];
		if (_p.isStr(trig)) trig = trig.split(" ");
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			for (var f in fn){
				for (var t in trig){
					if (window.addEventListener) context[i].removeEventListener(trig[t],fn[f],false);
					else context[i].detachEvent('on'+trig[t],fn[f]);
				}
			}
		}
		return _p;
	}
	this.unbind = function(search,optparams){
		//Cleans up the trig from the epDat.evts variable
		destroyEvent = function(context, trig, fn){
			//CT: first check for custom triggers
			var customT = _p.customSupported(trig);
			if (customT){
				for (var trigSeq in settings.event.customTriggers){
					if (_p.contains(trigSeq.split(" "),trig)){
						var cEvt = settings.event.customTriggers[trigSeq].link;
						break;
					}
				}
				if (!_p.isArr(cEvt)) cEvt = [cEvt];
				for (var t in cEvt){
					var trigs = _p.getValue(cEvt[t].trigger,trig);
					trigs = trigs.split(' ');
					var custC = _p.isset(cEvt[t].target) ? _p.getValue(cEvt[t].target,trig) : context;
					un_fn = (t==cEvt.length-1) && (t>1) ? context.epDat.evts[trig].$cue.uncue : fn;
					for (var i in trigs)
						$(custC).unbind(trigs[i],un_fn);
				}
			}
			//remove trigger listeners
			else _p.unbindSimple(trig,fn);
			//delete the trigger object
			delete context.epDat.evts[trig];
		}
		
		if (_p.isset(optparams)){
			nsearch = {};
			nsearch[_p.isArr(search) ? search.join(" ") : search] = optparams;
			search = nsearch;
		}
		//remove all events
		if (search == '*'){
			//if no context is set, just return now...
			if (context == false) return _p;
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				var evts = context[i].epDat.evts;
				for (var id in evts){
					//each id denotes a trigger
					if (window.detachEvent) context[i].detachEvent('on'+id, evts[id].mbParse);
					else context[i].removeEventListener(id, evts[id].mbParse, false);
				}
				//remove the evts variable, to save memory
				delete context[i].epDat.evts;
			}
		}
		/* Basic Overview
			`search` is all the searches; it is an array
			`syn` is the specific syntax being used for that array item:
				- id (custom event id)
				- trigger (basic event trigger)
				- action (attached method)
			See below for specific allowed syntaxes
		*/
		else{
			//always turn the search into an array, even if using syntax #1
			if (!_p.isArr(search)) search = [search];
			for (var syn in search){
				//check which type of syntax we're using, array vs object
				var s = search[syn];
				//isArr = true if using syntax #2
				var isArr = _p.isArr(s);
				//Make single searches into arrays (ex: string -> [string])
				if (!isArr && (_p.isStr(s) || _p.isFn(s))){
					s = [s];
					isArr = true;
				}
				//s[i] value will either be a string, function, or object (#1 syntax)
				for (var i in s){
					//GET TRIGGERS VARIABLE (an array of trigs/ids)
					var isMulti = false;
					var isS = _p.isStr(s[i]);
					//for syntax #2
					if (isArr && isS){
						s[i] = s[i].split(" ");
						//CE: remove custom events
						for (var t in settings.event.customEvents){
							//If the trigger is actually a customEvent
							var loc = _p.find(s[i],t);
							if (loc != -1){
								_p.removeEvent(t);
								s[i].splice(loc);
							}
						}
					}
					//for syntax #1
					else{
						//'i' will always be a space separated string of triggers for syntax #1
						triggers = i.split(" ");
						//parse triggers:[ids, method] syntax to triggers:[[ids],[method]]
						if (_p.isArr(s[i]) && s[i].length > 1){
							isMulti = true;
							s[i][0] = s[i][0].split(" ");
							if (!_p.isArr(s[i][1])) s[i][1] = [s[i][1]];
						}
						//if using trigger:'id id id' syntax, split s[i] to an array
						if (isS) s[i] = s[i].split(" ");
						//make sure s[i] is always an array
						if (!_p.isArr(s[i])) s[i] = [s[i]];
						
						//CE: first remove any custom events from the triggers
						for (var t in settings.event.customEvents){
							//If the trigger is actually a customEvent
							var loc = _p.find(triggers,t);
							if (loc != -1){
								for (var f in s[i]){
									var fncheck = s[i][f];
									//Delete the function from the customEvent array, if it exists
									if (_p.isFn(fncheck)){
										fnloc = _p.find(settings.event.customEvents[t], fncheck);
										if (fnloc != -1) settings.event.customEvents[t].splice(fnloc);
									}
								}
								//remove from the triggers array
								triggers.splice(loc);
							}
						}
					}
					//TODO SOMEDAY: stop looking once the target number of unbinds is met
					//loop through all the elements and their events to remove
					//this requires a context, so if none is set, return
					if (context == false) return _p;
					for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
						var evts = context[x].epDat.evts;
						for (var trig in evts){
							//remove entire triggers
							if (isArr && isS && _p.contains(s[i],trig))
								destroyEvent(context[x], trig, evts[trig]['mbParse']);
							//remove individual trigger events
							for (var id in evts[trig]){
								/*
									evts[trig][id][0] == method
									evts[trig][id][1] == parser_method
									evts[trig][id][2] == evt_id

									#2 Syntax AND
										[String] syntax OR
										method syntax
									#1 Syntax AND
										[triggers]:[[ids],[methods]] syntax OR
										[triggers/ids]:[methods] syntax OR
										[triggers]:[ids] syntax
								*/
								var cid = evts[trig][id];
								if ((isArr && (
										(isS && _p.contains(s[i],cid[2])) || 
										(!isS && cid[0] == s[i]))) ||
									(!isArr && (
										(!isS && isMulti && _p.contains(triggers,trig) && _p.contains(s[i][0],cid[2]) && _p.contains(s[i][1],cid[0])) ||
										(!isS && _p.contains(s[i],cid[0]) && (_p.contains(triggers,trig) || _p.contains(triggers,cid[2]))) ||
										(isS && _p.contains(triggers,trig) && _p.contains(s[i],cid[2]))))){
									//Do stuff here...
									delete context[x].epDat.evts[trig][id];
									//if there are no more methods for this trigger, remove the trigger
									var trigDat = context[x].epDat.evts[trig];
									var evtLen = _p.length(trigDat)
									//FIX THIS RIGHT HERE!!!!!!!!!!!!!!!!!! (i might have just fixed this, with $cue)
									if (evtLen == 1 || evtLen == 2 && _p.isset(trigDat.$cue))
										destroyEvent(context[x], trig, evts[trig]['mbParse']);
								}
							}
						}
					}
				}
			}
		}
		return _p;
	};
	
	/** ELEMENTS **/
	//adds child elements based on Zen Coding syntax
	this.zen = function(returnNew, syn, loc){
		//TODO: debug 
		if (context == false) return _p;
		//parse syntax
		if (!_p.isBool(returnNew)){
			syn = returnNew;
			loc = syn;
			returnNew = false;
		}
		var firstEl = false;
		//this regex string will find any match that isn't inside quotes/escaped quotes
		var quotes = "(?=(?:[^'\\\\]*(?:\\\\.|'(?:[^'\\\\]*\\\\.)*[^'\\\\]*'))*[^']*$)";
		//trim whitespace/parentheses
		//replace )x( with x)(
		//split at the parentheses
		syn = syn.replace(/^[\(\s]+|[\)\s]+$/g,"").replace(new RegExp("(\\)([\\+>])\\()"+quotes,"g"),"$2)(").split(new RegExp("(?:\\)\\(|\\(|\\))"+quotes,"g"));
		//Descend/Ascend the array tree (item will always be an array)
		var cascade = function(item){
			var newsyn = [], synloc = newsyn, parsyn = [];
			for (var i in item){
				//trim starting/ending tree modifiers
				var trim = item[i].replace(/^[>\+]|[>\+]$/g,"");
				//if the item ends with a >, descend the following item[i]'s
				if (/>$/.test(item[i])){
					parsyn.push(synloc);
					synloc = synloc[synloc.push([trim,[]])-1][1];
				}
				else{
					synloc.push(trim);
					//if the item starts with a +, ascend the following item[i]'s
					if (item[i].charAt(0) == '+' && i != item.length-1){
						synloc = parsyn[parsyn.length-1];
						parsyn.pop();
					}
				}
			}
			return newsyn;
		};
		//take each item of the resulting array and do an embedded split from > (item will always be an array)
		var embedSplit = function(item){
			var newItem = [];
			for (var i in item){
				//recursive embedSplit for each item in the array tree
				if (_p.isArr(item[i]))
					newItem.push(embedSplit(item[i]));
				//if no split is needed (no +'s or >'s exist), simply push to the new array
				else if (item[i].search("[>+]"+quotes) == -1)
					newItem.push(i == item.length-1 ? [item[i]] : item[i]);
				//otherwise, do an embedded split on the string
				else{
					//a reference to the item[i] array that we'll be adding
					var oldItem = newItem[newItem.push([item[i]])-1];
					//the first time around, we want to set oldItem directly, rather than add another []
					var firstTime = true;
					while(true){
						/* Split by the first > character
						((?:(?:(?:(?:.|\\')(?!(?:\+|')))*)(?:(?:.\+)|(?:.'(?:[^']|\\')*')))*?)
							(?:(?:.|\\')(?!(?:\+|')))*
								- gets any character that isn't followed by a + or the start of a quoted section
							(?:.\+)|(?:.'(?:[^']|\\')*')
								- gets a + and its preceding character OR a the characters inside a quoted section
						([^\+]*?)>
							- get everything (that doesn't precede a +) up until the > character
						(.*$)
							- get everything after the > character
						*/
						var matched = oldItem[0].match(/((?:(?:(?:(?:.|\\')(?!(?:\+|')))*)(?:(?:.\+)|(?:.'(?:[^']|\\')*')))*?)([^\+]*?)>(.*$)/);
						//Returns null if no > matches were found
						var done = matched == null;
						//we have reached the end for this item
						if (done){
							matched = oldItem;
							var hasPlus = matched[0].search(new RegExp("\\+"+quotes)) != -1;
						}
						else{
							//the first match is the original
							matched.shift();
							//if the string contained +'s we need to split
							var hasPlus = matched[0] != '';
						}						
						//If we need to split into +'s
						if (hasPlus){
							//trim +'s off the end of matched[0], since it denotes that there will be a matched[1]
							if (!done) matched[0] = matched[0].replace(/\+$/,"");
							var newOpt = matched[0].split(new RegExp("\\+"+quotes, "g"));
							//if we set oldItem directly, it will no longer be a reference
							//instead, we must resort to setting each of its keys individually
							if (newOpt.length > 1) for (var o in newOpt) oldItem[o] = [newOpt[o]];
							else oldItem[0] = newOpt;
						}
						//If another > exists, we need to continue the loop
						if (!done){
							if (firstTime && !hasPlus){
								firstTime = false;
								oldItem[0] = matched[1];
								oldItem[1] = [matched[2]];
								oldItem = oldItem[1];
							}
							else{
								if (!hasPlus) oldItem[0] = [matched[1], [matched[2]]];
								else oldItem.push([matched[1], [matched[2]]]);
								oldItem = oldItem[oldItem.length-1][1];
							}
						}
						else break;
					}
				}
			}
			return newItem;
		};
		//Loop through the parsed syntax and addChildren  (item will always be an array)
		var birth = function(item, parent, parNum){
			if (_p.isStr(item[0]))
				item = [item];
			else if (_p.isArr(item[0][0]))
				item = item[0];
			//all syn[i] will be arrays, if are parser correctly did its job
			for(var i in item){
				//this splits our node data into smaller, usable chunks
				var split = item[i][0].match(/(^|[\.#[\]{}*])(([^'\.#[\]{}*]+)('(\\'|[^'])*')?|('(\\'|[^'])*'))+/g);
				var start = split[0].match(/^[\.#[{\*]/);
				//how should we handle this element?
				var type = start == null ? split.shift() : start == '{' && split.length == 1 ? 'textNode' : 'div';
				//add the element to the parent
				for (var p in parent){
					if (type == 'textNode'){
						parent[p].appendChild(document.createTextNode(split[0].substring(1)));
						if (item[i].length == 2) birth(item[i][1], parent);
					}
					else{
						//how many times to duplicate this node
						var dup = 1;
						//find how many times to duplicate the node, if needed
						for (var s=0; s<split.length; s++){
							if (split[s].charAt(0) == '*'){
								dup = parseInt(split.splice(s,1)[0].substring(1));
								break;
							}
						}
						//create the elements
						for (var x=0; x<dup; x++){
							var newEl = document.createElement(type),
							//class and attribute lists
							attrList = {}, classList = [], styleList = {}
							//the number reference (for $ insertion)
							numRef = dup == 1 ? parNum || i : x;
							//set the first added element, if we'll be returning it later
							if (!firstEl) firstEl = newEl;
							//add element properties
							for (var s=0; s<split.length; s++){
								var key = split[s].charAt(0), val = split[s].substring(1);
								//ID and Class attributes can contain the $ operator
								if (key == '.' || key == '#'){
									//replace $'s with the refNumber (if the sequence of $ doesn't start with \\)
									val = val.replace(/[^\$\\]\$+/g,function(a){
										var newStr = a.charAt(0);
										var numLen = numRef.toString().length;
										return numLen >= a.length-1 ? newStr+numRef : a.substring(0,a.length-numLen).replace(/\$/g,'0')+numRef;
									}).replace(/\\\$+/g,function(a){return a.substring(1);});
									//set id and class attributes
									if (key == '#') attrList['id'] = val;
									else classList.push(val);
								}
								else if (key == '{')
									newEl.appendChild(document.createTextNode(val.replace(/^(\\'|')|(\\'|')$/g, "").replace(/\\'/g,"'")));
								else if (key == '['){
									//attributes are separated by whitespace
									val = val.split(new RegExp("\\s(?!\\s|$)"+quotes,"g"));
									for (var v in val){
										//check for an = with a value after it
										var attr = val[v].split(new RegExp("=(?=.)"+quotes));
										attr[0] = attr[0].replace(/^(\\'|')|(\\'|')$/g, "").replace(/\\'/g, "'");
										var hasVal = attr.length == 2;
										if (hasVal) attr[1] = attr[1].replace(/^(\\'|')|(\\'|')$/g, "").replace(/\\'/g, "'")
										//handle the 'style' attribute
										if (hasVal && attr[0] == 'style'){
											var styles = attr[1].match(/(([^;:']+)([^;:']|('(\\'|[^'])*'))+)/g);
											//odd j's are the attributes, evens are the values
											for (var j=0; j<styles.length; j=j+2)
												if (styles[j] != '') styleList[styles[j]] = styles[j+1];
										}
										else attrList[attr[0]] = hasVal ? attr[1] : "";										
									}
								}
							}
							//add classes
							if (classList.length > 0) newEl.className = classList.join(" ");
							//add attributes
							for (var a in attrList){
								if (_p.isset(newEl[a]) || !newEl.setAttribute) newEl[a] = attrList[a];
								else newEl.setAttribute(a, attrList[a]);
							}
							//add styles
							for (var j in styleList)
								newEl.style[j] = styleList[j];
							//add the element to its parent
							parent[p].appendChild(newEl);
							//do a recursive birth on child nodes
							if (item[i].length == 2)
								birth(item[i][1], [newEl], numRef);
						}
					}
				}
			}
		}
		//Create the nodes
		birth(embedSplit(cascade(syn)), context);
		//return
		return returnNew && firstEl ? window[globalS](firstEl) : _p;
	};
	//removes the element from its parent
	this.remove = function(){
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++)
			context[i].parentNode.removeChild(context[i]);
	}
	this.addChild = function(type, props, styles, loc, optloc){
		if (context == false) return _p;
		//Parse different syntax options
		var returnNew = _p.isBool(type);
		//If we are returning the child context
		if (returnNew){
			type = props;
			props = styles;
			styles = loc;
			loc = optloc;
		}
		//Check if we're setting the location of the inserted node
		if (_p.isNum(props) || _p.isDOMNode(props)){
			loc = props;
			props = null;
		}
		if (_p.isNum(styles) || _p.isDOMNode(styles)){
			loc = styles;
			styles = null;
		}
		var el = _p.isStr(type) ? document.createElement(type) : type;
		//Set the element's properties
		for(var x in props){
			if (_p.isset(el[x]) || !el.setAttribute) el[x] = props[x];
			else el.setAttribute(x, props[x]);
		}
		for (var s in styles){
			var supS = _p.styleSupported(s);
			el.style[supS] = styles[s];
		}
		//add it to the contexts
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++)
			context[i].insertBefore(el, _p.isDOMNode(loc) ? loc : _p.isset(loc) && _p.isset(context[i].children[loc]) ? context[i].children[loc] : null);
		//Return the respective context
		return returnNew ? window[globalS](el) : _p;
	}
	this.addText = function(text, loc){
		var el = document.createTextNode(text);
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++)
			context[i].insertBefore(el, _p.isDOMNode(loc) ? loc : _p.isset(loc) && _p.isset(context[i].children[loc]) ? context[i].children[loc] : null);
	};
	//Sets the element style
	this.style = function(cssObj, optval){
		if (context == false) return _p;
		//for simple syntax: style(attr, val)
		if (_p.isset(optval)){
			var temp = {}
			temp[cssObj] = optval;
			cssObj = temp;
		}
		//set the styles
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			for (var s in cssObj){
				//Make sure we get the supported vendor-specific style
				var supS = _p.styleSupported(s);
				context[i].style[supS] = cssObj[s];
			}
		}
		return _p;
	};
	//Sets an element attribute
	this.attr = function(attrs, optval){
		if (context == false) return _p;
		//Parse simple syntax
		if (egg.isset(optval)){
			var temp = {};
			temp[attrs] = optval;
			attrs = temp;
		}
		//Set the attribute
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			for (var a in attrs){
				if (_p.isset(context[i][a]) || !context[i].setAttribute) context[i][a] = attrs[a];
				else context[i].setAttribute(a, attrs[a]);
			}
		}
	}

	/** PLUGIN SCRIPTS **/
	/* AJAX HISTORY
		Inspired by RHS and Bookmarks.
		Register history listeners through the ajax.historychange event.
		If the newHash equals the old, it will not fire a historychange; set 'force' to true to force the historychange
			ajax.historychange:
				ARGS: [oldHash, newHash] where oldHash is '' on first page load
				THIS: refers to the window

		Browser support
		- IE (quirks/standards)
		- Firefox
		- Opera
		- Safari
		- Chrome
		
		The following DOM ID's will create script conflicts
			- ajaxHistoryIframe
	*/
	this.history = function(newHash, force){
		//If no newHash is set, we are initialization ajax history
		if (!_p.isset(newHash)){
			//IE specific testing
			if (document.all && /MSIE (\d+\.\d+);/.test(navigator.userAgent)) var ieVersion = new Number(RegExp.$1);
			settings.history.isIE = _p.isset(ieVersion) && (ieVersion >= 8 && document.compatMode == 'BackCompat' || ieVersion < 8);
			//Use an iframe if the IE version isn't compatible (must be created with document.write)
			if (settings.history.isIE) document.write("<iframe id='ajaxHistoryIframe' style='display:none;'></iframe>");
			//Load historyChange listeners
			_p.ready(function(){
				//PRIVATE: Sets the new hash
				var notify = function(newHash, isIE){
					if (newHash != settings.history.oldHash){
						var oldHash = settings.history.oldHash || '';
						settings.history.oldHash = newHash;
						//IE's back button doesn't actually change the hash value
						//It also adds a #! on first load (thus firing two events onload), if you don't have the second condition statement
						if (isIE && oldHash.length+newHash.length != 0){
							//Prevent firing two events when you back-button to the root
							//Also, IE versions less than 8.0 can't remove the #! without reloading the page, unfortunately
							if (newHash == '') window.location.hash = settings.history.oldHash = '#!';
							else window.location.hash = newHash;
						}
						//Trigger the history change event
						egg.trigger('ajax.historychange',[oldHash.substring(2), newHash.substring(2)]);
					}
				}
		
				var onhashchangeSupport = _p.eventSupported('hashchange');
				//non-IE browsers need to check for back/forward presses, periodically
				var periodicUpdater = function(){
					notify(window.location.hash, false);
				}
				//For incompatible versions of IE, we need to check the iframe
				if (settings.history.isIE){
					//Our periodic updater will check if the user manually entered a url into the address bar
					periodicUpdater = function(){
						if (window.location.hash != settings.history.oldHash)
							_p.history(window.location.hash.substring(2));
					}
					//store the iframe into memory
					var iframe = $('#ajaxHistoryIframe');
					settings.history.iframeDoc = iframe.active().contentWindow.document;
					//history changes are fired from the iframe
					var loadHandler = function(){
						var datEl = this.contentWindow.document.body.firstChild;
						notify((datEl != null ? datEl.innerHTML : ''), true);
					}
					iframe.bind('load',loadHandler);
					//If the iframe has an initial value, notify of it
					var datEl = settings.history.iframeDoc.body.firstChild;
					if (datEl != null) notify(datEl.innerHTML, true);
					//Otherwise, create the initial value
					else{
						settings.history.iframeDoc.write("<div id='ajaxHistoryStorage'></div>");
						settings.history.iframeDoc.close();
					}
				}
				//If the browser supports the hashchange event
				if (onhashchangeSupport){
					if (!window.addEventListener) window.attachEvent('onhashchange', periodicUpdater);
					else window.addEventListener('hashchange',periodicUpdater,false);
					//notify script of the loaded hash
					notify(window.location.hash);
				}
				else window.setInterval(periodicUpdater, (window.opera ? 400 : 100));
			});
			return _p;
		}
		//Otherwise, add some history
		else{
			newHash = '#!'+newHash;
			var oldHash = settings.history.oldHash || '';
			//No history change is needed if newHash = oldHash
			if (newHash != oldHash){
				//for non-IE browsers, this works in most cases
				//in IE, we need to change the iframe's location in order to fake a page change
				window.location.href = newHash;
				if (settings.history.isIE){
					//Write the data to an iframe
					settings.history.iframeDoc.write("<div id='myHistoryStorage'>"+newHash+"</div>");
					settings.history.iframeDoc.close();
				}
			}
			//Otherwise, fire the event if "force" is true
			else if (force == true)
				egg.trigger('ajax.historychange',[oldHash.substring(2), newHash.substring(2)]);
		}
	}
	/* AJAX:
		url -> url of page request
		params:
			html -> set innerHTML to pageRequest
	  		type -> get/post
	  		params -> parameters to send to through the request (in {} form)
	  		oncomplete -> method to run on ajax complete (returns responseText as the method argument)
			history -> make this request modify the #! value and add browser history (see egg.history for details)
	 */
	this.ajax = function (url,params){
		params = params || {};
		params.html = params.html || settings.ajax.html;
		params.type = params.type || settings.ajax.type;
		
		var req = settings.ajax.requests;
		//find an open slot for our ajax request
		var i = 0;
		while (_p.isset(req[i])) i++;
		//variable to hold ajax request
		try{req[i] = new XMLHttpRequest();}
		catch(problem1){
			try{req[i] = new ActiveXObject("Msxml2.XMLHTTP");}
			catch(problem2){
				try{req[i] = new ActiveXObject("Microsoft.XMLHTTP");}
				catch(finalerror){
					req[i] = false;
				}
			}
		}
		//Begin the request
		if (req[i]){
			if (params.type.toLowerCase() == "get"){
				if (_p.isset(params.params)){
					url += "?";
					for(var name in params.params)
						url += name+"="+params.params[name]+"&";
				}
				req[i].open('GET', url, true);
				req[i].send(null);
			}
			else{
				req[i].open("POST", url, true);
				var newParams = '';
				if (_p.isset(params.params))
					for(var name in params.params) 
						newParams += name+"="+params.params[name]+"&";
				req[i].setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				req[i].setRequestHeader("Content-length", newParams.length);
				req[i].setRequestHeader("Connection", "close");
				req[i].send(newParams);
			}
			_p.trigger('ajax.start');
			if (params.html == true)
				_p.trigger('ajax.loading');
			
			//Reference current fn (for its variables)
			//When the request is complete
			req[i].onreadystatechange = function(){
				//request is: finished and (local or server or cached)
				if (req[i].readyState == 4 && (req[i].status == 0 || (req[i].status >= 200 && req[i].status < 300 ) || req[i].status == 304)){
					//Adding innerHTML
					if (params.html == true)
						_c.innerHTML = req[i].responseText;
					//Firing oncomplete trigger
					if (_p.isset(params.oncomplete) && _p.isFn(params.oncomplete)){
						params.oncomplete.call(_c, req[i].responseText);
						_p.trigger('ajax.complete');
					}
					//Adding history
					if (params.history == true)
						_p.history(params.history);
					//Remove the request object
					req[i] = null;
				}
			}
		}
		return _p;
	};
	/* New animations script
		attr = 
			object containing all the animations:
			from: the value to set at the beginning of the animation
			exprTo: the value that the animation will move towards (supports simple math: +10, -10 for infinite animations)
			params: {speed, easing} ... see below for details
				'attr':[from, exprTo, {params}]			OR
				'attr':[exprTo, {params}]				OR
				'attr':exprTo
				
		speed =
			time in ms to complete animation OR string value 'medium', 'fast', 'slow'
			undefined, false, null, unrecognized, blank, etc values will result in an infinite loop animation
			if the value has been set with the css, that will override this speed value
		params =
			object containing all the optional parameters
				onstart: function to run onstart
				onfinish: function to run onfinish
				easing: any of the easing functions
				
		Simple Syntax:
			animate(attr , [from,exprTo] , speed , {params});
		Advanced Syntax:
			animate({attr:[from,exprTo,{params}} , speed , {params});
	*/
	this.animate = function(attr,speed,params,optparams){
		window.animations = settings.animate;
		if (context == false) return _p;
		//STEP METHOD
		var step = function(){
			//THE TICK METHOD
			var a = settings.animate.animations;
			if (!_p.length(a)){
				window.clearInterval(settings.animate.animate_timer);
				settings.animate.animate_timer = null;
			}
			for(var o in a){
				//if only el is left, delete the animation
				if (_p.length(a[o]) == 1) delete a[o];
				for(var s in a[o]){
					if (s != 'el'){
						//TODO -> parse special CSS and colors
						//current vs target values
						var parseS = _p.styleSupported(s);
						var cur = window[globalS](a[o].el).getStyle(parseS);
						var tar = parseFloat(a[o][s][4]);
						//if done, remove animation
						if (cur == tar && a[o][s][1]*settings.animate.animate_tick >= a[o][s][2]){
							_p.trigger('animate.finish');
							if (_p.isset(a[o][s][6])) a[o][s][6].call(a[o].el);
							delete a[o][s];
							break;
						}
						//if the speed is set
						if (!_p.isStr(a[o][s][2])){
							var percDone = a[o][s][1]*settings.animate.animate_tick/a[o][s][2];
							percDone = easing[a[o][s][5][0]].apply(a[o].el, [percDone].concat(a[o][s][5][1]));
							//[3] = original; [4] = final
							var newVal = percDone*(tar-a[o][s][3])+a[o][s][3];
						}
						//otherwise, if the 'TO' value is an expression
						else{
							//EXPRESSIONS TODO
						}
						//Change style
						var newVal = Math.round(newVal*100)/100;
						if (parseS != 'opacity') newVal += 'px';
						a[o].el.style[parseS] = newVal;
						//Increment frames
						a[o][s][1]++;
					}
					else if (_p.length(a[o]) == 1) delete a[o][s];
				}
			}
			_p.trigger('animate.step');
		}
		
		//EASING METHODS
		var easing = {
			"linear":function(t){
				return t;
			},
			"easeIn":function(t,f){
				if (f >= 1) return Math.pow(t,f);
			},
			"easeOut":function(t,f){
				if (f >= 1) return Math.pow(t,1/f);
			},
			"easeBoth":function(t,fs,fe){
				//Integral piece-wise...
			},
			"elasticOut":function(t,b,d){
				if (b >= 1 && d >= 0)
					return -(1/(2*d*t+1))*Math.cos((2*b-1)*3.1416*t/2)+1;
			},
			"elasticIn":function(t,b,d){
				if (b >= 1 && d >= 0)
					return -(1/(2*d*(t-1)-1))*Math.cos((2*b-1)*3.1416*(t-1)/2);
			},
			"bounceOut":function(t,b,d){
				if (b*d > 1){
					//get stretch factor
					var s = 0;
					for(var i=1;i<=b;i++) s += Math.pow(d,-i/2);
					s = Math.pow(1+2*s,2);
					var os = []; //offsets
					var oi = []; //intersects
					for(var i=0;i<b;i++){
						os[i] = 0;
						for(var x=0;x<=i;x++)
							os[i] += (x!=0 && x!=i ? 2 : 1)*Math.pow(s,-.5)*Math.pow(d,-x/2);
						//fist will always be 0
						if (i==0) os[i]=0;
						if (i>0) oi[i-1] = os[i-1]+Math.sqrt(Math.pow(d,-i+1)/2);
						//if it is within the first factor
						//or if it is within other bounces:
							//if (i==0 && t<oi[0]) return s*Math.pow(t,2);
							//else if (t>=oi[i-1] && t<oi[i]) return Math.pow(s*(t-os[i]),2)+1-Math.pow(d,-i);
					}
					alert(os+"\n"+oi);
				}
			},
			"bounceIn":function(t,b,d){
				//reverse of bounceOut
			}
		}
		
		var starting = _p.isset(attr);
		//STARTING METHOD
		if (starting){
			params = params || {};
			//parse SIMPLE syntax
			if (_p.isNum(params)){
				nattr = {};
				nattr[attr] = speed;
				attr = nattr;
				speed = params;
				if (_p.isset(optparams))
					params = optparams;
			}
			//add the html element to the list of animations
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				if (!_p.isset(settings.animate.animations[context[i].epDat.fxID])){
					settings.animate.animations[context[i].epDat.fxID] = {};
					//reference the object (so we won't have to look it up later)
					settings.animate.animations[context[i].epDat.fxID].el = context[i];
				}
			}
			//Parse all animatable attributes
			for(var i in attr){
				var al = attr[i];
				//Create the 'to' css value variable (al) AND parse syntax
				if (_p.isArr(al)){
					//syntax: [exprTo]
					if (al.length == 1) al = al[0];
					//syntax: [from, exprTo]
					else if (!_p.isObj(al[1])){
						var parseS = _p.styleSupported(i);
						//Update the 'from' css values for each element
						for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++)
							context[x].style[parseS] = al[0];
						if (_p.isset(al[2])) var indiParams = al[2];
						al = al[1];
					}
					//syntax: [exprTo, params]
					else{
						var indiParams = al[1]
						al = al[0]
					}
				}
				//style specific speed
				var sSpeed = _p.isset(indiParams) ? indiParams.speed || speed : speed;
				//PARSE CSS: with multiple inputs (i.e. padding/margin/borderWidth)
				if (!_p.isNum(al)) var al = al.split(" ");
				//otherwise, just make it a single item array
				else al = [al];
				//check which shorthand syntax to use (if any)
				var isRad = _p.contains(settings.animate.rShortCSS,i);
				//If it is radius syntax, it MUST be parsed to separate values, or it will come up with errors
				if (isRad && al.length == 1) al[1] = al[0];
				//make the shorthand into longer shorthand
				if (al.length > 1 && al.length < 4){
					if (al.length == 2){
						al[2] = isRad ? al[1] : al[0];
						al[3] = isRad ? al[0] : al[1];
					}
					else if (al.length == 3){
						al[3] = isRad ? al[2] : al[1];
						if (isRad) al[2] = al[1];
					}
				}
				//Border has the direction syntax embedded, so we can't include width in the new style
				if (i == 'borderWidth') i = 'border';
				//loop through the new 'al' variable and add the animations
				for (var j in al){
					var ns = i;
					if (al.length == 4){
						//add the direction value to the new style
						ns += settings.animate.dirCSS[isRad?1:0][j];
						//Add the width property back on, if needed
						if (i == 'border') ns += 'Width';
					}
					//Parse easing
					var easeVars = _p.isset(indiParams) && _p.isset(indiParams.easing) ? indiParams.easing : params.easing || false;
					var easeArgs = !easeVars ? ['linear'] : !_p.isArr(easeVars) ? [easeVars] : _p.clone(easeVars);
					var easeType = easeArgs.shift();
					//set the animation parameters: [isRunning?,framenum,speed,original_value,target_value,easing:[type,args]]
					for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++)
						settings.animate.animations[context[x].epDat.fxID][ns] = [true,0,sSpeed,window[globalS](context[x]).getStyle(ns),al[j],[easeType,easeArgs],params.oncomplete];
				}
				//animations have started: run the onstart function, if it exists
				if (_p.isFn(params.onstart)) _p.fire(params.onstart);
				_p.trigger('animate.start');
			}
			if (!_p.isset(settings.animate.animate_timer))
				settings.animate.animate_timer = window.setInterval(step,settings.animate.animate_tick);
			return _p;
		}
		else{
			//RETURN METHODS
			return {
				stop: function (s){
					//'*', 'css1 css2 css3', or 'css'
					var o = settings.animate.animations[_c.epDat.fxID];
					var s = s == '*' ? o : s.split(" ");
					for(var i in s)	if (i != 'el') o[s==o?i:s[i]][0] = false;
					this.trigger('animate.stop');
					return _p;
				},
				remove: function (s){
					//'*', 'css1 css2 css3', or 'css'
					s = s.split(" ");
					if (s[0] == '*') delete settings.animate.animations[_c.epDat.fxID]
					else for (var i in s) delete settings.animate.animations[_c.epDat.fxID][s[i]];
					this.trigger('animate.remove');
					return _p;
				}
			};
		}
	};
	/* Toggle effect
		see documentation...
	*/
	this.toggle = function(triggers, attr, value, params){
		if (context == false) return _p;
		//THE TOGGLE EVENT
		var run = function(e, actContext, id, refNum, indiRefNum){
			var data = actContext.epDat.toggle[id];
			//check if the effect is enabled
			if (!data.enabled) return false;
			if (refNum != data.cue || _p.isArr(data.css[refNum])){
				//check whether its cued or not
				if (data.triggers[refNum][2] == true && 
					data.cue != (refNum == data.triggers.length ? 0 : refNum+1) &&
					data.cue != (refNum == 0 ? data.triggers.length : refNum-1))
					return false;
				//set the new cue value
				data.cue = refNum;
				//if the trigger has its own cueing
				if (_p.isArr(data.css[refNum])){
					indiRefNum = indiRefNum || data.triggers[refNum][3]+1;
					var cssP = data.triggers[refNum][3] = indiRefNum > data.css[refNum].length-1 ? 0 : indiRefNum;
					var css = data.css[refNum][cssP];
				}
				else var css = data.css[refNum];
				var animes = {};
				for(var s in css){
					var isStyle = s.charAt(0) != "@";
					//Make sure the style is supported
					if (isStyle) var parseS = _p.styleSupported(s);
					if (parseS == false) break;
					//The new toggle value
					var val = css[s][0] == false && _p.isBool(css[s][0]) ? isStyle ? window[globalS](actContext).getStyle(parseS) : actContext[attr] : css[s][0];
					//Add animations: css[s][1] = settings.animate = [speed, easing]
					//CUE THE ANIMATIONS
					if (isStyle && css[s][1] != false)
						animes[s] = [val,{speed:css[s][1][0],easing:css[s][1][1]}];
					else if (isStyle) actContext.style[parseS] = val;
					else actContext[s.slice(1,s.length)] = val;
				}
				//FIRE ANIMATIONS NOW!!!
				if (_p.length(animes) > 0)
					window[globalS](actContext).animate(animes);
				//fire change event
				_p.trigger('toggle.change toggle.change#'+id,[e.type,refNum,cssP || null]);
			}
		}
		
		//A new toggle effect
		if (_p.isset(triggers)){
			//Parse syntax -> make objects for each trigger effect
			var fx = [];
			//Get the syntax type
			var syntaxType = _p.isStr(triggers) &&  (_p.isStr(attr) || (_p.isArr(attr) && _p.isStr(attr[0]))) ? 1 : _p.isStr(triggers) ? 2 : _p.isArr(triggers) || (_p.isset(triggers.toggles) && _p.isset(triggers.triggers)) ? 4 : 3;
			//Parse simple #1-2
			if (syntaxType < 3){
				var trigs = triggers.split("|");
				if (syntaxType == 1){
					fx = [{}];
					fx[0].triggers = trigs[0];
					if (trigs.length == 1){
						//there is only one trigger, embedded
						fx[0].toggles = [false,{}];
						var newToggle = fx[0].toggles[1];
					}
					else{
						//toggleOff trigger
						fx[0].toggles = false;
						//toggleOn trigger
						fx[1] = {};
						fx[1].triggers = trigs[1];
						var newToggle = fx[1].toggles = {};
					}
					//Make sure they are arrays
					if (!_p.isArr(attr)) attr = [attr];
					if (!_p.isArr(value)) value = [value];
					//Create toggles object
					for (var i in attr)
						newToggle[attr[i]] = value[i];
				}
				else {
					//if the length is only one, the attr[] is already done
					if (trigs.length == 1){
						if (!_p.isArr(attr)) attr = [attr];
						//embed it one more time: [false, attrsObj]
						if (attr.length == 1) attr.unshift(false);
						fx[0] = {triggers: trigs[0], toggles: attr};
					}
					else{
						if (!_p.isArr(attr)) attr = [attr];
						//if the triggers are longer than the toggles, the first must be a default
						if (trigs.length - 1 == attr.length)
							attr.unshift(false);
						for(var i in trigs)
							fx[i] = {triggers: trigs[i], toggles: attr[i]};
					}
					params = value;
				}
			}
			//Parse simple #3
			else if (syntaxType == 3){
				var x = 0;
				var isSingle = _p.length(triggers) == 1;
				for(var i in triggers){
					fx[x] = {};
					fx[x].triggers = i;
					//Parse the toggles
					if (isSingle){
						if (!_p.isArr(triggers[i])) triggers[i] = [triggers[i]];
						if (triggers[i].length == 1) triggers[i].unshift(false);
					}
					fx[x].toggles = triggers[i];
					x++;
				}
				params = attr;
			}
			//Parse advanced #4
			else{
				//Make sure its an array
				fx = _p.isArr(triggers) ? triggers : [triggers];
				//Make sure it has a default trigger, if its single
				if (fx.length == 1){
					if (!_p.isArr(fx[0].toggles) && fx[0].toggles != false) fx[0].toggles = [fx[0].toggles];
					if (fx[0].toggles.length == 1) fx[0].toggles.unshift(false);
				}
				params = attr;
			}
			
			//All syntax is now in #4 format; parse it, for all elements
			//Compile a list of all the attributes and styles, for default styles and such
			var allAttrs = {};
			//a is the attribute/style; or tog, if toggles is single
				//fx:[t1:[toggles:[tog,tog]], t2:[toggles:tog]]
			for (var t in fx){
				//if it isn't false (using default value from allAttrs) already
				if (fx[t].toggles){
					for (var tog in fx[t].toggles){
						//if the specific style isn't false already (uncued)
						if (!_p.isBool(fx[t].toggles[tog]) || fx[t].toggles[tog] != false){
							//for cued styles
							if (_p.isArr(fx[t].toggles)){
								for (var a in fx[t].toggles[tog]){
									if (_p.isArr(fx[t].toggles[tog][a])) allAttrs[a] = [false, fx[t].toggles[tog][a][1]];
									else allAttrs[a] = [false];
								}
							}
							//for uncued styles
							else{
								if (_p.isArr(fx[t].toggles[tog])) allAttrs[tog] = [false, fx[t].toggles[tog][1]];
								else allAttrs[tog] = false;
							}
						}
					}
				}
			}
			//Now add the effects
			for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
				if (!_p.isset(context[x].epDat.toggle)) context[x].epDat.toggle = {};
				if (!_p.isset(params)) var params = {};
				//Unique toggle id
				var id = params.id || _p.ranString(5);
				var togVars = context[x].epDat.toggle[id] = {};
				//MAKE DATA STRUCTURE
				togVars.enabled = params.enabled || true;
				togVars.cue = 0;
				togVars.css = [];
				togVars.triggers = [];
				for (var i in fx){
					//Create triggers array
					togVars.triggers[i] = [
						fx[i].triggers,
						_p.isset(fx[i].triggerObj) ? fx[i].triggerObj : params.triggerObj || false,
						_p.isset(fx[i].cued) ? fx[i].cued : params.cued || false,
						0
					];
					//Register triggers
					var trigObj = togVars.triggers[i][1] || context[x];
					window[globalS](trigObj).bind(togVars.triggers[i][0],run,{args:[context[x],id,i]});;
					//can be 1) array 2) false 3) {}
					var copyCSS = fx[i].toggles;
					//Parse to array syntax
					if (copyCSS == false) copyCSS = allAttrs;
					if (!_p.isArr(copyCSS)) copyCSS = [copyCSS];
					//Create CSS array
					togVars.css[i] = copyCSS.length > 1 ? [] : {};
					for (var css in copyCSS){
						//if its false, we need to use the allAttrs variable
						if (copyCSS[css] == false) copyCSS[css] = allAttrs;
						for (var attr in copyCSS[css]){
							//get values and params
							var isArr = _p.isArr(copyCSS[css][attr]);
							var v = isArr ? copyCSS[css][attr][0] : copyCSS[css][attr];
							var indParams = isArr ? copyCSS[css][attr][1] || {} : {};
							//Make constant update vars
							var isStyle = attr.charAt(0) != "@";
							var update = _p.isset(indParams.update) ? indParams.update : _p.isset(fx[i].update) ? fx[i].update : params.update || false;
							//Make animation vars
							var animateVars = _p.isset(indParams.animate) ? indParams.animate : _p.isset(fx[i].animate) ? fx[i].animate : params.animate || false;
							if (animateVars != false){
								if (!_p.isArr(animateVars)) animateVars = [animateVars,null];
								else if (animateVars.length != 2) animateVars.push(null);
							}
							//Create attribute in CSS array
							var cssPars = [
								update ? false : v == false && _p.isBool(v) ? isStyle ? _p.getStyle(_p.styleSupported(attr)) : context[x][attr.slice(1,attr.length)] : v,
								animateVars
							];
							//Is this a trigger with mutliple toggles attached?
							if (copyCSS.length > 1){
								if (!_p.isset(togVars.css[i][css])) togVars.css[i][css] = {};
								togVars.css[i][css][attr] = cssPars;
							}
							else togVars.css[i][attr] = cssPars;
						}
					}
				}
			}
			return _p;
		}
		//Modify an existing effect
		return {
			//Change the toggle effect
			change: function(id,refNum,indiRefNum){
				if (id != "*") id.split(" ");
				for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
					var togs = context[x].epDat.toggle;
					for (var i in togs)
						if (id == '*' || _p.contains(id,i))
							run.apply(context[x], [{type:'manualToggle'}, context[x], i, refNum, indiRefNum]);
				}
				return _p;
			},
			//Toggle between enabled/disabled
			toggle: function(id){
				if (id != '*') id.split(" ");
				for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
					var togs = context[x].epDat.toggle;
					for (var i in togs){
						if (id == '*' || _p.contains(id,i)){
							togs[i].enabled == togs[i].enabled ? false : true;
							_p.trigger('toggle.toggle toggle.toggle#'+i,[i, togs[i].enabled]);
						}
					}
				}
				return _p;
			},
			enable: function(id){
				if (id != '*') id.split(" ");
				for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
					var togs = context[x].epDat.toggle;
					for (var i in togs){
						if (id == '*' || _p.contains(id,i)){
							togs[i].enabled == true;
							_p.trigger('toggle.enable toggle.enable#'+i,i);
						}
					}
				}
				return _p;
			},
			disable: function(id){
				if (id != '*') id.split(" ");
				for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
					var togs = context[x].epDat.toggle;
					for (var i in togs){
						if (id == '*' || _p.contains(id,i)){
							togs[i].enabled == false;
							_p.trigger('toggle.disable toggle.disable#'+i,i);
						}
					}
				}
				return _p;
			},
			remove: function(id){
				if (id != '*') id.split(" ");
				for (var x = _super ? 0 : pointer; x<(_super ? context.length : pointer+1); x++){
					var togs = context[x].epDat.toggle;
					for (var i in togs){
						if (id == '*' || _p.contains(id,i)){
							for (var trigs in togs[i].triggers){
								_p.unbind(trigs[0],run);
								delete togs[i];
								_p.trigger('toggle.remove toggle.remove#'+i,i);
							}
						}
					}
				}
				return _p;
			}
		}
	};
	/* InputClearFX
		- clears inputs when you focus on them
		- resets them to the default value, if the inputs are blank
		- colors the default value gray (or custom color)
	*/
	this.inputClearFX = function(defaultColor){
		if (_p.isset(defaultColor)){
			if (context == false) return _p;
			//The method that does all the work
			var run = function(e){
				var dat = this.epDat.inputClearFX;
				//Hide text, if it is the default; otherwise, do nothing
				if (e.type == 'focus'){
					//Hide the text, if it was the default
					if (this.value == dat[1]) this.value = '';
					//Set to custom color
					if (dat[0]) this.style.color = '';
				}
				else{
					var isBlank = this.value.replace(/^\s+|\s+$/g,"") == '';
					//Color the default value
					if (dat[0] && (isBlank || this.value == dat[1]))
						this.style.color = dat[0];
					//Set to default value
					if (isBlank) this.value = dat[1];
				}
			}
			//Initializing a new effect
			var tagnameWhitelist = 'input textarea select'.split(' ');
			var inputBlacklist = 'checkbox button submit hidden'.split(' ');
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				//get its tag name
				var thisTag = context[i].tagName.toLowerCase();
				//if it is a valid input
				if (_p.contains(tagnameWhitelist, thisTag) && !_p.contains(inputBlacklist, context[i].type)){
					var c_ref = window[globalS](context[i]);
					//Are we modifying an existing effect
					var bound = _p.isset(context[i].epDat.inputClearFX);
					//Store FX values: [default-color, user-color, default-value, isInput]
					context[i].epDat.inputClearFX = [defaultColor, context[i].value];
					//Set current color to the default
					if (defaultColor) context[i].style.color = defaultColor;
					//Bind events, if it doesn't already have them
					if (!bound) c_ref.bind('focus blur', run);
				}
			}
			//return the library
			return _p;
		}
		return {
			remove: function(){
			
			},
			isset: function(){
				if (context == false) return false;
				for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++)
					if (_p.isset(context[i].epDat.inputClearFX))
						if (context[i].value.replace(/^\s+|\s+$/g,"") == context[i].epDat.inputClearFX[1] || context[i].value.replace(/^\s+|\s+$/g,"") == '')
							return false;
				return true;
			}
		}
	}
	/* PARAMS:
		dir: 'lr' or 'tb' or 'ss'
		navis: for lr/tb: [left/top, right/bottom] classNames
			for ss: buttons class
		params: animate();
	*/	
	this.slideshowFX = function(dir, navis, params){
		if (context == false) return _p;
		//Gets the elements that are out of the view
		//[outside_left(farthest), outside_left(closest), outside_right(closest), outside_right(farthest)]
		var getEls = function(objs, shifter){
			var els = [false, false];
			var elsLocs = [false, false];
			for (var i=0; i<objs.length; i++){
				eObjs = window[globalS](objs[i]);
				var shiftOffset = shifter.getStyle('left');
				var left = objs[i].offsetLeft+shiftOffset-eObjs.getStyle('marginLeft');
				var right = objs[i].offsetLeft+objs[i].offsetWidth+shiftOffset+eObjs.getStyle('marginRight');
				//Closest outsides: (left and right, respectively)
				if (left < 0 && (!els[0] || right > elsLocs[0])){
					els[0] = objs[i];
					elsLocs[0] = right;
				}
				if (right > shifter.active().clientWidth && (!els[1] || left < elsLocs[1])){
					els[1] = objs[i];
					elsLocs[1] = left;
				}
			}
			return els;
		}
		//Initialize the effect
		if (dir == 'lr'){
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				var shifter = window[globalS](context[i]).refine('* .top_ss_shift'),
					leftBtns = window[globalM](context[i]).refine('* '+navis[0]),
					rightBtns = window[globalM](context[i]).refine('* '+navis[1]),
					starterEls = getEls(egg.lookup('*>*', shifter.active()), shifter);
				//false = left/up; true = right/down;
				var slideLR = (function(shifter, animate, leftBtns, rightBtns){
					return function(e, dir){
						//Get the location we need to slide to
						var els = getEls(egg.lookup('*>*', shifter.active()), shifter), disableLeft = false, disableRight = false;
						//Set the new shifter value
						if (els[dir ? 1 : 0] != false){
							var cont = shifter.active();
							//Moving to the right (use the els left edge as a reference)
							if (dir){
								var left = els[1].offsetLeft-window[globalS](els[1]).getStyle('marginLeft');
								//If we've reached the end, or somewhere in the middle
								var maxWidth = cont.parentNode.scrollWidth-shifter.getStyle('left');
								disableRight = maxWidth-left < cont.clientWidth;
								var shiftLoc = disableRight ? -(maxWidth-cont.clientWidth) : -left;
							}
							//Moving to the left (use the right edge as a reference)
							else{
								var right = els[0].offsetLeft+els[0].offsetWidth+window[globalS](els[0]).getStyle('marginRight');
								//If we've reached the beginning, or somewhere in the middle
								disableLeft = right < cont.clientWidth;
								var shiftLoc = disableLeft ? 0 : -right+cont.clientWidth;
							}
							//Animate the sliding action
							if (_p.isset(animate)){
								var params = {};
								if (!egg.isArr(animate)) animate = [animate];
								else  params.easing = animate[1];
								shifter.animate('left',shiftLoc,animate[0],params);
							}
							//Otherwise, just set it directly
							else shifter.style.left = shiftLoc+"px";
						}
						//disable left button (if needed)
						leftBtns.attr('disabled', disableLeft);
						rightBtns.attr('disabled', disableRight);
					}
				})(shifter, params.animate, leftBtns, rightBtns);
				//Bind actions for left button
				leftBtns.bind('click',slideLR,{args:false});
				leftBtns.attr('disabled', starterEls[0] == false);
				//Bind actions for right button
				rightBtns.bind('click',slideLR,{args:true});
				rightBtns.attr('disabled', starterEls[1] == false);
			}
		}
		//A standard slideshow effect (fading opacity)
		else if (dir == 'ss'){
			for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
				//These are the elements that could potentially slideshow elements
				var potSS = egg.lookup('* *',context[i]);
				for (var el=0; el<potSS.length; el++){
					if (egg.contains(potSS[el].id, 'ss_navi%')){
						//This is a navi ss element
						var navi = potSS[el], naviName = potSS[el].id.substring(7);
						//This changes the active image
						var change = (function(cont,activeCSS,naviName,speed){
							return function(e){
								//unactivate the old stuff
								window[globalM](cont).refine('* .'+activeCSS).fire(function(){
									var classList = this.className.split(" ");
									var loc = egg.find(classList, activeCSS);
									classList.splice(loc, 1);
									this.className = classList.join(" ");
									//animate the opacity back down
									$(this).animate('opacity',egg.contains(this.id, 'ss_navi%') ? .5 : 0, speed);
								});
								//Set the new active class for the navi
								var classes = this.className.split(" ");
								classes.push(activeCSS);
								this.className = classes.join(" ");
								$(this).animate('opacity',1,speed);
								//Find the associated images
								var imgs = window[globalM](cont).refine('* #ss_img'+naviName).fire(function(){
									var classes = this.className.split(" ");
									classes.push(activeCSS);
									this.className = classes.join(" ");
								}).animate('opacity',1,speed);
							}
						})(context[i],navis,naviName,params.animate || 200)
						window[globalS](navi).bind('click',change);
						//If this navi is set to be active (navis)
						if (egg.contains(navi.className,'%'+navis+'%')){
							navi.style.opacity = 1;
							egg.lookup('* #ss_img'+naviName, context[i])[0].style.opacity = 1;
						}
					}
				}
			}
		}
	}
	/*	Tabs plugin
		- activeCSS: the className of an active tab
		- startActive: the id of the active section
		Tabbed elements should have id='tab_TABNAME'
		Tab buttons should have id='btn_TABNAME'
	*/
	this.tabs = function(activeCSS, startActive){
		if (context == false) return _p;
		for (var i = _super ? 0 : pointer; i<(_super ? context.length : pointer+1); i++){
			//gather a list of potential tabs
			var potTabs = egg.lookup('* *',context[i]);
			for (var t=0; t<potTabs.length; t++){
				//If it starts with tab_, then its a tab
				if (potTabs[t].nodeName.toLowerCase() != 'form'){
					if (egg.contains(potTabs[t].id, 'tab_%')){
						var tab = potTabs[t], tabName = tab.id.split("_")[1];
						//If it is the starting active tab
						if (startActive == tabName){
							var classes = tab.className.split(" ");
							classes.push(activeCSS);
							tab.className = classes.join(" ");
						}
						//This method does the tab switching
						var run = (function(tab,cont,activeCSS){
							return function(e){
								//Remove the old active class
								window[globalM](cont).refine('* .'+activeCSS).fire(function(){
									var classList = this.className.split(" ");
									var loc = egg.find(classList, activeCSS);
									classList.splice(loc, 1);
									this.className = classList.join(" ");
								});
								//Set the new active class
								var classes = tab.className.split(" ");
								classes.push(activeCSS);
								tab.className = classes.join(" ");
							}
						})(tab,context[i],activeCSS)
						//Find the referring button and bind the event to it
						window[globalS]('#btn_'+tabName).click(run);
					}
				}
			}
		}
	}
};

//REGISTER GLOBAL ACCESSORS/SETTINGS/METHODS/etc.
window[globalS] = createS;
window[globalM] = createM;
window.egg = createS(window);
var uni_id = 0; //keeps track of FX id's
//.bind() globals
var globs = {};
var bind_globs = settings.bind.globals.split(" ");
for (var i=0; i<bind_globs.length; i++){
	globs[bind_globs[i]] = function(trig){
		return function(fn,params){return this.bind(trig,fn,params);};
	}(bind_globs[i]);
}
egg.extend(globs);
//Initialize AJAX history script
if (settings.history.useHistory) egg.history();
/* 
	Trigger the document.ready event when the DOM is loaded
		- Implementation based on Dean Edward's and John Resig's original script
	Trigger the window.load event when the page has fully loaded
*/
var isReady = false;
(function(){
	//DOCUMENT.READY
	var readyHandler = function(){egg.trigger('document.ready');}
	//Firefox & Chrome
	if (document.addEventListener)
		document.addEventListener("DOMContentLoaded", readyHandler, false);
	//Internet Explorer
	else if (!document.addEventListener){
		document.attachEvent("onreadystatechange", function(){
			if (document.readyState === "complete")
				readyHandler.call(document);
		});
	}
	//Safari
	else if (/Safari/i.test(navigator.userAgent)){
		var readyStateTimer = setInterval(function(){
			if(/loaded|complete/.test(document.readyState)){
				clearInterval(readyStateTimer)
				readyHandler.call(document);
			}
		}, 10)
	}
	//WINDOW.LOAD
	egg.bindSimple('load',function(){
		egg.trigger('window.load');
	});
})()
//Initialize settings, when the DOM is ready
egg.ready([function(){isReady=true;},initSettings]);

})(window);


function ranCol(){
	var rgbColor = '';
	for(var i=1; i<4; i++){
		rgbColor +=  Math.floor(Math.random()*251);
		if (i != 3) rgbColor += ',';
	}
	return "rgb("+rgbColor+")";
}
