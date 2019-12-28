var makerjs = require('makerjs');

var Champagne = (function () {
  function Champagne(height, width, border, pitch, radii0, radii1, radii2, radii3) {
    this.units = makerjs.unitType.Millimeter;

    var radii = [radii0, radii1, radii2, radii3];

    this.paths = generateHoles(this, height, width, border, pitch, radii);
    this.models = generateBorder(this, height, width, border);
  }

  function generateHoles(_this, height, width, border, pitch, radii) {
    var countX = Math.floor((height - (2 * border)) / pitch);
    var countY = Math.floor((width  - (2 * border)) / pitch);

    var holeRadii = shuffle(generateHoleRadii(height, width, countX, countY, radii));

    var holes = {};
    for (var ix = 0; ix < countY; ix++) {
      for (var iy = 0; iy < countX; iy++) {
        var x = border + radii[0] + ix * pitch;
        var y = border + radii[0] + iy * pitch;
        var id = 'id_' + ix + '_' + iy;

        var ir = ix + (iy * countY);
        var radius = radii[radii.length - 1];
        if (ir < (holeRadii.length - 1)) {
          radius = holeRadii[ir];
        }
        holes[id] = new makerjs.paths.Circle([x, y], radius);
      }
    }

    return holes;
  }

  function generateHoleRadii(height, width, countX, countY, radii) {
    var holeSizes = [];
    var holesArea = 0.0;
    var holeCount = countX * countY;
    for (i = 0; i < holeCount; i++) {
      var radiiNum = i % radii.length;
      var radius = radii[radiiNum];
      holeSizes[i] = radius;
      holesArea += Math.PI * radius * radius;
    }

    var totalArea = height * width;
    console.log("Holes Area: " + Math.round(holesArea) + "mm^2");
    console.log("Total Area: " + totalArea + "mm^2");
    console.log("Open Area: " + Math.round((100 * holesArea) / totalArea) + "%");

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
  { title: "Height (mm)"                  , type: "range", min: 10, max: 2000, step: 10, value: 110 },
  { title: "Width (mm)"                   , type: "range", min: 20, max: 2000, step: 10, value: 210 },
  { title: "Border (mm)"                  , type: "range", min:  2, max:   20, step:  1, value:   5 },
  { title: "Distance between centres (mm)", type: "range", min: 20, max:  100, step:  1, value:  20 },
  { title: "Circle A size (mm)"           , type: "range", min:  5, max:   50, step:  1, value:  10 },
  { title: "Circle B size (mm)"           , type: "range", min:  5, max:   50, step:  1, value:   8 },
  { title: "Circle C size (mm)"           , type: "range", min:  5, max:   20, step:  1, value:   6 },
  { title: "Circle D size (mm)"           , type: "range", min:  5, max:   10, step:  1, value:   5 }
];

module.exports = Champagne;
