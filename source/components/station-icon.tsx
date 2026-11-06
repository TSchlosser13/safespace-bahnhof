import type {SVGProps} from 'react';

export function StationIcon({size=24,...props}:SVGProps<SVGSVGElement>&{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
  <g transform="translate(-2.55 -1.2) scale(.9)">
  <rect x="20" y="3" width="19" height="22" rx="4"/>
  <path d="M23 8h13v7H23zM29.5 8v7M23 25l-2 3m15-3 2 3"/>
  <circle cx="23.5" cy="21.5" r="1" fill="currentColor" stroke="none"/>
  <circle cx="35.5" cy="21.5" r="1" fill="currentColor" stroke="none"/>
  <g strokeWidth=".9">
   <rect x="26" y="18" width="7" height="4.5" rx=".6"/>
   <path d="M27.5 19.1v2.3h.6c1.1 0 1.1-2.3 0-2.3h-.6Zm2.6 0v2.3h.8c1 0 1-1.2 0-1.2h-.8m.8 0c1 0 1-1.1 0-1.1h-.8"/>
  </g>
  </g>
  <g transform="translate(0 3)">
  <path d="M3 31h7v12H3M10 33l6-4c1.8-1.2 3.8-1.3 5.8-.3l5 2.8H31a2 2 0 0 1 0 4h-9"/>
  <path d="M10 40l7 3h10c2.7 0 4.5-.8 6.5-2.5l9-9c2-2-.5-5-2.8-3.3L33 33"/>
  </g>
 </svg>;
}
