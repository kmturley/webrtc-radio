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
