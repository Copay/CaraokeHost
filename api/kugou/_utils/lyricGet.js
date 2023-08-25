import { getter } from "../../_utils/getter.js"
import { krcToArr } from "./krcToArr.js"
import { krcParser } from "./krcParser.js"
import { json2ttml } from "../..//_utils/generalParser.js"
export async function lyricGet(hash, format, lyricCount=2) {
    let res = JSON.parse(await getter("https://lyrics.kugou.com/search?ver=1&man=yes&client=pc&hash="+hash))?.candidates
    if(!res) return []
    return await Promise.all(res.slice(0,lyricCount).map(async a=>({
        lyric: await (async ()=>{
            let json = krcToArr((await krcParser(JSON.parse(await getter("https://lyrics.kugou.com/download?ver=1&client=pc&id=" + a.id + "&accesskey=" + a.accesskey + "&fmt=krc&charset=utf8")).content)).toString());
            if(format==="ttml") return json2ttml(json, a.song)
            return json
        })(),
        singer: a.singer,
        name: a.song,
        length: a.duration,
        score: a.score
    })))
}