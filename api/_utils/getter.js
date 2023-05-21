import { get } from 'https';
import process from 'process';
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";
export async function getter(url) {
    return new Promise((resolve, reject) => {
        get(url, (res) => {
            if (res.statusCode !== 200)
                reject(new Error("Bad Request:" + res.statusCode));
            let data = "";
            res.setEncoding("utf8");
            res.on("data", chunks => data += chunks)
                .on("end", () => resolve(data))
                .on("error", (err) => reject(err));
        });
    });
}