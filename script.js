// DOMが完全に読み込まれたら、スクリプトを実行します
document.addEventListener('DOMContentLoaded', () => {

    // ===== DOM要素の取得 =====
    const weatherWidget = document.getElementById('weather-widget');
    const favoritesList = document.getElementById('favorites-list');
    const addFavoriteBtn = document.getElementById('add-favorite-btn');
    const modal = document.getElementById('favorite-modal');
    const modalForm = document.getElementById('favorite-form');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const favNameInput = document.getElementById('fav-name');
    const favUrlInput = document.getElementById('fav-url');
    
    // ローカルストレージのキー
    const storageKey = 'accountingPortalFavorites_v2';

    // ===== 天気予報機能 =====
    /**
     * 天気コードから日本語の天気情報とFontAwesomeのアイコンクラスを返します。
     * @param {number} code - Open-Meteo APIから取得した天気コード
     * @returns {{text: string, icon: string}} 天気情報オブジェクト
     */
    const getWeatherInfo = (code) => {
        const weatherMap = {
            0: { text: "快晴", icon: "fa-sun" },
            1: { text: "晴れ", icon: "fa-sun" },
            2: { text: "一部曇り", icon: "fa-cloud-sun" },
            3: { text: "曇り", icon: "fa-cloud" },
            45: { text: "霧", icon: "fa-smog" },
            48: { text: "霧氷", icon: "fa-snowflake" },
            51: { text: "霧雨", icon: "fa-cloud-rain" },
            53: { text: "霧雨", icon: "fa-cloud-rain" },
            55: { text: "霧雨", icon: "fa-cloud-rain" },
            61: { text: "小雨", icon: "fa-cloud-showers-heavy" },
            62: { text: "雨", icon: "fa-cloud-showers-heavy" },
            63: { text: "大雨", icon: "fa-cloud-showers-heavy" },
            80: { text: "にわか雨", icon: "fa-cloud-bolt" },
            81: { text: "にわか雨", icon: "fa-cloud-bolt" },
            82: { text: "激しいにわか雨", icon: "fa-cloud-bolt" },
            95: { text: "雷雨", icon: "fa-bolt" },
        };
        return weatherMap[code] || { text: "不明", icon: "fa-question-circle" };
    };

    /**
     * 天気APIを叩いて情報を取得し、ウィジェットに表示します。
     */
    const fetchWeather = async () => {
        // 大阪の緯度経度
        const lat = 34.69;
        const lon = 135.50;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('天気情報の取得に失敗しました。');
            
            const data = await response.json();
            const weatherInfo = getWeatherInfo(data.current.weather_code);
            const currentTemp = Math.round(data.current.temperature_2m);
            const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
            const minTemp = Math.round(data.daily.temperature_2m_min[0]);

            weatherWidget.innerHTML = `
                <i class="fas ${weatherInfo.icon} text-cyan-400 text-4xl fa-fw"></i>
                <div>
                    <p class="font-bold text-lg text-white">${weatherInfo.text} ${currentTemp}°C</p>
                    <p class="text-gray-400">最高: ${maxTemp}°C / 最低: ${minTemp}°C</p>
                </div>
            `;
        } catch (error) {
            console.error("Weather fetch error:", error);
            weatherWidget.innerHTML = `
                <i class="fas fa-exclamation-triangle text-red-400 text-4xl fa-fw"></i>
                <div>
                    <p class="font-bold text-lg text-white">エラー</p>
                    <p class="text-gray-400">情報を取得できませんでした</p>
                </div>
            `;
        }
    };

    // ===== お気に入り機能 =====

    // ローカルストレージからお気に入りを読み込む
    let favorites = JSON.parse(localStorage.getItem(storageKey)) || [];

    /**
     * お気に入りリストを画面に描画します。
     */
    const renderFavorites = () => {
        favoritesList.innerHTML = ''; // いったんリストを空にする

        if (favorites.length === 0) {
            favoritesList.innerHTML = `
                <div class="border-2 border-dashed border-gray-700 p-4 rounded-lg text-center text-gray-500">
                    <p>よく使うリンクを<br>追加できます</p>
                </div>`;
            return;
        }

        favorites.forEach((fav, index) => {
            const favElement = document.createElement('a');
            favElement.href = fav.url;
            favElement.target = '_blank';
            favElement.className = 'favorite-item card bg-gray-800/80 p-3 rounded-lg flex items-center justify-between gap-3';
            favElement.dataset.id = index; // 並び替え用にインデックスを保持
            
            favElement.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    <i class="fas fa-star text-yellow-400 fa-fw"></i>
                    <span class="text-white truncate">${fav.name}</span>
                </div>
                <button data-index="${index}" class="delete-btn text-gray-500 hover:text-red-400 transition-colors p-2 -mr-2">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            favoritesList.appendChild(favElement);
        });
    };
    
    /**
     * 現在のお気に入りリストをローカルストレージに保存します。
     */
    const saveFavorites = () => {
        localStorage.setItem(storageKey, JSON.stringify(favorites));
    };
    
    /**
     * お気に入り追加モーダルを表示します。
     */
    const showModal = () => {
        modal.classList.add('active');
        favNameInput.focus(); // モーダル表示時に名前入力欄にフォーカス
    };

    /**
     * お気に入り追加モーダルを非表示にします。
     */
    const hideModal = () => {
        modal.classList.remove('active');
    };

    // 「お気に入り追加」ボタンがクリックされたらモーダルを表示
    addFavoriteBtn.addEventListener('click', showModal);

    // モーダルのキャンセルボタンがクリックされたらモーダルを非表示
    cancelBtn.addEventListener('click', hideModal);

    // モーダルの背景をクリックしたらモーダルを非表示
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal();
        }
    });
    
    // モーダルのフォームが送信されたときの処理
    modalForm.addEventListener('submit', (e) => {
        e.preventDefault(); // デフォルトのフォーム送信をキャンセル
        
        // 新しいお気に入りを配列に追加
        favorites.push({ 
            name: favNameInput.value, 
            url: favUrlInput.value 
        });
        
        saveFavorites();    // 保存
        renderFavorites();  // 再描画
        
        modalForm.reset(); // フォームの内容をリセット
        favUrlInput.value = 'https://'; // URLの初期値を設定
        hideModal();        // モーダルを閉じる
    });

    // お気に入りリスト内のクリックイベント（イベント委任）
    favoritesList.addEventListener('click', (e) => {
        // クリックされた要素が削除ボタン（またはその子要素）かを確認
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            e.preventDefault(); // aタグのリンク遷移をキャンセル
            const index = parseInt(deleteButton.dataset.index, 10);
            
            // 削除前に確認
            const itemNameToDelete = favorites[index].name;
            if (confirm(`「${itemNameToDelete}」を削除しますか？`)) {
                favorites.splice(index, 1); // 配列から削除
                saveFavorites();    // 保存
                renderFavorites();  // 再描画
            }
        }
    });

    // ===== ドラッグ＆ドロップ機能 =====
    /**
     * SortableJSを初期化して、各要素を並び替え可能にします。
     */
    const initSortable = () => {
        // メインコンテンツ内の並び替えを有効にしたいコンテナのIDリスト
        const sortableGridIds = ['#schedule-grid', '#accounting-grid', '#company-grid', '#tools-grid'];
        
        sortableGridIds.forEach(id => {
            const el = document.querySelector(id);
            if (el) {
                new Sortable(el, {
                    animation: 150, // アニメーション速度
                    ghostClass: 'sortable-ghost' // ドラッグ中のプレースホルダーのクラス
                });
            }
        });

        // お気に入りリストの並び替え
        new Sortable(favoritesList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            // 並び替えが完了したときの処理
            onEnd: (evt) => {
                // favorites配列の要素をDOMの順序に合わせて並び替える
                const item = favorites.splice(evt.oldIndex, 1)[0];
                favorites.splice(evt.newIndex, 0, item);
                
                // 新しい順序を保存し、データ属性を更新するために再描画
                saveFavorites();
                renderFavorites();
            },
        });
    };

    // ===== 初期化処理 =====
    /**
     * ページ読み込み時に実行する処理をまとめます。
     */
    const initialize = () => {
        fetchWeather();     // 天気情報を取得
        renderFavorites();  // お気に入りリストを表示
        initSortable();     // ドラッグ＆ドロップを有効化

        // カードの表示アニメーションに遅延を設定
        document.querySelectorAll('.grid > .card').forEach((card, index) => {
            card.style.setProperty('--i', index);
        });
    };

    // スクリプトの実行を開始
    initialize();
});