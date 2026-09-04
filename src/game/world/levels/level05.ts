import type { LevelDefinition } from '../types';
export const level05:LevelDefinition={
 id:5,title:'Kotwali Vault',subtitle:'Behind the last locked door.',ground:0x646d65,stone:0x6d7975,accent:0xbfa66a,
 spawn:[0,46],archive:[0,-30],
 discovery:{at:[-24,23],title:'The keeper’s keys',text:'Thirty brass keys hang from a hook. The smallest opens a drawer containing a single pressed flower.'},
 sound:{name:'Vault resonance · distant drips',wind:.035,water:.025,hum:.028,birds:0,tone:190,detail:'drip'},
 build(k){
  k.floor(0,0,102,102);k.floor(0,-17,50,58,0x8b9281);
  for(const x of [-29,29]) {k.wall(x,-16,6,65,14);k.building(x>0?40:-40,31,16,17,9);}
  k.wall(0,-48,64,4,14);k.arch(0,17,12,12);k.arch(0,-8,11,12);
  for(const x of [-18,18]) {k.wall(x,29,4,24,8);k.column(x,-29,11,1.5);}
  // A massive door stands swung against the wall, leaving the vault approach clear.
  k.cylinder(25,0,12,4,1.5,0x87948c);k.box(24,0,4,2,9,12,0x435452);
  for(const z of [-39,-22])for(const x of [-20,20]){k.box(x,0,z,5,5,5,0x506660);k.box(x,2,z+2.6,3,1,.2,0xc1a26a,false);}
  for(const z of [30,6,-18]){k.lamp(-7,z);k.lamp(7,z);}
  k.box(0,12,-28,23,.6,32,0x3f5150,false);k.sign(0,17.1,'KOTWALI / VAULT',10,10);k.scatter(5,30);
 }
};
