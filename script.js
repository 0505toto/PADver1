// DOMが読み込まれたら処理を開始
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の取得 ---
    const containers = document.querySelectorAll('.card-grid, .card-grid-small');
    const favoriteModal = document.getElementById('favorite-modal');
    const addFavoriteBtn = document.getElementById('add-favorite-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const favoriteForm = document.getElementById('favorite-form');
    const favoritesList = document.getElementById('favorites-list');

    // --- ドラッグ＆ドロップ機能 ---
    let draggingItem = null; // ドラッグ中の要素を保持する変数

    // すべてのコンテナ（カードが入っているエリア）を対象にする
    containers.forEach(container => {
        // ドラッグが開始された時の処理
        container.addEventListener('dragstart', (e) => {
            // aタグやdivタグなど、カードの要素のみを対象にする
            if (e.target.classList.contains('card')) {
                draggingItem = e.target;
                // ドラッグ中の要素にスタイルを適用（半透明にするなど）
                setTimeout(() => e.target.classList.add('dragging'), 0);
            }
        });

        // ドラッグが終わった時の処理
        container.addEventListener('dragend', (e) => {
            if (draggingItem) {
                // スタイルを元に戻す
                draggingItem.classList.remove('dragging');
                draggingItem = null;
                // お気に入りの順番が変わった可能性があるので保存する
                saveFavorites();
            }
        });

        // ドラッグ中の要素が他の要素の上に来た時の処理
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // デフォルトの動作をキャンセルしてドロップを許可
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement == null) {
                container.appendChild(draggingItem);
            } else {
                container.insertBefore(draggingItem, afterElement);
            }
        });
    });

    /**
     * マウスカーソルのY座標に基づいて、ドラッグ中の要素をどこに挿入すべきかを判断する関数
     * @param {HTMLElement} container - カードのコンテナ要素
     * @param {number} y - マウスのY座標
     * @returns {HTMLElement} - 挿入位置の基準となる要素
     */
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

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


    // --- お気に入り機能 ---

    // 1. モーダルの表示・非表示
    addFavoriteBtn.addEventListener('click', () => favoriteModal.style.display = 'block');
    closeModalBtn.addEventListener('click', () => favoriteModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === favoriteModal) {
            favoriteModal.style.display = 'none';
        }
    });

    // 2. お気に入りの追加処理
    favoriteForm.addEventListener('submit', (e) => {
        e.preventDefault(); // フォームのデフォルト送信をキャンセル
        const name = document.getElementById('favorite-name').value;
        const url = document.getElementById('favorite-url').value;

        addFavorite(name, url); // 新しいお気に入りを追加

        favoriteForm.reset(); // フォームをリセット
        favoriteModal.style.display = 'none'; // モーダルを閉じる
    });

    /**
     * 新しいお気に入りデータを現在のリストに追加して保存する
     * @param {string} name - サイト名
     * @param {string} url - サイトURL
     */
    function addFavorite(name, url) {
        const favorites = getFavoritesFromDOM();
        favorites.push({ name, url });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites(); // 再描画
    }

    // 3. お気に入りの削除処理 (イベント委任)
    favoritesList.addEventListener('click', (e) => {
        // クリックされたのが削除ボタンの場合のみ処理
        if (e.target.classList.contains('delete-btn')) {
            e.preventDefault(); // aタグのリンク遷移を防止
            e.stopPropagation(); // 親要素へのイベント伝播を停止

            // 削除ボタンの親要素であるカードを削除
            const cardToRemove = e.target.closest('.card');
            cardToRemove.remove();
            
            saveFavorites(); // 変更を保存
        }
    });

    // 4. お気に入りの永続化 (LocalStorage)
    
    /**
     * 現在のお気に入りリストの状態（DOM）をLocalStorageに保存する
     */
    function saveFavorites() {
        const favorites = getFavoritesFromDOM();
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    /**
     * DOMから現在のお気に入り情報を読み取って配列で返す
     * @returns {Array<Object>}
     */
    function getFavoritesFromDOM() {
        const favoriteCards = favoritesList.querySelectorAll('.card');
        const favorites = [];
        favoriteCards.forEach(card => {
            const link = card; // card自体がaタグ
            const name = card.querySelector('h4').textContent;
            favorites.push({ name, url: link.href });
        });
        return favorites;
    }

    /**
     * LocalStorageからお気に入りを読み込み、画面に描画する
     */
    function renderFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
        favoritesList.innerHTML = ''; // 一旦リストを空にする

        favorites.forEach(fav => {
            const card = createFavoriteCard(fav.name, fav.url);
            favoritesList.appendChild(card);
        });
    }

    /**
     * お気に入りカードのHTML要素を生成する
     * @param {string} name - サイト名
     * @param {string} url - サイトURL
     * @returns {HTMLElement} - 生成されたカード要素
     */
    function createFavoriteCard(name, url) {
        // aタグとしてカードを作成
        const card = document.createElement('a');
        card.href = url;
        card.className = 'card';
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.draggable = true; // ドラッグ可能にする

        // カードの中身
        card.innerHTML = `
            <i class="fa-solid fa-star card-icon-small"></i>
            <h4>${name}</h4>
            <button class="delete-btn" title="お気に入りから削除">×</button>
        `;
        return card;
    }


    // --- 初期化処理 ---
    // ページ読み込み時にLocalStorageからお気に入りを復元
    renderFavorites();

});
