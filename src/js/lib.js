'use strict';

/**************************************************
 * Initialization                                 *
***************************************************/
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



/**************************************************
 * Stream related functions                       *
***************************************************/

// Setup local media streams
async function setupLocalMediaStreams() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then((stream) => {
            if (showVideo) {
                gotLocalVideoMediaStream(stream);
            }

            gotLocalMediaStream(stream);
            resolve();
        })
        .catch((e) => {
            console.warn(`Failed to obtain local media stream: ${e}`);

            // We weren't able to get a local media stream
            // Become a receiver
            enableReceiverOnly();
            reject();
        });
    });
}

async function setupLocalMediaStreamsFromFile(filepath) {
    return new Promise(async (resolve, reject) => {
        // AudioContext gets suspended if created before
        // a user interaction https://goo.gl/7K7WLu
        context.resume();

        if (receiverOnly) {
            resolve();
            return;
        }

        if (showVideo) {
            // This will grab video and audio.
            // We'll overwrite the audio once it's done
            await setupLocalMediaStreams();
        }

        // Create media source
        // This is attached to the HTML audio element and can be fed arbitrary buffers of audio
        // TODO: Make sure we can support MIME other than audio/mpeg
        let mediaSource = new MediaSource();
        trace('Created MediaSource.');
        console.dir(mediaSource);

        // Can't call addSourceBuffer until it's open
        mediaSource.addEventListener('sourceopen', async () => {
            trace('MediaSource open.');

            // Corner case for file:// protocol since fetch won't like it
            if (isElectron === false && location.href.includes('file://')) {
                // TODO: Audio still wouldn't transmit
                // URL.revokeObjectURL(localAudio.src);
                // localAudio.src = './test_file.mp3';
            } else {
                let buffer = mediaSource.addSourceBuffer('audio/mpeg');

                trace('Fetching data...');
                let data;
                let resp = await fetch(filepath);
                data = await resp.arrayBuffer();
                console.dir(data);
                buffer.appendBuffer(data);
                trace('Data loaded.');
            }
        });

        // We need a media stream for WebRTC, so run
        // our MediaSource through a muted HTML audio element
        // and grab its stream via captureStream()
        let localAudio = new Audio();
        localAudio.autoplay = true;
        localAudio.muted = true;

        // Only grab stream after it has loaded; won't have tracks if grabbed too early
        localAudio.addEventListener('canplaythrough', () => {
            try {
                let localStream = localAudio.captureStream();
                gotLocalMediaStream(localStream);
            } catch (e) {
                console.warn(`Failed to captureStream() on audio elem. Assuming unsupported. Switching to receiver only.`, e);

                enableReceiverOnly();
            }
            resolve();
        });

        localMedia.appendChild(localAudio);

        // srcObject doesn't work here ?
        localAudio.src = URL.createObjectURL(mediaSource);
        localAudio.load();
    });
}

function gotLocalMediaStream(mediaStream) {
    let videoTracks = mediaStream.getVideoTracks();
    if (videoTracks.length > 0) {
        localVideo.srcObject = mediaStream;
    }

    // Disconnect our old one if we get a new one
    // This will get called twice if we want a video stream
    // and a different audio source
    if (localStreamNode) {
        localStreamNode.disconnect();
    }

    localStreamNode = context.createMediaStreamSource(mediaStream);
    localStreamNode.connect(outgoingRemoteGainNode);

    trace('Connected localStreamNode.');
}

function gotLocalVideoMediaStream(mediaStream) {
    videoStream = mediaStream;

    trace('Received local video stream.');
}




/**************************************************
 * DOM related functions                          *
***************************************************/

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

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (performance.now() / 1000).toFixed(3);

    console.log(now, text);
}




/**************************************************
 * WebRTC connections                             *
***************************************************/
class Peer {
    constructor(id, socket) {
        this.id = id;
        this.socket = socket; // This is our class wrapped socket. Not socket.io socket
        this.initiated = false;
        this.offered = false;
        this.answered = false;
        this.conn = null;
        this.sendChannel = null;
        this.recvChannel = null;
        this.iceCandidates = [];
        this.remoteStream = null;
        this.titleElem = null;
        this.audioElem = null;
        this.videoElem = null;
        this.audioNode = null;
        this.gainNode = null;
        this.muteButton = null;

        this.conn = new RTCPeerConnection(servers, {  });
        trace('Created local peer connection object localPeerConnection.');

        // Use arrow function so that 'this' is available in class methods
        this.conn.addEventListener('icecandidate', (event) => {
            this.handleIceCandidates(event);
        });
        this.conn.addEventListener('iceconnectionstatechange', (event) => {
            this.handleConnectionChange(event);
        });
        this.conn.addEventListener('track', (event) => {
            this.gotRemoteMediaStream(event);
        });

        // Set up additional data channel to pass messages peer-to-peer
        // There is a separate channel for sending and receiving
        this.sendChannel = this.conn.createDataChannel('session-info');
        this.sendChannel.addEventListener('open', (event) => {
            trace(`Data channel to ${this.id} opened.`);
        });

        this.conn.addEventListener('datachannel', (event) => {
            trace(`Received data channel '${event.channel.label}' from ${this.id}.`);
            this.recvChannel = event.channel;

            this.recvChannel.addEventListener('message', (event) => {
                trace(`Message received from ${this.id}:`);
                console.dir(JSON.parse(event.data));
            });

            // Send an initial message
            this.sendChannel.send(JSON.stringify({ type: 'msg', contents: 'hello' }));
        });
    }

    cleanup() {
        if (this.titleElem) {
            this.titleElem.remove();
        }

        if (this.audioElem) {
            this.audioElem.remove();
        }

        if (this.audioNode) {
            this.audioNode.disconnect();
        }

        if (this.gainNode) {
            this.gainNode.disconnect();
        }

        if (this.videoElem) {
            this.videoElem.remove();
        }

        if (this.muteButton) {
            this.muteButton.remove();
        }

        this.iceCandidates = [];
    }

    reconnect() {
        this.cleanup();
    }

    disconnect() {
        this.conn.close();
        this.sendChannel.close();
        this.recvChannel.close();

        this.cleanup();

        // TODO: This is meh coupling
        this.socket.disconnected(this.id);
        trace(`Disconnected from ${this.id}.`);
    }

    // Connects with new peer candidate.
    handleIceCandidates(event) {
        if (event.candidate) {
            this.socket.socket.emit('candidate', event.candidate, this.id);
            trace(`Sent ICE candidate to ${this.id}.`);
        }
    }

    // Logs changes to the connection state.
    handleConnectionChange(event) {
        trace(`ICE state changed to: ${event.target.iceConnectionState}.`);

        if (event.target.iceConnectionState === 'disconnected') { // || event.target.iceConnectionState === 'closed' || event.target.iceConnectionState === 'failed') {
            this.disconnect();
        }
    }

    uncacheICECandidates() {
        if (!(this.conn && this.conn.remoteDescription && this.conn.remoteDescription.type)) {
            console.warn(`Connection was not in a state for uncaching.`);
            return;
        }

        this.iceCandidates.forEach((candidate) => {
            trace(`Added cached ICE candidate`);
            this.conn.addIceCandidate(candidate);
        });

        this.iceCandidates = [];
    }

    // Handles remote MediaStream success by adding it as the remoteVideo src.
    gotRemoteMediaStream(event) {
        this.remoteStream = event.streams[0];

        let videoTracks = this.remoteStream.getVideoTracks();
        let audioTracks = this.remoteStream.getAudioTracks();

        // If we have a video stream and separate audio stream,
        // we'll get multiple 'track' events
        // Make sure the title only gets added once
        if (!this.titleElem) {
            this.titleElem = document.createElement('h3');
            this.titleElem.innerHTML = `${this.id}:`;
            remoteMedia.appendChild(this.titleElem);
        }

        // Make sure we actually have audio tracks
        if (audioTracks.length > 0) {
            // TODO: This needs more investigation
            // The MediaStream node doesn't produce audio until an HTML audio element is attached to the stream
            // Pause and remove the element after loading since we only need it to trigger the stream
            // See https://stackoverflow.com/questions/24287054/chrome-wont-play-webaudio-getusermedia-via-webrtc-peer-js
            // and https://bugs.chromium.org/p/chromium/issues/detail?id=121673#c121
            let audioElem = new Audio();
            audioElem.autoplay = true;
            audioElem.controls = true;
            audioElem.muted = true;
            audioElem.srcObject = this.remoteStream;
            audioElem.addEventListener('canplaythrough', () => {
                audioElem.pause();
                audioElem = null;
            });

            // Gain node for this stream only
            // Connected to gain node for all remote streams
            this.gainNode = context.createGain();
            this.gainNode.connect(incomingRemoteGainNode);

            this.audioNode = context.createMediaStreamSource(this.remoteStream);
            this.audioNode.connect(this.gainNode);

            // Setup mute button logic
            this.muteButton = document.createElement('button');
            this.muteButton.innerHTML = 'Mute';
            this.muteButton.addEventListener('click', () => {
                if (this.muteButton.innerHTML === 'Mute') {
                    this.gainNode.gain.value = 0;
                    this.muteButton.innerHTML = 'Unmute';
                } else {
                    this.gainNode.gain.value = 1;
                    this.muteButton.innerHTML = 'Mute';
                }
            });

            remoteMedia.appendChild(this.muteButton);

            // AudioContext gets suspended if created before
            // a user interaction https://goo.gl/7K7WLu
            context.resume();
        }

        // Do video if we should
        if (showVideo && videoTracks.length > 0) {
            this.videoElem = document.createElement('video');
            this.videoElem.classList.add('remoteVideo');
            this.videoElem.autoplay = true;
            this.videoElem.controls = true;
            this.videoElem.muted = true;
            this.videoElem.srcObject = this.remoteStream;

            remoteMedia.appendChild(this.videoElem);
        }

        trace(`Received remote stream from ${this.id}.`);
    }
}

/**
 * Factory function for creating a new Peer and connecting streams to it.
 * @param {string} id
 */
async function createPeer(id, socket) {
    trace(`Starting connection to ${id}...`);

    // Mask global localStream on purpose
    // Easily revertible to old style streams from WebAudio changes
    let localStream = outgoingRemoteStreamNode.stream;

    let peer = null;
    let videoTracks = null;
    let audioTracks = null;
    if (receiverOnly === false) {
        if (showVideo && videoStream) {
            videoTracks = videoStream.getVideoTracks();
        }
        audioTracks = localStream.getAudioTracks();

        trace(`Audio tracks:`);
        console.dir(audioTracks);

        if (showVideo && videoTracks.length > 0) {
            trace(`Using video device: ${videoTracks[0].label}.`);
        }
        if (audioTracks.length > 0) {
            trace(`Using audio device: ${audioTracks[0].label}.`);
        }
    }

    // Create peer connections and add behavior.
    peer = new Peer(id, socket);

    // Add local stream to connection and create offer to connect.
    if (receiverOnly === false && showVideo && videoTracks[0]) {
        peer.conn.addTrack(videoTracks[0], videoStream);
    }
    if (receiverOnly === false && audioTracks[0]) {
        peer.conn.addTrack(audioTracks[0], localStream);
    }

    return peer;
}


/**************************************************
 * Socket.io signaling                            *
***************************************************/
class Socket {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.rooms = [];
        this.peers = {};

        this.socket = io.connect(`//${this.ip}:${this.port}`);
        trace(`Created socket.`);
        console.dir(this.socket);

        // This is emitted when this socket successfully creates
        this.socket.on('created', (room, socketId) => {
            trace(`${socketId} successfully created ${room}.`);
            socketIdElem.innerHTML = this.socket.id;

            this.rooms.push(room);
        });

        // This is emitted when this socket successfully joins
        this.socket.on('joined', (room, socketId) => {
            trace(`${socketId} successfully joined ${room}.`);
            socketIdElem.innerHTML = this.socket.id;

            this.rooms.push(room);
        });

        this.socket.on('full', (room) => {
            console.warn(`Room ${room} is full.`);
        });

        this.socket.on('ipaddr', (ipaddr) => {
            trace(`Server IP address: ${ipaddr}`);
        });

        // This is emitted when someone else joins
        this.socket.on('join', async (socketId) => {
            // Have to ignore our own join
            if (socketId === this.socket.id) {
                return;
            }

            let peer = this.peers[socketId];

            trace(`'${socketId}' joined.`);

            // Connection already existed
            // Close old one
            if (peer) {
                this.handleDisconnect(peer.id);
            }

            peer = await createPeer(socketId, this);
            this.peers[peer.id] = peer;
            peer.offered = true;

            trace(`createOffer to ${socketId} started.`);
            let offer = await peer.conn.createOffer(offerOptions);
            await peer.conn.setLocalDescription(offer);

            console.log(peer);
            this.socket.emit('offer', offer, peer.id);
        });

        this.socket.on('offer', async (offer, socketId) => {
            let peer = this.peers[socketId];

            trace(`Offer received from ${socketId}:`);
            console.dir(offer);

            // Peer might exist because of ICE candidates
            if (peer) {
                console.warn(`Peer already existed at offer.`);
                peer.reconnect();
            } else {
                peer = await createPeer(socketId, this);
                this.peers[peer.id] = peer;
            }

            peer.answered = true;

            await peer.conn.setRemoteDescription(offer);
            let answer = await peer.conn.createAnswer(offerOptions);
            await peer.conn.setLocalDescription(answer);

            this.socket.emit('answer', answer, socketId);

            // Restore any cached ICE candidates
            peer.uncacheICECandidates();
        });

        this.socket.on('answer', async (answer, socketId) => {
            let peer = this.peers[socketId];

            // Make sure we're expecting an answer
            if (!(peer && peer.offered)) {
                console.warn(`Unexpected answer from ${socketId} to ${this.socket.id}.`);
                return;
            }

            trace(`Answer received from ${socketId}:`);
            console.dir(answer);

            await peer.conn.setRemoteDescription(answer);

            // Restore any cached ICE candidates
            peer.uncacheICECandidates();
        });

        this.socket.on('candidate', async (candidate, ownerId) => {
            let peer = this.peers[ownerId];

            // Make sure we're expecting candidates
            if (!(peer && (peer.offered || peer.answered))) {
                console.warn(`Unexpected ICE candidates from ${ownerId} to ${this.socket.id}.`);
                return;
            }

            trace(`Received ICE candidate for ${ownerId}.`);

            let iceCandidate = new RTCIceCandidate(candidate);

            // Cache ICE candidates if the connection isn't ready yet
            if (peer.conn && peer.conn.remoteDescription && peer.conn.remoteDescription.type) {
                await peer.conn.addIceCandidate(iceCandidate);
            } else {
                trace(`Cached ICE candidate`);
                peer.iceCandidates.push(iceCandidate);
            }
        });

        this.socket.on('leave', (room, socketId) => {
            let peer = this.peers[socketId];

            if (peer) {
                trace(`${socketId} left ${room}.`);
                peer.disconnect();
            }

            this.peers[socketId] = null;
        });
    }

    joinRoom(room) {
        trace(`Entering room '${room}'...`);
        this.socket.emit('join', room);
    }

    leaveRoom(room) {
        trace(`Leaving room ${room}...`);
        this.socket.emit('leave', room, this.socket.id);

        this.rooms = this.rooms.filter((val) => val !== room);
    }

    leaveAllRooms() {
        this.rooms.forEach((val) => {
            this.leaveRoom(val);
        });
    }

    disconnected(id) {
        this.peers[id] = null;
        trace(`Removed ${id} from peer list.`);
    }
}

// Not in use yet
class Room {
    constructor(name) {
        this.name = name;
        this.peers = {};
    }
}



/**************************************************
 * Other WebAudio stuff                           *
***************************************************/

// Visualizer
// Based on: https://stackoverflow.com/a/49371349/6798110
// and https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/webaudio-output/js/main.js
let analyzerNode = context.createAnalyser();
analyzerNode.smoothingTimeConstant = 0.6;
analyzerNode.fftSize = 2048;
analyzerNode.minDecibels = -100;
analyzerNode.maxDecibels = -10;

let vizFreqDomainData = new Uint8Array(analyzerNode.frequencyBinCount);
let vizAnimationFrameId = requestAnimationFrame(updateVizualizer);
outgoingRemoteGainNode.connect(analyzerNode);
incomingRemoteGainNode.connect(analyzerNode);

console.log(analyzerNode.frequencyBinCount);

let vizualizerOpt = document.getElementById('vizualizerOptions');

function updateVizualizer() {
    analyzerNode.getByteFrequencyData(vizFreqDomainData);

    let width = visualizerCanvas.width;
    let height = visualizerCanvas.height;
    let barWidth = (width / (analyzerNode.frequencyBinCount / 9.3)); // Estimation for now

    // Clear old points
    vizCtx.clearRect(0, 0, width, height);
    vizCtx.fillStyle = 'black';
    vizCtx.fillRect(0, 0, width, height);
    vizCtx.strokeStyle = 'yellow';
    vizCtx.fillStyle = 'yellow';

    vizCtx.beginPath();
    vizCtx.moveTo(0, height);

    let x = 0;
    let t = 1;

    let next = 1;
    for (let i = 0; i < analyzerNode.frequencyBinCount; i += next) {
        // Rounding doesn't go so well...
        next += i / (analyzerNode.frequencyBinCount / 16);
        next = next - (next % 1);

        if (vizualizerOpt.value === 'bar') {
            vizCtx.fillRect(x, height - vizFreqDomainData[i], barWidth, vizFreqDomainData[i]);
        } else {
            let p0 = (i > 0) ? { x: x - barWidth, y: height - vizFreqDomainData[i - 1] } : { x: 0, y: 0 };
            let p1 = { x: x, y: height - vizFreqDomainData[i] };
            let p2 = (i < analyzerNode.frequencyBinCount - 1) ? { x: x + barWidth, y: height - vizFreqDomainData[i + 1] } : p1;
            let p3 = (i < analyzerNode.frequencyBinCount - 2) ? { x: x + 2 * barWidth, y: height - vizFreqDomainData[i + 2] } : p1;

            let cp1x = p1.x + (p2.x - p0.x) / 6 * t;
            let cp1y = p1.y + (p2.y - p0.y) / 6 * t;

            let cp2x = p2.x - (p3.x - p1.x) / 6 * t;
            let cp2y = p2.y - (p3.y - p1.y) / 6 * t;

            vizCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        x += barWidth + 1;
    }

    vizCtx.stroke();

    setTimeout(() => {
        vizAnimationFrameId = requestAnimationFrame(updateVizualizer);
    }, 20);
}
