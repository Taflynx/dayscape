// Tel Aviv from the sea: the waves in front, the beach and the palm promenade, the towers with Azrieli,
// and old Jaffa on the right. A day and a night painting with the sky cut out, under the live sky.
const plate = name => `media/scenes/telaviv-${name}.webp`;

export default {
  id: 'telaviv',
  name: 'Tel Aviv',
  kind: 'plates',
  place: {name: 'Tel Aviv', cc: 'il', tz: 'Asia/Jerusalem', lat: 32.0853, lon: 34.7818},
  plates: {day: plate('day'), night: plate('night')},
  aspect: 16 / 9,
  // in image height from the top: the sea runs from below the beach to the bottom edge; no grass
  bands: {water: [.62, 1.02]},
  horizon: .4,   // the sun and moon rise and set behind the skyline
};
