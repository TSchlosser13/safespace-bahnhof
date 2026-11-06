// A compact two-car regional railcar, with a driving cab at either end.
function RegionalCar() {
 return <>
  <path d="M17 21h169c5 0 8 4 8 9v49H8V45l4-18c1-4 2-6 5-6Z" fill="#d9293b" stroke="#8e3440" strokeWidth="1.3"/>
  <path d="M17 16h168c5 0 8 4 9 10H11l2-6c1-3 2-4 4-4Z" fill="#d6dbde" stroke="#88939b" strokeWidth="1.2"/>
  <path d="M22 18h158" stroke="#eff1f2" strokeWidth="1.5"/>
  <path d="M16 31h17v20H12V45l4-14Z" fill="#293b49" stroke="#f0e9e6" strokeWidth="1.2"/>
  <path d="m18 34-3 13h5l3-13Z" fill="#5c7483"/>
  <path d="M39 28v44" stroke="#a92333" strokeWidth="1.2"/>
  <rect x="45" y="29" width="15" height="46" rx="1.5" fill="#e9e5dc" stroke="#943c45" strokeWidth="1"/>
  <rect x="48" y="33" width="9" height="19" rx="1" fill="#304553"/>
  <path d="M55 58h2" stroke="#66727a" strokeWidth="1.4" strokeLinecap="round"/>
  {[70,100,130].map(x=><g key={x}>
   <rect x={x} y="32" width="23" height="20" rx="1.4" fill="#283d4b" stroke="#eee7e2" strokeWidth="1.2"/>
   <path d={`M${x+3} 35h17v3h-17Z`} fill="#5b7281"/>
  </g>)}
  <rect x="162" y="29" width="22" height="46" rx="1.5" fill="#e9e5dc" stroke="#943c45" strokeWidth="1"/>
  <path d="M173 30v44" stroke="#9b9d99" strokeWidth="1"/>
  <rect x="165" y="33" width="6" height="19" rx=".7" fill="#304553"/>
  <rect x="175" y="33" width="6" height="19" rx=".7" fill="#304553"/>
  <path d="M169 58h2m4 0h2" stroke="#66727a" strokeWidth="1.3" strokeLinecap="round"/>
  <path d="M9 68h34m19 0h98m26 0h7" stroke="#f0e7df" strokeWidth="2.6"/>
  <path d="M11 60h7" stroke="#f4dba7" strokeWidth="3" strokeLinecap="round"/>
  <path d="M9 76h184v9H15l-6-9Z" fill="#48535c"/>
  <path d="M46 78h13m104 0h20" stroke="#afb7bd" strokeWidth="2"/>
  <rect x="73" y="83" width="54" height="6" rx="1" fill="#5d6972"/>
  <path d="M83 84v4m8-4v4m8-4v4m8-4v4m8-4v4" stroke="#424d56" strokeWidth="1.1"/>
  <path d="M85 17h30" stroke="#a2adb5" strokeWidth="2.2" strokeLinecap="round"/>
 </>;
}

export default function WelcomeTrain() {
 return <svg className="startup-train-object" viewBox="0 0 400 96" fill="none" aria-hidden="true" focusable="false">
  <g strokeLinejoin="round">
   <path d="M192 33h16v42h-16Z" fill="#4b5660"/>
   <path d="M197 35v38m6-38v38" stroke="#929ca5" strokeWidth="1.3"/>
   <path d="M190 80h20" stroke="#34414b" strokeWidth="3"/>
   <g data-train-carriage="rear"><RegionalCar/></g>
   <g data-train-carriage="front" transform="translate(400 0) scale(-1 1)"><RegionalCar/></g>
   {[23,153,221,351].map(x=><rect key={x} x={x} y="82" width="26" height="9" rx="3" fill="#34414b"/>)}
  </g>
  {[29,43,159,173,227,241,357,371].map(x=><g data-train-wheel key={x} className="startup-train-wheel">
   <circle cx={x} cy="90" r="6" fill="#26323c"/>
   <circle cx={x} cy="90" r="3.2" stroke="#b9c2c9" strokeWidth="1.2"/>
   <path d={`M${x-2.5} 90h5m-2.5-2.5v5`} stroke="#b9c2c9" strokeWidth=".9"/>
  </g>)}
 </svg>;
}
