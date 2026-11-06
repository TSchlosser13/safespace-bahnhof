import policy from '@/data/retention-policy.json';
export const retentionPolicy=policy;
export const latestReferenceSnapshot=(source:string)=>policy.latestReferenceSnapshots.scope.includes(source);
export const retentionStart=policy.startDate;
export const retentionEnd=policy.endDate;
export const timetableStart=policy.timetable.startDate;
export const timetableEnd=policy.timetable.endDate;
export const retainedDate=(date:string|null|undefined)=>{
 if(!date||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date))return false;
 const day=date.slice(0,10),stamp=Date.parse(day+'T00:00:00Z');
 return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===day&&day>=retentionStart&&day<=retentionEnd;
};
export const retainedYear=(date:string)=>policy.years.includes(Number(date.slice(0,4)));
export function assertRetainedWindow(date:string,end:number){
 const finalDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(end-1));
 if(date<retentionStart||date>retentionEnd||finalDay>retentionEnd)throw Error(`Verfügbarer Zeitraum: 01.01.2024 bis ${retentionEnd.split('-').reverse().join('.')}.`);
}
