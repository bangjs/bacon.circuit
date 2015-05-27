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