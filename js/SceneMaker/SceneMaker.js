var SceneMaker = (function (root) {
	SceneMaker.version = "0.0.1";
	
/**
 * SceneMaker
 * initialize animation scene component
 *
 */
function SceneMaker(params) {
	var instance = this,
		starter_pos = {},
		cells = [],
		pointer = 0,
		drag_el,
		initial_pos,
		mainMC,
		AJAX_req,
		element;
	
	params.drag = params.drag ? params.drag : {};
	
	instance.version = '0.0.1';
	instance.svg = {"stop":function(){},"mc":{"el":{"clear":function(){}}}};
	instance.element = params.element;
	instance.onDragStart = typeof(params.drag.onstart) == typeof(Function) ? params.drag.onstart : false;
	instance.onDragMove = typeof(params.drag.onmove) == typeof(Function) ? params.drag.onmove : false;
	instance.onDragEnd = typeof(params.drag.onend) == typeof(Function) ? params.drag.onend : false;
	instance.shouldDrag = !!instance.onDragEnd && !!instance.onDragMove && instance.onDragStart;
	
	msg = 'SceneMaker v' + instance.version;
	
	params = params || {};
	fps = params.fps || 24;
	w = params.width || 100;
	h = params.height || 100;
	
	if (typeof(params.autoplay) !== 'undefined') {
        autoplay = params.autoplay;
    } else {
        autoplay = true;
    }
	
	SceneMaker.prototype.toString = function () {
		return msg;
	};
	
	SceneMaker.prototype.addCellToScene = function(cell, callback) {
		var _this = this,
			addObjectToScene = function(jsonObject){
				cells.push({
					"name": cell,
					"orig": JSON.parse(JSON.stringify(jsonObject))
				});
				prepareJSON(jsonObject);
				mergeCellToScene(jsonObject);
				
				_this.reset();
				
				if (typeof(callback) == typeof(Function)) {
					_this.svg.mc._animate();
					callback(_this.svg.resourceManager.m_data);
				}
			};
		if (typeof(cell) == typeof('')) {
			AJAX_JSON_Req( cell, addObjectToScene);
		}
		else {
			addObjectToScene( cell );
		}
	};
	
	SceneMaker.prototype.removeCellFromScene = function(cell, callback) {
		var _this = this;
		if (typeof(cell) == typeof('')) {
			removeObjectFromScene(cell);
			
			if ( typeof( starter_pos[cell] ) != "undefined" ){
				delete starter_pos[cell];
			}
			
			_this.reset();
			
			if (typeof(callback) == typeof(Function)) {
				callback();
			}
		}
	};
	
	SceneMaker.prototype.reset = function() {
		var svgParams = {"autoplay": autoplay};
		if (typeof(instance.element) != "undefined"){
			svgParams.elementId = instance.element;
		}
		
		this.svg.stop();
		this.svg.mc.el.clear();
		this.element.innerHTML = "";
		
		this.svg = new SVGAnim( mainMC, w, h, fps, svgParams );
		if (this.shouldDrag) {
			this.svg.mc.el.drag(onDragMove, onDragStart, onDragEnd );
		}
	};
	
	SceneMaker.prototype.getTimelineActions = function() {
		var mainTimeline = this.svg.mc.m_timeline,
			reg = /\/\*CELL-ACTIONS-[^\*]+\*\//,
			frameIndex = 0,
			commandIndex = 0
			actionsFound = [];
				
		if( typeof( mainTimeline ) !== "undefined" && typeof( mainTimeline.Frame ) !== "undefined") {
							
			while ( frameIndex < mainTimeline.Frame.length ) {
		
				while ( commandIndex < mainTimeline.Frame[frameIndex].Command.length ) {
							
					if ( 
						mainTimeline.Frame[frameIndex].Command[commandIndex].cmdType == "AddFrameScript" &&
						typeof( mainTimeline.Frame[frameIndex].Command[commandIndex].script ) !== "undefined" &&
						mainTimeline.Frame[frameIndex].Command[commandIndex].script.indexOf('/*CELL-ACTIONS-') === 0
					) {
						var paramsArray = reg.exec( mainTimeline.Frame[frameIndex].Command[commandIndex].script );
						
						if ( paramsArray.length > 0 ) {
							actionsFound.push( paramsArray[0].replace('/*CELL-ACTIONS-','').replace('*/','').split('-') )
						}
					}
					commandIndex++;
				}
						
				commandIndex = 0;
				frameIndex++;
			}
		}
		return actionsFound;
	};
	
	SceneMaker.prototype.setTimelineActions = function( actionsParams ) {
		actionsParams = typeof(actionsParams) == typeof([]) ? actionsParams : [];
		
		var mainTimeline = this.svg.mc.m_timeline,
			reg = /\/\*CELL-ACTIONS-[^\*]+\*\//g,
			scriptParams = actionsParams.join('-'),
			scriptTag = "/*CELL-ACTIONS-",
			script = '',
			frameIndex = 0,
			commandIndex = 0
			actionsFound = [],
			scriptReplaced = false,
			scriptID = 0;
		
		if ( typeof( actionsParams[2] ) !== "undefined" ) {
			switch (actionsParams[2]) {
				case "0":
					script = "/*CELL-ACTIONS-"+scriptParams+'*/';
					break;
				case "1":
					script = "/*CELL-ACTIONS-"+scriptParams+"*/ if (typeof slidedeck !== 'undefined' && slidedeck.curSlide_ == "+ actionsParams[0] +" ) { if (typeof window.slideCellCount == 'undefined'){window.slideCellCount = 0;} else if ( window.slideCellCount == "+ actionsParams[1] +" ) { window.slideCellCount = -1; jsonAnims[slidedeck.curSlide_].json.svg.stop(); }; window.slideCellCount++;}";
					break;
				case "2":
					script = "/*CELL-ACTIONS-"+scriptParams+"*/ if (typeof slidedeck !== 'undefined' && slidedeck.curSlide_ == "+ actionsParams[0] +" ) { if (typeof window.slideCellCount == 'undefined'){window.slideCellCount = 0;} else if ( window.slideCellCount == "+ actionsParams[1] +" ) { window.slideCellCount = -1; slidedeck.nextSlide(); }; window.slideCellCount++;}";
					break;
			}
			reg = RegExp("\\/\\*CELL-ACTIONS-" + actionsParams[0] + "[^\\*]+\\*\\/", "g");
		}
		
		if( typeof( mainTimeline ) !== "undefined" && typeof( mainTimeline.Frame ) !== "undefined") {
							
			while ( frameIndex < mainTimeline.Frame.length ) {
		
				while ( commandIndex < mainTimeline.Frame[frameIndex].Command.length ) {
							
					if ( 
						mainTimeline.Frame[frameIndex].Command[commandIndex].cmdType == "AddFrameScript" &&
						typeof( mainTimeline.Frame[frameIndex].Command[commandIndex].script ) !== "undefined"
					) {
						if ( !!mainTimeline.Frame[frameIndex].Command[commandIndex].script.match( reg ) ) {
							mainTimeline.Frame[frameIndex].Command[commandIndex].script = script;
							scriptReplaced = true;
						}
						scriptID = ( parseInt(mainTimeline.Frame[frameIndex].Command[commandIndex].scriptId) >= scriptID ? ( parseInt(mainTimeline.Frame[frameIndex].Command[commandIndex].scriptId) + 1 ) :  scriptID );
					}
					commandIndex++;
				}
						
				commandIndex = 0;
				frameIndex++;
			}
		}
		
		if ( !scriptReplaced && script != "" ){
			mainTimeline.Frame[0].Command.push({
                "cmdType": "AddFrameScript", 
                "script": script, 
                "scriptId": scriptID+""
            })
            
            if ( typeof( mainTimeline.Frame[1] ) == "undefined" ) {
            	mainTimeline.Frame[1] = {"Command": [], "num": "1"};
            }
            
            mainTimeline.Frame[1].Command.push({
                "cmdType": "RemoveFrameScript", 
                "scriptId": scriptID+""
            });
		}
	};
	
	SceneMaker.prototype.copyObject = function( objectID ) { //TODO - allow multiple elements copy ()
		isItChar = typeof(isItChar) !== typeof(true) ? false : isItChar;
		output = JSON.parse( JSON.stringify( mainMC ) );
		
		removeObjectFromScene( objectID, false, true, output);
		
		//The objectIds are reset
		for (i = output.DOMDocument.Timeline.length - 1; i > -1; i -= 1) {
			if (typeof(output.DOMDocument.Timeline[i].linkageName) == 'undefined') {
			
				ids = [];
				counter = 1;
			
				if(output.DOMDocument.Timeline[i].Frame !== undefined) {
				
					for(var frameIndex =0; frameIndex < output.DOMDocument.Timeline[i].Frame.length; frameIndex++) {
				
						if(output.DOMDocument.Timeline[i].Frame[frameIndex].Command !== undefined) {
						
							for(var commandIndex =0; commandIndex < output.DOMDocument.Timeline[i].Frame[frameIndex].Command.length; commandIndex++) {
						
								if(output.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex].objectId !== undefined) {
										
									tempID = parseInt(output.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex].objectId);
									if ( typeof( ids[tempID] ) == "undefined" ){
										ids[tempID] =  counter+"";
										counter++;
									}
									output.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex].objectId = ids[tempID];
								}
							}
						}
					}
				}
				break;
			}
		}
		
		return output;
	};
	
	SceneMaker.prototype.pasteObject = function( jsonObject ) {
		cells.push({
			"name": "Pasted",
			"orig": JSON.parse(JSON.stringify(jsonObject))
		});
		prepareJSON(jsonObject);
		mergeCellToScene(jsonObject);
				
		instance.reset();
		
		return this.svg.resourceManager.m_data;
	};
	
	SceneMaker.prototype.getObjectColors = function(id, first) {
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			chars = {};
		
		first = typeof(first) == typeof(true) ? first : true;
		if (first){
			colorsAux = [];
		}

		if (movieClip !== false){
			for (var frameIndex = 0; frameIndex < movieClip.m_timeline.Frame.length; frameIndex++) {
				
				if(movieClip.m_timeline.Frame[frameIndex].Command !== undefined) {
					
					for(var commandIndex =0; commandIndex < movieClip.m_timeline.Frame[frameIndex].Command.length; commandIndex++) {
					
						if( 
							movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place" &&
							typeof( chars[ movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid ] ) == "undefined"
						) {
							shape = this.svg.resourceManager.getShape( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
							
							if (typeof(shape) !== "undefined"){
								chars[ movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid ] = true;
							
								for (var pathIndex = 0; pathIndex < shape.path.length; pathIndex++) {
								
									if ( typeof(shape.path[pathIndex].color) != "undefined" && colorsAux.indexOf( shape.path[pathIndex].color ) == -1 ) {
										colorsAux.push(shape.path[pathIndex].color);
									}
								}
							}
							else {
								tempMovieClip = this.svg.resourceManager.getMovieClip( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
								
								if (tempMovieClip) {
									this.getObjectColors( {"m_timeline": tempMovieClip}, false );
								}
								
							}
						}
					}
				}
			}
		}
		
		return colorsAux;
	};
	
	SceneMaker.prototype.setObjectColors = function(id, new_color, previous_color, text_color) {
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			text_color = typeof(text_color) == "undefined" ? false : text_color,
			chars = {},
			needToreset = false;

		if (movieClip !== false){
			for (var frameIndex = 0; frameIndex < movieClip.m_timeline.Frame.length; frameIndex++) {
				
				if(movieClip.m_timeline.Frame[frameIndex].Command !== undefined) {
					
					for(var commandIndex =0; commandIndex < movieClip.m_timeline.Frame[frameIndex].Command.length; commandIndex++) {
						if( 
							movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place" &&
							typeof( chars[ movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid ] ) == "undefined"
						) {
							shape = this.svg.resourceManager.getShape( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
							
							if (typeof(shape) !== "undefined" && !text_color){
								chars[ movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid ] = true;
							
								for (var pathIndex = 0; pathIndex < shape.path.length; pathIndex++) {
								
									if ( typeof(shape.path[pathIndex].color) != "undefined" && shape.path[pathIndex].color.toLowerCase() == previous_color.toLowerCase()) {
										shape.path[pathIndex].color = new_color;
									}
								}
							}
							else {
								tempMovieClip = this.svg.resourceManager.getMovieClip( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
								
								if (tempMovieClip) {
									this.setObjectColors( {"m_timeline": tempMovieClip}, new_color, previous_color, text_color );
									needToreset = true;
								}
								else if (text_color){
									text = this.svg.resourceManager.getText( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
									
									if (text && text.paras[0].textRun[0].style.fontColor == previous_color ){
										
										text.paras[0].textRun[0].style.fontColor = new_color;
									}
								}
							}
						}
					}
				}
			}
		}
		
		if (needToreset){
			this.reset();
		}
	};
	
	SceneMaker.prototype.setObjectSize = function(id, size_ratio, posX, posY) {
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			text_color = typeof(text_color) == "undefined" ? false : text_color,
			chars = {};

		if (movieClip !== false){

			var mcMatrix = movieClip.getMatrix().scale( size_ratio );
			
			mcMatrix.e = mcMatrix.e * size_ratio + ( posX * (1 - size_ratio) );
			mcMatrix.f = mcMatrix.f * size_ratio + ( posY * (1 - size_ratio) );
			
			if ( typeof( starter_pos[movieClip.id] ) != "undefined" ){
				starter_pos[movieClip.id].x *= size_ratio;
				starter_pos[movieClip.id].y *= size_ratio;
			}

			movieClip.el.transform(mcMatrix.toTransformString());
			
			new_transform = mcMatrix.toString().replace(/^matrix\(([^\)]+)\)$/,'$1');
			updateMovieClip(movieClip.charid, 'transformMatrix', new_transform, 'Place');
			
		}
	};
	
	SceneMaker.prototype.getTextData = function(id) {
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			data = {};

		if (movieClip !== false){
			for (var frameIndex = 0; frameIndex < movieClip.m_timeline.Frame.length; frameIndex++) {
			
				if(movieClip.m_timeline.Frame[frameIndex].Command !== undefined) {
					
					for(var commandIndex =0; commandIndex < movieClip.m_timeline.Frame[frameIndex].Command.length; commandIndex++) {
						if( 
							movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place"
						) {
						
							text = this.svg.resourceManager.getText( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
									
							if (text){
								data.content = text.txt;
								data.color = text.paras[0].textRun[0].style.fontColor;
								data.fontFace = text.paras[0].textRun[0].style.fontName;
								data.fontSize = text.paras[0].textRun[0].style.fontSize;
								data.letterSpacing = text.paras[0].textRun[0].style.letterSpacing;
								data.textAlign = text.paras[0].alignment;
								data.lineHeight = text.paras[0].linespacing						
							}
						}
					}
				}
			}
		}
		
		return data;
	};
	
	SceneMaker.prototype.setObjectContent = function( id, new_value ){
		this.setTextObjectAttr( id, 'txt', new_value );
	}
	
	SceneMaker.prototype.setObjectStyle = function( id, attribute, new_value ){
		this.setTextObjectAttr( id, attribute, new_value, true );
	}
	
	SceneMaker.prototype.setObjectAlignment = function( id, attribute, new_value ){
		this.setTextObjectAttr( id, attribute, new_value, false, true );
	}
	
	SceneMaker.prototype.setTextObjectAttr = function( id, attribute, new_value, style, alignment ){
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			style = typeof(style) == typeof(true) ? style : false,
			alignment = typeof(alignment) == typeof(true) ? alignment : false,
			needToreset = false;
		
		if (movieClip !== false){
			for (var frameIndex = 0; frameIndex < movieClip.m_timeline.Frame.length; frameIndex++) {
			
				if(movieClip.m_timeline.Frame[frameIndex].Command !== undefined) {
					
					for(var commandIndex =0; commandIndex < movieClip.m_timeline.Frame[frameIndex].Command.length; commandIndex++) {
						if( 
							movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place"
						) {
						
							text = this.svg.resourceManager.getText( movieClip.m_timeline.Frame[frameIndex].Command[commandIndex].charid );
									
							if (text){
								if (style){
									text["paras"][0].textRun[0].style[attribute] = new_value;
								}
								else if(alignment) {
									text["paras"][0][attribute] = new_value;
								}
								else {
									text[attribute] = new_value;
								}
								needToreset = true;
							}
						}
					}
				}
			}
		}
		
		if (needToreset){
			this.reset();
		}
	};
	
	SceneMaker.prototype.setObjectPosition = function( id, pos, prev ){
		var movieClip = typeof(id) == typeof("") || typeof(id) == typeof(0) ? getMovieClipById(id) : id,
			posX = !isNaN( parseInt( pos.x ) ) ? parseInt( pos.x ) : 0,
			posY = !isNaN( parseInt( pos.y ) ) ? parseInt( pos.y ) : 0,
			prevX = !isNaN( parseInt( prev.x ) ) ? parseInt( prev.x ) : 0,
			prevY = !isNaN( parseInt( prev.y ) ) ? parseInt( prev.y ) : 0,
			needToreset = false;
		
		if (movieClip !== false){
		
			var mcMatrix = movieClip.getMatrix();
			
			setInitialMargin( movieClip.id, prevX, prevY );
			
			mcMatrix.e = starter_pos[id].x + posX;
			mcMatrix.f = starter_pos[id].y + posY;
			
			movieClip.el.transform(mcMatrix.toTransformString());
			
			new_transform = mcMatrix.toString().replace(/^matrix\(([^\)]+)\)$/,'$1');
		
			updateMovieClip(movieClip.charid, 'transformMatrix', new_transform, 'Place');
		}
	};
	
	SceneMaker.prototype.clearScene = function() {
		mainMC = undefined;
		starter_pos = {};
		cells = [];
		pointer = 0;
		initial_pos = undefined;
		this.svg.reset();
		this.svg = {"stop":function(){},"mc":{"el":{"clear":function(){}}}}
	};
	
	SceneMaker.prototype.setNewScene = function( cell ) {
		this.svg.stop();
		this.clearScene();
		var jsonObject = typeof(cell) !== typeof(true) ? cell : createMainObject();
		
		this.addCellToScene( jsonObject );
	};
	
	function createMainObject() {
		return {"DOMDocument":{"Shape":[],"Bitmaps":[],"Sounds":[],"Text":[],"Timeline":[{"frameCount":"1","Frame":[{"num":"0","Command":[]}]}]}};
	}
	
	function setInitialMargin( id, offsetX, offsetY ){
		
		var temp_el;
		
		if ( typeof( starter_pos[id] ) != "undefined" && starter_pos[id].offset !== true ){
			starter_pos[id].x -= offsetX;
			starter_pos[id].y -= offsetY;
			
			starter_pos[id].offset = true;
		}
		
	}
	
	function getMovieClipById( id ) {
		
		var movieClip = instance.svg.mc.getChildById(id);
		
		if (movieClip !== false && typeof( starter_pos[id] ) == "undefined"){
			starter_pos[id] = {x: movieClip.getMatrix().e, y: movieClip.getMatrix().f};
		}
		
		return movieClip;
	}
	
	function onDragMove(dx, dy, x, y, e) {
		if (drag_el !== false && drag_el !== null) {
			
			dx = isNaN(dx) ? 0 : dx;
			dy = isNaN(dy) ? 0 : dy;
			
			curMatrix = drag_el.getMatrix();
			curMatrix.e = initial_pos.x + dx;
			curMatrix.f = initial_pos.y + dy;
			
			drag_el.el.transform(curMatrix.toTransformString());
			
			if ( typeof(instance.onDragMove) == typeof(Function) ) {
				instance.onDragMove(drag_el, dx, dy, x, y, e);
			}
		}
	}
	
	function onDragStart(x, y, e) {
		var mc = getParentMovieClip(e.target),
			start_pos;
		
		if (mc !== false && mc !== null) {
			drag_el = getMovieClipById(mc.getAttribute('token'));
			if (drag_el !== false) {
				initial_pos = {x: drag_el.getMatrix().e, y:drag_el.getMatrix().f};
			}
			else {
				drag_el = null;
			}
		}
		instance.svg.stop();
		
		if ( typeof(instance.onDragStart) == typeof(Function) ) {
			
			start_pos = {x:0, y:0};
			shouldContinue = instance.onDragStart(drag_el, start_pos);
			
			if (shouldContinue === false) {
				drag_el = initial_pos = null;
				instance.reset();
			}
			else {
				setInitialMargin( drag_el.id, start_pos.x, start_pos.y );
			}
		}
	}
	
	function onDragEnd(e) {
		if (drag_el !== false && drag_el !== null) {
		
			new_transform = drag_el.getMatrix().toString().replace(/^matrix\(([^\)]+)\)$/,'$1');
		
			updateMovieClip(drag_el.charid, 'transformMatrix', new_transform, 'Place');
		
			if ( typeof(instance.onDragEnd) == typeof(Function)) {
				instance.onDragEnd(drag_el, (initial_pos.x !== drag_el.getMatrix().e && initial_pos.y !== drag_el.getMatrix().f), e);
			}
		
			drag_el = initial_pos = null;
			instance.reset();
		}
	}
	
	function updateMovieClip(el_charid, property, new_value, cmdType) {
	
		for (i = mainMC.DOMDocument.Timeline.length - 1; i > -1; i -= 1) {
			if (typeof(mainMC.DOMDocument.Timeline[i].linkageName) == 'undefined') {
				
				for(var frameIndex =0; frameIndex < mainMC.DOMDocument.Timeline[i].Frame.length; frameIndex++) {
					
					if(mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command !== undefined) {
						
						for(var commandIndex =0; commandIndex < mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command.length; commandIndex++) {
						
							if(mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex].cmdType == cmdType && mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex].charid == el_charid && typeof(mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex][property]) !== "undefined" ) {
								
								mainMC.DOMDocument.Timeline[i].Frame[frameIndex].Command[commandIndex][property] = new_value;
							}
						}
					}
				}
				break;
			}
		}
	}
	
	function getParentMovieClip(el) {
		try {
			var parent = el,
				classes = parent !== null && typeof(parent.className) !== "undefined" ? parent.className.baseVal.match(/\S+/g) : [];
			
			while (parent !== null) {
				if (classes !== null && !!~classes.indexOf('movieclip') && parent.parentNode == instance.svg.mc.el.node ) {
					break;
				}
				parent = parent.parentNode;
				classes = parent !== null && typeof(parent.className) !== "undefined" ? parent.className.baseVal.match(/\S+/g) : [];
			}
			return parent;
		} catch(e){
			return false;
		}
	}
	
	function AJAX_JSON_Req( url, callback ) {
		AJAX_req = new XMLHttpRequest();
		AJAX_req.open("GET", url, true);
		AJAX_req.setRequestHeader("Content-type", "application/json");
		
		AJAX_req.onreadystatechange = function() {
			if( AJAX_req.readyState == 4 && AJAX_req.status == 200 ) {
				if ( typeof(callback) == typeof(Function) ) {
					callback( JSON.parse( AJAX_req.responseText ) );
				}
	        }
		};
		
		AJAX_req.send();
	}
	
	function mergeCellToScene(cell) {
	
		if ( typeof(mainMC) == "undefined" ) {
			mainMC = cell;
		} else {
			
			mainMC.DOMDocument.Shape = mainMC.DOMDocument.Shape.concat(cell.DOMDocument.Shape);
			mainMC.DOMDocument.Bitmaps = mainMC.DOMDocument.Bitmaps.concat(cell.DOMDocument.Bitmaps);
			mainMC.DOMDocument.Text = mainMC.DOMDocument.Text.concat(cell.DOMDocument.Text);
			
			if(cell.DOMDocument.Timeline !== undefined) {
			
				if(mainMC.DOMDocument.Timeline == undefined) {
					mainMC.DOMDocument.Timeline = cell.DOMDocument.Timeline;
				}
				else {
				
					for (i = mainMC.DOMDocument.Timeline.length - 1; i > -1; i -= 1) {
						if (typeof(mainMC.DOMDocument.Timeline[i].linkageName) == 'undefined') {
							mainMCRest = mainMC.DOMDocument.Timeline.splice(i);
							break;
						}
					}
					
					for (i = cell.DOMDocument.Timeline.length - 1; i > -1; i -= 1) {
						if (typeof(cell.DOMDocument.Timeline[i].linkageName) == 'undefined') {
							mainCellRest = cell.DOMDocument.Timeline.splice(i);
							break;
						}
					}
					
					mainMC.DOMDocument.Timeline = mainMC.DOMDocument.Timeline.concat(cell.DOMDocument.Timeline);
					mainCellTimeline = mainCellRest.shift();
					
					//We retrieve the highest id of the object within the main timeline
					pointerObject = 0;
					if(mainMCRest[0].Frame !== undefined) {
						for(var frameIndex =0; frameIndex < mainMCRest[0].Frame.length; frameIndex++) {
							if(mainMCRest[0].Frame[frameIndex].Command !== undefined) {
								for(var commandIndex = 0; commandIndex < mainMCRest[0].Frame[frameIndex].Command.length; commandIndex++) {
									if(mainMCRest[0].Frame[frameIndex].Command[commandIndex].objectId !== undefined) {
										tempID = parseInt(mainMCRest[0].Frame[frameIndex].Command[commandIndex].objectId);
										pointerObject = tempID > pointerObject ? tempID : pointerObject;
									}
								}
							}
						}
					}
					//The main timeline object ids are updated
					if(mainCellTimeline.Frame !== undefined) {
						for(var frameIndex =0; frameIndex < mainCellTimeline.Frame.length; frameIndex++) {
							if(mainCellTimeline.Frame[frameIndex].Command !== undefined) {
								for(var commandIndex = 0; commandIndex < mainCellTimeline.Frame[frameIndex].Command.length; commandIndex++) {
									
									if(mainCellTimeline.Frame[frameIndex].Command[commandIndex].objectId !== undefined) {
										tempID = parseInt(mainCellTimeline.Frame[frameIndex].Command[commandIndex].objectId) + pointerObject;
										mainCellTimeline.Frame[frameIndex].Command[commandIndex].objectId = tempID + "";
									}
									if(
										mainCellTimeline.Frame[frameIndex].Command[commandIndex].placeAfter !== undefined &&
										mainCellTimeline.Frame[frameIndex].Command[commandIndex].placeAfter !== "0"
									) {
										tempID = parseInt(mainCellTimeline.Frame[frameIndex].Command[commandIndex].placeAfter) + pointerObject;
										mainCellTimeline.Frame[frameIndex].Command[commandIndex].placeAfter = tempID + "";
									}
									
								}
							}
						}
					}
					
					mainMCRest[0].frameCount = parseInt(mainMCRest[0].frameCount) > parseInt(mainCellTimeline.frameCount) ? mainMCRest[0].frameCount : mainCellTimeline.frameCount;
					frames = (mainCellTimeline.Frame.length > mainMCRest[0].Frame.length ? mainCellTimeline.Frame.length : mainMCRest[0].Frame.length);
					
					for(var frameIndex=0; frameIndex < frames; frameIndex++) {
						
						if ( typeof( mainMCRest[0].Frame[frameIndex] ) == "undefined" ) {
							mainMCRest[0].Frame[frameIndex] = mainCellTimeline.Frame[frameIndex];
						}
						else if ( typeof( mainCellTimeline.Frame[frameIndex] ) !== "undefined" ) {
							mainMCRest[0].Frame[frameIndex].Command = mainMCRest[0].Frame[frameIndex].Command.concat( mainCellTimeline.Frame[frameIndex].Command );
						}
					}
					
					mainMC.DOMDocument.Timeline = ( mainMC.DOMDocument.Timeline.concat(mainMCRest).concat(mainCellRest) );
				}
			}
			
		}
	}

	function removeObjectFromScene(objectID, isItChar, reverseMode, mainObject){ //TODO - allow deletion of elements not wrapped in MovieClips, 2. Update the frame count when needed
		isItChar = typeof(isItChar) !== typeof(true) ? false : isItChar;
		reverseMode = typeof(reverseMode) !== typeof(true) ? false : reverseMode;
		mainObject = typeof(mainObject) == "undefined" ? mainMC  : mainObject;

		if ( typeof(mainObject) == "undefined" ) {
			return;
		} else {
			
			if(mainObject.DOMDocument.Timeline == undefined) {
				debugger;
			}
			else {

				var mainTimeline;
				var frameIndex = 0;
				var commandIndex = 0;
				
				//If we need the main timeline
				if ( !isItChar ){
					for (i = mainObject.DOMDocument.Timeline.length - 1; i > -1; i -= 1) {
						if (typeof(mainObject.DOMDocument.Timeline[i].linkageName) == 'undefined') {
							mainTimeline = mainObject.DOMDocument.Timeline[i];
							break;
						}
					}
				}
				//If we need a secondary timeline
				else {
					for(var movieClipIndex =0; movieClipIndex < mainObject.DOMDocument.Timeline.length - 1; movieClipIndex++) {
						if (objectID == mainObject.DOMDocument.Timeline[movieClipIndex].charid) {
							mainTimeline = mainObject.DOMDocument.Timeline[movieClipIndex];
						}
					}
				}
				
				//If the object is a MovieClip
				if( typeof( mainTimeline ) !== "undefined" && typeof( mainTimeline.Frame ) !== "undefined") {
							
					while ( frameIndex < mainTimeline.Frame.length ) {
		
						while ( commandIndex < mainTimeline.Frame[frameIndex].Command.length ) {
							
							if ( isItChar ){
								
								if ( mainTimeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place" ) {
									removeObjectFromScene( mainTimeline.Frame[frameIndex].Command[commandIndex].charid, true, false, mainObject );
								}
								commandIndex++;
							}
							else if( 
								( !reverseMode && mainTimeline.Frame[frameIndex].Command[commandIndex].objectId == objectID ) ||
								( reverseMode && mainTimeline.Frame[frameIndex].Command[commandIndex].objectId != objectID )
							) {
							
								if ( mainTimeline.Frame[frameIndex].Command[commandIndex].cmdType == "Place" ) {
								
									removeObjectFromScene( mainTimeline.Frame[frameIndex].Command[commandIndex].charid, true, false, mainObject );
								}
								mainTimeline.Frame[frameIndex].Command.splice( commandIndex, 1 );
							}
							else {
								//Take care of normalizing the IDs
								if (!reverseMode){
									var currentId = parseInt( mainTimeline.Frame[frameIndex].Command[commandIndex].objectId );
									if ( currentId >= parseInt( objectID ) ){
										mainTimeline.Frame[frameIndex].Command[commandIndex].objectId = (currentId - 1)+"";
									}
								
									if ( typeof( mainTimeline.Frame[frameIndex].Command[commandIndex].placeAfter ) !== "undefined" ){
	
										var placeAfter = parseInt( mainTimeline.Frame[frameIndex].Command[commandIndex].placeAfter );
										if ( placeAfter >= parseInt( objectID ) ) {
											mainTimeline.Frame[frameIndex].Command[commandIndex].placeAfter = (placeAfter - 1)+"";
										}
									}
								}
								else {
									if ( !isItChar && typeof( mainTimeline.Frame[frameIndex].Command[commandIndex].placeAfter ) !== "undefined" ){
										mainTimeline.Frame[frameIndex].Command[commandIndex].placeAfter = "0";
									}
								}
								commandIndex++;
							}
						}
						
						commandIndex = 0;
						frameIndex++;
					}
					
					if ( isItChar ){

						var indexMc = mainObject.DOMDocument.Timeline.indexOf( mainTimeline );
						if ( indexMc > -1) {
							mainObject.DOMDocument.Timeline.splice( indexMc, 1 );
						}
					}
				}
				//If the object is a graphic, text or bitmap
				else {
					var graphicObject;// = instance.svg.resourceManager.getShape(objectID);
					
					for(var shapeIndex =0; shapeIndex < mainObject.DOMDocument.Shape.length; shapeIndex++) {
						if (objectID == mainObject.DOMDocument.Shape[shapeIndex].charid) {
							graphicObject = mainObject.DOMDocument.Shape[shapeIndex];
						}
					}

					//If the object is a Graphic
					if( typeof( graphicObject ) !== "undefined") {
						
						var indexGp = mainObject.DOMDocument.Shape.indexOf( graphicObject );
						if ( indexGp > -1) {
							mainObject.DOMDocument.Shape.splice( indexGp, 1 );
						}
					}
					//If the object is a text or bitmap
					else {
						var textObject;// = instance.svg.resourceManager.getText(objectID);
						
						for(var textIndex =0; textIndex < mainObject.DOMDocument.Text.length; textIndex++) {
							if (objectID == mainObject.DOMDocument.Text[textIndex].charid) {
								textObject = mainObject.DOMDocument.Text[textIndex];
							}
						}
    
						//If the object is a Text
						if( typeof( textObject ) !== "undefined") {
						
							var indexTx = mainObject.DOMDocument.Text.indexOf( textObject );
							if ( indexTx > -1) {
								mainObject.DOMDocument.Text.splice( indexTx, 1 );
							}
						}
					}
				}
			}
		}
	}
	
	function prepareJSON(json) {
		
		var tempPointer = pointer,
			tempID = 0;
		
		for(var shapeIndex =0; shapeIndex < json.DOMDocument.Shape.length; shapeIndex++){
			tempID = parseInt(json.DOMDocument.Shape[shapeIndex].charid);
			tempPointer = tempID > tempPointer ? tempID : tempPointer;
			json.DOMDocument.Shape[shapeIndex].charid = tempID + pointer + "";
		}
	
		for(var bitmapIndex =0; bitmapIndex < json.DOMDocument.Bitmaps.length; bitmapIndex++) {
			tempID = parseInt(json.DOMDocument.Bitmaps[bitmapIndex].charid);
			tempPointer = tempID > tempPointer ? tempID : tempPointer;
			json.DOMDocument.Bitmaps[bitmapIndex].charid = tempID + pointer + "";
		}
	
		for(var textIndex =0; textIndex < json.DOMDocument.Text.length; textIndex++) {
			tempID = parseInt(json.DOMDocument.Text[textIndex].charid);
			tempPointer = tempID > tempPointer ? tempID : tempPointer;
			json.DOMDocument.Text[textIndex].charid = tempID + pointer + "";
		}
	
		if(json.DOMDocument.Timeline !== undefined) {
		
			for(var movieClipIndex =0; movieClipIndex < json.DOMDocument.Timeline.length; movieClipIndex++) {
				
				tempID = parseInt(json.DOMDocument.Timeline[movieClipIndex].charid);
				
				if ( !isNaN( tempID ) ) {
					tempPointer = tempID > tempPointer ? tempID : tempPointer;
					json.DOMDocument.Timeline[movieClipIndex].charid = tempID + pointer + "";
				}
			
				if(json.DOMDocument.Timeline[movieClipIndex].Frame !== undefined) {
				
					for(var frameIndex =0; frameIndex < json.DOMDocument.Timeline[movieClipIndex].Frame.length; frameIndex++) {
					
						if(json.DOMDocument.Timeline[movieClipIndex].Frame[frameIndex].Command !== undefined) {
						
							for(var commandIndex =0; commandIndex < json.DOMDocument.Timeline[movieClipIndex].Frame[frameIndex].Command.length; commandIndex++) {
						
								if(json.DOMDocument.Timeline[movieClipIndex].Frame[frameIndex].Command[commandIndex].charid !== undefined) {
									
									tempID = parseInt(json.DOMDocument.Timeline[movieClipIndex].Frame[frameIndex].Command[commandIndex].charid);
									tempPointer = tempID > tempPointer ? tempID : tempPointer;
									json.DOMDocument.Timeline[movieClipIndex].Frame[frameIndex].Command[commandIndex].charid = tempID + pointer + "";
									
								}
							}
						}
					}
				}
			}
		}
		
		pointer += tempPointer;
	}
	
}
	
	window.SceneMaker = SceneMaker;
	return SceneMaker;
}(window || this));