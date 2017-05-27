'use strict';

//TODO: Use node v4 style code, no ()=>{} functions, lets, generators, itterators, Yeilds, awaits, async. This runs on arm v6 systems and node doesn't get too new of node version

var app = require('express')(),
	path = require('path'),
	bodyParser = require('body-parser'),
	config = rootRequire('libs/config.js'),
	port = 2000;

global.rootDir = __dirname;

global.rootRequire = function(str){
	if(!str || (typeof str !== 'string')){
		return;
	}

	//split into folder path, remove any empty subsets, if they are suppose to be there then change the FS not the code
	var strArray = str.split('\\').join('/').split('/').filter(function(v){ return v; });

	//If the local dir wasn't specified, then spefify it, ./../ === ../ so it is fine, but outside refs in project shouldn't exist
	if(strArray[0] !== '.'){
		strArray.splice(0,0,'.');
	}

	//USe path.join to create a more native call to file system, safer overall, no file/directory call because thats too much
    return require(path.join.apply(null, strArray));
};

app.use(bodyParser.json());       // to support JSON-encoded bodies

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true,
	parameterLimit: 10000,
	limit: 1024*1024*10
}));

rootRequire('./routes/input-routes')(app);
rootRequire('./routes/output-routes')(app);
rootRequire('./routes/register-server.routes')(app);

app.listen(port, function(){
    config.requestServerUpdate();
});
