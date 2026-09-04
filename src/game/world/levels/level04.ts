import type { LevelDefinition } from '../types';
export const level04:LevelDefinition={
 id:4,title:'Old Delhi Records Room',subtitle:'Paper outlasts its keepers.',ground:0x7a7770,stone:0xa6a392,accent:0x637e7a,
 spawn:[0,46],archive:[-29,-30],
 discovery:{at:[28,26],title:'The unfinished letter',text:'A clerk wrote that the repairs would be finished by Monday. There is no date, and no signature.'},
 sound:{name:'Office draft · creaking wood',wind:.08,water:0,hum:.012,birds:.08,tone:125,detail:'wood'},
 build(k){
  k.floor(0,0,102,102);k.floor(0,0,84,86,0xc0b69d);
  k.wall(-46,0,2,92,9);k.wall(46,0,2,92,9);k.wall(0,-46,94,2,9);
  for(const x of [-30,30]) k.wall(x,43,30,3,8);
  k.arch(0,43,16,9);k.sign(0,43.1,'RECORDS OFFICE',12,8);
  k.wall(-14,-23,2,45,7);k.wall(15,20,2,44,7);
  k.wall(-31,6,31,2,7);k.wall(31,-8,31,2,7);
  for(const x of [-36,-25,26,37]) for(const z of [-38,-20,17,34]) {
   if(x>0&&z===34)continue;
   k.box(x,0,z,5,1.4,2.2,0x6d5943);k.box(x,1.4,z,3,.3,1.5,0xd0c6a8,false);
  }
  for(const z of [-31,-14,5,24]) {k.box(-44,0,z,2,5,6,0x5d5142);for(let y=1;y<5;y++)k.box(-42.8,y,z,.3,.1,6,0xab9679,false);}
  k.box(31,8,-28,28,.3,31,0x74796b,false);k.tree(2,-12,8);k.lamp(-6,31);k.lamp(-21,-9);k.scatter(4,25,0xb8af93);
 }
};
