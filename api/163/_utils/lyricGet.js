import ncm from "NeteaseCloudMusicApi";
import { krcToArr, yrcToArr } from "../_utils/lyricToArr.js";

export async function lyricGet(id) {
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
        return ({ lyric, lyricTranslated, lyricRomaji, oldLyric, oldLyricTranslated, oldLyricRomaji })
    } catch (e) {
        console.error(e)
    }
}