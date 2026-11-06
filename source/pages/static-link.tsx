import {useState,type ComponentProps} from 'react';
import {assetUrl,isPacked,BASE,saveDataFile} from './assets';
export function StaticLink({href,download,onClick,children,...props}:ComponentProps<'a'>){
 const [error,setError]=useState(''),[loading,setLoading]=useState(false);const packed=!!href&&isPacked(href);
 const destination=packed?BASE+'download.html?file='+encodeURIComponent(href!):href?assetUrl(href):href;
 return <><a {...props} href={destination} download={packed?undefined:download} aria-busy={loading||undefined} onClick={async event=>{
  onClick?.(event);if(event.defaultPrevented||!packed||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();setError('');setLoading(true);try{await saveDataFile(href!,typeof download==='string'?download:undefined);}catch(cause){setError((cause as Error).message);}finally{setLoading(false);}
 }}>{children}{loading?' …':''}</a>{error&&<span role="alert"> {error}</span>}</>;
}
