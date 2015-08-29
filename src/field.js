function wrapSink(sink, ignoreEnd, emitAsync) {
	return function (value) {
		if (ignoreEnd && value instanceof Bacon.Event && value.isEnd())
			return;
		if (emitAsync)
			setTimeout(function () {
				sink(value);
			});
		else
			sink(value);
	};
}

function Field(setup, Type) {
	
	var observable = Bacon.fromBinder(function (sink) {
		sink = wrapSink(sink, true, true);
		
		this.start = function (context, name, circuit) {
			var result = setup.call(context, sink, this.observable(), name, circuit);
			
			if (result instanceof Bacon.Bus)
				result = result.toProperty();
			if (result instanceof Bacon.Property)
				result = result.toEventStream();
			if (result instanceof Bacon.EventStream)
				result.subscribe(sink);
			
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
	return this(function (sink, me, name, circuit) {
		return Bacon.fromBinder(function (send) {
			send = wrapSink(send, true);
			if (merge) {
				merge = merge(send, me, name, circuit);
				if (merge instanceof Bacon.Observable)
					merge.subscribe(send);
			}
			circuit.watch(name, send);
			return function () {};
		}.bind(this)).skipDuplicates().doAction(function (value) {
			circuit.set(name, value);
		});
	});
};

Bacon.Circuit.Field = Field;

Bacon.EventStream.field = Field.stream;
Bacon.Property.field = Field.property;