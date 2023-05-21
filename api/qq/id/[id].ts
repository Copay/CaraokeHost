import { lyricGet } from "../_utils/lyricGet"
module.exports = async (req, res)=>{
    res.status(200).json(await lyricGet(req.query["id"]))
}