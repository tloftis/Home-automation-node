'use strict';

var app = require('express')(),
    path = require('path'),
    fs = require('fs'),
    pem = require('pem'),
    crypto = require('crypto'),
    bodyParser = require('body-parser'),
    https = require('https'),
    config = rootRequire('libs/config.js'),
    node = config.getNode(),
    sessionTokens = [],
    port = process.env.WEB_PORT || 1222;

app.use(bodyParser.json());       // to support JSON-encoded bodies

app.use(function(req, res, next){
    req.strippedIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(':').pop();
    next();
});

app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true,
    parameterLimit: 10000,
    limit: 1024*1024*10
}));

// Create new HTTPS Server
function parseCookies (request) {
    var list = {},
        rc = request.headers.cookie;

    rc && rc.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });

    return list;
}

function verifyCookie(req,res,next){
    var cookie = parseCookies(req);

    if(sessionTokens.indexOf(cookie['node-token']) !== -1){
        next();
    } else {
        res.redirect('/');
    }
}

app.get('/config', verifyCookie, function(req,res){
    fs.readFile(path.join(rootDir, 'views', 'add-cert.html'),{encoding: 'utf-8'}, function(err, data){
        res.send(data);
    });
});

app.route('/add-cert').all(verifyCookie).
    put(config.addCert);

function genSessionToken(timeout){
    var token = config.genId() + config.genId();
    sessionTokens.push(token);

    setTimeout(function () {
        var index = sessionTokens.indexOf(token);

        if(index !== -1){
            sessionTokens.splice(index, 1);
        }
    }, timeout || 120000);

    return token
}

app.post('/api/login', function(req,res){
    var password = (req.body || {}).password;

    if(config.testPassword(password)){
        res.cookie('node-token', genSessionToken(), { maxAge: 120000, httpOnly: true });

        res.send({
            message: 'Login Worked'
        });
    } else {
        res.send({
            message: 'Login Failed'
        });
    }
});

app.post('/api/set-password', function(req,res){
    var password = (req.body || {}).password;

    if(!node.password && password){
        config.setPassword(password);

        res.send({
            message: 'Password Set'
        });
    } else {
        res.send({
            message: 'Password NOT Set!'
        });
    }
});

app.get('/', function(req,res){
    if(node.password) {
        fs.readFile(path.join(rootDir, 'views', 'index.html'),{encoding: 'utf-8'}, function(err, data){
            res.send(data);
        });
    } else {
        fs.readFile(path.join(rootDir, 'views', 'set-password.html'),{encoding: 'utf-8'}, function(err, data){
            res.send(data);
        });
    }
});

function startServer(keyLoc, certLoc){
    var options = {
            key: fs.readFileSync(keyLoc, 'utf8'),
            cert: fs.readFileSync(certLoc, 'utf8'),
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

if(!fs.existsSync(certLoc) || !fs.existsSync(keyLoc){
    pem.createCertificate({days: 360, selfSigned:true, keyBitsize :4096}, function(err, keys) {
        fs.writeFileSync(certLoc, keys.serviceKey);
        fs.writeFileSync(keyLoc, keys.certificate);

        startServer(keyLoc, certLoc);
    });
} else {
    startServer(keyLoc, certLoc);
}

