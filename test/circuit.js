describe('Bacon.Circuit', function () {
	
	it("installs all provided fields with created context, name and circuit instance", function () {
		
		var onSetup = sinon.spy(function () {
			expect(this.a).to.be.instanceof(Bacon.Observable);
			expect(this.b).to.be.instanceof(Bacon.Observable);
		});
		
		var circuit = new Bacon.Circuit({}, {
			a: new Bacon.Field(onSetup),
			b: new Bacon.Field(_.noop)
		});
		
		expect(onSetup).to.have.been.calledWithExactly('a', circuit);
		
	});
	
	it("instantiates all observables before starting any of them", function () {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Field(function () {
				expect(this.b).to.be.instanceof(Bacon.Observable);
			}),
			b: new Bacon.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
			})
		});
		
	});
	
	it("takes in one to many field definition objects", function () {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
				expect(this.b).to.be.instanceof(Bacon.Observable);
			})
		}, {
			b: new Bacon.Field(_.noop)
		});
		
	});
	
	it("flattens the supplied list of field definition objects", function () {
		
		new Bacon.Circuit({}, [{
			a: new Bacon.Field(function () {
				expect(this.a).to.be.instanceof(Bacon.Observable);
				expect(this.b).to.be.instanceof(Bacon.Observable);
				expect(this.c).to.be.instanceof(Bacon.Observable);
			})
		}, [{
			b: new Bacon.Field(_.noop)
		}, {
			c: new Bacon.Field(_.noop)
		}]]);
		
	});
	
	it("deep merges multiple field definition objects", function () {
		
		new Bacon.Circuit({}, {
			a: new Bacon.Field(function () {
				expect(this.nested.x).to.be.instanceof(Bacon.Observable);
				expect(this.nested.y).to.be.instanceof(Bacon.Observable);
			}),
			nested: {
				x: new Bacon.Field(_.noop)
			}
		}, {
			nested: {
				y: new Bacon.Field(_.noop)
			}
		});
		
	});
	
	it("has an `onEvent` method that is called for every event", function () {
		
		var onEvent = sinon.spy(Bacon.Circuit.prototype, 'onEvent');
		
		var field = new Bacon.Field(function () {
			return Bacon.once('!');
		});
		new Bacon.Circuit({}, {
			field: field
		});
		
		expect(onEvent).to.be.calledWith('field', field.observable(), sinon.match(function (event) {
			return event.hasValue() && event.value() === '!';
		}));
		
	});
	
	it("has a `set` method that deep-assigns a value to provided interface object", function () {
		
		var circuit = new Bacon.Circuit({}, {});
		
		circuit.set('prop.nested', 1);
		expect(circuit.face.prop.nested).to.equal(1);
		
		circuit.set('prop.nested', 2);
		expect(circuit.face.prop.nested).to.equal(2);
		
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
	
});