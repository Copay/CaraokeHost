import { lyricGet } from "../_utils/lyricGet.js"
export default async (req, res)=>{
    res.status(200).json(await lyricGet(req.query["id"]))
}