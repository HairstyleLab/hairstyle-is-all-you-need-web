// 로그인 상태
let isLoggedIn = false;
let currentUser = null;
let isWaitingForResponse = false; // 챗봇 응답 대기 중 상태

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
        } else {
            isLoggedIn = false;
            currentUser = null;
        }
        updateUIForLoginState();
    } catch (error) {
        console.log('로그인 상태 확인 실패:', error);
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
            // 사이드바가 열려있으면 메인 페이지로 이동
            if (sidebarLogged.classList.contains('expanded')) {
                location.href = '/main/';
            } else {
                // 사이드바가 닫혀있으면 사이드바 확장
                toggleSidebar();
            }
        });
    }

    // 닫기 버튼 클릭 시 사이드바 축소
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', function() {
            collapseSidebar();
        });
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
            logoutModal.classList.remove('show');
            updateUIForLoginState();
            collapseSidebar();
            // 확인 모달 표시
            showConfirmModal('로그아웃 되었습니다.');
            greeting.textContent = `안녕하세요`;
        }
    } catch (error) {
        // 서버 연결 실패 시에도 로컬에서 로그아웃 처리
        isLoggedIn = false;
        currentUser = null;
        logoutModal.classList.remove('show');
        updateUIForLoginState();
        collapseSidebar();
        // 확인 모달 표시
        showConfirmModal('로그아웃 되었습니다.');
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
        console.log('Login response:', data, 'Status:', response.status);
        
        if (data.success) {
            isLoggedIn = true;
            currentUser = data.user;
            toggleModal();
            updateUserProfile();
            updateUIForLoginState();
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
        
        if (hasCustomProfile) {
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
        
        console.log('프로필 이미지 버튼 클릭, currentUser:', currentUser);
        if (currentUser && currentUser.profile_image && !currentUser.profile_image.includes('default_profile')) {
            console.log('프로필 이미지 표시:', currentUser.profile_image);
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

// ========== 채팅 메시지 기능 ==========

// 메시지 전송 함수
function sendMessage() {
    const message = messageInput.value.trim();
    const chatMessages = document.getElementById('chatMessages');
    const greeting = document.getElementById('greeting');
    const content = document.querySelector('.content');

    // 사용자 메시지와 이미지가 있는지 확인
    const hasMessage = message.length > 0;
    const hasImage = imagePreviewContainer && imagePreviewContainer.style.display === 'flex';

    if (hasMessage || hasImage) {
        // 첫 메시지 전송 시 레이아웃 전환
        if (!chatMessages.classList.contains('active')) {
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

        // 사용자 메시지 표시
        addUserMessage(message, hasImage ? previewImage.src : null);

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

        // "답변을 생성중입니다..." 1.5초 후에 메시지 표시
        setTimeout(() => {
            addLoadingMessage();
        }, 1500);

        // 3초 후 챗봇 응답
        setTimeout(() => {
            removeLoadingMessage();
            addBotMessage('안녕하세요 무엇을 도와드릴까요?');

            // 응답 대기 상태 해제
            isWaitingForResponse = false;

            // 전송 버튼 상태 업데이트
            updateSendBtnState();
        }, 10000);
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
function addBotMessage(text) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message bot-message';

    // 메시지 내용
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textBubble = document.createElement('div');
    textBubble.className = 'message-bubble bot-bubble';
    textBubble.textContent = text;

    contentDiv.appendChild(textBubble);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // 스크롤을 최신 메시지로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
