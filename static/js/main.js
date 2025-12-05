// 로그인 상태
let isLoggedIn = false;
let currentUser = null;
let isWaitingForResponse = false; // 챗봇 응답 대기 중 상태
let currentChatId = null; // 현재 채팅 ID
let chatHistory = []; // 채팅 기록 목록

const sidebar = document.getElementById('sidebar');
const sidebarLogged = document.getElementById('sidebarLogged');
const mainContainer = document.getElementById('mainContainer');
const header = document.getElementById('header');

const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const logoutBtn = document.getElementById('logoutBtn');
const logoutSidebarBtn = document.getElementById('logoutSidebarBtn');
const logoutModal = document.getElementById('logoutModal');
const logoutCancelBtn = document.getElementById('logoutCancelBtn');
const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmBtn = document.getElementById('confirmBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const profileEditModal = document.getElementById('profileEditModal');
const formData = new FormData();

// 페이지 로드 시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', async function() {
    await checkLoginStatus();
    initSidebarEvents();
    initTextareaAutoResize();
    const urlParams = new URLSearchParams(window.location.search);
    const chatIdToLoad = urlParams.get('chatId');
    const sidebarOpen = urlParams.get('sidebar');

    if (chatIdToLoad) {
        await loadChat(chatIdToLoad);

        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }

    // 사이드바를 열어야 하는 경우 (채팅 로드 후에 실행)
    if (sidebarOpen === 'open' && isLoggedIn) {
        expandSidebar();
        // 사이드바를 연 후 채팅 기록 다시 렌더링하여 active 클래스 표시
        if (currentChatId) {
            renderChatHistory();
        }
    }

    const editIcon = document.getElementById("editProfileImageBtn");
    const fileInput = document.getElementById("profileImgInput");
    const previewImg = document.getElementById("modalProfileImg");

    if (editIcon && fileInput && previewImg) {
        editIcon.addEventListener("click", function () {
            fileInput.click();
        });

        // 이미지 파일 선택 → 즉시 모달 이미지 미리보기 변경 + 버튼 활성화
        fileInput.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                // 파일 확장자 검사
                const fileName = file.name.toLowerCase();
                const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
                const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

                if (!isValidExtension) {
                    // 유효하지 않은 파일 형식
                    const nicknameError = document.getElementById("nicknameError");
                    if (nicknameError) {
                        nicknameError.textContent = "jpg, jpeg, png, gif 형식의 이미지만 업로드할 수 있습니다.";
                        nicknameError.classList.add("show");
                    }
                    fileInput.value = ''; // 파일 입력 초기화
                    return;
                }

                const previewUrl = URL.createObjectURL(file);
                previewImg.src = previewUrl;
                
                // 에러 메시지 숨기고 버튼 활성화
                const nicknameError = document.getElementById("nicknameError");
                const profileSaveBtn = document.getElementById("profileSaveBtn");
                if (nicknameError) {
                    nicknameError.classList.remove("show");
                }
                if (profileSaveBtn) {
                    profileSaveBtn.classList.remove("disabled");
                }
            }
        });
    }

});

// Textarea 자동 높이 조정
function initTextareaAutoResize() {
    const textarea = document.getElementById('messageInput');
    if (textarea) {
        // 입력 이벤트에서 높이 조정
        textarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    }
}

// Textarea 높이 자동 조정 함수
function autoResizeTextarea(textarea) {
    const minHeight = 24; // CSS의 height와 일치
    
    // 높이를 최소값으로 리셋
    textarea.style.height = minHeight + 'px';
    
    // scrollHeight가 minHeight보다 크면 조정
    if (textarea.scrollHeight > minHeight) {
        textarea.style.height = textarea.scrollHeight + 'px';
    }
}

// 서버에서 로그인 상태 확인
async function checkLoginStatus() {
    try {
        const response = await fetch('/uauth/check/');
        const data = await response.json();

        if (data.is_logged_in) {
            isLoggedIn = true;
            currentUser = data.user;
            updateUserProfile();
            // 로그인 상태면 채팅 기록 불러오기
            await loadChatHistory();
        } else {
            isLoggedIn = false;
            currentUser = null;
        }
        updateUIForLoginState();
    } catch (error) {
        isLoggedIn = false;
        updateUIForLoginState();
    }
}

// 사용자 프로필 업데이트
function updateUserProfile() {
    if (!currentUser) return;

    const profileName = document.querySelector('.profile-name');
    const sidebarImg = document.getElementById('profileImg');
    const modalImg = document.getElementById('modalProfileImg');
    const greeting = document.getElementById('greeting');

    // 닉네임 업데이트
    if (profileName) {
        profileName.textContent = currentUser.nickname || '사용자';
    }

    if (sidebarImg && currentUser.profile_image) {
        sidebarImg.src = currentUser.profile_image + "?t=" + new Date().getTime();
    }

    if (modalImg && currentUser.profile_image) {
        modalImg.src = currentUser.profile_image + "?t=" + new Date().getTime();
    }

    // 상단 인사말 업데이트
    if (greeting) {
        greeting.textContent = `안녕하세요, ${currentUser.nickname || '사용자'}님😊`;
        updateProfileImageButtonState();
    }
}


// 로그인 상태에 따른 UI 업데이트
function updateUIForLoginState() {
    if (isLoggedIn) {
        document.body.classList.add('logged-in');
    } else {
        document.body.classList.remove('logged-in');
        document.body.classList.remove('sidebar-expanded');
    }
}

// 사이드바 이벤트 초기화
function initSidebarEvents() {
    // 로고 클릭 시 사이드바 확장 또는 메인 페이지로 이동
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            // 헤어도감이 열려있으면 닫고 사이드바 열기
            const pictorialBook = document.getElementById('pictorial-book');
            if (pictorialBook && pictorialBook.classList.contains('open')) {
                pictorialBook.classList.remove('open');
                document.body.classList.remove('pictorial-open');

                // transition 끝난 후 사이드바 열기
                setTimeout(() => {
                    if (!sidebarLogged.classList.contains('expanded')) {
                        toggleSidebar();
                    }
                }, 300);
                return;
            }

            if (sidebarLogged.classList.contains('expanded')) {
                location.href = '/main/';
            }
            toggleSidebar();
        });
    }

    // 닫기 버튼 클릭 시 사이드바 축소
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', function() {
            collapseSidebar();
        });
    }

    // 프로필 이미지 클릭 시 사이드바 토글
    const profileImg = document.getElementById('profileImg');
    if (profileImg) {
        profileImg.addEventListener('click', function() {
            toggleSidebar();
        });
        // 클릭 가능하도록 스타일 추가
        profileImg.style.cursor = 'pointer';
    }

    // 채팅기록 아이콘 클릭 시 사이드바 열기 (닫힌 상태에서만)
    const chatHistoryBtn = document.getElementById('chatHistoryBtn');
    if (chatHistoryBtn) {
        chatHistoryBtn.addEventListener('click', function() {
            if (!sidebarLogged.classList.contains('expanded')) {
                chatHistoryBtn.disabled=true;
                chatHistoryBtn.style.cursor = 'default';
                toggleSidebar();
            }
        });
        // disabled 속성 제거하고 스타일 업데이트
        chatHistoryBtn.disabled = false;
        chatHistoryBtn.style.cursor = 'pointer';
    }

    // 설정 버튼 클릭 시 설정 모달 토글
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            settingsModal.classList.toggle('show');
        });
    }

    // 로그아웃 버튼 클릭 시 로그아웃 모달 표시
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            settingsModal.classList.remove('show');
            logoutModal.classList.add('show');
        });
    }

    // 사이드바 로그아웃 버튼 클릭 시 로그아웃 모달 표시
    if (logoutSidebarBtn) {
        logoutSidebarBtn.addEventListener('click', function() {
            logoutModal.classList.add('show');
        });
    }

    // 로그아웃 취소 버튼
    if (logoutCancelBtn) {
        logoutCancelBtn.addEventListener('click', function() {
            logoutModal.classList.remove('show');
        });
    }

    // 로그아웃 확인 버튼
    if (logoutConfirmBtn) {
        logoutConfirmBtn.addEventListener('click', function() {
            handleLogout();
        });
    }

    // 설정 모달 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (settingsModal && !settingsModal.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsModal.classList.remove('show');
        }
    });

    // 새 채팅 버튼
    const newChatBtn = document.getElementById('newChatBtn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            location.href = '/main/';
        });
    }

    if (editProfileBtn && profileEditModal) {
        editProfileBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            settingsModal.classList.remove('show');
            
            // 모달 열기 전에 currentUser 정보로 폼 채우기
            if (currentUser) {
                // 이메일 표시
                const emailText = document.querySelector('.profile-edit-email-text');
                if (emailText) {
                    emailText.textContent = currentUser.email || '';
                }
                // 닉네임 입력란
                const nicknameInput = document.getElementById('nicknameInput');
                if (nicknameInput) {
                    nicknameInput.value = currentUser.nickname || '';
                }
                // 프로필 이미지
                const modalImg = document.getElementById('modalProfileImg');
                if (modalImg) {
                    if (currentUser.profile_image) {
                        modalImg.src = currentUser.profile_image + "?t=" + new Date().getTime();
                    } else {
                        modalImg.src = '/static/images/default_profile.png';
                    }
                }
            }
            
            profileEditModal.classList.add('show');
        });
    }

    // 프로필 편집 모달 닫기
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal')) {
            const targetId = e.target.dataset.target;
            const modal = document.getElementById(targetId);
            if (modal) {
                modal.classList.remove('show');
                // 프로필 편집 모달이면 폼 초기화
                if (targetId === 'profileEditModal') {
                    resetProfileEditForm();
                }
            }
        }
    });
    
    // 갤러리 버튼
    const galleryBtn = document.getElementById('galleryBtn');
    if (galleryBtn) {
        galleryBtn.addEventListener('click', () => location.href = '/main/gallery/');
    }

}

// 사이드바 확장/축소 토글
function toggleSidebar() {
    if (sidebarLogged.classList.contains('expanded')) {
        collapseSidebar();
    } else {
        expandSidebar();
    }
}

// 사이드바 확장
function expandSidebar() {
    const pictorialBook = document.getElementById('pictorial-book');

    // 헤어도감이 열려있으면 먼저 닫기
    if (pictorialBook && pictorialBook.classList.contains('open')) {
        pictorialBook.classList.remove('open');
        document.body.classList.remove('pictorial-open');

        // transition 끝난 후 사이드바 열기
        setTimeout(() => {
            openSidebarAfterPictorial();
        }, 300); // 0.3s transition time
    } else {
        openSidebarAfterPictorial();
    }
}

function openSidebarAfterPictorial() {
    sidebarLogged.classList.add('expanded');
    document.body.classList.add('sidebar-expanded');

    // 로고 이미지 변경
    const logoImg = document.getElementById('sidebarLogoImg');
    if (logoImg) {
        logoImg.src = '/static/images/logo.png';
        logoImg.style.width = 'auto';
        logoImg.style.height = '110px';
    }
}

// 사이드바 축소
function collapseSidebar() {
    sidebarLogged.classList.remove('expanded');
    document.body.classList.remove('sidebar-expanded');
    settingsModal.classList.remove('show');

    // 로고 이미지 변경
    const logoImg = document.getElementById('sidebarLogoImg');
    if (logoImg) {
        logoImg.src = '/static/images/small_logo.png';
        logoImg.style.width = 'auto';
        logoImg.style.height = '110px';
    }
}

// 로그아웃 처리
async function handleLogout() {
    try {
        const response = await fetch('/uauth/logout/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.success) {
            isLoggedIn = false;
            currentUser = null;
            currentChatId = null;
            logoutModal.classList.remove('show');

            // 채팅 상태 초기화
            const chatMessages = document.getElementById('chatMessages');
            const greeting = document.getElementById('greeting');
            const content = document.querySelector('.content');

            if (chatMessages) {
                chatMessages.innerHTML = '';
                chatMessages.classList.remove('active');
            }
            if (content) {
                content.classList.remove('chat-started');
            }
            if (greeting) {
                greeting.textContent = `안녕하세요`;
                greeting.classList.remove('hidden');
                greeting.style.display = '';
            }

            // 헤어도감 패널 닫기
            document.body.classList.remove('pictorial-open');

            updateUIForLoginState();
            collapseSidebar();

            // 확인 모달 표시
            showConfirmModal('로그아웃 되었습니다.');

            // 갤러리 페이지에서 로그아웃하는 경우 모달 닫힌 후 메인으로 이동
            if (window.location.pathname.includes('/gallery')) {
                const confirmBtn = document.getElementById('confirmBtn');
                if (confirmBtn) {
                    const handleRedirect = function() {
                        window.location.href = '/main/';
                        confirmBtn.removeEventListener('click', handleRedirect);
                    };
                    confirmBtn.addEventListener('click', handleRedirect);
                }
            }
        }
    } catch (error) {
        // 서버 연결 실패 시에도 로컬에서 로그아웃 처리
        isLoggedIn = false;
        currentUser = null;
        currentChatId = null;
        logoutModal.classList.remove('show');

        // 채팅 상태 초기화
        const chatMessages = document.getElementById('chatMessages');
        const greeting = document.getElementById('greeting');
        const content = document.querySelector('.content');

        if (chatMessages) {
            chatMessages.innerHTML = '';
            chatMessages.classList.remove('active');
        }
        if (content) {
            content.classList.remove('chat-started');
        }
        if (greeting) {
            greeting.textContent = `안녕하세요`;
            greeting.classList.remove('hidden');
            greeting.style.display = '';
        }

        // 헤어도감 패널 닫기
        document.body.classList.remove('pictorial-open');

        updateUIForLoginState();
        collapseSidebar();

        // 확인 모달 표시
        showConfirmModal('로그아웃 되었습니다.');

        // 갤러리 페이지에서 로그아웃하는 경우 모달 닫힌 후 메인으로 이동
        if (window.location.pathname.includes('/gallery')) {
            const confirmBtn = document.getElementById('confirmBtn');
            if (confirmBtn) {
                const handleRedirect = function() {
                    window.location.href = '/main/';
                    confirmBtn.removeEventListener('click', handleRedirect);
                };
                confirmBtn.addEventListener('click', handleRedirect);
            }
        }
    }
}

// 입력 필드 감지 및 전송 버튼 활성화/비활성화
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

if (messageInput && sendBtn) {
    messageInput.addEventListener('input', function() {
        updateSendBtnState();
    });

    // 전송 버튼 클릭 이벤트
    sendBtn.addEventListener('click', function() {
        if (this.disabled) return;

        if (!isLoggedIn) {
            // 로그인되지 않았으면 로그인 모달 표시
            toggleModal();
        } else {
            // 로그인되어 있으면 메시지 전송
            sendMessage();
        }
    });

    // Enter 키로 전송 (Shift+Enter는 줄바꿈)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
            e.preventDefault();
            sendBtn.click();
        }
    });
}

// CSRF 토큰 가져오기
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 모달 토글
function toggleModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.toggle('active');
    if (modal.classList.contains('active')) {
        document.getElementById('email').focus();
    }
}

// 오버레이 클릭 시 모달 닫기
function closeModalOnOverlay(event) {
    if (event.target.id === 'loginModal') {
        toggleModal();
    }
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('loginModal');
        if (modal.classList.contains('active')) {
            toggleModal();
        }
    }
});

// 이메일 input과 비밀번호 input 하나라도 있으면 active 상태로 변경
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('submitBtn');

function checkInputs() {
    if (emailInput && passwordInput && loginBtn) {
        if (emailInput.value.trim().length > 0 || passwordInput.value.trim().length > 0) {
            loginBtn.disabled = false;
            loginBtn.classList.add('active');
        } else {
            loginBtn.disabled = true;
            loginBtn.classList.remove('active');
        }
    }
}

if (emailInput) emailInput.addEventListener('input', checkInputs);
if (passwordInput) passwordInput.addEventListener('input', checkInputs);

// 로그인 처리
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorMessage = document.getElementById('errorMessage');
    
    submitBtn.disabled = true;
    submitBtn.textContent = '로그인 중...';
    errorMessage.classList.remove('show');
    
    try {
        const response = await fetch('/uauth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            isLoggedIn = true;
            currentUser = data.user;
            toggleModal();
            updateUserProfile();
            updateUIForLoginState();
            // 로그인 성공 시 채팅 기록 불러오기
            await loadChatHistory();
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
        } else {
            errorMessage.textContent = data.message || '이메일이나 비밀번호가 틀렸습니다.';
            errorMessage.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
        }
    } catch (error) {
        console.error('Login error:', error);
        // 테스트용: 서버 연결 실패 시 테스트 계정으로 로그인 허용
        errorMessage.textContent = '로그인 처리 중 오류가 발생했습니다.';
        errorMessage.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = '로그인';
    }
}

// 확인 모달 표시 함수
function showConfirmModal(message) {
    const confirmMessage = document.getElementById('confirmMessage');
    if (confirmMessage) {
        confirmMessage.textContent = message;
    }
    if (confirmModal) {
        confirmModal.classList.add('show');
    }
}

// 확인 버튼 클릭 이벤트
if (confirmBtn) {
    confirmBtn.addEventListener('click', function() {
        if (confirmModal) {
            confirmModal.classList.remove('show');
        }
    });
}

// 프로필 수정 저장 버튼
const profileSaveBtn = document.getElementById("profileSaveBtn");
const nicknameInput = document.getElementById("nicknameInput");
const profileImgInput = document.getElementById("profileImgInput");
const nicknameError = document.getElementById("nicknameError");
const modalProfileImg = document.getElementById("modalProfileImg");

// 프로필 편집 폼 초기화 함수
function resetProfileEditForm() {
    // 닉네임을 원래 값으로 복원
    if (nicknameInput && currentUser) {
        nicknameInput.value = currentUser.nickname || '';
    }
    // 에러 메시지 숨기기
    if (nicknameError) {
        nicknameError.classList.remove("show");
    }
    // 파일 입력 초기화
    if (profileImgInput) {
        profileImgInput.value = '';
    }
    // 프로필 이미지 미리보기를 원래 이미지로 복원
    if (modalProfileImg && currentUser) {
        if (currentUser.profile_image) {
            modalProfileImg.src = currentUser.profile_image + "?t=" + new Date().getTime();
        } else {
            modalProfileImg.src = '/static/images/default_profile.png';
        }
    }
}

// 닉네임 유효성 검사 함수 (한글 또는 영어만, 2~10글자)
function validateNickname(nickname) {
    const koreanOnly = /^[가-힣]{2,10}$/;
    const englishOnly = /^[a-zA-Z]{2,10}$/;
    return koreanOnly.test(nickname) || englishOnly.test(nickname);
}

// "수정" 버튼 클릭 시 API 호출
if (profileSaveBtn) {
    profileSaveBtn.addEventListener("click", () => {
        // 버튼이 비활성화 상태면 무시
        if (profileSaveBtn.classList.contains("disabled")) {
            return;
        }
        
        const nickname = nicknameInput.value.trim();
        const originalNickname = currentUser ? currentUser.nickname : nicknameInput.defaultValue;
        
        // 새 이미지가 선택되었는지 확인
        const hasNewImage = profileImgInput && profileImgInput.files && profileImgInput.files.length > 0;

        // 닉네임도 같고, 새 이미지도 없으면 → 에러
        if (nickname === originalNickname && !hasNewImage) {
            nicknameError.textContent = "변경된 내용이 없습니다.";
            nicknameError.classList.add("show");
            profileSaveBtn.classList.add("disabled");  // 버튼 비활성화
            return;
        }

        // 닉네임이 변경된 경우에만 유효성 검사
        if (nickname !== originalNickname && !validateNickname(nickname)) {
            nicknameError.textContent = "해당 닉네임은 형식에 맞지 않습니다.";
            nicknameError.classList.add("show");
            profileSaveBtn.classList.add("disabled");  // 버튼 비활성화
            return;
        }

        // 유효성 검사 통과하면 에러 메시지 숨김
        nicknameError.classList.remove("show");

        const formData = new FormData();
        formData.append("nickname", nickname);
        if (profileImgInput.files[0]) {
            formData.append("profile_image", profileImgInput.files[0]);
        }

        fetch("/uauth/profile/edit/", {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
            },
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {

                // DB에서 받은 최신 정보로 currentUser 갱신
                currentUser.nickname = data.nickname;
                if (data.profile_image) {
                    currentUser.profile_image = data.profile_image;
                }

                // UI 즉시 갱신 (캐시 방지 포함)
                updateUserProfile();

                // 폼 초기화 (파일 입력 등 리셋)
                resetProfileEditForm();

                profileEditModal.classList.remove("show");
                showConfirmModal("프로필이 수정되었습니다!");
            } else {
                // 서버에서 유효성 검사 실패한 경우
                nicknameError.textContent = data.message || "해당 닉네임은 형식에 맞지 않습니다.";
                nicknameError.classList.add("show");
            }
        });
    });
}

// 닉네임 입력 시 에러 메시지 숨김 및 버튼 활성화
if (nicknameInput) {
    nicknameInput.addEventListener("input", () => {
        if (nicknameError.classList.contains("show")) {
            nicknameError.classList.remove("show");
        }
        // 버튼 다시 활성화
        if (profileSaveBtn) {
            profileSaveBtn.classList.remove("disabled");
        }
    });
}
// Add Icon Modal 관련 이벤트
const addIcon = document.getElementById('add-icon');
const addIconModal = document.getElementById('addIconModal');
const addIconModalOverlay = document.getElementById('addIconModalOverlay');
const addIconModalClose = document.getElementById('addIconModalClose');
const deviceExploreBtn = document.getElementById('deviceExploreBtn');
const profileImageBtn = document.getElementById('profileImageBtn');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const previewImage = document.getElementById('previewImage');
const removeImageBtn = document.getElementById('removeImageBtn');
let selectedImageFile = null;

// 전송 버튼 상태 업데이트 함수
function updateSendBtnState() {
    // 응답 대기 중이면 항상 비활성화
    if (isWaitingForResponse) {
        sendBtn.disabled = true;
        sendBtn.classList.remove('active');
        return;
    }

    if (messageInput.value.trim().length > 0 || (imagePreviewContainer && imagePreviewContainer.style.display === 'flex')) {
        sendBtn.disabled = false;
        sendBtn.classList.add('active');
    } else {
        sendBtn.disabled = true;
        sendBtn.classList.remove('active');
    }
}

// Add-icon 클릭 시 모달 토글
if (addIcon) {
    addIcon.addEventListener('click', function(e) {
        e.stopPropagation();

        // 응답 대기 중이면 아무 동작도 하지 않음
        if (isWaitingForResponse) {
            return;
        }

        if (isLoggedIn) {
            addIconModal.classList.toggle('show');
        } else {
            // 로그인 안 된 상태에서 로그인 모달 표시
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.classList.add('active');
            }
        }
    });
}

// 모달 닫기 버튼
if (addIconModalClose) {
    addIconModalClose.addEventListener('click', function() {
        addIconModal.classList.remove('show');
    });
}

// 모달 오버레이 클릭 시 닫기
if (addIconModalOverlay) {
    addIconModalOverlay.addEventListener('click', function() {
        addIconModal.classList.remove('show');
    });
}

// 디바이스에서 탐색 버튼
if (deviceExploreBtn) {
    deviceExploreBtn.addEventListener('click', function() {
        imageFileInput.click();
    });
}

// 프로필 이미지 버튼 상태 업데이트 함수
function updateProfileImageButtonState() {
    if (profileImageBtn) {
        const hasCustomProfile = currentUser && currentUser.profile_image && !currentUser.profile_image.includes('default_profile');
        const isGifImage = currentUser && currentUser.profile_image && currentUser.profile_image.toLowerCase().endsWith('.gif');

        if (hasCustomProfile && !isGifImage) {
            profileImageBtn.disabled = false;
            profileImageBtn.style.cursor = 'pointer';
            profileImageBtn.style.opacity = '1';
        } else {
            profileImageBtn.disabled = true;
            profileImageBtn.style.cursor = 'not-allowed';
            profileImageBtn.style.opacity = '0.5';
        }
    }
}

// 프로필 이미지 사용 버튼
if (profileImageBtn) {
    profileImageBtn.addEventListener('click', function(e) {
        if (this.disabled) {
            e.preventDefault();
            return;
        }

        if (currentUser && currentUser.profile_image && !currentUser.profile_image.includes('default_profile')) {
            previewImage.src = currentUser.profile_image;
            imagePreviewContainer.style.display = 'flex';
            selectedImageFile = null; // 파일 선택 초기화
            addIconModal.classList.remove('show');
            updateSendBtnState();
        }
    });
    
    // 초기 상태 설정
    updateProfileImageButtonState();
}

// 파일 선택 후 처리
if (imageFileInput) {
    imageFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 파일 확장자 검사
            const fileName = file.name.toLowerCase();
            const allowedExtensions = ['.jpg', '.jpeg', '.png'];
            const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

            if (!isValidExtension) {
                // 유효하지 않은 파일 형식
                showConfirmModal('jpg, jpeg, png 형식의 이미지만 첨부할 수 있습니다.');
                imageFileInput.value = ''; // 파일 입력 초기화
                return;
            }

            // 선택된 파일을 변수에 저장
            selectedImageFile = file;

            // 이미지 미리보기 표시
            const reader = new FileReader();
            reader.onload = function(event) {
                previewImage.src = event.target.result;
                imagePreviewContainer.style.display = 'flex';
                updateSendBtnState();
            };
            reader.readAsDataURL(file);

            addIconModal.classList.remove('show');
        }
    });
}

// 이미지 제거 버튼
if (removeImageBtn) {
    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        selectedImageFile = null;
        imagePreviewContainer.style.display = 'none';
        previewImage.src = '';
        imageFileInput.value = '';
        updateSendBtnState();
    });
}

// 모달 바깥 클릭 시 닫기
document.addEventListener('click', function(e) {
    if (addIconModal && addIconModal.classList.contains('show')) {
        // 모달, add-icon 요소를 클릭하지 않았을 때만 닫기
        if (!addIconModal.contains(e.target) && !addIcon.contains(e.target)) {
            addIconModal.classList.remove('show');
        }
    }
});
// ========== 비밀번호 수정 모달 ==========
const changePasswordBtn = document.getElementById('changePasswordBtn');
const passwordModal = document.getElementById('passwordModal');
const passwordForm = document.getElementById('passwordForm');
const passwordCancelBtn = document.getElementById('passwordCancelBtn');
const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');

const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

const currentPasswordError = document.getElementById('currentPasswordError');
const newPasswordError = document.getElementById('newPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

const newPasswordSuccess = document.getElementById('newPasswordSuccess');
const confirmPasswordSuccess = document.getElementById('confirmPasswordSuccess');

// 비밀번호 수정 버튼 클릭 시 모달 표시
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function() {
        settingsModal.classList.remove('show');
        passwordModal.classList.add('show');
        resetPasswordForm();
    });
}

// 취소 버튼 클릭 시 모달 닫기
if (passwordCancelBtn) {
    passwordCancelBtn.addEventListener('click', function() {
        passwordModal.classList.remove('show');
        resetPasswordForm();
    });
}

// 모달 외부 클릭 시 닫기
if (passwordModal) {
    passwordModal.addEventListener('click', function(e) {
        if (e.target === passwordModal) {
            passwordModal.classList.remove('show');
            resetPasswordForm();
        }
    });
}

// 비밀번호 유효성 검사 (영어 대소문자/숫자/특수문자 중 3가지 이상, 8~15자)
function validatePassword(password) {
    if (password.length < 8 || password.length > 15) return false;
    
    let count = 0;
    if (/[a-z]/.test(password)) count++;
    if (/[A-Z]/.test(password)) count++;
    if (/[0-9]/.test(password)) count++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) count++;
    
    return count >= 3;
}

// 입력 필드 변경 시 유효성 검사
function checkPasswordInputs() {
    let isValid = true;
    
    // 새 비밀번호 유효성 검사
    if (newPasswordInput && newPasswordInput.value.length > 0) {
        if (!validatePassword(newPasswordInput.value)) {
            newPasswordError.classList.add('show');
            newPasswordSuccess.classList.remove('show');
            isValid = false;
        } else {
            newPasswordError.classList.remove('show');
            newPasswordSuccess.classList.add('show');
        }
    } else {
        newPasswordError.classList.remove('show');
        newPasswordSuccess.classList.remove('show');
    }
    
    // 비밀번호 확인 일치 검사
    if (confirmPasswordInput && confirmPasswordInput.value.length > 0) {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            confirmPasswordError.classList.add('show');
            confirmPasswordSuccess.classList.remove('show');
            isValid = false;
        } else {
            confirmPasswordError.classList.remove('show');
            confirmPasswordSuccess.classList.add('show');
        }
    } else {
        confirmPasswordError.classList.remove('show');
        confirmPasswordSuccess.classList.remove('show');
    }
    
    // 모든 필드가 입력되고 유효한 경우에만 버튼 활성화
    if (currentPasswordInput && currentPasswordInput.value.length > 0 &&
        newPasswordInput && newPasswordInput.value.length > 0 &&
        confirmPasswordInput && confirmPasswordInput.value.length > 0 &&
        isValid && validatePassword(newPasswordInput.value) &&
        newPasswordInput.value === confirmPasswordInput.value) {
        passwordSubmitBtn.disabled = false;
    } else {
        passwordSubmitBtn.disabled = true;
    }
}

// 입력 이벤트 리스너
if (currentPasswordInput) currentPasswordInput.addEventListener('input', checkPasswordInputs);
if (newPasswordInput) newPasswordInput.addEventListener('input', checkPasswordInputs);
if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', checkPasswordInputs);

// 폼 제출 처리
if (passwordForm) {
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (passwordSubmitBtn.disabled) return;
        
        try {
            const response = await fetch('/uauth/change-password/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    current_password: currentPasswordInput.value,
                    new_password: newPasswordInput.value
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                passwordModal.classList.remove('show');
                resetPasswordForm();
                showConfirmModal('비밀번호가 성공적으로 변경되었습니다.');
            } else {
                if (data.error_type === 'current_password') {
                    showConfirmModal('현재 비밀번호가 올바르지 않습니다.');
                } 
                else if (data.error_type === 'new_password') {
                    showConfirmModal('새 비밀번호는 현재 비밀번호와 다르게 설정해야 합니다.');
                }
                else {
                    showConfirmModal(data.message || '비밀번호 변경에 실패했습니다.');
                }
            }
        } catch (error) {
            console.error('Password change error:', error);
            showConfirmModal('서버 오류가 발생했습니다.');
        }
    });
}

// 폼 리셋
function resetPasswordForm() {
    if (currentPasswordInput) currentPasswordInput.value = '';
    if (newPasswordInput) newPasswordInput.value = '';
    if (confirmPasswordInput) confirmPasswordInput.value = '';
    if (currentPasswordError) currentPasswordError.classList.remove('show');
    if (newPasswordError) newPasswordError.classList.remove('show');
    if (confirmPasswordError) confirmPasswordError.classList.remove('show');
    if (passwordSubmitBtn) passwordSubmitBtn.disabled = true;
    if (newPasswordSuccess) newPasswordSuccess.classList.remove('show');
    if (confirmPasswordSuccess) confirmPasswordSuccess.classList.remove('show');
}

// ========== 회원탈퇴 모달 ==========

// 1. 요소 가져오기
const withdrawBtn = document.getElementById('withdrawBtn');
const withdrawModal = document.getElementById('withdrawModal');
const withdrawCancelBtn = document.getElementById('withdrawCancelBtn');
const withdrawConfirmBtn = document.getElementById('withdrawConfirmBtn');
const withdrawPassword = document.getElementById('withdrawPassword');
const withdrawError = document.getElementById('withdrawError');
const withdrawCompleteModal = document.getElementById('withdrawCompleteModal');

// 2. 회원탈퇴 버튼 클릭 → 모달 열기
if (withdrawBtn) {
    withdrawBtn.addEventListener('click', function() {
        // 설정 모달 닫고
        settingsModal.classList.remove('show');
        // 회원탈퇴 모달 열기
        withdrawModal.classList.add('show');
    });
}

// 3. 취소 버튼 클릭 → 모달 닫기
if (withdrawCancelBtn) {
    withdrawCancelBtn.addEventListener('click', function() {
        // 모달 닫기
        withdrawModal.classList.remove('show');
        // 폼 초기화
        resetWithdrawForm();
    });
}

// 4. 모달 외부 클릭 → 모달 닫기
if (withdrawModal) {
    withdrawModal.addEventListener('click', function(e) {
        if (e.target === withdrawModal) {
            // 모달 닫기
            withdrawModal.classList.remove('show');
            // 폼 초기화
            resetWithdrawForm();
        }
    });
}

// 5. 비밀번호 입력 → 탈퇴 버튼 활성화
if (withdrawPassword) {
    withdrawPassword.addEventListener('input', function() {
        // 입력값 있으면 버튼 활성화
        if (this.value.trim().length > 0) {
            withdrawConfirmBtn.disabled = false;
        } 
        // 없으면 비활성화
        else {
            withdrawConfirmBtn.disabled = true;
        }
    });
}

// 6. 탈퇴 버튼 클릭 → 서버에 요청
if (withdrawConfirmBtn) {
    withdrawConfirmBtn.addEventListener('click', async function() {
        // 서버에 비밀번호 검증 + 탈퇴 요청
        const password = withdrawPassword.value.trim();
        try {
            const response = await fetch('/uauth/withdraw/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                withdrawModal.classList.remove('show');
                resetWithdrawForm();
                withdrawCompleteModal.classList.add('show');
                // 확인 버튼 클릭 시 메인 페이지로 이동
            } else {
                withdrawError.textContent = data.message || '회원탈퇴에 실패했습니다.';
                withdrawError.classList.add('show');
            }
        } catch (error) {
            console.error('Withdraw error:', error);
            showConfirmModal('서버 오류가 발생했습니다.');
        }
    });
}
// 7. 폼 초기화 함수
function resetWithdrawForm() {
    // 비밀번호 입력 초기화
    // 에러 메시지 숨기기
    // 버튼 비활성화
    if (withdrawPassword) withdrawPassword.value = '';
    if (withdrawError) withdrawError.classList.remove('show');
    if (withdrawConfirmBtn) withdrawConfirmBtn.disabled = true;

}

// 8. 회원탈퇴 완료 모달 확인 버튼 클릭 → 메인 페이지로 이동
const withdrawCompleteBtn = document.getElementById('withdrawCompleteBtn');
if (withdrawCompleteBtn) {
    withdrawCompleteBtn.addEventListener('click', function() {
        window.location.href = '/';
    });
}

// ========== 채팅 기록 관리 기능 ==========

// 채팅 기록 불러오기
async function loadChatHistory() {
    try {
        const response = await fetch('/main/chat/list', {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.success) {
            chatHistory = data.chats;
            renderChatHistory();
        }
    } catch (error) {
        console.error('채팅 기록 불러오기 실패:', error);
    }
}

// 채팅 기록을 사이드바에 렌더링
function renderChatHistory() {
    const chatHistoryArea = document.getElementById('chatHistoryArea');
    chatHistoryArea.innerHTML = '';

    chatHistory.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-history-item';
        chatItem.dataset.chatId = chat.chat_id;

        // 채팅 제목 영역
        const chatTitle = document.createElement('span');
        chatTitle.className = 'chat-title';
        chatTitle.textContent = chat.chat_title;

        // 메뉴 버튼
        const menuBtn = document.createElement('button');
        menuBtn.className = 'chat-menu-btn';
        menuBtn.innerHTML = '<span class="chat-menu-dot"></span><span class="chat-menu-dot"></span><span class="chat-menu-dot"></span>';
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleChatMenu(chat.chat_id);
        });

        // 메뉴 드롭다운
        const menuDropdown = document.createElement('div');
        menuDropdown.className = 'chat-menu-dropdown';
        menuDropdown.dataset.chatId = chat.chat_id;

        const editBtn = document.createElement('button');
        editBtn.className = 'chat-menu-item';
        editBtn.textContent = '채팅 이름 수정';
        editBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            startEditingChatTitle(chat.chat_id, chat.chat_title);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'chat-menu-item delete';
        deleteBtn.textContent = '채팅 기록 삭제';
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            confirmDeleteChat(chat.chat_id);
        });

        menuDropdown.appendChild(editBtn);
        menuDropdown.appendChild(deleteBtn);

        chatItem.appendChild(chatTitle);
        chatItem.appendChild(menuBtn);
        chatItem.appendChild(menuDropdown);

        // 현재 선택된 채팅이면 active 클래스 추가
        if (currentChatId == chat.chat_id) {
            chatItem.classList.add('active');
        }

        // 클릭 이벤트 (제목 클릭 시)
        chatItem.addEventListener('click', function() {
            // 사이드바가 열린 상태에서는 채팅 선택 불가
            if (sidebarLogged.classList.contains('expanded')) {
                return;
            }
            loadChat(chat.chat_id);
        });

        chatHistoryArea.appendChild(chatItem);
    });
}

// 특정 채팅 불러오기
async function loadChat(chatId) {
    try {
        if (!window.location.pathname.endsWith('main/')) {
            // 메인 페이지가 아닌 경우 currentChatId 업데이트 후 active 클래스 표시
            currentChatId = chatId;
            renderChatHistory();

            // 사이드바가 열려있는지 확인하고 URL에 파라미터 추가
            const isSidebarExpanded = sidebarLogged.classList.contains('expanded');

            // 메인 페이지로 리디렉션 (사이드바 상태 유지를 위해 파라미터 추가)
            window.location.href = `/main?chatId=${chatId}${isSidebarExpanded ? '&sidebar=open' : ''}`;
            return;
        }

        const response = await fetch(`/main/chat/${chatId}/`, {
            method: 'GET',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.success) {
            currentChatId = chatId;

            // 채팅 메시지 영역 초기화 및 표시
            const chatMessages = document.getElementById('chatMessages');
            const greeting = document.getElementById('greeting');
            const content = document.querySelector('.content');

            // 인사말 숨기기
            if (greeting) {
                greeting.style.display = 'none';
            }

            // 채팅 영역 활성화
            chatMessages.classList.add('active');
            content.classList.add('chat-started');

            // 기존 메시지 지우기
            chatMessages.innerHTML = '';

            // 메시지 렌더링
            data.messages.forEach(msg => {
                if (msg.is_answer === 'Q') {
                    addUserMessage(msg.content, msg.image_url || null);
                } else {
                    addBotMessage(msg.content, msg.image_url || null);
                }
            });

            // 채팅 기록 목록 업데이트 (active 클래스 표시)
            renderChatHistory();

            // 스크롤을 최신 메시지로 이동
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('채팅 불러오기 실패:', error);
    }
}

// 새 채팅 생성
async function createNewChat(messageText) {
    try {
        const response = await fetch('/main/chat/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ message: messageText })
        });

        const data = await response.json();

        if (data.success) {
            currentChatId = data.chat_id;

            // 채팅 기록 목록 갱신
            await loadChatHistory();

            return data.chat_id;
        }
    } catch (error) {
        console.error('채팅 생성 실패:', error);
    }
    return null;
}

// 메시지 저장
async function saveMessage(content, isAnswer = 'Q', imageId = null) {
    if (!currentChatId) {
        console.error('현재 채팅 ID가 없습니다.');
        return;
    }

    try {
        const response = await fetch('/main/message/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                chat_id: currentChatId,
                content: content,
                is_answer: isAnswer,
                image_id: imageId
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('메시지 저장 실패:', data.message);
        }
    } catch (error) {
        console.error('메시지 저장 중 오류:', error);
    }
}

// 특정 채팅에 메시지 저장 (챗봇 응답 저장용)
async function saveMessageToChat(chatId, content, isAnswer = 'Q', imageId = null) {
    if (!chatId) {
        console.error('채팅 ID가 없습니다.');
        return;
    }

    try {
        const response = await fetch('/main/message/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                chat_id: chatId,
                content: content,
                is_answer: isAnswer,
                image_id: imageId
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('메시지 저장 실패:', data.message);
        }
    } catch (error) {
        console.error('메시지 저장 중 오류:', error);
    }
}

// ========== 채팅 메시지 기능 ==========

// Django CSRF 토큰 가져오기
function getCookie(name) {
    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {
            cookie = cookie.trim();
            // name= 형태로 시작하는지 확인
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


// 메시지 전송 함수
async function sendMessage() {
  const message = messageInput.value.trim();
  const chatMessages = document.getElementById('chatMessages');
  const greeting = document.getElementById('greeting');
  const content = document.querySelector('.content');

  // 사용자 메시지와 이미지가 있는지 확인
  const hasMessage = message.length > 0;
  const hasImage = imagePreviewContainer && imagePreviewContainer.style.display === 'flex';

  if (hasMessage || hasImage) {
    // 첫 메시지 전송 시 새 채팅 생성
    const isFirstMessage = !chatMessages.classList.contains('active');
    if (isFirstMessage) {
      // 메시지가 있으면 메시지로, 없으면 "이미지"로 채팅 제목 설정
      const chatTitle = hasMessage ? message : '이미지';
      await createNewChat(chatTitle);
    }

    // 현재 채팅 ID를 저장 (사용자가 다른 채팅으로 전환해도 원래 채팅에 응답 저장)
    const targetChatId = currentChatId;

    // 첫 메시지 전송 시 레이아웃 전환
    if (isFirstMessage) {
      // 인사말 페이드아웃
      if (greeting) {
          greeting.classList.add('hidden');
      }

      // 채팅 영역 활성화 및 레이아웃 전환
      setTimeout(() => {
          if (greeting) {
              greeting.style.display = 'none';
          }
          chatMessages.classList.add('active');
          content.classList.add('chat-started');
      }, 300);
    }

    // 사용자 업로드 이미지 저장 (먼저 저장해서 image_id를 받음)
    let imageId = null;
    if (hasImage) {
      imageId = await addGallery('user');
    }

    // 사용자 메시지 표시
    addUserMessage(message, hasImage ? previewImage.src : null);

    // 메시지 저장 (이미지 ID와 함께)
    // 메시지가 있거나 이미지가 있으면 저장
    if (hasMessage || hasImage) {
      await saveMessage(message || '', 'Q', imageId);
    }

    // 입력 필드 초기화
    messageInput.value = '';
    if (hasImage) {
        selectedImageFile = null;
        imagePreviewContainer.style.display = 'none';
        previewImage.src = '';
        imageFileInput.value = '';
    }

    // 응답 대기 상태로 설정
    isWaitingForResponse = true;

    // 전송 버튼 비활성화
    sendBtn.disabled = true;
    sendBtn.classList.remove('active');

    // textarea 높이 리셋
    autoResizeTextarea(messageInput);

    // 챗봇 응답 생성 및 저장 (비동기로 즉시 시작)
    generateAndSaveBotResponse(targetChatId, message, imageId);
  }
}

// 챗봇 응답 생성 및 저장 함수
async function generateAndSaveBotResponse(targetChatId, userMessage, imageId) {
    try {
        const loadingTimeout = setTimeout(() => {
            if (currentChatId === targetChatId) {
                addLoadingMessage();
            }
        }, 1500);

        const response = await fetch("/main/message/response/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: new URLSearchParams({
                "message": userMessage,
                "image_id": imageId || ""   // ← 반드시 추가
            }),
        });

        const data = await response.json();
        const botResponse = data.response || "응답을 가져오지 못했습니다.";

        try {
            const saveResponse = await fetch('/main/message/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    chat_id: targetChatId,
                    content: botResponse,
                    is_answer: 'A',
                    image_id: null
                }),
                keepalive: true
            });

            const saveData = await saveResponse.json();

            if (!saveData.success) {
                console.error('메시지 저장 실패:', saveData.message);
            } else {
                console.log('챗봇 응답 저장 성공:', botResponse);
            }
        } catch (saveError) {
            console.error('메시지 저장 중 오류:', saveError);
        }

        if (currentChatId === targetChatId) {
            removeLoadingMessage();
            addBotMessage(botResponse);
        } else {
            clearTimeout(loadingTimeout);
        }

        isWaitingForResponse = false;
        updateSendBtnState();

    } catch (error) {
        console.error('챗봇 응답 생성 실패:', error);

        isWaitingForResponse = false;
        updateSendBtnState();

        if (currentChatId === targetChatId) {
            removeLoadingMessage();
            showConfirmModal('챗봇 응답 생성 중 오류가 발생했습니다.');
        }
    }
}


// 사용자 메시지 추가
function addUserMessage(text, imageSrc) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message user-message';

    // 메시지 내용 영역
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 업로드한 이미지가 있으면 표시
    if (imageSrc) {
        const uploadedImage = document.createElement('img');
        uploadedImage.className = 'message-uploaded-image';
        uploadedImage.src = imageSrc;
        uploadedImage.alt = '업로드된 이미지';
        contentDiv.appendChild(uploadedImage);
    }

    // 텍스트 메시지가 있으면 표시
    if (text) {
        const textBubble = document.createElement('div');
        textBubble.className = 'message-bubble user-bubble';
        textBubble.textContent = text;
        contentDiv.appendChild(textBubble);
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // 스크롤을 최신 메시지로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 로딩 메시지 추가
function addLoadingMessage() {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message loading-message';
    messageDiv.id = 'loadingMessage';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textBubble = document.createElement('div');
    textBubble.className = 'message-bubble bot-bubble';
    textBubble.textContent = '답변을 생성중입니다...';

    contentDiv.appendChild(textBubble);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // 스크롤을 최신 메시지로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 로딩 메시지 제거
function removeLoadingMessage() {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

// 챗봇 메시지 추가
function addBotMessage(text, imageSrc) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';

    // 메시지 내용
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // 챗봇이 보낸 이미지가 있으면 표시
    if (imageSrc) {
        const botImage = document.createElement('img');
        botImage.className = 'message-uploaded-image';
        botImage.src = imageSrc;
        botImage.alt = '챗봇 응답 이미지';
        contentDiv.appendChild(botImage);
    }

    // 텍스트 메시지가 있으면 표시
    if (text) {
        const textBubble = document.createElement('div');
        textBubble.className = 'message-bubble bot-bubble';
        textBubble.textContent = text;
        contentDiv.appendChild(textBubble);
    }

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // 스크롤을 최신 메시지로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function addGallery(role) {
  try {
    const formData = new FormData();

    formData.append('role', role);

    if (selectedImageFile) {
      formData.append('image', selectedImageFile);
    } else if (previewImage.src) {
      const blob = await fetch(previewImage.src).then(r => r.blob());

      const filename = `profile_image_${new Date().getTime()}.png`;
      formData.append('image', blob, filename);
    }

    const res = await fetch('/main/gallery/upload', {
      method: "POST",
      headers: {
        "X-CSRFToken": getCookie('csrftoken')
      },
      body: formData
    });

    const data = await res.json();

    if (!data.success) {
      console.error('사진 저장 실패');
      return null;
    }

    // 저장된 이미지의 ID를 반환
    return data.image_id || null;
  } catch (err) {
    console.error('오류 디버깅: ', err);
    alert('이미지 저장 중 문제 발생');
    return null;
  }
}

// ========== 채팅 기록 관리 기능 ==========

let currentEditingChatId = null;

// 채팅 메뉴 토글
function toggleChatMenu(chatId) {
    // 모든 메뉴 닫기
    document.querySelectorAll('.chat-menu-dropdown').forEach(menu => {
        if (menu.dataset.chatId !== chatId.toString()) {
            menu.classList.remove('show');
        }
    });

    // 선택한 메뉴 토글
    const menu = document.querySelector(`.chat-menu-dropdown[data-chat-id="${chatId}"]`);
    if (menu) {
        const isShowing = menu.classList.contains('show');
        menu.classList.toggle('show');

        // 메뉴가 열릴 때 위치 계산
        if (!isShowing) {
            const chatItem = menu.closest('.chat-history-item');
            const menuBtn = chatItem.querySelector('.chat-menu-btn');
            const rect = menuBtn.getBoundingClientRect();

            // 버튼 바로 위에 표시
            menu.style.left = `${rect.left}px`;
            menu.style.top = `${rect.top - menu.offsetHeight - 4}px`;
        }
    }
}

// 채팅 이름 수정 시작
function startEditingChatTitle(chatId, currentTitle) {
    // 메뉴 닫기
    const menu = document.querySelector(`.chat-menu-dropdown[data-chat-id="${chatId}"]`);
    if (menu) {
        menu.classList.remove('show');
    }

    currentEditingChatId = chatId;

    // 해당 채팅 아이템 찾기
    const chatItem = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`);
    if (!chatItem) return;

    const chatTitle = chatItem.querySelector('.chat-title');
    const menuBtn = chatItem.querySelector('.chat-menu-btn');

    // 제목을 input으로 변경
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'chat-title-input';
    input.value = currentTitle;
    input.maxLength = 15;
    input.dataset.chatId = chatId;
    input.dataset.originalTitle = currentTitle;

    // 기존 제목과 메뉴 버튼 숨기기
    chatTitle.style.display = 'none';
    menuBtn.style.display = 'none';

    // input 추가
    chatItem.insertBefore(input, menuBtn);

    // input에 포커스
    input.focus();
    input.select();

    // Enter 키로 저장
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveChatTitle(chatId, input.value);
        }
    });

    // 외부 클릭 시 저장
    const handleClickOutside = function(e) {
        // input 자체를 클릭한 경우는 무시
        if (e.target === input) {
            return;
        }

        // input이 아닌 다른 곳을 클릭하면 저장
        if (!input.contains(e.target)) {
            saveChatTitle(chatId, input.value);
            document.removeEventListener('click', handleClickOutside);
        }
    };

    // 약간의 지연 후 이벤트 리스너 추가 (현재 클릭 이벤트와 충돌 방지)
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 100);
}

// 채팅 이름 유효성 검사 (영어대소문자, 한글, 숫자, 특수문자로 구성된 15글자)
function validateChatTitle(title) {
    // 영어대소문자, 한글, 숫자, 특수문자만 허용
    const regex = /^[a-zA-Z가-힣0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`\s]{1,15}$/;
    return regex.test(title);
}

// 채팅 이름 저장
async function saveChatTitle(chatId, newTitle) {
    const trimmedTitle = newTitle.trim();

    if (trimmedTitle.length === 0) {
        showConfirmModal('채팅 이름을 입력해주세요.');
        await loadChatHistory();
        return;
    }

    if (trimmedTitle.length > 15) {
        showConfirmModal('채팅 이름은 15글자 이하로 입력해주세요.');
        await loadChatHistory();
        return;
    }

    // 유효성 검사
    if (!validateChatTitle(trimmedTitle)) {
        showConfirmModal('채팅 이름은 영어 대소문자, 한글, 숫자, 특수문자로만 구성되어야 합니다.');
        await loadChatHistory();
        return;
    }

    try {
        const response = await fetch(`/main/chat/${chatId}/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ chat_title: trimmedTitle })
        });

        const data = await response.json();

        if (data.success) {
            // 채팅 기록 목록 갱신
            await loadChatHistory();
        } else {
            showConfirmModal(data.message || '채팅 이름 수정에 실패했습니다.');
            await loadChatHistory();
        }
    } catch (error) {
        console.error('채팅 이름 수정 실패:', error);
        showConfirmModal('서버 오류가 발생했습니다.');
        await loadChatHistory();
    }

    currentEditingChatId = null;
}

// 채팅 삭제 확인
function confirmDeleteChat(chatId) {
    // 메뉴 닫기
    const menu = document.querySelector(`.chat-menu-dropdown[data-chat-id="${chatId}"]`);
    if (menu) {
        menu.classList.remove('show');
    }

    // 삭제 모달 표시
    const deleteModal = document.getElementById('chatDeleteModal');
    const confirmBtn = document.getElementById('chatDeleteConfirmBtn');

    if (deleteModal) {
        deleteModal.classList.add('show');

        // 기존 이벤트 리스너 제거를 위해 새 버튼 생성
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        // 삭제 확인 버튼 이벤트
        newConfirmBtn.addEventListener('click', function() {
            deleteChat(chatId);
        });
    }
}

// 채팅 삭제
async function deleteChat(chatId) {
    try {
        const response = await fetch(`/main/chat/${chatId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const data = await response.json();

        if (data.success) {
            // 삭제 모달 닫기
            const deleteModal = document.getElementById('chatDeleteModal');
            if (deleteModal) {
                deleteModal.classList.remove('show');
            }

            // 갤러리 페이지에서 현재 보고 있는 채팅을 삭제하는 경우 메인 페이지로 이동
            if (window.location.pathname.includes('/gallery') && currentChatId == chatId) {
                window.location.href = '/main/';
                return;
            }

            // 삭제된 채팅이 현재 선택된 채팅이면 초기화
            if (currentChatId == chatId) {
                currentChatId = null;

                const chatMessages = document.getElementById('chatMessages');
                const greeting = document.getElementById('greeting');
                const content = document.querySelector('.content');

                if (chatMessages) {
                    chatMessages.innerHTML = '';
                    chatMessages.classList.remove('active');
                }
                if (content) {
                    content.classList.remove('chat-started');
                }
                if (greeting) {
                    // 로그인 상태에 맞게 greeting 텍스트 업데이트
                    if (isLoggedIn && currentUser) {
                        greeting.textContent = `안녕하세요, ${currentUser.nickname || '사용자'}님😊`;
                    } else {
                        greeting.textContent = `안녕하세요`;
                    }
                    // hidden 클래스 제거 및 display 설정
                    greeting.classList.remove('hidden');
                    greeting.style.display = '';  // inline style 제거
                }
            }

            // 채팅 기록 목록 갱신
            await loadChatHistory();
            showConfirmModal('채팅 기록이 삭제되었습니다.');
        } else {
            showConfirmModal(data.message || '채팅 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('채팅 삭제 실패:', error);
        showConfirmModal('서버 오류가 발생했습니다.');
    }
}

// 채팅 삭제 모달 취소 버튼
const chatDeleteCancelBtn = document.getElementById('chatDeleteCancelBtn');
if (chatDeleteCancelBtn) {
    chatDeleteCancelBtn.addEventListener('click', function() {
        const deleteModal = document.getElementById('chatDeleteModal');
        if (deleteModal) {
            deleteModal.classList.remove('show');
        }
    });
}

// 모달 외부 클릭 시 닫기
const chatDeleteModal = document.getElementById('chatDeleteModal');
if (chatDeleteModal) {
    chatDeleteModal.addEventListener('click', function(e) {
        if (e.target === chatDeleteModal) {
            chatDeleteModal.classList.remove('show');
        }
    });
}

// 문서 클릭 시 열린 chat-menu 닫기
document.addEventListener('click', function(e) {
    // chat-menu-btn이나 chat-menu-dropdown 내부를 클릭하지 않았으면 모든 chat-menu 닫기
    const isClickInsideChatMenu = e.target.closest('.chat-menu-btn') || e.target.closest('.chat-menu-dropdown');

    if (!isClickInsideChatMenu) {
        document.querySelectorAll('.chat-menu-dropdown').forEach(menu => {
            menu.classList.remove('show');
        });
    }
});