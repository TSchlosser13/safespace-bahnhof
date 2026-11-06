'use client';

import {useId} from 'react';
import {Check,ChevronDown} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';
import './station-category-filter.css';

type Props={categories:number[];onChange:(categories:number[])=>void;className?:string};
const categoryNumbers=[1,2,3,4,5,6,7];
function compactCategories(categories:number[]){
  if(categories.length<4)return categories.join(', ');
  const parts:string[]=[];
  for(let index=0;index<categories.length;index++){
    const start=categories[index];let end=start;
    while(categories[index+1]===end+1){index++;end=categories[index];}
    if(end-start>=2)parts.push(`${start}–${end}`);
    else if(end!==start)parts.push(String(start),String(end));
    else parts.push(String(start));
  }
  return parts.join(', ');
}

export default function StationCategoryFilter({categories,onChange,className}:Props){
  const id=useId();
  const selected=categoryNumbers.filter(category=>categories.includes(category));
  const all=selected.length===0;
  const summary=all?'Alle Kategorien':selected.length===1?`Kategorie ${selected[0]}`:`Kategorien ${compactCategories(selected)}`;
  const fullSummary=all?'Alle Kategorien':selected.length===1?`Kategorie ${selected[0]}`:`Kategorien ${selected.join(', ')}`;

  function toggle(category:number,checked:boolean){
    onChange(checked?[...selected.filter(value=>value!==category),category].sort((a,b)=>a-b):selected.filter(value=>value!==category));
  }

  return <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" className={cn('station-category-trigger border-input transition-[color,box-shadow]',className)} data-slot="station-category-trigger" aria-label="Stationskategorien" aria-description={fullSummary} title={fullSummary}>
        <span>{summary}</span><ChevronDown size={14} aria-hidden="true"/>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" sideOffset={6} collisionPadding={12} className="station-category-popover" aria-labelledby={id+'-title'}>
      <div className="station-category-heading"><h2 id={id+'-title'}>DB-Stationskategorien</h2><span>Mehrfachauswahl</span></div>
      <Button type="button" variant="ghost" size="sm" className="station-category-all" disabled={all} onClick={()=>onChange([])}>
        <span>Alle Kategorien</span>{all&&<Check size={14} aria-hidden="true"/>}
      </Button>
      <fieldset className="station-category-options"><legend className="sr-only">Einzelne Stationskategorien auswählen</legend>
        {categoryNumbers.map(category=><label className="station-category-option" htmlFor={id+'-'+category} key={category}>
          <Checkbox id={id+'-'+category} checked={selected.includes(category)} onCheckedChange={checked=>toggle(category,checked===true)}/>
          <span>Kategorie {category}</span>
        </label>)}
      </fieldset>
    </PopoverContent>
  </Popover>;
}
