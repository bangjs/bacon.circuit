if (typeof exports === 'object')
	Bacon = require('baconjs');

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
		for (var key in fieldsObj) {
			if (!fieldsObj.hasOwnProperty(key)) continue;
			fields[key] = fieldsObj[key];
		}
	});
	
	var context = {};
	
	for (var key in fields) {
		if (!fields.hasOwnProperty(key)) continue;
		if (fields[key] instanceof Bacon.Field)
			// TODO: Making this an actual getter-setter is a bit pointless
			// for this scenario, but ah well doesn't really hurt either.
			setObjectProp(context, key, fields[key].observable());
	}
	
	for (var key in fields) {
		if (!fields.hasOwnProperty(key)) continue;
		if (fields[key] instanceof Bacon.Field)
			fields[key].start(context, key, circuit);
	}
	
	for (var key in fields) {
		if (!fields.hasOwnProperty(key)) continue;
		if (fields[key] instanceof Bacon.Field)
			fields[key].observable().subscribe(function (event) {
				circuit.onEvent(key, fields[key].observable(), event);
			});
	}
}

Circuit.prototype.set = function (key, value) {
	setObjectProp(this.face, key, value);
	return this;
};
Circuit.prototype.watch = function (key, cb) {
	var leaf = findLeaf(this.face, key);
	var desc = Object.getOwnPropertyDescriptor(leaf.object, leaf.key);
	// TODO: This assumes that we have already defined a property.
	desc.set.listeners.push(cb);
	return this;
};
Circuit.prototype.onEvent = function () {};
Circuit.prototype.promiseConstructor = undefined;

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
;!function () { 'use strict';

function Field(setup, Type) {
	var bus = new Bacon.Bus();
	
	var observable = bus.toProperty();
	if (Type === Bacon.EventStream) 
		observable = observable.toEventStream();
	
	this.observable = function () {
		return observable;
	};
	
	this.start = function (context, name, circuit) {
		var result = setup.call(context, name, circuit);
		
		if (result instanceof Bacon.Bus)
			result = result.toProperty();
		if (result instanceof Bacon.Property)
			result = result.toEventStream();
		if (result instanceof Bacon.EventStream)
			bus.plug(result);
		
		delete this.start;
		
		return this;
	};
}

Field.stream = function (setup) {
	return new Field(setup, Bacon.EventStream);
};

Field.property = function (setup) {
	return new Field(setup, Bacon.Property);
};

Field.stream.expose = Field.property.expose = function (setup) {
	var field = this(function (name, circuit) {
		var context = this;
		circuit.set(name, field.observable());
		return setup.apply(context, arguments);
	});
	return field;
};

Field.stream.function = function (flatMapLatest) {
	flatMapLatest = flatMapLatest || function () {};
	return this(function (name, circuit) {
		var context = this;
		return Bacon.fromBinder(function (sink) {
			circuit.set(name, function () {
				var stream = Bacon.once(arguments).flatMapLatest(function (args) {
					return flatMapLatest.apply(context, args);
				});
				sink(new Bacon.Next(stream));
				if (circuit.promiseConstructor)
					return stream.firstToPromise(circuit.promiseConstructor);
			});
			return function () {};
		}).flatMapLatest(function (stream) {
			return stream;
		});
	});
};

Field.property.digest = function (setup) {
	return this(function (name, circuit) {
		var context = this;
		return setup.apply(context, arguments).doAction(function (value) {
			circuit.set(name, value);
		});
	});
};

Field.property.watch = function (merge) {
	merge = merge || function () {
		return Bacon.never();
	};
	return this.digest(function (name, circuit) {
		var context = this;
		return Bacon.mergeAll(
			merge.call(context),
			Bacon.fromBinder(function (sink) {
				circuit.watch(name, function (value) {
					sink(new Bacon.Next(value));
				});
				return function () {};
			})
		).skipDuplicates();
	});
};

Bacon.Field = Field;

}();