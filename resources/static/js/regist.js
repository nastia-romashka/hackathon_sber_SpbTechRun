document.addEventListener('DOMContentLoaded', function() {
  const nextStepBtn = document.getElementById('nextStepBtn');
  const step1Form = document.getElementById('step1Form');
  const step2Form = document.getElementById('step2Form');
  const step1Content = document.querySelector('.step-1');
  const step2VisualContent = document.querySelector('.step-2-visual-content');
  const step1Visual = document.querySelector('.step-1-visual');
  const step2FormContent = document.querySelector('.step-2-form-content');

  // Переход на второй этап
  nextStepBtn.addEventListener('click', function(e) {
    e.preventDefault();

    const username = step1Form.querySelector('.login').value.trim();
    const password = step1Form.querySelector('.password').value.trim();

    if (!username || !password) {
      alert('Please fill in all fields');
      return;
    }

    // Анимация переходов: левая форма уходит влево, правая форма приходит слева
    // Правая часть: визуал уходит вправо, форма приходит слева
    step1Content.classList.add('leaving');
    step1Visual.classList.add('leaving');

    setTimeout(() => {
      step1Content.classList.remove('active');
      step1Visual.classList.remove('active');
      
      step2VisualContent.classList.add('active');
      step2FormContent.classList.add('active');
    }, 50);
  });

  // Обработка отправки второго этапа
  step2Form.addEventListener('submit', function(e) {
    e.preventDefault();

    const username = step1Form.querySelector('.login').value.trim();
    const password = step1Form.querySelector('.password').value.trim();
    const email = step2Form.querySelector('.email').value.trim();
    const fullname = step2Form.querySelector('.fullname').value.trim();
    const phone = step2Form.querySelector('.phone').value.trim();

    if (!username || !password || !email || !fullname) {
      alert('Please fill in all required fields');
      return;
    }

    // Здесь можно отправить данные на сервер
    console.log({
      username,
      password,
      email,
      fullname,
      phone,
    });

    alert('Registration successful!');
    // Перенаправление или очистка формы
  });
});
