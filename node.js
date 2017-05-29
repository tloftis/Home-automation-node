'use strict';

//TODO: Use node v4 style code, no ()=>{} arrow functions, lets, generators, itterators, Yeilds, awaits, async. This runs on arm v6 systems and node doesn't release offical intrepers for it beyond 4

global.rootDir = __dirname;

global.rootRequire = function(str, defaultVal){
	if(!str || (typeof str !== 'string')){
		return;
	}

	//split into folder path, remove any empty subsets, if they are suppose to be there then change the FS not the code
	var strArray = str.split('\\').join('/').split('/').filter(function(v){ return v; });

	//If the local dir wasn't specified, then spefify it, ./../ === ../ so it is fine, but outside refs in project shouldn't exist but are allowed to
	if(strArray[0] !== '.'){
		strArray.splice(0,0,rootDir);
	}

	//USe path.join to create a more native call to file system, safer overall, no file/directory call because thats too much
    var loc = path.join.apply(null, strArray);

    try {
        return require(loc);
    }catch(err){
	    if(defaultVal) {
            return defaultVal;
        } else {
	        console.log('Missing file:', loc);
	        throw err;
        }
    }
};

var app = require('express')(),
    path = require('path'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    https = require('https'),
    config = rootRequire('libs/config.js'),
    port = process.env.PORT || 2000;

app.use(bodyParser.json());       // to support JSON-encoded bodies

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true,
    parameterLimit: 10000,
    limit: 1024*1024*10
}));

rootRequire('routes/input-routes.js')(app);
rootRequire('routes/output-routes.js')(app);
rootRequire('routes/register-server.routes.js')(app);

var server;

// Load SSL key and certificate
var privateKey = fs.readFileSync(path.resolve('./certs/key.pem'), 'utf8');
var certificate = fs.readFileSync(path.resolve('./certs/cert.pem'), 'utf8');

var options = {
    key: privateKey,
    cert: certificate,
    //    requestCert : true,
    //    rejectUnauthorized : true,
    secureProtocol: 'TLSv1_method',
    ciphers: [
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-ECDSA-AES256-GCM-SHA384',
        'DHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-SHA256',
        'DHE-RSA-AES128-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'DHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES256-SHA256',
        'DHE-RSA-AES256-SHA256',
        'HIGH',
        '!aNULL',
        '!eNULL',
        '!EXPORT',
        '!DES',
        '!RC4',
        '!MD5',
        '!PSK',
        '!SRP',
        '!CAMELLIA'
    ].join(':'),
    honorCipherOrder: true
};

// Create new HTTPS Server
server = https.createServer(options, app);

app.get('/', function(req,res){
    res.sendFile(path.join(rootDir, 'views', 'index.html'));
});

app.listen(port, function(){
    config.requestServerUpdate();
});
