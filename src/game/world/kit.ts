import * as THREE from 'three';
import type { LevelDefinition } from './types';
import type { Point } from './layout';

export interface Surface { x:number; z:number; w:number; d:number; y:number; slope?:number; axis?:'x'|'z' }
/** Original modular architecture and props. Coordinates are local to each place. */
export class LevelKit {
  group = new THREE.Group();
  obstacles: THREE.Box3[] = [];
  surfaces: Surface[] = [];
  assets: THREE.Object3D[] = [];
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Map<string,THREE.MeshStandardMaterial>();
  private textures: THREE.Texture[] = [];
  constructor(public definition:LevelDefinition, private stoneTexture?:THREE.Texture) {}
  material(color:number,glow=0) {
    const key=`${color}:${glow}`;
    if(!this.materials.has(key)) this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.88,map:glow?null:this.stoneTexture,emissive:glow?color:0,emissiveIntensity:glow}));
    return this.materials.get(key)!;
  }
  mesh(geometry:THREE.BufferGeometry,color:number,x:number,y:number,z:number,solid=false,rotation=0) {
    this.geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,this.material(color));
    mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;
    this.group.add(mesh);this.assets.push(mesh);
    if(solid) {mesh.updateMatrixWorld(true);this.obstacles.push(new THREE.Box3().setFromObject(mesh));}
    return mesh;
  }
  box(x:number,y:number,z:number,w:number,h:number,d:number,color=this.definition.stone,solid=true,rotation=0) {
    return this.mesh(new THREE.BoxGeometry(w,h,d),color,x,y+h/2,z,solid,rotation);
  }
  cylinder(x:number,y:number,z:number,r:number,h:number,color=this.definition.stone,solid=true,top=r) {
    return this.mesh(new THREE.CylinderGeometry(top,r,h,12),color,x,y+h/2,z,solid);
  }
  floor(x:number,z:number,w:number,d:number,color=this.definition.ground,y=0) {
    this.box(x,y-.15,z,w,.15,d,color,false);
    this.surfaces.push({x,z,w,d,y});
  }
  ramp(x:number,z:number,w:number,d:number,height:number,axis:'x'|'z'='z',base=0) {
    const count=Math.ceil(Math.abs(height)/.35);
    for(let i=0;i<count;i++) {
      const t=(i+.5)/count-.5,h=base+height*(i+1)/count;
      this.box(x+(axis==='x'?t*w:0),0,z+(axis==='z'?t*d:0),axis==='x'?w/count:w,Math.max(.1,h),axis==='z'?d/count:d,this.definition.stone,false);
    }
    this.surfaces.push({x,z,w,d,y:base+height/2,slope:height,axis});
  }
  wall(x:number,z:number,w:number,d:number,h=7,color=this.definition.stone) {
    this.box(x,0,z,w,h,d,color);
    for(let i=0;i<Math.floor(w/2);i++) this.box(x-w/2+i*2+1,h,z,1,.8,d,color,false);
  }
  arch(x:number,z:number,width=10,height=10,rotation=0) {
    const dx=Math.cos(rotation),dz=-Math.sin(rotation);
    for(const side of [-1,1]) this.box(x+side*(width/2+1)*dx,0,z+side*(width/2+1)*dz,2,height,2.8,this.definition.stone,true,rotation);
    const shape=new THREE.Shape();
    const r=width/2;
    shape.absarc(0,0,r+2,0,Math.PI,false);shape.absarc(0,0,r,Math.PI,0,true);
    const geo=new THREE.ExtrudeGeometry(shape,{depth:2.8,bevelEnabled:false,curveSegments:12});
    geo.translate(0,0,-1.4);
    this.mesh(geo,this.definition.stone,x,height-r,z,false,rotation);
    this.box(x,height,z,width+4,1.5,3.4,this.definition.accent,false,rotation);
  }
  column(x:number,z:number,height=7,r=.7,y=0) {
    this.cylinder(x,y,z,r,height);this.box(x,y,z,r*2.8,.4,r*2.8);this.box(x,y+height-.3,z,r*2.8,.5,r*2.8,this.definition.accent,false);
  }
  dome(x:number,z:number,r=7,y=8) {
    this.mesh(new THREE.SphereGeometry(r,20,12,0,Math.PI*2,0,Math.PI/2),this.definition.accent,x,y,z,false);
    this.cylinder(x,y+r,z,.2,2,0xc5a456,false,.05);
  }
  building(x:number,z:number,w:number,d:number,h=9,color=this.definition.stone) {
    this.box(x,0,z,w,h,d,color);
    this.box(x,h,z,w+1,.5,d+1,this.definition.accent,false);
    for(let px=x-w/2+2;px<x+w/2-1;px+=3.4) for(let y=2;y<h-1;y+=3) {
      this.box(px,y,z+d/2+.03,1.3,1.8,.1,0x203338,false);
      this.box(px,y-.2,z+d/2+.35,1.7,.2,.6,this.definition.accent,false);
    }
  }
  tree(x:number,z:number,h=9) {
    this.cylinder(x,0,z,.45,h*.62,0x514239);
    this.mesh(new THREE.IcosahedronGeometry(h*.34,1),0x425d47,x,h*.75,z,false);
    this.mesh(new THREE.IcosahedronGeometry(h*.23,1),0x68805b,x+h*.17,h*.86,z,false);
  }
  lamp(x:number,z:number,y=0) {
    this.cylinder(x,y,z,.12,4,0x384342);
    const m=this.box(x,y+3.6,z,.7,.8,.7,0xffcf80,false);m.material=this.material(0xffcc78,1.6);
  }
  crate(x:number,z:number,size=1.8,color=0x90714b,y=0) {
    this.box(x,y,z,size,size,size,color);
    for(const offset of [-.32,.32]) this.box(x+offset*size,y,z+size/2+.03,.12,size,.12,0x483c30,false);
    this.box(x,y+size*.48,z+size/2+.05,size,.1,.12,0x483c30,false);
  }
  stall(x:number,z:number,color=this.definition.accent,rotation=0) {
    this.box(x,0,z,5,1.3,2,0x775c43,true,rotation);
    const group=new THREE.Group();
    for(const dx of [-2.8,2.8]) for(const dz of [-1.8,1.8]) this.box(x+dx,0,z+dz,.15,4,.15,0x605748);
    for(let i=0;i<6;i++) this.box(x-2.5+i,4,z,1,.18,4,i%2?0xd6c8a3:color,false);
    this.group.add(group);
  }
  bus(x:number,z:number,color=0x678974,rotation=0) {
    const root=new THREE.Group();root.position.set(x,0,z);root.rotation.y=rotation;
    const part=(w:number,h:number,d:number,px:number,py:number,pz:number,c:number)=>{const g=new THREE.BoxGeometry(w,h,d);this.geometries.add(g);const m=new THREE.Mesh(g,this.material(c));m.position.set(px,py,pz);m.castShadow=true;root.add(m);};
    part(3.4,3.1,11,0,2.25,0,color);part(3.5,.35,11.2,0,3.95,0,0xb5b9a6);
    part(3,.95,.1,0,2.8,-5.55,0x253f47);
    for(let i=0;i<5;i++) for(const side of [-1,1]) part(.08,1.05,1.4,side*1.73,2.95,-3.6+i*1.8,0x253f47);
    for(const dx of [-1.7,1.7]) for(const dz of [-3.4,3.4]) {const g=new THREE.CylinderGeometry(.72,.72,.35,12);this.geometries.add(g);const wheel=new THREE.Mesh(g,this.material(0x262a2b));wheel.rotation.z=Math.PI/2;wheel.position.set(dx,.8,dz);root.add(wheel);}
    this.group.add(root);this.assets.push(root);root.updateMatrixWorld(true);this.obstacles.push(new THREE.Box3().setFromObject(root));
  }
  water(x:number,z:number,w:number,d:number,y=.04) {
    const m=this.box(x,y,z,w,.1,d,0x397b80,false);m.material=this.material(0x397b80);m.material.roughness=.3;m.material.metalness=.25;
    // Water is visible but impassable; bridges and raised walks can cross above it.
    this.obstacles.push(new THREE.Box3(new THREE.Vector3(x-w/2,-2,z-d/2),new THREE.Vector3(x+w/2,y+.18,z+d/2)));
    for(let i=0;i<6;i++) this.box(x-w*.4+i*w*.15,y+.13,z+(i%3-1)*d*.2,w*.07,.025,.12,0x91b8ae,false);
  }
  pipe(x:number,y:number,z:number,length:number,r=.5,axis:'x'|'z'='x') {
    const g=new THREE.CylinderGeometry(r,r,length,12);g.rotateZ(Math.PI/2);if(axis==='z')g.rotateY(Math.PI/2);
    this.mesh(g,0x657f7a,x,y,z,true);
    for(const side of [-1,1]) this.box(x+(axis==='x'?side*length*.35:0),0,z+(axis==='z'?side*length*.35:0),1,y-.3,1,0x8e8980);
  }
  sign(x:number,z:number,text:string,width=8,y=4) {
    if(typeof document==='undefined') return;
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#233d3b';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#c4ac78';ctx.lineWidth=7;ctx.strokeRect(10,10,748,172);
    ctx.fillStyle='#f3e2b8';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96,710);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
    const mat=new THREE.MeshStandardMaterial({map:texture,roughness:.8,side:THREE.DoubleSide});this.materials.set(`sign:${this.materials.size}`,mat);
    const geometry=new THREE.PlaneGeometry(width,width/4);this.geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);this.group.add(mesh);
  }
  scatter(seed:number,count:number,color=0x777b60) {
    let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<count;i++) {const x=(random()-.5)*96,z=(random()-.5)*96;if(Math.abs(x)<10||Math.abs(z)<10)continue;this.mesh(new THREE.DodecahedronGeometry(.3+random()*.5),color,x,.2,z,false);}
  }
  height(x:number,z:number) {
    let height=0;
    for(const s of this.surfaces) if(Math.abs(x-s.x)<=s.w/2 && Math.abs(z-s.z)<=s.d/2) height=s.y+(s.slope??0)*(s.axis==='x'?(x-s.x)/s.w:(z-s.z)/s.d);
    return height;
  }
  blocked(x:number,z:number,radius=.65) {
    const y=this.height(x,z);
    return this.obstacles.some(b=>x+radius>b.min.x&&x-radius<b.max.x&&z+radius>b.min.z&&z-radius<b.max.z&&b.max.y>y+.25&&b.min.y<y+1.9);
  }
  dispose() {this.geometries.forEach(g=>g.dispose());this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}
