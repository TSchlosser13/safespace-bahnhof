'use client';
import type {CSSProperties} from 'react';
import {ArrowRight,RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Progress} from '@/components/ui/progress';
import {StationIcon} from './station-icon';
import WelcomeTrain from './welcome-train';
import WelcomeStation from './welcome-station';
import './startup-loading.css';

type Props={progress?:number;message?:string;error?:string;ready?:boolean;onRetry?:()=>void;onEnter?:()=>void};

export default function StartupLoading({progress=0,message='Stationsdaten werden geladen …',error,ready=false,onRetry,onEnter}:Props) {
 const complete=ready&&!error;
 const percent=complete?100:Math.round(Math.min(99,Math.max(0,Number.isFinite(progress)?progress:0)));
 const state=error?'error':complete?'ready':'loading';
 const status=error?'Laden unterbrochen':complete?'Bereit für die Bahnhofsauswahl.':message;

 return <main className="startup-screen" data-state={state}>
  <section className="startup-welcome" aria-labelledby="startup-title">
   <div className="startup-composition">
    <WelcomeStation side="left"/>
    <header className="startup-heading">
     <div className="startup-brand" aria-label="Safespace Bahnhof"><span className="startup-brand-icon" aria-hidden="true"><StationIcon size={42}/></span><span>Safespace<strong>Bahnhof</strong></span></div>
     <div className="startup-welcome-copy"><span className="startup-eyebrow">Willkommen</span><h1 id="startup-title">Bahnhöfe <span className="startup-title-line">im Kontext.</span></h1></div>
    </header>
    <WelcomeStation side="right"/>
   </div>
   <div className="startup-journey">
    <div className="startup-rail-row">
     <div className="startup-route">
      <Progress value={percent} max={100} className="startup-track" style={{'--loaded':`${percent}%`} as CSSProperties} aria-label="Ladefortschritt" aria-describedby={error?'startup-status startup-error':'startup-status'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent} Prozent${complete?' · bereit':''}`} aria-busy={!complete&&!error}/>
      <div className="startup-train-run" aria-hidden="true"><div className="startup-train"><WelcomeTrain/></div></div>
     </div>
     <span className="startup-percentage" aria-hidden="true">{percent}<small>%</small></span>
    </div>
   </div>
   <div className="startup-loading-controls">
    <p id="startup-status" className="startup-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
    <div className="startup-actions"><Button type="button" className="startup-enter" disabled={!complete} onClick={onEnter}>Zur Bahnhofsauswahl<ArrowRight size={16} aria-hidden="true"/></Button></div>
    {error&&<div className="startup-recovery"><p id="startup-error" className="startup-error" role="alert">{error}</p>{onRetry&&<Button type="button" variant="outline" className="startup-retry" onClick={onRetry}><RefreshCw size={14} aria-hidden="true"/>Erneut versuchen</Button>}</div>}
   </div>
  </section>
 </main>;
}
