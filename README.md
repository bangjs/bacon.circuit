# Bacon.Circuit

Bacon.js plugin for easily constructing stateful software components as a set of interconnected observables.

Adds `Circuit` and `Circuit.Field` types to the core `Bacon` library object. Exposes field factory methods at `Circuit.Field.stream(.…)` and `Circuit.Property.property(.…)`, also available at `Bacon.EventStream.field(.…)` and `Bacon.Property.field(.…)` respectively.


## Overview

Functional reactive programming (FRP) with [Bacon.js](https://baconjs.github.io) is extremely powerful that makes building inherently asynchronous and real-time software a breeze.

But as always with great power comes great responsibility and that is where Bacon.Circuit comes in. Consider it a circuit board of observable fields that collectively represent a piece of behavior and a corresponding state.

It offers a basic framework for constructing a stateful software component based on observables, which keeps you away from common FRP pitfalls _(hi there lazy evaluation)_ and makes it plain simple to integrate your component with other (possibly non-streaming) elements of your software by automatically generating a programming interface made up of conventional constructs such as getters, setters and methods.

Take this example of your typical data source module. A Node.js environment is assumed here, but it works in the browser in the same way.

```js
// mydatasource.js

var Bacon = require('baconjs');
require('bacon.circuit');

var request = require('superagent');
var ENDPOINT = 'http://httpbin.org/';

Bacon.Circuit.prototype.onEvent = function (name, observable, event) {
	console.log(name, '=', event.constructor.name, event.hasValue() && event.value());
};

// Note that in environments where a native ES6 `Promise` does not exist, a
// promise constructor needs to be defined in `Bacon.Circuit.prototype.
// promiseConstructor` to enable functions to return promises.

new Bacon.Circuit(module.exports, {
	
	config: {
		
		order: Bacon.Property.field.watch(function () {
			return Bacon.once("ASC");
		}),
		
		searchTerm: Bacon.Property.field.watch(function () {
			return Bacon.once("").debounce(100);
		})
		
	},
	
	issueQuery: Bacon.EventStream.field(function () {
		return Bacon.combineTemplate({
			order: this.config.order,
			q: this.config.searchTerm
		});
	}),
	
	value: Bacon.Property.field.digest(function () {
		return this.observeValue;
	}),
	
	observeValue: Bacon.Property.field.expose(function () {
		return Bacon.combineWith(
			function (params) {
				return params;
			}, this.issueQuery,
			Bacon.mergeAll(this.create, this.update, this.delete).startWith(true)
		).flatMapLatest(function (params) {
			return Bacon.fromNodeCallback(
				request.get(ENDPOINT + 'get').query(params), 'end'
			).map('.body');
		});
	}),
	
	create: Bacon.EventStream.field.method(function (data) {
		return Bacon.fromNodeCallback(
			request.post(ENDPOINT + 'post').send(data), 'end'
		).map('.body');
	}),
	
	update: Bacon.EventStream.field.method(function (item, data) {
		if (!item) return item;
		
		return Bacon.fromNodeCallback(
			request.put(ENDPOINT + 'put').query({ id: item.id }).send(data), 'end'
		).map('.body');
	}),
	
	delete: Bacon.EventStream.field.method(function (item) {
		if (!item) return item;
		
		return Bacon.fromNodeCallback(
			request.del(ENDPOINT + 'delete').query({ id: item.id }), 'end'
		).map('.body');
	})
	
});
```

Now we can use this module as follows:

```js
var ds = require('./mydatasource');

// Changing this property (and `config.searchTerm`) triggers that items will be
// refetched from server.
ds.config.order = "DESC";

// Function that returns a promise (same for `update` and `delete`).
ds.create({ id: 42, name: "Tim" }).then(function (response) {
	// ...
}, function (err) {
	// ...
});

// This value is assigned asynchronously, so not guaranteed to exist at this
// point.
if (ds.value === undefined)
	console.log("still loading items...");  

// This observable of type `Bacon.Property` has been exposed directly.
ds.observeValue.
	onValue(function (items) {
		// ...
	}).
	onError(function (err) {
		// ...
	});

// Note that `ds.issueQuery` does not exist.
```


## About

Bacon.Circuit was created by [Tim Molendijk](https://twitter.com/timmolendijk) as a building block of the [BangJS](http://bangjs.org) _Bacon-flavored Angular_ front-end application framework. It is currently in production use at [Nouncy](http://nouncy.com).

Contributing to Bacon.Circuit is encouraged. I would love to hear about your use case. Feel free to [email me](https://github.com/bangjs/bacon.circuit/blob/master/package.json#L22) or send in issues or pull requests.

Bacon.Circuit has been published under [MIT license](http://timmolendijk.mit-license.org/) and its [release history has been documented here](https://github.com/bangjs/bacon.circuit/blob/master/CHANGES.md).