import adapter from 'webrtc-adapter';

import { Radio } from './Radio';
import { Station } from './Station';

import '../css/index.scss';

const radio = new Radio();

const buttonCreate = document.getElementById('buttonCreate');
const buttonJoin = document.getElementById('buttonJoin');
const stationName = document.getElementById('stationName');
const stationType = document.getElementById('stationType');
const inputName = document.getElementById('inputName');

function updateStation(message) {
  let stationId = inputName.value;
  stationName.innerHTML = stationId;
  stationType.innerHTML = message;
  radio.leaveAll();
  radio.join(stationId);
}

buttonCreate.addEventListener('click', async () => {
  var station = new Station(radio.context, radio.outgoing);
  await station.start();
  updateStation('Broadcasting to:');
});

buttonJoin.addEventListener('click', () => {
  updateStation('Listening to:');
});
