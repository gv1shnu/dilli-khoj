import type { LevelDefinition } from '../types';
export const level13:LevelDefinition={
 id:13,title:'Old Delhi Station',subtitle:'The next train is a memory.',ground:0x747a70,stone:0xa99e82,accent:0x8c594b,
 spawn:[0,46],archive:[0,-33],
 discovery:{at:[35,26],title:'A ticket to anywhere',text:'The destination was torn away, but the passenger kept the return half.'},
 sound:{name:'Station wind · distant rail resonance',wind:.2,water:0,hum:.035,birds:.4,tone:185,detail:'rail'},
 build(k){
  k.floor(0,0,104,104);k.floor(0,0,14,94,0xc2b293,.4);
  for(const x of [-22,22]) {
   for(const dx of [-2,2])k.box(x+dx,0,0,.16,.16,101,0x63716e,false);
   for(let z=-47;z<48;z+=3)k.box(x,0,z,6,.1,.4,0x5f5440,false);
   k.box(x,.8,-16,4,3.6,37,x<0?0x775f4f:0x658b7d);
   for(let z=-32;z<0;z+=4)for(const side of [-1,1])k.box(x+side*2.02,2.4,z,.1,1.2,2.5,0x273f44,false);
  }
  for(const z of [-25,-5,15,35])for(const x of [-6,6])k.column(x,z,6,.2,.4);
  k.box(0,6.4,5,19,.4,86,0x72837a,false);
  k.floor(0,-43,84,8,0xafa486,4);k.ramp(39,-25,8,28,-4,'z',4);
  k.cylinder(-38,0,-32,3,19,0xa19072);k.box(-38,19,-32,7,3,7,0xcbbd94);k.sign(-38,-28.4,'12 : 00',6,20.5);
  k.lamp(9,31);k.sign(0,40,'OLD DELHI STATION',13,5.7);k.scatter(13,20);
 }
};
