const makerjs = require('makerjs');

// --- BEGIN helpers ---
// waiting for javascript decorators so we can @memoize the getters ...
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

// ... instead do memoization on all getters with:
function memoizeGettersOnClass(class_prototype) {
  Object.entries(Object.getOwnPropertyDescriptors(class_prototype))
    .filter(([key, descriptor]) => typeof descriptor.get === 'function')
    .map(([key]) => key)
    .forEach(getter => {
      let func = Object.getOwnPropertyDescriptor(class_prototype, getter);
      let cacheKey = `_${getter}`;
      Object.defineProperty(class_prototype, getter, {
        get: function () {
          return this[cacheKey] = this[cacheKey] || func.get.call(this);
        }
      });
    });
}
function memoizeGettersOn(...classes) {
  classes.forEach(clazz => memoizeGettersOnClass(clazz.prototype))
}

// And some delegation would be handy...
function delegate(from, to, ...fns) {
  for (fn of fns) { from[fn] = to[fn] }
}
// --- END helpers ---



function jitter(range) {
  return Math.floor((Math.random() * range * 2) - range)
}

function shuffle(array) {
  let result = [...array]; // make a copy

  // sort result in place
  for (let i = result.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let x = result[i];
    result[i] = result[j];
    result[j] = x;
  }

  return result
}


const VERSION = 'v0.3.1';

class Champagne {
  constructor(length, width, border, showBorder, shuffle, jitter, maxRadius, ...steps) {
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


  coords(ix, iy, jitter) {
    if (!this.jitter) jitter = 0;

    return [
      this.border + this.maxRadius + ix * 2 * this.maxRadius + jitter,
      this.border + this.maxRadius + iy * 2 * this.maxRadius + jitter
    ]
  }


  get countX() {
    return Math.floor((this.width - (2 * this.border)) / (2 * this.maxRadius))
  }

  get countY() {
    return Math.floor((this.length - (2 * this.border)) / (2 * this.maxRadius))
  }

  get holeRadii() {
    let result = [];

    for (let i = 0; i < this.holeCount; i++) {
      let radiiNum = i % this.radii.length; // NB. this will generate an even distribution of radii
      let radius = this.radii[radiiNum];
      result[i] = radius;
    }

    if (this.shuffle) result = shuffle(result);

    return result
  }

  get holeCount() {
    return this.countX * this.countY
  }

  get radii() {
    let result = [];

    let radius, step = 0;
    for (let is = 0; is < this.steps.length; is++) {
      step += this.steps[is];
      radius = this.maxRadius - step;
      if (radius >= 0) result.push(radius);
    }
//console.log(result);  // if memoized this should only get called once

    return result
  }

  get outsideBox() {
    return new makerjs.models.Rectangle(this.width, this.length)
  }

  get insideBox() {
    return makerjs.$(
      new makerjs.models.Rectangle(this.borderWidth, this.borderHeight)
    ).move([this.border, this.border]).$result
  }

  get borderWidth() {
    return this.width - 2 * this.border
  }

  get borderHeight() {
    return this.length - 2 * this.border
  }

  // get paths() {
  getPaths() {
    let result = [];

    for (let ir = 0, iy = 0; iy < this.countY; iy++) {
      for (let ix = 0; ix < this.countX; ix++) {
        let radius = this.holeRadii[ir++];

        result.push(
          new makerjs.paths.Circle(
            this.coords(ix, iy, jitter(this.maxRadius - radius)),
            radius
          )
        );
      }
    }

    return result
  }

  // get models() {
  getModels() {
    let result = [
      this.outsideBox
    ];

    if (this.showBorder) result.push(this.insideBox);

    return result
  }

  // get notes() {
  getNotes() {
    // return new ChampagneNotes(this);
    return new ChampagneNotes(this).toString()
  }
}


class ChampagneNotes {
  constructor(champagne) {
    delegate(this, champagne,
      'countX',
      'countY',
      'holeCount',
      'holeRadii',
      'length',
      'maxRadius',
      'width'
    )
  }

  get pitch() {
    return 2 * this.maxRadius
  }

  get radiiCounts() {
    return this.holeRadii.reduce(
      (acc, radius) => Object.assign(acc, { [radius]: (acc[radius] || 0) + 1 }),
      {}
    );
  }

  get totalArea() {
    return this.length * this.width;
  }

  get sortedRadii() {
    return Object.keys(this.radiiCounts).reverse();
  }

  holeStatsFor(radius) {
    let count = this.radiiCounts[radius];
    let holeArea = count * Math.PI * radius * radius;
    return {
      count: count,
      radius: radius,
      holeArea: holeArea,
      percentage: Math.round(100 * holeArea / this.totalArea)
    }
  }

  get holeStats() {
    return this.sortedRadii.reduce((acc, radius) =>
      acc.concat([this.holeStatsFor(radius)]), [])
  }

  get totalPercentage() {
    return Math.round(
      100 * this.holeStats.reduce((acc, holeStat) => acc + holeStat.holeArea, 0.0) / this.totalArea
    )
  }

  toString() {
    return `
**Pitch**: ${this.pitch}

| | Circles | Radius | Area |
|-| -------:| ------:| ----:|
${
  this.holeStats.reduce((acc, {count, radius, percentage}) =>
    acc + `\
| | ${count} | ${radius}mm | ${percentage}% |
`, ''
  ).slice(0, -1)
}
| | ========= | | ==== |
| | *${this.countX} x ${this.countY} =* **${this.holeCount}** | | **${this.totalPercentage}%** |

---
[${VERSION}](https://github.com/yertto/champagne/releases/tag/${VERSION})`;
  }
}


memoizeGettersOn(Champagne, ChampagneNotes);


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
