import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../styles.css",import.meta.url),"utf8");
const contrastHtml=fs.readFileSync(new URL("../contrast.html",import.meta.url),"utf8");
const contrast=fs.readFileSync(new URL("../contrast.js",import.meta.url),"utf8");
test("every referenced static asset exists",()=>{
  for(const asset of ["styles.css","app.js","diff-core.mjs","contrast.html","contrast.css","contrast.js","contrast-core.mjs"]){
    assert.ok(fs.existsSync(new URL("../"+asset,import.meta.url)),asset);
  }
});
test("all JavaScript DOM element ids are present in HTML",()=>{
  const ids=[...app.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map(m=>m[1]);
  assert.ok(ids.length>15,"Check is not accidentally empty");
  for(const id of ids)assert.ok(html.includes('id="'+id+'"'),"Missing DOM id "+id);
});
test("export functions and demo loading are wired to buttons",()=>{
  for(const id of ["demoButton","exportPng","exportJson","copyReport","pinMode","compareRange"]){
    assert.ok(html.includes('id="'+id+'"'),id);
    assert.ok(app.includes('$("'+id+'").addEventListener'),id);
  }
});
test("all contrast UI JS ids are in its document",()=>{
  const ids=[...contrast.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map(m=>m[1]);
  assert.ok(ids.length>15);
  for(const id of ids)assert.ok(contrastHtml.includes('id="'+id+'"'),"Missing contrast DOM id "+id);
});
test("No backend requests or third-party UI imports",()=>{
  assert.doesNotMatch(app,/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(contrast,/\bfetch\s*\(|XMLHttpRequest|sendBeacon/);
  // Absolute URLs in Open Graph metadata are allowed; remote executable assets are not.
  assert.doesNotMatch(html,/<script[^>]*src=["\x27]https?:|<link[^>]*href=["\x27]https?:/i);
  assert.ok(css.length>5000);
});

test("mobile field inspection gives an explicit workflow and short path to export",()=>{
  assert.ok(html.includes('id="modeHelp"'),"Missing comparison mode guidance");
  assert.ok(html.includes('id="rangeMeaning"'),"Missing context-specific slider label");
  assert.ok(html.includes('href="#export-heading"'),"Export should be directly reachable from comparison");
  assert.ok(html.indexOf('class="export-section"')<html.indexOf('class="contrast-lab"'),"Export must precede optional color audit");
  assert.ok(app.includes('$("modeHelp").textContent'),"Mode descriptions must update on mode changes");
  assert.ok(app.includes('$("rangeMeaning").textContent'),"Slider meaning must update when switching modes");
});
test("mobile control legibility regression from iPhone recording",()=>{
  assert.match(css,/\.mode-guide\s*\{/);
  assert.match(css,/\.studio-shortcuts\s+a\s*\{/);
  assert.match(css,/\.view-modes button\{min-height:46px;font-size:13px\}/);
  assert.match(css,/\.control label\{font-size:13px\}/);
  assert.match(css,/\.note-item textarea,.report-info input,.report-info textarea\{font-size:16px\}/);
});
