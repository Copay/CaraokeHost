import { lyricGet } from "../_utils/lyricGet.js"
export default async (req, res)=>{
    if(req.query["format"]==="ttml"){
        res.setHeader("Content-Type", "application/ttml+xml")
        res.status(200).send((await lyricGet(req.query["id"],"ttml")).lyric)
    } 
    else res.status(200).json(await lyricGet(req.query["id"], req.query["format"]))
}