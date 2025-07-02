document.addEventListener("DOMContentLoaded", () => {
  const quickArea = document.getElementById("quick-area");

  // 初期ロード：お気に入り表示
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  favorites.forEach(link => {
    addQuickLink(link.text, link.href);
  });

  // 全リンクに★ボタンを追加
  document.querySelectorAll("section ul li a").forEach(link => {
    const starBtn = document.createElement("button");
    starBtn.textContent = "★";
    starBtn.className = "favorite-btn";
    starBtn.title = "お気に入りに追加";
    starBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const linkText = link.textContent;
      const linkHref = link.href;

      // すでに登録されていないか確認
      const alreadyExists = favorites.some(item => item.href === linkHref);
      if (!alreadyExists) {
        favorites.push({ text: linkText, href: linkHref });
        localStorage.setItem("favorites", JSON.stringify(favorites));
        addQuickLink(linkText, linkHref);
      }
    });
    link.parentNode.appendChild(starBtn);
  });

  // Quickリンクを表示
  function addQuickLink(text, href) {
    const container = document.createElement("div");
    container.className = "quick-item";
    container.draggable = true;

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.textContent = text;

    const delBtn = document.createElement("button");
    delBtn.textContent = "✖";
    delBtn.className = "delete-btn";
    delBtn.title = "お気に入りから削除";
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      container.remove();
      const updated = favorites.filter(fav => fav.href !== href);
      localStorage.setItem("favorites", JSON.stringify(updated));
    });

    container.appendChild(a);
    container.appendChild(delBtn);
    quickArea.appendChild(container);

    // 並び替え用ドラッグ処理
    container.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", text);
      container.classList.add("dragging");
    });

    container.addEventListener("dragend", () => {
      container.classList.remove("dragging");
      updateQuickAreaOrder();
    });
  }

  // Quickエリアに並び替えの受け入れ設定
  quickArea.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(quickArea, e.clientY);
    if (afterElement == null) {
      quickArea.appendChild(dragging);
    } else {
      quickArea.insertBefore(dragging, afterElement);
    }
  });

  // 並び替え後、ローカルストレージに保存
  function updateQuickAreaOrder() {
    const items = quickArea.querySelectorAll(".quick-item");
    const newOrder = [];
    items.forEach(item => {
      const a = item.querySelector("a");
      newOrder.push({ text: a.textContent, href: a.href });
    });
    localStorage.setItem("favorites", JSON.stringify(newOrder));
  }

  // ドラッグ位置判定
  function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll(".quick-item:not(.dragging)")];
    return elements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
});
