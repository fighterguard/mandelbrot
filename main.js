document.onreadystatechange = () => {
  if (document.readyState === 'complete') {

    //declarations

    const startingColors = [
      {red: 255, green: 255, blue: 255}, // white
      {red: 255, green: 0, blue: 0}, // red
      {red: 255, green: 255, blue: 0}, // yellow
      {red: 0, green: 255, blue: 0}, // green
      {red: 0, green: 0, blue: 255}, // blue
      {red: 0, green: 0, blue: 0}, //black
      {red: 255, green: 255, blue: 255}, // white
    ];

    const canvas = document.querySelector("#canvas");
    ctx = canvas.getContext("2d");
    const bufferCanvas = document.createElement("canvas");
    bufferCtx = bufferCanvas.getContext("bitmaprenderer");
    const canvasContainer = document.getElementById("canvasContainer");
    const zoomWindow = document.getElementById("zoom");
    const progressFiller = document.getElementById("progressBarFiller");
    const workers = [];
    const imagePadding = "00000";
    const inputs = {
      ca: document.getElementById("centera"),
      cb: document.getElementById("centerb"),
      r: document.getElementById("radius"),
      i: document.getElementById("iterations"),
      sr: document.getElementById("startRadius"),
      fr: document.getElementById("finalRadius"),
      si: document.getElementById("startIterations"),
      fi: document.getElementById("finalIterations"),
      sj: document.getElementById("saveAsJpeg"),
      fn: document.getElementById("filename"),
      st: document.getElementById("steps"),
      rv: document.getElementById("redValue"),
      gv: document.getElementById("greenValue"),
      bv: document.getElementById("blueValue"),
      tc: document.getElementById("totalColors")
    };
    const quadrants = [
      {
        x: 400,
        y: 0
      },
      {
        x: 0,
        y: 0
      },
      {
        x: 0,
        y: 400
      },
      {
        x: 400,
        y: 400
      }
    ];

    let totalColors = 200;
    let colorTable = [];
    let selectedColorIndex;
    let imageCounter = 1;
    let centerComplexClick;
    let centerPixelClick;
    let radiusClick = 2;
    let detailFactor;
    let currentRanges;
    let currentFactors;
    let animating = false;
    let currentProgress = 0;
    let renderComplete = 0;
    let startTime;
    let endTime;

    for (let i = 0; i < 4; i++) {
      workers.push(createWorker());
      // workers[0].addEventListener("message", (ev) => {
      //   if(ev.data.type === "done"){
      //     bufferCtx.transferFromImageBitmap(ev.data.bitmap);
      //     ctx.drawImage(bufferCanvas, 0, 0);
      //     if(animating){
      //       if(inputs.sj.checked){
      //         saveAsJPEG();
      //       }
      //       renderNextAnimation();
      //     }
      //   }
      //   if(ev.data.type === "progress"){
      //     progressFiller.style.width = `${ev.data.completed}%`;
      //   }
      // });
    }


    //function calls

    calculateCurrentValues();
    calculateColors();
    fillColorList();
    renderOffScreen();


    //event listeners

    canvasContainer.onmousedown = (ev) => {
      centerComplexClick = translatePixelToComplex(ev.clientX, ev.clientY);
      centerPixelClick = { x: ev.clientX, y: ev.clientY };
      zoomWindow.style.left = `${centerPixelClick.x}px`;
      zoomWindow.style.top = `${centerPixelClick.y}px`;
      //zoomWindow.style.display = "none";
      canvasContainer.addEventListener("mousemove", drawZoomWindow);
    }

    canvasContainer.onmouseleave = (ev) => {
      canvasContainer.removeEventListener("mousemove", drawZoomWindow);
    }

    canvasContainer.onmouseenter = (ev) => {
      if (ev.buttons === 1 && centerPixelClick) {
        canvasContainer.addEventListener("mousemove", drawZoomWindow);
      }
    }

    canvasContainer.onmouseup = (ev) => {
      canvasContainer.removeEventListener("mousemove", drawZoomWindow);
      //zoomWindow.style.display = "none";
      const coords = translatePixelToComplex(ev.clientX, ev.clientY);
      const xDist = centerComplexClick.x - coords.x;
      const yDist = centerComplexClick.y - coords.y;
      inputs.ca.value = centerComplexClick.x;
      inputs.cb.value = centerComplexClick.y;
      radiusClick = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
      if(radiusClick > 0){
        inputs.r.value = radiusClick;
      }
    };

    document.getElementById("updateBtn").addEventListener("click", (ev) => {
      renderOffScreen();
    });

    document.getElementById("saveBtn").addEventListener("click", (ev) => {
      saveAsJPEG();
    });

    document.getElementById("startBtn").addEventListener("click", (ev) => {
      inputs.r.value = inputs.sr.value;
      inputs.i.value = inputs.si.value;
      calculateZoomAndDetailFactors();
      animating = true;
      renderNextAnimation();
    });

    document.querySelectorAll(".slider").forEach((e) => {
      e.oninput = (ev) => {
        applyPreviewColor();
      }
    });

    document.getElementById("updateColorBtn").addEventListener("click", (ev) => {
      startingColors[selectedColorIndex].red = parseInt(inputs.rv.value);
      startingColors[selectedColorIndex].green = parseInt(inputs.gv.value);
      startingColors[selectedColorIndex].blue = parseInt(inputs.bv.value);
      fillColorList();
    });

    document.getElementById("removeColorBtn").addEventListener("click", (ev) => {
      startingColors.splice(selectedColorIndex, 1);
      fillColorList();
    });

    document.getElementById("addColorBtn").addEventListener("click", (ev) => {
      startingColors.push({
        red: parseInt(inputs.rv.value),
        green: parseInt(inputs.gv.value),
        blue: parseInt(inputs.bv.value)
      });
      fillColorList();
    });

    document.getElementById("applyColorBtn").addEventListener("click", (ev) => {
      calculateColors();
    });


    //methods

    function createWorker(){
      let blob = new Blob([
        "onmessage = function(ev){\
            " + workerFunction.toString() + "\
            workerFunction(ev);}"
      ]);
      let blobURL = window.URL.createObjectURL(blob);
      let worker = new Worker(blobURL);
      worker.addEventListener("message", (ev) => {
        if(ev.data.type === "done"){
          bufferCtx.transferFromImageBitmap(ev.data.bitmap);
          ctx.drawImage(bufferCanvas, quadrants[ev.data.id].x, quadrants[ev.data.id].y);
          renderComplete++;
          if(renderComplete === 4){
            endTime = performance.now();
            console.log(`Rendering finished after ${endTime - startTime} milliseconds`);
            calculateCurrentValues();
            if(animating){
              if(inputs.sj.checked){
                saveAsJPEG();
              }
              renderNextAnimation();
            }
          }
        }
        if(ev.data.type === "progress"){
          currentProgress += 0.25;
          progressFiller.style.width = `${currentProgress}%`;
        }
      });
      return worker;
    }

    function fillColorList(){
      document.getElementById("colorListContainer").innerHTML = "";
      document.getElementById("updateColorBtn").disabled = true;
      document.getElementById("removeColorBtn").disabled = true;
      let gradientText = "linear-gradient(to right";
      for (let i = 0; i < startingColors.length; i++) {
        const radio = document.createElement("input");
        radio.id = `color${i}`;
        radio.setAttribute("type", "radio");
        radio.setAttribute("name", "selectedColor");
        radio.setAttribute("value", i);
        radio.setAttribute("class", "colorSelector");
        radio.onchange = radioChanged;
        const colorDiv = document.createElement("div");
        colorDiv.style.height = "20px";
        colorDiv.style.width = "20px";
        colorDiv.style.border = "1px solid black";
        colorDiv.style.backgroundColor = `rgb(${startingColors[i].red}, ${startingColors[i].green}, ${startingColors[i].blue})`;
        const parentDiv = document.createElement("div");
        parentDiv.style.display = "flex";
        parentDiv.style.flexFlow = "row nowrap";
        parentDiv.appendChild(radio);
        parentDiv.appendChild(colorDiv);
        document.getElementById("colorListContainer").appendChild(parentDiv);
        gradientText = `${gradientText}, rgb(${startingColors[i].red}, ${startingColors[i].green}, ${startingColors[i].blue})`;
      }
      gradientText = `${gradientText})`;
      document.getElementById("gradientSample").style.backgroundImage = gradientText;
    }

    function radioChanged(ev){
      const index = ev.target.value;
      inputs.rv.value = startingColors[index].red;
      inputs.gv.value = startingColors[index].green;
      inputs.bv.value = startingColors[index].blue;
      selectedColorIndex = index;
      document.getElementById("updateColorBtn").disabled = false;
      document.getElementById("removeColorBtn").disabled = false;
      applyPreviewColor();
    }

    function applyPreviewColor(){
      document.getElementById("colorPreview").style.backgroundColor = `rgb(${inputs.rv.value}, ${inputs.gv.value}, ${inputs.bv.value})`;
    }

    function drawZoomWindow(ev) {
      const xDist = ev.clientX - centerPixelClick.x;
      const yDist = ev.clientY - centerPixelClick.y;
      const radius = Math.round(Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2)));    
      zoomWindow.style.left = `${centerPixelClick.x}px`;
      zoomWindow.style.top = `${centerPixelClick.y}px`;
      zoomWindow.style.width = `${radius * 2}px`;
      zoomWindow.style.height = `${radius * 2}px`;
      zoomWindow.style.display = "block";
    }

    function calculateCurrentValues(){
      currentRanges = calculateRanges();
      currentFactors = calculateFactors(currentRanges, 800, 800);
    }

    function calculateFactors(ranges, width, height) {
      const factors = {};
      factors.xFactor = width / (ranges.maxRangeX - ranges.minRangeX);
      factors.xScale = ((factors.xFactor * (ranges.maxRangeX + ranges.minRangeX)) - width) / 2;
      factors.yFactor = (-1 * height) / (ranges.maxRangeY - ranges.minRangeY);
      factors.yScale = ((factors.yFactor * (ranges.maxRangeY + ranges.minRangeY)) - height) / 2;
      return factors;
    }

    function calculateRanges() {
      const ranges = {};
      const ca = parseFloat(inputs.ca.value);
      const cb = parseFloat(inputs.cb.value);
      const r = parseFloat(inputs.r.value);
      ranges.minRangeX = ca - r;
      ranges.maxRangeX = ca + r;
      ranges.minRangeY = cb - r;
      ranges.maxRangeY = cb + r;
      return ranges;
    }

    function calculateQuadrantRanges(){
      const ranges = [];
      const ca = parseFloat(inputs.ca.value);
      const cb = parseFloat(inputs.cb.value);
      const r = parseFloat(inputs.r.value);
      ranges.push({
        minRangeX: ca,
        maxRangeX: ca + r,
        minRangeY: cb,
        maxRangeY: cb + r
      });
      ranges.push({
        minRangeX: ca - r,
        maxRangeX: ca,
        minRangeY: cb,
        maxRangeY: cb + r
      });
      ranges.push({
        minRangeX: ca - r,
        maxRangeX: ca,
        minRangeY: cb - r,
        maxRangeY: cb
      });
      ranges.push({
        minRangeX: ca,
        maxRangeX: ca + r,
        minRangeY: cb - r,
        maxRangeY: cb
      });
      return ranges;
    }

    function calculateZoomAndDetailFactors(){
      zoomFactor = Math.pow(inputs.fr.value / inputs.sr.value, 1 / inputs.st.value);
      detailFactor = Math.pow(inputs.fi.value / inputs.si.value, 1 / inputs.st.value);
    }

    function translatePixelToComplex(x, y) {
      return {
        x: (x + currentFactors.xScale) / currentFactors.xFactor,
        y: (y + currentFactors.yScale) / currentFactors.yFactor
      };
    }

    function renderNextAnimation() {
      let iterations = parseInt(inputs.i.value);
      let radius = parseFloat(inputs.r.value);
      let finalRadius = parseFloat(inputs.fr.value);
      if (radius > finalRadius) {
        radius *= zoomFactor;
        if (iterations < inputs.fi.value) {
          iterations = Math.round(iterations * detailFactor);
        }
        inputs.i.value = iterations;
        inputs.r.value = radius;
        renderOffScreen();
      }else{
        animating = false;
      }
    }

    function renderOffScreen(){
      startTime = performance.now();
      renderComplete = 0;
      currentProgress = 0;
      zoomWindow.width = 800;
      zoomWindow.height = 800;
      zoomWindow.style.display = "none";
      const ranges = calculateQuadrantRanges();
      const width = 400;
      const height = 400;
      const totalIterations = parseInt(inputs.i.value);
      for (let i = 0; i < ranges.length; i++) {
        const factors = calculateFactors(ranges[i], width, height);
        const vars = {
          width,
          height,
          totalIterations,
          colorTable,
          totalColors,
          factors
        };
        const offCanvas = new OffscreenCanvas(width, height);
        workers[i].postMessage({canvas: offCanvas, vars, id: i}, [offCanvas]);
      }
    }

    function saveAsJPEG() {
      var MIME_TYPE = "image/jpeg";

      var imgURL = canvas.toDataURL(MIME_TYPE);

      var dlLink = document.createElement('a');
      var imageSuffix = (imagePadding + imageCounter).slice(-5);
      dlLink.download = `${inputs.fn.value}${imageSuffix}.jpg`;
      imageCounter++;
      dlLink.href = imgURL;
      dlLink.dataset.downloadurl = [MIME_TYPE, dlLink.download, dlLink.href].join(':');

      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    }

    function calculateProportionFactor(a,b,n) {
      return (b - a)/n;
    }

    function calculateColors() {
      colorTable = [];
      totalColors = parseInt(inputs.tc.value);
      const segmentSize = totalColors / (startingColors.length-1);
      const proportionFactors = [];
      for (let i = 1; i < startingColors.length; i++) {
        proportionFactors.push(
          {
            r: calculateProportionFactor(startingColors[i-1].red, startingColors[i].red, segmentSize),
            g: calculateProportionFactor(startingColors[i-1].green, startingColors[i].green, segmentSize),
            b: calculateProportionFactor(startingColors[i-1].blue, startingColors[i].blue, segmentSize)
          }
        );
      }
      for (let i = 0; i < totalColors; i++) {
        colorTable.push(calculateColorValue(i, proportionFactors, segmentSize));
      }
    }

    function calculateColorValue(completed, proportionFactors, segmentSize) {
      let red;
      let green;
      let blue;
      const currentSegment = Math.floor(completed / segmentSize);
      const segmentPortion = completed - currentSegment * segmentSize;
      red = Math.round(startingColors[currentSegment].red + segmentPortion * proportionFactors[currentSegment].r);
      green = Math.round(startingColors[currentSegment].green + segmentPortion * proportionFactors[currentSegment].g);
      blue = Math.round(startingColors[currentSegment].blue + segmentPortion * proportionFactors[currentSegment].b);
      return [red, green, blue];
    }
  }
};
