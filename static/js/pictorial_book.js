document.addEventListener("DOMContentLoaded", () => {
    const hairdoBtn = document.getElementById("hairdoBtn");
    const pictorialBook = document.getElementById("pictorial-book");
    const sidebarLogged = document.getElementById("sidebarLogged");

    hairdoBtn.addEventListener("click", () => {

        /* ✅ 1. 사이드바가 열려있다면 닫기 */
        if (sidebarLogged.classList.contains("expanded")) {
            sidebarLogged.classList.remove("expanded");
            document.body.classList.remove("sidebar-expanded");
        }

        /* ✅ 2. 패널 open 토글 */
        const isOpen = pictorialBook.classList.toggle("open");

        /* ✅ 3. 패널 상태에 따라 body 클래스 조정 */
        if (isOpen) {
            document.body.classList.add("pictorial-open");
        } else {
            document.body.classList.remove("pictorial-open");
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {

    const categorySelect = document.getElementById("categorySelect");
    const genderToggle = document.getElementById("genderToggle");
    const selectedTag = document.getElementById("selectedTag");
    const pictorialGrid = document.getElementById("pictorialGrid");

    let gender = "남성";

    /* 성별 토글 */
    if (genderToggle) {
        genderToggle.addEventListener("click", () => {
            gender = (gender === "남성") ? "여성" : "남성";
            genderToggle.textContent = gender;
            loadPictorial();
        });
    }

    /* 카테고리 변경 */
    if (categorySelect) {
        categorySelect.addEventListener("change", () => {
            selectedTag.textContent = categorySelect.options[categorySelect.selectedIndex].text + " ▼";
            loadPictorial();
        });
    }

    /* 예시 데이터 */
    const sampleItems = [
        { name: "가일컷", img: "/static/images/sample1.jpg", gender: "남성", type: "cut" },
        { name: "에드가컷", img: "/static/images/sample2.jpg", gender: "남성", type: "cut" },
    ];

    /* 로딩 함수 */
    function loadPictorial() {
        const category = categorySelect.value;

        const filtered = sampleItems.filter(
            x => x.gender === gender && x.type === category
        );

        pictorialGrid.innerHTML = filtered.map(item => `
            <div class="pt-card">
                <img src="${item.img}">
                <div class="pt-card-name">${item.name}</div>
            </div>
        `).join("");
    }

    loadPictorial();
});
