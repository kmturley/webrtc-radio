import { Component } from '@angular/core';

import { RadioService } from './shared/radio.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'webrtc-audio-broadcast';

  constructor(
    radio: RadioService
  ) {

    // const buttonCreate = document.getElementById('buttonCreate');
    // const buttonJoin = document.getElementById('buttonJoin');
    // const stationName = document.getElementById('stationName');
    // const stationType = document.getElementById('stationType');
    // const inputName = document.getElementById('inputName');

    // buttonCreate.addEventListener('click', async () => {
    //   var station = new Station(radio.context, radio.outgoing);
    //   await station.start();
    //   updateStation('Broadcasting to:');
    // });

    // buttonJoin.addEventListener('click', () => {
    //   updateStation('Listening to:');
    // });
  }

  // function updateStation(message) {
  //   let stationId = inputName.value;
  //   stationName.innerHTML = stationId;
  //   stationType.innerHTML = message;
  //   this.radio.leaveAll();
  //   radio.join(stationId);
  // }
}
