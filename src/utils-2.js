import MagicWand from "./magic-wand";
import { decompress, decompresspako, testFunc } from "./utils";

const csToSVG = (cs, width, height) => {
  const sarr = cs.filter(c => !c.inner).map(c => {
    let str = "";
    if (!c.inner) {
      const ps = c.points;
      str += `M ${ps[0].x} ${ps[0].y} `;
      for (var j = 1; j < ps.length; j++) {
        str += `L ${ps[j].x} ${ps[j].y} `;
      }
    }
    return `
    <path xmlns="http://www.w3.org/2000/svg" fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="${str} Z "/>
    `;
  });
  const svg= `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" version="1.1">
  ${sarr.join("")}
  </svg>`;
  console.log(svg)
  return svg
};

const csToCanvas = (cs, width, height) => {
  const cv = document.createElement("canvas");
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  //outer
  ctx.beginPath();
  for (var i = 0; i < cs.length; i++) {
    if (cs[i].inner) continue;
    var ps = cs[i].points;
    ctx.moveTo(ps[0].x, ps[0].y);
    for (var j = 1; j < ps.length; j++) {
      ctx.lineTo(ps[j].x, ps[j].y);
    }
  }
  ctx.fillStyle = "white";
  ctx.fill();

  //inner
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  for (var i = 0; i < cs.length; i++) {
    if (!cs[i].inner) continue;
    var ps = cs[i].points;
    ctx.moveTo(ps[0].x, ps[0].y);
    for (var j = 1; j < ps.length; j++) {
      ctx.lineTo(ps[j].x, ps[j].y);
    }
  }
  // ctx.fillStyle = "#fff";
  ctx.fill();

  return cv;
};

const main = (mask, width, height) =>
  new Promise(async resolve => {
    // const t1 = performance.now();
    const data = decompress(mask, width, height, {}, true);
    // const t2 = performance.now();
    // console.log("decompress: ", t2 - t1);
    const image = {
      data,
      width,
      height,
      bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
    };
    console.log(image);
    const t3 = performance.now();
    const cs = MagicWand.traceContours(image);
    const t4 = performance.now();
    console.log("traceContours: ", t4 - t3);
    console.log(cs);

    const t5 = performance.now();
    const cv = csToCanvas(cs, width, height);
    const url = cv.toDataURL();
    console.log(cv);
    const t6 = performance.now();
    console.log("csToImageDataUrl: ", t6 - t5);
    // const resp = await fetch(str)
    // const blob = await resp.blob()
    // console.log(blob)

    // const url = URL.createObjectURL(blob);

    resolve({ cv, cs, url });
  });

export default main;
