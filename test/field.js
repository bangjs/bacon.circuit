describe('Bacon.Field', function () {
	
	it("instantiates field that delivers observable of specified type or `Bacon.Property` if not provided", function () {
		
		var field = new Bacon.Field(_.noop, Bacon.EventStream);
		expect(field.observable()).to.be.instanceof(Bacon.EventStream);

		var field = new Bacon.Field(_.noop, Bacon.Property);
		expect(field.observable()).to.be.instanceof(Bacon.Property);

		var field = new Bacon.Field(_.noop);
		expect(field.observable()).to.be.instanceof(Bacon.Property);
		
	});
	
	it("delivers observable that never automatically ends", function (done) {
		
		var field = new Bacon.Field(function () {
			return Bacon.once(true);
		}).start().observable().subscribe(function (event) {
			assert(!event.isEnd() && event.value() === true);
			
			done();
		});
		
	});
	
	it("executes setup on start and no sooner than that", function () {
		
		var onSetup = sinon.spy();
		
		var field = new Bacon.Field(onSetup);
		expect(onSetup).to.have.not.been.called;
		
		field.observable();
		expect(onSetup).to.have.not.been.called;
		
		field.start();
		expect(onSetup).to.have.been.calledOnce;
		
	});
	
	it("calls setup with the parameters that were provided upon start", function (done) {
		
		var a = {}, b = 'b', c = true;
		
		var field = new Bacon.Field(function (name, circuit) {
			expect(this).to.equal(a);
			expect(name).to.equal(b);
			expect(circuit).to.equal(c);
			
			done();
		});
		
		field.start(a, b, c);
		
	});
	
	it("dismisses setup return value if not an observable of any sort", function (done) {
		
		Bacon.mergeAll(
			new Bacon.Field(function () {
				return 'ignore me';
			}).start().observable(),
			Bacon.once('first')
		).onValue(function (value) {
			expect(value).to.equal('first');
			
			done();
		});
		
	});
	
});

describe("Bacon.Field.stream.expose", function () {
	
	it("assigns stream observable to circuit upon setup", function (done) {
		
		var field = Bacon.Field.stream.expose(function (name) {
			expect(circuit.set).
				to.have.been.calledOnce.
				to.have.been.calledWithExactly(name, field.observable());
			
			done();
		});
		
		var circuit = {
			set: sinon.spy()
		};
		field.start({}, 'propName', circuit);
		
	});
	
});

describe("Bacon.Field.stream.function", function () {
	
	it("assigns function to circuit upon setup", function (done) {
		
		Bacon.Field.stream.function().
		start({}, 'propName', {
			set: function (name, fn) {
				expect(fn).to.be.a.function;
				expect(fn()).to.be.undefined;
				
				done();
			}
		}).
		observable().
		subscribe(_.noop);
		
	});
	
	it("returns a promise with event value from a function call if a promise constructor is provided", function (done) {
		
		Bacon.Field.stream.function().
		start({}, 'propName', {
			set: function (name, fn) {
				assert(Q.isPromise(fn()));
				
				done();
			},
			promiseConstructor: Q.Promise
		}).
		observable().
		subscribe(_.noop);
		
	});
	
	it("captures every invocation of the function as a stream event", function (done) {
		
		var invoke;
		
		var stream = Bacon.Field.stream.function().
			start({}, 'propName', {
				set: function (name, fn) {
					invoke = fn;
				}
			}).
			observable();
		
		expect(invoke).to.be.undefined;
		
		stream.onValue(function (value) {
			expect(value).to.be.arguments;
			expect(_.toArray(value)).to.deep.equal([1, 2, 3]);
			
			done();
		});
		
		expect(invoke).to.be.a.function;
		
		invoke(1, 2, 3);
		
	});
	
	it("can amend the result of the invocation using a `flatMapLatest` operation", function (done) {
		
		var onValue = sinon.spy();
		
		Bacon.Field.stream.function(function () {
			var args = _.toArray(arguments);
			return Bacon.once(args).startWith(args.map(function (n) {
				return n * n;
			})).map(function (numbers) {
				return numbers.reduce(function (sum, plus) {
					return sum + plus;
				}, 0);
			});
		}).
		start({}, 'propName', {
			set: function (name, fn) {
				fn(1, 2, 3);
			}
		}).
		observable().
		onValue(function () {
			onValue.apply(this, arguments);
			
			if (onValue.calledTwice) {
				expect(onValue.firstCall).to.have.been.calledWithExactly(1*1 + 2*2 + 3*3);
				expect(onValue.secondCall).to.have.been.calledWithExactly(1 + 2 + 3);
				
				done();
			}
		});
		
	});
	
	it("resolves promise with first event after invocation", function (done) {
		
		Bacon.Field.stream.function(function (arg) {
			return Bacon.fromArray([arg, !arg]);
		}).
		start({}, 'propName', {
			set: function (name, fn) {
				fn(true).done(function (value) {
					expect(value).to.be.true;
					
					done();
				});
			},
			promiseConstructor: Q.Promise
		}).
		observable().
		subscribe(_.noop);
		
	});
	
	it("drops pending events as soon as new (synchronous) invocation event comes in", function (done) {
		
		var onValue = sinon.spy();
		
		Bacon.Field.stream.function(function (value) {
			if (value === 1) return Bacon.later(50, 'drop me').startWith(value);
			return Bacon.once(value);
		}).
		start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				fn(2);
				_.delay(fn, 100, 3);
			}
		}).
		observable().
		onValue(onValue);
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(2);
			expect(onValue.thirdCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 200);
		
	});

	it("drops pending events as soon as new (asynchronous) invocation event comes in", function (done) {
		
		var onValue = sinon.spy();
		
		Bacon.Field.stream.function(function (value) {
			if (value === 1) return Bacon.later(50, 'drop me').startWith(value);
			return Bacon.once(value);
		}).
		start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				_.delay(fn, 0, 2);
				_.delay(fn, 100, 3);
			}
		}).
		observable().
		onValue(onValue);
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(2);
			expect(onValue.thirdCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 200);
		
	});
	
	it("drops pending events as soon as the actual invocation takes place, rather than the resulting event (if any)", function (done) {
		
		var onValue = sinon.spy();
		
		Bacon.Field.stream.function(function (value) {
			if (value === 1) return Bacon.later(200, 'drop me').startWith(value); 
			if (value === 2) return Bacon.never();
			return Bacon.once(value);
		}).
		start({}, 'propName', {
			set: function (name, fn) {
				fn(1);
				_.delay(fn, 50, 2);
				_.delay(fn, 400, 3);
			}
		}).
		observable().
		onValue(onValue);
		
		_.delay(function () {
			expect(onValue.firstCall).to.have.been.calledWithExactly(1);
			expect(onValue.secondCall).to.have.been.calledWithExactly(3);
			
			done();
		}, 500);
		
	});
	
});

describe("Bacon.Field.property.digest", function () {
	
	it("assigns every value of property observable to circuit", function () {
		
		var onSet = sinon.spy();
		
		Bacon.Field.property.digest(function () {
			return Bacon.once(2).startWith(1);
		}).
		start({}, 'propName', {
			set: onSet
		}).
		observable().
		onValue(_.noop);
		
		expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
		expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
		
	});
	
});

describe("Bacon.Field.property.watch", function () {
	
	it("watches and reports changes of value on circuit", function (done) {
		
		Bacon.Field.property.watch().
		start({}, 'propName', {
			watch: function (name, cb) {
				cb(1);
			},
			set: function () {}
		}).
		observable().
		onValue(function (value) {
			expect(value).to.equal(1);
			
			done();
		});
		
	});
	
	it("will merge the provided observable before the watch stream", function (done) {
		
		Bacon.Field.property.watch(function () {
			return Bacon.once(1);
		}).
		start({}, 'propName', {
			watch: function (name, cb) {
				cb(2);
			},
			set: function () {}
		}).
		observable().
		onValue(function (value) {
			expect(value).to.equal(1);
			
			done();
		});
		
	});
	
	it("assigns every value of property observable to circuit", function () {
		
		var onSet = sinon.spy();
		
		Bacon.Field.property.watch(function () {
			return Bacon.once(2).startWith(1);
		}).
		start({}, 'propName', {
			watch: function (name, cb) {
				cb(3);
			},
			set: onSet
		}).
		observable().
		onValue(_.noop);
		
		expect(onSet.firstCall).to.have.been.calledWithExactly('propName', 1);
		expect(onSet.secondCall).to.have.been.calledWithExactly('propName', 2);
		expect(onSet.thirdCall).to.have.been.calledWithExactly('propName', 3);
		
	});
	
	it("will only issue events for actual value changes", function (done) {
		
		var onValue = sinon.spy();
		
		var o1 = {},
			o2 = {};
		
		Bacon.Field.property.watch().
		start({}, 'propName', {
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
		}).
		observable().
		onValue(function () {
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
		
	});
	
});