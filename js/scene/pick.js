// Which scene to paint on this visit. Pure.

/**
 * @param scenes   every available scene ({id, place: {name}|null})
 * @param bg       {mode: 'all'|'followed'|'pinned', pinned, last}
 * @param followed names of the places the user follows
 * @param rand     () => [0, 1)
 */
export function pickScene(scenes, bg, followed, rand = Math.random){
  if (bg.mode === 'pinned'){
    const s = scenes.find(x => x.id === bg.pinned);
    if (s) return s;
  }
  let pool = bg.mode === 'followed' ? scenes.filter(s => !s.place || followed.includes(s.place.name)) : scenes.slice();
  if (!pool.length) pool = scenes.slice();
  if (pool.length > 1) pool = pool.filter(s => s.id !== bg.last);
  return pool[Math.floor(rand() * pool.length) % pool.length];
}
