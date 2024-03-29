// go build -o home.exe -ldflags "-s -w"

package main

import (
	"bytes"
	bytes2 "carson.io/pkg/bytes"
	html2 "carson.io/pkg/html"
	io2 "carson.io/pkg/io"
	. "carson.io/pkg/utils"
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	filepath2 "github.com/CarsonSlovoka/go-pkg/v2/path/filepath"
	"github.com/CarsonSlovoka/go-pkg/v2/tpl/template"
	htmlTemplate "html/template"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	textTemplate "text/template"
	"time"
)

type Config struct {
	*Server
	excludeFiles []string
	SiteContext  // 不使用指標，我們希望用此變數傳入Execute時，它的ctx彼此都是獨立，不會因為有些頁面改變而受到影響
}

type Server struct {
	Port int
}

var (
	config *Config
)

func init() {
	now := time.Now()
	config = &Config{
		&Server{0}, // port為0可以自動找尋沒有被使用到的port
		[]string{
			`url\\static\\css\\.*\.md`,
			`url\\static\\img\\.*\.md`,
			`url\\static\\img\\.*\.md`,
			`url\\static\\js\\.*\.md`,
			`url\\static\\sass\\.*`,

			`url\\tmpl\\.*`, // 樣版在release不需要再給，已經遷入到source之中

			`url\\ts\\.*`,

			// `url\\blog\\.*\.md`,   // ~~不需要source，留下html即可~~ md也改成可以有fontMatter即可單獨存在，所以也要保留
			`url\\blog\\test\\.*`, // 測試用的檔案都不複製
		}, SiteContext{ // 設定預設值，注意，這裡的ctx是獨立的，各個頁面可以針對該ctx進行修改，都不會影響到彼此
			RootTitle:     "Carson-Blog",
			Version:       "0.0.0",
			LastBuildTime: now, // .Format("2006-01-02 15:04")
		},
	}
}

func render(src, dst string, ctx *PageContext, tmplFiles []string, forceBuildAll bool) error {
	parseFiles, err := template.GetAllTmplName(os.ReadFile, src, tmplFiles)
	if err != nil {
		return err
	}
	parseFiles = append(parseFiles, src)

	t := textTemplate.Must(
		textTemplate.New(filepath.Base(src)).
			Funcs(tmplFuncMaps).
			ParseFiles(parseFiles...),
	)

	buf := bytes.NewBuffer(make([]byte, 0))
	if err = t.Execute(buf, ctx); err != nil {
		return err
	}
	bs, _ := io.ReadAll(buf)

	if !forceBuildAll {
		// 檔案內容如果完全一樣，就不再寫入
		if _, err = os.Stat(dst); !os.IsNotExist(err) {
			var bs2 []byte
			bs2, err = os.ReadFile(dst)
			if err != nil {
				return err
			}

			elem := html2.QuerySelector(string(bs2), "meta", func(elem *html2.Element) bool {
				if elem.GetAttr("name") == "source-hash" {
					return true
				}
				return false
			})

			if elem != nil && elem.GetAttr("content") != "" { // 如果抓的到source-hash就用它來當成比較依據
				hash := elem.GetAttr("content")
				if hash != "" && hash == ctx.SourceHash {
					PInfo.Printf("檔案: %q | 因內容沒有異動(SourceHash相同)，故不渲染 \n", dst)
					return nil
				}
			} else if bytes.Compare(bs, bs2) == 0 { // 如果都沒有就直接以最後的檔案內容當參考去比較
				PInfo.Printf("檔案: %q | 因內容沒有異動，故不渲染 \n", dst)
				return nil
			}
		}
	}

	var dstFile *os.File
	dstFile, err = os.Create(dst)
	if err != nil {
		return err
	}
	defer func() {
		_ = dstFile.Close()
	}()

	if _, err = dstFile.Write(bs); err != nil {
		return err
	}
	POk.Printf("檔案: %q | 已更新 \n", dst)
	return nil
}

func build(outputDir string, forceBuildAll bool) error {
	var (
		mirrorDir func(rootSrc string, dst string, excludeList []string) error
	)
	{ // init function
		mirrorDir = func(rootSrc string, dst string, excludeList []string) error {
			return filepath.Walk(rootSrc, func(path string, info os.FileInfo, err error) error {
				if info.IsDir() && (path != rootSrc &&
					func(curPath string) bool { // filter
						for _, excludeItem := range excludeList {
							if strings.HasPrefix(curPath, excludeItem) {
								return false
							}
						}
						return true
					}(path)) {

					dstPath := filepath.Join(dst, strings.Replace(path, rootSrc, "", 1))
					// fmt.Println(dstPath)
					if err = os.MkdirAll(dstPath, os.FileMode(666)); err != nil {
						return err
					}
				}
				return nil
			})
		}
	}

	{ // Copy Dir only
		if err := mirrorDir("url\\", outputDir, []string{
			"url\\pkg",
			"url\\static\\sass",
		}); err != nil {
			panic(err)
		}
	}

	{ // and then copy file
		tmplFiles, err := filepath2.CollectFiles("url/tmpl", []string{"\\.md$"})
		if err != nil {
			return err
		}

		filePathList, _ := filepath2.CollectFiles("url\\", config.excludeFiles)
		for _, srcPath := range filePathList {
			// dst := filepath.Join("../docs/", strings.Replace(src, "url\\", "", 1)) // filepath.Join反斜線會自動修正，所以這樣也可以
			dst := filepath.Join(outputDir, strings.Replace(srcPath, "url\\", "", 1))

			ctx := &PageContext{
				config.SiteContext,
				"",
				FrontMatter{},
				"", // 如果是客製化的html，不可慮使用，因為它有可能用到很多其他檔案，都要判別有沒有異動太麻煩
				// "",
				nil,
			}
			switch filepath.Ext(dst) {
			case ".gohtml":
				dst = dst[:len(dst)-6] + "html"
				ctx.Filepath = srcPath
				if err = render(srcPath, dst, ctx, tmplFiles, forceBuildAll); err != nil {
					return err
				}
			case ".md":
				dst = dst[:len(dst)-2] + "html"
				var (
					src []byte
					fm  *FrontMatter
				)

				src, err = os.ReadFile(srcPath)
				if err != nil {
					panic(err)
				}
				fm, _, err = bytes2.GetFrontMatter[FrontMatter](src, false)
				if err != nil {
					panic(err)
				}
				if fm == nil { // 表示這個檔案沒有frontMatter，就不處理
					continue
				}

				if fm.Draft {
					// 草稿不渲染
					continue
				}

				ctx.Context = context.TODO()
				ctx.FrontMatter = *fm
				ctx.Filepath = strings.TrimPrefix(srcPath, "url") // 這個路徑是給md用的，它裡面預設已經在url路徑，所以不用在加)

				genMd5 := md5.New()
				genMd5.Write(src)
				md5Hash := hex.EncodeToString(genMd5.Sum(nil))
				ctx.SourceHash = md5Hash

				srcPath = filepath.Join("url/tmpl", fm.Layout)
				if err = render(srcPath, dst, ctx, tmplFiles, forceBuildAll); err != nil {
					return err
				}
			default:
				// 複製js, css...等其他檔案
				if err = io2.CopyFile(srcPath, dst); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func BuildServer(isLocalMode bool) (server *http.Server, listener net.Listener) {
	mux := http.NewServeMux()

	tmplFiles, err := filepath2.CollectFiles("url/tmpl", []string{"\\.md$"})
	if err != nil {
		log.Fatal(err)
	}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		rootDir := http.Dir("./url/")
		curFilepath := filepath.Join(string(rootDir), r.URL.Path)
		extName := filepath.Ext(curFilepath)
		switch extName {
		case ".js":
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8") // 預設的js用的text/javascript
			http.FileServer(rootDir).ServeHTTP(w, r)
			return
		case ".sass":
			w.WriteHeader(http.StatusForbidden) // 如果直接返回, status沒有註明，得到的會是一個空頁面(會不曉得對錯)
			return
		case "":
			for {
				// 1. 省略.html
				if _, err = os.Stat(curFilepath + ".gohtml"); !os.IsNotExist(err) {
					/* 不需要增加額外的計算
					if strings.HasSuffix(r.URL.Path, "/") {
						r.URL.Path = strings.TrimSuffix(r.URL.Path, "/") // 這個會影響到path.Dir，Dir(main/abc/) => main/abc  Dir(main/abc) => main/
					}
					r.URL.Path = path.Join(path.Dir(r.URL.Path), path.Base(r.URL.Path)+".html")
					*/
					if strings.HasSuffix(r.URL.Path, "/") {
						r.URL.Path = r.URL.Path[:len(r.URL.Path)-1] + ".html"
					} else {
						r.URL.Path += ".html"
					}
					break
				}

				// 訪問預設的index.html
				defaultIndexPage := path.Join(curFilepath, "index.gohtml")
				if _, err = os.Stat(defaultIndexPage); !os.IsNotExist(err) {
					// 讓其訪問預設的index.html
					r.URL.Path = path.Join(r.URL.Path, "index.gohtml")
					break
				}

				// 其他狀況
				http.FileServer(rootDir).ServeHTTP(w, r)
				return
			}
			fallthrough
		case ".html":
			if !strings.HasSuffix(r.URL.Path, ".gohtml") {
				r.URL.Path = r.URL.Path[:len(r.URL.Path)-4] + "gohtml" // treat all of html as gohtml
			}
			fallthrough
		case ".gohtml":
			src := filepath.Join(string(rootDir), r.URL.Path)

			if _, err = os.Stat(src); os.IsNotExist(err) {
				log.Println(err)
				return
			}

			w.Header().Set("Content-Type", "text/html; charset=utf-8")

			var parseFiles []string
			parseFiles, err = template.GetAllTmplName(os.ReadFile, src, tmplFiles)
			parseFiles = append(parseFiles, src)

			t := htmlTemplate.Must(
				htmlTemplate.New(filepath.Base(src)).
					Funcs(tmplFuncMaps).
					ParseFiles(parseFiles...),
			)

			ctx := config.SiteContext // 複製，使其能夠被修改而不影響原本的物件(注意如果物件本身有其他指標類的結構，此種複製方法是不安全的，該類的數值修改會影響到本體)
			// if err = t.Execute(w, &ctx); err != nil {
			if err = t.Execute(w, &PageContext{
				ctx,
				src,
				FrontMatter{},
				"", // 如果是屬於客製化的HTML，就不考慮這個數值，不然要去額外判斷所有他用到的東西有沒有被異動太麻煩
				// "",
				context.TODO(),
			}); err != nil {
				log.Printf("%s\n", err.Error())
			}
		/* 交給http.FileServer(http.Dir()).ServeHTTP(w, r)已經會自行處理MIME_types
		case ".js":
			// w.Header().Set("Content-Type", "text/javascript; charset=utf-8") // Expected a JavaScript module script but the server responded with a MIME type of "
		case ".css":
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		*/
		case ".md":
			if r.URL.Query().Has("raw") {
				http.FileServer(rootDir).ServeHTTP(w, r)
				return
			}

			srcPath := filepath.Join(string(rootDir), r.URL.Path)
			if _, err = os.Stat(srcPath); os.IsNotExist(err) {
				log.Println(err)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")

			var src []byte
			src, err = os.ReadFile(srcPath)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			var fm *FrontMatter

			fm, _, err = bytes2.GetFrontMatter[FrontMatter](src, false)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			if fm == nil {
				http.Error(w, "此md檔案沒有frontMatter", http.StatusBadRequest)
				return
			}

			if fm.Draft {
				http.Error(w, "此md為草稿，還在規劃中，敬請期待", http.StatusBadRequest)
				return
			}

			layoutPath := filepath.Join("url/tmpl", fm.Layout)

			var parseFiles []string
			parseFiles, err = template.GetAllTmplName(os.ReadFile, layoutPath, tmplFiles) // 從layoutPath之中獲取所有用到的tmpl
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			parseFiles = append(parseFiles, layoutPath)

			t := htmlTemplate.Must(
				htmlTemplate.New(filepath.Base(layoutPath)).
					Funcs(tmplFuncMaps).
					ParseFiles(parseFiles...),
			)

			siteCtx := config.SiteContext // copy

			// 計算 MD5
			genMd5 := md5.New()
			genMd5.Write(src)
			md5Hash := hex.EncodeToString(genMd5.Sum(nil))

			if err = t.Execute(w, &PageContext{
				siteCtx,
				strings.TrimPrefix(srcPath, "url"), // 這個路徑是給md用的，它裡面預設已經在url路徑，所以不用在加)
				*fm,
				md5Hash,
				// "",
				context.TODO(),
			}); err != nil {
				log.Printf("%s\n", err.Error())
			}

		default:
			http.FileServer(rootDir).ServeHTTP(w, r)
		}
	})

	if isLocalMode {
		server = &http.Server{Addr: fmt.Sprintf("127.0.0.1:%d", config.Server.Port), Handler: mux}
	} else {
		server = &http.Server{Addr: fmt.Sprintf(":%d", config.Server.Port), Handler: mux}
	}

	listener, err = net.Listen("tcp", server.Addr)
	if err != nil {
		panic(err)
	}

	return server, listener
}

func main() {
	wg := sync.WaitGroup{}
	wg.Add(1)
	go startCMD(&wg)
	wg.Wait()
	log.Printf("Close App.")
}
