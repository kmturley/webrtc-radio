import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';

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
  interval: any;
  myStation: StationService;
  stationId: string;
  timeEnd = '';
  timeStart = '';

  constructor(
    public radio: RadioService,
    private route: ActivatedRoute,
    private router: Router,
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
    });
    this.getDevices();
  }

  isOwner() {
    if (this.radio.stations[this.stationId]) {
      return this.radio.stations[this.stationId].owner.id === this.radio.socket.id;
    }
    return false;
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

  save(stationName: string) {
    this.radio.update(this.stationId, stationName);
    this.router.navigate([], { queryParams: {} });
  }

  async start() {
    this.myStation = new StationService(this.radio.context, this.radio.outgoing, this.deviceId);
    await this.myStation.start();
    this.radio.start(this.stationId);
    this.startTimer();
  }

  stop() {
    this.myStation.stop();
    this.myStation = null;
    this.radio.stop(this.stationId);
    this.stopTimer();
  }

  join() {
    this.radio.join(this.stationId);
    this.startTimer();
  }

  leave() {
    this.radio.leave(this.stationId);
    this.stopTimer();
  }

  startTimer() {
    this.updateTimer();
    this.interval = setInterval(() => {
      this.updateTimer();
    }, 1000);
  }

  updateTimer() {
    const playTime = this.radio.stations[this.stationId].time;
    if (playTime) {
      const currentTime = new Date().getTime();
      this.timeEnd = 'Live';
      this.timeStart = this.convertTime(currentTime - playTime);
    } else {
      this.timeEnd = 'Offline';
      this.timeStart = '00:00:00';
    }
  }

  stopTimer() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.timeEnd = '';
    this.timeStart = '';
  }

  convertTime(s: number) {
    function pad(n) {
      return ('00' + n).slice(-2);
    }
    const ms = s % 1000;
    s = (s - ms) / 1000;
    const secs = s % 60;
    s = (s - secs) / 60;
    const mins = s % 60;
    const hrs = (s - mins) / 60;
    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
  }

  ngOnDestroy() {
    this.leave();
  }
}
