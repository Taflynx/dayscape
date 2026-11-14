// Montreal from the south shore of the St. Lawrence: a day and a night oil painting of the same view,
// with the sky cut out. The engine paints a live sky behind the city, lights the day painting by the hour,
// hands over to the night painting as the sky darkens, and keeps the river and the grass moving.
const plate = name => `media/scenes/montreal-${name}.webp`;

export default {
  id: 'montreal',
  name: 'Montreal',
  kind: 'plates',
  place: {name: 'Montreal', cc: 'ca', tz: 'America/Toronto', lat: 45.5017, lon: -73.5673},
  plates: {day: plate('day'), night: plate('night')},
  aspect: 16 / 9,
  // in image height from the top: where the river runs and where the grass starts
  bands: {water: [.51, .79], grass: .73},
};
