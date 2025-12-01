document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소들
    const emailId = document.getElementById('emailId');
    const domainSelect = document.getElementById('domainSelect');
    const customDomain = document.getElementById('customDomain');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifySection = document.getElementById('verifySection');
    const verifyCode = document.getElementById('verifyCode');
    const timer = document.getElementById('timer');
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const verifyError = document.getElementById('verifyError');
    const verifySuccess = document.getElementById('verifySuccess');
    const emailHelperText = document.getElementById('emailHelperText');
    
    const password = document.getElementById('password');
    const passwordError = document.getElementById('passwordError');
    const passwordSuccess = document.getElementById('passwordSuccess');
    const passwordConfirm = document.getElementById('passwordConfirm');
    const passwordConfirmError = document.getElementById('passwordConfirmError');
    const passwordConfirmSuccess = document.getElementById('passwordConfirmSuccess');
    
    const nickname = document.getElementById('nickname');
    const nicknameError = document.getElementById('nicknameError');
    const nicknameSuccess = document.getElementById('nicknameSuccess');
    
    const profilePreview = document.getElementById('profilePreview');
    const profileImage = document.getElementById('profileImage');
    const previewImg = document.getElementById('previewImg');
    const plusIcon = document.querySelector('.plus-icon');
    const profileError = document.getElementById('profileError');
    
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    const overallError = document.getElementById('overallError');
    const signupForm = document.getElementById('signupForm');

    // 상태 변수들
    let timerInterval = null;
    let timeLeft = 180; // 3분
    let isEmailVerified = false;
    let isCodeSent = false;
    const testVerifyCode = '1234'; // 테스트용 인증코드

    // 이메일 입력 체크
    function checkEmailInput() {
        const emailValue = emailId.value.trim();
        const domainValue = domainSelect.value === 'custom' ? customDomain.value.trim() : domainSelect.value;
        
        if (emailValue.length > 0 && domainValue.length > 0) {
            sendCodeBtn.disabled = false;
        } else {
            sendCodeBtn.disabled = true;
        }
    }

    // 도메인 선택 변경
    domainSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customDomain.style.display = 'block';
            this.style.display = 'none';
        } else {
            customDomain.style.display = 'none';
        }
        
        // 이메일 수정 시 인증코드 발송 버튼으로 리셋
        if (isCodeSent) {
            resetVerification();
        }
        checkEmailInput();
    });

    // 직접 입력 도메인
    customDomain.addEventListener('input', function() {
        if (isCodeSent) {
            resetVerification();
        }
        checkEmailInput();
    });

    // 이메일 ID 입력
    emailId.addEventListener('input', function() {
        if (isCodeSent) {
            resetVerification();
        }
        checkEmailInput();
    });

    // 인증 리셋
    function resetVerification() {
        isCodeSent = false;
        isEmailVerified = false;
        sendCodeBtn.textContent = '인증코드 발송';
        sendCodeBtn.classList.remove('resend-btn');
        verifyCode.value = '';
        verifyCode.disabled = true;
        verifyError.classList.remove('show');
        verifyError.textContent = '';
        verifySuccess.classList.remove('show');
        emailHelperText.textContent = '';
        emailHelperText.style.color = '';
        timer.textContent = '';
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // 폼 필드 비활성화
        password.disabled = true;
        password.value = '';
        passwordConfirm.disabled = true;
        passwordConfirm.value = '';
        nickname.disabled = true;
        nickname.value = '';
        
        // 에러 메시지 초기화
        passwordError.classList.remove('show');
        passwordSuccess.classList.remove('show');
        passwordConfirmError.classList.remove('show');
        passwordConfirmSuccess.classList.remove('show');
        nicknameError.classList.remove('show');
        nicknameSuccess.classList.remove('show');
        
        checkSubmitBtn();
    }

    // 인증코드 발송 버튼 클릭
    sendCodeBtn.addEventListener('click', function() {
        if (this.disabled) return;
        
        isCodeSent = true;
        this.textContent = '코드 재발송';
        this.classList.add('resend-btn');
        
        // 인증코드 입력창 활성화
        verifyCode.disabled = false;
        
        // 타이머 시작
        timeLeft = 180;
        startTimer();
        
        // 안내 메시지
        emailHelperText.textContent = '입력하신 이메일로 인증코드를 보내드렸습니다. 3분 안에 인증코드를 정확히 입력해주세요';
        emailHelperText.style.color = 'var(--text-secondary)';
        
        // 에러/성공 메시지 초기화
        verifyError.classList.remove('show');
        verifySuccess.classList.remove('show');
        verifyCodeBtn.disabled = true;
    });

    // 타이머 시작
    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        updateTimerDisplay();
        
        timerInterval = setInterval(function() {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                verifyError.textContent = '인증시간이 만료되었습니다. 코드를 다시 발급받아 주세요.';
                verifyError.classList.add('show');
                verifySuccess.classList.remove('show');
            }
        }, 1000);
    }

    // 타이머 표시 업데이트
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timer.textContent = `${minutes}: ${seconds.toString().padStart(2, '0')}`;
    }

    // 인증코드 입력
    verifyCode.addEventListener('input', function() {
        if (this.value.trim().length > 0) {
            verifyCodeBtn.disabled = false;
        } else {
            verifyCodeBtn.disabled = true;
        }
    });

    // 인증코드 확인 버튼 클릭
    verifyCodeBtn.addEventListener('click', function() {
        if (this.disabled) return;
        
        if (timeLeft <= 0) {
            verifyError.textContent = '인증시간이 만료되었습니다. 코드를 다시 발급받아 주세요.';
            verifyError.classList.add('show');
            verifySuccess.classList.remove('show');
            return;
        }
        
        // 인증코드 확인 (테스트용)
        if (verifyCode.value === testVerifyCode) {
            // 인증 성공
            isEmailVerified = true;
            verifySuccess.textContent = '인증이 완료되었습니다.';
            verifySuccess.classList.add('show');
            verifyError.classList.remove('show');
            verifyCodeBtn.disabled = true;
            
            // 타이머 정지
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            // 폼 필드 활성화
            password.disabled = false;
            passwordConfirm.disabled = false;
            nickname.disabled = false;
            
            // 이메일 필드 비활성화
            emailId.disabled = true;
            domainSelect.disabled = true;
            customDomain.disabled = true;
            sendCodeBtn.disabled = true;
            verifyCode.disabled = true;
        } else {
            // 인증 실패
            verifyError.textContent = '인증코드가 틀렸습니다. 다시 확인해주세요.';
            verifyError.classList.add('show');
            verifySuccess.classList.remove('show');
        }
    });

    // 비밀번호 유효성 검사
    function validatePassword(pw) {
        // 8~15자, 영어 대소문자/숫자/특수문자 중 세 가지 이상
        const hasUpperCase = /[A-Z]/.test(pw);
        const hasLowerCase = /[a-z]/.test(pw);
        const hasNumber = /[0-9]/.test(pw);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw);
        
        const typeCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;
        
        return pw.length >= 8 && pw.length <= 15 && typeCount >= 3;
    }

    // 비밀번호 입력
    password.addEventListener('input', function() {
        if (this.value.length > 0 && !validatePassword(this.value)) {
            passwordError.textContent = '사용 불가능한 비밀번호입니다.';
            passwordError.classList.add('show');
            passwordSuccess.classList.remove('show');
        } else if (this.value.length > 0 && validatePassword(this.value)) {
            passwordError.classList.remove('show');
            passwordSuccess.textContent = '사용 가능한 비밀번호입니다.';
            passwordSuccess.classList.add('show');
        } else {
            passwordError.classList.remove('show');
            passwordSuccess.classList.remove('show');
        }
        
        // 비밀번호 확인 체크
        if (passwordConfirm.value.length > 0) {
            checkPasswordMatch();
        }
        checkSubmitBtn();
    });

    // 비밀번호 확인 입력
    passwordConfirm.addEventListener('input', function() {
        checkPasswordMatch();
        checkSubmitBtn();
    });

    // 비밀번호 일치 확인
    function checkPasswordMatch() {
        if (passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value) {
            passwordConfirmError.textContent = '비밀번호가 일치하지 않습니다.';
            passwordConfirmError.classList.add('show');
            passwordConfirmSuccess.classList.remove('show');
        } else if (passwordConfirm.value.length > 0 && password.value === passwordConfirm.value) {
            passwordConfirmError.classList.remove('show');
            passwordConfirmSuccess.textContent = '비밀번호가 일치합니다.';
            passwordConfirmSuccess.classList.add('show');
        } else {
            passwordConfirmError.classList.remove('show');
            passwordConfirmSuccess.classList.remove('show');
        }
    }

    // 닉네임 유효성 검사
    function validateNickname(nick) {
        // 영어/한글로 구성된 2~10자
        const regex = /^[a-zA-Z가-힣]{2,10}$/;
        return regex.test(nick);
    }

    // 닉네임 입력
    nickname.addEventListener('input', function() {
        if (this.value.length > 0 && !validateNickname(this.value)) {
            nicknameError.textContent = '사용 불가능한 닉네임입니다.';
            nicknameError.classList.add('show');
            nicknameSuccess.classList.remove('show');
        } else if (this.value.length > 0 && validateNickname(this.value)) {
            nicknameError.classList.remove('show');
            nicknameSuccess.textContent = '사용 가능한 닉네임입니다.';
            nicknameSuccess.classList.add('show');
        } else {
            nicknameError.classList.remove('show');
            nicknameSuccess.classList.remove('show');
        }
        
        checkSubmitBtn();
    });

    // 프로필 이미지 클릭
    profilePreview.addEventListener('click', function() {
        profileImage.click();
    });

    // 프로필 이미지 선택
    profileImage.addEventListener('change', function() {
        const file = this.files[0];
        
        if (file) {
            // 파일 크기 체크 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                profileError.textContent = '사용 불가능한 이미지입니다.';
                profileError.classList.add('show');
                this.value = '';
                return;
            }
            
            // 이미지 타입 체크
            if (!file.type.startsWith('image/')) {
                profileError.textContent = '사용 불가능한 이미지입니다.';
                profileError.classList.add('show');
                this.value = '';
                return;
            }
            
            profileError.classList.remove('show');
            
            // 미리보기
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                plusIcon.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // 회원가입 버튼 활성화 체크
    function checkSubmitBtn() {
        const isPasswordValid = validatePassword(password.value);
        const isPasswordMatch = password.value === passwordConfirm.value && passwordConfirm.value.length > 0;
        const isNicknameValid = validateNickname(nickname.value);
        
        if (isEmailVerified && isPasswordValid && isPasswordMatch && isNicknameValid) {
            submitBtn.disabled = false;
            overallError.classList.remove('show');
        } else {
            submitBtn.disabled = true;
            
            // 오류 메시지 설정
            if (!isEmailVerified) {
                // 이메일 인증이 안됐으면 표시 안함
            } else if (!isPasswordValid && password.value.length > 0) {
                overallError.textContent = '사용 불가능한 비밀번호입니다.';
                overallError.classList.add('show');
            } else if (!isPasswordMatch && passwordConfirm.value.length > 0) {
                overallError.textContent = '비밀번호가 일치하지 않습니다.';
                overallError.classList.add('show');
            } else if (!isNicknameValid && nickname.value.length > 0) {
                overallError.textContent = '사용 불가능한 닉네임입니다.';
                overallError.classList.add('show');
            } else {
                overallError.classList.remove('show');
            }
        }
    }

    // 취소 버튼 클릭
    cancelBtn.addEventListener('click', function() {
        location.href = '/main/';
    });

    // 폼 제출
    signupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!submitBtn.disabled) {
            // 회원가입 완료 후 메인으로 이동
            alert('회원가입이 완료되었습니다!');
            location.href = '/main/';
        }
    });
});
