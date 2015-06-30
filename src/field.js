function Field(setup, Type) {
	
	var observable = Bacon.fromBinder(function (sink) {
		function asyncSink(value) {
			setTimeout(function () {
				sink(value);
			});
		}
		
		this.start = function (context, name, circuit) {
			var result = setup.call(context, asyncSink, this.observable(), name, circuit);
			
			if (result instanceof Bacon.Bus)
				result = result.toProperty();
			if (result instanceof Bacon.Property)
				result = result.toEventStream();
			if (result instanceof Bacon.EventStream)
				result.subscribe(asyncSink);
			
			delete this.start;
			return this;
		};
		
		return function () {};
		
	}.bind(this));
	
	var doAction = function () {};
	this.doAction = function (fn) {
		doAction = fn;
	};
	
	observable = observable.doAction(function () {
		doAction.apply(this, arguments);
	});
	
	if (Type !== Bacon.EventStream)
		observable = observable.toProperty();
	
	this.observable = function () {
		return observable;
	};

}

Field.stream = function (setup) {
	return new Field(setup, Bacon.EventStream);
};

Field.property = function (setup) {
	return new Field(setup, Bacon.Property);
};

Field.stream.expose = Field.property.expose = function (setup) {
	return this(function (sink, me, name, circuit) {
		circuit.set(name, me);
		return setup.apply(this, arguments);
	});
};

Field.stream.method = function (flatMapLatest) {
	flatMapLatest = flatMapLatest || function () {
		return arguments;
	};
	return this(function (sink, me, name, circuit) {
		var context = this;
		return Bacon.fromBinder(function (latest) {
			circuit.set(name, function () {
				var stream = Bacon.once(arguments).flatMapLatest(function (args) {
					return flatMapLatest.apply(context, args);
				});
				
				if (!circuit.promiseConstructor) {
					latest(new Bacon.Next(stream));
					return;
				}
				
				return new circuit.promiseConstructor(function (resolve, reject) {
					latest(new Bacon.Next(stream.doAction(resolve).doError(reject)));
				});
			});
			return function () {};
		}).flatMapLatest(function (stream) {
			return stream;
		});
	});
};

Field.property.digest = function (setup) {
	var field = this(function (sink, me, name, circuit) {
		field.doAction(function (value) {
			circuit.set(name, value);
		});
		return setup.apply(this, arguments);
	});
	return field;
};

Field.property.watch = function (merge) {
	return this.digest(function (sink, me, name, circuit) {
		merge = merge && merge.call(this, sink, me, name, circuit);
		merge = merge || Bacon.never();
		return Bacon.mergeAll(
			merge,
			Bacon.fromBinder(function (watched) {
				circuit.watch(name, function (value) {
					watched(new Bacon.Next(value));
				});
				return function () {};
			})
		).skipDuplicates();
	});
};

Bacon.Circuit.Field = Field;

Bacon.EventStream.field = Field.stream;
Bacon.Property.field = Field.property;