const sortFx = {
  bins: [0, 1, 2].map(() => ({ open: 0, wiggle: 0, shake: 0 })),
  fly: null,
  hit(bin) {
    this.fly = { bin, t: 0 };
    this.bins[bin].open = 1.6;
  },
  miss(bin) {
    this.bins[bin].shake = 1;
  }
};
export {
  sortFx
};
