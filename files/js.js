var instantSearches = {};
var activeInstantSearch = false;
var popupLastSearched = '';

/*
Rules:
	- All the fields with the same data-instant-search attribute belong to the same instant search
	- There MUST be one hidden field set as main, therefore:
		- If only one hidden field is found, that will be the main one
		- If more than one hidden fields are found, the first one without a name will be the main one
		- If all have a name, the first one will be the main one
		- If no hidden field is found, a new one will be created and injected right before the first input of the set
 */

function checkInstantSearches(){
	document.querySelectorAll('input[data-instant-search]').forEach(function(el){
		if(el.getAttribute('data-instant-search-set'))
			return;
		if (el.offsetParent === null)
			return;

		var name = el.getAttribute('data-instant-search');
		if(!name)
			return;

		var fieldName = el.getAttribute('data-name');
		if(fieldName){
			if(!el.name)
				el.name = fieldName;
		}else{
			if(el.name)
				fieldName = el.name;
		}

		if(typeof instantSearches[name]==='undefined'){
			instantSearches[name] = {
				'id': null,
				'table': null,
				'pattern': null,
				'fields': {},
				'table-fields': {},
				'where': null,
				'post': null,
				'post-function': null,
				'hidden': null,
				'inputs': {},
				'values': {}
			};
		}

		if(fieldName){
			instantSearches[name]['inputs'][fieldName] = el;
		}else{
			if(el.type.toLowerCase()==='hidden'){
				if(instantSearches[name]['hidden']===null){
					instantSearches[name]['hidden'] = el;
				}else{
					return;
				}
			}else{
				fieldName = name;
				instantSearches[name]['inputs'][fieldName] = el;
			}
		}

		if(el.getAttribute('data-instant-search-id'))
			instantSearches[name]['id'] = el.getAttribute('data-instant-search-id');
		if(el.getAttribute('data-table'))
			instantSearches[name]['table'] = el.getAttribute('data-table');
		if(el.getAttribute('data-pattern'))
			instantSearches[name]['pattern'] = el.getAttribute('data-pattern');
		if(el.getAttribute('data-where'))
			instantSearches[name]['where'] = el.getAttribute('data-where');
		if(el.getAttribute('data-fields'))
			instantSearches[name]['fields'][fieldName] = el.getAttribute('data-fields').split(',');
		if(el.getAttribute('data-table-fields'))
			instantSearches[name]['table-fields'][fieldName] = el.getAttribute('data-table-fields').split(',');
		if(el.getAttribute('data-post'))
			instantSearches[name]['post'] = el.getAttribute('data-post');
		if(el.getAttribute('data-post-function')) {
			instantSearches[name]['post-function'] = (function(code){
				return function(){
					eval(code);
				}
			})(el.getAttribute('data-post-function'));
		}

		el.setAttribute('autocomplete', 'off');

		el.addEventListener('keyup', (function(name, fieldName){
			return function(event){
				if(event.keyCode===13)
					return true;

				instantSearch(this, name, fieldName);
			}
		})(name, fieldName));

		el.addEventListener('blur', function(){
			if(this.getAttribute('data-text-before-reset') && this.getValue()===this.getAttribute('data-text-before-reset')){
				resetInstantSearch(this);
			}
			setTimeout(closeInstantSearch, 300);
		});

		if(el.ctxMenu){
			el.ctxMenu({
				'Ricerca avanzata': function(){
					var url = absolute_path+'instant-search';
					if(instantSearches[name].id)
						url += '/'+instantSearches[name].id;

					var get = [
						'popup=1'
					];

					if(instantSearches[name].table)
						get.push('table='+encodeURIComponent(instantSearches[name].table));
					if(instantSearches[name].pattern)
						get.push('pattern='+encodeURIComponent(instantSearches[name].pattern));
					if(instantSearches[name].where)
						get.push('where='+encodeURIComponent(instantSearches[name].where));
					if(instantSearches[name]['fields'][fieldName])
						get.push('fields='+encodeURIComponent(instantSearches[name]['fields'][fieldName].join(',')));
					if(instantSearches[name]['table-fields'][fieldName])
						get.push('table-fields='+encodeURIComponent(instantSearches[name]['table-fields'][fieldName].join(',')));

					get = get.join('&');

					var post = '';
					if(instantSearches[name]['post'])
						post = instantSearches[name]['post'];
					else if(instantSearches[name]['post-function'])
						post = instantSearches[name]['post-function'].call(field);

					activeInstantSearch = {
						'name': name,
						'field': this,
						'fieldName': fieldName,
						'current': -1,
						'popup': true
					}

					popupLastSearched = false;

					zkPopup({'url': url, 'get': get, 'post': post}, {'onLoad': popupInstantSearch});
				}
			});
		}

		el.setAttribute('data-instant-search-set', '1');
	});

	for(var name in instantSearches){
		if(instantSearches[name]['inputs'].length===0){
			delete instantSearches[name];
			continue;
		}

		if(instantSearches[name]['hidden']===null){
			var hidden = document.createElement('input');
			hidden.type = 'hidden';
			hidden.name = name;
			hidden.setAttribute('data-instant-search', name);
			hidden.setAttribute('data-instant-search-set', '1');

			var firstInput = instantSearches[name]['inputs'][Object.keys(instantSearches[name]['inputs'])[0]];
			firstInput = firstInput.parentNode.insertBefore(hidden, firstInput);

			instantSearches[name]['hidden'] = firstInput;
		}

		instantSearches[name]['hidden'].setAttribute('data-setvalue-function', 'setInstantSearchValue');
	}
}

window.addEventListener('load', function(){
	checkInstantSearches();

	if (typeof MutationObserver !== 'undefined') {
		var observer = new MutationObserver(function (mutations) {
			checkInstantSearches();
		});

		observer.observe(document.body, {"childList": true, "subtree": true});
	}
});

function instantSearch(field, name, fieldName){
	if(typeof instantSearches[name]==='undefined') // Checks if the instant search actually exists
		return false;

	if(typeof instantSearches[name].values[fieldName]==='undefined')
		instantSearches[name].values[fieldName] = '';

	if(instantSearches[name].values[fieldName]===field.value) // If the last searched thing is the same as the current one, I skip this search
		return false;

	instantSearches[name].values[fieldName] = field.value; // Remember this as the last searched thing

	var minLength = 1;
	if(field.getAttribute('data-min-length'))
		minLength = parseInt(field.getAttribute('data-min-length'));

	if(field.value.length<minLength) // Checks if the minimum length of the input is reached
		return false;

	// There can only be one active instant search at a time
	if(activeInstantSearch)
		closeInstantSearch();

	activeInstantSearch = {
		'name': name,
		'field': field,
		'fieldName': fieldName,
		'current': -1,
		'popup': false
	}

	var is;
	if(_('model-instant-search')){
		is = _('model-instant-search');
	}else{
		is = document.createElement('div');
		is.id = 'model-instant-search';
		is.className = 'model-instant-search';
		is.onmousedown = function(e){
			e.stopPropagation();
		};

		is = document.body.appendChild(is);
	}

	var width = field.offsetWidth-12, offsetX = 0, offsetY = 2, highlight = '#FFDD9C';
	if(field.getAttribute('data-width'))
		width = parseInt(field.getAttribute('data-width'));
	if(field.getAttribute('data-offset-x'))
		offsetX = parseInt(field.getAttribute('data-offset-x'));
	if(field.getAttribute('data-offset-y'))
		offsetY = parseInt(field.getAttribute('data-offset-y'));
	if(field.getAttribute('data-highlight'))
		highlight = parseInt(field.getAttribute('data-highlight'));

	is.setAttribute('data-width', width);
	is.setAttribute('data-offset-x', offsetX);
	is.setAttribute('data-offset-y', offsetY);
	is.setAttribute('data-highlight', highlight);

	is.innerHTML = '<img src="'+base_path+'model/Output/files/loading.gif" alt="" />';

	checkInstantSearchPosition();

	var url = absolute_path+'instant-search';
	if(instantSearches[name].id)
		url += '/'+instantSearches[name].id;

	var get = [
		'text='+encodeURIComponent(field.value)
	];

	if(instantSearches[name].table)
		get.push('table='+encodeURIComponent(instantSearches[name].table));
	if(instantSearches[name].pattern)
		get.push('pattern='+encodeURIComponent(instantSearches[name].pattern));
	if(instantSearches[name].where)
		get.push('where='+encodeURIComponent(instantSearches[name].where));
	if(instantSearches[name]['fields'][fieldName])
		get.push('fields='+encodeURIComponent(instantSearches[name]['fields'][fieldName].join(',')));

	get = get.join('&');

	var post = '';
	if(instantSearches[name]['post'])
		post = instantSearches[name]['post'];
	else if(instantSearches[name]['post-function'])
		post = instantSearches[name]['post-function'].call(field);

	ajax(url, get, post).then((function(is, field, name, fieldName, searchedValue){
		return function(r){
			if(!r || !is)
				return false;
			if(typeof r!=='object'){
				alert(r);
				return false;
			}

			if(instantSearches[name].values[fieldName]!==searchedValue)
				return false;

			activeInstantSearch['current'] = -1;

			if(r.length===0){
				is.innerHTML = '<span style="color: #999">No results</span>';
			}else{
				is.innerHTML = '';
				is.style.width = 'auto';
				var maxWidth = 0;

				for(var nr in r){
					var res = r[nr];
					var res_el = document.createElement('div');
					res_el.id = 'is-'+nr;
					res_el.innerHTML = res.text;
					res_el.setAttribute('data-n', nr);
					if(typeof res.onclick==='undefined')
						res_el.onclick = false;
					if(typeof res.fill==='undefined')
						res.fill = {};
					if(typeof res.mark==='undefined')
						res.mark = Object.keys(res.fill);
					is.appendChild(res_el);

					if(res_el.offsetWidth>maxWidth)
						maxWidth = res_el.offsetWidth;

					res_el.go = (function(res, name, field){
						return function(){
							if(res.onclick){
								var onclick = function(){
									eval(res.onclick);
								};
								if(onclick.call(null)===false)
									return false;
							}

							setInstantSearch(name, field, res);
							simulateTab(field, true);
							closeInstantSearch();
						}
					})(res, name, field);

					res_el.addEventListener('click', function(){
						this.go();
					});

					res_el.onmouseover = function(){
						selectInstantSearch(this.getAttribute('data-n'));
					}
				}

				is.setAttribute('data-content-width', maxWidth);
				checkInstantSearchPosition();

				selectInstantSearch(0);
			}
		}
	})(is, field, name, fieldName, field.value));
}

function selectInstantSearch(n){
	var is = _('model-instant-search');
	if(!is || !activeInstantSearch)
		return;

	var current = activeInstantSearch['current'];

	if(n==='-'){
		if(current===0)
			return false;
		n = current-1;
	}else if(n==='+'){
		if(!_('is-'+(current+1)))
			return false;
		n = current+1;
	}else if(isNaN(n)){
		return false;
	}

	var el = _('is-'+n);
	if(!el)
		return false;

	var offsetFromTop = 0;
	for(var i in is.childNodes){
		if(!is.childNodes.hasOwnProperty(i)) continue;
		if(is.childNodes[i]==el)
			break;
		offsetFromTop += is.childNodes[i].offsetHeight;
	}
	elH = el.offsetHeight;
	if(offsetFromTop<is.scrollTop)
		is.scrollTop = offsetFromTop;
	if(offsetFromTop+elH>is.scrollTop+is.offsetHeight)
		is.scrollTop = offsetFromTop-is.offsetHeight+elH+10;

	if(_('is-'+current))
		_('is-'+current).style.backgroundColor = '';

	el.style.backgroundColor = is.getAttribute('data-highlight');

	activeInstantSearch['current'] = n;
}

function closeInstantSearch(){
	var is = _('model-instant-search');
	if(is)
		is.parentNode.removeChild(is);

	if(activeInstantSearch && !activeInstantSearch.popup)
		activeInstantSearch = false;
}

function checkInstantSearchPosition(){
	var is = _('model-instant-search');
	if(!is || !activeInstantSearch)
		return;

	var offsetX = parseInt(is.getAttribute('data-offset-x'));
	var offsetY = parseInt(is.getAttribute('data-offset-y'));
	var c = activeInstantSearch.field.getBoundingClientRect();
	is.style.left = (c.left+offsetX)+'px';
	is.style.top = (c.bottom+offsetY)+'px';

	var width = Math.max(parseInt(is.getAttribute('data-width')), parseInt(is.getAttribute('data-content-width') ? is.getAttribute('data-content-width') : 0));
	if(c.left+offsetX+width>window.innerWidth-5)
		width = window.innerWidth-5-(c.left+offsetX);
	is.style.width = width+'px';

	var height = window.innerHeight-(c.bottom+offsetY)-20;
	if(height<50)
		height = 50;
	is.style.maxHeight = height+'px';
}

window.addEventListener('scroll', function(){
	checkInstantSearchPosition();
});

window.addEventListener('resize', function(){
	checkInstantSearchPosition();
});

window.addEventListener('keydown', function(event){
	if(!activeInstantSearch)
		return true;

	switch(event.keyCode){
		case 13:
			event.stopImmediatePropagation();
			event.preventDefault();

			var el;
			if(el = _('is-'+activeInstantSearch['current'])){
				el.go();
				return false;
			}
			break;
		case 27:
			event.preventDefault();
			event.stopImmediatePropagation();
			closeInstantSearch();
			return false;
			break;
		case 38:
			selectInstantSearch('-');
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;
			break;
		case 40:
			selectInstantSearch('+');
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;
			break;
	}
});

function setInstantSearch(name, field, res){
	if(typeof instantSearches[name]==='undefined')
		return false;

	var hidden = instantSearches[name].hidden;
	if(hidden){
		hidden.value = res.id;
		triggerOnChange(hidden);
	}

	var fieldName = field.getAttribute('data-name');
	if(!fieldName && field.name)
		fieldName = field.name;
	if(!fieldName)
		fieldName = name;

	if(typeof res.fill[fieldName]==='undefined')
		res.fill[fieldName] = res.text;
	if(!in_array(fieldName, res.mark))
		res.mark.push(fieldName);

	for(var f in res.fill){
		if(!res.fill.hasOwnProperty(f) || typeof instantSearches[name].inputs[f]==='undefined')
			return;
		var el = instantSearches[name].inputs[f];
		el.setValue(res.fill[f]);
		if(el instanceof Element)
			el.setAttribute('title', res.fill[f]);
	}

	res.mark.forEach(function(f){
		if(typeof instantSearches[name].inputs[f]==='undefined')
			return;
		markInstantSearch(instantSearches[name].inputs[f]);
	});
}

function markInstantSearch(field){
	field.readOnly = true;
	field.setAttribute('onclick', 'unmarkInstantSearch(this)');
	field.addClass('model-instant-search-marked');
}

function unmarkInstantSearch(field){
	var name = field.getAttribute('data-instant-search');
	if(typeof instantSearches[name]==='undefined')
		return false;

	document.querySelectorAll('.model-instant-search-marked[data-instant-search="'+name+'"]').forEach(function(f){
		f.removeClass('model-instant-search-marked');
		f.readOnly = false;
		f.onclick = function(){ return true };
	});

	field.setAttribute('data-text-before-reset', field.getValue());

	field.focus();
	field.select();

	if(instantSearches[name].hidden){
		field.setAttribute('data-id-before-reset', instantSearches[name].hidden.getValue());
		instantSearches[name].hidden.value = '';
		triggerOnChange(instantSearches[name].hidden);
	}
}

function resetInstantSearch(field){
	var name = field.getAttribute('data-instant-search');
	if(typeof instantSearches[name]==='undefined')
		return false;

	if(instantSearches[name].hidden){
		instantSearches[name].hidden.value = field.getAttribute('data-id-before-reset');
		triggerOnChange(instantSearches[name].hidden);
	}

	field.removeAttribute('data-text-before-reset');
	field.removeAttribute('data-id-before-reset');

	markInstantSearch(field);
}

function setInstantSearchValue(v, trigger_onchange){
	var name = this.getAttribute('data-instant-search');
	if(typeof instantSearches[name]==='undefined')
		return false;

	new Promise((function(field){
		return function(resolve){
			if(typeof v!=='object'){
				var url = absolute_path+'instant-search';
				if(instantSearches[name].id)
					url += '/'+instantSearches[name].id;

				var get = [
					'v='+encodeURIComponent(v)
				];

				if(instantSearches[name].table)
					get.push('table='+encodeURIComponent(instantSearches[name].table));
				if(instantSearches[name].pattern)
					get.push('pattern='+encodeURIComponent(instantSearches[name].pattern));
				if(instantSearches[name].where)
					get.push('where='+encodeURIComponent(instantSearches[name].where));

				var inputs = Object.keys(instantSearches[name]['fields']);
				if(inputs.length>0){
					var firstField = inputs[0];
					if(instantSearches[name]['fields'][firstField])
						get.push('fields='+encodeURIComponent(instantSearches[name]['fields'][firstField].join(',')));
				}

				get = get.join('&');

				var post = '';
				if(instantSearches[name]['post'])
					post = instantSearches[name]['post'];
				else if(instantSearches[name]['post-function'])
					post = instantSearches[name]['post-function'].call(field);

				ajax(url, get, post).then(function(text){
					resolve({
						'id': v,
						'text': text
					});
				});
			}else{
				resolve(v);
			}
		};
	})(this)).then(function(v){
		var inputs = Object.keys(instantSearches[name].inputs);
		if(inputs.length>0){
			if(typeof v.fill!=='undefined' && Object.keys(v.fill).length>0){
				for(var f in v.fill){
					if(!v.fill.hasOwnProperty(f) || typeof instantSearches[name].inputs[f]==='undefined')
						return;
					var el = instantSearches[name].inputs[f];
					el.setValue(v.fill[f]);
					if(el instanceof Element)
						el.setAttribute('title', v.fill[f]);
				}
			}
			var firstField = inputs[0];
			if((typeof v.fill==='undefined' || typeof v.fill[firstField]==='undefined') && instantSearches[name].inputs[firstField]){
				instantSearches[name].inputs[firstField].setValue(v.text);
				if(v.id)
					markInstantSearch(instantSearches[name].inputs[firstField]);
			}
		}

		if(instantSearches[name].hidden) {
			var currentValue = instantSearches[name].hidden.value;
			instantSearches[name].hidden.value = v.id;

			if(trigger_onchange && v.id!=currentValue)
				triggerOnChange(instantSearches[name].hidden);
		}
	});
}

function resetAllInstantSearches(){
	instantSearches = {};
	activeInstantSearch = false;
}

function popupInstantSearch(){
	if(!_('instant-search-value'))
		return false;

	var url = _('instant-search-url').getValue();
	var get = _('instant-search-get').getValue();
	var post = _('instant-search-post').getValue();
	var v = _('instant-search-value').getValue();

	if(v===popupLastSearched)
		return false;

	popupLastSearched = v;

	get += '&text='+encodeURIComponent(v);

	var table = _('instant-search-table');
	while(table.rows.length>1)
		table.deleteRow(-1);

	_('instant-search-cont-loading').loading();

	ajax(url, get, post).then(function(r){
		if(!_('instant-search-cont-loading'))
			return false;

		_('instant-search-cont-loading').innerHTML = '';

		if(!r)
			return false;
		if(typeof r!=='object'){
			alert(r);
			return false;
		}

		if(_('instant-search-value').getValue()!==popupLastSearched)
			return false;

		activeInstantSearch['current'] = -1;

		if(r.length===0){
			_('instant-search-cont-loading').innerHTML = '<span style="color: #999">No results</span>';
		}else {
			var table = _('instant-search-table');

			var firstRow = table.rows[0];

			for (var nr in r) {
				if(!r.hasOwnProperty(nr)) continue;

				var tr = table.insertRow(-1);
				for(var i in firstRow.cells){
					if(!firstRow.cells.hasOwnProperty(i)) continue;

					var td = tr.insertCell(-1);
					td.innerHTML = r[nr].fields[firstRow.cells[i].getAttribute('data-field')];
				}

				tr.addEventListener('click', (function(res){
					return function(){
						setInstantSearchFromPopup(res);
					}
				})(r[nr]));
			}
		}
	});
}

function setInstantSearchFromPopup(res){
	if(typeof res.fill==='undefined')
		res.fill = {};
	if(typeof res.mark==='undefined')
		res.mark = Object.keys(res.fill);
	setInstantSearch(activeInstantSearch.name, activeInstantSearch.field, res);
	zkPopupClose();
}