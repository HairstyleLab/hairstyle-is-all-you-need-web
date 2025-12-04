document.addEventListener("DOMContentLoaded", async () => {

    const hairdoBtn = document.getElementById("hairdoBtn");
    const pictorialBook = document.getElementById("pictorial-book");
    const sidebarLogged = document.getElementById("sidebarLogged");

    const initialBtns = document.querySelectorAll(".initial-filter span");
    const categorySelect = document.getElementById("categorySelect");
    const genderSelect = document.getElementById("genderSelect");

    const listBox = document.getElementById("pictorialList");
    const imagesBox = document.getElementById("pictorialImages");
    const searchInput = document.getElementById("pictorialSearch");

    let HAIR_DATA = {};
    let currentList = [];  // 현재 초성 기준에서 선택된 리스트 저장

    // 헤어도감 패널 열기 / 닫기
    hairdoBtn.addEventListener("click", () => {

        if (sidebarLogged.classList.contains("expanded")) {
            sidebarLogged.classList.remove("expanded");
            document.body.classList.remove("sidebar-expanded");
        }

        const isOpen = pictorialBook.classList.toggle("open");

        if (isOpen) {
            document.body.classList.add("pictorial-open");
        } else {
            document.body.classList.remove("pictorial-open");
        }
    });

    async function loadHairData() {
        const gender = genderSelect.value;
        const category = categorySelect.value;

        const res = await fetch(`/main/get-hair-list/?gender=${gender}&category=${category}`);
        HAIR_DATA = await res.json();
    }

    await loadHairData();

    // 한글 초성 추출 함수
    function getInitial(name) {
        const char = name.charAt(0);
        const code = char.charCodeAt(0) - 44032;
        if (code < 0 || code > 11171) return null;

        const initials = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
        return initials[Math.floor(code / 588)];
    }

    // 현재 카테고리 + 성별 기준 전체 이름 배열 가져오기
    function getAllNamesByCategory() {
        let all = [];
        Object.values(HAIR_DATA).forEach(arr => {
            all = all.concat(arr);
        });
        return all;
    }

    // 리스트 렌더링 함수 (초성 기준)
    function renderList(initial) {
        let names = HAIR_DATA[initial] || [];  // 초성 키로 직접 접근

        currentList = names;
        listBox.innerHTML = "";
        imagesBox.innerHTML = "";

        names.forEach(name => {
            const item = document.createElement("div");
            item.className = "pt-item";
            item.textContent = name;

            item.addEventListener("click", async () => {
                const images = await fetchImages(name, genderSelect.value, categorySelect.value);
                renderImages(images);
            });

            listBox.appendChild(item);
        });
    }



    // 검색 결과 렌더링 (전체 검색 + 자동 초성 이동)
    function renderFilteredList() {

        const keyword = searchInput.value.trim().toLowerCase();
        listBox.innerHTML = "";
        imagesBox.innerHTML = "";

        // 검색 리스트 구성
        let baseList = keyword.length > 0
            ? getAllNamesByCategory()
            : currentList;

        const filtered = baseList.filter(name =>
            name.toLowerCase().includes(keyword)
        );

        // 검색어 있을 때 = 초성 강조만 하고 renderList() 실행 금지!!
        if (keyword.length > 0 && filtered.length > 0) {
            const initial = getInitial(filtered[0]);

            if (initial) {
                initialBtns.forEach(btn => btn.classList.remove("active"));
                const target = document.querySelector(`.initial-filter span[data-initial="${initial}"]`);
                if (target) target.classList.add("active");
            }
        }

        // 리스트는 filtered만 렌더링
        filtered.forEach(name => {
            const item = document.createElement("div");
            item.className = "pt-item";
            item.textContent = name;

            item.addEventListener("click", async () => {
                const images = await fetchImages(name, genderSelect.value, categorySelect.value);
                renderImages(images);
            });

            listBox.appendChild(item);
        });
    }

    // 서버에서 이미지 목록 가져오기
    async function fetchImages(name, gender, category) {
        const res = await fetch(
            `/main/get-hair-images/?gender=${gender}&category=${category}&name=${encodeURIComponent(name)}`
        );
        return (await res.json()).images;
    }


    // 이미지 렌더링 (2열 그리드)
    function renderImages(images) {
        imagesBox.innerHTML = "";

        images.forEach(img => {
            const card = document.createElement("div");
            card.className = "pt-card";
            card.innerHTML = `<img src="${img.url}" alt="">`;
            imagesBox.appendChild(card);
        });
    }


    // 초성 클릭
    initialBtns.forEach(btn => {
        btn.addEventListener("click", () => {

            initialBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            renderList(btn.dataset.initial);
            searchInput.value = "";  // 검색창 초기화
        });
    });

    categorySelect.addEventListener("change", async () => {
        await loadHairData();
        const active = document.querySelector(".initial-filter .active");
        if (active) renderList(active.dataset.initial);
    });

    genderSelect.addEventListener("change", async () => {
        await loadHairData();
        const active = document.querySelector(".initial-filter .active");
        if (active) renderList(active.dataset.initial);
    });

    // 검색 입력 이벤트
    searchInput.addEventListener("input", () => {
        renderFilteredList();
    });

});
