import zlib, { Z_BEST_COMPRESSION } from "zlib";
import pako from "pako";
import bitwise from "bitwise";
import ImageTracer from "imagetracerjs";

import { GPU } from "gpu.js";
import { encode } from "punycode";

function toUint11Array(input) {
  var buffer = 0,
    numbits = 0;
  var output = [];

  for (var i = 0; i < input.length; i++) {
    // prepend bits to buffer
    buffer |= input[i] << numbits;
    numbits += 8;
    // if there are enough bits, extract 11bit chunk
    if (numbits >= 11) {
      output.push(buffer & 0x7ff);
      // drop chunk from buffer
      buffer = buffer >> 11;
      numbits -= 11;
    }
  }
  // also output leftover bits
  if (numbits != 0) output.push(buffer);

  return output;
}
// const gpu = new GPU();
// TODO: import utils

const decompressWithPako = mask => {
  // // Decode base64 (convert ascii to binary)
  // var strData = atob(mask);
  // // Convert binary string to character-number array
  // var charData = strData.split("").map(function(x) {
  //   return x.charCodeAt(0);
  // });
  // var binData = new Uint8Array(charData);
  const buf = Buffer.from(mask, "base64");
  const decompressed = pako.inflate(buf);
  return decompressed;
};

const decompressWithZlib = mask => {
  const options = { level: Z_BEST_COMPRESSION };
  const buf = Buffer.from(mask, "base64");
  const decompressed = zlib.inflateSync(buf, options);
  return decompressed;
};

const toOneD = (decompressed, width, height) => {
  const oneD = [];
  for (const byte of decompressed) {
    oneD.push(...bitwise.byte.read(byte));
  }
  const arr = oneD.slice(0, width * height);
  return arr;
};

/**
 * decompress decompresses a base64 string to a 1D list with 0 and 1
 *
 * @param {Array} mask a bit mask compressed by zlib's deflate and represented in base64
 * @param {Number} width image width
 * @param {Number} height image height
 * @param {Object} [options={ level: Z_BEST_COMPRESSION }]
 * @returns a list with 0 or 1
 */
export const decompress = (mask, width, height, options = { level: Z_BEST_COMPRESSION }, pako) => {
  const t1 = performance.now();
  const decompressed = pako ? decompressWithPako(mask) : decompressWithZlib(mask);
  const t2 = performance.now();
  const result = pako
    ? bitwise.buffer.read(Buffer.from(decompressed), 0, width * height)
    : toOneD(decompressed, width, height);
  // const result = bitwise.buffer.read(Buffer.from(decompressed), 0, width * height);
  const t3 = performance.now();
  console.log("1 decompress: ", t2 - t1);
  console.log("2 decompress: ", t3 - t2);
  console.log("total decompressed: ", t3 - t1);
  return result;
};

export const decompresspako = (mask, width, height, options = { level: Z_BEST_COMPRESSION }) => {
  const t1 = performance.now();
  const decompressed = decompressWithPako(mask);
  const t2 = performance.now();
  const result = bitwise.buffer.read(Buffer.from(decompressed), 0, width * height);
  const t3 = performance.now();
  console.log("1 decompress: ", t2 - t1);
  console.log("2 decompress: ", t3 - t2);

  return result;
};

export const testFunc = () => {
  var test = new Uint8Array([1, 2, 3, 4, 5]);

  var binaryString = pako.deflate(JSON.stringify(test), { to: "string" });
  console.log(binaryString);

  //
  // Here you can do base64 encode, make xhr requests and so on.
  //
  var enc = window.btoa(binaryString);
  console.log(enc);
  var dec = window.atob(enc);

  var restored = pako.inflate(dec, { to: "string" });
  console.log(restored);
  return restored;
};

/**
 * downsize() downsizes monochrome to specific width
 *
 * @param {Array} monochromeArray a bit mask compressed by zlib's deflate and represented in base64
 * @param {Number} width image width
 * @param {Number} height image height
 * @param {Number} targetWidth target width
 * @returns a list with 0 or 1
 */
const downsize = (monochromeArray, width, height, targetWidth) => {
  if (width <= targetWidth) {
    return {
      downsizedMonochrome: monochromeArray,
      downsizedWidth: width,
      downsizedHeight: height
    };
  }

  const ratio = width / targetWidth;
  const targetHeight = Math.floor(height / ratio);
  const downsizedMonochrome = new Uint8Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const index = y * targetWidth + x;
      const originalIndex = Math.floor(y * ratio) * width + Math.floor(x * ratio);
      downsizedMonochrome[index] = monochromeArray[originalIndex];
    }
  }

  return {
    downsizedMonochrome,
    downsizedWidth: targetWidth,
    downsizedHeight: targetHeight
  };
};

// TODO: refactor to https://gist.github.com/mautematico/6c5df119a326cdb522aa
export const toImageDataURL = imageData => {
  const t1 = performance.now();
  const cv = document.createElement("canvas");
  cv.width = imageData.width;
  cv.height = imageData.height;
  cv.getContext("2d").putImageData(imageData, 0, 0);
  const url = cv.toDataURL();
  const t2 = performance.now();
  console.log("toImageDataURL: ", t2 - t1);
  return url;
};

/**
 * toImageData converts monochrome list to a width*height ImageData with specified color
 *
 * @param {Array} monochromeArray a bit mask compressed by zlib's deflate and represented in base64
 * @param {String} color the color to fill pixel, e.g., '#FF0000'
 * @param {Number} width image width
 * @param {Number} height image height
 * @param {Object} [options={ level: Z_BEST_COMPRESSION }]
 * @returns a list with 0 or 1
 */
const toImageData = (monochromeArray, color, width, height) => {
  const t1 = performance.now();
  if (color.length !== 7 || !color.startsWith("#")) {
    throw new Error("color format incorrect. Use format like '#FF0000'");
  }
  const R = parseInt(color.slice(1, 3), 16);
  const G = parseInt(color.slice(3, 5), 16);
  const B = parseInt(color.slice(5, 7), 16);

  const pixelBytes = 4;
  const coloredArray = new Uint8ClampedArray(width * height * pixelBytes);
  monochromeArray.forEach((pixel, index) => {
    coloredArray[index * pixelBytes] = pixel ? R : 0;
    coloredArray[index * pixelBytes + 1] = pixel ? G : 0;
    coloredArray[index * pixelBytes + 2] = pixel ? B : 0;
    coloredArray[index * pixelBytes + 3] = pixel ? 255 : 0;
  });
  const t2 = performance.now();
  console.log("toImageData: ", t2 - t1);
  return new ImageData(coloredArray, width, height);
};

const decompressToImageData = (mask, width, height, color, { shouldDownsize = false } = {}) => {
  let monochrome = decompress(mask, width, height);
  let imageWidth = width;
  let imageHeight = height;
  if (shouldDownsize) {
    const { downsizedMonochrome, downsizedWidth, downsizedHeight } = downsize(monochrome, width, height, 128);
    monochrome = downsizedMonochrome;
    imageWidth = downsizedWidth;
    imageHeight = downsizedHeight;
  }
  // return new ImageData(monochrome, width, height)
  const imageData = toImageData(monochrome, color, imageWidth, imageHeight);
  return imageData;
};

const utils = (mask, width, height) =>
  new Promise(resolve => {
    const color = "#3366aa";
    const imageData = decompressToImageData(mask, width, height, color);
    const dataUrl = toImageDataURL(imageData);
    const t1 = performance.now();
    ImageTracer.imageToSVG(dataUrl, svgstr => {
      const t2 = performance.now();
      console.log("ImageTracer: ", t2 - t1);
      const t3 = performance.now();
      console.log(svgstr)
      const blob = new Blob([svgstr], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const t4 = performance.now();
      console.log("object url: ", t4 - t3);
      return resolve({url});
    });
  });

export default utils;
