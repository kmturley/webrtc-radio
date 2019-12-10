import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';

import { ListenerService } from '../shared/services/listener.service';
import { RadioService } from '../shared/services/radio.service';
import { StationService } from '../shared/services/station.service';

@Component({
  selector: 'app-visualizer',
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss']
})
export class VisualizerComponent implements AfterViewInit {
  analyzerNode: AnalyserNode;
  context: AudioContext;
  myStation: StationService;
  vizFreqDomainData: Uint8Array;
  vizAnimationFrameId: number;
  vizualizerOpt = 'line'; // bar
  vizCtx: any;

  @Input() set station(station: StationService) {
    if (station) {
      this.myStation = station;
      this.myStation.outgoingGain.connect(this.analyzerNode);
      console.log('station', station);
    }
  }

  @ViewChild('visualizerCanvas', {static: false}) visualizerCanvas: any;

  constructor(
    public radio: RadioService
  ) { }

  ngAfterViewInit() {
    this.analyzerNode = this.radio.context.createAnalyser();
    this.analyzerNode.smoothingTimeConstant = 0.6;
    this.analyzerNode.fftSize = 2048;
    this.analyzerNode.minDecibels = -100;
    this.analyzerNode.maxDecibels = -10;
    this.vizFreqDomainData = new Uint8Array(this.analyzerNode.frequencyBinCount);
    this.vizAnimationFrameId = requestAnimationFrame(() => {
      this.updateVizualizer();
    });
    this.vizCtx = this.visualizerCanvas.nativeElement.getContext('2d');
    this.radio.incoming.connect(this.analyzerNode);
  }

  updateVizualizer() {
    if (this.analyzerNode && this.vizCtx && this.visualizerCanvas) {
      this.analyzerNode.getByteFrequencyData(this.vizFreqDomainData);
      const width = this.visualizerCanvas.nativeElement.clientWidth;
      const height = this.visualizerCanvas.nativeElement.clientHeight;
      const barWidth = (width / (this.analyzerNode.frequencyBinCount / 9.3));
      this.vizCtx.clearRect(0, 0, width, height);
      this.vizCtx.fillStyle = 'black';
      this.vizCtx.fillRect(0, 0, width, height);
      this.vizCtx.strokeStyle = '#219E92';
      this.vizCtx.fillStyle = '#219E92';
      this.vizCtx.beginPath();
      this.vizCtx.moveTo(0, height);
      let xval = 0;
      const t = 1;
      let next = 1;
      for (let i = 0; i < this.analyzerNode.frequencyBinCount; i += next) {
          next += i / (this.analyzerNode.frequencyBinCount / 16);
          next = next - (next % 1);
          if (this.vizualizerOpt === 'bar') {
            this.vizCtx.fillRect(xval, height - this.vizFreqDomainData[i], barWidth, this.vizFreqDomainData[i]);
          } else {
            const p0 = (i > 0) ? { x: xval - barWidth, y: height - this.vizFreqDomainData[i - 1] } : { x: 0, y: 0 };
            const p1 = { x: xval, y: height - this.vizFreqDomainData[i] };
            const p2 = (i < this.analyzerNode.frequencyBinCount - 1) ? {
              x: xval + barWidth, y: height - this.vizFreqDomainData[i + 1]
            } : p1;
            const p3 = (i < this.analyzerNode.frequencyBinCount - 2) ? {
              x: xval + 2 * barWidth, y: height - this.vizFreqDomainData[i + 2]
            } : p1;
            const cp1x = p1.x + (p2.x - p0.x) / 6 * t;
            const cp1y = p1.y + (p2.y - p0.y) / 6 * t;
            const cp2x = p2.x - (p3.x - p1.x) / 6 * t;
            const cp2y = p2.y - (p3.y - p1.y) / 6 * t;
            this.vizCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
          }
          xval += barWidth + 1;
      }
      this.vizCtx.stroke();
      requestAnimationFrame(() => {
        this.updateVizualizer();
      });
    }
  }
}
