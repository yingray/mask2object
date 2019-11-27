import { decompress, decompresspako, testFunc } from "./utils";

const main = (mask, width, height) =>
  new Promise(async resolve => {
    const data = decompress(mask, width, height, {}, true);
    const image = {
      data,
      width,
      height,
      bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
    };

    resolve();
  });

export default main;