import { useState } from 'react';
import { RUIN_SEQUENCE } from '../ruins';
import { currentRuinId,isUnlocked } from '../progression';
import { levelCenter } from './layout';

export function WorldAtlas({cleared,currentLocation,onSelect}:{cleared:readonly number[];currentLocation:number;onSelect:(id:number)=>void}) {
 const [selected,setSelected]=useState(currentRuinId(cleared));
 const selectedRuin=RUIN_SEQUENCE.find(r=>r.id===selected)!;
 const point=(id:number)=>{const [x,z]=levelCenter(id);return [x+300,z+260];};
 return <section className="city-atlas" aria-label="City travel map">
  <svg viewBox="0 0 600 550" role="img" aria-label="Twenty places connected in archive order">
   <rect width="600" height="550" rx="16" fill="#142c2c"/>
   <path d={`M${RUIN_SEQUENCE.map(r=>point(r.id).join(',')).join(' L')}`} fill="none" stroke="#ad996a" strokeWidth="3" strokeDasharray="5 7"/>
   {RUIN_SEQUENCE.map(r=>{const [x,y]=point(r.id),done=cleared.includes(r.id),open=isUnlocked(r.id,cleared);return <g key={r.id}>
    <rect x={x-48} y={y-43} width="96" height="86" rx={r.id%3===0?24:5} fill={done?'#325f50':open?'#655039':'#203736'} stroke={selected===r.id?'#f1c986':'#4f6560'} strokeWidth={selected===r.id?3:1}/>
    <text x={x} y={y} textAnchor="middle" fill={open?'#f3deb4':'#778984'} fontSize="21">{open?String(r.id).padStart(2,'0'):'🔒'}</text>
    {r.id===currentLocation&&<><circle cx={x} cy={y+18} r="4" fill="#8ae0c2"/><text x={x} y={y+34} textAnchor="middle" fontSize="8" fill="#8ae0c2">YOU ARE HERE</text></>}
   </g>;})}
  </svg>
  <div className="city-map-buttons">{RUIN_SEQUENCE.map(r=><button key={r.id} disabled={!isUnlocked(r.id,cleared)} aria-pressed={selected===r.id} onClick={()=>setSelected(r.id)} aria-label={`${r.place}${!isUnlocked(r.id,cleared)?' · Locked':''}`} title={r.place}>{cleared.includes(r.id)?'✓ ':''}{String(r.id).padStart(2,'0')}</button>)}</div>
  <div className="city-map-detail"><div><span className="eyebrow">AREA {String(selected).padStart(2,'0')}</span><h3>{selectedRuin.place}</h3><p>{cleared.includes(selected)?'Restored. Travel to the entrance and approach its amber to revisit.':'Your next destination. Follow the amber trail through the city.'}</p></div><button className="primary-button" onClick={()=>onSelect(selected)}>{cleared.includes(selected)?'Travel here':'Follow route'}</button></div>
 </section>;
}
