var makerjs = require('makerjs');

var Champagne = (function () {
  function Champagne(height, width, border, maxRadius, step1, step2, step3, step4) {
    this.units = makerjs.unitType.Millimeter;

    var radii = generateRadii(maxRadius, [step1, step2, step3, step4]);

    this.paths = generateHoles(this, height, width, border, maxRadius, radii);
    this.models = generateBorder(this, height, width, border);
  }

  function generateHoles(_this, height, width, border, maxRadius, radii) {
    var countX = Math.floor((height - (2 * border)) / (2 * maxRadius));
    var countY = Math.floor((width  - (2 * border)) / (2 * maxRadius));

    var holeRadii = shuffle(generateHoleRadii(_this, height, width, countX, countY, radii));

    var holes = {};
    for (var ix = 0; ix < countY; ix++) {
      for (var iy = 0; iy < countX; iy++) {
        var radius = radii[radii.length - 1];
        var ir = ix + (iy * countY);
        if (ir < (holeRadii.length - 1)) radius = holeRadii[ir];
        holes[id(ix, iy)] = new makerjs.paths.Circle(
          coords(border, ix, iy, maxRadius, jitter(radii[0] - radius)),
          radius
        );
      }
    }

    return holes;
  }

  function generateRadii(maxRadius, steps) {
    var result = [];

    var step = 0;
    for (var is = 0; is < steps.length; is++) {
      step += steps[is];
      var radius = maxRadius - step;
      if (radius > 0) result.push(radius);
    }
    if (result.length === 0) result = [maxRadius];

    return result;
  }

  function id(ix, iy) {
    return 'id_' + ix + '_' + iy;
  }

  function jitter(max) {
    return Math.floor((Math.random() * max * 2) - max);
  }

  function coords(border, ix, iy, maxRadius, jitter) {
    return [
      border + maxRadius + ix * 2 * maxRadius + jitter,
      border + maxRadius + iy * 2 * maxRadius + jitter
    ];
  }

  function displayNotes(_this, height, width, holesArea, radii) {
    var totalArea = height * width;

    _this.notes = "&nbsp;|&nbsp;" + '\n' +
      "---- | ---" + '\n' +
      "**Hole radii**: | " + radii + '\n' +
      "**Holes Area**: |" + Math.round(holesArea) + "mm&#xb2;" + '\n' +
      "**Total Area**: |" + totalArea + "mm&#xb2;" + '\n' +
      "**Open Area**: |" + Math.round((100 * holesArea) / totalArea) + "%";
  }

  function generateHoleRadii(_this, height, width, countX, countY, radii) {
    var holeSizes = [];
    var holesArea = 0.0;
    var holeCount = countX * countY;
    for (i = 0; i < holeCount; i++) {
      var radiiNum = i % radii.length; // NB. this will generate an even distribution of radii
      var radius = radii[radiiNum];
      holeSizes[i] = radius;
      holesArea += Math.PI * radius * radius;
    }

    displayNotes(_this, height, width, holesArea, radii);

    return holeSizes;
  }

  function generateBorder(_this, height, width, border) {
    var borderWidth = width - 2 * border;
    var borderHeight = height - 2 * border;

    return {
      outsideBox: new makerjs.models.Rectangle(width, height),
      insideBox: makerjs.model.move(
        new makerjs.models.Rectangle(borderWidth, borderHeight),
        [border, border]
      )
    };
  }

  function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }

  return Champagne;
})();

Champagne.metaParameters = [
  { title: "Height (mm)"         , type: "range", min: 10, max: 2000, step: 10, value: 110 },
  { title: "Width (mm)"          , type: "range", min: 20, max: 2000, step: 10, value: 210 },
  { title: "Border (mm)"         , type: "range", min:  2, max:   20, step:  1, value:   5 },
  { title: "Max hole radius (mm)", type: "range", min: 10, max:  100, step:  1, value:  20 },
  { title: "Step 1 (mm)"         , type: "range", min:  0, max:   20, step:  1, value:   4 },
  { title: "Step 2 (mm)"         , type: "range", min:  0, max:   20, step:  1, value:   8 },
  { title: "Step 3 (mm)"         , type: "range", min:  0, max:   20, step:  1, value:   4 },
  { title: "Step 4 (mm)"         , type: "range", min:  0, max:   20, step:  1, value:   1 }
];

module.exports = Champagne;
