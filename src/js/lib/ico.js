export function encodeIco(images) {
    const usable = images
        .filter(({ size }) => size > 0 && size <= 256)
        .sort((a, b) => a.size - b.size);

    if (!usable.length) {
        throw new Error('ICO requires at least one image (<= 256x256).');
    }

    const headerSize = 6;
    const entrySize = 16;
    const dirSize = headerSize + (entrySize * usable.length);

    let imageBytesTotal = 0;
    for (const image of usable) {
        imageBytesTotal += image.png.length;
    }

    const out = new Uint8Array(dirSize + imageBytesTotal);
    const view = new DataView(out.buffer);

    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, usable.length, true);

    let imageOffset = dirSize;
    for (let index = 0; index < usable.length; index++) {
        const { size, png } = usable[index];
        const entryOffset = headerSize + (index * entrySize);

        out[entryOffset + 0] = size === 256 ? 0 : size;
        out[entryOffset + 1] = size === 256 ? 0 : size;
        out[entryOffset + 2] = 0;
        out[entryOffset + 3] = 0;

        view.setUint16(entryOffset + 4, 1, true);
        view.setUint16(entryOffset + 6, 32, true);
        view.setUint32(entryOffset + 8, png.length, true);
        view.setUint32(entryOffset + 12, imageOffset, true);

        out.set(png, imageOffset);
        imageOffset += png.length;
    }

    return out;
}

