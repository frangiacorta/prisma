// Values known before measuring the projected image. Keep null for unknowns.
window.prismaCalibration = {
  units: 'mm',
  measured: false,
  projection: {
    estimatedWidth: 1600,
    height: null,
    pixelWidth: null,
    pixelHeight: null,
    // Wall coordinates (x right, y up), ordered bottom-left, bottom-right,
    // top-right, top-left. Fill only after measuring all four corners.
    corners: null
  },
  eye: {x: null, y: null, estimatedWallDistance: 1000},
  tracking: false
};
