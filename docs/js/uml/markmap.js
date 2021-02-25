{{/* 本腳本得以讓markdown中是用語法如下
{"t":"h1","d":1,"v":"教學", "c":[
        {"t":"header_name","d":2,"v":"node_name"}
    ]
}
的方式產生code-block的心智圖
 */}}
function getNode(n, v) {
  /* https://stackoverflow.com/a/37411738/9935654 */
  n = document.createElementNS("http://www.w3.org/2000/svg", n);
  for (var p in v)
    n.setAttributeNS(null, p.replace(/[A-Z]/g, function(m, p, o, s) { return "-" + m.toLowerCase(); }), v[p]);
  return n
};

(
  function(/*para1, para2 ...*/){
    const plantumlPrefix = "markmap"
    var idx = 0;
    Array.prototype.forEach.call(document.querySelectorAll("[class^=language-" + plantumlPrefix + "]"), function(code){
      idx += 1;
      let id_name = 'mindmap' + idx.toString();
      let svg = getNode("svg", {id: id_name, style: "width:60vw; height:40vh;"});  /* <svg id="mindmap"></svg> */
      /*
      code.parentNode.insertBefore(svg, code);
      code.style.display = 'none';
      */
      code.replaceWith(svg);

      (
        (e) => {
          const{Markmap:r} = e();
          let svg_json_string = code.innerText;  /* code.innerHTML 如果是HTML < 等等的符號會轉譯&lt */
          let svg_json = JSON.parse(svg_json_string);
          window.mm = r.create("svg#"+id_name, null, svg_json)
        }
      )(()=>window.markmap);

    });
  }
)(/*input_para1, input_para2 ...*/);

/*
(
  (e) => {
    const{Markmap:r} = e();
    const plantumlPrefix = "markmap";
    let code = document.querySelectorAll("[class^=language-" + plantumlPrefix + "]");
    let svg_json = code.innerText;
    window.mm = r.create("svg#mindmap", null, svg_json)
  }
)(
  ()=>window.markmap,
);
*/
