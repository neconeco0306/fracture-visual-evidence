import {test,expect} from "@playwright/test";
import fs from "node:fs/promises";

// Browser-level regression for the actual user journey, complementary to the
// existing deterministic Node tests. Synthetic cases only: no personal images.
test.use({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,
  hasTouch:true,acceptDownloads:true,
  reducedMotion:"reduce"
});
const base=process.env.TEST_BASE_URL||"http://127.0.0.1:8000";

async function pngIsValid(download,expectedWidth,expectedHeight){
  const bytes=await fs.readFile(await download.path());
  expect(bytes.subarray(0,8).toString("hex")).toBe("89504e470d0a1a0a";
  expect(bytes.readUInt32BE(16)).toBe(expectedWidth);
  expect(bytes.readUInt32BE(20)).toBe(expectedHeight);
}

test("mobile comparison: load demo, switch modes, pin note and export files",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/",{waitUntil:"load"});
  await expect(page.locator("#demoButton")).toBeVisible();
  await page.locator("#demoButton").click();
  await expect(page.locator("#changePercent")).not.toHaveText("—");
  await expect(page.locator("#beforeImage")).toHaveJSProperty("complete",true);
  await expect(page.locator("#afterImage")).toHaveJSProperty("complete",true);

  await page.locator('[data-mode="overlay"]').click();
  await expect(page.locator("#modeHelp")).toContainText("OVERLAY");
  await expect(page.locator("#rangeMeaning")).toHaveText("AFTER OPACITY");
  await page.locator("#compareRange").fill("80");
  await expect(page.locator("#rangeValue")).toHaveText("80%");

  await page.locator('[data-mode="diff"]').click();
  await expect(page.locator("#modeHelp")).toContainText("DIFF");
  await expect(page.locator("#diffCanvas")).toBeVisible();
  await page.locator("#thresholdRange").fill("50");
  await expect(page.locator("#thresholdValue")).toHaveText("50");

  await page.locator('[data-mode="split"]').click();
  await page.locator("#pinMode").click();
  await expect(page.locator("#modeHelp")).toContainText("PIN MODE ON");
  const rect=await page.locator("#visualStage").boundingBox();
  expect(rect).not.toBeNull();
  await page.locator("#visualStage").click({position:{x:rect.width*0.55,y:rect.height*0.52}});
  await expect(page.locator("#pinCount")).toHaveText("01");
  await expect(page.locator('[data-note-index="0"]')).toBeVisible();
  await page.locator('[data-note-index="0"]').fill("Synthetic sample: review CTA alignment.");
  await page.locator("#reportTitle").fill("Mobile regression / synthetic case");

  const pngWait=page.waitForEvent("download");
  await page.locator("#exportPng").click();
  const png=await pngWait;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  await pngIsValid(png,1600,1100);

  const jsonWait=page.waitForEvent("download");
  await page.locator("#exportJson").click();
  const json=await jsonWait;
  expect(json.suggestedFilename()).toMatch(/\.json$/);
  const data=JSON.parse(await fs.readFile(await json.path(),"utf8"));
  expect(data.format).toBe("fracture.visual-inspection.v1");
  expect(data.title).toBe("Mobile regression / synthetic case");
  expect(data.annotations[0].text).toContain("CTA alignment");
  expect(data.measurement.status).toBe("measured");
  expect(JSON.stringify(data)).not.toContain("data:image/png;base64");
  const scroll=await page.evaluate(()=>({w:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(scroll.w).toBeLessThanOrEqual(scroll.inner+1);
  expect(errors).toEqual([]);
});

test("dedicated contrast lab: local sample, color ratio and export PNG",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/contrast.html",{waitUntil:"load"});
  await page.locator("#contrastDemo").click();
  await expect(page.locator("#contrastImageStatus")).not.toContainText("NO IMAGE LOADED");
  await page.locator("#foregroundHex").fill("#000000");
  await page.locator("#backgroundHex").fill("#FFFFFF");
  await expect(page.locator("#ratioValue")).toContainText("21");
  await expect(page.locator("#aaNormal")).toContainText("MEETS");
  await expect(page.locator("#aaaNormal")).toContainText("MEETS");

  const pngWait=page.waitForEvent("download");
  await page.locator("#exportContrast").click();
  const png=await pngWait;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  await pngIsValid(png,1400,900);

  // Navigation back to the main comparison should resolve on any subpath host.
  await page.locator('.masthead a.brand').click();
  await expect(page.locator("#demoButton")).toBeVisible();
  const scroll=await page.evaluate(()=>({w:document.documentElement.scrollWidth,inner:innerWidth}));
  expect(scroll.w).toBeLessThanOrEqual(scroll.inner+1);
  expect(errors).toEqual([]);
});
