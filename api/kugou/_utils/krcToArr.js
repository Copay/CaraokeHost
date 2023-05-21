export function krcToArr(krc) {
    krc = krc.replace(/\r/g, "");
    let arr = [];
    let krcSlices = krc.split("\n");
    for (let i = 0; i < krcSlices.length; i++) {
        let lyric = { nodes: [], start: null, end: null };
        regex[0].lastIndex = 0; //reset lastIndex each loop<this scope>
        regex[1].lastIndex = 0; //reset lastIndex each loop<this scope>
        let match;
        if ((match = regex[0].exec(krcSlices[i])) === null) continue;
        [, lyric.start, lyric.end] = match.map(_ => parseInt(_));
        lyric.end += lyric.start; //duration + startTime
        while ((match = regex[1].exec(krcSlices[i])) !== null) {
            let node = { start: null, end: null, content: null };
            [, node.start, node.end, node.content] = match.map((_, i) => {
                if (i < 3 && i > 0) return parseInt(_);
                return _;
            });
            node.end += node.start;
            lyric.nodes.push(node);
        }
        arr.push(lyric);
    }
    return arr;
}

let regex = [/\[(\d*),(\d*)\]/, /<(\d*),(\d*),0>(.*?)(?=<|$)/g]