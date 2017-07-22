'use strict';

//TODO: Use node v4 style code, no ()=>{} arrow functions, lets, generators, itterators, Yeilds, awaits, async. This runs on arm v6 systems and node doesn't release offical intrepers for it beyond 4

global.rootDir = __dirname;

global.rootRequire = function(str, defaultVal){
	if(!str || (typeof str !== 'string')){
		return defaultVal;
	}

	//split into folder path, remove any empty subsets, if they are suppose to be there then change the FS not the code
	var strArray = str.split('\\').join('/').split('/').filter(function(v){ return v; });

	//If the local dir wasn't specified, then spefify it, ./../ === ../ so it is fine, but outside refs in project shouldn't exist but are allowed to
	if(strArray[0] !== '.') {
		strArray.splice(0,0,rootDir);
	}

	//USe path.join to create a more native call to file system, safer overall, no file/directory call because thats too much
    var loc = path.join.apply(null, strArray);

    try {
        return require(loc);
    } catch(err) {
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
    pem = require('pem'),
    config = rootRequire('libs/config.js'),
    node = config.getNode(),
    port = node.port;

if (node.enableWebInterface) {
    rootRequire('node-web.js');
}

app.use(bodyParser.json()); // to support JSON-encoded bodies

app.use(function(req, res, next){
    req.strippedIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(':').pop();
    next();
});

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true,
    parameterLimit: 10000,
    limit: 1024*1024*10
}));

rootRequire('routes/input-routes.js')(app);
rootRequire('routes/output-routes.js')(app);
rootRequire('routes/register-server.routes.js')(app);

function startServer(key, cert){
    var options = {
        key: key,
        cert: cert,
        ca: node.serverCerts,
        requestCert : true,
        rejectUnauthorized : true,
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
    },
    server;

    server = https.createServer(options, function(req,res){
        app(req, res);
    });

    server.listen(port, function(){
        console.log('API Now Listening on Port', port);
        config.requestServerUpdate();
    });
}

// Load SSL key and certificate
var certLoc = path.resolve('./certs/cert.pem');
var keyLoc = path.resolve('./certs/key.pem');

if(!fs.existsSync('./certs/key.pem') || !fs.existsSync('./certs/key.pem')){
    pem.createCertificate({days: 360, selfSigned:true, keyBitsize :4096}, function(err, keys) {
        fs.writeFileSync(certLoc, keys.serviceKey);
        fs.writeFileSync(keyLoc, keys.certificate);

        startServer(keys.serviceKey, keys.certificate);
    });
} else {
    startServer(fs.readFileSync(keyLoc, 'utf8'), fs.readFileSync(certLoc, 'utf8'));
}
