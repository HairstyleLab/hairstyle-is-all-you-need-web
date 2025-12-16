// 피드백 모달 열기/닫기
function toggleFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    modal.classList.toggle('active');

    // 모달이 닫힐 때 폼 초기화
    if (!modal.classList.contains('active')) {
        const form = document.getElementById('feedbackForm');
        const submitBtn = document.getElementById('feedbackSubmitBtn');
        const errorMsg = document.getElementById('feedbackErrorMessage');

        form.reset();
        errorMsg.classList.remove('show');

        // 제출 버튼 다시 활성화
        submitBtn.disabled = false;
        submitBtn.textContent = '제출';
    }
}

// 오버레이 클릭 시 모달 닫기
function closeFeedbackModalOnOverlay(event) {
    if (event.target.id === 'feedbackModal') {
        toggleFeedbackModal();
    }
}

// 피드백 제출 처리
async function handleFeedbackSubmit(event) {
    event.preventDefault();

    const content = document.getElementById('feedbackContent').value.trim();
    const errorMsg = document.getElementById('feedbackErrorMessage');
    const submitBtn = document.getElementById('feedbackSubmitBtn');

    // 에러 메시지 초기화
    errorMsg.classList.remove('show');

    if (!content) {
        errorMsg.textContent = '피드백 내용을 입력해주세요.';
        errorMsg.classList.add('show');
        return;
    }

    // 제출 버튼 비활성화
    submitBtn.disabled = true;
    submitBtn.textContent = '전송 중...';

    try {
        const response = await fetch('/main/feedback/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                content: content
            })
        });

        const data = await response.json();

        if (data.success) {
            // 피드백 모달 닫기
            toggleFeedbackModal();

            // 확인 모달 표시
            showConfirmModal('피드백 주셔서 감사합니다');
        } else {
            errorMsg.textContent = data.message || '피드백 전송에 실패했습니다.';
            errorMsg.classList.add('show');
            submitBtn.disabled = false;
            submitBtn.textContent = '제출';
        }
    } catch (error) {
        console.error('피드백 전송 오류:', error);
        errorMsg.textContent = '피드백 전송 중 오류가 발생했습니다.';
        errorMsg.classList.add('show');
        submitBtn.disabled = false;
        submitBtn.textContent = '제출';
    }
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
