var express = require('express');
var app = express();
var cors = require('cors')
app.use(express.static(__dirname));

app.use(cors({
  credentials: true,
  origin: true
}))

app.get('/', function (req, res, next) {
  console.log(res, req)
})

app.post('/', function (req, res, next) {
  console.log(res, req)
})

var port = process.env.PORT || 8080;

app.listen(port, function() {
  console.log('Node app is running on port', port);
});

// To see which port Heroku listening on:
// heroku run printenv --app jsforceapp
