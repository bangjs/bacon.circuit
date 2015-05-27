# Bacon.Circuit

Bacon.js plugin for easily constructing stateful software components as a set of interconnected observables.

Adds `Circuit` and `Field` types to the core `Bacon` library object.


## Overview

Functional reactive programming (FRP) with [Bacon.js](https://baconjs.github.io) is extremely powerful that makes building inherently asynchronous and real-time software a breeze.

But as always with great power comes great responsibility and that is where Bacon.Circuit comes in. Consider it like a circuit board with observable fields that collectively represent a piece of behavior in a certain state.

It offers a basic framework for constructing a stateful software component based on observables, which keeps you away from common FRP pitfalls _(hi there lazy evaluation)_ and makes it plain simple to integrate your component with other (possibly non-streaming) elements of your software by automatically generating a programming interface made up of conventional constructs such as getters, setters and methods. 

Take this example of your typical data source module. A Node.js environment is assumed here, but it works in the browser in the same way.

```js
// mydatasource.js

var Bacon = require('baconjs');
require('bacon.circuit');

var request = require('superagent');
var ENDPOINT = '/my-api-endpoint';

new Bacon.Circuit(module.exports, {
	
	order: Bacon.Field.property.watch(function () {
		return Bacon.once('ASC');
	}),
	
	items: Bacon.Field.property.digest(function () {
		return this.observeItems;
	}),
	
	observeItems: Bacon.Field.property.expose(function () {
		return this.order.combine(
			Bacon.mergeAll(this.create, this.update, this.delete).startWith(true),
			function (order) {
				return { order: order };
			}
		).flatMapLatest(function (params) {
			return Bacon.fromNodeCallback(
				request.get(ENDPOINT).query(params).end
			);
		});
	}),
	
	create: Bacon.Field.stream.function(function (data) {
		return Bacon.fromNodeCallback(
			request.post(ENDPOINT).send(data).end
		);
	}),
	
	update: Bacon.Field.stream.function(function (item, data) {
		if (!item) return item;
		
		return Bacon.fromNodeCallback(
			request.put(ENDPOINT).query({ id: item.id }).send(data).end
		);
	}),
	
	delete: Bacon.Field.stream.function(function (item) {
		if (!item) return item;
		
		return Bacon.fromNodeCallback(
			request.del(ENDPOINT).query({ id: item.id }).end
		);
	})
	
});
```

Now we can use this module as follows:

```js
var ds = require('./mydatasource.js');

// Assignable property that is being watched by our data source component.
ds.order = 'DESC';

// Function that returns a promise (same for `update` and `delete`).
ds.create({ id: 42, name: "Tim" }).done(function (response) {
	// ...
}, function (err) {
	// ...
});

// This value is assigned asynchronously, so not guaranteed to exist at this point.
if (ds.items === undefined)
	console.log("still loading items...");  

// Observable of type `Bacon.Property` has been exposed directly.
ds.observeItems.
	onValue(function (items) {
		// ...
	}).
	onError(function (err) {
		// ...
	});
```


## About

Known to work with Bacon.js v0.7.59.

Bacon.Circuit was created by [Tim Molendijk](https://twitter.com/timmolendijk) as a building block of the [BangJS](http://bangjs.org) _Bacon-flavored Angular_ front-end application framework. It is currently in production use at [Nouncy](http://nouncy.com).

Contributing to Bacon.Circuit is encouraged. I would love to hear about your use case. Feel free to [email me](https://github.com/bangjs/bacon.circuit/blob/master/package.json#L19) or send in issues or pull requests.

Bacon.Circuit has been published under [MIT license](http://timmolendijk.mit-license.org/) and its release history [has been documented here](https://github.com/bangjs/bacon.circuit/blob/master/CHANGES.md).