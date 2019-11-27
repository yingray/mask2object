import React, { useState, useEffect } from "react";
import Konva from "konva";
import { Stage, Layer, Rect, Text, Circle, Line, Shape, Image, Transformer } from "react-konva";
import mask from "./usagi";
import utils from "./utils-2";
// import logo from "./logo.svg";
import "./App.css";

const bigMask = {
  mask: require("./mask"),
  width: 4892,
  height: 4020
};

const usagi = {
  mask: require("./usagi"),
  width: 254,
  height: 222
};

function App() {
  const [data, setData] = useState();
  const [url, setUrl] = useState();
  const [cs, setCs] = useState();
  const [width, setWidth] = useState();
  const [height, setHeight] = useState();

  // const trRef = React.useRef();

  useEffect(() => {
    const mask = usagi;
    const t1 = performance.now();
    setWidth(mask.width);
    setHeight(mask.height);
    utils(mask.mask, mask.width, mask.height).then(({ cv, cs, url }) => {
      setData(cv);
      setCs(cs);
      setUrl(url);
      const t2 = performance.now();
      console.log(t2 - t1);
    });
  }, []);

  const sceneFunc = (cs, width, height) => (ctx, shape) => {
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
    // (!) Konva specific method, it is very important
    ctx.fillStrokeShape(shape);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={url} width="650" height="650" alt="lung" />
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        {cs && (
          <Stage width={window.innerWidth} height={window.innerHeight}>
            <Layer>
              <Shape sceneFunc={sceneFunc(cs, width, height)} scaleX={1} scaleY={1} />
              {/* <Image x={0} y={0} image={data} 
                scaleX={5}
                scaleY={5}/> */}
              {/* <Transformer ref={trRef} /> */}
            </Layer>
          </Stage>
        )}
      </header>
    </div>
  );
}

export default App;
