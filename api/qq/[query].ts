import searcher from "./_utils/searcher";
import { lyricGet } from "./_utils/lyricGet";
module.exports = async (req, res) => {
    if (!req.query["query"]) res.status(200).json({ "body": null })
    res.status(200).json(
        await Promise.all(
            (await searcher(
                req.query["query"],
                req.query["singer"],
                req.query["album"],
                req.query["length"]? parseInt(req.query["length"]): undefined,
                req.query["pageNo"]? parseInt(req.query["pageNo"]): undefined,
                req.query["pageSize"]? parseInt(req.query["pageSize"]): undefined
            )
            ).map(async a => ({ ...await lyricGet(a.id), ...a }))
        )
    )
}