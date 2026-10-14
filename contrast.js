import {parseHex,hex,contrastRatio,thresholds,sampleRGBA} from "./contrast-core.mjs";
import {fitInside} from "./diff-core.mjs";

const $=id=>document.getElementById(id);
const W=1000,H=600,MAX_BYTES=18*1024*1024;
let asset=null,active="foreground",objectUrl=null,currentRatio=null;
let marks={foreground:null,background:null};
const colors={foreground:"#20251F",background:"#F4F0E8"};
const canvas=$("sampleCanvas"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const shortName=name=>String(name).slice(0,76);
function message(text){$("contrastToast").textContent=text;}
function setActive(which){
  active=which;
  for(const [color,id] of [["foreground","selectFg"],["background","selectBg"]]){
    const selected=color===active;$(id).classList.toggle("picked",selected);$(id).setAttribute("aria-pressed",String(selected));
  }
  $("sampleSurface").setAttribute("aria-label","Sample "+active+" color from the screenshot; Enter samples its center");
}
function imageBox(){return asset?fitInside(asset.w,asset.h,0,0,W,H):null;}
function paint(){
  ctx.fillStyle="#3b4038";ctx.fillRect(0,0,W,H);
  if(asset){const b=imageBox();ctx.drawImage(asset.img,b.x,b.y,b.width,b.height);}
  $("surfaceEmpty").style.display=asset?"none":"block";
  for(const [slot,id] of [["foreground","fgMark"],["background","bgMark"]]){
    const el=$(id),p=marks[slot],b=imageBox();
    el.hidden=!asset||!p;
    if(p&&b){el.style.left=((b.x+p.u*b.width)/W*100)+"%";el.style.top=((b.y+p.v*b.height)/H*100)+"%";}
  }
}
function recheck(){
  try{
    const a=parseHex($("foregroundHex").value),b=parseHex($("backgroundHex").value);
    const fg=hex(a),bg=hex(b);
    colors.foreground=fg;colors.background=bg;
    $("foregroundSwatch").style.background=fg;$("backgroundSwatch").style.background=bg;
    $("previewColor").style.color=fg;$("previewColor").style.background=bg;
    const ratio=contrastRatio(a,b),flags=thresholds(ratio);currentRatio=ratio;
    $("ratioValue").textContent=ratio.toFixed(2)+":1";
    for(const [flag,id] of [["AA_normal","aaNormal"],["AA_large","aaLarge"],["AAA_normal","aaaNormal"],["AAA_large","aaaLarge"]]){
      const el=$(id);el.textContent=flags[flag]?"MEETS":"BELOW";el.classList.toggle("good",flags[flag]);el.classList.toggle("bad",!flags[flag]);
    }
    $("colorStatus").textContent="Calculated from these two colors only. Text size and underlying CSS values are not verified.";
  }catch(e){
    currentRatio=null;$("ratioValue").textContent="—";$("colorStatus").textContent="Enter a valid #RGB or #RRGGBB pair.";
    for(const id of ["aaNormal","aaLarge","aaaNormal","aaaLarge"]){$(id).textContent="—";$(id).classList.remove("good","bad");}
  }
}
async function decode(src,name){
  const image=new Image();image.decoding="async";
  return await new Promise((resolve,reject)=>{
    image.onload=()=>{const w=image.naturalWidth,h=image.naturalHeight;
      if(!w||!h||w>12000||h>12000||w*h>24_000_000){reject(new Error("Image exceeds 12,000px per side or 24 megapixels."));return;}
      resolve({img:image,w,h,name});};
    image.onerror=()=>reject(new Error("Image could not be decoded."));
    image.src=src;
  });
}
function applyAsset(a,url=null){
  const previous=objectUrl;objectUrl=url;asset=a;
  $("contrastFilename").textContent=shortName(a.name);
  $("contrastImageStatus").textContent=`${a.w} × ${a.h} PX · LOCAL ONLY`;
  marks={foreground:null,background:null};setActive("foreground");paint();
  if(previous)URL.revokeObjectURL(previous);
}
async function importFile(file){
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp","image/avif"].includes(file.type)){message("Use PNG, JPEG, WebP or AVIF, not SVG or animated GIF.");return;}
  if(file.size>MAX_BYTES){message("File must be 18 MB or smaller.");return;}
  const url=URL.createObjectURL(file);
  try{const next=await decode(url,file.name);applyAsset(next,url);message("Screenshot loaded locally. Select the text and its background.");}
  catch(e){URL.revokeObjectURL(url);message(e.message);}
}
function pick(u,v){
  if(!asset)return;
  if(u<0||u>1||v<0||v>1){message("Select a pixel inside the screenshot, not the margins.");return;}
  const x=Math.max(0,Math.min(asset.w-1,Math.floor(u*asset.w)));
  const y=Math.max(0,Math.min(asset.h-1,Math.floor(v*asset.h)));
  const c=document.createElement("canvas");c.width=1;c.height=1;
  const temp=c.getContext("2d",{willReadFrequently:true});temp.imageSmoothingEnabled=false;
  temp.drawImage(asset.img,x,y,1,1,0,0,1,1);
  const color=hex(sampleRGBA(temp.getImageData(0,0,1,1).data));
  const name=active==="foreground"?"foregroundHex":"backgroundHex";
  $(name).value=color;marks[active]={u,v};
  paint();recheck();
  message(`${active.toUpperCase()} sampled at (${x}, ${y}) = ${color}.`);
  setActive(active==="foreground"?"background":"foreground");
}
function sampleAtEvent(e){
  if(!asset)return;
  const rect=$("sampleSurface").getBoundingClientRect();
  const sx=(e.clientX-rect.left)/rect.width*W,sy=(e.clientY-rect.top)/rect.height*H;
  const b=imageBox();
  pick((sx-b.x)/b.width,(sy-b.y)/b.height);
}
function demoCanvas(){
  const c=document.createElement("canvas");c.width=1100;c.height=650;const q=c.getContext("2d");
  q.fillStyle="#eae7db";q.fillRect(0,0,1100,650);
  q.fillStyle="#20251f";q.fillRect(0,0,1100,78);q.fillStyle="#f5f0e3";q.font="bold 27px Arial";q.fillText("FORM / ACCESSIBILITY FIELD NOTE",48,51);
  q.fillStyle="#d3d2c7";q.fillRect(55,140,470,418);q.fillStyle="#eeeade";q.fillRect(578,140,465,418);
  q.fillStyle="#9c9f92";q.font="bold 52px Georgia";q.fillText("Barely here.",78,293);
  q.font="21px Arial";q.fillText("This message might disappear.",79,349);
  q.fillStyle="#20251f";q.font="bold 52px Georgia";q.fillText("Here to stay.",604,293);
  q.font="21px Arial";q.fillText("The message survives.",605,349);
  q.fillStyle="#222821";q.font="15px monospace";q.fillText("ONE DESIGN. TWO CONTRAST DECISIONS.",56,606);
  return c.toDataURL("image/png");
}
async function demo(){
  try{const a=await decode(demoCanvas(),"synthetic-color-sample.png");
    applyAsset(a);
    $("foregroundHex").value="#9C9F92";$("backgroundHex").value="#D3D2C7";
    marks.foreground={u:.2,v:.43};marks.background={u:.42,v:.25};
    paint();recheck();message("Synthetic sample loaded. Try swapping the colors or sampling new points.");
  }catch(e){message("Could not generate the demo: "+e.message);}
}
function resultText(){
  const r=currentRatio,fg=colors.foreground,bg=colors.background;
  if(r===null) return null;
  const f=thresholds(r);
  return `FRACTURE / CONTRAST INSPECTION\nForeground: ${fg}\nBackground: ${bg}\nRatio: ${r.toFixed(4)}:1\nAA normal: ${f.AA_normal?"MEETS":"BELOW"}\nAA large: ${f.AA_large?"MEETS":"BELOW"}\nAAA normal: ${f.AAA_normal?"MEETS":"BELOW"}\nAAA large: ${f.AAA_large?"MEETS":"BELOW"}\nSampled screenshot: ${asset?.name||"none (manual colors)"}\n\nLimitations: ratio applies to these colors only. Screenshot pixels, antialiasing, transparency, text size and layout context may make this unsuitable as a conformance verdict. Verify actual CSS colors and text sizes.\nStandard: https://www.w3.org/TR/WCAG22/#contrast-minimum`;
}
function downloadCanvas(c){
  c.toBlob(blob=>{if(!blob){message("PNG export unavailable.");return;}
    const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="fracture-contrast-inspection.png";
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
    message("Contrast inspection card exported. Review content before sharing.");
  },"image/png");
}
function exportCard(){
  if(currentRatio===null){message("Enter two valid colors first.");return;}
  const c=document.createElement("canvas");c.width=1400;c.height=900;const q=c.getContext("2d");
  q.fillStyle="#eae7db";q.fillRect(0,0,1400,900);
  q.fillStyle="#20251f";q.fillRect(0,0,1400,113);q.fillStyle="#f4f0e8";q.font="bold 48px Arial";q.fillText("F / FRACTURE",48,76);q.font="20px monospace";q.fillText("COLOR INSPECTION / 002",960,72);
  q.fillStyle="#20251f";q.font="bold 64px Georgia";q.fillText("Can you actually read this?",46,199);
  q.fillStyle=colors.background;q.fillRect(48,239,750,390);
  q.fillStyle=colors.foreground;q.font="bold 75px Georgia";q.fillText("A sample.",88,419);
  q.font="31px Arial";q.fillText("Some details must stand out.",91,478);
  q.fillStyle="#20251f";q.font="bold 92px Arial";q.fillText(currentRatio.toFixed(2)+":1",858,356);
  q.font="20px monospace";q.fillText("MEASURED RATIO",861,399);
  q.fillStyle=colors.foreground;q.fillRect(861,460,110,110);
  q.fillStyle=colors.background;q.fillRect(991,460,110,110);
  q.fillStyle="#20251f";q.font="21px monospace";q.fillText(colors.foreground,856,595);q.fillText(colors.background,995,595);
  const flags=thresholds(currentRatio);
  q.font="19px monospace";q.fillText(`AA NORMAL: ${flags.AA_normal?"MEETS":"BELOW"}   /   AA LARGE: ${flags.AA_large?"MEETS":"BELOW"}`,48,696);
  q.fillText(`AAA NORMAL: ${flags.AAA_normal?"MEETS":"BELOW"}   /   AAA LARGE: ${flags.AAA_large?"MEETS":"BELOW"}`,48,733);
  q.font="16px Arial";q.fillText("Contrast sampled from user-selected colors. Not an accessibility audit.",48,778);
  q.fillText("W3C WCAG 2.2 · 1.4.3 / 1.4.6",48,805);
  q.fillStyle="#20251f";q.fillRect(0,843,1400,57);q.fillStyle="#f6f0e3";q.font="17px monospace";q.fillText("COLORS, NOT CLAIMS. / NO UPLOAD. NO ACCOUNT.",48,879);
  downloadCanvas(c);
}
for(const color of ["foreground","background"]){
  const input=$(color==="foreground"?"foregroundHex":"backgroundHex");
  input.addEventListener("input",()=>{marks[color]=null;paint();recheck();});
}
$("selectFg").addEventListener("click",()=>setActive("foreground"));
$("selectBg").addEventListener("click",()=>setActive("background"));
$("resetPick").addEventListener("click",()=>{marks={foreground:null,background:null};setActive("foreground");paint();message("Sample markers reset; manual colors remain available.");});
$("sampleSurface").addEventListener("click",sampleAtEvent);
$("sampleSurface").addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&asset){e.preventDefault();pick(.5,.5);}
});
$("contrastDemo").addEventListener("click",demo);
$("contrastInput").addEventListener("change",e=>{importFile(e.target.files?.[0]);e.target.value="";});
$("contrastZone").addEventListener("dragover",e=>{e.preventDefault();$("contrastZone").classList.add("dragging");});
$("contrastZone").addEventListener("dragleave",()=>$("contrastZone").classList.remove("dragging"));
$("contrastZone").addEventListener("drop",e=>{e.preventDefault();$("contrastZone").classList.remove("dragging");importFile(e.dataTransfer.files?.[0]);});
$("copyContrast").addEventListener("click",async()=>{
  const t=resultText();if(!t){message("Enter two valid colors first.");return;}
  try{await navigator.clipboard.writeText(t);message("Contrast receipt copied.");}
  catch{const url=URL.createObjectURL(new Blob([t],{type:"text/plain"}));
    const a=document.createElement("a");a.href=url;a.download="fracture-contrast.txt";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
    message("Clipboard unavailable. Downloaded a text receipt instead.");
  }
});
$("exportContrast").addEventListener("click",exportCard);
window.addEventListener("pagehide",()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);});
paint();recheck();setActive("foreground");
