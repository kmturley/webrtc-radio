let receiverOnly = false;
let showVideo = false;
let isElectron = (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1);

// Set up media stream constant and parameters.
// Audio is mono right now
const mediaStreamConstraints = {
  audio: {
    mandatory: {
      chromeMediaSource: 'desktop',
      echoCancellation: false,
      googEchoCancellation: false,
      googAutoGainControl: false,
      googNoiseSuppression: false,
      googHighpassFilter: false,
      googTypingNoiseDetection: false,
      googAudioMirroring: false,
      googAudioMirroring: false,
      googNoiseReduction: false,
    }
  },
  video: {
    mandatory: {
      chromeMediaSource: 'desktop'
    }
  }
};

// Mac and Linux have to disable audio
// if you want to stream video.
// Receiver only will work fine either way
//mediaStreamConstraints.audio = false;

// Set up to exchange audio/video
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: (showVideo) ? 1 : 0
};

// Setup Web Audio components
window.AudioContext = (window.AudioContext || window.webkitAudioContext);
let context = new AudioContext();
let localStreamNode;
let incomingRemoteStreamNode;
let outgoingRemoteStreamNode = context.createMediaStreamDestination();
let incomingRemoteGainNode = context.createGain();
let outgoingRemoteGainNode = context.createGain();

incomingRemoteGainNode.connect(context.destination);
outgoingRemoteGainNode.connect(outgoingRemoteStreamNode);

if (false) {
  // Listen to what's going out in the left for reference
  let panL = context.createStereoPanner();
  panL.pan.value = -1;
  panL.connect(context.destination);
  outgoingRemoteGainNode.connect(panL);

  // Listen to what's coming in in the right ear
  let panR = context.createStereoPanner();
  panR.pan.value = 1;
  panR.connect(context.destination);
  incomingRemoteGainNode.disconnect();
  incomingRemoteGainNode.connect(panR);
}


// Visualizer canvas
const visualizerCanvas = document.getElementById('visualizer');
const vizCtx = visualizerCanvas.getContext('2d');
visualizerCanvas.addEventListener('dblclick', () => {
  if (visualizerCanvas.requestFullscreen) {
    visualizerCanvas.requestFullscreen();
  } else if (visualizerCanvas.webkitRequestFullscreen) {
    visualizerCanvas.webkitRequestFullscreen();
  } else if (visualizerCanvas.mozRequestFullScreen) {
    visualizerCanvas.mozRequestFullScreen();
  } else if (visualizerCanvas.msRequestFullscreen) {
    visualizerCanvas.msRequestFullscreen();
  }
});

// Define media elements.
const localMedia = document.getElementById('localMedia');
const localVideo = document.getElementById('localVideo');

// Container for remote media elements
const remoteMedia = document.getElementById('remoteMedia');

// Socket ID element
const socketIdElem = document.getElementById('socketId');

// Stream from options
const streamFromElem = document.getElementById('streamFrom');

// Hide video elements
if (showVideo === false) {
  hideVideoElements();
}
// Prevent file:// protocol issues
if (isElectron === false && location.href.includes('file://')) {
  enableReceiverOnly();
}
// Prevent screen capture issues
if (isElectron === false) {
  document.getElementById('fromDesktop').remove();
}

const servers = null;  // Allows for RTC server configuration.
let videoStream = null;

function trace(text) {
  text = text.trim();
  const now = (performance.now() / 1000).toFixed(3);
  console.log(now, text);
}

async function setupLocalMediaStreams() {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (localStreamNode) {
        localStreamNode.disconnect();
      }
      localStreamNode = context.createMediaStreamSource(stream);
      localStreamNode.connect(outgoingRemoteGainNode);
      resolve();
    }).catch((e) => {
      console.warn(`Failed to obtain local media stream: ${e}`);
      reject();
    });
  });
}

async function createPeer(id, socket) {
  trace(`Starting connection to ${id}...`);
  let localStream = outgoingRemoteStreamNode.stream;
  let peer = null;
  let audioTracks = localStream.getAudioTracks();
  trace(`Audio tracks:`);
  console.dir(audioTracks);
  if (audioTracks.length > 0) {
    trace(`Using audio device: ${audioTracks[0].label}.`);
  }
  peer = new Peer(id, socket);
  if (audioTracks[0]) {
    peer.conn.addTrack(audioTracks[0], localStream);
  }
  return peer;
}

function enableReceiverOnly() {
  receiverOnly = true;
  localMedia.innerHTML = 'Receiver only';
  streamFromElem.style.display = 'none';

  trace('Switched to receiver only.');
}

function hideVideoElements() {
  localVideo.style.display = 'none';

  // Hide all remote video elements
  let remoteVideos = document.getElementsByClassName('remoteVideo');
  for (let i = 0; i < remoteVideos.length; i++) {
    remoteVideos[i].style.display = 'none';
  }
}

function handleError(e) {
  console.error(e);
  console.dir(e);
  console.trace(e);
}

const socket = new Socket(window.location.hostname, window.location.port);

document.getElementById('connectButton').addEventListener('click', async () => {
  socket.leaveAllRooms();
  let source = document.getElementById('streamFromOptions').value;
  switch (source) {
    case 'mic':
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
