import test from "node:test";
import assert from "node:assert/strict";
import {parseHex,hex,luminance,contrastRatio,thresholds,sampleRGBA} from "../contrast-core.mjs";

test("short hex expands and invalid input fails closed",()=>{
  assert.deepEqual(parseHex("#abc"),[170,187,204]);
  assert.deepEqual(parseHex("fFfFff"),[255,255,255]);
  assert.equal(hex([0,16,255]),"#0010FF");
  for(const s of ["#GGG","#11223344","transparent","","1122"])assert.throws(()=>parseHex(s),TypeError);
});
test("luminance and ratio reproduce WCAG reference endpoints",()=>{
  assert.equal(luminance("#000000"),0);
  assert.ok(Math.abs(luminance("#FFFFFF")-1)<1e-12);
  assert.ok(Math.abs(contrastRatio("#000","#fff")-21)<1e-10);
  assert.equal(contrastRatio("#ABC","#ABC"),1);
  assert.ok(Math.abs(contrastRatio("#fff","#000")-contrastRatio("#000","#fff"))<1e-10);
});
test("WCAG thresholds use unrounded ratios",()=>{
  assert.deepEqual(thresholds(4.5),{AA_normal:true,AA_large:true,AAA_normal:false,AAA_large:true});
  assert.equal(thresholds(4.499999).AA_normal,false);
  assert.equal(thresholds(3).AA_large,true);
  assert.equal(thresholds(2.999).AA_large,false);
  assert.equal(thresholds(7).AAA_normal,true);
  assert.equal(thresholds(6.999999).AAA_normal,false);
  assert.throws(()=>thresholds(0.9),RangeError);
  assert.throws(()=>thresholds(NaN),RangeError);
});
test("transparent screenshot samples are composited against white",()=>{
  assert.deepEqual(sampleRGBA([0,0,0,0]),[255,255,255]);
  assert.deepEqual(sampleRGBA([255,0,0,255]),[255,0,0]);
  assert.deepEqual(sampleRGBA([0,0,0,128]),[127,127,127]);
  assert.throws(()=>sampleRGBA([1,2,3]),TypeError);
});
test("known WCAG contrast cases",()=>{
  assert.ok(Math.abs(contrastRatio("#777777","#FFFFFF")-4.478)<0.01);
  assert.equal(thresholds(contrastRatio("#777777","#FFFFFF")).AA_normal,false);
  assert.equal(thresholds(contrastRatio("#000000","#FFFFFF")).AAA_normal,true);
});
