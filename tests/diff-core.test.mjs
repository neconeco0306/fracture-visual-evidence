import test from "node:test";
import assert from "node:assert/strict";
import {pixelDifference,formatPercent,escapeMarkdown,makeReportMarkdown,fitInside} from "../diff-core.mjs";
const px=(...rgba)=>new Uint8ClampedArray(rgba);
test("identical RGBA inputs have exactly zero changed pixels",()=>{
 const v=px(23,41,59,255,55,66,77,255);const r=pixelDifference(v,v,0);
 assert.equal(r.changed,0);assert.equal(r.percent,0);assert.equal(r.total,2);assert.equal(r.mask.reduce((a,b)=>a+b,0),0);
});
test("one changed pixel is counted but untouched ones are not",()=>{
 const r=pixelDifference(px(0,0,0,255,0,0,0,255),px(250,0,0,255,0,0,0,255),32);
 assert.equal(r.changed,1);assert.equal(r.total,2);assert.equal(r.percent,50);assert.equal(r.mask[3],212);assert.equal(r.mask[7],0);
});
test("difference is threshold-exclusive and clamps malformed threshold",()=>{
 const a=px(0,0,0,255),b=px(32,0,0,255);
 assert.equal(pixelDifference(a,b,32).changed,0);
 assert.equal(pixelDifference(a,b,31).changed,1);
 assert.equal(pixelDifference(a,b,-42).threshold,0);
 assert.equal(pixelDifference(a,b,999).changed,0);
 assert.equal(pixelDifference(a,b,NaN).threshold,32);
});
test("transparent RGB payload differences are not falsely counted",()=>{
 const a=px(255,0,0,0),b=px(0,255,0,0);
 assert.equal(pixelDifference(a,b,0).changed,0);
});
test("alpha compositing against white catches visible differences",()=>{
 const a=px(255,0,0,128),b=px(255,255,255,255);
 assert.equal(pixelDifference(a,b,50).changed,1);
});
test("empty, invalid, and mismatched pixel buffers are rejected",()=>{
 assert.throws(()=>pixelDifference(px(),px()),RangeError);
 assert.throws(()=>pixelDifference(px(1,2,3,255),px()),RangeError);
 assert.throws(()=>pixelDifference([1,2,3,4],px(1,2,3,4)),TypeError);
});
test("percentage and aspect fitting are deterministic",()=>{
 assert.equal(formatPercent(0),"0.00%");
 assert.equal(formatPercent(45.444),"45.4%");
 assert.equal(formatPercent(NaN),"—");
 assert.deepEqual(fitInside(200,100,0,0,100,100),{x:0,y:25,width:100,height:50});
});
test("markdown report explicitly discloses limitations",()=>{
 const md=makeReportMarkdown({title:"Regression #1",context:"Expected button visible",beforeName:"a.png",afterName:"b.png",
  notes:[{x:.12,y:.5,text:"Button overlaps banner"}],metrics:{compatible:true,percent:20,changed:2,total:10,threshold:32}});
 assert.match(md,/20.0%/);
 assert.match(md,/Pin 1/);
 assert.match(md,/not a functional or accessibility test/i);
 assert.match(md,/Regression \\#1/);
 assert.match(md,/2 \/ 10 sampled pixels/);
});
test("no-data report never calls pixel analysis verified",()=>{
 const md=makeReportMarkdown({title:"Missing",notes:[],metrics:{compatible:false}});
 assert.match(md,/unavailable/);
 assert.match(md,/No annotations recorded/);
});
test("user text has no markdown heading injection by default",()=>{
 assert.equal(escapeMarkdown("# injected"),"\\# injected");
});
