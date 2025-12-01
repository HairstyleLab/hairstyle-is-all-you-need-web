// 상태 관리
let timerInterval = null;
let timeLeft = 180; // 3분 = 180초
let verificationCodeSent = false;
let verificationCodeConfirmed = false;
let correctVerificationCode = ''; // 실제로는 서버에서 받아온 코드
let verifiedEmail = ''; // 인증 완료된 이메일 저장

// DOM 요소
const emailUsername = document.getElementById('emailUsername');
const emailDomainSelect = document.getElementById('emailDomainSelect');
const emailDomain = document.getElementById('emailDomain');
const sendCodeBtn = document.getElementById('sendCodeBtn');
const emailError = document.getElementById('emailError');
const verificationCode = document.getElementById('verificationCode');
const timer = document.getElementById('timer');
const confirmCodeBtn = document.getElementById('confirmCodeBtn');
const codeError = document.getElementById('codeError');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const passwordError = document.getElementById('passwordError');
const confirmError = document.getElementById('confirmError');
const submitBtn = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const modalConfirmBtn = document.getElementById('modalConfirmBtn');

// 초기화: 에러 메시지 숨김
emailError.style.display = 'none';
emailError.textContent = '';
codeError.style.display = 'none';
codeError.textContent = '';
passwordError.style.display = 'none';
passwordError.textContent = '';
confirmError.style.display = 'none';
confirmError.textContent = '';

// 타이머 초기 숨김
timer.style.display = 'none';

// emailDomain 초기화 (hidden 클래스 확인)
if (!emailDomain.classList.contains('hidden')) {
    emailDomain.classList.add('hidden');
}

// 도메인 선택 처리
emailDomainSelect.addEventListener('change', function() {
    console.log('Select changed to:', this.value); // 디버깅용
    if (this.value === 'custom') {
        // 직접입력 선택 시
        emailDomainSelect.classList.add('hidden');
        emailDomain.classList.remove('hidden');
        emailDomain.disabled = false;
        emailDomain.value = '';
        emailDomain.focus();
        console.log('custom 선택됨, emailDomain 표시');
    } else if (this.value) {
        // 기본 도메인 선택 시
        emailDomain.classList.add('hidden');
        emailDomain.value = '';
        console.log('기본 도메인 선택됨:', this.value);
    } else {
        // 선택하세요 선택 시
        emailDomain.value = '';
        emailDomain.classList.add('hidden');
        console.log('선택하세요 선택됨');
    }
    
    checkEmailAndEnableButton();
});

// 직접입력 도메인에서 입력시
emailDomain.addEventListener('input', function() {
    checkEmailAndEnableButton();
});

// 직접입력 도메인에서 포커스 아웃시 select로 돌아가기
emailDomain.addEventListener('blur', function() {
    if (!this.classList.contains('hidden') && this.value === '') {
        this.classList.add('hidden');
        emailDomainSelect.classList.remove('hidden');
        emailDomainSelect.value = '';
    }
});

// 이메일 username 입력시
emailUsername.addEventListener('input', function() {
    checkEmailAndEnableButton();
    checkIfEmailChanged();
});

// 이메일 domain 변경시
emailDomainSelect.addEventListener('input', function() {
    checkIfEmailChanged();
});

emailDomain.addEventListener('input', function() {
    checkIfEmailChanged();
});

// 이메일 username blur시 유효성 검사
emailUsername.addEventListener('blur', function() {
    validateEmail();
});

// 1. 이메일 입력 확인 및 버튼 활성화
function checkEmailAndEnableButton() {
    const username = emailUsername.value.trim();
    let domain = '';
    
    // select가 보이는 경우 select의 값 사용, input이 보이는 경우 input의 값 사용
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    
    console.log('Username:', username, 'Domain:', domain); // 디버깅용
    
    // 한 글자 이상 입력되고 도메인이 선택/입력되면 버튼 활성화
    if (username.length > 0 && domain.length > 0) {
        sendCodeBtn.disabled = false;
        console.log('버튼 활성화'); // 디버깅용
    } else {
        sendCodeBtn.disabled = true;
        console.log('버튼 비활성화'); // 디버깅용
    }
}

// 이메일 변경 여부 확인
function checkIfEmailChanged() {
    const username = emailUsername.value.trim();
    let domain = '';
    
    // 현재 입력된 이메일 가져오기
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    
    const currentEmail = `${username}@${domain}`;
    
    // 인증코드가 발송되었거나 인증이 완료된 경우
    if ((verificationCodeSent || verificationCodeConfirmed) && verifiedEmail !== '') {
        // 이메일이 변경되면 인증 초기화
        if (currentEmail !== verifiedEmail) {
            console.log('이메일이 변경됨. 인증 초기화');
            resetVerification();
        }
    }
}

// 인증 초기화 함수
function resetVerification() {
    verificationCodeConfirmed = false;
    verificationCodeSent = false;
    verifiedEmail = '';
    
    // 타이머 정지
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // 인증코드 관련 요소 상태 초기화
    verificationCode.value = '';
    verificationCode.disabled = true;
    confirmCodeBtn.disabled = true;
    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = '인증코드 발송';
    sendCodeBtn.style.backgroundColor = '#FEF9D9';
    timer.style.display = 'none';
    codeError.style.display = 'none';
    codeError.textContent = '';
    
    // 성공 메시지 제거
    const existingSuccess = codeError.parentElement?.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // 비밀번호 입력칸 비활성화
    newPassword.disabled = true;
    confirmPassword.disabled = true;
    newPassword.value = '';
    confirmPassword.value = '';
    passwordError.style.display = 'none';
    confirmError.style.display = 'none';
    
    // 수정 버튼 비활성화
    submitBtn.disabled = true;
    
    
    console.log('인증 초기화 완료');
}

// 2. 이메일 유효성 검사
function validateEmail() {
    const username = emailUsername.value.trim();
    let domain = '';
    
    // select가 보이는 경우 select의 값 사용, input이 보이는 경우 input의 값 사용
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    
    if (!username || !domain) {
        emailError.style.display = 'none';
        return false;
    }
    
    // 이메일 형식 검증 (간단한 정규식)
    const emailRegex = /^[a-zA-Z0-9._-]+$/;
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(username) || !domainRegex.test(domain)) {
        emailError.textContent = '올바른 이메일 형식이 아닙니다.';
        emailError.style.display = 'block';
        return false;
    }
    
    emailError.style.display = 'none';
    return true;
}

// 3. 인증코드 발송 버튼 클릭
sendCodeBtn.addEventListener('click', async function() {
    if (!validateEmail()) {
        return;
    }
    
    const username = emailUsername.value.trim();
    let domain = '';
    
    // select가 보이는 경우 select의 값 사용, input이 보이는 경우 input의 값 사용
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    
    const fullEmail = `${username}@${domain}`;
    
    // 서버에 인증코드 발송 요청 (비밀번호 찾기용)
    try {
        sendCodeBtn.disabled = true;
        const response = await fetch('/uauth/send-password-reset-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: fullEmail })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            emailError.textContent = data.message || '인증코드 발송에 실패했습니다.';
            emailError.style.display = 'block';
            sendCodeBtn.disabled = false;
            return;
        }
        
        emailError.style.display = 'none';
        
        // 인증코드 발급 안내 메시지
        const successMessage = document.createElement('p');
        successMessage.className = 'success-message';
        successMessage.textContent = '입력하신 이메일로 인증코드를 보내드렸습니다. 3분 안에 인증코드를 정확히 입력해주세요';
        successMessage.style.color = '#333';
        successMessage.style.fontSize = '15px';
        
        // 기존 성공 메시지 제거
        const existingSuccess = emailError.parentElement.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        emailError.parentElement.appendChild(successMessage);
        
        // 인증코드 입력칸 활성화
        verificationCode.disabled = false;
        verificationCode.placeholder = '인증코드 입력';
        
        // 인증코드 확인 버튼 활성화
        confirmCodeBtn.disabled = false;
        
        // 버튼 텍스트 변경
        sendCodeBtn.textContent = '코드 재발송';
        sendCodeBtn.style.backgroundColor = 'rgba(250, 176, 169, 0.2)';
        sendCodeBtn.disabled = false;
        
        // 타이머 시작
        startTimer();
        
        verificationCodeSent = true;
        
    } catch (error) {
        console.error('오류:', error);
        emailError.textContent = '요청 중 오류가 발생했습니다.';
        emailError.style.display = 'block';
        sendCodeBtn.disabled = false;
    }
});

// 타이머 시작
function startTimer() {
    // 기존 타이머가 있으면 정지
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // 타이머 표시
    timer.style.display = 'inline-block';
    
    // 시간 초기화
    timeLeft = 180; // 3분
    updateTimerDisplay();
    
    timerInterval = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            codeError.textContent = '인증시간이 만료되었습니다. 코드를 다시 발급받아 주세요.';
            codeError.style.display = 'block';
            verificationCode.disabled = true;
            confirmCodeBtn.disabled = true;
        }
    }, 1000);
}

// 타이머 디스플레이 업데이트
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// 4. 인증코드 확인 버튼 클릭
confirmCodeBtn.addEventListener('click', async function() {
    const inputCode = verificationCode.value.trim();
    
    if (!inputCode) {
        codeError.textContent = '인증코드를 입력해주세요.';
        codeError.style.display = 'block';
        return;
    }
    
    const username = emailUsername.value.trim();
    let domain = '';
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    const fullEmail = `${username}@${domain}`;
    
    // 서버에 인증코드 검증 요청
    try {
        confirmCodeBtn.disabled = true;
        const response = await fetch('/uauth/verify-code/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email: fullEmail,
                code: inputCode 
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            codeError.textContent = data.message || '인증코드가 일치하지 않습니다.';
            codeError.style.display = 'block';
            confirmCodeBtn.disabled = false;
            return;
        }
        
        // 인증 성공
        codeError.style.display = 'none';
        
        // 인증된 이메일 저장
        verifiedEmail = fullEmail;
        console.log('인증된 이메일 저장:', verifiedEmail);
        
        // 성공 메시지 표시
        const successMessage = document.createElement('p');
        successMessage.className = 'success-message';
        successMessage.textContent = '인증이 완료되었습니다.';
        
        const existingSuccess = codeError.parentElement.querySelector('.success-message');
        if (existingSuccess) {
            existingSuccess.remove();
        }
        
        codeError.parentElement.appendChild(successMessage);
        
        // 타이머 정지
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // 인증코드 관련 요소 비활성화
        verificationCode.disabled = true;
        confirmCodeBtn.disabled = true;
        sendCodeBtn.disabled = true;
        timer.style.display = 'none';
        
        verificationCodeConfirmed = true;
        
        // 5. 비밀번호 입력칸 활성화
        newPassword.disabled = false;
        confirmPassword.disabled = false;
        newPassword.placeholder = '새 비밀번호';
        confirmPassword.placeholder = '비밀번호를 다시 입력해주세요.';
        
    } catch (error) {
        console.error('오류:', error);
        codeError.textContent = '요청 중 오류가 발생했습니다.';
        codeError.style.display = 'block';
        confirmCodeBtn.disabled = false;
    }
});

// 비밀번호 유효성 검사
function validatePassword(password) {
    // 영어 대문자/소문자/숫자/특수문자 중 세 가지로 구성된 8~15 글자
    if (password.length < 8 || password.length > 15) {
        return false;
    }
    
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    // 네 가지 중 3가지 이상 포함되어야 함
    const count = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;
    
    return count >= 3;
}

// 새 비밀번호 입력시 유효성 검사
newPassword.addEventListener('input', function() {
    const password = this.value;
    
    if (password.length > 0) {
        if (!validatePassword(password)) {
            passwordError.textContent = '비밀번호 형식에 맞지 않습니다.';
            passwordError.style.display = 'block';
            passwordError.classList.remove('success');
            passwordError.classList.add('error');
        } else {
            passwordError.textContent = '사용할 수 있는 비밀번호입니다.';
            passwordError.style.display = 'block';
            passwordError.classList.remove('error');
            passwordError.classList.add('success');
        }
    } else {
        passwordError.style.display = 'none';
        passwordError.classList.remove('error', 'success');
    }
    
    checkPasswordMatch();
    checkFormComplete();
});

// 비밀번호 확인 입력시
confirmPassword.addEventListener('input', function() {
    checkPasswordMatch();
    checkFormComplete();
});

// 비밀번호 일치 확인
function checkPasswordMatch() {
    const password = newPassword.value;
    const confirm = confirmPassword.value;
    
    if (confirm.length > 0) {
        if (password !== confirm) {
            confirmError.style.display = 'block';
            confirmError.textContent = '비밀번호가 일치하지 않습니다.'; 
            confirmError.classList.add('error');

        } else {
            confirmError.textContent = "비밀번호가 일치합니다.";
            confirmError.classList.remove('error');
            confirmError.classList.add('success');
        }
    } else {
        confirmError.style.display = 'none';
    }
}

// 폼 완성 확인 (수정 버튼 활성화)
function checkFormComplete() {
    const password = newPassword.value;
    const confirm = confirmPassword.value;
    
    if (verificationCodeConfirmed && 
        validatePassword(password) && 
        password === confirm && 
        password.length > 0) {
        submitBtn.disabled = false;
        submitBtn.style.backgroundColor = '#FEF9D9';
    } else {
        submitBtn.disabled = true;
        submitBtn.style.backgroundColor = '#D9D9D9';
    }
}

// 수정 버튼 클릭
submitBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    
    const username = emailUsername.value.trim();
    let domain = '';
    
    // select가 보이는 경우 select의 값 사용, input이 보이는 경우 input의 값 사용
    if (!emailDomainSelect.classList.contains('hidden')) {
        domain = emailDomainSelect.value.trim();
    } else {
        domain = emailDomain.value.trim();
    }
    
    const fullEmail = `${username}@${domain}`;
    const password = newPassword.value;
    
    // 서버에 비밀번호 변경 요청
    try {
        submitBtn.disabled = true;
        const response = await fetch('/uauth/reset-password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: fullEmail,
                new_password: password
            })
        });
        
        const data = await response.json();
        
        if (!data.success) {
            alert(data.message || '비밀번호 변경에 실패했습니다.');
            submitBtn.disabled = false;
            return;
        }
        
        // 성공 모달 표시
        successModal.classList.add('show');
        
    } catch (error) {
        console.error('오류:', error);
        alert('요청 중 오류가 발생했습니다.');
        submitBtn.disabled = false;
    }
});

// 모달 확인 버튼 클릭
modalConfirmBtn.addEventListener('click', function() {
    successModal.classList.remove('show');
    window.location.href = '/main';
});