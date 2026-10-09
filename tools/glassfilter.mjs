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
