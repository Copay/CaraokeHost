

export default function qrcToArr(qrc: string){
    const lyric = /LyricContent="((.|\r|\n)*)"\/>/g.exec(qrc)[1]
    let arr:lyric[] = [];
    let qrcSlices:string[] = lyric.split("\n");
    for(let p of qrcSlices){
        let lyric:lyric = {nodes:[],start:null,end:null};
        regex[0].lastIndex = 0;
        regex[1].lastIndex = 0;
        let match,sublyric;
        if((match=regex[0].exec(p))===null) continue;
        sublyric = match[0];
        [, lyric.start, lyric.end] = match.map(_ => parseInt(_));
        lyric.end+=lyric.start;
        while((match=regex[1].exec(p.substring(sublyric.length)))!==null){
            let node:node = {start:null,end:null,content:null};
            [, node.content, node.start, node.end] = match.map((_, i) => {
                if (i < 4 && i > 1) return parseInt(_);
                return _;
            }) as [string, string, number, number];
            node.start-=lyric.start;
            node.end+=node.start;
            lyric.nodes.push(node);
        }
        arr.push(lyric);
    }
    return arr;
}
let regex = [/\[(\d*),(\d*)\]/, /(.*?)\((\d*),(\d*)\)/g];
/**
 * lyricNode
 */
 export interface lyric {
    nodes: node[];
    start: number;//ms
    end: number;//ms
    overSize?: boolean;
}
/**
 * Node
 */
export interface node {
    start: number;//ms,relative to lyricNode
    end: number;//ms
    content: string;
}