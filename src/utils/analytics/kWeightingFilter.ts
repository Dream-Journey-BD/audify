/**
 * ITU-R BS.1770 K-Weighting Biquad Filter implementation
 */
export class BiquadFilter {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(
    private b0: number,
    private b1: number,
    private b2: number,
    private a1: number,
    private a2: number
  ) {}

  process(x: number): number {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// ITU-R BS.1770 Stage 1: High shelf filter (head model)
export function createHighShelfFilter(sampleRate: number): BiquadFilter {
  const f0 = 1681.9744509555319;
  const G = 3.99984385397;
  const Q = 0.7071752369554193;

  const K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.499666774155);

  const a0 = 1.0 + K / Q + K * K;
  const b0 = (Vh + Vb * (K / Q) + K * K) / a0;
  const b1 = (2.0 * (K * K - Vh)) / a0;
  const b2 = (Vh - Vb * (K / Q) + K * K) / a0;
  const a1 = (2.0 * (K * K - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K * K) / a0;

  return new BiquadFilter(b0, b1, b2, a1, a2);
}

// ITU-R BS.1770 Stage 2: High pass filter (RLB weighting)
export function createHighPassFilter(sampleRate: number): BiquadFilter {
  const f0 = 38.13547087613982;
  const Q = 0.5003270373253953;

  const K = Math.tan((Math.PI * f0) / sampleRate);
  const a0 = 1.0 + K / Q + K * K;
  const b0 = 1.0 / a0;
  const b1 = -2.0 / a0;
  const b2 = 1.0 / a0;
  const a1 = (2.0 * (K * K - 1.0)) / a0;
  const a2 = (1.0 - K / Q + K * K) / a0;

  return new BiquadFilter(b0, b1, b2, a1, a2);
}
