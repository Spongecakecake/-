const escapeXml = (s: string) =>
  s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');

const two = (n: number) => String(n).padStart(2, '0');

const nowText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

export function wrapWatermark(src: string, label: string) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">' +
    `<image href="${src}" x="0" y="0" width="720" height="1280" preserveAspectRatio="xMidYMid slice"/>` +
    '<rect x="0" y="1080" width="720" height="200" fill="#101613" fill-opacity="0.62"/>' +
    `<text x="40" y="1150" fill="#FFFFFF" font-size="34" font-weight="600">做到 · ${escapeXml(label)}</text>` +
    `<text x="40" y="1215" fill="#B9E7CF" font-size="28">${nowText()} · 仅供举证核验</text>` +
    '</svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function pickWebPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const g = globalThis as any;
      if (!g.document) return resolve(null);
      const input = g.document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const reader = new g.FileReader();
        reader.onload = () => resolve(String(reader.result || '').slice(0, 190000));
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      input.click();
    } catch {
      resolve(null);
    }
  });
}
