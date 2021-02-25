(function(){
  {{/*
  在markdown中
  code class="language-xxx" xxx就是code-block中您給的名稱
  plantumlPrefix = "plantuml";
  */}}
  const plantumlPrefix = "plantuml"
  Array.prototype.forEach.call(document.querySelectorAll("[class^=language-" + plantumlPrefix + "]"), function(code){
    let image = document.createElement("IMG");
    {{/*
      <img src="my-image.jpg" loading="lazy">
      loading=
        - lazy 在圖片快要被看到的時候才會載入圖片
        - eager  不管元素在那裡會立即顯示圖片
        - auto 讓瀏覽器自行決定
     */}}
    image.loading = 'lazy';
    image.src = 'http://www.plantuml.com/plantuml/svg/~1' + plantumlEncoder.encode(code.innerText);
    {{/*
    code.innerHTML = "";
    */}}
    code.parentNode.insertBefore(image, code);
    code.style.display = 'none';
  });
})();
