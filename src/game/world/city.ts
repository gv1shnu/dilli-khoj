import * as THREE from 'three';
import { stoneTexture,groundTexture } from '../textures';
import { currentRuinId,isUnlocked } from '../progression';
import { CITY_TILE,CELL,levelCenter,levelAt,canEnter,toWorld,type Point } from './layout';
import { LEVELS } from './levels';
import { LevelKit } from './kit';
import type { LevelDefinition } from './types';

export function buildCity() {
 const group=new THREE.Group(),stone=stoneTexture(),ground=groundTexture();
 const material=new THREE.MeshStandardMaterial({color:0x5f7056,map:ground,roughness:1});
 const plane=new THREE.PlaneGeometry(CITY_TILE,CITY_TILE);plane.rotateX(-Math.PI/2);
 const horizonMaterial=new THREE.MeshStandardMaterial({color:0x566554,roughness:1});
 const silhouette=new THREE.BoxGeometry(32,9,30);
 // Keep the 3×3 toroidal world; distant copies use inexpensive silhouettes.
 for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
  const groundMesh=new THREE.Mesh(plane,material);groundMesh.position.set(dx*CITY_TILE,-.2,dz*CITY_TILE);groundMesh.receiveShadow=true;group.add(groundMesh);
  if(dx||dz) for(let id=1;id<=20;id++) {const [x,z]=levelCenter(id);const m=new THREE.Mesh(silhouette,horizonMaterial);m.position.set(x+dx*CITY_TILE,4,z+dz*CITY_TILE);group.add(m);}
 }
 const kits=new Map<number,LevelKit>();
 const archives=new Map<number,THREE.Group>();
 const cores=new Map<number,THREE.MeshStandardMaterial>();
 const locked=new Map<number,THREE.Group>();
 let cleared:readonly number[]=[];
 const ringGeo=new THREE.TorusGeometry(2,.08,6,40),coreGeo=new THREE.OctahedronGeometry(.85),baseGeo=new THREE.CylinderGeometry(2,2.3,.6,12);
 const baseMat=new THREE.MeshStandardMaterial({color:0x5d6252,roughness:.9});
 const mistGeo=new THREE.BoxGeometry(CELL-.5,7,CELL-.5);
 const mistMat=new THREE.MeshBasicMaterial({color:0x192d30,transparent:true,opacity:.18,depthWrite:false});
 for(const def of LEVELS) {
  const kit=new LevelKit(def,stone);kit.group.name=`level-${String(def.id).padStart(2,'0')}`;
  def.build(kit);const [x,z]=levelCenter(def.id);kit.group.position.set(x,0,z);group.add(kit.group);kits.set(def.id,kit);
  const archive=new THREE.Group(),a=toWorld(def.id,def.archive);archive.position.set(a[0],kit.height(...def.archive),a[1]);
  const coreMat=new THREE.MeshStandardMaterial({color:0xffb34c,emissive:0xff9f36,emissiveIntensity:2});cores.set(def.id,coreMat);
  const base=new THREE.Mesh(baseGeo,baseMat);base.position.y=.3;archive.add(base);
  const core=new THREE.Mesh(coreGeo,coreMat);core.position.y=2;archive.add(core);
  const ring=new THREE.Mesh(ringGeo,coreMat);ring.rotation.x=-Math.PI/2;ring.position.y=.65;archive.add(ring);
  const beacon=new THREE.Mesh(new THREE.CylinderGeometry(.06,.3,15,6),coreMat);beacon.position.y=8;archive.add(beacon);
  group.add(archive);archives.set(def.id,archive);
  const seal=new THREE.Group();seal.position.set(x,3,z);seal.add(new THREE.Mesh(mistGeo,mistMat));group.add(seal);locked.set(def.id,seal);
  const d=def.discovery.at;kit.sign(d[0],d[1],def.discovery.title,5,2.8);
  // Four perimeter routes connect neighboring areas; each destination has a physical sign.
  kit.sign(-28,49,`${String(def.id).padStart(2,'0')} / ${def.title.toUpperCase()}`,11,3);
 }
 const defFor=(id:number)=>LEVELS.find(l=>l.id===id)??LEVELS[0];
 const height=(x:number,z:number)=>{const id=levelAt(x,z);if(!id)return 0;const [cx,cz]=levelCenter(id);return kits.get(id)?.height(x-cx,z-cz)??0;};
 const blocked=(x:number,z:number)=>{
  if(!canEnter(x,z,cleared))return true;
  const id=levelAt(x,z);if(!id)return false;const [cx,cz]=levelCenter(id);
  // An unfinished authoring slot stays sealed until its level is implemented.
  if(!kits.has(id))return true;
  return kits.get(id)!.blocked(x-cx,z-cz);
 };
 const position=(id:number,kind:'spawn'|'archive'):THREE.Vector3=>{const d=defFor(id),p=toWorld(d.id,d[kind]);return new THREE.Vector3(p[0],height(...p),p[1]);};
 const setProgress=(next:readonly number[])=>{
  cleared=next;
  for(const def of LEVELS){const done=cleared.includes(def.id),open=isUnlocked(def.id,cleared);const m=cores.get(def.id)!;m.color.setHex(done?0x80d9bc:open?0xffb34c:0x708483);m.emissive.copy(m.color);m.emissiveIntensity=open?2:.1;locked.get(def.id)!.visible=!open;}
 };
 setProgress([]);
 return {
  group,tile:CITY_TILE,blocked,height,position,setProgress,
  target:()=>position(currentRuinId(cleared),'archive'),
  definition:(id:number):LevelDefinition=>defFor(id),
  nearArchive:(p:THREE.Vector3):number|null=>{
   const id=levelAt(p.x,p.z);if(!id||!isUnlocked(id,cleared)||!kits.has(id))return null;
   return p.distanceTo(position(id,'archive'))<4.6?id:null;
  },
  discovery:(p:THREE.Vector3)=>{
   const id=levelAt(p.x,p.z);if(!id||!kits.has(id)||!isUnlocked(id,cleared))return null;
   const def=defFor(id),q=toWorld(id,def.discovery.at);
   return Math.hypot(p.x-q[0],p.z-q[1])<5?{id,...def.discovery}:null;
  },
  update:(elapsed:number,p:THREE.Vector3)=>{
   for(const [id,kit]of kits){const [x,z]=levelCenter(id);const near=Math.hypot(x-p.x,z-p.z)<230;kit.group.visible=near;const archive=archives.get(id)!;archive.visible=near;archive.children[1].rotation.y=elapsed*.5;archive.children[1].position.y=2+Math.sin(elapsed*1.6)*.15;}
  },
  dispose:()=>{kits.forEach(k=>k.dispose());cores.forEach(m=>m.dispose());archives.forEach(a=>{const m=a.children[3] as THREE.Mesh;m.geometry.dispose();});plane.dispose();material.dispose();stone.dispose();ground.dispose();silhouette.dispose();horizonMaterial.dispose();ringGeo.dispose();coreGeo.dispose();baseGeo.dispose();baseMat.dispose();mistGeo.dispose();mistMat.dispose();},
 };
}
