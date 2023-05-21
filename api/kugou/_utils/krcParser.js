import { inflate } from "zlib";
const keys = Buffer.from([64, 71, 97, 119, 94, 50, 116, 71, 81, 54, 49, 45, 206, 210, 110, 105]);

export function krcParser(krc) {
    return new Promise((resolve, reject) => {
        let data;
        try {
            data = Buffer.from(krc, "base64").subarray(4);
            for (let i = 0; i < data.length; i++) data[i] = data[i] ^ keys[i % 16];
        } catch (e) { reject(e) };
        inflate(data, (err, res) => {
            if (err) reject(err)
            else resolve(res)
        })
    })
}