{{/* https://www.dannyguo.com/blog/how-to-add-copy-to-clipboard-buttons-to-code-blocks-in-hugo/ */}}

function addCopyButtons(clipboard) {
  document.querySelectorAll('pre > code').forEach(function (codeBlock) {

    const button = document.createElement('button');
    button.className = 'copy-code-button';  // 為了配合CSS而已
    button.type = 'button';
    // button.innerText = 'Copy';
    button.title = 'Copy';

    const icon_copy = document.createElement('i');  // fontawesome: <i class="far fa-copy"></i>
    icon_copy.className = "far fa-copy"

    button.addEventListener('click', function () {
      clipboard.writeText(codeBlock.innerText).then(function () {
        /* Chrome doesn't seem to blur automatically,
           leaving the button in a focused state. */
        button.blur();

        const org_innerText = button.innerText
        button.innerText = 'Copied!';

        setTimeout(function () {
          button.innerText = org_innerText;
          button.appendChild(icon_copy)  // 因為我們改變了innerText，所以要重新再加入
        }, 1000);
      }, function (error) {
        button.innerText = 'Error';
      });
    });

    let pre = codeBlock.parentNode;
    if (pre.parentNode.classList.contains('highlight')) {
      let highlight = pre.parentNode;
      highlight.parentNode.insertBefore(button, highlight);
    } else {
      pre.parentNode.insertBefore(button, pre);
    }
    button.appendChild(icon_copy)
  });
}

(
  () => {
    if (navigator && navigator.clipboard) {
      {{/* https://developer.mozilla.org/en-US/docs/Web/API/Navigator/clipboard */}}
      addCopyButtons(navigator.clipboard);
    } else {
      let script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/clipboard-polyfill/2.7.0/clipboard-polyfill.promise.js';
      script.integrity = 'sha256-waClS2re9NUbXRsryKoof+F9qc1gjjIhc2eT7ZbIv94=';
      script.crossOrigin = 'anonymous';
      script.onload = function() {
        addCopyButtons(clipboard);
      };
      document.body.appendChild(script);
    }
  }
)();
