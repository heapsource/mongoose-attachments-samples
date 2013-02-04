
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')
  , mongoose = require('mongoose')
  , attachments = require('mongoose-attachments')
  , fs = require('fs')
require('mongoose-attachments-knox');

var storageOptions = (function loadStorageOptions() {
  var optionsPath = path.join(__dirname, 's3-options.json');
  console.info("Loading Options from File: %s", optionsPath);
  var optionsContent = (function readOptionsContent() {
    try {
      return fs.readFileSync(optionsPath, 'utf8');
    } catch(err) {
      console.error("Error loading s3 options", err);
      process.exit(1);
    }
  })();
  var options = JSON.parse(optionsContent);
  return options;
})();

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


var PhotoSchema = new mongoose.Schema({
  comment: String
});

PhotoSchema.plugin(attachments, {
  directory: "photos",
  storage: {
    providerName: "knox",
    options: storageOptions
  },
  properties: {
    photo: {
      styles: {
        small: {
          resize: '150x150'
        }
      }
    }
  }
});

var Photo = mongoose.model('Photo', PhotoSchema);

app.get('/', function(req, res, next) {
  Photo.find(function(err, photos) {
    if(err) {
      return next(err);
    }
    res.render('index', { title: 'Express', photos: photos });
  });
});

app.post('/upload', function(req, res, next) {
  var photo = new Photo();
  photo.description = req.body.description;
  req.files.photo.acl = 'public-read'
  photo.attach('photo', req.files.photo, function(err) { 
    if(err) {
      return next(err);
    }
    photo.save(function(err) {
      if(err) {
        return next(err);
      }
      console.info("Photo has been saved successfully: %s", JSON.stringify(photo.photo, null, 2));
      return res.redirect("/");
    });
  })    
});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log("Connected to MongoDB");
  http.createServer(app).listen(app.get('port'), function(){
    console.log("Express Photos server listening on port " + app.get('port'));
  });
});
mongoose.connect('localhost', 'photos');
