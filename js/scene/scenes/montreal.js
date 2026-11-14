// Montreal from the south shore of the St. Lawrence: four impasto oil paintings of the same view
// (morning, day, sunset, night), faded into each other by the real sun, with the sky, river and grass kept moving.
const plate = name => `media/scenes/montreal-${name}.webp`;

export default {
  id: 'montreal',
  name: 'Montreal',
  kind: 'plates',
  place: {name: 'Montreal', cc: 'ca', tz: 'America/Toronto', lat: 45.5017, lon: -73.5673},
  plates: {morning: plate('morning'), day: plate('day'), sunset: plate('sunset'), night: plate('night')},
  aspect: 16 / 9,
  // in image height from the top: where the open sky ends, where the river runs, where the grass starts
  bands: {sky: .2, water: [.53, .78], grass: .74},
};
