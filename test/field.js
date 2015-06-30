describe('Bacon.Circuit.Field', function () {
	
	it("instantiates field that delivers observable of specified type or `Bacon.Property` if not provided", function () {
		
		var field = new Bacon.Circuit.Field(_.noop, Bacon.EventStream);
		expect(field.observable()).to.be.instanceof(Bacon.EventStream);
	
		var field = new Bacon.Circuit.Field(_.noop, Bacon.Property);
		expect(field.observable()).to.be.instanceof(Bacon.Property);
	
		var field = new Bacon.Circuit.Field(_.noop);
		expect(field.observable()).to.be.instanceof(Bacon.Property);
		
	});
	
	it("delivers observable that never automatically ends", function (done) {
		
		var field = new Bacon.Circuit.Field(function () {
			return Bacon.once(true);
		});
		
		field.observable().subscribe(function (event) {
			assert(!event.isEnd() && event.value() === true);
			
			done();
		});
		
		field.start();
		
	});
	
	it("can be started as soon as its observable has been subscribed to", function () {
		
		var field = new Bacon.Circuit.Field();
		
		expect(field).not.to.have.property('start');
		
		field.observable().subscribe(_.noop);
		
		expect(field).to.have.property('start').
			that.is.a('function');
		
	});
	
	it("executes setup on start and no sooner than that", function () {
		
		var onSetup = sinon.spy();
		
		var field = new Bacon.Circuit.Field(onSetup);
		expect(onSetup).to.have.not.been.called;
		
		field.observable().subscribe(_.noop);
		expect(onSetup).to.have.not.been.called;
		
		field.start();
		expect(onSetup).to.have.been.calledOnce;
		
	});
	
	it("calls setup with sink callback, observable and the parameters that were provided upon start", function (done) {
		
		var a = {}, b = 'b', c = true;
		
		var field = new Bacon.Circuit.Field(function (sink, me, name, circuit) {
			expect(this).to.equal(a);
			expect(sink).to.be.a('function');
			expect(me).to.equal(field.observable());
			expect(name).to.equal(b);
			expect(circuit).to.equal(c);
			
			done();
		});
		
		field.observable().subscribe(_.noop);
		
		field.start(a, b, c);
		
	});
	
	it("emits sunk values as events in generated observable", function (done) {
		
		var field = new Bacon.Circuit.Field(function (sink) {
			sink(1);
		});
		
		field.observable().onValue(function (value) {
			expect(value).to.equal(1);
			
			done();
		});
		
		field.start();
		
	});
	
	it("dismisses setup return value if not an observable of any sort", function (done) {
		
		var never = new Bacon.Circuit.Field(function () {
			return "ignore me";
		});
		
		Bacon.mergeAll(
			never.observable(),
			Bacon.once('first')
		).onValue(function (value) {
			expect(value).to.equal('first');
			
			done();
		});
		
		never.start();
		
	});
	
});

describe("Bacon.Circuit.Field.stream.expose", function () {
	
	it("assigns stream observable to circuit upon setup", function (done) {
		
		var field = Bacon.Circuit.Field.stream.expose(function (sink, me, name) {
			expect(circuit.set).
				to.have.been.calledOnce.
				to.have.been.calledWithExactly(name, field.observable());
			
			done();
		});
		
		var circuit = {
			set: sinon.spy()
		};
		field.observable().subscribe(_.noop);
		field.start({}, 'propName', circuit);
		
	});
	
});

describe("Bacon.Circuit.Field.stream.method", function () {
	
	it("assigns function to circuit upon setup", function (done) {
		
		var field = Bacon.Circuit.Field.stream.method();
		
		field.observable().subscribe(_.noop);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				expect(fn).to.be.a.function;
				expect(fn()).to.be.undefined;
				
				done();
			}
		});
		
	});
	
	it("returns a promise with event value from a function call if a promise constructor is provided", function (done) {
		
		var field = Bacon.Circuit.Field.stream.method();
		
		field.observable().subscribe(_.noop);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				assert(Q.isPromise(fn()));
				
				done();
			},
			promiseConstructor: Q.Promise
		});
		
	});
	
	it("captures every invocation of the function as a stream event", function (done) {
		
		var invoke;
		
		var field = Bacon.Circuit.Field.stream.method();
		
		field.observable().onValue(function (value) {
			expect(value).to.be.arguments;
			expect(_.toArray(value)).to.deep.equal([1, 2, 3]);
			
			done();
		});
		
		expect(invoke).to.be.undefined;
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				invoke = fn;
			}
		});
		
		expect(invoke).to.be.a.function;
		
		invoke(1, 2, 3);
		
	});
	
	it("can amend the result of the invocation using a `flatMapLatest` operation", function (done) {
		
		var onValue = sinon.spy();
		
		var field = Bacon.Circuit.Field.stream.method(function () {
			var args = _.toArray(arguments);
			return Bacon.once(args).startWith(args.map(function (n) {
				return n * n;
			})).map(function (numbers) {
				return numbers.reduce(function (sum, plus) {
					return sum + plus;
				}, 0);
			});
		});
		
		field.observable().onValue(function () {
			onValue.apply(this, arguments);
			
			if (onValue.calledTwice) {
				expect(onValue.firstCall).to.have.been.calledWithExactly(1*1 + 2*2 + 3*3);
				expect(onValue.secondCall).to.have.been.calledWithExactly(1 + 2 + 3);
				
				done();
			}
		});
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				fn(1, 2, 3);
			}
		});
		
	});
	
	it("resolves promise with first event after invocation", function (done) {
		
		var field = Bacon.Circuit.Field.stream.method(function (arg) {
			return Bacon.fromArray([arg, !arg]);
		});
		
		field.observable().subscribe(_.noop);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				fn(true).done(function (value) {
					expect(value).to.be.true;
					
					done();
				});
			},
			promiseConstructor: Q.Promise
		});
		
	});
	
	it("drops pending events as soon as new (synchronous) invocation event comes in", function (done) {
		
		var onValue = sinon.spy();
		
		var field = Bacon.Circuit.Field.stream.method(function (value) {
			if (value === 1) return Bacon.later(50, 'drop me').startWith(value);
			return Bacon.once(value);
		});
		
		field.observable().onValue(onValue);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				fn(2);
				_.delay(fn, 100, 3);
			}
		});
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(2);
			expect(onValue.thirdCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 200);
		
	});

	it("drops pending events as soon as new (asynchronous) invocation event comes in", function (done) {
		
		var onValue = sinon.spy();
		
		var field = Bacon.Circuit.Field.stream.method(function (value) {
			if (value === 1) return Bacon.later(50, 'drop me').startWith(value);
			return Bacon.once(value);
		});
		
		field.observable().onValue(onValue);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				_.delay(fn, 0, 2);
				_.delay(fn, 100, 3);
			}
		});
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(2);
			expect(onValue.thirdCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 200);
		
	});
	
	it("drops pending events as soon as the actual invocation takes place, rather than the resulting event (if any)", function (done) {
		
		var onValue = sinon.spy();
		
		var field = Bacon.Circuit.Field.stream.method(function (value) {
			if (value === 1) return Bacon.later(200, 'drop me').startWith(value); 
			if (value === 2) return Bacon.never();
			return Bacon.once(value);
		});
		
		field.observable().onValue(onValue);
		
		field.start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				_.delay(fn, 50, 2);
				_.delay(fn, 400, 3);
			}
		});
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 500);
		
	});
	
});

describe("Bacon.Circuit.Field.property.digest", function () {
	
	it("assigns every value of property observable to circuit", function (done) {
		
		var onSet = sinon.spy();
		
		var field = Bacon.Circuit.Field.property.digest(function () {
			return Bacon.once(2).startWith(1);
		});
		
		field.observable().onValue(function (value) {
			if (value < 2) return;
			
			expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
			expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
			
			done();
		});
		
		field.start({}, 'propName', {
			set: onSet
		});

	});
	
	it("digests sunk values just as values from returned streams", function (done) {
		
		var field = Bacon.Circuit.Field.property.digest(function (sink) {
			sink(1);
		});
		
		field.observable().onValue(_.noop);
		
		field.start({}, 'propName', {
			set: function (key, value) {
				expect(value).to.equal(1);
				
				done();
			}
		});
		
	});
	
});

describe("Bacon.Circuit.Field.property.watch", function () {
	
	it("watches and reports changes of value on circuit", function (done) {
		
		var field = Bacon.Circuit.Field.property.watch();
		
		field.observable().onValue(function (value) {
			expect(value).to.equal(1);
			
			done();
		});
		
		field.start({}, 'propName', {
			watch: function (name, cb) {
				cb(1);
			},
			set: function () {}
		});
		
	});
	
	it("will merge the provided observable with (and before) the watch stream", function (done) {
		
		var onSet = sinon.spy();

		var field = Bacon.Circuit.Field.property.watch(function () {
			return Bacon.once(1);
		});
		
		field.observable().onValue(function (value) {
			if (value < 2) return;

			expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
			expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
			
			done();
		});
		
		field.start({}, 'propName', {
			watch: function (name, cb) {
				cb(2);
			},
			set: onSet
		});
		
	});
	
	it("will merge sunk values with (and before) the watch stream", function (done) {
		
		var onSet = sinon.spy();

		var field = Bacon.Circuit.Field.property.watch(function (sink) {
			sink(1);
		});
		
		field.observable().onValue(function (value) {
			if (value < 2) return;

			expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
			expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
			
			done();
		});
		
		field.start({}, 'propName', {
			watch: function (name, cb) {
				cb(2);
			},
			set: onSet
		});
		
	});

	it("assigns every value of property observable to circuit", function (done) {

		var onSet = sinon.spy();
		
		var field = Bacon.Circuit.Field.property.watch(function () {
			return Bacon.once(2).startWith(1);
		});
		
		field.observable().onValue(function (value) {
			if (value < 3) return;

			expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
			expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
			expect(onSet.thirdCall).to.have.been.calledWithExactly('propName', 3);
			
			done();
		});
		
		field.start({}, 'propName', {
			watch: function (name, cb) {
				cb(3);
			},
			set: onSet
		});
		
	});
	
	it("will only issue events for actual value changes", function (done) {
		
		var onValue = sinon.spy();
		
		var o1 = {},
			o2 = {};
		
		var field = Bacon.Circuit.Field.property.watch();
		
		field.observable().onValue(function () {
			onValue.apply(this, arguments);
			
			if (onValue.callCount === 6) {
				expect(onValue.getCall(0)).to.have.been.calledWithExactly(undefined);
				expect(onValue.getCall(1)).to.have.been.calledWithExactly(1);
				expect(onValue.getCall(2)).to.have.been.calledWithExactly(2);
				expect(onValue.getCall(3)).to.have.been.calledWithExactly(1);
				expect(onValue.getCall(4)).to.have.been.calledWithExactly(o1);
				expect(onValue.getCall(5)).to.have.been.calledWithExactly(o2);
				
				done();
			}
		});
		
		field.start({}, 'propName', {
			watch: function (name, cb) {
				cb(undefined);
				cb(1);
				cb(1);
				cb(2);
				cb(1);
				cb(o1);
				cb(o2);
			},
			set: function () {}
		});
		
	});
	
});