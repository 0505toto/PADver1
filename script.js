/**
 * 経理ポータルサイト機能
 * 2025-07-02 Ver.1
 *
 * 機能一覧:
 * 1. 大阪の天気予報をAPIで取得して表示
 * 2. リンクアイテムのドラッグ＆ドロップによる並び替え
 * 3. よく使うリンクをお気に入りエリア（Quickエリア）に追加
 * 4. お気に入りアイテムの削除
 * 5. 全ての変更（並び順、お気に入り）をブラウザのLocalStorageに保存・復元
 */

// DOMの読み込みが完了したら、すべての処理を開始します。
document.addEventListener('DOMContentLoaded', () => {

    // ===== グローバル変数とDOM要素の取得 =====
    const weatherWidget = document.getElementById('weather-widget');
    const favoritesList = document.getElementById('favorites-list');
    const favoritesDropzone = document.getElementById('favorites-dropzone');
    const favoritesPlaceholder = document.getElementById('favorites-placeholder');
    // ドラッグ＆ドロップが可能なすべてのリスト（セクションのリスト + お気に入りリスト）
    const dropzones = document.querySelectorAll('.card ul, #favorites-list');
    let draggedItem = null; // ドラッグ中の要素を保持する変数

    // ===== 初期化処理 =====

    /**
     * 天気予報を初期化する関数
     */
    const initWeather = async () => {
        // Open-Meteo APIを使用して大阪の天気情報を取得 (APIキー不要)
        const lat = 34.69; // 大阪の緯度
        const lon = 135.50; // 大阪の経度
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('天気の取得に失敗しました。');
            
            const data = await response.json();
            const weather = data.current_weather;
            const temp = weather.temperature;
            const weatherCode = weather.weathercode;

            // 天気コードに対応するアイコンと日本語テキストを取得
            const { icon, text } = getWeatherInfo(weatherCode);

            // HTMLを更新
            weatherWidget.innerHTML = `
                <i class="fas ${icon} mr-2 text-lg"></i>
                <span>大阪の天気: ${text}, ${temp}°C</span>
            `;
        } catch (error) {
            console.error(error);
            weatherWidget.innerHTML = `
                <i class="fas fa-exclamation-circle mr-2 text-red-500"></i>
                <span>天気情報の取得に失敗</span>
            `;
        }
    };

    /**
     * 天気コードからアイコンクラスと日本語テキストを返すヘルパー関数
     * @param {number} code - Open-Meteoの天気コード
     * @returns {{icon: string, text: string}}
     */
    const getWeatherInfo = (code) => {
        const weatherMap = {
            0: { icon: 'fa-sun text-yellow-500', text: '快晴' },
            1: { icon: 'fa-cloud-sun text-yellow-500', text: '晴れ' },
            2: { icon: 'fa-cloud text-gray-400', text: '一部曇り' },
            3: { icon: 'fa-cloud text-gray-500', text: '曇り' },
            45: { icon: 'fa-smog text-gray-400', text: '霧' },
            48: { icon: 'fa-smog text-gray-400', text: '霧氷' },
            51: { icon: 'fa-cloud-rain text-blue-400', text: '霧雨' },
            53: { icon: 'fa-cloud-rain text-blue-400', text: '霧雨' },
            55: { icon: 'fa-cloud-rain text-blue-400', text: '霧雨' },
            61: { icon: 'fa-cloud-showers-heavy text-blue-500', text: '雨' },
            63: { icon: 'fa-cloud-showers-heavy text-blue-500', text: '雨' },
            65: { icon: 'fa-cloud-showers-heavy text-blue-600', text: '強い雨' },
            80: { icon: 'fa-cloud-showers-heavy text-blue-500', text: 'にわか雨' },
            81: { icon: 'fa-cloud-showers-heavy text-blue-500', text: 'にわか雨' },
            82: { icon: 'fa-cloud-showers-heavy text-blue-600', text: '激しいにわか雨' },
            95: { icon: 'fa-bolt text-yellow-400', text: '雷雨' },
        };
        return weatherMap[code] || { icon: 'fa-question-circle', text: '不明' };
    };

    /**
     * ドラッグ＆ドロップ機能を初期化する関数
     */
    const initDragAndDrop = () => {
        // すべてのドラッグ可能なアイテムにイベントリスナーを設定
        document.querySelectorAll('[draggable="true"]').forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });

        // すべてのドロップ可能なゾーンにイベントリスナーを設定
        dropzones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });
    };
    
    // ===== ドラッグ＆ドロップのイベントハンドラ =====

    function handleDragStart(e) {
        // ドラッグする要素はリンク(a)だが、操作対象はリスト項目(li)なので親要素を取得
        draggedItem = e.target.closest('li'); 
        if (!draggedItem) return;
        // ドラッグ中の見た目を変更
        setTimeout(() => draggedItem.classList.add('dragging'), 0);
        // データの転送設定（ここでは使わないが作法として）
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd() {
        if (!draggedItem) return;
        // ドラッグ中の見た目を元に戻す
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }

    function handleDragOver(e) {
        e.preventDefault(); // ドロップを許可するために必須
        const dropzone = e.target.closest('ul');
        if (dropzone) {
            dropzone.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const dropzone = e.target.closest('ul');
        if (dropzone) {
            dropzone.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        if (!draggedItem) return;

        const dropzoneList = e.target.closest('ul');
        if (!dropzoneList) return;

        dropzoneList.classList.remove('drag-over');

        // お気に入りエリアへのドロップ処理
        if (dropzoneList.id === 'favorites-list') {
            // 同じリンクがすでにお気に入りにないかチェック
            const linkHref = draggedItem.querySelector('a').href;
            const isAlreadyFavorite = [...favoritesList.querySelectorAll('a')].some(a => a.href === linkHref);
            
            if (!isAlreadyFavorite) {
                addFavorite(draggedItem);
            }
        } 
        // 同じリスト内での並び替え処理
        else {
            const afterElement = getDragAfterElement(dropzoneList, e.clientY);
            if (afterElement == null) {
                dropzoneList.appendChild(draggedItem);
            } else {
                dropzoneList.insertBefore(draggedItem, afterElement);
            }
        }
        
        // 変更を保存
        saveState();
    }

    /**
     * ドロップ位置の直後にある要素を取得する関数
     * @param {HTMLElement} container - ドロップ先のリスト
     * @param {number} y - マウスのY座標
     * @returns {HTMLElement|null}
     */
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // ===== お気に入り機能の関数 =====

    /**
     * お気に入りを追加する関数
     * @param {HTMLElement} originalItem - 元のリスト項目(li)
     */
    function addFavorite(originalItem) {
        const linkElement = originalItem.querySelector('a').cloneNode(true); // aタグをディープコピー
        const newItem = document.createElement('li');
        newItem.className = 'link-item flex justify-between items-center p-2 rounded-md bg-white';
        newItem.setAttribute('draggable', 'true');

        const removeBtn = document.createElement('i');
        removeBtn.className = 'fas fa-trash-alt text-gray-400 hover:text-red-500 cursor-pointer transition-colors';
        removeBtn.addEventListener('click', removeFavorite);

        newItem.appendChild(linkElement);
        newItem.appendChild(removeBtn);
        
        // 新しいお気に入りアイテムにもD&Dイベントを追加
        newItem.addEventListener('dragstart', handleDragStart);
        newItem.addEventListener('dragend', handleDragEnd);

        favoritesList.appendChild(newItem);
        updateFavoritesPlaceholder();
    }

    /**
     * お気に入りを削除する関数
     * @param {Event} e - クリックイベント
     */
    function removeFavorite(e) {
        e.preventDefault(); // リンクへ飛んでしまうのを防ぐ
        e.stopPropagation(); // イベントの伝播を防ぐ
        
        const itemToRemove = e.target.closest('li');
        itemToRemove.remove();
        updateFavoritesPlaceholder();
        saveState(); // 変更を保存
    }
    
    /**
     * お気に入りエリアのプレースホルダー表示を更新する関数
     */
    function updateFavoritesPlaceholder() {
        if (favoritesList.children.length === 0) {
            favoritesPlaceholder.style.display = 'block';
        } else {
            favoritesPlaceholder.style.display = 'none';
        }
    }


    // ===== 状態の保存と復元 (LocalStorage) =====

    /**
     * 現在のレイアウトとお気に入りをLocalStorageに保存する関数
     */
    function saveState() {
        // お気に入りの保存
        const favorites = [];
        favoritesList.querySelectorAll('li').forEach(item => {
            const link = item.querySelector('a');
            favorites.push({
                href: link.href,
                html: link.innerHTML // アイコンも含めて保存
            });
        });
        localStorage.setItem('portal_favorites', JSON.stringify(favorites));

        // 各セクションの並び順の保存
        document.querySelectorAll('main .card').forEach(section => {
            const sectionId = section.id;
            if (!sectionId) return;

            const linksOrder = [];
            section.querySelectorAll('li').forEach(item => {
                const link = item.querySelector('a');
                linksOrder.push({
                    href: link.href,
                    html: link.innerHTML
                });
            });
            localStorage.setItem(`portal_layout_${sectionId}`, JSON.stringify(linksOrder));
        });
    }

    /**
     * LocalStorageから状態を復元する関数
     */
    function loadState() {
        // お気に入りの復元
        const savedFavorites = JSON.parse(localStorage.getItem('portal_favorites'));
        if (savedFavorites) {
            favoritesList.innerHTML = ''; // 一旦クリア
            savedFavorites.forEach(fav => {
                const originalLink = findOriginalLink(fav.href);
                if (originalLink) {
                    addFavorite(originalLink.closest('li'));
                }
            });
        }
        updateFavoritesPlaceholder();

        // 各セクションの並び順の復元
        document.querySelectorAll('main .card').forEach(section => {
            const sectionId = section.id;
            if (!sectionId) return;

            const savedOrder = JSON.parse(localStorage.getItem(`portal_layout_${sectionId}`));
            if (savedOrder) {
                const list = section.querySelector('ul');
                if (list) {
                    list.innerHTML = ''; // リストをクリア
                    savedOrder.forEach(linkInfo => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = linkInfo.href;
                        a.innerHTML = linkInfo.html;
                        // 元のHTMLからクラスと属性を復元
                        const originalLink = findOriginalLink(linkInfo.href);
                        if(originalLink) {
                            a.className = originalLink.className;
                            a.target = originalLink.target;
                            a.rel = originalLink.rel;
                        }
                        li.appendChild(a);
                        li.setAttribute('draggable', 'true');
                        li.addEventListener('dragstart', handleDragStart);
                        li.addEventListener('dragend', handleDragEnd);
                        list.appendChild(li);
                    });
                }
            }
        });
    }
    
    /**
     * hrefを元に元のa要素を探すヘルパー関数
     * @param {string} href 
     * @returns {HTMLElement|null}
     */
    function findOriginalLink(href) {
        return document.querySelector(`main a[href="${href}"]`);
    }

    // ===== アプリケーションの実行 =====
    initWeather();
    loadState(); // 保存された状態を読み込む
    initDragAndDrop(); // D&D機能を初期化
});
