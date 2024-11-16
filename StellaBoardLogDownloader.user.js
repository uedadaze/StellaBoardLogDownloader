// ==UserScript==
// @name         Stella Board Log Downloader
// @namespace    https://soraniwa.428.st/
// @version      1.01
// @description  「Stella board」のログをダウンロードします。発言をクリックして任意のリストを作成しそれをダウンロードできます。
// @author       Kirikabu
// @match        https://soraniwa.428.st/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // *** スタイル各種 ***
    // 右手のパネル
    var panelStyle = `
        position: fixed;
        top: 0;
        right: 0;
        width: 480px;
        height: 100%;
        background-color: black;
        border-left: 1px solid #ccc;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        transition: height 0.3s;
    `;
    // パネル上半分
    var topContainerStyle = `
        flex: 0 1 auto;
        padding: 10px;
        background-color: #333;
        color: white;
    `;
    // パネル下半分
    var bottomContainerStyle = `
        flex: 1 1 auto;
        overflow: auto;
        padding: 10px;
        background-color: black;
    `;
    // リサイズ部分
    var handleStyle = `
        position: absolute;
        left: -5px;
        top: 0;
        width: 10px;
        height: 100%;
        cursor: ew-resize;
        z-index: 10000;
    `;

    // *** 関数類 ***
    // ローカルストレージ使用容量の計算
    function getLocalStorageUsage() {
        var total = 0;
        for (var key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += ((localStorage[key].length + key.length) * 2);
            }
        }
        // KB単位で
        return (total / 1024).toFixed(2);
    }
    // 現在編集中のリストの使用容量の計算
    function getCurrentListUsage() {
        if (currentTitle && localStorage.getItem(currentTitle)) {
            var total = ((localStorage.getItem(currentTitle).length + currentTitle.length) * 2);
            // KB単位で
            return (total / 1024).toFixed(2);
        }
        return '0.00';
    }
    // ローカルストレージからリストのタイトル一覧を取得し、プルダウンメニューに表示
    function updateTitleList() {
        var keys = Object.keys(localStorage);
        // 不要なキーを除外
        keys = keys.filter(function(key) {
            return key !== 'savedList';
        });
        // プルダウンメニューをクリア
        titleSelect.innerHTML = '<option value="">***新規リスト***</option>';
        keys.forEach(function(title) {
            var option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            titleSelect.appendChild(option);
        });
    }
    // ローカルストレージからリストを読み込む
    function loadList() {
        if (currentTitle && localStorage.getItem(currentTitle)) {
            var savedList = localStorage.getItem(currentTitle);
            bottomContainer.innerHTML = savedList;
            // 削除ボタンとドラッグ機能を再設定
            Array.from(bottomContainer.children).forEach(function(contentElement) {
                setupContentElement(contentElement);
            });
        } else {
            bottomContainer.innerHTML = '';
        }
        // 使用量を更新
        document.getElementById('storageUsage').textContent = getLocalStorageUsage() + ' KB';
        document.getElementById('currentListUsage').textContent = getCurrentListUsage() + ' KB';

        // 最下部までスクロールする
        bottomContainer.scrollTop = bottomContainer.scrollHeight;
    }
    // リストをローカルストレージに保存する
    function saveList() {
        if (currentTitle) {
            localStorage.setItem(currentTitle, bottomContainer.innerHTML);
        }
        // 使用量を更新
        document.getElementById('storageUsage').textContent = getLocalStorageUsage() + ' KB';
        document.getElementById('currentListUsage').textContent = getCurrentListUsage() + ' KB';
    }
    // div要素クリックしたときの修正
    function setupContentElement(contentElement) {
        // リンクを潰す
        var links = contentElement.querySelectorAll('a');
        links.forEach(function(link) {
            link.href = '#';
            link.addEventListener('click', function(e) {
                e.preventDefault();
            });
        });
        // 返信・削除ボタンを消す
        var i_reply = contentElement.querySelectorAll('i.ri-reply-fill');
        i_reply.forEach(function(icon) {
            icon.remove();
        });
        var i_del = contentElement.querySelectorAll('i.ri-delete-bin-fill');
        i_del.forEach(function(icon) {
            icon.remove();
        });
        // リストから削除するためのボタンを作成しイベントをつけて追加
        var deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.style.position = 'absolute';
        deleteButton.style.bottom = '5px';
        deleteButton.style.left = '5px';
        deleteButton.addEventListener('click', function() {
            bottomContainer.removeChild(contentElement);
            saveList();
        });
        contentElement.appendChild(deleteButton);
        // ドラッグ処理の追加
        var isDragging = false;
        var dragElement;
        var placeholder = document.createElement('div');
        placeholder.style.height = '2px';
        placeholder.style.backgroundColor = 'red';
        placeholder.style.margin = '5px 0';
        contentElement.addEventListener('mousedown', function(e) {
            isDragging = true;
            dragElement = contentElement.cloneNode(true);
            dragElement.style.opacity = '0.5';
            dragElement.style.position = 'absolute';
            dragElement.style.pointerEvents = 'none';
            dragElement.style.zIndex = '10000';
            document.body.appendChild(dragElement);
            moveAt(e.pageX, e.pageY);
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            moveAt(e.pageX, e.pageY);
            // 挿入位置の計算
            var rect = bottomContainer.getBoundingClientRect();
            var offsetY = e.clientY - rect.top + bottomContainer.scrollTop;
            var children = Array.from(bottomContainer.children);
            var insertBeforeElement = children.find(function(child) {
                return offsetY < child.offsetTop + child.offsetHeight / 2;
            });
            if (insertBeforeElement) {
                bottomContainer.insertBefore(placeholder, insertBeforeElement);
            } else {
                bottomContainer.appendChild(placeholder);
            }
        });
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                document.body.removeChild(dragElement);
                bottomContainer.insertBefore(contentElement, placeholder);
                bottomContainer.removeChild(placeholder);
                saveList();
            }
        });
        function moveAt(pageX, pageY) {
            dragElement.style.left = pageX - dragElement.offsetWidth / 2 + 'px';
            dragElement.style.top = pageY - dragElement.offsetHeight / 2 + 'px';
        }
    }

    // *** グローバル変数 ***
    // 編集中リストのタイトル
    var currentTitle = '';
    // パネルの幅変えれるように
    var isResizing = false;
    var startX;
    var startWidth;

    // *** 画面配置 ***
    // パネル要素を作成
    var panel = document.createElement('div');
    panel.setAttribute('style', panelStyle);
    // 上部コンテナを作成
    var topContainer = document.createElement('div');
    topContainer.setAttribute('style', topContainerStyle);
    topContainer.innerHTML = `
        <h1 id="panelTitle" style="margin: 0; font-size: 16px; color: white;">Stella Board Log Downloader</h1>
        <button id="toggleButton">>></button>
        <div id="topContent">
            <select id="titleList">
                <option value="">***新規リスト***</option>
            </select>
            <input type="text" id="title" placeholder="タイトルを入力" />
            <button id="renameButton">この名前でリストを作成</button>
            <p>
                ローカルストレージ使用量: <span id="storageUsage">${getLocalStorageUsage()} KB</span>
                (現在のリスト: <span id="currentListUsage">${getCurrentListUsage()} KB</span>)
            </p>
            <p>
            </p>
            <button id="downloadButton">💾保存用に別ページで表示</button>
            <p>
            <button id="deleteCurrentButton">💣️現在のリストを削除</button>
            <button id="deleteAllButton">💣️💣️全てのリストを削除</button>
            </p>
        </div>
    `;
    // 下半分
    var bottomContainer = document.createElement('div');
    bottomContainer.setAttribute('style', bottomContainerStyle);
    // リサイズ
    var handle = document.createElement('div');
    handle.setAttribute('style', handleStyle);
    // パネルに全部追加
    panel.appendChild(topContainer);
    panel.appendChild(bottomContainer);
    panel.appendChild(handle);

    // *** 初期処理 ***
    // 上半分のアレコレの要素を取得
    var titleInput = topContainer.querySelector('#title');
    var titleSelect = topContainer.querySelector('#titleList');
    var renameButton = topContainer.querySelector('#renameButton');
    var downloadButton = topContainer.querySelector('#downloadButton');
    var deleteCurrentButton = topContainer.querySelector('#deleteCurrentButton');
    var deleteAllButton = topContainer.querySelector('#deleteAllButton');
    var toggleButton = topContainer.querySelector('#toggleButton');
    var topContent = topContainer.querySelector('#topContent');
    var panelTitle = topContainer.querySelector('#panelTitle');
    // ページ読み込み時にタイトルリストを更新
    updateTitleList();

    //　*** 各種イベント ***
    // タイトル変更ボタン
    renameButton.addEventListener('click', function() {
        var oldTitle = currentTitle;
        var newTitle = titleInput.value.trim();
        if (!newTitle) {
            alert('タイトルを入力してください。');
            return;
        }
        //　（新規リストを指定している場合）
        if (oldTitle === '') {
            if (localStorage.getItem(newTitle) && !confirm('同名のリストが存在します。上書きしますか？')) {
                return;
            }
            currentTitle = newTitle;
            //　空リスト作成
            localStorage.setItem(currentTitle, '');
            updateTitleList();
            titleSelect.value = currentTitle;
            alert('新しいリストが作成されました。');
            renameButton.textContent = '名称変更';
            addEventListenersToTargets();
            loadList();
        } else if (oldTitle !== newTitle) {
            // （なにかリストを編集している場合）
            if (localStorage.getItem(newTitle) && !confirm('同名のリストが存在します。上書きしますか？')) {
                return;
            }
            // データを新タイトルに保存し古いタイトルを削除
            var data = localStorage.getItem(oldTitle);
            localStorage.setItem(newTitle, data);
            if (oldTitle) localStorage.removeItem(oldTitle);
            currentTitle = newTitle;
            updateTitleList();
            titleSelect.value = currentTitle;
            alert('タイトルが変更されました。');
        }
    });
    // 現在のリストを削除するボタン
    deleteCurrentButton.addEventListener('click', function() {
        if (currentTitle && confirm('現在のリストを削除しますか？')) {
            localStorage.removeItem(currentTitle);
            currentTitle = '';
            titleInput.value = '';
            titleSelect.value = '';
            bottomContainer.innerHTML = '';
            updateTitleList();
            loadList();
            alert('現在のリストを削除しました。');
        }
    });
    // 全てのリストを削除するボタン
    deleteAllButton.addEventListener('click', function() {
        if (confirm('作成した全てのリストを削除しますか？')) {
            Object.keys(localStorage).forEach(function(key) {
                if (key !== 'savedList') {
                    localStorage.removeItem(key);
                }
            });
            currentTitle = '';
            titleInput.value = '';
            titleSelect.value = '';
            bottomContainer.innerHTML = '';
            updateTitleList();
            loadList();
            alert('全てのリストを削除しました。');
        }
    });
    // プルダウンメニューの選択変更時に対応するリストを読み込む処理
    titleSelect.addEventListener('change', function() {
        currentTitle = titleSelect.value;
        titleInput.value = currentTitle;
        loadList();
        if (currentTitle === '') {
            renameButton.textContent = 'この名前でリストを作成';
            removeEventListenersFromTargets();
        } else {
            renameButton.textContent = '名称変更';
            addEventListenersToTargets();
        }
    });
    // 隠したり出したりするボタン
    toggleButton.addEventListener('click', function() {
        if (bottomContainer.style.display === 'none') {
            bottomContainer.style.display = '';
            toggleButton.textContent = '>>';
            topContent.style.display = '';
            panel.style.height = '100%';  // パネルの高さを元に戻す
            // イベントリスナーを再追加
            addEventListenersToTargets();
        } else {
            bottomContainer.style.display = 'none';
            toggleButton.textContent = '<<';
            topContent.style.display = 'none';
            var newHeight = topContainer.offsetHeight + 'px';
            panel.style.height = newHeight;  // パネルの高さを調整
            // イベントリスナーを削除
            removeEventListenersFromTargets();
        }
    });
    //　リサイズ絡み
    handle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(window.getComputedStyle(panel).width, 10);
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        var newWidth = startWidth - (e.clientX - startX);
        panel.style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
        }
    });
    // ダウンロードボタン
    downloadButton.addEventListener('click', function() {
        if (!currentTitle) {
            alert('リストが選択されていません。');
            return;
        }
        // 新しいウィンドウを開いてHTMLを表示
        var newWindow = window.open('', '_blank');
        if (newWindow) {
            var htmlContent = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + currentTitle + '</title><style>' +
                              'body { background-color: black; color: white; }' + // text-alignを削除
                              'h1 { text-align: center; }' + // 見出しをセンタリング
                              'div { max-width: 520px; background-color: #040310; margin: 2px auto; padding: 2px; }' + // divをセンタリング
                              'a { color: #C39AF7; pointer-events: none; }' +
                              'img { margin: 0; padding: 0; vertical-align: bottom; }' +
                              '</style>' +
                              '</head><body>';
            htmlContent += '<h1>' + currentTitle + '</h1>';
            Array.from(bottomContainer.children).forEach(function(element) {
                var clonedElement = element.cloneNode(true);
                // 削除ボタンを削除
                var deleteButtons = clonedElement.querySelectorAll('button');
                deleteButtons.forEach(function(itm) {
                    itm.remove();
                });
                htmlContent += clonedElement.outerHTML;
            });
            htmlContent += '</body></html>';
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        } else {
            alert('新しいウィンドウを開くことができませんでした。');
        }
    });

    // *** ページ内の発言部分をいじるところ ***
    // 対象の要素を取得
    var targets = document.querySelectorAll('div.talkarea.talkmain');
    // イベントリスナー追加
    function addEventListenersToTargets() {
        targets.forEach(function(element) {
            element.addEventListener('mouseenter', mouseEnterHandler);
            element.addEventListener('mouseleave', mouseLeaveHandler);
            element.addEventListener('click', clickHandler);
        });
    }
    // イベントリスナーを削除
    function removeEventListenersFromTargets() {
        targets.forEach(function(element) {
            element.removeEventListener('mouseenter', mouseEnterHandler);
            element.removeEventListener('mouseleave', mouseLeaveHandler);
            element.removeEventListener('click', clickHandler);
        });
    }
    // マウスオーバー時の枠表示ハンドラ
    function mouseEnterHandler() {
        if (currentTitle === '') return;
        this.style.outline = '2px solid red';
    }
    // マウスアウト時の枠非表示ハンドラ
    function mouseLeaveHandler() {
        if (currentTitle === '') return;
        this.style.outline = 'none';
    }
    // クリック時のリスト追加ハンドラ
    function clickHandler() {
        if (currentTitle === '') {
            alert('新規リストを作成してください。');
            return;
        }
        // クリックされた要素の内容を取得
        var content = this.innerHTML;
        // 追加しようとする要素の<span class="times">内のテキストを取得
        var timeElement = this.querySelector('span.times')
        var newTimeText = timeElement.textContent;
        // Eno部分も取得
        var newAdjacentText = '';
        if (timeElement.nextSibling && timeElement.nextSibling.nodeType === Node.TEXT_NODE) {
            newAdjacentText = timeElement.nextSibling.textContent.trim();
        }
        // 既存の要素と内容が一致するかチェック
        var isDuplicate = Array.from(bottomContainer.children).some(function(child) {
            var childTimeElement = child.querySelector('span.times');
            if (childTimeElement) {
                var childTimeText = childTimeElement.textContent;
                var childAdjacentText = '';
                if (childTimeElement.nextSibling && childTimeElement.nextSibling.nodeType === Node.TEXT_NODE) {
                    childAdjacentText = childTimeElement.nextSibling.textContent.trim();
                }
                return childTimeText === newTimeText && childAdjacentText === newAdjacentText;
            }
            return false;
        });
        if (isDuplicate) {
            alert('この内容は既にリストに追加されています。');
            return;
        }
        // 新しいコンテンツ要素を作成
        var contentElement = document.createElement('div');
        contentElement.innerHTML = content;
        contentElement.style.borderBottom = '1px solid #ccc';
        contentElement.style.marginBottom = '10px';
        contentElement.style.position = 'relative';
        contentElement.style.cursor = 'move';
        // コンテンツ要素の設定
        setupContentElement(contentElement);
        // 下部コンテナに追加
        bottomContainer.appendChild(contentElement);
        // 下部コンテナを下までスクロール
        bottomContainer.scrollTop = bottomContainer.scrollHeight;
        // リストを保存
        saveList();
    }

    // *** 仕上げ ***
    // パネルをページに追加
    document.body.appendChild(panel);
    // 初期状態でイベントリスナーを追加
    addEventListenersToTargets();
    // ページ読み込み時にリストを読み込む
    loadList();
})();
