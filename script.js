/**
 * 経理ポータルサイト用 JavaScript
 *
 * 機能:
 * 1. 大阪の天気予報を非同期で取得・表示
 * 2. ドラッグ＆ドロップによるお気に入り機能
 * 3. localStorageを使用したお気に入りの永続化
 * 4. ページ読み込み時のアニメーション効果
 */

// DOMが完全に読み込まれたら処理を開始
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 天気予報ウィジェット ---
    const fetchWeather = async () => {
        const weatherInfo = document.getElementById('weather-info');
        // wttr.in のJSON APIを使用して大阪の天気を取得
        const apiUrl = 'https://wttr.in/Osaka?format=j1';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 現在の天候情報を取得
            const currentCondition = data.current_condition[0];
            const weatherDesc = currentCondition.weatherDesc[0].value;
            const tempC = currentCondition.temp_C;
            const feelsLikeC = currentCondition.FeelsLikeC;

            // HTMLに天気情報を表示
            weatherInfo.innerHTML = `${weatherDesc}, ${tempC}°C (体感 ${feelsLikeC}°C)`;
            weatherInfo.parentElement.classList.add('loaded'); // 読み込み完了クラスを追加

        } catch (error) {
            console.error("天気情報の取得に失敗しました:", error);
            weatherInfo.textContent = '取得失敗';
            weatherInfo.parentElement.classList.add('error'); // エラークラスを追加
        }
    };


    // --- 2. お気に入り機能 (ドラッグ＆ドロップ) ---
    const draggableItems = document.querySelectorAll('.link-item[draggable="true"]');
    const favoritesContainer = document.getElementById('favorites-container');
    const clearFavoritesBtn = document.getElementById('clear-favorites');
    const favoritesGuide = document.querySelector('.favorites-guide');

    // localStorageに保存するためのキー
    const FAVORITES_KEY = 'keiriPortalFavorites';

    // お気に入りIDの配列を取得 (localStorageから)
    const getFavoriteIds = () => {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    };

    // お気に入りIDの配列を保存 (localStorageへ)
    const saveFavoriteIds = (ids) => {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    };

    // お気に入りアイテムをUIに追加する関数
    const addFavoriteToUI = (id) => {
        const originalItem = document.querySelector(`.link-item[data-link-id="${id}"]`);
        if (!originalItem) return;

        // 複製を作成
        const clone = originalItem.cloneNode(true);
        clone.classList.add('favorite-item'); // お気に入り用のクラスを追加
        clone.removeAttribute('draggable'); // お気に入り内ではドラッグ不可に

        // 削除ボタンを追加
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.className = 'remove-favorite-btn';
        removeBtn.onclick = () => {
            // UIから削除
            clone.classList.add('removing');
            clone.addEventListener('transitionend', () => {
                clone.remove();
                 // ガイド表示の更新
                if (favoritesContainer.children.length <= 1) { // 1はガイド自身
                    favoritesGuide.style.display = 'block';
                }
            });

            // localStorageから削除
            let ids = getFavoriteIds();
            ids = ids.filter(favId => favId !== id);
            saveFavoriteIds(ids);
        };
        clone.appendChild(removeBtn);

        favoritesContainer.appendChild(clone);
        // ガイドを非表示に
        if(favoritesGuide) favoritesGuide.style.display = 'none';
    };

    // ページ読み込み時にお気に入りを復元
    const loadFavorites = () => {
        const favoriteIds = getFavoriteIds();
        if (favoriteIds.length > 0) {
            favoriteIds.forEach(id => addFavoriteToUI(id));
        }
    };

    // ドラッグ開始時の処理
    draggableItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', item.dataset.linkId);
            setTimeout(() => {
                item.classList.add('dragging');
            }, 0);
        });

        // ドラッグ終了時の処理
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    });

    // ドロップゾーンの処理
    favoritesContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // ドロップを許可
        favoritesContainer.classList.add('drag-over');
    });

    favoritesContainer.addEventListener('dragleave', () => {
        favoritesContainer.classList.remove('drag-over');
    });

    favoritesContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        favoritesContainer.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');

        let favoriteIds = getFavoriteIds();
        // すでにお気に入りになければ追加
        if (id && !favoriteIds.includes(id)) {
            addFavoriteToUI(id);
            favoriteIds.push(id);
            saveFavoriteIds(favoriteIds);
        }
    });

    // お気に入りリセットボタンの処理
    clearFavoritesBtn.addEventListener('click', () => {
        // 確認ダイアログの代わりにカスタムUIを使うのが望ましいが、ここではconfirmを使用
        if (confirm('お気に入りをすべてリセットしますか？')) {
            localStorage.removeItem(FAVORITES_KEY);
            // アニメーション付きで要素を削除
            const favoriteItems = favoritesContainer.querySelectorAll('.favorite-item');
            favoriteItems.forEach(item => {
                item.classList.add('removing');
                item.addEventListener('transitionend', () => item.remove());
            });
             // ガイドを再表示
            if(favoritesGuide) favoritesGuide.style.display = 'block';
        }
    });


    // --- 3. ページ読み込み時のアニメーション ---
    const initAnimations = () => {
        const sections = document.querySelectorAll('.link-section');
        const header = document.querySelector('.site-header');
        const quickLinks = document.querySelector('.quick-links');

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        if(header) header.classList.add('visible');
        if(quickLinks) quickLinks.classList.add('visible');
        sections.forEach(section => {
            observer.observe(section);
        });
    };


    // --- 初期化処理の呼び出し ---
    fetchWeather();
    loadFavorites();
    initAnimations();

});
