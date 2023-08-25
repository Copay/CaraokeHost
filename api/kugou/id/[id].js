import { lyricGet } from "../_utils/lyricGet.js"
export default async (req, res)=>{
    res.status(200).json(await lyricGet(req.query["id"],req.query["format"],req.query["lyricCount"] ? parseInt(req.query["lyricCount"]): undefined))
}