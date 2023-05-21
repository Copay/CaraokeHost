export function krcToArr(krc) {
    return krc
        .split("\n")
        .filter(line => line.startsWith("[") && !isNaN(line.substring(1, 2)))
        .map(line => {
            let lyricItem = { start: null, end: null, nodes: null }
            let offset = 0
                ;[lyricItem.start, lyricItem.end] = line
                    .substring(line.indexOf("[") + 1, line.indexOf("]"))
                    .split(",")
                    .map(num => parseInt(num))
            lyricItem.end += lyricItem.start
            lyricItem.nodes = line.substring(line.indexOf("("))
                .split("(")
                .slice(1)
                .map(node => ({
                    start: offset,
                    end: (offset += parseInt(node.substring(node.indexOf(",") + 1, node.indexOf(")")))),
                    content: node.substring(node.indexOf(")") + 1)
                }))
            return lyricItem
        })
}
export function yrcToArr(nrc) {
    nrc = nrc.replace(/\r/g, "");
    let arr = [];
    let nrcSlices = nrc.split("\n");
    for (let i = 0; i < nrcSlices.length; i++) {
        let lyric = { nodes: [], start: null, end: null };
        regex[0].lastIndex = 0; //reset lastIndex each loop<this scope>
        regex[1].lastIndex = 0; //reset lastIndex each loop<this scope>
        let match;
        if ((match = regex[0].exec(nrcSlices[i])) === null) continue;
        [, lyric.start, lyric.end] = match.map(_ => parseInt(_));
        lyric.end += lyric.start; //duration + startTime
        while ((match = regex[1].exec(nrcSlices[i])) !== null) {
            let node = { start: null, end: null, content: null };
            [, node.start, node.end, node.content] = match.map((_, i) => {
                if (i < 3 && i > 0) return parseInt(_);
                return _;
            });
            node.start -= lyric.start;
            node.end += node.start;
            lyric.nodes.push(node);
        }
        arr.push(lyric);

    }
    return arr;
}

let regex = [/\[(\d*),(\d*)\]/, /\((\d*),(\d*),0\)(.*?)(?=\(|$)/g]
