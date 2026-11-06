'use client';
import {useEffect,useState} from 'react';
import {shortDate} from '@/lib/freshness';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Choice} from './research-controls';
import {timeBounds,type TimeWindow} from '@/lib/integration';
import {assertRetainedWindow,retentionStart,retentionEnd,timetableStart,timetableEnd} from '@/lib/retention';
export default function TimeControls({value,onChange}:{value:TimeWindow;onChange:(w:TimeWindow)=>void}){
 const [draft,setDraft]=useState(value),[error,setError]=useState('');useEffect(()=>setDraft(value),[value]);
 return <form className="integration-timebar panel" onSubmit={e=>{e.preventDefault();try{const bounds=timeBounds(draft);assertRetainedWindow(draft.date,bounds.end);setError('');onChange(draft);}catch(e){setError((e as Error).message);}}}>
 <label title="Wetter: 01.01.2024–31.08.2026. Fahrplan: nur 01.–31.08.2026. Ausstattung und Karten behalten ihren eigenen Quellenstand.">Datum<Input aria-label="Analysedatum" type="date" min={retentionStart} max={retentionEnd} required value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label>
 <label>Von<Input aria-label="Beginn des Zeitfensters" type="time" required value={draft.start} onChange={e=>setDraft({...draft,start:e.target.value})}/></label>
 <label>Bis<Input aria-label="Ende des Zeitfensters" type="text" required pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" value={draft.end} onChange={e=>setDraft({...draft,end:e.target.value})}/></label>
 <Choice label="Fahrplan-Verkehrsmittel" value={draft.mode} onChange={v=>setDraft({...draft,mode:v as TimeWindow['mode']})} items={[["rail","Eisenbahn"],["all","Alle Verkehrsmittel"]]}/>
 <Button variant="outline" size="sm" type="submit">Anwenden</Button><span className="timebar-note">Wetter bis {shortDate(retentionEnd)} · Europe/Berlin<br/>Fahrplan: {shortDate(timetableStart)}–{shortDate(timetableEnd)}</span>{error&&<span role="alert">{error}</span>}
 </form>;
}
