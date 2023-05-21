import { getter } from '../../_utils/getter.js';
import { diceCoefficient as dc } from 'dice-coefficient';
export default async function searcher(name, singer, album, length, pageNo = 1, pageSize = 10,size=2) {
    let mix = (a) => {
        if (singer && album)
            return a.nameLikelihood * .6 + a.singerLikelihood * .3 + a.albumLikelihood * .1;
        if (singer)
            return a.nameLikelihood * .7 + a.singerLikelihood * .3;
        if (album)
            return a.nameLikelihood * .9 + a.albumLikelihood * .1;
        return a.nameLikelihood;
    };
    let res = JSON.parse(await getter("https://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword="+name + (singer ? (' ' + singer) : '')+"&page="+pageNo+"&pagesize="+pageSize+"&showtype=1")).data.info;
    if (length)
        res = res.filter(a => Math.abs(a.duration - length/ (10 ** 3) ) < 1);
    if (singer)
        res = res.map(a => ({ singerLikelihood: dc(singer, a.singername), ...a }));
    if (album)
        res = res.map(a => ({ albumLikelihood: dc(album, a.album_name), ...a }));
    res = res.map(a => ({ nameLikelihood: dc(name, a.songname), ...a }));
    res = res.sort((a, b) => mix(b) - mix(a)); // desc order
    return res.slice(0,size).map(a => ({
        name: a.songname,
        id: a.hash,
        album: a.album_name,
        singer: a.singername,
        length: a.duration* (10**3)
    }));
}
