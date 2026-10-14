/** Local deterministic color-contrast calculator using WCAG 2.2 relative luminance. */
export function parseHex(raw){
  const value=String(raw??"").trim();
  const match=/^#?([a-f0-9]{3}|[a-f0-9]{6})$/i.exec(value);
  if(!match)throw new TypeError("Use #RGB or #RRGGBB.");
  let s=match[1].toLowerCase();
  if(s.length===3)s=[...s].map(c=>c+c).join("");
  return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));
}
export function hex(rgb){
  if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(x=>!Number.isInteger(x)||x<0||x>255))throw new TypeError("Expected three 8-bit color channels.");
  return "#"+rgb.map(x=>x.toString(16).padStart(2,"0")).join("").toUpperCase();
}
export function luminance(color){
  const rgb=typeof color==="string"?parseHex(color):color;
  if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(x=>!Number.isFinite(x)||x<0||x>255))throw new TypeError("Invalid RGB color.");
  const linear=rgb.map(v=>{const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
}
export function contrastRatio(a,b){
  const l1=luminance(a),l2=luminance(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}
export function thresholds(ratio){
  if(!Number.isFinite(ratio)||ratio<1||ratio>21.001)throw new RangeError("Contrast ratio is out of range.");
  return {AA_normal:ratio>=4.5,AA_large:ratio>=3,AAA_normal:ratio>=7,AAA_large:ratio>=4.5};
}
export function sampleRGBA(data){
  if(!data||data.length<4)throw new TypeError("RGBA sample missing.");
  const a=data[3]/255;
  return [0,1,2].map(i=>Math.round(data[i]*a+255*(1-a)));
}
