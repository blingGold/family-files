/**
 * 上传前图片压缩：微信内置浏览器对几 MB 大图 FormData 处理会崩溃白屏，
 * 统一把图片压缩到最长边 ≤2000px、JPEG 质量 0.8 再上传。
 * 非图片或小图直接返回原文件。
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    // 微信/部分安卓 WebView 的 file.type 可能为空或 octet-stream，按扩展名识别图片
    const isImage =
      file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
    if (!isImage) return resolve(file);
    if (file.size < 1024 * 1024) return resolve(file); // <1MB 不压

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const MAX = 2000;
        let { width, height } = img;
        if (width > height && width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else if (height > MAX) {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return resolve(file);
            const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            const out = new File([blob], name, { type: 'image/jpeg' });
            resolve(out.size < file.size ? out : file);
          },
          'image/jpeg',
          0.8,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
