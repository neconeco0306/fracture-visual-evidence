import {pixelDifference,formatPercent,makeReportMarkdown,fitInside} from "./diff-core.mjs";
import {contrastRatio,thresholds,hex,sampleRGBA} from "./contrast-core.mjs";

const $=id=>document.getElementById(id);
const state={before:null,after:null,mode:"split",reveal:50,threshold:32,notes:[],pinning:false,metrics:null,sampled:false};
const nf=new Intl.NumberFormat("en-US");
const colors={paper:"#eae7db",ink:"#20251f",yellow:"#edc968",accent:"#d75d3d"};
let flashTimer;
const colorAudit={picking:false,count:0,source:"manually selected colors"};
function notify(message){$("toast").textContent=message;clearTimeout(flashTimer);flashTimer=setTimeout(()=>{$("toast").textContent="";},6000);}
function applyMode(){
  const ready=Boolean(state.before&&state.after);
  $("emptyStage").style.display=ready?"none":"flex";
  $("visualStage").classList.toggle("has-images",ready);
  $("beforeLayer").style.display=ready?"block":"none";
  $("afterLayer").style.display=ready&&state.mode!=="diff"?"block":"none";
  $("diffCanvas").style.display=ready&&state.mode==="diff"&&state.metrics?.compatible?"block":"none";
  $("beforeLayer").style.opacity="1";
  $("afterLayer").style.opacity=state.mode==="overlay"?String(state.reveal/100):"1";
  $("afterLayer").style.clipPath=state.mode==="split"?`inset(0 0 0 ${state.reveal}%)`:"none";
  $("splitRule").style.display=ready&&state.mode==="split"?"block":"none";
  $("splitRule").style.left=state.reveal+"%";
  document.querySelectorAll(".stage-label").forEach(x=>x.style.display=ready&&state.mode!=="diff"?"block":"none");
  $("compareRange").disabled=!ready||state.mode==="diff";
  const modeInstructions={
    split:"SPLIT — BEFORE is on the left, AFTER on the right. Move the divider.",
    overlay:"OVERLAY — blend AFTER over BEFORE. 0% shows BEFORE, 100% shows AFTER.",
    diff:"DIFF — red marks measured color changes. Move PIXEL SENSITIVITY to filter noise."
  };
  $("modeHelp").textContent=colorAudit.picking
    ?"COLOR SAMPLING ON — tap a text pixel, then a background pixel in the AFTER image."
    :state.pinning
      ?"PIN MODE ON — tap a point in the image to add a numbered note."
      :modeInstructions[state.mode];
  $("rangeMeaning").textContent=state.mode==="overlay"?"AFTER OPACITY":"REVEAL";
  $("compareRange").setAttribute("aria-label",state.mode==="overlay"?"After image opacity percent":"Position of the before-after split divider in percent");
  $("compareRange").setAttribute("aria-valuetext",state.mode==="overlay"?"After opacity "+state.reveal+" percent":"Divider at "+state.reveal+" percent");
  document.querySelectorAll("[data-mode]").forEach(x=>{
    const selected=x.dataset.mode===state.mode;
    x.classList.toggle("active",selected);x.setAttribute("aria-pressed",String(selected));
  });
}
function drawImageData(img,w,h){
  const c=document.createElement("canvas");c.width=w;c.height=h;
  const x=c.getContext("2d",{willReadFrequently:true});x.clearRect(0,0,w,h);x.drawImage(img,0,0,w,h);
  return x.getImageData(0,0,w,h).data;
}
function measure(){
  const a=state.before,b=state.after;state.metrics=null;state.sampled=false;
  const clear=()=>{$("changePercent").textContent="—";$("pixelCount").textContent="—";$("diffCanvas").width=1;$("diffCanvas").height=1;};
  if(!a||!b){clear();$("analysisStatus").textContent="Load two screenshots to begin the examination.";return;}
  $("dimensions").textContent=`${a.w} × ${a.h} → ${b.w} × ${b.h}`;
  $("visualStage").style.aspectRatio=`${b.w} / ${b.h}`;
  if(a.w!==b.w||a.h!==b.h){
    clear();state.metrics={compatible:false};
    $("analysisStatus").textContent="Sizes differ: visual overlay only. For a true pixel comparison, upload images with identical dimensions.";
    if(state.mode==="diff")state.mode="split";
    return;
  }
  const scale=Math.min(1,1400/a.w,900/a.h);
  const w=Math.max(1,Math.round(a.w*scale)),h=Math.max(1,Math.round(a.h*scale));
  try{
    const base=drawImageData(a.img,w,h),next=drawImageData(b.img,w,h);
    const result=pixelDifference(base,next,state.threshold);
    const c=$("diffCanvas");c.width=w;c.height=h;
    c.getContext("2d").putImageData(new ImageData(result.mask,w,h),0,0);
    state.metrics={compatible:true,...result};state.sampled=scale<1;
    $("changePercent").textContent=formatPercent(result.percent);
    $("pixelCount").textContent=nf.format(result.total)+" px";
    $("analysisStatus").textContent=state.sampled?"Sampled-resolution pixel analysis. Some fine changes may be missed. Export includes the sample size.":"Full-resolution pixel analysis. Differences measure color changes, not quality.";
  }catch(err){
    clear();state.metrics={compatible:false};
    $("analysisStatus").textContent="Pixel analysis could not complete on this device. Visual comparison remains available.";
    if(state.mode==="diff")state.mode="split";
  }
}
async function sourceToAsset(src,name){
  const img=new Image();
  return await new Promise((resolve,reject)=>{
    img.onload=()=>{
      if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>12000||img.naturalHeight>12000||img.naturalWidth*img.naturalHeight>24_000_000){reject(new Error("Image must be under 12,000 px per side and 24 megapixels total."));return;}
      resolve({img,w:img.naturalWidth,h:img.naturalHeight,name});
    };
    img.onerror=()=>reject(new Error("This image could not be decoded."));
    img.src=src;
  });
}
function showAsset(slot){
  const a=state[slot];$("beforeImage");$(slot+"Image").src=a?.img.src||"";
  $(slot+"Label").textContent=a?.name||"Place an image here";
  $(slot+"Meta").textContent=a?`${a.w} × ${a.h} · READY`:"CLICK OR DROP AN IMAGE";
}
function refresh(){showAsset("before");showAsset("after");measure();applyMode();renderPins();}
async function importFile(slot,file){
  if(!file)return;
  if(!["image/png","image/jpeg","image/webp","image/avif"].includes(file.type)){notify("Choose a PNG, JPEG, WebP, or AVIF image (not SVG or animated GIF).");return;}
  if(file.size>18*1024*1024){notify("For device safety, images must be 18 MB or smaller.");return;}
  const url=URL.createObjectURL(file);
  try{
    const asset=await sourceToAsset(url,file.name);
    const previous=state[slot];
    state[slot]={...asset,url};state.notes=[];refresh();
    if(previous?.url)URL.revokeObjectURL(previous.url);
    notify(`${slot.toUpperCase()} loaded. Images stay local.`);
  }catch(e){URL.revokeObjectURL(url);notify(e.message||"Failed to open image.");}
}
function sampleScreenshot(version){
  const canvas=document.createElement("canvas");canvas.width=1120;canvas.height=700;
  const c=canvas.getContext("2d");c.fillStyle="#f3f0e7";c.fillRect(0,0,1120,700);
  c.fillStyle="#20251f";c.fillRect(0,0,1120,75);c.fillStyle="#f1eedd";c.font="bold 22px Arial";c.fillText("MARGIN  /  STUDIO",43,46);
  c.fillStyle="#c2c8ba";c.font="14px Arial";c.fillText("WORK      NOTES      ARCHIVE",720,46);
  c.fillStyle="#a8ae9d";c.font="14px monospace";c.fillText("A FIELD NOTE ABOUT CHANGE / 024",54,142);
  c.fillStyle="#20251f";c.font="bold 58px Georgia";c.fillText(version?"Better ideas, less friction.":"Better ideas, less noise.",51,230);
  c.fillStyle="#666e60";c.font="21px Arial";c.fillText("A living archive for unfinished projects.",55,280);
  c.fillStyle=version?"#d75d3d":"#b0b59f";c.fillRect(54,322,version?270:228,66);
  c.fillStyle=version?"#fffaf0":"#20251f";c.font="bold 18px Arial";c.fillText(version?"START SOMETHING  →":"EXPLORE ARCHIVE  →",77,363);
  c.fillStyle="#e4dfd2";c.fillRect(54,436,1010,201);
  c.fillStyle="#20251f";c.font="18px Arial";c.fillText("01  /  EXPERIMENTS",80,480);
  c.fillStyle="#9aa08f";c.font="14px Arial";c.fillText("Things we attempted. Things that surprised us.",80,515);
  if(version){
    c.fillStyle="#edc968";c.fillRect(735,416,302,101);c.fillStyle="#20251f";c.font="bold 17px Arial";
    c.fillText("NEW: SHARE YOUR WORK",753,456);c.font="13px Arial";c.fillText("Now open to everyone ↗",753,482);
  }
  c.fillStyle="#777d6c";c.font="12px monospace";c.fillText("MARGIN STUDIO    /    2026",55,668);
  return canvas.toDataURL("image/png");
}
async function loadDemo(){
  try{
    const assets=await Promise.all([sourceToAsset(sampleScreenshot(false),"demo-before.png"),sourceToAsset(sampleScreenshot(true),"demo-after.png")]);
    const previous=[state.before,state.after];
    state.before=assets[0];state.after=assets[1];state.notes=[];state.mode="split";state.threshold=32;
    previous.forEach(a=>{if(a?.url)URL.revokeObjectURL(a.url);});
    $("thresholdRange").value="32";$("thresholdValue").textContent="32";
    $("reportTitle").value="The archive redesign / launch inspection";
    $("reportContext").value="Demo case: compare the copy, CTA, and new announcement banner. Pin anything that needs review.";
    refresh();notify("Demo loaded. Switch modes, add pins, and export a report.");
  }catch{notify("Could not create the demo on this device.");}
}
function pinGeometry(){
  const e=$("visualStage"),w=e.clientWidth,h=e.clientHeight;
  if(!state.after||!w||!h)return null;
  return {...fitInside(state.after.w,state.after.h,0,0,w,h),stageWidth:w,stageHeight:h};
}
function renderPins(){
  const target=$("pinsLayer");target.replaceChildren();
  const box=pinGeometry();
  state.notes.forEach((note,i)=>{
    const pin=document.createElement("button");pin.type="button";pin.className="pin";pin.textContent=i+1;
    pin.style.left=box?((box.x+box.width*note.x)/box.stageWidth*100)+"%":note.x*100+"%";pin.style.top=box?((box.y+box.height*note.y)/box.stageHeight*100)+"%":note.y*100+"%";pin.setAttribute("aria-label",`Open annotation ${i+1}`);
    pin.onclick=e=>{e.stopPropagation();document.querySelector(`[data-note-index="${i}"]`)?.focus();};
    target.append(pin);
  });
  $("pinCount").textContent=String(state.notes.length).padStart(2,"0");
  $("annotationTotal").textContent=String(state.notes.length).padStart(2,"0")+" / NOTES";
  renderNotes();
}
function renderNotes(){
  const list=$("notesList");list.replaceChildren();
  if(!state.notes.length){const p=document.createElement("p");p.className="empty-notes";p.textContent="No marks yet. Every observation begins somewhere.";list.append(p);return;}
  state.notes.forEach((note,i)=>{
    const row=document.createElement("div");row.className="note-item";
    const number=document.createElement("span");number.className="note-id";number.textContent=i+1;
    const entry=document.createElement("textarea");entry.value=note.text;entry.dataset.noteIndex=i;entry.maxLength=400;entry.rows=3;
    entry.setAttribute("aria-label",`Annotation ${i+1} comment`);
    entry.placeholder="What changed? What should happen?";
    entry.addEventListener("input",()=>{note.text=entry.value;});
    const del=document.createElement("button");del.type="button";del.textContent="×";del.setAttribute("aria-label",`Remove annotation ${i+1}`);
    del.onclick=()=>{state.notes.splice(i,1);renderPins();};
    row.append(number,entry,del);list.append(row);
  });
}
function createPin(x,y){
  if(!state.before||!state.after)return;
  if(state.notes.length>=25){notify("Maximum of 25 pins per report.");return;}
  state.notes.push({x:Math.max(.02,Math.min(.98,x)),y:Math.max(.02,Math.min(.98,y)),text:""});
  renderPins();
  const last=state.notes.length-1;
  document.querySelector(`[data-note-index="${last}"]`)?.focus();
  notify("Pin added. Describe the observation in the ledger.");
}
function currentReport(){return {title:$("reportTitle").value.trim(),context:$("reportContext").value.trim(),notes:state.notes,beforeName:state.before?.name,afterName:state.after?.name,metrics:state.metrics};}
function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function drawFit(ctx,img,x,y,w,h){
  const r=fitInside(img.naturalWidth,img.naturalHeight,x,y,w,h);
  ctx.drawImage(img,r.x,r.y,r.width,r.height);return r;
}
function roundedText(ctx,text,x,y,maxWidth){
  let s=String(text||"");while(ctx.measureText(s).width>maxWidth&&s.length>4)s=s.slice(0,-2);
  ctx.fillText(s===text?s:s+"…",x,y);
}
function exportSheet(){
  if(!state.before||!state.after){notify("Load two images first.");return;}
  const out=document.createElement("canvas");out.width=1600;out.height=1100;
  const c=out.getContext("2d");if(!c){notify("Canvas export is unavailable.");return;}
  c.fillStyle=colors.paper;c.fillRect(0,0,1600,1100);
  c.fillStyle=colors.ink;c.fillRect(0,0,1600,102);
  c.fillStyle="#f8f4e9";c.font="bold 40px Arial";c.fillText("F / FRACTURE",52,65);
  c.font="18px monospace";c.fillText("VISUAL INSPECTION SHEET  /  001",1120,62);
  c.fillStyle=colors.ink;c.font="bold 50px Georgia";roundedText(c,$("reportTitle").value||"A change worth noticing",50,178,1450);
  c.font="16px monospace";c.fillStyle="#656a5b";c.fillText("BEFORE  /  ORIGINAL",54,223);c.fillText("AFTER  /  CURRENT",830,223);
  function imagePanel(asset,x){
    c.fillStyle="#f9f7ef";c.fillRect(x,242,718,468);
    c.save();c.beginPath();c.rect(x,242,718,468);c.clip();
    const r=drawFit(c,asset.img,x,242,718,468);c.restore();c.strokeStyle="#a5a89a";c.lineWidth=2;c.strokeRect(x,242,718,468);return r;
  }
  imagePanel(state.before,50);const afterRect=imagePanel(state.after,828);
  state.notes.forEach((n,i)=>{
    const x=afterRect.x+afterRect.width*n.x,y=afterRect.y+afterRect.height*n.y;
    c.beginPath();c.arc(x,y,17,0,Math.PI*2);c.fillStyle=colors.accent;c.fill();c.strokeStyle="white";c.lineWidth=3;c.stroke();c.fillStyle="white";c.font="bold 16px Arial";c.textAlign="center";c.fillText(i+1,x,y+6);c.textAlign="left";
  });
  c.fillStyle=colors.ink;c.fillRect(50,742,1496,2);
  c.font="17px monospace";c.fillStyle=colors.ink;
  const summary=state.metrics?.compatible?`${formatPercent(state.metrics.percent)} CHANGED  /  ${nf.format(state.metrics.total)} SAMPLED PIXELS  /  THRESHOLD ${state.metrics.threshold}`:"PIXEL DIFF UNAVAILABLE — SOURCE DIMENSIONS DO NOT MATCH";
  roundedText(c,summary,53,789,1480);
  c.fillStyle="#555a4f";c.font="17px Arial";
  state.notes.slice(0,4).forEach((n,i)=>roundedText(c,`${String(i+1).padStart(2,"0")}  ${n.text.trim()||"Unspecified observation"}`,53,839+i*42,1420));
  if(!state.notes.length)c.fillText("No annotations recorded.",53,844);
  c.fillStyle=colors.ink;c.fillRect(0,1034,1600,66);
  c.font="16px monospace";c.fillStyle=colors.yellow;c.fillText("OBSERVE  →  ANNOTATE  →  HAND OFF",51,1072);
  c.fillStyle="#ede7d7";c.fillText("PIXEL DIFFERENCE IS NOT A CORRECTNESS TEST",1000,1072);
  out.toBlob(blob=>{if(blob){downloadBlob(blob,"fracture-visual-evidence.png");notify("Comparison sheet exported.");}else notify("PNG export could not complete.");},"image/png");
}
async function copyBrief(){
  if(!state.before||!state.after){notify("Load two images first.");return;}
  const text=makeReportMarkdown(currentReport())+"\n\n## Selected color contrast\n"+contrastText();
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);}
  else {const t=document.createElement("textarea");t.value=text;document.body.append(t);t.select();if(!document.execCommand("copy"))throw new Error("Copy unavailable");t.remove();}
  notify("Fix brief copied. Paste it in your issue tracker or coding assistant.");}
  catch{notify("Clipboard blocked. Export JSON instead, or run on HTTPS.");}
}
function exportData(){
  if(!state.before||!state.after){notify("Load two images first.");return;}
  const r=currentReport();const m=r.metrics;
  const payload={format:"fracture.visual-inspection.v1",title:r.title,context:r.context,
    before:{filename:r.beforeName,width:state.before.w,height:state.before.h},
    after:{filename:r.afterName,width:state.after.w,height:state.after.h},
    measurement:m?.compatible?{status:"measured",changed:m.changed,total:m.total,threshold:m.threshold,percent:m.percent,sampled:state.sampled}:{status:"not_comparable"},
    annotations:r.notes.map((n,i)=>({number:i+1,x:n.x,y:n.y,text:n.text})),colorContrast:colorAuditRecord(),note:"This JSON contains notes and measurements only, not the screenshot pixels. Observations are not verified functionality."};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),"fracture-inspection.json");notify("Machine-readable report exported.");
}

function colorAuditRecord(){
  const foreground=$("foregroundColor").value,background=$("backgroundColor").value;
  const ratio=contrastRatio(foreground,background);
  return {foreground,background,ratio,thresholds:thresholds(ratio),source:colorAudit.source,
    notice:"Selected pixel values are not proof of CSS values or complete WCAG conformance."};
}
function contrastText(){
  const c=colorAuditRecord();
  return `- Foreground: ${c.foreground}; background: ${c.background}\n- Selected color contrast: ${c.ratio.toFixed(2)}:1\n- WCAG AA normal text: ${c.thresholds.AA_normal?"threshold met":"threshold not met"}\n- WCAG AAA normal text: ${c.thresholds.AAA_normal?"threshold met":"threshold not met"}\n- Source: ${c.source}\n- Important: this color-pair calculation does not constitute a complete accessibility audit.`;
}
function updateContrast(){
  const c=colorAuditRecord();
  $("foregroundCode").textContent=c.foreground.toUpperCase();
  $("backgroundCode").textContent=c.background.toUpperCase();
  $("contrastPreview").style.color=c.foreground;
  $("contrastPreview").style.backgroundColor=c.background;
  $("contrastRatio").textContent=c.ratio.toFixed(2)+":1";
  $("contrastAA").textContent=c.thresholds.AA_normal?"PASS":"FAIL";
  $("contrastAAA").textContent=c.thresholds.AAA_normal?"PASS":"FAIL";
}
function stopColorPick(){
  colorAudit.picking=false;colorAudit.count=0;
  $("contrastPick").setAttribute("aria-pressed","false");
  $("contrastPick").querySelector("span").textContent="OFF";
  $("visualStage").classList.remove("sampling");
}
function sampleImageColor(e){
  if(!state.after){notify("Load two images or the sample case before sampling colors.");stopColorPick();return;}
  const stage=$("visualStage").getBoundingClientRect(),box=pinGeometry();
  if(!box)return;
  const x=(e.clientX-stage.left-box.x)/box.width,y=(e.clientY-stage.top-box.y)/box.height;
  if(x<0||x>1||y<0||y>1){notify("Sample a point inside the AFTER screenshot.");return;}
  const cx=Math.max(0,Math.min(state.after.w-1,Math.floor(x*state.after.w)));
  const cy=Math.max(0,Math.min(state.after.h-1,Math.floor(y*state.after.h)));
  const c=document.createElement("canvas");c.width=c.height=1;
  try{
    const ctx=c.getContext("2d",{willReadFrequently:true});
    ctx.drawImage(state.after.img,cx,cy,1,1,0,0,1,1);
    const sample=hex(sampleRGBA(ctx.getImageData(0,0,1,1).data));
    const which=colorAudit.count===0?"foregroundColor":"backgroundColor";
    $(which).value=sample;
    colorAudit.count++;
    colorAudit.source="sampled from AFTER screenshot pixels (not original CSS)";
    $("contrastSource").textContent="Sampled screenshot colors. Anti-aliasing and image compression can affect the calculation; inspect actual CSS values for compliance.";
    updateContrast();
    if(colorAudit.count===2){stopColorPick();notify("Two color samples captured. The ratio describes only those sampled colors.");}
    else notify("Text color sampled. Tap the BACKGROUND pixel next.");
  }catch{
    stopColorPick();notify("Image pixel sampling failed on this device.");
  }
}

for(const slot of ["before","after"]){
  const input=$(slot+"Input"),zone=$(slot+"Zone");
  input.addEventListener("change",()=>{importFile(slot,input.files?.[0]);input.value="";});
  zone.addEventListener("dragover",e=>{e.preventDefault();zone.classList.add("dragging");});
  zone.addEventListener("dragleave",()=>zone.classList.remove("dragging"));
  zone.addEventListener("drop",e=>{e.preventDefault();zone.classList.remove("dragging");importFile(slot,e.dataTransfer.files?.[0]);});
}
$("demoButton").addEventListener("click",loadDemo);
$("swapButton").addEventListener("click",()=>{
  if(!state.before||!state.after){notify("Load two images to reverse.");return;}
  [state.before,state.after]=[state.after,state.before];state.notes=[];refresh();notify("Before and after reversed; old pins cleared.");
});
document.querySelectorAll("[data-mode]").forEach(button=>button.addEventListener("click",()=>{
  if(button.dataset.mode==="diff"&&!state.metrics?.compatible){notify("Pixel diff requires two images with equal dimensions.");return;}
  state.mode=button.dataset.mode;applyMode();
}));
$("compareRange").addEventListener("input",e=>{state.reveal=+e.target.value;$("rangeValue").textContent=state.reveal+"%";applyMode();});
$("thresholdRange").addEventListener("input",e=>{
  state.threshold=+e.target.value;$("thresholdValue").textContent=state.threshold;
  if(state.before&&state.after){measure();applyMode();}
});
$("pinMode").addEventListener("click",()=>{
  state.pinning=!state.pinning;
  $("pinMode").setAttribute("aria-pressed",String(state.pinning));
  $("pinMode").querySelector("span").textContent=state.pinning?"ON":"OFF";
  $("visualStage").classList.toggle("annotating",state.pinning);
  applyMode();
  if(state.pinning){
    $("visualStage").scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
    notify("PIN MODE ON: tap a point in the image, then type your observation.");
  }
});
$("visualStage").addEventListener("click",e=>{
  if(colorAudit.picking){sampleImageColor(e);return;}
  if(!state.pinning||e.target.closest(".pin"))return;
  const r=$("visualStage").getBoundingClientRect();
  const box=pinGeometry();if(!box)return;
  const x=e.clientX-r.left-box.x,y=e.clientY-r.top-box.y;
  if(x<0||x>box.width||y<0||y>box.height){notify("Select a point inside the screenshot, not the margin.");return;}
  createPin(x/box.width,y/box.height);
});
$("visualStage").addEventListener("keydown",e=>{
  if(state.pinning&&(e.key==="Enter"||e.key===" ")){e.preventDefault();createPin(.5,.5);}
});
$("exportPng").addEventListener("click",exportSheet);
$("copyReport").addEventListener("click",copyBrief);
if(typeof ResizeObserver==="function")new ResizeObserver(renderPins).observe($("visualStage"));
else window.addEventListener("resize",renderPins);
$("exportJson").addEventListener("click",exportData);

for(const id of ["foregroundColor","backgroundColor"]){
  $(id).addEventListener("input",()=>{
    colorAudit.source="manually selected colors";
    $("contrastSource").textContent="Calculated from selected sRGB values. A color-pair check is not a comprehensive accessibility audit.";
    updateContrast();
  });
}
$("contrastPick").addEventListener("click",()=>{
  if(colorAudit.picking){stopColorPick();return;}
  if(!state.after){notify("Load the demo or two screenshots before sampling.");return;}
  state.pinning=false;
  $("pinMode").setAttribute("aria-pressed","false");
  $("pinMode").querySelector("span").textContent="OFF";
  $("visualStage").classList.remove("annotating");
  state.mode="overlay";state.reveal=100;
  $("compareRange").value=100;$("rangeValue").textContent="100%";
  applyMode();
  colorAudit.picking=true;colorAudit.count=0;
  $("contrastPick").setAttribute("aria-pressed","true");
  $("contrastPick").querySelector("span").textContent="ON";
  $("visualStage").classList.add("sampling");
  $("visualStage").scrollIntoView({behavior:"smooth",block:"center"});
  notify("Tap TEXT color, then BACKGROUND color in the AFTER screenshot.");
});
$("contrastCopy").addEventListener("click",async()=>{
  const data=contrastText();
  try{await navigator.clipboard.writeText(data);notify("Color contrast assessment copied.");}
  catch{notify("Clipboard blocked. Try HTTPS or export JSON instead.");}
});
updateContrast();

applyMode();renderPins();

window.addEventListener("pagehide",()=>{for(const slot of ["before","after"]){if(state[slot]?.url)URL.revokeObjectURL(state[slot].url);}});
