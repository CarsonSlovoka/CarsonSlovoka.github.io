/*
* https://datatables.net/examples/data_sources/js_array
* https://datatables.net/extensions/rowgroup/examples/initialisation/range
* */

function convertTOC2a(tocHTML, baseURI, searchItems = []) {
  const parser = new DOMParser()
  const documentToc = parser.parseFromString(tocHTML, "text/xml")

  const collectionLi = documentToc.querySelectorAll("li")
  let a
  let highlightLink = ""
  if (searchItems.length > 0) {
    highlightLink = searchItems.length === 1 ? `:~:text=${searchItems[0]}` : `:~:text=${searchItems.join("&text=")}`
  }

  const resultList = []
  for (const li of collectionLi) {
    // console.log(li.textContent)
    a = li.querySelector("a")

    if (a &&
    a.hasAttribute("href") &&
    searchItems.length === 0 ? true : searchItems.some((item) => {
      return a.innerHTML.toLowerCase().includes(item)
    })
    ) {
      // a.attributes.href.baseURI
      // https://stackoverflow.com/a/66304412/
      // #:~:text=[prefix-,]textStart[,textEnd][,-suffix][&text=]
      resultList.push(`<a href="${baseURI + a.getAttribute('href') + highlightLink}">🔗 ${li.textContent}</a>`)
    }
  }
  return resultList.join("<br>")
}

(
  () => {
    const node_json = document.getElementById('data_array');
    let data_array = JSON.parse(node_json.innerText);

    const myTable = []
    data_array.map((obj) => {
      const curLink = obj.permalink
      const curItem = [
        `<a href="${curLink}">${obj.title}</a>`,
        obj.desc,
        obj.tags,
        convertTOC2a(obj.toc, curLink),
        obj.lastModDate,
        obj.createDate]
      myTable.push(curItem)
    })

    $(document).ready(function () {
      $('#app').DataTable({
        data: myTable,  // [["...", "..."], ["...", "..."], ...]
        columns: [
          {title: "Title"},
          {title: "Desc"},
          { title: "Tags" },
          { title: "TOC" },
          {title: "lastModDate"},
          {title: "createData"}
        ]
      });
    });
  }
)();
