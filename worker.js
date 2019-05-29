function workerFunction(ev) {
  let canvas = ev.data.canvas;
  let ctx = canvas.getContext("2d");
  let printed = true;
  let entered = false;
  for (let i = 0; i < ev.data.vars.width; i++) {
    for (let j = 0; j < ev.data.vars.height; j++) {
      const coords = translatePixelToComplex(i, j, ev.data.vars.factors);
      const x = coords.x;
      const y = coords.y;
      const iteratee = complex(x, y);
      let outOfBounds = false;
      let fillColor = "rgba(0,0,0)";
      let z = complex(0, 0);
      let completedIterations;
      for (let k = 0; k < ev.data.vars.totalIterations; k++) {
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
        const colorValues = ev.data.vars.colorTable[Math.floor((completedIterations - 1) % ev.data.vars.totalColors)];
        fillColor = `rgba(${colorValues[0]},${colorValues[1]},${colorValues[2]}, 1)`;
      }
      ctx.fillStyle = fillColor;
      ctx.fillRect(i, j, 1, 1);
    }
    const percentageCompleted = (i + 1) * 100 / ev.data.vars.width;
    const modulo = percentageCompleted % 1;
    if (modulo < 0.5) {
      entered = true;
    } else {
      entered = false;
    }
    if (entered && !printed) {
      self.postMessage({type: "progress"});
      printed = true;
    }
    if (!entered) {
      printed = false;
    }
  }
  self.postMessage({type: "done", bitmap: canvas.transferToImageBitmap(), id: ev.data.id});

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
  
  function translatePixelToComplex(x, y, factors) {
    return {
      x: (x + factors.xScale) / factors.xFactor,
      y: (y + factors.yScale) / factors.yFactor
    };
  }
}
