import qm from 'qq-music-api'
//import { diceCoefficient as dc } from 'dice-coefficient'
import {env} from 'process'
const dc = require("fix-esm").require("dice-coefficient").diceCoefficient
qm.setCookie(env['QQCOOKIE'])
export default async function searcher(name: string, singer?: string, album?: string, length?: number, pageNo=1, pageSize=10) {
    let mix = (a)=>{
        if(singer&&album) return a.nameLikelihood*.6+a.singerLikelihood*.3+a.albumLikelihood*.1
        if(singer) return a.nameLikelihood*.7+a.singerLikelihood*.3
        if(album) return a.nameLikelihood*.9+a.albumLikelihood*.1
        return a.nameLikelihood
    }
    let res = (await qm.api('search', ({key: name + (singer ? (' '+singer) : ''), pageNo, pageSize}))).list
    if(length) res = res.filter(a=>Math.abs(a.interval-length/(10**3))<1)
    if(singer) res = res.map(a=>({singerLikelihood: dc(singer, a.singer.map(a=>a.name).join(" ")),...a}))
    if(album) res = res.map(a=>({albumLikelihood: dc(album, a.albumname),...a}))
    res = res.map(a=>({nameLikelihood: dc(name, a.name),...a}))
    res = res.sort((a,b)=>mix(b)-mix(a)) // desc order
    return res.map(a=>({
        name: a.name,
        id: a.songid,
        album: a.albumname,
        singer: a.singer.map(a=>a.name),
        length: a.interval*10**3
    }))
}
