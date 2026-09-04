import type { LevelDefinition } from '../types';
export const level06:LevelDefinition={
 id:6,title:'Chandni Chowk',subtitle:'A market waiting for its voices.',ground:0x95816a,stone:0xb39576,accent:0xa65d45,
 spawn:[0,46],archive:[-25,-28],
 discovery:{at:[27,26],title:'A familiar price',text:'The price on a spice tin has been crossed out so many times that only the word “today” remains.'},
 sound:{name:'Bazaar breeze · timber shutters',wind:.13,water:0,hum:.007,birds:.45,tone:170,detail:'wood'},
 build(k){
  k.floor(0,0,104,104);k.floor(0,0,18,103,0xc4ae86);
  for(let z=-35;z<=35;z+=17)for(const side of [-1,1]) {
   k.building(side*38,z,19,13,9+(z%3+3),side<0?0xb47b5d:0xbba181);
   if(!(side<0&&z===-35))k.stall(side*19,z,side<0?0xb66844:0x688b78);
  }
  for(const z of [-26,8,40]){k.box(0,9,z,52,.15,.2,0x534e3a,false);for(let x=-22;x<25;x+=5)k.box(x,8.3,z,.8,.8,.05,x%2?0xc7a964:0x8b5944,false);}
  k.arch(0,-45,13,12);k.sign(0,40,'CHANDNI CHOWK',12,8);
  k.tree(-8,-18,9);k.lamp(8,28);k.lamp(-8,-38);k.crate(29,4);k.crate(32,5);k.scatter(6,45);
 }
};
