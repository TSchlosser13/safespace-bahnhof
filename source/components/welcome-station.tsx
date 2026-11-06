import type {ReactNode} from 'react';

type PartName='platform'|'entrance'|'canopy'|'lamp'|'bench'|'tree';
function Part({name,children}:{name:PartName;children:ReactNode}){
 return <g className="startup-shape" data-station-part={name}>{children}</g>;
}

function Clock({x,y}:{x:number;y:number}){
 return <g transform={`translate(${x} ${y})`}>
  <circle r="12" fill="#fffdf5" stroke="#62716e" strokeWidth="1.5"/>
  <path className="startup-station-detail" d="M0-9v2m9 7H7m-7 9V7m-9-7h2" stroke="#89958b" strokeWidth="1.5"/>
  <path d="M0-6v6l5 3" stroke="#a8584a" strokeWidth="2"/>
  <circle r="1.5" fill="#62716e"/>
 </g>;
}

function Window({x,y,width=28,height=29}:{x:number;y:number;width?:number;height?:number}){
 return <g>
  <rect x={x} y={y} width={width} height={height} rx="1" fill="#d5e2e3" stroke="#879c99" strokeWidth="1.5"/>
  <path className="startup-station-detail" d={`M${x+width/2} ${y+1}v${height-2}M${x+1} ${y+height/2}h${width-2}`} stroke="#fbfaf3" strokeWidth="2"/>
  <path d={`M${x-2} ${y+height+2}h${width+4}`} stroke="#b8b4a5" strokeWidth="2"/>
 </g>;
}

function Timetable({x,y}:{x:number;y:number}){
 return <g transform={`translate(${x} ${y})`}>
  <rect width="26" height="36" rx="1.5" fill="#697d7b"/>
  <rect x="3" y="7" width="20" height="26" fill="#fffaf0"/>
  <path d="M6 13h13M6 20h13M6 27h8" stroke="#a1afa7" strokeWidth="1.5"/>
  <path className="startup-station-detail" d="M12 11v18" stroke="#d4d8cc" strokeWidth="1.5"/>
  <path className="startup-station-detail" d="M6 4h14" stroke="#e6ece5" strokeWidth="1.5"/>
 </g>;
}

function Bench({x,y}:{x:number;y:number}){
 return <g transform={`translate(${x} ${y})`}>
  <path d="M3 2h39v5H3zM3 9h39v4H3z" fill="#ad7c62"/>
  <path d="M1 17h44" stroke="#846653" strokeWidth="3"/>
  <path d="M7 5v22m30-22v22" stroke="#6d7f78" strokeWidth="2"/>
  <path className="startup-station-detail" d="M3 14v5m39-5v5" stroke="#6d7f78" strokeWidth="2"/>
 </g>;
}

// Two detailed local stations, built from six static scene groups each.
export default function WelcomeStation({side}:{side:'left'|'right'}){
 const left=side==='left';
 return <div className={'startup-shapes startup-shapes-'+side} aria-hidden="true"><svg className="startup-station-object" viewBox="0 0 280 220" fill="none" strokeLinecap="round" strokeLinejoin="round" focusable="false">
  <Part name="platform">
   <path d="M7 198h266v13H7z" fill="#d7ddd4"/>
   <path d="M7 198h266" stroke="#74867d" strokeWidth="2"/>
   <path d="M11 203h258" stroke="#f9f7e9" strokeWidth="3"/>
   <path className="startup-station-detail" d="M17 207h246" stroke="#a5b3a8" strokeWidth="1.5" strokeDasharray="4 6"/>
   <path className="startup-station-detail" d="M8 213h264" stroke="#e7e9df" strokeWidth="3"/>
  </Part>
  <Part name="entrance">
   {left?<>
    <path d="M50 77h125v120H50z" fill="#f1e9da" stroke="#b5b2a1" strokeWidth="1.5"/>
    <path d="M50 187h125v10H50z" fill="#c8b9a3"/>
    <path className="startup-station-detail" d="M54 80v105m117-105v105" stroke="#e2d6c4" strokeWidth="3"/>
    <path d="M50 126h125" stroke="#d9cbb7" strokeWidth="3"/>
    <Window x={65} y={91} width={25} height={26}/>
    <Window x={135} y={91} width={25} height={26}/>
    <Clock x={112} y={99}/>
    <rect x="66" y="133" width="93" height="13" rx="1.5" fill="#526f76"/>
    <path d="M81 139.5h62" stroke="#f5f5e9" strokeWidth="2" strokeLinecap="round"/>
    <Window x={65} y={154} width={37} height={25}/>
    <path d="M121 153h34v44h-34z" fill="#a7b9ac" stroke="#70867b" strokeWidth="1.5"/>
    <path d="M127 159h22v27h-22z" fill="#dbe6dd"/>
    <path className="startup-station-detail" d="M138 159v27" stroke="#f6f3e7" strokeWidth="1.5"/>
    <path className="startup-station-detail" d="M147 179v6" stroke="#60766d" strokeWidth="2"/>
    <path d="M117 196h42" stroke="#aea38e" strokeWidth="3"/>
    <path d="M177 118h53v79h-53z" fill="#e5ece5" stroke="#a5b7aa" strokeWidth="1.5"/>
    <path d="M179 123h47v48h-47z" fill="#d8e3dc"/>
    <path className="startup-station-detail" d="M219 123v48" stroke="#b5c6ba" strokeWidth="1.5"/>
    <Timetable x={187} y={130}/>
   </>:<>
    <path d="m91 99 65-64 65 64v98H91z" fill="#e7ece1" stroke="#a5b3a1" strokeWidth="1.5"/>
    <path d="M91 186h130v11H91z" fill="#bdc9b8"/>
    <path className="startup-station-detail" d="M95 102v80m122-80v80" stroke="#d3decd" strokeWidth="3"/>
    <path d="M101 97h111" stroke="#ccd7c5" strokeWidth="2"/>
    <Clock x={156} y={78}/>
    <rect x="105" y="108" width="103" height="14" rx="1.5" fill="#526f76"/>
    <path d="M122 115h69" stroke="#f5f5e9" strokeWidth="2" strokeLinecap="round"/>
    <Window x={101} y={136} width={28} height={31}/>
    <Window x={185} y={136} width={27} height={31}/>
    <path d="M143 134h32v63h-32z" fill="#b7c4ad" stroke="#7e947e" strokeWidth="1.5"/>
    <path d="M149 141h20v39h-20z" fill="#dce6da"/>
    <path className="startup-station-detail" d="M159 142v37" stroke="#faf8ed" strokeWidth="1.5"/>
    <path className="startup-station-detail" d="M165 179v7" stroke="#647f6b" strokeWidth="2"/>
    <path d="M139 196h40" stroke="#a4b299" strokeWidth="3"/>
    <path d="M39 124h50v73H39z" fill="#e4ebe2" stroke="#a5b7aa" strokeWidth="1.5"/>
    <path d="M43 128h42v45H43z" fill="#d5e2d9"/>
    <Timetable x={51} y={133}/>
   </>}
  </Part>
  <Part name="canopy">
   {left?<>
    <path d="M69 25h13v42H69z" fill="#c3a78d" stroke="#947d65" strokeWidth="1.5"/>
    <path d="M66 25h19" stroke="#8f785e" strokeWidth="3"/>
    <path d="m39 77 73-53 74 53v7H39z" fill="#b67f68" stroke="#8c6956" strokeWidth="1.5"/>
    <path className="startup-station-detail" d="m51 76 61-44 62 44M70 69h84M85 57h53" stroke="#d0a186" strokeWidth="1.5"/>
    <path className="startup-station-detail" d="m94 43-9 14m28-25v25m17-14 9 14M77 58 64 76m32-18-5 18m22-18v18m17-18 5 18m15-18 13 18" stroke="#c59579" strokeWidth="1.5"/>
    <path d="M38 84h149" stroke="#7f6451" strokeWidth="3"/>
    <path d="M168 108h62l9 11h-71z" fill="#8b9e8e" stroke="#657e6c" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M174 121v76m59-76v76" stroke="#8ca290" strokeWidth="3"/>
    <path d="M178 121h49" stroke="#fff0ce" strokeWidth="2"/>
    <path className="startup-station-detail" d="m231 120-10 11" stroke="#8ca290" strokeWidth="2"/>
   </>:<>
    <path d="M191 26h13v47l-13-12z" fill="#c0c9b5" stroke="#81937d" strokeWidth="1.5"/>
    <path d="M188 26h19" stroke="#7d907a" strokeWidth="3"/>
    <path d="m81 99 75-75 76 75v7l-76-70-75 70z" fill="#819887" stroke="#647d6b" strokeWidth="1.5"/>
    <path className="startup-station-detail" d="m90 97 66-66 67 66" stroke="#a6b6a4" strokeWidth="1.5"/>
    <path d="M35 113h62v11H29z" fill="#98aa95" stroke="#657e6c" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M34 127v70m56-70v70" stroke="#8ca290" strokeWidth="3"/>
    <path d="M41 126h42" stroke="#fff0ce" strokeWidth="2"/>
    <path className="startup-station-detail" d="m36 126 10 11" stroke="#8ca290" strokeWidth="2"/>
   </>}
  </Part>
  <Part name="lamp">
   <g transform={`translate(${left?251:20} 0)`}>
    <path d="M0 196V86" stroke="#6d8078" strokeWidth="3"/>
    <path d="M-9 73H9L7 91H-7z" fill="#f7e8bd" stroke="#6d8078" strokeWidth="1.5"/>
    <path d="m-12 73 12-8 12 8z" fill="#6d8078"/>
    <path className="startup-station-detail" d="M0 77v10" stroke="#fff6d6" strokeWidth="2"/>
    <path d="M-5 196H5" stroke="#6d8078" strokeWidth="3" strokeLinecap="round"/>
   </g>
  </Part>
  <Part name="bench">
   <Bench x={left?184:41} y={170}/>
   <g transform={`translate(${left?66:185} 0)`} stroke="#728b7b" strokeWidth="1.5">
    <circle cx="7" cy="189" r="8"/>
    <circle cx="36" cy="189" r="8"/>
    <path d="m7 189 9-15 9 15H7l14-11h11l4 11m-15-11-3-7m-4 0h8m10 7 2-8h5"/>
    <circle className="startup-station-detail" cx="25" cy="189" r="1.5" fill="#728b7b" stroke="none"/>
   </g>
  </Part>
  <Part name="tree">
   {left?<>
    <path d="M23 150v47" stroke="#899d80" strokeWidth="3"/>
    <path d="M7 138c0-17 6-42 16-53 11 12 18 37 18 53 0 19-7 31-18 31S7 157 7 138Z" fill="#b3c8a9"/>
    <path className="startup-station-detail" d="M23 111v61m0-31-9-12m9 26 11-16" stroke="#97b192" strokeWidth="1.5"/>
    <path d="M9 188h27l-3 10H12z" fill="#b8aa8e"/>
    <path d="M8 188h29" stroke="#a09176" strokeWidth="2"/>
   </>:<>
    <path d="M254 145v52" stroke="#899d80" strokeWidth="3"/>
    <path d="M235 133c0-26 8-48 19-48 12 0 20 22 20 48 0 21-8 36-20 36-11 0-19-15-19-36Z" fill="#b3c8a9"/>
    <path className="startup-station-detail" d="M254 110v63m0-31-10-14m10 28 11-16" stroke="#97b192" strokeWidth="1.5"/>
    <path d="M239 188h30l-3 10h-24z" fill="#b8aa8e"/>
    <path d="M238 188h32" stroke="#a09176" strokeWidth="2"/>
   </>}
  </Part>
 </svg></div>;
}
