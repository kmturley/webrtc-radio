import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { ListenerService } from '../shared/services/listener.service';
import { RadioService } from '../shared/services/radio.service';
import { StationService } from '../shared/services/station.service';

@Component({
  selector: 'app-station',
  templateUrl: './station.component.html',
  styleUrls: ['./station.component.scss']
})
export class StationComponent implements OnDestroy, OnInit {
  create = false;
  edit = false;
  deviceId: string;
  devicesIn = [];
  myStation: StationService;
  stationId: string;

  constructor(
    public radio: RadioService,
    private route: ActivatedRoute,
  ) {
    this.radio.newListener = (id: string, radioService: any, audioContext: AudioContext, incomingMedia: GainNode) => {
      return new ListenerService(id, radioService, audioContext, incomingMedia);
    };
  }

  ngOnInit() {
    this.route.queryParams.subscribe((queryParams) => {
      this.create = queryParams.create === 'true' ? true : false;
      this.edit = queryParams.edit === 'true' ? true : false;
    });
    this.route.params.subscribe((params) => {
      this.stationId = params.id;
      this.radio.join(this.stationId);
    });
    this.getDevices();
    console.log('StationComponent', this.radio);
  }

  getDevices() {
    this.devicesIn = [];
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      devices.forEach((device) => {
        if (device.kind === 'audioinput') {
          this.devicesIn.push(device);
        }
        if (device.label === 'iShowU Audio Capture') {
          this.deviceId = device.deviceId;
        }
      });
    });
  }

  onChange(deviceId: string) {
    console.log('onChange', deviceId);
    this.deviceId = deviceId;
  }

  async start() {
    this.myStation = new StationService(this.radio.context, this.radio.outgoing, this.deviceId);
    await this.myStation.start();
    this.radio.start(this.stationId);
  }

  stop() {
    this.myStation.stop();
    this.myStation = null;
    this.radio.stop(this.stationId);
  }

  ngOnDestroy() {
    this.radio.leave(this.stationId);
  }
}
