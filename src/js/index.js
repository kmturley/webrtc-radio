let socket = new Socket(window.location.hostname, window.location.port);

document.getElementById('connectButton').addEventListener('click', async () => {
  socket.leaveAllRooms();

  let source = document.getElementById('streamFromOptions').value;

  switch (source) {
    case 'file':
      await setupLocalMediaStreamsFromFile('./test_file.mp3');
      break;
    case 'mic':
      // Disable the constraints that exclude microphone
      delete mediaStreamConstraints.audio.mandatory.chromeMediaSource;
      if (showVideo) {
        // Can't do screen capture without screen audio
        mediaStreamConstraints.video = true;
      } else {
        mediaStreamConstraints.video = false;
      }
      await setupLocalMediaStreams();
      break;
    case 'desktop':
      await setupLocalMediaStreams();
      break;
    case 'none':
    default:
      receiverOnly = true;
      break;
  }

  let room = document.getElementById('connectRoom').value;
  socket.joinRoom(room);
});
