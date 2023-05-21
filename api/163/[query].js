import searcher from "./_utils/searcher.js";
import { lyricGet } from "./_utils/lyricGet.js";
export default async (req, res) => {
    if (!req.query["query"])
        res.status(200).json({ "body": null });
    res.status(200).json(await Promise.all(((await searcher(req.query["query"], req.query["singer"], req.query["album"], req.query["length"] ? parseInt(req.query["length"]) : undefined, req.query["pageNo"] ? parseInt(req.query["pageNo"]) : undefined, req.query["pageSize"] ? parseInt(req.query["pageSize"]) : undefined)).slice(0, req.query["size"] ? parseInt(req.query["size"]) : undefined)).map(async (a) => ({ ...await lyricGet(a.id), ...a }))));
};
