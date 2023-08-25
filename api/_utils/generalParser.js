export function json2ttml(json, title){
    let res = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:xml="http://www.w3.org/XML/1998/namespace">
<head>
<metadata>${title ? "<ttm:title>" + title + "</ttm:title>":""}
</metadata>
</head><body>`;
    if(Array.isArray(json)){
        res+=json2div(json);
    } else {
        res+=json2div(json.lyric, 
                       !!json.lyricTranslated ?
                            !!json.lyricRomaji ? "ja" : "en"
                       : null);
        if(json.lyricTranslated) res+=lrc2div(json.lyricTranslated,json.lyric[json.lyric.length-1].end,"zh");
        if(json.lyricRomaji) res+= (typeof json.lyricRomaji === "string") ? 
                        lrc2div(json.lyricRomaji,json.lyric[json.lyric.length-1].end,"romaji")
                        : json2div(json.lyricRomaji,"romaji")
    }
    res+=`</body></tt>`;
    return res;
}
function json2div(arr,lang){
    let res = `<div${lang?" xml:lang=\""+lang+"\"":""}>`;
    for(let item of arr){
        res+=`<p begin="${msToTime(item.start)}" end="${msToTime(item.end)}">`;
        for(let node of item.nodes)
            res+=`<span begin="${msToTime(item.start+node.start)}" end="${msToTime(item.start+node.end)}">${node.content}</span>`;
        res+=`</p>`;
    }
    res+=`</div>`;
    return res;
}
function lrc2div(lrc,duration,lang){
    let res = `<div${lang?" xml:lang=\""+lang+"\"":""}>`;
    let lrcs = lrc.split("\n");
    for(let i = 0;i<lrcs.length;i++){
        if(!/\d/.test(lrcs[i][1])) continue;
        let lineNow = extractLrc(lrcs[i]);
        let lineNext = i+1 == lrcs.length ? [msToTime(duration),""] : extractLrc(lrcs[i+1]);
        res+=`<p begin="00:${lineNow[0]}" end="00:${lineNext[0]}">${lineNow[1]}</p>`;
    }
    res+=`</div>`;
    return res;
}
function msToTime(s) {
    function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
    }
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    var hrs = (s - mins) / 60;
    return pad(hrs) + ':' + pad(mins) + ':' + pad(secs) + '.' + pad(ms, 3);
  }
function extractLrc(line){
    return [line.slice(line.indexOf("[")+1,line.indexOf("]")),line.slice(line.indexOf("]")+1)];
}