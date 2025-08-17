export interface Rng {
  next(): number; // [0,1)
}

export class DefaultRng implements Rng {
  next(): number { return Math.random(); }
}

export class SeededRng implements Rng {
  private state: number;
  constructor(seed = 123456789) { this.state = seed >>> 0; }
  next(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return (this.state % 0x100000000) / 0x100000000;
  }
}
