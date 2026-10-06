// Values known before measuring the projected image. Keep null for unknowns.
window.prismaCalibration = {
  units: 'mm',
  measured: false,
  projection: {
    // Image measured by the user: 155 × 90 cm.
    width: 1550,
    height: 900,
    pixelWidth: null,
    pixelHeight: null,
    // Wall coordinates (x right, y up), ordered bottom-left, bottom-right,
    // top-right, top-left. Fill only after measuring all four corners.
    corners: null
  },
  // User views from the image centre; distance remains approximate.
  eye: {x: 0, y: 0, estimatedWallDistance: 2000},
  tracking: false
};
