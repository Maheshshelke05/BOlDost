class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    const channel = input?.[0];

    if (channel) {
      this.port.postMessage(Array.from(channel));
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
