document.onreadystatechange = () => {
  if (document.readyState === 'complete') {
    const canvas = document.querySelector("#canvas");
    const ctx = canvas.getContext("2d");
    const zoomWindow = document.getElementById("zoom");
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
      st: document.getElementById("steps")
    };
    const height = 800;
    const width = 800;
    const totalColors = 200;
    const colorTable = [];
    const imagePadding = "00000";
    let imageCounter = 1;
    let centerComplexClick;
    let centerPixelClick;
    let radiusClick;
    let totalIterations = 100;
    let minRangeX = -2;
    let maxRangeX = 2;
    let minRangeY = -2;
    let maxRangeY = 2;
    let zoomFactor;
    let detailFactor;
    let animating = false;
    calculateRanges();
    calculateFactors();
    calculateColors();
    window.requestAnimationFrame(renderNext);

    canvas.onmousedown = (ev) => {
      centerComplexClick = translatePixelToComplex(ev.clientX, ev.clientY);
      centerPixelClick = { x: ev.clientX, y: ev.clientY };
      canvas.addEventListener("mousemove", drawZoomWindow);
    }

    canvas.onmouseleave = (ev) => {
      canvas.removeEventListener("mousemove", drawZoomWindow);
      zoomWindow.style.display = "none";
    }

    canvas.onmouseenter = (ev) => {
      if (ev.buttons === 1 && centerPixelClick) {
        canvas.addEventListener("mousemove", drawZoomWindow);
      }
    }

    canvas.onmouseup = (ev) => {
      canvas.removeEventListener("mousemove", drawZoomWindow);
      zoomWindow.style.display = "none";
      const coords = translatePixelToComplex(ev.clientX, ev.clientY);
      const xDist = centerComplexClick.x - coords.x;
      const yDist = centerComplexClick.y - coords.y;
      radiusClick = Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
      inputs.r.value = radiusClick;
      inputs.ca.value = centerComplexClick.x;
      inputs.cb.value = centerComplexClick.y;
      calculateRanges();
      calculateFactors();
      window.requestAnimationFrame(renderNext);
    };

    document.getElementById("updateBtn").addEventListener("click", (ev) => {
      calculateRanges();
      calculateFactors();
      window.requestAnimationFrame(renderNext);
    });

    document.getElementById("saveBtn").addEventListener("click", (ev) => {
      saveAsJPEG();
    });

    document.getElementById("startBtn").addEventListener("click", (ev) => {
      inputs.r.value = inputs.sr.value;
      inputs.i.value = inputs.si.value;
      calculateZoomAndDetailFactors();
      animating = true;
      window.requestAnimationFrame(renderNextAnimation);
    });

    function drawZoomWindow(ev) {
      const xDist = ev.clientX - centerPixelClick.x;
      const yDist = ev.clientY - centerPixelClick.y;
      const radius = Math.round(Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2))) - 10;
      zoomWindow.style.left = `${centerPixelClick.x - radius}px`;
      zoomWindow.style.top = `${centerPixelClick.y - radius}px`;
      zoomWindow.style.width = `${radius * 2}px`;
      zoomWindow.style.height = `${radius * 2}px`;
      zoomWindow.style.borderRadius = `${radius}px`;
      zoomWindow.style.display = "block";
    }

    function calculateColors() {
      for (let i = 0; i < totalColors; i++) {
        colorTable.push(calculateColorValue(i, totalColors));
      }
    }

    function calculateFactors() {
      xFactor = width / (maxRangeX - minRangeX);
      xScale = ((xFactor * (maxRangeX + minRangeX)) - width) / 2;
      yFactor = (-1 * height) / (maxRangeY - minRangeY);
      yScale = ((yFactor * (maxRangeY + minRangeY)) - height) / 2;
    }

    function calculateRanges() {
      const ca = parseFloat(inputs.ca.value);
      const cb = parseFloat(inputs.cb.value);
      const r = parseFloat(inputs.r.value);
      minRangeX = ca - r;
      maxRangeX = ca + r;
      minRangeY = cb - r;
      maxRangeY = cb + r;
      totalIterations = parseInt(inputs.i.value);
    }

    function calculateZoomAndDetailFactors(){
      zoomFactor = Math.pow(inputs.fr.value / inputs.sr.value, 1 / inputs.st.value);
      detailFactor = Math.pow(inputs.fi.value / inputs.si.value, 1 / inputs.st.value);
    }

    function translatePixelToComplex(x, y) {
      return {
        x: (x + xScale) / xFactor,
        y: (y + yScale) / yFactor
      };
    }

    function discardCardioidAndBulb(c) {
      const p = Math.sqrt(Math.pow(c.real - (1 / 4), 2) + Math.pow(c.imaginary, 2));
      if (c.real <= p - (2 * p * p) + 1 / 4) {
        return true;
      }
      if (Math.pow(c.real + 1, 2) + (Math.pow(c.imaginary, 2)) <= (1 / 16)) {
        return true;
      }
      return false;
    }

    function renderNext() {
      renderFrame(totalIterations);
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
        calculateRanges();
        calculateFactors();
        renderFrame(iterations);
      }else{
        animating = false;
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

    function renderFrame(m) {
      let printed = true;
      let entered = false;
      for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
          const coords = translatePixelToComplex(i, j);
          const x = coords.x;
          const y = coords.y;
          const iteratee = complex(x, y);
          let outOfBounds = false;
          fillColor = "rgba(0,0,0)";
          let z = complex(0, 0);
          let completedIterations;
          for (let k = 0; k < m; k++) {
            if (discardCardioidAndBulb(iteratee)) {
              break;
            }
            let result = iterate(z, iteratee);
            completedIterations = k + 1;
            if (Math.pow(result.real, 2) + Math.pow(result.imaginary, 2) >= 4) {
              outOfBounds = true;
              break;
            }
            z = result;
          }
          if (outOfBounds) {
            const colorValues = colorTable[Math.floor((completedIterations - 1) % totalColors)];
            fillColor = `rgba(${colorValues[0]},${colorValues[1]},${colorValues[2]}, 1)`;
          }
          ctx.fillStyle = fillColor;
          ctx.fillRect(i, j, 1, 1);
        }
        const percentageCompleted = (i + 1) * 100 / width;
        const modulo = Math.floor(percentageCompleted % 5);
        if (modulo === 0) {
          entered = true;
        } else {
          entered = false;
        }
        if (entered && !printed) {
          console.log(`${percentageCompleted}%`);
          printed = true;
        }
        if (!entered) {
          printed = false;
        }
      }
      if(animating){
        if(inputs.sj.checked){
          saveAsJPEG();
        }
        window.requestAnimationFrame(renderNextAnimation);
      }
    }

    function calculateColorValue(completed, total) {
      let red;
      let green;
      let blue;
      const segmentSize = total / 7;
      const currentSegment = Math.floor(completed / segmentSize);
      const segmentPortion = completed % segmentSize;
      const proportion = Math.floor(segmentPortion * 255 / segmentSize);
      switch (currentSegment) {
        case 0:
          red = 255;
          green = 255 - proportion;
          blue = 255 - proportion;
          break;
        case 1:
          red = 255;
          green = proportion;
          blue = 0;
          break;
        case 2:
          red = 255 - proportion;
          green = 255;
          blue = 0;
          break;
        case 3:
          red = 0;
          green = 255;
          blue = proportion;
          break;
        case 4:
          red = 0;
          green = 255 - proportion;
          blue = 255;
          break;
        case 5:
          red = 0;
          green = 0;
          blue = 255 - proportion;
          break;
        case 6:
          red = proportion;
          green = proportion;
          blue = proportion;
          break;
      }
      return [red, green, blue];
    }

    function complex(a, b) {
      const real = a;
      const imaginary = b;
      return {
        real: a,
        imaginary: b,
        add: (c) => {
          const r = real + c.real;
          const im = imaginary + c.imaginary;
          return complex(r, im);
        },
        multiply: (c) => {
          const f = real * c.real;
          const o = real * c.imaginary;
          const i = imaginary * c.real;
          const l = imaginary * c.imaginary;
          const r = f - l;
          const im = o + i;
          return complex(r, im);
        }
      }
    }

    function iterate(z, c) {
      return z.multiply(z).add(c);
    }
  }
};