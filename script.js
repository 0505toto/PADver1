// DOMが完全に読み込まれたら、スクリプトを実行する
document.addEventListener('DOMContentLoaded', () => {

    // --- 天気予報ウィジェット ---
    const fetchWeather = async () => {
        // 大阪の緯度経度
        const lat = 34.6937;
        const lon = 135.5023;
        // Open-Meteo API (APIキー不要)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('天気情報の取得に失敗しました。');
            }
            const data = await response.json();
            
            const weatherStatusEl = document.getElementById('weather-status');
            const weatherTempEl = document.getElementById('weather-temp');

            // 気温と天気コードを取得
            const temp = data.current_weather.temperature;
            const weatherCode = data.current_weather.weathercode;

            // 天気情報を画面に表示
            weatherTempEl.textContent = temp;
            weatherStatusEl.textContent = getWeatherDescription(weatherCode);

        } catch (error) {
            console.error(error);
            document.getElementById('weather-widget').textContent = '天気情報 取得エラー';
        }
    };

    // 天気コードを日本語のテキストに変換する関数
    const getWeatherDescription = (code) => {
        const descriptions = {
            0: '快晴', 1: '晴れ', 2: '一部曇', 3: '曇り',
            45: '霧', 48: '霧氷',
            51: '霧雨', 53: '霧雨', 55: '霧雨',
            56: '着氷性の霧雨', 57: '着氷性の霧雨',
            61: '雨', 63: '雨', 65: '大雨',
            66: '着氷性の雨', 67: '着氷性の雨',
            71: '雪', 73: '雪', 75: '大雪',
            77: '雪粒',
            80: 'にわか雨', 81: 'にわか雨', 82: '激しいにわか雨',
            85: 'にわか雪', 86: '激しいにわか雪',
            95: '雷雨', 96: '雷雨と雹', 99: '雷雨と激しい雹'
        };
        return descriptions[code] || '不明';
    };

    // --- ドラッグ＆ドロップ機能 ---
    const draggableCards = document.querySelectorAll('.link-card[draggable="true"]');
    const favoritesContainer = document.getElementById('favorites-container');

    // ドラッグ開始時の処理
    draggableCards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            // ドラッグするデータのIDをセット
            e.dataTransfer.setData('text/plain', card.dataset.id);
            // ドラッグ中の見た目を少し透過させる
            setTimeout(() => card.style.opacity = '0.5', 0);
        });

        // ドラッグ終了時の処理（元の場所に戻った場合など）
        card.addEventListener('dragend', () => {
            card.style.opacity = '1'; // 透明度を元に戻す
        });
    });

    // ドロップ先のコンテナの処理
    favoritesContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // デフォルトの動作をキャンセルしてドロップを許可
        favoritesContainer.classList.add('drag-over'); // ドラッグ中であることがわかるようにクラスを追加
    });

    favoritesContainer.addEventListener('dragleave', () => {
        favoritesContainer.classList.remove('drag-over'); // クラスを削除
    });

    favoritesContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        favoritesContainer.classList.remove('drag-over');
        
        const id = e.dataTransfer.getData('text/plain');
        const originalCard = document.querySelector(`.link-card[data-id="${id}"]`);

        // すでにお気に入りに追加されていないかチェック
        if (originalCard && !favoritesContainer.querySelector(`[data-id="${id}"]`)) {
            addCardToFavorites(originalCard);
            saveFavorites();
        }
    });

    // お気に入りにカードを追加する関数
    const addCardToFavorites = (originalCard) => {
        // プレースホルダーを削除
        const placeholder = favoritesContainer.querySelector('.placeholder');
        if (placeholder) {
            placeholder.remove();
        }

        // カードを複製して追加
        const clone = originalCard.cloneNode(true);
        clone.style.opacity = '1'; // 透明度をリセット
        clone.setAttribute('draggable', 'true'); // お気に入り内でもドラッグ可能に

        // 削除ボタンを作成して追加
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.className = 'remove-fav-btn';
        removeBtn.onclick = (e) => {
            e.stopPropagation(); // 親要素へのイベント伝播を停止
            clone.remove();
            saveFavorites();
            // お気に入りが空になったらプレースホルダーを再表示
            if (favoritesContainer.children.length === 0) {
                favoritesContainer.innerHTML = '<div class="placeholder">よく使う項目を<br>ここにドラッグ</div>';
            }
        };
        clone.appendChild(removeBtn);
        
        // お気に入り内での並び替えのためのイベントリスナーを追加
        addSortableEvents(clone);

        favoritesContainer.appendChild(clone);
    };
    
    // お気に入り内での並び替え機能
    const addSortableEvents = (card) => {
        card.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.dataset.id);
        });

        card.addEventListener('dragend', (e) => {
            e.stopPropagation();
            card.classList.remove('dragging');
            saveFavorites(); // 並び替え後に保存
        });
    };

    favoritesContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingCard = document.querySelector('.dragging');
        if (!draggingCard) return;

        const afterElement = getDragAfterElement(favoritesContainer, e.clientY);
        if (afterElement == null) {
            favoritesContainer.appendChild(draggingCard);
        } else {
            favoritesContainer.insertBefore(draggingCard, afterElement);
        }
    });

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.link-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };


    // --- ローカルストレージへの保存と読み込み ---
    const saveFavorites = () => {
        const favoriteIds = [];
        favoritesContainer.querySelectorAll('.link-card').forEach(card => {
            favoriteIds.push(card.dataset.id);
        });
        localStorage.setItem('accountingPortalFavorites', JSON.stringify(favoriteIds));
    };

    const loadFavorites = () => {
        const favoriteIds = JSON.parse(localStorage.getItem('accountingPortalFavorites'));
        if (favoriteIds && favoriteIds.length > 0) {
            favoriteIds.forEach(id => {
                const originalCard = document.querySelector(`.link-card[data-id="${id}"]`);
                if (originalCard) {
                    addCardToFavorites(originalCard);
                }
            });
        }
    };
    
    // 削除ボタンのスタイルを追加
    const style = document.createElement('style');
    style.innerHTML = `
        .remove-fav-btn {
            position: absolute;
            top: 5px;
            right: 8px;
            width: 24px;
            height: 24px;
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            line-height: 24px;
            text-align: center;
            opacity: 0;
            transition: all 0.2s;
        }
        .link-card:hover .remove-fav-btn {
            opacity: 1;
        }
        .remove-fav-btn:hover {
            background: var(--accent-color);
        }
        .favorites-list .link-card.dragging {
            opacity: 0.5;
        }
    `;
    document.head.appendChild(style);


    // --- 初期化処理 ---
    fetchWeather(); // 天気情報を取得
    loadFavorites(); // 保存されたお気に入りを読み込む
});
