/**
 * Save the graph as a PNG. The SVG is styled by CSS modules, which a
 * standalone image can't see — so the computed styles are inlined into a
 * clone, a background is added, and the clone is rasterized at 2×.
 */

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linejoin',
  'paint-order',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
];

export async function saveSvgAsPng(
  svg: SVGSVGElement,
  { background, filename, scale = 2 }: { background: string; filename: string; scale?: number },
): Promise<void> {
  const box = svg.viewBox.baseVal;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const from = svg.querySelectorAll('*');
  const to = clone.querySelectorAll('*');
  from.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
    to[i]!.setAttribute('style', style);
    to[i]!.removeAttribute('class');
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(box.width * scale));
  clone.setAttribute('height', String(box.height * scale));
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', background);
  clone.insertBefore(bg, clone.firstChild);

  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
  );
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('could not rasterize the graph'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = box.width * scale;
    canvas.height = box.height * scale;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))),
        'image/png',
      ),
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
