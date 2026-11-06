import {StaticLink} from '../pages/static-link';
'use client';
import {useEffect,useState} from 'react';
import {CheckCircle2,AlertCircle,ArrowUp} from 'lucide-react';
import SourceInventory from './source-inventory';
import ResearchSources from './research-sources';
import type {ResearchManifest} from '@/lib/research-sources';
import {catalogue,categoryLabels} from '@/lib/catalogue';
import {request,date,format} from './research-controls';
import './methodology-view.css';

const sections=[
 {id:'methodology-sources',number:'01',title:'Datenquellen',description:'Verwendete Quellen, Datenstände und Abrufumfang.'},
 {id:'methodology-research',number:'02',title:'Ergänzende Daten',description:'Quelltabellen, Archive und Statistiken mit eigenem Zeit- und Raumbezug.'},
 {id:'methodology-indicators',number:'03',title:'Indikatorenkatalog',description:'Definitionen, erforderliche Felder und Berechnungen nach Themen.'},
 {id:'methodology-history',number:'04',title:'Importverlauf',description:'Dokumentierte Abrufe und Prüfsummen zur Nachvollziehbarkeit.'},
];

function SectionHeading({index}:{index:number}){
 const section=sections[index];
 return <header className="methodology-section-header"><div className="methodology-section-heading"><span className="methodology-section-number" aria-hidden="true">{section.number}</span><div><h2 id={section.id} tabIndex={-1} className="methodology-section-title">{section.title}</h2><p>{section.description}</p></div></div><StaticLink className="methodology-back-link" href="#methodology-navigation"><ArrowUp size={13}/>Zur Übersicht</StaticLink></header>;
}

export default function MethodologyView({sources,provenance:p,researchManifest,researchLoading,researchErrors,onRetryResearch}:{sources:any[];provenance:any;researchManifest?:ResearchManifest;researchLoading?:boolean;researchErrors?:string[];onRetryResearch?:()=>void}){
 const [history,setHistory]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{request('/api/research?action=history').then(setHistory).catch(e=>setError(e.message));},[]);
 return <div className="methodology-page">
  <nav id="methodology-navigation" className="methodology-navigation" aria-label="Abschnitte in Quellen und Methodik" tabIndex={-1}><span>Auf dieser Seite</span><ol>{sections.map(section=><li key={section.id}><StaticLink href={'#'+section.id}><span aria-hidden="true">{section.number}</span>{section.title}</StaticLink></li>)}</ol></nav>
  <section className="methodology-section" aria-labelledby="methodology-sources"><SectionHeading index={0}/><SourceInventory sources={sources}/></section>
  <section className="methodology-section" aria-labelledby="methodology-research"><SectionHeading index={1}/><ResearchSources manifest={researchManifest} loading={researchLoading} errors={researchErrors} onRetry={onRetryResearch}/></section>
  <section className="methodology-section methodology-catalogue" aria-labelledby="methodology-indicators"><SectionHeading index={2}/>
   <p className="methodology-intro">Konfigurierbarer Kandidatenkatalog. AP1 bestimmt die spätere Operationalisierung. Quellenart, Berechnung und Verfügbarkeit werden unabhängig gespeichert.</p>
   <div className="methodology-indicator-groups">{Object.entries(categoryLabels).map(([category,label])=>{
    const indicators=catalogue.filter(indicator=>indicator.category===category);
    return <section className="methodology-indicator-group" key={category} aria-labelledby={'methodology-category-'+category}><div className="methodology-group-heading"><h3 id={'methodology-category-'+category}>{label}</h3><span>{indicators.length} Indikatoren</span></div><div className="methodology-indicator-list">{indicators.map(i=><details className="method-detail" key={i.id}><summary><span>{i.label}<small>{i.unit}</small></span><span className="method-version">{i.method_version}</span></summary><dl className="provenance-list">{[['Definition',i.definition],['Raumbezug',i.scope],['Zeitbezug',i.temporal_scope],['Erforderliche Felder',i.required_fields.join(', ')],['Berechnung',i.calculation],['Grenzen',i.limitations]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></details>)}</div></section>;
   })}</div>
   <section className="methodology-interpretation" aria-labelledby="methodology-interpretation-title"><h3 id="methodology-interpretation-title">Verbindliche Interpretationsgrenzen</h3><ul><li>Fahrgäste sind nicht mit allen anwesenden Personen gleichzusetzen. Planmäßige Abfahrten sind keine Personenanzahlen.</li><li>Eine kartierte Leuchte belegt weder Funktion noch Beleuchtungsstärke. Bildhelligkeit ist kein Lux-Wert.</li><li>Ein Foto kann keinen Geruch feststellen. Graffiti ist kein automatisch validiertes Gefahrenmaß.</li><li>Die Lage einer Polizei- oder Sicherheitsdienststelle belegt keine sichtbare Präsenz.</li><li>Fehlende Einträge beweisen keine Abwesenheit. Ein aktueller Download ist keine aktuelle Beobachtung.</li><li>Deutschlandwerte bewerten keinen einzelnen Bahnhof; Wohnbevölkerung ist keine Stationsfrequenz.</li></ul></section>
  </section>
  <section className="methodology-section" aria-labelledby="methodology-history"><SectionHeading index={3}/>
   <div className="history-panel"><div className="methodology-group-heading"><h3>Nachvollziehbare Datenimporte</h3><span>Prüfsummen: SHA-256</span></div>
    <article className="history-row"><CheckCircle2 size={19}/><div><strong>DB InfraGO OpenStation · {format(p.station_count)} Stationen</strong><p>Abruf {date(p.retrieved_at)} · Quelldatenstand {date(p.publication_time)}</p><code>{p.source_sha256}</code></div><span className="status available">Erfolgreich</span></article>
    {error&&<p role="alert" className="panel-footnote">{error}</p>}
    {history.map(h=><article className="history-row" key={h.id}>{h.status==='success'?<CheckCircle2 size={19}/>:<AlertCircle size={19}/>}<div><strong>{h.source} · {h.station_id}</strong><p>{date(h.created_at)}</p><details><summary>Importdetails</summary><pre>{JSON.stringify(JSON.parse(h.details),null,2)}</pre></details></div><span className={'status '+(h.status==='success'?'available':'missing')}>{h.status==='success'?'Erfolgreich':'Nicht verfügbar'}</span></article>)}
    <p className="panel-footnote">Diese statische Ausgabe enthält gespeicherte Quellsnapshots mit dokumentierten Prüfsummen. Der Importverlauf beschreibt den veröffentlichten Datenbestand; ein neuer Abruf erfordert eine neue Website-Ausgabe.</p>
   </div>
  </section>
 </div>;
}
