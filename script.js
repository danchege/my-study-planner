document.addEventListener('DOMContentLoaded', function() {
    const studyForm = document.getElementById('studyForm');
    const scheduleDiv = document.getElementById('schedule');
    
    studyForm.addEventListener('submit', function(e) {
      e.preventDefault();

      // Get form values
      const subjectsInput = document.getElementById('subjects').value.trim();
      const checkedDays = Array.from(document.querySelectorAll('input[name="day"]:checked')).map(cb => cb.value);
      const hours = parseInt(document.getElementById('hours').value);

      // Validate inputs
      if (!subjectsInput || checkedDays.length === 0 || isNaN(hours) || hours < 1) {
        showError('Please fill in all fields properly');
        return;
      }

      // Process subjects
      const subjects = subjectsInput.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (subjects.length === 0) {
        showError('Please enter at least one subject');
        return;
      }

      // Generate schedule
      generateSchedule(subjects, checkedDays, hours);
    });
    
    function generateSchedule(subjects, days, hoursPerDay) {
      scheduleDiv.innerHTML = `
        <h2><i class="fas fa-calendar-check"></i> Your Weekly Study Plan</h2>
        <div class="plan-info">
          <p><strong>Subjects:</strong> ${subjects.join(', ')}</p>
          <p><strong>Total Study Hours:</strong> ${days.length * hoursPerDay}</p>
        </div>
        <ul class="plan">
      `;

      let subjectIndex = 0;

      days.forEach(day => {
        const startTimeInput = document.getElementById(`startTime${day}`);
        const startTime = startTimeInput ? startTimeInput.value : "12:00"; // Default to 9:00 AM
        const [startHour, startMinute] = startTime.split(':').map(Number);

        const dayElement = document.createElement('li');
        dayElement.innerHTML = `<strong><i class="fas fa-calendar-day"></i> ${day}</strong><ul></ul>`;
        const dayList = dayElement.querySelector('ul');

        for (let h = 0; h < hoursPerDay; h++) {
          const subject = subjects[subjectIndex % subjects.length];
          const sessionStartHour = startHour + h;
          const sessionEndHour = sessionStartHour + 1;

          const sessionElement = document.createElement('li');
          sessionElement.textContent = `${subject} (${sessionStartHour}:00 - ${sessionEndHour}:00)`;
          dayList.appendChild(sessionElement);

          // Schedule notification for the session
          if ('Notification' in window && Notification.permission === 'granted') {
            scheduleNotification(day, subject, sessionStartHour, startMinute);
          }

          subjectIndex++;
        }

        scheduleDiv.querySelector('.plan').appendChild(dayElement);
      });

      scheduleDiv.innerHTML += '</ul>';

      // Add option to request notifications
      if ('Notification' in window && Notification.permission !== 'denied') {
        addNotificationButton();
      }
    }
    
    function showError(message) {
      scheduleDiv.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
        </div>
      `;
    }
    
    function addNotificationButton() {
      if (Notification.permission === 'granted') return;

      const button = document.createElement('button');
      button.className = 'notification-btn';
      button.innerHTML = '<i class="fas fa-bell"></i> Enable Study Reminders';
      button.addEventListener('click', requestNotificationPermission);

      const info = document.createElement('p');
      info.className = 'notification-info';
      info.textContent = 'Get browser notifications for your study sessions';

      scheduleDiv.querySelector('.plan-info').appendChild(info);
      scheduleDiv.querySelector('.plan-info').appendChild(button);
    }
    
    function requestNotificationPermission() {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Notifications enabled! Your study reminders will be scheduled.');
        } else {
          alert('Notifications are disabled. You will not receive study reminders.');
        }
      });
    }
    
    function scheduleNotification(day, subject, startHour, startMinute) {
      const now = new Date();
      const eventDate = new Date();

      // Calculate the next occurrence of the specified day
      const dayOffset = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day) - now.getDay();
      eventDate.setDate(now.getDate() + (dayOffset >= 0 ? dayOffset : 7 + dayOffset));
      eventDate.setHours(startHour, startMinute, 0, 0);

      const timeUntilEvent = eventDate.getTime() - now.getTime();

      if (timeUntilEvent > 0) {
        setTimeout(() => {
          new Notification(`Study Reminder`, {
            body: `Time to study ${subject}!`,
            icon: 'icon.png', // Optional: Add an icon for the notification
          });
        }, timeUntilEvent);

        console.log(`Notification scheduled for ${subject} on ${day} at ${startHour}:${startMinute}`);
      }
    }
    
    // Add some sample data for demo purposes
    document.getElementById('subjects').addEventListener('focus', function() {
      if (this.value === '') {
        this.value = 'Math, Science, History, English';
      }
    });
    
    // Check all days by default
    const dayCheckboxes = document.querySelectorAll('input[name="day"]');
    dayCheckboxes.forEach(checkbox => {
      if (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('togglePreferredHours');
    const preferredHoursDiv = document.getElementById('preferredHours');
  
    toggleButton.addEventListener('click', function () {
      if (preferredHoursDiv.classList.contains('hidden')) {
        preferredHoursDiv.classList.remove('hidden');
        toggleButton.innerHTML = '<i class="fas fa-clock"></i> Hide Preferred Hours';
      } else {
        preferredHoursDiv.classList.add('hidden');
        toggleButton.innerHTML = '<i class="fas fa-clock"></i> Set Preferred Hours';
      }
    });
  });