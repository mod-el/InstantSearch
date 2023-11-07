var instantSearches = {};
var activeInstantSearch = false;
var popupLastSearched = null;
var activeInstantSearchVisualizer = null;

/*
Rules:
	- All the fields with the same data-instant-search attribute belong to the same instant search
	- There MUST be one hidden field set as main, therefore:
		- If only one hidden field is found, that will be the main one
		- If more than one hidden fields are found, the first one without a name will be the main one
		- If all have a name, the first one will be the main one
		- If no hidden field is found, a new one will be created and injected right before the first input of the set
 */

function checkInstantSearches() {
	return new Promise(function (resolve) {
		let instantSearchesCreated = [];
		Array.from(document.querySelectorAll('[data-instant-search]')).forEach(function (el) {
			if (el.getAttribute('data-instant-search-set'))
				return;
			if (el.parentNode.offsetParent === null)
				return;

			let name = el.getAttribute('data-instant-search');
			if (!name)
				return;

			let fieldName = el.getAttribute('data-name');
			if (fieldName) {
				if (!el.name)
					el.name = fieldName;
			} else {
				if (el.name) {
					fieldName = el.name;
				} else if (el.type.toLowerCase() !== 'hidden') {
					fieldName = randomString() + '-' + name;
					el.name = fieldName;
				}
			}

			if (instantSearchesCreated.indexOf(name) === -1)
				instantSearchesCreated.push(name);
			if (typeof instantSearches[name] === 'undefined') {
				instantSearches[name] = {
					'helper': null,
					'table': null,
					'id-field': null,
					'separator': ' ',
					'pattern': null,
					'fields': {},
					'table-fields': {},
					'where': null,
					'joins': null,
					'post': null,
					'post-function': null,
					'hidden': [],
					'inputs': {},
					'values': {},
					'initial-value': null,
					'wrap': null,
					'token': null
				};
			}

			if (el.type.toLowerCase() === 'hidden') {
				if (Array.isArray(instantSearches[name]['hidden']))
					instantSearches[name]['hidden'].push(el);
				else
					instantSearches[name]['hidden'] = [el];
			} else {
				instantSearches[name]['inputs'][fieldName] = el;
			}

			if (el.getAttribute('data-helper'))
				instantSearches[name]['helper'] = el.getAttribute('data-helper');
			if (el.getAttribute('data-instant-search-id')) // Deprecated
				instantSearches[name]['helper'] = el.getAttribute('data-instant-search-id');
			if (el.getAttribute('data-table'))
				instantSearches[name]['table'] = el.getAttribute('data-table');
			if (el.getAttribute('data-id-field'))
				instantSearches[name]['id-field'] = el.getAttribute('data-id-field');
			if (el.getAttribute('data-separator'))
				instantSearches[name]['separator'] = el.getAttribute('data-separator');
			if (el.getAttribute('data-pattern'))
				instantSearches[name]['pattern'] = el.getAttribute('data-pattern');
			if (el.getAttribute('data-where'))
				instantSearches[name]['where'] = el.getAttribute('data-where');
			if (el.getAttribute('data-joins'))
				instantSearches[name]['joins'] = el.getAttribute('data-joins');
			if (el.getAttribute('data-fields'))
				instantSearches[name]['fields'][fieldName] = el.getAttribute('data-fields').split(',');
			if (el.getAttribute('data-table-fields'))
				instantSearches[name]['table-fields'][fieldName] = el.getAttribute('data-table-fields').split(',');
			if (el.getAttribute('data-post'))
				instantSearches[name]['post'] = el.getAttribute('data-post');
			if (el.getAttribute('data-wrap'))
				instantSearches[name]['wrap'] = el.getAttribute('data-wrap');
			if (el.getAttribute('data-token'))
				instantSearches[name]['token'] = el.getAttribute('data-token');
			if (el.getAttribute('data-instant-search-value')) {
				let initialValue = el.getAttribute('data-instant-search-value');
				try {
					let testJson = JSON.parse(initialValue);
					if (testJson && typeof testJson === 'object' && testJson.hasOwnProperty('id') && testJson.hasOwnProperty('text'))
						initialValue = testJson;
				} catch (e) {
				}
				instantSearches[name]['initial-value'] = initialValue;
			}
			if (el.getAttribute('data-post-function'))
				eval('instantSearches[name][\'post-function\'] =  function(){ ' + el.getAttribute('data-post-function') + ' }');

			el.setAttribute('autocomplete', 'off');

			el.addEventListener('keyup', (function (name, fieldName) {
				return function (event) {
					if (event.keyCode === 13)
						return true;

					instantSearch(this, name, fieldName);
				}
			})(name, fieldName));

			el.addEventListener('blur', function () {
				if (this.getAttribute('data-text-before-reset') && this.getValue(true) === this.getAttribute('data-text-before-reset')) {
					resetInstantSearch(this);
				}
				setTimeout(closeInstantSearch, 300);
			});

			if (el.ctxMenu) {
				let visualizerConfig = el.getAttribute('data-visualizer');

				if (visualizerConfig) { // Admin
					let menu = {
						'Ricerca avanzata': () => {
							instantSearchVisualizer(name, fieldName, el);
						}
					};

					try {
						visualizerConfig = JSON.parse(visualizerConfig);
					} catch (e) {
					}

					if (visualizerConfig && visualizerConfig.page) {
						menu['Vai al dettaglio'] = () => {
							let id = instantSearches[name]['hidden'].getValue(true);
							if (id)
								window.open(adminPrefix + visualizerConfig.page + '/edit/' + id);
							else
								alert('Campo non valorizzato');
						};
					}

					el.ctxMenu(menu);
				} else {
					el.ctxMenu({
						'Ricerca avanzata': () => {
							initInstantSearchPopup(name, fieldName, el);
						}
					});
				}
			}

			el.setAttribute('data-instant-search-set', '1');
		});

		instantSearchesCreated.forEach(function (name) {
			if (instantSearches[name]['inputs'].length === 0) {
				delete instantSearches[name];
				return;
			}

			if (instantSearches[name]['hidden'].length === 0) {
				let hidden = document.createElement('input');
				hidden.type = 'hidden';
				hidden.name = name;
				hidden.setAttribute('data-instant-search', name);
				hidden.setAttribute('data-instant-search-set', '1');

				let firstInput = instantSearches[name]['inputs'][Object.keys(instantSearches[name]['inputs'])[0]];
				firstInput = firstInput.parentNode.insertBefore(hidden, firstInput);

				instantSearches[name]['hidden'] = firstInput;
			} else {
				let inputFound = false;
				instantSearches[name]['hidden'].some(function (input) {
					if (!input.name) {
						inputFound = input;
						return true;
					}
					return false;
				});
				if (!inputFound)
					inputFound = instantSearches[name]['hidden'][0];

				instantSearches[name]['hidden'].forEach(function (input) {
					if (input !== inputFound && input.name)
						instantSearches[name]['inputs'][input.name] = input;
				});

				if (!inputFound.name)
					inputFound.name = name;
				instantSearches[name]['hidden'] = inputFound;
			}

			if (!instantSearches[name]['hidden'].hasAttribute('name'))
				instantSearches[name]['hidden'].name = name;

			instantSearches[name]['hidden'].setAttribute('data-setvalue-function', 'setInstantSearchValue');

			if (instantSearches[name]['initial-value'] !== null) {
				instantSearches[name]['hidden'].setValue(instantSearches[name]['initial-value'], false);
				instantSearches[name]['initial-value'] = null;
			}
		});

		resolve();
	});
}

function randomString() {
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let charactersLength = characters.length;
	let arr = [];
	for (c = 1; c <= 10; c++) {
		arr.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
	}
	return arr.join('');
}

window.addEventListener('DOMContentLoaded', function () {
	onHtmlChange(checkInstantSearches);
});

function instantSearch(field, name, fieldName) {
	if (typeof instantSearches[name] === 'undefined') // Checks if the instant search actually exists
		return false;

	if (typeof instantSearches[name].values[fieldName] === 'undefined')
		instantSearches[name].values[fieldName] = '';

	if (instantSearches[name].values[fieldName] === field.value) // If the last searched thing is the same as the current one, I skip this search
		return false;

	instantSearches[name].values[fieldName] = field.value; // Remember this as the last searched thing

	let minLength = 1;
	if (field.getAttribute('data-min-length'))
		minLength = parseInt(field.getAttribute('data-min-length'));

	if (field.value.length < minLength) // Checks if the minimum length of the input is reached
		return false;

	// There can only be one active instant search at a time
	if (activeInstantSearch)
		closeInstantSearch();

	activeInstantSearch = {
		'name': name,
		'field': field,
		'fieldName': fieldName,
		'current': -1,
		'popup': false
	}

	let is;
	if (_('model-instant-search')) {
		is = _('model-instant-search');
	} else {
		is = document.createElement('div');
		is.id = 'model-instant-search';
		is.className = 'model-instant-search';
		is.onmousedown = function (e) {
			e.stopPropagation();
		};

		is = document.body.appendChild(is);
	}

	let width = field.offsetWidth - 12, offsetX = 0, offsetY = 2, highlight = '#FFDD9C';
	if (field.getAttribute('data-width'))
		width = parseInt(field.getAttribute('data-width'));
	if (field.getAttribute('data-offset-x'))
		offsetX = parseInt(field.getAttribute('data-offset-x'));
	if (field.getAttribute('data-offset-y'))
		offsetY = parseInt(field.getAttribute('data-offset-y'));
	if (field.getAttribute('data-highlight'))
		highlight = parseInt(field.getAttribute('data-highlight'));

	is.setAttribute('data-width', width);
	is.setAttribute('data-offset-x', offsetX);
	is.setAttribute('data-offset-y', offsetY);
	is.setAttribute('data-highlight', highlight);

	is.innerHTML = '<img src="' + PATHBASE + 'model/Output/files/loading.gif" alt="" />';

	checkInstantSearchPosition();

	let url = PATH + 'instant-search';
	if (instantSearches[name].helper)
		url += '/' + instantSearches[name].helper;

	let get = [
		'text=' + encodeURIComponent(field.value)
	];

	if (instantSearches[name].table)
		get.push('table=' + encodeURIComponent(instantSearches[name].table));
	if (instantSearches[name]['id-field'])
		get.push('id-field=' + encodeURIComponent(instantSearches[name]['id-field']));
	if (instantSearches[name]['separator'])
		get.push('separator=' + encodeURIComponent(instantSearches[name]['separator']));
	if (instantSearches[name].pattern)
		get.push('pattern=' + encodeURIComponent(instantSearches[name].pattern));
	if (instantSearches[name].where)
		get.push('where=' + encodeURIComponent(instantSearches[name].where));
	if (instantSearches[name].joins)
		get.push('joins=' + encodeURIComponent(instantSearches[name].joins));
	if (instantSearches[name].wrap)
		get.push('wrap=' + encodeURIComponent(instantSearches[name].wrap));
	if (instantSearches[name].token)
		get.push('token=' + encodeURIComponent(instantSearches[name].token));
	if (instantSearches[name]['fields'][fieldName])
		get.push('fields=' + encodeURIComponent(instantSearches[name]['fields'][fieldName].join(',')));
	if (instantSearches[name]['fields'] && Object.keys(instantSearches[name]['fields']).length > 1)
		get.push('fill=' + encodeURIComponent(JSON.stringify(instantSearches[name]['fields'])));

	get = get.join('&');

	let post = '';
	if (instantSearches[name]['post'])
		post = instantSearches[name]['post'];
	else if (instantSearches[name]['post-function'])
		post = instantSearches[name]['post-function'].call(field);

	ajax(url, get, post).then((function (is, field, name, fieldName, searchedValue) {
		return function (r) {
			if (!r || !is)
				return false;
			if (typeof r !== 'object') {
				alert(r);
				return false;
			}

			if (instantSearches[name].values[fieldName] !== searchedValue)
				return false;

			activeInstantSearch['current'] = -1;

			if (r.length === 0) {
				is.innerHTML = '<div style="color: #999">No results</div>';
			} else {
				is.innerHTML = '';
				is.style.width = 'auto';
				let maxWidth = 0;

				for (let nr in r) {
					let res = r[nr];
					let res_el = document.createElement('div');
					res_el.id = 'is-' + nr;
					res_el.innerHTML = res.text;
					res_el.setAttribute('data-n', nr);
					if (typeof res.onclick === 'undefined')
						res_el.onclick = false;
					if (typeof res.fill === 'undefined')
						res.fill = {};
					if (typeof res.mark === 'undefined')
						res.mark = Object.keys(res.fill);
					is.appendChild(res_el);

					if (res_el.offsetWidth > maxWidth)
						maxWidth = res_el.offsetWidth;

					res_el.go = (function (res, name, field) {
						return function () {
							if (res.onclick) {
								let onclick = function () {
									eval(res.onclick);
								};

								let fieldToPass = instantSearches[name].hidden || field;
								if (onclick.call(fieldToPass) === false)
									return false;
							}

							setInstantSearch(name, field, res);
							simulateTab(field, true);
							closeInstantSearch();
						}
					})(res, name, field);

					res_el.addEventListener('click', function () {
						this.go();
					});

					res_el.onmouseover = function () {
						selectInstantSearch(this.getAttribute('data-n'));
					}
				}

				is.setAttribute('data-content-width', maxWidth);
				checkInstantSearchPosition();

				selectInstantSearch(0);
			}

			let visualizerConfig = field.getAttribute('data-visualizer');
			if (visualizerConfig) { // Admin
				try {
					visualizerConfig = JSON.parse(visualizerConfig);
				} catch (e) {
				}

				if (visualizerConfig && visualizerConfig.page) {
					let new_el = document.createElement('div');
					new_el.innerHTML = 'Crea "' + field.value + '"';
					new_el.className = 'selectable';
					new_el.addEventListener('click', () => {
						makeDynamicOption(field.modelField.name, visualizerConfig.page, 'main', {init_string: field.value});
					});
					is.appendChild(new_el);
				}
			}
		}
	})(is, field, name, fieldName, field.value));
}

function selectInstantSearch(n) {
	let is = _('model-instant-search');
	if (!is || !activeInstantSearch)
		return;

	let current = activeInstantSearch['current'];

	if (n === '-') {
		if (current === 0)
			return false;
		n = current - 1;
	} else if (n === '+') {
		if (!_('is-' + (current + 1)))
			return false;
		n = current + 1;
	} else if (isNaN(n)) {
		return false;
	}

	let el = _('is-' + n);
	if (!el)
		return false;

	let offsetFromTop = 0;
	for (let child of is.childNodes) {
		if (child == el)
			break;
		offsetFromTop += child.offsetHeight;
	}

	elH = el.offsetHeight;
	if (offsetFromTop < is.scrollTop)
		is.scrollTop = offsetFromTop;
	if (offsetFromTop + elH > is.scrollTop + is.offsetHeight)
		is.scrollTop = offsetFromTop - is.offsetHeight + elH + 10;

	if (_('is-' + current))
		_('is-' + current).style.backgroundColor = '';

	el.style.backgroundColor = is.getAttribute('data-highlight');

	activeInstantSearch['current'] = n;
}

function closeInstantSearch() {
	let is = _('model-instant-search');
	if (is)
		is.parentNode.removeChild(is);

	if (activeInstantSearch && !activeInstantSearch.popup)
		activeInstantSearch = false;
}

function checkInstantSearchPosition() {
	let is = _('model-instant-search');
	if (!is || !activeInstantSearch)
		return;

	let offsetX = parseInt(is.getAttribute('data-offset-x'));
	let offsetY = parseInt(is.getAttribute('data-offset-y'));

	let fieldBox = activeInstantSearch.field.getBoundingClientRect();
	is.style.left = (fieldBox.left + offsetX) + 'px';

	let verticalPositioning;
	if (fieldBox.bottom + offsetY > window.innerHeight - 250) { // Troppo in basso nello schermo, la posiziono in alto rispetto al campo
		is.style.bottom = ((window.innerHeight - fieldBox.top) + offsetY) + 'px';
		verticalPositioning = 'top';
		delete is.style.top;
	} else {
		is.style.top = (fieldBox.bottom + offsetY) + 'px';
		verticalPositioning = 'bottom';
		delete is.style.bottom;
	}

	let width = Math.max(parseInt(is.getAttribute('data-width')), parseInt(is.getAttribute('data-content-width') ? is.getAttribute('data-content-width') : 0));
	if (fieldBox.left + offsetX + width > window.innerWidth - 5)
		width = window.innerWidth - 5 - (fieldBox.left + offsetX);
	is.style.width = width + 'px';

	let height;
	if (verticalPositioning === 'bottom')
		height = window.innerHeight - (fieldBox.bottom + offsetY) - 20;
	else
		height = fieldBox.top - offsetY - 20;

	if (height < 50)
		height = 50;
	is.style.maxHeight = height + 'px';
}

window.addEventListener('scroll', function () {
	checkInstantSearchPosition();
});

window.addEventListener('resize', function () {
	checkInstantSearchPosition();
});

window.addEventListener('keydown', function (event) {
	if (!activeInstantSearch)
		return true;

	switch (event.keyCode) {
		case 13:
			event.stopImmediatePropagation();
			event.preventDefault();

			let el = _('is-' + activeInstantSearch['current']);
			if (el) {
				el.go();
				return false;
			}
			break;
		case 27:
			event.preventDefault();
			event.stopImmediatePropagation();
			closeInstantSearch();
			return false;

		case 38:
			selectInstantSearch('-');
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;

		case 40:
			selectInstantSearch('+');
			event.preventDefault();
			event.stopImmediatePropagation();
			return false;
	}
});

function setInstantSearch(name, field, res) {
	if (typeof instantSearches[name] === 'undefined')
		return false;

	let promises = [];

	let hidden = instantSearches[name].hidden;
	if (hidden)
		promises.push(hidden.setValue(res.id, true, false));

	let fieldName = field.getAttribute('data-name');
	if (!fieldName && field.name)
		fieldName = field.name;
	if (!fieldName)
		fieldName = name;

	if (typeof res.fill[fieldName] === 'undefined') {
		if (typeof res.plainText !== 'undefined')
			res.fill[fieldName] = res.plainText;
		else
			res.fill[fieldName] = res.text;
	}
	if (!in_array(fieldName, res.mark))
		res.mark.push(fieldName);

	for (let f in res.fill) {
		if (!res.fill.hasOwnProperty(f))
			return;
		let fieldToFill = null;
		if (typeof instantSearches[name].inputs[f] !== 'undefined')
			fieldToFill = instantSearches[name].inputs[f];
		else if (hidden && typeof hidden.form !== 'undefined' && typeof hidden.form[f] !== 'undefined')
			fieldToFill = hidden.form[f];
		if (fieldToFill)
			promises.push(fieldToFill.setValue(res.fill[f]));
	}

	res.mark.forEach(function (f) {
		if (typeof instantSearches[name].inputs[f] === 'undefined')
			return;
		markInstantSearch(instantSearches[name].inputs[f]);
	});

	return Promise.all(promises);
}

function markInstantSearch(field) {
	field.readOnly = true;
	field.setAttribute('onclick', 'unmarkInstantSearch(this)');
	field.addClass('model-instant-search-marked');
}

function unmarkInstantSearch(field) {
	let name = field.getAttribute('data-instant-search');
	if (typeof instantSearches[name] === 'undefined')
		return false;

	Array.from(document.querySelectorAll('.model-instant-search-marked[data-instant-search="' + name + '"]')).forEach(function (f) {
		f.removeClass('model-instant-search-marked');
		f.readOnly = false;
		f.onclick = function () {
			return true
		};
	});

	field.setAttribute('data-text-before-reset', field.getValue(true));

	field.focus();
	field.select();

	if (instantSearches[name].hidden) {
		field.setAttribute('data-id-before-reset', instantSearches[name].hidden.getValue(true));
		instantSearches[name].hidden.setValue('', true, false);
	}
}

function resetInstantSearch(field) {
	let name = field.getAttribute('data-instant-search');
	if (typeof instantSearches[name] === 'undefined')
		return false;

	if (instantSearches[name].hidden)
		instantSearches[name].hidden.setValue(field.getAttribute('data-id-before-reset'));

	field.removeAttribute('data-text-before-reset');
	field.removeAttribute('data-id-before-reset');

	markInstantSearch(field);
}

function setInstantSearchValue(v) {
	let name = this.getAttribute('data-instant-search');
	if (typeof instantSearches[name] === 'undefined')
		return false;

	return new Promise((function (field) {
		return function (resolve) {
			if (typeof v !== 'object') {
				if (instantSearches[name].hidden)
					instantSearches[name].hidden.value = v;

				let url = PATH + 'instant-search';
				if (instantSearches[name].helper)
					url += '/' + instantSearches[name].helper;

				let get = [
					'v=' + (v ? encodeURIComponent(v) : '')
				];

				if (instantSearches[name].table)
					get.push('table=' + encodeURIComponent(instantSearches[name].table));
				if (instantSearches[name]['id-field'])
					get.push('id-field=' + encodeURIComponent(instantSearches[name]['id-field']));
				if (instantSearches[name]['separator'])
					get.push('separator=' + encodeURIComponent(instantSearches[name]['separator']));
				if (instantSearches[name].pattern)
					get.push('pattern=' + encodeURIComponent(instantSearches[name].pattern));
				if (instantSearches[name].where)
					get.push('where=' + encodeURIComponent(instantSearches[name].where));
				if (instantSearches[name].joins)
					get.push('joins=' + encodeURIComponent(instantSearches[name].joins));
				if (instantSearches[name].wrap)
					get.push('wrap=' + encodeURIComponent(instantSearches[name].wrap));
				if (instantSearches[name].token)
					get.push('token=' + encodeURIComponent(instantSearches[name].token));

				let inputs = Object.keys(instantSearches[name]['fields']);
				if (inputs.length > 1) {
					get.push('fill=' + encodeURIComponent(JSON.stringify(instantSearches[name]['fields'])));
				} else if (inputs.length > 0) {
					let firstField = inputs[0];
					if (instantSearches[name]['fields'][firstField])
						get.push('fields=' + encodeURIComponent(instantSearches[name]['fields'][firstField].join(',')));
				}

				get = get.join('&');

				let post = '';
				if (instantSearches[name]['post'])
					post = instantSearches[name]['post'];
				else if (instantSearches[name]['post-function'])
					post = instantSearches[name]['post-function'].call(field);

				ajax(url, get, post).then(resolve);
			} else {
				resolve(v);
			}
		};
	})(this)).then(function (v) {
		let inputs = Object.keys(instantSearches[name].inputs);
		if (inputs.length > 0) {
			if (typeof v.fill !== 'undefined' && Object.keys(v.fill).length > 0) {
				for (let f in v.fill) {
					if (!v.fill.hasOwnProperty(f))
						continue;
					if (typeof instantSearches[name].inputs[f] !== 'undefined') {
						let el = instantSearches[name].inputs[f];
						el.setValue(v.fill[f]);
						if (el instanceof Element)
							el.setAttribute('title', v.fill[f]);
					} else if (instantSearches[name].hidden && typeof instantSearches[name].hidden.form !== 'undefined' && typeof instantSearches[name].hidden.form[f] !== 'undefined') {
						instantSearches[name].hidden.form[f].setValue(v.fill[f]);
					}
				}
			}
			let firstField = inputs[0];
			if ((typeof v.fill === 'undefined' || typeof v.fill[firstField] === 'undefined') && instantSearches[name].inputs[firstField]) {
				let text = v.plainText || v.text;
				instantSearches[name].inputs[firstField].setValue(text);
				instantSearches[name].inputs[firstField].setAttribute('title', text);

				if (v.id)
					markInstantSearch(instantSearches[name].inputs[firstField]);
			}
		}

		if (instantSearches[name].hidden)
			instantSearches[name].hidden.value = v.id;
	});
}

function resetAllInstantSearches() {
	instantSearches = {};
	activeInstantSearch = false;
	Array.from(document.querySelectorAll('[data-instant-search-set]')).forEach(function (el) {
		el.removeAttribute('data-instant-search-set');
		if (el.type.toLowerCase() === 'hidden' && el.getAttribute('name'))
			el.removeAttribute('name');
	});
	checkInstantSearches();
}

function initInstantSearchPopup(name, fieldName, field) {
	if (typeof instantSearches[name] === 'undefined')
		return;

	if (typeof field === 'undefined' && Object.keys(instantSearches[name].inputs).length > 0)
		field = instantSearches[name].inputs[Object.keys(instantSearches[name].inputs)[0]];

	let url = PATH + 'instant-search';
	if (instantSearches[name].helper)
		url += '/' + instantSearches[name].helper;

	let get = [
		'popup=1'
	];

	if (instantSearches[name].table)
		get.push('table=' + encodeURIComponent(instantSearches[name].table));
	if (instantSearches[name].pattern)
		get.push('pattern=' + encodeURIComponent(instantSearches[name].pattern));
	if (instantSearches[name].where)
		get.push('where=' + encodeURIComponent(instantSearches[name].where));
	if (instantSearches[name].joins)
		get.push('joins=' + encodeURIComponent(instantSearches[name].joins));
	if (instantSearches[name].wrap)
		get.push('wrap=' + encodeURIComponent(instantSearches[name].wrap));
	if (instantSearches[name].token)
		get.push('token=' + encodeURIComponent(instantSearches[name].token));
	if (typeof fieldName !== 'undefined' && instantSearches[name]['fields'][fieldName])
		get.push('fields=' + encodeURIComponent(instantSearches[name]['fields'][fieldName].join(',')));
	if (typeof fieldName !== 'undefined' && instantSearches[name]['table-fields'][fieldName])
		get.push('table-fields=' + encodeURIComponent(instantSearches[name]['table-fields'][fieldName].join(',')));
	if (instantSearches[name]['fields'] && Object.keys(instantSearches[name]['fields']).length > 1)
		get.push('fill=' + encodeURIComponent(JSON.stringify(instantSearches[name]['fields'])));

	get = get.join('&');

	let post = '';
	if (instantSearches[name]['post'])
		post = instantSearches[name]['post'];
	else if (instantSearches[name]['post-function'])
		post = instantSearches[name]['post-function'].call(field);

	if (typeof fieldName === 'undefined' && Object.keys(instantSearches[name].inputs).length > 0)
		fieldName = Object.keys(instantSearches[name].inputs)[0];

	activeInstantSearch = {
		'name': name,
		'field': field,
		'fieldName': fieldName,
		'current': -1,
		'popup': true
	};

	popupLastSearched = null;

	zkPopup({'url': url, 'get': get, 'post': post}, {'onLoad': instantSearchPopup});
}

async function instantSearchVisualizer(name, fieldName, field) {
	if (typeof instantSearches[name] === 'undefined')
		return;

	if (typeof field === 'undefined' && Object.keys(instantSearches[name].inputs).length > 0)
		field = instantSearches[name].inputs[Object.keys(instantSearches[name].inputs)[0]];

	let visualizerConfig = field.getAttribute('data-visualizer');
	try {
		if (visualizerConfig)
			visualizerConfig = JSON.parse(visualizerConfig);
	} catch (e) {
	}

	if (!visualizerConfig || typeof visualizerConfig !== 'object')
		return;

	if (!visualizerConfig.page || !visualizerConfig.visualizer)
		return;

	popupLastSearched = null;

	let popupOptions = {
		onClose: () => {
			activeInstantSearchVisualizer = null;
		}
	};

	if (visualizerConfig.top)
		popupOptions.top = visualizerConfig.top;
	if (visualizerConfig.left)
		popupOptions.left = visualizerConfig.left;

	return zkPopup(`<div class="instant-search-input-box"><input type="text" id="instant-search-value" onkeyup="searchInstantSearchVisualizer()"/></div>
<div id="instant-search-${name}-cont"></div>`, popupOptions).then(() => {
		return adminApiRequest('page/' + visualizerConfig.page);
	}).then(pageDetails => {
		let cont = _('instant-search-' + name + '-cont');

		if (visualizerConfig.options)
			pageDetails['visualizer-options'] = {...pageDetails['visualizer-options'], ...visualizerConfig.options};

		pageDetails.toPick = id => {
			instantSearches[name].hidden.setValue(id);
			zkPopupClose();
		};

		if (visualizerConfig.fields)
			pageDetails['default-fields'] = visualizerConfig.fields;
		else if (visualizerConfig.visualizer === 'Table')
			pageDetails['default-fields'] = instantSearches[name]['fields'][fieldName];

		return loadVisualizer(visualizerConfig.visualizer, 'instant-search-' + name, cont, false, pageDetails);
	}).then(visualizer => {
		activeInstantSearchVisualizer = {name: name, fieldName: fieldName, visualizer: visualizer, config: visualizerConfig};
		return searchInstantSearchVisualizer();
	});
}

async function searchInstantSearchVisualizer() {
	if (!activeInstantSearchVisualizer)
		return;

	let query = await _('instant-search-value').getValue();

	if (query === popupLastSearched)
		return false;

	popupLastSearched = query;

	let fields = activeInstantSearchVisualizer.visualizer.options['default-fields'];

	activeInstantSearchVisualizer.visualizer.container.loading();

	return adminApiRequest('page/' + activeInstantSearchVisualizer.config.page + '/search', {
		"fields": fields,
		"filters": await activeInstantSearchVisualizer.visualizer.getSpecialFilters(),
		"per-page": 100,
		"search": query,
		"search-fields": fields
	}, {method: 'POST'}).then(async response => {
		let currentQuery = await _('instant-search-value').getValue();
		if (currentQuery !== popupLastSearched)
			return;

		activeInstantSearchVisualizer.visualizer.container.innerHTML = '';
		return activeInstantSearchVisualizer.visualizer.render(response.list);
	});
}

function instantSearchPopup() {
	if (!_('instant-search-value'))
		return false;

	let url = _('instant-search-url').getValue(true);
	let get = _('instant-search-get').getValue(true);
	let post = _('instant-search-post').getValue(true);
	let v = _('instant-search-value').getValue(true);

	if (v === popupLastSearched)
		return false;

	popupLastSearched = v;

	get += '&text=' + encodeURIComponent(v);

	let table = _('instant-search-table');
	while (table.rows.length > 1)
		table.deleteRow(-1);

	_('instant-search-cont-loading').loading();

	ajax(url, get, post).then(function (r) {
		if (!_('instant-search-cont-loading'))
			return false;

		_('instant-search-cont-loading').innerHTML = '';

		if (!r)
			return false;
		if (typeof r !== 'object') {
			alert(r);
			return false;
		}

		if (_('instant-search-value').getValue(true) !== popupLastSearched)
			return false;

		activeInstantSearch['current'] = -1;

		if (r.length === 0) {
			_('instant-search-cont-loading').innerHTML = '<span style="color: #999">No results</span>';
		} else {
			let table = _('instant-search-table');

			let firstRow = table.rows[0];

			for (let row of r) {
				let tr = table.insertRow(-1);
				for (let cell in firstRow.cells) {
					let td = tr.insertCell(-1);
					let k = cell.getAttribute('data-field');
					let text = '';
					if (k === 'instant-search-main')
						text = row.text;
					else if (typeof row.fields[k] !== 'undefined')
						text = row.fields[k];
					td.innerHTML = text;
				}

				tr.addEventListener('click', (function (res) {
					return function () {
						setInstantSearchFromPopup(res);
					}
				})(row));
			}
		}
	});
}

function setInstantSearchFromPopup(res) {
	if (typeof res.fill === 'undefined')
		res.fill = {};
	if (typeof res.mark === 'undefined')
		res.mark = Object.keys(res.fill);
	setInstantSearch(activeInstantSearch.name, activeInstantSearch.field, res);
	zkPopupClose();
}

function getInstantSearchInputs(name) {
	if (typeof instantSearches[name] === 'undefined')
		return null;

	let inputs = Object.keys(instantSearches[name].inputs);
	return instantSearches[name].inputs[inputs[0]];
}

class FieldInstantSearch extends Field {
	constructor(name, options = {}) {
		super(name, options);
	}

	async getValue() {
		let v = await super.getValue();
		if (v === null)
			return null;

		if (typeof v === 'object' && v.hasOwnProperty('id'))
			v = v.id;
		if (v === '')
			v = null;
		return v;
	}

	async setValue(v, trigger = true) {
		this.value = v;

		let node = await this.getNode();
		if (this.options.multilang) {
			for (let lang of this.options.multilang) {
				if (node.hasOwnProperty(lang) && v.hasOwnProperty(lang)) {
					if (document.body.contains(node)) {
						if (v[lang] !== null && typeof v[lang] === 'object') {
							await node[lang].querySelector('input[type="hidden"]').setValue(v[lang].id, trigger);
							await node[lang].querySelector('input[type="text"]').setValue(v[lang].text, trigger);
						} else {
							await node[lang].querySelector('input[type="hidden"]').setValue(v[lang], trigger);
						}
					} else {
						node.querySelector('input[type="hidden"]').setAttribute('data-instant-search-value', v[lang] === null ? '' : (typeof v[lang] === 'object' ? JSON.stringify(v[lang]) : v[lang]));
					}
				}
			}
		} else {
			if (document.body.contains(node)) {
				if (v !== null && typeof v === 'object') {
					await node.querySelector('input[type="hidden"]').setValue(v.id, trigger);
					await node.querySelector('input[type="text"]').setValue(v.text, trigger);
				} else {
					await node.querySelector('input[type="hidden"]').setValue(v, trigger);
				}
			} else {
				node.querySelector('input[type="hidden"]').setAttribute('data-instant-search-value', v === null ? '' : (typeof v === 'object' ? JSON.stringify(v) : v));
			}
		}

		if (trigger)
			this.emit('change');
	}

	getSingleNode(lang = null) {
		let attributes = this.options['attributes'] || {};
		let hiddenAttributes = {};
		let textAttributes = {};

		attributes['data-instant-search'] = this.name;
		if (this.form)
			attributes['data-instant-search'] += '-' + this.form.name;

		let depending_selects = null;
		if (attributes['data-depending-parent']) {
			depending_selects = attributes['data-depending-parent'];
			delete attributes['data-depending-parent'];
		}

		for (let attr of Object.keys(attributes)) {
			if ([
				'name',
				'class',
				'style',
				'placeholder',
				'onkeyup',
				'onkeydown',
				'onkeypress',
				'data-helper',
				'data-instant-search-id', // Deprecated
				'data-table',
				'data-pattern',
				'data-id-field',
				'data-separator',
				'data-fields',
				'data-table-fields',
				'data-where',
				'data-joins',
				'data-post',
				'data-post-function',
			].includes(attr)) {
				textAttributes[attr] = attributes[attr];
			} else if ([
				'onchange',
			].includes(attr)) {
				hiddenAttributes[attr] = attributes[attr];
			} else {
				textAttributes[attr] = attributes[attr];
				hiddenAttributes[attr] = attributes[attr];
			}
		}

		let div = document.createElement('div');
		if (depending_selects) {
			div.setAttribute('data-depending-parent', depending_selects);
			this.addEventListener('change', this.reloadDependingSelects);
		}

		let text = document.createElement('input');
		text.type = 'text';

		super.assignAttributes(text, textAttributes, false);
		super.assignEvents(text, textAttributes, lang, ['keyup', 'keydown', 'click']);

		let hidden = document.createElement('input');
		hidden.type = 'hidden';

		super.assignAttributes(hidden, hiddenAttributes);
		super.assignEvents(hidden, hiddenAttributes, lang, ['change', 'input']);

		div.appendChild(hidden);
		div.appendChild(text);

		return div;
	}
}

if (formSignatures)
	formSignatures.set('instant-search', FieldInstantSearch);
