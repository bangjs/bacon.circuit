### 0.2.0 :dizzy:
_Tuesday 7 July 2015_

* Introduce `sink` function as argument to field setup function. This essentially turns Bacon.Circuit into a framework for reactive programming, with *optional* functional operators. In other words; any field can now be implemented using nothing but subscribe (= read) and sink (= write) calls.
* Also pass observable instance as argument to field setup function, as a convenience to enable a field to subscribe to itself (useful for implementing side-effects) without having to parse its own name.
* Reorganize of CommonJS module: now exports `Bacon.Circuit` with field constructor at `Bacon.Circuit.Field` (and corresponding factory methods under `Bacon.EventStream.field` and `Bacon.Property.field`.
* Rename function as stream factory method from `function` to `method` to prevent reserved term issues in older ECMAScripts and to improve readability – no more `function(function () {…})`.
* Improve build process.
* Fix test that verifies that field observables never end.
* Minor facelift for CHANGES.


### 0.1.3 :sparkles:
_Monday 1 June 2015_

* Default promise constructor to make functions return promises out of the box on Node.js.
* Some improvements in README.


### 0.1.2 :sparkles:
_Sunday 31 May 2015_

* Fix many flawed tests.
* Improve overall Node.js support.
* Improve the test setup by making it support running them directly in Node.js.
* Improve the code sample in README and verify that it actually runs.
* Fix bug where initial stream values could get lost.
* Fix closure-in-loop bug and prevent others by replacing many occurences of `for..in` with safer alternative implementations.
* Fix bug where `stream.function` could miss values that were supposed to resolve its promise.
* Support watching properties that do not yet exist.


### 0.1.1 :sparkles:
_Wednesday 27 May 2015_

* Fix CommonJS support.
* Better code sample in README.


### 0.1.0 :zap:
_Wednesday 27 May 2015_

Initial release.
