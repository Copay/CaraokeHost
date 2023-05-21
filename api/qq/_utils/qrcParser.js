import { createRequire } from "module";
const require = createRequire(import.meta.url);
export default async function qrcParser(qrc) {
    const lrcdec = require("./lrcdec.cjs");
    const lyric_dehexed = Buffer.from(qrc, "hex");
    const str = new Uint8Array(lyric_dehexed);
    const data = lrcdec.ccall("qrcd", "string", ["array", "number"], [str, str.length]);
    return data;
}
