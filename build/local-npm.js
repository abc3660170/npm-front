var fs = require('fs');
var path = require('path');
var localNpm = require('fee-local-npm');
var yaml = require('js-yaml');

var configFile = path.resolve(__dirname, '../config.yml');
const doc = yaml.load(fs.readFileSync(configFile));
localNpm(doc['local-npm']);
