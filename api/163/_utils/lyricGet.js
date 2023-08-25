import ncm from "NeteaseCloudMusicApi";
import { krcToArr, yrcToArr } from "../_utils/lyricToArr.js";
import { json2ttml } from "../../_utils/generalParser.js";

export async function lyricGet(id, format) {
    try {
        let lrcObj = (await ncm.lyric_new({id})).body
        let [lyric,
            lyricTranslated,
            lyricRomaji] = [
                lrcObj?.yrc?.lyric ? yrcToArr(lrcObj.yrc.lyric) : null,
                lrcObj?.ytlrc?.lyric || null,
                lrcObj?.yromalrc?.lyric || null
            ]
        let [
            oldLyric,
            oldLyricTranslated,
            oldLyricRomaji
        ] = [
                lrcObj?.klyric?.lyric ? krcToArr(lrcObj.klyric.lyric) : null,
                lrcObj?.tlyric?.lyric || null,
                lrcObj?.romalrc?.lyric || null
            ]
        return format === "ttml" ? {lyric: json2ttml({ lyric, lyricTranslated, lyricRomaji})} : ({ lyric, lyricTranslated, lyricRomaji, oldLyric, oldLyricTranslated, oldLyricRomaji })
    } catch (e) {
        console.error(e)
    }
}