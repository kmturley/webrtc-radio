const fs = require('fs');
const sdpTransform = require('sdp-transform');

fs.readFile('sdp.txt', 'utf8', function(err, data) {
  if (err) {
    throw err;
  }
  fs.writeFile('sdp.json', JSON.stringify(sdpTransform.parse(data), null, 2), function(err) {
    if (err) {
      throw err;
    }
    console.log('created sdp.json');
  });
});
