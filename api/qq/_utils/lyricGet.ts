import {get} from 'https'
import qrcParser from "./qrcParser"
import process  from 'process'
import qrcToArr from './qrcToArr'
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0"
const { JSDOM }= require("jsdom")
async function getter(url: string):Promise<string> {
    return new Promise((resolve, reject) => {
        get(url, (res) => {
            if (res.statusCode !== 200) reject(new Error("Bad Request:" + res.statusCode));
            let data = "";
            res.setEncoding("utf8");
            res.on("data", chunks => data += chunks)
                .on("end", () => resolve(data))
                .on("error", (err) => reject(err));
        })
    })
}
export async function lyricGet(id: string|number){
    let res = await getter("https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg?musicid="+id+"&version=15&miniversion=82&lrctype=4")
    let dom = new JSDOM(res.slice("<!--".length,res.length-"-->".length).replace(/<miniversion="1" \/>|<!\[CDATA\[|\]\]\>/g,'')).window.document
    let val = ["content","contentts","contentroma"]
    let [lyric,lyricTranslated,lyricRomaji] = 
        await Promise.all(val.map(async name=>await qrcParser(dom.getElementsByTagName(name)[0].innerHTML)))
    if(lyric) lyric = qrcToArr(lyric)
    if(lyricRomaji) lyricRomaji = qrcToArr(lyricRomaji)
    return ({
        lyric,lyricTranslated,lyricRomaji
    })
}