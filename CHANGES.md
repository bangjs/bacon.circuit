### 0.1.2
:sparkles: Sunday 31 May 2015

* Fix many flawed tests.
* Improve overall Node.js support.
* Improve the test setup by making it support running them directly in Node.js.
* Improve the code sample in README and verify that it actually runs.
* Fix bug where initial stream values could get lost.
* Fix closure-in-loop bug and prevent others by replacing many occurences of `for..in`s with safer alternative implementations.
* Fix bug where `stream.function` could miss values that were supposed to resolve its promise.
* Support watching properties that do not yet exist.


### 0.1.1
:sparkles: Wednesday 27 May 2015

* Fix CommonJS support.
* Better code sample in README.


### 0.1.0
:zap: Wednesday 27 May 2015

Initial release.
