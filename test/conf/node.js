var chai = require("chai");
chai.use(require("sinon-chai"));

global.assert = chai.assert;
global.expect = chai.expect;

global.sinon = require('sinon');

global.Bacon = require('baconjs');
require('../../src/circuit.js');
require('../../src/field.js');

global._ = require('lodash');

global.Q = require('q');