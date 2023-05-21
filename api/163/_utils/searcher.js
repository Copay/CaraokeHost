import ncm from "NeteaseCloudMusicApi";
import { diceCoefficient as dc } from 'dice-coefficient';
export default async function searcher(name, singer, album, length, pageNo = 1, pageSize = 10) {
    let mix = (a) => {
        if (singer && album)
            return a.nameLikelihood * .6 + a.singerLikelihood * .3 + a.albumLikelihood * .1;
        if (singer)
            return a.nameLikelihood * .7 + a.singerLikelihood * .3;
        if (album)
            return a.nameLikelihood * .9 + a.albumLikelihood * .1;
        return a.nameLikelihood;
    };
    let res = (await ncm.search({ keywords: name + (singer ? (' ' + singer) : ''), offset: pageSize*(pageNo-1), limit: pageSize })).body.result.songs;
    if (length)
        res = res.filter(a => Math.abs(a.duration - length )/ (10 ** 3) < 1);
    if (singer)
        res = res.map(a => ({ singerLikelihood: dc(singer, a.artists.map(a => a.name).join(" ")), ...a }));
    if (album)
        res = res.map(a => ({ albumLikelihood: dc(album, a.album.name), ...a }));
    res = res.map(a => ({ nameLikelihood: dc(name, a.name), ...a }));
    res = res.sort((a, b) => mix(b) - mix(a)); // desc order
    return res.map(a => ({
        name: a.name,
        id: a.id,
        album: a.album.name,
        singer: a.artists.map(a => a.name),
        length: a.duration
    }));
}
