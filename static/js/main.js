// 로그인 상태
let isLoggedIn = false;
let currentUser = null;

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

// 페이지 로드 시 로그인 상태 확인
document.addEventListener('DOMContentLoaded', async function() {
    await checkLoginStatus();
    initSidebarEvents();
});

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
    if (currentUser) {
        const profileName = document.querySelector('.profile-name');
        const profileImg = document.getElementById('profileImg');
        const greeting = document.getElementById('greeting');
        
        if (profileName) {
            profileName.textContent = currentUser.nickname || '사용자';
        }
        if (profileImg && currentUser.profile_image) {
            profileImg.src = currentUser.profile_image;
        }
        if (greeting) {
            greeting.textContent = `안녕하세요, ${currentUser.nickname || '사용자'}님😊`;
        }
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
    // 로고 클릭 시 사이드바 확장
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            toggleSidebar();
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
}

// 사이드바 축소
function collapseSidebar() {
    sidebarLogged.classList.remove('expanded');
    document.body.classList.remove('sidebar-expanded');
    settingsModal.classList.remove('show');
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
        if (this.value.trim().length > 0) {
            sendBtn.disabled = false;
            sendBtn.classList.add('active');
        } else {
            sendBtn.disabled = true;
            sendBtn.classList.remove('active');
        }
    });

    // 전송 버튼 클릭 이벤트
    sendBtn.addEventListener('click', function() {
        if (this.disabled) return;
        
        if (!isLoggedIn) {
            // 로그인되지 않았으면 로그인 모달 표시
            toggleModal();
        } else {
            // 로그인되어 있으면 메시지 전송
            const message = messageInput.value.trim();
            if (message) {
                console.log('메시지 전송:', message);
                // 여기에 메시지 전송 로직 추가
                messageInput.value = '';
                sendBtn.disabled = true;
                sendBtn.classList.remove('active');
            }
        }
    });

    // Enter 키로 전송
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !sendBtn.disabled) {
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
        if (email === 'test@test.com' && password === 'test1234') {
            isLoggedIn = true;
            currentUser = { email: email, nickname: '테스트유저', profile_image: null };
            toggleModal();
            updateUserProfile();
            updateUIForLoginState();
            submitBtn.disabled = false;
            submitBtn.textContent = '로그인';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            return;
        }
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
            isValid = false;
        } else {
            newPasswordError.classList.remove('show');
        }
    } else {
        newPasswordError.classList.remove('show');
    }
    
    // 비밀번호 확인 일치 검사
    if (confirmPasswordInput && confirmPasswordInput.value.length > 0) {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            confirmPasswordError.classList.add('show');
            isValid = false;
        } else {
            confirmPasswordError.classList.remove('show');
        }
    } else {
        confirmPasswordError.classList.remove('show');
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
                    currentPasswordError.classList.add('show');
                } else {
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
}