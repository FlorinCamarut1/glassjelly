// Liquid Glass refraction filter for CSS backdrop-filter (Chromium only).
// Built from the element's own box, so the lens rim has the same width in pixels on a 44px button and on a 1500px
// player panel (a stretched displacement image would give a 180px rim on a wide bar):
//   SourceAlpha (the box) -erode rim-> -blur soft-> A      1 inside, ramps to 0 over the last ~rim+2*soft px
//   gx = dA/dx, gy = dA/dy (convolutions, bias .5)         surface normals of a rounded glass slab
//   feDisplacementMap(backdrop, R:gx G:gy, scale)          the rim samples the backdrop from further inside, like
//                                                          the thick edge of a lens; the interior is untouched.
// Corners: the box is a rectangle, so the element also gets clip-path: inset(0 round R) (Chromium does not clip
// url() backdrop filters to border-radius anyway).
export function lens({ rim = 10, soft = 7, scale = 36, reach = 4 } = {}) {
  const k = ['-1', ...Array(2 * reach - 1).fill('0'), '1'].join(' ');
  const n = 2 * reach + 1;
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg'>" +
    "<filter id='lg' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>" +
    `<feMorphology in='SourceAlpha' operator='erode' radius='${rim}' result='e'/>` +
    `<feGaussianBlur in='e' stdDeviation='${soft}' result='b'/>` +
    "<feColorMatrix in='b' type='matrix' values='0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 1' result='h'/>" +
    `<feConvolveMatrix in='h' order='${n} 1' kernelMatrix='${k}' divisor='1' bias='.5' preserveAlpha='true' edgeMode='duplicate' result='gx'/>` +
    `<feConvolveMatrix in='h' order='1 ${n}' kernelMatrix='${k}' divisor='1' bias='.5' preserveAlpha='true' edgeMode='duplicate' result='gy'/>` +
    "<feColorMatrix in='gx' type='matrix' values='1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1' result='rx'/>" +
    "<feColorMatrix in='gy' type='matrix' values='0 0 0 0 0 0 1 0 0 0 0 0 0 0 .5 0 0 0 0 1' result='ry'/>" +
    "<feComposite in='rx' in2='ry' operator='arithmetic' k2='1' k3='1' result='m'/>" +
    `<feDisplacementMap in='SourceGraphic' in2='m' scale='${scale}' xChannelSelector='R' yChannelSelector='G'/>` +
    '</filter></svg>';
  return 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27') + '#lg")';
}

// "Hollow" bubble lens for round things and hover droplets: a shape-aware displacement map (feImage, stretched to the
// element box with percentages): directional R/G gradients = normals, covered in the middle by a neutral grey disc that
// fades out toward the edge -> a clear centre and a thick, strongly bending rim, like a glass bead.
// On a circle the rim is exactly round; on a pill it becomes an ellipse (the ends bend most, as on real glass).
// core = radius (0..1) of the undistorted centre, scale = displacement in px, magnify = sample toward the centre.
function bubbleMap(core, magnify) {
  const [a, b] = magnify ? ['f', '0'] : ['0', 'f'];
  const map =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none' width='100' height='100'>" +
    `<defs><linearGradient id='x'><stop offset='0' stop-color='#${a}00'/><stop offset='1' stop-color='#${b}00'/></linearGradient>` +
    `<linearGradient id='y' x2='0' y2='1'><stop offset='0' stop-color='#0${a}0'/><stop offset='1' stop-color='#0${b}0'/></linearGradient>` +
    `<radialGradient id='m'><stop offset='0' stop-color='#808080'/><stop offset='${core}' stop-color='#808080'/>` +
    "<stop offset='1' stop-color='#808080' stop-opacity='0'/></radialGradient></defs>" +
    "<rect width='100' height='100' fill='url(#x)'/><rect width='100' height='100' fill='url(#y)' style='mix-blend-mode:screen'/>" +
    "<rect width='100' height='100' fill='url(#m)'/></svg>";
  return `<feImage href='data:image/svg+xml,${encodeURIComponent(map)}' x='0%' y='0%' width='100%' height='100%' preserveAspectRatio='none' result='m'/>`;
}
const wrap = body => 'url("data:image/svg+xml,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg'><filter id='lg' x='0%' y='0%' width='100%' height='100%' color-interpolation-filters='sRGB'>" +
  body + '</filter></svg>').replace(/'/g, '%27') + '#lg")';
const disp = (s, r) => `<feDisplacementMap in='SourceGraphic' in2='m' scale='${+s.toFixed(1)}' xChannelSelector='R' yChannelSelector='G'${r ? ` result='${r}'` : ''}/>`;

export function bubble({ core = 0.55, scale = 40, magnify = true } = {}) {
  return wrap(bubbleMap(core, magnify) + disp(scale));
}

// bubble() + chromatic dispersion: red, green and blue bend by slightly different amounts, so the rim gets the faint
// colour fringes of real glass; the centre stays neutral (grey map) -> no fringes there. spread = blue vs red (0..1).
export function bubbleCA({ core = 0.2, scale = 46, spread = 0.22, magnify = true } = {}) {
  const keep = (i, r, row) => `<feColorMatrix in='${i}' type='matrix' values='${row}' result='${r}'/>`;
  return wrap(bubbleMap(core, magnify) + disp(scale, 'dr') + disp(scale * (1 - spread / 2), 'dg') + disp(scale * (1 - spread), 'db') +
    keep('dr', 'r', '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0') + keep('dg', 'g', '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0') +
    keep('db', 'b', '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0') +
    "<feBlend in='r' in2='g' mode='screen' result='rg'/><feBlend in='rg' in2='b' mode='screen'/>");
}
