import type { LevelDefinition } from '../types';
export const level16:LevelDefinition={
 id:16,title:'Tihar Sorting Yard',subtitle:'Order survives inside the walls.',ground:0x7f8272,stone:0x9c9b83,accent:0x677b75,
 spawn:[0,46],archive:[29,-30],
 discovery:{at:[-31,33],title:'The blue marble',text:'A blue glass marble sits in a tray labelled “unclaimed”. Someone carefully lined the tray with cloth.'},
 sound:{name:'Sorting yard · fence rattle',wind:.18,water:0,hum:.028,birds:.18,tone:110,detail:'metal'},
 build(k){
  k.floor(0,0,104,104);k.wall(-48,0,3,96,11);k.wall(48,0,3,96,11);k.wall(0,-48,96,3,11);
  for(const x of [-41,41])for(const z of [-41,39]){k.column(x,z,13,1.3);k.box(x,12,z,7,3,7,0x687d70);k.box(x,15,z,9,.4,9,0xa5a383,false);}
  for(const x of [-17,17])for(const z of [-25,3,30]){k.box(x,0,z,.25,2.3,20,0x546c64);for(let p=-9;p<=9;p+=3)k.box(x,0,z+p,.15,3,.15,0xa5a88b,false);}
  for(const [x,z]of [[-31,-28],[-31,0],[31,2],[31,27]]) {k.box(x,0,z,12,1.4,6,0x6c8072);for(const dx of [-4,0,4])k.crate(x+dx,z,1.5,0x9b8b65,1.4);}
  k.arch(0,40,14,9);k.sign(0,40,'TIHAR / SORTING',12,8);k.lamp(-7,20);k.lamp(7,-27);k.scatter(16,20);
 }
};
