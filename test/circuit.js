describe('Bacon.Circuit', function () {
	
	it("installs all provided fields with created context, name and circuit instance", function () {
		
		var onSetup = sinon.spy(function () {
			expect(this.a).to.be.instanceof(Bacon.Observable);
			expect(this.b).to.be.instanceof(Bacon.Observable);
		});
		
		var circuit = new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(onSetup),
			b: new Bacon.Circuit.Field(_.noop)
		});
		
		expect(onSetup).to.have.been.calledWithExactly(sinon.match.func, 'a', circuit);
		
	});
	
	it("instantiates all observables before starting any of them", function (done) {
		
		var count = 0;
		
		new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(function () {
				expect(this.b).to.be.instanceof(Bacon.Observable);
				
				if (++count === 2) done();
			}),
			b: new Bacon.Circuit.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
				
				if (++count === 2) done();
			})
		});
		
	});

	it("subscribes to all observables simultaneously, preserving all initial event stream events (via return)", function (done) {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(function () {
				return Bacon.once(1);
			}, Bacon.EventStream),
			b: new Bacon.Circuit.Field(function () {
				return this.a.doAction(function (value) {
					expect(value).to.equal(1);
					
					done();
				});
			}, Bacon.EventStream)
		});
		
	});
	
	it("subscribes to all observables simultaneously, preserving all initial event stream events (via sink)", function (done) {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(function (sink) {
				sink(1);
			}, Bacon.EventStream),
			b: new Bacon.Circuit.Field(function () {
				return this.a.doAction(function (value) {
					expect(value).to.equal(1);
					
					done();
				});
			}, Bacon.EventStream)
		});
		
	});
		
	it("takes in one to many field definition objects", function (done) {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
				expect(this.b).to.be.instanceof(Bacon.Observable);
				
				done();
			})
		}, {
			b: new Bacon.Circuit.Field(_.noop)
		});
		
	});
	
	it("flattens the supplied list of field definition objects", function (done) {
		
		new Bacon.Circuit({}, [{
			a: new Bacon.Circuit.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
				expect(this.b).to.be.instanceof(Bacon.Observable);
				expect(this.c).to.be.instanceof(Bacon.Observable);
				
				done();
			})
		}, [{
			b: new Bacon.Circuit.Field(_.noop)
		}, {
			c: new Bacon.Circuit.Field(_.noop)
		}]]);
		
	});
	
	it("deeply merges multiple field definition objects", function (done) {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Circuit.Field(function () {
				expect(this.nested.x).to.be.instanceof(Bacon.Observable);
				expect(this.nested.y).to.be.instanceof(Bacon.Observable);
				
				done();
			}),
			nested: {
				x: new Bacon.Circuit.Field(_.noop)
			}
		}, {
			nested: {
				y: new Bacon.Circuit.Field(_.noop)
			}
		});
		
	});
	
	it("has an `onEvent` method that is called for every event", function (done) {
		
		var field = new Bacon.Circuit.Field(function () {
			return Bacon.once('!');
		});
		var circuit = new Bacon.Circuit({}, {
			field: field
		});
		
		circuit.onEvent = function (name, observable, event) {
			expect(name).to.equal('field');
			expect(observable).to.equal(field.observable());
			assert(event.hasValue && event.value() === '!');
			
			done();
		};
		
	});
	
	it("has a `set` method that deep-assigns a value to provided interface object", function () {
		
		var circuit = new Bacon.Circuit({}, {});
		
		circuit.set('prop', true);
		expect(circuit.face.prop).to.be.true;
		
		circuit.set('nested.prop', 1);
		expect(circuit.face.nested.prop).to.equal(1);
		
		circuit.set('nested.prop', 2);
		expect(circuit.face.nested.prop).to.equal(2);
		
	});
	
	it("has a `watch` method that can register callbacks for changes on provided interface object", function () {
		
		var face = {};
		var circuit = new Bacon.Circuit(face, {});
		
		circuit.set('prop.nested', 1);
		
		var onWatch = sinon.spy();
		circuit.watch('prop.nested', onWatch);
		circuit.watch('prop.nested', onWatch);
		
		face.prop.nested = 2;
		
		expect(onWatch).to.have.been.calledTwice;
		expect(onWatch).to.have.always.been.calledWithExactly(2);
		
	});
	
	it("has a `watch` method that can register callbacks for changes on properties that only exist in the future", function (done) {
		
		var face = {};
		var circuit = new Bacon.Circuit(face, {});
		
		circuit.watch('prop', function (value) {
			expect(value).to.equal('first value');
			
			done();
		});
		
		face.prop = 'first value';
		
	});
	
});