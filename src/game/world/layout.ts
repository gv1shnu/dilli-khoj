import { isUnlocked } from '../progression';

export const CELL = 120;
export const CITY_TILE = 720;
export const LEVEL_COUNT = 20;
export type Point = readonly [number, number];

/** A winding, connected city: five places per row, four rows. */
export function levelCenter(id: number): Point {
  const row = Math.floor((id - 1) / 5);
  const column = row % 2 ? 4 - ((id - 1) % 5) : (id - 1) % 5;
  return [(column - 2) * CELL, (row - 1.5) * CELL];
}
export function wrapCoordinate(value: number): number {
  return ((value + CITY_TILE / 2) % CITY_TILE + CITY_TILE) % CITY_TILE - CITY_TILE / 2;
}
export function levelAt(x: number, z: number): number | null {
  const column = Math.floor((wrapCoordinate(x) + 300) / CELL);
  const row = Math.floor((wrapCoordinate(z) + 240) / CELL);
  if (column < 0 || column > 4 || row < 0 || row > 3) return null;
  return row * 5 + (row % 2 ? 5 - column : column + 1);
}
export function canEnter(x: number, z: number, cleared: readonly number[]): boolean {
  const id = levelAt(x, z);
  // The peripheral green belt remains continuous across the world seam.
  return id === null || isUnlocked(id, cleared);
}
export function toWorld(id: number, point: Point): Point {
  const [x,z] = levelCenter(id);
  return [x + point[0], z + point[1]];
}
export function gatePoint(from: number, to: number): Point {
  const a = levelCenter(from), b = levelCenter(to);
  return [(a[0]+b[0])/2, (a[1]+b[1])/2];
}

/** Grid route follows walkable ground instead of pointing through architecture. */
export function findRoute(start: Point, end: Point, blocked: (x:number,z:number)=>boolean, step=3): Point[] {
  const size = Math.ceil(CITY_TILE / step), half = CITY_TILE / 2;
  const index = (p:Point) => Math.max(0,Math.min(size-1,Math.round((p[1]+half)/step))) * size + Math.max(0,Math.min(size-1,Math.round((p[0]+half)/step)));
  const point = (i:number):Point => [(i%size)*step-half,Math.floor(i/size)*step-half];
  const nearest = (p:Point) => {
    const base=index(p);
    for(let radius=0;radius<5;radius++) for(let dz=-radius;dz<=radius;dz++) for(let dx=-radius;dx<=radius;dx++) {
      const x=base%size+dx,z=Math.floor(base/size)+dz;
      if(x<0||z<0||x>=size||z>=size) continue;
      const i=z*size+x, q=point(i);
      if(!blocked(q[0],q[1])) return i;
    }
    return -1;
  };
  const first=nearest(start),last=nearest(end);
  if(first<0||last<0) return [];
  const previous=new Int32Array(size*size).fill(-1);
  const queue=new Int32Array(size*size);
  queue[0]=first;previous[first]=first;
  let head=0,tail=1;
  while(head<tail && previous[last]===-1) {
    const current=queue[head++],cx=current%size,cz=Math.floor(current/size);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=cx+dx,z=cz+dz;
      if(x<0||x>=size||z<0||z>=size) continue;
      const next=z*size+x;
      if(previous[next]!==-1) continue;
      const p=point(next), mid:Point=[(p[0]+point(current)[0])/2,(p[1]+point(current)[1])/2];
      if(blocked(p[0],p[1])||blocked(mid[0],mid[1])) continue;
      previous[next]=current;queue[tail++]=next;
    }
  }
  if(previous[last]===-1) return [];
  const route:Point[]=[];
  for(let p=last;p!==first;p=previous[p]) route.push(point(p));
  route.reverse();route.push(end);
  return route;
}
