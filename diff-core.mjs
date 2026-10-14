/**
 * FRACTURE measurement core. No DOM, dependencies, uploads, or external APIs.
 * Notes: pixel counts are measurements of pixel values, NOT correctness judgments.
 */
export function pixelDifference(before, after, threshold=32){
  if(!(before instanceof Uint8ClampedArray)||!(after instanceof Uint8ClampedArray)) throw new TypeError("Expected Uint8ClampedArray pixel data");
  if(before.length!==after.length || before.length%4!==0) throw new RangeError("Image buffers must have identical nonzero RGBA dimensions");
  if(!before.length) throw new RangeError("Cannot compare empty images");
  const limit=Math.min(255,Math.max(0,Math.round(Number.isFinite(+threshold)?+threshold:32)));
  const mask=new Uint8ClampedArray(before.length);
  let changed=0, maxDelta=0;
  for(let i=0;i<before.length;i+=4){
    // Compare composited colors against white to handle transparency consistently.
    const a=before[i+3]/255,b=after[i+3]/255;
    const r=Math.abs((before[i]*a+255*(1-a))-(after[i]*b+255*(1-b)));
    const g=Math.abs((before[i+1]*a+255*(1-a))-(after[i+1]*b+255*(1-b)));
    const bl=Math.abs((before[i+2]*a+255*(1-a))-(after[i+2]*b+255*(1-b)));
    const d=Math.max(r,g,bl); maxDelta=Math.max(maxDelta,d);
    if(d>limit){ changed++; mask[i]=236;mask[i+1]=94;mask[i+2]=57;mask[i+3]=212; }
  }
  const total=before.length/4;
  return {changed,total,ratio:changed/total,percent:changed/total*100,threshold:limit,maxDelta,mask};
}
export function formatPercent(n){ return Number.isFinite(n)?n.toFixed(n>=10?1:2)+"%":"—"; }
export function escapeMarkdown(s){return String(s??"").replace(/([\\`*_{}\[\]()#+.!|>~-])/g,"\\$1").replace(/\r/g,"").slice(0,1200);}
export function makeReportMarkdown({title,context,notes,metrics,beforeName,afterName}){
  const lines=[`# ${escapeMarkdown(title||"Visual comparison")}`,"","> FRACTURE visual inspection. This report describes observations, not proof that a change is correct.","",
  `- Before: ${escapeMarkdown(beforeName||"not supplied")}`,`- After: ${escapeMarkdown(afterName||"not supplied")}`];
  if(metrics&&metrics.compatible){
    lines.push(`- Pixel difference: ${formatPercent(metrics.percent)} (${metrics.changed.toLocaleString("en-US")} / ${metrics.total.toLocaleString("en-US")} sampled pixels, threshold ${metrics.threshold} of 255)`);
  }else lines.push("- Pixel difference: unavailable (both images must have identical dimensions).");
  lines.push("","## Context",String(context||"Not provided.").replace(/\r/g,"").slice(0,600),"","## Annotated observations");
  if(!notes?.length)lines.push("- No annotations recorded.");
  else notes.forEach((n,i)=>{lines.push(`${i+1}. **Pin ${i+1}** at ${Math.round(n.x*100)}% × ${Math.round(n.y*100)}%: ${String(n.text||"Unspecified observation").replace(/\r?\n/g," ").slice(0,400)}`);});
  lines.push("","## Review limits","- A pixel difference is not a functional or accessibility test.","- This tool does not verify repository changes, tests, or production deployment.","- Screenshots and exported files are processed locally in your browser.");
  return lines.join("\n");
}
export function fitInside(width,height,x,y,w,h){
  if(!(width>0&&height>0&&w>0&&h>0))return {x,y,width:0,height:0};
  const scale=Math.min(w/width,h/height);const fw=width*scale,fh=height*scale;
  return {x:x+(w-fw)/2,y:y+(h-fh)/2,width:fw,height:fh};
}
