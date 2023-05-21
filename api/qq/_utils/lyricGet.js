import { getter } from "../../_utils/getter.js";
import qrcParser from "./qrcParser.js";
import qrcToArr from './qrcToArr.js';
import { JSDOM } from "jsdom";
export async function lyricGet(id) {
    let res = await getter("https://c.y.qq.com/qqmusic/fcgi-bin/lyric_download.fcg?musicid=" + id + "&version=15&miniversion=82&lrctype=4");
    let dom = new JSDOM(res.slice("<!--".length, res.length - "-->".length).replace(/<miniversion="1" \/>|<!\[CDATA\[|\]\]\>/g, '')).window.document;
    let val = ["content", "contentts", "contentroma"];
    let [lyric, lyricTranslated, lyricRomaji] = await Promise.all(val.map(async (name) => await qrcParser(dom.getElementsByTagName(name)[0].innerHTML)));
    if (lyric)
        lyric = qrcToArr(lyric);
    if (lyricRomaji)
        lyricRomaji = qrcToArr(lyricRomaji);
    return ({
        lyric, lyricTranslated, lyricRomaji
    });
}
