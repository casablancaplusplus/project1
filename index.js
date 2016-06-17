// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

//var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
//var databaseUri = 'mongodb://192.168.88.212:27017/dev';
//var databaseUri = 'mongodb://192.168.43.229:27017/dev';
//var databaseUri = 'mongodb://192.168.1.25:27017/dev';
//var databaseUri = 'mongodb://192.168.1.20:27017/dev';
//var databaseUri = 'mognodb://192.168.1.254:27017/dev';
//var databaseUri = 'mongodb://192.168.88.205:27017/dev';
//var databaseUri = 'mongodb://192.168.1.17:27017/dev';
//var databaseUri = 'mongodb://172.20.10.9:27017/dev';
//var databaseUri = 'mongodb://192.168.1.2:27017/dev';
//var databaseUri = 'mongodb://192.168.1.10:27017/dev';
var databaseUri = 'mongodb://192.168.43.229:27017/dev';

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://192.168.88.212:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  verbose: true,
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || 'masterKey', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://10.0.2.15:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('Make sure to star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
