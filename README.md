![alt text](https://raw.githubusercontent.com/kmturley/webrtc-audio-broadcast/master/src/assets/images/webrtc-radio.png "WebRTC Radio")
# webrtc-audio-broadcast

WebRTC audio broadcast running across local network using:

* WebRTC
* Angular 8.2.x
* NodeJS 10.16.x
* socket.io 2.3.x


## Installation

Install dependencies using:

     npm install

Generate an SSL key and certificate using:

    npm run generate


## Usage

Run production HTTPS and Socket.io local servers using:

    npm start

Access the web frontend at:

    https://localhost:8080


## Development with live reload

In seperate terminals run the dev servers using:

    npm run dev:backend
    npm run dev:frontend

Go to both urls and allow unsafe browser access to https at:

    https://localhost:8080
    https://localhost:4200

Then develop using the live reload page at:

    https://localhost:4200


## Understanding SDP output

Create a file containing the SDP data called:

    sdp.txt

To then convert into a human readable structured output run:

    npm run parser

Then open the generated file:

    sdp.json


## Limitations

1) Maximum bitrate is 520kb/s stereo, which is 260kps per channel.
2) Actual bitrate depends on the speed of your network and strength of your signal.


## Directory structure

    /src                           --> Web source files


## Contact

For more information please contact kmturley
