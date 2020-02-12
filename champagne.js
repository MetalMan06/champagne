const makerjs = require('makerjs');

/*
function memoize(target, name, descriptor) {
  let cacheKey = `_${name}`;
  let get = descriptor.get;
  return {
    ...descriptor,
    get() {
      return this[cacheKey] = this[cacheKey] || get.call(this);
    }
  };
}
*/

class Champagne {
  constructor(length, width, border, showBorder, shuffle, jitter, maxRadius, ...steps) {
    this.version = 'v0.3.0';
    this.units = makerjs.unitType.Millimeter;

    this.length = length;
    this.width = width;
    this.border = border;
    this.showBorder = showBorder;
    this.shuffle = shuffle;
    this.jitter = jitter;
    this.maxRadius = maxRadius;

    this.steps = steps;

    this.paths = this.getPaths();
    this.models = this.getModels();
    this.notes = this.getNotes();
  }

  static jitter(max) {
    return Math.floor((Math.random() * max * 2) - max);
  }

  static shuffle(a) {
    // NB. shuffles in place
    for (let i = a.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }

  static circle(coords, radius) {
    return new makerjs.paths.Circle(coords, radius);
  }

  coords(ix, iy, jitter) {
    if (!this.jitter) jitter = 0;

    return [
      this.border + this.maxRadius + ix * 2 * this.maxRadius + jitter,
      this.border + this.maxRadius + iy * 2 * this.maxRadius + jitter
    ];
  }


  // @memoize
  get countX() {
    return Math.floor((this.length - (2 * this.border)) / (2 * this.maxRadius));
  }

  // @memoize
  get countY() {
    return Math.floor((this.width - (2 * this.border)) / (2 * this.maxRadius));
  }

  // @memoize
  get holeRadii() {
    let result = [];
    for (let i = 0; i < this.holeCount; i++) {
      let radiiNum = i % this.radii.length; // NB. this will generate an even distribution of radii
      let radius = this.radii[radiiNum];
      result[i] = radius;
    }

    if (this.shuffle) this.constructor.shuffle(result);

    return result;
  }

  // @memoize
  get holeCount() {
    return this.countX * this.countY;
  }

  // @memoize
  get radii() {
    let result = [];

    let radius, step = 0;
    for (let is = 0; is < this.steps.length; is++) {
      step += this.steps[is];
      radius = this.maxRadius - step;
      if (radius >= 0) result.push(radius);
    }

    return result;
  }

  // @memoize
  get outsideBox() {
    return new makerjs.models.Rectangle(this.width, this.length);
  }

  // @memoize
  get insideBox() {
    return makerjs.$(
      new makerjs.models.Rectangle(this.borderWidth, this.borderHeight)
    ).move([this.border, this.border]).$result;
  }

  // @memoize
  get borderWidth() {
    return this.width - 2 * this.border;
  }

  // @memoize
  get borderHeight() {
    return this.length - 2 * this.border;
  }

  // @memoize
  get holeAreas() {
    let result = {};
    for (let i = 0; i < this.holeRadii.length; i++) {
      let radius = this.holeRadii[i];
      result[radius] = (result[radius] || []).concat([Math.PI * radius * radius]);
    }
    return result;
  }

  // @memoize
  get totalArea() {
    return this.length * this.width;
  }


  getPaths() {
    let result = [];

    for (let ix = 0; ix < this.countY; ix++) {
      for (let iy = 0; iy < this.countX; iy++) {
        let ir = ix + (iy * this.countY);
        let radius = this.holeRadii[ir];
        let j = this.constructor.jitter(this.radii[0] - radius);
        result.push(this.constructor.circle(this.coords(ix, iy, j), radius));
      }
    }

    return result;
  }

  getModels() {
    let result = [
      this.outsideBox
    ];

    if (this.showBorder) result.push(this.insideBox);

    return result;
  }

  getNotes() {
    let result = `
**Pitch**: ${2 * this.maxRadius}

| | Circles | Radius | Area |
|-| -------:| ------:| ----:|`;

    let totalHoleArea = 0.0;
    let radii = [];
    for (let radius in this.holeAreas) radii.unshift(radius);

    for (let i = 0; i < radii.length; i++) {
      let radius = radii[i];
      let holeArea = this.holeAreas[radius].reduce((a, b) => a + b, 0.0);
      totalHoleArea += holeArea;
      let percentage = 100 * holeArea / this.totalArea;
      result += `
| | ${this.holeAreas[radius].length} | ${radius}mm | ${Math.round(percentage)}% |`;
    }

    let totalPercentage = 100 * totalHoleArea / this.totalArea;
    result += `
| | ========= | | ==== |
| | *${this.countX} x ${this.countY} =* **${this.holeCount}** | | **${Math.round(totalPercentage)}%** |

---
[${this.version}](https://github.com/yertto/champagne/releases/tag/${this.version})`;

    return result;
  }
}


function memoizeGetters(clazz, functionNames) {
  functionNames.forEach(functionName => {
    let func = Object.getOwnPropertyDescriptor(clazz.prototype, functionName);
    let cacheKey = `_${functionName}`;
    Object.defineProperty(clazz.prototype, functionName, {
      get: function () {
        return this[cacheKey] = this[cacheKey] || func.get.call(this);
      }
    });
  });
};
memoizeGetters(Champagne, [
  'borderHeight',
  'borderWidth',
  'countX',
  'countY',
  'holeAreas',
  'holeCount',
  'holeRadii',
  'insideBox',
  'outsideBox',
  'radii',
  'totalArea'
]);


function champagne() {
  return new Champagne(...arguments);
};

champagne.metaParameters = [
  { title: "Length (mm)"         , type: "range", value: 610, min: 10, max: 2000, step: 10 },
  { title: "Width (mm)"          , type: "range", value: 290, min: 20, max: 2000, step: 10 },
  { title: "Border (mm)"         , type: "range", value:   5, min:  2, max:   20, step:  1 },
  { title: "Show Border"         , type:  "bool", value: false },
  { title: "Shuffle"             , type:  "bool", value: true  },
  { title: "Jitter"              , type:  "bool", value: false },
  { title: "Max Hole Radius (mm)", type: "range", value:  20, min: 10, max:  100, step:  1 },
  { title: "Step 0 (mm)"         , type: "range", value:   5, min:  0, max:   20, step:  1 },
  { title: "Step 1 (mm)"         , type: "range", value:   5, min:  0, max:   20, step:  1 },
  { title: "Step 2 (mm)"         , type: "range", value:   4, min:  0, max:   20, step:  1 },
  { title: "Step 3 (mm)"         , type: "range", value:   6, min:  0, max:   20, step:  1 },
  { title: "Step 4 (mm)"         , type: "range", value:   6, min:  0, max:   20, step:  1 }
];

module.exports = champagne;
