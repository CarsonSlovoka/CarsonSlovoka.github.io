class SimpleSearch {
  constructor(output_node, data_array) {
    this.app = output_node  // HTMLElement
    this.data_array = data_array;
    /* document.addEventListener('submit', simpleSearch.handleSearch); 這樣的用法是錯的，傳過去到裡面的this會是HTMLObject，而非這個類別的instance*/
    document.addEventListener('submit', (submit_event) => {  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event
      this.handleSearch(submit_event)
    });
    /* document.addEventListener('reset', function (event) {this.render()} 這樣的this他會不知道是這個類別的instance */
    document.addEventListener('reset', (event) => {
      event.preventDefault();  // 防止頁重新加載
      this.render(this.data_array)
    });
  }

  handleSearch(submit_event) {
    submit_event.preventDefault();  //  stops the page from reloading upon submission.
    // Get the search terms from the input field
    const htmlFormControlsCollection = submit_event.target.elements  // Form裡面所有的input還有button都包含在內
    const searchTerm = htmlFormControlsCollection['search'].value;  // []中可以放入name的名稱，就可以取得該元素

    // Tokenize the search terms and remove empty spaces
    const tokens = searchTerm
      .toLowerCase()
      .split(' ')
      .filter((token) => {
        return token.trim() !== '';  // 找出截空白之後不為空的元素
      });
    if (tokens.length) {
      //  Create a regular expression of all the search terms
      const searchTermRegex = new RegExp(tokens.join('|'),
        'gim'  //這是flags，其中g: global match, i: ignore case, m: multiline // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp#parameters
      );
      const filteredList = this.data_array.filter((obj_page) => {
        // Create a string of all object values
        let pageString = '';
        for (const key in obj_page) {
          if (obj_page.hasOwnProperty(key) &&  // 我們用hasOwnProperty來避免此屬性是繼承而來的
            obj_page[key] !== ''
          ) {
            pageString += obj_page[key].toString().toLowerCase().trim() + ' ';
          }
        }
        // Return page objects where a match with the search regex if found
        return pageString.match(searchTermRegex);
      });
      // Render the search results
      this.render(filteredList, tokens);

      this._highlight(this.app, tokens)
      /*
      tokens.forEach((token)=>{
        this._highlight(token)
      })
      */
    }
  }

  _highlight(elem, keywords, caseSensitive = false, cls = 'highlight') {
    // https://stackoverflow.com/a/49092029
    // https://stackoverflow.com/questions/8644428/how-to-highlight-text-using-javascript
    // #:~:text=Highlight%20These: https://stackoverflow.com/a/62558020
    const flags = caseSensitive ? 'g' : 'gi'
    // Sort longer matches first to avoid
    // highlighting keywords within keywords.
    keywords.sort((a, b) => b.length - a.length)  // 如果b的長度比較長就放在前面 // https://www.w3schools.com/js/js_array_sort.asp#midcontentadcontainer
    const keywordRegex = RegExp(keywords.join('|'), flags)
    Array.from(elem.childNodes).forEach(child => {
      if (child.nodeType !== 3) { // 1: element 2: attribute 3: text 8: comment  // https://www.w3schools.com/jsref/prop_node_nodetype.asp
        this._highlight(child, keywords, caseSensitive, cls)
      } else if (keywordRegex.test(child.textContent)) {

        const frag = document.createDocumentFragment()  // https://blog.csdn.net/aitangyong/article/details/50351400#:~:text=DocumentFragment%EF%BC%88%E6%96%87%E6%A1%A3%E7%89%87%E6%AE%B5%EF%BC%89%E6%8E%A5%E5%8F%A3%E8%A1%A8%E7%A4%BA,%E4%B8%8D%E4%BC%9A%E5%AF%BC%E8%87%B4%E6%80%A7%E8%83%BD%E9%97%AE%E9%A2%98%E3%80%82
        let lastIdx = 0

        child.textContent.replace(keywordRegex, (match, idx) => {  // keywordRegex會把匹配成功的東西傳給match和idx，match是匹配重的文字內容
          const part = document.createTextNode(child.textContent.slice(lastIdx, idx))  // 決定textNode裡面的內容  // 一段字中，匹配文字前面的內容 // TextNode就像是innerHTML一般 https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_document_createtextnode2
          const highlighted = document.createElement('mark')
          // const highlighted = document.createElement('span')
          highlighted.textContent = match
          // highlighted.classList.add(cls)
          frag.appendChild(part)
          frag.appendChild(highlighted)
          lastIdx = idx + match.length
        })

        const end = document.createTextNode(child.textContent.slice(lastIdx))  // 一段字中，匹配文字後的內容
        frag.appendChild(end)
        child.parentNode.replaceChild(frag, child)
      }
    });
  }

  _convertTOC2a(tocHTML, baseURI, searchItems = []) {
    const parser = new DOMParser()
    const documentToc = parser.parseFromString(tocHTML, "text/xml")

    /*
    // const collectionNav = documentToc.getElementsByTagName('nav')  // HTMLCollection
    const nodeNav = documentToc.getElementById("TableOfContents")
    const collectionUl = nodeNav.getElementsByTagName("ul")  // HTMLCollection

    let collectionLi, li;
    for (const ul of collectionUl) {
      collectionLi = nodeNav.getElementsByTagName("li")
      for (li of collectionLi) {
        console.log(li.textContent)
      }
    }
   */

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
    return resultList.join("")
  }

  render(data_array, searchItems = []) {
    this.app.innerHTML = '<ul>' +
      data_array.map((objPage) => {  // 剛好他每一個元素都是一個obj
        const curLink = objPage.permalink
        const fieldList = [
          ["Title", `<a href="${curLink}">${objPage.title}</a>`],
          ["Desc", objPage.desc],
          ["Tags", objPage.tags],
          ["TOC", this._convertTOC2a(objPage.toc, curLink, searchItems)],
          ["lastModDate", objPage.lastModDate],
          ["createDate", objPage.createDate]
        ]
        let resultString = ''
        fieldList.forEach((field) => {
          const [key, val] = field
          if (val) {
            resultString += `<strong>${key}:</strong>${val}<br/>`
          }
        })
        return `<li>${resultString}</li>`
      }).join('') + '</ul>';
  }
}

(
  () => {
    let appNode = document.getElementById('app')

    const node_json = document.getElementById('data_array');
    const data_array = JSON.parse(node_json.innerText);

    const simpleSearch = new SimpleSearch(appNode, data_array)
    simpleSearch.render(simpleSearch.data_array)
  }
)();
