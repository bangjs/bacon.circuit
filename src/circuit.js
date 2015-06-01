;!function () { 'use strict';

function Circuit(face) {
	// Calling without arguments can be done if we want to skip initialization
	// during inheritance.
	if (arguments.length === 0) return;
	
	var circuit = this;
	
	circuit.face = face;
	
	var fieldsObjs = [].slice.call(arguments, 1),
		fields = {};
	
	flattenArray(fieldsObjs).map(function (fieldsObj) {
		return unnestKeys(fieldsObj);
	}).forEach(function (fieldsObj) {
		Object.keys(fieldsObj).forEach(function (key) {
			if (fieldsObj[key] instanceof Bacon.Field)
				fields[key] = fieldsObj[key];
		});
	});
	
	var keys = Object.keys(fields);

	var context = {};
	
	keys.forEach(function (key) {
		// TODO: Making this an actual getter-setter is a bit pointless for
		// this scenario, but ah well doesn't really hurt either.
		setObjectProp(context, key, fields[key].observable());
	});
	
	keys.forEach(function (key) {
		fields[key].start(context, key, circuit);
	});
	
	keys.forEach(function (key) {
		fields[key].observable().subscribe(function (event) {
			circuit.onEvent(key, fields[key].observable(), event);
		});
	});
}

Circuit.prototype.set = function (key, value) {
	setObjectProp(this.face, key, value);
	return this;
};
Circuit.prototype.watch = function (key, cb) {
	setObjectProp(this.face, key);
	var leaf = findLeaf(this.face, key);
	var desc = Object.getOwnPropertyDescriptor(leaf.object, leaf.key);
	desc.set.listeners.push(cb);
	return this;
};
Circuit.prototype.onEvent = function () {};
Circuit.prototype.promiseConstructor = typeof Promise === 'function' && Promise;

function findLeaf(obj, path, create) {
	var keys = path.split('.');
	
	for (var i = 0; i < keys.length - 1; i++) {
		var key = keys[i];
		
		// TODO: Does this cover all scenarios in which we want to fail at
		// finding a leaf?
		if (!obj)
			return;
		
		if (create === true && !obj.hasOwnProperty(key))
			obj[key] = {};
		
		obj = obj[key];
	}
	return {
		object: obj,
		key: keys[i]
	};
}

function setObjectProp(obj, path, value) {
	var leaf = findLeaf(obj, path, true);
	
	if (!Object.getOwnPropertyDescriptor(leaf.object, leaf.key)) {
		
		var setter = function (v) {
			value = v;
			setter.listeners.forEach(function (listener) {
				listener(value);
			});
		};
		setter.listeners = [];
		
		Object.defineProperty(leaf.object, leaf.key, {
			configurable: true,
			enumberable: true,
			get: function () {
				return value;
			},
			set: setter
		});
		
	}
	
	if (arguments.length > 2)
		leaf.object[leaf.key] = value;
}

function unnestKeys(obj, path) {
	path = path || [];
	
	var flat = {};
	for (var key in obj) {
		if (!obj.hasOwnProperty(key)) continue;
		
		var keyPath = path.slice();
		keyPath.push(key);
		
		if (obj[key] instanceof Bacon.Field) {
			flat[keyPath.join('.')] = obj[key];
			continue;
		}
		
		var nestedObj = unnestKeys(obj[key], keyPath);
		for (var nestedKey in nestedObj) {
			if (!nestedObj.hasOwnProperty(nestedKey)) continue;
			flat[nestedKey] = nestedObj[nestedKey];
		}
	}
	return flat;
}

function flattenArray(array) {
	var flat = [];
	array.forEach(function (item) {
		if (Array.isArray(item))
			flat.push.apply(flat, flattenArray(item));
		else
			flat.push(item);
	});
	return flat;
}

Bacon.Circuit = Circuit;

}();