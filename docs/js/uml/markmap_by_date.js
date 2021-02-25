class MarkmapFactory {
  constructor(date_list){
    this.dict_data = this._group_by_date(date_list);
  }

  _group_by_date(date_list){
    const result_dict = {}
    date_list.forEach(row => {
      const [title, last_mod_date, create_date , link] = row;
      const [yy, mm, dd] = last_mod_date.split('-')
      if (result_dict[yy] === undefined) {
        result_dict[yy] = {}
      }
      if (result_dict[yy][mm] === undefined) {
        result_dict[yy][mm] = []
      }
      result_dict[yy][mm].push({title, last_mod_date, create_date, link})
    });
    return result_dict
  }

  create_markmap_data(){
    const sub_c = []
    const result_dict = {t: 'root', d: 0, v: "", c:sub_c};
    let year, dict_yy;
    let month, dict_mm, data_list;
    let cur_mod_date, cur_create_date;
    for ([year, dict_mm] of Object.entries(this.dict_data)) {
      dict_yy = {t: 'h', d: 1, v:year, c:[]}
      sub_c.push(dict_yy)
      for ([month, data_list] of Object.entries(dict_mm)) {
        dict_mm = {t: 'h', d: 2, v:month, c:[]}
        dict_yy['c'].push(dict_mm)
        data_list.forEach( dict_info => {
          cur_mod_date = new Date(dict_info['last_mod_date']);  // .getDate()
          cur_create_date = new Date(dict_info['create_date']);
          dict_mm['c'].push({
            t: 'h',
            d: 3,
            v:`<a href="${dict_info["link"]}">
              ${dict_info["title"]}
              <small style="color:gray; opacity: 0.5;">
                (${cur_mod_date.getMonth()+1 + "-" + cur_mod_date.getDate()})
                create: (${cur_create_date.toLocaleDateString()})
              </small>
            </a>`})
        })
      }
    }
    sub_c.reverse()
    return result_dict
  }

  create_mind_map(svg_id, dict_data){
    let e = ()=>window.markmap
    const {Markmap:r} = e();
    window.mm = r.create("svg#"+svg_id, null, dict_data)
  }
}

(
  ()=>{
    const node_json = document.getElementById('article_by_date');
    const date_list = JSON.parse(node_json.innerText);
    node_json.remove();

    const obj = new MarkmapFactory(date_list)
    const id_name = 'mind-map-by-date';
    const dict_markmap_data = obj.create_markmap_data();
    obj.create_mind_map(id_name, dict_markmap_data);
  }
)();

