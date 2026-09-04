import * as THREE from 'three';
import type { LevelDefinition } from '../types';
export const level11:LevelDefinition={
 id:11,title:'Karim’s Courtyards',subtitle:'Warm brick, cold hearths.',ground:0x9a8267,stone:0xb68b69,accent:0x76836b,
 spawn:[0,46],archive:[26,-26],
 discovery:{at:[-24,-28],title:'A recipe remembered',text:'The measurements were never written down. The margin only says: “Until it smells like home.”'},
 sound:{name:'Kitchen courtyard · utensils and shutters',wind:.06,water:.012,hum:.012,birds:.3,tone:320,detail:'metal'},
 build(k){
  k.floor(0,0,104,104);k.building(-39,4,17,80,10);k.building(35,33,25,20,9);k.building(30,-44,33,9,9);
  k.wall(1,13,38,3,6);k.wall(8,-16,3,30,6);
  for(const z of [-23,-4,28]) {
   k.cylinder(-24,0,z,3,2.5,0xa87651);k.mesh(new THREE.SphereGeometry(3,14,8,0,Math.PI*2,0,Math.PI/2),0xb88b64,-24,2.5,z);
   k.box(-24,.4,z+3,1.5,1.4,.12,0x302a24,false);k.cylinder(-24,4,z,.45,5,0x8d725b,false);
  }
  for(const x of [21,35])for(const z of [-8,9]) {k.box(x,0,z,6,1.3,3,0x786448);for(const dx of [-2,2])k.box(x+dx,0,z+2,1,.6,1,0x9e8560);}
  k.box(-2,7,-32,14,.2,19,0xb6a875,false);k.tree(18,26,8);k.arch(0,40,12,8);
  k.lamp(18,-34);k.lamp(-10,30);k.sign(0,40,'KARIM’S / COURTYARDS',12,7);k.scatter(11,24);
 }
};
