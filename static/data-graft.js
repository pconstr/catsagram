/* Copyright 2010-2011, Carlos Guerreiro
 * Licensed under the MIT license */

data_graft = (function() {
    function toStr(v) {
	if(typeof(v) === 'number') {
	    return ''+ v;
	} else {
	    return v;
	}
    }

    function walkDots(s, f) {
	var l = s.split('.');
	var i;
	for(i = 0; i < l.length; ++i) {
	    f = f[l[i]];
	    if(f === undefined) {
		return f;
	    }
	}
	return f;
    }
    
    function object(o) {
	function F() {}
        F.prototype = o;
        return new F();
    }
    
    function override(d, toPush) {
	var t = typeof(d);
	if(t !== 'object') {
	    return d;
	}
	
	if(isEmptyObject(toPush)) {
	    return d;
	}
	var dd = object(d);
	var pe;
	for(pe in toPush) {
	    if(toPush.hasOwnProperty(pe)) {
		dd[pe] = toPush[pe];
	    }
	}
	return dd;
    }
    
    function getValue(d, v, pushed, context) {
	var fn, av, r, f, val;
	if(v[0] === ':') {
	    fn = v.slice(1);
	    f = walkDots(fn, context);
	    return toStr(f(override(d, pushed)));
	} else if(v === '') {
	    // FIXME: find better syntax for referring to current data rather than a variable in it. this?
	    return toStr(d);
	} else {
	    r = walkDots(v, pushed);
	    if(r !== undefined) {
		return toStr(r);
	    }
	    if(typeof(d) === 'object' || typeof(d) === 'string') {
		r = walkDots(v, d);
		if(r !== undefined) {
		    return toStr(r);
		}
	    }
	    return undefined;
	}
    }

    function isEmptyObject(o) {
	var i;
	for(i in o) {
	    if(o.hasOwnProperty(i)) {
		return false;
	    }
	}
	return true;
    }

    function isEmpty(v) {
	var i;
	if(v === undefined || v === null) {
	    return true;
	}
	if(typeof(v) === 'object') {
	    if(v.constructor === Array) {
		if(v.length === 0) {
		    return true;
		}
	    }
	    for(i in v) {
		if(v.hasOwnProperty(i)) {
		return false;
		}
	    }
	    return true;
	}
	return false;
    }

    function objectKeys(o) {
	var keys = [];
	var oi;
	for(oi in o) {
	    if(o.hasOwnProperty(oi)) {
		keys.push(oi);
	    }
	}
	keys.sort();
	return keys;
    }

    function arrayKeys(a, v, pushed, context) {
	var keyPairs = [];
	var i;
	for(i = 0; i < a.length; ++i) {
	    pushed['_idx_'] = i;
	    keyPairs.push([getValue(a[i], v, pushed, context), i]);
	    delete pushed['_idx_'];
	}
	keyPairs.sort(function(k1, k2) {
	    return k1[0] - k2[0];
	});
	return keyPairs;
    }

    function getAttributeVariables(t, d, toPush) {
	var variables = {};
	var i, a, av, avc, pn, pv;
	
	if(t.attributes !== null) {
	    for(i = 0; i < t.attributes.length; ++i) {
		a = t.attributes[i];
		if(a.name === 'data-graft-each') {
		    variables.eachVariable = a.value;
		} else if(a.name === 'data-graft-for') {
		    variables.forVariable = a.value;
		} else if(a.name === 'data-graft-if') {
		    variables.ifVariable = a.value;
		} else if(a.name === 'data-graft-else') {
		    variables.elseVariable = a.value;
		} else if(a.name === 'data-graft-template') {
		    variables.templateVariable = a.value;
		} else if(a.name === 'data-graft-element') {
		    variables.elementVariable = a.value;
		} else if(a.name === 'data-graft-text') {
		    variables.textVariable = a.value;
		} else if(a.name === 'data-graft-push') {
		    avc = a.value.split('=');
		    pn = avc[0];
		    if(avc.length >= 2) {
			pv = avc[1];
		    } else {
			pv = avc[0];
		    }
		    av = d[pv];
		    if(av !== undefined) {
			toPush[pn] = av;
		    }
		}
	    }
	}
	return variables;
    }

    function callHandler(e, context, name, f, extra) {
	// TODO: consider passing data as well
	
	var classList = e.className.split(' ');
	classList.push('_all_');
	var classIdx = 0;

	function go() {
	    var c, ch;
	    if(classIdx == classList.length) {
		if(f !== undefined) {
		    f();
		}
		return;
	    }
	    c = classList[classIdx];
	    classIdx = classIdx + 1;
	    if(c in context) {
		ch = context[c];
		if(name in ch) {
		    ch[name](e, go, extra);
		    return;
		}
	    }
	    go();
	}

	go();
    }

    function pushVars(pushed, toPush) {
	var pe;
	for(pe in toPush) {
	    if(toPush.hasOwnProperty(pe)) {
		pushed[pe] = toPush[pe];
	    }
	}
    }

    function popVars(pushed, toPush) {
	for(pe in toPush) {
	    if(toPush.hasOwnProperty(pe)) {
		delete pushed[pe];
	    }
	}
    }

    function germinate(d, t, idx, germState, pushed, context) {
	function germinateChildren() {
	    var i, tc;
	    pushVars(pushed, toPush)
	    for(i = 0; i < t.childNodes.length; ++i) {
		tc = t.childNodes[i];
		newElement.appendChild(germinate(d, tc, undefined, germState, pushed, context));
	    }	    
	    popVars(pushed, toPush);
	}

	function germinateSingleChild(di, dc) {
	    var j, tc;
	    pushVars(pushed, toPush);
	    for(j = 0; j < t.childNodes.length; ++j) {
		tc = t.childNodes[j];
		if(tc.nodeType === 1) {
		    newElement.appendChild(germinate(dc, tc, di, germState, pushed, context));
		    break;
		}
	    }
	    popVars(pushed, toPush);
	}
	
	function germinateChild(di, dc, tt) {
	    var j, tc;
	    pushVars(pushed, toPush);
	    for(j = 0; j < tt.childNodes.length; ++j) {
		tc = tt.childNodes[j];
		newElement.appendChild(germinate(dc, tc, di, germState, pushed, context));
	    }
	    popVars(pushed, toPush);
	}

	var i, j, a, an, av, dd, v;
	var testResult = undefined;
	var toPush = {};
	var newElement = null;
	
	var variables = getAttributeVariables(t, d, toPush);

	var subTemplate = null;
	if('templateVariable' in variables) {
	    subTemplate = document.getElementById(variables.templateVariable);
	}

	if(t.tagName !== undefined) {
	    newElement = document.createElement(t.tagName);
	    
	    if(idx !== undefined) {
		newElement.setAttribute('data-graft-idx', idx);
	    }
	}

	if(t.attributes !== null) { // FIXME: correct check? try taking it out
	    for(i = 0; i < t.attributes.length; ++i) {
		a = t.attributes[i];
		if(a.name.slice(0, 11) === 'data-graft-') {
		    if(a.name.slice(0, 12) === 'data-graft--') {
			an = a.name.slice(12);
			av = getValue(d, a.value, pushed, context);
			if(av !== undefined && av !== null) {
			    newElement.setAttribute(an, av);
			}
		    }
		} else {
		    if(a.name !== 'id' && a.value !== undefined) {
			newElement.setAttribute(a.name, a.value);
		    }
		}
	    }
	}
	
	if(t.nodeType === 3) {
	    newElement = document.createTextNode(t.nodeValue);
	}

	if(t.nodeType === 8) {
	    newElement = document.createComment(t.nodeValue);
	}

	var tc, di, keys;
	// nodes created here are added inside newElement
	if(variables.forVariable !== undefined) {
	    keys = arrayKeys(d, variables.forVariable, pushed, context);
	    testResult = keys.length > 0;
	    for(i = 0; i < keys.length; ++i) {
		germinateSingleChild(keys[i][0], d[keys[i][1]]);
	    }
	    germState.lastTestResult = testResult;
	} else if(variables.eachVariable !== undefined) {
	    keys = objectKeys(d);
	    testResult = keys.length > 0;
	    for(i = 0; i < keys.length; ++i) {
		toPush[variables.eachVariable] = keys[i];
		germinateSingleChild(keys[i], d[keys[i]]);
	    }
	    germState.lastTestResult = testResult;
	} else if(variables.ifVariable !== undefined) {
	    av = getValue(d, variables.ifVariable, pushed, context);
	    testResult = av !== null && av !== undefined;
	    if(testResult) {
		germinateChild(undefined, av, subTemplate !== null ? subTemplate : t);
	    }
	    germState.lastTestResult = testResult;
	} else if(variables.elseVariable !== undefined) {
	    if(!germState.lastTestResult) {
		germinateChildren();
	    }
	} else if(variables.textVariable !== undefined) {
	    v = getValue(d, variables.textVariable, pushed, context);
	    if(v !== null && v !== undefined) {
		newElement.appendChild(document.createTextNode(getValue(d, variables.textVariable, pushed, context)));
	    }
	} else if(variables.elementVariable !== undefined) {
	    // FIXME: implement function to do comparison and callback if they exist
	    newElement.appendChild(getValue(d, variables.elementVariable, pushed, context));
	} else {
	    germinateChildren();
	}

	if(newElement !== null && t.nodeType === 1) {
	    callHandler(newElement, context, 'init', undefined, d, pushed);
	    // TODO: add support for cleanup as well
	}

	return newElement;
    }

    function regenerate(target, d, t, germState, pushed, context, tracker) {
	while(t !== null && target !== null) {
	    regenerateChild(target, d, t, germState, pushed, context, tracker);
	    target = target.nextSibling;
	    t = t.nextSibling;
	}
    }

    function removeAllChildren(target) {
	var ed;
	var e = target.firstChild;
	while(e !== null) {
	    ed = e;
	    e = e.nextSibling;
	    target.removeChild(ed);
	}
    }

    function getTargetIdx(target) {
	var idx = null;
	var a;
	var i;
	for(i = 0; i < target.attributes.length; ++i) {
	    a = target.attributes[i];
	    if(a.name === 'data-graft-idx') {
		idx = a.value;
	    }
	}
	return idx;
    }

    function regenerateSequence(tParent, d, t, germState, pushed, forVariable, eachVariable, context, tracker) {

	function skipTextNodes() {
	    while(target !== null && target.nodeType === 3) {
		target = target.nextSibling;
	    }
	}

	var target;
	if(tParent.childNodes.length > 0) {
	    target = tParent.childNodes[0];
	} else {
	    target = null;
	}

	var tt = t;
	while(tt !== null && tt.nodeType === 3) {
	    tt = tt.nextSibling;
	}

	var id, idx, i, a, e, newElement;

	skipTextNodes();

	var keys;
	if(forVariable !== undefined) {
	    keys = arrayKeys(d, forVariable, pushed, context);
	} else {
	    keys = objectKeys(d);
	}

	var iK = 0;
	var key;

	while(iK < keys.length && target !== null) {
	    idx = getTargetIdx(target);

	    if(forVariable !== undefined) {
		key = keys[iK][0];
		keyi = keys[iK][1];
	    } else {
		key = keys[iK];
		keyi = key;
	    }

	    if(idx < key) {
		// unexpected target, needs to be removed
		e = target;
		target = target.nextSibling;
		removeSequenceElement(e, context, tracker);
		skipTextNodes();
	    } else if(idx > key) {
		// missing target, needs to be added
		if(eachVariable !== undefined) {
		    pushed[eachVariable] = key;
		}
		newElement = germinate(d[keyi], tt, key, germState, pushed, context);
		if(eachVariable !== undefined) {
		    delete pushed[eachVariable];
		}

		insertSequenceElement(target, newElement, context, tracker);
		
		++iK;
	    } else {
		if(eachVariable !== undefined) {
		    pushed[eachVariable] = key;
		}
		regenerateChild(target, d[keyi], tt, germState, pushed, context, tracker);
		if(eachVariable !== undefined) {
		    delete pushed[eachVariable];
		}
		++iK;

		target = target.nextSibling;
		skipTextNodes();
	    }
	}
	
	while(iK < keys.length) {

	    if(forVariable !== undefined) {
		key = keys[iK][0];
		keyi = keys[iK][1];
	    } else {
		key = keys[iK];
		keyi = key;
	    }

	    if(eachVariable !== undefined) {
		pushed[eachVariable] = key;
	    }

	    newElement = germinate(d[keyi], tt, key, germState, pushed, context);

	    appendSequenceElement(tParent, newElement, context, tracker);
	    
	    if(eachVariable !== undefined) {
		delete pushed[eachVariable];
	    }
	    
	    ++iK;
	}
	
	while(target !== null) {
	    e = target;
	    target = target.nextSibling;
	    removeSequenceElement(e, context, tracker);

	    skipTextNodes();
	}

	return keys.length > 0;
    }

    function regenerateChild(target, d, t, germState, pushed, context, tracker) {
	var toPush = {};
	
	var variables = getAttributeVariables(t, d, toPush);

	var subTemplate = null;
	if('templateVariable' in variables) {
	    subTemplate = document.getElementById(variables.templateVariable);
	}

	var newElement = null;
	var av, v;

	// FIXME: some redundancy with germinate
	if(t.attributes !== null) {
	    for(i = 0; i < t.attributes.length; ++i) {
		a = t.attributes[i];
		if(a.name.slice(0, 11) === 'data-graft-') {
		    if(a.name.slice(0, 12) === 'data-graft--') {
			an = a.name.slice(12);
			av = getValue(d, a.value, pushed, context);

			if(target.getAttribute(an) !== av) {
			    updateAttribute(target, an, av, context, tracker);
			}
		    }
		}
	    }
	}
	
	if(t.tagName !== undefined) {
	    // check tag
	    
	    var tagIn, tagIsIn;
	    var ne;

	    pushVars(pushed, toPush);
	    
	    if(variables.ifVariable !== undefined) {
		av = getValue(d, variables.ifVariable, pushed, context);
		tagIn = (av !== null && av !== undefined);
		tagIsIn = target.childNodes.length > 0;
		
		if(tagIn) {
		    if(tagIsIn) {
			// recurse into if
			regenerate(target.childNodes[0], av, subTemplate !== null ? subTemplate.childNodes[0] : t.childNodes[0], germState, pushed, context, tracker);
		    } else {
			// need to add if
			newElement = germinate(d, t, undefined, germState, pushed, context);
			replaceIfElement(target, newElement, context, tracker);
		    }
		} else {
		    if(tagIsIn) {
			// need to cut if
			cutIfElement(target, context, tracker);
		    }
		}
		germState.lastTestResult = tagIn;
	    } else if(variables.elseVariable !== undefined) {
		tagIn = !germState.lastTestResult;
		tagIsIn = target.childNodes.length > 0;
		
		if(tagIn) {
		    if(tagIsIn) {
			// recurse into else
			regenerate(target.childNodes[0], d, t.childNodes[0], germState, pushed, context, tracker);
		    } else {
			// need to add else
			newElement = germinate(d, t, undefined, germState, pushed, context);
			replaceElseElement(target, newElement, context, tracker);
		    }
		} else {
		    if(tagIsIn) {
			// need to remove else
			cutElseElement(target, context, tracker);
		    }
		}
	    } else if(variables.textVariable !== undefined) {
		v = getValue(d, variables.textVariable, pushed, context);
		setTextElement(target, v, context, tracker);
	    } else if(variables.elementVariable !== undefined) {
		ne = getValue(d, variables.elementVariable, pushed, context);
		target.replaceChild(ne, target.childNodes[0]);
	    } else if(variables.eachVariable !== undefined) {
		germState.lastTestResult = regenerateSequence(target, d, t.childNodes[0], germState, pushed, undefined, variables.eachVariable, context, tracker);
	    } else if(variables.forVariable !== undefined) {
		germState.lastTestResult = regenerateSequence(target, d, t.childNodes[0], germState, pushed, variables.forVariable, undefined, context, tracker);
	    } else {
		if(target.childNodes.length > 0 && t.childNodes.length > 0) {
		    regenerate(target.childNodes[0], d, t.childNodes[0], germState, pushed, context, tracker);
		}
	    }

	    popVars(pushed, toPush);
	}
    }
    
    function insertSequenceElement(target, e, context, tracker) {
	var f = function() {
	    target.parentNode.insertBefore(e, target);
	    callHandler(e, context, 'postInsertSequence', tracker.dec);
	};
	tracker.inc();
	callHandler(e, context, 'preInsertSequence', f);
    }

    function appendSequenceElement(tParent, e, context, tracker) {
	var f = function() {
	    tParent.appendChild(e);
	    callHandler(e, context, 'postInsertSequence', tracker.dec);
	};
	tracker.inc();
	callHandler(e, context, 'preInsertSequence', f);
    }
 
    function removeSequenceElement(e, context, tracker) {
	var f = function() {
	    e.parentNode.removeChild(e);
	    tracker.dec();
	};
	tracker.inc();
	callHandler(e, context, 'preRemoveSequence', f);
    }

    function setTextElement(target, v, context, tracker) {
	var shouldBeIn = v !== null && v !== undefined;
	var isIn = target.childNodes.length > 0;
	var f;

	if(shouldBeIn) {
	    if(isIn) {
		if(target.childNodes[0].nodeValue !== v) {
		    f = function() {
			target.childNodes[0].nodeValue = v;
			callHandler(target, context, 'postUpdateText', tracker.dec);
		    };
		    tracker.inc();
		    callHandler(target, context, 'preUpdateText', f);
		}
	    } else {
		f = function() {
		    target.appendChild(document.createTextNode(v));
		    callHandler(target, context, 'postInsertText', tracker.dec);
		};
		tracker.inc();
		callHandler(target, context, 'preInsertText', f);
	    }
	} else {
	    if(isIn) {
		f = function() {
		    target.removeChild(target.childNodes[0]);
		    callHandler(target, context, 'postRemoveText', tracker.dec);
		};
		tracker.inc();
		callHandler(target, context, 'preRemoveText', f);
	    }
	}
    }

    function updateAttribute(target, attr, v, context, tracker) {
	var currValue = target.getAttribute(attr);
	var hasGot = currValue != null;
	var shouldHave = v !== undefined && v !== null;
	var f;

	if(hasGot) {
	    if(shouldHave) {
		if(currValue !== v) {
		    // changed
		    f = function() {
			target.setAttribute(attr, v);
			callHandler(target, context, 'postUpdateAttribute', tracker.dec, attr);
		    };
		    tracker.inc();
		    callHandler(target, context, 'preUpdateAttribute', f, attr);
		}
	    } else {
		// remove
		f = function() {
		    target.removeAttribute(attr);
		    callHandler(target, context, 'postRemoveAttribute', tracker.dec, attr);
		};
		tracker.inc();
		callHandler(target, context, 'preRemoveAttribute', f, attr);
	    }
	} else {
	    if(shouldHave) {
		// add
		f = function() {
		    target.setAttribute(attr, v);
		    callHandler(target, context, 'postAddAttribute', tracker.dec, attr);
		}
		tracker.inc();
		callHandler(target, context, 'preAddAttribute', f, attr);
	    } else {
	    }
	}
    }
    
    function replaceIfElement(target, e, context, tracker) {
	var f = function() {
	    target.parentNode.replaceChild(e, target);
	    callHandler(e, context, 'postInsertIf', tracker.dec);
	};
	tracker.inc();
	callHandler(target, context, 'preInsertIf', f);
    }
    
    function replaceElseElement(target, e, context, tracker) {
	var f = function() {
	    target.parentNode.replaceChild(e, target);
	    callHandler(e, context, 'postInsertElse', tracker.dec);
	};
	tracker.inc();
	callHandler(target, context, 'preInsertElse', f);
    }

    function cutIfElement(target, context, tracker) {
	var f = function() {
	    removeAllChildren(target);
	    callHandler(target, context, 'postRemoveIf', tracker.dec);
	};
	tracker.inc();
	callHandler(target, context, 'preRemoveIf', f);
    }
    
    function cutElseElement(target, context, tracker) {
	var f = function() {
	    removeAllChildren(target);
	    callHandler(target, context, 'postRemoveElse', tracker.dec);
	};
	tracker.inc();
	callHandler(target, context, 'preRemoveElse', f);
    }

    function initGermState() {
	return {lastTestResult:undefined};
    }
    
    /*********************/
    
    var graftProto = {
	update: function(d) {
	    var context = this.context;
	    var unfinishedHandlersCount = 0;
	    var startedEverything = false;
	    var germState = initGermState();
	    var tracker = {
		'inc': function() {
		    unfinishedHandlersCount = unfinishedHandlersCount + 1;
		},
		'dec': function() {
		    unfinishedHandlersCount = unfinishedHandlersCount - 1;
		    if(unfinishedHandlersCount === 0 && startedEverything && 'finish' in context) {
			context.finish();
		    }
		}
	    };
	    if('start' in context) {
		context.start();
	    }
	    regenerateChild(this.output, d, this.template, germState, {}, context, tracker);
	    startedEverything = true;
	    if('finish' in context && unfinishedHandlersCount === 0) {
		context.finish();
	    }
	}
    };

    return {
	germ: function(d, t, context) {
	    var g = object(graftProto);
	    var germState = initGermState();
	    g.context = context;
	    g.template = t;
	    g.output = germinate(d, t, undefined, germState, {}, context);
	    return g;
	}
    };
}());
