class Toc {
  constructor(node_nav){
    this.data = node_nav;  // document.getElementById(toc_id);
  }
  create_mind_map(svg_id, dict_data){
    let e = ()=>window.markmap
    const {Markmap:r} = e();
    window.mm = r.create("svg#"+svg_id, null, dict_data)
  }

  _get_element(ul_node, c, cur_level){

    let li_list = Array.prototype.slice.call(ul_node.childNodes).filter(node => node.nodeName === 'LI' )
    li_list.forEach(li => {
      const inner_a = li.firstElementChild;
      const value = (()=>{
        // If it contains two links (one is an internal link and the other is an external link, then the internal link is used as the primary link)
        const inner_a_copy = inner_a.cloneNode(true);  // avoid modify the original innerText  // 如果是false不會把innerText包含進去
        const outer_a = ((RegExp('<a[^>]*>[^<]*<\/a><a[^>]*>[^<]*<\/a>').exec(li.innerHTML)) != null ?
         Array.prototype.slice.call(li.childNodes).filter(node => node.nodeName === 'A' )[1] :
         undefined
         );
        if (outer_a !== undefined) {
          inner_a_copy.innerText = outer_a.innerText
        }
        return inner_a_copy.outerHTML;
      })();

      let ul = Array.prototype.slice.call(li.childNodes).filter(node => node.nodeName === 'UL' )

      if (ul.length > 0){
        let sub_list = [];
        this._get_element(ul[0], sub_list, cur_level+1)
        c.push({t: 'h', d: cur_level, v: value, c:sub_list})
      }
      else {
        c.push({t: 'h', d: cur_level, v: value})
      }
    });
  }

  convert2dict(){
    let root_ul = Array.prototype.slice.call(this.data.childNodes).filter(node => node instanceof HTMLUListElement)[0]
    const sub_c = []
    const result_dict = {t: 'root', d: 0, v: "", c:sub_c};
    const level = 1
    this._get_element(root_ul, sub_c, level);
    return result_dict
  }
};

const init_svg_hover_attr = (svg) => {
  /*
  const element_toc = document.getElementById('toc');
  if element_toc !== null {
  }
  */
  const node_main = document.getElementsByTagName('main')[0];
  const domrect_node_main = node_main.getBoundingClientRect();
  const domrect_svg = svg.getBoundingClientRect();
  const new_x = (domrect_node_main.width - domrect_svg.width) / 2  // 計算出兩邊應該留白多少
  const left = -(domrect_svg.x - new_x);  // 從目前的位置移置到應留白的起始位置 (因為我們已知道svg是在右邊要往左移動所以用-號)
  /*
  svg.style["background-color"] = "rgb(0, 0, 0)";
  svg.style.transform = "scale(5)";
  svg.style.position = "relative";
  */
  //document.styleSheets
  const sheetName = "navbar"  // .css
  SetStyleRule(sheetName, "#mindmap-toc:hover", "left:"+ left + "px");
  // SetStyleRule(sheetName, "#mindmap-toc:hover", "background-color: rgb(255, 0, 0)");
}

const SetStyleRule = (sheetName, selector, rule) => {
    let stylesheet = document.querySelector('link[href*=' + sheetName + ']')

    if( stylesheet ){
        stylesheet = stylesheet.sheet
        stylesheet.insertRule(selector + '{ ' + rule + '}', stylesheet.cssRules.length)
    }
}

function hide_copy_code_btn() {
  let copy_btn_list = document.getElementsByClassName("copy-code-button")
  for (let btn of copy_btn_list) {  // HTMLCollection
    btn.style.display = "none"
  }
}

function show_copy_code_btn() {
  let copy_btn_list = document.getElementsByClassName("copy-code-button")
  for (let btn of copy_btn_list) {  // HTMLCollection
    btn.style.display = ""
  }
}

(
  ()=>{
    let node_nav = document.getElementById('TableOfContents');
    const toc = new Toc(node_nav);
    const dict_data = toc.convert2dict();
    const id_name = 'mindmap-toc';
    let node_svg = getNode("svg", {id: id_name, class: 'mindmap' /*, onmouseover: "mouse_hover_markmap(this)" */

      // 很奇怪雖然我們嘗試把svg用relative加上z-index但還是沒辦法讓btn不見，所以就用JS來幫忙
      , onmouseover: "hide_copy_code_btn()", onmouseout: "show_copy_code_btn()"
    });
    // node_nav.appendChild(node_svg);
    node_nav.replaceWith(node_svg);
    toc.create_mind_map(id_name, dict_data);
    init_svg_hover_attr(node_svg)  // 要放在最後面，因為計算hover的寬度會需要用到svg的位置資訊
  }
)();
