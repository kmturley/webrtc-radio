const fs = require('fs');
const sdpTransform = require('sdp-transform');

fs.readFile('sdp.txt', 'utf8', function(err, data) {
  if (err) {
    throw err;
  }
  console.log(sdpTransform.parse(data));
});
