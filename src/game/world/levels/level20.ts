import * as THREE from 'three';
import type { LevelDefinition } from '../types';
export const level20:LevelDefinition={
 id:20,title:'Signature Bridge',subtitle:'The whole city, held in one view.',ground:0x73897b,stone:0xb0b7a5,accent:0xd2bc80,
 spawn:[-55,0],archive:[32,0],
 discovery:{at:[11,4],title:'Across the water',text:'From here, the twenty restored lights describe a path through the city. The last crossing was never the end of the road.'},
 sound:{name:'Bridge height · river wind and cable song',wind:.4,water:.16,hum:.025,birds:.35,tone:135,detail:'rail'},
 build(k){
  k.floor(0,0,112,104);k.water(0,0,104,76);
  k.floor(7,0,62,13,0xafb4a2,6);k.ramp(-38,0,28,13,6,'x');k.ramp(45,0,14,13,-6,'x',6);
  for(const z of [-6.2,6.2]) {k.box(7,6,z,62,1.3,.18,0xbab991,false);for(let x=-22;x<39;x+=4)k.box(x,6,z,.15,1.5,.15,0xd0bf8c,false);}
  for(const z of [-11,11]) {
   k.column(8,z,38,1.3);k.box(8,35,z,3,5,3,0xd3c7a6,false);
   for(const endX of [-21,-8,23,36]) {
    const start=new THREE.Vector3(8,35,z),end=new THREE.Vector3(endX,6,z>0?6:-6),dir=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(.06,.06,dir.length(),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));
    const mid=start.add(end).multiplyScalar(.5);k.mesh(g,0xc8c2a0,mid.x,mid.y,mid.z,false);
   }
  }
  for(const x of [-18,0,20,36])k.lamp(x,-5,6);
  k.sign(-45,-9,'SIGNATURE BRIDGE',12,6);k.tree(-51,31,13);k.tree(49,34,11);k.scatter(20,20);
 }
};
